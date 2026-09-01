// v29: Stadt-Ausbaustufen — je nach Gesamtverdienst wächst die Kasaba:
// Köy (Start) → Kasaba (+Häuserring) → Şehir (+Wohnblocks) → Metropole
// (+Hochhäuser mit beleuchteten Fenstern). Gebäude bekommen Kollider.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { spawnPerson } from '../workers.js';

function windowsTexture(cols, rows, base, lit) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  const w = 64 / cols, h = 128 / rows;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      g.fillStyle = Math.random() < 0.55 ? lit : '#20262c';
      g.fillRect(x * w + 2, y * h + 2, w - 4, h - 4);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCityGrowth(ctx, terrain, allColliders, chars) {
  const group = new THREE.Group();
  ctx.scene.add(group);
  const C = CFG.city;
  const G = CFG.growth;
  let built = 0;
  let checkT = 0;

  // deterministische "Zufalls"-Reihe, damit die Stadt bei jedem Laden gleich aussieht
  let seed = 1453;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const houseCols = [0xcfae86, 0xb8977a, 0xd8c7a6, 0xc4a3a3, 0xa8b394];
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7a3f2e, roughness: 0.9 });

  function okSpot(x, z) {
    // nichts Wichtiges zustellen: Markt, Galerie, Straße (z≈-100..-104)
    if (Math.hypot(x - C.market.x, z - C.market.z) < 12) return false;
    if (Math.hypot(x - C.dealer.x, z - C.dealer.z) < 12) return false;
    if (z > -110 && z < -94 && x < C.x) return false;   // Einfahrtstraße freihalten
    return terrain.heightAt(x, z) > 0.8;
  }

  function house(x, z, s) {
    const w = 4.6 + rnd() * 2, d = 4 + rnd() * 1.6, h = 2.9 + rnd() * 1.3;
    const y = terrain.heightAt(x, z);
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: houseCols[(s * 3 + Math.floor(rnd() * 5)) % houseCols.length], roughness: 0.85 }));
    b.position.set(x, y + h / 2, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 1.5, 4), roofMat);
    roof.position.set(x, y + h + 0.72, z);
    roof.rotation.y = Math.PI / 4;
    b.rotation.y = roof.rotation.y + (rnd() - 0.5) * 0.3 - Math.PI / 4;
    group.add(b, roof);
    allColliders.push({ x, z, r: Math.max(w, d) * 0.62 });
  }

  function tower(x, z) {
    const h = 10 + rnd() * 7;
    const y = terrain.heightAt(x, z);
    const tex = windowsTexture(4, 10, '#5a6068', '#ffd980');
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(6, h, 6),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.25 }));
    b.position.set(x, y + h / 2, z);
    group.add(b);
    allColliders.push({ x, z, r: 4.4 });
    neon(x, z, y + h);   // v31
  }

  // v31: Stadt-Leben — Laternen (Kasaba), Fußgänger (Şehir), Neon (Metropol)
  const lampBulbs = [], neons = [], peds = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.7 });
  function lamp(x, z) {
    const y = terrain.heightAt(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), poleMat);
    pole.position.set(x, y + 2.1, z);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd88a, emissiveIntensity: 0.2 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), bulbMat);
    bulb.position.set(x, y + 4.3, z);
    group.add(pole, bulb);
    lampBulbs.push(bulbMat);
  }
  function lampRing(n, r) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r;
      if (terrain.heightAt(x, z) > 0.8) lamp(x, z);
    }
  }
  function pedestrians(n) {
    for (let i = 0; i < n; i++) {
      const parts = spawnPerson(chars, i + 2, { hat: false, basket: false, tex: i % 4 });
      const p = { parts, a: rnd() * Math.PI * 2, r: 26 + rnd() * 14, dir: rnd() < 0.5 ? 1 : -1, sp: 1.0 + rnd() * 0.5 };
      group.add(parts.group);
      peds.push(p);
      if (parts.anim && parts.anim.play) parts.anim.play('Walk', 0.2, 1);
    }
  }
  function neon(x, z, top) {
    const col = [0xff3b6b, 0x2ee6ff, 0xffd23f, 0x7dff5a][Math.floor(rnd() * 4)];
    const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 0.2), m);
    bar.position.set(x, top - 1.5, z + 3.1);
    group.add(bar);
    neons.push({ m, phase: rnd() * 6 });
  }

  function ring(count, r0, r1, builder) {
    let placed = 0, tries = 0;
    while (placed < count && tries < count * 12) {
      tries++;
      const a = rnd() * Math.PI * 2;
      const r = r0 + rnd() * (r1 - r0);
      const x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r;
      if (!okSpot(x, z)) continue;
      builder(x, z, placed);
      placed++;
    }
  }

  function applyStage(s) {
    if (s >= 1 && built < 1) { ring(8, 44, 54, (x, z, i) => house(x, z, i)); lampRing(10, 40); }          // Kasaba
    if (s >= 2 && built < 2) { ring(12, 56, 72, (x, z, i) => house(x, z, i + 8)); pedestrians(6); }      // Şehir
    if (s >= 3 && built < 3) { ring(5, 60, 78, (x, z) => tower(x, z)); }           // Metropole
    built = Math.max(built, s);
  }

  function stage() {
    let s = 0;
    for (let i = 0; i < G.thresholds.length; i++) if ((state.totalEarned || 0) >= G.thresholds[i]) s = i;
    return s;
  }

  applyStage(stage());

  return {
    stage,
    update(dt, elevN = 1, elapsed = 0) {
      // v31: Laternen & Neon nachts, Fußgänger kreisen um die Stadt
      const night = Math.max(0, 1 - elevN * 3);
      for (const m of lampBulbs) m.emissiveIntensity = 0.15 + night * 1.6;
      for (const n of neons) n.m.emissiveIntensity = 0.6 + night * 0.9 * (0.6 + 0.4 * Math.sin(elapsed * 3 + n.phase));
      for (const p of peds) {
        p.a += p.dir * p.sp * dt / p.r;
        const x = C.x + Math.cos(p.a) * p.r, z = C.z + Math.sin(p.a) * p.r;
        p.parts.group.position.set(x, terrain.heightAt(x, z), z);
        p.parts.group.rotation.y = Math.atan2(-Math.sin(p.a) * p.dir, Math.cos(p.a) * p.dir);
        if (p.parts.anim && p.parts.anim.update) p.parts.anim.update(dt);
      }
      checkT -= dt;
      if (checkT <= 0) {
        checkT = 3;
        const s = stage();
        if (s > built) applyStage(s);
      }
    }
  };
}
