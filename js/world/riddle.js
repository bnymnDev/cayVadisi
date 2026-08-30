// v24: Die Rätselsteine — fünf alte Steine im Tal, jeder trägt Punkte
// (1 bis 5). Wer sie in der richtigen Reihenfolge berührt, öffnet den Fels
// am Nordhang: dahinter glänzt eine Schatztruhe. Falscher Stein = alles
// erlischt und von vorn.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

function stoneTexture(dots) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#6d6a60';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#4a473f';
  for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 3, 3);
  g.fillStyle = '#2a2822';
  for (let i = 0; i < dots; i++) {
    const a = (i / dots) * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.arc(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30, 9, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRiddle(ctx, terrain) {
  const { scene } = ctx;
  const R = CFG.riddle;
  const stones = [];

  for (let i = 0; i < R.stones.length; i++) {
    const S = R.stones[i];
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.7, 0.5),
      new THREE.MeshStandardMaterial({ map: stoneTexture(i + 1), roughness: 0.95,
        emissive: 0x3aa05a, emissiveIntensity: 0 }));
    stone.position.set(S.x, terrain.heightAt(S.x, S.z) + 0.85, S.z);
    stone.rotation.y = i * 1.3;
    stone.castShadow = true;
    scene.add(stone);
    stones.push(stone);
  }

  // Höhlen-Fels + Truhe dahinter
  const caveRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1),
    new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: 0.95 }));
  const cy = terrain.heightAt(R.cave.x, R.cave.z);
  caveRock.position.set(R.cave.x, cy + 1.2, R.cave.z);
  caveRock.scale.set(1.3, 1, 1);
  caveRock.castShadow = true;
  scene.add(caveRock);
  const chest = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x6a4a26, roughness: 0.8 }));
  box.position.y = 0.28;
  chest.add(box);
  const gold = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8b23a, roughness: 0.25, metalness: 0.8, emissive: 0x8a6a1a, emissiveIntensity: 0.3 }));
  gold.position.y = 0.6;
  chest.add(gold);
  chest.position.set(R.cave.x, cy, R.cave.z - 1.2);
  chest.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(chest);

  function sync() {
    for (let i = 0; i < stones.length; i++) {
      stones[i].material.emissiveIntensity = (state.riddle.done || i < state.riddle.progress) ? 0.55 : 0;
    }
    caveRock.visible = !state.riddle.done;
    chest.visible = state.riddle.done;
  }
  sync();

  return {
    sync,
    colliders: [{ x: R.cave.x, z: R.cave.z, r: 2.6 }],
    nearStone(px, pz) {
      for (let i = 0; i < R.stones.length; i++) {
        if (Math.hypot(px - R.stones[i].x, pz - R.stones[i].z) < CFG.interactDist + 1) return i;
      }
      return -1;
    },
    nearChest(px, pz) {
      return state.riddle.done && Math.hypot(px - R.cave.x, pz - (R.cave.z - 1.2)) < CFG.interactDist + 1.5;
    }
  };
}
