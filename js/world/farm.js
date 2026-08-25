// Bauernhof: Scheune, Tiergehege mit Tier-KI, Gemüse-Beete mit Wachstum
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { mulberry32, clamp, lerp } from '../util.js';
import { building, fenceRing, makeSignTexture } from './structures.js';

// ---------- Tier-Baukasten (Low-Poly, prozedural) ----------
function boxMesh(w, h, d, color, rough = 0.9) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: rough })
  );
  m.castShadow = true;
  return m;
}

function makeAnimalMesh(type) {
  const g = new THREE.Group();
  const parts = { legs: [] };
  if (type === 'cow') {
    const body = boxMesh(1.5, 0.85, 0.75, 0xf2ede2);
    body.position.y = 0.95;
    // Flecken
    for (let i = 0; i < 4; i++) {
      const p = boxMesh(0.34 + Math.random() * 0.2, 0.3, 0.06, 0x3a2f28);
      const side = i % 2 ? 1 : -1;
      p.position.set(-0.5 + Math.random() * 1.0, 0.85 + Math.random() * 0.5, side * 0.376);
      g.add(p);
    }
    const head = boxMesh(0.45, 0.42, 0.4, 0xe8e0d2);
    head.position.set(0.92, 1.18, 0);
    const snout = boxMesh(0.2, 0.2, 0.32, 0xd8a8a0);
    snout.position.set(1.18, 1.06, 0);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xd9cfb8, roughness: 0.6 });
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 5), hornMat);
      horn.position.set(0.86, 1.46, s * 0.16);
      horn.rotation.z = -0.3;
      g.add(horn);
      const ear = boxMesh(0.12, 0.08, 0.2, 0xe8e0d2);
      ear.position.set(0.88, 1.3, s * 0.28);
      g.add(ear);
    }
    for (const [lx, lz] of [[-0.55, -0.26], [-0.55, 0.26], [0.55, -0.26], [0.55, 0.26]]) {
      const leg = boxMesh(0.16, 0.62, 0.16, 0xe0d8c8);
      leg.position.set(lx, 0.31, lz);
      parts.legs.push(leg);
      g.add(leg);
    }
    const tail = boxMesh(0.06, 0.5, 0.06, 0xe0d8c8);
    tail.position.set(-0.78, 1.05, 0);
    tail.rotation.z = 0.25;
    g.add(tail);
    g.add(body, head, snout);
    parts.scale = 1; parts.bodyY = 0.95;
  } else if (type === 'sheep') {
    const wool = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5, 1),
      new THREE.MeshStandardMaterial({ color: 0xefe9dc, roughness: 1, flatShading: true })
    );
    wool.scale.set(1.25, 0.95, 0.9);
    wool.position.y = 0.72;
    wool.castShadow = true;
    const head = boxMesh(0.3, 0.28, 0.26, 0x35302a);
    head.position.set(0.62, 0.82, 0);
    for (const [lx, lz] of [[-0.3, -0.18], [-0.3, 0.18], [0.3, -0.18], [0.3, 0.18]]) {
      const leg = boxMesh(0.1, 0.45, 0.1, 0x35302a);
      leg.position.set(lx, 0.22, lz);
      parts.legs.push(leg);
      g.add(leg);
    }
    g.add(wool, head);
    parts.scale = 0.85; parts.bodyY = 0.72;
  } else if (type === 'goat') {   // v9: Kletterziege
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.26, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.95 })
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.58;
    body.castShadow = true;
    const head = boxMesh(0.3, 0.26, 0.22, 0xded6c4);
    head.position.set(0.58, 0.84, 0);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.22, 5),
        new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9 })
      );
      horn.rotation.z = 0.6;
      horn.position.set(0.5, 1.02, s * 0.07);
      g.add(horn);
    }
    for (const [lx, lz] of [[-0.26, -0.14], [-0.26, 0.14], [0.26, -0.14], [0.26, 0.14]]) {
      const leg = boxMesh(0.08, 0.4, 0.08, 0xded6c4);
      leg.position.set(lx, 0.2, lz);
      parts.legs.push(leg);
      g.add(leg);
    }
    g.add(body, head);
    parts.scale = 0.85; parts.bodyY = 0.58;
  } else { // chicken
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf3ede0, roughness: 1 })
    );
    body.scale.set(1.25, 1, 0.95);
    body.position.y = 0.28;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0xf3ede0, roughness: 1 })
    );
    head.position.set(0.22, 0.5, 0);
    const comb = boxMesh(0.1, 0.08, 0.03, 0xc93b2c);
    comb.position.set(0.22, 0.6, 0);
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.1, 5),
      new THREE.MeshStandardMaterial({ color: 0xe0a133, roughness: 0.7 })
    );
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.33, 0.5, 0);
    const tail = boxMesh(0.12, 0.16, 0.05, 0xd8cfbc);
    tail.position.set(-0.2, 0.36, 0);
    tail.rotation.z = 0.6;
    for (const lz of [-0.06, 0.06]) {
      const leg = boxMesh(0.03, 0.16, 0.03, 0xe0a133);
      leg.position.set(0, 0.08, lz);
      parts.legs.push(leg);
      g.add(leg);
    }
    g.add(body, head, comb, beak, tail);
    parts.scale = 0.9; parts.bodyY = 0.28;
  }
  g.scale.setScalar(parts.scale);
  return { group: g, parts };
}

