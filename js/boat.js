// v5: Motorboot (fährt nur auf Wasser) + Angel-Minispiel
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save } from './state.js';
import { clamp, lerp } from './util.js';
import { t } from './i18n.js';
import { addXp, rareFishPool } from './xp.js';

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
  // v7: Bootslaterne für Nachtfahrten
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x3c3c3e, roughness: 0.6 }));
  pole.position.set(0, 1.6, 0.5);
  g.add(pole);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffe6b0, emissive: 0xffc86a, emissiveIntensity: 0, roughness: 0.4
  });
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lanternMat);
  lantern.position.set(0, 2.1, 0.5);
  g.add(lantern);
  const lamp = new THREE.PointLight(0xffd9a0, 0, 16, 1.6);
  lamp.position.set(0, 2.2, 0.5);
  g.add(lamp);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.lanternMat = lanternMat;
  g.userData.lamp = lamp;
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
      // v7: nachts beißen die besseren Fische
      const probs = api.nightMode ? CFG.night.fish : null;
      const r = Math.random();
      let acc = 0, caught = 'hamsi';
      for (const [id, f] of Object.entries(F.fish)) {
        acc += probs ? probs[id] : f.p;
        if (r <= acc) { caught = id; break; }
      }
      // v16: Angel-Level schaltet seltene, teure Fische frei
      let rare = false;
      for (const [id, f] of rareFishPool()) {
        if (Math.random() < f.p) { caught = id; rare = true; break; }
      }
      state.inventory[caught] = (state.inventory[caught] || 0) + 1;
      state.fishCaught += 1;
      const icon = rare ? CFG.xp.rareFish[caught].icon : CFG.fishing.fish[caught].icon;
      ui.toast(t(rare ? 'rareCatch' : 'fishCaught', icon + ' ' + t('prod_' + caught)), true, rare ? 5000 : undefined);
      const up = addXp('fish', (CFG.xp.fishPer[caught] || 4) * (state._dishBuff === 'hamsitava' ? 2 : 1));   // v24: Kochbuff
      if (up) { ui.toast(t('levelUp', t('xp_fish'), up), true, 5000); audio.tierUp(); }
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

  // ---- v8: Delfin-Schule begleitet das Boot auf offener See ----
  const dolphins = [];
  {
    const gray = new THREE.MeshStandardMaterial({ color: 0x7a8a96, roughness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), gray);
      body.rotation.x = Math.PI / 2;
      d.add(body);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 5), gray);
      fin.position.set(0, 0.28, -0.1);
      d.add(fin);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 5), gray);
      tail.rotation.x = -Math.PI / 2;
      tail.position.set(0, 0, -0.75);
      d.add(tail);
      d.visible = false;
      scene.add(d);
      dolphins.push({ m: d, phase: i * 2.1, side: i === 0 ? -1 : 1, off: 3 + i * 1.4 });
    }
  }
  let dolphinTimer = 14;
  let dolphinShow = 0;

  // ---- v8: Hamsi-Schleppnetz ----
  const netState = { active: false, timer: 0 };

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
    get pos() { return { x, z }; },
    teleport(nx, nz) { x = nx; z = nz; },   // Debug/Tests
    nightMode: false,        // wird von game.update gesetzt
    get dolphinsVisible() { return dolphinShow > 0; },   // v12: Foto-Missionen

    // v8: Schleppnetz — nur in Fahrt und mit gekauftem Ağ
    get netting() { return netState.active; },
    canNet() {
      return state.net && driving && Math.abs(v) >= CFG.net.minSpeed
        && fishing.st === 'idle' && !netState.active && !canExitHere();
    },
    startNet() {
      if (!this.canNet()) return false;
      netState.active = true;
      netState.timer = CFG.net.trawlSec;
      audio.plant();
      ui.toast(t('netDown'), false, 3000);
      return true;
    },
    netSeasonWinter: false,   // von game gesetzt (Hamsi-Akını)
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
        // v7: Laterne nachts an
        const on = api.nightMode ? 1 : 0;
        mesh.userData.lanternMat.emissiveIntensity += (on * 2.4 - mesh.userData.lanternMat.emissiveIntensity) * Math.min(1, dt * 3);
        mesh.userData.lamp.intensity += (on * (driving ? 30 : 10) - mesh.userData.lamp.intensity) * Math.min(1, dt * 3);
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

      // v8: Delfine — tauchen gelegentlich neben dem fahrenden Boot auf
      if (driving && Math.abs(v) > 4 && terrain.heightAt(x, z) < -2) {
        dolphinTimer -= dt;
        if (dolphinTimer <= 0 && dolphinShow <= 0) {
          dolphinTimer = 22 + Math.random() * 25;
          dolphinShow = 11;
          ui.toast(t('dolphins'), true, 4000);
        }
      }
      if (dolphinShow > 0) {
        dolphinShow -= dt;
        for (const d of dolphins) {
          d.phase += dt * 2.6;
          const jump = Math.sin(d.phase);
          d.m.visible = dolphinShow > 0 && jump > -0.4;
          const lx = d.side * d.off;
          const lz = -1 - ((d.phase * 2) % 6);
          d.m.position.set(
            x + Math.cos(yaw) * lx + Math.sin(yaw) * lz,
            jump * 1.1 - 0.35,
            z - Math.sin(yaw) * lx + Math.cos(yaw) * lz
          );
          d.m.rotation.y = yaw;
          d.m.rotation.x = -Math.cos(d.phase) * 0.7;
        }
      } else {
        for (const d of dolphins) d.m.visible = false;
      }

      // v8: Schleppnetz einholen
      if (netState.active) {
        if (!driving || Math.abs(v) < 1.2) {
          netState.active = false;
          ui.toast(t('netLost'), false, 4000);
        } else {
          netState.timer -= dt;
          if (netState.timer <= 0) {
            netState.active = false;
            const N = CFG.net;
            let n = N.min + Math.floor(Math.random() * (N.max - N.min + 1));
            if (api.netSeasonWinter) n = Math.round(n * N.winterMul);
            state.inventory.hamsi = (state.inventory.hamsi || 0) + n;
            state.fishCaught += n;
            const upN = addXp('fish', n * (CFG.xp.fishPer.hamsi || 4) * (state._dishBuff === 'hamsitava' ? 2 : 1));   // v16/v24
            if (upN) { ui.toast(t('levelUp', t('xp_fish'), upN), true, 5000); audio.tierUp(); }
            audio.cash();
            ui.toast(t('netCatch', n) + (api.netSeasonWinter ? ' ' + t('netWinter') : ''), true, 6500);
            save();
          }
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
