// Balancing & Welt-Konstanten
export const CFG = {
  seed: 1453,

  // Welt
  worldSize: 420,          // Terrain-Kantenlänge (m)
  terrainSegs: 256,
  seaLevel: 0,

  // Teefeld (Reihen quer zum Hang)
  field: {
    x0: -46, x1: 46,       // Reihenausdehnung
    z0: -84, z1: -6,       // Hangbereich
    rowGap: 2.6,           // Abstand zwischen Reihen (z)
    bushGap: 1.5,          // Abstand in der Reihe (x)
    cx: 0, cz: -45,        // Feldzentrum (Ellipsen-Maske)
    rx: 50, rz: 44
  },

  // Tag & Wetter
  dayLengthSec: 420,       // 06:00 -> 20:00 (v2: mehr zu tun, längerer Tag)
  startHour: 6.5,
  endHour: 20,
  seasonDays: 7,
  rain: { minPerDay: 1, maxPerDay: 2, minDur: 26, maxDur: 42, warnSec: 8 },

  // Tee-Wachstum (Sekunden)
  tea: {
    growTime: 75, growJitter: 22,
    ripeTime: 85,           // Zeit bis überreif
    wetBoost: 0.5,          // Faktor Wachstumszeit während/nach Regen
    wetAfterRain: 45,       // Boost-Nachlauf (s)
    yieldMin: 0.32, yieldMax: 0.55,   // kg pro Busch
    lateYieldFactor: 1.15, lateQuality: 0.55,
    rainPickQuality: 0.85,
    pickTime: 0.7, pickTimeShears: 0.42,
    shearsYield: 1.6,
    pickRange: 3.0, pickCos: 0.9
  },

  // Wirtschaft
  eco: {
    pricePerKg: 30,
    basket0: 10, basket1: 18, basket2: 30,
    orderFactor: 0.45       // Bonus = Ziel-kg * Preis * Faktor
  },

  upgrades: {
    basket1:  { cost: 260,  icon: '🧺' },
    basket2:  { cost: 720,  icon: '🧺' },
    shears:   { cost: 450,  icon: '✂️' },
    boots:    { cost: 300,  icon: '🥾' },
    fert:     { cost: 550,  icon: '🌱' },
    cable:    { cost: 1400, icon: '🚠' },
    foreman:  { cost: 1800, icon: '👷' },   // Vorarbeiter: Arbeiter +30 % Tempo
    sprinkler:{ cost: 2200, icon: '💦' },   // Bewässerung: Felder wachsen schneller
    silo:     { cost: 2600, icon: '🏗️' }    // Silo: Lager-Verkauf automatisch am Abend
  },

  // ---- v2: Arbeiter ----
  workers: {
    max: 6,
    hireCost: 350,          // einmalig pro Arbeiter
    wage: 130,              // Tageslohn
    pickTime: 11,           // s pro Busch (ohne Vorarbeiter) — ~15 kg/Tag
    foremanFactor: 0.7,
    walkSpeed: 1.9,
    sellFactor: 0.9         // Arbeiter-Tee wird zu 90 % Preis verkauft
  },

  // ---- v2: Bauernhof (Westseite) ----
  farm: {
    x: -98, z: -96, r: 26,           // ebener Hof
    barn: { x: -108, z: -104, ry: 0.9 },
    sign: { x: -90, z: -88 },
    pen:  { x: -108, z: -84, r: 10 },  // Tiergehege
    plots: {                          // Gemüse-Beete (Raster)
      x0: -96, z0: -102, cols: 4, rows: 3, w: 4.6, d: 3.4, gap: 1.2
    }
  },

  crops: {
    corn:    { seed: 60,  days: 1, sell: 95,  yield: 4, icon: '🌽' },
    tomato:  { seed: 90,  days: 2, sell: 210, yield: 4, icon: '🍅' },
    cabbage: { seed: 70,  days: 2, sell: 160, yield: 5, icon: '🥬' },
    hazel:   { seed: 220, days: 3, sell: 520, yield: 3, icon: '🌰' },  // Karadeniz-Klassiker
    straw:   { seed: 140, days: 1, sell: 300, yield: 5, icon: '🍓', lock: 'eregli' },   // Osmanlı çileği
    walnut:  { seed: 280, days: 3, sell: 640, yield: 3, icon: '🥜', lock: 'devrek' }    // Devrek cevizi
  },

  animals: {
    chicken: { cost: 120,  product: 'egg',  perDay: 2, icon: '🐔', max: 8 },
    cow:     { cost: 1500, product: 'milk', perDay: 1, icon: '🐄', max: 4 },
    sheep:   { cost: 600,  product: 'wool', perDay: 0.5, icon: '🐑', max: 6 }
  },

  products: {
    egg:  { sell: 14,  icon: '🥚' },
    milk: { sell: 120, icon: '🥛' },
    wool: { sell: 170, icon: '🧶' },
    corn: { sell: 95,  icon: '🌽' },
    tomato: { sell: 210, icon: '🍅' },
    cabbage: { sell: 160, icon: '🥬' },
    hazel: { sell: 520, icon: '🌰' },
    straw: { sell: 300, icon: '🍓' },
    walnut: { sell: 640, icon: '🥜' },
    coal: { sell: 40, icon: '🪨' },          // Zonguldak-Kohle: Fabrik-Energie
    tea_pack: { sell: 58, icon: '📦' },      // eigenes Tee-Label, 1 kg pro Paket
    hamsi:  { sell: 25,  icon: '🐟' },       // v5: Fang aus dem Schwarzen Meer
    lufer:  { sell: 95,  icon: '🐠' },
    kalkan: { sell: 380, icon: '🐡' }
  },

  // ---- v3: Reisen (İskele in der Stadt) ----
  travel: {
    spot: { x: 112, z: -118 },
    cities: {
      zonguldak: { cost: 240, hours: 3 },    // Kohlestadt
      eregli:    { cost: 190, hours: 2.5 },  // Osmanlı çileği
      devrek:    { cost: 150, hours: 2 }     // Baston & Ceviz
    },
    // Was es dort gibt (Einkauf) und was dort Premium bringt (Verkauf ×Faktor)
    goods: {
      zonguldak: { buy: { coal: 22 }, premium: { tea_pack: 1.25, corn: 1.2 } },
      eregli:    { buy: { strawSeed: 500 }, premium: { straw: 1.5, egg: 1.3 } },
      devrek:    { buy: { walnutSeed: 900, baston: 2400 }, premium: { wool: 1.4, milk: 1.3, walnut: 1.4 } }
    }
  },

  // ---- v3: Fabrik & Handel ----
  factory: {
    cost: 12000,
    x: -70, z: -112, ry: 0.5,
    packFactor: 1.9,        // Paketwert vs. Rohtee
    energyCoal: 1,          // Kohle pro Produktionstag …
    energyCost: 90          // … sonst Stromkosten
  },
  supermarket: { x: 132, z: -88, ry: -2.6, retailFactor: 1.15 },
  export: {
    countries: ['DE', 'NL', 'AZ', 'JP', 'US'],
    minQty: 15, maxQty: 60,
    minPrice: 62, maxPrice: 82
  },

  // ---- v3: Privatleben ----
  life: {
    weddingCost: 5000, weddingTier: 2, marriedBonus: 1.05,
    childCost: 3000, childTier: 3, childBonus: 1.03,
    properties: {
      yayla:     { cost: 8000,  rent: 90,  icon: '🛖' },
      townhouse: { cost: 22000, rent: 260, icon: '🏘️' },
      villa:     { cost: 65000, rent: 750, icon: '🏛️' }
    },
    stocks: {
      krd: { name: 'Kardemir Çelik', p0: 45 },
      lim: { name: 'Karadeniz Liman', p0: 28 },
      fnd: { name: 'Fındık Birliği', p0: 63 }
    },
    stockDrift: 0.09,
    black: { bonus: 1.6, baseRisk: 0.22, heatRisk: 0.08, fineFactor: 2.2, hourFrom: 19, spot: { x: 136, z: -86 } },
    bastonSpeed: 1.08
  },

  // ---- v2: Stadt (Ostküste) ----
  city: {
    x: 118, z: -100, r: 40,
    market: { x: 104, z: -96, ry: -0.9 },
    dealer: { x: 128, z: -108, ry: 2.2 },
    priceSwing: 0.35        // ±35 % Tagesschwankung am Markt
  },

  // ---- v2: Fahrzeuge ----
  vehicles: {
    tractor: { cost: 3800,  speed: 7,  accel: 5.5,  icon: '🚜', cargo: 5 },  // Korb ×5
    pickup:  { cost: 7500,  speed: 13, accel: 8,    icon: '🛻', cargo: 3 },
    sedan:   { cost: 16000, speed: 17, accel: 10,   icon: '🚗', cargo: 1 },
    lux:     { cost: 48000, speed: 26, accel: 15,   icon: '🏎️', cargo: 1 }
  },
  parking: { x: 24, z: -100 },   // Stellplatz beim Spielerhaus

  // ---- v4: Flughafen & Fernreisen ----
  airport: {
    x: 150, z: -62, ry: 0.4,
    flights: {
      istanbul: { cost: 850, hours: 3 },       // Luxus-Markt
      almanya:  { cost: 2600 }                 // Gurbetçi-Schicht: Rest des Tages weg
    },
    istanbulPremium: { tea_pack: 1.6, hazel: 1.35, walnut: 1.3 },
    almanyaWage: [2800, 4400]
  },

  // ---- v4: Hausausbau ----
  homeLevels: [
    { cost: 3000,  icon: '🧱' },   // Anbau: +2 kg Korb
    { cost: 9000,  icon: '🏠' },   // Obergeschoss: +5 % Verkaufsbonus
    { cost: 15000, icon: '📡' }    // Sat-Schüssel: +120 ₺/Tag Label-Werbung
  ],
  homeAdBonus: 120,

  // ---- v4: Survival-Modus ----
  survival: {
    hungerPerDay: 85,     // Punkte Abbau pro Spieltag (von 100)
    energyPerDay: 70,
    lowThreshold: 20,
    slowFactor: 0.6,
    foods: {
      simit: { cost: 15, hunger: 25, icon: '🥯' },
      pide:  { cost: 45, hunger: 60, icon: '🫓' },
      cayTea: { cost: 10, energy: 18, icon: '🍵' }
    }
  },

  // ---- v5: Jahreszeiten (wechseln alle seasonDays Tage, abgeleitet aus state.day) ----
  seasonCycle: {
    names: ['summer', 'autumn', 'winter', 'spring'],
    teaGrowth: [1, 0.6, 0, 1.3],       // Wachstumsfaktor Tee
    cropGrowth: [1, 1, 0, 1],          // Beete reifen (Winter: eingefroren)
    rainMul: [1, 1.5, 0.9, 1.2],       // Regenhäufigkeit
    snow: [0, 0, 1, 0],                // Schnee-Anteil
    autumnTint: [0, 1, 0, 0],
    workersRest: [false, false, true, false]   // Winter: Pflücker pausieren (kein Lohn)
  },

  // ---- v5: Wetter-Extras ----
  weather: {
    stormChance: 0.2,       // Chance pro Tag auf Fırtına
    stormDamage: 0.12,      // Anteil reifer Triebe, die überständig werden
    fogChance: 0.3,         // Morgennebel bis ~10 Uhr
    rainbowSec: 40          // Regenbogen-Dauer nach Regenende
  },

  // ---- v5: Boot & Angeln ----
  boat: {
    cost: 5500, speed: 10, accel: 5.5, icon: '🚤',
    dock: { x: 112, z: -150 }          // im Wasser vor dem Bootssteg
  },
  fishing: {
    rodCost: 250,
    biteMin: 2.5, biteMax: 7, window: 1.3,
    fish: {
      hamsi:  { p: 0.68, sell: 25,  icon: '🐟' },
      lufer:  { p: 0.26, sell: 95,  icon: '🐠' },
      kalkan: { p: 0.06, sell: 380, icon: '🐡' }
    }
  },

  // ---- v5: Rivale ----
  rival: {
    winShare: 60,           // % Marktanteil zum Sieg
    dumpChance: 0.25,       // Chance/Tag auf Preisdumping
    dumpMul: 0.75           // tea_pack-Preis an Dumping-Tagen
  },

  // ---- v4: Rollen ----
  roles: {
    farmer:   { pickFactor: 1 },
    worker:   { pickFactor: 0.85 },            // pflückt schneller
    jandarma: { pickFactor: 1.15, salary: 180 } // Staatsgehalt, aber kein Schwarzmarkt
  },

  // ---- v2: Wohlstands-Stufen (Nettovermögen) ----
  wealthTiers: [0, 2500, 8000, 20000, 60000, 150000],

  // Spieler
  player: {
    eyeHeight: 1.7, radius: 0.55,
    speed: 4.3, runFactor: 1.42, bootsFactor: 1.3,
    spawn: { x: 14, z: -98 }
  },

  // Orte
  hut: { x: -27, z: -108, ry: 0.35 },        // Çay Alım Yeri
  home: { x: 16, z: -102, ry: -0.5 },        // Spielerhaus
  cableTop: { x: 4, z: -22 },                // Teleferik-Station am Feld
  interactDist: 4.2,

  // Grafik-Qualität: [Gras-Instanzen, Gras-Radius, Schatten-Map, PixelRatio-Deckel]
  quality: {
    high:   { grass: 70000, grassR: 42, shadow: 4096, pr: 2 },
    medium: { grass: 45000, grassR: 36, shadow: 2048, pr: 1.5 },
    low:    { grass: 20000, grassR: 28, shadow: 1024, pr: 1 }
  }
};

// Wege als Polylinien (x,z) — Erd-Textur + kein Gras darauf
export const PATHS = [
  [ { x: 16, z: -98 }, { x: -2, z: -104 }, { x: -24, z: -106 } ],   // Haus -> Hütte
  [ { x: -2, z: -104 }, { x: 2, z: -60 }, { x: 4, z: -26 } ]        // Weg hoch ins Feld
];
export const PATH_WIDTH = 2.2;

// v2: Landstraßen (breiter, befahrbar) — Hof <-> Haus <-> Stadt
export const ROADS = [
  [ { x: -90, z: -96 }, { x: -60, z: -102 }, { x: -30, z: -108 }, { x: 8, z: -106 }, { x: 24, z: -102 } ],  // Hof -> Haus
  [ { x: 24, z: -102 }, { x: 52, z: -106 }, { x: 84, z: -104 }, { x: 104, z: -100 }, { x: 122, z: -102 } ] // Haus -> Stadt
];
export const ROAD_WIDTH = 4.2;
