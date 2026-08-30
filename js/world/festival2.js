// v22: Ramazan & Bayram — alle 28 Tage. Abends in der Ramazan-Woche steht
// eine lange Iftar-Tafel am Stadtplatz (Lichterkette, Speisen), das ganze
// Dorf sammelt sich. Am Bayram klopfen morgens zwei Kinder an deine Tür
// und warten sichtbar auf Süßigkeiten.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { spawnPerson } from '../workers.js';

export function createFestival2(ctx, terrain, chars) {
  const { scene } = ctx;
  const H = CFG.holidays;
  const cx = CFG.city.x - 4, cz = CFG.city.z + 8;
  const gy = terrain.heightAt(cx, cz);

  // ---- Iftar-Tafel ----
  const table = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 1.4), woodMat);
  top.position.y = 0.78;
  table.add(top);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.03, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.9 }));
  cloth.position.y = 0.85;
  table.add(cloth);
  for (const lx of [-4, 0, 4]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 1.2), woodMat);
    leg.position.set(lx, 0.39, 0);
    table.add(leg);
  }
  // Speisen: Teller, Krüge, Brot
  for (let i = 0; i < 10; i++) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.6 }));
    plate.position.set(-4 + i * 0.9, 0.9, (i % 2 ? 0.3 : -0.3));
    table.add(plate);
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5),
      new THREE.MeshStandardMaterial({ color: [0xc9812e, 0x9a3f2e, 0xd9c9a0][i % 3], roughness: 0.7 }));
    food.position.set(-4 + i * 0.9, 0.96, (i % 2 ? 0.3 : -0.3));
    table.add(food);
  }
  // Lichterkette über der Tafel ("Mahya"-Stimmung)
  const bulbs = [];
  for (const px of [-4.6, 4.6]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 6), woodMat);
    pole.position.set(px, 1.6, 0);
    table.add(pole);
  }
  for (let i = 0; i < 11; i++) {
    const x = -4.4 + i * 0.88;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xf7d060 }));
    bulb.position.set(x, 3.0 - Math.sin((i / 10) * Math.PI) * 0.5, 0);
    table.add(bulb);
    bulbs.push(bulb);
  }
  table.position.set(cx, gy, cz);
  table.rotation.y = -0.4;
  table.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  table.visible = false;
  scene.add(table);

  // ---- Bayram-Kinder vor deinem Haus ----
  const kids = [];
  function buildKids() {
    if (kids.length || !chars || !chars.ready) return;
    for (let i = 0; i < H.kids; i++) {
      const kid = spawnPerson(chars, i + 1, { hat: false });
      kid.group.scale.setScalar(0.62);   // Kinder
      const kx = CFG.home.x + 3 + i * 1.4, kz = CFG.home.z + 2.5;
      kid.group.position.set(kx, terrain.heightAt(kx, kz), kz);
      kid.group.rotation.y = -2.2;
      kid.group.visible = false;
      scene.add(kid.group);
      kids.push(kid);
    }
  }

  function phase() {
    const d = state.day % H.cycle;
    if (d >= H.ramazanFrom && d < H.ramazanFrom + H.ramazanDays) return 'ramazan';
    if (d >= H.ramazanFrom + H.ramazanDays && d < H.ramazanFrom + H.ramazanDays + 2) return 'bayram';
    return null;
  }

  return {
    phase,
    nearTable(px, pz) { return Math.hypot(px - cx, pz - cz) < CFG.interactDist + 4; },
    nearKids(px, pz) { return Math.hypot(px - (CFG.home.x + 3), pz - (CFG.home.z + 2.5)) < CFG.interactDist + 2; },
    update(dt, elapsed, hour) {
      const ph = phase();
      table.visible = ph === 'ramazan' && hour >= H.iftarHour - 0.5;
      if (table.visible) {
        for (let i = 0; i < bulbs.length; i++) {
          bulbs[i].material.color.setHex(Math.sin(elapsed * 3 + i) > -0.4 ? 0xf7d060 : 0x8a6a2a);
        }
      }
      buildKids();
      const kidsOut = ph === 'bayram' && hour < 13 && (state._sekerLeft || 0) > 0;
      for (let i = 0; i < kids.length; i++) {
        kids[i].group.visible = kidsOut && i < (state._sekerLeft || 0);
        if (kids[i].group.visible && kids[i].anim) {
          kids[i].anim.play('Idle');
          kids[i].anim.update(dt);
          kids[i].group.position.y = terrain.heightAt(kids[i].group.position.x, kids[i].group.position.z)
            + Math.max(0, Math.sin(elapsed * 4 + i * 2)) * 0.12;   // aufgeregtes Hüpfen
        }
      }
    }
  };
}
