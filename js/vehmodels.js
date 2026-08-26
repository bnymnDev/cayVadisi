// v13.6: echte Fahrzeugmodelle — Kenney Car Kit (CC0, GLB mit benannten
// Rad-Nodes). Die bestehende Fahrphysik dreht/lenkt die Räder weiter wie
// bisher, nur die Optik kommt jetzt aus richtigen Modellen.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = 'assets/models/extra/vehicles/';
const DEFS = {
  tractor: { file: 'tractor.glb', len: 3.4 },
  pickup:  { file: 'pickup.glb',  len: 4.0 },
  sedan:   { file: 'sedan.glb',   len: 4.2 },
  lux:     { file: 'lux.glb',     len: 4.5 },
  dolmus:  { file: 'dolmus.glb',  len: 4.9 }
};

export function createVehModels(ctx) {
  const loaded = {};   // id -> { scene, scale }
  const loader = new GLTFLoader(ctx.loadingManager);

  return {
    load() {
      return Promise.all(Object.entries(DEFS).map(([id, def]) => new Promise((res) => {
        loader.load(BASE + def.file, (gltf) => {
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const lenZ = box.max.z - box.min.z || 1;
          loaded[id] = { scene: gltf.scene, scale: def.len / lenZ };
          res(true);
        }, undefined, () => { console.warn('Fahrzeugmodell fehlt:', id); res(false); });
      })));
    },
    has(id) { return !!loaded[id]; },
    // Liefert { group, wheels[{mesh,front,r}], size{w,h,l} } — Konvention +z = vorn
    spawn(id) {
      const src = loaded[id];
      if (!src) return null;
      const inst = src.scene.clone(true);
      inst.scale.setScalar(src.scale);
      inst.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const group = new THREE.Group();
      group.add(inst);
      // auf den Boden setzen
      group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(group);
      inst.position.y -= box.min.y;
      const size = { w: box.max.x - box.min.x, h: box.max.y - box.min.y, l: box.max.z - box.min.z };
      // benannte Rad-Nodes einsammeln — die Physik dreht sie wie bisher
      const wheels = [];
      for (const name of ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right']) {
        const node = inst.getObjectByName(name);
        if (!node) continue;
        const wb = new THREE.Box3().setFromObject(node);
        wheels.push({ mesh: node, front: name.includes('front'), r: Math.max(0.2, (wb.max.y - wb.min.y) / 2) });
      }
      return { group, wheels, size };
    }
  };
}