// ---------- Pflanzen-Baukasten pro Sorte ----------
function makeCropGroup(type, rng) {
  const g = new THREE.Group();
  const green = 0x3f6d2a, greenLight = 0x5d9138;
  if (type === 'corn') {
    for (let i = 0; i < 5; i++) {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.045, 1.5, 5),
        new THREE.MeshStandardMaterial({ color: greenLight, roughness: 0.9 })
      );
      stalk.position.set((rng() - 0.5) * 3.4, 0.75, (rng() - 0.5) * 2.2);
      const cob = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.18, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0xe3c24f, roughness: 0.7 })
      );
      cob.position.set(stalk.position.x + 0.08, 1.0, stalk.position.z);
      cob.rotation.z = 0.35;
      for (const l of [0.45, 0.85, 1.2]) {
        const leaf = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.1),
          new THREE.MeshStandardMaterial({ color: green, roughness: 1, side: THREE.DoubleSide })
        );
        leaf.position.set(stalk.position.x, l, stalk.position.z);
        leaf.rotation.set(0.4 + rng() * 0.4, rng() * Math.PI * 2, 0);
        g.add(leaf);
      }
      stalk.castShadow = true;
      g.add(stalk, cob);
    }
  } else if (type === 'tomato') {
    for (let i = 0; i < 6; i++) {
      const bush = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.3, 1),
        new THREE.MeshStandardMaterial({ color: green, roughness: 1, flatShading: true })
      );
      const bx = (rng() - 0.5) * 3.4, bz = (rng() - 0.5) * 2.2;
      bush.position.set(bx, 0.42, bz);
      bush.scale.y = 1.4;
      bush.castShadow = true;
      g.add(bush);
      for (let f = 0; f < 3; f++) {
        const tom = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 5),
          new THREE.MeshStandardMaterial({ color: 0xd0392b, roughness: 0.5 })
        );
        tom.position.set(bx + (rng() - 0.5) * 0.4, 0.3 + rng() * 0.4, bz + (rng() - 0.5) * 0.4);
        g.add(tom);
      }
    }
  } else if (type === 'cabbage') {
    for (let i = 0; i < 8; i++) {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x7ba24a, roughness: 1 })
      );
      head.position.set((rng() - 0.5) * 3.6, 0.2, (rng() - 0.5) * 2.4);
      head.scale.y = 0.8;
      head.castShadow = true;
      g.add(head);
      for (let l = 0; l < 4; l++) {
        const leaf = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 0.2),
          new THREE.MeshStandardMaterial({ color: green, roughness: 1, side: THREE.DoubleSide })
        );
        const a = rng() * Math.PI * 2;
        leaf.position.set(head.position.x + Math.cos(a) * 0.22, 0.12, head.position.z + Math.sin(a) * 0.22);
        leaf.rotation.set(-0.9, a, 0);
        g.add(leaf);
      }
    }
  } else { // hazel: kleiner Baum
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 1 })
    );
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 1),
      new THREE.MeshStandardMaterial({ color: 0x4a7030, roughness: 1, flatShading: true })
    );
    crown.position.y = 1.7;
    crown.scale.y = 0.85;
    crown.castShadow = true;
    g.add(trunk, crown);
    for (let i = 0; i < 8; i++) {
      const nut = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0x9c6b35, roughness: 0.6 })
      );
      const a = rng() * Math.PI * 2, r = 0.5 + rng() * 0.4;
      nut.position.set(Math.cos(a) * r, 1.4 + rng() * 0.6, Math.sin(a) * r);
      g.add(nut);
    }
  }
  return g;
}

