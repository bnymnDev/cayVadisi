// DOM-HUD, Menüs, Shop, Overlays
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, basketCapacity, save, resetProgress, hasSave, netWorth, seasonOf } from './state.js';

const SEASON_ICONS = ['☀️', '🍂', '❄️', '🌸'];
import { t, tUpgrade, setLang, getLang, applyDom } from './i18n.js';
import { fmtKg, fmtMoney, clamp } from './util.js';
import { COLLECT_DEFS } from './collectibles.js';
import { xpLevel, maxLevel, nextLevelAt, workerMax, luckyChance, megaChance, rareFishPool } from './xp.js';

const $ = (id) => document.getElementById(id);

export function createUI(ctx, hooks) {
  let uiPlayerRef = null;   // v26: für Kamera-Empfindlichkeit aus dem Pausenmenü
  const els = {
    start: $('start-screen'), hud: $('hud'), shop: $('shop-screen'),
    pause: $('pause-screen'), day: $('day-screen'), season: $('season-screen'),
    farm: $('farm-screen'), market: $('market-screen'),
    dealer: $('dealer-screen'), manage: $('manage-screen'),
    travel: $('travel-screen'), factory: $('factory-screen'),
    superS: $('super-screen'), life: $('life-screen'),
    airportS: $('airport-screen'), eventS: $('event-screen'),
    workshop: $('workshop-screen'), album: $('album-screen'),
    phone: $('phone-screen'),
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

  function show(el) {
    el.classList.remove('hidden');
    // Overlay auf: Pointer-Lock sicher freigeben, sonst ist der Mauszeiger
    // unsichtbar und nichts im Fenster lässt sich anklicken
    if (el.classList.contains('overlay') && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
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
      const stars = state.prestige > 0 ? '★'.repeat(Math.min(state.prestige, CFG.prestige.maxShown)) + ' ' : '';
      els.tier.textContent = stars + t('tierName' + state.wealthTier);
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
      // v26: Mobil — Korb-Füllstand als goldener Ring um die Aktionstaste
      if (ctx.isTouch) {
        const act = $('tbtn-act'), kgEl = $('act-kg');
        if (act) {
          const pct = clamp(state.basketKg / cap * 100, 0, 100);
          act.style.background = `conic-gradient(rgba(216,178,58,0.85) ${pct}%, rgba(15,22,17,0.45) ${pct}%)`;
        }
        if (kgEl) {
          kgEl.classList.toggle('hidden', state.basketKg < 0.05);
          kgEl.textContent = `🧺 ${fmtKg(state.basketKg, state.settings.lang)} kg`;
        }
      }
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
      if (ctx.isTouch) {
        const act = $('tbtn-act');
        if (act) act.classList.toggle('act-on', !!text);
      }
      if (!text) { hide(els.prompt); els.prompt.onclick = null; return; }
      els.prompt.innerHTML = ctx.isTouch ? text : '<b>E</b>' + text;
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
        || !els.eventS.classList.contains('hidden')
        || !els.workshop.classList.contains('hidden')
        || !els.album.classList.contains('hidden')
        || !els.phone.classList.contains('hidden');
    },
    manageOpen() { return !els.manage.classList.contains('hidden'); },
    lifeOpen() { return !els.life.classList.contains('hidden'); },
    hideOverlays() {
      hide(els.shop); hide(els.pause); hide(els.day); hide(els.season);
      hide(els.farm); hide(els.market); hide(els.dealer); hide(els.manage);
      hide(els.travel); hide(els.factory); hide(els.superS); hide(els.life);
      hide(els.airportS); hide(els.eventS);
      hide(els.workshop); hide(els.album); hide(els.phone);
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
        </div>
        <h3>🌴 ${t('vacTitle')}</h3>
        <div class="section-info">${t('vacHint')}</div>`;
      $('btn-fly-ist').addEventListener('click', () => hooks.flyIstanbul());
      $('btn-fly-alm').addEventListener('click', () => hooks.flyAlmanya());
      // v8: Urlaubsziele
      for (const [id, V] of Object.entries(CFG.vacation.spots)) {
        const locked = state.wealthTier < V.tier;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (locked ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">${locked ? '🔒' : V.icon}</div>
          <div class="u-body"><div class="u-name">${t('vac_' + id)}</div>
          <div class="u-desc">${locked ? t('vacLocked', t('tierName' + V.tier)) : t('vacDesc_' + id)}</div></div>
          <button ${locked || state.money < V.cost ? 'disabled' : ''}>${fmtMoney(V.cost, L)}</button>`;
        if (!locked) row.querySelector('button').addEventListener('click', () => hooks.bookVacation(id));
        body.appendChild(row);
      }
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

    // ---------- v8: Telefon ----------
    _phoneApp: null,
    phoneOpen() { return !els.phone.classList.contains('hidden'); },
    showPhone(app = null) {
      api._phoneApp = app;
      api.renderPhone();
      show(els.phone);
    },
    renderPhone() {
      const L = state.settings.lang;
      $('phone-clock').textContent = els.hudClock.textContent || '';
      const body = $('phone-body');
      const title = $('phone-title');
      const app = api._phoneApp;
      $('btn-phone-back').classList.toggle('hidden', !app);
      if (!app) {
        title.textContent = t('phoneTitle');
        let APPS = [
          ['hava', '⛅'], ['piyasa', '📊'], ['banka', '💳'],
          ['borsa', '📈'], ['taksi', '🚕'], ['karar', '📜'],
          ['lojistik', '🚚'], ['kurye', '🏍️'], ['imperium', '👑'], ['tapu', '🗺️'], ['ajanda', '📜'], ['defter', '📔'], ['kart', '💌'], ['album', '📸'], ['radyo', '📻'], ['kamera', '🤳']
        ];
        if (!CFG.photoEnabled) APPS = APPS.filter(([id2]) => id2 !== 'kamera');   // v24
        body.innerHTML = `<div class="app-grid">${APPS.map(([id, ic]) =>
          `<button class="app-btn" data-app="${id}"><span>${ic}</span><em>${t('app_' + id)}</em></button>`).join('')}</div>`;
        body.querySelectorAll('.app-btn').forEach(b => b.addEventListener('click', () => {
          const id = b.dataset.app;
          if (id === 'album') { hide(els.phone); api.showAlbum(); return; }
          if (id === 'kamera') { hooks.enterPhoto(); return; }
          api._phoneApp = id;
          api.renderPhone();
        }));
        return;
      }
      title.textContent = t('app_' + app);
      if (app === 'hava') {
        const f = hooks.forecast();
        const fmtH = (h) => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
        let html = `<div class="section-info">${SEASON_ICONS[f.season]} ${t('season_' + CFG.seasonCycle.names[f.season])}${f.fog ? ' · 🌫️ ' + t('fogWarn') : ''}</div>`;
        if (!f.showers.length) html += `<div class="upgrade-item"><div class="u-icon">☀️</div><div class="u-body"><div class="u-name">${t('noRainToday')}</div></div></div>`;
        for (const s of f.showers) {
          html += `<div class="upgrade-item"><div class="u-icon">${s.storm ? '⛈️' : '🌧️'}</div>
            <div class="u-body"><div class="u-name">${fmtH(s.from)} – ${fmtH(s.to)}</div>
            <div class="u-desc">${s.storm ? t('stormWarn') : t('rainPlain')}</div></div></div>`;
        }
        body.innerHTML = html;
      } else if (app === 'kurye') {
        // v14: Lieferservice-Status
        const j = state._kuryeJob;
        let html = `<div class="section-info">${t('kuryeHint', CFG.kurye.perDay)}</div>`;
        if (j) {
          html += `<div class="upgrade-item"><div class="u-icon">${j.stage === 'pick' ? '📦' : '🏍️'}</div>
            <div class="u-body"><div class="u-name">${t(j.stage === 'pick' ? 'kuryePickLabel' : 'kuryeDropLabel', t('kuryeT_' + j.id))}</div>
            <div class="u-desc">${t('kuryeTip')}</div></div></div>`;
        } else {
          html += `<div class="upgrade-item"><div class="u-icon">💤</div>
            <div class="u-body"><div class="u-name">${t('kuryeNone')}</div>
            <div class="u-desc">${t('kuryeStats', state.kuryeDone)}</div></div></div>`;
        }
        body.innerHTML = html;
      } else if (app === 'kart') {
        // v22: Vadi-Postkarten — letztes Album-Foto verschicken
        const album = api._albumLoad();
        let last = album.length ? album[album.length - 1] : null;
        if (!last) {
          // v24: ohne Fotomodus — gemaltes Tal-Motiv als Karte
          const mc = document.createElement('canvas');
          mc.width = 640; mc.height = 360;
          const mg = mc.getContext('2d');
          const grad = mg.createLinearGradient(0, 0, 0, 360);
          grad.addColorStop(0, '#8ec7e8'); grad.addColorStop(0.55, '#d9e8c8'); grad.addColorStop(1, '#3f7d4a');
          mg.fillStyle = grad; mg.fillRect(0, 0, 640, 360);
          mg.fillStyle = '#f2d05e'; mg.beginPath(); mg.arc(520, 70, 36, 0, Math.PI * 2); mg.fill();
          mg.fillStyle = '#2e6b3a';
          for (let i2 = 0; i2 < 8; i2++) {
            mg.beginPath(); mg.ellipse(60 + i2 * 78, 300 + (i2 % 2) * 16, 46, 15, 0, 0, Math.PI * 2); mg.fill();
          }
          mg.fillStyle = '#355e8a';
          mg.beginPath(); mg.moveTo(0, 200); mg.quadraticCurveTo(180, 150, 320, 190); mg.lineTo(320, 230); mg.lineTo(0, 240); mg.fill();
          last = { d: state.day, img: mc.toDataURL('image/jpeg', 0.85) };
        }
        let html = `<div class="section-info">${t('kartInfo', state.postcardsSent)}</div>`;
        if (last) html += `<img src="${last.img}" style="width:100%;border-radius:10px;margin:8px 0">`;
        body.innerHTML = html;
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.disabled = !last || hooks.npcCount() === 0;
        b.textContent = t('kartSendBtn');
        b.addEventListener('click', async () => {
          const idx = Math.floor(Math.random() * Math.max(1, hooks.npcCount() - 1));
          const name = hooks.npcName ? hooks.npcName(idx) : '?';
          const { composePostcard, saveCard } = await import('./world/postcards.js');
          composePostcard(last.img, name, state.day, (dataUrl) => {
            saveCard(idx, dataUrl);
            hooks.postcardReward(idx);
            hooks.postcardsSync && hooks.postcardsSync();
            api.renderPhone();
          });
        });
        body.appendChild(b);
      } else if (app === 'defter') {
        // v25: Anı Defteri — automatisch festgehaltene große Momente
        const ICONS = { canavar: '🐉', summit: '⛰️', wedding: '💍', riddle: '🗿', ghost: '👻',
          sampiyon: '🏆', muhtar: '🏛️', treeChest: '🧰', amphoras: '🏺', moto: '🏍️' };
        let html = `<div class="section-info">${t('defterInfo', state.diary.length, CFG.diary.moments.length)}</div>`;
        for (const e of state.diary) {
          html += `<div class="upgrade-item"><div class="u-icon">${ICONS[e.id] || '📖'}</div>
            <div class="u-body"><div class="u-name">${t('diary_' + e.id)}</div>
            <div class="u-desc">${t('day')} ${e.day} — ${t('diaryDesc_' + e.id)}</div></div></div>`;
        }
        if (!state.diary.length) html += `<div class="section-info">${t('defterEmpty')}</div>`;
        body.innerHTML = html;
      } else if (app === 'ajanda') {
        // v19: Questlog — Haupt- und Nebenaufgaben aus dem Spielstand abgeleitet
        const rows = [];
        const S4 = state.story4;
        if (!S4.done && S4.ch >= 1) rows.push(['🕴️', t('story4Title'), t('q_story4_' + Math.min(S4.ch, 3))]);
        if (S4.done) rows.push(['🕴️', t('story4Title'), '✅ ' + t('q_done')]);
        if (state.story < 5) rows.push(['📖', t('q_dede'), t('q_dedeDesc', state.story, 5)]);
        if (state.story3 && state.story3.ch > 0 && !state.story3.done) rows.push(['🕵️', t('story3Title'), t('q_inProgress')]);
        if (state.wedding.stage === 1) rows.push(['💍', t('q_wedding'), t('q_weddingDesc', state.wedding.catering)]);
        // Nächste Freischaltungen
        if (!state.featureUnlocks._all) {
          let shown = 0;
          for (const [id, def] of Object.entries(CFG.progress.features)) {
            if (state.featureUnlocks[id] || shown >= 3) continue;
            let cond = '';
            if (def.kg) cond = t('qc_kg', def.kg, Math.floor(state.totalKg));
            else if (def.earned) cond = t('qc_earned', def.earned, Math.floor(state.totalEarned));
            else if (def.rep) cond = t('qc_rep', def.rep, state.rep);
            else if (def.xp) cond = t('qc_xp', t('xp_' + def.xp[0]), def.xp[1]);
            else if (def.day) cond = t('qc_day', def.day);
            rows.push(['🔒', t('feat_' + id).replace(/^[^ ]+ /, ''), cond]);
            shown++;
          }
        }
        // Heutige Gefallen
        for (const [idx, f] of Object.entries(state._favors || {})) {
          rows.push(['❗', t('q_favor'), t('favorAsk', hooks.npcName ? hooks.npcName(+idx) : '?', f.qty, CFG.products[f.item].icon + ' ' + t('prod_' + f.item))]);
        }
        // Canavar
        if (state.rod) {
          const ready = state.day >= (state.canavar.next || 0);
          rows.push(['🐉', t('canavarTitle'), ready ? t('q_canavarReady') : t('q_canavarWait', state.canavar.next)]);
        }
        let html = `<div class="section-info">${t('ajandaInfo')}</div>`;
        for (const [ic, name, desc] of rows) {
          html += `<div class="upgrade-item"><div class="u-icon">${ic}</div>
            <div class="u-body"><div class="u-name">${name}</div>
            <div class="u-desc">${desc}</div></div></div>`;
        }
        if (!rows.length) html += `<div class="section-info">${t('ajandaEmpty')}</div>`;
        body.innerHTML = html;
      } else if (app === 'tapu') {
        // v17: Grundbuch — wem gehört das Tal?
        const L2 = state.settings.lang;
        const P = CFG.parcels;
        const counts = { me: 0, kemal: 0, saban: 0, nurten: 0, free: 0 };
        for (let i = 0; i < P.spots.length; i++) {
          const o = state.parcels[i];
          if (!o) counts.free++; else counts[o] = (counts[o] || 0) + 1;
        }
        let html = `<div class="section-info">${t('tapuInfo', fmtMoney(P.price, L2), fmtMoney(P.rentPerDay, L2))}</div>`;
        const rows = [
          ['me', '🟩', t('tapuMine'), counts.me],
          ['kemal', '🟥', t('rival_kemal'), counts.kemal],
          ['saban', '🟧', t('rival_saban'), counts.saban],
          ['nurten', '🟪', t('rival_nurten'), counts.nurten],
          ['free', '⬜', t('tapuFree'), counts.free]
        ];
        for (const [, ic, name, n] of rows) {
          html += `<div class="upgrade-item"><div class="u-icon">${ic}</div>
            <div class="u-body"><div class="u-name">${name}</div>
            <div class="u-desc">${n} ${t('tapuParcels')}</div></div></div>`;
        }
        if (counts.me > 0) html += `<div class="section-info">${t('tapuRent', fmtMoney(counts.me * P.rentPerDay, L2))}</div>`;
        body.innerHTML = html;
      } else if (app === 'imperium') {
        // v16: Imperium-Übersicht — Level, Perks, nächste Freischaltungen
        const L2 = state.settings.lang;
        const KINDS = [
          ['pick', '🫲', () => {
            const lu = Math.round(luckyChance() * 100), me = Math.round(megaChance() * 100);
            return t('impPickPerk', lu) + (me > 0 ? ' · ' + t('impMegaPerk', me) : '');
          }],
          ['fish', '🎣', () => {
            const pool = rareFishPool().map(([id]) => t('prod_' + id));
            return pool.length ? t('impFishPerk', pool.join(', ')) : t('impFishLocked');
          }],
          ['trade', '📦', () => t('impTradePerk', workerMax())]
        ];
        let html = `<div class="section-info">${t('impInfo')}</div>`;
        for (const [kind, icon, perk] of KINDS) {
          const v = state.xp[kind];
          const lvl = xpLevel(v);
          const next = nextLevelAt(v);
          const base = CFG.xp.levels[lvl];
          const pct = next ? Math.round(((v - base) / (next - base)) * 100) : 100;
          html += `<div class="upgrade-item"><div class="u-icon">${icon}</div>
            <div class="u-body"><div class="u-name">${t('xp_' + kind)} · ${t('impLevel', lvl, maxLevel())}</div>
            <div class="u-desc">${perk()}</div>
            <div class="u-desc">${next ? `${v} / ${next} XP` : t('impMax')}
              <span style="display:inline-block;width:70px;height:6px;background:#0003;border-radius:3px;vertical-align:middle;margin-left:6px">
              <span style="display:block;width:${pct}%;height:100%;background:#7ac74f;border-radius:3px"></span></span></div></div></div>`;
        }
        html += `<div class="section-info">${t('impStats', fmtKg(state.totalKg, L2), state.fishCaught, state.packsSold)}</div>`;
        body.innerHTML = html;
      } else if (app === 'piyasa') {
        const tips = hooks.marketTips();
        let html = `<div class="section-info">${t('piyasaHint')}</div>`;
        for (const [id, mul] of tips.top) {
          html += `<div class="upgrade-item"><div class="u-icon">${CFG.products[id].icon}</div>
            <div class="u-body"><div class="u-name">${t('prod_' + id)} <span class="price-up">▲ ${Math.round((mul - 1) * 100)} %</span></div></div></div>`;
        }
        for (const s of tips.stocks) {
          html += `<div class="upgrade-item"><div class="u-icon">📈</div>
            <div class="u-body"><div class="u-name">${CFG.life.stocks[s.id].name}
            <span class="${s.chg >= 0 ? 'price-up' : 'price-down'}">${s.chg >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(s.chg * 100))} %</span></div></div></div>`;
        }
        body.innerHTML = html;
      } else if (app === 'banka') {
        const B = CFG.bank;
        let html = `<div class="manage-count">${state.debt > 0 ? '💳 −' + fmtMoney(state.debt, L) : '✅'}</div>`;
        if (state.debt > 0) {
          html += `<button id="ph-repay" class="big-btn">${t('repayBtn', fmtMoney(Math.min(state.debt, state.money), L))}</button>`;
        } else {
          html += `<div class="btn-row">${B.loans.map((amt, i) =>
            `<button class="big-btn ph-loan" data-i="${i}">${t('loanBtn')} ${fmtMoney(amt, L)}</button>`).join('')}</div>`;
        }
        html += `<button id="ph-insure" class="big-btn ${state.insured ? '' : 'ghost'}">
          ${state.insured ? '🛡️ ' + t('insuranceOn') : t('insuranceOff')}</button>`;
        body.innerHTML = html;
        const rp = $('ph-repay');
        if (rp) rp.addEventListener('click', () => { hooks.repayLoan(); api.renderPhone(); });
        body.querySelectorAll('.ph-loan').forEach(b => b.addEventListener('click', () => {
          hooks.takeLoan(parseInt(b.dataset.i, 10));
          api.renderPhone();
        }));
        $('ph-insure').addEventListener('click', () => { hooks.toggleInsurance(); api.renderPhone(); });
      } else if (app === 'borsa') {
        body.innerHTML = '';
        // v20: Çay-Börse — Kurs + Verlauf
        {
          const mul = state.teaMul || 1;
          const hist = state.teaHist.length ? state.teaHist : [1];
          const prev = hist.length > 1 ? hist[hist.length - 2] : mul;
          const arrow = mul > prev ? '📈' : mul < prev ? '📉' : '➡️';
          const teaDiv = document.createElement('div');
          teaDiv.className = 'upgrade-item';
          teaDiv.innerHTML = `<div class="u-icon">🫖</div>
            <div class="u-body"><div class="u-name">${t('teaMarketName')} ${arrow}</div>
            <div class="u-desc">${t('teaPriceNow', Math.round(CFG.eco.pricePerKg * mul * 10) / 10)}
              ${state.teaEvent ? ' · ' + t(state.teaEvent.kind === 'spike' ? 'teaEventSpike' : 'teaEventDip') : ''}</div>
            <canvas id="tea-chart" width="140" height="34"></canvas></div>`;
          body.appendChild(teaDiv);
          const cv = teaDiv.querySelector('#tea-chart');
          const g2 = cv.getContext('2d');
          g2.strokeStyle = '#7ac74f'; g2.lineWidth = 2; g2.beginPath();
          const M = CFG.teaMarket;
          hist.forEach((v2, i2) => {
            const x2 = (i2 / Math.max(1, hist.length - 1)) * 134 + 3;
            const y2 = 31 - ((v2 - M.min) / (M.max - M.min)) * 28;
            i2 ? g2.lineTo(x2, y2) : g2.moveTo(x2, y2);
          });
          g2.stroke();
        }
        for (const [id, s] of Object.entries(CFG.life.stocks)) {
          const price = state.stockPrices[id] || s.p0;
          const row = document.createElement('div');
          row.className = 'upgrade-item';
          row.innerHTML = `<div class="u-icon">📈</div>
            <div class="u-body"><div class="u-name">${s.name}</div>
            <div class="u-desc">${fmtMoney(price, L)} · ${t('stockOwned', state.stocks[id] || 0)}</div></div>
            <div class="btn-mini-row"><button data-n="-5">−5</button><button data-n="5">+5</button></div>`;
          row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
            hooks.tradeStock(id, parseInt(b.dataset.n, 10));
            api.renderPhone();
          }));
          body.appendChild(row);
        }
      } else if (app === 'taksi') {
        let html = `<div class="section-info">${t('taxiHint')}</div>`;
        body.innerHTML = html;
        for (const id of Object.keys(CFG.phone.taxi.spots)) {
          const cost = hooks.taxiCost(id);
          const row = document.createElement('div');
          row.className = 'upgrade-item';
          row.innerHTML = `<div class="u-icon">🚕</div>
            <div class="u-body"><div class="u-name">${t('taxi_' + id)}</div></div>
            <button ${state.money < cost ? 'disabled' : ''}>${fmtMoney(cost, L)}</button>`;
          row.querySelector('button').addEventListener('click', () => {
            if (hooks.callTaxi(id)) hooks.closeShop();
          });
          body.appendChild(row);
        }
        // v18: Fahrt ins Fındık Vadisi (erst nach Freischaltung)
        if (hooks.featureOn && hooks.featureOn('valley2')) {
          const row = document.createElement('div');
          row.className = 'upgrade-item';
          row.innerHTML = `<div class="u-icon">🌰</div>
            <div class="u-body"><div class="u-name">${t('taxi_valley2')}</div></div>
            <button ${state.money < CFG.valley2.taxiCost ? 'disabled' : ''}>${fmtMoney(CFG.valley2.taxiCost, L)}</button>`;
          row.querySelector('button').addEventListener('click', () => {
            if (hooks.taxiValley2()) hooks.closeShop();
          });
          body.appendChild(row);
        }
      } else if (app === 'karar') {
        const D = CFG.decrees;
        let html = `<div class="section-info">${t('decreeHint', fmtMoney(D.switchCost, L))}</div>`;
        body.innerHTML = html;
        for (const id of Object.keys(D.list)) {
          const activeD = state.decree === id;
          const row = document.createElement('div');
          row.className = 'upgrade-item' + (activeD ? ' owned' : '');
          row.innerHTML = `<div class="u-icon">${activeD ? '✅' : '📜'}</div>
            <div class="u-body"><div class="u-name">${t('decree_' + id)}</div>
            <div class="u-desc">${t('decreeDesc_' + id)}</div></div>
            <button ${activeD ? 'disabled' : ''}>${activeD ? '✓' : t('decreeUse')}</button>`;
          if (!activeD) row.querySelector('button').addEventListener('click', () => {
            if (hooks.setDecree(id)) api.renderPhone();
          });
          body.appendChild(row);
        }
        if (state.decree) {
          const off = document.createElement('button');
          off.className = 'big-btn ghost';
          off.textContent = t('decreeAbolish');
          off.addEventListener('click', () => { hooks.setDecree(''); api.renderPhone(); });
          body.appendChild(off);
        }
      } else if (app === 'lojistik') {
        const ready = state.sofor && state.vehicles.pickup;
        let html = `<div class="section-info">${ready ? t('logiHint', fmtMoney(CFG.logistics.upkeep, L)) : t('logiNeeds')}</div>`;
        body.innerHTML = html;
        for (const [rule, icon, key] of [
          ['exportA', '🌍', 'logiExport'], ['packs', '🛒', 'logiPacks'], ['goods', '🧺', 'logiGoods']
        ]) {
          const on = state.logi[rule];
          const row = document.createElement('div');
          row.className = 'upgrade-item' + (on ? '' : ' owned');
          row.innerHTML = `<div class="u-icon">${icon}</div>
            <div class="u-body"><div class="u-name">${t(key)}</div>
            <div class="u-desc">${t(key + 'Desc')}</div></div>
            <button ${ready ? '' : 'disabled'}>${on ? '🟢' : '⚪'}</button>`;
          row.querySelector('button').addEventListener('click', () => {
            hooks.setLogi(rule, !on);
            api.renderPhone();
          });
          body.appendChild(row);
        }
      } else if (app === 'radyo') {
        const name = hooks.radioNext();
        body.innerHTML = `<div class="manage-count">📻</div>
          <div class="section-info" style="text-align:center">${name || t('radioOff')}</div>
          <div class="section-info">${t('radioHint')}</div>`;
      }
    },

    // ---------- v8: Urlaubs-Postkarte ins Album ----------
    albumAddPostcard(spot) {
      const c = document.createElement('canvas');
      c.width = 640; c.height = 360;
      const g2 = c.getContext('2d');
      const skyG = g2.createLinearGradient(0, 0, 0, 200);
      const seaCol = spot === 'maldiv' ? '#31c6b4' : spot === 'fethiye' ? '#2795c9' : '#2e6f9e';
      skyG.addColorStop(0, spot === 'izmir' ? '#f2a65e' : '#7ec3e8');
      skyG.addColorStop(1, '#e8ddc8');
      g2.fillStyle = skyG;
      g2.fillRect(0, 0, 640, 220);
      g2.fillStyle = '#f7d774';
      g2.beginPath(); g2.arc(520, 70, 34, 0, Math.PI * 2); g2.fill();
      g2.fillStyle = seaCol;
      g2.fillRect(0, 200, 640, 160);
      g2.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 7; i++) g2.fillRect(20 + i * 90, 226 + (i % 3) * 26, 52, 3);
      if (spot === 'antalya' || spot === 'fethiye') {
        g2.fillStyle = '#e8d9ad'; g2.beginPath();
        g2.moveTo(0, 360); g2.quadraticCurveTo(240, 280, 640, 356); g2.lineTo(640, 360); g2.fill();
        g2.strokeStyle = '#5a3d20'; g2.lineWidth = 7;
        g2.beginPath(); g2.moveTo(90, 330); g2.quadraticCurveTo(102, 260, 130, 232); g2.stroke();
        g2.fillStyle = '#2f7d32';
        for (let i = 0; i < 5; i++) {
          g2.beginPath();
          g2.ellipse(130 + Math.cos(i * 1.26) * 38, 232 + Math.sin(i * 1.26) * 14, 34, 9, i * 1.26, 0, Math.PI * 2);
          g2.fill();
        }
      }
      if (spot === 'fethiye') {
        g2.fillStyle = '#d0392b';
        g2.beginPath(); g2.moveTo(430, 60); g2.quadraticCurveTo(470, 30, 510, 60);
        g2.quadraticCurveTo(470, 74, 430, 60); g2.fill();
        g2.strokeStyle = '#333'; g2.lineWidth = 1.5;
        g2.beginPath(); g2.moveTo(452, 66); g2.lineTo(468, 96); g2.lineTo(486, 66); g2.stroke();
        g2.fillStyle = '#333'; g2.fillRect(464, 94, 8, 10);
      }
      if (spot === 'maldiv') {
        g2.fillStyle = '#c9a06a';
        for (let i = 0; i < 3; i++) {
          g2.fillRect(150 + i * 140, 236, 8, 60);
          g2.fillRect(190 + i * 140, 236, 8, 60);
          g2.fillStyle = '#8a5c36';
          g2.fillRect(130 + i * 140, 214, 90, 34);
          g2.beginPath(); g2.moveTo(120 + i * 140, 216); g2.lineTo(175 + i * 140, 186); g2.lineTo(230 + i * 140, 216); g2.closePath();
          g2.fillStyle = '#d9c9a0'; g2.fill();
          g2.fillStyle = '#c9a06a';
        }
      }
      if (spot === 'izmir') {
        g2.fillStyle = '#e8e2d4';
        g2.fillRect(300, 90, 40, 140);
        g2.fillRect(290, 84, 60, 10);
        g2.beginPath(); g2.moveTo(292, 84); g2.lineTo(320, 48); g2.lineTo(348, 84); g2.closePath(); g2.fill();
        g2.fillStyle = '#3a3f45';
        g2.beginPath(); g2.arc(320, 120, 12, 0, Math.PI * 2); g2.fill();
        g2.fillStyle = '#e8e2d4';
        g2.beginPath(); g2.arc(320, 120, 9, 0, Math.PI * 2); g2.fill();
      }
      g2.fillStyle = 'rgba(30,40,35,0.75)';
      g2.fillRect(0, 316, 640, 44);
      g2.fillStyle = '#f4efe4';
      g2.font = 'bold 24px Georgia, serif';
      g2.fillText('🌴 ' + t('vac_' + spot) + ' — ' + t('day') + ' ' + state.day, 18, 346);
      api.albumAdd(c.toDataURL('image/jpeg', 0.85));
    },

    // ---------- v7: Werkstatt (Sanayi) ----------
    showWorkshop() { api.renderWorkshop(); show(els.workshop); },
    renderWorkshop() {
      const L = state.settings.lang;
      const body = $('workshop-body');
      body.innerHTML = '';
      const T = CFG.workshop.tuning;
      let any = false;
      for (const [id, v] of Object.entries(CFG.vehicles)) {
        if (!state.vehicles[id]) continue;
        any = true;
        const wear = Math.round(state.vehWear[id] || 0);
        const tun = state.vehTuning[id] || {};
        const repairCost = wear * CFG.workshop.repairPerPoint;
        const engCost = Math.round(v.cost * T.engine.costFactor);
        const tireCost = Math.round(v.cost * T.tires.costFactor);
        const row = document.createElement('div');
        row.className = 'ws-card';
        row.innerHTML = `
          <div class="u-name">${v.icon} ${t('veh_' + id)}</div>
          <div class="ws-wear-row"><span>${t('wearLabel')}</span>
            <div class="ws-wear"><div style="width:${wear}%;background:${wear > 60 ? '#c0533a' : wear > 30 ? '#c9a13a' : '#5d9138'}"></div></div>
            <b>${wear}%</b></div>
          <div class="btn-mini-row">
            <button data-a="repair" ${wear <= 0 || state.money < repairCost ? 'disabled' : ''}>🔧 ${t('repairBtn')} · ${fmtMoney(repairCost, L)}</button>
            <button data-a="engine" ${tun.engine ? 'disabled' : state.money < engCost ? 'disabled' : ''}>${tun.engine ? '✓ ' : ''}⚙️ ${t('tunEngine')} · ${fmtMoney(engCost, L)}</button>
            <button data-a="tires" ${tun.tires ? 'disabled' : state.money < tireCost ? 'disabled' : ''}>${tun.tires ? '✓ ' : ''}🛞 ${t('tunTires')} · ${fmtMoney(tireCost, L)}</button>
          </div>`;
        row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          const a = b.dataset.a;
          const ok = a === 'repair' ? hooks.repairVehicle(id) : hooks.buyTuning(id, a);
          if (ok) api.renderWorkshop();
        }));
        body.appendChild(row);
      }
      if (!any) body.innerHTML = `<div class="section-info">${t('wsNoVehicles')}</div>`;
    },

    // ---------- v7: Fotoalbum ----------
    _albumLoad() {
      try { return JSON.parse(localStorage.getItem('cayvadisi_album_v1') || '[]'); }
      catch (e) { return []; }
    },
    albumAdd(dataURL) {
      try {
        const album = api._albumLoad();
        album.push({ d: state.day, img: dataURL });
        while (album.length > CFG.album.max) album.shift();
        localStorage.setItem('cayvadisi_album_v1', JSON.stringify(album));
        api.toast(t('albumSaved'), true);
      } catch (e) { /* Speicher voll: Foto wurde trotzdem heruntergeladen */ }
    },
    showAlbum() { api.renderAlbum(); show(els.album); },
    renderAlbum(viewIdx = -1) {
      const grid = $('album-grid');
      const album = api._albumLoad();
      grid.innerHTML = '';
      if (!album.length) {
        grid.innerHTML = `<div class="section-info">${t('albumEmpty')}</div>`;
        return;
      }
      if (viewIdx >= 0 && album[viewIdx]) {
        // Großansicht mit Löschen
        const ph = album[viewIdx];
        grid.innerHTML = `
          <img class="album-big" src="${ph.img}" alt="">
          <div class="section-info">${t('day')} ${ph.d}</div>
          <div class="btn-row">
            <button id="btn-album-back" class="big-btn ghost">${t('back')}</button>
            <button id="btn-album-del" class="big-btn danger">🗑</button>
          </div>`;
        $('btn-album-back').addEventListener('click', () => api.renderAlbum());
        $('btn-album-del').addEventListener('click', () => {
          album.splice(viewIdx, 1);
          try { localStorage.setItem('cayvadisi_album_v1', JSON.stringify(album)); } catch (e) {}
          api.renderAlbum();
        });
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'album-wrap';
      album.forEach((ph, i) => {
        const im = document.createElement('img');
        im.className = 'album-thumb';
        im.src = ph.img;
        im.title = t('day') + ' ' + ph.d;
        im.addEventListener('click', () => api.renderAlbum(i));
        wrap.appendChild(im);
      });
      grid.appendChild(wrap);
    },

    // ---------- v7: Sparkline-Chart auf Canvas ----------
    drawSpark(canvas, data, color) {
      const g2 = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      g2.clearRect(0, 0, W, H);
      if (!data || data.length < 2) {
        g2.fillStyle = 'rgba(255,255,255,0.35)';
        g2.font = '11px sans-serif';
        g2.fillText(t('chartSoon'), 6, H / 2 + 4);
        return;
      }
      const min = Math.min(...data), max = Math.max(...data);
      const span = Math.max(max - min, 1e-6);
      g2.strokeStyle = color;
      g2.lineWidth = 2;
      g2.beginPath();
      data.forEach((v, i) => {
        const x = 4 + i / (data.length - 1) * (W - 8);
        const y = H - 6 - (v - min) / span * (H - 12);
        i === 0 ? g2.moveTo(x, y) : g2.lineTo(x, y);
      });
      g2.stroke();
      // Endpunkt markieren
      const lx = W - 4, ly = H - 6 - (data[data.length - 1] - min) / span * (H - 12);
      g2.fillStyle = color;
      g2.beginPath();
      g2.arc(lx, ly, 3, 0, Math.PI * 2);
      g2.fill();
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
      // v8: Çay-Ustası-Minispiel
      const brew = document.createElement('button');
      brew.className = 'big-btn ghost';
      brew.textContent = '🫖 ' + t('brewBtn');
      brew.addEventListener('click', () => api.showBrew());
      box.appendChild(brew);
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v10: generisches Timing-Minispiel (Balken + Klick) ----------
    _timingGame(opts) {
      $('event-icon').textContent = opts.icon;
      $('event-title').textContent = opts.title;
      $('event-text').innerHTML = `${opts.intro}<div class="brew-bar"><div class="brew-zone"></div><div id="brew-pin"></div></div>`;
      const box = $('event-choices');
      box.innerHTML = '';
      const scores = [];
      let u = 0, dir = 1, raf = 0, running2 = true;
      let last = performance.now();
      const loop = (now) => {
        if (!running2) return;
        const dt2 = Math.min((now - last) / 1000, 0.05);
        last = now;
        u += dir * (opts.speed || 0.9) * dt2;
        if (u > 1) { u = 1; dir = -1; }
        if (u < 0) { u = 0; dir = 1; }
        const p = $('brew-pin');
        if (p) p.style.left = (u * 100) + '%';
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.textContent = opts.btn + ' (1/' + opts.rounds + ')';
      b.addEventListener('click', () => {
        scores.push(Math.min(1, Math.max(0, 1 - Math.abs(u - 0.5) / 0.5 * 1.6)));
        if (scores.length >= opts.rounds) {
          running2 = false;
          cancelAnimationFrame(raf);
          const html = opts.onDone(scores);
          $('event-text').innerHTML = html;
          box.innerHTML = '';
          const done = document.createElement('button');
          done.className = 'big-btn ghost';
          done.textContent = t('back');
          done.addEventListener('click', () => hooks.closeShop());
          box.append(done);
        } else {
          b.textContent = opts.btn + ' (' + (scores.length + 1) + '/' + opts.rounds + ')';
        }
      });
      const leave2 = document.createElement('button');
      leave2.className = 'big-btn ghost';
      leave2.textContent = t('back');
      leave2.addEventListener('click', () => { running2 = false; cancelAnimationFrame(raf); hooks.closeShop(); });
      box.append(b, leave2);
      show(els.eventS);
    },

    // ---------- v10: Waben-Ernte an den Bienenstöcken ----------
    showHiveGame() {
      api._timingGame({
        icon: '🐝', title: t('hiveTitle'), intro: t('hiveIntro'),
        btn: t('hiveNow'), rounds: 3, speed: 1.05,
        onDone(scores) {
          const n = hooks.hiveReward(scores);
          return `🍯 +${n} <br><b>${Math.min(...scores) > 0.85 ? t('hiveGoldLabel') : t('hiveOkLabel')}</b>`;
        }
      });
    },

    // ---------- v12: Çay-Meisterschaft von Rize (3 Disziplinen à 3 Runden) ----------
    showMeister(stage = 0, acc = []) {
      const stages = [
        { name: t('meisterStage1'), speed: 1.35 },
        { name: t('meisterStage2'), speed: 1.0 },
        { name: t('meisterStage3'), speed: 1.6 }
      ];
      const s2 = stages[stage];
      api._timingGame({
        icon: '🏆', title: t('meisterTitle'),
        intro: (stage === 0 ? t('meisterIntro') + '<br><br>' : '') + `<b>${stage + 1}/3 · ${s2.name}</b>`,
        btn: t('meisterGo'), rounds: 3, speed: s2.speed,
        onDone(scores) {
          acc.push(...scores);
          if (stage < 2) {
            setTimeout(() => api.showMeister(stage + 1, acc), 850);
            return `<b>${s2.name}</b> ✓ …`;
          }
          const avg = acc.reduce((a, b) => a + b, 0) / acc.length;
          const res = hooks.meisterResult(avg);
          return `${t('meisterScore', res.avg, res.opp)}<br><b>${res.won ? t('meisterWon') : t('meisterLost')}</b>`;
        }
      });
    },

    // ---------- v15: Hochzeitsplanung mit Temel ----------
    showWeddingPlan() {
      const L = state.settings.lang;
      $('event-icon').textContent = '💍';
      $('event-title').textContent = t('weddingTitle');
      $('event-text').innerHTML = t('weddingIntro', state.wedding.catering);
      const box = $('event-choices');
      box.innerHTML = '';
      const ITEMS = [['cheese', 2, '🧀'], ['honey', 2, '🍯'], ['tea_pack', 3, '📦']];
      for (const [id, need, ic] of ITEMS) {
        const have = Math.floor(state.inventory[id] || 0);
        const b = document.createElement('button');
        b.className = 'big-btn ghost';
        b.disabled = state.wedding.catering >= 3 || have < need;
        b.textContent = `${ic} ${t('weddingGive', need, t('prod_' + id))} (${have})`;
        b.addEventListener('click', () => { if (hooks.weddingContribute(id)) api.showWeddingPlan(); });
        box.appendChild(b);
      }
      const go = document.createElement('button');
      go.className = 'big-btn';
      go.textContent = t('weddingGo');
      go.addEventListener('click', () => { hooks.weddingPlan(); hooks.closeShop(); });
      box.appendChild(go);
      show(els.eventS);
    },

    // ---------- v15: Frachter-Routen ----------
    showFreighter() {
      const L = state.settings.lang;
      const F = CFG.freighter;
      const have = Math.min(F.maxPacks, Math.floor(state.inventory.tea_pack));
      const free = (state.fleet || 0) - (state.shipments || []).length;
      $('event-icon').textContent = '⚓';
      $('event-title').textContent = t('freightTitle');
      $('event-text').innerHTML = t('freightIntro', have, F.maxPacks)
        + `<br>${t('fleetStatus', state.fleet || 0, free)}`;
      const box = $('event-choices');
      box.innerHTML = '';
      // v20: Versicherung umschaltbar
      api._freightInsured = api._freightInsured ?? false;
      const ins = document.createElement('button');
      ins.className = 'big-btn ghost';
      const insLabel = () => `🛡️ ${t('freightInsBtn', Math.round(F.insuranceRate * 100))}: ${api._freightInsured ? t('on') : t('off')}`;
      ins.textContent = insLabel();
      ins.addEventListener('click', () => { api._freightInsured = !api._freightInsured; ins.textContent = insLabel(); });
      box.appendChild(ins);
      for (const [route, r] of Object.entries(F.routes)) {
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.disabled = have < 1 || free < 1;
        b.textContent = `${t('route_' + route)} · ×${r.mul} · ${t('freightRisk', Math.round(r.risk * 100))}`;
        b.addEventListener('click', () => { if (hooks.shipFreight(route, api._freightInsured)) hooks.closeShop(); });
        box.appendChild(b);
      }
      // v20: nächstes Schiff kaufen
      if ((state.fleet || 0) > 0 && (state.fleet || 0) < F.costs.length) {
        const cost = F.costs[state.fleet];
        const buy = document.createElement('button');
        buy.className = 'big-btn ghost';
        buy.disabled = state.money < cost;
        buy.textContent = `🚢 ${t('fleetBuyBtn', state.fleet + 1)} · ${fmtMoney(cost, L)}`;
        buy.addEventListener('click', () => { if (hooks.buyFreighter()) api.showFreighter(); });
        box.appendChild(buy);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v15: Panayır-Losbude ----------
    showLot() {
      const L = state.settings.lang;
      $('event-icon').textContent = '🎟️';
      $('event-title').textContent = t('lotTitle');
      $('event-text').innerHTML = t('lotIntro', fmtMoney(CFG.panayir.lotTicket, L));
      const box = $('event-choices');
      box.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.textContent = t('lotBuy');
      b.addEventListener('click', () => {
        const res = hooks.buyLot();
        if (!res) return;
        $('event-text').innerHTML = t('lot_' + res.kind, res.n || 0);
        b.disabled = state.money < CFG.panayir.lotTicket;
      });
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.append(b, leave);
      show(els.eventS);
    },

    // ---------- v15: Kraftmesser ----------
    showKraft() {
      api._timingGame({
        icon: '🔨', title: t('kraftTitle'), intro: t('kraftIntro'),
        btn: t('kraftHit'), rounds: 3, speed: 1.5,
        onDone(scores) {
          const res = hooks.kraftResult(scores);
          return `${res.bell ? '🔔 ' + t('kraftBell') : t('kraftMeh')}<br><b>+${res.prize}</b>`;
        }
      });
    },

    // ---------- v15: Bergwerk ----------
    showMine() {
      api._timingGame({
        icon: '⛏️', title: t('mineTitle'), intro: t('mineIntro'),
        btn: t('mineHit'), rounds: 3, speed: 1.3,
        onDone(scores) {
          const res = hooks.mineReward(scores);
          let html = t('mineCoal', res.coal);
          if (res.gem) html += `<br>💎 <b>${t('mineGem', res.gemValue)}</b>`;
          if (res.injury) html += `<br>🤕 ${t('mineInjury', res.injuryCost)}`;
          return html;
        }
      });
    },

    // ---------- v14: Dede-Erinnerung (Rückblende-Vignette) ----------
    showMemory(i, found, total) {
      $('event-icon').textContent = '🖼️';
      $('event-title').textContent = t('memoryTitle', found, total);
      $('event-text').innerHTML = `<em>${t('memory_' + i)}</em>`;
      const box = $('event-choices');
      box.innerHTML = '';
      const done = document.createElement('button');
      done.className = 'big-btn ghost';
      done.textContent = t('back');
      done.addEventListener('click', () => hooks.closeShop());
      box.appendChild(done);
      show(els.eventS);
    },

    // ---------- v14: Story 3 — das Kartell klopft an ----------
    showStory3Choice() {
      $('event-icon').textContent = '🕵️';
      $('event-title').textContent = t('story3Title');
      $('event-text').innerHTML = t('story3Intro');
      const box = $('event-choices');
      box.innerHTML = '';
      for (const path of ['jandarma', 'kacak']) {
        const b = document.createElement('button');
        b.className = 'big-btn' + (path === 'kacak' ? ' ghost' : '');
        b.textContent = t('story3Btn_' + path);
        b.addEventListener('click', () => { hooks.story3Choose(path); hooks.closeShop(); });
        box.appendChild(b);
      }
      show(els.eventS);
    },

    // ---------- v14: Arcade-Automat „Hamsi Yakala" ----------
    showArcade() {
      if (!hooks.arcadeStart()) return;
      $('event-icon').textContent = '🕹️';
      $('event-title').textContent = t('arcadeTitle');
      $('event-text').innerHTML = `${t('arcadeIntro', state.arcadeBest)}
        <canvas id="arcade-cv" width="300" height="330" style="display:block;margin:10px auto;background:#0d1a24;border-radius:10px"></canvas>`;
      const box = $('event-choices');
      box.innerHTML = '';
      const cv = $('arcade-cv');
      const cx2 = cv.getContext('2d');
      let bx = 150, score = 0, tLeft = 25, running2 = true, raf = 0;
      const drops = [];
      let last = performance.now();
      const onMove = (e) => {
        const r = cv.getBoundingClientRect();
        bx = Math.max(24, Math.min(276, (e.clientX - r.left) / r.width * 300));
      };
      const onKey = (e) => {
        if (e.code === 'ArrowLeft') bx = Math.max(24, bx - 22);
        if (e.code === 'ArrowRight') bx = Math.min(276, bx + 22);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('keydown', onKey);
      const finish = () => {
        running2 = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('keydown', onKey);
        const res = hooks.arcadeResult(score);
        $('event-text').innerHTML = `${t('arcadeScore', score, res.opp)}<br>
          <b>${res.won ? t('arcadeWon', fmtMoney(CFG.arcade.duelPrize, state.settings.lang)) : t('arcadeLost')}</b><br>
          ${t('arcadePay', fmtMoney(res.pay, state.settings.lang))} · 🏆 ${res.best}`;
        box.innerHTML = '';
        const done = document.createElement('button');
        done.className = 'big-btn ghost';
        done.textContent = t('back');
        done.addEventListener('click', () => hooks.closeShop());
        box.appendChild(done);
      };
      const loop = (now) => {
        if (!running2) return;
        const dt2 = Math.min((now - last) / 1000, 0.06);
        last = now;
        tLeft -= dt2;
        if (tLeft <= 0) { finish(); return; }
        if (Math.random() < dt2 * 1.7) {
          drops.push({ x: 20 + Math.random() * 260, y: -12, v: 55 + Math.random() * 65 });
        }
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.y += d.v * dt2;
          if (d.y > 296 && Math.abs(d.x - bx) < 26) { score++; drops.splice(i, 1); }
          else if (d.y > 330) drops.splice(i, 1);
        }
        cx2.clearRect(0, 0, 300, 330);
        cx2.font = '20px serif';
        for (const d of drops) cx2.fillText('🐟', d.x - 10, d.y);
        cx2.fillText('🧺', bx - 12, 318);
        cx2.fillStyle = '#f4efe4';
        cx2.font = '14px sans-serif';
        cx2.fillText('⏱ ' + Math.ceil(tLeft) + '   ✚ ' + score, 10, 20);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => { finish(); });
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v13: Muhtarlık — Dorfprojekte finanzieren ----------
    showVillage() {
      const L = state.settings.lang;
      $('event-icon').textContent = '🏘️';
      $('event-title').textContent = t('villageTitle');
      $('event-text').innerHTML = t('villageIntro', CFG.village.minRep);
      const box = $('event-choices');
      box.innerHTML = '';
      for (const [id, P] of Object.entries(CFG.village.projects)) {
        const st = state.village[id] || 0;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (st === 2 ? ' owned' : '');
        const status = st === 2 ? t('villageDoneLabel')
          : st === 1 ? t('villageBuilding', state.villageDays[id])
          : fmtMoney(P.cost, L);
        row.innerHTML = `
          <div class="u-icon">${id === 'okul' ? '🏫' : id === 'cayevi2' ? '🍵' : '🕌'}</div>
          <div class="u-body"><div class="u-name">${t('vproj_' + id)}</div>
          <div class="u-desc">${t('vprojDesc_' + id)}</div></div>
          <button ${st !== 0 || state.money < P.cost || state.rep < CFG.village.minRep ? 'disabled' : ''}>${status}</button>`;
        if (st === 0) {
          row.querySelector('button').addEventListener('click', () => {
            if (hooks.buyVillage(id)) api.showVillage();
          });
        }
        box.appendChild(row);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v12: Konak-Restaurierung ----------
    showKonak() {
      const L = state.settings.lang;
      $('event-icon').textContent = '🏛️';
      $('event-title').textContent = t('konakTitle');
      $('event-text').innerHTML = t('konakText' + state.konak)
        + (state.konak >= 3 ? `<br><br>${t('konakInfo')}` : '');
      const box = $('event-choices');
      box.innerHTML = '';
      if (state.konak < 3) {
        const cost = CFG.konak.stages[state.konak];
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.disabled = state.money < cost;
        b.textContent = t('konakRestoreBtn', state.konak + 1) + ' · ' + fmtMoney(cost, L);
        b.addEventListener('click', () => { if (hooks.restoreKonak()) api.showKonak(); });
        box.appendChild(b);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v17: Basar-Stand verwalten ----------
    showStall() {
      const L = state.settings.lang;
      const st = state.stall;
      if (!st) return;
      $('event-icon').textContent = '🧿';
      $('event-title').textContent = t('stallTitle');
      const total = Object.values(st.stock).reduce((a, b) => a + b, 0);
      $('event-text').innerHTML = t('stallIntro', total, CFG.stall.maxStock)
        + `<br>${t('stallToday', st.soldToday, fmtMoney(st.earnedToday, L))}`;
      const box = $('event-choices');
      box.innerHTML = '';
      // Preisfaktor
      const fBtn = document.createElement('button');
      fBtn.className = 'big-btn';
      fBtn.textContent = t('stallFactor', '×' + st.factor);
      fBtn.addEventListener('click', () => {
        fBtn.textContent = t('stallFactor', '×' + hooks.stallCycleFactor());
      });
      box.appendChild(fBtn);
      // Ware rein/raus
      const ids = Object.keys(CFG.products).filter((id) =>
        Math.floor(state.inventory[id] || 0) > 0 || (st.stock[id] || 0) > 0);
      for (const id of ids.slice(0, 8)) {
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        const render = () => {
          row.innerHTML = `
            <div class="u-icon">${CFG.products[id].icon}</div>
            <div class="u-body"><div class="u-name">${t('prod_' + id)}</div>
            <div class="u-desc">🎒 ${Math.floor(state.inventory[id] || 0)} · 🧺 ${st.stock[id] || 0}</div></div>
            <div class="btn-mini-row"><button data-n="-1">−</button><button data-n="1">+</button></div>`;
          row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
            if (hooks.stallStock(id, parseInt(b.dataset.n, 10))) { render(); api.showStall(); }
          }));
        };
        render();
        box.appendChild(row);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v17: Imker-Meisterschaft ----------
    showBeeCup() {
      const L = state.settings.lang;
      const B = CFG.beeCup;
      $('event-icon').textContent = '🐝';
      $('event-title').textContent = t('beeTitle');
      $('event-text').innerHTML = t('beeIntro', B.entryHoney, fmtMoney(B.prize, L))
        + (state.beeCupWins > 0 ? `<br>🏆 ${t('beeWins', state.beeCupWins)}` : '');
      const box = $('event-choices');
      box.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.disabled = Math.floor(state.inventory.honey) < B.entryHoney;
      b.textContent = t('beeEnter', B.entryHoney);
      b.addEventListener('click', () => {
        const res = hooks.enterBeeCup();
        if (!res) return;
        $('event-text').innerHTML = (res.win ? '🏆 ' + t('beeWin', fmtMoney(res.prize, L)) : t('beeLose'))
          + `<br><b>${res.my}</b> : ${res.opp}`;
        b.disabled = true;
      });
      box.appendChild(b);
      if (!state.queen) {
        const q = document.createElement('button');
        q.className = 'big-btn ghost';
        q.disabled = state.money < B.queenCost;
        q.textContent = t('beeQueen') + ' · ' + fmtMoney(B.queenCost, L);
        q.addEventListener('click', () => { if (hooks.buyQueen()) q.remove(); });
        box.appendChild(q);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v18: Fındık-Filiale ----------
    showBranch() {
      const L = state.settings.lang;
      const V = CFG.valley2;
      $('event-icon').textContent = '🌰';
      $('event-title').textContent = t('branchTitle');
      const box = $('event-choices');
      box.innerHTML = '';
      if (!state.branch) {
        $('event-text').innerHTML = t('branchPitch', fmtMoney(V.branchCost, L));
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.disabled = state.money < V.branchCost;
        b.textContent = t('branchBuyBtn') + ' · ' + fmtMoney(V.branchCost, L);
        b.addEventListener('click', () => { if (hooks.buyBranch()) api.showBranch(); });
        box.appendChild(b);
      } else {
        const B2 = state.branch;
        $('event-text').innerHTML = t('branchInfo', B2.workers, V.maxWorkers,
          B2.workers * V.hazelPerWorker, fmtMoney(B2.workers * V.workerWage, L));
        if (B2.workers < V.maxWorkers) {
          const h = document.createElement('button');
          h.className = 'big-btn';
          h.disabled = state.money < V.workerCost;
          h.textContent = t('branchHireBtn') + ' · ' + fmtMoney(V.workerCost, L);
          h.addEventListener('click', () => { if (hooks.branchHire()) api.showBranch(); });
          box.appendChild(h);
        }
        const m = document.createElement('button');
        m.className = 'big-btn ghost';
        m.textContent = t('branchMode_' + B2.mode);
        m.addEventListener('click', () => { m.textContent = t('branchMode_' + hooks.branchMode()); });
        box.appendChild(m);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v24: Dede-Kochbuch ----------
    showCook() {
      $('event-icon').textContent = '📖';
      $('event-title').textContent = t('cookTitle');
      $('event-text').innerHTML = t('cookIntro');
      const box = $('event-choices');
      box.innerHTML = '';
      for (const [rid, R] of Object.entries(CFG.recipes)) {
        const unlocked = state.recipes[rid];
        const ingredients = Object.entries(R.needs)
          .map(([ing, n]) => `${n}× ${CFG.products[ing].icon}`).join(' + ');
        const can = unlocked && !state._cooked
          && Object.entries(R.needs).every(([ing, n]) => Math.floor(state.inventory[ing] || 0) >= n);
        const b = document.createElement('button');
        b.className = 'big-btn' + (unlocked ? '' : ' ghost');
        b.disabled = !can;
        b.textContent = unlocked
          ? `${R.icon} ${t('dish_' + rid)} · ${ingredients}`
          : `🔒 ${t('dish_' + rid)} (${t('cookNeedRep', R.rep)})`;
        if (unlocked) b.addEventListener('click', () => { if (hooks.cookDish(rid)) hooks.closeShop(); });
        box.appendChild(b);
      }
      if (state._cooked) {
        const info = document.createElement('div');
        info.className = 'section-info';
        info.textContent = t('cookDoneToday');
        box.appendChild(info);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v25: Radyo Vadisi — Tagesprogramm ----------
    showRadyoVadisi() {
      $('event-icon').textContent = '📡';
      $('event-title').textContent = t('radyoTitle');
      $('event-text').innerHTML = t('radyoIntro');
      const box = $('event-choices');
      box.innerHTML = '';
      const PROGS = [['music', '🎶'], ['news', '🗞️'], ['ads', '📢']];
      for (const [pid, ic] of PROGS) {
        const b = document.createElement('button');
        const active = state.radyo && state.radyo.program === pid;
        b.className = 'big-btn' + (active ? '' : ' ghost');
        b.textContent = `${ic} ${t('radyoProg_' + pid)}${active ? ' ✓' : ''} — ${t('radyoProgDesc_' + pid)}`;
        b.addEventListener('click', () => { if (hooks.setRadyoProgram(pid)) hooks.closeShop(); });
        box.appendChild(b);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v23: Kemençe kaufen ----------
    showBuskBuy() {
      const L = state.settings.lang;
      $('event-icon').textContent = '🎻';
      $('event-title').textContent = t('buskTitle');
      $('event-text').innerHTML = t('buskPitch', fmtMoney(CFG.busking.cost, L));
      const box = $('event-choices');
      box.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.disabled = state.money < CFG.busking.cost;
      b.textContent = t('buskBuyBtn') + ' · ' + fmtMoney(CFG.busking.cost, L);
      b.addEventListener('click', () => { if (hooks.buyKemence()) hooks.closeShop(); });
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.append(b, leave);
      show(els.eventS);
    },

    // ---------- v23: Straßenmusik (Timing wie Kraftmesser) ----------
    showBusking() {
      const L = state.settings.lang;
      api._timingGame({
        icon: '🎻', title: t('buskTitle'), intro: t('buskIntro', fmtMoney(CFG.busking.perHit, L)),
        btn: t('buskPlay'), rounds: 4, speed: 1.5,
        onDone(scores) {
          const res = hooks.buskResult(scores);
          return `${res.perfect ? '🌟 ' + t('buskPerfect') : t('buskOk', res.hits)}<br><b>+${fmtMoney(res.pay, L)}</b>`;
        }
      });
    },

    // ---------- v23: Arcade-Auswahl + Kayık Rallisi ----------
    showArcadeMenu() {
      $('event-icon').textContent = '🕹️';
      $('event-title').textContent = t('arcadeMenuTitle');
      $('event-text').innerHTML = t('arcadeMenuIntro');
      const box = $('event-choices');
      box.innerHTML = '';
      const g1 = document.createElement('button');
      g1.className = 'big-btn';
      g1.textContent = '🐟 ' + t('arcadeTitle');
      g1.addEventListener('click', () => api.showArcade());
      const g2 = document.createElement('button');
      g2.className = 'big-btn';
      g2.textContent = '🛶 ' + t('arcade2Title');
      g2.addEventListener('click', () => api.showArcade2());
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.append(g1, g2, leave);
      show(els.eventS);
    },

    showArcade2() {
      $('event-icon').textContent = '🛶';
      $('event-title').textContent = t('arcade2Title');
      $('event-text').innerHTML = `${t('arcade2Intro', state.arcade2Best)}
        <canvas id="arc2-cv" width="300" height="330" style="display:block;margin:10px auto;background:#0d2430;border-radius:10px"></canvas>`;
      const box = $('event-choices');
      box.innerHTML = '';
      const cv = $('arc2-cv');
      const cx2 = cv.getContext('2d');
      let bx = 150, score = 0, tLeft = 25, running2 = true, raf = 0, speed2 = 90;
      const buoys = [];
      let last = performance.now();
      const onMove = (e) => {
        const r = cv.getBoundingClientRect();
        bx = Math.max(24, Math.min(276, (e.clientX - r.left) / r.width * 300));
      };
      const onKey = (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') bx = Math.max(24, bx - 26);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') bx = Math.min(276, bx + 26);
      };
      cv.addEventListener('mousemove', onMove);
      window.addEventListener('keydown', onKey);
      function frame(now) {
        const dt2 = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!running2) return;
        tLeft -= dt2;
        speed2 += dt2 * 6;
        if (Math.random() < dt2 * 1.6) buoys.push({ x: 24 + Math.random() * 252, y: -12 });
        cx2.fillStyle = '#0d2430'; cx2.fillRect(0, 0, 300, 330);
        // Ufer
        cx2.fillStyle = '#1e4d33'; cx2.fillRect(0, 0, 14, 330); cx2.fillRect(286, 0, 14, 330);
        cx2.font = '20px serif'; cx2.textAlign = 'center';
        for (let i = buoys.length - 1; i >= 0; i--) {
          const b2 = buoys[i];
          b2.y += speed2 * dt2;
          cx2.fillText('🛟', b2.x, b2.y);
          if (b2.y > 340) { buoys.splice(i, 1); score += 1; continue; }
          if (Math.abs(b2.x - bx) < 20 && Math.abs(b2.y - 300) < 18) {
            running2 = false;   // Crash beendet die Fahrt
          }
        }
        cx2.fillText('🛶', bx, 306);
        cx2.fillStyle = '#cfe8ef'; cx2.font = '14px system-ui'; cx2.textAlign = 'left';
        cx2.fillText(`⏱ ${Math.ceil(tLeft)}s · ★ ${score}`, 20, 22);
        if (tLeft <= 0) running2 = false;
        if (running2) { raf = requestAnimationFrame(frame); return; }
        // Ende
        cv.removeEventListener('mousemove', onMove);
        window.removeEventListener('keydown', onKey);
        const res = hooks.arcade2Result(score);
        const L2 = state.settings.lang;
        const list = [...res.rivals, [state.playerName || 'SEN', res.best]]
          .sort((a2, b3) => b3[1] - a2[1])
          .map(([n2, sc], i2) => `${i2 + 1}. ${n2} — ${sc}`).join('<br>');
        $('event-text').innerHTML = `${t('arcade2Done', score, fmtMoney(res.pay, L2))}<br><br><b>${t('arcade2Board')}</b><br>${list}`;
      }
      raf = requestAnimationFrame(frame);
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => {
        running2 = false;
        cancelAnimationFrame(raf);
        cv.removeEventListener('mousemove', onMove);
        window.removeEventListener('keydown', onKey);
        hooks.closeShop();
      });
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v23: Geisterhaus-Kapitel ----------
    showGhost(stage) {
      $('event-icon').textContent = '🏚️';
      $('event-title').textContent = t('ghostTitle');
      $('event-text').innerHTML = t('ghostCh' + stage);
      const box = $('event-choices');
      box.innerHTML = '';
      const ok = document.createElement('button');
      ok.className = 'big-btn';
      ok.textContent = t('continue2');
      ok.addEventListener('click', () => hooks.closeShop());
      box.appendChild(ok);
      show(els.eventS);
    },

    // ---------- v22: Tauchmaske ----------
    showDiveBuy() {
      const L = state.settings.lang;
      $('event-icon').textContent = '🤿';
      $('event-title').textContent = t('diveTitle');
      $('event-text').innerHTML = t('divePitch', fmtMoney(CFG.diving.maskCost, L));
      const box = $('event-choices');
      box.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.disabled = state.money < CFG.diving.maskCost;
      b.textContent = t('diveBuyBtn') + ' · ' + fmtMoney(CFG.diving.maskCost, L);
      b.addEventListener('click', () => { if (hooks.buyMask()) hooks.closeShop(); });
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.append(b, leave);
      show(els.eventS);
    },

    // ---------- v22: Kangal-Ausbildung ----------
    showDog() {
      $('event-icon').textContent = '🐕';
      $('event-title').textContent = t('dogTitle');
      $('event-text').innerHTML = t('dogIntro', Math.floor(state.inventory.cheese));
      const box = $('event-choices');
      box.innerHTML = '';
      for (const [trick, need] of Object.entries(CFG.dogTricks)) {
        const learned = state.dogTricks[trick];
        const b = document.createElement('button');
        b.className = 'big-btn' + (learned ? ' ghost' : '');
        b.disabled = learned || Math.floor(state.inventory.cheese) < need.cheese;
        b.textContent = (learned ? '✅ ' : '') + t('dogTrick_' + trick) + (learned ? '' : ` · ${need.cheese} 🧀`);
        if (!learned) b.addEventListener('click', () => { if (hooks.trainDog(trick)) api.showDog(); });
        box.appendChild(b);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v22: Platanenbaum ----------
    showTree() {
      const L = state.settings.lang;
      const T = CFG.planeTree;
      $('event-icon').textContent = '🌳';
      $('event-title').textContent = t('treeTitle');
      $('event-text').innerHTML = t('treeIntro', state.treeStage);
      const box = $('event-choices');
      box.innerHTML = '';
      const climb = document.createElement('button');
      climb.className = 'big-btn';
      climb.textContent = t('treeClimbBtn');
      climb.addEventListener('click', () => { hooks.closeShop(); hooks.treeClimb(); });
      box.appendChild(climb);
      if (state.treeStage < T.stages.length) {
        const b = document.createElement('button');
        b.className = 'big-btn ghost';
        b.disabled = state.money < T.stages[state.treeStage];
        b.textContent = t('treeBuildBtn', state.treeStage + 1) + ' · ' + fmtMoney(T.stages[state.treeStage], L);
        b.addEventListener('click', () => { if (hooks.treeBuild()) api.showTree(); });
        box.appendChild(b);
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v21: Tankstelle & Werkstatt ----------
    showPetrol() {
      const L = state.settings.lang;
      const P = CFG.petrol;
      $('event-icon').textContent = '⛽';
      $('event-title').textContent = t('petrolTitle');
      const box = $('event-choices');
      box.innerHTML = '';
      if (!state.petrol) {
        $('event-text').innerHTML = t('petrolPitch', fmtMoney(P.cost, L), fmtMoney(P.perCustomer, L));
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.disabled = state.money < P.cost;
        b.textContent = t('petrolBuyBtn') + ' · ' + fmtMoney(P.cost, L);
        b.addEventListener('click', () => { if (hooks.buyPetrol()) api.showPetrol(); });
        box.appendChild(b);
      } else {
        $('event-text').innerHTML = t('petrolInfo', state._petrolToday || 0, fmtMoney((state._petrolToday || 0) * P.perCustomer, L))
          + (state.petrol.werkstatt ? `<br>🔧 ${t('werkstattActive', fmtMoney(P.werkstattPerDay, L))}` : '');
        if (!state.petrol.werkstatt) {
          const w = document.createElement('button');
          w.className = 'big-btn';
          w.disabled = state.money < P.werkstattCost;
          w.textContent = t('werkstattBuyBtn') + ' · ' + fmtMoney(P.werkstattCost, L);
          w.addEventListener('click', () => { if (hooks.buyWerkstatt()) api.showPetrol(); });
          box.appendChild(w);
        }
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v20: Immobilien-Flipping ----------
    showFlip(i) {
      const L = state.settings.lang;
      const FL = CFG.flip;
      const st = state.flips[i];
      $('event-icon').textContent = '🏗️';
      $('event-title').textContent = t('flipTitle');
      const box = $('event-choices');
      box.innerHTML = '';
      if (!st) {
        $('event-text').innerHTML = t('flipPitch', fmtMoney(FL.buyCost, L), fmtMoney(FL.sellPrice, L));
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.disabled = state.money < FL.buyCost;
        b.textContent = t('flipBuyBtn') + ' · ' + fmtMoney(FL.buyCost, L);
        b.addEventListener('click', () => { if (hooks.buyFlip(i)) api.showFlip(i); });
        box.appendChild(b);
      } else if (st.stage !== undefined) {
        const rent = Math.round(FL.rentBase + state.rep * FL.rentPerRep);
        $('event-text').innerHTML = t('flipStatus', st.stage)
          + (st.stage === 3 ? `<br>${t('flipReadyInfo', fmtMoney(FL.sellPrice, L), fmtMoney(rent, L))}` : '');
        if (st.stage < 3) {
          const cost = FL.renoCosts[st.stage];
          const b = document.createElement('button');
          b.className = 'big-btn';
          b.disabled = state.money < cost;
          b.textContent = t('flipRenoBtn', st.stage + 1) + ' · ' + fmtMoney(cost, L);
          b.addEventListener('click', () => { if (hooks.renoFlip(i)) api.showFlip(i); });
          box.appendChild(b);
        } else {
          const sell = document.createElement('button');
          sell.className = 'big-btn';
          sell.textContent = t('flipSellBtn') + ' · ' + fmtMoney(FL.sellPrice, L);
          sell.addEventListener('click', () => { if (hooks.sellFlip(i)) hooks.closeShop(); });
          box.appendChild(sell);
          const rentBtn = document.createElement('button');
          rentBtn.className = 'big-btn ghost';
          rentBtn.textContent = st.rent ? t('flipRentOffBtn') : t('flipRentBtn', fmtMoney(rent, L));
          rentBtn.addEventListener('click', () => { if (hooks.rentFlip(i)) api.showFlip(i); });
          box.appendChild(rentBtn);
        }
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v19: Çırak ----------
    showCirak() {
      const L = state.settings.lang;
      const C = CFG.cirak;
      $('event-icon').textContent = '🎓';
      $('event-title').textContent = t('cirakTitle');
      const box = $('event-choices');
      box.innerHTML = '';
      if (!state.cirak) {
        $('event-text').innerHTML = t('cirakPitch', fmtMoney(C.hireCost, L), fmtMoney(C.wage, L));
        const b = document.createElement('button');
        b.className = 'big-btn';
        b.disabled = state.money < C.hireCost;
        b.textContent = t('cirakHireBtn') + ' · ' + fmtMoney(C.hireCost, L);
        b.addEventListener('click', () => { if (hooks.hireCirak()) api.showCirak(); });
        box.appendChild(b);
      } else {
        const lvl = state.cirak.level;
        let perks = '';
        for (let i = 1; i <= 4; i++) {
          perks += `<div>${i <= lvl ? '✅' : '🔒'} ${t('cirakPerk' + i)}</div>`;
        }
        $('event-text').innerHTML = `${t('cirakLevelInfo', lvl)}<br><br>${perks}`;
        if (lvl < 4) {
          const cost = C.trainCosts[lvl - 1];
          const b = document.createElement('button');
          b.className = 'big-btn';
          b.disabled = state.money < cost;
          b.textContent = t('cirakTrainBtn', lvl + 1) + ' · ' + fmtMoney(cost, L);
          b.addEventListener('click', () => { if (hooks.trainCirak()) api.showCirak(); });
          box.appendChild(b);
        }
      }
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v19: Museum-Ausstellung ----------
    showMuseum() {
      const L = state.settings.lang;
      $('event-icon').textContent = '🧿';
      $('event-title').textContent = t('museumTitle');
      const rows = [
        ['🐟', 'exCanavar', state.canavar && state.canavar.wins > 0],
        ['🏆', 'exCups', state.sampiyon || state.beeCupWins > 0 || state.electionsWon > 0],
        ['🃏', 'exCards', Object.keys(state.collect || {}).length >= 3],
        ['📸', 'exPhotos', (state.memories || []).length >= 5],
        ['🏺', 'exAmphora', (state.amphoras || 0) > 0]
      ];
      const n = rows.filter((r) => r[2]).length;
      let html = t('museumIntro', n, fmtMoney(n * CFG.museum2.perExhibit, L)) + '<br><br>';
      for (const [ic, key, on] of rows) {
        html += `<div>${on ? ic : '⬜'} ${t(key)} ${on ? '✓' : '<span class="row-sub">' + t('exMissing') + '</span>'}</div>`;
      }
      $('event-text').innerHTML = html;
      const box = $('event-choices');
      box.innerHTML = '';
      const leave = document.createElement('button');
      leave.className = 'big-btn ghost';
      leave.textContent = t('back');
      leave.addEventListener('click', () => hooks.closeShop());
      box.appendChild(leave);
      show(els.eventS);
    },

    // ---------- v19: Karadeniz Canavarı — Boss-Drill ----------
    showCanavar() {
      const L = state.settings.lang;
      api._timingGame({
        icon: '🐉', title: t('canavarTitle'), intro: t('canavarIntro', fmtMoney(CFG.canavar.prize, L)),
        btn: t('canavarReel'), rounds: 5, speed: 2.0,
        onDone(scores) {
          const res = hooks.canavarResult(scores);
          if (res.win) {
            return `${res.first ? '🏆 ' + t('canavarFirst') : t('canavarAgain')}<br><b>+${fmtMoney(res.prize, L)}</b>`;
          }
          return t('canavarEscaped', res.hits);
        }
      });
    },

    // ---------- v19: Story 4 — Nurten Hanım ----------
    showStory4(stage) {
      const L = state.settings.lang;
      $('event-icon').textContent = '🕴️';
      $('event-title').textContent = t('story4Title');
      const box = $('event-choices');
      box.innerHTML = '';
      if (stage === 1) {
        $('event-text').innerHTML = t('story4Ch1');
        const ok = document.createElement('button');
        ok.className = 'big-btn';
        ok.textContent = t('continue2');
        ok.addEventListener('click', () => hooks.closeShop());
        box.appendChild(ok);
      } else if (stage === 2) {
        const mine = state.parcels.filter((o) => o === 'me').length;
        const offer = mine * CFG.parcels.price * CFG.story4.sellMul;
        $('event-text').innerHTML = t('story4Ch2', mine, fmtMoney(offer, L));
        const sell = document.createElement('button');
        sell.className = 'big-btn';
        sell.textContent = t('story4SellBtn', fmtMoney(offer, L));
        sell.addEventListener('click', () => { hooks.story4Sell(); hooks.closeShop(); });
        const fight = document.createElement('button');
        fight.className = 'big-btn ghost';
        fight.textContent = t('story4FightBtn');
        fight.addEventListener('click', () => { hooks.story4Refuse(); hooks.closeShop(); });
        box.append(sell, fight);
      } else {
        $('event-text').innerHTML = t('story4Ch3');
        const canVillage = state.rep >= 25 || state.muhtarluk;
        const v = document.createElement('button');
        v.className = 'big-btn';
        v.disabled = !canVillage;
        v.textContent = t('story4VillageBtn') + (canVillage ? '' : ' 🔒');
        v.addEventListener('click', () => { hooks.story4Finale('village'); hooks.closeShop(); });
        const c = document.createElement('button');
        c.className = 'big-btn ghost';
        c.disabled = state.money < CFG.story4.courtCost;
        c.textContent = t('story4CourtBtn', fmtMoney(CFG.story4.courtCost, L));
        c.addEventListener('click', () => { hooks.story4Finale('court'); hooks.closeShop(); });
        const g = document.createElement('button');
        g.className = 'big-btn danger';
        g.textContent = t('story4GiveBtn');
        g.addEventListener('click', () => { hooks.story4Finale('give'); hooks.closeShop(); });
        box.append(v, c, g);
      }
      show(els.eventS);
    },

    // ---------- v10: Elfmeter-Duell gegen die Karşıköy Gençlik ----------
    showMac() {
      api._timingGame({
        icon: '⚽', title: t('macTitle'), intro: t('macIntro', fmtMoney(CFG.karsikoy.mac.stake, state.settings.lang), fmtMoney(CFG.karsikoy.mac.prize, state.settings.lang)),
        btn: t('macShoot'), rounds: 3, speed: 1.25,
        onDone(scores) {
          const goals = scores.filter(s2 => s2 > 0.55).length;
          const res = hooks.macResult(goals);
          return `${t('macScore', res.goals, res.opp)}<br><b>${res.won ? t('macWon') : t('macLost')}</b>`;
        }
      });
    },

    // ---------- v10: Karşıköy Pazarı ----------
    showKoyMarket() {
      const L = state.settings.lang;
      els.airportS.querySelector('h2').textContent = t('koyMarketTitle');
      const body = $('airport-body');
      body.innerHTML = `<div class="section-info">${t('koyMarketHint')}</div>`;
      let any = false;
      for (const pid of Object.keys(CFG.karsikoy.premium)) {
        const have = Math.floor(state.inventory[pid] || 0);
        if (have <= 0) continue;
        any = true;
        const price = Math.round(hooks.karsikoyPrice(pid));
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">${CFG.products[pid].icon}</div>
          <div class="u-body"><div class="u-name">${t('prod_' + pid)} × ${have} <span class="price-up">▲ ${t('premiumHere')}</span></div>
          <div class="u-desc">${fmtMoney(price, L)} / Stk</div></div>
          <button>${fmtMoney(have * price, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          hooks.sellKarsikoy(pid, have);
          api.showKoyMarket();
        });
        body.appendChild(row);
      }
      if (!any) body.innerHTML += `<div class="section-info">${t('cityNoGoods')}</div>`;
      show(els.airportS);
    },

    // ---------- v8: Çay-Ustası (Demlik-Timing) ----------
    showBrew() {
      $('event-icon').textContent = '🫖';
      $('event-title').textContent = t('brewTitle');
      $('event-text').innerHTML = `${t('brewIntro')}<div class="brew-bar"><div class="brew-zone"></div><div id="brew-pin"></div></div>`;
      const box = $('event-choices');
      box.innerHTML = '';
      const scores = [];
      let u = 0, dir = 1, raf = 0, running2 = true;
      const pin = () => $('brew-pin');
      const speed = 0.9;
      let last = performance.now();
      const loop = (now) => {
        if (!running2) return;
        const dt2 = Math.min((now - last) / 1000, 0.05);
        last = now;
        u += dir * speed * dt2;
        if (u > 1) { u = 1; dir = -1; }
        if (u < 0) { u = 0; dir = 1; }
        const p = pin();
        if (p) p.style.left = (u * 100) + '%';
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.textContent = t('brewNow') + ' (1/3)';
      b.addEventListener('click', () => {
        const score = Math.max(0, 1 - Math.abs(u - 0.5) / 0.5 * 1.6);
        scores.push(Math.min(1, score));
        if (scores.length >= 3) {
          running2 = false;
          cancelAnimationFrame(raf);
          const sum = hooks.brewReward(scores);
          const avg = scores.reduce((a2, b2) => a2 + b2, 0) / 3;
          $('event-text').innerHTML = `${avg > 0.85 ? t('brewPerfect') : avg > 0.5 ? t('brewOk') : t('brewWeak')}<br><b>+${fmtMoney(sum, state.settings.lang)}</b>`;
          box.innerHTML = '';
          const again = document.createElement('button');
          again.className = 'big-btn';
          again.textContent = t('tavlaAgain');
          again.addEventListener('click', () => api.showBrew());
          const done = document.createElement('button');
          done.className = 'big-btn ghost';
          done.textContent = t('back');
          done.addEventListener('click', () => hooks.closeShop());
          box.append(again, done);
        } else {
          b.textContent = t('brewNow') + ' (' + (scores.length + 1) + '/3)';
        }
      });
      const leave2 = document.createElement('button');
      leave2.className = 'big-btn ghost';
      leave2.textContent = t('back');
      leave2.addEventListener('click', () => { running2 = false; cancelAnimationFrame(raf); hooks.closeShop(); });
      box.append(b, leave2);
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
          ${state.factoryLog && state.factoryLines > 0 ? `<div class="section-info">${state.factoryLog.made > 0
            ? t('factoryNight', state.factoryLog.made, state.factoryLog.sold)
            : t('factoryNightOff')}</div>` : ''}
          <button id="btn-pack" class="big-btn" ${canPack ? '' : 'disabled'}>
            ${t('packNow', Math.floor(state.basketKg))}</button>
          <h3>${t('styleTitle')}</h3>
          <div class="btn-row">
            <button class="big-btn style-btn ${state.teaStyle === 'siyah' ? '' : 'ghost'}" data-s="siyah">📦 ${t('style_siyah')}</button>
            <button class="big-btn style-btn ${state.teaStyle === 'yesil' ? '' : 'ghost'}" data-s="yesil" ${state.greenLine ? '' : 'disabled'}>🍵 ${t('style_yesil')}</button>
            <button class="big-btn style-btn ${state.teaStyle === 'beyaz' ? '' : 'ghost'}" data-s="beyaz" ${state.dedeBonus ? '' : 'disabled'}>🏵️ ${t('style_beyaz')}</button>
            <button class="big-btn style-btn ${state.teaStyle === 'harman' ? '' : 'ghost'}" data-s="harman" ${state.dedeHarman ? '' : 'disabled'}>🫖 ${t('style_harman')}</button>
          </div>
          <div class="section-info">${t('styleInfo_' + state.teaStyle)}</div>
          ${!state.greenLine ? `<button id="btn-greenline" class="big-btn ghost" ${state.money < CFG.teaStyles.yesil.lineCost ? 'disabled' : ''}>
            ${t('buyGreenLine')} · ${fmtMoney(CFG.teaStyles.yesil.lineCost, L)}</button>` : ''}
          <div class="section-info">${t('factoryInfo')}</div>
          ${state.kemalPeace && !state.jointVenture ? `<button id="btn-jv" class="big-btn ghost"
              ${state.money < CFG.jointVenture.cost ? 'disabled' : ''}>🤝 ${t('jvName')} · ${fmtMoney(CFG.jointVenture.cost, L)}</button>
            <div class="section-info">${t('jvDesc')}</div>` : ''}
          ${state.jointVenture ? `<div class="section-info">🤝 ${t('jvActive')}</div>` : ''}
          <h3>${t('linesTitle')}</h3>
          <div class="section-info">${t('linesInfo', state.factoryLines, CFG.factory2.packsPerLine)}</div>
          ${state.factoryLines < CFG.factory2.lineCosts.length ? `<button id="btn-line" class="big-btn"
              ${state.money < CFG.factory2.lineCosts[state.factoryLines] ? 'disabled' : ''}>
              🏭 ${t('lineBtn', state.factoryLines + 1)} · ${fmtMoney(CFG.factory2.lineCosts[state.factoryLines], L)}</button>` : ''}
          ${state.billboards < CFG.billboards.max && !state.campaign ? `<button id="btn-campaign" class="big-btn ghost"
              ${state.money < CFG.billboards.cost ? 'disabled' : ''}>
              🎬 ${t('campaignBtn')} · ${fmtMoney(CFG.billboards.cost, L)}</button>` : ''}
          ${state.campaign ? `<div class="section-info">🎬 ${t('campaignPendingInfo')}</div>` : ''}
          ${state.billboards > 0 ? `<div class="section-info">🪧 ${t('billboardInfo', state.billboards, Math.round(state.billboards * CFG.billboards.bonusPer * 100))}</div>` : ''}`;
        $('btn-pack').addEventListener('click', () => { if (hooks.packBasket()) api.renderFactory(); });
        body.querySelectorAll('.style-btn').forEach(b => b.addEventListener('click', () => {
          if (hooks.setTeaStyle(b.dataset.s)) api.renderFactory();
        }));
        const gl = $('btn-greenline');
        if (gl) gl.addEventListener('click', () => { if (hooks.buyGreenLine()) api.renderFactory(); });
        const jv = $('btn-jv');
        if (jv) jv.addEventListener('click', () => { if (hooks.buyJointVenture()) api.renderFactory(); });
        const ln = $('btn-line');
        if (ln) ln.addEventListener('click', () => { if (hooks.buyLine()) api.renderFactory(); });
        const cp = $('btn-campaign');
        if (cp) cp.addEventListener('click', () => { if (hooks.bookCampaign()) api.renderFactory(); });
      }
      const exp = $('export-list');
      exp.innerHTML = '';
      if (hooks.featureOn && !hooks.featureOn('exports')) {
        exp.innerHTML = `<div class="section-info">🔒 ${t('exportsLocked')}</div>`;
        return;
      }
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
          <div class="section-info">${t('viewHint')}</div>
          <h3>⭐ ${t('ngpTitle')}${state.prestige > 0 ? ' · ' + '★'.repeat(Math.min(state.prestige, CFG.prestige.maxShown)) : ''}</h3>
          <div class="section-info">${hooks.ngpEligible() ? t('ngpInfo') : t('ngpLocked')}</div>
          ${hooks.ngpEligible() ? `<button id="btn-ngp" class="big-btn danger">${t('ngpBtn')}</button>` : ''}`;
        const ngp = $('btn-ngp');
        if (ngp) ngp.addEventListener('click', () => {
          if (ngp.dataset.armed) { hooks.newGamePlus(); return; }
          ngp.dataset.armed = '1';
          ngp.textContent = t('ngpConfirm');
        });
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
          // v7: Kursverlauf als Sparkline
          const cv = document.createElement('canvas');
          cv.className = 'spark';
          cv.width = 300; cv.height = 44;
          body.appendChild(cv);
          api.drawSpark(cv, (state.hist.stocks || {})[id], chg >= 0 ? '#7ba24a' : '#c0533a');
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
        const seed = hooks.seedPrice ? hooks.seedPrice(id) : c.seed;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (locked ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">${locked ? '🔒' : c.icon}</div>
          <div class="u-body"><div class="u-name">${t('crop_' + id)}${state.koop && !locked ? ' <span class="price-up">🤝 −15 %</span>' : ''}</div>
          <div class="u-desc">${locked ? t('cropLocked', t('city_' + c.lock)) : t('cropInfo', c.days, c.yield, c.sell)}</div></div>
          <button ${locked || state.money < seed || free === 0 ? 'disabled' : ''} data-id="${id}">
            ${fmtMoney(seed, L)}
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
        const names = (state.animalNames[id] || []).slice(0, 3).join(', ');
        row.innerHTML = `
          <div class="u-icon">${a.icon}</div>
          <div class="u-body"><div class="u-name">${t('animal_' + id)} <span class="row-sub">${n} / ${a.max}</span></div>
          <div class="u-desc">${t('animalInfo', t('prod_' + a.product), a.perDay)}${names ? '<br>🏷️ ' + names + ((state.animalNames[id] || []).length > 3 ? '…' : '') : ''}</div></div>
          <button ${state.money < a.cost || n >= a.max ? 'disabled' : ''} data-id="${id}">
            ${fmtMoney(a.cost, L)}
          </button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyAnimal(id)) api.renderFarm();
        });
        animalList.appendChild(row);
      }
      // v7: Kangal-Hund
      {
        const owned = state.dog;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">🐕</div>
          <div class="u-body"><div class="u-name">${t('dogName')}</div>
          <div class="u-desc">${t('dogDesc')}</div></div>
          <button ${owned || state.money < CFG.dog.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.dog.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyDog()) api.renderFarm();
        });
        animalList.appendChild(row);
      }
      // v9: Mandıra (Milch -> Peynir, jede Nacht)
      {
        const owned = state.mandira;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">🧀</div>
          <div class="u-body"><div class="u-name">${t('mandiraName')}</div>
          <div class="u-desc">${t('mandiraDesc')}</div></div>
          <button ${owned || state.money < CFG.mandira.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.mandira.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyMandira()) api.renderFarm();
        });
        animalList.appendChild(row);
      }
      // v11: Haselnuss-Plantage
      {
        const owned = state.orchard;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">🌰</div>
          <div class="u-body"><div class="u-name">${t('orchardName')}</div>
          <div class="u-desc">${t('orchardDesc')}</div></div>
          <button ${owned || state.money < CFG.orchard.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.orchard.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyOrchard()) api.renderFarm();
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
          <button class="mk-haggle" title="${t('haggleTitle')}">🗣️</button>
          <button data-id="${id}">${fmtMoney(have * price, L)}</button>`;
        row.querySelector('button[data-id]').addEventListener('click', () => {
          hooks.sellProduct(id, have);
          api.renderMarket();
        });
        row.querySelector('.mk-haggle').addEventListener('click', () => {
          hooks.haggleSell(id);
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
      // v8: Hamsi-Schleppnetz
      if (!state.net) {
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">🕸️</div>
          <div class="u-body"><div class="u-name">${t('netName')}</div>
          <div class="u-desc">${t('netDesc')}</div></div>
          <button ${state.money < CFG.net.cost ? 'disabled' : ''}>${fmtMoney(CFG.net.cost, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyNet()) api.renderMarket();
        });
        list.appendChild(row);
      }
      // v9: Muhlama-Lokanta (verkauft abends Peynir + Mais als Gericht)
      if (!state.restaurant) {
        const row = document.createElement('div');
        row.className = 'upgrade-item';
        row.innerHTML = `
          <div class="u-icon">🫕</div>
          <div class="u-body"><div class="u-name">${t('restaurantName')}</div>
          <div class="u-desc">${t('restaurantDesc')}</div></div>
          <button ${state.money < CFG.restaurant.cost ? 'disabled' : ''}>${fmtMoney(CFG.restaurant.cost, L)}</button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyRestaurant()) api.renderMarket();
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
      // v10: Dolmuş-Linie
      {
        const owned = state.dolmus;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">🚌</div>
          <div class="u-body"><div class="u-name">${t('dolmusName')}</div>
          <div class="u-desc">${t('dolmusDesc')}</div></div>
          <button ${owned || state.money < CFG.dolmus.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.dolmus.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyDolmus()) api.renderDealer();
        });
        list.appendChild(row);
      }
      // v9: Helikopter (Endgame)
      {
        const owned = state.heli;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">🚁</div>
          <div class="u-body"><div class="u-name">${t('heliName')}</div>
          <div class="u-desc">${t('heliDesc')}</div></div>
          <button ${owned || state.money < CFG.heli.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.heli.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyHeli()) api.renderDealer();
        });
        list.appendChild(row);
      }
      // v15: Küstenfrachter
      {
        const owned = state.freighter;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">⚓</div>
          <div class="u-body"><div class="u-name">${t('freightName')}</div>
          <div class="u-desc">${t('freightDesc')}</div></div>
          <button ${owned || state.money < CFG.freighter.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.freighter.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyFreighter()) api.renderDealer();
        });
        list.appendChild(row);
      }
      // v12: Segel-Gulet
      {
        const owned = state.gulet;
        const row = document.createElement('div');
        row.className = 'upgrade-item' + (owned ? ' owned' : '');
        row.innerHTML = `
          <div class="u-icon">⛵</div>
          <div class="u-body"><div class="u-name">${t('guletName')}</div>
          <div class="u-desc">${t('guletDesc')}</div></div>
          <button ${owned || state.money < CFG.gulet.cost ? 'disabled' : ''}>
            ${owned ? t('owned') + ' ✓' : fmtMoney(CFG.gulet.cost, L)}</button>`;
        if (!owned) row.querySelector('button').addEventListener('click', () => {
          if (hooks.buyGulet()) api.renderDealer();
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
        const wMax = workerMax();   // v16: Limit wächst mit Handels-Level
        body.innerHTML = `
          <div class="manage-count">👷 ${state.workers} / ${wMax}</div>
          ${wMax < CFG.xp.workerCaps[CFG.xp.workerCaps.length - 1]
            ? `<div class="section-info" style="text-align:center">${t('workerCapInfo', CFG.xp.workerCaps[Math.min(CFG.xp.workerCaps.length - 1, Math.floor(xpLevel(state.xp.trade) / 2) + 1)])}</div>` : ''}
          <div class="section-info" style="text-align:center">${t('workerInfo', W.hireCost, W.wage)}</div>
          <div class="section-info" style="text-align:center">${t('workerToday', Math.round(state.workerKg * 10) / 10)}</div>
          ${(() => { const r = state.botReports[state.botReports.length - 1]; return r
            ? `<div class="section-info" style="text-align:center">🤖 ${t('botReportLine', r.day, r.kg, fmtMoney(r.earned, L), r.fish)}</div>` : ''; })()}
          <div class="btn-row">
            <button id="btn-hire" class="big-btn" ${state.workers >= wMax || state.money < W.hireCost ? 'disabled' : ''}>
              ${t('hireWorker')} · ${fmtMoney(W.hireCost, L)}</button>
            <button id="btn-fire" class="big-btn ghost" ${state.workers <= 0 ? 'disabled' : ''}>${t('fireWorker')}</button>
          </div>
          <button id="btn-cirak" class="big-btn ghost">🎓 ${state.cirak ? t('cirakStatus', state.cirak.level) : t('cirakHireBtn')}</button>
          ${state.dog ? `<button id="btn-dog" class="big-btn ghost">🐕 ${t('dogMenuBtn', Object.keys(state.dogTricks).length)}</button>` : ''}
          <button id="btn-dukkan" class="big-btn ghost">🛒 ${t('dukkanBtn')}</button>
          ${(() => { const total = CFG.parcels.spots.length;
            let owned = 0;
            for (let i = 0; i < total; i++) if (state.parcels[i] === 'me') owned++;
            const info = hooks.nextParcelInfo ? hooks.nextParcelInfo() : null;
            if (!info) return `<button class="big-btn ghost" disabled>🚩 ${t('parcelAllOwned', owned, total)}</button>`;
            return `<button id="btn-parcel" class="big-btn ghost" ${state.money >= info.cost ? '' : 'disabled'}>
              ${info.buyback ? '🤝' : '🏞️'} ${t(info.buyback ? 'parcelBuybackBtn' : 'parcelBuyBtn', owned, total, fmtMoney(info.cost, L))}</button>`; })()}
          ${state.cirak ? `<button id="btn-kahya" class="big-btn ${state.kahya ? '' : 'ghost'}">🎩 ${t(state.kahya ? 'kahyaOn' : 'kahyaOff')}</button>` : `<div class="section-info">🎩 ${t('kahyaNeed')}</div>`}
          ${state.kahya && state.kahyaReport ? `<div class="section-info">${t('kahyaReport', fmtMoney(state.kahyaReport.earned, L), state.kahyaReport.harv, state.kahyaReport.planted)}</div>` : ''}
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
        $('btn-cirak').addEventListener('click', () => { api.hideOverlays(); api.showCirak(); });
        const db = $('btn-dog');
        if (db) db.addEventListener('click', () => { api.hideOverlays(); api.showDog(); });
        $('btn-dukkan').addEventListener('click', () => { api.hideOverlays(); api.showShop(); });
        if ($('btn-parcel')) $('btn-parcel').addEventListener('click', () => { if (hooks.buyNextParcel && hooks.buyNextParcel()) api.renderManage(); });
        if ($('btn-kahya')) $('btn-kahya').addEventListener('click', () => { if (hooks.toggleKahya && hooks.toggleKahya()) api.renderManage(); });
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
        let html = '';
        const chapters = ['letter', 'tin', 'ingredients', 'brew', 'legacy',
          'rivalMeet', 'oldPhoto', 'partners', 'whiteGift', 'baris'];
        chapters.forEach((id, i) => {
          if (i === 5) html += `<h3>📖 ${t('season2Title')}</h3>`;
          const done = state.story > i;
          const active = state.story === i;
          html += `<div class="upgrade-item${done ? ' owned' : ''}">
            <div class="u-icon">${done ? '✅' : active ? '🎯' : '🔒'}</div>
            <div class="u-body"><div class="u-name">${(i % 5) + 1}. ${t('stTitle_' + id)}</div>
            <div class="u-desc">${done ? t('questDone') : active ? t('stGoal_' + id) : '···'}</div></div>
          </div>`;
        });
        if (state.story >= 10) html += `<div class="section-info">🏆 ${t('questAllDone')}</div>`;
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
        // v10: Basar-Schätze-Sammelalbum
        html += `<h3>🧿 ${t('collectTitle')} (${hooks.collectCount()}/${hooks.collectTotal()})</h3>
          <div class="section-info">${t('collectHint')}</div>
          <div class="collect-grid">${COLLECT_DEFS.map(d => {
            const got2 = !!state.collect[d.id];
            return `<div class="collect-cell${got2 ? '' : ' locked'}" title="${t('col_' + d.id)}">
              <span>${got2 ? d.icon : '❓'}</span><em>${got2 ? t('col_' + d.id) : '???'}</em></div>`;
          }).join('')}</div>`;
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
        <h3>${t('chartEarned')}</h3>
        <canvas id="chart-earned" class="spark" width="300" height="56"></canvas>
        <div class="section-info">🍃 ${t('chartSrcTea')}</div>
        <canvas id="chart-src-tea" class="spark" width="300" height="36"></canvas>
        <div class="section-info">🐟 ${t('chartSrcFish')}</div>
        <canvas id="chart-src-fish" class="spark" width="300" height="36"></canvas>
        <div class="section-info">🥬 ${t('chartSrcVeg')}</div>
        <canvas id="chart-src-veg" class="spark" width="300" height="36"></canvas>
        <h3>${t('repTitle')}</h3>
        <div class="section-info">${t('repInfo')}</div>
        <div class="share-bar"><div class="share-me" style="width:${state.rep}%;background:#3f6d9a"></div></div>
        <div class="share-legend"><span>${t('repShort')}: ${state.rep} / 100</span>
          <span>${state.koop ? '🤝 ' + t('koopMember') : ''}</span></div>
        ${!state.koop ? `<button id="btn-koop" class="big-btn" ${state.rep >= CFG.koop.minRep && state.money >= CFG.koop.fee ? '' : 'disabled'}>
            🤝 ${t('koopJoin')} · ${fmtMoney(CFG.koop.fee, L)}</button>
          <div class="section-info">${t('koopInfo', CFG.koop.minRep)}</div>` : ''}
        <h3>${t('shareTitle')}</h3>
        <div class="section-info">${t('shareInfo', share, 100 - share)}${state.rivalDump ? ' · ⚠️ ' + t('rivalDumpShort') : ''}</div>
        <div class="share-bar"><div class="share-me" style="width:${share}%"></div></div>
        <div class="share-legend"><span>🏷️ ${state.label || 'ÇAY VADİSİ'}</span><span>Kemal Ağa</span></div>`;
        api.drawSpark($('chart-earned'), state.hist.earned, '#7ba24a');
        api.drawSpark($('chart-src-tea'), state.hist.srcTea || [], '#5a8f3d');
        api.drawSpark($('chart-src-fish'), state.hist.srcFish || [], '#3f6d9a');
        api.drawSpark($('chart-src-veg'), state.hist.srcVeg || [], '#b0802e');
        const kb = $('btn-koop');
        if (kb) kb.addEventListener('click', () => { if (hooks.joinKoop()) api.renderManage(); });
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

      // v20: Çay-Börse — einlagern statt verkaufen (braucht das Silo)
      const sb = $('store-box');
      if (state.upgrades.silo) {
        const mul = state.teaMul || 1;
        const arrow = mul >= 1.25 ? '📈' : mul <= 0.8 ? '📉' : '➡️';
        sb.innerHTML = `
          <div class="section-info">${arrow} ${t('teaPriceNow', Math.round(CFG.eco.pricePerKg * mul * 10) / 10)}
            · ${t('teaStoreKg', Math.round(state.teaStore.kg * 10) / 10)}</div>
          <div class="btn-row">
            <button id="btn-store" class="big-btn ghost" ${state.basketKg > 0.01 ? '' : 'disabled'}>${t('teaStoreBtn')}</button>
            <button id="btn-sell-store" class="big-btn ghost" ${state.teaStore.kg > 0.01 ? '' : 'disabled'}>${t('teaSellStoreBtn')}</button>
          </div>`;
        $('btn-store').addEventListener('click', () => { if (hooks.storeBasket()) api.renderShop(); });
        $('btn-sell-store').addEventListener('click', () => { if (hooks.sellStore()) api.renderShop(); });
      } else sb.innerHTML = '';

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
      $('btn-eco').textContent = t('eco_' + (state.settings.eco || 'auto'));
      $('btn-speed').textContent = '×' + (state.settings.speed || 1);
      $('btn-cb').textContent = state.settings.cb ? t('on') : t('off');
      $('btn-lang').textContent = { de: 'Deutsch', tr: 'Türkçe', en: 'English' }[getLang()];
      // v25.3: Grafik-Diagnose nur auf Touch-Geräten anbieten
      if (ctx.isTouch) {
        $('touch-rows').classList.remove('hidden');
        $('btn-sens').textContent = '×' + (state.settings.touchSens || 1);
        $('gfx-diag').classList.remove('hidden');
        const g = ctx.gfx || {};
        $('btn-gfx-sky').textContent = g.simpleSky ? t('off') : t('on');
        $('btn-gfx-ocean').textContent = g.noOcean ? t('off') : t('on');
        $('btn-gfx-grass').textContent = g.noGrass ? t('off') : t('on');
        $('btn-gfx-direct').textContent = g.directRender ? 'B' : 'A';
        $('btn-gfx-chars').textContent = g.noChars ? t('off') : t('on');
      }
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

    // v26.2: Zustands-Anzeige der Auto-Buttons (🏃/🍃)
    setTcState(kind, on) {
      if (!ctx.isTouch) return;
      const b = $(kind === 'run' ? 'tbtn-run' : kind === 'bot' ? 'tbtn-bot' : 'tbtn-farm');
      if (b) b.classList.toggle('tc-on', !!on);
    },

    // ---------- v2: Touch-Steuerung verdrahten ----------
    bindTouch(player, vehicles, boat, getGame) {
      // v26: dynamischer Joystick — er erscheint dort, wo der Daumen in der
      // linken Zone aufsetzt; Doppeltipp = Auto-Lauf, neuer Griff beendet ihn.
      const joy = $('joystick'), knob = $('joystick-knob'), zone = $('joy-zone');
      let joyId = null, cx = 0, cy = 0, lastTap = 0;
      const R = 56;
      function setKnob(dx, dy) {
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
      function apply(nx, ny) {
        if (vehicles.driving) { vehicles.touchSteer = nx; }
        else if (boat && boat.driving) { boat.touchSteer = nx; }
        else { player.touchMove.x = nx; player.touchMove.y = ny; }
      }
      function handle(e) {
        for (const tch of e.changedTouches) {
          if (joyId === null || tch.identifier !== joyId) continue;
          let dx = tch.clientX - cx, dy = tch.clientY - cy;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          setKnob(dx, dy);
          apply(dx / R, dy / R);
        }
      }
      zone.addEventListener('touchstart', (e) => {
        if (joyId !== null) return;
        const tch = e.changedTouches[0];
        joyId = tch.identifier;
        cx = tch.clientX; cy = tch.clientY;
        const now = performance.now();
        if (player.touchAuto) player.touchAuto = false;      // Griff beendet Auto-Lauf
        else if (now - lastTap < 320) player.touchAuto = true;   // Doppeltipp
        lastTap = now;
        joy.style.left = (cx - joy.offsetWidth / 2) + 'px';
        joy.style.top = (cy - joy.offsetHeight / 2) + 'px';
        joy.style.bottom = 'auto';
        joy.classList.add('active');
        setKnob(0, 0);
        e.preventDefault();
      }, { passive: false });
      zone.addEventListener('touchmove', (e) => { handle(e); e.preventDefault(); }, { passive: false });
      const reset = (e) => {
        for (const tch of e.changedTouches) {
          if (tch.identifier !== joyId) continue;
          joyId = null;
          setKnob(0, 0);
          joy.classList.remove('active');
          player.touchMove.x = 0; player.touchMove.y = 0;
          vehicles.touchSteer = 0;
          if (boat) boat.touchSteer = 0;
        }
      };
      zone.addEventListener('touchend', reset);
      zone.addEventListener('touchcancel', reset);

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

      // v25.1: Schnellzugriffe — Handy, Karte, Verwaltung, Pause, Aktion.
      // Handy/Karte/Verwaltung gehen über synthetische Tastendrücke, damit
      // die vorhandene Auf/Zu-Logik (N/M/Tab) 1:1 greift.
      const sendKey = (code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      };
      const bindTap = (id, fn) => {
        const b = $(id);
        if (!b) return;
        b.addEventListener('touchstart', (e) => { fn(); e.preventDefault(); }, { passive: false });
        b.addEventListener('click', (e) => e.preventDefault());
      };
      bindTap('tbtn-phone', () => sendKey('KeyN'));
      bindTap('tbtn-map', () => sendKey('KeyM'));
      bindTap('tbtn-menu', () => sendKey('Tab'));
      bindTap('tbtn-pause', () => {
        const g = getGame && getGame();
        if (!g || !g.running) return;
        if (g.paused) g.pause(false);
        else if (!api.overlayOpen()) g.pause(true);
      });
      bindTap('tbtn-act', () => {
        const g = getGame && getGame();
        if (g && g.running && !g.paused && !api.overlayOpen()) g.doInteract();
      });

      // v26.2: WoW-Style Auto-Lauf & Auto-Pflücken
      bindTap('tbtn-run', () => {
        player.touchAuto = !player.touchAuto;
        api.setTcState('run', player.touchAuto);
      });
      bindTap('tbtn-farm', () => {
        const g = getGame && getGame();
        if (g && g.running && !g.paused) api.setTcState('farm', g.toggleAutoFarm());
      });
      // v27: Springen & Vali-Bot
      bindTap('tbtn-jump', () => player.jump && player.jump());
      bindTap('tbtn-bot', () => {
        const g = getGame && getGame();
        if (g && g.running && !g.paused) api.setTcState('bot', g.toggleBot());
      });
      // v26: Schnellzugriffe einklappbar
      bindTap('tbtn-more', () => $('tc-actions-list').classList.toggle('hidden'));
      // v26: Minimap antippen = vergrößern
      const mm = document.getElementById('minimap');
      if (mm) mm.addEventListener('touchstart', (e) => { mm.classList.toggle('big'); e.preventDefault(); }, { passive: false });
      // v26: Wisch nach unten schließt das Telefon
      let phY = null;
      els.phone.addEventListener('touchstart', (e) => { phY = e.touches[0].clientY; }, { passive: true });
      els.phone.addEventListener('touchmove', (e) => {
        if (phY === null) return;
        if (e.touches[0].clientY - phY > 110) {
          phY = null;
          api.hideOverlays();
          const g = getGame && getGame();
          if (g && g.running) g.pause(false);
        }
      }, { passive: true });
      els.phone.addEventListener('touchend', () => { phY = null; }, { passive: true });
      // v26: Kamera-Empfindlichkeit anwenden
      player.touchSens = state.settings.touchSens || 1;
      uiPlayerRef = player;
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

  // ---------- Universeller ✕-Schließer: immer sichtbar oben rechts ----------
  // Fix: die „Zurück"-Buttons stehen am Panel-Ende und sind bei langem Inhalt
  // aus dem Sichtfeld gescrollt — deshalb bekommt jedes Overlay ein festes ✕.
  const X_SKIP = new Set(['start-screen', 'day-screen', 'season-screen']);
  function closeOverlayAny(ov) {
    if (ov.id === 'pause-screen') { if (hooks.resume) hooks.resume(); return; }
    if (ov.id === 'event-screen') {
      // Minispiele/Events haben eigene Abbruch-Logik (rAF stoppen etc.)
      const ghost = ov.querySelector('#event-choices .big-btn.ghost');
      if (ghost) { ghost.click(); return; }
    }
    if (ov.id === 'album-screen') {
      hide(els.album);
      if (!els.pause.classList.contains('hidden')) return;
    }
    hooks.closeShop();
  }
  document.querySelectorAll('.overlay').forEach((ov) => {
    if (X_SKIP.has(ov.id)) return;
    const x = document.createElement('button');
    x.className = 'overlay-x';
    x.textContent = '✕';
    x.setAttribute('aria-label', 'close');
    x.addEventListener('click', () => closeOverlayAny(ov));
    ov.appendChild(x);
  });
  // Esc schließt jedes offene Overlay (statt ins Leere zu laufen)
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    const open = document.querySelector('.overlay:not(.hidden)');
    if (!open || X_SKIP.has(open.id)) return;
    e.preventDefault();
    e.stopImmediatePropagation();   // sonst pausiert der Esc-Handler in game.js sofort wieder
    closeOverlayAny(open);
  });

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
  // v18: Cloud-Save via cloudsave.php auf nesbun.de (offline/lokal: sauberer Fehler)
  function cloudCode() {
    let code = localStorage.getItem('cayvadisi_cloud_code') || '';
    const entered = window.prompt(t('cloudCodeAsk'), code);
    if (entered === null) return null;
    code = entered.trim();
    if (code.length < 6) { api.toast(t('cloudCodeShort'), false, 5000); return null; }
    localStorage.setItem('cayvadisi_cloud_code', code);
    return code;
  }
  $('btn-cloud-up').addEventListener('click', async () => {
    const code = cloudCode();
    if (!code) return;
    try {
      save();
      const data = JSON.parse(localStorage.getItem('cayvadisi_save_v2') || '{}');
      const res = await fetch('cloudsave.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, data })
      });
      const j = await res.json();
      api.toast(j.ok ? t('cloudUpOk') : t('cloudErr'), j.ok, 6000);
    } catch (e) { api.toast(t('cloudErr'), false, 6000); }
  });
  $('btn-cloud-down').addEventListener('click', async () => {
    const code = cloudCode();
    if (!code) return;
    try {
      const res = await fetch('cloudsave.php?code=' + encodeURIComponent(code));
      const j = await res.json();
      if (!j.ok || !j.data) { api.toast(t('cloudNone'), false, 6000); return; }
      if (!window.confirm(t('cloudDownConfirm'))) return;
      localStorage.setItem('cayvadisi_save_v2', JSON.stringify(j.data));
      location.reload();
    } catch (e) { api.toast(t('cloudErr'), false, 6000); }
  });
  $('btn-travel-close').addEventListener('click', () => hooks.closeShop());
  $('btn-workshop-close').addEventListener('click', () => hooks.closeShop());
  $('btn-phone-close').addEventListener('click', () => hooks.closeShop());
  $('btn-phone-back').addEventListener('click', () => {
    if (api._phoneApp) { api._phoneApp = null; api.renderPhone(); }
    else hooks.closeShop();
  });
  $('btn-phone').addEventListener('click', () => {
    if (api.phoneOpen()) { hooks.closeShop(); return; }
    if (!api.overlayOpen()) api.showPhone();
  });
  $('btn-album-close').addEventListener('click', () => { hide(els.album); if (!els.pause.classList.contains('hidden')) return; hooks.closeShop(); });
  $('btn-album').addEventListener('click', () => { api.showAlbum(); });
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
  $('btn-speed').addEventListener('click', (e) => {
    const order = [1, 1.15, 1.3];
    const next = order[(order.indexOf(state.settings.speed || 1) + 1) % order.length];
    state.settings.speed = next;
    e.target.textContent = '×' + next;
    save();
  });
  // v25.3: Grafik-Diagnose — Flag umschalten, speichern, sauber neu laden
  const gfxToggle = (id, key) => {
    $(id).addEventListener('click', () => {
      const g = ctx.gfx || {};
      g[key] = !g[key];
      try { localStorage.setItem('cayvadisi_gfx', JSON.stringify(g)); } catch (e2) {}
      location.reload();
    });
  };
  gfxToggle('btn-gfx-sky', 'simpleSky');
  gfxToggle('btn-gfx-ocean', 'noOcean');
  gfxToggle('btn-gfx-grass', 'noGrass');
  gfxToggle('btn-gfx-direct', 'directRender');
  gfxToggle('btn-gfx-chars', 'noChars');
  // v26: Kamera-Empfindlichkeit & Vollbild
  // v28: Vali-Bot-Einstellungen (Pausenmenü)
  const botSet = () => state.settings.bot || (state.settings.bot = { fish: true, reserve: 400, crop: 'auto' });
  const refreshBotRows = () => {
    const B = botSet();
    if ($('btn-pickspeed')) {
      const refreshPS = () => { $('btn-pickspeed').textContent = '×' + (state.settings.pickSpeed || 1); };
      $('btn-pickspeed').addEventListener('click', () => {
        const steps = [1, 2, 3];
        state.settings.pickSpeed = steps[(steps.indexOf(state.settings.pickSpeed || 1) + 1) % steps.length];
        refreshPS();
      });
      refreshPS();
    }
    if ($('btn-bot-fish')) {
      $('btn-bot-fish').textContent = B.fish !== false ? '✔' : '✖';
      $('btn-bot-reserve').textContent = (B.reserve ?? 400) + ' ₺';
      $('btn-bot-crop').textContent = B.crop === 'auto' ? '🔄' : ({ corn: '🌽', tomato: '🍅', hazel: '🌰' })[B.crop] || '🔄';
    }
  };
  api.refreshBotRows = refreshBotRows;
  if ($('btn-bot-fish')) {
    $('btn-bot-fish').addEventListener('click', () => { const B = botSet(); B.fish = B.fish === false; refreshBotRows(); hooks.saveNow && hooks.saveNow(); });
    $('btn-bot-reserve').addEventListener('click', () => {
      const B = botSet(); const steps = [0, 400, 1500];
      B.reserve = steps[(steps.indexOf(B.reserve ?? 400) + 1) % steps.length];
      refreshBotRows(); hooks.saveNow && hooks.saveNow();
    });
    $('btn-bot-crop').addEventListener('click', () => {
      const B = botSet(); const opts = ['auto', 'corn', 'tomato', 'hazel'];
      B.crop = opts[(opts.indexOf(B.crop || 'auto') + 1) % opts.length];
      refreshBotRows(); hooks.saveNow && hooks.saveNow();
    });
    refreshBotRows();
    $('btn-rescue').addEventListener('click', () => { if (hooks.rescueHome) hooks.rescueHome(); });
  }
  $('btn-sens').addEventListener('click', (e) => {
    const order = [0.7, 1, 1.3];
    const next = order[(order.indexOf(state.settings.touchSens || 1) + 1) % order.length];
    state.settings.touchSens = next;
    if (uiPlayerRef) uiPlayerRef.touchSens = next;
    e.target.textContent = '×' + next;
    save();
  });
  $('btn-fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  $('btn-cb').addEventListener('click', (e) => {
    state.settings.cb = !state.settings.cb;
    document.body.classList.toggle('cb-mode', state.settings.cb);
    e.target.textContent = state.settings.cb ? t('on') : t('off');
    save();
  });
  document.body.classList.toggle('cb-mode', !!state.settings.cb);
  $('btn-eco').addEventListener('click', (e) => {
    const order = ['auto', 'eco', 'perf'];
    const next = order[(order.indexOf(state.settings.eco || 'auto') + 1) % order.length];
    state.settings.eco = next;
    e.target.textContent = t('eco_' + next);
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
