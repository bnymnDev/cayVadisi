// v29: Stadt-Ausbaustufen — je nach Gesamtverdienst wächst die Kasaba:
// Köy (Start) → Kasaba (+Häuserring) → Şehir (+Wohnblocks) → Metropole
// (+Hochhäuser mit beleuchteten Fenstern). Gebäude bekommen Kollider.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

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

export function createCityGrowth(ctx, terrain, allColliders) {
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
    if (s >= 1 && built < 1) ring(8, 44, 54, (x, z, i) => house(x, z, i));         // Kasaba
    if (s >= 2 && built < 2) ring(12, 56, 72, (x, z, i) => house(x, z, i + 8));    // Şehir
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
    update(dt) {
      checkT -= dt;
      if (checkT <= 0) {
        checkT = 3;
        const s = stage();
        if (s > built) applyStage(s);
      }
    }
  };
}
