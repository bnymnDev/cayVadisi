// v17: Fabrik-Ausbau — Anbauhalle mit sichtbaren Produktionslinien.
// Jede gekaufte Linie zeigt ein laufendes Förderband, auf dem Teekisten
// aus der Halle zur Palette wandern. Mehr Linien = mehr Betrieb.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createFactoryExt(ctx, terrain) {
  const { scene } = ctx;
  const F = CFG.factory;
  const g = new THREE.Group();
  const gy = terrain.heightAt(F.x, F.z);
  g.position.set(F.x, gy, F.z);
  g.rotation.y = F.ry;

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5c646c, roughness: 0.7, metalness: 0.2 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.6, metalness: 0.3 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xb3823f, roughness: 0.85 });

  // Anbauhalle seitlich der Fabrik (sichtbar ab Linie 1)
  const hall = new THREE.Group();
  const hallBody = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.4, 5.5), wallMat);
  hallBody.position.set(-7.5, 1.7, 0);
  hall.add(hallBody);
  const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(8.1, 0.3, 6.1), roofMat);
  hallRoof.position.set(-7.5, 3.55, 0);
  hall.add(hallRoof);
  // Rolltore an der Stirnseite (eines je Linie)
  const doors = [];
  for (let i = 0; i < 3; i++) {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x38414a, roughness: 0.55, metalness: 0.4 }));
    door.position.set(-9.5 + i * 2.0, 1.15, 2.78);
    hall.add(door);
    doors.push(door);
  }
  g.add(hall);

  // Förderbänder + wandernde Kisten (eines je Linie)
  const belts = [];
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Group();
    const bx = -9.5 + i * 2.0;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 4.6), beltMat);
    belt.position.set(bx, 0.72, 5.2);
    line.add(belt);
    for (const bz of [3.1, 7.3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.12), beltMat);
      leg.position.set(bx, 0.35, bz);
      line.add(leg);
    }
    const crates = [];
    for (let c = 0; c < 3; c++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.55), crateMat);
      crate.position.set(bx, 0.99, 0);
      line.add(crate);
      crates.push({ mesh: crate, off: c / 3 });
    }
    g.add(line);
    belts.push({ line, crates, phase: Math.random() });
  }

  // Ziel-Palette mit Kistenstapel (wächst mit Linien)
  const pallet = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.95 }));
  base.position.set(-8.6, 0.08, 8.6);
  pallet.add(base);
  const stackCrates = [];
  for (let i = 0; i < 6; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), crateMat);
    crate.position.set(-9.2 + (i % 3) * 0.72, 0.42 + Math.floor(i / 3) * 0.54, 8.6);
    pallet.add(crate);
    stackCrates.push(crate);
  }
  g.add(pallet);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  function sync() {
    const n = state.factoryLines;
    g.visible = n > 0;
    for (let i = 0; i < 3; i++) belts[i].line.visible = i < n;
    for (let i = 0; i < stackCrates.length; i++) stackCrates[i].visible = i < n * 2;
  }
  sync();

  return {
    sync,
    colliders: [],   // Halle steht neben der Fabrik, deren Collider reicht
    update(dt) {
      if (!g.visible) return;
      const n = state.factoryLines;
      for (let i = 0; i < n; i++) {
        const b = belts[i];
        b.phase = (b.phase + dt * 0.22) % 1;
        for (const c of b.crates) {
          const p2 = (b.phase + c.off) % 1;
          c.mesh.position.z = 3.1 + p2 * 4.2;
          c.mesh.visible = p2 > 0.04 && p2 < 0.96;
        }
      }
    }
  };
}
