// Spielzustand + Speicherung (localStorage) — v2 mit Migration von v1
const KEY = 'cayvadisi_save_v2';
const KEY_V1 = 'cayvadisi_save_v1';

export const state = {
  // Fortschritt
  day: 1,
  money: 0,
  totalKg: 0,
  totalEarned: 0,
  ordersDone: 0,
  upgrades: {
    basket1: false, basket2: false, shears: false, boots: false, fert: false, cable: false,
    foreman: false, sprinkler: false, silo: false
  },

  // v2: Betrieb
  workers: 0,                 // angestellte Pflücker
  workerKg: 0,                // heute von Arbeitern gepflückt (wertgewichtet 1.0)
  animals: { chicken: 0, cow: 0, sheep: 0 },
  plots: [],                  // {type, daysLeft} | null — Länge kommt aus CFG
  inventory: { egg: 0, milk: 0, wool: 0, corn: 0, tomato: 0, cabbage: 0, hazel: 0 },
  vehicles: { tractor: false, pickup: false, sedan: false, lux: false },
  marketMul: {},              // Tagespreis-Faktoren pro Produkt
  wealthTier: 0,

  // Tageswerte
  dayKg: 0,
  dayEarned: 0,
  daySpent: 0,
  orderTarget: 6,
  orderDelivered: 0,
  orderRewarded: false,

  // Korb (wertgewichtet für Ø-Qualität)
  basketKg: 0,
  basketValueKg: 0,   // Σ kg*qualität

  // Laufzeit (nicht gespeichert)
  timeSec: 0,          // Sekunden seit Tagesbeginn
  raining: false,
  wetTimer: 0,
  phase: 'day',        // day | evening | done
  seasonOver: false,

  // Einstellungen
  settings: { lang: 'de', sound: true, quality: 'auto' }
};

export function basketCapacity(cfg, cargoMul = 1) {
  let cap = cfg.eco.basket0;
  if (state.upgrades.basket2) cap = cfg.eco.basket2;
  else if (state.upgrades.basket1) cap = cfg.eco.basket1;
  return cap * cargoMul;
}

export function netWorth(cfg) {
  let w = state.money;
  for (const [id, owned] of Object.entries(state.vehicles)) if (owned) w += cfg.vehicles[id].cost * 0.7;
  for (const [id, u] of Object.entries(cfg.upgrades)) if (state.upgrades[id]) w += u.cost * 0.5;
  for (const [id, a] of Object.entries(cfg.animals)) w += (state.animals[id] || 0) * a.cost * 0.8;
  return w;
}

export function save() {
  const s = state;
  const data = {
    v: 2,
    day: s.day, money: s.money, totalKg: s.totalKg, totalEarned: s.totalEarned,
    ordersDone: s.ordersDone, upgrades: s.upgrades, settings: s.settings,
    seasonOver: s.seasonOver,
    workers: s.workers, animals: s.animals, plots: s.plots,
    inventory: s.inventory, vehicles: s.vehicles, wealthTier: s.wealthTier
  };
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* privat-Modus o.ä. */ }
}

export function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) raw = localStorage.getItem(KEY_V1);   // Migration: v1-Stand übernehmen
    if (!raw) return false;
    const d = JSON.parse(raw);
    state.day = d.day ?? 1;
    state.money = d.money ?? 0;
    state.totalKg = d.totalKg ?? 0;
    state.totalEarned = d.totalEarned ?? 0;
    state.ordersDone = d.ordersDone ?? 0;
    state.seasonOver = d.seasonOver ?? false;
    Object.assign(state.upgrades, d.upgrades || {});
    Object.assign(state.settings, d.settings || {});
    state.workers = d.workers ?? 0;
    Object.assign(state.animals, d.animals || {});
    state.plots = Array.isArray(d.plots) ? d.plots : [];
    Object.assign(state.inventory, d.inventory || {});
    Object.assign(state.vehicles, d.vehicles || {});
    state.wealthTier = d.wealthTier ?? 0;
    return true;
  } catch (e) { return false; }
}

export function hasSave() {
  try { return !!(localStorage.getItem(KEY) || localStorage.getItem(KEY_V1)); } catch (e) { return false; }
}

export function resetProgress() {
  state.day = 1; state.money = 0; state.totalKg = 0; state.totalEarned = 0;
  state.ordersDone = 0; state.seasonOver = false;
  for (const k of Object.keys(state.upgrades)) state.upgrades[k] = false;
  state.workers = 0; state.workerKg = 0;
  state.animals = { chicken: 0, cow: 0, sheep: 0 };
  state.plots = [];
  for (const k of Object.keys(state.inventory)) state.inventory[k] = 0;
  for (const k of Object.keys(state.vehicles)) state.vehicles[k] = false;
  state.wealthTier = 0;
  resetDay();
  save();
  try { localStorage.removeItem(KEY_V1); } catch (e) { /* egal */ }
}

export function resetDay() {
  state.dayKg = 0; state.dayEarned = 0; state.daySpent = 0;
  state.orderDelivered = 0; state.orderRewarded = false;
  state.basketKg = 0; state.basketValueKg = 0;
  state.workerKg = 0;
  state.timeSec = 0; state.raining = false; state.wetTimer = 0;
  state.phase = 'day';
  state._darkToast = false;
}
