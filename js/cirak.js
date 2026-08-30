// v19: Çırak — dein Lehrling. Läuft sichtbar über den Hof, füttert die
// Tiere, schleppt einen Korb und wird mit jeder Ausbildungsstufe nützlicher.
// Ab Stufe 3 steht er nachmittags am Basar-Stand und hilft verkaufen.
import { CFG } from './config.js';
import { state } from './state.js';
import { spawnPerson } from './workers.js';

export function createCirak(ctx, terrain, chars) {
  const { scene } = ctx;
  let person = null;
  // Stationen seines Tages: Gehege, Beete, Hütte — ab Stufe 3 der Stand
  const STOPS = () => {
    const list = [
      { x: CFG.farm.pen.x, z: CFG.farm.pen.z },
      { x: CFG.farm.plots.x0 + 6, z: CFG.farm.plots.z0 },
      { x: CFG.hut.x + 2, z: CFG.hut.z + 3 }
    ];
    if (state.cirak && state.cirak.level >= 3 && state.stall) {
      list.push({ x: CFG.stall.spot.x + 1.5, z: CFG.stall.spot.z + 1.5 });
    }
    return list;
  };
  let stop = 0, idle = 2;

  function build() {
    if (person || !chars || !chars.ready) return;
    person = spawnPerson(chars, 5, { hat: true, basket: true });
    person.group.scale.setScalar(0.88);   // jünger & kleiner
    person.group.position.set(CFG.farm.x, terrain.heightAt(CFG.farm.x, CFG.farm.z), CFG.farm.z);
    person.group.visible = false;
    scene.add(person.group);
  }

  return {
    sync() { if (person) person.group.visible = !!state.cirak; },
    near(px, pz) {
      if (!state.cirak || !person) return false;
      const p = person.group.position;
      return Math.hypot(px - p.x, pz - p.z) < CFG.interactDist + 1.5;
    },
    update(dt) {
      build();
      if (!person) return;
      person.group.visible = !!state.cirak;
      if (!state.cirak) return;
      const stops = STOPS();
      const target = stops[stop % stops.length];
      const p = person.group.position;
      const dx = target.x - p.x, dz = target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.6) {
        const sp = 1.5 * dt;
        p.x += (dx / d) * sp;
        p.z += (dz / d) * sp;
        p.y = terrain.heightAt(p.x, p.z);
        person.group.rotation.y = Math.atan2(dx, dz);
        if (person.anim) person.anim.play('Walk', 0.25, 1.1);
      } else {
        idle -= dt;
        if (person.anim) person.anim.play(idle > 4 ? 'Working' : 'Idle', 0.3, 1);
        if (idle <= 0) { idle = 9 + Math.random() * 8; stop++; }
      }
      if (person.anim) person.anim.update(dt);
    }
  };
}
