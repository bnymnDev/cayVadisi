// v12: Dorfkatzen — streunen durch Kasaba & Dorf, lassen sich mit Hamsi füttern
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

const CAT_COLORS = [0xc9762c, 0x2c2c2e, 0xe8e2d4, 0x8a8f96];

function buildCatMesh(color) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 4, 8), fur);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.24;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), fur);
  head.position.set(0, 0.36, 0.24);
  g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), fur);
    ear.position.set(s * 0.05, 0.46, 0.22);
    g.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 5, 8, Math.PI * 1.1), fur);
  tail.position.set(0, 0.3, -0.26);
  tail.rotation.y = Math.PI / 2;
  g.add(tail);
  for (const [lx, lz] of [[-0.07, 0.14], [0.07, 0.14], [-0.07, -0.12], [0.07, -0.12]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.14, 3, 5), fur);
    leg.position.set(lx, 0.1, lz);
    g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, tail };
}

export function createCats(ctx, terrain) {
  const { scene } = ctx;
  const spots = [
    { cx: CFG.city.x + 8, cz: CFG.city.z - 2, r: 8 },      // Çayevi-Terrasse
    { cx: CFG.hut.x + 3, cz: CFG.hut.z + 4, r: 6 },
    { cx: CFG.karsikoy.x, cz: CFG.karsikoy.z + 4, r: 8 },
    { cx: CFG.pension.x + 3, cz: CFG.pension.z + 4, r: 6 }
  ];
  const cats = [];
  spots.forEach((s2, i) => {
    const { group, tail } = buildCatMesh(CAT_COLORS[i % CAT_COLORS.length]);
    const x = s2.cx, z = s2.cz;
    group.position.set(x, terrain.heightAt(x, z), z);
    scene.add(group);
    cats.push({ group, tail, spot: s2, x, z, tx: x, tz: z, idle: i * 2, follow: 0, phase: i });
  });

  return {
    nearest(px, pz, maxD = 2.5) {
      let best = null, bd = maxD;
      for (const c of cats) {
        const d = Math.hypot(px - c.x, pz - c.z);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
    feedNearest(px, pz) {
      const c = this.nearest(px, pz, 3);
      if (!c) return false;
      c.follow = 60;   // eine Minute treuer Begleiter
      return true;
    },
    update(dt, elapsed, playerPos) {
      for (const c of cats) {
        c.idle -= dt;
        if (c.follow > 0) {
          c.follow -= dt;
          c.tx = playerPos.x + 1.2;
          c.tz = playerPos.z + 1.2;
        } else if (c.idle <= 0) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * c.spot.r;
          c.tx = c.spot.cx + Math.cos(a) * r;
          c.tz = c.spot.cz + Math.sin(a) * r;
          c.idle = 4 + Math.random() * 10;
        }
        const dx = c.tx - c.x, dz = c.tz - c.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.3) {
          const sp = c.follow > 0 ? 3.2 : 1.2;
          c.x += dx / d * Math.min(sp * dt, d);
          c.z += dz / d * Math.min(sp * dt, d);
          c.group.rotation.y = Math.atan2(dx, dz);
        }
        c.group.position.set(c.x, terrain.heightAt(c.x, c.z), c.z);
        // Schwanz wippt
        c.tail.rotation.x = Math.sin(elapsed * 2.4 + c.phase) * 0.35;
      }
    }
  };
}
