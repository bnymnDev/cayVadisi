// v14: Dede-Erinnerungen — zehn alte Fotorahmen an bedeutsamen Orten.
// Alle gefunden: das Familienrezept „Dede Harmanı" wird frei.
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

export function createMemories(ctx, terrain) {
  const { scene } = ctx;
  const frames = [];
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6d42, roughness: 0.85 });
  const photoMat = new THREE.MeshStandardMaterial({
    color: 0xd9cdb4, roughness: 0.6, emissive: 0xffe9b0, emissiveIntensity: 0.25
  });

  CFG.dede.spots.forEach((s2, i) => {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.0, 6), frameMat);
    post.position.y = 0.5;
    g.add(post);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.05), frameMat);
    frame.position.y = 1.2;
    g.add(frame);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.5), photoMat.clone());
    photo.position.set(0, 1.2, 0.035);
    g.add(photo);
    g.position.set(s2.x, terrain.heightAt(s2.x, s2.z), s2.z);
    g.rotation.y = (i * 1.3) % (Math.PI * 2);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    frames.push({ group: g, photo, i });
  });

  function sync() {
    for (const f of frames) {
      // gefunden: Rahmen bleibt als Andenken, Glühen erlischt
      f.photo.material.emissiveIntensity = state.memories.includes(f.i) ? 0 : 0.25;
    }
  }
  sync();

  return {
    sync,
    nearest(px, pz) {
      for (const f of frames) {
        if (state.memories.includes(f.i)) continue;
        const s2 = CFG.dede.spots[f.i];
        if (Math.hypot(px - s2.x, pz - s2.z) < CFG.interactDist + 1.5) return f.i;
      }
      return -1;
    },
    update(elapsed) {
      for (const f of frames) {
        if (!state.memories.includes(f.i)) {
          f.photo.material.emissiveIntensity = 0.25 + Math.sin(elapsed * 2 + f.i) * 0.15;
        }
      }
    }
  };
}
