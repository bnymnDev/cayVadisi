// v4: Kleiner Flugplatz — Landebahn, Propellermaschine, Windsack
import * as THREE from 'three';
import { CFG } from '../config.js';
import { makeSignTexture } from './structures.js';

export function createAirport(ctx, terrain, mats) {
  const { scene } = ctx;
  const A = CFG.airport;
  const y = terrain.heightAt(A.x, A.z);
  const colliders = [];

  const g = new THREE.Group();
  g.position.set(A.x, y, A.z);
  g.rotation.y = A.ry;

  // Landebahn
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.12, 38),
    new THREE.MeshStandardMaterial({ color: 0x5c5f63, roughness: 0.85 })
  );
  strip.position.y = 0.06;
  strip.receiveShadow = true;
  g.add(strip);
  // Mittellinie
  for (let i = -4; i <= 4; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.02, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.8 })
    );
    line.position.set(0, 0.13, i * 4);
    g.add(line);
  }

  // Mini-Terminal
  const hutW = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 3.2), mats.woodMat);
  hutW.position.set(-7, 1.3, 8);
  g.add(hutW);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 3.6), mats.steelMat);
  roof.position.set(-7, 2.7, 8);
  g.add(roof);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 0.6),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('HAVAALANI', '#274a63'), roughness: 0.6 })
  );
  sign.position.set(-7, 3.2, 9.85);
  g.add(sign);

  // Windsack
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 3.4, 6),
    new THREE.MeshStandardMaterial({ color: 0xcfd2d6, roughness: 0.5, metalness: 0.5 })
  );
  pole.position.set(6, 1.7, 12);
  g.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 1.1, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xd8642c, roughness: 0.9, side: THREE.DoubleSide })
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(6.6, 3.3, 12);
  g.add(sock);

  // Propellermaschine
  const plane = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.4, metalness: 0.25 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xb33a2e, roughness: 0.45, metalness: 0.2 });
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 3.4, 4, 10), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 1.15;
  plane.add(fuselage);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.09, 1.25), accentMat);
  wing.position.set(0, 1.62, 0.3);
  plane.add(wing);
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.75), accentMat);
  tailV.position.set(0, 1.75, -2.25);
  plane.add(tailV);
  const tailH = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 0.65), accentMat);
  tailH.position.set(0, 1.42, -2.2);
  plane.add(tailH);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x233038, roughness: 0.12, metalness: 0.35 })
  );
  glass.position.set(0, 1.5, 0.75);
  plane.add(glass);
  const prop = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.5 }));
    blade.rotation.z = a;
    prop.add(blade);
  }
  prop.position.set(0, 1.15, 2.35);
  plane.add(prop);
  for (const [wx, wz] of [[-0.9, 0.5], [0.9, 0.5], [0, -1.9]]) {
    const wheelM = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10),
      new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 })
    );
    wheelM.rotation.x = Math.PI / 2;
    wheelM.rotation.z = Math.PI / 2;
    wheelM.position.set(wx, 0.22, wz);
    plane.add(wheelM);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), bodyMat);
    strut.position.set(wx, 0.6, wz);
    plane.add(strut);
  }
  plane.position.set(3.2, 0.12, -6);
  plane.rotation.y = 0.25;
  g.add(plane);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  // Kollisionen (Weltkoordinaten)
  const cos = Math.cos(-A.ry), sin = Math.sin(-A.ry);
  const toWorld = (lx, lz) => ({ x: A.x + cos * lx - sin * lz, z: A.z + sin * lx + cos * lz });
  const term = toWorld(-7, 8);
  colliders.push({ x: term.x, z: term.z, r: 2.6 });
  const pl = toWorld(3.2, -6);
  colliders.push({ x: pl.x, z: pl.z, r: 2.2 });

  return {
    colliders,
    update(dt, elapsed) {
      prop.rotation.z += dt * 2.2;                       // Standlauf-Idle
      sock.rotation.y = Math.sin(elapsed * 0.6) * 0.4;   // Windsack weht
    }
  };
}