export function createFarm(ctx, terrain, mats, animals3d) {
  const { scene } = ctx;
  const F = CFG.farm;
  const colliders = [];
  const rng = mulberry32(4242);

  // ---------- Scheune + Schild + Gehege ----------
  const barn = building(ctx, terrain, colliders, F.barn.x, F.barn.z, F.barn.ry, 7, 5.4, 3.4,
    { mats, tint: 0xa8543c, signText: 'ÇİFTLİK', signBg: '#6d3a24', twoWindows: true });
  fenceRing(ctx, terrain, F.pen.x, F.pen.z, F.pen.r, mats, 0.55, 0.2);

  // Futtertrog im Gehege
  const trough = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.6), mats.woodMat);
  trough.position.set(F.pen.x + 3, terrain.heightAt(F.pen.x + 3, F.pen.z) + 0.22, F.pen.z);
  trough.castShadow = true; trough.receiveShadow = true;
  scene.add(trough);

  // Hof-Schild (Interaktionspunkt für Pflanzen & Tiere)
  {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.1, 6), mats.woodBeamMat);
    const y = terrain.heightAt(F.sign.x, F.sign.z);
    post.position.set(F.sign.x, y + 1.05, F.sign.z);
    post.castShadow = true;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('BOSTAN', '#5d5a22'), roughness: 0.6, side: THREE.DoubleSide })
    );
    sign.position.set(F.sign.x, y + 1.85, F.sign.z);
    sign.rotation.y = 0.7 + Math.PI;   // Vorderseite zur Zufahrt (Osten)
    scene.add(post, sign);
    colliders.push({ x: F.sign.x, z: F.sign.z, r: 0.4 });
  }

  // ---------- Beete ----------
  const PL = F.plots;
  const plotCount = PL.cols * PL.rows;
  if (state.plots.length !== plotCount) {
    const old = state.plots;
    state.plots = new Array(plotCount).fill(null);
    for (let i = 0; i < Math.min(old.length, plotCount); i++) state.plots[i] = old[i];
  }
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 1 });
  const plotPos = [];
  for (let i = 0; i < plotCount; i++) {
    const col = i % PL.cols, row = Math.floor(i / PL.cols);
    const x = PL.x0 + col * (PL.w + PL.gap);
    const z = PL.z0 + row * (PL.d + PL.gap);
    const y = terrain.heightAt(x, z);
    plotPos.push({ x, y, z });
    const soil = new THREE.Mesh(new THREE.BoxGeometry(PL.w, 0.3, PL.d), soilMat);
    soil.position.set(x, y + 0.1, z);
    soil.receiveShadow = true;
    scene.add(soil);
    // kleine Furchen
    for (let f = -1; f <= 1; f++) {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(PL.w * 0.94, 0.08, 0.3), soilMat);
      ridge.position.set(x, y + 0.28, z + f * PL.d * 0.28);
      scene.add(ridge);
    }
  }

  // Pflanz-Visuals je Beet (werden bei Bedarf gebaut/entfernt)
  const cropGroups = new Array(plotCount).fill(null);

  function plotProgress(i) {
    const p = state.plots[i];
    if (!p) return 0;
    const total = CFG.crops[p.type].days;
    const dayFrac = clamp(state.timeSec / CFG.dayLengthSec, 0, 1);
    return clamp((total - p.daysLeft + dayFrac) / total, 0.05, 1);
  }

  function refreshPlots() {
    for (let i = 0; i < plotCount; i++) {
      const p = state.plots[i];
      const cur = cropGroups[i];
      if (!p && cur) { scene.remove(cur.group); cropGroups[i] = null; continue; }
      if (p && (!cur || cur.type !== p.type)) {
        if (cur) scene.remove(cur.group);
        const g = makeCropGroup(p.type, mulberry32(1000 + i));
        g.position.set(plotPos[i].x, plotPos[i].y + 0.26, plotPos[i].z);
        scene.add(g);
        cropGroups[i] = { group: g, type: p.type };
      }
    }
  }
  refreshPlots();

  // ---------- Tiere ----------
  const animals = [];   // {type, mesh, parts, x, z, tx, tz, phase, idle}
  function syncAnimals() {
    for (const type of Object.keys(CFG.animals)) {
      const want = state.animals[type] || 0;
      let have = animals.filter(a => a.type === type).length;
      while (have < want) {
        // v13.5: geriggtes Tiermodell, wenn verfügbar — sonst Prozedural-Mesh
        let group, parts, anim = null;
        if (animals3d && animals3d.has(type)) {
          anim = animals3d.spawn(type);
          group = anim.group;
          parts = { legs: [] };
        } else {
          ({ group, parts } = makeAnimalMesh(type));
        }
        const a = rng() * Math.PI * 2, r = rng() * (F.pen.r - 2);
        const x = F.pen.x + Math.cos(a) * r, z = F.pen.z + Math.sin(a) * r;
        group.position.set(x, terrain.heightAt(x, z), z);
        scene.add(group);
        animals.push({ type, mesh: group, parts, anim, x, z, tx: x, tz: z, phase: rng() * 6.28, idle: 1 + rng() * 3 });
        have++;
      }
      while (have > want) {
        const idx = animals.findIndex(an => an.type === type);
        scene.remove(animals[idx].mesh);
        animals.splice(idx, 1);
        have--;
      }
    }
  }
  syncAnimals();

  function updateAnimals(dt, elapsed) {
    for (const an of animals) {
      an.idle -= dt;
      const dx = an.tx - an.x, dz = an.tz - an.z;
      const d = Math.hypot(dx, dz);
      if (an.idle <= 0 && d < 0.3) {
        // neues Ziel im Gehege
        const a = rng() * Math.PI * 2, r = rng() * (F.pen.r - 2);
        an.tx = F.pen.x + Math.cos(a) * r;
        an.tz = F.pen.z + Math.sin(a) * r;
        an.idle = 2 + rng() * 6;
      }
      const speed = an.type === 'chicken' ? 0.8 : 0.55;
      if (d > 0.3) {
        an.x += dx / d * speed * dt;
        an.z += dz / d * speed * dt;
        an.mesh.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2 + Math.PI / 2;
        an.phase += dt * 7;
        if (an.anim) an.anim.play('Walk');
        else {
          let li = 0;
          for (const leg of an.parts.legs) {
            leg.rotation.x = Math.sin(an.phase + (li++ % 2) * Math.PI) * 0.5;
          }
        }
      } else if (an.anim) {
        an.anim.play('Idle');
      } else {
        for (const leg of an.parts.legs) leg.rotation.x *= 0.9;
        // Hühner picken
        if (an.type === 'chicken') {
          an.mesh.rotation.x = Math.max(0, Math.sin(elapsed * 2.4 + an.phase)) * 0.25;
        }
      }
      if (an.anim) an.anim.update(dt);
      an.mesh.position.set(an.x, terrain.heightAt(an.x, an.z), an.z);
    }
  }

  // ---------- API ----------
  return {
    colliders,
    plotCount,
    plotPos,
    barnWinMat: barn.winMat,

    plotProgress,
    refreshPlots,
    syncAnimals,

    // reifes Beet in Reichweite (für E-Interaktion)
    nearestReadyPlot(px, pz, maxD = 3.2) {
      let best = -1, bd = maxD;
      for (let i = 0; i < plotCount; i++) {
        const p = state.plots[i];
        if (!p || p.daysLeft > 0) continue;
        const d = Math.hypot(px - plotPos[i].x, pz - plotPos[i].z);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    },
    nearestEmptyPlot(px, pz, maxD = 3.2) {
      let best = -1, bd = maxD;
      for (let i = 0; i < plotCount; i++) {
        if (state.plots[i]) continue;
        const d = Math.hypot(px - plotPos[i].x, pz - plotPos[i].z);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    },

    update(dt, elapsed) {
      updateAnimals(dt, elapsed);
      // Wachstum sichtbar skalieren
      for (let i = 0; i < plotCount; i++) {
        const cg = cropGroups[i];
        if (!cg) continue;
        const pr = plotProgress(i);
        const s = 0.15 + 0.85 * pr;
        cg.group.scale.setScalar(s);
        // reif: sanft pulsieren als Signal
        if (state.plots[i] && state.plots[i].daysLeft <= 0) {
          cg.group.scale.setScalar(s * (1 + Math.sin(elapsed * 2.2) * 0.02));
        }
      }
    }
  };
}
