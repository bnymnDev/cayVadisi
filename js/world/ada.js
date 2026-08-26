// v14: Insel „Ada" — nur per Boot/Gulet erreichbar. Leuchtturm zum
// Restaurieren, wilder Honig, Schmugglerhöhle, bester Angelspot des Spiels
// und eine Möwenkolonie. Die Höhen-Zone wird NACH Terrain-Mesh & Minimap
// registriert (gleiches Muster wie der İstanbul-Kai).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createAda(ctx, terrain, mats) {
  const { scene } = ctx;
  const A = CFG.ada;
  const g = new THREE.Group();

  // Inselkörper: Sandsockel + Grasplateau
  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(A.r, A.r * 1.18, 1.6, 26),
    new THREE.MeshStandardMaterial({ color: 0xcbb98f, roughness: 1 })
  );
  sand.position.set(A.cx, 0.8, A.cz);
  g.add(sand);
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(A.r * 0.94, A.r, 0.7, 26),
    new THREE.MeshStandardMaterial({ color: 0x5f7d4a, roughness: 0.95 })
  );
  grass.position.set(A.cx, A.zone.h - 0.35, A.cz);
  g.add(grass);
  // ein paar Felsen am Ufer
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7d7a72, roughness: 0.95 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + (i % 3) * 0.4, 0), rockMat);
    rock.position.set(A.cx + Math.cos(a) * (A.r - 1), A.zone.h * 0.5, A.cz + Math.sin(a) * (A.r - 1));
    rock.rotation.set(i, i * 2, 0);
    g.add(rock);
  }

  // ---- Leuchtturm (Ruine -> restauriert mit Leuchtfeuer) ----
  const L = A.lighthouse;
  const ruin = new THREE.Group();
  {
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 3.2, 12), rockMat);
    stump.position.set(0, A.zone.h + 1.6, 0);
    ruin.add(stump);
    for (let i = 0; i < 4; i++) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat);
      rubble.position.set(1.8 - i, A.zone.h + 0.3, 1.2 + (i % 2));
      ruin.add(rubble);
    }
  }
  const done = new THREE.Group();
  let beacon = null;
  {
    const white = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.8 });
    const red = new THREE.MeshStandardMaterial({ color: 0xa53f3f, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.25 - i * 0.16, 1.35 - i * 0.16, 2.1, 14), i % 2 ? red : white);
      seg.position.set(0, A.zone.h + 1.05 + i * 2.1, 0);
      done.add(seg);
    }
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 10),
      new THREE.MeshStandardMaterial({ color: 0x2e3a44, roughness: 0.4 }));
    cab.position.set(0, A.zone.h + 9.1, 0);
    done.add(cab);
    beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 0 }));
    beacon.position.set(0, A.zone.h + 9.1, 0);
    done.add(beacon);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.8, 10), red);
    roof.position.set(0, A.zone.h + 10.05, 0);
    done.add(roof);
  }
  ruin.position.set(L.x, 0, L.z);
  done.position.set(L.x, 0, L.z);
  g.add(ruin, done);

  // ---- Schmugglerhöhle: Felsbogen + Kiste ----
  const cave = new THREE.Group();
  {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.6, 8, 12, Math.PI), rockMat);
    arch.position.set(0, A.zone.h, 0);
    cave.add(arch);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.85 }));
    chest.position.set(0, A.zone.h + 0.3, 0.4);
    cave.add(chest);
  }
  cave.position.set(A.cave.x, 0, A.cave.z);
  g.add(cave);

  // ---- wilde Bienenstöcke + Angel-Schild ----
  const hiveMat = new THREE.MeshStandardMaterial({ color: 0xc9a35a, roughness: 0.9 });
  for (const [hx, hz] of [[A.honey.x, A.honey.z], [A.honey.x + 1.4, A.honey.z + 1]]) {
    const hive = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 9), hiveMat);
    hive.position.set(hx, A.zone.h + 0.4, hz);
    g.add(hive);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
  rod.position.set(A.fishSpot.x, A.zone.h + 0.75, A.fishSpot.z);
  rod.rotation.z = 0.5;
  g.add(rod);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  // Höhen-Zone NACH Mesh & Minimap registrieren (siehe CLAUDE.md)
  terrain.addHeightZone(A.zone);

  function sync() {
    ruin.visible = state.ada.light < 2;
    done.visible = state.ada.light >= 2;
    cave.children[1].visible = !state.ada.cave;   // Kiste weg nach dem Plündern
  }
  sync();

  const near = (px, pz, tx, tz, r = CFG.interactDist + 2) => Math.hypot(px - tx, pz - tz) < r;

  return {
    sync,
    colliders: [
      { x: L.x, z: L.z, r: 1.8 },
      { x: A.cave.x, z: A.cave.z, r: 1.4 }
    ],
    onIsland(px, pz) {
      return px >= A.zone.x0 && px <= A.zone.x1 && pz >= A.zone.z0 && pz <= A.zone.z1;
    },
    nearLight(px, pz) { return near(px, pz, L.x, L.z, CFG.interactDist + 3); },
    nearCave(px, pz) { return near(px, pz, A.cave.x, A.cave.z); },
    nearFish(px, pz) { return near(px, pz, A.fishSpot.x, A.fishSpot.z); },
    nearHoney(px, pz) { return near(px, pz, A.honey.x, A.honey.z, CFG.interactDist + 2.5); },
    update(dt, elapsed, isNight) {
      // Leuchtfeuer rotiert nachts
      if (state.ada.light >= 2 && beacon) {
        beacon.material.emissiveIntensity = isNight ? 1.6 + Math.sin(elapsed * 3) * 0.9 : 0;
      }
    }
  };
}
