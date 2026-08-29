// v17: Erdrutsch — nach Sturmtagen kann die Landstraße zwischen Haus und
// Stadt unter Schlamm und Felsen verschwinden. Physisch blockiert (Collider),
// per Schaufel-Einsatz Stück für Stück wegräumen: der Haufen schrumpft sichtbar.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createLandslide(ctx, terrain) {
  const { scene } = ctx;
  const L = CFG.landslide;
  const gy = terrain.heightAt(L.spot.x, L.spot.z);
  const g = new THREE.Group();
  g.position.set(L.spot.x, gy, L.spot.z);

  const mudMat = new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 1 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: 0.95 });

  // Schlammhaufen quer über die Straße
  const mounds = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 0.5, 8, 6), mudMat);
    m.position.set((i - 2) * 1.6 + (Math.random() - 0.5), 0.15, (Math.random() - 0.5) * 1.6);
    m.scale.y = 0.45;
    g.add(m);
    mounds.push(m);
  }
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.4, 0), rockMat);
    r.position.set((Math.random() - 0.5) * 6, 0.4, (Math.random() - 0.5) * 2);
    r.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(r);
    mounds.push(r);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  // Collider wird live geschaltet (r=0 wenn frei) — Spieler & Autos prallen ab
  const collider = { x: L.spot.x, z: L.spot.z, r: 0 };

  function sync() {
    const active = !!state.landslide;
    g.visible = active;
    collider.r = active ? 3.6 : 0;
    if (active) {
      // Haufen schrumpft mit dem Fortschritt
      const f = 0.35 + 0.65 * (state.landslide.left / L.scoops);
      g.scale.set(f, f, f);
    }
  }
  sync();

  return {
    sync,
    collider,
    near(px, pz) {
      return !!state.landslide && Math.hypot(px - L.spot.x, pz - L.spot.z) < CFG.interactDist + 3.5;
    },
    // Weltposition für Staub-Partikel beim Schaufeln
    dustPos(v3) { v3.set(L.spot.x, gy + 0.8, L.spot.z); return v3; }
  };
}
