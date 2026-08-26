// v15: Küstenfrachter — Tee-Container nach Trabzon oder Samsun verschiffen.
// Das Schiff liegt am eigenen Kai; läuft eine Ladung, ist es über Nacht auf
// See (unsichtbar) und die Abrechnung kommt am Abend — mit Sturm-Risiko.
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

function buildFreighterMesh() {
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
  // Brücke achtern
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.7 }));
  bridge.position.set(0, 2.9, -4.8);
  g.add(bridge);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: 0xa53f3f, roughness: 0.6 }));
  funnel.position.set(0, 4.6, -4.8);
  g.add(funnel);
  // Container
  const CC = [0xc0663a, 0x5f8a5a, 0x4a6b8a, 0xe3c24f];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.9, 2.6),
      new THREE.MeshStandardMaterial({ color: CC[i % CC.length], roughness: 0.7 }));
    c.position.set((i % 2 ? 0.78 : -0.78), 2.3 + Math.floor(i / 4) * 0.95, 2.6 - Math.floor((i % 4) / 2) * 2.9);
    g.add(c);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createFreighter(ctx) {
  const { scene } = ctx;
  const F = CFG.freighter;
  let mesh = null;

  function syncOwned() {
    if (state.freighter && !mesh) {
      mesh = buildFreighterMesh();
      mesh.position.set(F.mooring.x, 0.1, F.mooring.z);
      mesh.rotation.y = 2.4;
      scene.add(mesh);
    }
    if (mesh) mesh.visible = !state.shipment;   // auf See = weg
  }
  syncOwned();

  return {
    syncOwned,
    nearMooring(px, pz) {
      return state.freighter && !state.shipment
        && Math.hypot(px - F.mooring.x, pz - F.mooring.z) < 11;
    },
    update(dt, elapsed) {
      if (mesh && mesh.visible) mesh.position.y = 0.1 + Math.sin(elapsed * 0.9) * 0.05;
    }
  };
}
