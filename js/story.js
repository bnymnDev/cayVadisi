// v5: Dede-Çayı — die Questlinie in 5 Kapiteln
// Kapitel werden automatisch geprüft; Story-Karten laufen über das Event-Overlay.
import { CFG } from './config.js';
import { state, save } from './state.js';
import { t } from './i18n.js';

export function createStory(ctx, ui, audio, player) {
  let checkTimer = 0;
  let showing = false;

  // Kapitel: check() -> erfüllt?, apply() -> Belohnung
  const CHAPTERS = [
    {
      id: 'letter',
      check: () => state.totalKg >= 10,
      apply() { state.money += 250; state.dayEarned += 250; }
    },
    {
      id: 'tin',
      check: () => Math.hypot(player.pos.x - CFG.factory.x, player.pos.z - CFG.factory.z) < 14,
      apply() { state.money += 100; }
    },
    {
      id: 'ingredients',
      check: () => Math.floor(state.inventory.hazel) >= 5
        && Math.floor(state.inventory.straw) >= 5
        && Math.floor(state.inventory.tea_pack) >= 10,
      apply() {
        state.inventory.hazel -= 5;
        state.inventory.straw -= 5;
        state.inventory.tea_pack -= 10;
      }
    },
    {
      id: 'brew',
      check: () => state.factory,
      apply() { state.dedeBonus = true; }
    },
    {
      id: 'legacy',
      check: () => state.wealthTier >= 4,
      apply() { state.money += 2000; state.dayEarned += 2000; }
    },

    // ---- v9: Saison 2 — Kemal Ağas Vergangenheit ----
    {
      id: 'rivalMeet',      // Kemal lädt dich zu sich ein, als dein Label wächst
      check: () => share() >= 30,
      apply() { }
    },
    {
      id: 'oldPhoto',       // im Çayevi hängt ein altes Foto: Kemal & Dede, Arm in Arm
      check: () => Math.hypot(player.pos.x - (CFG.city.x + 12), player.pos.z - (CFG.city.z - 4)) < 7,
      apply() { }
    },
    {
      id: 'partners',       // Temel erzählt beim Tavla die alte Geschichte
      check: () => state.tavlaWins >= 1,
      apply() { }
    },
    {
      id: 'whiteGift',      // bring Kemal zwei Dosen Beyaz Çay — Dedes Rezept
      check: () => Math.floor(state.inventory.tea_white) >= CFG.story2.whiteTeaGift,
      apply() {
        state.inventory.tea_white -= CFG.story2.whiteTeaGift;
        state.rep = Math.min(100, state.rep + 5);
      }
    },
    {
      id: 'baris',          // Frieden: gemeinsames Festival, das Dumping endet
      check: () => share() >= 50,
      apply() {
        state.kemalPeace = true;
        state.money += CFG.story2.peacePrize;
        state.dayEarned += CFG.story2.peacePrize;
      }
    }
  ];

  function share() {
    return Math.min(95, Math.max(5, Math.round(5 + state.packsSold * 0.4 + state.exportsDone * 3)));
  }

  function showCard(chapterId, done) {
    showing = true;
    ui.showStoryCard(chapterId, () => {
      showing = false;
      done && done();
    });
  }

  return {
    // Fortschrittsdaten fürs Görevler-Panel
    current() {
      return state.story < CHAPTERS.length ? CHAPTERS[state.story].id : null;
    },
    chapterCount: CHAPTERS.length,

    debug() {
      return { showing, checkTimer, story: state.story, chk: state.story < CHAPTERS.length ? CHAPTERS[state.story].check() : null };
    },

    update(dt) {
      if (showing || state.story >= CHAPTERS.length) return;
      checkTimer -= dt;
      if (checkTimer > 0) return;
      checkTimer = 2;
      const ch = CHAPTERS[state.story];
      if (ch.check()) {
        ch.apply();
        state.story += 1;
        audio.tierUp();
        showCard(ch.id);
        save();
        ui.refreshMoney();
      }
    }
  };
}
