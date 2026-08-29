// v17: Land-Grab — Parzellen im Tal mit Eckpfosten, Absperrseil und
// Besitzer-Fahne (grün = Spieler, rot = Kemal, orange = Şaban, lila = Nurten).
// Rivalen schnappen sich regelmäßig freies Land — sichtbar auf der Karte.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createParcels(ctx, terrain) {
  const { scene } = ctx;
  const P = CFG.parcels;
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.95 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 1 });
  const parcels = [];

  for (let i = 0; i < P.spots.length; i++) {
    const S = P.spots[i];
    const gy = terrain.heightAt(S.x, S.z);
    const g = new THREE.Group();
    g.position.set(S.x, gy, S.z);
    const R = 4.2;
    // 4 Eckpfosten + Seil
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(a) * R, pz = Math.sin(a) * R;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 6), woodMat);
      const dy = terrain.heightAt(S.x + px, S.z + pz) - gy;
      post.position.set(px, dy + 0.55, pz);
      g.add(post);
      const b = ((c + 1) / 4) * Math.PI * 2 + Math.PI / 4;
      const qx = Math.cos(b) * R, qz = Math.sin(b) * R;
      const len = Math.hypot(qx - px, qz - pz);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 5), ropeMat);
      rope.position.set((px + qx) / 2, dy + 0.92, (pz + qz) / 2);
      rope.rotation.y = -Math.atan2(qz - pz, qx - px);
      rope.rotation.z = Math.PI / 2;
      g.add(rope);
    }
    // Fahnenmast + Besitzer-Fahne
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.0, 6), woodMat);
    pole.position.y = 1.5;
    g.add(pole);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.65, 6, 1), flagMat);
    flag.position.set(0.58, 2.55, 0);
    g.add(flag);
    // "SATILIK"-Schild solange frei
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('SATILIK ARSA', '#7a4a1e'), roughness: 0.7, side: THREE.DoubleSide }));
    sign.position.set(0, 1.15, 0.1);
    g.add(sign);

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    parcels.push({ g, flag, flagMat, sign, x: S.x, z: S.z });
  }

  function sync() {
    for (let i = 0; i < parcels.length; i++) {
      const owner = state.parcels[i] || null;
      const p = parcels[i];
      p.sign.visible = !owner;
      p.flag.visible = !!owner;
      if (owner) {
        p.flagMat.color.setHex(owner === 'me' ? P.meColor : P.rivals[owner] || 0x888888);
      }
    }
  }
  sync();

  return {
    sync,
    // Index der nächsten Parzelle in Reichweite (egal ob frei oder besetzt)
    near(px, pz) {
      for (let i = 0; i < parcels.length; i++) {
        if (Math.hypot(px - parcels[i].x, pz - parcels[i].z) < CFG.interactDist + 2) return i;
      }
      return -1;
    },
    update(dt, elapsed) {
      // Fahnen wehen (billig: Vertex-frei über Rotation + Scale-Puls)
      for (let i = 0; i < parcels.length; i++) {
        const f = parcels[i].flag;
        if (!f.visible) continue;
        f.rotation.y = Math.sin(elapsed * 2.2 + i) * 0.25;
        f.scale.x = 1 + Math.sin(elapsed * 5.1 + i * 2) * 0.06;
      }
    }
  };
}
