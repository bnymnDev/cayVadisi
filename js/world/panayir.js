// v15: Panayır — alle zwei Wochen kommt der Jahrmarkt auf die Wiese:
// bunte Buden, Wimpel, Losbude und Kraftmesser. Nur an Festtagen sichtbar.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createPanayir(ctx, terrain) {
  const { scene } = ctx;
  const P = CFG.panayir;
  const cx = P.spot.x, cz = P.spot.z;
  const gy = terrain.heightAt(cx, cz);

  const g = new THREE.Group();
  g.position.set(cx, gy, cz);
  g.visible = false;

  const STRIPES = [0xd85555, 0x5a8fd8, 0x5f9e6e, 0xe3c24f];
  const posts = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 });
  // vier Buden im Halbkreis
  [[-6, 0, 0.4], [-2, -3, 0.15], [2, -3, -0.15], [6, 0, -0.4]].forEach(([bx, bz, ry], i) => {
    const stall = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.85 }));
    counter.position.y = 0.5;
    stall.add(counter);
    for (const sx of [-1.1, 1.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), posts);
      post.position.set(sx, 1.2, 0);
      stall.add(post);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 4),
      new THREE.MeshStandardMaterial({ color: STRIPES[i], roughness: 0.85 }));
    roof.position.y = 2.75;
    roof.rotation.y = Math.PI / 4;
    stall.add(roof);
    stall.position.set(bx, 0, bz);
    stall.rotation.y = ry;
    g.add(stall);
  });
  // Wimpelketten zwischen den Buden
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 3),
      new THREE.MeshStandardMaterial({ color: STRIPES[i % 4], roughness: 0.85, side: THREE.DoubleSide }));
    flag.position.set(-6 + u * 12, 3.1 - Math.sin(u * Math.PI) * 0.5, -1.4);
    flag.rotation.z = Math.PI;
    g.add(flag);
  }
  // Kraftmesser: Sockel + Säule + Glocke
  const kraft = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.8 }));
  base.position.y = 0.2;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xa53f3f, roughness: 0.7 }));
  tower.position.y = 2.0;
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xe3c24f, metalness: 0.6, roughness: 0.3 }));
  bell.position.y = 3.85;
  kraft.add(base, tower, bell);
  kraft.position.set(0, 0, 2.5);
  g.add(kraft);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);

  return {
    isOpen() { return state.day % P.everyDays === P.offset; },
    nearLot(px, pz) { return this.isOpen() && Math.hypot(px - (cx - 4), pz - (cz - 1.5)) < CFG.interactDist + 2; },
    nearKraft(px, pz) { return this.isOpen() && Math.hypot(px - cx, pz - (cz + 2.5)) < CFG.interactDist + 1.5; },
    update() { g.visible = this.isOpen(); }
  };
}
