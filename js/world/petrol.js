// v21: Tankstelle „VADİ PETROL" an der Landstraße — Dach auf Pfeilern,
// zwei Zapfsäulen, Preistafel, Kiosk. NPC-Autos rollen sichtbar an, tanken
// ein paar Sekunden (Zahlung klingelt) und fahren weiter. Werkstatt-Anbau
// mit Hebebühnen-Look bringt zusätzliche Reparatur-Einnahmen.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';
import { spawnVehicleModel, buildVehicleMesh } from '../vehicles.js';

export function createPetrol(ctx, terrain) {
  const { scene } = ctx;
  const P = CFG.petrol.spot;
  const gy = terrain.heightAt(P.x, P.z);
  const g = new THREE.Group();
  g.position.set(P.x, gy, P.z);
  g.rotation.y = P.ry;

  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6, metalness: 0.3 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });

  // Dach auf 4 Pfeilern
  for (const [px, pz] of [[-3.4, -2], [3.4, -2], [-3.4, 2], [3.4, 2]]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8), steelMat);
    pillar.position.set(px, 2.1, pz);
    g.add(pillar);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.35, 5.4), redMat);
  canopy.position.y = 4.35;
  g.add(canopy);
  const canopySign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.7),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('VADİ PETROL', '#b13224'), roughness: 0.5, side: THREE.DoubleSide }));
  canopySign.position.set(0, 4.0, 2.75);
  g.add(canopySign);
  // Zapfsäulen
  const pumps = [];
  for (const px of [-1.6, 1.6]) {
    const pump = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.45), redMat);
    body.position.y = 0.75;
    pump.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ef, emissive: 0x3a5560, emissiveIntensity: 0.3 }));
    screen.position.set(0, 1.1, 0.24);
    pump.add(screen);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.8 }));
    hose.position.set(0.32, 0.9, 0);
    hose.rotation.y = Math.PI / 2;
    pump.add(hose);
    pump.position.set(px, 0, 0);
    g.add(pump);
    pumps.push(pump);
  }
  // Kiosk + Preistafel
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.8 }));
  kiosk.position.set(0, 1.3, -4.2);
  g.add(kiosk);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('BENZİN 35', '#1e3d28'), roughness: 0.6, side: THREE.DoubleSide }));
  board.position.set(-5.2, 1.4, 1.5);
  g.add(board);
  // Werkstatt-Anbau (sichtbar nach Kauf): Halle + Hebebühne
  const werkstatt = new THREE.Group();
  const hall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.85 }));
  hall.position.set(6.8, 1.5, -3.4);
  werkstatt.add(hall);
  const lift = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5, metalness: 0.4 }));
  lift.position.set(6.8, 1.0, -0.6);
  werkstatt.add(lift);
  for (const lx of [5.9, 7.7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), steelMat);
    post.position.set(lx, 0.5, -0.6);
    werkstatt.add(post);
  }
  g.add(werkstatt);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.visible = false;
  scene.add(g);

  // Kunden-Autos: fahren die Straße entlang zur Säule, tanken, fahren weiter
  const CAR_IDS = ['sedan', 'pickup', 'lux'];
  let customer = null;   // { mesh, st: 'in'|'fuel'|'out', timer }
  let nextCustomer = 12;
  const roadIn = { x: P.x - 26, z: P.z + 3 };
  const pumpSpot = { x: P.x - 0.5, z: P.z + 2.2 };
  const roadOut = { x: P.x + 26, z: P.z + 3 };

  function spawnCar() {
    const id = CAR_IDS[Math.floor(Math.random() * CAR_IDS.length)];
    const mesh = spawnVehicleModel(id) || buildVehicleMesh(id);
    mesh.position.set(roadIn.x, terrain.heightAt(roadIn.x, roadIn.z), roadIn.z);
    scene.add(mesh);
    customer = { mesh, st: 'in', timer: 0 };
  }

  function sync() { g.visible = !!state.petrol; werkstatt.visible = !!(state.petrol && state.petrol.werkstatt); }
  sync();

  return {
    sync,
    colliders: [{ x: P.x, z: P.z - 4.2, r: 2.4 }],
    near(px, pz) { return Math.hypot(px - P.x, pz - P.z) < CFG.interactDist + 4; },
    // onPay() kommt aus game.js — kassiert und zählt
    update(dt, daytime, onPay) {
      if (!state.petrol) return;
      if (!customer) {
        nextCustomer -= dt;
        if (daytime && nextCustomer <= 0) {
          nextCustomer = CFG.petrol.customerEvery * (0.7 + Math.random() * 0.6);
          spawnCar();
        }
        return;
      }
      const c = customer;
      const target = c.st === 'in' ? pumpSpot : roadOut;
      const p = c.mesh.position;
      if (c.st === 'fuel') {
        c.timer -= dt;
        if (c.timer <= 0) { onPay(); c.st = 'out'; }
        return;
      }
      const dx = target.x - p.x, dz = target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.8) {
        if (c.st === 'in') { c.st = 'fuel'; c.timer = 5; }
        else { scene.remove(c.mesh); customer = null; }
        return;
      }
      const sp = 7 * dt;
      p.x += (dx / d) * sp;
      p.z += (dz / d) * sp;
      p.y = terrain.heightAt(p.x, p.z) + 0.05;
      c.mesh.rotation.y = Math.atan2(dx, dz);
    }
  };
}
