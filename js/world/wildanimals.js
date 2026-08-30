// v23: Wildtiere „Vahşi Vadi" — nachts streifen Igel und Fuchs durchs Tal,
// im Morgengrauen äst ein Reh am Waldrand. Sie fliehen, wenn man zu nah
// kommt — wer sie vorher fotografiert, füllt die Wildtier-Sammlung.
import * as THREE from 'three';
import { CFG } from '../config.js';

function makeHedgehog() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 }));
  body.scale.set(1.3, 0.8, 1);
  body.position.y = 0.15;
  g.add(body);
  const spikes = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1, flatShading: true }));
  spikes.scale.set(1.2, 0.75, 0.9);
  spikes.position.set(0, 0.2, -0.03);
  g.add(spikes);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5),
    new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.8 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.12, 0.26);
  g.add(nose);
  return g;
}

function makeFox() {
  const g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xc45f2e, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), orange);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.32;
  g.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 6), orange);
  head.rotation.x = -Math.PI / 2.4;
  head.position.set(0, 0.44, 0.38);
  g.add(head);
  for (const ex of [-0.06, 0.06]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), orange);
    ear.position.set(ex, 0.58, 0.3);
    g.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xd9824a, roughness: 0.85 }));
  tail.rotation.x = Math.PI / 2.6;
  tail.position.set(0, 0.34, -0.42);
  g.add(tail);
  for (const [lx, lz] of [[-0.1, 0.18], [0.1, 0.18], [-0.1, -0.18], [0.1, -0.18]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 5),
      new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.9 }));
    leg.position.set(lx, 0.13, lz);
    g.add(leg);
  }
  return g;
}

function makeDeer() {
  const g = new THREE.Group();
  const brown = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.7, 4, 8), brown);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.72;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 6), brown);
  neck.rotation.x = -0.5;
  neck.position.set(0, 1.05, 0.42);
  g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.3), brown);
  head.position.set(0, 1.3, 0.58);
  g.add(head);
  for (const ax of [-0.08, 0.08]) {
    const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 1 }));
    antler.rotation.z = ax * 4;
    antler.position.set(ax, 1.48, 0.52);
    g.add(antler);
  }
  for (const [lx, lz] of [[-0.13, 0.26], [0.13, 0.26], [-0.13, -0.26], [0.13, -0.26]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.7, 5), brown);
    leg.position.set(lx, 0.35, lz);
    g.add(leg);
  }
  return g;
}

export function createWildAnimals(ctx, terrain) {
  const { scene } = ctx;
  const W = CFG.wildlife2;
  const animals = [
    { id: 'hedgehog', mesh: makeHedgehog(), speed: 0.6, when: 'night' },
    { id: 'fox', mesh: makeFox(), speed: 1.6, when: 'night' },
    { id: 'deer', mesh: makeDeer(), speed: 1.2, when: 'dawn' }
  ];
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const spot = W.spots[i % W.spots.length];
    a.x = spot.x; a.z = spot.z;
    a.tx = spot.x; a.tz = spot.z;
    a.home = spot;
    a.idle = Math.random() * 5;
    a.mesh.visible = false;
    a.mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(a.mesh);
  }

  return {
    // Für die Foto-Erkennung: sichtbare Tiere mit Position
    visibleAnimals() {
      return animals.filter((a) => a.mesh.visible).map((a) => ({ id: a.id, x: a.x, z: a.z }));
    },
    update(dt, elapsed, hour, playerPos) {
      for (const a of animals) {
        const out = a.when === 'night' ? (hour >= 20 || hour < 6.8) : (hour >= 6 && hour < 9);
        a.mesh.visible = out;
        if (!out) continue;
        const pd = Math.hypot(playerPos.x - a.x, playerPos.z - a.z);
        let sp = a.speed;
        if (pd < 6) {
          // Flucht: vom Spieler weg
          a.tx = a.x + (a.x - playerPos.x) * 2;
          a.tz = a.z + (a.z - playerPos.z) * 2;
          sp = a.speed * 3.2;
        } else {
          a.idle -= dt;
          if (a.idle <= 0) {
            const ang = Math.random() * Math.PI * 2;
            a.tx = a.home.x + Math.cos(ang) * 10;
            a.tz = a.home.z + Math.sin(ang) * 10;
            a.idle = 4 + Math.random() * 8;
          }
        }
        const dx = a.tx - a.x, dz = a.tz - a.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.3) {
          a.x += (dx / d) * sp * dt;
          a.z += (dz / d) * sp * dt;
          a.mesh.rotation.y = Math.atan2(dx, dz);
        }
        a.mesh.position.set(a.x, terrain.heightAt(a.x, a.z), a.z);
      }
    }
  };
}
