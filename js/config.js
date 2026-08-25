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
    tea_green: { sell: 76,  icon: '🍵' },    // v6: Yeşil Çay
    tea_white: { sell: 165, icon: '🏵️' },    // v6: Beyaz Çay (Rize-Rarität)
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
  workerLevelDays: [0, 3, 8],          // Arbeitstage bis Level 1/2/3
  workerLevelFactor: [1, 0.92, 0.84],  // Pflückzeit-Faktor je Level
  soforCost: 800,                      // Beförderung: verkauft Arbeiter-Tee zu 100 %

  // ---- v6: Tee-Sorten (Fabrik-Produktionslinien) ----
  teaStyles: {
    siyah: { product: 'tea_pack', kgPerPack: 1 },
    yesil: { product: 'tea_green', kgPerPack: 1, lineCost: 4000 },
    beyaz: { product: 'tea_white', kgPerPack: 2, needsDede: true }
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
    prize: 600
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
    radius: 9, targetSec: 75, prize: 800, rep: 2
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
    durationSec: 60, prizePerGoal: 120, bonusGoals: 3, bonus: 400, rep: 2
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
  fishTourn: { durationSec: 90, prize: 600, rep: 2, spot: { x: 108, z: -134 } },

  // ---- v10: Basar-Schätze (Sammelalbum) ----
  collectPrize: 2000, collectRep: 5,

  // ---- v10: Karşıköy (zweites Dorf) ----
  karsikoy: {
    x: -138, z: 76, r: 22,
    market: { x: -132, z: 70, ry: 0.8 },
    pitch: { x: -146, z: 84 },
    premium: { cheese: 1.45, honey: 1.3, egg: 1.25, milk: 1.2, tea_pack: 1.15 },
    mac: { stake: 200, prize: 500, rep: 2, oppMax: 2 }
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
  meister: { entry: 500, prize: 3000, rep: 10, minRep: 40 },

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
  [ { x: 24, z: -102 }, { x: 52, z: -106 }, { x: 84, z: -104 }, { x: 104, z: -100 }, { x: 122, z: -102 } ], // Haus -> Stadt
  [ { x: 4, z: -26 }, { x: 12, z: 12 }, { x: 18, z: 52 }, { x: 26, z: 88 } ],                               // Feld -> Yayla
  [ { x: 26, z: 88 }, { x: -30, z: 86 }, { x: -90, z: 80 }, { x: -132, z: 77 } ]                            // v10: Yayla -> Karşıköy
];
export const ROAD_WIDTH = 4.2;
