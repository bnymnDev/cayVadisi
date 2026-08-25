// v8: Rodelhang — im Winter mit dem Holzschlitten den Teehang hinunter
import * as THREE from 'three';
import { CFG } from './config.js';
import { t } from './i18n.js';

function buildSledMesh() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5c36, roughness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.35, metalness: 0.7 });
  for (const s of [-1, 1]) {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.7), steel);
    runner.position.set(s * 0.32, 0.08, 0);
    g.add(runner);
  }
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.28), wood);
    slat.position.set(0, 0.32, -0.6 + i * 0.42);
    g.add(slat);
  }
  for (const [x, z] of [[-0.32, -0.6], [0.32, -0.6], [-0.32, 0.7], [0.32, 0.7]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.07), wood);
    post.position.set(x, 0.2, z);
    g.add(post);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createSled(ctx, terrain, player, ui, audio) {
  const { scene, camera } = ctx;
  const S = CFG.sled;
  const mesh = buildSledMesh();
  mesh.position.set(S.top.x, terrain.heightAt(S.top.x, S.top.z), S.top.z);
  mesh.visible = false;
  scene.add(mesh);

  let winter = false;
  let riding = false;
  let x = S.top.x, z = S.top.z, yaw = Math.PI, v = 0;
  let rideTime = 0;

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  return {
    get riding() { return riding; },
    setWinter(snowT) {
      winter = snowT > S.minSnow;
      mesh.visible = winter && !riding ? true : riding;
      if (!winter && riding) this.exit();
      if (!riding) {
        x = S.top.x; z = S.top.z;
        mesh.position.set(x, terrain.heightAt(x, z), z);
        mesh.rotation.set(0, Math.PI, 0);
      }
    },
    nearSled(px, pz) {
      return winter && !riding && Math.hypot(px - x, pz - z) < 3.5;
    },
    enter() {
      if (!winter || riding) return false;
      riding = true;
      v = 2.5;               // Anschieben!
      // Blick exakt hangabwärts (aus der Terrain-Neigung)
      const n0 = terrain.normalAt(x, z);
      yaw = Math.hypot(n0.x, n0.z) > 0.01 ? Math.atan2(n0.x, n0.z) : Math.PI;
      rideTime = 0;
      player.setEnabled(false);
      player.releaseLock();
      audio.gondola();
      ui.toast(t('sledGo'), true, 3500);
      return true;
    },
    exit() {
      if (!riding) return;
      riding = false;
      const sx = x + 1.2, sz = z;
      player.teleport(sx, sz);
      player.setEnabled(true);
      mesh.visible = winter;
    },
    update(dt, elapsed) {
      if (!riding) return;
      rideTime += dt;
      const keys = player.keys;
      let steer = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer += 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer -= 1;

      // Hangneigung treibt an
      const n = terrain.normalAt(x, z);
      const gx = n.x, gz = n.z;                    // zeigt hangabwärts
      const grade = Math.hypot(gx, gz);
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const push = (gx * fx + gz * fz) * 26;       // Beschleunigung entlang Blick
      v += push * dt;
      v -= v * 0.35 * dt;                          // Schneereibung
      v = Math.max(0, Math.min(v, 16));
      yaw += steer * 1.6 * dt * Math.min(1, v / 3);

      const nx = x + fx * v * dt;
      const nz = z + fz * v * dt;
      if (terrain.heightAt(nx, nz) > 0.6) { x = nx; z = nz; }
      else v = 0;

      const y = terrain.heightAt(x, z);
      mesh.visible = true;
      mesh.position.set(x, y + 0.05, z);
      mesh.rotation.y = yaw;
      player.pos.set(x, y + 1.1, z);

      if (Math.random() < dt * 5 && v > 4) audio.step(true);   // Schnee spritzt

      // Chase-Cam
      camTarget.set(x, y + 1.0, z);
      camPos.set(x - fx * 5.5, y + 2.6, z - fz * 5.5);
      camera.position.lerp(camPos, Math.min(1, dt * 5));
      camera.lookAt(camTarget);

      // Am Hangfuß ausrollen
      if (rideTime > 2 && v < 0.7 && grade < 0.08) {
        ui.toast(t('sledDone', Math.round(rideTime)), true, 5000);
        audio.orderDone();
        this.exit();
      }
    }
  };
}
