// Arbeiter-NPCs: pflücken selbstständig Teebüsche, tragen Körbe
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';
import { mulberry32, clamp } from './util.js';

const SHIRT_COLORS = [0x6a7ba0, 0x9a5f4a, 0x5f8a5a, 0x8a5f7d, 0x777c38, 0x4a7d8a];

export function makeWorkerMesh(i, opts = {}) {
  const g = new THREE.Group();
  const shirt = opts.shirt ?? SHIRT_COLORS[i % SHIRT_COLORS.length];
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 3, 8),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 })
  );
  body.position.y = 0.85;
  body.castShadow = true;
  const legs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.16, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1 })
  );
  legs.position.y = 0.28;
  legs.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 9, 7),
    new THREE.MeshStandardMaterial({ color: 0xc9a184, roughness: 0.8 })
  );
  head.position.y = 1.42;
  head.castShadow = true;
  // Strohhut
  const hatTop = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.12, 9),
    new THREE.MeshStandardMaterial({ color: 0xd8bd7f, roughness: 1 })
  );
  hatTop.position.y = 1.62;
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.025, 10),
    new THREE.MeshStandardMaterial({ color: 0xcbb072, roughness: 1 })
  );
  hatBrim.position.y = 1.56;
  // Rücken-Korb (NPCs ohne)
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.12, 0.34, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a6d42, roughness: 1 })
  );
  basket.position.set(0, 1.05, -0.28);
  basket.rotation.x = 0.15;
  basket.castShadow = true;
  basket.visible = opts.basket !== false;
  hatTop.visible = hatBrim.visible = opts.hat !== false;
  // Arme (für Pflück-Animation)
  const armMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.38, 2, 6), armMat);
  armL.position.set(-0.28, 1.05, 0);
  const armR = armL.clone();
  armR.position.x = 0.28;
  g.add(body, legs, head, hatTop, hatBrim, basket, armL, armR);
  return { group: g, armL, armR, head };
}

export function createWorkers(ctx, terrain, tea, particles) {
  const { scene } = ctx;
  const W = CFG.workers;
  const rng = mulberry32(6161);
  const workers = [];   // {mesh-parts, x, z, target, phase, state, timer, kgToday}
  const v3 = new THREE.Vector3();

  function spawnPos() {
    const F = CFG.field;
    return {
      x: F.cx + (rng() - 0.5) * 30,
      z: F.cz + (rng() - 0.5) * 24
    };
  }

  function sync() {
    while (workers.length < state.workers) {
      const parts = makeWorkerMesh(workers.length);
      const p = spawnPos();
      parts.group.position.set(p.x, terrain.heightAt(p.x, p.z), p.z);
      scene.add(parts.group);
      workers.push({
        ...parts, x: p.x, z: p.z, target: -1,
        phase: rng() * 6.28, st: 'seek', timer: 0.5 + rng() * 2
      });
    }
    while (workers.length > state.workers) {
      const w = workers.pop();
      scene.remove(w.group);
    }
  }
  sync();

  function claimBush(w) {
    // nächster reifer, nicht beanspruchter Busch
    const pos = tea.positions, states = tea.states;
    let best = -1, bd = 1e9;
    for (let i = 0; i < tea.count; i++) {
      if (states[i] === 0) continue;   // ST_GROW
      let taken = false;
      for (const o of workers) if (o !== w && o.target === i) { taken = true; break; }
      if (taken) continue;
      const dx = pos[i * 3] - w.x, dz = pos[i * 3 + 2] - w.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  return {
    sync,
    count: () => workers.length,
    list: () => workers,

    update(dt, elapsed, running) {
      if (!workers.length) return;
      const baseNeed = W.pickTime * (state.upgrades.foreman ? W.foremanFactor : 1) / (state.workerBoost || 1);
      // v6: erfahrene Pflücker sind schneller
      const levelOf = (days) => {
        let lvl = 0;
        for (let i = 0; i < CFG.workerLevelDays.length; i++) if (days >= CFG.workerLevelDays[i]) lvl = i;
        return lvl;
      };
      for (const w of workers) {
        if (!running) {
          // Feierabend: stehen, Arme unten
          w.armL.rotation.x *= 0.9; w.armR.rotation.x *= 0.9;
          continue;
        }
        if (w.st === 'seek') {
          w.timer -= dt;
          if (w.timer <= 0) {
            w.target = claimBush(w);
            w.st = w.target >= 0 ? 'walk' : 'idle';
            w.timer = 2;
          }
        } else if (w.st === 'idle') {
          w.timer -= dt;
          if (w.timer <= 0) { w.st = 'seek'; w.timer = 0.5; }
        } else if (w.st === 'walk') {
          if (w.target < 0 || tea.states[w.target] === 0) { w.st = 'seek'; w.timer = 0.3; continue; }
          const tx = tea.positions[w.target * 3], tz = tea.positions[w.target * 3 + 2];
          const dx = tx - w.x, dz = tz - w.z;
          const d = Math.hypot(dx, dz);
          if (d < 1.05) {
            const wi = workers.indexOf(w);
            const lvlF = CFG.workerLevelFactor[levelOf((state.workerData[wi] || {}).days || 0)];
            w.st = 'pick';
            w.timer = baseNeed * lvlF;
            continue;
          }
          const sp = W.walkSpeed;
          w.x += dx / d * sp * dt;
          w.z += dz / d * sp * dt;
          w.group.rotation.y = Math.atan2(dx, dz);
          w.phase += dt * 9;
          // Geh-Wippen
          w.group.position.y = terrain.heightAt(w.x, w.z) + Math.abs(Math.sin(w.phase)) * 0.04;
        } else if (w.st === 'pick') {
          if (w.target < 0 || tea.states[w.target] === 0) { w.st = 'seek'; w.timer = 0.3; continue; }
          w.timer -= dt;
          // Pflück-Arme
          const a = Math.sin(elapsed * 7 + w.phase) * 0.7;
          w.armL.rotation.x = -0.9 + a * 0.4;
          w.armR.rotation.x = -0.9 - a * 0.4;
          if (w.timer <= 0) {
            const res = tea.pick(w.target, false);
            let kg = res.kg * (res.late ? 0.9 : 1);
            state.workerKg += kg;
            state.totalKg += kg;
            v3.set(tea.positions[w.target * 3], tea.positions[w.target * 3 + 1] + 0.6, tea.positions[w.target * 3 + 2]);
            if (particles) particles.burst(v3, 6, ctx.camera.position);
            w.target = -1;
            w.st = 'seek';
            w.timer = 0.4 + Math.random() * 0.8;
            w.armL.rotation.x = 0; w.armR.rotation.x = 0;
          }
        }
        w.group.position.x = w.x;
        w.group.position.z = w.z;
        if (w.st !== 'walk') w.group.position.y = terrain.heightAt(w.x, w.z);
      }
    }
  };
}
