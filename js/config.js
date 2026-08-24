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
  dayLengthSec: 300,       // 06:00 -> 20:00
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
    cable:    { cost: 1400, icon: '🚠' }
  },

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
