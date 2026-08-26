// v15: Hängebrücke überm Şelale-Tobel — als Bauprojekt freischalten,
// danach begehbar mit Wackel-Physik: Steht der Spieler auf der Brücke,
// federt das Deck sichtbar (die Höhen-Zone atmet mit).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createBridge(ctx, terrain) {
  const { scene } = ctx;
  const B = CFG.bridge;
  const y0 = terrain.heightAt(B.x0, B.z);
  const y1 = terrain.heightAt(B.x1, B.z);
  const deckH = Math.max(y0, y1) + 0.25;
  const zone = { x0: B.x0, x1: B.x1, z0: B.z - 1.1, z1: B.z + 1.1, h: deckH };
  let zoneRegistered = false;

  // Bauschild
  const sign = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
  post.position.y = 0.8;
  sign.add(post);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.6),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('KÖPRÜ PROJESİ', '#8a5a22'), roughness: 0.7, side: THREE.DoubleSide }));
  board.position.y = 1.45;
  sign.add(board);
  sign.position.set(B.sign.x, terrain.heightAt(B.sign.x, B.sign.z), B.sign.z);
  sign.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(sign);

  // Brücke selbst
  const bridge = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.95 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 1 });
  const len = B.x1 - B.x0;
  const planks = [];
  for (let i = 0; i <= Math.round(len / 0.55); i++) {
    const x = B.x0 + i * 0.55;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 2.0), plankMat);
    plank.position.set(x, deckH - 0.05, B.z);
    bridge.add(plank);
    planks.push(plank);
  }
  // Tragseile + Handläufe
  for (const sz of [-1, 1]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len + 0.6, 6), ropeMat);
    rope.rotation.z = Math.PI / 2;
    rope.position.set((B.x0 + B.x1) / 2, deckH + 0.95, B.z + sz * 1.0);
    bridge.add(rope);
    for (let i = 0; i <= 6; i++) {
      const x = B.x0 + (i / 6) * len;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), ropeMat);
      strut.position.set(x, deckH + 0.45, B.z + sz * 1.0);
      bridge.add(strut);
    }
    // Pylonen an den Enden
    for (const px of [B.x0 - 0.4, B.x1 + 0.4]) {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.6, 8), plankMat);
      pylon.position.set(px, deckH + 1.0, B.z + sz * 1.0);
      bridge.add(pylon);
    }
  }
  bridge.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(bridge);

  function sync() {
    bridge.visible = state.bridge;
    sign.visible = !state.bridge;
    if (state.bridge && !zoneRegistered) {
      terrain.addHeightZone(zone);   // erst nach dem Bau begehbar
      zoneRegistered = true;
    }
  }
  sync();

  return {
    sync,
    nearSign(px, pz) {
      return !state.bridge && Math.hypot(px - B.sign.x, pz - B.sign.z) < CFG.interactDist + 2;
    },
    update(dt, elapsed, playerPos) {
      if (!state.bridge) return;
      const on = playerPos.x >= B.x0 && playerPos.x <= B.x1
        && Math.abs(playerPos.z - B.z) < 1.2;
      // Wackeln: Zone und Planken federn, wenn jemand drauf steht
      const sway = on ? Math.sin(elapsed * 3.2) * 0.12 + Math.sin(elapsed * 7.1) * 0.04 : 0;
      zone.h = deckH + sway;
      for (let i = 0; i < planks.length; i++) {
        planks[i].position.y = deckH - 0.05 + sway * Math.sin((i / planks.length) * Math.PI);
      }
    }
  };
}
