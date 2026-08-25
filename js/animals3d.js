// v13.5: Skelett-animierte Tiere — Quaternius-Tierpacks (CC0, FBX→GLB).
// Kuh/Schaf bringen Vertex-Farben mit; Huhn/Hund/Katze werden über
// Material-Namen eingefärbt (Fell pro Instanz tintbar).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = 'assets/models/extra/animals/';
const DEFS = {
  cow:     { file: 'cow.glb',     height: 1.35 },
  sheep:   { file: 'sheep.glb',   height: 0.92 },
  chicken: { file: 'chicken.glb', height: 0.42, mats: { 'Material.001': 0xf2ead8, 'Material.002': 0xd8552a } },
  dog:     { file: 'dog.glb',     height: 0.85, fur: 'Dog',   mats: {} },
  cat:     { file: 'cat.glb',     height: 0.36, fur: 'White', mats: { Grey: 0x8b8f96, Pink: 0xd39aa0 } }
};

export function createAnimals3d(ctx) {
  const loaded = {};   // kind -> { scene, clips, scale }
  const loader = new GLTFLoader(ctx.loadingManager);

  const lib = {
    load() {
      return Promise.all(Object.entries(DEFS).map(([kind, def]) => new Promise((res) => {
        loader.load(BASE + def.file, (gltf) => {
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const h = box.max.y - box.min.y || 1;
          loaded[kind] = { scene: gltf.scene, clips: gltf.animations, scale: def.height / h };
          res(true);
        }, undefined, () => { console.warn('Tiermodell fehlt:', kind); res(false); });
      })));
    },
    has(kind) { return !!loaded[kind]; },
    spawn(kind, opts = {}) {
      const src = loaded[kind];
      if (!src) return null;
      const def = DEFS[kind];
      const inst = SkeletonUtils.clone(src.scene);
      inst.scale.setScalar(src.scale * (opts.scale || 1));
      inst.traverse((o) => {
        if (o.isMesh || o.isSkinnedMesh) {
          o.material = o.material.clone();
          const fix = def.mats && def.mats[o.material.name];
          if (fix != null) o.material.color.setHex(fix);
          if (def.fur && o.material.name === def.fur) {
            o.material.color.setHex(opts.tint ?? 0xd8c49a);
          }
          o.material.roughness = 0.9;
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      const group = new THREE.Group();
      group.add(inst);

      const mixer = new THREE.AnimationMixer(inst);
      const byPart = (part) => src.clips.find((c) => c.name.endsWith('|' + part))
        || src.clips.find((c) => c.name.includes(part));
      const actions = {
        Idle: byPart('Idle') || src.clips[0],
        Walk: byPart('Walking') || byPart('Walk') || src.clips[0]
      };
      for (const k of Object.keys(actions)) {
        actions[k] = actions[k] ? mixer.clipAction(actions[k]) : null;
      }
      let current = null;
      const api = {
        group,
        play(name, fade = 0.25, timeScale = 1) {
          const a = actions[name] || actions.Idle;
          if (!a) return;
          if (current === a) { a.timeScale = timeScale; return; }
          a.reset().fadeIn(fade).play();
          a.timeScale = timeScale;
          if (current) current.fadeOut(fade);
          current = a;
        },
        update(dt) { mixer.update(dt); }
      };
      api.play('Idle');
      return api;
    }
  };
  return lib;
}
