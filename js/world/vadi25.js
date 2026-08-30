// v25: Gebündelte kleine Weltmodule — Bienenflüge & Blumenbeete (Yayla),
// Radyo-Vadisi-Sendemast, Angel-Buddy am Steg, Winter-Eisfläche mit
// Schlittschuh-Kind und der begehbare Konak-Innenraum (Teleport-Interieur).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state, seasonOf } from '../state.js';
import { makeSignTexture } from './structures.js';
import { spawnPerson } from '../workers.js';

// ---------- Bienen & Blumenbeete ----------
export function createBees(ctx, terrain) {
  const { scene } = ctx;
  const F = CFG.flowers;
  const g = new THREE.Group();
  const patches = [];
  const COLORS = [0xd44a6a, 0xe3c24f, 0xd47a3a, 0x9a6ad4];
  for (let i = 0; i < F.max; i++) {
    const patch = new THREE.Group();
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 1 }));
    patch.add(soil);
    for (let b = 0; b < 9; b++) {
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4),
        new THREE.MeshStandardMaterial({ color: COLORS[(i + b) % COLORS.length], roughness: 0.6 }));
      const a = (b / 9) * Math.PI * 2;
      bloom.position.set(Math.cos(a) * (0.4 + (b % 3) * 0.3), 0.32, Math.sin(a) * (0.4 + (b % 3) * 0.3));
      patch.add(bloom);
    }
    const px = F.spot.x + (i % 2) * 3.2, pz = F.spot.z + Math.floor(i / 2) * 3.2;
    patch.position.set(px, terrain.heightAt(px, pz) + 0.1, pz);
    patch.visible = false;
    g.add(patch);
    patches.push(patch);
  }
  // Bienen pendeln zwischen Stöcken (yayla+6,+2) und den Beeten
  const bees = [];
  const beeMat = new THREE.MeshBasicMaterial({ color: 0xe8c23a });
  for (let i = 0; i < 10; i++) {
    const bee = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3), beeMat);
    bee.visible = false;
    g.add(bee);
    bees.push({ mesh: bee, t: Math.random(), speed: 0.12 + Math.random() * 0.1 });
  }
  scene.add(g);
  const hive = { x: CFG.yayla.x + 6, z: CFG.yayla.z + 2 };

  function sync() {
    for (let i = 0; i < patches.length; i++) patches[i].visible = i < state.flowerPatches;
  }
  sync();

  return {
    sync,
    nearFlowers(px, pz) {
      return state.hives > 0 && state.flowerPatches < CFG.flowers.max
        && Math.hypot(px - F.spot.x, pz - F.spot.z) < CFG.interactDist + 3;
    },
    update(dt, elapsed) {
      const active = state.hives > 0 && state.flowerPatches > 0;
      for (let i = 0; i < bees.length; i++) {
        const b = bees[i];
        b.mesh.visible = active && i < 2 + state.flowerPatches * 2;
        if (!b.mesh.visible) continue;
        b.t = (b.t + dt * b.speed) % 1;
        const target = patches[i % Math.max(1, state.flowerPatches)].position;
        const f = b.t < 0.5 ? b.t * 2 : (1 - b.t) * 2;   // hin und zurück
        const hy = terrain.heightAt(hive.x, hive.z);
        b.mesh.position.set(
          hive.x + (target.x - hive.x) * f + Math.sin(elapsed * 7 + i) * 0.3,
          hy + 1.2 + Math.sin(f * Math.PI) * 1.6 + Math.sin(elapsed * 11 + i) * 0.1,
          hive.z + (target.z - hive.z) * f + Math.cos(elapsed * 6 + i) * 0.3
        );
      }
    }
  };
}

// ---------- Radyo-Vadisi-Sendemast ----------
export function createRadyoMast(ctx, terrain) {
  const { scene } = ctx;
  const M = CFG.radyoVadisi.mast;
  const gy = terrain.heightAt(M.x, M.z);
  const g = new THREE.Group();
  g.position.set(M.x, gy, M.z);
  const steel = new THREE.MeshStandardMaterial({ color: 0xb84a3a, roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const segm = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.03, 0.2 - i * 0.03, 3.2, 6), steel);
    segm.position.y = 1.6 + i * 3.1;
    g.add(segm);
  }
  for (const dy of [3, 7]) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.07), steel);
    cross.position.y = dy;
    g.add(cross);
  }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), lampMat);
  lamp.position.y = 13.2;
  g.add(lamp);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.visible = false;
  scene.add(g);
  // Schild steht immer da — vor dem Kauf als Angebot, danach als Sendername
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('RADYO VADİSİ 98.7', '#7a2a1e'), roughness: 0.7, side: THREE.DoubleSide }));
  sign.position.set(M.x, gy + 1.6, M.z + 0.4);
  sign.castShadow = true;
  scene.add(sign);

  function sync() { g.visible = !!state.radyo; }
  sync();

  return {
    sync,
    nearMast(px, pz) { return Math.hypot(px - M.x, pz - M.z) < CFG.interactDist + 3; },
    update(dt, elapsed, night) {
      if (g.visible) lampMat.color.setHex(night && Math.sin(elapsed * 3) > 0 ? 0xff3a2a : 0x5a1a12);
    }
  };
}

