// Balancing & Welt-Konstanten
export const CFG = {
  version: '30',   // sichtbar auf Start- und Pausebildschirm (Cache-Diagnose)
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
    silo:     { cost: 2600, icon: '🏗️' },   // Silo: Lager-Verkauf automatisch am Abend
    expand:   { cost: 9000, icon: '🏞️' }    // v9: Randparzellen roden -> mehr Büsche
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
    sheep:   { cost: 600,  product: 'wool', perDay: 0.5, icon: '🐑', max: 6 },
    goat:    { cost: 400,  product: 'milk', perDay: 0.5, icon: '🐐', max: 6 }   // v9: klettert zur Şelale
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
    kalkan: { sell: 380, icon: '🐡' },
    levrek: { sell: 160, icon: '🎏' },       // v16: seltene Fänge nach Angel-Level
    kofana: { sell: 340, icon: '🐬' },
    mersin: { sell: 950, icon: '🦈' },
    tea_green: { sell: 76,  icon: '🍵' },    // v6: Yeşil Çay
    tea_white: { sell: 165, icon: '🏵️' },    // v6: Beyaz Çay (Rize-Rarität)
    tea_harman: { sell: 210, icon: '🫖' },   // v14: Dede Harmanı (Familienrezept)
    honey: { sell: 240, icon: '🍯' },        // v6: Anzer-Honig von der Yayla
    cheese: { sell: 260, icon: '🧀' }        // v9: Mandıra-Peynir (aus 2 Milch)
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
      villa:     { cost: 65000, rent: 750, icon: '🏛️' },
      pansiyon:  { cost: 15000, rent: 0,   icon: '🏨' }   // v8: Gäste zahlen je nach Ruf
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
    lux:     { cost: 48000, speed: 26, accel: 15,   icon: '🏎️', cargo: 1 },
    moto:    { cost: 5200,  speed: 22, accel: 15,   icon: '🏍️', cargo: 1 }   // v14: Kurye-Moped
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

  // ---- v6: Bank ----
  bank: {
    loans: [5000, 20000],
    dailyInterest: 0.04,      // 4 % Zins pro Tag auf Restschuld
    insurancePerDay: 60       // Fırtına-Versicherung
  },

  // ---- v6: Çayevi-Würfelduell ----
  tavla: { stakes: [50, 200, 500], rounds: 3 },

  // ---- v6: Arbeiter-Persönlichkeiten ----
  workerNames: ['Ali', 'Hasan', 'Fatma', 'Ayşe', 'Mehmet', 'Zeynep', 'Mustafa', 'Emine'],
  workerLevelDays: [0, 3, 8, 15, 25],  // v28: Arbeitstage bis Level 1..5 (mehr Progression)
  workerLevelFactor: [1, 0.9, 0.8, 0.72, 0.65],  // v28: Pflückzeit-Faktor je Level (bis 35 % schneller)
  soforCost: 800,                      // Beförderung: verkauft Arbeiter-Tee zu 100 %

  // ---- v6: Tee-Sorten (Fabrik-Produktionslinien) ----
  teaStyles: {
    siyah: { product: 'tea_pack', kgPerPack: 1 },
    yesil: { product: 'tea_green', kgPerPack: 1, lineCost: 4000 },
    beyaz: { product: 'tea_white', kgPerPack: 2, needsDede: true },
    harman: { product: 'tea_harman', kgPerPack: 2, needsMemories: true }   // v14: Dede Harmanı
  },

  // ---- v6: Yayla (Hochalm) ----
  yayla: {
    x: 26, z: 96, r: 20,
    hut: { x: 20, z: 90, ry: 2.6 },
    hiveCost: 600, maxHives: 4,
    honeySeasons: [0, 3],     // Sommer & Frühling
    milkBonusSummer: 1        // +1 Milch/Kuh im Sommer
  },

  // ---- v6: Festival (letzter Tag jeder Saison) ----
  festival: {
    priceBonus: 1.25,
    contestBase: 18,          // Kemals Ernte: base + day
    prize: 1200   // v16: Payout verdoppelt
  },

  // ---- v7: Nacht (freiwillige Verlängerung bis Mitternacht) ----
  night: {
    endHour: 24,            // ab endHour bis hier ist "Gece", dann Zwangsschlaf
    fish: { hamsi: 0.45, lufer: 0.35, kalkan: 0.2 },   // bessere Nacht-Quoten
    kacak: {
      hourFrom: 21,
      ship: { x: 58, z: -196 },      // Schmugglerschiff vor der Küste
      priceMul: 2.1,                 // tea_pack-Basispreis ×
      baseRisk: 0.25, heatRisk: 0.07,
      fineFactor: 1.4, repLoss: 8
    }
  },

  // ---- v7: Kooperative & Dorf-Ruf ----
  koop: {
    minRep: 20, fee: 1500,
    priceBonus: 1.06,        // Tee-Verkauf ×
    seedDiscount: 0.85,      // Saatgut ×
    dividendPerRep: 3        // ₺ je Ruf-Punkt am Festivaltag
  },
  rep: {
    order: 1, festivalWin: 3, imece: 2,
    blackCaught: 4, kacakCaught: 8, foxLoss: 0
  },

  // ---- v7: Werkstatt (Sanayi) ----
  workshop: {
    x: 138, z: -116, ry: 2.35,
    wearPerKmh: 0.0025,      // Verschleiß/s bei 1 km/h
    repairPerPoint: 4,       // ₺ pro Verschleiß-Punkt
    maxSlow: 0.35,           // −35 % Topspeed bei 100 Verschleiß
    tuning: {
      engine: { costFactor: 0.2,  speedMul: 1.15 },   // % vom Fahrzeugpreis
      tires:  { costFactor: 0.1,  steerMul: 1.25, rainSave: 0.5 }
    }
  },

  // ---- v7: Kangal ----
  dog: { cost: 2200, foxChance: 0.2, kacakGuard: 0.6 },  // Hund: Risiko × beim Kaçak

  // ---- v7: Fotoalbum ----
  album: { max: 10, width: 640 },

  // ---- v7: New Game+ ----
  prestige: { moneyKeep: 0.1, priceBonus: 0.05, maxShown: 5 },

  // ---- v7: Preis-Historie ----
  history: { days: 28 },

  // ---- v8: İstanbul-Ausflug (begehbares Viertel in der SW-Seeecke) ----
  istanbul: {
    zone: { x0: -196, x1: -104, z0: -197, z1: -146, h: 0.5 },   // Kai-Plattform
    spawn: { x: -150, z: -168 },
    gate: { x: -118, z: -168 },        // Rückflug-Punkt (Vapur-Anleger)
    bazaar: { x: -168, z: -186 }       // Kapalıçarşı-Stände (Premium-Verkauf)
  },

  // ---- v8: Urlaub ----
  vacation: {
    moralDays: 3, moralBonus: 1.1,     // nach dem Urlaub: +10 % Verkauf für 3 Tage
    spots: {
      izmir:   { cost: 1800,  tier: 0, icon: '🕰️' },
      antalya: { cost: 2600,  tier: 1, icon: '🏖️' },
      fethiye: { cost: 3400,  tier: 2, icon: '🪂' },
      maldiv:  { cost: 24000, tier: 4, icon: '🏝️' }
    },
    maldivPrestigeRep: 6               // Malediven: einmalig +Ruf (man redet im Dorf!)
  },

  // ---- v8: Telefon ----
  phone: {
    taxi: {
      perMeter: 1.6, min: 60, hours: 0.4,
      spots: {
        home:    { x: 16,  z: -100 },
        hut:     { x: -25, z: -106 },
        farm:    { x: -94, z: -94 },
        city:    { x: 112, z: -100 },
        factory: { x: -66, z: -110 },
        yayla:   { x: 26,  z: 92 },
        airport: { x: 146, z: -60 }
      }
    }
  },

  // ---- v8: Kararname (Tropico-Dekrete, eins aktiv) ----
  decrees: {
    switchCost: 500,
    list: {
      subvansiyon: { upkeep: 100, teaMul: 1.1 },
      reklam:      { upkeep: 150, packsPerDay: 3 },
      mesai:       { upkeep: 0,   workerSpeed: 1.2, wageMul: 1.25 },
      vergi:       { upkeep: 0,   income: 250, repPerDay: 1 }
    }
  },

  // ---- v8: Hamsi-Netz & Wildtiere ----
  net: { cost: 400, trawlSec: 12, min: 6, max: 14, winterMul: 2, minSpeed: 2.2 },
  bear: { hourFrom: 21, chance: 0.5, basketLoss: 0.25, speed: 2.6 },

  // ---- v8: Kayık-Rennen ----
  race: {
    start: { x: 96, z: -170 },
    buoys: [ { x: 60, z: -186 }, { x: 30, z: -160 }, { x: 64, z: -148 }, { x: 96, z: -152 } ],
    radius: 9, targetSec: 75, prize: 1600, rep: 2   // v16: Payout verdoppelt
  },

  // ---- v8: Pansiyon-Tourismus ----
  pension: {
    x: 46, z: -116, ry: 0.3,
    guestPay: 140, maxGuests: 4,
    tour: { pay: 400, rep: 2, stops: [ { x: 4, z: -30 }, { x: -25, z: -106 }, { x: 108, z: -132 } ] }
  },

  // ---- v8: Winter-Rodelhang ----
  sled: { top: { x: 60, z: -26 }, minSnow: 0.6 },   // offener Hang östlich vom Teefeld

  // ---- v9: Karadeniz-Derby (Fußball am Stadtplatz) ----
  derby: {
    goal: { x: 108, z: -78, ry: 0.2, w: 4.6 },   // Tor am Platzrand
    durationSec: 60, prizePerGoal: 240, bonusGoals: 3, bonus: 800, rep: 2   // v16: Payout verdoppelt
  },

  // ---- v9: Peynir-Kette ----
  mandira: { cost: 6000, milkPerCheese: 2 },     // Molkerei am Hof
  restaurant: {
    cost: 18000, x: 96, z: -88, ry: -0.6,
    dishCheese: 1, dishCorn: 1, maxDishes: 3, dishPay: 340
  },

  // ---- v9: Helikopter ----
  heli: {
    cost: 120000, speed: 34, accel: 12, lift: 7, maxAlt: 90,
    pad: { x: 158, z: -74 }
  },

  // ---- v9: Feste ----
  halay: { rep: 1, joy: 20 },                    // Festivaltag am Stadtplatz

  // ---- v9: Şelale (Wasserfall-Bergpfad) ----
  selale: { x: -62, z: 148, restEnergy: 25 },

  // ---- v9: Story-Saison 2 (Kemal Ağas Vergangenheit) ----
  story2: { whiteTeaGift: 2, peacePrize: 5000 },

  // ---- v10: Dolmuş-Linie ----
  dolmus: { cost: 12000, baseFare: 250, perRep: 4, fuel: 60, speed: 6.5 },

  // ---- v10: Sel (Hochwasser) ----
  flood: {
    chance: 0.08, minDay: 6, hitHour: 15,
    sandbagCost: 200, moneyLoss: 0.15, repSave: 2
  },

  // ---- v10: Angel-Turnier (Festivaltag am Steg) ----
  fishTourn: { durationSec: 90, prize: 1200, rep: 2, spot: { x: 108, z: -134 } },   // v16: Payout verdoppelt

  // ---- v10: Basar-Schätze (Sammelalbum) ----
  collectPrize: 2000, collectRep: 5,

  // ---- v10: Karşıköy (zweites Dorf) ----
  karsikoy: {
    x: -138, z: 76, r: 22,
    market: { x: -132, z: 70, ry: 0.8 },
    pitch: { x: -146, z: 84 },
    premium: { cheese: 1.45, honey: 1.3, egg: 1.25, milk: 1.2, tea_pack: 1.15 },
    mac: { stake: 200, prize: 1000, rep: 2, oppMax: 2 }   // v16: Payout verdoppelt
  },

  // ---- v11: Heli-Aufträge ----
  heliJobs: {
    chance: 0.6,             // Chance pro Tag (wenn Heli vorhanden)
    landRadius: 14,
    rescue: { pay: 900, rep: 3, spots: [ { x: -62, z: 148 }, { x: 26, z: 96 }, { x: -14, z: 180 } ] },
    express: { pay: 700, rep: 1, from: { x: -70, z: -112 }, to: { x: -138, z: 76 } }
  },

  // ---- v11: Festivalnacht-Feuerwerk ----
  fireworks: { hourFrom: 20.5, launch: { x: 118, z: -150 } },

  // ---- v11: Tierzucht ----
  breeding: {
    chance: 0.12,            // Chance/Nacht pro Art (ab 2 Tieren, unter Max)
    contestMinAnimals: 5,    // Preistier-Wettbewerb am Festival
    contestPrize: 400, contestRep: 1,
    names: ['Sarıkız', 'Karabaş', 'Pamuk', 'Fındık', 'Duman', 'Bulut', 'Şeker', 'Maviş', 'Zeytin', 'Kiraz', 'Boncuk', 'Cesur']
  },

  // ---- v11: Lieferketten-Automation (Şoför 2.0) ----
  logistics: {
    upkeep: 80,              // pro Abend, wenn mindestens eine Regel aktiv
    maxPacks: 10             // Auto-Verkauf Pakete/Tag im Supermarkt
  },

  // ---- v11: Haselnuss-Plantage ----
  orchard: {
    cost: 7000, x: 74, z: -44, rows: 4, cols: 5, gap: 5.5,
    perDay: 8, season: 1     // Ernte im Herbst
  },

  // ---- v11: Ezan-Tagesrhythmus (bewusst dezent: kein Melodie-Imitat) ----
  ezan: { hours: [12.5, 18.2], gatherSec: 45 },

  // ---- v12: Foto-Missionen ----
  photoMissions: {
    chance: 0.4, pay: 400, rep: 1,
    targets: ['selale', 'dolphins', 'fireworks', 'sunset', 'istanbul']
  },

  // ---- v12: Segel-Gulet mit Küstentour ----
  gulet: {
    cost: 30000, minRep: 10, pay: 500, perRep: 5,
    mooring: { x: 122, z: -156 },
    route: [ { x: 100, z: -170 }, { x: 40, z: -185 }, { x: -30, z: -180 },
             { x: -80, z: -190 }, { x: -20, z: -165 }, { x: 80, z: -160 }, { x: 122, z: -156 } ],
    speed: 6
  },

  // ---- v12: Çay-Meisterschaft von Rize (Festival-Endgame) ----
  meister: { entry: 500, prize: 6000, rep: 10, minRep: 40 },   // v16: Payout verdoppelt

  // ---- v12: Konak-Restaurierung -> Museum ----
  konak: {
    x: -34, z: 42, ry: 0.5,
    stages: [5000, 8000, 12000],
    entryBase: 100, entryPerRep: 3, collectionBonus: 2   // Faktor bei kompletter Sammlung
  },

  // ---- v12: Mikro-Wetterzonen (atmosphärisch) ----
  microWeather: { selaleR: 45, selaleFog: 0.004, yaylaR: 35, yaylaFogUntil: 11, yaylaFog: 0.005 },

  // ---- v12: Dorfkatzen ----
  cats: { feedGoal: 10, feedRep: 2 },

  // ---- v12: Kemal-Joint-Venture (nach Barış) ----
  jointVenture: { cost: 10000, packsPerDay: 2, priceMul: 1.1 },

  // ---- v13: Dorf-Ausbau (Tropico) — Projekte übers Muhtarlık finanzieren ----
  // ---- v15: Frachter, Panayır, Bergwerk, Hochzeit, Kemal-KI, Falke, Brücke ----
  freighter: {
    cost: 42000, mooring: { x: 136, z: -162 }, maxPacks: 40,
    // v20: Reederei — Flotte bis 3 Schiffe, riskante Fernrouten, Versicherung
    costs: [42000, 60000, 90000],
    insuranceRate: 0.15,               // Prämie: Anteil vom Ladungswert
    routes: {
      trabzon: { mul: 1.35, risk: 0.10 },
      samsun:  { mul: 1.75, risk: 0.25 },
      batum:   { mul: 2.2,  risk: 0.40 },   // v20
      odessa:  { mul: 2.6,  risk: 0.50 }    // v20
    },
    lossFactor: 0.4   // bei Sturm auf See geht dieser Anteil verloren
  },
  panayir: {
    everyDays: 14, offset: 7,          // Festtage: Tag 7, 21, 35 …
    spot: { x: 86, z: -74 },
    lotTicket: 100,
    strengthStake: 100, strengthPrize: 900   // v16: Payout verdoppelt
  },
  mine: {
    spot: { x: 96, z: 128 },
    coalPerHit: 3, gemChance: 0.18, gemValue: 1600, injuryCost: 150   // v16: Payout verdoppelt
  },
  wedding: {
    minDay: 12,
    spot: { x: 110, z: -92 },          // Festwiese an der Kasaba
    guests: 8,
    taki: [400, 800, 1400, 2200]       // Takı nach Catering-Stufe 0..3
  },
  kemalAI: { dumpMul: 0.85, pressurePerMove: 1 },
  falcon: {
    perch: { x: 32, z: 102 },          // Yayla-Felsen
    feedsNeeded: 3, hintHours: 2
  },
  bridge: {
    cost: 6000,
    x0: -48, x1: -24, z: 132,          // Hängebrücke überm Şelale-Tobel
    sign: { x: -50, z: 132 }
  },

  // ---- v14: Jahres-Events, Kurye, Dede, Arcade, Ada, Wahl, Story 3 ----
  yearEvents: {
    cycleDays: 28,
    list: ['heat', 'hamsi', 'boom', 'blackout']
  },
  kurye: {
    perDay: 3, basePay: 140, tipPerSec: 3, maxTime: 100,
    targets: [
      { id: 'pension', x: 46, z: -116 }, { id: 'city', x: 104, z: -96 },
      { id: 'karsikoy', x: -132, z: 82 }, { id: 'yayla', x: 20, z: 90 },
      { id: 'factory', x: -66, z: -110 }
    ]
  },
  dede: {
    spots: [
      { x: 34, z: -95 },     // Baum am Spawn
      { x: 24, z: -120 },    // am Steg
      { x: -60, z: 146 },    // Şelale
      { x: 28, z: 94 },      // Yayla-Hütte
      { x: -32, z: 40 },     // Konak
      { x: -130, z: 74 },    // Karşıköy
      { x: 116, z: -96 },    // Çayevi
      { x: -106, z: -102 },  // Scheune
      { x: 6, z: -28 },      // Feldrand
      { x: 130, z: -90 }     // Supermarkt-Ecke
    ]
  },
  arcade: { spot: { x: 116, z: -106 }, stake: 50, perPoint: 12, duelPrize: 500 },   // v16: Payout verdoppelt
  ada: {
    cx: -62, cz: -172, r: 21,
    zone: { x0: -76, x1: -48, z0: -186, z1: -158, h: 2.2 },
    lighthouse: { x: -68, z: -178, stages: [4000, 6000], rep: 6 },
    cave: { x: -54, z: -164, loot: 2500 },
    fishSpot: { x: -50, z: -180 },
    honey: { x: -70, z: -164, perVisit: 2 }
  },
  election: { everyDays: 28, kemalBase: 34, villageVotes: 9, bonus: 160, tax: 120 },
  story3: { startDay: 8, kacakPay: [1500, 4000], jandarmaPay: [800, 2000], packCost: 5 },

  village: {
    muhtar: { x: 108, z: -112 },      // Muhtarlık-Schild in der Kasaba
    minRep: 15,
    projects: {
      okul:    { cost: 15000, days: 2, rep: 8,  x: 96,  z: -122, ry: 0.6 },
      cayevi2: { cost: 9000,  days: 1, rep: 5,  x: 136, z: -90,  ry: -1.2 },
      cami:    { cost: 20000, days: 2, rep: 10, x: 86,  z: -84,  ry: 0.9 }
    },
    wageRebate: 0.9,      // Okul fertig: Dorfjugend hilft — Löhne −10 %
    cayeviIncome: 150,    // Çayevi-Anbau fertig: täglicher Anteil
    camiMoralDays: 2      // Cami fertig: jedes Festival +2 Moral-Tage
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
    jumpVel: 5.6, gravity: 15,          // v27: Sprung (reicht über Teebüsche)
    spawn: { x: 14, z: -98 }
  },

  // ---- v27: Vali-Bot (Voll-Automatik) ----
  bot: {
    fishSpot: { x: 112, z: -146 },      // Ufer am Bootssteg
    fishEverySec: 7,                    // ~1 Fang alle 7 s
    fishMaxPerTrip: 15,
    fishUntilHour: 16.5,
    marketMinWorth: 300,                // Markt-Gang lohnt ab diesem Warenwert
    moneyReserve: 400,                  // bleibt immer in der Kasse
    tripSpot: { x: 116, z: -100 },      // Çayevi-Ecke in der Stadt
    tripSec: 18,
    // v28: Dolmuş für weite Wege, Wegenetz-Knoten, Bot-Level, Offline-Verdienst
    dolmusFare: 25, dolmusMinDist: 60,
    navNodes: [
      { x: 0, z: -110 }, { x: -27, z: -106 }, { x: -60, z: -100 },
      { x: 40, z: -104 }, { x: 80, z: -100 }, { x: 104, z: -96 }, { x: 112, z: -130 }
    ],
    xpLevels: [0, 60, 180, 400, 800],   // Bot-Level 0..4
    offline: { maxHours: 8, perHourBase: 160, perWorker: 35, perLevel: 20 }
  },

  // Orte
  hut: { x: -27, z: -108, ry: 0.35 },        // Çay Alım Yeri
  home: { x: 16, z: -102, ry: -0.5 },        // Spielerhaus
  cableTop: { x: 4, z: -22 },                // Teleferik-Station am Feld
  interactDist: 4.2,

  // ---- v25: Anı Defteri (automatisches Erinnerungsbuch) ----
  diary: {
    moments: ['canavar', 'summit', 'wedding', 'riddle', 'ghost', 'sampiyon',
              'muhtar', 'treeChest', 'amphoras', 'moto']
  },

  // ---- v25: Bienen & Blumenbeete auf der Yayla ----
  flowers: { cost: 300, max: 4, honeyPer2: 1, spot: { x: 34, z: 100 } },

  // ---- v25: Radyo Vadisi ----
  radyoVadisi: {
    cost: 5000, mast: { x: -8, z: -10 },   // Sendemast auf dem Feldhügel
    adBonus: 1.05
  },

  // ---- v25: Angel-Buddy ----
  buddy: { spot: { x: 106, z: -146 }, hours: 2, names: ['Temel', 'Yusuf'] },

  // ---- v25: Eisfläche im Winter ----
  icePond: { x: 70, z: 24, r: 9, slideMul: 1.6 },

  // ---- v25: Konak-Innenraum (Teleport-Interieur in der Map-Ecke) ----
  konakInt: {
    zone: { x0: -196, x1: -172, z0: 176, z1: 196, h: 2 },
    spawn: { x: -184, z: 192 },
    exitDoor: { x: -184, z: 194 }
  },

  // ---- v24: Fotomodus-Schalter (auf Wunsch erstmal aus; true = wieder an) ----
  photoEnabled: false,

  // ---- v24: Ziegen-Bergpfad zur Şelale-Spitze ----
  goatPath: {
    base: { x: -70, z: 152 },           // Einstieg unterhalb des Wasserfalls
    summit: { x0: -78, x1: -70, z0: 158, z1: 164, h: 26 },   // Gipfel-Plattform
    steps: [                             // Trittsteine als eigene Mini-Zonen
      { x0: -66, x1: -62, z0: 152, z1: 155, h: 8 },
      { x0: -70, x1: -66, z0: 154, z1: 157, h: 14 },
      { x0: -74, x1: -70, z0: 156, z1: 159, h: 20 }
    ],
    rep: 2
  },

  // ---- v24: Dede-Kochbuch ----
  recipes: {
    muhlama:   { rep: 5,  needs: { cheese: 2, corn: 1 },  icon: '🫕' },   // Buff: +1 Moral-Tag
    hamsitava: { rep: 15, needs: { hamsi: 3, egg: 1 },    icon: '🍳' },   // Buff: Angel-EXP ×2 heute
    lazboregi: { rep: 25, needs: { egg: 2, honey: 1 },    icon: '🥧' }    // Buff: +10 % Lucky Pick heute
  },

  // ---- v24: Moto-Tricks ----
  tricks: { minSpeed: 10, repEvery: 5 },   // Wheelies pro Tag für +Ruf

  // ---- v24: Rätselsteine ----
  riddle: {
    stones: [
      { x: -20, z: -20 }, { x: 60, z: -40 }, { x: -50, z: 90 },
      { x: 90, z: 40 }, { x: 10, z: 120 }
    ],
    cave: { x: 44, z: 132 },              // Fels am Nordhang öffnet sich
    reward: 1500, rep: 2
  },

  // ---- v23: Jahreszeiten-Feste (Tag 3 jeder Saison, Sommer hat das Festival) ----
  seasonFest: {
    dayInSeason: 3,
    spot: { x: 112, z: -94 },            // Festplatz an der Kasaba
    erntedankBonus: 1.2,                 // Herbst: Marktpreise +20 % heute
    snowmanRep: 3,                       // Winter: Schneemann fertig
    hidirellezMoral: 2                   // Frühling: Feuersprung
  },

  // ---- v23: Kemençe-Straßenmusik ----
  busking: {
    cost: 600, perHit: 45,
    spots: [ { x: 116, z: -96 }, { x: -136, z: 74 }, { x: 30, z: 92 } ]   // Kasaba, Karşıköy, Yayla
  },

  // ---- v23: Arcade Nr. 2 — Kayık Rallisi ----
  arcade2: {
    perPoint: 12,
    rivals: [ ['Temel', 34], ['Dursun', 28], ['Yusuf', 22], ['Kemal A.', 41] ]
  },

  // ---- v23: Wildtiere & Foto-Sammlung „Vahşi Vadi" ----
  wildlife2: {
    photoPay: 150, allRep: 5,
    spots: [ { x: -40, z: 30 }, { x: 40, z: 60 }, { x: -70, z: -30 } ]
  },

  // ---- v23: Das Geisterhaus (Story 5) ----
  ghost: {
    house: { x: -62, z: 44, ry: 0.7 },   // Waldrand
    startDay: 10, reward: 2000, rep: 4
  },

  // ---- v23: Komfort ----
  comfort: {
    fastTravelCost: 30,
    stops: [
      { id: 'home', x: 16, z: -102 }, { id: 'hut', x: -27, z: -108 },
      { id: 'city', x: 118, z: -100 }, { id: 'farm', x: -98, z: -96 },
      { id: 'yayla', x: 26, z: 96 }, { id: 'karsikoy', x: -132, z: 70 }
    ]
  },

  // ---- v23: Kind wächst mit ----
  childGrow: {
    growDays: 30, helpAt: 0.65, eggsPerDay: 2
  },

  // ---- v22: Tauchen (Wrack vor der Ada) ----
  diving: {
    maskCost: 800,
    entry: { x: -50, z: -184 },        // Tauchboje am Ada-Strand
    wreck: { x: -44, z: -196 },        // versunkener Kayık am Meeresgrund
    depth: -6.5, airSec: 75,
    amphoras: 5, amphoraValue: 350
  },

  // ---- v22: Ramazan & Bayram (alle 28 Tage) ----
  holidays: {
    cycle: 28, ramazanFrom: 20, ramazanDays: 5,   // Tag 20-24 Ramazan, 25-26 Bayram
    iftarHour: 19, iftarRep: 2,
    sekerCost: 50, sekerRep: 1, kids: 2
  },

  // ---- v22: Kangal-Ausbildung ----
  dogTricks: {
    sit:   { cheese: 1 },              // posiert: Foto-Missionen +50 %
    fetch: { cheese: 2 },              // apportiert morgens eine Kleinigkeit
    herd:  { cheese: 3 }               // hütet: +10 % Tierprodukte
  },

  // ---- v22: Lagerfeuer am Strand ----
  campfire: {
    spot: { x: 104, z: -144 },         // Strand beim Bootssteg
    starEvery: 16                      // ~Sekunden zwischen Sternschnuppen
  },

  // ---- v22: Vadi-Postkarten ----
  postcards: { max: 5, rep: 1 },

  // ---- v22: Moto-Kurier-Rennen ----
  motorace: {
    start: { x: 96, z: -102 },         // Startflagge an der Kasaba-Straße
    gates: [
      { x: 52, z: -106 }, { x: 8, z: -106 }, { x: -30, z: -108 },
      { x: -90, z: -96 }, { x: -60, z: -102 }, { x: 24, z: -102 }, { x: 84, z: -104 }
    ],
    radius: 7, targetSec: 80, prize: 800, rep: 2
  },

  // ---- v22: Der alte Platanenbaum ----
  planeTree: {
    x: -8, z: 14,                       // Hügel am Feldrand mit Talblick
    platform: { x0: -11, x1: -5, z0: 11, z1: 17, h: 8.5 },
    stages: [800, 1500],                // Baumhaus-Ausbau 1..2
    chest: 500
  },

  // ---- v21: Tankstelle & Werkstatt-Kette ----
  petrol: {
    spot: { x: 66, z: -103, ry: 0.1 },       // an der Landstraße Haus->Stadt
    cost: 9000, perCustomer: 35,
    customerEvery: 34,                        // ~Sekunden zwischen Kunden-Autos
    werkstattCost: 4000, werkstattPerDay: 80  // Anbau: NPC-Reparaturen/Tag
  },

  // ---- v30: Kâhya-Modus — so viel bleibt immer in der Kasse ----
  kahya: { reserve: 1200 },

  // ---- v29: Stadt-Ausbaustufen & NPC-Verkehr ----
  growth: {
    thresholds: [0, 20000, 60000, 150000]   // Köy → Kasaba → Şehir → Metropole (Gesamtverdienst)
  },
  traffic: {
    carsBase: 2, perStage: 1, maxCars: 6,
    speed: 9, x0: 6, x1: 150, laneA: -101.2, laneB: -104.2
  },

  // ---- v20: Immobilien-Flipping ----
  flip: {
    houses: [
      { x: 88, z: -66, ry: 0.3 },      // Dorfrand bei der Festwiese
      { x: 142, z: -116, ry: -1.6 },   // Kasaba-Gasse
      { x: -44, z: 70, ry: 0.9 }       // am Weg nach Karşıköy
    ],
    buyCost: 3500,
    renoCosts: [1500, 2500, 4000],     // Stufe 1..3
    sellPrice: 18000,                  // voll renoviert (Gewinn ~6.500)
    resellDays: 7,                     // danach steht wieder eine Ruine an
    rentBase: 120, rentPerRep: 3       // Pansiyon-Miete/Tag (skaliert mit Ruf)
  },

  // ---- v20: Çay-Börse (dynamischer Teepreis) ----
  teaMarket: {
    min: 0.6, max: 2.2, drift: 0.22,   // täglicher Random-Walk
    spikeChance: 0.12, spikeMul: 1.5, spikeDays: 2,   // Ernteausfall bei Rivalen
    dipChance: 0.08, dipMul: 0.7, dipDays: 2,          // Schwemme
    histLen: 14
  },

  // ---- v19: Çırak (Lehrling) ----
  cirak: {
    hireCost: 1500, wage: 60,
    trainCosts: [600, 1100, 1800],          // Stufe 1->2, 2->3, 3->4
    // Stufen-Perks: 1 Tierpflege (+10 % Tierprodukte, +1 Ei), 2 Abend-
    // Verkauf von Eiern/Milch/Wolle, 3 Stand-Boost, 4 Usta (+5 % Verkäufe)
    animalBonus: 1.1, stallBoost: 0.15, ustaBonus: 1.05
  },

  // ---- v19: Story 4 — Nurten Hanım kauft das Tal ----
  story4: {
    startDay: 16,
    sellMul: 2,                              // sie zahlt das Doppelte je Parzelle
    courtCost: 5000                          // Prozesskosten, wenn das Dorf nicht hilft
  },

  // ---- v19: Karadeniz Canavarı (Angel-Boss an der Ada) ----
  canavar: {
    minFishLvl: 4, everyDays: 7,
    prize: 5000, repeatPrize: 2500, xp: 90
  },

  // ---- v19: Drohnen-Übersicht (M lang halten) ----
  drone: { height: 115, minH: 55, maxH: 170, speed: 46 },

  // ---- v19: Museum-Ausstellung am Konak ----
  museum2: { perExhibit: 45 },               // Eintritts-Bonus je Exponat und Tag

  // ---- v18: Geführter Fortschritt (GTA-Style-Freischaltungen) ----
  progress: {
    // Bedingungen: day / kg (totalKg) / earned (totalEarned) / rep / xp:[zweig,level] / needs:[features]
    features: {
      market:    { kg: 40,                 at: 'cityMarket' },   // Kasaba-Pazar
      dealer:    { earned: 2500,           at: 'cityDealer' },   // Galeri (Fahrzeuge)
      factory:   { xp: ['trade', 1],       at: 'factory' },      // Fabrik & Label
      exports:   { xp: ['trade', 2], needs: ['factory'], at: 'factory' },
      tavla:     { rep: 3,                 at: 'cayevi' },
      futbol:    { rep: 6,                 at: 'derby' },        // Derby + Karşıköy-Maç
      arcade:    { day: 4,                 at: 'arcade' },
      muhtarlik: { rep: 12,                at: 'city' },         // Dorfprojekte (Okul/Çayevi/Cami)
      stall:     { xp: ['trade', 3],       at: 'stall' },
      valley2:   { earned: 20000,          at: 'valley2' }       // Fındık Vadisi (Filiale)
    }
  },

  // ---- v18: Fındık Vadisi — Nachbar-Tal mit Filiale ----
  valley2: {
    zone: { x0: 118, x1: 196, z0: 140, z1: 196, h: 3.2 },   // Hochplateau im Nordosten
    spawn: { x: 132, z: 154 },
    house: { x: 168, z: 176, ry: -0.7 },        // Filial-Haus mit Verwalter
    branchCost: 12000,
    workerCost: 400, workerWage: 100, maxWorkers: 5,
    hazelPerWorker: 5,                          // Fındık pro Arbeiter und Tag
    taxiCost: 120                               // Fahrt mit dem Taksi/Dolmuş
  },

  // ---- v18: NPC-Leben ----
  npcLife: {
    favorsPerDay: 2,
    favorItems: { honey: 2, cheese: 1, hamsi: 3, egg: 4, tea_pack: 2 },
    favorPay: 260, favorRep: 2,
    cayevi: { x: 130, z: -104 }                 // Feierabend-Treffpunkt
  },

  // ---- v17: Imperium sichtbar ----
  factory2: {                               // Produktionslinien in der Anbauhalle
    lineCosts: [8000, 15000, 26000, 42000, 65000],   // v30: Linie 1..5
    packsPerLine: 6,                        // Pakete pro Linie und Nacht
    rawPerPack: 30,                         // Einkauf Rohtee je Paket (Geld)
    coalPerLine: 1                          // Kohle je Linie und Nacht
  },
  parcels: {                                // Land-Grab: Parzellen im Tal
    spots: [
      { x: -20, z: -132 }, { x: 44, z: -122 }, { x: 72, z: -62 }, { x: -62, z: -58 },
      { x: -18, z: 28 }, { x: 52, z: 22 }, { x: -58, z: 24 }, { x: 62, z: 62 },
      { x: -28, z: 112 }, { x: 72, z: 112 }
    ],
    price: 2600, rentPerDay: 70,
    buybackMul: 1.8,                        // v30: Rückkauf vom Rivalen (Çırak Lv2 verhandelt −0.2)
    rivalEveryDays: 2,                      // alle N Tage schnappt sich ein Rivale eine
    rivals: { kemal: 0xc0392b, saban: 0xd68a2e, nurten: 0x7d3fa8 },
    meColor: 0x2f9e44
  },
  railway: {                                // Schmalspur-Teebahn Feld -> Fabrik
    cost: 14000,
    sign: { x: 8, z: -30 },
    path: [
      { x: 6, z: -28 }, { x: -8, z: -52 }, { x: -30, z: -76 },
      { x: -52, z: -98 }, { x: -66, z: -110 }
    ],
    speed: 4.5,
    coalPerDay: 2                           // Bahn bringt täglich Kohle aus Zonguldak
  },
  landslide: {                              // Erdrutsch nach Sturmtagen
    chance: 0.55, spot: { x: 52, z: -106 },
    scoops: 6, imeceCost: 800, marketMalus: 0.85, rep: 3
  },
  stall: {                                  // eigener Basar-Stand in der Kasaba
    cost: 3000, spot: { x: 98, z: -84, ry: -1.2 },
    maxStock: 12,
    factors: [0.8, 1.0, 1.2, 1.5],          // wählbarer Preisfaktor
    buyerEvery: 26                          // ~Sekunden zwischen Kunden (Basis)
  },
  beeCup: {                                 // Imker-Meisterschaft auf der Yayla
    everyDays: 14, offset: 10, spot: { x: 34, z: 88 },
    entryHoney: 3, prize: 1500, rep: 3,
    queenCost: 1200, queenBonus: 1          // Anzer-Königin: +1 Honig je Stock
  },
  billboards: {                             // Foto-Kampagne -> Plakatwände
    cost: 1000, bonusPer: 0.05, max: 3,
    spots: [
      { x: 60, z: -108, ry: 0.15 }, { x: -42, z: -100, ry: -0.3 }, { x: 20, z: 58, ry: 0.5 }
    ]
  },

  // ---- v16: EXP & Imperium ----
  xp: {
    // Schwellen für Level 0..8 (Index = Level)
    levels: [0, 100, 300, 700, 1400, 2500, 4200, 6500, 9500],
    pickPer: 2,                    // XP pro Pflückvorgang
    tradePerPack: 1,               // XP pro verkauftem Paket
    tradePerSale: 3,               // XP pro Verkaufsvorgang (Korb/Produkte)
    fishPer: { hamsi: 4, lufer: 9, kalkan: 22, levrek: 12, kofana: 26, mersin: 60 },
    // Lucky Pick: Chance je Pflück-Level, füllt den halben Korb
    luckyPerLevel: 0.06, luckyMax: 0.5,
    // Mega Lucky (Korb sofort voll) ab höherem Level
    megaMinLevel: 5, megaPerLevel: 0.03, megaMax: 0.12,
    // Seltene Fische, freigeschaltet nach Angel-Level
    rareFish: {
      levrek: { minLevel: 2, p: 0.12, sell: 160, icon: '🎏' },   // Levrek (Wolfsbarsch)
      kofana: { minLevel: 4, p: 0.08, sell: 340, icon: '🐬' },   // Kofana (großer Lüfer)
      mersin: { minLevel: 6, p: 0.045, sell: 950, icon: '🦈' }   // Mersin (Stör, Karadeniz-Legende)
    },
    // Arbeiter-Limit nach Handels-Level: Index = floor(Level/2)
    workerCaps: [6, 8, 10, 14, 20]
  },

  // Grafik-Qualität: [Gras-Instanzen, Gras-Radius, Schatten-Map, PixelRatio-Deckel]
  quality: {
    high:   { grass: 48000, grassR: 40, shadow: 2048, pr: 1.5 },   // v15.1: Energie
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
  [ { x: 24, z: -102 }, { x: 52, z: -106 }, { x: 84, z: -104 }, { x: 104, z: -100 }, { x: 122, z: -102 } ], // Haus -> Stadt
  [ { x: 4, z: -26 }, { x: 12, z: 12 }, { x: 18, z: 52 }, { x: 26, z: 88 } ],                               // Feld -> Yayla
  [ { x: 26, z: 88 }, { x: -30, z: 86 }, { x: -90, z: 80 }, { x: -132, z: 77 } ]                            // v10: Yayla -> Karşıköy
];
export const ROAD_WIDTH = 4.2;
