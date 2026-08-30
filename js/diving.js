// v22: Tauchen — von der Tauchboje am Ada-Strand hinab zum versunkenen
// Kayık. Eigene Unterwasser-Steuerung (WASD + Leertaste/Shift), dichter
// türkiser Nebel, Fischschwärme, Seegras, fünf Amphoren zum Bergen und
// eine Luft-Anzeige. Auftauchen beendet den Gang.
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

export function createDiving(ctx, terrain) {
  const { scene, camera } = ctx;
  const D = CFG.diving;
  let active = false;
  let yaw = 0, air = 0;
  const pos = new THREE.Vector3();
  const keys = {};
  let fogBackup = null;

  // ---- Unterwasser-Deko am Wrack (immer da, unter der Wasserlinie) ----
  const g = new THREE.Group();
  const seabed = D.depth - 1.2;
  // Wrack: gekentertes Boot
  const wreck = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 4.2, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.95 }));
  hull.rotation.z = Math.PI / 2;
  hull.rotation.x = 0.6;
  hull.position.set(0, 0.7, 0);
  wreck.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3428, roughness: 1 }));
  mast.rotation.z = 1.1;
  mast.position.set(1.6, 1.1, 0.4);
  wreck.add(mast);
  wreck.position.set(D.wreck.x, seabed, D.wreck.z);
  g.add(wreck);
  // Seegras
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2e5c3a, roughness: 0.9, side: THREE.DoubleSide });
  const grassBlades = [];
  for (let i = 0; i < 26; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2 + Math.random(), 4), grassMat);
    blade.position.set(D.wreck.x + (Math.random() - 0.5) * 22, seabed + 0.6, D.wreck.z + (Math.random() - 0.5) * 22);
    g.add(blade);
    grassBlades.push({ mesh: blade, phase: Math.random() * 6 });
  }
  // Felsen
  for (let i = 0; i < 6; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.7, 0),
      new THREE.MeshStandardMaterial({ color: 0x5a6058, roughness: 1 }));
    rock.position.set(D.wreck.x + (Math.random() - 0.5) * 18, seabed + 0.3, D.wreck.z + (Math.random() - 0.5) * 18);
    g.add(rock);
  }
  // Amphoren (nur die noch nicht geborgenen)
  const amphoras = [];
  const ampMat = new THREE.MeshStandardMaterial({ color: 0xa8703a, roughness: 0.85 });
  for (let i = 0; i < D.amphoras; i++) {
    const amp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.6, 8), ampMat);
    body.position.y = 0.3;
    amp.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 8), ampMat);
    neck.position.y = 0.68;
    amp.add(neck);
    const a = (i / D.amphoras) * Math.PI * 2;
    amp.position.set(D.wreck.x + Math.cos(a) * (3.5 + i), seabed, D.wreck.z + Math.sin(a) * (3.5 + i));
    amp.rotation.z = (Math.random() - 0.5) * 0.9;
    g.add(amp);
    amphoras.push(amp);
  }
  // Fischschwärme: 2 Gruppen kleiner Kegel, die kreisen
  const fish = [];
  const fishMat = new THREE.MeshBasicMaterial({ color: 0x9ab8c8 });
  for (let s2 = 0; s2 < 2; s2++) {
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), fishMat);
      f.rotation.x = Math.PI / 2;
      g.add(f);
      fish.push({ mesh: f, school: s2, phase: (i / 14) * Math.PI * 2, r: 2 + Math.random() * 2.5, h: D.depth + 1 + Math.random() * 2 });
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  g.visible = false;   // erst beim Tauchen zeigen (spart Draw-Calls an Land)
  scene.add(g);

  function syncAmphoras() {
    for (let i = 0; i < amphoras.length; i++) amphoras[i].visible = i >= state.amphoras;
  }

  const api = {
    get active() { return active; },
    nearEntry(px, pz) {
      return state.mask && Math.hypot(px - D.entry.x, pz - D.entry.z) < CFG.interactDist + 2.5;
    },
    entrySpot: D.entry,
    start(player, ui, audio, t) {
      active = true;
      air = D.airSec;
      yaw = Math.atan2(D.wreck.x - D.entry.x, D.wreck.z - D.entry.z);
      pos.set(D.entry.x, D.depth + 2, D.entry.z - 4);
      player.setEnabled(false);
      player.releaseLock();
      syncAmphoras();
      g.visible = true;
      fogBackup = { color: scene.fog.color.getHex(), density: scene.fog.density };
      audio.plant();
      ui.toast(t('diveStart'), true, 7000);
      this._deps = { player, ui, audio, t };
    },
    end() {
      if (!active) return;
      active = false;
      g.visible = false;
      const { player, ui, t } = this._deps;
      if (fogBackup) { scene.fog.color.setHex(fogBackup.color); scene.fog.density = fogBackup.density; }
      player.teleport(D.entry.x, D.entry.z);
      player.setEnabled(true);
      if (!ctx.isTouch) player.requestLock();
      ui.toast(t('diveEnd', state.amphoras, CFG.diving.amphoras), false, 6000);
    },
    keyDown(code) { keys[code] = true; },
    keyUp(code) { keys[code] = false; },
    // E unter Wasser: Amphore bergen (game kassiert)
    tryCollect(onFound) {
      for (let i = state.amphoras; i < amphoras.length; i++) {
        const a = amphoras[i].position;
        if (Math.hypot(pos.x - a.x, pos.z - a.z) < 2.4 && Math.abs(pos.y - a.y) < 2.5) {
          onFound();
          syncAmphoras();
          return true;
        }
      }
      return false;
    },
    update(dt, elapsed) {
      // Deko-Leben läuft nur, wenn sichtbar
      if (g.visible) {
        for (const b of grassBlades) b.mesh.rotation.z = Math.sin(elapsed * 1.4 + b.phase) * 0.16;
        for (const f of fish) {
          f.phase += dt * (0.9 + f.school * 0.3);
          const cx = D.wreck.x + (f.school ? 6 : -5);
          const cz = D.wreck.z + (f.school ? -4 : 5);
          f.mesh.position.set(cx + Math.cos(f.phase) * f.r, f.h + Math.sin(elapsed + f.phase) * 0.2, cz + Math.sin(f.phase) * f.r);
          f.mesh.rotation.y = -f.phase;
        }
      }
      if (!active) return null;
      // Steuerung: W/S vor/zurück, A/D drehen, Leertaste hoch, Shift runter
      if (keys.KeyA || keys.ArrowLeft) yaw += dt * 1.8;
      if (keys.KeyD || keys.ArrowRight) yaw -= dt * 1.8;
      const sp = 4.2 * dt;
      if (keys.KeyW || keys.ArrowUp) { pos.x -= Math.sin(yaw) * -sp; pos.z -= Math.cos(yaw) * -sp; }
      if (keys.KeyS || keys.ArrowDown) { pos.x += Math.sin(yaw) * -sp; pos.z += Math.cos(yaw) * -sp; }
      if (keys.Space) pos.y += dt * 2.2;
      if (keys.ShiftLeft || keys.ShiftRight) pos.y -= dt * 2.2;
      pos.y = Math.max(seabed + 0.8, Math.min(-0.3, pos.y));
      // im Umkreis des Wracks bleiben
      pos.x = Math.max(D.wreck.x - 26, Math.min(D.wreck.x + 26, pos.x));
      pos.z = Math.max(D.wreck.z - 26, Math.min(D.wreck.z + 26, pos.z));
      // Kamera + Unterwasser-Nebel
      camera.position.copy(pos);
      camera.position.y += Math.sin(elapsed * 1.7) * 0.06;   // sanftes Schweben
      camera.lookAt(pos.x + Math.sin(yaw), pos.y + Math.sin(elapsed * 1.7) * 0.06 - 0.08, pos.z + Math.cos(yaw));
      scene.fog.color.setHex(0x14424a);
      scene.fog.density = 0.055;
      // Luft
      air -= dt;
      api.lastAir = Math.max(0, Math.ceil(air));
      if (air <= 0 || pos.y > -0.5) { this.end(); return { surfaced: true }; }
      return { air: Math.ceil(air) };
    }
  };
  syncAmphoras();
  return api;
}
