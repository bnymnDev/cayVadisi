// v8: Wildtiere — der Bär streift nachts durchs Teefeld (der Kangal verjagt ihn)
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';
import { t } from './i18n.js';

function buildBearMesh() {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x4a382a, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.0, 4, 8), fur);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), fur);
  head.position.set(0, 1.35, 0.95);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.16, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x2c211a, roughness: 0.9 }));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 1.24, 1.3);
  g.add(snout);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), fur);
    ear.position.set(s * 0.24, 1.68, 0.85);
    g.add(ear);
  }
  const legs = [];
  for (const [x, z] of [[-0.3, 0.55], [0.3, 0.55], [-0.3, -0.55], [0.3, -0.55]]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 3, 6), fur);
    leg.position.set(x, 0.42, z);
    g.add(leg);
    legs.push(leg);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, legs };
}

export function createWildlife(ctx, terrain, player, ui, audio) {
  const { scene } = ctx;
  const B = CFG.bear;
  const bear = buildBearMesh();
  bear.group.visible = false;
  scene.add(bear.group);

  let active = false;
  let rolled = false;        // heute Nacht schon gewürfelt?
  let attacked = false;
  let fleeing = 0;
  let x = 0, z = 0, yaw = 0, phase = 0;

  return {
    get active() { return active; },
    debugSpawn(px, pz) {
      active = true; rolled = true; attacked = false; fleeing = 0;
      x = px; z = pz;
      bear.group.visible = true;
    },
    update(dt, elapsed, hour) {
      // Tagsüber: alles zurücksetzen
      if (hour < B.hourFrom) {
        if (active) { active = false; bear.group.visible = false; }
        rolled = false;
        return;
      }
      // Beim Einbruch der Bärenstunde einmalig würfeln
      if (!rolled) {
        rolled = true;
        attacked = false;
        fleeing = 0;
        if (Math.random() < B.chance) {
          active = true;
          // taucht am Feldrand auf
          const side = Math.random() < 0.5 ? -1 : 1;
          x = side * (40 + Math.random() * 15);
          z = -50 + Math.random() * 30;
          bear.group.visible = true;
          setTimeout(() => ui.toast(t('bearNear'), false, 6000), 800);
          audio.thunderish();
        }
      }
      if (!active) return;

      const dx = player.pos.x - x, dz = player.pos.z - z;
      const d = Math.hypot(dx, dz);
      let sp = 0;
      if (fleeing > 0) {
        fleeing -= dt;
        sp = -B.speed * 1.8;                    // rückwärts = weg vom Spieler
        if (fleeing <= 0) { active = false; bear.group.visible = false; }
      } else if (d < 40 && d > 0.5) {
        sp = B.speed;                           // schnüffelt sich ran
      }
      if (sp !== 0 && d > 0.5) {
        x += dx / d * sp * dt;
        z += dz / d * sp * dt;
        yaw = Math.atan2(dx * Math.sign(sp), dz * Math.sign(sp));
        phase += Math.abs(sp) * dt * 2.4;
      }
      bear.group.position.set(x, terrain.heightAt(x, z), z);
      bear.group.rotation.y = yaw;
      bear.legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(phase + (i % 2 ? Math.PI : 0)) * 0.5;
      });

      // Begegnung
      if (fleeing <= 0 && !attacked && d < 6) {
        attacked = true;
        if (state.dog) {
          fleeing = 3.5;
          ui.toast(t('bearDog'), true, 7000);
          audio.bark && audio.bark();
        } else {
          const loss = state.basketKg * B.basketLoss;
          state.basketKg -= loss;
          state.basketValueKg = Math.max(0, state.basketValueKg - loss);
          fleeing = 3.5;
          ui.toast(t('bearAttack'), false, 7000);
          ui.refreshBasket();
          audio.thunderish();
        }
      }
    }
  };
}
