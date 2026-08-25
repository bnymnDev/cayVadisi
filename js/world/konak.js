// v12: Der verfallene Konak am Hang — in drei Stufen restaurieren,
// am Ende wird er zum Museum mit täglichen Eintrittsgeldern.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createKonak(ctx, terrain, mats) {
  const { scene } = ctx;
  const K = CFG.konak;
  const y = terrain.heightAt(K.x, K.z);

  // Stufe 0: Ruine — geborstene Mauern
  const ruin = new THREE.Group();
  {
    const stone = new THREE.MeshStandardMaterial({ color: 0x7d766a, roughness: 0.95 });
    for (const [w, h, d, px, pz, ry] of [
      [6, 2.2, 0.5, 0, -2.5, 0], [0.5, 1.6, 4, -3, 0, 0],
      [0.5, 2.8, 3, 3, -0.5, 0.1], [4, 1.1, 0.5, -0.5, 2.4, -0.08]
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
      wall.position.set(px, h / 2, pz);
      wall.rotation.y = ry;
      ruin.add(wall);
    }
    for (let i = 0; i < 5; i++) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.3, 0), stone);
      rubble.position.set(-2 + i * 1.1, 0.25, 0.5 + (i % 2));
      rubble.rotation.set(i, i * 2, 0);
      ruin.add(rubble);
    }
  }
  // Stufe 1-2: Gerüst
  const scaffold = new THREE.Group();
  {
    const beam = new THREE.MeshStandardMaterial({ color: 0xb8963f, roughness: 0.8 });
    for (const [px, pz] of [[-3.4, -3], [3.4, -3], [-3.4, 3], [3.4, 3]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.5, 6), beam);
      post.position.set(px, 2.75, pz);
      scaffold.add(post);
    }
    for (const h of [2, 4]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.5), beam);
      plank.position.set(0, h, -3.1);
      scaffold.add(plank);
    }
  }
  // Stufe 3: restaurierter Konak (Erker, Ziegeldach, Schild)
  const done = new THREE.Group();
  {
    const base = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 5.5), mats.plasterMat);
    base.position.y = 1.5;
    done.add(base);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(7.8, 2.6, 6.2), mats.woodMat);
    upper.position.y = 4.3;
    done.add(upper);
    for (const sgn of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 6.8), mats.roofMat);
      r.position.set(sgn * 1.95, 6.3, 0);
      r.rotation.z = -sgn * 0.5;
      done.add(r);
    }
    const winM = new THREE.MeshStandardMaterial({ color: 0x27333d, roughness: 0.2, emissive: 0xffb066, emissiveIntensity: 0.4 });
    for (let i = 0; i < 4; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.9), winM);
      win.position.set(-2.6 + i * 1.75, 4.3, 3.12);
      done.add(win);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.7),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('KONAK MÜZESİ', '#6a4f9a'), roughness: 0.6 }));
    sign.position.set(0, 2.6, 2.85);
    done.add(sign);
  }

  const root = new THREE.Group();
  root.position.set(K.x, y, K.z);
  root.rotation.y = K.ry;
  root.add(ruin, scaffold, done);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(root);

  function syncStage() {
    const s2 = state.konak;
    ruin.visible = s2 < 3;
    scaffold.visible = s2 === 1 || s2 === 2;
    done.visible = s2 >= 3;
  }
  syncStage();

  return {
    colliders: [{ x: K.x, z: K.z, r: 4 }],
    syncStage,
    near(px, pz) {
      return Math.hypot(px - K.x, pz - K.z) < CFG.interactDist + 4;
    }
  };
}
