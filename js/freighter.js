// v15: Küstenfrachter — Tee-Container verschiffen. v20: Reederei — bis zu
// drei Schiffe liegen gestaffelt am Kai; jedes auf See ist unsichtbar, die
// Abrechnung kommt am Abend (mit Sturm-Risiko und optionaler Versicherung).
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

const FUNNEL_COLORS = [0xa53f3f, 0x3f6ea5, 0x3fa55f];

function buildFreighterMesh(idx) {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x3f5a6d, roughness: 0.6, metalness: 0.3 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 13), hullMat);
  hull.position.y = 0.9;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.6, 3), hullMat);
  bow.rotation.y = Math.PI / 6;
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.9, 7.2);
  g.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 12.4),
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.7 }));
  deck.position.y = 1.75;
  g.add(deck);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.7 }));
  bridge.position.set(0, 2.9, -4.8);
  g.add(bridge);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: FUNNEL_COLORS[idx % FUNNEL_COLORS.length], roughness: 0.6 }));
  funnel.position.set(0, 4.6, -4.8);
  g.add(funnel);
  const CC = [0xc0663a, 0x5f8a5a, 0x4a6b8a, 0xe3c24f];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.9, 2.6),
      new THREE.MeshStandardMaterial({ color: CC[(i + idx) % CC.length], roughness: 0.7 }));
    c.position.set((i % 2 ? 0.78 : -0.78), 2.3 + Math.floor(i / 4) * 0.95, 2.6 - Math.floor((i % 4) / 2) * 2.9);
    g.add(c);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createFreighter(ctx) {
  const { scene } = ctx;
  const F = CFG.freighter;
  const meshes = [null, null, null];

  function syncOwned() {
    // Schiffe im Hafen = Flotte minus Schiffe auf See
    const inPort = Math.max(0, (state.fleet || 0) - (state.shipments || []).length);
    for (let i = 0; i < 3; i++) {
      if (i < (state.fleet || 0) && !meshes[i]) {
        meshes[i] = buildFreighterMesh(i);
        // gestaffelt am Kai entlang
        meshes[i].position.set(F.mooring.x + i * 7, 0.1, F.mooring.z + i * 10);
        meshes[i].rotation.y = 2.4;
        scene.add(meshes[i]);
      }
      if (meshes[i]) meshes[i].visible = i < inPort;
    }
  }
  syncOwned();

  return {
    syncOwned,
    nearMooring(px, pz) {
      return (state.fleet || 0) > 0
        && Math.hypot(px - F.mooring.x, pz - F.mooring.z) < 11 + (state.fleet || 0) * 4;
    },
    update(dt, elapsed) {
      for (let i = 0; i < 3; i++) {
        if (meshes[i] && meshes[i].visible) {
          meshes[i].position.y = 0.1 + Math.sin(elapsed * 0.9 + i * 1.7) * 0.05;
        }
      }
    }
  };
}
