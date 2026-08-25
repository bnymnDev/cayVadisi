// Arbeiter-NPCs: pflücken selbstständig Teebüsche, tragen Körbe
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';
import { mulberry32, clamp } from './util.js';

const SHIRT_COLORS = [0x6a7ba0, 0x9a5f4a, 0x5f8a5a, 0x8a5f7d, 0x777c38, 0x4a7d8a];
const SKIN_TONES = [0xe6b48c, 0xd9a173, 0xc98e5f, 0xb77e52];
const PANTS_COLORS = [0x3a3f45, 0x4a4038, 0x2e3a4a, 0x554a3a];
const SCARF_COLORS = [0xc0663a, 0x7a8f4a, 0x8a5f7d, 0xa53f3f];

// Requisiten — auch an Skelett-Modelle anhängbar
export function makeStrawHat() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8bd7f, roughness: 1 }));
  top.position.y = 0.045;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0xcbb072, roughness: 1 }));
  g.add(top, brim);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makeBackBasket() {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.34, 9),
    new THREE.MeshStandardMaterial({ color: 0x8a6d42, roughness: 1 }));
  b.rotation.x = 0.12;
  b.castShadow = true;
  return b;
}

// v13.2: menschlichere Figuren — echte Proportionen, Gesicht, Gliedmaßen
// mit Schulter-/Hüft-Pivots (armL/armR/legL/legR sind Dreh-Gruppen).
// Seit v13.3 nur noch Fallback, falls das geriggte GLB nicht lädt.
export function makeWorkerMesh(i, opts = {}) {
  const g = new THREE.Group();
  const shirt = opts.shirt ?? SHIRT_COLORS[i % SHIRT_COLORS.length];
  const skin = opts.skin ?? SKIN_TONES[(i * 7 + 3) % SKIN_TONES.length];
  const female = opts.female ?? (i % 3 === 1);
  const pants = PANTS_COLORS[(i * 5 + 1) % PANTS_COLORS.length];

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.95 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.6 });

  // ---- Beine: Hüft-Pivots, damit sie beim Gehen schwingen ----
  function makeLeg(sx) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.09, 0.78, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.58, 3, 7), pantsMat);
    leg.position.y = -0.37;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.2), darkMat);
    shoe.position.set(0, -0.745, 0.04);
    pivot.add(shoe);
    return pivot;
  }
  const legL = makeLeg(-1), legR = makeLeg(1);
  g.add(legL, legR);

  // ---- Rumpf: Becken, Oberkörper, Weste ----
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.135, 9, 7), pantsMat);
  hips.position.y = 0.82;
  hips.scale.set(1.1, 0.72, 0.92);
  g.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.36, 4, 9), shirtMat);
  torso.position.y = 1.08;
  torso.scale.set(1.05, 1, 0.82);
  g.add(torso);
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.28, 3, 9),
    new THREE.MeshStandardMaterial({ color: 0x36302a, roughness: 0.95 }));
  vest.position.y = 1.12;
  vest.scale.set(1.02, 0.9, 0.78);
  vest.visible = !female && (i % 2 === 0);
  g.add(vest);
  // Frauen der Teegärten: langer Rock
  if (female) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, 0.62, 10),
      new THREE.MeshStandardMaterial({ color: pants, roughness: 0.95 }));
    skirt.position.y = 0.56;
    g.add(skirt);
  }

  // ---- Arme: Schulter-Pivots + Hände ----
  function makeArm(sx) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.175, 1.3, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.047, 0.44, 3, 7), shirtMat);
    arm.position.set(sx * 0.015, -0.26, 0);
    arm.rotation.z = -sx * 0.08;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 6), skinMat);
    hand.position.set(sx * 0.03, -0.52, 0);
    pivot.add(hand);
    return pivot;
  }
  const armL = makeArm(-1), armR = makeArm(1);
  g.add(armL, armR);

  // ---- Kopf: Schädel, Gesicht, Ohren, Haar/Kopftuch ----
  const head = new THREE.Group();
  head.position.y = 1.475;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 8), skinMat);
  neck.position.y = -0.1;
  head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.122, 12, 10), skinMat);
  skull.scale.set(0.92, 1.08, 0.98);
  head.add(skull);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), skinMat);
    ear.position.set(sx * 0.105, 0, 0);
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), darkMat);
    eye.position.set(sx * 0.042, 0.02, 0.1);
    head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.01, 0.012),
      new THREE.MeshStandardMaterial({ color: 0x241c15, roughness: 0.9 }));
    brow.position.set(sx * 0.042, 0.055, 0.104);
    head.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), skinMat);
  nose.position.set(0, -0.005, 0.115);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3f, roughness: 0.8 }));
  mouth.position.set(0, -0.055, 0.102);
  head.add(mouth);
  const hairMat = new THREE.MeshStandardMaterial({
    color: [0x241c15, 0x171310, 0x4a3626, 0x6b6560][(i * 3 + 1) % 4], roughness: 0.95
  });
  if (female) {
    // Yemeni-Kopftuch mit Knoten im Nacken
    const scarf = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.62),
      new THREE.MeshStandardMaterial({ color: SCARF_COLORS[i % SCARF_COLORS.length], roughness: 0.95 }));
    scarf.position.y = 0.008;
    scarf.scale.set(0.96, 1.1, 1.0);
    head.add(scarf);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), scarf.material);
    knot.position.set(0, -0.06, -0.1);
    head.add(knot);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.5),
      hairMat);
    hair.position.y = 0.012;
    hair.scale.set(0.94, 1.02, 0.99);
    head.add(hair);
    if (i % 2 === 0) {   // Karadeniz-Schnauzer
      const tash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.014), hairMat);
      tash.position.set(0, -0.035, 0.106);
      head.add(tash);
    }
  }
  g.add(head);

  // Strohhut (Feld-Arbeiter)
  const hatTop = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8bd7f, roughness: 1 })
  );
  hatTop.position.y = 1.63;
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.23, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0xcbb072, roughness: 1 })
  );
  hatBrim.position.y = 1.585;
  hatTop.visible = hatBrim.visible = opts.hat !== false;
  g.add(hatTop, hatBrim);

  // Rücken-Korb (NPCs ohne)
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.11, 0.34, 9),
    new THREE.MeshStandardMaterial({ color: 0x8a6d42, roughness: 1 })
  );
  basket.position.set(0, 1.1, -0.24);
  basket.rotation.x = 0.15;
  basket.visible = opts.basket !== false;
  g.add(basket);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, armL, armR, legL, legR, head };
}

