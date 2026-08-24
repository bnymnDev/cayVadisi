// Selektive Modell-Optimierung: OPAQUE-Geometrie (Stamm/Fels) stark vereinfachen,
// Alpha-Blattkarten unangetastet lassen (CLI-Simplify frisst sonst das Laub).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, prune, weldPrimitive, simplifyPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

import { readFileSync, existsSync } from 'node:fs';

const JOBS = [
  { slug: 'island_tree_01', out: 'island_tree_01_hero', wood: [0.06, 0.01], leaf: [0.16, 0.0008] },
  { slug: 'island_tree_01', out: 'island_tree_01_far', wood: [0.03, 0.02], leaf: [0.05, 0.003], tex512: true },
  { slug: 'island_tree_02', out: 'island_tree_02_hero', wood: [0.06, 0.01], leaf: [0.18, 0.0008] },
  { slug: 'island_tree_02', out: 'island_tree_02_far', wood: [0.03, 0.02], leaf: [0.06, 0.003], tex512: true },
  { slug: 'fern_02', out: 'fern_02_v2', wood: [0.5, 0.002], leaf: [0.6, 0.0006] }
];

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function simp(doc, prim, ratio, error) {
  try { weldPrimitive(prim, { tolerance: 0.00005 }); }
  catch (e) { weldPrimitive(doc, prim, { tolerance: 0.00005 }); }
  try { simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error }); }
  catch (e) { simplifyPrimitive(doc, prim, { simplifier: MeshoptSimplifier, ratio, error }); }
}
const tris = (p) => (p.getIndices() ? p.getIndices().getCount() / 3 : p.getAttribute('POSITION').getCount() / 3);

for (const { slug, out, wood, leaf, tex512 } of JOBS) {
  const doc = await io.read(`assets/_raw/${slug}/${slug}_1k.gltf`);
  await doc.transform(dedup(), flatten(), prune());
  if (tex512) {
    for (const tex of doc.getRoot().listTextures()) {
      const base = (tex.getURI() || '').split('/').pop();
      const p512 = `assets/_raw/${slug}/tex512/${base}`;
      if (base && existsSync(p512)) tex.setImage(readFileSync(p512)).setMimeType('image/jpeg');
    }
  }
  let w0 = 0, w1 = 0, l0 = 0, l1 = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const name = (mat?.getName() || '').toLowerCase();
      const isLeaf = (mat && mat.getAlphaMode() !== 'OPAQUE') || name.includes('leaves') || name.includes('leaf');
      if (isLeaf) { l0 += tris(prim); simp(doc, prim, leaf[0], leaf[1]); l1 += tris(prim); }
      else { w0 += tris(prim); simp(doc, prim, wood[0], wood[1]); w1 += tris(prim); }
    }
  }
  await doc.transform(prune());
  await io.write(`assets/_tmp_${out}.glb`, doc);
  console.log(`${out}: wood ${Math.round(w0)}->${Math.round(w1)}, leaf ${Math.round(l0)}->${Math.round(l1)} tris`);
}
console.log('OK');
