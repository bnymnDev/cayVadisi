// v11: Festivalnacht-Feuerwerk überm Meer — komplett prozedural (Points)
import * as THREE from 'three';
import { CFG } from '../config.js';

const MAX = 900;

export function createFireworks(ctx, audio) {
  const { scene } = ctx;
  const pos = new Float32Array(MAX * 3);
  const vel = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.4, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);

  let active = false;
  let head = 0;
  let launchTimer = 1;
  const COLORS = [
    [1, 0.35, 0.25], [0.4, 0.75, 1], [1, 0.85, 0.35],
    [0.5, 1, 0.5], [1, 0.5, 1], [1, 1, 1]
  ];

  function burst(x, y, z) {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    const n = 70 + Math.floor(Math.random() * 50);
    for (let i = 0; i < n; i++) {
      const j = head;
      head = (head + 1) % MAX;
      const a = Math.random() * Math.PI * 2;
      const e = Math.acos(2 * Math.random() - 1);
      const sp = 5 + Math.random() * 7;
      pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z;
      vel[j * 3] = Math.sin(e) * Math.cos(a) * sp;
      vel[j * 3 + 1] = Math.cos(e) * sp;
      vel[j * 3 + 2] = Math.sin(e) * Math.sin(a) * sp;
      col[j * 3] = c[0]; col[j * 3 + 1] = c[1]; col[j * 3 + 2] = c[2];
      life[j] = 1.6 + Math.random() * 0.8;
    }
    if (audio.thunderish) audio.fireworkBoom ? audio.fireworkBoom() : audio.thunderish();
  }

  return {
    setActive(v) {
      if (v && !active) launchTimer = 0.5;
      active = v;
      if (!v && pts.visible) {
        // ausklingen lassen — Partikel leben weiter, keine neuen Starts
      }
    },
    update(dt) {
      if (active) {
        launchTimer -= dt;
        if (launchTimer <= 0) {
          launchTimer = 1.2 + Math.random() * 2.2;
          const L = CFG.fireworks.launch;
          burst(L.x - 30 + Math.random() * 60, 26 + Math.random() * 16, L.z - Math.random() * 40);
        }
      }
      let any = false;
      for (let j = 0; j < MAX; j++) {
        if (life[j] <= 0) { pos[j * 3 + 1] = -999; continue; }
        any = true;
        life[j] -= dt;
        vel[j * 3 + 1] -= 6.5 * dt;
        vel[j * 3] *= 1 - dt * 0.6;
        vel[j * 3 + 2] *= 1 - dt * 0.6;
        pos[j * 3] += vel[j * 3] * dt;
        pos[j * 3 + 1] += vel[j * 3 + 1] * dt;
        pos[j * 3 + 2] += vel[j * 3 + 2] * dt;
      }
      pts.visible = any || active;
      if (pts.visible) geo.attributes.position.needsUpdate = true;
      mat.opacity = 1;
    }
  };
}
