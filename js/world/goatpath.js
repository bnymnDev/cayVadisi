// v24: Ziegen-Bergpfad — Trittsteine und eine schmale Balance-Planke führen
// den Hang neben der Şelale hinauf zur Gipfel-Plattform mit Panorama-Fahne
// und einer neugierigen Ziege. Alle Höhen-Zonen werden wie üblich NACH der
// Minimap registriert (main.js).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createGoatPath(ctx, terrain) {
  const { scene } = ctx;
  const G2 = CFG.goatPath;

  // Zonen registrieren (Trittsteine + Gipfel)
  for (const z of G2.steps) terrain.addHeightZone(z);
  terrain.addHeightZone(G2.summit);

  const g = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a867c, roughness: 0.95 });
  // Trittstein-Optik unter den Zonen
  for (const z of G2.steps) {
    const w = z.x1 - z.x0, d = z.z1 - z.z0;
    const rock = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), rockMat);
    rock.position.set((z.x0 + z.x1) / 2, z.h - 0.6, (z.z0 + z.z1) / 2);
    rock.rotation.y = 0.1;
    g.add(rock);
  }
  // Gipfel-Plattform
  const sw = G2.summit.x1 - G2.summit.x0, sd = G2.summit.z1 - G2.summit.z0;
  const summitRock = new THREE.Mesh(new THREE.BoxGeometry(sw, 2.0, sd), rockMat);
  summitRock.position.set((G2.summit.x0 + G2.summit.x1) / 2, G2.summit.h - 1.0, (G2.summit.z0 + G2.summit.z1) / 2);
  g.add(summitRock);
  // Balance-Planke zwischen letztem Stein und Gipfel
  const last = G2.steps[G2.steps.length - 1];
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.95 }));
  plank.position.set((last.x0 + last.x1) / 2 - 2, (last.h + G2.summit.h) / 2, (last.z1 + G2.summit.z0) / 2);
  plank.rotation.x = -0.35;
  g.add(plank);
  // Gipfel-Fahne + Wegweiser am Einstieg
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
  pole.position.set((G2.summit.x0 + G2.summit.x1) / 2, G2.summit.h + 1.2, (G2.summit.z0 + G2.summit.z1) / 2);
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7, side: THREE.DoubleSide }));
  flag.position.set((G2.summit.x0 + G2.summit.x1) / 2 + 0.5, G2.summit.h + 2.1, (G2.summit.z0 + G2.summit.z1) / 2);
  g.add(flag);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.5),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('KEÇİ YOLU ⛰️', '#5a4a2e'), roughness: 0.7, side: THREE.DoubleSide }));
  sign.position.set(G2.base.x, terrain.heightAt(G2.base.x, G2.base.z) + 1.4, G2.base.z);
  sign.rotation.y = 0.6;
  g.add(sign);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  // Neugierige Ziege am Gipfel (prozedural — wartet dort oben auf dich)
  const goat = new THREE.Group();
  {
    const fur = new THREE.MeshStandardMaterial({ color: 0xb9b1a2, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), fur);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.48;
    goat.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.28), fur);
    head.position.set(0, 0.72, 0.36);
    goat.add(head);
    for (const hx of [-0.06, 0.06]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 4),
        new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 1 }));
      horn.rotation.x = -0.5;
      horn.position.set(hx, 0.88, 0.3);
      goat.add(horn);
    }
    for (const [lx, lz] of [[-0.1, 0.18], [0.1, 0.18], [-0.1, -0.18], [0.1, -0.18]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), fur);
      leg.position.set(lx, 0.2, lz);
      goat.add(leg);
    }
    goat.position.set((G2.summit.x0 + G2.summit.x1) / 2 + 1.5, G2.summit.h, (G2.summit.z0 + G2.summit.z1) / 2 + 1);
    goat.rotation.y = 2.2;
    goat.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(goat);
  }

  return {
    onSummit(px, pz) {
      return px >= G2.summit.x0 && px <= G2.summit.x1 && pz >= G2.summit.z0 && pz <= G2.summit.z1;
    },
    update(dt, elapsed) {
      flag.rotation.y = Math.sin(elapsed * 2.1) * 0.4;
      goat.rotation.y = 2.2 + Math.sin(elapsed * 0.6) * 0.5;   // schaut sich um
    }
  };
}
