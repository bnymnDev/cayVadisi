// v23: Das Geisterhaus am Waldrand (Story 5) — eine windschiefe Hütte, um
// die sich das Dorf Geschichten erzählt. Nachts flackert drinnen ein
// Licht … Drei Kapitel: Schlüssel finden (glimmt hinterm Haus), nachts
// hinein, Legende aufklären.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';

export function createGhostHouse(ctx, terrain) {
  const { scene } = ctx;
  const H = CFG.ghost.house;
  const gy = terrain.heightAt(H.x, H.z);
  const g = new THREE.Group();
  g.position.set(H.x, gy, H.z);
  g.rotation.y = H.ry;

  // windschiefe Hütte
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.8, 3.6),
    new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 1 }));
  wall.position.y = 1.4;
  wall.rotation.z = 0.04;
  g.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.4, 4),
    new THREE.MeshStandardMaterial({ color: 0x35312c, roughness: 1 }));
  roof.position.y = 3.4;
  roof.rotation.y = Math.PI / 4;
  roof.rotation.z = -0.06;
  g.add(roof);
  // dunkle Tür + Fenster mit Flacker-Licht
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 1 }));
  door.position.set(0, 0.9, 1.81);
  g.add(door);
  const winMat = new THREE.MeshBasicMaterial({ color: 0x0c0a08 });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), winMat);
  win.position.set(1.3, 1.6, 1.81);
  g.add(win);
  const lamp = new THREE.PointLight(0xc9a06a, 0, 9, 2);
  lamp.position.set(0.8, 1.6, 0.6);
  g.add(lamp);
  // toter Baum daneben
  const tree = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 1 }));
  tree.position.set(-3, 1.7, 0.6);
  tree.rotation.z = 0.2;
  g.add(tree);
  // glimmender Schlüssel hinterm Haus (Kapitel 1)
  const key = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8b23a, emissive: 0xa8842a, emissiveIntensity: 0.8, metalness: 0.7, roughness: 0.3 }));
  key.position.set(-1.4, 0.25, -2.3);
  key.rotation.x = Math.PI / 2.4;
  g.add(key);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  function sync() {
    key.visible = state.story5.ch === 1;   // Suchen erst nach dem Gerücht
  }
  sync();

  return {
    sync,
    colliders: [{ x: H.x, z: H.z, r: 2.8 }],
    nearDoor(px, pz) { return Math.hypot(px - H.x, pz - (H.z + 2.4)) < CFG.interactDist + 1.5; },
    nearKey(px, pz) { return state.story5.ch === 1 && Math.hypot(px - (H.x - 1.4), pz - (H.z - 2.3)) < CFG.interactDist + 1; },
    update(dt, elapsed, night) {
      // das berüchtigte Flackern — nur nachts und solange die Legende lebt
      const haunted = night && !state.story5.done;
      lamp.intensity = haunted ? Math.max(0, Math.sin(elapsed * 1.3) * 1.8 - 0.6) : 0;
      winMat.color.setHex(haunted && lamp.intensity > 0.4 ? 0x8a6a3a : 0x0c0a08);
      if (key.visible) key.rotation.z = elapsed * 1.6;
    }
  };
}
