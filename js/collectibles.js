// v10: Basar-Schätze — 8 versteckte Fundstücke im ganzen Tal (Sammelalbum)
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

export const COLLECT_DEFS = [
  { id: 'nazar',    icon: '🧿', x: 32,   z: 100,  color: 0x2a6bd4 },   // Yayla-Wiese
  { id: 'coin',     icon: '🪙', x: -186, z: -186, color: 0xd9a13a },   // İstanbul-Kai-Ecke
  { id: 'caydanlik',icon: '🫖', x: 134,  z: -96,  color: 0xb84a3a },   // hinterm Çayevi
  { id: 'oltu',     icon: '🖤', x: -66,  z: 152,  color: 0x2c2c34 },   // an der Şelale
  { id: 'nal',      icon: '🧲', x: -110, z: -106, color: 0x8a8f96 },   // Scheune am Hof
  { id: 'radyo',    icon: '📻', x: 141,  z: -119, color: 0x6a4f3a },   // hinter der Werkstatt
  { id: 'tespih',   icon: '📿', x: 60,   z: -140, color: 0xd07a2c },   // Kaçak-Strandabschnitt
  { id: 'deniz',    icon: '🐚', x: -150, z: 60,   color: 0xe8d9c4 }    // Weg nach Karşıköy
];

export function createCollectibles(ctx, terrain) {
  const { scene } = ctx;
  const items = [];
  for (const def of COLLECT_DEFS) {
    const mat = new THREE.MeshStandardMaterial({
      color: def.color, roughness: 0.3, metalness: 0.4,
      emissive: def.color, emissiveIntensity: 0.8
    });
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat);
    const y = Math.max(terrain.heightAt(def.x, def.z), 0.5);
    m.position.set(def.x, y + 0.7, def.z);
    m.visible = !state.collect[def.id];
    scene.add(m);
    items.push({ def, m, baseY: y + 0.7 });
  }

  return {
    total: COLLECT_DEFS.length,
    count() { return COLLECT_DEFS.filter(d => state.collect[d.id]).length; },
    nearest(px, pz, maxD = 3) {
      for (const it of items) {
        if (state.collect[it.def.id]) continue;
        if (Math.hypot(px - it.def.x, pz - it.def.z) < maxD) return it.def;
      }
      return null;
    },
    markCollected(id) {
      const it = items.find(i => i.def.id === id);
      if (it) it.m.visible = false;
    },
    update(dt, elapsed) {
      for (const it of items) {
        if (!it.m.visible) continue;
        it.m.position.y = it.baseY + Math.sin(elapsed * 2 + it.def.x) * 0.15;
        it.m.rotation.y += dt * 1.4;
      }
    }
  };
}