// Einheitlicher Spawn: geriggtes Modell, wenn geladen — sonst Prozedural-Figur
export function spawnPerson(chars, i, opts = {}) {
  if (chars && chars.ready) {
    const person = chars.spawn({ tex: opts.tex ?? i, scale: opts.scale || 1, tint: opts.tint });
    if (opts.hat !== false) person.attach('Head', makeStrawHat(), { x: 0, y: 0.13, z: 0 });
    if (opts.basket) person.attach('Spine2', makeBackBasket(), { x: 0, y: 0.02, z: -0.17 });
    return { group: person.group, anim: person, head: null };
  }
  return makeWorkerMesh(i, opts);
}

export function createWorkers(ctx, terrain, tea, particles, chars) {
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
      const parts = spawnPerson(chars, workers.length, { basket: true });
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
          // Feierabend: stehen, Arme und Beine ruhig
          if (w.anim) { w.anim.play('Idle'); w.anim.update(dt); }
          else {
            w.armL.rotation.x *= 0.9; w.armR.rotation.x *= 0.9;
            w.legL.rotation.x *= 0.9; w.legR.rotation.x *= 0.9;
          }
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
          if (d < 1.45) {   // am Buschrand stehen bleiben — die Working-Pose beugt sich weit vor
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
          // Geh-Animation: Skelett-Walk oder prozeduraler Schwung
          if (w.anim) {
            w.anim.play('Walk', 0.2, 1.25);
            w.group.position.y = terrain.heightAt(w.x, w.z);
          } else {
            w.group.position.y = terrain.heightAt(w.x, w.z) + Math.abs(Math.sin(w.phase)) * 0.04;
            const swing = Math.sin(w.phase) * 0.5;
            w.legL.rotation.x = swing;
            w.legR.rotation.x = -swing;
            w.armL.rotation.x = -swing * 0.7;
            w.armR.rotation.x = swing * 0.7;
          }
        } else if (w.st === 'pick') {
          if (w.target < 0 || tea.states[w.target] === 0) { w.st = 'seek'; w.timer = 0.3; continue; }
          w.timer -= dt;
          // Pflück-Animation: "Working" aus dem Rig oder Prozedural-Arme
          if (w.anim) w.anim.play('Working');
          else {
            const a = Math.sin(elapsed * 7 + w.phase) * 0.7;
            w.armL.rotation.x = -0.9 + a * 0.4;
            w.armR.rotation.x = -0.9 - a * 0.4;
          }
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
            if (!w.anim) {
              w.armL.rotation.x = 0; w.armR.rotation.x = 0;
              w.legL.rotation.x = 0; w.legR.rotation.x = 0;
            }
          }
        }
        w.group.position.x = w.x;
        w.group.position.z = w.z;
        if (w.st !== 'walk') w.group.position.y = terrain.heightAt(w.x, w.z);
        if (w.anim) {
          if (w.st === 'seek' || w.st === 'idle') w.anim.play('Idle');
          w.anim.update(dt);
        }
      }
    }
  };
}
