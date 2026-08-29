// v18: Eigene 3D-Assets (z. B. aus der TRELLIS-Bild→3D-Pipeline, siehe
// tools/TRELLIS.md). Liegt unter assets/models/extra/custom/index.json eine
// Liste, werden die glTF-Modelle geladen und in der Welt platziert.
// Ohne index.json ist das ein stiller No-op — nichts bricht.
//
// index.json-Format:
// [ { "file": "konak/konak.glb", "x": -20, "z": -60, "ry": 0.4, "scale": 1.0, "y": 0 } ]
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadCustomModels(ctx, terrain) {
  let list;
  try {
    const res = await fetch('assets/models/extra/custom/index.json', { cache: 'no-store' });
    if (!res.ok) return;
    list = await res.json();
  } catch (e) { return; }
  if (!Array.isArray(list) || !list.length) return;

  const loader = new GLTFLoader();
  for (const entry of list) {
    try {
      const gltf = await loader.loadAsync('assets/models/extra/custom/' + entry.file);
      const model = gltf.scene;
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const y = terrain.heightAt(entry.x || 0, entry.z || 0) + (entry.y || 0);
      model.position.set(entry.x || 0, y, entry.z || 0);
      model.rotation.y = entry.ry || 0;
      model.scale.setScalar(entry.scale || 1);
      ctx.scene.add(model);
      console.log('[custom] geladen:', entry.file);
    } catch (e) {
      console.warn('[custom] konnte nicht laden:', entry.file, e.message);
    }
  }
}
