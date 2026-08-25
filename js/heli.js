// v9: Helikopter — Endgame-Fahrzeug, frei übers ganze Tal fliegen
// Steuerung: W/S vor/zurück, A/D drehen, Leertaste steigen, Shift sinken.
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';
import { clamp, lerp } from './util.js';

function buildHeliMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.35, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.5, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1d2830, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.85 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.8, 6, 10), bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 1.35;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.35, 1.35);
  g.add(nose);
  // Heckausleger + Leitwerk
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 3.2, 8), bodyMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 1.55, -2.6);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.5), bodyMat);
  fin.position.set(0, 2.0, -4.1);
  g.add(fin);
  // Kufen
  for (const sgn of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), darkMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sgn * 0.75, 0.16, 0.1);
    g.add(skid);
    for (const zz of [-0.7, 0.9]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), darkMat);
      strut.rotation.z = sgn * 0.35;
      strut.position.set(sgn * 0.62, 0.55, zz);
      g.add(strut);
    }
  }
  // Rotoren
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.05, 0.32), darkMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 2.45;
  g.add(rotor);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 8), darkMat);
  mast.position.y = 2.2;
  g.add(mast);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.18), darkMat);
  tailRotor.position.set(0.16, 1.75, -4.05);
  g.add(tailRotor);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, rotor, tailRotor };
}

export function createHeli(ctx, terrain, player, audio) {
  const { scene, camera } = ctx;
  const H = CFG.heli;
  let parts = null;
  let x = H.pad.x, z = H.pad.z, y = 0, yaw = -0.6;
  let v = 0, vy = 0;
  let driving = false;
  let rotorSpeed = 0;

  function syncOwned() {
    if (state.heli && !parts) {
      parts = buildHeliMesh();
      y = terrain.heightAt(x, z);
      parts.group.position.set(x, y, z);
      parts.group.rotation.y = yaw;
      scene.add(parts.group);
    }
  }
  syncOwned();

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  const api = {
    get driving() { return driving; },
    get pos() { return { x, z, y }; },
    grounded() { return y <= terrain.heightAt(x, z) + 0.05 && Math.abs(v) < 1 && Math.abs(vy) < 0.5; },
    syncOwned,
    touchGas: 0, touchSteer: 0,

    near(px, pz) {
      return state.heli && parts && !driving && Math.hypot(px - x, pz - z) < 5;
    },

    enter() {
      if (!parts || driving) return false;
      driving = true;
      player.setEnabled(false);
      player.releaseLock();
      audio.engineStart();
      return true;
    },

    exit() {
      if (!driving) return;
      driving = false;
      v = 0; vy = 0;
      y = terrain.heightAt(x, z);
      audio.engineStop();
      player.teleport(x + 2.2, z + 1);
      player.setEnabled(true);
    },

    speedKmh() { return Math.abs(v) * 3.6; },
    altitude() { return Math.max(0, y - terrain.heightAt(x, z)); },

    update(dt, elapsed) {
      if (!parts) return;
      // Rotor dreht hoch/runter
      const wantRotor = driving ? 26 : 0;
      rotorSpeed = lerp(rotorSpeed, wantRotor, Math.min(1, dt * 1.5));
      parts.rotor.rotation.y += rotorSpeed * dt;
      parts.tailRotor.rotation.x += rotorSpeed * 2.2 * dt;

      if (!driving) return;
      const keys = player.keys;
      let gas = 0, steer = 0, lift = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) gas += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) gas -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer += 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer -= 1;
      if (keys.has('Space')) lift += 1;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) lift -= 1;
      gas += api.touchGas;
      steer += -api.touchSteer;
      gas = clamp(gas, -1, 1); steer = clamp(steer, -1, 1);

      v += gas * H.accel * dt;
      v -= v * 0.5 * dt;
      v = clamp(v, -H.speed * 0.3, H.speed);
      yaw += steer * 1.5 * dt;
      vy += lift * H.lift * dt;
      vy -= vy * 1.8 * dt;

      x += Math.sin(yaw) * v * dt;
      z += Math.cos(yaw) * v * dt;
      y += vy * dt;
      const B = CFG.worldSize * 0.47;
      x = clamp(x, -B, B);
      z = clamp(z, -B, B);
      const ground = terrain.heightAt(x, z);
      y = clamp(y, ground, ground + H.maxAlt);
      if (y <= ground + 0.02) { y = ground; if (vy < 0) vy = 0; }

      parts.group.position.set(x, y, z);
      parts.group.rotation.set(clamp(v * 0.012, -0.28, 0.28), yaw, clamp(-steer * 0.14, -0.2, 0.2), 'YXZ');

      player.pos.set(x, y + 1.4, z);
      audio.engineUpdate(0.5 + Math.abs(v) / H.speed * 0.5, api.speedKmh());

      // Chase-Cam (höher, weiter weg)
      camTarget.set(x, y + 1.6, z);
      camPos.set(x - Math.sin(yaw) * 11, y + 4.5, z - Math.cos(yaw) * 11);
      camera.position.lerp(camPos, Math.min(1, dt * 4.5));
      camera.lookAt(camTarget);
    }
  };
  return api;
}
