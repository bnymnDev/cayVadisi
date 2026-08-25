// v4: Nachbarschafts-Ereignisse — Temel & Dursun, Streit und İmece
// Ein Zufallsereignis pro Tag, als Entscheidungs-Dialog mit Konsequenzen.
import { CFG } from './config.js';
import { state, save, addRep } from './state.js';
import { t } from './i18n.js';
import { fmtMoney } from './util.js';

export function createEvents(ctx, ui, audio) {
  let firedToday = false;
  let fireAt = 0;

  function planDay() {
    firedToday = Math.random() > 0.75;   // 75 % Chance auf ein Ereignis
    fireAt = CFG.dayLengthSec * (0.25 + Math.random() * 0.4);
  }
  planDay();

  // Jedes Ereignis: {id, cond?, choices: [{id, apply() -> resultKey}]}
  const EVENTS = [
    {
      id: 'border',   // Temel behauptet, zwei Teereihen gehören ihm
      choices: [
        { id: 'lawyer', apply() {
          if (state.money < 400) return 'noMoney';
          state.money -= 400; state.daySpent += 400;
          state.rel.temel += 1;
          return 'borderLawyer';
        } },
        { id: 'share', apply() {
          state.workerBoost *= 0.85;
          state.rel.temel += 2;
          return 'borderShare';
        } },
        { id: 'stand', apply() {
          state.rel.temel -= 2;
          if (Math.random() < 0.5) return 'borderWin';
          state.money = Math.max(0, state.money - 300); state.daySpent += 300;
          return 'borderLose';
        } }
      ]
    },
    {
      id: 'imece',    // Dursun bietet Nachbarschaftshilfe an
      choices: [
        { id: 'accept', apply() {
          state.workerBoost *= 1.5;
          state.rel.dursun += 2;
          addRep(CFG.rep.imece);   // v7: İmece stärkt den Dorf-Ruf
          return 'imeceYes';
        } },
        { id: 'decline', apply() {
          state.rel.dursun -= 1;
          return 'imeceNo';
        } }
      ]
    },
    {
      id: 'goat',     // Temels Ziege ist im Teefeld
      choices: [
        { id: 'chase', apply() {
          state.rel.temel -= 1;
          return 'goatChase';
        } },
        { id: 'feed', apply() {
          state.rel.temel += 2;
          if (Math.floor(state.inventory.corn) >= 1) { state.inventory.corn -= 1; return 'goatFeed'; }
          return 'goatFeedNoCorn';
        } }
      ]
    },
    {
      id: 'gurbetciVisit',   // Gurbetçi-Besuch kauft Marken-Tee
      cond: () => Math.floor(state.inventory.tea_pack) >= 3,
      choices: [
        { id: 'sellG', apply() {
          const n = Math.min(5, Math.floor(state.inventory.tea_pack));
          const sum = n * CFG.products.tea_pack.sell * 2;
          state.inventory.tea_pack -= n;
          state.money += sum; state.dayEarned += sum; state.totalEarned += sum;
          return { key: 'gurbetciSold', args: [n, fmtMoney(sum, state.settings.lang)] };
        } },
        { id: 'declineG', apply() { return 'gurbetciNo'; } }
      ]
    },
    {
      id: 'sheepOut',   // Ein Schaf ist ausgebüxt
      cond: () => (state.animals.sheep || 0) > 0,
      choices: [
        { id: 'pay', apply() {
          if (state.money < 120) return 'noMoney';
          state.money -= 120; state.daySpent += 120;
          return 'sheepPaid';
        } },
        { id: 'risk', apply() {
          if (Math.random() < 0.3) { state.animals.sheep -= 1; return 'sheepLost'; }
          return 'sheepFound';
        } }
      ]
    }
  ];

  function pickEvent() {
    const pool = EVENTS.filter(e => !e.cond || e.cond());
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function fire() {
    const ev = pickEvent();
    if (!ev) return;
    audio.deny && audio.thunderish();
    ui.showEvent(ev, (choice) => {
      const res = choice.apply();
      const key = typeof res === 'string' ? res : res.key;
      const args = typeof res === 'string' ? [] : res.args;
      ui.toast(t('ev_' + key, ...args), true, 6500);
      save();
    });
  }

  return {
    newDay() {
      state.workerBoost = 1;
      planDay();
    },
    update() {
      if (firedToday) return;
      if (state.timeSec >= fireAt) {
        firedToday = true;
        fire();
      }
    },
    debugFire: fire
  };
}
