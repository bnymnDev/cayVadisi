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
  const [footballG, barrelG, tableG, chairG, potG] = await Promise.all([
    load('football'), load('Barrel_01'), load('WoodenTable_02'), load('WoodenChair_01'), load('brass_pot_01')
  ]);
  for (const g of [footballG, barrelG, tableG, chairG, potG]) {
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

    update(dt, player, drivingSpeed) {
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
