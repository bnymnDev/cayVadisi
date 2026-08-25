// v4: Echte CC0-Fotoscan-Modelle (Poly Haven) — Fußball mit Physik,
// Fässer am Hafen & an der Fabrik, Çayevi-Terrasse mit Tisch, Stühlen & Kanne
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CFG } from '../config.js';

const BASE = 'assets/models/extra/';

export async function createCc0Props(ctx, terrain) {
  const { scene, loadingManager } = ctx;
  const loader = new GLTFLoader(loadingManager);
  const load = (slug) => new Promise((res, rej) =>
    loader.load(`${BASE}${slug}/${slug}_1k.gltf`, res, undefined, rej));

  const colliders = [];
  const [footballG, barrelG, tableG, chairG, potG,
    lanternG, benchG, cartG, pierG, gnomeG, cheeseG,
    shrubG, boulderG, mossG] = await Promise.all([
    load('football'), load('Barrel_01'), load('WoodenTable_02'), load('WoodenChair_01'), load('brass_pot_01'),
    // v10: Grafik-Paket
    load('Lantern_01'), load('painted_wooden_bench'), load('CoffeeCart_01'),
    load('modular_wooden_pier'), load('garden_gnome'), load('CheeseBox_01'),
    load('shrub_01'), load('boulder_01'), load('rock_moss_set_01')
  ]);
  for (const g of [footballG, barrelG, tableG, chairG, potG, lanternG, benchG, cartG, pierG, gnomeG, cheeseG,
    shrubG, boulderG, mossG]) {
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  function place(src, x, z, ry = 0, scale = 1, collideR = 0, lift = 0) {
    const inst = src.scene.clone(true);
    inst.position.set(x, terrain.heightAt(x, z) + lift, z);
    inst.rotation.y = ry;
    inst.scale.setScalar(scale);
    scene.add(inst);
    if (collideR > 0) colliders.push({ x, z, r: collideR });
    return inst;
  }

  // ---- Fässer: Bootssteg + Fabrikhof + Markt ----
  place(barrelG, CFG.city.x - 9, CFG.city.z - 16, 0.4, 1, 0.45);
  place(barrelG, CFG.city.x - 8.2, CFG.city.z - 15, 2.1, 1, 0.45);
  place(barrelG, CFG.factory.x + 6.5, CFG.factory.z + 2, 1.2, 1, 0.45);
  place(barrelG, CFG.factory.x + 7.3, CFG.factory.z + 3.1, 2.8, 1, 0.45);
  place(barrelG, CFG.city.market.x + 3.4, CFG.city.market.z + 1.5, 0.9, 1, 0.45);

  // ---- Çayevi-Terrasse (vor dem Teehaus): Tische, Stühle, Teekanne ----
  {
    const tx = CFG.city.x + 12, tz = CFG.city.z - 1.2;   // vor dem Çayevi
    place(tableG, tx, tz, 0.3, 1, 0.55);
    place(chairG, tx - 1.1, tz + 0.3, 1.8, 1, 0.35);
    place(chairG, tx + 1.0, tz - 0.4, -1.4, 1, 0.35);
    const pot = potG.scene.clone(true);
    const th = terrain.heightAt(tx, tz);
    pot.position.set(tx, th + 0.74, tz);        // auf der Tischplatte
    pot.scale.setScalar(0.85);
    scene.add(pot);
    const t2x = tx - 3.2, t2z = tz + 1.4;
    place(tableG, t2x, t2z, -0.5, 1, 0.55);
    place(chairG, t2x + 1.1, t2z + 0.4, 2.6, 1, 0.35);
  }
  // Kanne auch an der Annahmestelle (Çay-Ritual!)
  {
    const px = CFG.hut.x + 2.2, pz = CFG.hut.z + 2.4;
    const pot = potG.scene.clone(true);
    pot.position.set(px, terrain.heightAt(px, pz), pz);
    scene.add(pot);
  }

  // ---- v10: Grafik-Paket — echte Modelle statt Kisten ----
  // Çay-/Simit-Wagen am Stadtplatz
  place(cartG, CFG.city.x - 6, CFG.city.z + 8, -0.7, 1, 1.1);
  // Bänke: Stadtplatz, Annahmestelle, Yayla
  place(benchG, CFG.city.x + 5, CFG.city.z + 9, 2.6, 1, 0.5);
  place(benchG, CFG.hut.x - 4, CFG.hut.z + 3, 0.9, 1, 0.5);
  place(benchG, CFG.yayla.x - 4, CFG.yayla.z - 3, -0.6, 1, 0.5);
  // Laternen: Haus, Hütte, Çayevi, Pansiyon
  for (const [lx, lz] of [
    [CFG.home.x + 3, CFG.home.z + 3], [CFG.hut.x + 4, CFG.hut.z + 1],
    [CFG.city.x + 10, CFG.city.z - 6], [CFG.pension.x - 4, CFG.pension.z + 3]
  ]) {
    place(lanternG, lx, lz, Math.random() * 3, 1, 0.25);
  }
  // Echter Holzsteg am Bootsanleger — aus dem Modul-Set nur den längsten
  // Laufsteg verwenden (das Set enthält mehrere überlappende Varianten)
  {
    const B = CFG.boat.dock;
    let best = null, bestSize = 0;
    const box = new THREE.Box3();
    for (const child of pierG.scene.children) {
      box.setFromObject(child);
      const size = box.max.distanceTo(box.min);
      if (size > bestSize && size < 60) { bestSize = size; best = child; }
    }
    if (best) {
      const inst = best.clone(true);
      inst.position.set(B.x, 0.35, B.z + 10);
      inst.rotation.y = Math.PI / 2;
      scene.add(inst);
      colliders.push({ x: B.x + 1.6, z: B.z + 10, r: 0.4 }, { x: B.x - 1.6, z: B.z + 10, r: 0.4 });
    }
  }
  // Gartenzwerg vor der Pansiyon (Quatsch muss sein)
  place(gnomeG, CFG.pension.x + 4.5, CFG.pension.z + 4.2, 2.4, 1, 0.2);
  // Käsekisten an der Mandıra
  place(cheeseG, CFG.farm.x + 16.5, CFG.farm.z + 6.5, 0.4, 1, 0.2);
  place(cheeseG, CFG.farm.x + 16.9, CFG.farm.z + 7.3, 1.9, 1, 0);

  // ---- v10b: Vegetation & Fels — Fotoscan-Sträucher, Findlinge, Moosfelsen ----
  const K = CFG.karsikoy, SEL = CFG.selale;
  for (const [sx, sz, r2, sc] of [
    [CFG.home.x - 6, CFG.home.z + 6, 1.2, 1], [CFG.hut.x + 8, CFG.hut.z - 4, 1.4, 1.2],
    [CFG.pension.x + 8, CFG.pension.z - 2, 1.2, 1], [CFG.city.x - 16, CFG.city.z + 14, 1.2, 1.1],
    [CFG.farm.x + 8, CFG.farm.z - 12, 1.2, 1], [K.x + 14, K.z + 8, 1.2, 1.1],
    [CFG.yayla.x - 8, CFG.yayla.z + 6, 1.2, 0.9], [12, -70, 0, 0.9]
  ]) {
    place(shrubG, sx, sz, Math.random() * 6, sc, r2);
  }
  for (const [bx, bz, sc] of [
    [-60, -40, 1.4], [70, -20, 1.8], [40, 40, 1.5], [-40, 30, 1.3],
    [K.x - 18, K.z - 14, 1.4], [96, -142, 1.1]
  ]) {
    place(boulderG, bx, bz, Math.random() * 6, sc, sc * 1.4);
  }
  for (const [mx, mz, sc] of [
    [SEL.x + 5, SEL.z + 5, 1.2], [SEL.x - 6, SEL.z + 3, 1], [SEL.x + 2, SEL.z + 8, 0.8],
    [CFG.boat.dock.x - 8, CFG.boat.dock.z + 16, 1], [-20, -120, 0.9]
  ]) {
    place(mossG, mx, mz, Math.random() * 6, sc, 0);
  }

  // ---- v10b: Laternen leuchten nachts (warmes Punktlicht) ----
  const lanternLights = [];
  for (const [lx, lz] of [
    [CFG.home.x + 3, CFG.home.z + 3], [CFG.hut.x + 4, CFG.hut.z + 1],
    [CFG.city.x + 10, CFG.city.z - 6], [CFG.pension.x - 4, CFG.pension.z + 3]
  ]) {
    const light = new THREE.PointLight(0xffd9a0, 0, 12, 1.8);
    light.position.set(lx, terrain.heightAt(lx, lz) + 1.3, lz);
    scene.add(light);
    lanternLights.push(light);
  }

  // ---- v10b: mehr Leben in Karşıköy & auf dem İstanbul-Kai ----
  place(benchG, K.x + 4, K.z + 6, 1.2, 1, 0.5);
  place(lanternG, K.x - 2, K.z + 4, 0.5, 1, 0.25);
  place(barrelG, K.market.x + 2.5, K.market.z + 1.5, 1.1, 1, 0.45);
  place(benchG, CFG.istanbul.spawn.x + 8, CFG.istanbul.zone.z0 + 6, Math.PI, 1, 0);
  place(lanternG, CFG.istanbul.gate.x + 3, CFG.istanbul.gate.z + 2, 1.4, 1, 0);
  place(barrelG, CFG.istanbul.bazaar.x + 8, CFG.istanbul.bazaar.z + 2, 0.7, 1, 0);

  // ---- Fußball am Stadtplatz: kickbar, mit Physik ----
  const ball = {
    mesh: footballG.scene,
    pos: new THREE.Vector3(CFG.city.x + 2, 0, CFG.city.z + 4),
    vel: new THREE.Vector3(),
    r: 0.155,
    spinAxis: new THREE.Vector3(1, 0, 0),
    kickCooldown: 0
  };
  ball.pos.y = terrain.heightAt(ball.pos.x, ball.pos.z) + ball.r;
  ball.mesh.position.copy(ball.pos);
  scene.add(ball.mesh);

  function kickBall(fromX, fromZ, power) {
    const dx = ball.pos.x - fromX, dz = ball.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1e-4;
    ball.vel.x += dx / d * power;
    ball.vel.z += dz / d * power;
    ball.vel.y += power * 0.35;
    ball.kickCooldown = 0.25;
  }

  return {
    colliders,
    ball,
    kickBall,

    update(dt, player, drivingSpeed, elevN = 1) {
      // Laternen dämmerungsgesteuert
      const dark = Math.max(0, 1 - elevN * 2.4);
      for (const l of lanternLights) l.intensity = dark * 14;
      // Spieler / Fahrzeug kickt den Ball beim Reinlaufen
      ball.kickCooldown -= dt;
      const pdx = ball.pos.x - player.pos.x, pdz = ball.pos.z - player.pos.z;
      const pd = Math.hypot(pdx, pdz);
      if (pd < (drivingSpeed > 0.5 ? 1.6 : 0.85) && ball.kickCooldown <= 0) {
        kickBall(player.pos.x, player.pos.z, 4.5 + Math.min(10, drivingSpeed * 0.8) + Math.random() * 1.5);
      }

      // Integration
      if (ball.vel.lengthSq() > 1e-6 || ball.pos.y > 0) {
        ball.vel.y -= 14 * dt;                               // Gravitation
        ball.pos.addScaledVector(ball.vel, dt);
        const ground = terrain.heightAt(ball.pos.x, ball.pos.z) + ball.r;
        if (ball.pos.y < ground) {
          ball.pos.y = ground;
          if (ball.vel.y < -0.6) ball.vel.y = -ball.vel.y * 0.48;   // Aufprall
          else ball.vel.y = 0;
          // Rollwiderstand
          ball.vel.x *= Math.pow(0.5, dt * 2.2);
          ball.vel.z *= Math.pow(0.5, dt * 2.2);
        } else {
          ball.vel.x *= Math.pow(0.85, dt);                  // Luftwiderstand
          ball.vel.z *= Math.pow(0.85, dt);
        }
        // Meer & Weltgrenze: Ball zurückholen
        if (terrain.heightAt(ball.pos.x, ball.pos.z) < 0.3
            || Math.abs(ball.pos.x) > CFG.worldSize * 0.47
            || Math.abs(ball.pos.z) > CFG.worldSize * 0.47) {
          ball.pos.set(CFG.city.x + 2, 0, CFG.city.z + 4);
          ball.pos.y = terrain.heightAt(ball.pos.x, ball.pos.z) + ball.r;
          ball.vel.set(0, 0, 0);
        }
        // Rollen sichtbar machen
        const sp = Math.hypot(ball.vel.x, ball.vel.z);
        if (sp > 0.05) {
          ball.spinAxis.set(ball.vel.z, 0, -ball.vel.x).normalize();
          ball.mesh.rotateOnWorldAxis(ball.spinAxis, sp * dt / ball.r);
        }
        ball.mesh.position.copy(ball.pos);
      }
    }
  };
}
