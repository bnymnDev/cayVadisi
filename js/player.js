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
  let lastTouch = null;
  let bobPhase = 0;
  let enabled = false;
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

  // Touch: 1 Finger ziehen = umsehen
  dom.addEventListener('touchstart', (e) => { lastTouch = e.touches[0]; }, { passive: true });
  dom.addEventListener('touchmove', (e) => {
    if (!enabled || !lastTouch) return;
    const t = e.touches[0];
    euler.y -= (t.clientX - lastTouch.clientX) * 0.005;
    euler.x = clamp(euler.x - (t.clientY - lastTouch.clientY) * 0.005, -1.45, 1.45);
    lastTouch = t;
  }, { passive: true });
  dom.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
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
      pos.y = terrain.heightAt(x, z) + P.eyeHeight;
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
      }
      const wants = wish.lengthSq() > 0;
      if (wants) wish.normalize().multiplyScalar(speed);

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

      // Kollisionen: Büsche + Requisiten
      teaCollide(pos, P.radius);
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

      // Höhe folgen
      const groundY = terrain.heightAt(pos.x, pos.z) + P.eyeHeight;
      pos.y = lerp(pos.y, groundY, Math.min(1, dt * 11));

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
