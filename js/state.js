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
  inventory: {
    egg: 0, milk: 0, wool: 0, corn: 0, tomato: 0, cabbage: 0, hazel: 0,
    straw: 0, walnut: 0, coal: 0, tea_pack: 0,
    hamsi: 0, lufer: 0, kalkan: 0,
    tea_green: 0, tea_white: 0, honey: 0
  },
  vehicles: { tractor: false, pickup: false, sedan: false, lux: false },
  marketMul: {},              // Tagespreis-Faktoren pro Produkt
  wealthTier: 0,

  // v3: Handel & Fabrik
  unlocks: { straw: false, walnut: false },
  factory: false,
  packedToday: 0,             // heute produzierte Pakete (Anzeige)
  exportOffers: [],           // {country, qty, price}
  exportsDone: 0,

  // v3: Privatleben
  playerName: '',
  label: '',
  outfit: '#6a7ba0',
  married: false,
  child: false,
  properties: { yayla: false, townhouse: false, villa: false },
  stocks: { krd: 0, lim: 0, fnd: 0 },
  stockPrices: {},            // wird beim ersten Start aus p0 gefüllt
  baston: false,
  blackHeat: 0,
  introSeen: false,
  visited: { zonguldak: false, eregli: false, devrek: false },

  // v6
  debt: 0,
  insured: false,
  workerData: [],           // {name: idx, days: gearbeitete Tage}
  sofor: false,             // ein Arbeiter zum Fahrer befördert
  teaStyle: 'siyah',
  greenLine: false,         // Yeşil-Çay-Produktionslinie gekauft
  hives: 0,                 // Bienenstöcke auf der Yayla
  tavlaWins: 0,

  // v7
  rep: 0,                   // Dorf-Ruf 0..100
  koop: false,              // Mitglied der Çay-Kooperative
  vehWear: {},              // Fahrzeug-Id -> Verschleiß 0..100
  vehTuning: {},            // Fahrzeug-Id -> {engine, tires}
  dog: false,               // Kangal-Hund
  prestige: 0,              // New-Game+-Sterne

  // v8
  net: false,               // Hamsi-Schleppnetz
  decree: '',               // aktives Kararname ('' = keins)
  moralDays: 0,             // Urlaubs-Moral-Bonus (Resttage)
  holidays: 0,              // absolvierte Urlaube
  maldivDone: false,        // Malediven-Prestige einmalig
  raceBest: 0,              // Kayık-Bestzeit in s (0 = noch nie)

  // v5
  boat: false,
  rod: false,
  fishCaught: 0,
  packsSold: 0,           // kumulativ verkaufte Label-Pakete (Marktanteil)
  story: 0,               // Kapitel der Dede-Questlinie (0..5 = fertig)
  dedeBonus: false,       // Dede-Çayı-Rezept: +10 % Teepreis
  ach: {},                // Achievement-Id -> true
  rivalDump: false,       // heute Preisdumping von Kemal Ağa (Laufzeit)

  // v4
  role: 'farmer',
  homeLevel: 0,
  survival: false,
  hunger: 100,
  energy: 100,
  rel: { temel: 0, dursun: 0 },   // Nachbarschafts-Beziehung
  gurbetci: 0,                    // absolvierte Almanya-Schichten
  workerBoost: 1,                 // İmece-Bonus (nur heute, nicht gespeichert)

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

  // v7: Tageshistorie für Charts (gespeichert)
  hist: { stocks: {}, earned: [] },

  // Einstellungen
  settings: { lang: 'de', sound: true, quality: 'auto' }
};

// v7: New-Game+-Preisbonus (multipliziert alle Verkäufe)
export function prestigeMul(cfg) {
  return 1 + state.prestige * cfg.prestige.priceBonus;
}

// v7: Ruf begrenzen & ändern
export function addRep(n) {
  state.rep = Math.max(0, Math.min(100, state.rep + n));
}

export function basketCapacity(cfg, cargoMul = 1) {
  let cap = cfg.eco.basket0;
  if (state.upgrades.basket2) cap = cfg.eco.basket2;
  else if (state.upgrades.basket1) cap = cfg.eco.basket1;
  if (state.homeLevel >= 1) cap += 2;   // Haus-Anbau: Lagerplatz
  return cap * cargoMul;
}

// v5: Jahreszeit aus dem Tag ableiten (0 Sommer, 1 Herbst, 2 Winter, 3 Frühling)
export function seasonOf(day, cfg) {
  return Math.floor((day - 1) / cfg.seasonDays) % 4;
}

