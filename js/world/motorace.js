// v22: Moto-Kurier-Rennen — Startflagge an der Kasaba-Straße, während des
// Rennens leuchten Checkpoint-Ringe über der Landstraße. Ein halb-
// transparenter „Geist" fährt deine Bestzeit mit — schlag ihn!
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createMotoRace(ctx, terrain) {
  const { scene } = ctx;
  const R = CFG.motorace;

  // Startflagge (immer sichtbar)
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.8, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6, metalness: 0.3 }));
  pole.position.y = 1.4;
  flag.add(pole);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.5),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('KURYE YARIŞI', '#23272b'), roughness: 0.6, side: THREE.DoubleSide }));
  banner.position.y = 2.4;
  flag.add(banner);
  flag.position.set(R.start.x, terrain.heightAt(R.start.x, R.start.z), R.start.z);
  flag.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(flag);

  // Checkpoint-Ringe (nur im Rennen sichtbar)
  const rings = R.gates.map((gpos) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.22, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.85 }));
    ring.position.set(gpos.x, terrain.heightAt(gpos.x, gpos.z) + 2.4, gpos.z);
    ring.visible = false;
    scene.add(ring);
    return ring;
  });

  // Geist: transparenter Moto-Klotz auf Bestzeit-Kurs
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 1.8),
    new THREE.MeshBasicMaterial({ color: 0x9ad0f2, transparent: true, opacity: 0.4 }));
  ghost.visible = false;
  scene.add(ghost);

  // Streckenlängen für den Geist
  const pathPts = [R.start, ...R.gates];
  const segLens = [];
  let totalLen = 0;
  for (let i = 0; i < pathPts.length - 1; i++) {
    const l = Math.hypot(pathPts[i + 1].x - pathPts[i].x, pathPts[i + 1].z - pathPts[i].z);
    segLens.push(l);
    totalLen += l;
  }

  function ghostPos(frac) {
    let d = frac * totalLen;
    for (let i = 0; i < segLens.length; i++) {
      if (d <= segLens[i]) {
        const f = d / segLens[i];
        const x = pathPts[i].x + (pathPts[i + 1].x - pathPts[i].x) * f;
        const z = pathPts[i].z + (pathPts[i + 1].z - pathPts[i].z) * f;
        return { x, z, yaw: Math.atan2(pathPts[i + 1].x - pathPts[i].x, pathPts[i + 1].z - pathPts[i].z) };
      }
      d -= segLens[i];
    }
    const last = pathPts[pathPts.length - 1];
    return { x: last.x, z: last.z, yaw: 0 };
  }

  return {
    nearStart(px, pz) {
      return state.vehicles.moto && Math.hypot(px - R.start.x, pz - R.start.z) < CFG.interactDist + 3;
    },
    setActive(on, next = 0) {
      for (let i = 0; i < rings.length; i++) rings[i].visible = on && i >= next;
      ghost.visible = on && state.motoBest > 0;
    },
    markNext(next) {
      for (let i = 0; i < rings.length; i++) {
        rings[i].visible = i >= next;
        rings[i].material.color.setHex(i === next ? 0xf7d060 : 0x4fc3f7);
      }
    },
    update(dt, elapsed, raceTime) {
      for (const ring of rings) {
        if (ring.visible) ring.rotation.y = elapsed * 1.2;
      }
      if (ghost.visible && state.motoBest > 0 && raceTime >= 0) {
        const p = ghostPos(Math.min(1, raceTime / state.motoBest));
        ghost.position.set(p.x, terrain.heightAt(p.x, p.z) + 0.6, p.z);
        ghost.rotation.y = p.yaw;
      }
    }
  };
}
