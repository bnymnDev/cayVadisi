// v6: Yayla — Hochalm mit Holzhütte, Bienenstöcken und Blumenwiese
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { mulberry32 } from '../util.js';
import { building, makeSignTexture } from './structures.js';

export function createYayla(ctx, terrain, mats) {
  const { scene } = ctx;
  const Y = CFG.yayla;
  const colliders = [];
  const rng = mulberry32(6006);

  // Alm-Hütte
  building(ctx, terrain, colliders, Y.hut.x, Y.hut.z, Y.hut.ry, 4.6, 3.6, 2.4,
    { mats, signText: 'YAYLA EVİ', signBg: '#4a5a2e' });

  // Schild an der Auffahrt
  {
    const sx = Y.x - 2, sz = Y.z - 16;
    const y = terrain.heightAt(sx, sz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 6), mats.woodBeamMat);
    post.position.set(sx, y + 1, sz);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('ANZER YAYLASI', '#3e5a7a'), roughness: 0.6, side: THREE.DoubleSide })
    );
    sign.position.set(sx, y + 1.8, sz);
    sign.rotation.y = 3.1;
    scene.add(post, sign);
  }

  // Blumenwiese (kleine bunte Punkte)
  {
    const cols = [0xd8e04f, 0xc45a8a, 0xe8e8ea, 0x9a5fd0];
    const flowerGeo = new THREE.SphereGeometry(0.06, 5, 4);
    const mesh = new THREE.InstancedMesh(
      flowerGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.9, vertexColors: false, color: 0xffffff }),
      160
    );
    const m4 = new THREE.Matrix4();
    const color = new THREE.Color();
    for (let i = 0; i < 160; i++) {
      const a = rng() * Math.PI * 2, r = 3 + rng() * (Y.r - 5);
      const x = Y.x + Math.cos(a) * r, z = Y.z + Math.sin(a) * r;
      m4.makeTranslation(x, terrain.heightAt(x, z) + 0.05, z);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, color.setHex(cols[i % cols.length]));
    }
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
  }

  // Bienenstöcke (sichtbar nach Kauf)
  const hiveMeshes = [];
  function syncHives() {
    const want = state.hives;
    while (hiveMeshes.length < want) {
      const i = hiveMeshes.length;
      const g = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: [0xd8a531, 0x5d8aa8, 0xc45a3a, 0x5d9138][i % 4], roughness: 0.8 })
      );
      box.position.y = 0.35;
      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.08, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x8a6d42, roughness: 0.9 })
      );
      lid.position.y = 0.64;
      g.add(box, lid);
      const x = Y.x + 6 + (i % 2) * 1.4, z = Y.z + 2 + Math.floor(i / 2) * 1.4;
      g.position.set(x, terrain.heightAt(x, z), z);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
      hiveMeshes.push(g);
      colliders.push({ x, z, r: 0.5 });
    }
  }
  syncHives();

  return { colliders, syncHives };
}
