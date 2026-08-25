// v13: Dorf-Ausbau — Schule, Çayevi-Anbau und Moschee-Restaurierung
// werden übers Muhtarlık finanziert und wachsen sichtbar in drei Phasen:
// Bauschild → Gerüst → fertiges Gebäude.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

function makeScaffold(w, h, d) {
  const g = new THREE.Group();
  const beam = new THREE.MeshStandardMaterial({ color: 0xb8963f, roughness: 0.8 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 6), beam);
    post.position.set(sx * w / 2, h / 2, sz * d / 2);
    g.add(post);
  }
  for (const hh of [h * 0.45, h * 0.85]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.08, 0.5), beam);
    plank.position.set(0, hh, -d / 2 - 0.1);
    g.add(plank);
  }
  const sand = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0xcbb58a, roughness: 1 }));
  sand.position.set(w / 2 + 1.2, 0.35, d / 2);
  g.add(sand);
  return g;
}

function makeSignPost(text) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
  post.position.y = 0.8;
  g.add(post);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.6),
    new THREE.MeshStandardMaterial({ map: makeSignTexture(text, '#8a5a22'), roughness: 0.7, side: THREE.DoubleSide }));
  sign.position.y = 1.45;
  g.add(sign);
  return g;
}

export function createVillage(ctx, terrain, mats) {
  const { scene } = ctx;
  const V = CFG.village;
  const sites = {};

  function buildDone(id) {
    const g = new THREE.Group();
    if (id === 'okul') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5), mats.plasterMat);
      base.position.y = 1.6;
      g.add(base);
      for (const sgn of [-1, 1]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 6), mats.roofMat);
        r.position.set(sgn * 1.8, 3.9, 0);
        r.rotation.z = -sgn * 0.42;
        g.add(r);
      }
      const winM = new THREE.MeshStandardMaterial({ color: 0x2b3a46, roughness: 0.25 });
      for (let i = 0; i < 3; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), winM);
        win.position.set(-2 + i * 2, 1.8, 2.52);
        g.add(win);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 4.6, 6),
        new THREE.MeshStandardMaterial({ color: 0xd9d9d9, metalness: 0.6, roughness: 0.4 }));
      pole.position.set(4.4, 2.3, 1.6);
      g.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xd02b2b, roughness: 0.8, side: THREE.DoubleSide }));
      flag.position.set(4.95, 4.2, 1.6);
      g.add(flag);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.6),
        new THREE.MeshStandardMaterial({ map: makeSignTexture('İLKOKUL', '#2a5a8a'), roughness: 0.6 }));
      sign.position.set(0, 3.35, 2.55);
      g.add(sign);
    } else if (id === 'cayevi2') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4), mats.woodMat);
      base.position.y = 1.3;
      g.add(base);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 4.6), mats.roofMat);
      roof.position.y = 2.75;
      roof.rotation.z = 0.06;
      g.add(roof);
      // Terrasse mit Markise und Tischchen
      const awning = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.85, side: THREE.DoubleSide }));
      awning.position.set(0, 2.35, 2.7);
      awning.rotation.x = 0.5;
      g.add(awning);
      for (const sx of [-1.3, 0.2, 1.7]) {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 10), mats.woodMat);
        table.position.set(sx, 0.72, 3.2);
        g.add(table);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), mats.woodMat);
        leg.position.set(sx, 0.35, 3.2);
        g.add(leg);
      }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.55),
        new THREE.MeshStandardMaterial({ map: makeSignTexture('ÇAY BAHÇESİ', '#1e4d33'), roughness: 0.6 }));
      sign.position.set(0, 2.2, 2.05);
      g.add(sign);
    } else {
      // cami: weißes Gebäude, Kuppel und schlankes Minarett
      const white = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.85 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 6), white);
      base.position.y = 1.7;
      g.add(base);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x4f7d6b, roughness: 0.4, metalness: 0.25 }));
      dome.position.y = 3.4;
      g.add(dome);
      const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 7.5, 10), white);
      minaret.position.set(3.8, 3.75, -2.2);
      g.add(minaret);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 10),
        new THREE.MeshStandardMaterial({ color: 0x4f7d6b, roughness: 0.4 }));
      tip.position.set(3.8, 8.05, -2.2);
      g.add(tip);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2),
        new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.8 }));
      door.position.set(0, 1, 3.02);
      g.add(door);
    }
    return g;
  }

  for (const [id, P] of Object.entries(V.projects)) {
    const y = terrain.heightAt(P.x, P.z);
    const root = new THREE.Group();
    root.position.set(P.x, y, P.z);
    root.rotation.y = P.ry;
    const sign = makeSignPost(id === 'okul' ? 'OKUL PROJESİ' : id === 'cayevi2' ? 'ÇAY BAHÇESİ' : 'CAMİ ONARIMI');
    const scaffold = makeScaffold(6.5, 4, 5);
    const done = buildDone(id);
    root.add(sign, scaffold, done);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(root);
    sites[id] = { sign, scaffold, done };
  }

  // Muhtarlık-Schild als Anlaufstelle
  const m = makeSignPost('MUHTARLIK');
  m.position.set(V.muhtar.x, terrain.heightAt(V.muhtar.x, V.muhtar.z), V.muhtar.z);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(m);

  function sync() {
    for (const [id, s2] of Object.entries(sites)) {
      const st = state.village[id] || 0;
      s2.sign.visible = st === 0;
      s2.scaffold.visible = st === 1;
      s2.done.visible = st === 2;
    }
  }
  sync();

  return {
    sync,
    colliders: Object.values(V.projects).map((P) => ({ x: P.x, z: P.z, r: 3.2 })),
    nearMuhtar(px, pz) {
      return Math.hypot(px - V.muhtar.x, pz - V.muhtar.z) < CFG.interactDist + 2;
    }
  };
}
