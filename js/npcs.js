// Dorfbewohner: spazieren durch Stadt, Hof und Annahmestelle, grüßen im Vorbeigehen
import { CFG } from './config.js';
import { state } from './state.js';
import { mulberry32 } from './util.js';
import { makeWorkerMesh } from './workers.js';
import { t } from './i18n.js';

const ZONES = () => ([
  { cx: CFG.city.x, cz: CFG.city.z, r: 22, n: 6 },          // Kasaba
  { cx: CFG.hut.x + 3, cz: CFG.hut.z + 3, r: 8, n: 2 },     // Annahmestelle
  { cx: CFG.farm.x + 6, cz: CFG.farm.z + 6, r: 10, n: 2 }   // Hof
]);

const NPC_COLORS = [0x8a6d5f, 0x5f6d8a, 0x6d8a5f, 0x8a5f6d, 0x7d7d55, 0x557d7d, 0x9a8a6a, 0x6a7a9a];

export function createNpcs(ctx, terrain, ui, player, shareFn) {
  const { scene } = ctx;
  const rng = mulberry32(31337);
  const npcs = [];
  let greetCooldown = 0;
  let kemalCooldown = 0;

  let idx = 0;
  for (const z of ZONES()) {
    for (let i = 0; i < z.n; i++) {
      const parts = makeWorkerMesh(idx, {
        basket: false,
        hat: rng() < 0.4,
        shirt: NPC_COLORS[idx % NPC_COLORS.length]
      });
      const a = rng() * Math.PI * 2, r = rng() * z.r * 0.8;
      const x = z.cx + Math.cos(a) * r, zz = z.cz + Math.sin(a) * r;
      parts.group.position.set(x, terrain.heightAt(x, zz), zz);
      parts.group.scale.setScalar(0.94 + rng() * 0.12);
      scene.add(parts.group);
      npcs.push({
        ...parts, zone: z, x, z: zz, tx: x, tz: zz,
        phase: rng() * 6.28, idle: rng() * 4, greeted: false
      });
      idx++;
    }
  }

  // v6: Kemal Ağa — der Rivale flaniert im Anzug über den Stadtplatz
  const kemal = (() => {
    const parts = makeWorkerMesh(0, { basket: false, hat: false, shirt: 0x2a2a30 });
    // dunkler Anzug + Schnauzer-Andeutung
    const tie = parts.head.clone();
    parts.group.position.set(CFG.city.x + 4, terrain.heightAt(CFG.city.x + 4, CFG.city.z + 2), CFG.city.z + 2);
    parts.group.scale.setScalar(1.05);
    scene.add(parts.group);
    return {
      ...parts,
      zone: { cx: CFG.city.x + 2, cz: CFG.city.z, r: 12 },
      x: CFG.city.x + 4, z: CFG.city.z + 2, tx: CFG.city.x + 4, tz: CFG.city.z + 2,
      phase: 0, idle: 2, isKemal: true
    };
  })();
  npcs.push(kemal);

  let gatherTimer = 0;

  return {
    count: npcs.length,
    list: () => npcs,
    // v11: Ezan — die Kasaba-Bewohner sammeln sich ruhig beim Çayevi
    gather(sec = 45) {
      gatherTimer = sec;
      for (const p of npcs) {
        if (p.isKemal || p.zone.cx !== CFG.city.x) continue;
        p.tx = CFG.city.x + 10 + (Math.random() - 0.5) * 5;
        p.tz = CFG.city.z - 3 + (Math.random() - 0.5) * 4;
        p.idle = sec;
      }
    },
    update(dt, elapsed) {
      if (gatherTimer > 0) gatherTimer -= dt;
      greetCooldown -= dt;
      for (const p of npcs) {
        p.idle -= dt;
        const dx = p.tx - p.x, dz = p.tz - p.z;
        const d = Math.hypot(dx, dz);
        if (p.idle <= 0 && d < 0.4) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * p.zone.r * 0.85;
          p.tx = p.zone.cx + Math.cos(a) * r;
          p.tz = p.zone.cz + Math.sin(a) * r;
          p.idle = 3 + Math.random() * 9;
        }
        if (d > 0.4) {
          const sp = 1.1;
          p.x += dx / d * sp * dt;
          p.z += dz / d * sp * dt;
          p.group.rotation.y = Math.atan2(dx, dz);
          p.phase += dt * 7;
          p.group.position.set(p.x, terrain.heightAt(p.x, p.z) + Math.abs(Math.sin(p.phase)) * 0.035, p.z);
          p.armL.rotation.x = Math.sin(p.phase) * 0.35;
          p.armR.rotation.x = -Math.sin(p.phase) * 0.35;
          if (p.legL) {
            p.legL.rotation.x = -Math.sin(p.phase) * 0.5;
            p.legR.rotation.x = Math.sin(p.phase) * 0.5;
          }
        } else {
          p.group.position.y = terrain.heightAt(p.x, p.z);
          p.armL.rotation.x *= 0.9;
          p.armR.rotation.x *= 0.9;
          if (p.legL) { p.legL.rotation.x *= 0.9; p.legR.rotation.x *= 0.9; }
        }
        // Kemal Ağa stichelt statt zu grüßen
        if (p.isKemal) {
          const kd = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
          kemalCooldown -= dt;
          if (kd < 4 && kemalCooldown <= 0) {
            kemalCooldown = 30;
            p.group.rotation.y = Math.atan2(player.pos.x - p.x, player.pos.z - p.z);
            const share = shareFn ? shareFn() : 5;
            const line = state.jointVenture ? 'kemalJV' : state.kemalPeace ? 'kemalFriend'
              : share >= 60 ? 'kemalLose' : share >= 30 ? 'kemalMid' : 'kemalTaunt';
            ui.toast('🎩 ' + t(line), false, 5000);
          }
          continue;
        }
        // Gruß, wenn der Spieler nahe vorbeikommt
        const pd = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
        if (pd < 3 && !p.greeted && greetCooldown <= 0) {
          p.greeted = true;
          greetCooldown = 14;
          p.group.rotation.y = Math.atan2(player.pos.x - p.x, player.pos.z - p.z);
          p.armR.rotation.x = -2.6;   // winken
          ui.toast(t('npcGreet' + (1 + Math.floor(Math.random() * 4))), false, 2600);
        }
        if (pd > 8) p.greeted = false;
      }
    }
  };
}
