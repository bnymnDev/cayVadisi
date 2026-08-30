// v22: Vadi-Postkarten — dein Foto wird mit Rahmen, Briefmarke und Gruß zur
// Postkarte und hängt danach SICHTBAR auf einem kleinen Ständer vor dem
// Zuhause des beschenkten Dorfbewohners (persistiert im localStorage).
import * as THREE from 'three';
import { CFG } from '../config.js';

const KEY = 'cayvadisi_cards_v1';

export function loadCards() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (e) { return []; }
}

// Foto -> Postkarte (Rahmen + Briefmarke + Gruß), gibt DataURL zurück
export function composePostcard(imgDataUrl, npcName, day, done) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 280;
    const g = c.getContext('2d');
    g.fillStyle = '#f4efe4';
    g.fillRect(0, 0, 400, 280);
    g.drawImage(img, 14, 14, 372, 210);
    g.strokeStyle = '#c9bfa8'; g.lineWidth = 3;
    g.strokeRect(14, 14, 372, 210);
    // Briefmarke
    g.fillStyle = '#d0392b';
    g.fillRect(338, 22, 42, 52);
    g.fillStyle = '#f4efe4';
    g.font = '26px serif'; g.textAlign = 'center';
    g.fillText('🍃', 359, 58);
    g.strokeStyle = '#f4efe4'; g.lineWidth = 1.5;
    g.strokeRect(342, 26, 34, 44);
    // Gruß
    g.fillStyle = '#3a4a3a';
    g.font = 'italic 19px Georgia, serif';
    g.textAlign = 'left';
    g.fillText(`Çay Vadisi'nden selamlar, ${npcName}!`, 20, 254);
    g.font = '14px Georgia, serif';
    g.fillText('Gün ' + day, 340, 254);
    done(c.toDataURL('image/jpeg', 0.8));
  };
  img.src = imgDataUrl;
}

export function saveCard(npcIdx, dataUrl) {
  const cards = loadCards().filter((cd) => cd.npc !== npcIdx);
  cards.push({ npc: npcIdx, img: dataUrl });
  while (cards.length > CFG.postcards.max) cards.shift();
  try { localStorage.setItem(KEY, JSON.stringify(cards)); } catch (e) { /* voll */ }
}

export function createPostcards(ctx, terrain) {
  const { scene } = ctx;
  const stands = [];   // npcIdx -> mesh

  function sync(npcs) {
    if (!npcs) return;
    for (const card of loadCards()) {
      if (stands.some((s2) => s2.npc === card.npc)) continue;
      const list = npcs.list();
      const p = list[card.npc];
      if (!p || !p.home) continue;
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
      post.position.y = 0.6;
      g.add(post);
      const tex = new THREE.TextureLoader().load(card.img);
      tex.colorSpace = THREE.SRGBColorSpace;
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.63),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }));
      frame.position.y = 1.45;
      g.add(frame);
      g.position.set(p.home.x + 0.8, terrain.heightAt(p.home.x + 0.8, p.home.z + 0.8), p.home.z + 0.8);
      g.rotation.y = Math.random() * Math.PI * 2;
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(g);
      stands.push({ npc: card.npc, g });
    }
  }

  return { sync };
}
