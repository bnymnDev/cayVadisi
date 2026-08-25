// Kasaba: kleine Küstenstadt — Häuser, Markt, Autohaus, Laternen, Bootssteg
import * as THREE from 'three';
import { CFG } from '../config.js';
import { mulberry32 } from '../util.js';
import { building, makeSignTexture } from './structures.js';

export function createCity(ctx, terrain, mats) {
  const { scene } = ctx;
  const C = CFG.city;
  const colliders = [];
  const rng = mulberry32(7788);
  const winMats = [];

  // ---------- Wohnhäuser (Karadeniz-Palette) ----------
  const tints = [0xd9cbb2, 0xb9c4cc, 0xc9a98a, 0xd4d0c2, 0x9fb2a1, 0xc4b294];
  const houses = [
    { x: C.x - 12, z: C.z + 14, ry: 2.6, w: 4.4, d: 3.6, h: 2.6 },
    { x: C.x - 2,  z: C.z + 18, ry: 3.1, w: 5.2, d: 4.0, h: 3.0 },
    { x: C.x + 10, z: C.z + 15, ry: 3.5, w: 4.0, d: 3.4, h: 2.5 },
    { x: C.x + 20, z: C.z + 6,  ry: 4.2, w: 4.6, d: 3.8, h: 2.7 },
    { x: C.x - 20, z: C.z + 4,  ry: 1.9, w: 4.2, d: 3.5, h: 2.6 },
    { x: C.x + 2,  z: C.z - 16, ry: 0.2, w: 5.0, d: 4.2, h: 2.9 },
    { x: C.x - 14, z: C.z - 12, ry: 0.8, w: 4.0, d: 3.2, h: 2.4 }
  ];
  houses.forEach((h, i) => {
    const b = building(ctx, terrain, colliders, h.x, h.z, h.ry, h.w, h.d, h.h,
      { mats, tint: tints[i % tints.length], twoWindows: true });
    winMats.push(b.winMat);
  });

  // Teehaus am Platz (türkisches Çayevi — Herzstück jeder Kasaba)
  const cayevi = building(ctx, terrain, colliders, C.x + 12, C.z - 6, 2.8, 5.4, 4.2, 2.8,
    { mats, tint: 0x8f4f3a, signText: 'ÇAYEVİ', signBg: '#7a2e1d', twoWindows: true });
  winMats.push(cayevi.winMat);

  // ---------- Markt (offener Stand mit Markise) ----------
  {
    const M = C.market;
    const y = terrain.heightAt(M.x, M.z);
    const g = new THREE.Group();
    g.position.set(M.x, y, M.z);
    g.rotation.y = M.ry;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 1.2), mats.woodMat);
    counter.position.y = 0.5;
    g.add(counter);
    // Pfosten + gestreifte Markise
    const canvasC = document.createElement('canvas');
    canvasC.width = 128; canvasC.height = 32;
    const cg = canvasC.getContext('2d');
    for (let i = 0; i < 8; i++) {
      cg.fillStyle = i % 2 ? '#b33a2e' : '#f2ead8';
      cg.fillRect(i * 16, 0, 16, 32);
    }
    const awnTex = new THREE.CanvasTexture(canvasC);
    awnTex.colorSpace = THREE.SRGBColorSpace;
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.05, 2.0),
      new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.9, side: THREE.DoubleSide })
    );
    awning.position.set(0, 2.35, 0.1);
    awning.rotation.x = -0.18;
    g.add(awning);
    for (const [px, pz] of [[-1.8, -0.5], [1.8, -0.5], [-1.8, 0.9], [1.8, 0.9]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6), mats.woodBeamMat);
      post.position.set(px, 1.15, pz);
      g.add(post);
    }
    // Kisten mit Ware
    for (let i = 0; i < 5; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), mats.woodMat);
      crate.position.set(-1.4 + i * 0.7, 1.18, 0.1);
      g.add(crate);
      const stuffCol = [0xd0392b, 0xe3c24f, 0x7ba24a, 0x9c6b35, 0xefe9dc][i];
      const stuff = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 6, 5),
        new THREE.MeshStandardMaterial({ color: stuffCol, roughness: 0.8 })
      );
      stuff.position.set(-1.4 + i * 0.7, 1.4, 0.1);
      g.add(stuff);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.55),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('PAZAR', '#245063'), roughness: 0.6 })
    );
    sign.position.set(0, 2.75, 0.4);
    g.add(sign);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    colliders.push({ x: M.x, z: M.z, r: 2.4 });
  }

  // ---------- Autohaus (Podium mit Dach, Ausstellungsfläche) ----------
  {
    const D = C.dealer;
    const y = terrain.heightAt(D.x, D.z);
    const g = new THREE.Group();
    g.position.set(D.x, y, D.z);
    g.rotation.y = D.ry;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.25, 7),
      new THREE.MeshStandardMaterial({ color: 0x8d8d90, roughness: 0.7 })
    );
    slab.position.y = 0.12;
    g.add(slab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.15, 7.4), mats.steelMat);
    roof.position.y = 3.6;
    g.add(roof);
    for (const [px, pz] of [[-5.2, -3.2], [5.2, -3.2], [-5.2, 3.2], [5.2, 3.2]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xcfd2d6, roughness: 0.4, metalness: 0.6 }));
      col.position.set(px, 1.8, pz);
      g.add(col);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.8),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('GALERİ — OTO', '#233a58'), roughness: 0.5 })
    );
    sign.position.set(0, 4.2, 3.4);
    g.add(sign);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    colliders.push({ x: D.x - 4, z: D.z - 2.5, r: 1 });
    colliders.push({ x: D.x + 4, z: D.z + 2.5, r: 1 });
  }

  // ---------- Straßenlaternen ----------
  const lampMats = [];
  const lampPts = [
    { x: C.x - 8, z: C.z + 8 }, { x: C.x + 8, z: C.z + 2 },
    { x: C.x - 2, z: C.z - 10 }, { x: 104, z: C.z - 2 }
  ];
  const lampLights = [];
  for (const lp of lampPts) {
    const y = terrain.heightAt(lp.x, lp.z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a3f42, roughness: 0.5, metalness: 0.6 })
    );
    pole.position.set(lp.x, y + 1.7, lp.z);
    pole.castShadow = true;
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff2cf, emissive: 0xffc873, emissiveIntensity: 0, roughness: 0.4
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lampMat);
    head.position.set(lp.x, y + 3.45, lp.z);
    scene.add(pole, head);
    lampMats.push(lampMat);
    colliders.push({ x: lp.x, z: lp.z, r: 0.25 });
  }
  // Nur 2 echte Lichtquellen (Performance), Rest leuchtet nur emissiv
  for (const i of [0, 2]) {
    const l = new THREE.PointLight(0xffc873, 0, 16, 2);
    const lp = lampPts[i];
    l.position.set(lp.x, terrain.heightAt(lp.x, lp.z) + 3.4, lp.z);
    scene.add(l);
    lampLights.push(l);
  }

  // ---------- Bootssteg + Boot (Küsten-Flair) ----------
  {
    const px = C.x - 6;
    let pz = C.z - 18;
    // Steg bis ins Wasser laufen lassen
    while (terrain.heightAt(px, pz) > 0.2 && pz > -190) pz -= 2;
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const z = pz + 4 - i * 2.2;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 2.1), mats.woodMat);
      plank.position.set(px, 1.05, z);
      plank.castShadow = true; plank.receiveShadow = true;
      scene.add(plank);
      for (const s of [-1, 1]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), mats.woodBeamMat);
        pile.position.set(px + s * 0.95, 0, z);
        scene.add(pile);
      }
    }
    // kleines Fischerboot
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.55, 3.2, 8, 1, false),
      new THREE.MeshStandardMaterial({ color: 0x2e5a7a, roughness: 0.7 })
    );
    hull.rotation.z = Math.PI / 2;
    hull.scale.y = 0.55;
    hull.position.y = 0.1;
    boat.add(hull);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 14), mats.woodBeamMat);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1.7, 1, 1);
    rim.position.y = 0.42;
    boat.add(rim);
    boat.position.set(px + 3.2, 0.15, pz - 1);
    boat.rotation.y = 0.4;
    boat.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(boat);
    var boatRef = boat;
  }

  return {
    colliders,
    update(dt, elevN, rainT, elapsed) {
      const darkness = Math.max(1 - elevN * 3, rainT * 0.55);
      const glow = Math.max(0, darkness);
      for (const w of winMats) w.emissiveIntensity = glow * (1.4 + Math.sin(elapsed * 0.3) * 0.2);
      for (const lm of lampMats) lm.emissiveIntensity = glow * 3.2;
      for (const ll of lampLights) ll.intensity = glow * 4.5;
      if (boatRef) {
        boatRef.position.y = 0.15 + Math.sin(elapsed * 0.7) * 0.06;
        boatRef.rotation.z = Math.sin(elapsed * 0.55) * 0.03;
      }
    }
  };
}
