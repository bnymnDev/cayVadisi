// Spielzustand + Speicherung (localStorage)
const KEY = 'cayvadisi_save_v1';

export const state = {
  // Fortschritt
  day: 1,
  money: 0,
  totalKg: 0,
  totalEarned: 0,
  ordersDone: 0,
  upgrades: { basket1: false, basket2: false, shears: false, boots: false, fert: false, cable: false },

  // Tageswerte
  dayKg: 0,
  dayEarned: 0,
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

export function basketCapacity(cfg) {
  if (state.upgrades.basket2) return cfg.eco.basket2;
  if (state.upgrades.basket1) return cfg.eco.basket1;
  return cfg.eco.basket0;
}

export function save() {
  const s = state;
  const data = {
    day: s.day, money: s.money, totalKg: s.totalKg, totalEarned: s.totalEarned,
    ordersDone: s.ordersDone, upgrades: s.upgrades, settings: s.settings,
    seasonOver: s.seasonOver
  };
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* privat-Modus o.ä. */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
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
    return true;
  } catch (e) { return false; }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

export function resetProgress() {
  state.day = 1; state.money = 0; state.totalKg = 0; state.totalEarned = 0;
  state.ordersDone = 0; state.seasonOver = false;
  for (const k of Object.keys(state.upgrades)) state.upgrades[k] = false;
  resetDay();
  save();
}

export function resetDay() {
  state.dayKg = 0; state.dayEarned = 0;
  state.orderDelivered = 0; state.orderRewarded = false;
  state.basketKg = 0; state.basketValueKg = 0;
  state.timeSec = 0; state.raining = false; state.wetTimer = 0;
  state.phase = 'day';
  state._darkToast = false;
}
