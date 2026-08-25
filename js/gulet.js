// v12: Segel-Gulet — Küstentour mit zahlenden Touristen (Autopilot-Rundfahrt)
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save, addRep } from './state.js';
import { t } from './i18n.js';
import { fmtMoney } from './util.js';

function buildGuletMesh() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.7 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 7, 4, 10), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.y = 0.55;
  hull.position.y = 0.6;
  g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 7.6),
    new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.8 }));
  deck.position.y = 1.15;
  g.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1, 2.6),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.6 }));
  cabin.position.set(0, 1.7, -1.4);
  g.add(cabin);
  // zwei Masten mit Segeln
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.9, side: THREE.DoubleSide });
  for (const [mz, mh, sw] of [[1.6, 7, 2.6], [-2.6, 5.5, 2]]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, mh, 8), hullMat);
    mast.position.set(0, mh / 2 + 1.1, mz);
    g.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(sw, mh * 0.62), sailMat);
    sail.position.set(sw / 2 + 0.1, mh * 0.55 + 1.1, mz);
    g.add(sail);
  }
  // Touristen an Deck
  for (let i = 0; i < 3; i++) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0xdcb695, roughness: 0.8 }));
    head.position.set((i % 2 ? 0.7 : -0.7), 1.75, 0.8 - i * 0.9);
    g.add(head);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createGulet(ctx, player, ui, audio) {
  const { scene, camera } = ctx;
  const G2 = CFG.gulet;
  let mesh = null;
  let x = G2.mooring.x, z = G2.mooring.z, yaw = 2.2;
  let touring = false;
  let seg = 0, u = 0;

  function syncOwned() {
    if (state.gulet && !mesh) {
      mesh = buildGuletMesh();
      mesh.position.set(x, 0.1, z);
      mesh.rotation.y = yaw;
      scene.add(mesh);
    }
  }
  syncOwned();

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  return {
    syncOwned,
    get touring() { return touring; },
    nearMooring(px, pz) {
      return state.gulet && mesh && !touring && Math.hypot(px - x, pz - z) < 10;
    },
    canTour() { return state.rep >= G2.minRep && !state._guletDone; },
    start() {
      if (!mesh || touring || !this.canTour()) return false;
      touring = true;
      seg = 0; u = 0;
      player.setEnabled(false);
      player.releaseLock();
      audio.gull && audio.gull();
      ui.toast(t('guletStart'), true, 7000);
      return true;
    },
    finish() {
      if (!touring) return;
      touring = false;
      state._guletDone = true;
      const pay = G2.pay + state.rep * G2.perRep;
      state.money += pay;
      state.dayEarned += pay;
      state.totalEarned += pay;
      state.guletTours += 1;
      addRep(1);
      audio.cash();
      ui.toast(t('guletDone', fmtMoney(pay, state.settings.lang)), true, 8000);
      ui.refreshMoney();
      player.teleport(x + 4, z + 8);
      player.setEnabled(true);
      save();
    },
    update(dt, elapsed) {
      if (!mesh) return;
      mesh.position.y = 0.1 + Math.sin(elapsed * 1.1) * 0.06;
      if (!touring) return;
      const a = seg === 0 ? G2.mooring : G2.route[seg - 1];
      const b = G2.route[seg];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      u += G2.speed * dt / len;
      if (u >= 1) {
        u = 0;
        seg += 1;
        if (seg >= G2.route.length) {
          x = G2.mooring.x; z = G2.mooring.z;
          mesh.position.x = x; mesh.position.z = z;
          this.finish();
          return;
        }
      }
      x = a.x + (b.x - a.x) * u;
      z = a.z + (b.z - a.z) * u;
      mesh.position.x = x;
      mesh.position.z = z;
      yaw = Math.atan2(b.x - a.x, b.z - a.z);
      mesh.rotation.y = yaw;
      player.pos.set(x, 2, z);
      // Panorama-Kamera seitlich hinter dem Schiff
      camTarget.set(x, 2.2, z);
      camPos.set(x - Math.sin(yaw) * 12 + Math.cos(yaw) * 5, 6, z - Math.cos(yaw) * 12 - Math.sin(yaw) * 5);
      camera.position.lerp(camPos, Math.min(1, dt * 3));
      camera.lookAt(camTarget);
    }
  };
}