// ---------- Angel-Buddy am Steg ----------
export function createBuddy(ctx, terrain, chars) {
  const { scene } = ctx;
  const B = CFG.buddy.spot;
  let person = null;

  function build() {
    if (person || !chars || !chars.ready) return;
    person = spawnPerson(chars, 0, { hat: true });
    person.group.position.set(B.x, terrain.heightAt(B.x, B.z), B.z);
    person.group.rotation.y = Math.PI;   // Blick aufs Meer
    // Angelrute in der Hand
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 1.6, 5),
      new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 }));
    rod.rotation.x = -0.9;
    rod.position.set(0.3, 1.1, 0.5);
    person.group.add(rod);
    person.group.visible = false;
    scene.add(person.group);
  }

  return {
    nearSpot(px, pz) { return Math.hypot(px - B.x, pz - B.z) < CFG.interactDist + 2; },
    update(dt) {
      build();
      if (!person) return;
      person.group.visible = !!state._buddy;
      if (state._buddy && person.anim) { person.anim.play('Idle'); person.anim.update(dt); }
    }
  };
}

// ---------- Eisfläche im Winter ----------
export function createIcePond(ctx, terrain, chars) {
  const { scene } = ctx;
  const P = CFG.icePond;
  const gy = terrain.heightAt(P.x, P.z);
  const ice = new THREE.Mesh(new THREE.CylinderGeometry(P.r, P.r, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0xcfe6ef, roughness: 0.12, metalness: 0.1,
      transparent: true, opacity: 0.92 }));
  ice.position.set(P.x, gy + 0.08, P.z);
  ice.receiveShadow = true;
  ice.visible = false;
  scene.add(ice);
  // Schlittschuh-Kind dreht Runden
  let skater = null, phase = 0;
  function build() {
    if (skater || !chars || !chars.ready) return;
    skater = spawnPerson(chars, 2, { hat: true });
    skater.group.scale.setScalar(0.66);
    skater.group.visible = false;
    scene.add(skater.group);
  }

  function winterNow() { return seasonOf(state.day, CFG) === 2; }

  return {
    onIce(px, pz) { return winterNow() && Math.hypot(px - P.x, pz - P.z) < P.r; },
    update(dt, elapsed) {
      build();
      const on = winterNow();
      ice.visible = on;
      if (skater) {
        skater.group.visible = on;
        if (on) {
          phase += dt * 0.9;
          const r = P.r * 0.55 + Math.sin(elapsed * 0.4) * 1.2;
          skater.group.position.set(P.x + Math.cos(phase) * r, gy + 0.14, P.z + Math.sin(phase) * r);
          skater.group.rotation.y = -phase + Math.PI / 2;
          if (skater.anim) { skater.anim.play('Walk', 0.3, 0.7); skater.anim.update(dt); }
        }
      }
    }
  };
}

// ---------- Konak-Innenraum ----------
export function createKonakInt(ctx, terrain) {
  const { scene } = ctx;
  const K = CFG.konakInt;
  const Z = K.zone;
  terrain.addHeightZone(Z);   // nach Minimap registrieren (main.js)
  const g = new THREE.Group();
  const h = Z.h;
  const w = Z.x1 - Z.x0, d = Z.z1 - Z.z0;
  const cx = (Z.x0 + Z.x1) / 2, cz = (Z.z0 + Z.z1) / 2;
  // Boden, Wände, Decke
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d),
    new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.8 }));
  floor.position.set(cx, h - 0.1, cz);
  g.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.9, side: THREE.DoubleSide });
  for (const [wx, wz, ww, wd] of [[cx, Z.z0, w, 0.2], [cx, Z.z1, w, 0.2], [Z.x0, cz, 0.2, d], [Z.x1, cz, 0.2, d]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, 4, wd), wallMat);
    wall.position.set(wx, h + 2, wz);
    g.add(wall);
  }
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d),
    new THREE.MeshStandardMaterial({ color: 0x6a5138, roughness: 0.9 }));
  ceil.position.set(cx, h + 4, cz);
  g.add(ceil);
  // warmes Licht + rote Läufer + Vitrinen-Podeste
  const light = new THREE.PointLight(0xf2d9a0, 1.4, 24, 2);
  light.position.set(cx, h + 3.2, cz);
  g.add(light);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2, d - 4),
    new THREE.MeshStandardMaterial({ color: 0x8a2a3a, roughness: 1 }));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(cx, h + 0.02, cz);
  g.add(carpet);
  const exhibits = [];
  const defs = [
    ['🐉', () => state.canavar && state.canavar.wins > 0, 0x4a6b80],
    ['🏆', () => state.sampiyon || state.beeCupWins > 0, 0xd8b23a],
    ['🃏', () => Object.keys(state.collect || {}).length >= 3, 0xc84a32],
    ['📸', () => (state.memories || []).length >= 5, 0xe8e0cc],
    ['🏺', () => (state.amphoras || 0) > 0, 0xa8703a]
  ];
  for (let i = 0; i < defs.length; i++) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 10),
      new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.8 }));
    ped.position.set(Z.x0 + 3 + i * (w - 6) / 4, h + 0.5, i % 2 ? Z.z0 + 3 : Z.z1 - 3);
    g.add(ped);
    const item = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6),
      new THREE.MeshStandardMaterial({ color: defs[i][2], roughness: 0.4, emissive: defs[i][2], emissiveIntensity: 0.12 }));
    item.position.set(ped.position.x, h + 1.35, ped.position.z);
    g.add(item);
    exhibits.push({ item, on: defs[i][1] });
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  function sync() { for (const e of exhibits) e.item.visible = e.on(); }
  sync();

  return {
    sync,
    spawn: K.spawn,
    nearExit(px, pz) { return Math.hypot(px - K.exitDoor.x, pz - K.exitDoor.z) < CFG.interactDist + 1; },
    inside(px, pz) { return px >= Z.x0 && px <= Z.x1 && pz >= Z.z0 && pz <= Z.z1; }
  };
}
