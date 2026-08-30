// v20: Immobilien-Flipping — drei verfallene Häuser im Tal. Jede
// Renovierungsstufe ist sichtbar: Bretter vor den Fenstern verschwinden,
// das Dach wird neu gedeckt, am Ende blühen Blumenkästen. Vermietet als
// Pansiyon hängt ein Schild samt Wäscheleine davor.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createFlips(ctx, terrain) {
  const { scene } = ctx;
  const houses = [];

  for (const H of CFG.flip.houses) {
    const gy = terrain.heightAt(H.x, H.z);
    const g = new THREE.Group();
    g.position.set(H.x, gy, H.z);
    g.rotation.y = H.ry;

    // Wände: Material wird je Stufe umgefärbt
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.0, 4.4), wallMat);
    wall.position.y = 1.5;
    g.add(wall);
    // Dach: alt (schief, grau) vs. neu (rot)
    const roofOld = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 1 }));
    roofOld.position.y = 3.7;
    roofOld.rotation.y = Math.PI / 4;
    roofOld.rotation.z = 0.06;   // hängt durch
    g.add(roofOld);
    const roofNew = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x9a4a34, roughness: 0.8 }));
    roofNew.position.y = 3.75;
    roofNew.rotation.y = Math.PI / 4;
    g.add(roofNew);
    // Fenster + Bretter davor (Ruinen-Look)
    const winMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, roughness: 0.4 });
    const litMat = new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xcf9e46, emissiveIntensity: 0.4 });
    const windows = [], boards = [];
    for (const wx of [-1.6, 1.6]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.1), winMat);
      win.position.set(wx, 1.7, 2.21);
      g.add(win);
      windows.push(win);
      for (let b = 0; b < 2; b++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 1 }));
        board.position.set(wx, 1.5 + b * 0.45, 2.26);
        board.rotation.z = b ? -0.25 : 0.2;
        g.add(board);
        boards.push(board);
      }
    }
    // Tür
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.9 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.9), doorMat);
    door.position.set(0, 0.95, 2.21);
    g.add(door);
    // Blumenkästen (Stufe 3)
    const flowers = new THREE.Group();
    for (const wx of [-1.6, 1.6]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
      box.position.set(wx, 1.05, 2.32);
      flowers.add(box);
      for (let f = 0; f < 3; f++) {
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5),
          new THREE.MeshStandardMaterial({ color: [0xd44a6a, 0xe3c24f, 0xd47a3a][f], roughness: 0.6 }));
        bloom.position.set(wx - 0.35 + f * 0.35, 1.22, 2.34);
        flowers.add(bloom);
      }
    }
    g.add(flowers);
    // SATILIK-Schild (Ruine) & PANSİYON-Schild (vermietet)
    const saleSign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.45),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('SATILIK EV', '#7a4a1e'), roughness: 0.7, side: THREE.DoubleSide }));
    saleSign.position.set(-2.2, 1.3, 2.4);
    saleSign.rotation.y = 0.3;
    g.add(saleSign);
    const rentSign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.5),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('PANSİYON', '#1e4d33'), roughness: 0.7, side: THREE.DoubleSide }));
    rentSign.position.set(0, 3.0, 2.35);
    g.add(rentSign);

    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    houses.push({ g, wallMat, roofOld, roofNew, windows, boards, litMat, winMat, doorMat, flowers, saleSign, rentSign, x: H.x, z: H.z });
  }

  function sync() {
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      const st = state.flips[i];
      const sold = st && st.sold !== undefined;
      h.g.visible = !sold;               // verkauft: kurz weg, bis neue Ruine ansteht
      if (sold) continue;
      const stage = st && st.stage !== undefined ? st.stage : -1;   // -1 = Ruine, unbesessen
      const owned = stage >= 0;
      h.wallMat.color.setHex(stage >= 1 ? 0xd8cbb2 : 0x8a8478);
      h.roofOld.visible = stage < 2;
      h.roofNew.visible = stage >= 2;
      for (const b of h.boards) b.visible = stage < 1;
      for (const w of h.windows) w.material = stage >= 2 ? h.litMat : h.winMat;
      h.doorMat.color.setHex(stage >= 3 ? 0x2e6b3a : 0x4a4038);
      h.flowers.visible = stage >= 3;
      h.saleSign.visible = !owned;
      h.rentSign.visible = !!(st && st.rent);
    }
  }
  sync();

  return {
    sync,
    colliders: CFG.flip.houses.map((H) => ({ x: H.x, z: H.z, r: 3.4 })),
    near(px, pz) {
      for (let i = 0; i < houses.length; i++) {
        const st = state.flips[i];
        if (st && st.sold !== undefined) continue;
        if (Math.hypot(px - houses[i].x, pz - houses[i].z) < CFG.interactDist + 3) return i;
      }
      return -1;
    }
  };
}
