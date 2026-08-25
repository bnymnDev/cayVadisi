// Fahrzeuge: prozedurale Modelle, Arcade-Fahrphysik, Chase-Cam, Scheinwerfer
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';
import { clamp, lerp } from './util.js';

// ---------- Fahrzeug-Baukasten ----------
function wheel(r, w, dark = 0x1c1c1e, rim = 0x9aa0a6) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, w, 14),
    new THREE.MeshStandardMaterial({ color: dark, roughness: 0.9 })
  );
  tire.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.02, 10),
    new THREE.MeshStandardMaterial({ color: rim, roughness: 0.35, metalness: 0.8 })
  );
  hub.rotation.x = Math.PI / 2;
  g.add(tire, hub);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.5, metalness: opts.metal ?? 0.25 })
  );
  m.castShadow = true;
  return m;
}

// Alle Maße: +z = Fahrtrichtung
export function buildVehicleMesh(id) {
  const g = new THREE.Group();
  const wheels = [];       // {mesh, front}
  let lightPos = [[-0.55, 0.55, 1.9], [0.55, 0.55, 1.9]];

  if (id === 'tractor') {
    const body = box(1.1, 0.75, 2.3, 0x2f7d32, { rough: 0.55 });
    body.position.set(0, 0.95, 0.15);
    const hood = box(0.8, 0.55, 1.1, 0x2f7d32);
    hood.position.set(0, 1.05, 1.15);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.9, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x25313a, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.75 })
    );
    cab.position.set(0, 1.85, -0.35);
    const roof = box(1.15, 0.08, 1.1, 0xdadfe2);
    roof.position.set(0, 2.32, -0.35);
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3c3c3e, roughness: 0.4, metalness: 0.7 })
    );
    pipe.position.set(0.35, 1.9, 1.0);
    g.add(body, hood, cab, roof, pipe);
    for (const [x, z, r, front] of [[-0.72, -0.6, 0.62, false], [0.72, -0.6, 0.62, false], [-0.62, 1.25, 0.38, true], [0.62, 1.25, 0.38, true]]) {
      const w = wheel(r, 0.3);
      w.position.set(x, r, z);
      wheels.push({ mesh: w, front, r });
      g.add(w);
    }
    lightPos = [[-0.35, 1.15, 1.72], [0.35, 1.15, 1.72]];
  } else if (id === 'pickup') {
    const base = box(1.5, 0.5, 3.6, 0xd8d2c4, { rough: 0.45 });
    base.position.set(0, 0.75, 0);
    const cab = box(1.4, 0.55, 1.3, 0xd8d2c4);
    cab.position.set(0, 1.25, 0.55);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.4, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x233038, roughness: 0.15, metalness: 0.3 })
    );
    glass.position.set(0, 1.3, 0.55);
    const bedL = box(0.08, 0.35, 1.6, 0xc4beb0);
    bedL.position.set(-0.71, 1.1, -1.0);
    const bedR = bedL.clone(); bedR.position.x = 0.71;
    const bedB = box(1.5, 0.35, 0.08, 0xc4beb0);
    bedB.position.set(0, 1.1, -1.76);
    g.add(base, cab, glass, bedL, bedR, bedB);
    for (const [x, z] of [[-0.78, -1.15], [0.78, -1.15], [-0.78, 1.15], [0.78, 1.15]]) {
      const w = wheel(0.38, 0.26);
      w.position.set(x, 0.38, z);
      wheels.push({ mesh: w, front: z > 0, r: 0.38 });
      g.add(w);
    }
    lightPos = [[-0.55, 0.8, 1.82], [0.55, 0.8, 1.82]];
  } else if (id === 'sedan') {
    const base = box(1.55, 0.45, 3.8, 0x4a6b8a, { rough: 0.3, metal: 0.5 });
    base.position.set(0, 0.65, 0);
    const cabin = box(1.35, 0.45, 1.9, 0x4a6b8a, { rough: 0.3, metal: 0.5 });
    cabin.position.set(0, 1.08, -0.1);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.38, 1.75),
      new THREE.MeshStandardMaterial({ color: 0x1d2830, roughness: 0.12, metalness: 0.4 })
    );
    glass.position.set(0, 1.1, -0.1);
    g.add(base, cabin, glass);
    for (const [x, z] of [[-0.8, -1.25], [0.8, -1.25], [-0.8, 1.25], [0.8, 1.25]]) {
      const w = wheel(0.34, 0.24);
      w.position.set(x, 0.34, z);
      wheels.push({ mesh: w, front: z > 0, r: 0.34 });
      g.add(w);
    }
    lightPos = [[-0.55, 0.7, 1.92], [0.55, 0.7, 1.92]];
  } else { // lux — tiefer Sportwagen
    const base = box(1.7, 0.35, 4.0, 0xa31621, { rough: 0.15, metal: 0.75 });
    base.position.set(0, 0.5, 0);
    const nose = box(1.5, 0.22, 0.8, 0xa31621, { rough: 0.15, metal: 0.75 });
    nose.position.set(0, 0.45, 1.95);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.4, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.08, metalness: 0.6 })
    );
    cabin.position.set(0, 0.85, -0.2);
    const spoiler = box(1.5, 0.06, 0.4, 0xa31621, { rough: 0.2, metal: 0.7 });
    spoiler.position.set(0, 0.95, -1.95);
    for (const s of [-1, 1]) {
      const strut = box(0.06, 0.25, 0.1, 0x14181c);
      strut.position.set(s * 0.55, 0.78, -1.9);
      g.add(strut);
    }
    g.add(base, nose, cabin, spoiler);
    for (const [x, z] of [[-0.85, -1.3], [0.85, -1.3], [-0.85, 1.35], [0.85, 1.35]]) {
      const w = wheel(0.33, 0.28, 0x111114, 0xd8a531);   // Goldfelgen
      w.position.set(x, 0.33, z);
      wheels.push({ mesh: w, front: z > 0, r: 0.33 });
      g.add(w);
    }
    lightPos = [[-0.6, 0.55, 2.02], [0.6, 0.55, 2.02]];
  }

  // Scheinwerfer-Kugeln (emissiv) + Rücklichter
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff6d8, emissive: 0xfff0b8, emissiveIntensity: 0, roughness: 0.3
  });
  for (const [x, y, z] of lightPos) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), headMat);
    h.position.set(x, y, z);
    g.add(h);
  }
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x5a1210, emissive: 0xff2a1a, emissiveIntensity: 0, roughness: 0.4
  });
  for (const [x, y, z] of lightPos) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), tailMat);
    t.position.set(x, y, -z);
    g.add(t);
  }

  return { group: g, wheels, headMat, tailMat, lightPos };
}

