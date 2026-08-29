// Spiellogik: Tageszyklus, Wetter, Pflücken, Wirtschaft, Interaktionen
// v2: Arbeiter, Bauernhof, Markt, Fahrzeuge, Stadt, Wohlstand
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, save, basketCapacity, resetDay, netWorth, seasonOf, prestigeMul, addRep, resetProgress } from './state.js';
import { t } from './i18n.js';
import { clamp, fmtMoney } from './util.js';
import { addXp, workerMax, luckyChance, megaChance } from './xp.js';

export function createGame(ctx, mods) {
  const { terrain, tea, props, player, audio, ui, particles, sky, farm, vehicles, workers, extras, events, boat, radio, yayla } = mods;
  // v8: istanbul/race/sled werden nach createGame erzeugt — lazy über mods.*
  const { camera } = ctx;

  let showers = [];          // {start, end, storm?}
  let warnShown = false;
  let fogMorning = false;
  let floodToday = false;    // v10: Sel
  let floodDone = false;
  let fishTourn = null;      // v10: {end, start}
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
    // v10: Sel-Gefahr (nicht im Winter, erst nach den ersten Tagen)
    floodToday = season() !== 2 && state.day >= CFG.flood.minDay && Math.random() < CFG.flood.chance;
    floodDone = false;
    if (floodToday) {
      setTimeout(() => ui.toast(t('floodWarn', CFG.flood.hitHour), false, 10000), 3000);
      audio.thunderish();
    }
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
    state.rivalDump = state.factory && !state.kemalPeace && Math.random() < CFG.rival.dumpChance;
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
    // v15: Kemals Wirtschaftsdruck drückt deinen Anteil sichtbar
    return Math.min(95, Math.max(5, Math.round(
      5 + state.packsSold * 0.4 + state.exportsDone * 3 - (state.kemalPressure || 0) * 2)));
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
    planHeliJob();
    planPhotoMission();
    planMarket();
    // v15: Kemals täglicher Wirtschaftszug
    kemalMove();
    // v15: Temel bittet um Hilfe für die Hochzeit
    if (state.day >= CFG.wedding.minDay && state.wedding.stage === 0) {
      setTimeout(() => {
        if (!running || paused || ui.overlayOpen()) return;
        ui.showWeddingPlan();
        player.releaseLock();
      }, 9000);
    }
    // v14: das Kartell meldet sich
    if (state.day >= CFG.story3.startDay && state.story3.ch === 0) {
      state.story3.ch = 1;
      setTimeout(() => {
        if (!running || paused || ui.overlayOpen()) { state.story3.ch = 0; return; }
        ui.showStory3Choice();
        player.releaseLock();
      }, 5000);
    }
    // v17: Weltmodule auf den neuen Tag syncen
    if (mods.beecup) mods.beecup.sync();
    if (mods.parcels) mods.parcels.sync();
    if (mods.landslide) mods.landslide.sync();
    if (mods.billboards) mods.billboards.sync();
    if (mods.factoryext) mods.factoryext.sync();
    if (mods.stall) mods.stall.sync();
    if (mods.railway) mods.railway.sync();
    // v17: fertiges Kampagnen-Plakat wird morgens aufgestellt
    if (state.campaign === 'pending') {
      state.campaign = '';
      state.billboards = Math.min(CFG.billboards.max, state.billboards + 1);
      if (mods.billboards) mods.billboards.sync();
      setTimeout(() => { audio.tierUp(); ui.toast(t('campaignBillboard'), true, 10000); }, 4000);
    }
    // v17: Erdrutsch blockiert die Straße
    if (state.landslide) {
      setTimeout(() => ui.toast(t('landslideMorning'), false, 10000), 7000);
    }
    // v17: alle zwei Tage schnappt sich ein Rivale freies Land
    if (state.day % CFG.parcels.rivalEveryDays === 0 && state.day > 2) rivalClaimParcel();
    // v17: Imker-Meisterschaft heute
    if (mods.beecup && mods.beecup.active) {
      setTimeout(() => ui.toast(t('beeToday'), false, 9000), 15000);
    }
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
    if (istanbulMode) returnIstanbul(true);         // v8: letzter Vapur nach Hause
    if (mods.sled && mods.sled.riding) mods.sled.exit();
    if (mods.heli && mods.heli.driving) mods.heli.exit();
    if (mods.gulet && mods.gulet.touring) mods.gulet.finish();   // v12: Tour endet mit dem Tag
    tour = null;
    derby = null;
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
          } else if (yearEventIs('blackout')) {
            // v14: Stromausfall — ohne Kohle steht die Fabrik
            state.inventory[style.product] -= packs;
            state.packedToday = 0;
            lines.push({ k: 'sumBlackout', v: '0 📦' });
          } else {
            state.money -= CFG.factory.energyCost;
            state.daySpent += CFG.factory.energyCost;
            lines.push({ k: 'sumFactory', v: '+' + packs + ' 📦', sub: '⚡ −' + fmtMoney(CFG.factory.energyCost, L) });
          }
        }
          if (rest > 0.01) {
          const sum = rest * CFG.eco.pricePerKg * ((state.sofor || state.railway) ? 1 : CFG.workers.sellFactor);
          state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
        }
      } else {
        // Şoför liefert frisch: voller Preis statt 90 %
        const sellF = (state.sofor || state.railway) ? 1 : CFG.workers.sellFactor;   // v17: Bahn liefert frisch
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
        addRep(CFG.rep.festivalWin);
        state.kemalPressure = Math.max(0, state.kemalPressure - 1);   // v15: Sieg nimmt Kemal den Wind
        lines.push({ k: 'sumFestivalWin', v: '+' + fmtMoney(CFG.festival.prize, L), sub: Math.round(mine) + ' kg' });
      } else {
        lines.push({ k: 'sumFestivalLose', v: Math.round(mine) + ' / ' + Math.round(kemal) + ' kg' });
      }
      // v7: Kooperativen-Dividende am Festivaltag (wächst mit dem Ruf)
      if (state.koop && state.rep > 0) {
        const div = state.rep * CFG.koop.dividendPerRep;
        state.money += div; state.dayEarned += div; state.totalEarned += div;
        lines.push({ k: 'sumKoopDiv', v: '+' + fmtMoney(div, L), sub: t('repShort') + ' ' + state.rep });
      }
    }
    // v8: Kararname-Effekte (Tropico lässt grüßen)
    {
      const dec = CFG.decrees.list[state.decree];
      if (dec) {
        if (dec.upkeep > 0) {
          state.money -= dec.upkeep;
          state.daySpent += dec.upkeep;
          lines.push({ k: 'sumDecree', v: '−' + fmtMoney(dec.upkeep, L), sub: t('decree_' + state.decree) });
        }
        if (dec.income) {
          state.money += dec.income;
          state.dayEarned += dec.income;
          state.totalEarned += dec.income;
          lines.push({ k: 'sumDecreeTax', v: '+' + fmtMoney(dec.income, L) });
        }
        if (dec.repPerDay) addRep(-dec.repPerDay);
        if (dec.packsPerDay && state.factory) trackPacks(dec.packsPerDay);
      }
    }
    // v17: Produktionslinien pressen über Nacht zugekauften Rohtee
    if (state.factory && state.factoryLines > 0) {
      const F2 = CFG.factory2;
      let activeLines = state.factoryLines;
      const coalNeed = activeLines * F2.coalPerLine;
      let energyCost = 0;
      if (Math.floor(state.inventory.coal) >= coalNeed) {
        state.inventory.coal -= coalNeed;
      } else if (yearEventIs('blackout')) {
        activeLines = 0;   // Stromausfall ohne Kohle: Linien stehen still
      } else {
        energyCost = CFG.factory.energyCost * activeLines;
      }
      if (activeLines > 0) {
        const packs = activeLines * F2.packsPerLine;
        const rawCost = packs * F2.rawPerPack + energyCost;
        if (state.money >= rawCost) {
          state.money -= rawCost;
          state.daySpent += rawCost;
          state.inventory.tea_pack += packs;
          lines.push({ k: 'sumLines', v: '+' + packs + ' 📦', sub: '−' + fmtMoney(rawCost, L) });
        } else {
          lines.push({ k: 'sumLinesOff', v: '0 📦' });
        }
      } else {
        lines.push({ k: 'sumLinesOff', v: '0 📦' });
      }
    }
    // v17: Pacht von eigenen Parzellen
    {
      const myParcels = state.parcels.filter((o) => o === 'me').length;
      if (myParcels > 0) {
        const rent = myParcels * CFG.parcels.rentPerDay;
        state.money += rent; state.dayEarned += rent; state.totalEarned += rent;
        lines.push({ k: 'sumRent', v: '+' + fmtMoney(rent, L), sub: myParcels + ' 🚩' });
      }
    }
    // v17: die Teebahn bringt abends Kohle aus Zonguldak
    if (state.railway) {
      state.inventory.coal += CFG.railway.coalPerDay;
      lines.push({ k: 'sumRail', v: '+' + CFG.railway.coalPerDay + ' 🪨' });
    }
    // v17: Tagesbilanz des Basar-Stands
    if (state.stall && state.stall.soldToday > 0) {
      lines.push({ k: 'sumStall', v: '+' + fmtMoney(state.stall.earnedToday, L), sub: state.stall.soldToday + ' 🧺' });
    }
    // v9: Mandıra macht abends aus Milch Peynir
    if (state.mandira) {
      const cheese = Math.floor(Math.floor(state.inventory.milk) / CFG.mandira.milkPerCheese);
      if (cheese > 0) {
        state.inventory.milk -= cheese * CFG.mandira.milkPerCheese;
        state.inventory.cheese += cheese;
        lines.push({ k: 'sumMandira', v: '+' + cheese + ' 🧀' });
      }
    }
    // v9: Muhlama-Lokanta serviert aus Peynir + Mais
    if (state.restaurant) {
      const R = CFG.restaurant;
      const dishes = Math.min(R.maxDishes, Math.floor(state.inventory.cheese), Math.floor(state.inventory.corn));
      if (dishes > 0) {
        state.inventory.cheese -= dishes * R.dishCheese;
        state.inventory.corn -= dishes * R.dishCorn;
        const sum = Math.round(dishes * R.dishPay * famBonus());
        state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
        lines.push({ k: 'sumRestaurant', v: '+' + fmtMoney(sum, L), sub: dishes + ' 🫕' });
      }
    }
    // v11: Haselnuss-Plantage — Ernte jeden Herbstabend
    if (state.orchard && season() === CFG.orchard.season) {
      state.inventory.hazel += CFG.orchard.perDay;
      lines.push({ k: 'sumOrchard', v: '+' + CFG.orchard.perDay + ' 🌰' });
    }
    // v11: Preistier-Wettbewerb am Festival
    if (isFestival()) {
      const total = Object.values(state.animals).reduce((a, b) => a + b, 0);
      if (total >= CFG.breeding.contestMinAnimals) {
        if (total + Math.random() * 6 > 8) {
          state.money += CFG.breeding.contestPrize;
          state.dayEarned += CFG.breeding.contestPrize;
          state.totalEarned += CFG.breeding.contestPrize;
          addRep(CFG.breeding.contestRep);
          const names = Object.values(state.animalNames).flat();
          lines.push({ k: 'sumContest', v: '+' + fmtMoney(CFG.breeding.contestPrize, L), sub: '🏵️ ' + (names[0] || '—') });
        } else {
          lines.push({ k: 'sumContestLose', v: '—' });
        }
      }
    }
    // v11: Şoför 2.0 — Lieferketten-Automation (braucht Şoför + Pickup)
    if (state.sofor && state.vehicles.pickup
        && (state.logi.packs || state.logi.goods || state.logi.exportA)) {
      const LG = CFG.logistics;
      // 1) Exporte automatisch erfüllen
      if (state.logi.exportA) {
        for (let i = state.exportOffers.length - 1; i >= 0; i--) {
          const o = state.exportOffers[i];
          if (Math.floor(state.inventory.tea_pack) >= o.qty) {
            state.inventory.tea_pack -= o.qty;
            trackPacks(o.qty);
            const sum = o.qty * o.price;
            state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
            state.exportsDone += 1;
            state.exportOffers.splice(i, 1);
            lines.push({ k: 'sumAutoExport', v: '+' + fmtMoney(sum, L), sub: o.country });
          }
        }
      }
      // 2) Pakete in den Supermarkt
      if (state.logi.packs) {
        const n = Math.min(LG.maxPacks, Math.floor(state.inventory.tea_pack));
        if (n > 0) {
          const price = CFG.products.tea_pack.sell * CFG.supermarket.retailFactor * (state.marketMul.tea_pack || 1);
          const sum = n * price * famBonus();
          state.inventory.tea_pack -= n;
          trackPacks(n);
          state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
          lines.push({ k: 'sumAutoPacks', v: '+' + fmtMoney(sum, L), sub: n + ' 📦' });
        }
      }
      // 3) Hofprodukte zum Karşıköy-Premium
      if (state.logi.goods) {
        let sum = 0;
        for (const pid of ['cheese', 'honey', 'egg', 'milk']) {
          const have = Math.floor(state.inventory[pid] || 0);
          if (have > 0) {
            sum += have * karsikoyPrice(pid) * famBonus();
            state.inventory[pid] -= have;
          }
        }
        if (sum > 0) {
          state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
          lines.push({ k: 'sumAutoGoods', v: '+' + fmtMoney(sum, L) });
        }
      }
      state.money -= LG.upkeep;
      state.daySpent += LG.upkeep;
      lines.push({ k: 'sumLogiUpkeep', v: '−' + fmtMoney(LG.upkeep, L) });
    }
    // v10: Dolmuş-Linie — Fahrgeld minus Diesel
    if (state.dolmus) {
      const D = CFG.dolmus;
      const net = Math.round(D.baseFare + state.rep * D.perRep - D.fuel);
      state.money += net; state.dayEarned += net; state.totalEarned += net;
      lines.push({ k: 'sumDolmus', v: '+' + fmtMoney(net, L) });
    }
    // v8: Pansiyon-Gäste (je besser der Ruf, desto voller das Haus)
    if (state.properties.pansiyon) {
      const P = CFG.pension;
      const guests = Math.min(P.maxGuests,
        Math.round(state.rep / 25) + (season() === 0 ? 1 : 0) + (isFestival() ? 1 : 0));
      if (guests > 0) {
        // v14: Tourismus-Boom zahlt +50 %
        const sum = Math.round(guests * P.guestPay * (yearEventIs('boom') ? 1.5 : 1));
        state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
        lines.push({ k: 'sumPension', v: '+' + fmtMoney(sum, L), sub: guests + ' 🧳' });
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
      const mesai = CFG.decrees.list[state.decree] && CFG.decrees.list[state.decree].wageMul || 1;
      const okulRebate = state.village.okul === 2 ? CFG.village.wageRebate : 1;   // v13
      const wages = Math.round(state.workers * CFG.workers.wage * mesai * okulRebate);
      state.money -= wages; state.daySpent += wages;
      lines.push({ k: 'sumWages', v: '−' + fmtMoney(wages, L), sub: state.workers + ' 👷' + (okulRebate < 1 ? ' 🏫−10%' : '') });
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
    // v15: Frachter kommt zurück — Abrechnung mit Sturm-Risiko
    if (state.shipment) {
      const F = CFG.freighter;
      const sh = state.shipment;
      const r = F.routes[sh.route];
      let rev = Math.round(sh.packs * CFG.products.tea_pack.sell * r.mul);
      const storm = Math.random() < r.risk;
      if (storm) rev = Math.round(rev * (1 - F.lossFactor));
      state.money += rev; state.dayEarned += rev; state.totalEarned += rev;
      trackPacks(sh.packs);
      lines.push({ k: 'sumFreight', v: '+' + fmtMoney(rev, L), sub: t('route_' + sh.route) + (storm ? ' ⛈️' : '') });
      if (storm) setTimeout(() => ui.toast(t('freightStorm'), false, 9000), 2000);
      state.shipment = null;
      if (mods.freighter) mods.freighter.syncOwned();
    }
    // v14: Muhtarlık-Amtsbonus bzw. Kemals Sondersteuer
    if (state.muhtarluk) {
      const b = CFG.election.bonus;
      state.money += b; state.dayEarned += b; state.totalEarned += b;
      lines.push({ k: 'sumMuhtar', v: '+' + fmtMoney(b, L) });
    } else if (state.day > CFG.election.everyDays) {
      state.money -= CFG.election.tax;
      state.daySpent += CFG.election.tax;
      lines.push({ k: 'sumKemalTax', v: '−' + fmtMoney(CFG.election.tax, L) });
    }
    // v14: Story-3-Finale am Festivalabend
    if (isFestival() && state.story3.ch === 3) {
      const S3 = CFG.story3;
      if (state.story3.path === 'jandarma') {
        state.money += S3.jandarmaPay[1]; state.dayEarned += S3.jandarmaPay[1]; state.totalEarned += S3.jandarmaPay[1];
        addRep(10);
        lines.push({ k: 'sumRazzia', v: '+' + fmtMoney(S3.jandarmaPay[1], L) });
      } else {
        state.money += S3.kacakPay[1]; state.dayEarned += S3.kacakPay[1]; state.totalEarned += S3.kacakPay[1];
        addRep(-5);
        state.kacakBonus = true;
        lines.push({ k: 'sumKartell', v: '+' + fmtMoney(S3.kacakPay[1], L) });
      }
      state.story3.ch = 4;
      state.story3.done = true;
      setTimeout(() => ui.toast(t(state.story3.path === 'jandarma' ? 'story3EndJandarma' : 'story3EndKacak'), true, 12000), 2500);
    }
    // v14: Belediye-Wahl am letzten Tag jedes Jahres
    if (state.day % CFG.election.everyDays === 0) {
      const E = CFG.election;
      const villageDone = Object.values(state.village).filter((v2) => v2 === 2).length;
      const mine = Math.round(state.rep + villageDone * E.villageVotes + (state.muhtarluk ? 5 : 0));
      const kemal = Math.round(E.kemalBase + state.day * 0.3 - (state.kemalPeace ? 8 : 0));
      const won = mine > kemal;
      state.muhtarluk = won;
      if (won) state.electionsWon += 1;
      lines.push({ k: won ? 'sumElectionWin' : 'sumElectionLose', v: mine + ' : ' + kemal });
      setTimeout(() => ui.toast(t(won ? 'electionWin' : 'electionLose', mine, kemal), won, 11000), 1500);
    }
    // v13: fertige Dorfprojekte zahlen zurück
    if (state.village.cayevi2 === 2) {
      const inc = CFG.village.cayeviIncome;
      state.money += inc; state.dayEarned += inc; state.totalEarned += inc;
      lines.push({ k: 'sumCayevi', v: '+' + fmtMoney(inc, L) });
    }
    if (state.village.cami === 2 && isFestival()) {
      state.moralDays += CFG.village.camiMoralDays;
      lines.push({ k: 'sumCami', v: '+' + CFG.village.camiMoralDays + ' ☀️' });
    }
    // v12: Konak-Museum — Eintrittsgelder, Bonus bei kompletter Sammlung
    if (state.konak >= 3) {
      const K = CFG.konak;
      let entry = Math.round(K.entryBase + state.rep * K.entryPerRep);
      let full = false;
      if (mods.collectibles && mods.collectibles.count() >= mods.collectibles.total) {
        entry *= K.collectionBonus;
        full = true;
      }
      state.money += entry; state.dayEarned += entry; state.totalEarned += entry;
      lines.push({ k: 'sumMuseum', v: '+' + fmtMoney(entry, L), sub: full ? '🖼️ ×' + K.collectionBonus : '🏛️' });
    }
    // v12: Joint Venture — Kemals Werk produziert für die eigene Marke mit
    if (state.jointVenture && state.factory) {
      const jp = CFG.jointVenture.packsPerDay;
      state.inventory.tea_pack += jp;
      trackPacks(jp);
      lines.push({ k: 'sumJV', v: '+' + jp + ' 📦' });
    }
    checkWealth();
    ui.showDaySummary(lines);
    save();
  }

  function nextDay() {
    // v17: nach einem Sturmtag kann die Küstenstraße verschüttet werden
    if (state._stormToday && !state.landslide && Math.random() < CFG.landslide.chance) {
      state.landslide = { left: CFG.landslide.scoops };
    }
    state._stormToday = false;
    const prevSeason = season();
    state.day += 1;
    if (season() !== prevSeason) {
      ui.toast(t('seasonChange', t('season_' + CFG.seasonCycle.names[season()])), true, 8000);
      if (season() === 2) ui.toast(t('winterInfo'), false, 8000);
    }

    // v15: gefeierte Hochzeit abhaken
    if (state.wedding.stage === 1 && state.day > state.wedding.day) state.wedding.stage = 2;

    // v14: Jahres-Event würfeln bzw. weiterticken
    if (state.day > 1 && (state.day - 1) % CFG.yearEvents.cycleDays === 0) {
      rollYearEvent();
    } else if (state.yearEvent) {
      state.yearEvent.daysLeft -= 1;
      if (state.yearEvent.daysLeft <= 0) state.yearEvent = null;
    }

    // v13: Dorfprojekte bauen über Nacht weiter
    for (const id of Object.keys(CFG.village.projects)) {
      if (state.village[id] === 1) {
        state.villageDays[id] -= 1;
        if (state.villageDays[id] <= 0) {
          state.village[id] = 2;
          addRep(CFG.village.projects[id].rep);
          if (mods.village) mods.village.sync();
          ui.toast(t('villageFinished', t('vproj_' + id)), true, 9000);
          audio.tierUp();
        }
      }
    }

    // Felder wachsen einen Tag weiter (Bewässerung: ein Extra-Tag; Winter: Frost)
    if (CFG.seasonCycle.cropGrowth[season()] > 0) {
      for (const p of state.plots) {
        if (p && p.daysLeft > 0) p.daysLeft -= 1;
        if (p && state.upgrades.sprinkler && p.daysLeft > 0) p.daysLeft -= 1;
        // v14: Rekordhitze — Bewässerung zählt doppelt
        if (p && state.upgrades.sprinkler && yearEventIs('heat') && p.daysLeft > 0) p.daysLeft -= 1;
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

    // v11: Tierzucht — über Nacht kommt Nachwuchs zur Welt
    for (const [id, spec] of Object.entries(CFG.animals)) {
      const n = state.animals[id] || 0;
      if (n >= 2 && n < spec.max && Math.random() < CFG.breeding.chance) {
        state.animals[id] = n + 1;
        const bname = assignAnimalName(id);
        setTimeout(() => ui.toast(t('animalBorn', spec.icon, bname), true, 7000), 2200);
        farm.syncAnimals();
      }
    }

    // v7: Nachts schleicht der Fuchs um den Hühnerstall — der Kangal hält Wache
    if ((state.animals.chicken || 0) > 0 && Math.random() < CFG.dog.foxChance) {
      if (state.dog) {
        setTimeout(() => ui.toast(t('dogGuard'), true, 6000), 3200);
      } else {
        const stolen = Math.min(3, Math.floor(state.inventory.egg));
        if (stolen > 0) {
          state.inventory.egg -= stolen;
          setTimeout(() => ui.toast(t('foxAttack', stolen), false, 7000), 3200);
        }
      }
    }

    // v3: Aktienkurse, neue Export-Angebote, Fahndungsdruck kühlt ab
    updateStocks();
    // v7: Tageshistorie für die Charts fortschreiben
    {
      const H = CFG.history.days;
      for (const id of Object.keys(CFG.life.stocks)) {
        const arr = state.hist.stocks[id] = state.hist.stocks[id] || [];
        arr.push(state.stockPrices[id]);
        if (arr.length > H) arr.shift();
      }
      state.hist.earned.push(Math.round(state.dayEarned));
      if (state.hist.earned.length > H) state.hist.earned.shift();
    }
    regenExports();
    if (state.blackHeat > 0) state.blackHeat = Math.max(0, state.blackHeat - 1);

    // v4: Schlaf erholt, Ereignisse neu planen
    if (state.survival) {
      state.energy = 100;
      state.hunger = Math.max(0, state.hunger - 8);
      state._starveToast = false;
    }
    if (events) events.newDay();
    // v8: Urlaubsmoral zählt runter, Gece-Mesaisi-Dekret beschleunigt die Pflücker
    if (state.moralDays > 0) state.moralDays -= 1;
    {
      const dec = CFG.decrees.list[state.decree];
      if (dec && dec.workerSpeed) state.workerBoost *= dec.workerSpeed;
    }

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
      * (state.homeLevel >= 2 ? 1.05 : 1)
      * (state.moralDays > 0 ? CFG.vacation.moralBonus : 1)   // v8: Urlaubsmoral
      * prestigeMul(CFG);   // v7: New-Game+-Sterne
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

  // v16: EXP vergeben + Level-Up-Toast
  function gainXp(kind, n) {
    const up = addXp(kind, n);
    if (up) { ui.toast(t('levelUp', t('xp_' + kind), up), true, 5000); audio.tierUp(); }
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

    // v16: Pflück-EXP + Lucky Picks (Chance wächst mit dem Level)
    gainXp('pick', CFG.xp.pickPer);
    const mega = Math.random() < megaChance();
    const lucky = !mega && Math.random() < luckyChance();
    if (mega || lucky) {
      const bonus = Math.min(cap - state.basketKg, mega ? cap : cap * 0.5);
      if (bonus > 0.01) {
        state.basketKg += bonus;
        state.basketValueKg += bonus * quality;
        state.dayKg += bonus;
        state.totalKg += bonus;
        ui.toast(t(mega ? 'megaPick' : 'luckyPick', Math.round(bonus * 10) / 10), true, 3500);
        audio.cash();
      }
    }
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
    const dec = CFG.decrees.list[state.decree];
    return state.basketValueKg * CFG.eco.pricePerKg * (state.dedeBonus ? 1.1 : 1)
      * (state.koop ? CFG.koop.priceBonus : 1)
      * (dec && dec.teaMul ? dec.teaMul : 1)                  // v8: Subvention
      * (state.moralDays > 0 ? CFG.vacation.moralBonus : 1)
      * (state._kemalDump ? CFG.kemalAI.dumpMul : 1)   // v15: Kemals Dumping-Tag
      * prestigeMul(CFG);
  }

  function trackPacks(n) {
    const before = playerShare();
    state.packsSold += n;
    gainXp('trade', n * CFG.xp.tradePerPack);   // v16: Handels-EXP
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
    gainXp('trade', CFG.xp.tradePerSale);   // v16
    state.basketKg = 0;
    state.basketValueKg = 0;
    if (!state.orderRewarded && state.orderDelivered >= state.orderTarget) {
      state.orderRewarded = true;
      state.ordersDone += 1;
      addRep(CFG.rep.order);   // v7: erfüllte Aufträge stärken den Dorf-Ruf
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
    if (id === 'expand') {   // v9: Randparzellen sofort bepflanzen
      tea.setExtension(true);
      ui.toast(t('expandDone', tea.extCount), true, 7000);
    }
    audio.buy();
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function hireWorker() {
    if (state.workers >= workerMax() || state.money < CFG.workers.hireCost) { audio.deny(); return false; }   // v16: Limit wächst mit Handels-Level
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
    const aname = assignAnimalName(id);
    ui.toast(t('animalNamed', spec.icon, aname), false, 4500);
    farm.syncAnimals();
    audio.animal(id);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  // v7: Koop-Mitglieder kaufen Saatgut günstiger
  function seedPrice(type) {
    return Math.round(CFG.crops[type].seed * (state.koop ? CFG.koop.seedDiscount : 1));
  }

  function plantCrop(type) {
    const spec = CFG.crops[type];
    if (!spec || state.money < seedPrice(type)) { audio.deny(); return false; }
    if (spec.lock && !state.unlocks[type]) { audio.deny(); return false; }
    const idx = state.plots.findIndex(p => !p);
    if (idx < 0) { ui.toast(t('noFreePlot'), false); audio.deny(); return false; }
    state.money -= seedPrice(type);
    state.daySpent += seedPrice(type);
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
    let price = CFG.products[id].sell * (state.marketMul[id] || 1) * prestigeMul(CFG);
    if (state.landslide) price *= CFG.landslide.marketMalus;         // v17: Straße blockiert
    if (id.startsWith('tea') && state.billboards > 0) price *= 1 + state.billboards * CFG.billboards.bonusPer;   // v17: Werbung
    // v14: Hamsi-Schwemme drückt alle Fischpreise
    if (yearEventIs('hamsi') && ['hamsi', 'lufer', 'kalkan', 'levrek', 'kofana', 'mersin'].includes(id)) price *= 0.5;
    const sum = n * price;
    gainXp('trade', CFG.xp.tradePerSale);   // v16
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
    const price = CFG.products.tea_pack.sell * CFG.supermarket.retailFactor * (state.marketMul.tea_pack || 1)
      * (state.jointVenture ? CFG.jointVenture.priceMul : 1)    // v12: JV-Markenaufschlag
      * (state._kemalDump ? CFG.kemalAI.dumpMul : 1)            // v15: Kemals Dumping-Tag
      * (1 + state.billboards * CFG.billboards.bonusPer);       // v17: Plakat-Kampagne
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
    if (id === 'pansiyon' && extras.syncPension) extras.syncPension();
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
      addRep(-CFG.rep.blackCaught);
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

  // v8: İstanbul ist jetzt begehbar — der Flug teleportiert ins Bosporus-Viertel
  let istanbulMode = false;

  function flyIstanbul() {
    const F = CFG.airport.flights.istanbul;
    if (!canFlyIstanbul() || istanbulMode) { audio.deny(); return false; }
    state.money -= F.cost;
    state.daySpent += F.cost;
    state.timeSec += F.hours * secPerHour();
    istanbulMode = true;
    if (mods.istanbul) mods.istanbul.setVisible(true);
    ui.hideOverlays();
    player.teleport(CFG.istanbul.spawn.x, CFG.istanbul.spawn.z);
    player.look(0.5, 0.03);   // Blick auf Kapalıçarşı & Skyline
    audio.jet();
    ui.toast(t('istWelcome'), true, 8000);
    save();
    if (!ctx.isTouch) player.requestLock();
    player.setEnabled(true);
    return true;
  }

  function returnIstanbul(silent = false) {
    if (!istanbulMode) return false;
    istanbulMode = false;
    if (mods.istanbul) mods.istanbul.setVisible(false);
    player.teleport(CFG.airport.x - 6, CFG.airport.z + 6);
    player.look(-0.5, 0);
    if (!silent) {
      audio.jet();
      ui.toast(t('istReturn'), false, 5000);
    }
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
    if (styleId === 'harman' && !state.dedeHarman) { audio.deny(); return false; }   // v14
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

  // ---------- v7: Kooperative, Kaçak, Werkstatt, Kangal, New Game+ ----------
  function joinKoop() {
    if (state.koop || state.rep < CFG.koop.minRep || state.money < CFG.koop.fee) { audio.deny(); return false; }
    state.money -= CFG.koop.fee;
    state.daySpent += CFG.koop.fee;
    state.koop = true;
    audio.tierUp();
    ui.toast(t('koopJoined'), true, 8000);
    ui.refreshMoney();
    save();
    return true;
  }

  function isNight() {
    return sky.hour >= CFG.endHour;
  }

  function nearKacakShip() {
    const K = CFG.night.kacak;
    if (!boat.driving || sky.hour < K.hourFrom) return false;
    const p = boat.pos;
    return Math.hypot(p.x - K.ship.x, p.z - K.ship.z) < 16;
  }

  function sellKacak() {
    const K = CFG.night.kacak;
    if (state.role === 'jandarma') { ui.toast(t('blackJandarma'), false); audio.deny(); return false; }
    const packs = Math.floor(state.inventory.tea_pack || 0);
    if (packs < 1) { ui.toast(t('kacakNoPacks'), false); audio.deny(); return false; }
    const value = packs * CFG.products.tea_pack.sell * K.priceMul * prestigeMul(CFG)
      * (state.kacakBonus ? 1.2 : 1);   // v14: Kartell-Konditionen nach dem Kaçak-Ende
    let risk = K.baseRisk + state.blackHeat * K.heatRisk;
    state.inventory.tea_pack -= packs;
    if (Math.random() < risk) {
      // Küstenwache! Ware weg + Bußgeld + Ruf leidet
      const fine = Math.round(packs * CFG.products.tea_pack.sell * K.fineFactor);
      state.money = Math.max(0, state.money - fine);
      state.daySpent += fine;
      state.blackHeat += 2;
      addRep(-K.repLoss);
      audio.thunderish();
      ui.toast(t('kacakCaught', fmtMoney(fine, state.settings.lang)), false, 8000);
    } else {
      state.money += value;
      state.dayEarned += value;
      state.totalEarned += value;
      state.blackHeat += 1;
      trackPacks(packs);
      audio.cash();
      ui.toast(t('kacakOk', packs, fmtMoney(value, state.settings.lang)), true, 7000);
    }
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function repairVehicle(id) {
    const wear = Math.round(state.vehWear[id] || 0);
    if (wear <= 0) { audio.deny(); return false; }
    const cost = wear * CFG.workshop.repairPerPoint;
    if (state.money < cost) { audio.deny(); return false; }
    state.money -= cost;
    state.daySpent += cost;
    state.vehWear[id] = 0;
    audio.harvest();
    ui.refreshMoney();
    save();
    return true;
  }

  function buyTuning(id, part) {
    const spec = CFG.workshop.tuning[part];
    if (!spec || !state.vehicles[id]) { audio.deny(); return false; }
    const tun = state.vehTuning[id] = state.vehTuning[id] || {};
    if (tun[part]) { audio.deny(); return false; }
    const cost = Math.round(CFG.vehicles[id].cost * spec.costFactor);
    if (state.money < cost) { audio.deny(); return false; }
    state.money -= cost;
    state.daySpent += cost;
    tun[part] = true;
    audio.buy();
    ui.refreshMoney();
    save();
    return true;
  }

  function buyDog() {
    if (state.dog || state.money < CFG.dog.cost) { audio.deny(); return false; }
    state.money -= CFG.dog.cost;
    state.daySpent += CFG.dog.cost;
    state.dog = true;
    if (mods.dog) mods.dog.syncOwned();
    audio.bark ? audio.bark() : audio.buy();
    ui.toast(t('dogBought'), true, 7000);
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- v8: Urlaub, Dekrete, Taxi, Pazarlık, Çay-Ustası, Netz, News ----------
  function bookVacation(id) {
    const V = CFG.vacation.spots[id];
    if (!V || state.money < V.cost || state.wealthTier < V.tier) { audio.deny(); return false; }
    state.money -= V.cost;
    state.daySpent += V.cost;
    state.holidays += 1;
    state.moralDays = CFG.vacation.moralDays + 1;   // heute Abend wird 1 abgezogen
    state.hunger = 100; state.energy = 100;
    if (id === 'maldiv' && !state.maldivDone) {
      state.maldivDone = true;
      addRep(CFG.vacation.maldivPrestigeRep);
    }
    ui.albumAddPostcard(id);
    audio.tierUp();
    ui.toast(t('vacationDone', t('vac_' + id)), true, 9000);
    save();
    endDay();   // der Tag ist Urlaub
    return true;
  }

  function setDecree(id) {
    if (id !== '' && !CFG.decrees.list[id]) return false;
    if (id === state.decree) return false;
    if (id !== '' && state.decree !== '') {
      if (state.money < CFG.decrees.switchCost) { audio.deny(); return false; }
      state.money -= CFG.decrees.switchCost;
      state.daySpent += CFG.decrees.switchCost;
    }
    state.decree = id;
    audio.buy();
    ui.toast(id ? t('decreeSet', t('decree_' + id)) : t('decreeOff'), true, 6000);
    ui.refreshMoney();
    save();
    return true;
  }

  function taxiCost(spotId) {
    const s = CFG.phone.taxi.spots[spotId];
    if (!s) return 0;
    const d = Math.hypot(player.pos.x - s.x, player.pos.z - s.z);
    return Math.max(CFG.phone.taxi.min, Math.round(d * CFG.phone.taxi.perMeter));
  }

  function callTaxi(spotId) {
    const s = CFG.phone.taxi.spots[spotId];
    const cost = taxiCost(spotId);
    if (!s || vehicles.driving || boat.driving || istanbulMode || state.money < cost) { audio.deny(); return false; }
    state.money -= cost;
    state.daySpent += cost;
    state.timeSec += CFG.phone.taxi.hours * secPerHour();
    player.teleport(s.x + 2, s.z + 2);
    audio.horn('sedan');
    ui.toast(t('taxiDone', t('taxi_' + spotId)), true, 4500);
    ui.refreshMoney();
    save();
    return true;
  }

  // Pazarlık: kompletten Bestand eines Produkts mit Verhandlung verkaufen
  function haggleSell(id) {
    const have = Math.floor(state.inventory[id] || 0);
    if (have <= 0) { audio.deny(); return null; }
    const base = CFG.products[id].sell * (state.marketMul[id] || 1) * prestigeMul(CFG);
    const p = Math.min(0.85, 0.5 + state.rep * 0.004);
    const won = Math.random() < p;
    const mul = won ? 1.3 : 0.85;
    const sum = have * base * mul;
    state.inventory[id] -= have;
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    (won ? audio.cash : audio.deny)();
    ui.toast(won ? t('haggleWon', fmtMoney(sum, state.settings.lang)) : t('haggleLost', fmtMoney(sum, state.settings.lang)), won, 5500);
    checkWealth();
    ui.refreshMoney();
    save();
    return { won, sum };
  }

  // Çay-Ustası: Ergebnis eines Aufbrüh-Durchgangs (score 0..1 pro Glas)
  function brewReward(scores) {
    let sum = 0;
    for (const s of scores) sum += Math.round(15 + s * 65);
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    if (scores.length && Math.min(...scores) > 0.85) addRep(1);
    audio.cash();
    ui.refreshMoney();
    save();
    return sum;
  }

  function buyNet() {
    if (state.net || state.money < CFG.net.cost) { audio.deny(); return false; }
    state.money -= CFG.net.cost;
    state.daySpent += CFG.net.cost;
    state.net = true;
    audio.buy();
    ui.toast(t('netBought'), true, 5500);
    ui.refreshMoney();
    save();
    return true;
  }

  // Wetter & Markt für Telefon/Radio (ehrliche Daten aus der Tagesplanung)
  function forecast() {
    const toH = (sec) => CFG.startHour + sec / CFG.dayLengthSec * (CFG.endHour - CFG.startHour);
    return {
      showers: showers.map(s => ({ from: toH(s.start), to: toH(s.end), storm: !!s.storm })),
      fog: fogMorning,
      season: season()
    };
  }

  function marketTips() {
    const prods = Object.entries(state.marketMul)
      .filter(([id]) => CFG.products[id])
      .sort((a, b) => b[1] - a[1]);
    const stocks = Object.keys(CFG.life.stocks).map(id => {
      const arr = (state.hist.stocks || {})[id] || [];
      const prev = arr.length > 1 ? arr[arr.length - 2] : CFG.life.stocks[id].p0;
      return { id, chg: (state.stockPrices[id] || prev) / prev - 1 };
    }).sort((a, b) => b.chg - a.chg);
    return { top: prods.slice(0, 3), flop: prods.slice(-1), stocks };
  }

  function newsLine() {
    const L = [];
    const f = forecast();
    for (const s of f.showers) {
      if (s.from * 60 > (sky.hour + 0.2) * 60) {
        L.push(t(s.storm ? 'newsStorm' : 'newsRain', Math.floor(s.from) + ':' + String(Math.floor((s.from % 1) * 60)).padStart(2, '0')));
        break;
      }
    }
    const tips = marketTips();
    if (tips.top.length) L.push(t('newsMarket', t('prod_' + tips.top[0][0]), Math.round((tips.top[0][1] - 1) * 100)));
    if (tips.stocks.length) L.push(t('newsStock', CFG.life.stocks[tips.stocks[0].id].name, Math.round(tips.stocks[0].chg * 100)));
    L.push(t('newsShare', playerShare()));
    if (isFestival()) L.push(t('newsFestival'));
    return L[Math.floor(Math.random() * L.length)];
  }
  let newsTimer = 30;

  // v8: geführte Tal-Tour für Pansiyon-Gäste
  let tour = null;
  function startTour() {
    if (tour || !state.properties.pansiyon) { audio.deny(); return false; }
    tour = { i: 0 };
    audio.orderDone();
    ui.toast(t('tourStart'), true, 7000);
    ui.toast(t('tourNext', 1, CFG.pension.tour.stops.length), false, 5000);
    return true;
  }

  // ---------- v9: Derby, Peynir-Kette, Heli, Halay, Şelale ----------
  let derby = null;   // {time, goals}

  function resetBall() {
    const ball = mods.cc0 && mods.cc0.ball;
    if (!ball) return;
    ball.pos.set(CFG.city.x + 2, 0, CFG.city.z + 4);
    ball.pos.y = terrain.heightAt(ball.pos.x, ball.pos.z) + ball.r;
    ball.vel.set(0, 0, 0);
    ball.mesh.position.copy(ball.pos);
  }

  function startDerby() {
    if (derby) return false;
    derby = { time: CFG.derby.durationSec, goals: 0 };
    resetBall();
    audio.orderDone();
    ui.toast(t('derbyStart', CFG.derby.durationSec), true, 6000);
    return true;
  }

  function updateDerby(dt) {
    if (!derby) return;
    const D = CFG.derby;
    derby.time -= dt;
    const ball = mods.cc0 && mods.cc0.ball;
    if (ball) {
      // Ball in Tor-Lokalkoordinaten prüfen
      const dx = ball.pos.x - D.goal.x, dz = ball.pos.z - D.goal.z;
      const lx = Math.cos(-D.goal.ry) * dx - Math.sin(-D.goal.ry) * dz;
      const lz = Math.sin(-D.goal.ry) * dx + Math.cos(-D.goal.ry) * dz;
      if (Math.abs(lx) < D.goal.w / 2 && lz < 0 && lz > -1.4 && ball.pos.y < 2.2) {
        derby.goals += 1;
        audio.orderDone();
        ui.toast(t('derbyGoal', derby.goals), true, 2500);
        resetBall();
      }
    }
    if (derby.time <= 0) {
      const goals = derby.goals;
      derby = null;
      let sum = goals * D.prizePerGoal;
      if (goals >= D.bonusGoals) {
        sum += D.bonus;
        addRep(D.rep);
      }
      if (goals > state.derbyBest) state.derbyBest = goals;
      if (sum > 0) {
        state.money += sum;
        state.dayEarned += sum;
        state.totalEarned += sum;
        audio.tierUp();
        ui.toast(t('derbyEnd', goals, fmtMoney(sum, state.settings.lang)), true, 8000);
      } else {
        ui.toast(t('derbyZero'), false, 6000);
      }
      ui.refreshMoney();
      save();
    }
  }

  function buyMandira() {
    if (state.mandira || state.money < CFG.mandira.cost) { audio.deny(); return false; }
    state.money -= CFG.mandira.cost;
    state.daySpent += CFG.mandira.cost;
    state.mandira = true;
    if (extras.syncMandira) extras.syncMandira();
    audio.cash();
    ui.toast(t('mandiraBought'), true, 7000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function buyRestaurant() {
    if (state.restaurant || state.money < CFG.restaurant.cost) { audio.deny(); return false; }
    state.money -= CFG.restaurant.cost;
    state.daySpent += CFG.restaurant.cost;
    state.restaurant = true;
    if (extras.syncRestaurant) extras.syncRestaurant();
    audio.cash();
    ui.toast(t('restaurantBought'), true, 7000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function buyHeli() {
    if (state.heli || state.money < CFG.heli.cost) { audio.deny(); return false; }
    state.money -= CFG.heli.cost;
    state.daySpent += CFG.heli.cost;
    state.heli = true;
    if (mods.heli) mods.heli.syncOwned();
    audio.tierUp();
    ui.toast(t('heliBought'), true, 8000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function doHalay() {
    if (state._halayDone) { audio.deny(); return false; }
    state._halayDone = true;
    audio.davulZurna && audio.davulZurna();
    addRep(CFG.halay.rep);
    if (state.survival) state.energy = Math.min(100, state.energy + CFG.halay.joy);
    ui.toast(t('halayDone'), true, 7000);
    save();
    return true;
  }

  // ---------- v10: Dolmuş, Sel, Turnier, Schätze, Waben, Karşıköy ----------
  function buyDolmus() {
    if (state.dolmus || state.money < CFG.dolmus.cost) { audio.deny(); return false; }
    state.money -= CFG.dolmus.cost;
    state.daySpent += CFG.dolmus.cost;
    state.dolmus = true;
    if (mods.dolmus) mods.dolmus.syncOwned();
    audio.horn('sedan');
    ui.toast(t('dolmusBought'), true, 7000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function placeSandbag() {
    if (!floodToday || state._sandbag || state.money < CFG.flood.sandbagCost) { audio.deny(); return false; }
    state.money -= CFG.flood.sandbagCost;
    state.daySpent += CFG.flood.sandbagCost;
    state._sandbag = true;
    audio.harvest();
    ui.toast(t('sandbagPlaced'), true, 6000);
    ui.refreshMoney();
    return true;
  }

  function floodHit() {
    const F = CFG.flood;
    showers.push({ start: state.timeSec, end: state.timeSec + 45 });
    audio.thunderish();
    setTimeout(() => audio.thunderish(), 600);
    if (state._sandbag) {
      addRep(F.repSave);
      ui.toast(t('floodSaved'), true, 9000);
    } else if (state.insured) {
      ui.toast(t('floodInsured'), true, 9000);
    } else {
      const loss = Math.round(state.money * F.moneyLoss);
      state.money -= loss;
      state.daySpent += loss;
      // Beete stehen unter Wasser
      let crops = 0;
      state.plots = state.plots.map(p => { if (p) crops++; return null; });
      farm.refreshPlots();
      ui.toast(t('floodHit', fmtMoney(loss, state.settings.lang), crops), false, 10000);
      ui.refreshMoney();
    }
    save();
  }

  function startFishTourn() {
    if (fishTourn || state._tournDone || !isFestival()) { audio.deny(); return false; }
    state._tournDone = true;
    fishTourn = { end: state.timeSec + CFG.fishTourn.durationSec, start: state.fishCaught };
    audio.orderDone();
    ui.toast(t('tournStart', CFG.fishTourn.durationSec), true, 8000);
    return true;
  }

  function endFishTourn() {
    const mine = state.fishCaught - fishTourn.start;
    fishTourn = null;
    const rivals = [
      { name: 'Temel', n: 1 + Math.floor(Math.random() * 3) },
      { name: 'Dursun', n: Math.floor(Math.random() * 3) },
      { name: 'Kemal Ağa', n: Math.floor(Math.random() * 2) }
    ].sort((a, b) => b.n - a.n);
    if (mine > state.fishTournBest) state.fishTournBest = mine;
    const board = rivals.map(r => `${r.name}: ${r.n}`).join(' · ');
    if (mine > rivals[0].n) {
      state.money += CFG.fishTourn.prize;
      state.dayEarned += CFG.fishTourn.prize;
      state.totalEarned += CFG.fishTourn.prize;
      addRep(CFG.fishTourn.rep);
      audio.tierUp();
      ui.toast(t('tournWon', mine, fmtMoney(CFG.fishTourn.prize, state.settings.lang)), true, 9000);
    } else {
      audio.deny();
      ui.toast(t('tournLost', mine, rivals[0].name, rivals[0].n), false, 9000);
    }
    ui.toast('🏆 ' + board, false, 8000);
    ui.refreshMoney();
    save();
  }

  function collectItem() {
    const c = mods.collectibles;
    if (!c) return false;
    const def = c.nearest(player.pos.x, player.pos.z);
    if (!def) return false;
    state.collect[def.id] = true;
    c.markCollected(def.id);
    audio.cash();
    ui.toast(t('collectFound', def.icon + ' ' + t('col_' + def.id), c.count(), c.total), true, 7000);
    if (c.count() >= c.total) {
      state.money += CFG.collectPrize;
      state.dayEarned += CFG.collectPrize;
      state.totalEarned += CFG.collectPrize;
      addRep(CFG.collectRep);
      audio.tierUp();
      ui.toast(t('collectAll', fmtMoney(CFG.collectPrize, state.settings.lang)), true, 10000);
    }
    ui.refreshMoney();
    save();
    return true;
  }

  // Waben-Ernte (Timing-Minispiel, Ergebnis kommt aus der UI)
  function hiveReward(scores) {
    const good = scores.filter(s2 => s2 > 0.6).length;
    let n = 1 + good;
    const perfect = scores.length && Math.min(...scores) > 0.85;
    if (perfect) n += 1;
    state.inventory.honey += n;
    state._hiveDone = true;
    audio.cash();
    ui.toast(perfect ? t('hivePerfect', n) : t('hiveHarvest', n), true, 7000);
    save();
    return n;
  }

  function karsikoyPrice(pid) {
    const prem = CFG.karsikoy.premium[pid] || 1;
    return CFG.products[pid].sell * (state.marketMul[pid] || 1) * prem * prestigeMul(CFG);
  }

  function sellKarsikoy(pid, count) {
    const have = Math.floor(state.inventory[pid] || 0);
    const n = Math.min(have, count);
    if (n <= 0) { audio.deny(); return 0; }
    const sum = n * karsikoyPrice(pid) * famBonus();
    state.inventory[pid] -= n;
    state.money += sum;
    state.dayEarned += sum;
    state.totalEarned += sum;
    audio.cash();
    checkWealth();
    ui.refreshMoney();
    save();
    return sum;
  }

  // Elfmeter-Duell gegen die Karşıköy Gençlik (Treffer kommen aus der UI)
  function macResult(goals) {
    const M = CFG.karsikoy.mac;
    const opp = Math.floor(Math.random() * (M.oppMax + 1));
    const won = goals > opp;
    if (won) {
      state.money += M.prize;
      state.dayEarned += M.prize;
      state.totalEarned += M.prize;
      state.macWins += 1;
      addRep(M.rep);
      audio.tierUp();
    } else {
      state.money = Math.max(0, state.money - M.stake);
      state.daySpent += M.stake;
      audio.deny();
    }
    ui.refreshMoney();
    save();
    return { goals, opp, won };
  }

  // ---------- v11: Heli-Aufträge, Zucht, Logistik, Plantage, Ezan ----------
  let heliJob = null;        // {type, stage, points, label}
  let heliJobAt = -1;

  function planHeliJob() {
    heliJob = null;
    heliJobAt = state.heli && Math.random() < CFG.heliJobs.chance
      ? CFG.dayLengthSec * (0.15 + Math.random() * 0.45) : -1;
  }

  function spawnHeliJob(forceType = null) {
    const HJ = CFG.heliJobs;
    const type = forceType || (Math.random() < 0.6 ? 'rescue' : 'express');
    if (type === 'rescue') {
      const i = Math.floor(Math.random() * HJ.rescue.spots.length);
      heliJob = { type, stage: 0, points: [HJ.rescue.spots[i]], spotIdx: i };
      ui.toast(t('heliRescue', t('heliSpot' + i)), true, 10000);
    } else {
      heliJob = { type, stage: 0, points: [HJ.express.from, HJ.express.to] };
      ui.toast(t('heliExpress'), true, 10000);
    }
    audio.orderDone();
  }

  function updateHeliJobs(dt) {
    if (!state.heli) return;
    if (!heliJob && heliJobAt >= 0 && state.timeSec >= heliJobAt) {
      heliJobAt = -1;
      spawnHeliJob();
    }
    if (!heliJob || !mods.heli || !mods.heli.driving || !mods.heli.grounded()) return;
    const p = heliJob.points[heliJob.stage];
    const hp = mods.heli.pos;
    if (Math.hypot(hp.x - p.x, hp.z - p.z) > CFG.heliJobs.landRadius) return;
    heliJob.stage += 1;
    if (heliJob.stage < heliJob.points.length) {
      audio.pickDone();
      ui.toast(t('heliPickup'), true, 7000);
      return;
    }
    const spec = heliJob.type === 'rescue' ? CFG.heliJobs.rescue : CFG.heliJobs.express;
    heliJob = null;
    state.money += spec.pay;
    state.dayEarned += spec.pay;
    state.totalEarned += spec.pay;
    state.heliJobsDone += 1;
    addRep(spec.rep);
    audio.tierUp();
    ui.toast(t('heliJobDone', fmtMoney(spec.pay, state.settings.lang)), true, 9000);
    ui.refreshMoney();
    save();
  }

  function assignAnimalName(type) {
    const pool = CFG.breeding.names;
    const used = state.animalNames[type] = state.animalNames[type] || [];
    const free = pool.filter(n => !used.includes(n));
    const name = free.length ? free[Math.floor(Math.random() * free.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    used.push(name);
    return name;
  }

  function buyOrchard() {
    if (state.orchard || state.money < CFG.orchard.cost) { audio.deny(); return false; }
    state.money -= CFG.orchard.cost;
    state.daySpent += CFG.orchard.cost;
    state.orchard = true;
    if (mods.orchard) mods.orchard.syncOwned();
    audio.plant();
    ui.toast(t('orchardBought'), true, 7000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function setLogi(rule, v) {
    if (!(rule in state.logi)) return false;
    state.logi[rule] = !!v;
    audio.buy();
    save();
    return true;
  }

  // ---------- v12: Foto-Missionen, Gulet, Meisterschaft, Konak, Katzen, JV ----------
  let photoMission = null;   // Ziel-Id aus CFG.photoMissions.targets

  function planPhotoMission() {
    photoMission = null;
    if (Math.random() < CFG.photoMissions.chance) {
      const T2 = CFG.photoMissions.targets;
      photoMission = T2[Math.floor(Math.random() * T2.length)];
      setTimeout(() => ui.toast(t('photoMission', t('photo_' + photoMission)), false, 10000), 6000);
    }
  }

  // Wird von main bei jedem Foto (C im Fotomodus) aufgerufen
  function photoTaken(camPos, camDir) {
    // v17: gebuchte Werbekampagne — Foto vom Teefeld oder der Fabrik
    if (state.campaign === 'shoot') {
      const F = CFG.field;
      const nearField = Math.hypot(camPos.x - F.cx, camPos.z - F.cz) < 55;
      const nearFactory = Math.hypot(camPos.x - CFG.factory.x, camPos.z - CFG.factory.z) < 25;
      if (nearField || nearFactory) {
        state.campaign = 'pending';
        audio.tierUp();
        ui.toast(t('campaignShot'), true, 9000);
        save();
        return true;
      }
    }
    if (!photoMission) return false;
    const S = CFG.selale;
    let hit = false;
    if (photoMission === 'selale') {
      hit = Math.hypot(camPos.x - S.x, camPos.z - S.z) < 35;
    } else if (photoMission === 'dolphins') {
      hit = boat.dolphinsVisible;
    } else if (photoMission === 'fireworks') {
      hit = isFestival() && isNight();
    } else if (photoMission === 'sunset') {
      hit = sky.hour >= 18.7 && sky.hour <= 20.3 && camDir.dot(sky.sunDir) > 0.4;
    } else if (photoMission === 'istanbul') {
      hit = istanbulMode;
    }
    if (!hit) return false;
    const P = CFG.photoMissions;
    photoMission = null;
    state.photoMissionsDone += 1;
    state.money += P.pay;
    state.dayEarned += P.pay;
    state.totalEarned += P.pay;
    addRep(P.rep);
    audio.tierUp();
    ui.toast(t('photoDone', fmtMoney(P.pay, state.settings.lang)), true, 8000);
    ui.refreshMoney();
    save();
    return true;
  }

  function buyGulet() {
    if (state.gulet || state.money < CFG.gulet.cost) { audio.deny(); return false; }
    state.money -= CFG.gulet.cost;
    state.daySpent += CFG.gulet.cost;
    state.gulet = true;
    if (mods.gulet) mods.gulet.syncOwned();
    audio.tierUp();
    ui.toast(t('guletBought'), true, 8000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function startMeister() {
    if (state._meisterDone || !isFestival() || state.rep < CFG.meister.minRep
        || state.money < CFG.meister.entry) { audio.deny(); return false; }
    state.money -= CFG.meister.entry;
    state.daySpent += CFG.meister.entry;
    state._meisterDone = true;
    ui.refreshMoney();
    return true;
  }

  function meisterResult(avg) {
    const opp = 0.55 + Math.random() * 0.3;
    const won = avg > opp;
    if (won) {
      state.money += CFG.meister.prize;
      state.dayEarned += CFG.meister.prize;
      state.totalEarned += CFG.meister.prize;
      if (!state.sampiyon) addRep(CFG.meister.rep);
      state.sampiyon = true;
      audio.tierUp();
    } else {
      audio.deny();
    }
    ui.refreshMoney();
    save();
    return { won, avg: Math.round(avg * 100), opp: Math.round(opp * 100) };
  }

  function restoreKonak() {
    const cost = CFG.konak.stages[state.konak];
    if (cost == null || state.money < cost) { audio.deny(); return false; }
    state.money -= cost;
    state.daySpent += cost;
    state.konak += 1;
    if (mods.konak) mods.konak.syncStage();
    audio.harvest();
    ui.toast(state.konak >= 3 ? t('konakDone') : t('konakStage', state.konak), true, 8000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  function feedCat() {
    if (!mods.cats) return false;
    if (Math.floor(state.inventory.hamsi) < 1) {
      ui.toast(t('catHungry'), false, 4000);
      audio.meow && audio.meow();
      return false;
    }
    if (!mods.cats.feedNearest(player.pos.x, player.pos.z)) return false;
    state.inventory.hamsi -= 1;
    state.catFeeds += 1;
    audio.purr ? audio.purr() : audio.buy();
    ui.toast(t('catFed', state.catFeeds), true, 5000);
    if (state.catFeeds === CFG.cats.feedGoal) {
      addRep(CFG.cats.feedRep);
      ui.toast(t('catFriend'), true, 8000);
      audio.tierUp();
    }
    save();
    return true;
  }

  function buyJointVenture() {
    if (state.jointVenture || !state.kemalPeace || !state.factory
        || state.money < CFG.jointVenture.cost) { audio.deny(); return false; }
    state.money -= CFG.jointVenture.cost;
    state.daySpent += CFG.jointVenture.cost;
    state.jointVenture = true;
    audio.tierUp();
    ui.toast(t('jvDone'), true, 9000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- v13: Dorf-Ausbau übers Muhtarlık ----------
  function buyVillage(id) {
    const P = CFG.village.projects[id];
    if (!P || state.village[id] !== 0) { audio.deny(); return false; }
    if (state.rep < CFG.village.minRep) {
      ui.toast(t('villageNeedRep', CFG.village.minRep), false, 5000);
      audio.deny();
      return false;
    }
    if (state.money < P.cost) { audio.deny(); return false; }
    state.money -= P.cost;
    state.daySpent += P.cost;
    state.village[id] = 1;
    state.villageDays[id] = P.days;
    if (mods.village) mods.village.sync();
    audio.harvest();
    ui.toast(t('villageFinanced', t('vproj_' + id)), true, 7000);
    checkWealth();
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- v14: Jahres-Events, Kurye, Dede, Arcade, Ada, Wahl, Story 3 ----------
  function yearEventIs(id) { return state.yearEvent && state.yearEvent.id === id; }

  function rollYearEvent() {
    const list = CFG.yearEvents.list;
    const id = list[Math.floor(Math.random() * list.length)];
    state.yearEvent = { id, daysLeft: CFG.yearEvents.cycleDays };
    setTimeout(() => ui.toast(t('yearEvent_' + id), false, 11000), 3000);
  }

  // --- Kurye (Lieferservice) ---
  function spawnKuryeJob() {
    const T = CFG.kurye.targets;
    const tgt = T[Math.floor(Math.random() * T.length)];
    state._kuryeJob = { id: tgt.id, x: tgt.x, z: tgt.z, stage: 'pick', t0: state.timeSec };
    ui.toast(t('kuryeNew', t('kuryeT_' + tgt.id)), true, 9000);
    audio.pickDone();
  }
  function kuryePickup() {
    const j = state._kuryeJob;
    if (!j || j.stage !== 'pick') return;
    j.stage = 'drop';
    j.t0 = state.timeSec;
    audio.harvest();
    ui.toast(t('kuryeGo', t('kuryeT_' + j.id)), true, 7000);
  }
  function kuryeDeliver() {
    const j = state._kuryeJob;
    if (!j || j.stage !== 'drop') return;
    const K = CFG.kurye;
    const el = state.timeSec - j.t0;
    const tip = Math.max(0, Math.round((K.maxTime - el) * K.tipPerSec));
    const pay = K.basePay + tip;
    state.money += pay; state.dayEarned += pay; state.totalEarned += pay;
    state.kuryeDone += 1;
    state._kuryeCount = (state._kuryeCount || 0) + 1;
    state._kuryeJob = null;
    if (tip > 0) addRep(1);
    audio.cash();
    ui.toast(t('kuryeDone', fmtMoney(pay, state.settings.lang), tip), true, 8000);
    ui.refreshMoney();
    save();
  }

  // --- Dede-Erinnerungen ---
  function foundMemory(i) {
    if (state.memories.includes(i)) return false;
    state.memories.push(i);
    if (mods.memories) mods.memories.sync();
    audio.tierUp();
    player.releaseLock();
    ui.showMemory(i, state.memories.length, CFG.dede.spots.length);
    if (state.memories.length >= CFG.dede.spots.length && !state.dedeHarman) {
      state.dedeHarman = true;
      addRep(5);
      setTimeout(() => ui.toast(t('dedeUnlock'), true, 11000), 1200);
    }
    save();
    return true;
  }

  // --- Arcade ---
  function arcadeStart() {
    if (state.money < CFG.arcade.stake) { audio.deny(); return false; }
    state.money -= CFG.arcade.stake;
    state.daySpent += CFG.arcade.stake;
    ui.refreshMoney();
    return true;
  }
  function arcadeResult(score) {
    const A = CFG.arcade;
    let pay = score * A.perPoint;
    const opp = 8 + Math.floor(Math.random() * 10);
    const won = score > opp;
    if (won && !state._arcadeDone) { pay += A.duelPrize; state._arcadeDone = true; }
    state.money += pay; state.dayEarned += pay; state.totalEarned += pay;
    if (score > state.arcadeBest) state.arcadeBest = score;
    if (pay > 0) audio.cash(); else audio.deny();
    ui.refreshMoney();
    save();
    return { pay, opp, won, best: state.arcadeBest };
  }

  // --- Ada ---
  function adaRestore() {
    const L2 = CFG.ada.lighthouse;
    const cost = L2.stages[state.ada.light];
    if (cost == null || state.money < cost) { audio.deny(); return false; }
    state.money -= cost;
    state.daySpent += cost;
    state.ada.light += 1;
    if (mods.ada) mods.ada.sync();
    if (state.ada.light >= 2) { addRep(L2.rep); ui.toast(t('adaLightDone'), true, 9000); audio.tierUp(); }
    else { ui.toast(t('adaLightStage'), true, 7000); audio.harvest(); }
    checkWealth(); ui.refreshMoney(); save();
    return true;
  }
  function adaCave() {
    if (state.ada.cave) { audio.deny(); return false; }
    state.ada.cave = true;
    const loot = CFG.ada.cave.loot;
    state.money += loot; state.dayEarned += loot; state.totalEarned += loot;
    if (mods.ada) mods.ada.sync();
    audio.cash();
    ui.toast(t('adaCave', fmtMoney(loot, state.settings.lang)), true, 9000);
    ui.refreshMoney(); save();
    return true;
  }
  function adaFish() {
    if (!state.rod || state._adaFish) { audio.deny(); return false; }
    state._adaFish = true;
    const n = 2 + Math.floor(Math.random() * 3);
    state.inventory.kalkan += n;
    audio.harvest();
    ui.toast(t('adaFish', n), true, 7000);
    save();
    return true;
  }
  function adaHoney() {
    if (state._adaHoney) { audio.deny(); return false; }
    state._adaHoney = true;
    state.inventory.honey += CFG.ada.honey.perVisit;
    audio.harvest();
    ui.toast(t('adaHoney', CFG.ada.honey.perVisit), true, 7000);
    save();
    return true;
  }

  // --- Story 3: das Kartell ---
  function story3Choose(path) {
    state.story3 = { ch: 2, path, done: false };
    ui.toast(t(path === 'jandarma' ? 'story3ObjJandarma' : 'story3ObjKacak'), true, 11000);
    save();
  }
  function story3Ship() {
    const S3 = CFG.story3;
    const st = state.story3;
    if (st.ch !== 2) return false;
    if (st.path === 'kacak') {
      if (Math.floor(state.inventory.tea_pack) < S3.packCost) {
        ui.toast(t('story3NeedPacks', S3.packCost), false, 6000);
        audio.deny();
        return false;
      }
      state.inventory.tea_pack -= S3.packCost;
      state.money += S3.kacakPay[0]; state.dayEarned += S3.kacakPay[0]; state.totalEarned += S3.kacakPay[0];
      ui.toast(t('story3KacakDone', fmtMoney(S3.kacakPay[0], state.settings.lang)), true, 9000);
    } else {
      state.money += S3.jandarmaPay[0]; state.dayEarned += S3.jandarmaPay[0]; state.totalEarned += S3.jandarmaPay[0];
      addRep(3);
      ui.toast(t('story3JandarmaDone', fmtMoney(S3.jandarmaPay[0], state.settings.lang)), true, 9000);
    }
    st.ch = 3;
    audio.cash();
    ui.refreshMoney();
    save();
    return true;
  }

  // ---------- v15: Frachter, Panayır, Bergwerk, Hochzeit, Kemal-KI, Falke, Brücke ----------
  function buyFreighter() {
    if (state.freighter || state.money < CFG.freighter.cost) { audio.deny(); return false; }
    state.money -= CFG.freighter.cost;
    state.daySpent += CFG.freighter.cost;
    state.freighter = true;
    if (mods.freighter) mods.freighter.syncOwned();
    audio.tierUp();
    ui.toast(t('freightBought'), true, 9000);
    checkWealth(); ui.refreshMoney(); save();
    return true;
  }
  function shipFreight(route) {
    const F = CFG.freighter;
    const r = F.routes[route];
    const have = Math.floor(state.inventory.tea_pack);
    if (!r || state.shipment || have < 1) { audio.deny(); return false; }
    const packs = Math.min(F.maxPacks, have);
    state.inventory.tea_pack -= packs;
    state.shipment = { route, packs };
    if (mods.freighter) mods.freighter.syncOwned();
    audio.gondola();
    ui.toast(t('freightOut', packs, t('route_' + route)), true, 9000);
    save();
    return true;
  }

  function buyLot() {
    const P = CFG.panayir;
    if (state.money < P.lotTicket) { audio.deny(); return null; }
    state.money -= P.lotTicket;
    state.daySpent += P.lotTicket;
    const r = Math.random();
    let res;
    if (r < 0.4) { res = { kind: 'none' }; audio.deny(); }
    else if (r < 0.65) { state.inventory.honey += 3; res = { kind: 'honey', n: 3 }; audio.harvest(); }
    else if (r < 0.9) {
      state.money += 200; state.dayEarned += 200; state.totalEarned += 200;
      res = { kind: 'money', n: 200 }; audio.cash();
    } else {
      state.money += 800; state.dayEarned += 800; state.totalEarned += 800;
      res = { kind: 'jackpot', n: 800 }; audio.tierUp();
    }
    ui.refreshMoney(); save();
    return res;
  }
  function kraftStart() {
    if (state._kraftDone || state.money < CFG.panayir.strengthStake) { audio.deny(); return false; }
    state.money -= CFG.panayir.strengthStake;
    state.daySpent += CFG.panayir.strengthStake;
    state._kraftDone = true;
    ui.refreshMoney();
    return true;
  }
  function kraftResult(scores) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const prize = avg > 0.82 ? CFG.panayir.strengthPrize
      : avg > 0.55 ? Math.round(CFG.panayir.strengthPrize * 0.4) : 0;
    if (prize > 0) {
      state.money += prize; state.dayEarned += prize; state.totalEarned += prize;
      audio.cash();
    } else audio.deny();
    ui.refreshMoney(); save();
    return { prize, bell: avg > 0.82 };
  }

  function mineStart() {
    if (state._mineDone) { ui.toast(t('mineAgain'), false, 4000); audio.deny(); return false; }
    state._mineDone = true;
    return true;
  }
  function mineReward(scores) {
    const M = CFG.mine;
    const coal = scores.filter((s) => s > 0.45).length * M.coalPerHit;
    state.inventory.coal += coal;
    let gem = false, injury = false;
    if (scores.some((s) => s > 0.9) && Math.random() < M.gemChance) {
      gem = true;
      state.money += M.gemValue; state.dayEarned += M.gemValue; state.totalEarned += M.gemValue;
    }
    if (Math.min(...scores) < 0.18) {
      injury = true;
      state.money = Math.max(0, state.money - M.injuryCost);
      state.daySpent += M.injuryCost;
      if (state.survival) state.energy = Math.max(0, state.energy - 15);
    }
    audio.harvest();
    ui.refreshMoney(); save();
    return { coal, gem, gemValue: M.gemValue, injury, injuryCost: M.injuryCost };
  }

  // --- Hochzeit ---
  const CATERING_NEED = { cheese: 2, honey: 2, tea_pack: 3 };
  function weddingContribute(item) {
    const need = CATERING_NEED[item];
    if (!need || state.wedding.catering >= 3 || Math.floor(state.inventory[item] || 0) < need) {
      audio.deny();
      return false;
    }
    state.inventory[item] -= need;
    state.wedding.catering += 1;
    audio.buy();
    save();
    return true;
  }
  function weddingPlan() {
    const d = state.day;
    state.wedding.stage = 1;
    state.wedding.day = d % CFG.seasonDays === 0 ? d + CFG.seasonDays : d + (CFG.seasonDays - d % CFG.seasonDays);
    ui.toast(t('weddingSet', state.wedding.day), true, 10000);
    save();
  }
  function weddingJoin() {
    if (state._weddingJoined) { audio.deny(); return false; }
    state._weddingJoined = true;
    const taki = CFG.wedding.taki[state.wedding.catering] || CFG.wedding.taki[0];
    state.money += taki; state.dayEarned += taki; state.totalEarned += taki;
    addRep(4);
    audio.tierUp();
    ui.toast(t('weddingTaki', fmtMoney(taki, state.settings.lang)), true, 11000);
    ui.refreshMoney(); save();
    return true;
  }

  // --- Kemal-KI: ein Zug pro Tag ---
  function kemalMove() {
    if (state.kemalPeace && Math.random() < 0.5) return;   // Frieden: oft Ruhe
    const r = Math.random();
    if (r < 0.35) {
      state._kemalDump = true;
      setTimeout(() => ui.toast(t('kemalMoveDump'), false, 8000), 8000);
    } else if (r < 0.6) {
      state.kemalPressure = Math.min(12, state.kemalPressure + CFG.kemalAI.pressurePerMove);
      setTimeout(() => ui.toast(t('kemalMoveField'), false, 8000), 8000);
    }
    // sonst: Ruhetag
  }

  // --- Falke ---
  function falconFeed() {
    if (state.falcon.tame) { audio.deny(); return false; }
    if (Math.floor(state.inventory.hamsi) < 1) {
      ui.toast(t('falconHungry'), false, 5000);
      audio.deny();
      return false;
    }
    state.inventory.hamsi -= 1;
    state.falcon.feeds += 1;
    if (state.falcon.feeds >= CFG.falcon.feedsNeeded) {
      state.falcon.tame = true;
      addRep(2);
      audio.tierUp();
      ui.toast(t('falconTame'), true, 11000);
    } else {
      audio.harvest();
      ui.toast(t('falconFed', state.falcon.feeds, CFG.falcon.feedsNeeded), true, 6000);
    }
    save();
    return true;
  }
  function octantName(dx, dz) {
    const a = Math.atan2(dx, -dz);   // Norden = -z
    const oct = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
    return t('dir_' + oct);
  }
  function falconHintTick(dt) {
    if (!state.falcon.tame) return;
    state._falconHint = (state._falconHint || 0) + dt;
    if (state._falconHint < 110) return;
    state._falconHint = 0;
    let best = null, bd = 1e9;
    CFG.dede.spots.forEach((s, i) => {
      if (state.memories.includes(i)) return;
      const d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z);
      if (d < bd) { bd = d; best = s; }
    });
    if (best) {
      ui.toast(t('falconHint', octantName(best.x - player.pos.x, best.z - player.pos.z)), false, 8000);
      audio.gull && audio.gull();
    }
  }

  function buildBridge() {
    if (state.bridge || state.money < CFG.bridge.cost) { audio.deny(); return false; }
    state.money -= CFG.bridge.cost;
    state.daySpent += CFG.bridge.cost;
    state.bridge = true;
    if (mods.bridge) mods.bridge.sync();
    addRep(3);
    audio.tierUp();
    ui.toast(t('bridgeDone'), true, 10000);
    checkWealth(); ui.refreshMoney(); save();
    return true;
  }

  // ==================== v17: Imperium sichtbar ====================
  // --- Fabrik-Produktionslinien ---
  function buyLine() {
    const F2 = CFG.factory2;
    const n = state.factoryLines;
    if (!state.factory || n >= F2.lineCosts.length || state.money < F2.lineCosts[n]) { audio.deny(); return false; }
    state.money -= F2.lineCosts[n];
    state.daySpent += F2.lineCosts[n];
    state.factoryLines = n + 1;
    if (mods.factoryext) mods.factoryext.sync();
    audio.tierUp();
    ui.toast(t('lineBought', state.factoryLines), true, 8000);
    checkWealth(); ui.refreshMoney(); save();
    return true;
  }

  // --- Land-Grab: Parzellen ---
  function buyParcel(i) {
    const P = CFG.parcels;
    if (state.parcels[i]) { audio.deny(); return false; }
    if (state.money < P.price) { audio.deny(); return false; }
    state.money -= P.price;
    state.daySpent += P.price;
    state.parcels[i] = 'me';
    if (mods.parcels) mods.parcels.sync();
    addRep(1);
    audio.cash();
    ui.toast(t('parcelBought'), true, 6000);
    checkWealth(); ui.refreshMoney(); save();
    return true;
  }

  function rivalClaimParcel() {
    const P = CFG.parcels;
    const free = [];
    for (let i = 0; i < P.spots.length; i++) if (!state.parcels[i]) free.push(i);
    if (!free.length) return;
    const idx = free[Math.floor(Math.random() * free.length)];
    const names = Object.keys(P.rivals);
    const rival = names[Math.floor(Math.random() * names.length)];
    state.parcels[idx] = rival;
    if (mods.parcels) mods.parcels.sync();
    setTimeout(() => ui.toast(t('parcelTaken', t('rival_' + rival)), false, 9000), 12000);
  }

  // --- Teebahn ---
  function buildRailway() {
    if (state.railway || state.money < CFG.railway.cost) { audio.deny(); return false; }
    state.money -= CFG.railway.cost;
    state.daySpent += CFG.railway.cost;
    state.railway = true;
    if (mods.railway) mods.railway.sync();
    addRep(4);
    audio.tierUp();
    ui.toast(t('railBuilt'), true, 10000);
    checkWealth(); ui.refreshMoney(); save();
    return true;
  }

  // --- Erdrutsch wegräumen ---
  function shovelScoop() {
    if (!state.landslide) return false;
    const power = 1 + (state.workers >= 4 ? 1 : 0);   // İmece: Arbeiter packen mit an
    state.landslide.left = Math.max(0, state.landslide.left - power);
    if (mods.landslide) {
      mods.landslide.dustPos(v3);
      particles.burst(v3, 14, camera.position);
      mods.landslide.sync();
    }
    audio.harvest();
    if (state.landslide.left <= 0) {
      state.landslide = null;
      if (mods.landslide) mods.landslide.sync();
      addRep(CFG.landslide.rep);
      audio.tierUp();
      ui.toast(t('landslideCleared'), true, 9000);
    }
    save();
    return true;
  }

  // --- Basar-Stand ---
  function buyStall() {
    if (state.stall || state.money < CFG.stall.cost) { audio.deny(); return false; }
    state.money -= CFG.stall.cost;
    state.daySpent += CFG.stall.cost;
    state.stall = { stock: {}, factor: 1, soldToday: 0, earnedToday: 0 };
    if (mods.stall) mods.stall.sync();
    audio.tierUp();
    ui.toast(t('stallBought'), true, 8000);
    checkWealth(); ui.refreshMoney(); save();
    return true;
  }

  function stallTotalStock() {
    return Object.values(state.stall ? state.stall.stock : {}).reduce((a, b) => a + b, 0);
  }

  function stallStock(id, n) {
    if (!state.stall) return false;
    const st = state.stall.stock;
    if (n > 0) {
      if (stallTotalStock() >= CFG.stall.maxStock || Math.floor(state.inventory[id] || 0) < n) { audio.deny(); return false; }
      state.inventory[id] -= n;
      st[id] = (st[id] || 0) + n;
    } else {
      if ((st[id] || 0) < -n) { audio.deny(); return false; }
      st[id] += n;
      state.inventory[id] -= n;
      if (st[id] <= 0) delete st[id];
    }
    if (mods.stall) mods.stall.sync();
    save();
    return true;
  }

  function stallCycleFactor() {
    if (!state.stall) return 1;
    const F = CFG.stall.factors;
    const i = F.indexOf(state.stall.factor);
    state.stall.factor = F[(i + 1) % F.length];
    save();
    return state.stall.factor;
  }

  // Ein Kunde steht am Tresen — kauft er?
  function stallCustomer() {
    if (!state.stall) return;
    const ids = Object.keys(state.stall.stock).filter((id) => state.stall.stock[id] > 0);
    if (!ids.length) return;
    const f = state.stall.factor;
    const chance = clamp(1.18 - f * 0.62 + state.rep * 0.002 + state.billboards * 0.03, 0.1, 0.95);
    if (Math.random() > chance) return;   // zu teuer — Kunde zieht weiter
    const id = ids[Math.floor(Math.random() * ids.length)];
    state.stall.stock[id] -= 1;
    if (state.stall.stock[id] <= 0) delete state.stall.stock[id];
    const sum = Math.round(CFG.products[id].sell * f * prestigeMul(CFG));
    state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
    state.stall.soldToday += 1;
    state.stall.earnedToday += sum;
    gainXp('trade', 1);
    if (mods.stall) mods.stall.sync();
    audio.cash();
    ui.refreshMoney();
  }

  // --- Imker-Meisterschaft ---
  function enterBeeCup() {
    const B = CFG.beeCup;
    if (state._beeCupDone) { audio.deny(); return null; }
    if (Math.floor(state.inventory.honey) < B.entryHoney) { ui.toast(t('beeNoHoney', B.entryHoney), false, 5000); audio.deny(); return null; }
    state.inventory.honey -= B.entryHoney;
    state._beeCupDone = true;
    const my = Math.round(40 + state.hives * 8 + (state.queen ? 16 : 0) + state.rep * 0.3 + Math.random() * 26);
    const opp = Math.round(56 + Math.random() * 24);
    const win = my > opp;
    if (win) {
      state.money += B.prize; state.dayEarned += B.prize; state.totalEarned += B.prize;
      state.beeCupWins += 1;
      addRep(B.rep);
      if (mods.beecup) mods.beecup.sync();
      audio.tierUp();
    } else audio.deny();
    ui.refreshMoney(); save();
    return { win, my, opp, prize: B.prize };
  }

  function buyQueen() {
    if (state.queen || state.money < CFG.beeCup.queenCost) { audio.deny(); return false; }
    state.money -= CFG.beeCup.queenCost;
    state.daySpent += CFG.beeCup.queenCost;
    state.queen = true;
    audio.cash();
    ui.toast(t('queenBought'), true, 8000);
    ui.refreshMoney(); save();
    return true;
  }

  // --- Foto-Kampagne -> Plakatwände ---
  function bookCampaign() {
    const B = CFG.billboards;
    if (!state.factory || state.campaign || state.billboards >= B.max || state.money < B.cost) { audio.deny(); return false; }
    state.money -= B.cost;
    state.daySpent += B.cost;
    state.campaign = 'shoot';
    audio.cash();
    ui.toast(t('campaignBooked'), true, 12000);
    ui.refreshMoney(); save();
    return true;
  }

  function doSelaleRest() {
    if (state._selaleDone) { ui.toast(t('selaleAgain'), false); audio.deny(); return false; }
    state._selaleDone = true;
    if (state.survival) state.energy = Math.min(100, state.energy + CFG.selale.restEnergy);
    audio.plant();
    ui.toast(t('selaleRest'), true, 7000);
    return true;
  }

  function ngpEligible() {
    return state.story >= 5 || state.wealthTier >= 5;
  }

  function newGamePlus() {
    if (!ngpEligible()) { audio.deny(); return false; }
    const keep = {
      money: Math.round(state.money * CFG.prestige.moneyKeep),
      ach: state.ach, name: state.playerName, label: state.label,
      outfit: state.outfit, prestige: state.prestige + 1,
      survival: state.survival
    };
    resetProgress();
    state.prestige = keep.prestige;
    state.money = keep.money;
    state.ach = keep.ach;
    state.playerName = keep.name;
    state.label = keep.label;
    state.outfit = keep.outfit;
    state.survival = keep.survival;
    state.introSeen = true;
    save();
    location.reload();
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
    if (mods.heli && mods.heli.driving) {
      if (mods.heli.grounded()) {
        mods.heli.exit();
        if (!ctx.isTouch) player.requestLock();
      } else {
        ui.toast(t('heliLand'), false, 2500);
      }
      return;
    }
    if (mods.sled && mods.sled.riding) {
      mods.sled.exit();
      if (!ctx.isTouch) player.requestLock();
      return;
    }
    if (boat.driving) {
      if (boat.fishingState !== 'idle') { boat.reel(); return; }
      // v7: Nachts am Schmugglerschiff — Kaçak-Deal (v14: Story-3-Mission zuerst)
      if (nearKacakShip()) {
        if (state.story3.ch === 2) { story3Ship(); return; }
        sellKacak();
        return;
      }
      // v8: Kayık-Rennen an der Startboje
      if (mods.race && mods.race.nearStart(boat.pos.x, boat.pos.z)) { mods.race.start(); return; }
      // Am Ufer: anlegen. Auf offener See: Netz schleppen oder angeln.
      if (boat.canExitHere()) {
        boat.exit();
        if (radio) radio.off(audio.ctx);
        if (!ctx.isTouch) player.requestLock();
      } else if (boat.canNet()) {
        boat.startNet();
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
    else if (act.id === 'workshop') { player.releaseLock(); ui.showWorkshop(); }
    else if (act.id === 'bazaar') { player.releaseLock(); ui.showIstanbul(); }
    else if (act.id === 'istReturn') returnIstanbul();
    else if (act.id === 'sled') mods.sled && mods.sled.enter();
    else if (act.id === 'tour') startTour();
    else if (act.id === 'heli') { if (mods.heli.enter()) audio.engineStart(); }
    else if (act.id === 'collect') collectItem();
    else if (act.id === 'sandbag') placeSandbag();
    else if (act.id === 'fishtourn') startFishTourn();
    else if (act.id === 'hivegame') { player.releaseLock(); ui.showHiveGame(); }
    else if (act.id === 'koymarket') { player.releaseLock(); ui.showKoyMarket(); }
    else if (act.id === 'mac') { player.releaseLock(); ui.showMac(); }
    else if (act.id === 'derby') startDerby();
    else if (act.id === 'halay') doHalay();
    else if (act.id === 'selale') doSelaleRest();
    else if (act.id === 'gulet') {
      if (mods.gulet.canTour()) mods.gulet.start();
      else ui.toast(t(state._guletDone ? 'guletTomorrow' : 'guletNeedRep', CFG.gulet.minRep), false, 5000);
    }
    else if (act.id === 'konak') { player.releaseLock(); ui.showKonak(); }
    else if (act.id === 'meister') { if (startMeister()) { player.releaseLock(); ui.showMeister(); } }
    else if (act.id === 'cat') feedCat();
    else if (act.id === 'muhtarlik') { player.releaseLock(); ui.showVillage(); }
    else if (act.id === 'kuryepick') kuryePickup();
    else if (act.id === 'kuryedrop') kuryeDeliver();
    else if (act.id === 'memory') foundMemory(act.data);
    else if (act.id === 'arcade') { player.releaseLock(); ui.showArcade(); }
    else if (act.id === 'adalight') adaRestore();
    else if (act.id === 'adacave') adaCave();
    else if (act.id === 'adafish') adaFish();
    else if (act.id === 'adahoney') adaHoney();
    else if (act.id === 'wedding') weddingJoin();
    else if (act.id === 'freighter') { player.releaseLock(); ui.showFreighter(); }
    else if (act.id === 'lot') { player.releaseLock(); ui.showLot(); }
    else if (act.id === 'kraft') { if (kraftStart()) { player.releaseLock(); ui.showKraft(); } }
    else if (act.id === 'mine') { if (mineStart()) { player.releaseLock(); ui.showMine(); } }
    else if (act.id === 'falcon') falconFeed();
    else if (act.id === 'bridgebuild') buildBridge();
    else if (act.id === 'landslide') shovelScoop();
    else if (act.id === 'parcel') buyParcel(act.data);
    else if (act.id === 'railbuild') buildRailway();
    else if (act.id === 'stallbuy') buyStall();
    else if (act.id === 'stallmanage') { player.releaseLock(); ui.showStall(); }
    else if (act.id === 'beecup') { player.releaseLock(); ui.showBeeCup(); }
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
    if (e.code === 'KeyN' && running && !paused) {
      if (ui.phoneOpen()) { ui.hideOverlays(); pause(false); }
      else if (!ui.overlayOpen()) { player.releaseLock(); ui.showPhone(); }
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
    // Nicht pausieren, wenn der Lock nur wegen Boot/Schlitten-Einstieg fällt
    if (!locked && running && !ui.overlayOpen() && !vehicles.driving
        && !boat.driving && !(mods.sled && mods.sled.riding)
        && !(mods.heli && mods.heli.driving)
        && !(mods.gulet && mods.gulet.touring)) pause(true);
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
    // v8: İstanbul hat seine eigenen Interaktionen
    if (istanbulMode) {
      const B = CFG.istanbul.bazaar, G = CFG.istanbul.gate;
      if (distTo(B.x, B.z - 2) < CFG.interactDist + 3) return { id: 'bazaar' };
      if (distTo(G.x, G.z) < CFG.interactDist + 2.5) return { id: 'istReturn' };
      return null;
    }
    if (mods.sled && mods.sled.nearSled(player.pos.x, player.pos.z)) return { id: 'sled' };
    if (state.properties.pansiyon && !tour
        && distTo(CFG.pension.x, CFG.pension.z) < CFG.interactDist + 2) return { id: 'tour' };
    // v10
    if (mods.collectibles && mods.collectibles.nearest(player.pos.x, player.pos.z)) return { id: 'collect' };
    if (floodToday && !floodDone && !state._sandbag
        && distTo(CFG.hut.x, CFG.hut.z) < CFG.interactDist + 4) return { id: 'sandbag' };
    if (isFestival() && !state._tournDone && !fishTourn
        && distTo(CFG.fishTourn.spot.x, CFG.fishTourn.spot.z) < CFG.interactDist + 2) return { id: 'fishtourn' };
    if (state.hives > 0 && !state._hiveDone && CFG.yayla.honeySeasons.includes(season())
        && distTo(CFG.yayla.x + 6, CFG.yayla.z + 2) < CFG.interactDist + 2) return { id: 'hivegame' };
    if (distTo(CFG.karsikoy.market.x, CFG.karsikoy.market.z) < CFG.interactDist + 1.5) return { id: 'koymarket' };
    if (distTo(CFG.karsikoy.pitch.x, CFG.karsikoy.pitch.z) < CFG.interactDist + 2) return { id: 'mac' };
    // v17
    if (mods.landslide && mods.landslide.near(player.pos.x, player.pos.z)) return { id: 'landslide' };
    if (mods.parcels) {
      const pi = mods.parcels.near(player.pos.x, player.pos.z);
      if (pi >= 0 && !state.parcels[pi]) return { id: 'parcel', data: pi };
    }
    if (mods.railway && mods.railway.nearSign(player.pos.x, player.pos.z)) return { id: 'railbuild' };
    if (mods.stall && mods.stall.near(player.pos.x, player.pos.z)) {
      return { id: state.stall ? 'stallmanage' : 'stallbuy' };
    }
    if (mods.beecup && !state._beeCupDone && mods.beecup.near(player.pos.x, player.pos.z)) return { id: 'beecup' };
    // v15
    if (mods.wedding && mods.wedding.active && !state._weddingJoined
        && mods.wedding.near(player.pos.x, player.pos.z)) return { id: 'wedding' };
    if (mods.freighter && mods.freighter.nearMooring(player.pos.x, player.pos.z)) return { id: 'freighter' };
    if (mods.panayir && mods.panayir.nearLot(player.pos.x, player.pos.z)) return { id: 'lot' };
    if (mods.panayir && !state._kraftDone && mods.panayir.nearKraft(player.pos.x, player.pos.z)) return { id: 'kraft' };
    if (mods.mine && !state._mineDone && mods.mine.near(player.pos.x, player.pos.z)) return { id: 'mine' };
    if (mods.falcon && Math.floor(state.inventory.hamsi) >= 1
        && mods.falcon.nearPerch(player.pos.x, player.pos.z)) return { id: 'falcon' };
    if (mods.bridge && mods.bridge.nearSign(player.pos.x, player.pos.z)) return { id: 'bridgebuild' };
    // v14
    const kj = state._kuryeJob;
    if (kj && kj.stage === 'pick' && distTo(CFG.hut.x, CFG.hut.z) < CFG.interactDist + 2) return { id: 'kuryepick' };
    if (kj && kj.stage === 'drop' && distTo(kj.x, kj.z) < CFG.interactDist + 3) return { id: 'kuryedrop' };
    if (mods.memories) {
      const mi = mods.memories.nearest(player.pos.x, player.pos.z);
      if (mi >= 0) return { id: 'memory', data: mi };
    }
    if (distTo(CFG.arcade.spot.x, CFG.arcade.spot.z) < CFG.interactDist + 1.5) return { id: 'arcade' };
    if (mods.ada && mods.ada.onIsland(player.pos.x, player.pos.z)) {
      if (state.ada.light < 2 && mods.ada.nearLight(player.pos.x, player.pos.z)) return { id: 'adalight' };
      if (!state.ada.cave && mods.ada.nearCave(player.pos.x, player.pos.z)) return { id: 'adacave' };
      if (state.rod && !state._adaFish && mods.ada.nearFish(player.pos.x, player.pos.z)) return { id: 'adafish' };
      if (!state._adaHoney && mods.ada.nearHoney(player.pos.x, player.pos.z)) return { id: 'adahoney' };
    }
    // v13
    if (mods.village && mods.village.nearMuhtar(player.pos.x, player.pos.z)) return { id: 'muhtarlik' };
    // v12
    if (mods.gulet && mods.gulet.nearMooring(player.pos.x, player.pos.z)) return { id: 'gulet' };
    if (mods.konak && state.konak < 3 && mods.konak.near(player.pos.x, player.pos.z)) return { id: 'konak' };
    if (isFestival() && !state._meisterDone && state.rep >= CFG.meister.minRep
        && distTo(CFG.city.x + 6, CFG.city.z + 6) < CFG.interactDist + 2) return { id: 'meister' };
    if (mods.cats && Math.floor(state.inventory.hamsi) >= 1
        && mods.cats.nearest(player.pos.x, player.pos.z)) return { id: 'cat' };
    // v9
    if (mods.heli && mods.heli.near(player.pos.x, player.pos.z)) return { id: 'heli' };
    if (!derby && distTo(CFG.derby.goal.x, CFG.derby.goal.z) < CFG.interactDist + 2) return { id: 'derby' };
    if (isFestival() && !state._halayDone
        && distTo(CFG.city.x - 2, CFG.city.z + 4) < CFG.interactDist + 2) return { id: 'halay' };
    if (mods.selale && mods.selale.nearRest(player.pos.x, player.pos.z)) return { id: 'selale' };
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
    if (distTo(CFG.workshop.x, CFG.workshop.z) < CFG.interactDist + 3) return { id: 'workshop' };
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

    // Zeit (v7: nach endHour beginnt die freiwillige Nacht bis night.endHour)
    state.timeSec += dt;
    const nightLen = CFG.dayLengthSec * (CFG.night.endHour - CFG.endHour) / (CFG.endHour - CFG.startHour);
    if (state.timeSec >= CFG.dayLengthSec + nightLen) {
      ui.toast(t('nightCollapse'), false, 7000);
      endDay();
      return;
    }
    if (state.timeSec >= CFG.dayLengthSec && !state._nightToast) {
      state._nightToast = true;
      ui.toast(t('nightStart'), true, 9000);
      audio.gondola();
    }
    boat.nightMode = isNight();
    boat.netSeasonWinter = season() === 2;   // v8: Hamsi-Akını im Winter

    // v11: Heli-Aufträge (muss VOR dem Heli-Early-Return laufen)
    updateHeliJobs(dt);

    // v15: Falken-Hinweise
    falconHintTick(dt);

    // v14: Kurye-Bestellungen trudeln tagsüber ein
    if (!state._kuryeJob && (state._kuryeCount || 0) < CFG.kurye.perDay
        && sky.hour > 8.5 && sky.hour < 16 && Math.random() < dt * 0.012) {
      spawnKuryeJob();
    }

    // v11: Ezan — bewusst dezent: kurzer Hinweis, das Dorf sammelt sich
    CFG.ezan.hours.forEach((h, i) => {
      const key = '_ezan' + i;
      if (!state[key] && sky.hour >= h && sky.hour < h + 0.5) {
        state[key] = true;
        ui.toast(t('ezanTime'), false, 6000);
        if (mods.npcs) mods.npcs.gather(CFG.ezan.gatherSec);
      }
    });

    // v12: Gulet-Tour — Autopilot mit Panoramakamera
    if (mods.gulet && mods.gulet.touring) {
      ui.setSpeed(null);
      ui.setCrosshairActive(false);
      ui.setPickProgress(0);
      ui.setPrompt(null, null);
      return;
    }

    // v8: Rodeln hat eigene Steuerung/Kamera
    if (mods.sled && mods.sled.riding) {
      ui.setSpeed(null);
      ui.setCrosshairActive(false);
      ui.setPickProgress(0);
      ui.setPrompt(t('prompt_sledExit'), () => doInteract());
      return;
    }

    // v9: Helikopterflug hat eigene Steuerung/Kamera
    if (mods.heli && mods.heli.driving) {
      ui.setSpeed(mods.heli.speedKmh());
      ui.setCrosshairActive(false);
      ui.setPickProgress(0);
      ui.setPrompt(mods.heli.grounded() ? t('prompt_exit') : t('prompt_heliFly'), () => doInteract());
      return;
    }

    // v9: Derby-Timer & Tor-Erkennung
    updateDerby(dt);

    // v10: Sel schlägt am Nachmittag zu
    if (floodToday && !floodDone && sky.hour >= CFG.flood.hitHour) {
      floodDone = true;
      floodHit();
    }
    // v10: Angel-Turnier auswerten
    if (fishTourn && state.timeSec >= fishTourn.end) endFishTourn();


    // v8: geführte Pansiyon-Tour
    if (tour) {
      const stops = CFG.pension.tour.stops;
      const st = stops[tour.i];
      if (distTo(st.x, st.z) < 9) {
        tour.i += 1;
        if (tour.i >= stops.length) {
          const P = CFG.pension.tour;
          state.money += P.pay; state.dayEarned += P.pay; state.totalEarned += P.pay;
          addRep(P.rep);
          audio.tierUp();
          ui.toast(t('tourDone', fmtMoney(P.pay, state.settings.lang)), true, 8000);
          ui.refreshMoney();
          save();
          tour = null;
        } else {
          audio.pickDone();
          ui.toast(t('tourNext', tour.i + 1, stops.length), true, 5000);
        }
      }
    }

    // v8: Radyo Karadeniz — Nachrichtenticker beim Fahren
    if ((vehicles.driving || boat.driving) && radio && radio.stationName()) {
      newsTimer -= dt;
      if (newsTimer <= 0) {
        newsTimer = 45 + Math.random() * 30;
        ui.toast('📻 ' + newsLine(), false, 6500);
      }
    }

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
      state._stormToday = true;   // v17: kann über Nacht die Straße verschütten
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
    // v12: Mikro-Wetterzonen — Gischtnebel an der Şelale, Frühdunst auf der Yayla
    let wantFog = fogMorning && sky.hour < 10.5 ? 0.009 : 0;
    {
      const MW = CFG.microWeather;
      if (distTo(CFG.selale.x, CFG.selale.z) < MW.selaleR) wantFog += MW.selaleFog;
      if (sky.hour < MW.yaylaFogUntil && distTo(CFG.yayla.x, CFG.yayla.z) < MW.yaylaR) wantFog += MW.yaylaFog;
    }
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
          : boat.netting ? t('prompt_netting')
          : nearKacakShip() ? t('prompt_kacak')
          : (mods.race && mods.race.nearStart(boat.pos.x, boat.pos.z)) ? t('prompt_race')
          : boat.canExitHere() ? t('prompt_exitBoat')
          : boat.canNet() ? t('prompt_net')
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
    joinKoop, sellKacak, nearKacakShip, repairVehicle, buyTuning, buyDog,
    newGamePlus, ngpEligible, isNight, seedPrice,
    returnIstanbul, bookVacation, setDecree, taxiCost, callTaxi,
    haggleSell, brewReward, buyNet, forecast, marketTips, newsLine, startTour,
    startDerby, buyMandira, buyRestaurant, buyHeli, doHalay, doSelaleRest,
    buyDolmus, placeSandbag, startFishTourn, collectItem, hiveReward,
    karsikoyPrice, sellKarsikoy, macResult, floodHit,
    buyOrchard, setLogi, spawnHeliJob,
    planPhotoMission, photoTaken, buyGulet, startMeister, meisterResult,
    buyLine, buyParcel, buildRailway, shovelScoop, buyStall, stallStock,
    stallCycleFactor, stallCustomer, enterBeeCup, buyQueen, bookCampaign,
    restoreKonak, feedCat, buyJointVenture, buyVillage,
    arcadeStart, arcadeResult, story3Choose, foundMemory, yearEventIs,
    adaRestore, adaCave, adaFish, adaHoney, spawnKuryeJob, kuryePickup, kuryeDeliver,
    buyFreighter, shipFreight, buyLot, kraftStart, kraftResult, mineStart, mineReward,
    weddingContribute, weddingPlan, weddingJoin, falconFeed, buildBridge,
    get photoMission() { return photoMission; },
    set photoMission(v) { photoMission = v; },
    get heliJob() { return heliJob; },
    get derby() { return derby; },
    get floodToday() { return floodToday; },
    get fishTourn() { return fishTourn; },
    get istanbulMode() { return istanbulMode; },
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
