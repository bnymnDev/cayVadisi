// v17: Imker-Meisterschaft auf der Yayla — alle zwei Wochen steht dort ein
// Jury-Tisch mit Honiggläsern, Banner und Preisrichter; ein Bienenschwarm
// umkreist die Gläser. Gewinner-Pokal bleibt sichtbar auf dem Tisch stehen.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';
import { spawnPerson } from '../workers.js';

export function createBeeCup(ctx, terrain, chars) {
  const { scene } = ctx;
  const B = CFG.beeCup;
  const gy = terrain.heightAt(B.spot.x, B.spot.z);
  const g = new THREE.Group();
  g.position.set(B.spot.x, gy, B.spot.z);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 });
  // Jury-Tisch mit Decke
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.1), woodMat);
  table.position.y = 0.85;
  g.add(table);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.9 }));
  cloth.position.y = 0.58;
  g.add(cloth);
  // Honiggläser
  const jarMat = new THREE.MeshStandardMaterial({ color: 0xd99a2b, roughness: 0.3, emissive: 0x9a5f10, emissiveIntensity: 0.15 });
  const jars = [];
  for (let i = 0; i < 4; i++) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.28, 10), jarMat);
    jar.position.set(-0.9 + i * 0.6, 1.05, 0);
    g.add(jar);
    jars.push(jar);
  }
  // Banner
  for (const sx of [-1.4, 1.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), woodMat);
    post.position.set(sx, 1.2, -0.7);
    g.add(post);
  }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.5),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('BAL ŞAMPİYONASI', '#a86a12'), roughness: 0.7, side: THREE.DoubleSide }));
  banner.position.set(0, 2.25, -0.7);
  g.add(banner);
  // Siegerpokal (sichtbar nach dem ersten Sieg)
  const cup = new THREE.Group();
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xd8b23a, roughness: 0.25, metalness: 0.8 });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.07, 0.2, 10), cupMat);
  bowl.position.y = 1.18;
  cup.add(bowl);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.14, 8), cupMat);
  foot.position.y = 1.0;
  cup.add(foot);
  cup.position.set(1.15, 0, 0);
  g.add(cup);

  // Bienenschwarm: kleine Punkte umkreisen die Gläser
  const bees = [];
  const beeMat = new THREE.MeshBasicMaterial({ color: 0xe8c23a });
  for (let i = 0; i < 10; i++) {
    const bee = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), beeMat);
    g.add(bee);
    bees.push({ mesh: bee, phase: (i / 10) * Math.PI * 2, r: 0.5 + Math.random() * 0.6, h: 1.1 + Math.random() * 0.5 });
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);

  // Preisrichter (lazy, erst wenn Modelle bereit)
  let judge = null;
  function buildJudge() {
    if (judge || !chars || !chars.ready) return;
    judge = spawnPerson(chars, 4, { hat: false });
    judge.group.position.set(B.spot.x, terrain.heightAt(B.spot.x, B.spot.z - 1.4), B.spot.z - 1.4);
    judge.group.rotation.y = 0;
    scene.add(judge.group);
  }

  function activeToday() {
    return state.day % B.everyDays === B.offset;
  }

  function sync() {
    const on = activeToday();
    g.visible = on;
    cup.visible = state.beeCupWins > 0;
    if (on) buildJudge();
    if (judge) judge.group.visible = on;
  }
  sync();

  return {
    sync,
    get active() { return activeToday(); },
    near(px, pz) {
      return activeToday() && Math.hypot(px - B.spot.x, pz - B.spot.z) < CFG.interactDist + 2.5;
    },
    update(dt, elapsed) {
      if (!g.visible) return;
      for (const b of bees) {
        b.phase += dt * 2.4;
        b.mesh.position.set(
          Math.cos(b.phase) * b.r,
          b.h + Math.sin(elapsed * 3 + b.phase) * 0.08,
          Math.sin(b.phase) * b.r
        );
      }
      if (judge && judge.anim) { judge.anim.play('Idle'); judge.anim.update(dt); }
    }
  };
}
