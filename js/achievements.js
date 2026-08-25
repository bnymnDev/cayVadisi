// v5: Erfolge + Trophäenregal am Spielerhaus
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save, netWorth } from './state.js';
import { t } from './i18n.js';

// id -> {icon, check}
export const ACH_DEFS = {
  firstSell:   { icon: '🫖', check: () => state.totalEarned > 0 },
  kg100:       { icon: '🌱', check: () => state.totalKg >= 100 },
  kg500:       { icon: '🌿', check: () => state.totalKg >= 500 },
  firstWorker: { icon: '👷', check: () => state.workers >= 1 },
  farmFull:    { icon: '🐄', check: () => (state.animals.chicken >= 1 && state.animals.cow >= 1 && state.animals.sheep >= 1) },
  firstCar:    { icon: '🚗', check: () => Object.values(state.vehicles).some(Boolean) },
  luxCar:      { icon: '🏎️', check: () => state.vehicles.lux },
  allCities:   { icon: '⛴️', check: () => state.visited.zonguldak && state.visited.eregli && state.visited.devrek },
  factory:     { icon: '🏭', check: () => state.factory },
  export10:    { icon: '🌍', check: () => state.exportsDone >= 10 },
  gurbetci3:   { icon: '🇩🇪', check: () => state.gurbetci >= 3 },
  fisher:      { icon: '🎣', check: () => state.fishCaught >= 10 },
  kalkan:      { icon: '🐡', check: () => Math.floor(state.inventory.kalkan) >= 1 || state._kalkanEver },
  millionaer:  { icon: '💰', check: () => netWorth(CFG) >= 250000 },
  dedeTea:     { icon: '🏆', check: () => state.dedeBonus },
  kemalBeaten: { icon: '👑', check: () => state._shareNow >= CFG.rival.winShare }
};

export function createAchievements(ctx, terrain, ui, audio) {
  const { scene } = ctx;
  let checkTimer = 0;

  // ---- Trophäenregal neben dem Haus ----
  const shelf = new THREE.Group();
  const H = CFG.home;
  {
    const y = terrain.heightAt(H.x, H.z);
    shelf.position.set(H.x, y, H.z);
    shelf.rotation.y = H.ry;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x8a6d42, roughness: 0.8 })
    );
    board.position.set(-2.9, 1.0, 0.6);
    shelf.add(board);
    for (const s of [-1.15, 1.15]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 1.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x6a5232, roughness: 0.9 })
      );
      leg.position.set(-2.9 + s, 0.5, 0.6);
      shelf.add(leg);
    }
    shelf.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(shelf);
  }
  const trophies = [];
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd8a531, roughness: 0.25, metalness: 0.85 });
  function syncTrophies() {
    const n = Math.min(6, Math.floor(Object.keys(state.ach).length / 3));
    while (trophies.length < n) {
      const i = trophies.length;
      const cup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.14, 8), goldMat);
      body.position.y = 0.12;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1), goldMat);
      base.position.y = 0.025;
      cup.add(body, base);
      cup.position.set(-3.9 + i * 0.42, 1.05, 0.6);
      cup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      shelf.add(cup);
      trophies.push(cup);
    }
  }
  syncTrophies();
  // Goldener Samowar für die abgeschlossene Story
  const samovar = new THREE.Group();
  {
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), goldMat);
    pot.scale.y = 1.25;
    pot.position.y = 0.22;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.12, 8), goldMat);
    top.position.y = 0.46;
    samovar.add(pot, top);
    samovar.position.set(-1.7, 1.05, 0.6);
    samovar.visible = false;
    samovar.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    shelf.add(samovar);
  }

  return {
    count: () => Object.keys(state.ach).length,
    total: Object.keys(ACH_DEFS).length,

    update(dt) {
      checkTimer -= dt;
      if (checkTimer > 0) return;
      checkTimer = 3;
      if (Math.floor(state.inventory.kalkan) >= 1) state._kalkanEver = true;
      for (const [id, def] of Object.entries(ACH_DEFS)) {
        if (state.ach[id]) continue;
        let ok = false;
        try { ok = def.check(); } catch (e) { ok = false; }
        if (ok) {
          state.ach[id] = true;
          ui.toast('🏅 ' + t('achUnlocked', t('ach_' + id)), true, 6000);
          audio.orderDone();
          syncTrophies();
          save();
        }
      }
      samovar.visible = state.story >= 5;
    }
  };
}
