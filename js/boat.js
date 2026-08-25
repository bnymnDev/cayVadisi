// v5: Motorboot (fährt nur auf Wasser) + Angel-Minispiel
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save } from './state.js';
import { clamp, lerp } from './util.js';
import { t } from './i18n.js';

function buildBoatMesh() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2e5a7a, roughness: 0.55, metalness: 0.15 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 2.6, 4, 10), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.y = 0.5;
  hull.position.y = 0.28;
  g.add(hull);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.1, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.8 })
  );
  deck.position.y = 0.56;
  g.add(deck);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 16), hullMat);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(0.85, 1.8, 1);
  rim.position.y = 0.62;
  g.add(rim);
  // Steuerstand
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.4 }));
  console_.position.set(0, 0.9, 0.5);
  g.add(console_);
  // Außenborder
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.5 }));
  motor.position.set(0, 0.55, -1.7);
  g.add(motor);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createBoat(ctx, terrain, player, audio, ui) {
  const { scene, camera } = ctx;
  const B = CFG.boat;
  let mesh = null;
  let x = B.dock.x, z = B.dock.z, yaw = 2.4, v = 0;
  let driving = false;

  function syncOwned() {
    if (state.boat && !mesh) {
      mesh = buildBoatMesh();
      mesh.position.set(x, 0.1, z);
      mesh.rotation.y = yaw;
      scene.add(mesh);
    }
  }
  syncOwned();

  // ---- Angeln ----
  const fishing = {
    st: 'idle',    // idle | wait | bite | done
    timer: 0,
    biteWindow: 0
  };
  const bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xd0392b, roughness: 0.5, emissive: 0xd0392b, emissiveIntensity: 0 })
  );
  bobber.visible = false;
  scene.add(bobber);

  function waterAhead(px, pz) {
    return terrain.heightAt(px, pz) < 0.25;
  }

  function canFishHere() {
    if (!state.rod) return false;
    if (driving && Math.abs(v) < 1.5) return true;
    // an Land: nahe am Wasser stehen (Steg)
    if (!driving) {
      for (const [dx, dz] of [[0, -4], [-3, -2], [3, -2], [0, -6]]) {
        if (waterAhead(player.pos.x + dx, player.pos.z + dz)) return true;
      }
    }
    return false;
  }

  function startFishing() {
    if (fishing.st !== 'idle' || !canFishHere()) return false;
    const F = CFG.fishing;
    fishing.st = 'wait';
    fishing.timer = F.biteMin + Math.random() * (F.biteMax - F.biteMin);
    // Schwimmer vor Spieler/Boot ins Wasser werfen
    const yawNow = driving ? yaw : player.euler.y;
    const dist = driving ? 4 : 5.5;
    bobber.position.set(
      (driving ? x : player.pos.x) - Math.sin(yawNow) * dist,
      0.12,
      (driving ? z : player.pos.z) - Math.cos(yawNow) * dist
    );
    // Falls da kein Wasser ist: weiter raus
    if (!waterAhead(bobber.position.x, bobber.position.z)) {
      bobber.position.z -= 4;
    }
    bobber.visible = true;
    audio.plant();
    return true;
  }

  function reel() {
    // Klick während des Bisses = Fang
    if (fishing.st === 'bite') {
      const F = CFG.fishing;
      const r = Math.random();
      let acc = 0, caught = 'hamsi';
      for (const [id, f] of Object.entries(F.fish)) {
        acc += f.p;
        if (r <= acc) { caught = id; break; }
      }
      state.inventory[caught] = (state.inventory[caught] || 0) + 1;
      state.fishCaught += 1;
      ui.toast(t('fishCaught', CFG.fishing.fish[caught].icon + ' ' + t('prod_' + caught)), true);
      audio.cash();
      stopFishing();
      save();
      return true;
    }
    if (fishing.st === 'wait') { stopFishing(); return false; }   // eingeholt ohne Biss
    return false;
  }

  function stopFishing() {
    fishing.st = 'idle';
    bobber.visible = false;
  }

  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  // Ufer in der Nähe? (dann legt E an, statt zu angeln)
  function canExitHere() {
    for (let r = 3; r <= 10; r += 3) {
      for (let a = 0; a < Math.PI * 2; a += 0.6) {
        const h = terrain.heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r);
        if (h > 0.5 && h < 3) return true;
      }
    }
    return false;
  }

  const api = {
    get driving() { return driving; },
    get fishingState() { return fishing.st; },
    canExitHere,
    syncOwned,
    canFishHere,
    startFishing,
    reel,
    stopFishing,
    touchGas: 0,
    touchSteer: 0,

    nearDock(px, pz) {
      return state.boat && mesh && !driving && Math.hypot(px - x, pz - z) < 12;
    },

    enter() {
      if (!mesh) return false;
      driving = true;
      player.setEnabled(false);
      player.releaseLock();
      audio.engineStart();
      return true;
    },

    exit() {
      if (!driving) return;
      driving = false;
      v = 0;
      stopFishing();
      audio.engineStop();
      // an nächster Uferstelle absetzen (zur Not zurück zum Steg)
      let bestX = CFG.boat.dock.x, bestZ = CFG.boat.dock.z + 6, found = false;
      for (let r = 2; r <= 14 && !found; r += 2) {
        for (let a = 0; a < Math.PI * 2; a += 0.4) {
          const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
          const h = terrain.heightAt(px, pz);
          if (h > 0.5 && h < 3) { bestX = px; bestZ = pz; found = true; break; }
        }
      }
      player.teleport(bestX, bestZ);
      player.setEnabled(true);
    },

    speedKmh() { return Math.abs(v) * 3.6; },
    throttle01() { return clamp(Math.abs(v) / B.speed, 0, 1); },

    update(dt, elapsed) {
      if (mesh) {
        // Dümpeln
        mesh.position.y = 0.1 + Math.sin(elapsed * 1.3 + 1) * 0.05;
        mesh.rotation.z = Math.sin(elapsed * 0.9) * 0.03;
      }

      // Angel-Logik
      if (fishing.st === 'wait') {
        fishing.timer -= dt;
        bobber.position.y = 0.12 + Math.sin(elapsed * 2.2) * 0.03;
        if (fishing.timer <= 0) {
          fishing.st = 'bite';
          fishing.biteWindow = CFG.fishing.window;
          bobber.material.emissiveIntensity = 2;
          audio.pickDone();
          ui.toast(t('fishBite'), true, 1500);
        }
      } else if (fishing.st === 'bite') {
        fishing.biteWindow -= dt;
        bobber.position.y = 0.02 + Math.abs(Math.sin(elapsed * 14)) * 0.09;
        if (fishing.biteWindow <= 0) {
          bobber.material.emissiveIntensity = 0;
          ui.toast(t('fishLost'), false, 2200);
          stopFishing();
        }
      }

      if (!driving || !mesh) return;

      const keys = player.keys;
      let gas = 0, steer = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) gas += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) gas -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer += 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer -= 1;
      gas += api.touchGas;
      steer += -api.touchSteer;
      gas = clamp(gas, -1, 1); steer = clamp(steer, -1, 1);

      // Angeln unterbrechen, wenn Gas gegeben wird
      if (gas !== 0 && fishing.st !== 'idle') stopFishing();

      v += gas * B.accel * dt;
      v -= v * 0.55 * dt;
      v = clamp(v, -B.speed * 0.35, B.speed);
      yaw += steer * clamp(Math.abs(v) / 2.5, 0, 1) * 1.1 * dt * Math.sign(v || 1);

      const nx = x + Math.sin(yaw) * v * dt;
      const nz = z + Math.cos(yaw) * v * dt;
      // nur auf Wasser (Ufer bremst weich)
      if (waterAhead(nx, nz)) { x = nx; z = nz; }
      else v *= 0.4;
      const Bnd = CFG.worldSize * 0.47;
      x = clamp(x, -Bnd, Bnd);
      z = clamp(z, -Bnd, Bnd);

      mesh.position.x = x;
      mesh.position.z = z;
      mesh.rotation.y = yaw;
      mesh.rotation.x = -v * 0.012;      // Bug hebt sich

      player.pos.set(x, 1.4, z);
      audio.engineUpdate(api.throttle01() * 0.8, api.speedKmh());

      // Chase-Cam
      camTarget.set(x, 1.4, z);
      camPos.set(x - Math.sin(yaw) * 7.5, 3.4, z - Math.cos(yaw) * 7.5);
      camera.position.lerp(camPos, Math.min(1, dt * 5));
      camera.lookAt(camTarget);
    }
  };
  return api;
}
