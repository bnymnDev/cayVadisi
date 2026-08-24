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

  const dom = renderer.domElement;

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
    api.onLockChange && api.onLockChange(locked);
  });
  document.addEventListener('mousemove', onMouseMove);
  dom.addEventListener('mousedown', (e) => {
    if (!enabled || locked) return;
    if (e.button === 2) dragging = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 2) dragging = false; });
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

    setEnabled(v) { enabled = v; if (!v) keys.clear(); },

    requestLock() {
      try {
        const p = dom.requestPointerLock && dom.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* ohne User-Geste nicht möglich */ }
    },
    releaseLock() {
      if (document.pointerLockElement) document.exitPointerLock();
    },

    // für Tests / Debug
    teleport(x, z) {
      pos.x = x; pos.z = z;
      pos.y = terrain.heightAt(x, z) + P.eyeHeight;
    },
    look(yaw, pitch) { euler.y = yaw; euler.x = clamp(pitch, -1.45, 1.45); },

    update(dt, hasBoots) {
      if (!enabled) return;
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
      let speed = P.speed * (hasBoots ? P.bootsFactor : 1) * (run ? P.runFactor : 1);

      fwd.set(-Math.sin(euler.y), 0, -Math.cos(euler.y));
      right.set(-fwd.z, 0, fwd.x);
      wish.set(0, 0, 0);
      if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(fwd);
      if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(fwd);
      if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);
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
