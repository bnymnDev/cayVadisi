// v29: NPC-Verkehr — Autos pendeln auf der Landstraße Haus→Stadt und
// halten an der Vadi-Petrol-Tankstelle (canlılık!). Anzahl wächst mit der
// Stadt-Ausbaustufe (Köy → Kasaba → Şehir → Metropol).
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createTraffic(ctx, terrain) {
  const group = new THREE.Group();
  ctx.scene.add(group);

  const COLORS = [0xb03a3a, 0x3a6db0, 0xd8d8d0, 0x3f7a45, 0xd68a2e, 0x6b4f9e, 0x444a52];
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 10);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });

  function makeCar(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.75, 1.55),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 }));
    body.position.y = 0.62;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x222b30, roughness: 0.2, metalness: 0.4 }));
    cabin.position.set(-0.15, 1.25, 0);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd870, emissiveIntensity: 0.9 });
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.3), lightMat);
    l1.position.set(1.62, 0.66, 0.5);
    const l2 = l1.clone(); l2.position.z = -0.5;
    const wheels = [];
    for (const [wx, wz] of [[1.05, 0.85], [1.05, -0.85], [-1.05, 0.85], [-1.05, -0.85]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, 0.34, wz);
      wheels.push(w);
      g.add(w);
    }
    g.add(body, cabin, l1, l2);
    return { g, wheels };
  }

  // Route: Landstraße entlang z≈-102 zwischen Haus und Stadtrand
  const R = CFG.traffic;
  const cars = [];
  for (let i = 0; i < R.maxCars; i++) {
    const { g, wheels } = makeCar(COLORS[i % COLORS.length]);
    const dir = i % 2 === 0 ? 1 : -1;
    const car = {
      g, wheels, dir,
      x: R.x0 + Math.random() * (R.x1 - R.x0),
      z: dir > 0 ? R.laneA : R.laneB,
      stopT: 0, fueled: false
    };
    g.visible = false;
    group.add(g);
    cars.push(car);
  }

  function stage() {
    const T = CFG.growth.thresholds;
    let s = 0;
    for (let i = 0; i < T.length; i++) if ((state.totalEarned || 0) >= T[i]) s = i;
    return s;
  }

  return {
    update(dt) {
      const active = Math.min(cars.length, R.carsBase + stage() * R.perStage);
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const on = i < active;
        c.g.visible = on;
        if (!on) continue;
        if (c.stopT > 0) {
          c.stopT -= dt;
        } else {
          c.x += c.dir * R.speed * dt;
          for (const w of c.wheels) w.rotation.z -= c.dir * R.speed * dt * 2.6;
          // Tankstopp bei Vadi Petrol (wenn gebaut): einmal pro Durchfahrt
          if (state.petrol && !c.fueled && Math.abs(c.x - CFG.petrol.spot.x) < 1.2) {
            c.stopT = 3.5;
            c.fueled = true;
          }
          if (c.x > R.x1) { c.x = R.x0; c.fueled = false; }
          if (c.x < R.x0) { c.x = R.x1; c.fueled = false; }
        }
        c.g.position.set(c.x, terrain.heightAt(c.x, c.z) + 0.05, c.z);
        c.g.rotation.y = c.dir > 0 ? 0 : Math.PI;
      }
    }
  };
}
