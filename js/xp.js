// v16: EXP-System — Pflücken, Angeln, Handel leveln getrennt.
// Level schalten Perks frei: Lucky Picks, seltene Fische, größeres Arbeiter-Limit.
import { CFG } from './config.js';
import { state } from './state.js';

export function xpLevel(v) {
  const th = CFG.xp.levels;
  let lvl = 0;
  for (let i = 1; i < th.length; i++) { if (v >= th[i]) lvl = i; else break; }
  return lvl;
}

export function maxLevel() { return CFG.xp.levels.length - 1; }

// XP bis zum nächsten Level (null = Max erreicht)
export function nextLevelAt(v) {
  for (const th of CFG.xp.levels) if (v < th) return th;
  return null;
}

// Gibt das neue Level zurück, wenn ein Level-Up passiert ist, sonst 0.
export function addXp(kind, n) {
  const before = xpLevel(state.xp[kind]);
  state.xp[kind] += n;
  const after = xpLevel(state.xp[kind]);
  return after > before ? after : 0;
}

// Gestaffeltes Arbeiter-Limit nach Handels-Level (Imperium statt hartem Cap)
export function workerMax() {
  const caps = CFG.xp.workerCaps;
  const lvl = xpLevel(state.xp.trade);
  return caps[Math.min(caps.length - 1, Math.floor(lvl / 2))];
}

// Lucky-Pick-Chancen nach Pflück-Level
export function luckyChance() {
  return Math.min(CFG.xp.luckyMax, xpLevel(state.xp.pick) * CFG.xp.luckyPerLevel);
}
export function megaChance() {
  const lvl = xpLevel(state.xp.pick);
  if (lvl < CFG.xp.megaMinLevel) return 0;
  return Math.min(CFG.xp.megaMax, (lvl - CFG.xp.megaMinLevel + 1) * CFG.xp.megaPerLevel);
}

// Freigeschaltete seltene Fische (nach Angel-Level), beste zuerst
export function rareFishPool() {
  const lvl = xpLevel(state.xp.fish);
  return Object.entries(CFG.xp.rareFish)
    .filter(([, f]) => lvl >= f.minLevel)
    .sort((a, b) => b[1].sell - a[1].sell);
}
