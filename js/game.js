// Spiellogik: Tageszyklus, Wetter, Pflücken, Wirtschaft, Interaktionen
// v2: Arbeiter, Bauernhof, Markt, Fahrzeuge, Stadt, Wohlstand
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save, basketCapacity, resetDay, netWorth } from './state.js';
import { t } from './i18n.js';
import { clamp, fmtMoney } from './util.js';

export function createGame(ctx, mods) {
  const { terrain, tea, props, player, audio, ui, particles, sky, farm, vehicles, workers } = mods;
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

  // Markt-Tagespreise (±Schwankung)
  function planMarket() {
    const swing = CFG.city.priceSwing;
    for (const id of Object.keys(CFG.products)) {
      state.marketMul[id] = 1 + (Math.random() * 2 - 1) * swing;
    }
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
    planMarket();
    newOrder();
    ui.refreshOrder();
    ui.hideOverlays();
    running = true;
    paused = false;
    player.setEnabled(true);
    if (!ctx.isTouch && !vehicles.driving) player.requestLock();
  }

  function endDay() {
    running = false;
    if (vehicles.driving) { vehicles.exit(); audio.engineStop(); }
    player.setEnabled(false);
    player.releaseLock();
    audio.sleep();

    // ---- Abend-Abrechnung ----
    const L = state.settings.lang;
    const lines = [];
    // Arbeiter-Ernte verkaufen
    if (state.workerKg > 0.01) {
      const sum = state.workerKg * CFG.eco.pricePerKg * CFG.workers.sellFactor;
      state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
      lines.push({ k: 'sumWorkerTea', v: '+' + fmtMoney(sum, L), sub: Math.round(state.workerKg * 10) / 10 + ' kg' });
    }
    // Löhne zahlen
    if (state.workers > 0) {
      const wages = state.workers * CFG.workers.wage;
      state.money -= wages; state.daySpent += wages;
      lines.push({ k: 'sumWages', v: '−' + fmtMoney(wages, L), sub: state.workers + ' 👷' });
    }
    // Silo: Lager automatisch verkaufen (Basispreis)
    if (state.upgrades.silo) {
      let sum = 0;
      for (const [id, n] of Object.entries(state.inventory)) {
        const cnt = Math.floor(n);
        if (cnt > 0) { sum += cnt * CFG.products[id].sell; state.inventory[id] -= cnt; }
      }
      if (sum > 0) {
        state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
        lines.push({ k: 'sumSilo', v: '+' + fmtMoney(sum, L) });
      }
    }
    checkWealth();
    ui.showDaySummary(lines);
    save();
  }

  function nextDay() {
    state.day += 1;

    // Felder wachsen einen Tag weiter (Bewässerung: ein Extra-Tag)
    for (const p of state.plots) {
      if (p && p.daysLeft > 0) p.daysLeft -= 1;
      if (p && state.upgrades.sprinkler && p.daysLeft > 0) p.daysLeft -= 1;
    }
    farm.refreshPlots();

    // Tiere produzieren über Nacht
    for (const [id, spec] of Object.entries(CFG.animals)) {
      const n = state.animals[id] || 0;
      if (n > 0) state.inventory[spec.product] += n * spec.perDay;
    }

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
    // Morgen-Info über Tierprodukte
    const prodCount = Object.values(state.inventory).reduce((a, b) => a + Math.floor(b), 0);
    if (prodCount > 0) ui.toast(t('morningProducts', prodCount), false, 4500);
  }

  // ---------- Wohlstand ----------
  function checkWealth() {
    const w = netWorth(CFG);
    const tiers = CFG.wealthTiers;
    let tier = 0;
    for (let i = 0; i < tiers.length; i++) if (w >= tiers[i]) tier = i;
    if (tier > state.wealthTier) {
      state.wealthTier = tier;
      ui.toast(t('tierUp', t('tierName' + tier)), true, 6000);
      audio.tierUp();
      ui.refreshWealth();
    }
  }

  // ---------- Pflücken ----------
  function beginPick() {
    if (pickTarget < 0) return;
    picking = true;
    pickProgress = 0;
  }

  function cargoMulNow() {
    return vehicles.cargoMul(player.pos.x, player.pos.z);
  }

  function finishPick() {
    const cap = basketCapacity(CFG, cargoMulNow());
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
    checkWealth();
    ui.refreshBasket();
    ui.refreshMoney();
    ui.refreshOrder();
    save();
    return sum;
  }

  function trySendGondola() {
    if (state.basketKg <= 0.01) { audio.deny(); return; }
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

  // ---------- Käufe ----------
  function buyUpgrade(id) {
    const u = CFG.upgrades[id];
    if (!u || state.upgrades[id] || state.money < u.cost) { audio.deny(); return false; }
    if (id === 'basket2' && !state.upgrades.basket1) { audio.deny(); return false; }
    state.money -= u.cost;
    state.daySpent += u.cost;
    state.upgrades[id] = true;
    audio.buy();
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function hireWorker() {
    if (state.workers >= CFG.workers.max || state.money < CFG.workers.hireCost) { audio.deny(); return false; }
    state.money -= CFG.workers.hireCost;
    state.daySpent += CFG.workers.hireCost;
    state.workers += 1;
    workers.sync();
    audio.buy();
    ui.refreshMoney();
    save();
    return true;
  }

  function fireWorker() {
    if (state.workers <= 0) { audio.deny(); return false; }
    state.workers -= 1;
    workers.sync();
    audio.deny();
    save();
    return true;
  }

  function buyAnimal(id) {
    const spec = CFG.animals[id];
    if (!spec || (state.animals[id] || 0) >= spec.max || state.money < spec.cost) { audio.deny(); return false; }
    state.money -= spec.cost;
    state.daySpent += spec.cost;
    state.animals[id] = (state.animals[id] || 0) + 1;
    farm.syncAnimals();
    audio.animal(id);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function plantCrop(type) {
    const spec = CFG.crops[type];
    if (!spec || state.money < spec.seed) { audio.deny(); return false; }
    const idx = state.plots.findIndex(p => !p);
    if (idx < 0) { ui.toast(t('noFreePlot'), false); audio.deny(); return false; }
    state.money -= spec.seed;
    state.daySpent += spec.seed;
    state.plots[idx] = { type, daysLeft: spec.days };
    farm.refreshPlots();
    audio.plant();
    ui.refreshMoney();
    save();
    return true;
  }

  function harvestPlot(idx) {
    const p = state.plots[idx];
    if (!p || p.daysLeft > 0) return false;
    const spec = CFG.crops[p.type];
    state.inventory[p.type] += spec.yield;
    state.plots[idx] = null;
    farm.refreshPlots();
    audio.harvest();
    ui.toast(t('harvested', spec.yield, t('crop_' + p.type)), true);
    save();
    return true;
  }

  function sellProduct(id, count) {
    const have = Math.floor(state.inventory[id] || 0);
    const n = Math.min(have, count);
    if (n <= 0) { audio.deny(); return 0; }
    const price = CFG.products[id].sell * (state.marketMul[id] || 1);
    const sum = n * price;
    state.inventory[id] -= n;
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    audio.cash();
    checkWealth();
    ui.refreshMoney();
    save();
    return sum;
  }

  function buyVehicle(id) {
    const spec = CFG.vehicles[id];
    if (!spec || state.vehicles[id] || state.money < spec.cost) { audio.deny(); return false; }
    state.money -= spec.cost;
    state.daySpent += spec.cost;
    state.vehicles[id] = true;
    vehicles.syncOwned();
    audio.cash();
    checkWealth();
    ui.refreshMoney();
    ui.toast(t('vehicleBought', t('veh_' + id)), true, 5000);
    save();
    return true;
  }

  // ---------- Eingaben ----------
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !running || paused || vehicles.driving) return;
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
    if (!running || paused || ui.overlayOpen() || vehicles.driving) return;
    if (e.target && e.target.closest && e.target.closest('.tc')) return;   // Touch-Controls ignorieren
    if (e.touches.length !== 1) return;
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

  function doInteract() {
    if (vehicles.driving) {
      vehicles.exit();
      audio.engineStop();
      if (!ctx.isTouch) player.requestLock();
      return;
    }
    const act = currentInteract();
    if (!act) return;
    if (act.id === 'sell') { player.releaseLock(); ui.showShop(); }
    else if (act.id === 'sleep') endDay();
    else if (act.id === 'cable') trySendGondola();
    else if (act.id === 'vehicle') {
      if (vehicles.enter(act.data)) audio.engineStart();
    }
    else if (act.id === 'farm') { player.releaseLock(); ui.showFarm(); }
    else if (act.id === 'market') { player.releaseLock(); ui.showMarket(); }
    else if (act.id === 'dealer') { player.releaseLock(); ui.showDealer(); }
    else if (act.id === 'harvest') harvestPlot(act.data);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && running && !paused && !ui.overlayOpen()) doInteract();
    if (e.code === 'Tab' && running && !paused) {
      e.preventDefault();
      if (ui.manageOpen()) { ui.hideOverlays(); pause(false); }
      else { player.releaseLock(); ui.showManage(); }
    }
    if (e.code === 'Escape' && running && !player.locked && !ui.overlayOpen() && !vehicles.driving) {
      // Esc außerhalb PointerLock → Pause
      pause(true);
    }
  });

  player.onLockChange = (locked) => {
    if (!locked && running && !ui.overlayOpen() && !vehicles.driving) pause(true);
  };

  function pause(v) {
    paused = v;
    if (v) { ui.showPause(); player.setEnabled(false); }
    else {
      ui.hideOverlays();
      if (!vehicles.driving) {
        player.setEnabled(true);
        if (!ctx.isTouch) player.requestLock();
      }
    }
  }

  function distTo(px, pz) {
    const dx = player.pos.x - px, dz = player.pos.z - pz;
    return Math.hypot(dx, dz);
  }

  function currentInteract() {
    if (vehicles.driving) return { id: 'exit' };
    if (distTo(CFG.hut.x, CFG.hut.z) < CFG.interactDist + 1.5) return { id: 'sell' };
    if (distTo(CFG.home.x, CFG.home.z) < CFG.interactDist && sky.hour >= 18) return { id: 'sleep' };
    if (state.upgrades.cable && distTo(CFG.cableTop.x, CFG.cableTop.z) < CFG.interactDist) return { id: 'cable' };
    const veh = vehicles.nearest(player.pos.x, player.pos.z);
    if (veh) return { id: 'vehicle', data: veh };
    const ready = farm.nearestReadyPlot(player.pos.x, player.pos.z);
    if (ready >= 0) return { id: 'harvest', data: ready };
    if (distTo(CFG.farm.sign.x, CFG.farm.sign.z) < CFG.interactDist + 1) return { id: 'farm' };
    if (distTo(CFG.city.market.x, CFG.city.market.z) < CFG.interactDist + 1.5) return { id: 'market' };
    if (distTo(CFG.city.dealer.x, CFG.city.dealer.z) < CFG.interactDist + 3.5) return { id: 'dealer' };
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

    // Fahren: kein Pflücken, aber Motor & Tacho
    if (vehicles.driving) {
      audio.engineUpdate(vehicles.throttle01(), vehicles.speedKmh());
      ui.setSpeed(vehicles.speedKmh());
      ui.setCrosshairActive(false);
      ui.setPickProgress(0);
      ui.setPrompt(t('prompt_exit'), () => doInteract());
      return;
    }
    ui.setSpeed(null);

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
    ui.setPrompt(act ? t('prompt_' + act.id, act.id === 'vehicle' ? t('veh_' + act.data) : undefined) : null,
      act ? () => doInteract() : null);

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

    // gelegentliche Tierlaute in Gehege-Nähe
    if (Math.random() < dt * 0.15) {
      const dFarm = distTo(CFG.farm.pen.x, CFG.farm.pen.z);
      if (dFarm < 30) {
        const kinds = Object.keys(CFG.animals).filter(k => (state.animals[k] || 0) > 0);
        if (kinds.length) audio.animal(kinds[Math.floor(Math.random() * kinds.length)]);
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
    hireWorker, fireWorker, buyAnimal, plantCrop, harvestPlot, sellProduct, buyVehicle,
    doInteract, checkWealth,
    update,
    get running() { return running; },
    get paused() { return paused; },
    cargoMulNow,
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
      if (state.day === 1) setTimeout(() => ui.toast(t('tutV2'), false, 8000), 10000);
    },
    debugRain(sec = 30) {
      showers = [{ start: state.timeSec, end: state.timeSec + sec }];
    }
  };
  return api;
}
