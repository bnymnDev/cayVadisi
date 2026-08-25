// Spiellogik: Tageszyklus, Wetter, Pflücken, Wirtschaft, Interaktionen
// v2: Arbeiter, Bauernhof, Markt, Fahrzeuge, Stadt, Wohlstand
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save, basketCapacity, resetDay, netWorth, seasonOf } from './state.js';
import { t } from './i18n.js';
import { clamp, fmtMoney } from './util.js';

export function createGame(ctx, mods) {
  const { terrain, tea, props, player, audio, ui, particles, sky, farm, vehicles, workers, extras, events, boat, radio, yayla } = mods;
  const { camera } = ctx;

  let showers = [];          // {start, end, storm?}
  let warnShown = false;
  let fogMorning = false;
  let stormDone = false;
  let rainbowTimer = 0;
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

  const season = () => seasonOf(state.day, CFG);

  function planWeather() {
    showers = [];
    const R = CFG.rain;
    const S = CFG.seasonCycle;
    const mul = S.rainMul[season()];
    const n = Math.round((R.minPerDay + Math.floor(Math.random() * (R.maxPerDay - R.minPerDay + 1))) * mul);
    for (let i = 0; i < n; i++) {
      const start = CFG.dayLengthSec * (0.12 + Math.random() * 0.68);
      const dur = R.minDur + Math.random() * (R.maxDur - R.minDur);
      showers.push({ start, end: start + dur });
    }
    // Fırtına: ein Schauer wird zum Sturm (nicht im Winter — da schneit es ohnehin)
    stormDone = false;
    if (showers.length && season() !== 2 && Math.random() < CFG.weather.stormChance) {
      const s = showers[Math.floor(Math.random() * showers.length)];
      s.storm = true;
      s.end = s.start + (s.end - s.start) * 1.5;
    }
    fogMorning = Math.random() < CFG.weather.fogChance;
    showers.sort((a, b) => a.start - b.start);
    warnShown = false;
  }

  function stormActive() {
    for (const s of showers) {
      if (s.storm && state.timeSec >= s.start && state.timeSec < s.end) return true;
    }
    return false;
  }

  // Markt-Tagespreise (±Schwankung) + Kemal Ağas Preisdumping
  function planMarket() {
    const swing = CFG.city.priceSwing;
    for (const id of Object.keys(CFG.products)) {
      state.marketMul[id] = 1 + (Math.random() * 2 - 1) * swing;
    }
    state.rivalDump = state.factory && Math.random() < CFG.rival.dumpChance;
    if (state.rivalDump) {
      state.marketMul.tea_pack *= CFG.rival.dumpMul;
      setTimeout(() => ui.toast(t('rivalDump'), false, 7000), 2500);
    }
    // Festivaltag: alle Preise rauf
    if (isFestival()) {
      for (const id of Object.keys(CFG.products)) state.marketMul[id] *= CFG.festival.priceBonus;
      setTimeout(() => ui.toast(t('festivalToday'), true, 8000), 1200);
    }
  }

  // v6: Festival am letzten Tag jeder Jahreszeit
  function isFestival() {
    return state.day % CFG.seasonDays === 0;
  }

  // v5: Marktanteil deines Labels vs. Kemal Ağa
  function playerShare() {
    return Math.min(95, Math.max(5, Math.round(5 + state.packsSold * 0.4 + state.exportsDone * 3)));
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
    initStocks();
    if (!state.exportOffers.length) regenExports();
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
    if (boat.driving) boat.exit();
    player.setEnabled(false);
    player.releaseLock();
    audio.sleep();

    // ---- Abend-Abrechnung ----
    const L = state.settings.lang;
    const lines = [];
    // Arbeiter-Ernte: mit Fabrik zu Marken-Paketen verarbeiten, sonst roh verkaufen
    if (state.workerKg > 0.01) {
      if (state.factory) {
        const style = CFG.teaStyles[state.teaStyle] || CFG.teaStyles.siyah;
        const packs = Math.floor(state.workerKg / style.kgPerPack);
        const rest = state.workerKg - packs * style.kgPerPack;
        state.inventory[style.product] += packs;
        state.packedToday = packs;
        // Energie: Kohle aus Zonguldak oder Stromrechnung
        if (packs > 0) {
          if (Math.floor(state.inventory.coal) >= CFG.factory.energyCoal) {
            state.inventory.coal -= CFG.factory.energyCoal;
            lines.push({ k: 'sumFactory', v: '+' + packs + ' 📦', sub: '🪨 −' + CFG.factory.energyCoal });
          } else {
            state.money -= CFG.factory.energyCost;
            state.daySpent += CFG.factory.energyCost;
            lines.push({ k: 'sumFactory', v: '+' + packs + ' 📦', sub: '⚡ −' + fmtMoney(CFG.factory.energyCost, L) });
          }
        }
        if (rest > 0.01) {
          const sum = rest * CFG.eco.pricePerKg * (state.sofor ? 1 : CFG.workers.sellFactor);
          state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
        }
      } else {
        // Şoför liefert frisch: voller Preis statt 90 %
        const sellF = state.sofor ? 1 : CFG.workers.sellFactor;
        const sum = state.workerKg * CFG.eco.pricePerKg * sellF * famBonus();
        state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
        lines.push({ k: 'sumWorkerTea', v: '+' + fmtMoney(sum, L), sub: Math.round(state.workerKg * 10) / 10 + ' kg' + (state.sofor ? ' 🚚' : '') });
      }
    }
    // v6: Festival-Erntewettbewerb gegen Kemal Ağa
    if (isFestival()) {
      const mine = state.dayKg + state.workerKg;
      const kemal = CFG.festival.contestBase + state.day * 0.5;
      if (mine > kemal) {
        state.money += CFG.festival.prize;
        state.dayEarned += CFG.festival.prize;
        state.totalEarned += CFG.festival.prize;
        lines.push({ k: 'sumFestivalWin', v: '+' + fmtMoney(CFG.festival.prize, L), sub: Math.round(mine) + ' kg' });
      } else {
        lines.push({ k: 'sumFestivalLose', v: Math.round(mine) + ' / ' + Math.round(kemal) + ' kg' });
      }
    }
    // v6: Bank — Zinsen & Versicherung
    if (state.debt > 0) {
      const interest = Math.round(state.debt * CFG.bank.dailyInterest);
      state.debt += interest;
      lines.push({ k: 'sumInterest', v: '−' + fmtMoney(interest, L), sub: t('debtNow', fmtMoney(state.debt, L)) });
    }
    if (state.insured) {
      state.money -= CFG.bank.insurancePerDay;
      state.daySpent += CFG.bank.insurancePerDay;
      lines.push({ k: 'sumInsurance', v: '−' + fmtMoney(CFG.bank.insurancePerDay, L) });
    }
    // v6: Arbeitstage zählen (Level-System), außer im Winter
    if (!CFG.seasonCycle.workersRest[season()]) {
      for (const wd of state.workerData) wd.days = (wd.days || 0) + 1;
    }
    // v4: Jandarma-Gehalt & Sat-Werbung
    if (state.role === 'jandarma') {
      const sal = CFG.roles.jandarma.salary;
      state.money += sal; state.dayEarned += sal; state.totalEarned += sal;
      lines.push({ k: 'sumSalary', v: '+' + fmtMoney(sal, L) });
    }
    if (state.homeLevel >= 3) {
      state.money += CFG.homeAdBonus; state.dayEarned += CFG.homeAdBonus; state.totalEarned += CFG.homeAdBonus;
      lines.push({ k: 'sumAd', v: '+' + fmtMoney(CFG.homeAdBonus, L) });
    }
    // Mieteinnahmen
    {
      let rent = 0;
      for (const [id, p] of Object.entries(CFG.life.properties)) {
        if (state.properties[id]) rent += p.rent;
      }
      if (rent > 0) {
        state.money += rent; state.dayEarned += rent; state.totalEarned += rent;
        lines.push({ k: 'sumRent', v: '+' + fmtMoney(rent, L) });
      }
    }
    // Löhne zahlen (Winterpause: kein Lohn, keine Arbeit)
    if (state.workers > 0 && !CFG.seasonCycle.workersRest[season()]) {
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
    const prevSeason = season();
    state.day += 1;
    if (season() !== prevSeason) {
      ui.toast(t('seasonChange', t('season_' + CFG.seasonCycle.names[season()])), true, 8000);
      if (season() === 2) ui.toast(t('winterInfo'), false, 8000);
    }

    // Felder wachsen einen Tag weiter (Bewässerung: ein Extra-Tag; Winter: Frost)
    if (CFG.seasonCycle.cropGrowth[season()] > 0) {
      for (const p of state.plots) {
        if (p && p.daysLeft > 0) p.daysLeft -= 1;
        if (p && state.upgrades.sprinkler && p.daysLeft > 0) p.daysLeft -= 1;
      }
    }
    farm.refreshPlots();

    // Tiere produzieren über Nacht (v6: Sommer-Milchbonus dank Yayla-Weide)
    for (const [id, spec] of Object.entries(CFG.animals)) {
      const n = state.animals[id] || 0;
      if (n > 0) state.inventory[spec.product] += n * spec.perDay;
    }
    if (season() === 0 && (state.animals.cow || 0) > 0) {
      state.inventory.milk += state.animals.cow * CFG.yayla.milkBonusSummer;
    }
    // v6: Honig von der Yayla (Frühling & Sommer)
    if (state.hives > 0 && CFG.yayla.honeySeasons.includes(season())) {
      state.inventory.honey += state.hives;
    }

    // v3: Aktienkurse, neue Export-Angebote, Fahndungsdruck kühlt ab
    updateStocks();
    regenExports();
    if (state.blackHeat > 0) state.blackHeat = Math.max(0, state.blackHeat - 1);

    // v4: Schlaf erholt, Ereignisse neu planen
    if (state.survival) {
      state.energy = 100;
      state.hunger = Math.max(0, state.hunger - 8);
      state._starveToast = false;
    }
    if (events) events.newDay();

    tea.newDay(CFG.seasonCycle.teaGrowth[season()]);
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

  // ---------- v3: Familie/Bonus & Aktien ----------
  function famBonus() {
    return (state.married ? CFG.life.marriedBonus : 1)
      * (state.child ? CFG.life.childBonus : 1)
      * (state.homeLevel >= 2 ? 1.05 : 1);
  }

  function initStocks() {
    for (const [id, s] of Object.entries(CFG.life.stocks)) {
      if (!state.stockPrices[id]) state.stockPrices[id] = s.p0;
    }
  }

  function updateStocks() {
    for (const id of Object.keys(CFG.life.stocks)) {
      const p = state.stockPrices[id] || CFG.life.stocks[id].p0;
      const drift = (Math.random() * 2 - 1) * CFG.life.stockDrift;
      // sanfte Rückkehr zum Ausgangskurs, damit nichts gegen 0 läuft
      const revert = (CFG.life.stocks[id].p0 - p) * 0.03;
      state.stockPrices[id] = Math.max(2, Math.round((p * (1 + drift) + revert) * 100) / 100);
    }
  }

  function regenExports() {
    const E = CFG.export;
    state.exportOffers = [];
    for (let i = 0; i < 2; i++) {
      state.exportOffers.push({
        country: E.countries[Math.floor(Math.random() * E.countries.length)],
        qty: E.minQty + Math.floor(Math.random() * (E.maxQty - E.minQty)),
        price: E.minPrice + Math.floor(Math.random() * (E.maxPrice - E.minPrice))
      });
    }
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
    return state.basketValueKg * CFG.eco.pricePerKg * (state.dedeBonus ? 1.1 : 1);
  }

  function trackPacks(n) {
    const before = playerShare();
    state.packsSold += n;
    state._shareNow = playerShare();
    if (before < CFG.rival.winShare && state._shareNow >= CFG.rival.winShare) {
      ui.toast(t('rivalBeaten'), true, 9000);
      audio.tierUp();
    }
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
    state.workerData.push({ name: (state.workerData.length + state.day) % CFG.workerNames.length, days: 0 });
    workers.sync();
    audio.buy();
    ui.refreshMoney();
    save();
    return true;
  }

  function fireWorker() {
    if (state.workers <= 0) { audio.deny(); return false; }
    state.workers -= 1;
    state.workerData.pop();
    if (state.workers === 0) state.sofor = false;
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
    if (spec.lock && !state.unlocks[type]) { audio.deny(); return false; }
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

  // ---------- v3: Reisen ----------
  const secPerHour = () => CFG.dayLengthSec / (CFG.endHour - CFG.startHour);

  function canTravel(cityId) {
    const c = CFG.travel.cities[cityId];
    const hoursLeft = CFG.endHour - sky.hour;
    return state.money >= c.cost && hoursLeft > c.hours + 0.5;
  }

  function travelTo(cityId) {
    const c = CFG.travel.cities[cityId];
    if (!canTravel(cityId)) { audio.deny(); return false; }
    state.money -= c.cost;
    state.daySpent += c.cost;
    state.timeSec += c.hours * secPerHour();
    if (!state.visited[cityId]) {
      state.visited[cityId] = true;
      ui.toast(t('firstVisit', t('city_' + cityId)), true, 5000);
    }
    audio.gondola();
    save();
    ui.showTravelCity(cityId);
    return true;
  }

  function buyTravelGood(cityId, goodId) {
    const price = CFG.travel.goods[cityId].buy[goodId];
    if (price == null || state.money < price) { audio.deny(); return false; }
    if (goodId === 'coal') { state.inventory.coal += 5; }
    else if (goodId === 'strawSeed') {
      if (state.unlocks.straw) { audio.deny(); return false; }
      state.unlocks.straw = true;
    } else if (goodId === 'walnutSeed') {
      if (state.unlocks.walnut) { audio.deny(); return false; }
      state.unlocks.walnut = true;
    } else if (goodId === 'baston') {
      if (state.baston) { audio.deny(); return false; }
      state.baston = true;
    } else return false;
    state.money -= price;
    state.daySpent += price;
    audio.buy();
    ui.refreshMoney();
    save();
    return true;
  }

  function cityPrice(cityId, productId) {
    const prem = (CFG.travel.goods[cityId].premium || {})[productId] || 1;
    return CFG.products[productId].sell * (state.marketMul[productId] || 1) * prem;
  }

  function sellAtCity(cityId, productId, count) {
    const have = Math.floor(state.inventory[productId] || 0);
    const n = Math.min(have, count);
    if (n <= 0) { audio.deny(); return 0; }
    const sum = n * cityPrice(cityId, productId) * famBonus();
    state.inventory[productId] -= n;
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    audio.cash();
    checkWealth();
    ui.refreshMoney();
    save();
    return sum;
  }

  // ---------- v3: Fabrik, Supermarkt, Export ----------
  function buyFactory() {
    if (state.factory || state.money < CFG.factory.cost) { audio.deny(); return false; }
    state.money -= CFG.factory.cost;
    state.daySpent += CFG.factory.cost;
    state.factory = true;
    extras.syncFactory();
    extras.setLabel(state.label || 'ÇAY VADİSİ');
    audio.tierUp();
    ui.toast(t('factoryBought'), true, 7000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function packBasket() {
    if (!state.factory || state.basketKg < 1) { audio.deny(); return 0; }
    const packs = Math.floor(state.basketKg);
    state.inventory.tea_pack += packs;
    state.basketValueKg = Math.max(0, state.basketValueKg - packs);
    state.basketKg -= packs;
    audio.harvest();
    ui.refreshBasket();
    ui.toast(t('packed', packs), true);
    save();
    return packs;
  }

  function sellSuper(count) {
    const have = Math.floor(state.inventory.tea_pack || 0);
    const n = Math.min(have, count);
    if (n <= 0) { audio.deny(); return 0; }
    const price = CFG.products.tea_pack.sell * CFG.supermarket.retailFactor * (state.marketMul.tea_pack || 1);
    const sum = n * price * famBonus();
    state.inventory.tea_pack -= n;
    trackPacks(n);
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    if (!state._shelfToast) {
      state._shelfToast = true;
      ui.toast(t('shelfLive', state.label || 'ÇAY VADİSİ'), true, 6500);
    }
    audio.cash();
    checkWealth();
    ui.refreshMoney();
    save();
    return sum;
  }

  function fulfillExport(idx) {
    const o = state.exportOffers[idx];
    if (!o || Math.floor(state.inventory.tea_pack) < o.qty) { audio.deny(); return false; }
    state.inventory.tea_pack -= o.qty;
    trackPacks(o.qty);
    const sum = o.qty * o.price;
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    state.exportsDone += 1;
    state.exportOffers.splice(idx, 1);
    audio.tierUp();
    ui.toast(t('exportDone', o.country, fmtMoney(sum, state.settings.lang)), true, 6000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- v3: Privatleben ----------
  function setIdentity(name, label, outfit) {
    state.playerName = (name || '').slice(0, 18);
    state.label = (label || '').slice(0, 18).toUpperCase();
    if (outfit) state.outfit = outfit;
    if (state.factory) extras.setLabel(state.label || 'ÇAY VADİSİ');
    save();
  }

  function marry() {
    if (state.married || state.wealthTier < CFG.life.weddingTier || state.money < CFG.life.weddingCost) { audio.deny(); return false; }
    state.money -= CFG.life.weddingCost;
    state.daySpent += CFG.life.weddingCost;
    state.married = true;
    audio.tierUp();
    ui.toast(t('marriedToast'), true, 7000);
    save();
    return true;
  }

  function haveChild() {
    if (!state.married || state.child || state.wealthTier < CFG.life.childTier || state.money < CFG.life.childCost) { audio.deny(); return false; }
    state.money -= CFG.life.childCost;
    state.daySpent += CFG.life.childCost;
    state.child = true;
    audio.tierUp();
    ui.toast(t('childToast'), true, 7000);
    save();
    return true;
  }

  function buyProperty(id) {
    const p = CFG.life.properties[id];
    if (!p || state.properties[id] || state.money < p.cost) { audio.deny(); return false; }
    state.money -= p.cost;
    state.daySpent += p.cost;
    state.properties[id] = true;
    audio.cash();
    ui.toast(t('propertyBought', t('prop_' + id)), true, 5000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function tradeStock(id, n) {   // n > 0 kaufen, n < 0 verkaufen
    const price = state.stockPrices[id] || CFG.life.stocks[id].p0;
    if (n > 0) {
      const cost = n * price;
      if (state.money < cost) { audio.deny(); return false; }
      state.money -= cost;
      state.daySpent += cost;
      state.stocks[id] += n;
    } else {
      const sellN = Math.min(state.stocks[id], -n);
      if (sellN <= 0) { audio.deny(); return false; }
      state.stocks[id] -= sellN;
      const sum = sellN * price;
      state.money += sum;
      state.dayEarned += sum;
    }
    audio.buy();
    ui.refreshMoney();
    save();
    return true;
  }

  function sellBlack() {
    const B = CFG.life.black;
    if (state.role === 'jandarma') { ui.toast(t('blackJandarma'), false); audio.deny(); return false; }
    if (state.basketKg <= 0.01) { audio.deny(); return false; }
    const value = sellValue() * B.bonus;
    const risk = B.baseRisk + state.blackHeat * B.heatRisk;
    state.basketKg = 0;
    state.basketValueKg = 0;
    if (Math.random() < risk) {
      // Erwischt: Ware beschlagnahmt + Bußgeld
      const fine = Math.round(value * B.fineFactor / B.bonus);
      state.money = Math.max(0, state.money - fine);
      state.daySpent += fine;
      state.blackHeat += 1;
      audio.thunderish();
      ui.toast(t('blackCaught', fmtMoney(fine, state.settings.lang)), false, 7000);
    } else {
      state.money += value;
      state.dayEarned += value;
      state.totalEarned += value;
      state.blackHeat += 0.5;
      audio.cash();
      ui.toast(t('blackOk', fmtMoney(value, state.settings.lang)), true, 5000);
    }
    ui.refreshBasket();
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- v4: Flüge, Haus, Rolle, Essen ----------
  function canFlyIstanbul() {
    const F = CFG.airport.flights.istanbul;
    return state.money >= F.cost && (CFG.endHour - sky.hour) > F.hours + 0.5;
  }

  function flyIstanbul() {
    const F = CFG.airport.flights.istanbul;
    if (!canFlyIstanbul()) { audio.deny(); return false; }
    state.money -= F.cost;
    state.daySpent += F.cost;
    state.timeSec += F.hours * secPerHour();
    audio.gondola();
    save();
    ui.showIstanbul();
    return true;
  }

  function istanbulPrice(pid) {
    const prem = CFG.airport.istanbulPremium[pid] || 1;
    return CFG.products[pid].sell * (state.marketMul[pid] || 1) * prem;
  }

  function sellIstanbul(pid, count) {
    const have = Math.floor(state.inventory[pid] || 0);
    const n = Math.min(have, count);
    if (n <= 0) { audio.deny(); return 0; }
    const sum = n * istanbulPrice(pid) * famBonus();
    state.inventory[pid] -= n;
    state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
    audio.cash();
    checkWealth();
    ui.refreshMoney();
    save();
    return sum;
  }

  function flyAlmanya() {
    const F = CFG.airport.flights.almanya;
    if (state.money < F.cost) { audio.deny(); return false; }
    state.money -= F.cost;
    state.daySpent += F.cost;
    const [lo, hi] = CFG.airport.almanyaWage;
    const wage = Math.round(lo + Math.random() * (hi - lo));
    state.money += wage; state.dayEarned += wage; state.totalEarned += wage;
    state.gurbetci += 1;
    if (state.survival) { state.hunger = Math.max(20, state.hunger - 30); }
    ui.toast(t('gurbetciDone', fmtMoney(wage, state.settings.lang)), true, 8000);
    audio.tierUp();
    checkWealth();
    save();
    // Der Rest des Tages ist weg
    endDay();
    return true;
  }

  function buyHomeUpgrade() {
    const lvl = state.homeLevel;
    const spec = CFG.homeLevels[lvl];
    if (!spec || state.money < spec.cost) { audio.deny(); return false; }
    state.money -= spec.cost;
    state.daySpent += spec.cost;
    state.homeLevel = lvl + 1;
    extras.syncHome();
    audio.buy();
    ui.toast(t('homeUpgraded' + state.homeLevel), true, 6000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function setRole(role) {
    if (!CFG.roles[role]) return false;
    state.role = role;
    ui.toast(t('roleSet', t('role_' + role)), true);
    save();
    return true;
  }

  function buyFood(id) {
    const f = CFG.survival.foods[id];
    if (!f || state.money < f.cost) { audio.deny(); return false; }
    state.money -= f.cost;
    state.daySpent += f.cost;
    if (f.hunger) state.hunger = Math.min(100, state.hunger + f.hunger);
    if (f.energy) state.energy = Math.min(100, state.energy + f.energy);
    state._starveToast = false;
    audio.harvest();
    ui.refreshMoney();
    ui.refreshSurvival();
    save();
    return true;
  }

  function buyRod() {
    if (state.rod || state.money < CFG.fishing.rodCost) { audio.deny(); return false; }
    state.money -= CFG.fishing.rodCost;
    state.daySpent += CFG.fishing.rodCost;
    state.rod = true;
    audio.buy();
    ui.toast(t('rodBought'), true, 5000);
    ui.refreshMoney();
    save();
    return true;
  }

  function buyBoat() {
    if (state.boat || state.money < CFG.boat.cost) { audio.deny(); return false; }
    state.money -= CFG.boat.cost;
    state.daySpent += CFG.boat.cost;
    state.boat = true;
    boat.syncOwned();
    audio.cash();
    ui.toast(t('boatBought'), true, 6000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- v6: Bank, Tee-Sorten, Şoför, Yayla, Tavla ----------
  function takeLoan(idx) {
    const amount = CFG.bank.loans[idx];
    if (!amount || state.debt > 0) { audio.deny(); return false; }
    state.debt = amount;
    state.money += amount;
    audio.cash();
    ui.toast(t('loanTaken', fmtMoney(amount, state.settings.lang)), true, 6000);
    ui.refreshMoney();
    save();
    return true;
  }

  function repayLoan() {
    if (state.debt <= 0) { audio.deny(); return false; }
    const pay = Math.min(state.debt, state.money);
    if (pay <= 0) { audio.deny(); return false; }
    state.money -= pay;
    state.debt -= pay;
    audio.buy();
    if (state.debt <= 0) ui.toast(t('debtFree'), true, 6000);
    ui.refreshMoney();
    save();
    return true;
  }

  function toggleInsurance() {
    state.insured = !state.insured;
    audio.buy();
    save();
    return true;
  }

  function setTeaStyle(styleId) {
    const s = CFG.teaStyles[styleId];
    if (!s) return false;
    if (styleId === 'yesil' && !state.greenLine) { audio.deny(); return false; }
    if (styleId === 'beyaz' && !state.dedeBonus) { audio.deny(); return false; }
    state.teaStyle = styleId;
    audio.buy();
    save();
    return true;
  }

  function buyGreenLine() {
    const cost = CFG.teaStyles.yesil.lineCost;
    if (state.greenLine || !state.factory || state.money < cost) { audio.deny(); return false; }
    state.money -= cost;
    state.daySpent += cost;
    state.greenLine = true;
    audio.cash();
    ui.refreshMoney();
    save();
    return true;
  }

  function promoteSofor() {
    if (state.sofor || state.workers < 1 || !state.vehicles.pickup || state.money < CFG.soforCost) { audio.deny(); return false; }
    state.money -= CFG.soforCost;
    state.daySpent += CFG.soforCost;
    state.sofor = true;
    audio.buy();
    ui.toast(t('soforPromoted'), true, 6000);
    ui.refreshMoney();
    save();
    return true;
  }

  function buyHive() {
    if (state.hives >= CFG.yayla.maxHives || state.money < CFG.yayla.hiveCost) { audio.deny(); return false; }
    state.money -= CFG.yayla.hiveCost;
    state.daySpent += CFG.yayla.hiveCost;
    state.hives += 1;
    yayla.syncHives();
    audio.buy();
    ui.toast(t('hiveBought', state.hives, CFG.yayla.maxHives), true, 5000);
    ui.refreshMoney();
    save();
    return true;
  }

  function playTavla(stake) {
    if (state.money < stake) { audio.deny(); return null; }
    const rounds = [];
    let me = 0, temel = 0;
    for (let i = 0; i < CFG.tavla.rounds; i++) {
      const a = 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6);
      const b = 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6);
      rounds.push([a, b]);
      if (a > b) me++; else if (b > a) temel++;
    }
    const won = me > temel;
    const draw = me === temel;
    if (!draw) {
      if (won) {
        state.money += stake;
        state.dayEarned += stake;
        state.tavlaWins += 1;
      } else {
        state.money -= stake;
        state.daySpent += stake;
      }
      (won ? audio.cash : audio.deny)();
    }
    ui.refreshMoney();
    save();
    return { rounds, me, temel, won, draw };
  }

  // Tempo-Malus bei Hunger/Erschöpfung (für player.update)
  function speedMul() {
    let m = state.baston ? CFG.life.bastonSpeed : 1;
    if (state.survival && (state.hunger < CFG.survival.lowThreshold || state.energy < CFG.survival.lowThreshold)) {
      m *= CFG.survival.slowFactor;
    }
    return m;
  }

  // ---------- Eingaben ----------
  window.addEventListener('mousedown', (e) => {
    if (ctx.photoActive && ctx.photoActive()) return;
    if (e.button !== 0 || !running || paused || vehicles.driving || boat.driving) return;
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
    if (boat.driving) {
      if (boat.fishingState !== 'idle') { boat.reel(); return; }
      // Am Ufer: anlegen. Auf offener See mit Olta: angeln.
      if (boat.canExitHere()) {
        boat.exit();
        if (radio) radio.off(audio.ctx);
        if (!ctx.isTouch) player.requestLock();
      } else if (state.rod) {
        boat.startFishing();
      }
      return;
    }
    if (vehicles.driving) {
      vehicles.exit();
      audio.engineStop();
      if (radio) radio.off(audio.ctx);
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
    else if (act.id === 'travel') { player.releaseLock(); ui.showTravel(); }
    else if (act.id === 'factory') { player.releaseLock(); ui.showFactory(); }
    else if (act.id === 'super') { player.releaseLock(); ui.showSuper(); }
    else if (act.id === 'black') sellBlack();
    else if (act.id === 'airport') { player.releaseLock(); ui.showAirport(); }
    else if (act.id === 'boat') boat.enter();
    else if (act.id === 'fish') boat.startFishing();
    else if (act.id === 'reel') boat.reel();
    else if (act.id === 'tavla') { player.releaseLock(); ui.showTavla(); }
    else if (act.id === 'hive') buyHive();
  }

  window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (ctx.photoActive && ctx.photoActive()) return;
    if (e.code === 'KeyE' && running && !paused && !ui.overlayOpen()) doInteract();
    if (e.code === 'KeyH' && vehicles.driving) audio.horn(vehicles.driving);
    if (e.code === 'KeyR' && (vehicles.driving || boat.driving) && radio && audio.ctx) {
      radio.next(audio.ctx, audio.masterNode);
      const name = radio.stationName();
      ui.toast(name ? '📻 ' + name : t('radioOff'), false, 2500);
    }
    if (e.code === 'KeyP' && running && !paused) {
      if (ui.lifeOpen()) { ui.hideOverlays(); pause(false); }
      else if (!ui.overlayOpen()) { player.releaseLock(); ui.showLife(); }
    }
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
    if (boat.nearDock(player.pos.x, player.pos.z)) return { id: 'boat' };
    if (boat.fishingState !== 'idle') return { id: 'reel' };
    const veh = vehicles.nearest(player.pos.x, player.pos.z);
    if (veh) return { id: 'vehicle', data: veh };
    if (state.rod && boat.canFishHere()) return { id: 'fish' };
    const ready = farm.nearestReadyPlot(player.pos.x, player.pos.z);
    if (ready >= 0) return { id: 'harvest', data: ready };
    if (distTo(CFG.farm.sign.x, CFG.farm.sign.z) < CFG.interactDist + 1) return { id: 'farm' };
    if (distTo(CFG.city.market.x, CFG.city.market.z) < CFG.interactDist + 1.5) return { id: 'market' };
    if (distTo(CFG.city.dealer.x, CFG.city.dealer.z) < CFG.interactDist + 3.5) return { id: 'dealer' };
    if (distTo(CFG.travel.spot.x, CFG.travel.spot.z) < CFG.interactDist + 2.5) return { id: 'travel' };
    if (distTo(CFG.factory.x, CFG.factory.z) < CFG.interactDist + 5) return { id: 'factory' };
    if (distTo(CFG.supermarket.x, CFG.supermarket.z) < CFG.interactDist + 1.5) return { id: 'super' };
    if (sky.hour >= CFG.life.black.hourFrom && state.basketKg > 0.01
        && distTo(CFG.life.black.spot.x, CFG.life.black.spot.z) < CFG.interactDist) return { id: 'black' };
    if (distTo(CFG.airport.x, CFG.airport.z) < CFG.interactDist + 8) return { id: 'airport' };
    // v6: Tavla im Çayevi, Bienenstöcke auf der Yayla
    if (distTo(CFG.city.x + 12, CFG.city.z - 4) < CFG.interactDist) return { id: 'tavla' };
    if (state.hives < CFG.yayla.maxHives
        && distTo(CFG.yayla.x + 6, CFG.yayla.z + 2) < CFG.interactDist + 2) return { id: 'hive' };
    return null;
  }

  // ---------- Haupt-Update ----------
  function update(dt, elapsed) {
    if (!running || paused) return;

    // Zeit
    state.timeSec += dt;
    if (state.timeSec >= CFG.dayLengthSec) { endDay(); return; }

    // v4: Nachbarschafts-Ereignisse
    if (events) events.update();

    // v4: Survival — Hunger & Energie
    if (state.survival) {
      state.hunger = Math.max(0, state.hunger - CFG.survival.hungerPerDay / CFG.dayLengthSec * dt);
      state.energy = Math.max(0, state.energy - CFG.survival.energyPerDay / CFG.dayLengthSec * dt);
      ui.refreshSurvival();
      if (state.hunger <= 0 && !state._starveToast) {
        state._starveToast = true;
        ui.toast(t('starving'), false, 6000);
      }
    }

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
      // v5: Regenbogen (nicht im Winter)
      if (season() !== 2) rainbowTimer = CFG.weather.rainbowSec;
    }
    state.raining = rainingNow;
    ui.setRainWarn(warnSoon);
    if (state.wetTimer > 0) state.wetTimer -= dt;

    // v5: Sturm — einmalig Triebe beschädigen (v6: Versicherung schützt)
    if (stormActive() && !stormDone) {
      stormDone = true;
      if (state.insured) {
        ui.toast(t('insuranceSaved'), true, 7000);
        audio.thunderish();
      } else {
        let hit = 0;
        for (let i = 0; i < tea.count; i++) {
          if (tea.states[i] === 1 && Math.random() < CFG.weather.stormDamage) { tea.states[i] = 2; hit++; }
        }
        ui.toast(t('stormHit', hit), false, 7000);
        audio.thunderish();
        setTimeout(() => audio.thunderish(), 700);
      }
    }

    // v5: Morgennebel & Regenbogen ausblenden/einblenden
    const wantFog = fogMorning && sky.hour < 10.5 ? 0.009 : 0;
    sky.extraFog += (wantFog - sky.extraFog) * Math.min(1, dt * 0.5);
    if (rainbowTimer > 0) {
      rainbowTimer -= dt;
      const T = CFG.weather.rainbowSec;
      sky.rainbowT = Math.min(1, Math.min(rainbowTimer / 6, (T - rainbowTimer) / 4));
    } else sky.rainbowT = 0;

    // Bootfahren: eigener Modus (Tacho, Angel-Prompts)
    if (boat.driving) {
      ui.setSpeed(boat.speedKmh());
      ui.setCrosshairActive(false);
      ui.setPickProgress(0);
      const fs = boat.fishingState;
      ui.setPrompt(
        fs === 'bite' ? t('prompt_reelNow') : fs === 'wait' ? t('prompt_waiting')
          : boat.canExitHere() ? t('prompt_exitBoat')
          : state.rod ? t('prompt_fish') : t('prompt_exitBoat'),
        () => doInteract()
      );
      return;
    }

    // Fahren: kein Pflücken, aber Motor & Tacho
    if (vehicles.driving) {
      audio.engineUpdate(vehicles.throttle01(), vehicles.speedKmh());
      if (vehicles.isDrifting() && Math.random() < dt * 4) audio.screech();
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
      let need = (state.upgrades.shears ? CFG.tea.pickTimeShears : CFG.tea.pickTime)
        * (CFG.roles[state.role] || CFG.roles.farmer).pickFactor;
      if (state.survival && (state.hunger < CFG.survival.lowThreshold || state.energy < CFG.survival.lowThreshold)) {
        need *= 1.4;
      }
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
    travelTo, canTravel, buyTravelGood, sellAtCity, cityPrice,
    buyFactory, packBasket, sellSuper, fulfillExport,
    setIdentity, marry, haveChild, buyProperty, tradeStock, sellBlack, famBonus,
    canFlyIstanbul, flyIstanbul, istanbulPrice, sellIstanbul, flyAlmanya,
    buyHomeUpgrade, setRole, buyFood, speedMul,
    buyRod, buyBoat, playerShare, isFestival,
    takeLoan, repayLoan, toggleInsurance,
    setTeaStyle, buyGreenLine, promoteSofor, buyHive, playTavla,
    update,
    get running() { return running; },
    get paused() { return paused; },
    cargoMulNow,
    growSpeedFactor() {
      const wet = state.raining || state.wetTimer > 0;
      return (wet ? 1 / CFG.tea.wetBoost : 1) * (state.upgrades.fert ? 1 / 0.7 : 1)
        * CFG.seasonCycle.teaGrowth[season()];
    },
    windStrength() {
      let w = 0.45 + sky.rainT * 0.9;
      for (const s of showers) {
        if (state.timeSec > s.start - CFG.rain.warnSec && state.timeSec < s.start) w = 1.4;
      }
      if (stormActive()) w = 2.6;
      return w;
    },
    season,
    stormActive,
    winterRest() { return CFG.seasonCycle.workersRest[season()]; },
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
