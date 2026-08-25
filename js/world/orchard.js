// v11: Haselnuss-Plantage am Osthang — Bäume erscheinen nach Kauf,
// geerntet wird automatisch jeden Herbstabend.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { mulberry32 } from '../util.js';

export function createOrchard(ctx, terrain) {
  const { scene } = ctx;
  const O = CFG.orchard;
  const g = new THREE.Group();
  const rng = mulberry32(4242);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a7d32, roughness: 0.9 });
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x9a6a35, roughness: 0.8 });
  const nuts = [];

  for (let r = 0; r < O.rows; r++) {
    for (let c = 0; c < O.cols; c++) {
      const x = O.x + (c - O.cols / 2) * O.gap + (rng() - 0.5) * 1.4;
      const z = O.z + (r - O.rows / 2) * O.gap + (rng() - 0.5) * 1.4;
      const y = terrain.heightAt(x, z);
      const tree = new THREE.Group();
      tree.position.set(x, y, z);
      // Haselnuss wächst strauchig: mehrere Stämmchen
      for (let s = 0; s < 3; s++) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.6, 6), trunkMat);
        trunk.position.set((rng() - 0.5) * 0.4, 0.8, (rng() - 0.5) * 0.4);
        trunk.rotation.z = (rng() - 0.5) * 0.35;
        tree.add(trunk);
      }
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 + rng() * 0.4, 1), leafMat);
      crown.scale.y = 0.85;
      crown.position.y = 1.9;
      tree.add(crown);
      // Nüsse (nur im Herbst sichtbar)
      for (let n = 0; n < 4; n++) {
        const nut = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), nutMat);
        const a = rng() * Math.PI * 2;
        nut.position.set(Math.cos(a) * 0.9, 1.7 + rng() * 0.6, Math.sin(a) * 0.9);
        nut.visible = false;
        tree.add(nut);
        nuts.push(nut);
      }
      g.add(tree);
    }
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.visible = false;
  scene.add(g);

  function syncOwned() {
    g.visible = !!state.orchard;
  }
  syncOwned();

  return {
    syncOwned,
    setAutumn(v) { for (const n of nuts) n.visible = !!v; }
  };
}
