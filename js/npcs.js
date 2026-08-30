// Dorfbewohner: spazieren durch Stadt, Hof und Annahmestelle, grüßen im Vorbeigehen
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';
import { mulberry32 } from './util.js';
import { makeWorkerMesh, spawnPerson } from './workers.js';
import { t } from './i18n.js';

const ZONES = () => ([
  { cx: CFG.city.x, cz: CFG.city.z, r: 22, n: 6 },          // Kasaba
  { cx: CFG.hut.x + 3, cz: CFG.hut.z + 3, r: 8, n: 2 },     // Annahmestelle
  { cx: CFG.farm.x + 6, cz: CFG.farm.z + 6, r: 10, n: 2 }   // Hof
]);

const NPC_COLORS = [0x8a6d5f, 0x5f6d8a, 0x6d8a5f, 0x8a5f6d, 0x7d7d55, 0x557d7d, 0x9a8a6a, 0x6a7a9a];
// v18: jeder Dorfbewohner hat einen Namen
const NPC_NAMES = ['İdris', 'Havva', 'Cemal', 'Şükran', 'Recep', 'Melek', 'Yaşar', 'Gülizar', 'Osman', 'Saniye', 'Bekir'];

export function createNpcs(ctx, terrain, ui, player, shareFn, chars) {
  const { scene } = ctx;
  const rng = mulberry32(31337);
  const npcs = [];
  let greetCooldown = 0;
  let kemalCooldown = 0;

  let idx = 0;
  for (const z of ZONES()) {
    for (let i = 0; i < z.n; i++) {
      const parts = spawnPerson(chars, idx, {
        basket: false,
        hat: rng() < 0.4,
        shirt: NPC_COLORS[idx % NPC_COLORS.length]
      });
      const a = rng() * Math.PI * 2, r = rng() * z.r * 0.8;
      const x = z.cx + Math.cos(a) * r, zz = z.cz + Math.sin(a) * r;
      parts.group.position.set(x, terrain.heightAt(x, zz), zz);
      parts.group.scale.setScalar(0.94 + rng() * 0.12);
      scene.add(parts.group);
      // v18: Zuhause am Zonenrand + ❗-Marker für Gefallen
      const ha = rng() * Math.PI * 2;
      const home = { x: z.cx + Math.cos(ha) * z.r * 1.1, z: z.cz + Math.sin(ha) * z.r * 1.1 };
      const marker = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 6),
        new THREE.MeshBasicMaterial({ color: 0xf2c53a }));
      marker.visible = false;
      parts.group.add(marker);
      npcs.push({
        ...parts, zone: z, x, z: zz, tx: x, tz: zz, home, marker, mode: 'work',
        name: NPC_NAMES[idx % NPC_NAMES.length],
        phase: rng() * 6.28, idle: rng() * 4, greeted: false
      });
      idx++;
    }
  }

  // v6: Kemal Ağa — der Rivale flaniert im Anzug über den Stadtplatz
  const kemal = (() => {
    const parts = spawnPerson(chars, 3, { basket: false, hat: false, shirt: 0x2a2a30, tex: 3 });
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

  let favors = {};   // v18: Index -> {item, qty}

  return {
    count: npcs.length,
    list: () => npcs,
    // v18: NPC-Leben
    nameOf(i) { return npcs[i] ? npcs[i].name || '?' : '?'; },
    setFavors(map) {
      favors = map || {};
      for (let i = 0; i < npcs.length; i++) {
        if (npcs[i].marker) npcs[i].marker.visible = favors[i] !== undefined;
      }
    },
    // v22: irgendein Dorfbewohner in Reichweite (für Bayram-Umarmungen)
    nearestAny(px, pz) {
      for (let i = 0; i < npcs.length; i++) {
        if (npcs[i].isKemal) continue;
        if (Math.hypot(px - npcs[i].x, pz - npcs[i].z) < CFG.interactDist + 1) return i;
      }
      return -1;
    },
    nearFavor(px, pz) {
      for (const i of Object.keys(favors)) {
        const p = npcs[i];
        if (p && Math.hypot(px - p.x, pz - p.z) < CFG.interactDist + 1.2) return +i;
      }
      return -1;
    },
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
    update(dt, elapsed, hour = 12) {
      if (gatherTimer > 0) gatherTimer -= dt;
      greetCooldown -= dt;
      for (const p of npcs) {
        p.idle -= dt;
        // v18: Tagesablauf — morgens daheim, tags Arbeit, abends Çayevi
        if (!p.isKemal && gatherTimer <= 0) {
          const mode = hour < 8.5 ? 'home' : hour < 17.5 ? 'work' : 'cayevi';
          if (mode !== p.mode) {
            p.mode = mode;
            const C = CFG.npcLife.cayevi;
            const anchor = mode === 'home' ? p.home
              : mode === 'cayevi' ? { x: C.x + (Math.random() - 0.5) * 6, z: C.z + (Math.random() - 0.5) * 5 }
              : { x: p.zone.cx, z: p.zone.cz };
            p.tx = anchor.x; p.tz = anchor.z;
            p.idle = 6 + Math.random() * 8;
          }
        }
        if (p.marker) {
          p.marker.position.y = 2.25 + Math.sin(elapsed * 3) * 0.09;
          p.marker.rotation.y = elapsed * 1.8;
        }
        const dx = p.tx - p.x, dz = p.tz - p.z;
        const d = Math.hypot(dx, dz);
        if (p.idle <= 0 && d < 0.4) {
          const a = Math.random() * Math.PI * 2;
          if (p.isKemal || p.mode === 'work' || p.mode === undefined) {
            const r = Math.random() * p.zone.r * 0.85;
            p.tx = p.zone.cx + Math.cos(a) * r;
            p.tz = p.zone.cz + Math.sin(a) * r;
          } else {
            // daheim / im Çayevi: nur kleine Schritte um den Anker
            const C = CFG.npcLife.cayevi;
            const ax = p.mode === 'home' ? p.home.x : C.x;
            const az = p.mode === 'home' ? p.home.z : C.z;
            p.tx = ax + Math.cos(a) * 2.2;
            p.tz = az + Math.sin(a) * 2.2;
          }
          p.idle = 3 + Math.random() * 9;
        }
        if (d > 0.4) {
          const sp = 1.1;
          p.x += dx / d * sp * dt;
          p.z += dz / d * sp * dt;
          p.group.rotation.y = Math.atan2(dx, dz);
          p.phase += dt * 7;
          p.group.position.set(p.x,
            terrain.heightAt(p.x, p.z) + (p.anim ? 0 : Math.abs(Math.sin(p.phase)) * 0.035), p.z);
          if (p.armL) {
            p.armL.rotation.x = Math.sin(p.phase) * 0.35;
            p.armR.rotation.x = -Math.sin(p.phase) * 0.35;
            p.legL.rotation.x = -Math.sin(p.phase) * 0.5;
            p.legR.rotation.x = Math.sin(p.phase) * 0.5;
          }
        } else {
          p.group.position.y = terrain.heightAt(p.x, p.z);
          if (p.armL) {
            p.armL.rotation.x *= 0.9;
            p.armR.rotation.x *= 0.9;
            p.legL.rotation.x *= 0.9;
            p.legR.rotation.x *= 0.9;
          }
        }
        if (p.anim) {
          const moving2 = d > 0.4;
          p.anim.play(moving2 ? 'Walk' : 'Idle', 0.22, 1.1);
          p.anim.update(dt);
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
          if (p.armR) p.armR.rotation.x = -2.6;   // winken (Prozedural-Fallback)
          ui.toast((p.name ? p.name + ': ' : '') + t('npcGreet' + (1 + Math.floor(Math.random() * 4))), false, 2600);
        }
        if (pd > 8) p.greeted = false;
      }
    }
  };
}
