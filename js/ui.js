// DOM-HUD, Menüs, Shop, Overlays
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, basketCapacity, save, resetProgress, hasSave, netWorth, seasonOf } from './state.js';

const SEASON_ICONS = ['☀️', '🍂', '❄️', '🌸'];
import { t, tUpgrade, setLang, getLang, applyDom } from './i18n.js';
import { fmtKg, fmtMoney, clamp } from './util.js';

const $ = (id) => document.getElementById(id);

export function createUI(ctx, hooks) {
  const els = {
    start: $('start-screen'), hud: $('hud'), shop: $('shop-screen'),
    pause: $('pause-screen'), day: $('day-screen'), season: $('season-screen'),
    farm: $('farm-screen'), market: $('market-screen'),
    dealer: $('dealer-screen'), manage: $('manage-screen'),
    travel: $('travel-screen'), factory: $('factory-screen'),
    superS: $('super-screen'), life: $('life-screen'),
    airportS: $('airport-screen'), eventS: $('event-screen'),
    svHud: $('survival-hud'),
    speed: $('hud-speed'), tier: $('hud-tier'), touch: $('touch-controls'),
    loadFill: $('load-fill'), loadLabel: $('load-label'),
    btnStart: $('btn-start'), btnContinue: $('btn-continue'),
    hudDay: $('hud-day'), hudClock: $('hud-clock'), hudWeather: $('hud-weather'),
    hudMoney: $('hud-money'), hudOrder: $('hud-order'),
    basketLabel: $('basket-label'), basketFill: $('basket-fill'), basketQuality: $('basket-quality'),
    ring: $('ch-ring'), dot: $('ch-dot'),
    prompt: $('interact-prompt'), marker: $('marker-hut'),
    toastStack: $('toast-stack'), popupLayer: $('popup-layer'), rainWarn: $('rain-warn'),
    sellInfo: $('sell-info'), btnSell: $('btn-sell'), upgradeList: $('upgrade-list')
  };

  const RING_LEN = 100.5;
  const v = new THREE.Vector3();

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  const api = {
    // ---------- Laden / Start ----------
    setProgress(p) {
      els.loadFill.style.width = Math.round(p * 100) + '%';
      els.loadLabel.textContent = Math.round(p * 100) + '%';
    },
    readyToStart() {
      els.btnStart.disabled = false;
      els.loadLabel.textContent = '✓';
      if (hasSave()) show(els.btnContinue);
    },

    hideStart() {
      hide(els.start); show(els.hud);
      api.refreshWealth();
      api.refreshSurvival();
      if (ctx.isTouch) els.touch.classList.remove('hidden');
    },

    // ---------- HUD ----------
    refreshClock(hour) {
      const h = Math.floor(hour), m = Math.floor((hour - h) * 60);
      els.hudClock.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      els.hudDay.textContent = SEASON_ICONS[seasonOf(state.day, CFG)] + ' ' + t('day') + ' ' + state.day;
      els.hudWeather.textContent = state.raining ? '🌧' : (hour >= 19 ? '🌆' : '☀');
    },
    refreshMoney() {
      els.hudMoney.textContent = fmtMoney(state.money, state.settings.lang);
    },
    refreshWealth() {
      els.tier.textContent = t('tierName' + state.wealthTier);
    },
    setSpeed(kmh) {
      if (kmh == null) {
        els.speed.classList.add('hidden');
        $('tbtn-gas').classList.add('hidden');
        $('tbtn-brake').classList.add('hidden');
      } else {
        els.speed.classList.remove('hidden');
        els.speed.innerHTML = Math.round(kmh) + '<small>' + t('kmh') + '</small>';
        if (ctx.isTouch) {
          $('tbtn-gas').classList.remove('hidden');
          $('tbtn-brake').classList.remove('hidden');
        }
      }
    },
    refreshBasket() {
      const cap = basketCapacity(CFG);
      const q = state.basketKg > 0 ? Math.round(100 * state.basketValueKg / state.basketKg) : 100;
      els.basketLabel.innerHTML = `<span>🧺 ${t('basket')}</span><span>${fmtKg(state.basketKg, state.settings.lang)} / ${cap} kg</span>`;
      const full = state.basketKg >= cap - 0.01;
      els.basketFill.style.width = clamp(state.basketKg / cap * 100, 0, 100) + '%';
      els.basketFill.classList.toggle('full', full);
      els.basketQuality.textContent = state.basketKg > 0 ? `${t('quality2')}: ${q} %` : '';
    },
    refreshOrder() {
      const done = state.orderRewarded;
      els.hudOrder.classList.toggle('done', done);
      els.hudOrder.textContent = done
        ? '✓ ' + t('orderProgress', Math.round(state.orderDelivered), state.orderTarget)
        : t('orderProgress', Math.round(state.orderDelivered * 10) / 10, state.orderTarget);
    },

    setCrosshairActive(active) {
      els.dot.setAttribute('r', active ? '3.4' : '2.2');
      els.dot.setAttribute('fill', active ? 'rgba(180,240,140,.95)' : 'rgba(255,255,255,.85)');
    },
    setPickProgress(p) {
      els.ring.style.strokeDashoffset = String(RING_LEN * (1 - p));
      els.ring.setAttribute('stroke', p > 0 ? 'rgba(180,240,140,.95)' : 'rgba(255,255,255,.9)');
    },
    setPrompt(text, action) {
      if (!text) { hide(els.prompt); els.prompt.onclick = null; return; }
      els.prompt.innerHTML = '<b>E</b>' + text;
      els.prompt.onclick = action || null;
      show(els.prompt);
    },
    setRainWarn(on) {
      els.rainWarn.textContent = t('rainWarn');
      els.rainWarn.classList.toggle('hidden', !on);
    },

    // Welt-Marker (Annahmestelle)
    updateMarker(camera) {
      const cap = basketCapacity(CFG);
      const wantVisible = state.basketKg >= cap * 0.35;
      if (!wantVisible) { hide(els.marker); return; }
      v.set(CFG.hut.x, 3.5, CFG.hut.z);
      const dist = camera.position.distanceTo(v);
      if (dist < 14) { hide(els.marker); return; }
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 0.93 || Math.abs(v.y) > 0.93) { hide(els.marker); return; }
      show(els.marker);
      els.marker.querySelector('em').textContent = t('hutMarker') + ' · ' + Math.round(dist) + ' m';
      els.marker.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + 'px';
      els.marker.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + 'px';
    },

    // ---------- Meldungen ----------
    toast(text, gold = false, dur = 3400) {
      const el = document.createElement('div');
      el.className = 'toast' + (gold ? ' gold' : '');
      el.textContent = text;
      els.toastStack.appendChild(el);
      while (els.toastStack.children.length > 3) els.toastStack.firstChild.remove();
      setTimeout(() => {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 420);
      }, dur);
    },

    pickPopup(worldPos, kg, late) {
      v.copy(worldPos).project(ctx.camera);
      if (v.z > 1) return;
      const el = document.createElement('div');
      el.className = 'pick-popup' + (late ? ' late' : '');
      el.textContent = `+${fmtKg(kg, state.settings.lang)} kg ${late ? '' : '★'}`;
      el.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + 'px';
      el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + 'px';
      els.popupLayer.appendChild(el);
      setTimeout(() => el.remove(), 1150);
    },

    // ---------- Overlays ----------
    overlayOpen() {
      return !els.shop.classList.contains('hidden')
        || !els.pause.classList.contains('hidden')
        || !els.day.classList.contains('hidden')
        || !els.season.classList.contains('hidden')
        || !els.farm.classList.contains('hidden')
        || !els.market.classList.contains('hidden')
        || !els.dealer.classList.contains('hidden')
        || !els.manage.classList.contains('hidden')
        || !els.travel.classList.contains('hidden')
        || !els.factory.classList.contains('hidden')
        || !els.superS.classList.contains('hidden')
        || !els.life.classList.contains('hidden')
        || !els.airportS.classList.contains('hidden')
        || !els.eventS.classList.contains('hidden');
    },
    manageOpen() { return !els.manage.classList.contains('hidden'); },
    lifeOpen() { return !els.life.classList.contains('hidden'); },
    hideOverlays() {
      hide(els.shop); hide(els.pause); hide(els.day); hide(els.season);
      hide(els.farm); hide(els.market); hide(els.dealer); hide(els.manage);
      hide(els.travel); hide(els.factory); hide(els.superS); hide(els.life);
      hide(els.airportS); hide(els.eventS);
    },

    // ---------- v4: Survival-HUD ----------
    refreshSurvival() {
      if (!state.survival) { els.svHud.classList.add('hidden'); return; }
      els.svHud.classList.remove('hidden');
      $('sv-hunger').style.width = Math.round(state.hunger) + '%';
      $('sv-energy').style.width = Math.round(state.energy) + '%';
    },

    // ---------- v4: Flughafen ----------
    showAirport() { api.renderAirport(); show(els.airportS); },
    renderAirport() {
      const L = state.settings.lang;
      const A = CFG.airport;
      els.airportS.querySelector('h2').textContent = t('airportTitle');
      const body = $('airport-body');
      body.innerHTML = `
        <div class="section-info">${t('airportHint')}</div>
        <div class="upgrade-item">
          <div class="u-icon">🕌</div>
          <div class="u-body"><div class="u-name">İstanbul</div>
          <div class="u-desc">${t('istanbulDesc')} · ~${A.flights.istanbul.hours} h</div></div>
          <button id="btn-fly-ist" ${hooks.canFlyIstanbul() ? '' : 'disabled'}>${fmtMoney(A.flights.istanbul.cost, L)}</button>
        </div>
        <div class="upgrade-item">
          <div class="u-icon">🇩🇪</div>
          <div class="u-body"><div class="u-name">Almanya — Gurbetçi</div>
          <div class="u-desc">${t('almanyaDesc')}${state.gurbetci > 0 ? ` · ${t('gurbetciCount', state.gurbetci)}` : ''}</div></div>
          <button id="btn-fly-alm" ${state.money >= A.flights.almanya.cost ? '' : 'disabled'}>${fmtMoney(A.flights.almanya.cost, L)}</button>
        </div>`;
      $('btn-fly-ist').addEventListener('click', () => hooks.flyIstanbul());
      $('btn-fly-alm').addEventListener('click', () => hooks.flyAlmanya());
    },
    showIstanbul() {
      const L = state.settings.lang;
      els.airportS.querySelector('h2').textContent = 'İstanbul — Kapalıçarşı';
      const body = $('airport-body');
      body.innerHTML = `<div class="section-info">${t('istanbulWelcome')}</div>`;
      let any = false;
      for (const pid of Object.keys(CFG.airport.istanbulPremium)) {
        const have = Math.floor(state.inventory[pid] || 0);
        if (have <= 0) continue;
        any = true;
        const price = Math.round(hooks.istanbulPrice(pid));
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${CFG.products[pid].icon}</div>
          <div class="u-body"><div class="u-name">${t('prod_' + pid)} × ${have} <span class="price-up">▲ ${t('premiumHere')}</span></div>
          <div class="u-desc">${fmtMoney(price, L)} / Stk</div></div>
          <button>${fmtMoney(have * price, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          hooks.sellIstanbul(pid, have);
          api.showIstanbul();
        });
        body.appendChild(row);
      }
      if (!any) body.innerHTML += `<div class="section-info">${t('cityNoGoods')}</div>`;
      show(els.airportS);
    },

    // ---------- v6: Tavla-Würfelduell (nutzt das Event-Overlay) ----------
    showTavla() {
      const L = state.settings.lang;
      $('event-icon').textContent = '🎲';
      $('event-title').textContent = t('tavlaTitle');
      $('event-text').textContent = t('tavlaIntro', state.tavlaWins);
      const box = $('event-choices');
      box.innerHTML = '';
      for (const stake of CFG.tavla.stakes) {
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.textContent = t('tavlaStake', fmtMoney(stake, L));
        b.disabled = state.money < stake;
        b.addEventListener('click', () => {
          const res = hooks.playTavla(stake);
          if (!res) return;
          $('event-text').innerHTML = res.rounds.map((r, i) =>
            `${t('tavlaRound', i + 1)}: 🧑 ${r[0]} — ${r[1]} 🎩`).join('<br>')
            + `<br><b>${res.draw ? t('tavlaDraw') : res.won ? t('tavlaWon', fmtMoney(stake, L)) : t('tavlaLost', fmtMoney(stake, L))}</b>`
            + `<br><i>„${t(res.won ? 'temelSore' : 'temelWin')}"</i>`;
          box.innerHTML = '';
          const again = document.createElement('button');
          again.className = 'big-btn';
          again.textContent = t('tavlaAgain');
          again.addEventListener('click', () => api.showTavla());
          const done = document.createElement('button');
          done.className = 'big-btn ghost';
          done.textContent = t('back');
          done.addEventListener('click', () => hooks.closeShop());
          box.append(again, done);
        });
        box.appendChild(b);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v5: Story-Karte (nutzt das Event-Overlay) ----------
    showStoryCard(chapterId, done) {
      $('event-icon').textContent = t('stIcon_' + chapterId);
      $('event-title').textContent = t('stTitle_' + chapterId);
      $('event-text').textContent = t('stText_' + chapterId);
      const box = $('event-choices');
      box.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.textContent = t('stContinue');
      b.addEventListener('click', () => { hide(els.eventS); done && done(); });
      box.appendChild(b);
      show(els.eventS);
    },

    // ---------- v4: Nachbarschafts-Ereignis ----------
    showEvent(ev, onChoice) {
      $('event-icon').textContent = t('evIcon_' + ev.id);
      $('event-title').textContent = t('evTitle_' + ev.id);
      $('event-text').textContent = t('evText_' + ev.id);
      const box = $('event-choices');
      box.innerHTML = '';
      for (const c of ev.choices) {
        const b = document.createElement('button');
        b.className = 'big-btn' + (c.id === ev.choices[0].id ? '' : ' ghost');
        b.textContent = t('evChoice_' + c.id);
        b.addEventListener('click', () => {
          hide(els.eventS);
          onChoice(c);
        });
        box.appendChild(b);
      }
      show(els.eventS);
    },

    // ---------- v3: Reisen ----------
    showTravel() { api.renderTravel(); show(els.travel); },
    renderTravel() {
      const L = state.settings.lang;
      els.travel.querySelector('h2').textContent = t('travelTitle');
      const list = $('travel-list');
      list.innerHTML = '';
      for (const [id, c] of Object.entries(CFG.travel.cities)) {
        const can = hooks.canTravel(id);
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${id === 'zonguldak' ? '⛏️' : id === 'eregli' ? '🍓' : '🥜'}</div>
          <div class="u-body"><div class="u-name">${t('city_' + id)} ${state.visited[id] ? '✓' : ''}</div>
          <div class="u-desc">${t('cityDesc_' + id)} · ~${c.hours} h</div></div>
          <button ${can ? '' : 'disabled'} data-id="${id}">${fmtMoney(c.cost, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => hooks.travelTo(id));
        list.appendChild(row);
      }
    },
    showTravelCity(cityId) {
      const L = state.settings.lang;
      els.travel.querySelector('h2').textContent = t('city_' + cityId);
      const list = $('travel-list');
      list.innerHTML = `<div class="section-info">${t('cityDesc_' + cityId)}</div>`;
      // Einkaufen
      for (const [gid, price] of Object.entries(CFG.travel.goods[cityId].buy)) {
        const owned = (gid === 'strawSeed' && state.unlocks.straw)
          || (gid === 'walnutSeed' && state.unlocks.walnut)
          || (gid === 'baston' && state.baston);
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">${gid === 'coal' ? '🪨' : gid === 'strawSeed' ? '🍓' : gid === 'walnutSeed' ? '🥜' : '🦯'}</div>
          <div class="u-body"><div class="u-name">${t('good_' + gid)}</div>
          <div class="u-desc">${t('goodDesc_' + gid)}</div></div>
          <button ${owned || state.money < price ? 'disabled' : ''}>${owned ? t('owned') + ' ✓' : fmtMoney(price, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyTravelGood(cityId, gid)) api.showTravelCity(cityId);
        });
        list.appendChild(row);
      }
      // Premium-Verkauf
      let anySell = false;
      for (const pid of Object.keys(CFG.travel.goods[cityId].premium || {})) {
        const have = Math.floor(state.inventory[pid] || 0);
        if (have <= 0) continue;
        anySell = true;
        const price = Math.round(hooks.cityPrice(cityId, pid));
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${CFG.products[pid].icon}</div>
          <div class="u-body"><div class="u-name">${t('prod_' + pid)} × ${have} <span class="price-up">▲ ${t('premiumHere')}</span></div>
          <div class="u-desc">${fmtMoney(price, L)} / Stk</div></div>
          <button>${fmtMoney(have * price, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          hooks.sellAtCity(cityId, pid, have);
          api.showTravelCity(cityId);
        });
        list.appendChild(row);
      }
      if (!anySell) {
        const d = document.createElement('div');
        d.className = 'section-info';
        d.textContent = t('cityNoGoods');
        list.appendChild(d);
      }
      show(els.travel);
    },

    // ---------- v3: Fabrik ----------
    showFactory() { api.renderFactory(); show(els.factory); },
    renderFactory() {
      const L = state.settings.lang;
      const body = $('factory-body');
      if (!state.factory) {
        body.innerHTML = `
          <div class="section-info">${t('factoryPitch')}</div>
          <button id="btn-buy-factory" class="big-btn" ${state.money < CFG.factory.cost ? 'disabled' : ''}>
            ${t('buy')} · ${fmtMoney(CFG.factory.cost, L)}</button>`;
        $('btn-buy-factory').addEventListener('click', () => { if (hooks.buyFactory()) api.renderFactory(); });
      } else {
        const packs = Math.floor(state.inventory.tea_pack);
        const coal = Math.floor(state.inventory.coal);
        const canPack = state.basketKg >= 1;
        body.innerHTML = `
          <div class="stat-list">
            <div>📦 ${t('packStock')} <b>${packs}</b></div>
            <div>🪨 ${t('coalStock')} <b>${coal}</b></div>
            <div>🏷️ ${t('yourLabel')} <b>${state.label || 'ÇAY VADİSİ'}</b></div>
            <div>${t('packedToday')} <b>${state.packedToday} 📦</b></div>
          </div>
          <button id="btn-pack" class="big-btn" ${canPack ? '' : 'disabled'}>
            ${t('packNow', Math.floor(state.basketKg))}</button>
          <h3>${t('styleTitle')}</h3>
          <div class="btn-row">
            <button class="big-btn style-btn ${state.teaStyle === 'siyah' ? '' : 'ghost'}" data-s="siyah">📦 ${t('style_siyah')}</button>
            <button class="big-btn style-btn ${state.teaStyle === 'yesil' ? '' : 'ghost'}" data-s="yesil" ${state.greenLine ? '' : 'disabled'}>🍵 ${t('style_yesil')}</button>
            <button class="big-btn style-btn ${state.teaStyle === 'beyaz' ? '' : 'ghost'}" data-s="beyaz" ${state.dedeBonus ? '' : 'disabled'}>🏵️ ${t('style_beyaz')}</button>
          </div>
          <div class="section-info">${t('styleInfo_' + state.teaStyle)}</div>
          ${!state.greenLine ? `<button id="btn-greenline" class="big-btn ghost" ${state.money < CFG.teaStyles.yesil.lineCost ? 'disabled' : ''}>
            ${t('buyGreenLine')} · ${fmtMoney(CFG.teaStyles.yesil.lineCost, L)}</button>` : ''}
          <div class="section-info">${t('factoryInfo')}</div>`;
        $('btn-pack').addEventListener('click', () => { if (hooks.packBasket()) api.renderFactory(); });
        body.querySelectorAll('.style-btn').forEach(b => b.addEventListener('click', () => {
          if (hooks.setTeaStyle(b.dataset.s)) api.renderFactory();
        }));
        const gl = $('btn-greenline');
        if (gl) gl.addEventListener('click', () => { if (hooks.buyGreenLine()) api.renderFactory(); });
      }
      const exp = $('export-list');
      exp.innerHTML = '';
      const flags = { DE: '🇩🇪', NL: '🇳🇱', AZ: '🇦🇿', JP: '🇯🇵', US: '🇺🇸' };
      state.exportOffers.forEach((o, i) => {
        const can = state.factory && Math.floor(state.inventory.tea_pack) >= o.qty;
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${flags[o.country] || '🌍'}</div>
          <div class="u-body"><div class="u-name">${t('exportOffer', o.qty, o.country)}</div>
          <div class="u-desc">${fmtMoney(o.price, L)} / 📦</div></div>
          <button ${can ? '' : 'disabled'}>${fmtMoney(o.qty * o.price, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (hooks.fulfillExport(i)) api.renderFactory();
        });
        exp.appendChild(row);
      });
      if (!state.exportOffers.length) exp.innerHTML = `<div class="section-info">${t('noOffers')}</div>`;
    },

    // ---------- v3: Supermarkt ----------
    showSuper() { api.renderSuper(); show(els.superS); },
    renderSuper() {
      const L = state.settings.lang;
      const body = $('super-body');
      const have = Math.floor(state.inventory.tea_pack);
      const price = Math.round(CFG.products.tea_pack.sell * CFG.supermarket.retailFactor * (state.marketMul.tea_pack || 1));
      if (!state.factory) {
        body.innerHTML = `<div class="section-info">${t('superNoFactory')}</div>`;
        return;
      }
      body.innerHTML = `
        <div class="section-info">${t('superInfo', state.label || 'ÇAY VADİSİ', fmtMoney(price, L))}</div>
        <div class="manage-count">📦 ${have}</div>
        <div class="btn-row">
          <button id="btn-super-1" class="big-btn" ${have < 1 ? 'disabled' : ''}>1 · ${fmtMoney(price, L)}</button>
          <button id="btn-super-all" class="big-btn" ${have < 1 ? 'disabled' : ''}>${t('sellAll')} · ${fmtMoney(have * price, L)}</button>
        </div>`;
      if (have >= 1) {
        $('btn-super-1').addEventListener('click', () => { hooks.sellSuper(1); api.renderSuper(); });
        $('btn-super-all').addEventListener('click', () => { hooks.sellSuper(have); api.renderSuper(); });
      }
      api.appendFoodRows(body);
    },

    // ---------- v3: Leben ----------
    _lifeTab: 'profile',
    showLife() { api.renderLife(); show(els.life); },
    renderLife() {
      for (const tb of ['profile', 'family', 'estate', 'stocks', 'bank']) {
        $('ltab-' + tb).classList.toggle('active', api._lifeTab === tb);
      }
      const L = state.settings.lang;
      const body = $('life-body');
      if (api._lifeTab === 'profile') {
        const colors = ['#6a7ba0', '#9a5f4a', '#5f8a5a', '#8a5f7d', '#b8963f', '#4a7d8a'];
        body.innerHTML = `
          <label class="life-label">${t('yourName')}</label>
          <input id="inp-name" class="life-input" maxlength="18" value="${state.playerName || ''}" placeholder="Çaycı">
          <label class="life-label">${t('yourLabel')}</label>
          <input id="inp-label" class="life-input" maxlength="18" value="${state.label || ''}" placeholder="ÇAY VADİSİ">
          <label class="life-label">${t('outfit')}</label>
          <div class="swatch-row">${colors.map(c =>
            `<button class="swatch ${state.outfit === c ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
          </div>
          <button id="btn-save-profile" class="big-btn">${t('saveProfile')}</button>
          <label class="life-label">${t('roleLabel')}</label>
          <div class="btn-row">${['farmer', 'worker', 'jandarma'].map(r =>
            `<button class="big-btn role-btn ${state.role === r ? '' : 'ghost'}" data-r="${r}">${t('role_' + r)}</button>`).join('')}
          </div>
          <div class="section-info">${t('roleInfo_' + state.role)}</div>
          <div class="section-info">${t('bastonState')}: <b>${state.baston ? t('owned') + ' ✓ (+8 %)' : t('bastonHint')}</b></div>
          <div class="section-info">${t('viewHint')}</div>`;
        body.querySelectorAll('.role-btn').forEach(b => b.addEventListener('click', () => {
          hooks.setRole(b.dataset.r);
          api.renderLife();
        }));
        body.querySelectorAll('.swatch').forEach(sw => sw.addEventListener('click', () => {
          state.outfit = sw.dataset.c;
          api.renderLife();
        }));
        $('btn-save-profile').addEventListener('click', () => {
          hooks.setIdentity($('inp-name').value, $('inp-label').value, state.outfit);
          api.toast(t('profileSaved'), true);
        });
      } else if (api._lifeTab === 'family') {
        const Lf = CFG.life;
        body.innerHTML = `
          <div class="manage-count">${state.married ? (state.child ? '👨‍👩‍👧' : '💑') : '🧍'}</div>
          <div class="section-info" style="text-align:center">${
            state.child ? t('famChild') : state.married ? t('famMarried') : t('famSingle')}</div>
          ${!state.married ? `<button id="btn-marry" class="big-btn" ${state.wealthTier >= Lf.weddingTier && state.money >= Lf.weddingCost ? '' : 'disabled'}>
              ${t('marryBtn')} · ${fmtMoney(Lf.weddingCost, L)}</button>
            <div class="section-info">${t('marryReq', t('tierName' + Lf.weddingTier))}</div>` : ''}
          ${state.married && !state.child ? `<button id="btn-child" class="big-btn" ${state.wealthTier >= Lf.childTier && state.money >= Lf.childCost ? '' : 'disabled'}>
              ${t('childBtn')} · ${fmtMoney(Lf.childCost, L)}</button>
            <div class="section-info">${t('marryReq', t('tierName' + Lf.childTier))}</div>` : ''}
          <div class="section-info">${t('famBonusInfo')}</div>`;
        const bm = $('btn-marry');
        if (bm) bm.addEventListener('click', () => { if (hooks.marry()) api.renderLife(); });
        const bc = $('btn-child');
        if (bc) bc.addEventListener('click', () => { if (hooks.haveChild()) api.renderLife(); });
      } else if (api._lifeTab === 'estate') {
        body.innerHTML = '';
        // Hausausbau
        {
          const lvl = state.homeLevel;
          const spec = CFG.homeLevels[lvl];
          const row = document.createElement('div');
          row.className = 'upgrade-item' + (spec ? '' : ' owned');
          row.innerHTML = `
            <div class="u-icon">${spec ? spec.icon : '🏡'}</div>
            <div class="u-body"><div class="u-name">${t('homeTitle')} — ${t('homeLvl' + lvl)}</div>
            <div class="u-desc">${spec ? t('homeNext' + (lvl + 1)) : t('homeMax')}</div></div>
            <button ${!spec || state.money < spec.cost ? 'disabled' : ''}>
              ${spec ? fmtMoney(spec.cost, L) : t('owned') + ' ✓'}</button>`;
          if (spec) row.querySelector('button').addEventListener('click', () => {
            if (hooks.buyHomeUpgrade()) api.renderLife();
          });
          body.appendChild(row);
        }
        for (const [id, p] of Object.entries(CFG.life.properties)) {
          const owned = state.properties[id];
          const row = document.createElement('div');
          row.className = 'upgrade-item' + (owned ? ' owned' : '');
          row.innerHTML = `
            <div class="u-icon">${p.icon}</div>
            <div class="u-body"><div class="u-name">${t('prop_' + id)}</div>
            <div class="u-desc">${t('rentPerDay', fmtMoney(p.rent, L))}</div></div>
            <button ${owned || state.money < p.cost ? 'disabled' : ''}>${owned ? t('owned') + ' ✓' : fmtMoney(p.cost, L)}</button>`;
          if (!owned) row.querySelector('button').addEventListener('click', () => {
            if (hooks.buyProperty(id)) api.renderLife();
          });
          body.appendChild(row);
        }
      } else if (api._lifeTab === 'bank') {
        const B = CFG.bank;
        let html = `<div class="section-info">${t('bankHint', Math.round(B.dailyInterest * 100))}</div>
          <div class="manage-count">${state.debt > 0 ? '💳 −' + fmtMoney(state.debt, L) : '✅'}</div>`;
        if (state.debt > 0) {
          html += `<button id="btn-repay" class="big-btn" ${state.money <= 0 ? 'disabled' : ''}>
            ${t('repayBtn', fmtMoney(Math.min(state.debt, state.money), L))}</button>`;
        } else {
          html += `<div class="btn-row">` + B.loans.map((amt, i) =>
            `<button class="big-btn loan-btn" data-i="${i}">${t('loanBtn')} ${fmtMoney(amt, L)}</button>`).join('') + `</div>`;
        }
        html += `<h3>${t('insuranceTitle')}</h3>
          <div class="section-info">${t('insuranceInfo', fmtMoney(B.insurancePerDay, L))}</div>
          <button id="btn-insure" class="big-btn ${state.insured ? '' : 'ghost'}">
            ${state.insured ? '🛡️ ' + t('insuranceOn') : t('insuranceOff')}</button>`;
        body.innerHTML = html;
        const rp = $('btn-repay');
        if (rp) rp.addEventListener('click', () => { hooks.repayLoan(); api.renderLife(); });
        body.querySelectorAll('.loan-btn').forEach(b => b.addEventListener('click', () => {
          hooks.takeLoan(parseInt(b.dataset.i, 10));
          api.renderLife();
        }));
        $('btn-insure').addEventListener('click', () => { hooks.toggleInsurance(); api.renderLife(); });
      } else {
        body.innerHTML = `<div class="section-info">${t('stockHint')}</div>`;
        for (const [id, s] of Object.entries(CFG.life.stocks)) {
          const price = state.stockPrices[id] || s.p0;
          const owned = state.stocks[id] || 0;
          const chg = price / s.p0 - 1;
          const row = document.createElement('div');
          row.className = 'upgrade-item';
          row.innerHTML = `
            <div class="u-icon">📈</div>
            <div class="u-body"><div class="u-name">${s.name}
              <span class="${chg >= 0 ? 'price-up' : 'price-down'}">${chg >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(chg * 100))} %</span></div>
            <div class="u-desc">${fmtMoney(price, L)} / ${t('stockUnit')} · ${t('stockOwned', owned)}</div></div>
            <div class="btn-mini-row">
              <button data-n="-10">−10</button><button data-n="-1">−1</button>
              <button data-n="1">+1</button><button data-n="10">+10</button>
            </div>`;
          row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
            hooks.tradeStock(id, parseInt(b.dataset.n, 10));
            api.renderLife();
          }));
          body.appendChild(row);
        }
      }
    },

    // ---------- v2: Hof ----------
    showFarm() { api.renderFarm(); show(els.farm); },
    renderFarm() {
      const L = state.settings.lang;
      const free = state.plots.filter(p => !p).length;
      $('farm-plots-info').textContent = t('freePlots', free, state.plots.length);
      const plantList = $('plant-list');
      plantList.innerHTML = '';
      for (const [id, c] of Object.entries(CFG.crops)) {
        const locked = c.lock && !state.unlocks[id];
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (locked ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">${locked ? '🔒' : c.icon}</div>
          <div class="u-body"><div class="u-name">${t('crop_' + id)}</div>
          <div class="u-desc">${locked ? t('cropLocked', t('city_' + c.lock)) : t('cropInfo', c.days, c.yield, c.sell)}</div></div>
          <button ${locked || state.money < c.seed || free === 0 ? 'disabled' : ''} data-id="${id}">
            ${fmtMoney(c.seed, L)}
          </button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (hooks.plantCrop(id)) api.renderFarm();
        });
        plantList.appendChild(row);
      }
      const animalList = $('animal-list');
      animalList.innerHTML = '';
      for (const [id, a] of Object.entries(CFG.animals)) {
        const n = state.animals[id] || 0;
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${a.icon}</div>
          <div class="u-body"><div class="u-name">${t('animal_' + id)} <span class="row-sub">${n} / ${a.max}</span></div>
          <div class="u-desc">${t('animalInfo', t('prod_' + a.product), a.perDay)}</div></div>
          <button ${state.money < a.cost || n >= a.max ? 'disabled' : ''} data-id="${id}">
            ${fmtMoney(a.cost, L)}
          </button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyAnimal(id)) api.renderFarm();
        });
        animalList.appendChild(row);
      }
    },

    // ---------- v2: Markt ----------
    showMarket() { api.renderMarket(); show(els.market); },
    renderMarket() {
      const L = state.settings.lang;
      const list = $('market-list');
      list.innerHTML = '';
      let any = false, total = 0;
      for (const [id, p] of Object.entries(CFG.products)) {
        const have = Math.floor(state.inventory[id] || 0);
        if (have <= 0) continue;
        any = true;
        const mul = state.marketMul[id] || 1;
        const price = Math.round(p.sell * mul);
        total += have * price;
        const trend = mul > 1.08 ? `<span class="price-up">▲ ${t('priceGood')}</span>`
          : mul < 0.92 ? `<span class="price-down">▼ ${t('priceBad')}</span>` : '';
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${p.icon}</div>
          <div class="u-body"><div class="u-name">${t('prod_' + id)} × ${have} ${trend}</div>
          <div class="u-desc">${fmtMoney(price, L)} / Stk</div></div>
          <button data-id="${id}">${fmtMoney(have * price, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          hooks.sellProduct(id, have);
          api.renderMarket();
        });
        list.appendChild(row);
      }
      if (!any) list.innerHTML = `<div class="section-info">${t('marketEmpty')}</div>`;
      const btn = $('btn-market-sellall');
      btn.textContent = t('sellAll') + (any ? ' · ' + fmtMoney(total, L) : '');
      btn.disabled = !any;
      api.appendFoodRows(list);
      // v5: Olta (Angel) kaufen
      if (!state.rod) {
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">🎣</div>
          <div class="u-body"><div class="u-name">${t('rodName')}</div>
          <div class="u-desc">${t('rodDesc')}</div></div>
          <button ${state.money < CFG.fishing.rodCost ? 'disabled' : ''}>${fmtMoney(CFG.fishing.rodCost, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyRod()) api.renderMarket();
        });
        list.appendChild(row);
      }
    },

    // Essstand (Survival): an Markt & Supermarkt angehängt
    appendFoodRows(container) {
      if (!state.survival) return;
      const L = state.settings.lang;
      const head = document.createElement('h3');
      head.textContent = t('foodSection');
      container.appendChild(head);
      for (const [id, f] of Object.entries(CFG.survival.foods)) {
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${f.icon}</div>
          <div class="u-body"><div class="u-name">${t('food_' + id)}</div>
          <div class="u-desc">${f.hunger ? '🍞 +' + f.hunger : ''} ${f.energy ? '⚡ +' + f.energy : ''}</div></div>
          <button ${state.money < f.cost ? 'disabled' : ''}>${fmtMoney(f.cost, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => hooks.buyFood(id));
        container.appendChild(row);
      }
    },

    // ---------- v2: Autohaus ----------
    showDealer() { api.renderDealer(); show(els.dealer); },
    renderDealer() {
      const L = state.settings.lang;
      const list = $('dealer-list');
      list.innerHTML = '';
      for (const [id, v] of Object.entries(CFG.vehicles)) {
        const owned = state.vehicles[id];
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">${v.icon}</div>
          <div class="u-body"><div class="u-name">${t('veh_' + id)}</div>
          <div class="u-desc">${t('vehDesc_' + id)}</div></div>
          <button ${owned || state.money < v.cost ? 'disabled' : ''} data-id="${id}">
            ${owned ? t('owned') + ' ✓' : fmtMoney(v.cost, L)}
          </button>`;
        if (!owned) {
          row.querySelector('button').addEventListener('click', () => {
            if (hooks.buyVehicle(id)) api.renderDealer();
          });
        }
        list.appendChild(row);
      }
      // v5: Tekne (Boot)
      {
        const owned = state.boat;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">${CFG.boat.icon}</div>
          <div class="u-body"><div class="u-name">${t('boatName')}</div>
          <div class="u-desc">${t('boatDesc')}</div></div>
          <button ${owned || state.money < CFG.boat.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.boat.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyBoat()) api.renderDealer();
        });
        list.appendChild(row);
      }
    },

    // ---------- v2: Betrieb ----------
    _manageTab: 'workers',
    showManage() { api.renderManage(); show(els.manage); },
    renderManage() {
      for (const tb of ['workers', 'storage', 'stats', 'quests', 'ach']) {
        $('tab-' + tb).classList.toggle('active', api._manageTab === tb);
      }
      const L = state.settings.lang;
      const body = $('manage-body');
      if (api._manageTab === 'workers') {
        const W = CFG.workers;
        body.innerHTML = `
          <div class="manage-count">👷 ${state.workers} / ${W.max}</div>
          <div class="section-info" style="text-align:center">${t('workerInfo', W.hireCost, W.wage)}</div>
          <div class="section-info" style="text-align:center">${t('workerToday', Math.round(state.workerKg * 10) / 10)}</div>
          <div class="btn-row">
            <button id="btn-hire" class="big-btn" ${state.workers >= W.max || state.money < W.hireCost ? 'disabled' : ''}>
              ${t('hireWorker')} · ${fmtMoney(W.hireCost, L)}</button>
            <button id="btn-fire" class="big-btn ghost" ${state.workers <= 0 ? 'disabled' : ''}>${t('fireWorker')}</button>
          </div>
          ${state.workerData.map((wd, i) => {
            let lvl = 0;
            for (let li = 0; li < CFG.workerLevelDays.length; li++) if ((wd.days || 0) >= CFG.workerLevelDays[li]) lvl = li;
            return `<div class="upgrade-item"><div class="u-icon">${i === 0 && state.sofor ? '🚚' : '👷'}</div>
              <div class="u-body"><div class="u-name">${CFG.workerNames[wd.name % CFG.workerNames.length]}
                ${'⭐'.repeat(lvl + 1)}</div>
              <div class="u-desc">${t('workerDays', wd.days || 0)}</div></div></div>`;
          }).join('')}
          ${!state.sofor && state.workers > 0 ? `<button id="btn-sofor" class="big-btn ghost"
              ${state.vehicles.pickup && state.money >= CFG.soforCost ? '' : 'disabled'}>
              ${t('soforBtn')} · ${fmtMoney(CFG.soforCost, L)}</button>
            <div class="section-info">${t('soforInfo')}</div>` : ''}`;
        $('btn-hire').addEventListener('click', () => { if (hooks.hireWorker()) api.renderManage(); });
        $('btn-fire').addEventListener('click', () => { if (hooks.fireWorker()) api.renderManage(); });
        const sb = $('btn-sofor');
        if (sb) sb.addEventListener('click', () => { if (hooks.promoteSofor()) api.renderManage(); });
      } else if (api._manageTab === 'storage') {
        let html = '';
        for (const [id, p] of Object.entries(CFG.products)) {
          const have = Math.floor(state.inventory[id] || 0);
          if (have <= 0) continue;
          html += `<div class="upgrade-item"><div class="u-icon">${p.icon}</div>
            <div class="u-body"><div class="u-name">${t('prod_' + id)}</div></div>
            <div style="font-weight:700">× ${have}</div></div>`;
        }
        body.innerHTML = html || `<div class="section-info">${t('storageEmpty')}</div>`;
      } else if (api._manageTab === 'quests') {
        const cur = hooks.storyCurrent();
        let html = '';
        const chapters = ['letter', 'tin', 'ingredients', 'brew', 'legacy'];
        chapters.forEach((id, i) => {
          const done = state.story > i;
          const active = state.story === i;
          html += `<div class="upgrade-item${done ? ' owned' : ''}">
            <div class="u-icon">${done ? '✅' : active ? '🎯' : '🔒'}</div>
            <div class="u-body"><div class="u-name">${i + 1}. ${t('stTitle_' + id)}</div>
            <div class="u-desc">${done ? t('questDone') : active ? t('stGoal_' + id) : '···'}</div></div>
          </div>`;
        });
        if (state.story >= 5) html += `<div class="section-info">🏆 ${t('questAllDone')}</div>`;
        body.innerHTML = html;
      } else if (api._manageTab === 'ach') {
        let html = `<div class="section-info">${t('achProgress', hooks.achCount(), hooks.achTotal())}</div>`;
        for (const [id, def] of Object.entries(hooks.achDefs())) {
          const got = !!state.ach[id];
          html += `<div class="upgrade-item${got ? '' : ' owned'}">
            <div class="u-icon">${got ? def.icon : '🔒'}</div>
            <div class="u-body"><div class="u-name">${t('ach_' + id)}</div>
            <div class="u-desc">${t('achDesc_' + id)}</div></div>
            ${got ? '<div style="font-size:20px">🏅</div>' : ''}
          </div>`;
        }
        body.innerHTML = html;
      } else {
        const share = hooks.playerShare();
        body.innerHTML = `<div class="stat-list">
          <div>${t('statNet')} <b>${fmtMoney(netWorth(CFG), L)}</b></div>
          <div>${t('statMoney')} <b>${fmtMoney(state.money, L)}</b></div>
          <div>${t('statDayEarned')} <b>${fmtMoney(state.dayEarned, L)}</b></div>
          <div>${t('statDaySpent')} <b>${fmtMoney(state.daySpent, L)}</b></div>
          <div>${t('statTotal')} <b>${fmtMoney(state.totalEarned, L)}</b></div>
        </div>
        <h3>${t('shareTitle')}</h3>
        <div class="section-info">${t('shareInfo', share, 100 - share)}${state.rivalDump ? ' · ⚠️ ' + t('rivalDumpShort') : ''}</div>
        <div class="share-bar"><div class="share-me" style="width:${share}%"></div></div>
        <div class="share-legend"><span>🏷️ ${state.label || 'ÇAY VADİSİ'}</span><span>Kemal Ağa</span></div>`;
      }
    },

    showShop() {
      api.renderShop();
      show(els.shop);
    },
    renderShop() {
      const L = state.settings.lang;
      const q = state.basketKg > 0 ? Math.round(100 * state.basketValueKg / state.basketKg) : 100;
      const sum = hooks.sellValue();
      els.sellInfo.innerHTML = state.basketKg > 0.01
        ? t('sellInfo', fmtKg(state.basketKg, L), q, fmtMoney(sum, L))
        : t('nothingToSell');
      els.btnSell.textContent = t('sellFor') + (state.basketKg > 0.01 ? ' · ' + fmtMoney(sum, L) : '');
      els.btnSell.disabled = state.basketKg <= 0.01;

      els.upgradeList.innerHTML = '';
      for (const [id, u] of Object.entries(CFG.upgrades)) {
        const owned = state.upgrades[id];
        const [name, desc] = tUpgrade(id);
        const lockedB2 = id === 'basket2' && !state.upgrades.basket1;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">${u.icon}</div>
          <div class="u-body"><div class="u-name">${name}</div><div class="u-desc">${desc}</div></div>
          <button ${owned || lockedB2 || state.money < u.cost ? 'disabled' : ''} data-id="${id}">
            ${owned ? t('owned') + ' ✓' : fmtMoney(u.cost, state.settings.lang)}
          </button>`;
        if (!owned) {
          row.querySelector('button').addEventListener('click', () => {
            if (hooks.buyUpgrade(id)) api.renderShop();
          });
        }
        els.upgradeList.appendChild(row);
      }
    },

    showPause() {
      $('btn-sound').textContent = state.settings.sound ? t('on') : t('off');
      $('btn-quality').textContent = t('q' + (state.settings.quality[0].toUpperCase() + state.settings.quality.slice(1)));
      $('btn-lang').textContent = { de: 'Deutsch', tr: 'Türkçe', en: 'English' }[getLang()];
      show(els.pause);
    },

    showDaySummary(extraLines = []) {
      const L = state.settings.lang;
      $('day-title').textContent = t('dayTitle', state.day);
      let html =
        `<div>${t('dayPicked')} <b>${fmtKg(state.dayKg, L)} kg</b></div>` +
        `<div>${t('dayEarned')} <b>${fmtMoney(state.dayEarned, L)}</b></div>`;
      for (const line of extraLines) {
        html += `<div>${t(line.k)}${line.sub ? ` <span class="row-sub">(${line.sub})</span>` : ''} <b>${line.v}</b></div>`;
      }
      html += `<div>${t('dayOrder')} <b>${state.orderRewarded ? t('dayYes') : t('dayNo')}</b></div>`;
      $('day-stats').innerHTML = html;
      $('btn-next-day').textContent = t('nextDay');
      show(els.day);
    },

    showSeason() {
      const L = state.settings.lang;
      const kgGoal = 120, moneyGoal = 3200;
      let medal = 0;
      if (state.totalKg >= kgGoal * 0.5 || state.totalEarned >= moneyGoal * 0.5) medal = 1;
      if (state.totalKg >= kgGoal * 0.8 || state.totalEarned >= moneyGoal * 0.8) medal = 2;
      if (state.totalKg >= kgGoal && state.totalEarned >= moneyGoal) medal = 3;
      $('season-medal').textContent = medal === 3 ? '🥇' : medal === 2 ? '🥈' : medal === 1 ? '🥉' : '🍂';
      $('season-title').textContent = t('seasonTitle', medal);
      $('season-stats').innerHTML =
        `<div>${t('seasonTotal')} <b>${fmtKg(state.totalKg, L)} kg</b></div>` +
        `<div>${t('seasonMoney')} <b>${fmtMoney(state.money, L)}</b></div>` +
        `<div>${t('statNet')} <b>${fmtMoney(netWorth(CFG), L)}</b></div>` +
        `<div>${t('seasonOrders')} <b>${state.ordersDone} / ${CFG.seasonDays}</b></div>` +
        `<div>${t('manageTitle')} <b>${t('tierName' + state.wealthTier)}</b></div>`;
      show(els.season);
    },

    applyLang() {
      applyDom();
      api.refreshMoney();
      api.refreshBasket();
      api.refreshOrder();
      api.refreshWealth();
    },

    // ---------- v2: Touch-Steuerung verdrahten ----------
    bindTouch(player, vehicles, boat) {
      const joy = $('joystick'), knob = $('joystick-knob');
      let joyId = null;
      const R = 46;
      function setKnob(dx, dy) {
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
      function handle(e) {
        for (const tch of e.changedTouches) {
          if (joyId !== null && tch.identifier !== joyId) continue;
          const r = joy.getBoundingClientRect();
          let dx = tch.clientX - (r.left + r.width / 2);
          let dy = tch.clientY - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          setKnob(dx, dy);
          const nx = dx / R, ny = dy / R;
          if (vehicles.driving) { vehicles.touchSteer = nx; }
          else if (boat && boat.driving) { boat.touchSteer = nx; }
          else { player.touchMove.x = nx; player.touchMove.y = ny; }
        }
      }
      joy.addEventListener('touchstart', (e) => {
        if (joyId === null) joyId = e.changedTouches[0].identifier;
        handle(e);
        e.preventDefault();
      }, { passive: false });
      joy.addEventListener('touchmove', (e) => { handle(e); e.preventDefault(); }, { passive: false });
      const reset = (e) => {
        for (const tch of e.changedTouches) {
          if (tch.identifier !== joyId) continue;
          joyId = null;
          setKnob(0, 0);
          player.touchMove.x = 0; player.touchMove.y = 0;
          vehicles.touchSteer = 0;
          if (boat) boat.touchSteer = 0;
        }
      };
      joy.addEventListener('touchend', reset);
      joy.addEventListener('touchcancel', reset);

      // Gas / Bremse (nur beim Fahren sichtbar)
      const bindPedal = (id, val) => {
        const b = $(id);
        b.addEventListener('touchstart', (e) => {
          vehicles.touchGas = val;
          if (boat) boat.touchGas = val;
          e.preventDefault();
        }, { passive: false });
        const off = (e) => { vehicles.touchGas = 0; if (boat) boat.touchGas = 0; e.preventDefault(); };
        b.addEventListener('touchend', off, { passive: false });
        b.addEventListener('touchcancel', off, { passive: false });
      };
      bindPedal('tbtn-gas', 1);
      bindPedal('tbtn-brake', -1);
    }
  };

  // ---------- Button-Verdrahtung ----------
  const LANGS = ['de', 'tr', 'en'];
  const LANG_LABELS = { de: 'Deutsch', tr: 'Türkçe', en: 'English' };
  for (const lg of LANGS) {
    $('lang-' + lg).addEventListener('click', () => {
      state.settings.lang = lg; setLang(lg); api.applyLang();
      for (const o of LANGS) $('lang-' + o).classList.toggle('active', o === lg);
    });
  }

  els.btnStart.addEventListener('click', () => {
    if (hasSave() && !els.btnContinue.classList.contains('hidden')) resetProgress();
    state.survival = $('chk-survival').checked;   // Wahl überlebt den Reset
    save();
    hooks.onStart();
  });
  els.btnContinue.addEventListener('click', () => hooks.onContinue());

  $('btn-sell').addEventListener('click', () => { hooks.doSell(); api.renderShop(); });
  $('btn-shop-close').addEventListener('click', () => hooks.closeShop());
  $('btn-farm-close').addEventListener('click', () => hooks.closeShop());
  $('btn-market-close').addEventListener('click', () => hooks.closeShop());
  $('btn-dealer-close').addEventListener('click', () => hooks.closeShop());
  $('btn-manage-close').addEventListener('click', () => hooks.closeShop());
  $('btn-market-sellall').addEventListener('click', () => {
    for (const id of Object.keys(CFG.products)) {
      const have = Math.floor(state.inventory[id] || 0);
      if (have > 0) hooks.sellProduct(id, have);
    }
    api.renderMarket();
  });
  $('btn-manage').addEventListener('click', () => {
    if (api.manageOpen()) { hooks.closeShop(); return; }
    if (!api.overlayOpen()) { hooks.openManage(); }
  });
  for (const tb of ['workers', 'storage', 'stats', 'quests', 'ach']) {
    $('tab-' + tb).addEventListener('click', () => { api._manageTab = tb; api.renderManage(); });
  }
  // v5: Spielstand exportieren / importieren
  $('btn-save-export').addEventListener('click', () => {
    try {
      const data = localStorage.getItem('cayvadisi_save_v2') || '{}';
      const a = document.createElement('a');
      a.download = 'cayvadisi_save.json';
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
      a.click();
    } catch (e) { /* egal */ }
  });
  $('inp-save-import').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        JSON.parse(reader.result);   // validieren
        localStorage.setItem('cayvadisi_save_v2', reader.result);
        location.reload();
      } catch (err) { api.toast(t('importBad'), false); }
    };
    reader.readAsText(file);
  });
  $('btn-save-import').addEventListener('click', () => $('inp-save-import').click());
  $('btn-travel-close').addEventListener('click', () => hooks.closeShop());
  $('btn-airport-close').addEventListener('click', () => hooks.closeShop());
  $('chk-survival').addEventListener('change', (e) => { state.survival = e.target.checked; });
  $('btn-factory-close').addEventListener('click', () => hooks.closeShop());
  $('btn-super-close').addEventListener('click', () => hooks.closeShop());
  $('btn-life-close').addEventListener('click', () => hooks.closeShop());
  $('btn-life').addEventListener('click', () => {
    if (api.lifeOpen()) { hooks.closeShop(); return; }
    if (!api.overlayOpen()) hooks.openLife();
  });
  for (const tb of ['profile', 'family', 'estate', 'stocks', 'bank']) {
    $('ltab-' + tb).addEventListener('click', () => { api._lifeTab = tb; api.renderLife(); });
  }
  $('btn-resume').addEventListener('click', () => hooks.resume());
  $('btn-help').addEventListener('click', () => {
    api.toast(t('tut1'), false, 6000);
    setTimeout(() => api.toast(t('tut2'), false, 6000), 1500);
  });
  $('btn-restart').addEventListener('click', () => {
    resetProgress();
    location.reload();
  });
  $('btn-sound').addEventListener('click', (e) => {
    state.settings.sound = !state.settings.sound;
    hooks.setSound(state.settings.sound);
    e.target.textContent = state.settings.sound ? t('on') : t('off');
    save();
  });
  $('btn-quality').addEventListener('click', (e) => {
    const order = ['auto', 'high', 'medium', 'low'];
    const next = order[(order.indexOf(state.settings.quality) + 1) % order.length];
    state.settings.quality = next;
    hooks.setQuality(next);
    e.target.textContent = t('q' + next[0].toUpperCase() + next.slice(1));
    save();
  });
  $('btn-lang').addEventListener('click', (e) => {
    const next = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
    state.settings.lang = next; setLang(next); api.applyLang();
    e.target.textContent = LANG_LABELS[next];
    api.showPause();
    save();
  });
  $('btn-next-day').addEventListener('click', () => hooks.nextDay());
  $('btn-season-continue').addEventListener('click', () => {
    api.hideOverlays();
    hooks.nextDay2();
  });

  return api;
}