export function netWorth(cfg) {
  let w = state.money;
  for (const [id, owned] of Object.entries(state.vehicles)) if (owned) w += cfg.vehicles[id].cost * 0.7;
  for (const [id, u] of Object.entries(cfg.upgrades)) if (state.upgrades[id]) w += u.cost * 0.5;
  for (const [id, a] of Object.entries(cfg.animals)) w += (state.animals[id] || 0) * a.cost * 0.8;
  if (state.factory) w += cfg.factory.cost * 0.7;
  for (const [id, p] of Object.entries(cfg.life.properties)) if (state.properties[id]) w += p.cost * 0.85;
  for (const [id, n] of Object.entries(state.stocks)) w += n * (state.stockPrices[id] || cfg.life.stocks[id].p0);
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
    inventory: s.inventory, vehicles: s.vehicles, wealthTier: s.wealthTier,
    unlocks: s.unlocks, factory: s.factory, exportOffers: s.exportOffers, exportsDone: s.exportsDone,
    playerName: s.playerName, label: s.label, outfit: s.outfit,
    married: s.married, child: s.child, properties: s.properties,
    stocks: s.stocks, stockPrices: s.stockPrices, baston: s.baston,
    blackHeat: s.blackHeat, introSeen: s.introSeen, visited: s.visited,
    role: s.role, homeLevel: s.homeLevel, survival: s.survival,
    hunger: s.hunger, energy: s.energy, rel: s.rel, gurbetci: s.gurbetci,
    boat: s.boat, rod: s.rod, fishCaught: s.fishCaught, packsSold: s.packsSold,
    story: s.story, dedeBonus: s.dedeBonus, ach: s.ach,
    debt: s.debt, insured: s.insured, workerData: s.workerData, sofor: s.sofor,
    teaStyle: s.teaStyle, greenLine: s.greenLine, hives: s.hives, tavlaWins: s.tavlaWins,
    rep: s.rep, koop: s.koop, vehWear: s.vehWear, vehTuning: s.vehTuning,
    dog: s.dog, prestige: s.prestige, hist: s.hist,
    net: s.net, decree: s.decree, moralDays: s.moralDays, holidays: s.holidays,
    maldivDone: s.maldivDone, raceBest: s.raceBest
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
    Object.assign(state.unlocks, d.unlocks || {});
    state.factory = d.factory ?? false;
    state.exportOffers = Array.isArray(d.exportOffers) ? d.exportOffers : [];
    state.exportsDone = d.exportsDone ?? 0;
    state.playerName = d.playerName ?? '';
    state.label = d.label ?? '';
    state.outfit = d.outfit ?? '#6a7ba0';
    state.married = d.married ?? false;
    state.child = d.child ?? false;
    Object.assign(state.properties, d.properties || {});
    Object.assign(state.stocks, d.stocks || {});
    Object.assign(state.stockPrices, d.stockPrices || {});
    state.baston = d.baston ?? false;
    state.blackHeat = d.blackHeat ?? 0;
    state.introSeen = d.introSeen ?? false;
    Object.assign(state.visited, d.visited || {});
    state.role = d.role ?? 'farmer';
    state.homeLevel = d.homeLevel ?? 0;
    state.survival = d.survival ?? false;
    state.hunger = d.hunger ?? 100;
    state.energy = d.energy ?? 100;
    Object.assign(state.rel, d.rel || {});
    state.gurbetci = d.gurbetci ?? 0;
    state.boat = d.boat ?? false;
    state.rod = d.rod ?? false;
    state.fishCaught = d.fishCaught ?? 0;
    state.packsSold = d.packsSold ?? 0;
    state.story = d.story ?? 0;
    state.dedeBonus = d.dedeBonus ?? false;
    state.ach = d.ach || {};
    state.debt = d.debt ?? 0;
    state.insured = d.insured ?? false;
    state.workerData = Array.isArray(d.workerData) ? d.workerData : [];
    state.sofor = d.sofor ?? false;
    state.teaStyle = d.teaStyle ?? 'siyah';
    state.greenLine = d.greenLine ?? false;
    state.hives = d.hives ?? 0;
    state.tavlaWins = d.tavlaWins ?? 0;
    state.rep = d.rep ?? 0;
    state.koop = d.koop ?? false;
    state.vehWear = d.vehWear || {};
    state.vehTuning = d.vehTuning || {};
    state.dog = d.dog ?? false;
    state.prestige = d.prestige ?? 0;
    state.hist = (d.hist && Array.isArray(d.hist.earned)) ? d.hist : { stocks: {}, earned: [] };
    state.net = d.net ?? false;
    state.decree = d.decree ?? '';
    state.moralDays = d.moralDays ?? 0;
    state.holidays = d.holidays ?? 0;
    state.maldivDone = d.maldivDone ?? false;
    state.raceBest = d.raceBest ?? 0;
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
  state.unlocks = { straw: false, walnut: false };
  state.factory = false;
  state.exportOffers = [];
  state.exportsDone = 0;
  state.playerName = ''; state.label = ''; state.outfit = '#6a7ba0';
  state.married = false; state.child = false;
  state.properties = { yayla: false, townhouse: false, villa: false };
  state.stocks = { krd: 0, lim: 0, fnd: 0 };
  state.stockPrices = {};
  state.baston = false;
  state.blackHeat = 0;
  state.introSeen = false;
  state.visited = { zonguldak: false, eregli: false, devrek: false };
  state.role = 'farmer';
  state.homeLevel = 0;
  state.survival = false;
  state.hunger = 100; state.energy = 100;
  state.rel = { temel: 0, dursun: 0 };
  state.gurbetci = 0;
  state.boat = false; state.rod = false; state.fishCaught = 0;
  state.packsSold = 0; state.story = 0; state.dedeBonus = false;
  state.ach = {};
  state.debt = 0; state.insured = false;
  state.workerData = []; state.sofor = false;
  state.teaStyle = 'siyah'; state.greenLine = false;
  state.hives = 0; state.tavlaWins = 0;
  state.rep = 0; state.koop = false;
  state.vehWear = {}; state.vehTuning = {};
  state.dog = false;
  state.hist = { stocks: {}, earned: [] };
  state.net = false; state.decree = '';
  state.moralDays = 0; state.holidays = 0; state.maldivDone = false;
  state.raceBest = 0;
  // prestige bleibt absichtlich erhalten (New Game+)
  resetDay();
  save();
  try { localStorage.removeItem(KEY_V1); } catch (e) { /* egal */ }
}

export function resetDay() {
  state.dayKg = 0; state.dayEarned = 0; state.daySpent = 0;
  state.orderDelivered = 0; state.orderRewarded = false;
  state.basketKg = 0; state.basketValueKg = 0;
  state.workerKg = 0;
  state.packedToday = 0;
  state.timeSec = 0; state.raining = false; state.wetTimer = 0;
  state.phase = 'day';
  state._darkToast = false;
  state._nightToast = false;
}
