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
    foreman: false, sprinkler: false, silo: false, expand: false
  },

  // v2: Betrieb
  workers: 0,                 // angestellte Pflücker
  workerKg: 0,                // heute von Arbeitern gepflückt (wertgewichtet 1.0)
  animals: { chicken: 0, cow: 0, sheep: 0, goat: 0 },
  plots: [],                  // {type, daysLeft} | null — Länge kommt aus CFG
  inventory: {
    egg: 0, milk: 0, wool: 0, corn: 0, tomato: 0, cabbage: 0, hazel: 0,
    straw: 0, walnut: 0, coal: 0, tea_pack: 0,
    hamsi: 0, lufer: 0, kalkan: 0, levrek: 0, kofana: 0, mersin: 0,
    tea_green: 0, tea_white: 0, honey: 0, cheese: 0, tea_harman: 0
  },
  vehicles: { tractor: false, pickup: false, sedan: false, lux: false, moto: false },
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
  botXp: 0,                 // v28: Bot-Erfahrung (Level & Perks)
  botAuto: false,           // v28: Vali-Bot war aktiv (Offline-Verdienst)
  botReports: [],           // v28: letzte Tagesrapporte des Bots
  jumps: 0,                 // v28: Sprung-Zähler (Trophäe)
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

  // v12
  photoMissionsDone: 0,     // erledigte Foto-Missionen
  gulet: false,             // Segel-Gulet
  guletTours: 0,
  sampiyon: false,          // Çay-Meister von Rize
  konak: 0,                 // Restaurierungs-Stufe 0..3 (3 = Museum)
  catFeeds: 0,              // gefütterte Katzen (kumulativ)
  jointVenture: false,      // Ortak Marka mit Kemal
  // v13
  village: { okul: 0, cayevi2: 0, cami: 0 },   // 0=offen, 1=Bau, 2=fertig
  villageDays: { okul: 0, cayevi2: 0, cami: 0 },
  // v14
  yearEvent: null,          // { id, daysLeft }
  kuryeDone: 0,             // ausgelieferte Bestellungen (kumulativ)
  memories: [],             // gefundene Dede-Erinnerungen (Indizes)
  dedeHarman: false,        // Familienrezept freigeschaltet
  arcadeBest: 0,
  muhtarluk: false,         // Belediye-Wahl gewonnen
  electionsWon: 0,
  story3: { ch: 0, path: null, done: false },
  ada: { light: 0, cave: false },
  // v15
  freighter: false,
  shipment: null,           // { route, packs } — Frachter unterwegs
  wedding: { stage: 0, catering: 0, day: 0 },   // 0=offen 1=geplant 2=gefeiert
  kemalPressure: 0,         // Kemals Wirtschaftsdruck (drückt deinen Marktanteil)
  falcon: { feeds: 0, tame: false },
  bridge: false,

  // v16: EXP (Pflücken / Angeln / Handel)
  xp: { pick: 0, fish: 0, trade: 0 },

  // v17: Imperium sichtbar
  factoryLines: 0,                 // Produktionslinien in der Fabrik (0..5)
  factoryLog: null,                // v30: { made, sold } der letzten Nacht
  kahya: false,                    // v30: Kâhya-Modus — Çırak führt den Betrieb
  kahyaReport: null,               // v30: { earned, harv, planted, ex } der letzten Nacht
  parcels: [],                     // Parzellen: null|'me'|'kemal'|'saban'|'nurten'
  railway: false,                  // Teebahn gebaut
  landslide: null,                 // { left } solange die Straße blockiert ist
  stall: null,                     // { stock: {id:n}, factor, soldToday, earnedToday }
  queen: false,                    // Anzer-Königin gekauft
  beeCupWins: 0,
  billboards: 0,                   // stehende Werbetafeln (0..3)
  campaign: '',                    // '' | 'shoot' (Foto-Kampagne gebucht)

  // v18: geführter Fortschritt + Nachbar-Tal + NPC-Leben
  featureUnlocks: {},              // Feature-Id -> true (freigeschaltet)
  branch: null,                    // { workers, mode: 'store'|'sell' } — Filiale im Fındık Vadisi
  npcRel: {},                      // NPC-Index -> Beziehungslevel
  favorsDone: 0,                   // erledigte Gefallen (kumulativ)

  // v19: Çırak, Story 4, Canavar
  cirak: null,                     // { level: 1..4 } — Lehrling eingestellt
  story4: { ch: 0, path: null, done: false, at: 0 },
  canavar: { wins: 0, next: 0 },   // next = frühester Tag für den nächsten Kampf

  // v20: Flipping, Çay-Börse, Reederei
  flips: [],                       // je Haus: null | {stage,rent} | {sold: TagWiederFrei}
  teaMul: 1,                       // aktueller Teepreis-Faktor (Börse)
  teaHist: [],                     // letzte Kurse fürs Chart
  teaEvent: null,                  // { kind: 'spike'|'dip', daysLeft }
  teaStore: { kg: 0, valueKg: 0 }, // eingelagerter Rohtee (Silo)
  fleet: 0,                        // Anzahl Frachter (0..3)
  shipments: [],                   // [{route, packs, insured}] — Schiffe auf See

  // v21: Tankstelle & Werkstatt
  petrol: null,                    // { werkstatt: bool }

  // v22: Atmosphäre-Paket
  mask: false,                     // Tauchmaske gekauft
  amphoras: 0,                     // geborgene Amphoren (0..5)
  dogTricks: {},                   // sit/fetch/herd -> true
  wish: null,                      // Sternschnuppen-Segen für morgen ('luck'|'price'|'rep')
  postcardsSent: 0,
  motoBest: 0,                     // Bestzeit Kurier-Rennen (s, 0 = nie)
  treeStage: 0,                    // Baumhaus 0..2
  treeChest: false,                // Geheimkiste gefunden

  // v23
  kemence: false,                  // Kemençe gekauft
  arcade2Best: 0,
  wildPhotos: {},                  // hedgehog/fox/deer -> true
  story5: { ch: 0, done: false },  // Geisterhaus-Legende
  snowman: 0,                      // Schneebälle des aktuellen Schneemanns (0..3)
  childDay: 0,                     // Tag, an dem das Kind zuerst gesehen wurde

  // v24
  summitDone: false,               // Şelale-Gipfel erreicht
  recipes: {},                     // Rezept-Id -> true (freigeschaltet)
  styleToday: 0,                   // Wheelies heute
  riddle: { progress: 0, done: false },

  // v25
  diary: [],                       // [{id, day}] — festgehaltene Momente
  flowerPatches: 0,                // Blumenbeete auf der Yayla (0..4)
  radyo: null,                     // { program: 'music'|'news'|'ads' }

  // v11
  animalNames: {},          // Art -> [Namen]
  orchard: false,           // Haselnuss-Plantage
  logi: { packs: false, goods: false, exportA: false },   // Şoför-2.0-Regeln
  heliJobsDone: 0,

  // v10
  dolmus: false,            // eigene Dolmuş-Linie
  collect: {},              // Basar-Schätze: id -> true
  fishTournBest: 0,         // Bestwert Angel-Turnier
  macWins: 0,               // Fußball-Siege gegen Karşıköy

  // v9
  heli: false,              // Helikopter
  mandira: false,           // Molkerei am Hof
  restaurant: false,        // Muhlama-Lokanta in der Stadt
  derbyBest: 0,             // meiste Tore in einem Derby
  kemalPeace: false,        // Story 2 abgeschlossen: kein Preisdumping mehr

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
  settings: { lang: 'de', sound: true, quality: 'auto', eco: 'auto', speed: 1, cb: false, pickSpeed: 1, bot: { fish: true, reserve: 400, crop: 'auto' } }
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
    botXp: s.botXp, botAuto: s.botAuto, botReports: s.botReports, jumps: s.jumps,
    savedAt: Date.now(),
    teaStyle: s.teaStyle, greenLine: s.greenLine, hives: s.hives, tavlaWins: s.tavlaWins,
    rep: s.rep, koop: s.koop, vehWear: s.vehWear, vehTuning: s.vehTuning,
    dog: s.dog, prestige: s.prestige, hist: s.hist,
    net: s.net, decree: s.decree, moralDays: s.moralDays, holidays: s.holidays,
    maldivDone: s.maldivDone, raceBest: s.raceBest,
    heli: s.heli, mandira: s.mandira, restaurant: s.restaurant,
    derbyBest: s.derbyBest, kemalPeace: s.kemalPeace,
    dolmus: s.dolmus, collect: s.collect,
    fishTournBest: s.fishTournBest, macWins: s.macWins,
    animalNames: s.animalNames, orchard: s.orchard, logi: s.logi,
    heliJobsDone: s.heliJobsDone,
    photoMissionsDone: s.photoMissionsDone, gulet: s.gulet, guletTours: s.guletTours,
    sampiyon: s.sampiyon, konak: s.konak, catFeeds: s.catFeeds, jointVenture: s.jointVenture,
    village: s.village, villageDays: s.villageDays,
    yearEvent: s.yearEvent, kuryeDone: s.kuryeDone, memories: s.memories,
    dedeHarman: s.dedeHarman, arcadeBest: s.arcadeBest, muhtarluk: s.muhtarluk,
    electionsWon: s.electionsWon, story3: s.story3, ada: s.ada,
    freighter: s.freighter, shipment: s.shipment, wedding: s.wedding,
    kemalPressure: s.kemalPressure, falcon: s.falcon, bridge: s.bridge,
    xp: s.xp,
    factoryLines: s.factoryLines, parcels: s.parcels, railway: s.railway,
    factoryLog: s.factoryLog, kahya: s.kahya, kahyaReport: s.kahyaReport,
    landslide: s.landslide, stall: s.stall, queen: s.queen,
    beeCupWins: s.beeCupWins, billboards: s.billboards, campaign: s.campaign,
    featureUnlocks: s.featureUnlocks, branch: s.branch, npcRel: s.npcRel, favorsDone: s.favorsDone,
    cirak: s.cirak, story4: s.story4, canavar: s.canavar,
    flips: s.flips, teaMul: s.teaMul, teaHist: s.teaHist, teaEvent: s.teaEvent,
    teaStore: s.teaStore, fleet: s.fleet, shipments: s.shipments,
    petrol: s.petrol,
    mask: s.mask, amphoras: s.amphoras, dogTricks: s.dogTricks, wish: s.wish,
    postcardsSent: s.postcardsSent, motoBest: s.motoBest,
    treeStage: s.treeStage, treeChest: s.treeChest,
    kemence: s.kemence, arcade2Best: s.arcade2Best, wildPhotos: s.wildPhotos,
    story5: s.story5, snowman: s.snowman, childDay: s.childDay,
    summitDone: s.summitDone, recipes: s.recipes, riddle: s.riddle,
    diary: s.diary, flowerPatches: s.flowerPatches, radyo: s.radyo
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
    state.settings.eco = state.settings.eco ?? 'auto';
    state.settings.speed = state.settings.speed ?? 1;
    state.settings.cb = state.settings.cb ?? false;
    if (!state.settings.bot) state.settings.bot = { fish: true, reserve: 400, crop: 'auto' };
    state.settings.pickSpeed = state.settings.pickSpeed || 1;
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
    // v28: workerData mit der Arbeiterzahl abgleichen — alte Stände hatten
    // Arbeiter OHNE Einträge, deren Arbeitstage deshalb nie hochzählten
    while (state.workerData.length < state.workers) {
      state.workerData.push({ name: (state.workerData.length + (d.day || 1)) % 8, days: 0 });
    }
    if (state.workerData.length > state.workers) state.workerData.length = state.workers;
    state.botXp = d.botXp ?? 0;
    state.botAuto = d.botAuto ?? false;
    state.botReports = Array.isArray(d.botReports) ? d.botReports : [];
    state.jumps = d.jumps ?? 0;
    state._savedAt = d.savedAt ?? 0;
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
    state.heli = d.heli ?? false;
    state.mandira = d.mandira ?? false;
    state.restaurant = d.restaurant ?? false;
    state.derbyBest = d.derbyBest ?? 0;
    state.kemalPeace = d.kemalPeace ?? false;
    state.dolmus = d.dolmus ?? false;
    state.collect = d.collect || {};
    state.fishTournBest = d.fishTournBest ?? 0;
    state.macWins = d.macWins ?? 0;
    state.animalNames = d.animalNames || {};
    state.orchard = d.orchard ?? false;
    state.logi = d.logi || { packs: false, goods: false, exportA: false };
    state.heliJobsDone = d.heliJobsDone ?? 0;
    state.photoMissionsDone = d.photoMissionsDone ?? 0;
    state.gulet = d.gulet ?? false;
    state.guletTours = d.guletTours ?? 0;
    state.sampiyon = d.sampiyon ?? false;
    state.konak = d.konak ?? 0;
    state.catFeeds = d.catFeeds ?? 0;
    state.jointVenture = d.jointVenture ?? false;
    state.village = d.village ?? { okul: 0, cayevi2: 0, cami: 0 };
    state.villageDays = d.villageDays ?? { okul: 0, cayevi2: 0, cami: 0 };
    state.yearEvent = d.yearEvent ?? null;
    state.kuryeDone = d.kuryeDone ?? 0;
    state.memories = d.memories ?? [];
    state.dedeHarman = d.dedeHarman ?? false;
    state.arcadeBest = d.arcadeBest ?? 0;
    state.muhtarluk = d.muhtarluk ?? false;
    state.electionsWon = d.electionsWon ?? 0;
    state.story3 = d.story3 ?? { ch: 0, path: null, done: false };
    state.ada = d.ada ?? { light: 0, cave: false };
    state.freighter = d.freighter ?? false;
    state.shipment = d.shipment ?? null;
    state.wedding = d.wedding ?? { stage: 0, catering: 0, day: 0 };
    state.kemalPressure = d.kemalPressure ?? 0;
    state.falcon = d.falcon ?? { feeds: 0, tame: false };
    state.bridge = d.bridge ?? false;
    state.xp = { pick: 0, fish: 0, trade: 0, ...(d.xp || {}) };
    state.factoryLines = d.factoryLines ?? 0;
    state.parcels = Array.isArray(d.parcels) ? d.parcels : [];
    state.factoryLog = d.factoryLog ?? null;
    state.kahya = !!d.kahya;
    state.kahyaReport = d.kahyaReport ?? null;
    state.railway = d.railway ?? false;
    state.landslide = d.landslide ?? null;
    state.stall = d.stall ?? null;
    state.queen = d.queen ?? false;
    state.beeCupWins = d.beeCupWins ?? 0;
    state.billboards = d.billboards ?? 0;
    state.campaign = d.campaign ?? '';
    // v18: alte Stände (vor dem geführten Spiel) behalten alles freigeschaltet
    if (d.featureUnlocks === undefined && (d.day ?? 1) > 1) {
      state.featureUnlocks = { _all: true };
    } else {
      state.featureUnlocks = d.featureUnlocks ?? {};
    }
    state.branch = d.branch ?? null;
    state.npcRel = d.npcRel ?? {};
    state.favorsDone = d.favorsDone ?? 0;
    state.cirak = d.cirak ?? null;
    state.story4 = d.story4 ?? { ch: 0, path: null, done: false, at: 0 };
    state.canavar = d.canavar ?? { wins: 0, next: 0 };
    state.flips = Array.isArray(d.flips) ? d.flips : [];
    state.teaMul = d.teaMul ?? 1;
    state.teaHist = Array.isArray(d.teaHist) ? d.teaHist : [];
    state.teaEvent = d.teaEvent ?? null;
    state.teaStore = d.teaStore ?? { kg: 0, valueKg: 0 };
    // v20: Flotte — alter Einzel-Frachter wird migriert
    state.fleet = d.fleet ?? (d.freighter ? 1 : 0);
    state.shipments = Array.isArray(d.shipments) ? d.shipments : (d.shipment ? [d.shipment] : []);
    state.freighter = state.fleet > 0;
    state.shipment = null;
    state.petrol = d.petrol ?? null;
    state.mask = d.mask ?? false;
    state.amphoras = d.amphoras ?? 0;
    state.dogTricks = d.dogTricks ?? {};
    state.wish = d.wish ?? null;
    state.postcardsSent = d.postcardsSent ?? 0;
    state.motoBest = d.motoBest ?? 0;
    state.treeStage = d.treeStage ?? 0;
    state.treeChest = d.treeChest ?? false;
    state.kemence = d.kemence ?? false;
    state.arcade2Best = d.arcade2Best ?? 0;
    state.wildPhotos = d.wildPhotos ?? {};
    state.story5 = d.story5 ?? { ch: 0, done: false };
    state.snowman = d.snowman ?? 0;
    state.childDay = d.childDay ?? 0;
    state.summitDone = d.summitDone ?? false;
    state.recipes = d.recipes ?? {};
    state.riddle = d.riddle ?? { progress: 0, done: false };
    state.diary = Array.isArray(d.diary) ? d.diary : [];
    state.flowerPatches = d.flowerPatches ?? 0;
    state.radyo = d.radyo ?? null;
    state.vehicles.moto = state.vehicles.moto ?? false;
    state.inventory.tea_harman = state.inventory.tea_harman ?? 0;
    state.inventory.levrek = state.inventory.levrek ?? 0;
    state.inventory.kofana = state.inventory.kofana ?? 0;
    state.inventory.mersin = state.inventory.mersin ?? 0;
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
  state.animals = { chicken: 0, cow: 0, sheep: 0, goat: 0 };
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
  state.botXp = 0; state.botAuto = false; state.botReports = []; state.jumps = 0;
  state.teaStyle = 'siyah'; state.greenLine = false;
  state.hives = 0; state.tavlaWins = 0;
  state.rep = 0; state.koop = false;
  state.vehWear = {}; state.vehTuning = {};
  state.dog = false;
  state.hist = { stocks: {}, earned: [] };
  state.net = false; state.decree = '';
  state.moralDays = 0; state.holidays = 0; state.maldivDone = false;
  state.raceBest = 0;
  state.heli = false; state.mandira = false; state.restaurant = false;
  state.derbyBest = 0; state.kemalPeace = false;
  state.dolmus = false; state.collect = {};
  state.fishTournBest = 0; state.macWins = 0;
  state.animalNames = {}; state.orchard = false;
  state.logi = { packs: false, goods: false, exportA: false };
  state.heliJobsDone = 0;
  state.photoMissionsDone = 0; state.gulet = false; state.guletTours = 0;
  state.sampiyon = false; state.konak = 0; state.catFeeds = 0;
  state.jointVenture = false;
  state.village = { okul: 0, cayevi2: 0, cami: 0 };
  state.villageDays = { okul: 0, cayevi2: 0, cami: 0 };
  state.yearEvent = null; state.kuryeDone = 0; state.memories = [];
  state.dedeHarman = false; state.arcadeBest = 0; state.muhtarluk = false;
  state.electionsWon = 0; state.story3 = { ch: 0, path: null, done: false };
  state.ada = { light: 0, cave: false };
  state.freighter = false; state.shipment = null;
  state.wedding = { stage: 0, catering: 0, day: 0 };
  state.kemalPressure = 0; state.falcon = { feeds: 0, tame: false };
  state.bridge = false;
  state.xp = { pick: 0, fish: 0, trade: 0 };
  state.factoryLines = 0; state.parcels = []; state.railway = false;
  state.landslide = null; state.stall = null; state.queen = false;
  state.beeCupWins = 0; state.billboards = 0; state.campaign = '';
  state.featureUnlocks = {}; state.branch = null; state.npcRel = {}; state.favorsDone = 0;
  state.cirak = null; state.story4 = { ch: 0, path: null, done: false, at: 0 };
  state.canavar = { wins: 0, next: 0 };
  state.flips = []; state.teaMul = 1; state.teaHist = []; state.teaEvent = null;
  state.teaStore = { kg: 0, valueKg: 0 }; state.fleet = 0; state.shipments = [];
  state.petrol = null;
  state.mask = false; state.amphoras = 0; state.dogTricks = {}; state.wish = null;
  state.postcardsSent = 0; state.motoBest = 0; state.treeStage = 0; state.treeChest = false;
  state.kemence = false; state.arcade2Best = 0; state.wildPhotos = {};
  state.story5 = { ch: 0, done: false }; state.snowman = 0; state.childDay = 0;
  state.summitDone = false; state.recipes = {}; state.riddle = { progress: 0, done: false };
  state.diary = []; state.flowerPatches = 0; state.radyo = null;
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
  state._halayDone = false;
  state._selaleDone = false;
  state._hiveDone = false;
  state._sandbag = false;
  state._tournDone = false;
  state._ezan0 = false;
  state._ezan1 = false;
  state._guletDone = false;
  state._kuryeJob = null; state._kuryeCount = 0; state._arcadeDone = false;
  state._adaFish = false; state._adaHoney = false;
  state._mineDone = false; state._kraftDone = false; state._weddingJoined = false;
  state._beeCupDone = false; state._stormToday = false;
  state._favors = {};
  state._petrolToday = 0;
  state._iftarDone = false; state._sekerLeft = 0; state._picnicDone = false; state._wishUsed = false;
  state._wishLuck = false; state._hugged = {};
  state._buskDone = false; state._festDone = false;
  state.styleToday = 0; state._cooked = false; state._dishBuff = null;
  state._buddy = null; state._radyoChosen = false;
  if (state.stall) { state.stall.soldToday = 0; state.stall.earnedToday = 0; }
  state._kemalDump = false; state._falconHint = 0;
  state._meisterDone = false;
}
