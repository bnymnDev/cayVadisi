// v22: Lagerfeuer am Strand — abends hinsetzen, dem Feuer beim Knistern
// zusehen (Funken steigen auf), aufs Meer schauen und bei einer
// Sternschnuppe rechtzeitig die Leertaste drücken: ein Wunsch für morgen.
import * as THREE from 'three';
import { CFG } from '../config.js';

export function createCampfire(ctx, terrain) {
  const { scene, camera } = ctx;
  const C = CFG.campfire.spot;
  const gy = terrain.heightAt(C.x, C.z);
  const g = new THREE.Group();
  g.position.set(C.x, gy, C.z);

  // Steinkreis + Holzscheite
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), stoneMat);
    stone.position.set(Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55);
    g.add(stone);
  }
  const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 6), logMat);
    log.rotation.z = Math.PI / 2.4;
    log.rotation.y = (i / 3) * Math.PI * 2;
    log.position.y = 0.16;
    g.add(log);
  }
  // Flamme (2 Kegel, flackern) + Licht
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xf2913a, transparent: true, opacity: 0.9 });
  const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 6), flameMat);
  flame1.position.y = 0.55;
  g.add(flame1);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 5),
    new THREE.MeshBasicMaterial({ color: 0xf7d060, transparent: true, opacity: 0.9 }));
  flame2.position.y = 0.62;
  g.add(flame2);
  const light = new THREE.PointLight(0xf2913a, 0, 14, 2);
  light.position.y = 0.9;
  g.add(light);
  // Baumstamm als Sitzbank
  const bench = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 8), logMat);
  bench.rotation.z = Math.PI / 2;
  bench.position.set(0, 0.22, 1.6);
  g.add(bench);
  // Funken
  const embers = [];
  for (let i = 0; i < 8; i++) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3),
      new THREE.MeshBasicMaterial({ color: 0xf7a94a }));
    e.visible = false;
    g.add(e);
    embers.push({ mesh: e, t: 99 });
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  scene.add(g);

  // Sternschnuppe
  const star = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.22, 9, 5),
    new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.6 }));
  star.add(trail);
  trail.rotation.z = Math.PI / 2.3;
  trail.position.x = 4.5;
  star.visible = false;
  scene.add(star);

  let sitting = false;
  let starT = -1, nextStar = 6;

  return {
    get sitting() { return sitting; },
    get starActive() { return starT >= 0 && starT < 2.2; },
    near(px, pz) { return Math.hypot(px - C.x, pz - C.z) < CFG.interactDist + 2; },
    sit(player) {
      sitting = true;
      starT = -1; nextStar = 5;
      player.setEnabled(false);
      player.releaseLock();
    },
    stand(player) {
      sitting = false;
      star.visible = false;
      player.setEnabled(true);
      if (!ctx.isTouch) player.requestLock();
    },
    update(dt, elapsed, night) {
      // Feuer flackert nur nachts sichtbar stark
      const on = night || sitting;
      flame1.visible = on; flame2.visible = on;
      light.intensity = on ? 1.6 + Math.sin(elapsed * 9) * 0.4 + Math.sin(elapsed * 23) * 0.2 : 0;
      if (on) {
        flame1.scale.y = 1 + Math.sin(elapsed * 11) * 0.18;
        flame2.scale.y = 1 + Math.sin(elapsed * 15 + 1) * 0.22;
        for (const e of embers) {
          e.t += dt;
          if (e.t > 1.4) {
            e.t = Math.random() * -0.5;
            e.mesh.position.set((Math.random() - 0.5) * 0.3, 0.7, (Math.random() - 0.5) * 0.3);
            e.mesh.visible = false;
          } else if (e.t >= 0) {
            e.mesh.visible = true;
            e.mesh.position.y += dt * 1.4;
            e.mesh.position.x += Math.sin(elapsed * 6 + e.t * 9) * dt * 0.25;
          }
        }
      } else for (const e of embers) e.mesh.visible = false;

      if (!sitting) return;
      // Kamera: am Feuer, Blick über Flamme aufs Meer
      camera.position.set(C.x, gy + 1.1, C.z + 2.1);
      camera.lookAt(C.x, gy + 0.9, C.z - 14);
      // Sternschnuppen
      if (starT < 0) {
        nextStar -= dt;
        if (nextStar <= 0) {
          starT = 0;
          nextStar = CFG.campfire.starEvery * (0.7 + Math.random() * 0.7);
          star.position.set(C.x - 26 + Math.random() * 16, gy + 26 + Math.random() * 8, C.z - 55);
          star.visible = true;
        }
      } else {
        starT += dt;
        star.position.x += dt * 16;
        star.position.y -= dt * 5;
        if (starT > 2.2) { starT = -1; star.visible = false; }
      }
    }
  };
}
