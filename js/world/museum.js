// v19: Museum-Ausstellung am Konak — sobald der Konak Museum ist (Stufe 3),
// stehen davor Podeste mit Samtseil: Canavar-Trophäe, Pokale, Sammelkarten-
// Vitrine und Dede-Fotowand. Jedes gefüllte Podest erhöht das Eintrittsgeld.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createMuseum(ctx, terrain) {
  const { scene } = ctx;
  const K = CFG.konak;
  const gy = terrain.heightAt(K.x, K.z);
  const g = new THREE.Group();
  g.position.set(K.x + 7, gy, K.z + 4);
  g.rotation.y = K.ry;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd8b23a, roughness: 0.3, metalness: 0.8 });
  const exhibits = [];

  function pedestal(x, z) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.0, 10), stoneMat);
    ped.position.set(x, 0.5, z);
    g.add(ped);
    return ped;
  }

  // 1. Canavar-Trophäe: großer Fisch auf Podest
  {
    pedestal(0, 0);
    const fish = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a6b80, roughness: 0.4, metalness: 0.3 }));
    body.rotation.z = Math.PI / 2.6;
    fish.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x3a5568, roughness: 0.5 }));
    tail.position.set(-0.65, -0.35, 0);
    tail.rotation.z = -0.8;
    fish.add(tail);
    fish.position.set(0, 1.55, 0);
    g.add(fish);
    exhibits.push({ node: fish, on: () => state.canavar && state.canavar.wins > 0 });
  }
  // 2. Pokal-Podest (Meisterschaft / Bal / Wahlen)
  {
    pedestal(1.6, 0.4);
    const cup = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.1, 0.3, 10), goldMat);
    bowl.position.y = 0.2;
    cup.add(bowl);
    for (const sx of [-0.22, 0.22]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 10), goldMat);
      handle.position.set(sx, 0.22, 0);
      cup.add(handle);
    }
    cup.position.set(1.6, 1.05, 0.4);
    g.add(cup);
    exhibits.push({ node: cup, on: () => state.sampiyon || state.beeCupWins > 0 || state.electionsWon > 0 });
  }
  // 3. Sammelkarten-Vitrine
  {
    pedestal(-1.6, 0.4);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ef, roughness: 0.1, transparent: true, opacity: 0.35 }));
    glass.position.set(-1.6, 1.3, 0.4);
    g.add(glass);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xc84a32, roughness: 0.6, side: THREE.DoubleSide }));
    card.position.set(-1.6, 1.3, 0.4);
    card.rotation.y = 0.6;
    g.add(card);
    const group3 = new THREE.Group();
    group3.add(glass); // Sichtbarkeit über exhibits steuern
    exhibits.push({ node: card, extra: glass, on: () => Object.keys(state.collect || {}).length >= 3 });
  }
  // 4. Dede-Fotowand
  {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x6a5138, roughness: 0.9 }));
    wall.position.set(0, 1.2, -2.2);
    g.add(wall);
    const photos = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32),
        new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.5, emissive: 0x3a3222, emissiveIntensity: 0.2 }));
      ph.position.set(-0.8 + (i % 3) * 0.8, 1.45 - Math.floor(i / 3) * 0.5, -2.13);
      photos.add(ph);
    }
    g.add(photos);
    exhibits.push({ node: photos, extra: wall, on: () => (state.memories || []).length >= 5 });
  }
  // 5. Amphoren-Podest (v22: Tauchfunde)
  {
    pedestal(3.2, 0.8);
    const ampG = new THREE.Group();
    const ampMat2 = new THREE.MeshStandardMaterial({ color: 0xa8703a, roughness: 0.8 });
    const body2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.5, 8), ampMat2);
    body2.position.y = 1.28;
    ampG.add(body2);
    const neck2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.18, 8), ampMat2);
    neck2.position.y = 1.58;
    ampG.add(neck2);
    ampG.position.set(3.2, 0, 0.8);
    g.add(ampG);
    exhibits.push({ node: ampG, on: () => (state.amphoras || 0) > 0 });
  }
  // Samtseil drumherum
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), goldMat);
    post.position.set(-2.6 + i * 1.75, 0.45, 1.6);
    g.add(post);
  }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a2a3a, roughness: 0.7 }));
  rope.rotation.z = Math.PI / 2;
  rope.position.set(0, 0.78, 1.6);
  g.add(rope);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  function count() { return exhibits.filter((e) => e.on()).length; }

  function sync() {
    g.visible = state.konak >= 3;
    for (const e of exhibits) {
      const on = e.on();
      e.node.visible = on;
      if (e.extra) e.extra.visible = on;
    }
  }
  sync();

  return {
    sync,
    count,
    near(px, pz) {
      return state.konak >= 3 && Math.hypot(px - (K.x + 7), pz - (K.z + 4)) < CFG.interactDist + 3;
    }
  };
}
