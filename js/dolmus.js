// v10: Eigene Dolmuş-Linie — der Minibus pendelt auf der Landstraße
// Hof <-> Haus <-> Stadt, hält an drei Haltestellen und bringt Fahrgeld.
import * as THREE from 'three';
import { CFG, ROADS } from './config.js';
import { state } from './state.js';

function buildDolmusMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.5, 4.4),
    new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.4, metalness: 0.25 })
  );
  body.position.y = 1.15;
  g.add(body);
  // klassischer Zierstreifen
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.22, 4.42),
    new THREE.MeshStandardMaterial({ color: 0x3f6d9a, roughness: 0.5 })
  );
  stripe.position.y = 1.0;
  g.add(stripe);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.5, 4.0),
    new THREE.MeshStandardMaterial({ color: 0x233038, roughness: 0.15, metalness: 0.3 })
  );
  glass.position.y = 1.62;
  g.add(glass);
  // Fahrgäste (Köpfe hinter den Scheiben)
  const heads = [];
  for (let i = 0; i < 4; i++) {
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9b38c, roughness: 0.8 })
    );
    head.position.set((i % 2 ? 0.45 : -0.45), 1.62, -1.2 + Math.floor(i / 2) * 1.1);
    head.visible = false;
    g.add(head);
    heads.push(head);
  }
  // Schild "DOLMUŞ"
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.22, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xe3c24f, roughness: 0.6 })
  );
  sign.position.set(0, 2.0, 2.2);
  g.add(sign);
  for (const [x, z] of [[-0.85, -1.5], [0.85, -1.5], [-0.85, 1.5], [0.85, 1.5]]) {
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12),
      new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 })
    );
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, 0.36, z);
    g.add(tire);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, heads };
}

export function createDolmus(ctx, terrain, audio) {
  const { scene } = ctx;
  // Route: Hof -> Haus -> Stadt (ROADS[0] + ROADS[1])
  const route = [...ROADS[0], ...ROADS[1].slice(1)];
  // Haltestellen: Anfang, Mitte (Haus), Ende
  const stopIdx = [0, 4, route.length - 1];

  let parts = null;
  let seg = 0, u = 0, dir = 1;
  let waitTimer = 0;
  let passengers = 0;

  function syncOwned() {
    if (state.dolmus && !parts) {
      parts = buildDolmusMesh();
      scene.add(parts.group);
    }
  }
  syncOwned();

  return {
    syncOwned,
    update(dt) {
      if (!parts) return;
      if (waitTimer > 0) {
        waitTimer -= dt;
        return;
      }
      const a = route[seg], b = route[seg + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      u += CFG.dolmus.speed * dt / len * dir;
      if ((dir > 0 && u >= 1) || (dir < 0 && u <= 0)) {
        seg += dir;
        u = dir > 0 ? 0 : 1;
        if (seg >= route.length - 1) { seg = route.length - 2; u = 1; dir = -1; }
        if (seg < 0) { seg = 0; u = 0; dir = 1; }
        // an Haltestellen kurz stoppen, Fahrgäste wechseln
        const nodeIdx = dir > 0 ? seg : seg + 1;
        if (stopIdx.includes(nodeIdx)) {
          waitTimer = 2.5;
          passengers = Math.floor(Math.random() * 5);
          parts.heads.forEach((h, i) => { h.visible = i < passengers; });
          if (Math.random() < 0.5 && audio.horn) audio.horn('sedan');
        }
      }
      const s = route[seg], e = route[seg + 1];
      const x = s.x + (e.x - s.x) * u;
      const z = s.z + (e.z - s.z) * u;
      parts.group.position.set(x, terrain.heightAt(x, z), z);
      parts.group.rotation.y = Math.atan2((e.x - s.x) * dir, (e.z - s.z) * dir);
    }
  };
}
