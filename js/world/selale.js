// v9: Şelale — Wasserfall-Bergpfad hoch in den Bergen; Ziegen klettern mit,
// eine Rast am Wasser gibt Energie zurück.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

function makeGoatMesh() {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 4, 8), fur);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.52;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.34), fur);
  head.position.set(0, 0.78, 0.44);
  g.add(head);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 5), dark);
    horn.rotation.x = -0.7;
    horn.position.set(s * 0.07, 0.95, 0.38);
    g.add(horn);
  }
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5), dark);
  beard.rotation.x = Math.PI;
  beard.position.set(0, 0.6, 0.5);
  g.add(beard);
  for (const [x, z] of [[-0.13, 0.24], [0.13, 0.24], [-0.13, -0.22], [0.13, -0.22]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 3, 5), fur);
    leg.position.set(x, 0.22, z);
    g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createSelale(ctx, terrain) {
  const { scene } = ctx;
  const S = CFG.selale;
  const g = new THREE.Group();
  const baseY = terrain.heightAt(S.x, S.z);
  g.position.set(S.x, baseY, S.z);

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6a60, roughness: 0.95 });
  // Felswand
  for (let i = 0; i < 7; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.2 + (i % 3), 0), rockMat);
    rock.position.set(-6 + i * 2.1, 3 + (i % 3) * 2.6, -3 - (i % 2) * 1.5);
    rock.rotation.set(i, i * 2.1, i * 0.7);
    g.add(rock);
  }
  // Wasserfall: zwei scrollende Streifen-Texturen
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g2 = c.getContext('2d');
  g2.fillStyle = 'rgba(190,220,235,0.0)';
  g2.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 26; i++) {
    g2.fillStyle = `rgba(225,240,250,${0.25 + Math.random() * 0.45})`;
    const w = 3 + Math.random() * 7;
    g2.fillRect(Math.random() * 60, Math.random() * 256, w, 24 + Math.random() * 60);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const fallMat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide
  });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 9), fallMat);
  fall.position.set(0, 4.6, -1.4);
  g.add(fall);
  const fall2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 9), fallMat.clone());
  fall2.material.opacity = 0.5;
  fall2.position.set(-0.4, 4.4, -1.1);
  g.add(fall2);
  // Becken + Gischt
  const pool = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.24, 18),
    new THREE.MeshStandardMaterial({ color: 0x3f7d9a, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 })
  );
  pool.position.set(0, 0.15, 0.6);
  g.add(pool);
  const mistMat = new THREE.SpriteMaterial({ color: 0xe8f2f8, transparent: true, opacity: 0.35, depthWrite: false });
  const mists = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Sprite(mistMat.clone());
    m.scale.setScalar(1.4);
    g.add(m);
    mists.push({ m, t: i / 5 });
  }
  // Rastbank
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x8a5c36, roughness: 0.85 }));
  bench.position.set(4, 0.5, 2.2);
  g.add(bench);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.5), rockMat);
    leg.position.set(4 + s * 0.7, 0.25, 2.2);
    g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  // Ziegen: die Hälfte der Herde klettert hier oben herum
  const goats = [];
  for (let i = 0; i < 3; i++) {
    const m = makeGoatMesh();
    m.visible = false;
    scene.add(m);
    goats.push({ m, a: i * 2.1, r: 5 + i * 1.6, sp: 0.12 + i * 0.05 });
  }

  return {
    colliders: [{ x: S.x, z: S.z - 2, r: 3.5 }],
    nearRest(px, pz) {
      return Math.hypot(px - (S.x + 4), pz - (S.z + 2.2)) < CFG.interactDist;
    },
    update(dt, elapsed) {
      tex.offset.y = -elapsed * 0.7;
      fall2.material.map.offset.y = -elapsed * 0.95;
      for (const mi of mists) {
        mi.t += dt * 0.4;
        if (mi.t > 1) mi.t -= 1;
        mi.m.position.set(Math.sin(mi.t * 9) * 1.4, 0.5 + mi.t * 1.8, 0.4);
        mi.m.material.opacity = 0.35 * (1 - mi.t);
        mi.m.scale.setScalar(1.2 + mi.t * 2);
      }
      const show = (state.animals.goat || 0) > 0;
      goats.forEach((gt, i) => {
        gt.m.visible = show && i < Math.min(3, state.animals.goat);
        if (!gt.m.visible) return;
        gt.a += gt.sp * dt;
        const gx = S.x + Math.cos(gt.a) * gt.r;
        const gz = S.z + 4 + Math.sin(gt.a) * (gt.r * 0.6);
        gt.m.position.set(gx, terrain.heightAt(gx, gz), gz);
        gt.m.rotation.y = -gt.a + Math.PI / 2;
      });
    }
  };
}
