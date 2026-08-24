// Spiellogik: Tageszyklus, Wetter, Pflücken, Wirtschaft, Interaktionen
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save, basketCapacity, resetDay } from './state.js';
import { t } from './i18n.js';
import { clamp, fmtMoney } from './util.js';

export function createGame(ctx, mods) {
  const { terrain, tea, props, player, audio, ui, particles, sky } = mods;
  const { camera } = ctx;

  let showers = [];          // {start, end}
  let warnShown = false;
  let picking = false;
  let pickProgress = 0;
  let pickTarget = -1;
  let mouseDown = false;
  let stepTimer = 0;
  let toastCooldown = 0;
  let firstPickDone = false;
  let tutBasketShown = false;
  let running = false;
  let paused = false;

  const v3 = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function planWeather() {
    showers = [];
    const R = CFG.rain;
    const n = R.minPerDay + Math.floor(Math.random() * (R.maxPerDay - R.minPerDay + 1));
    for (let i = 0; i < n; i++) {
      const start = CFG.dayLengthSec * (0.12 + Math.random() * 0.68);
      const dur = R.minDur + Math.random() * (R.maxDur - R.minDur);
      showers.push({ start, end: start + dur });
    }
    showers.sort((a, b) => a.start - b.start);
    warnShown = false;
  }

  function newOrder() {
    const base = 5 + state.day * 1.5;
    const gearBonus = (state.upgrades.shears ? 4 : 0) + (state.upgrades.basket1 ? 2 : 0) + (state.upgrades.basket2 ? 4 : 0);
    state.orderTarget = Math.round(base + gearBonus + Math.random() * 3);
    state.orderDelivered = 0;
    state.orderRewarded = false;
  }

  function startDay() {
    resetDay();
    planWeather();
    newOrder();
    ui.refreshOrder();
    ui.hideOverlays();
    running = true;
    paused = false;
    player.setEnabled(true);
    if (!ctx.isTouch) player.requestLock();
  }

  function endDay() {
    running = false;
    player.setEnabled(false);
    player.releaseLock();
    audio.sleep();
    ui.showDaySummary();
    save();
  }

  function nextDay() {
    state.day += 1;
    tea.newDay();
    if (!state.seasonOver && state.day > CFG.seasonDays) {
      state.seasonOver = true;
      save();
      ui.showSeason();
      return;
    }
    save();
    startDay();
    ui.toast(t('day') + ' ' + state.day, false);
  }

  // ---------- Pflücken ----------
  function beginPick() {
    if (pickTarget < 0) return;
    picking = true;
    pickProgress = 0;
  }

  function finishPick() {
    const cap = basketCapacity(CFG);
    if (state.basketKg >= cap) {
      ui.toast(t('basketFullShort'), true);
      audio.deny();
      picking = false;
      return;
    }
    const res = tea.pick(pickTarget, state.upgrades.shears);
    let quality = res.quality;
    if (state.raining) quality *= CFG.tea.rainPickQuality;
    const kg = Math.min(res.kg, cap - state.basketKg);
    state.basketKg += kg;
    state.basketValueKg += kg * quality;
    state.dayKg += kg;
    state.totalKg += kg;

    tea.targetPos(pickTarget, v3);
    particles.burst(v3, state.upgrades.shears ? 18 : 11, camera.position);
    audio.pickDone();
    ui.pickPopup(v3, kg, res.late);
    ui.refreshBasket();

    if (!firstPickDone) { firstPickDone = true; if (state.day === 1) ui.toast(t('tut2'), false, 6000); }
    if (!tutBasketShown && state.basketKg >= cap * 0.6) {
      tutBasketShown = true;
      if (state.day === 1) ui.toast(t('tut3'), false, 6000);
    }
    if (state.basketKg >= cap - 0.01) ui.toast(t('basketFull'), true);

    picking = false;
    pickProgress = 0;
  }

  // ---------- Verkauf ----------
  function sellValue() {
    return state.basketValueKg * CFG.eco.pricePerKg;
  }

  function doSell(silent = false) {
    if (state.basketKg <= 0.01) return 0;
    const sum = sellValue();
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    state.orderDelivered += state.basketKg;
    state.basketKg = 0;
    state.basketValueKg = 0;
    if (!state.orderRewarded && state.orderDelivered >= state.orderTarget) {
      state.orderRewarded = true;
      state.ordersDone += 1;
      const bonus = state.orderTarget * CFG.eco.pricePerKg * CFG.eco.orderFactor;
      state.money += bonus;
      state.dayEarned += bonus;
      state.totalEarned += bonus;
      ui.toast(t('orderDone') + ' +' + fmtMoney(bonus, state.settings.lang), true);
      audio.orderDone();
    }
    if (!silent) audio.sell();
    ui.refreshBasket();
    ui.refreshMoney();
    ui.refreshOrder();
    save();
    return sum;
  }

  function trySendGondola() {
    if (state.basketKg <= 0.01) { audio.deny(); return; }
    const kg = state.basketKg;
    const ok = props.sendGondola(() => {
      const sum = doSell(true);
      audio.sell();
      ui.toast(t('cableArrived', fmtMoney(sum, state.settings.lang)), true);
    });
    if (ok) {
      audio.gondola();
      ui.toast(t('cableSent'), false);
    }
  }

  // ---------- Upgrades ----------
  function buyUpgrade(id) {
    const u = CFG.upgrades[id];
    if (!u || state.upgrades[id] || state.money < u.cost) { audio.deny(); return false; }
    if (id === 'basket2' && !state.upgrades.basket1) { audio.deny(); return false; }
    state.money -= u.cost;
    state.upgrades[id] = true;
    audio.buy();
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- Eingaben ----------
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !running || paused) return;
    if (ui.overlayOpen()) return;
    if (!player.locked && !ctx.isTouch) { player.requestLock(); return; }
    mouseDown = true;
    if (pickTarget >= 0) beginPick();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) { mouseDown = false; picking = false; pickProgress = 0; }
  });

  // Touch: Finger halten = pflücken, Finger ziehen = umsehen (Abbruch)
  let touchStart = null;
  window.addEventListener('touchstart', (e) => {
    if (!running || paused || ui.overlayOpen() || e.touches.length !== 1) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    mouseDown = true;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!touchStart || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;
    if (dx * dx + dy * dy > 12 * 12) { mouseDown = false; picking = false; pickProgress = 0; }
  }, { passive: true });
  window.addEventListener('touchend', () => {
    touchStart = null; mouseDown = false; picking = false; pickProgress = 0;
  }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && running && !paused && !ui.overlayOpen()) {
      const act = currentInteract();
      if (act === 'sell') { player.releaseLock(); ui.showShop(); }
      else if (act === 'sleep') endDay();
      else if (act === 'cable') trySendGondola();
    }
    if (e.code === 'Escape' && running && !player.locked && !ui.overlayOpen()) {
      // Esc außerhalb PointerLock → Pause
      pause(true);
    }
  });

  player.onLockChange = (locked) => {
    if (!locked && running && !ui.overlayOpen()) pause(true);
  };

  function pause(v) {
    paused = v;
    if (v) { ui.showPause(); player.setEnabled(false); }
    else {
      ui.hideOverlays();
      player.setEnabled(true);
      if (!ctx.isTouch) player.requestLock();
    }
  }

  function distTo(px, pz) {
    const dx = player.pos.x - px, dz = player.pos.z - pz;
    return Math.hypot(dx, dz);
  }

  function currentInteract() {
    if (distTo(CFG.hut.x, CFG.hut.z) < CFG.interactDist + 1.5) return 'sell';
    if (distTo(CFG.home.x, CFG.home.z) < CFG.interactDist && sky.hour >= 18) return 'sleep';
    if (state.upgrades.cable && distTo(CFG.cableTop.x, CFG.cableTop.z) < CFG.interactDist) return 'cable';
    return null;
  }

  // ---------- Haupt-Update ----------
  function update(dt, elapsed) {
    if (!running || paused) return;

    // Zeit
    state.timeSec += dt;
    if (state.timeSec >= CFG.dayLengthSec) { endDay(); return; }

    // Wetter
    let rainingNow = false;
    let warnSoon = false;
    for (const s of showers) {
      if (state.timeSec >= s.start && state.timeSec < s.end) rainingNow = true;
      if (!rainingNow && state.timeSec > s.start - CFG.rain.warnSec && state.timeSec < s.start) warnSoon = true;
    }
    if (rainingNow && !state.raining) {
      ui.toast(t('rainStart'), false);
      audio.thunderish();
    }
    if (!rainingNow && state.raining) {
      state.wetTimer = CFG.tea.wetAfterRain;
      ui.toast(t('rainEnd'), true);
      if (state.day === 1) ui.toast(t('tut4'), false, 6000);
    }
    state.raining = rainingNow;
    ui.setRainWarn(warnSoon);
    if (state.wetTimer > 0) state.wetTimer -= dt;

    // Pflück-Ziel suchen
    camera.getWorldDirection(camDir);
    pickTarget = tea.findTarget(camera.position, camDir);
    ui.setCrosshairActive(pickTarget >= 0);

    if (picking && mouseDown && pickTarget >= 0) {
      const need = state.upgrades.shears ? CFG.tea.pickTimeShears : CFG.tea.pickTime;
      pickProgress += dt / need;
      if (Math.random() < dt * 9) audio.pickTick();
      if (pickProgress >= 1) finishPick();
    } else if (mouseDown && pickTarget >= 0 && !picking) {
      beginPick();
    } else {
      pickProgress = 0;
      picking = false;
    }
    ui.setPickProgress(picking ? clamp(pickProgress, 0, 1) : 0);

    // Interaktions-Prompt (klickbar für Touch)
    const act = currentInteract();
    ui.setPrompt(
      act ? t(act === 'sell' ? 'promptSell' : act === 'sleep' ? 'promptSleep' : 'promptCable') : null,
      act === 'sell' ? () => { player.releaseLock(); ui.showShop(); }
        : act === 'sleep' ? () => endDay()
        : act === 'cable' ? () => trySendGondola() : null
    );

    // Meldungs-Abklingzeit
    toastCooldown -= dt;
    if (player.hitWater && toastCooldown <= 0) { ui.toast(t('water'), false); toastCooldown = 8; }
    if (player.hitBoundary && toastCooldown <= 0) { ui.toast(t('boundary'), false); toastCooldown = 8; }
    player.hitWater = false;
    player.hitBoundary = false;

    // Schritte
    if (player.moving) {
      stepTimer -= dt;
      if (stepTimer <= 0) {
        stepTimer = player.running ? 0.3 : 0.44;
        audio.step(player.running);
      }
    }

    // Abends erinnern
    if (sky.hour >= 19.4 && !state._darkToast) {
      state._darkToast = true;
      ui.toast(t('tooDark'), false);
    }
  }

  const api = {
    startDay, nextDay, endDay, pause, buyUpgrade, doSell, sellValue,
    update,
    get running() { return running; },
    get paused() { return paused; },
    growSpeedFactor() {
      const wet = state.raining || state.wetTimer > 0;
      return (wet ? 1 / CFG.tea.wetBoost : 1) * (state.upgrades.fert ? 1 / 0.7 : 1);
    },
    windStrength() {
      let w = 0.45 + sky.rainT * 0.9;
      for (const s of showers) {
        if (state.timeSec > s.start - CFG.rain.warnSec && state.timeSec < s.start) w = 1.4;
      }
      return w;
    },
    tutorialStart() {
      if (state.day === 1) setTimeout(() => ui.toast(t('tut1'), false, 7000), 1600);
    },
    debugRain(sec = 30) {
      showers = [{ start: state.timeSec, end: state.timeSec + sec }];
    }
  };
  return api;
}
