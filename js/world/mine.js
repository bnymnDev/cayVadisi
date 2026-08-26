// v15: das verlassene Bergwerk am Nordkamm — Stolleneingang mit Balken,
// Lore und Kohlehaufen. Einmal am Tag selbst Kohle hauen (Minispiel).
import * as THREE from 'three';
import { CFG } from '../config.js';

export function createMine(ctx, terrain) {
  const { scene } = ctx;
  const M = CFG.mine.spot;
  const gy = terrain.heightAt(M.x, M.z);
  const g = new THREE.Group();
  g.position.set(M.x, gy, M.z);

  // dunkle Stollenöffnung in einem Felsblock
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: 0.95 }));
  rock.position.set(0, 1.4, -1.6);
  rock.scale.set(1.4, 1, 1);
  g.add(rock);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 }));
  hole.position.set(0, 1.0, 0.35);
  g.add(hole);
  // Holzrahmen
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.95 });
  for (const sx of [-0.95, 0.95]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.3, 0.22), beamMat);
    post.position.set(sx, 1.15, 0.4);
    g.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 0.26), beamMat);
  lintel.position.set(0, 2.3, 0.4);
  g.add(lintel);
  // Lore + Kohlehaufen
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.8, metalness: 0.3 }));
  cart.position.set(1.9, 0.45, 1.2);
  g.add(cart);
  const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.95 }));
  coal.position.set(1.9, 0.85, 1.2);
  g.add(coal);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  return {
    colliders: [{ x: M.x, z: M.z - 1.6, r: 3.4 }],
    near(px, pz) { return Math.hypot(px - M.x, pz - M.z) < CFG.interactDist + 2.5; }
  };
}
