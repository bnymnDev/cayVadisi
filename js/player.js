// First-Person-Controller: PointerLock + Drag-Fallback, Terrain-Kollision
import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp, lerp } from './util.js';

export function createPlayer(ctx, terrain, getColliders, teaCollide) {
  const { camera, renderer } = ctx;
  const P = CFG.player;

  const pos = new THREE.Vector3(P.spawn.x, 0, P.spawn.z);
  pos.y = terrain.heightAt(pos.x, pos.z) + P.eyeHeight;
  const vel = new THREE.Vector3();
  const euler = new THREE.Euler(0, Math.PI * 0.8, 0, 'YXZ');
  const keys = new Set();
  let locked = false;
  let dragging = false;
  let bobPhase = 0;
  let enabled = false;
  // v27: Springen — airY = Höhe über Boden, groundEye = geglättete Augenhöhe
  let airY = 0, vy = 0, jumpCd = 0;
  let groundEye = pos.y;
  let wantLock = false;    // Spiel möchte PointerLock (First-Person aktiv)
  let relockTimer = 0;     // Auto-Retry: Chrome blockt Lock ~1,3 s nach jedem Exit
  let relockTries = 0;

  const dom = renderer.domElement;

  function tryLock() {
    if (locked || document.pointerLockElement === dom) return;
    try {
      const p = dom.requestPointerLock && dom.requestPointerLock();
      if (p && p.catch) p.catch(() => { if (relockTries < 4) { relockTimer = 1.4; relockTries++; } });
    } catch (e) {
      if (relockTries < 4) { relockTimer = 1.4; relockTries++; }
    }
  }

  function onMouseMove(e) {
    if (!enabled) return;
    if (locked) {
      euler.y -= e.movementX * 0.0023;
      euler.x -= e.movementY * 0.0023;
    } else if (dragging) {
      euler.y -= e.movementX * 0.0042;
      euler.x -= e.movementY * 0.0042;
    } else return;
    euler.x = clamp(euler.x, -1.45, 1.45);
  }

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === dom;
    if (locked) { dragging = false; relockTimer = 0; relockTries = 0; }
    api.onLockChange && api.onLockChange(locked);
  });
  document.addEventListener('pointerlockerror', () => {
    if (wantLock && relockTries < 4) { relockTimer = 1.4; relockTries++; }
  });
  document.addEventListener('mousemove', onMouseMove);
  dom.addEventListener('mousedown', (e) => {
    if (!enabled || locked) return;
    // Klick holt den verlorenen Lock zurück; bis dahin dreht Drag die Kamera
    if (e.button === 0 && wantLock) tryLock();
    if (e.button === 0 || e.button === 2) dragging = true;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  dom.addEventListener('contextmenu', (e) => e.preventDefault());

  // Touch: 1 Finger ziehen = umsehen.
  // v25.1: Der Look-Finger wird über seine Touch-ID verfolgt — vorher nahm
  // der Handler immer touches[0], und sobald der linke Daumen auf dem
  // Joystick lag, drehte DER die Kamera (wildes Rumschauen beim Laufen).
  // Dazu eine kleine Totzone, damit Halten-zum-Pflücken nicht sofort dreht.
  let lookId = null, lookX = 0, lookY = 0, lookMoved = 0;
  dom.addEventListener('touchstart', (e) => {
    if (lookId !== null) return;
    const t = e.changedTouches[0];
    lookId = t.identifier;
    lookX = t.clientX; lookY = t.clientY; lookMoved = 0;
  }, { passive: true });
  dom.addEventListener('touchmove', (e) => {
    if (!enabled || lookId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== lookId) continue;
      const dx = t.clientX - lookX, dy = t.clientY - lookY;
      lookMoved += Math.abs(dx) + Math.abs(dy);
      if (lookMoved > 7) {
        euler.y -= dx * 0.0042 * api.touchSens;
        euler.x = clamp(euler.x - dy * 0.0042 * api.touchSens, -1.45, 1.45);
      }
      lookX = t.clientX; lookY = t.clientY;
    }
  }, { passive: true });
  const endLook = (e) => {
    for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
  };
  dom.addEventListener('touchend', endLook, { passive: true });
  dom.addEventListener('touchcancel', endLook, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    // v27: Leertaste springt (und darf die Seite nicht scrollen)
    if (e.code === 'Space' && enabled) { e.preventDefault(); api.jump(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();

  const api = {
    pos, euler, keys,
    get locked() { return locked; },
    moving: false,
    running: false,
    onLockChange: null,
    touchMove: { x: 0, y: 0 },   // virtueller Joystick (-1..1)
    touchSens: 1,                // v26: Kamera-Empfindlichkeit (Pausenmenü)
    touchAuto: false,            // v26: Auto-Lauf (Doppeltipp/🏃/NumLock)
    autoTarget: null,            // v26.2: Autopilot-Ziel (Auto-Pflücken)
    lastManual: false,           // v26.2: wurde diese Frame manuell gesteuert?
    get airborne() { return airY > 0.25; },   // v27: in der Luft?

    // v27: Sprung — über Büsche hinweg (Kollision setzt in der Luft aus)
    jump() {
      if (!enabled || airY > 0.02 || jumpCd > 0) return false;
      vy = P.jumpVel || 5.6;
      jumpCd = 0.3;
      return true;
    },

    setEnabled(v) { enabled = v; if (!v) keys.clear(); },

    requestLock() {
      wantLock = true;
      relockTries = 0;
      tryLock();
    },
    releaseLock() {
      wantLock = false;
      relockTimer = 0;
      if (document.pointerLockElement) document.exitPointerLock();
    },

    // für Tests / Debug
    teleport(x, z) {
      pos.x = x; pos.z = z;
      airY = 0; vy = 0;
      groundEye = terrain.heightAt(x, z) + P.eyeHeight;
      pos.y = groundEye;
    },
    look(yaw, pitch) { euler.y = yaw; euler.x = clamp(pitch, -1.45, 1.45); },

    update(dt, hasBoots, speedMul = 1) {
      if (!enabled) return;
      // Lock nach Chrome-Cooldown automatisch zurückholen
      if (wantLock && !locked && relockTimer > 0) {
        relockTimer -= dt;
        if (relockTimer <= 0) tryLock();
      }
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
      let speed = P.speed * (hasBoots ? P.bootsFactor : 1) * (run ? P.runFactor : 1) * speedMul;

      fwd.set(-Math.sin(euler.y), 0, -Math.cos(euler.y));
      right.set(-fwd.z, 0, fwd.x);
      wish.set(0, 0, 0);
      if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(fwd);
      if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(fwd);
      if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
      // Virtueller Joystick (Touch)
      const tm = api.touchMove;
      if (tm.x * tm.x + tm.y * tm.y > 0.01) {
        wish.addScaledVector(fwd, -tm.y);
        wish.addScaledVector(right, tm.x);
        if (tm.x * tm.x + tm.y * tm.y > 0.8) speed *= P.runFactor;
      } else if (api.touchAuto) {
        wish.add(fwd);   // v26: Auto-Lauf geradeaus
      }
      const wants = wish.lengthSq() > 0;
      api.lastManual = wants;
      // v26.2: Rückwärts (S) beendet den Auto-Lauf — wie in WoW
      if (api.touchAuto && (keys.has('KeyS') || keys.has('ArrowDown'))) api.touchAuto = false;
      // v26.2: Autopilot — läuft aufs Ziel zu, Kamera dreht sanft mit;
      // jede manuelle Eingabe bricht ab
      if (api.autoTarget) {
        if (wants) api.autoTarget = null;
        else {
          const adx = api.autoTarget.x - pos.x, adz = api.autoTarget.z - pos.z;
          const ad = Math.hypot(adx, adz);
          if (ad > 0.05) {
            wish.set(adx / ad, 0, adz / ad);
            const targetYaw = Math.atan2(-adx, -adz);
            let dyaw = targetYaw - euler.y;
            dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
            euler.y += dyaw * Math.min(1, dt * 5);
          }
        }
      }
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

      vel.x = lerp(vel.x, wish.x, Math.min(1, dt * 9));
      vel.z = lerp(vel.z, wish.z, Math.min(1, dt * 9));

      const nx = pos.x + vel.x * dt;
      const nz = pos.z + vel.z * dt;

      // Ins Meer geht's nicht
      const hNew = terrain.heightAt(nx, nz);
      if (hNew > 0.35) { pos.x = nx; pos.z = nz; }
      else {
        // an der Wasserlinie entlanggleiten
        if (terrain.heightAt(nx, pos.z) > 0.35) pos.x = nx;
        if (terrain.heightAt(pos.x, nz) > 0.35) pos.z = nz;
        api.hitWater = true;
      }

      // Weltgrenzen
      const B = CFG.worldSize * 0.47;
      const px = clamp(pos.x, -B, B), pz = clamp(pos.z, -B, B);
      if (px !== pos.x || pz !== pos.z) { pos.x = px; pos.z = pz; api.hitBoundary = true; }

      // v27: Sprung-Physik (Höhe über Boden, Schwerkraft)
      jumpCd = Math.max(0, jumpCd - dt);
      if (airY > 0 || vy > 0) {
        vy -= (P.gravity || 15) * dt;
        airY += vy * dt;
        if (airY <= 0) { airY = 0; vy = 0; }
      }

      // Kollisionen: Büsche + Requisiten — in der Luft geht's über die Büsche
      if (airY <= 0.25) teaCollide(pos, P.radius);
      for (const c of getColliders()) {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const rr = c.r + P.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / d;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      }

      // Höhe folgen (+ Sprunghöhe obendrauf)
      const groundY = terrain.heightAt(pos.x, pos.z) + P.eyeHeight;
      groundEye = lerp(groundEye, groundY, Math.min(1, dt * 11));
      pos.y = groundEye + airY;

      // Head-Bob & FOV
      const speedNow = Math.hypot(vel.x, vel.z);
      api.moving = speedNow > 0.4;
      api.running = run && api.moving;
      if (api.moving) bobPhase += dt * (run ? 11.5 : 8.2);
      const bob = Math.sin(bobPhase) * 0.035 * Math.min(1, speedNow / 4);

      camera.position.set(pos.x, pos.y + bob, pos.z);
      camera.quaternion.setFromEuler(euler);
      const targetFov = api.running ? 74 : 69;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = lerp(camera.fov, targetFov, Math.min(1, dt * 5));
        camera.updateProjectionMatrix();
      }
    }
  };

  camera.position.copy(pos);
  camera.quaternion.setFromEuler(euler);
  return api;
}
