// v17: Werbetafeln der Foto-Kampagne — nach jeder abgeschlossenen Kampagne
// steht am nächsten Morgen ein großes Plakat mit deinem Tee-Label an der
// Straße: Teeglas-Grafik + Label-Name, per Canvas gezeichnet.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

function makePosterTexture(label) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  // Hintergrund mit Teefeld-Streifen
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#e8f0d8');
  grad.addColorStop(1, '#c8ddb0');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#2e6b3a';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(80 + i * 90, 235, 55, 18, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Tee-Glas (ince belli bardak)
  g.strokeStyle = '#8a2a1e'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(90, 60); g.bezierCurveTo(84, 100, 104, 108, 100, 150);
  g.moveTo(160, 60); g.bezierCurveTo(166, 100, 146, 108, 150, 150);
  g.moveTo(96, 152); g.lineTo(154, 152);
  g.stroke();
  g.fillStyle = '#b5451f';
  g.beginPath();
  g.moveTo(92, 80); g.bezierCurveTo(88, 104, 104, 110, 102, 146);
  g.lineTo(148, 146); g.bezierCurveTo(146, 110, 162, 104, 158, 80);
  g.closePath();
  g.fill();
  // Label-Name + Slogan
  g.fillStyle = '#1e3d28';
  g.font = 'bold 52px Georgia, serif';
  g.textAlign = 'left';
  g.fillText((label || 'Çay Vadisi').slice(0, 14), 195, 105);
  g.font = 'italic 28px Georgia, serif';
  g.fillStyle = '#4a5f3a';
  g.fillText('Karadeniz’in en tazesi', 195, 150);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBillboards(ctx, terrain) {
  const { scene } = ctx;
  const B = CFG.billboards;
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5a5a52, roughness: 0.7, metalness: 0.3 });
  const boards = [];

  for (const S of B.spots) {
    const g = new THREE.Group();
    g.position.set(S.x, terrain.heightAt(S.x, S.z), S.z);
    g.rotation.y = S.ry;
    for (const sx of [-1.6, 1.6]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.2, 8), legMat);
      leg.position.set(sx, 1.6, 0);
      g.add(leg);
    }
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), mat);
    board.position.y = 4.1;
    g.add(board);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x3a3a34, roughness: 0.8 }));
    frame.position.set(0, 4.1, -0.06);
    g.add(frame);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.visible = false;
    scene.add(g);
    boards.push({ g, mat });
  }

  let lastLabel = null;
  function sync() {
    const label = state.label || 'Çay Vadisi';
    for (let i = 0; i < boards.length; i++) {
      const show = i < state.billboards;
      boards[i].g.visible = show;
      if (show && (!boards[i].mat.map || lastLabel !== label)) {
        boards[i].mat.map = makePosterTexture(label);
        boards[i].mat.needsUpdate = true;
      }
    }
    lastLabel = label;
  }
  sync();

  return { sync };
}
