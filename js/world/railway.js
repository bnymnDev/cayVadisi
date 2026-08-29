// v17: Schmalspur-Teebahn — Bauprojekt am Feldrand. Nach dem Bau liegen
// echte Gleise (Schwellen + zwei Schienen) vom Teefeld zur Fabrik, und eine
// kleine grüne Lok pendelt mit zwei Teekisten-Wagen und Dampfwölkchen.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createRailway(ctx, terrain) {
  const { scene } = ctx;
  const R = CFG.railway;

  // Bauschild
  const sign = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
  post.position.y = 0.8;
  sign.add(post);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('ÇAY TRENİ PROJESİ', '#1e4d33'), roughness: 0.7, side: THREE.DoubleSide }));
  board.position.y = 1.45;
  sign.add(board);
  sign.position.set(R.sign.x, terrain.heightAt(R.sign.x, R.sign.z), R.sign.z);
  sign.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(sign);

  // Streckenpunkte fein abtasten (für Gleisbau + Fahrt)
  const pts = [];
  let total = 0;
  for (let s = 0; s < R.path.length - 1; s++) {
    const a = R.path[s], b = R.path[s + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(2, Math.round(segLen / 1.4));
    for (let i = (s === 0 ? 0 : 1); i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps;
      const z = a.z + ((b.z - a.z) * i) / steps;
      if (pts.length) total += Math.hypot(x - pts[pts.length - 1].x, z - pts[pts.length - 1].z);
      pts.push({ x, z, y: terrain.heightAt(x, z), d: total });
    }
  }

  // Gleise: Schwellen + 2 Schienen je Zwischenstück
  const rail = new THREE.Group();
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.95 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x777d84, roughness: 0.45, metalness: 0.6 });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const my = (a.y + b.y) / 2;
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.24), tieMat);
    tie.position.set(a.x, a.y + 0.06, a.z);
    tie.rotation.y = yaw;
    rail.add(tie);
    for (const side of [-0.36, 0.36]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, len + 0.1), steelMat);
      r.position.set(mx + Math.cos(yaw) * side, my + 0.14, mz - Math.sin(yaw) * side);
      r.rotation.y = yaw;
      rail.add(r);
    }
  }
  rail.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  scene.add(rail);

  // Zug: Lok + 2 Wagen mit Teekisten
  const train = new THREE.Group();
  function makeCar(isLoco) {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: isLoco ? 0x1e5c38 : 0x6b4a2c, roughness: 0.6, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, isLoco ? 0.9 : 0.55, 1.9), bodyMat);
    body.position.y = 0.75;
    car.add(body);
    if (isLoco) {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.7, 0.7), bodyMat);
      cab.position.set(0, 1.45, -0.55);
      car.add(cab);
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.5 }));
      chimney.position.set(0, 1.5, 0.6);
      car.add(chimney);
    } else {
      for (let c = 0; c < 2; c++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6),
          new THREE.MeshStandardMaterial({ color: 0xb3823f, roughness: 0.85 }));
        crate.position.set(0, 1.15, -0.4 + c * 0.8);
        car.add(crate);
      }
    }
    for (const wz of [-0.6, 0.6]) for (const wx of [-0.45, 0.45]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10),
        new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.5 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.22, wz);
      car.add(wheel);
    }
    return car;
  }
  const cars = [makeCar(true), makeCar(false), makeCar(false)];
  for (const c of cars) train.add(c);
  train.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(train);

  // Dampfwölkchen (recycelt)
  const puffs = [];
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xf2f2ee, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), puffMat.clone());
    puff.visible = false;
    scene.add(puff);
    puffs.push({ mesh: puff, t: 0 });
  }

  let dist = 0, dir = 1, puffTimer = 0;

  function posAt(d) {
    const dd = Math.max(0, Math.min(total, d));
    for (let i = 0; i < pts.length - 1; i++) {
      if (dd <= pts[i + 1].d) {
        const f = (dd - pts[i].d) / Math.max(0.001, pts[i + 1].d - pts[i].d);
        return {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
          z: pts[i].z + (pts[i + 1].z - pts[i].z) * f,
          y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
          yaw: Math.atan2(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z)
        };
      }
    }
    const last = pts[pts.length - 1];
    return { x: last.x, z: last.z, y: last.y, yaw: 0 };
  }

  function sync() {
    rail.visible = state.railway;
    train.visible = state.railway;
    sign.visible = !state.railway;
  }
  sync();

  return {
    sync,
    nearSign(px, pz) {
      return !state.railway && Math.hypot(px - R.sign.x, pz - R.sign.z) < CFG.interactDist + 2;
    },
    update(dt) {
      if (!state.railway) return;
      dist += dir * R.speed * dt;
      if (dist >= total) { dist = total; dir = -1; }
      if (dist <= 0) { dist = 0; dir = 1; }
      for (let i = 0; i < cars.length; i++) {
        const p = posAt(dist - dir * i * 2.2);
        cars[i].position.set(p.x, p.y + 0.1, p.z);
        cars[i].rotation.y = p.yaw + (dir < 0 ? Math.PI : 0);
      }
      // Dampf aus dem Schornstein
      puffTimer -= dt;
      if (puffTimer <= 0) {
        puffTimer = 0.5;
        const free = puffs.find((p) => !p.mesh.visible);
        if (free) {
          const head = posAt(dist);
          free.mesh.position.set(head.x, head.y + 1.85, head.z);
          free.mesh.scale.setScalar(1);
          free.mesh.material.opacity = 0.7;
          free.mesh.visible = true;
          free.t = 0;
        }
      }
      for (const p of puffs) {
        if (!p.mesh.visible) continue;
        p.t += dt;
        p.mesh.position.y += dt * 0.9;
        p.mesh.scale.setScalar(1 + p.t * 1.6);
        p.mesh.material.opacity = 0.7 * Math.max(0, 1 - p.t / 1.6);
        if (p.t > 1.6) p.mesh.visible = false;
      }
    }
  };
}
