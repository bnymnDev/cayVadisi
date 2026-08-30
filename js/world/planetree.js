// v22: Der alte Platanenbaum — ein Riese am Feldrand mit Talblick. Über die
// Sprossenleiter geht es hinauf zur Plattform (eigene Höhen-Zone, wie immer
// NACH der Minimap registrieren!). Baumhaus in zwei Ausbaustufen, oben
// wartet beim ersten Aufstieg eine Geheimkiste.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createPlaneTree(ctx, terrain) {
  const { scene } = ctx;
  const T = CFG.planeTree;
  const gy = terrain.heightAt(T.x, T.z);
  const P = T.platform;
  terrain.addHeightZone(P);   // Aufruf erfolgt nach Minimap (siehe main.js)

  const g = new THREE.Group();
  g.position.set(T.x, gy, T.z);

  // Stamm: dicke, leicht versetzte Segmente
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - i * 0.22, 1.7 - i * 0.22, 2.6, 10), barkMat);
    seg.position.set(Math.sin(i * 1.7) * 0.25, 1.3 + i * 2.4, Math.cos(i * 2.1) * 0.2);
    g.add(seg);
  }
  // Krone: mehrere große Laubkugeln
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x5c7a3e, roughness: 0.9 });
  for (const [lx, ly, lz, r] of [[0, 11.5, 0, 4.6], [-3, 10.5, 1.5, 3.2], [3, 10.8, -1, 3.4], [1, 12.8, 2, 2.8], [-2, 12.4, -2.4, 2.6]]) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), leafMat);
    crown.position.set(lx, ly, lz);
    crown.scale.y = 0.8;
    g.add(crown);
  }
  // Sprossenleiter am Stamm
  const rungMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.09), rungMat);
    rung.position.set(0, 0.8 + i * 0.9, 1.65 - i * 0.03);
    g.add(rung);
  }
  // Plattform (immer da — die Zone auch)
  const plat = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0, 0.24, P.z1 - P.z0),
    new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.95 }));
  plat.position.set((P.x0 + P.x1) / 2 - T.x, P.h - gy - 0.12, (P.z0 + P.z1) / 2 - T.z);
  g.add(plat);
  // Geländer
  for (const [rx, rz, w, d] of [[0, (P.z1 - T.z), P.x1 - P.x0, 0.08], [0, (P.z0 - T.z), P.x1 - P.x0, 0.08],
                                 [(P.x0 - T.x), 0, 0.08, P.z1 - P.z0], [(P.x1 - T.x), 0, 0.08, P.z1 - P.z0]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), rungMat);
    rail.position.set(rx + (P.x0 + P.x1) / 2 - T.x - (rx === 0 ? (P.x0 + P.x1) / 2 - T.x : 0),
      P.h - gy + 0.85, rz + (P.z0 + P.z1) / 2 - T.z - (rz === 0 ? (P.z0 + P.z1) / 2 - T.z : 0));
    g.add(rail);
  }
  // Baumhaus Stufe 1: Wände + Dach — Stufe 2: Fahne + Fernrohr
  const hut = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x9a7a4e, roughness: 0.9 }));
  wall.position.set(1.2, P.h - gy + 0.9, -1.4);
  hut.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.0, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a4a34, roughness: 0.8 }));
  roof.position.set(1.2, P.h - gy + 2.3, -1.4);
  roof.rotation.y = Math.PI / 4;
  hut.add(roof);
  g.add(hut);
  const deco = new THREE.Group();
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), rungMat);
  flagPole.position.set(1.2, P.h - gy + 3.5, -1.4);
  deco.add(flagPole);
  const flagCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2f9e44, side: THREE.DoubleSide }));
  flagCloth.position.set(1.55, P.h - gy + 4.0, -1.4);
  deco.add(flagCloth);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8b23a, roughness: 0.3, metalness: 0.7 }));
  scope.rotation.x = Math.PI / 2.6;
  scope.position.set(-1.6, P.h - gy + 1.2, 1.6);
  deco.add(scope);
  g.add(deco);
  // Geheimkiste
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x6a4a26, roughness: 0.85 }));
  chest.position.set(-1.8, P.h - gy + 0.35, -1.6);
  g.add(chest);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  function sync() {
    hut.visible = state.treeStage >= 1;
    deco.visible = state.treeStage >= 2;
    chest.visible = !state.treeChest;
  }
  sync();

  return {
    sync,
    colliders: [{ x: T.x, z: T.z, r: 1.9 }],
    nearBase(px, pz) {
      return Math.hypot(px - T.x, pz - (T.z + 2.2)) < CFG.interactDist + 1.5;
    },
    onPlatform(px, pz) {
      return px >= P.x0 && px <= P.x1 && pz >= P.z0 && pz <= P.z1;
    },
    topSpot: { x: (P.x0 + P.x1) / 2, z: (P.z0 + P.z1) / 2 },
    baseSpot: { x: T.x, z: T.z + 3 },
    update(dt, elapsed) {
      if (deco.visible) flagCloth.rotation.y = Math.sin(elapsed * 2.4) * 0.4;
    }
  };
}
