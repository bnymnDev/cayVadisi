// v7: Kangal-Hund — treuer Begleiter, folgt dem Spieler durchs Tal
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

function buildDogMesh() {
  const g = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 0.95 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.62, 4, 8), furMat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.52;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), furMat);
  head.position.set(0, 0.78, 0.5);
  g.add(head);
  // dunkle Schnauze — das Kangal-Markenzeichen
  const muzzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.12, 4, 6), darkMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.72, 0.72);
  g.add(muzzle);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 5), darkMat);
    ear.rotation.x = -0.3;
    ear.position.set(s * 0.13, 0.96, 0.44);
    g.add(ear);
  }
  // Beine (werden im Lauf animiert)
  const legs = [];
  for (const [x, z] of [[-0.16, 0.32], [0.16, 0.32], [-0.16, -0.3], [0.16, -0.3]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 3, 6), furMat);
    leg.position.set(x, 0.24, z);
    g.add(leg);
    legs.push(leg);
  }
  // Ringelrute
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 6, 10, Math.PI * 1.4), furMat);
  tail.position.set(0, 0.78, -0.52);
  tail.rotation.y = Math.PI / 2;
  g.add(tail);
  // Halsband
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a2e1d, roughness: 0.6 }));
  collar.rotation.x = 1.2;
  collar.position.set(0, 0.7, 0.36);
  g.add(collar);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, legs, tail };
}

export function createDog(ctx, terrain, player, audio) {
  const { scene } = ctx;
  let parts = null;
  let x = CFG.home.x + 3, z = CFG.home.z + 2, yaw = 0;
  let speed = 0;
  let phase = 0;
  let barkTimer = 12;

  function syncOwned() {
    if (state.dog && !parts) {
      parts = buildDogMesh();
      x = player.pos.x + 1.5;
      z = player.pos.z + 1.5;
      parts.group.position.set(x, terrain.heightAt(x, z), z);
      scene.add(parts.group);
    }
  }
  syncOwned();

  return {
    syncOwned,
    get pos() { return { x, z }; },
    update(dt, elapsed) {
      if (!parts) return;
      // Ziel: schräg hinter dem Spieler
      const tx = player.pos.x + Math.sin(player.euler.y + 2.4) * 1.6;
      const tz = player.pos.z + Math.cos(player.euler.y + 2.4) * 1.6;
      const dx = tx - x, dz = tz - z;
      const d = Math.hypot(dx, dz);
      if (d > 45) { x = tx; z = tz; }        // weit abgehängt: aufholen (Teleport)
      const want = d > 12 ? 7.5 : d > 2.2 ? Math.min(6, d * 1.8) : 0;
      speed += (want - speed) * Math.min(1, dt * 5);
      if (d > 0.2 && speed > 0.05) {
        x += dx / d * speed * dt;
        z += dz / d * speed * dt;
        const targetYaw = Math.atan2(dx, dz);
        let dy = targetYaw - yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        yaw += dy * Math.min(1, dt * 7);
      }
      const y = terrain.heightAt(x, z);
      parts.group.position.set(x, Math.max(y, 0.35), z);
      parts.group.rotation.y = yaw;
      // Lauf-Animation
      phase += speed * dt * 3.2;
      parts.legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(phase + (i % 2 ? Math.PI : 0)) * Math.min(0.7, speed * 0.2);
      });
      // Rute wedelt, wenn der Hund nah beim Spieler steht
      parts.tail.rotation.z = d < 3 ? Math.sin(elapsed * 9) * 0.5 : 0;
      // gelegentliches Bellen beim Rennen
      barkTimer -= dt;
      if (barkTimer <= 0) {
        barkTimer = 16 + Math.random() * 22;
        if (speed > 3 && audio.bark) audio.bark();
      }
    }
  };
}
