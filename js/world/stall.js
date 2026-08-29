// v17: Eigener Basar-Stand in der Kasaba — Holztresen mit gestreifter
// Markise. Die eingelagerte Ware liegt sichtbar auf dem Tresen, und
// echte Kunden-NPCs schlendern heran, kaufen und ziehen weiter.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { spawnPerson } from '../workers.js';

// Auslage-Farben je Produktgruppe
const GOOD_COLORS = {
  tea_pack: 0x2e6b3a, tea_green: 0x69a45a, tea_white: 0xdad3b8, tea_harman: 0x7a4a2a,
  honey: 0xd99a2b, cheese: 0xf0e6c8, egg: 0xf2ead8, milk: 0xf5f2ea,
  hamsi: 0x7f96a6, lufer: 0x8fa6b8, kalkan: 0x9aa88f, levrek: 0xa8b8c6, kofana: 0x778da0, mersin: 0x5d6f80,
  corn: 0xe0b53a, tomato: 0xc84a32, cabbage: 0x7fae5a, hazel: 0x8a5f34, straw: 0xc2334a, walnut: 0x74542f,
  wool: 0xe8e3d8, coal: 0x23201d
};

function makeAwningTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#c8402e' : '#f2ede2';
    g.fillRect(i * 16, 0, 16, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStall(ctx, terrain, chars) {
  const { scene } = ctx;
  const S = CFG.stall.spot;
  const gy = terrain.heightAt(S.x, S.z);
  const g = new THREE.Group();
  g.position.set(S.x, gy, S.z);
  g.rotation.y = S.ry;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 });
  // Tresen
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.1), woodMat);
  counter.position.y = 0.45;
  g.add(counter);
  // Pfosten + Markise
  for (const sx of [-1.5, 1.5]) for (const sz of [-0.45, 0.45]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6), woodMat);
    post.position.set(sx, 1.15, sz);
    g.add(post);
  }
  const awning = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 1.7),
    new THREE.MeshStandardMaterial({ map: makeAwningTexture(), roughness: 0.8 }));
  awning.position.set(0, 2.35, 0);
  awning.rotation.x = -0.12;
  g.add(awning);
  // Kisten daneben
  for (let i = 0; i < 2; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xa07a44, roughness: 0.9 }));
    crate.position.set(-2.1, 0.23 + i * 0.48, 0.1);
    g.add(crate);
  }
  // Auslage: bis zu 6 Warenwürfel auf dem Tresen
  const goods = [];
  for (let i = 0; i < 6; i++) {
    const item = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 }));
    item.position.set(-1.25 + i * 0.5, 1.03, 0.15);
    item.visible = false;
    g.add(item);
    goods.push(item);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);

  // Kunden laufen von einem Straßenpunkt zum Tresen und zurück
  const approach = { x: S.x + 6, z: S.z + 5 };
  const counterFront = { x: S.x + Math.sin(S.ry + Math.PI) * -1.6, z: S.z + Math.cos(S.ry + Math.PI) * -1.6 };
  const customers = [];   // { person, st: 'in'|'buy'|'out', timer }
  let nextCustomer = 8;

  function sync() {
    g.visible = !!state.stall;
    if (!state.stall) return;
    const ids = Object.keys(state.stall.stock).filter((id) => state.stall.stock[id] > 0);
    for (let i = 0; i < goods.length; i++) {
      const id = ids[i];
      goods[i].visible = !!id;
      if (id) goods[i].material.color.setHex(GOOD_COLORS[id] || 0x9a8a6a);
    }
  }
  sync();

  return {
    sync,
    colliders: [{ x: S.x, z: S.z, r: 1.6 }],
    near(px, pz) { return Math.hypot(px - S.x, pz - S.z) < CFG.interactDist + 2.2; },
    // onBuy() kommt aus game.js und entscheidet, ob der Kunde kauft
    update(dt, elapsed, daytime, onBuy) {
      if (!state.stall) return;
      const hasStock = Object.values(state.stall.stock).some((n) => n > 0);
      nextCustomer -= dt;
      if (daytime && hasStock && customers.length < 2 && nextCustomer <= 0) {
        nextCustomer = CFG.stall.buyerEvery * (0.6 + Math.random() * 0.8);
        const person = spawnPerson(chars, Math.floor(Math.random() * 8), { hat: Math.random() < 0.5 });
        person.group.position.set(approach.x, terrain.heightAt(approach.x, approach.z), approach.z);
        scene.add(person.group);
        customers.push({ person, st: 'in', timer: 0 });
      }
      for (let i = customers.length - 1; i >= 0; i--) {
        const c = customers[i];
        const p = c.person.group.position;
        const target = c.st === 'out' ? approach : counterFront;
        const dx = target.x - p.x, dz = target.z - p.z;
        const d = Math.hypot(dx, dz);
        if (c.st === 'buy') {
          c.timer -= dt;
          if (c.person.anim) c.person.anim.play('Idle');
          if (c.timer <= 0) {
            onBuy();       // game.js entscheidet + kassiert
            c.st = 'out';
          }
        } else if (d < 0.4) {
          if (c.st === 'in') { c.st = 'buy'; c.timer = 1.6; }
          else { scene.remove(c.person.group); customers.splice(i, 1); continue; }
        } else {
          const sp = 1.7 * dt;
          p.x += (dx / d) * sp;
          p.z += (dz / d) * sp;
          p.y = terrain.heightAt(p.x, p.z);
          c.person.group.rotation.y = Math.atan2(dx, dz);
          if (c.person.anim) c.person.anim.play('Walk', 0.25, 1.2);
        }
        if (c.person.anim) c.person.anim.update(dt);
      }
    }
  };
}
