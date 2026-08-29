// v18: Fındık Vadisi — begehbares Nachbar-Plateau im Nordosten mit
// Haselnuss-Hainen und der eigenen Filiale: Şube-Haus, Verwalter Niyazi,
// Arbeiter-Figuren zwischen den Bäumen und wachsender Kistenstapel.
// WICHTIG: Höhen-Zone wird wie bei İstanbul/Ada NACH der Minimap registriert.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';
import { spawnPerson } from '../workers.js';

export function createValley2(ctx, terrain, chars) {
  const { scene } = ctx;
  const V = CFG.valley2;
  const Z = V.zone;
  terrain.addHeightZone(Z);
  const gy = Z.h;

  const g = new THREE.Group();

  // Plateau-Boden (Wiese) — die Zone hebt das Terrain, wir legen Gras-Teppich drüber
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(Z.x1 - Z.x0, Z.z1 - Z.z0),
    new THREE.MeshStandardMaterial({ color: 0x5f7a44, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((Z.x0 + Z.x1) / 2, gy + 0.02, (Z.z0 + Z.z1) / 2);
  ground.receiveShadow = true;
  g.add(ground);

  // Haselnuss-Hain: Reihen kleiner Bäume
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a6b32, roughness: 0.9 });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const x = Z.x0 + 12 + c * 9 + (r % 2) * 4;
      const z = Z.z0 + 10 + r * 9;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6), trunkMat);
      trunk.position.y = 0.7;
      tree.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.15, 8, 6), leafMat);
      crown.position.y = 1.9;
      crown.scale.y = 0.85;
      tree.add(crown);
      tree.position.set(x, gy, z);
      tree.rotation.y = (r * 7 + c) * 1.7;
      g.add(tree);
    }
  }

  // Şube-Haus (Filiale)
  const house = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.0, 4.5),
    new THREE.MeshStandardMaterial({ color: 0xcbb89a, roughness: 0.9 }));
  wall.position.y = 1.5;
  house.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.8, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a4a34, roughness: 0.8 }));
  roof.position.y = 3.9;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.55),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('FINDIK ŞUBESİ', '#1e4d33'), roughness: 0.7, side: THREE.DoubleSide }));
  sign.position.set(0, 2.6, 2.31);
  house.add(sign);
  house.position.set(V.house.x, gy, V.house.z);
  house.rotation.y = V.house.ry;
  g.add(house);

  // Kistenstapel wächst mit Arbeiterzahl
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xb3823f, roughness: 0.85 });
  const crates = [];
  for (let i = 0; i < 5; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), crateMat);
    crate.position.set(V.house.x + 4.2, gy + 0.28 + (i % 3) * 0.58, V.house.z - 1 + Math.floor(i / 3) * 0.8);
    crate.visible = false;
    g.add(crate);
    crates.push(crate);
  }

  g.traverse((o) => { if (o.isMesh && o !== ground) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  // Verwalter Niyazi + Filial-Arbeiter (lazy, wenn Modelle bereit)
  let manager = null;
  const hands = [];
  function buildPeople() {
    if (manager || !chars || !chars.ready) return;
    manager = spawnPerson(chars, 2, { hat: true });
    manager.group.position.set(V.house.x - 2.5, gy, V.house.z + 2.5);
    manager.group.rotation.y = 2.4;
    scene.add(manager.group);
    for (let i = 0; i < CFG.valley2.maxWorkers; i++) {
      const w = spawnPerson(chars, (i + 3) % 6, { hat: true, basket: true });
      const x = Z.x0 + 16 + i * 10, z = Z.z0 + 14 + (i % 3) * 8;
      w.group.position.set(x, gy, z);
      w.group.visible = false;
      scene.add(w.group);
      hands.push({ p: w, x, z, phase: i * 1.3 });
    }
  }

  function sync() {
    const n = state.branch ? state.branch.workers : 0;
    for (let i = 0; i < crates.length; i++) crates[i].visible = i < n;
    for (let i = 0; i < hands.length; i++) hands[i].p.group.visible = i < n;
  }
  sync();

  return {
    sync,
    colliders: [{ x: V.house.x, z: V.house.z, r: 3.6 }],
    nearHouse(px, pz) {
      return Math.hypot(px - V.house.x, pz - V.house.z) < CFG.interactDist + 3;
    },
    onPlateau(px, pz) {
      return px >= Z.x0 && px <= Z.x1 && pz >= Z.z0 && pz <= Z.z1;
    },
    update(dt, elapsed) {
      buildPeople();
      sync();
      if (manager && manager.anim) { manager.anim.play('Idle'); manager.anim.update(dt); }
      const n = state.branch ? state.branch.workers : 0;
      for (let i = 0; i < n && i < hands.length; i++) {
        const h = hands[i];
        // Arbeiter pendeln langsam zwischen zwei Bäumen
        h.phase += dt * 0.5;
        const x = h.x + Math.sin(h.phase) * 4;
        const z = h.z + Math.cos(h.phase * 0.7) * 3;
        const dx = x - h.p.group.position.x, dz = z - h.p.group.position.z;
        h.p.group.position.set(x, gy, z);
        if (Math.hypot(dx, dz) > 0.01) h.p.group.rotation.y = Math.atan2(dx, dz);
        if (h.p.anim) { h.p.anim.play('Walk', 0.3, 0.9); h.p.anim.update(dt); }
      }
    }
  };
}
