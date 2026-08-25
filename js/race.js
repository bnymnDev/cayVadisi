// v8: Kayık-Rennen — Bojen-Zeitrennen auf dem Schwarzen Meer gegen Temels Bestzeit
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save, addRep } from './state.js';
import { t } from './i18n.js';
import { fmtMoney } from './util.js';

export function createRace(ctx, ui, audio) {
  const { scene } = ctx;
  const R = CFG.race;

  function buoy(color) {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 10, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0 })
    );
    ball.position.y = 0.4;
    g.add(ball);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0xdadfe2, roughness: 0.6 }));
    pole.position.y = 1.2;
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
    flag.position.set(0.35, 1.8, 0);
    g.add(flag);
    g.userData.ballMat = ball.material;
    return g;
  }

  const start = buoy(0xe3c24f);
  start.position.set(R.start.x, 0.1, R.start.z);
  scene.add(start);
  const gates = R.buoys.map((b) => {
    const m = buoy(0xd0392b);
    m.position.set(b.x, 0.1, b.z);
    scene.add(m);
    return m;
  });

  let active = false;
  let next = 0;
  let time = 0;

  function stop() {
    active = false;
    for (const m of gates) m.userData.ballMat.emissiveIntensity = 0;
    start.userData.ballMat.emissiveIntensity = 0;
  }

  return {
    get active() { return active; },
    nearStart(px, pz) {
      return !active && Math.hypot(px - R.start.x, pz - R.start.z) < R.radius + 3;
    },
    start() {
      active = true;
      next = 0;
      time = 0;
      audio.orderDone();
      ui.toast(t('raceStart', R.targetSec), true, 6000);
      return true;
    },
    cancel: stop,
    update(dt, elapsed, boatPos, boatDriving) {
      // Bojen dümpeln
      const bobAll = (m, off) => { m.position.y = 0.1 + Math.sin(elapsed * 1.2 + off) * 0.12; };
      bobAll(start, 0);
      gates.forEach((m, i) => bobAll(m, i));
      if (!active) return;
      if (!boatDriving) { stop(); ui.toast(t('raceAbort'), false); return; }
      time += dt;
      // aktuelles Tor pulsiert
      gates.forEach((m, i) => {
        m.userData.ballMat.emissiveIntensity = i === next ? 1.5 + Math.sin(elapsed * 7) : 0;
      });
      const g = R.buoys[next];
      if (Math.hypot(boatPos.x - g.x, boatPos.z - g.z) < R.radius) {
        next += 1;
        audio.pickDone();
        if (next >= R.buoys.length) {
          const secs = Math.round(time * 10) / 10;
          const won = time <= R.targetSec;
          if (!state.raceBest || secs < state.raceBest) state.raceBest = secs;
          if (won) {
            state.money += R.prize;
            state.dayEarned += R.prize;
            state.totalEarned += R.prize;
            addRep(R.rep);
            audio.tierUp();
            ui.toast(t('raceWon', secs, fmtMoney(R.prize, state.settings.lang)), true, 8000);
          } else {
            audio.deny();
            ui.toast(t('raceLost', secs, R.targetSec), false, 7000);
          }
          ui.refreshMoney();
          save();
          stop();
        } else {
          ui.toast(t('raceGate', next, R.buoys.length), true, 2000);
        }
      }
    }
  };
}
