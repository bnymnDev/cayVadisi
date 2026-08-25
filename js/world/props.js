// Requisiten: Fotoscan-Bäume/Felsen/Farne (Poly Haven), Hütte, Haus, Teleferik
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { CFG } from '../config.js';
import { mulberry32 } from '../util.js';
import { makeBuildMaterials, building } from './structures.js';

function fixMaterials(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      const m = o.material;
      if (m && m.transparent) {
        m.transparent = false;
        m.alphaTest = 0.45;
        m.side = THREE.DoubleSide;
        m.depthWrite = true;
      }
    }
  });
}

export async function createProps(ctx, terrain) {
  const { scene, loadingManager } = ctx;
  const colliders = [];   // {x, z, r}

  // ---------- Materialien & Gebäude (gemeinsame Helfer) ----------
  const mats = makeBuildMaterials(ctx);
  const { woodMat, woodBeamMat } = mats;

  const hut = building(ctx, terrain, colliders, CFG.hut.x, CFG.hut.z, CFG.hut.ry, 5, 4, 2.7, { mats, signText: 'ÇAY ALIM YERİ' });
  const home = building(ctx, terrain, colliders, CFG.home.x, CFG.home.z, CFG.home.ry, 3.6, 3, 2.3, { mats });

  // Teesäcke neben der Hütte
  const sackMat = new THREE.MeshStandardMaterial({ color: 0x776744, roughness: 1 });
  const sackGeo = new THREE.SphereGeometry(0.42, 10, 8);
  const rngS = mulberry32(9);
  for (let i = 0; i < 4; i++) {
    const sx = CFG.hut.x + 2.6 + rngS() * 1.4, sz = CFG.hut.z + 0.6 - i * 0.85;
    const s = new THREE.Mesh(sackGeo, sackMat);
    s.position.set(sx, terrain.heightAt(sx, sz) + 0.34, sz);
    s.scale.y = 0.82;
    s.castShadow = true; s.receiveShadow = true;
    scene.add(s);
  }

  // warmes Abendlicht an der Hütte
  const lamp = new THREE.PointLight(0xffb066, 0, 14, 2);
  lamp.position.set(CFG.hut.x, terrain.heightAt(CFG.hut.x, CFG.hut.z) + 2.6, CFG.hut.z + 2.2);
  scene.add(lamp);

  // ---------- Teleferik ----------
  const cable = { curve: null, gondola: null, t: 0.03, active: false, dir: 1, onArrive: null, speed: 0 };
  {
    const topY = terrain.heightAt(CFG.cableTop.x, CFG.cableTop.z);
    const botX = CFG.hut.x + 6.5, botZ = CFG.hut.z + 4.5;
    const botY = terrain.heightAt(botX, botZ);
    const mastGeo = new THREE.CylinderGeometry(0.09, 0.12, 4.4, 8);
    function mast(x, z, y) {
      const g = new THREE.Group();
      for (const o of [-0.35, 0.35]) {
        const m = new THREE.Mesh(mastGeo, woodBeamMat);
        m.position.set(o, 2.2, 0);
        m.rotation.z = -o * 0.16;
        g.add(m);
      }
      const cross = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), woodBeamMat);
      cross.position.y = 4.15;
      g.add(cross);
      g.position.set(x, y, z);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
      colliders.push({ x, z, r: 0.7 });
    }
    mast(CFG.cableTop.x, CFG.cableTop.z, topY);
    mast(botX, botZ, botY);

    const a = new THREE.Vector3(CFG.cableTop.x, topY + 4.1, CFG.cableTop.z);
    const b = new THREE.Vector3(botX, botY + 4.1, botZ);
    const mid = a.clone().lerp(b, 0.5); mid.y -= 4.5;
    cable.curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.5, metalness: 0.8 });
    const rope = new THREE.Mesh(new THREE.TubeGeometry(cable.curve, 40, 0.022, 6), ropeMat);
    rope.castShadow = false;
    scene.add(rope);

    // Gondel: Bügel + Holzkorb
    const gnd = new THREE.Group();
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), ropeMat);
    hanger.position.y = -0.45;
    gnd.add(hanger);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.65), woodMat);
    basket.position.y = -1.15;
    gnd.add(basket);
    gnd.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(gnd);
    cable.gondola = gnd;
    const p0 = cable.curve.getPointAt(0.03);
    gnd.position.copy(p0);
  }

  // ---------- GLTF-Modelle ----------
  const loader = new GLTFLoader(loadingManager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

  const [tree1, tree2, tree1far, tree2far, rocks, fern] = await Promise.all([
    load('assets/models/island_tree_01_hero.glb'),
    load('assets/models/island_tree_02_hero.glb'),
    load('assets/models/island_tree_01_far.glb'),
    load('assets/models/island_tree_02_far.glb'),
    load('assets/models/rock_moss_set_01.glb'),
    load('assets/models/fern_02_v2.glb')
  ]);
  for (const g of [tree1, tree2, tree1far, tree2far, rocks, fern]) fixMaterials(g.scene);

  const rng = mulberry32(2026);
  function place(src, x, z, scale, ry, collideR = 0, sink = 0.05) {
    const inst = src.scene.clone(true);
    inst.position.set(x, terrain.heightAt(x, z) - sink, z);
    inst.rotation.y = ry;
    inst.scale.setScalar(scale);
    scene.add(inst);
    if (collideR > 0) colliders.push({ x, z, r: collideR * scale });
    return inst;
  }

  // Bäume: Hero-Qualität nahe Spielbereich, Far-LOD als Kulisse
  place(tree2, 34, -97, 1.1, 1.2, 0.5);       // am Weg beim Spawn
  place(tree1, -64, -66, 1.15, 0.8, 0.6);     // Feldrand West
  place(tree2, -18, -126, 0.9, 2.0, 0.5);     // einsamer Baum am Strand
  place(tree1far, 58, -34, 1.3, 2.4, 0.6);
  place(tree2far, -60, -24, 0.95, 3.6, 0.5);
  place(tree2far, 66, -70, 1.25, 5.1, 0.5);
  place(tree2far, 12, 14, 1.05, 0.4, 0.5);
  place(tree1far, -42, 16, 1.0, 4.0, 0.6);
  place(tree1far, 96, -104, 1.2, 1.7, 0.6);
  place(tree2far, -96, -80, 1.15, 2.9, 0.5);

  // Felsgruppen
  place(rocks, -46, -110, 1.6, 0.4, 2.2, 0.12);
  place(rocks, 42, -120, 2.0, 2.2, 2.6, 0.15);
  place(rocks, 70, -12, 1.8, 4.6, 2.4, 0.15);
  place(rocks, -74, -44, 1.5, 1.1, 2.0, 0.12);

  // Farne verstreut
  for (let i = 0; i < 16; i++) {
    const x = -80 + rng() * 160;
    const z = -120 + rng() * 130;
    if (terrain.fieldMask(x, z) > 0.4 || terrain.pathWeight(x, z) > 0.3) continue;
    const h = terrain.heightAt(x, z);
    if (h < 1.2) continue;
    place(fern, x, z, 0.8 + rng() * 0.8, rng() * 6.28, 0, 0.03);
  }

  // ---------- API ----------
  return {
    colliders,
    cable,
    mats,          // Bau-Materialien für farm.js / city.js weiterreichen
    sendGondola(onArrive) {
      if (cable.active) return false;
      cable.active = true; cable.dir = 1; cable.onArrive = onArrive;
      return true;
    },
    update(dt, elevN, rainT) {
      // Fenster & Lampe abends / bei Regen
      const darkness = Math.max(1 - elevN * 3, rainT * 0.55);
      const glow = Math.max(0, darkness);
      hut.winMat.emissiveIntensity = glow * 2.2;
      home.winMat.emissiveIntensity = glow * 1.6;
      lamp.intensity = glow * 5;

      if (cable.active) {
        cable.speed = Math.min(cable.speed + dt * 0.06, 0.16);
        cable.t += cable.dir * cable.speed * dt;
        if (cable.dir > 0 && cable.t >= 0.97) {
          cable.t = 0.97; cable.dir = -1; cable.speed = 0.02;
          if (cable.onArrive) { cable.onArrive(); cable.onArrive = null; }
        } else if (cable.dir < 0 && cable.t <= 0.03) {
          cable.t = 0.03; cable.active = false; cable.speed = 0;
        }
        const p = cable.curve.getPointAt(cable.t);
        cable.gondola.position.copy(p);
        cable.gondola.rotation.z = Math.sin(performance.now() * 0.002) * 0.04 * (cable.active ? 1 : 0);
      }
    }
  };
}
