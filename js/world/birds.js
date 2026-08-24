// Möwen über dem Meer
import * as THREE from 'three';
import { mulberry32 } from '../util.js';

export function createBirds(ctx) {
  const rng = mulberry32(7);
  const birds = [];
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf2f2ee });
  const wingMat = new THREE.MeshLambertMaterial({ color: 0xe4e6e2, side: THREE.DoubleSide });

  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 3, 6), bodyMat);
    body.rotation.z = Math.PI / 2;
    g.add(body);
    const wings = [];
    for (const sgn of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.22), wingMat);
      w.geometry.translate(sgn * 0.35, 0, 0);
      g.add(w);
      wings.push(w);
    }
    ctx.scene.add(g);
    birds.push({
      g, wings,
      cx: -20 + rng() * 60, cz: -195 + rng() * 50,
      r: 26 + rng() * 40, h: 13 + rng() * 16,
      speed: (0.10 + rng() * 0.09) * (rng() < 0.5 ? 1 : -1),
      phase: rng() * 6.28, flap: 5.5 + rng() * 2.5
    });
  }

  return {
    update(dt, elapsed) {
      for (const b of birds) {
        const a = b.phase + elapsed * b.speed;
        const wob = Math.sin(elapsed * 0.3 + b.phase) * 4;
        b.g.position.set(
          b.cx + Math.cos(a) * (b.r + wob),
          b.h + Math.sin(elapsed * 0.5 + b.phase * 2) * 2.5,
          b.cz + Math.sin(a) * (b.r + wob)
        );
        b.g.rotation.y = -a - (b.speed > 0 ? 0 : Math.PI);
        const f = Math.sin(elapsed * b.flap + b.phase) * 0.75 - 0.15;
        b.wings[0].rotation.y = f;
        b.wings[1].rotation.y = -f;
      }
    }
  };
}
