// v10: Karşıköy — das zweite Dorf am anderen Talende (Putzhäuser, Ziegeldächer,
// eigener Pazar mit Premium-Preisen und der Bolzplatz der "Karşıköy Gençlik").
import * as THREE from 'three';
import { CFG } from '../config.js';
import { building, makeSignTexture } from './structures.js';

export function createKarsikoy(ctx, terrain, mats) {
  const { scene } = ctx;
  const K = CFG.karsikoy;
  const colliders = [];

  // Wohnhäuser: Putzwände + Ziegeldächer in Dorffarben
  const tints = [0xf0e4d0, 0xd8e0e8, 0xe8d0c8, 0xdfe8d2];
  const spots = [
    [K.x - 8, K.z - 8, 0.4], [K.x + 6, K.z - 10, -0.5],
    [K.x + 10, K.z + 2, 2.4], [K.x - 4, K.z + 10, 3.0]
  ];
  spots.forEach(([x, z, ry], i) => {
    building(ctx, terrain, colliders, x, z, ry, 4.6, 3.8, 2.6, {
      mats, wallMat: mats.plasterMat, tint: tints[i], twoWindows: i % 2 === 0
    });
  });

  // Mini-Moschee mit Kuppel & Minarett
  {
    const g = new THREE.Group();
    const y = terrain.heightAt(K.x + 2, K.z - 2);
    g.position.set(K.x + 2, y, K.z - 2);
    g.rotation.y = 0.3;
    const base = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.4, 5.5), mats.plasterMat);
    base.position.y = 1.7;
    g.add(base);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x6f8a94, roughness: 0.45, metalness: 0.3 }));
    dome.position.y = 3.4;
    g.add(dome);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 8, 8), mats.plasterMat);
    shaft.position.set(-3.4, 4, 1.8);
    g.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a636a, roughness: 0.6 }));
    tip.position.set(-3.4, 8.6, 1.8);
    g.add(tip);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    colliders.push({ x: K.x + 2, z: K.z - 2, r: 3.6 });
  }

  // Pazar-Stand mit Schild
  {
    const M = K.market;
    const g = new THREE.Group();
    const y = terrain.heightAt(M.x, M.z);
    g.position.set(M.x, y, M.z);
    g.rotation.y = M.ry;
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.6), mats.woodMat);
    table.position.y = 0.45;
    g.add(table);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x5d9138, roughness: 0.85 }));
    awn.position.y = 2.3;
    awn.rotation.x = 0.18;
    g.add(awn);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.3, 6), mats.woodBeamMat);
      post.position.set(s * 1.8, 1.15, 0.9);
      g.add(post);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.7),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('KARŞIKÖY PAZARI', '#5d9138'), roughness: 0.6, side: THREE.DoubleSide }));
    sign.position.set(0, 2.9, 0.4);
    g.add(sign);
    // Ware
    const cols = [0xe3c24f, 0xd0392b, 0xf3ede0];
    for (let i = 0; i < 6; i++) {
      const item = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5),
        new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.7 }));
      item.position.set(-1.2 + (i % 3) * 1.2, 1.05, -0.3 + Math.floor(i / 3) * 0.6);
      g.add(item);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    colliders.push({ x: M.x, z: M.z, r: 1.8 });
  }

  // Bolzplatz der Karşıköy Gençlik: Tor + Linien
  {
    const P = K.pitch;
    const y = terrain.heightAt(P.x, P.z);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.4 });
    const g = new THREE.Group();
    g.position.set(P.x, y, P.z);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2, 8), postMat);
      post.position.set(s * 2.2, 1, 0);
      g.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 8), postMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 2;
    g.add(bar);
    // Mittelkreis-Linie als Ring
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.06, 4, 28),
      new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.9 }));
    line.rotation.x = Math.PI / 2;
    line.position.set(0, 0.06, 6);
    g.add(line);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
  }

  // Willkommensschild an der Straße
  {
    const sx = K.x + 16, sz = K.z - 12;
    const y = terrain.heightAt(sx, sz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 6), mats.woodBeamMat);
    post.position.set(sx, y + 1.1, sz);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.6),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('KARŞIKÖY', '#3f6d9a'), roughness: 0.6, side: THREE.DoubleSide }));
    sign.position.set(sx, y + 2.1, sz);
    sign.rotation.y = 0.8;
    const grp = new THREE.Group();
    grp.add(post, sign);
    grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(grp);
  }

  return { colliders };
}