// ---------- Fahr-System ----------
export function createVehicles(ctx, terrain, player, getColliders) {
  const { scene, camera } = ctx;
  const V = CFG.vehicles;

  const fleet = {};        // id -> {mesh-parts, x, z, yaw, v, steer}
  let driving = null;      // id
  const spot = new THREE.SpotLight(0xfff2cc, 0, 40, 0.55, 0.5, 1.2);
  spot.visible = false;
  scene.add(spot, spot.target);

  // Ausstellungsstücke im Autohaus (nicht fahrbar, drehen sich)
  const displays = [];
  {
    const D = CFG.city.dealer;
    const ids = Object.keys(V);
    ids.forEach((id, i) => {
      const { group } = buildVehicleMesh(id);
      const lx = -3.9 + (i % 2) * 7.8;
      const lz = -1.8 + Math.floor(i / 2) * 3.6;
      // in Dealer-Rotation einbetten
      const cx = D.x + Math.cos(-D.ry) * lx - Math.sin(-D.ry) * lz;
      const cz = D.z + Math.sin(-D.ry) * lx + Math.cos(-D.ry) * lz;
      group.position.set(cx, terrain.heightAt(D.x, D.z) + 0.26, cz);
      group.scale.setScalar(0.82);
      scene.add(group);
      displays.push({ id, group });
    });
  }

  function parkPos(i) {
    const P = CFG.parking;
    return { x: P.x + (i % 2) * 3.4, z: P.z + Math.floor(i / 2) * 4.6 };
  }

  function syncOwned() {
    let i = 0;
    for (const id of Object.keys(V)) {
      if (state.vehicles[id] && !fleet[id]) {
        const parts = buildVehicleMesh(id);
        const p = parkPos(i);
        fleet[id] = {
          ...parts, x: p.x, z: p.z, yaw: Math.PI * 0.5, v: 0, steer: 0
        };
        parts.group.position.set(p.x, terrain.heightAt(p.x, p.z), p.z);
        parts.group.rotation.y = fleet[id].yaw;
        scene.add(parts.group);
      }
      if (state.vehicles[id]) i++;
    }
  }
  syncOwned();

  const fwd = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const tiltQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion();

  const api = {
    get driving() { return driving; },
    syncOwned,

    // nächstes eigenes Fahrzeug in Reichweite
    nearest(px, pz, maxD = 3.4) {
      let best = null, bd = maxD;
      for (const [id, f] of Object.entries(fleet)) {
        const d = Math.hypot(px - f.x, pz - f.z);
        if (d < bd) { bd = d; best = id; }
      }
      return best;
    },

    // Cargo-Bonus: größtes Fahrzeug in der Nähe zählt als Anhänger/Ladefläche
    cargoMul(px, pz) {
      let mul = 1;
      for (const [id, f] of Object.entries(fleet)) {
        if (Math.hypot(px - f.x, pz - f.z) < 18) mul = Math.max(mul, V[id].cargo);
      }
      return mul;
    },

    enter(id) {
      if (!fleet[id]) return false;
      driving = id;
      player.setEnabled(false);
      player.releaseLock();
      spot.visible = true;
      return true;
    },

    exit() {
      if (!driving) return;
      const f = fleet[driving];
      f.v = 0;
      // Spieler neben das Fahrzeug stellen
      const sx = f.x + Math.cos(f.yaw) * 1.6;
      const sz = f.z - Math.sin(f.yaw) * 1.6;
      player.teleport(sx, sz);
      player.look(f.yaw + Math.PI, 0);
      driving = null;
      spot.visible = false;
      player.setEnabled(true);
    },

    speedKmh() {
      if (!driving) return 0;
      return Math.abs(fleet[driving].v) * 3.6;
    },
    throttle01() {
      if (!driving) return 0;
      return clamp(Math.abs(fleet[driving].v) / V[driving].speed, 0, 1);
    },

    // Touch-Steuerung (wird von ui.js gesetzt)
    touchSteer: 0,      // -1..1
    touchGas: 0,        // -1..1

    update(dt, elevN, rainT) {
      // Ausstellungsstücke drehen
      for (const d of displays) d.group.rotation.y += dt * 0.25;

      const dark = Math.max(1 - elevN * 2.6, rainT * 0.4);
      for (const [id, f] of Object.entries(fleet)) {
        const isD = driving === id;
        f.headMat.emissiveIntensity = (isD ? 1 : 0) * clamp(dark, 0, 1) * 3;
        f.tailMat.emissiveIntensity = isD ? (clamp(dark, 0, 1) * 2 + (f.braking ? 2.5 : 0)) : 0;
      }

      if (!driving) return;
      const f = fleet[driving];
      const spec = V[driving];
      const keys = player.keys;

      // Eingabe
      let gas = 0, steer = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) gas += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) gas -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer += 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer -= 1;
      gas += api.touchGas;
      steer += -api.touchSteer;
      gas = clamp(gas, -1, 1); steer = clamp(steer, -1, 1);
      f.braking = gas < -0.1 && f.v > 0.5;

      // Beschleunigung / Widerstand
      const topSpeed = spec.speed * (state.raining ? 0.85 : 1);
      const accel = spec.accel * (gas >= 0 ? 1 : 1.6);
      f.v += gas * accel * dt;
      f.v -= f.v * (0.6 + Math.abs(steer) * 0.25) * dt;     // Roll-/Kurvenwiderstand
      f.v = clamp(f.v, -topSpeed * 0.4, topSpeed);
      if (Math.abs(f.v) < 0.05 && gas === 0) f.v = 0;

      // Lenkung (geschwindigkeitsabhängig)
      const steerEff = steer * clamp(Math.abs(f.v) / 3, 0, 1) * 1.4 * Math.sign(f.v || 1);
      f.yaw += steerEff * dt;
      f.steer = lerp(f.steer, steer, Math.min(1, dt * 8));

      // Bewegung (+z lokal = Welt-Richtung aus yaw)
      const dx = Math.sin(f.yaw) * f.v * dt;
      const dz = Math.cos(f.yaw) * f.v * dt;
      const nx = f.x + dx, nz = f.z + dz;
      const hNew = terrain.heightAt(nx, nz);
      const hCur = terrain.heightAt(f.x, f.z);
      // Wasser & steile Böschung blockieren
      if (hNew > 0.45 && (hNew - hCur) < 1.4) {
        f.x = nx; f.z = nz;
      } else {
        f.v *= 0.3;
      }
      // Weltgrenzen
      const B = CFG.worldSize * 0.47;
      f.x = clamp(f.x, -B, B);
      f.z = clamp(f.z, -B, B);

      // Kollisionen mit Requisiten (weiches Herausdrücken)
      for (const c of getColliders()) {
        const ddx = f.x - c.x, ddz = f.z - c.z;
        const rr = c.r + 1.2;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / d;
          f.x += ddx * push;
          f.z += ddz * push;
          f.v *= 0.6;
        }
      }

      // Aufsetzen aufs Terrain + Neigung
      const y = terrain.heightAt(f.x, f.z);
      const n = terrain.normalAt(f.x, f.z);
      f.group.position.set(f.x, y, f.z);
      yawQ.setFromAxisAngle(up, f.yaw);
      tiltQ.setFromUnitVectors(up, n);
      f.group.quaternion.copy(tiltQ).multiply(yawQ);

      // Räder drehen & lenken
      for (const w of f.wheels) {
        w.mesh.rotation.x += (f.v / w.r) * dt;
        if (w.front) w.mesh.rotation.y = f.steer * 0.45;
      }

      // Spieler "sitzt" im Fahrzeug (für Audio-Distanzen etc.)
      player.pos.set(f.x, y + 1.4, f.z);

      // Chase-Cam
      const dist = driving === 'lux' ? 7.5 : 6.5;
      camTarget.set(f.x, y + 1.6, f.z);
      camPos.set(
        f.x - Math.sin(f.yaw) * dist,
        y + 3.0 + Math.abs(f.v) * 0.02,
        f.z - Math.cos(f.yaw) * dist
      );
      camera.position.lerp(camPos, Math.min(1, dt * 5));
      camera.lookAt(camTarget);

      // Scheinwerfer-Spot
      spot.intensity = clamp(dark, 0, 1) * 60;
      spot.position.set(f.x + Math.sin(f.yaw) * 1.6, y + 1.2, f.z + Math.cos(f.yaw) * 1.6);
      spot.target.position.set(f.x + Math.sin(f.yaw) * 16, y - 0.5, f.z + Math.cos(f.yaw) * 16);
    }
  };

  return api;
}
