// DOM-HUD, Menüs, Shop, Overlays
import * as THREE from 'three';
import { CFG } from './config.js';
import { state, basketCapacity, save, resetProgress, hasSave } from './state.js';
import { t, tUpgrade, setLang, getLang, applyDom } from './i18n.js';
import { fmtKg, fmtMoney, clamp } from './util.js';

const $ = (id) => document.getElementById(id);

export function createUI(ctx, hooks) {
  const els = {
    start: $('start-screen'), hud: $('hud'), shop: $('shop-screen'),
    pause: $('pause-screen'), day: $('day-screen'), season: $('season-screen'),
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

    hideStart() { hide(els.start); show(els.hud); },

    // ---------- HUD ----------
    refreshClock(hour) {
      const h = Math.floor(hour), m = Math.floor((hour - h) * 60);
      els.hudClock.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      els.hudDay.textContent = t('day') + ' ' + state.day;
      els.hudWeather.textContent = state.raining ? '🌧' : (hour >= 19 ? '🌆' : '☀');
    },
    refreshMoney() {
      els.hudMoney.textContent = fmtMoney(state.money, state.settings.lang);
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
        || !els.season.classList.contains('hidden');
    },
    hideOverlays() { hide(els.shop); hide(els.pause); hide(els.day); hide(els.season); },

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
      $('btn-lang').textContent = getLang() === 'de' ? 'Deutsch' : 'Türkçe';
      show(els.pause);
    },

    showDaySummary() {
      const L = state.settings.lang;
      $('day-title').textContent = t('dayTitle', state.day);
      $('day-stats').innerHTML =
        `<div>${t('dayPicked')} <b>${fmtKg(state.dayKg, L)} kg</b></div>` +
        `<div>${t('dayEarned')} <b>${fmtMoney(state.dayEarned, L)}</b></div>` +
        `<div>${t('dayOrder')} <b>${state.orderRewarded ? t('dayYes') : t('dayNo')}</b></div>`;
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
        `<div>${t('seasonOrders')} <b>${state.ordersDone} / ${CFG.seasonDays}</b></div>`;
      show(els.season);
    },

    applyLang() {
      applyDom();
      api.refreshMoney();
      api.refreshBasket();
      api.refreshOrder();
    }
  };

  // ---------- Button-Verdrahtung ----------
  $('lang-de').addEventListener('click', () => {
    state.settings.lang = 'de'; setLang('de'); api.applyLang();
    $('lang-de').classList.add('active'); $('lang-tr').classList.remove('active');
  });
  $('lang-tr').addEventListener('click', () => {
    state.settings.lang = 'tr'; setLang('tr'); api.applyLang();
    $('lang-tr').classList.add('active'); $('lang-de').classList.remove('active');
  });

  els.btnStart.addEventListener('click', () => {
    if (hasSave() && !els.btnContinue.classList.contains('hidden')) resetProgress();
    hooks.onStart();
  });
  els.btnContinue.addEventListener('click', () => hooks.onContinue());

  $('btn-sell').addEventListener('click', () => { hooks.doSell(); api.renderShop(); });
  $('btn-shop-close').addEventListener('click', () => hooks.closeShop());
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
    const next = getLang() === 'de' ? 'tr' : 'de';
    state.settings.lang = next; setLang(next); api.applyLang();
    e.target.textContent = next === 'de' ? 'Deutsch' : 'Türkçe';
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
