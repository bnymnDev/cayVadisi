// v23: Das Kind wächst mit — läuft sichtbar im Hof vorm Haus herum, wird
// über die Tage größer und hilft ab einer gewissen Größe beim Eiersammeln.
import { CFG } from '../config.js';
import { state } from '../state.js';
import { spawnPerson } from '../workers.js';

export function createChild(ctx, terrain, chars) {
  const { scene } = ctx;
  let person = null;
  let tx = CFG.home.x + 4, tz = CFG.home.z + 3, idle = 2;

  function scaleNow() {
    if (!state.childDay) return 0.5;
    const grown = Math.min(1, (state.day - state.childDay) / CFG.childGrow.growDays);
    return 0.5 + grown * 0.3;   // 0.5 -> 0.8
  }

  function build() {
    if (person || !chars || !chars.ready) return;
    person = spawnPerson(chars, 4, { hat: false });
    person.group.position.set(CFG.home.x + 4, terrain.heightAt(CFG.home.x + 4, CFG.home.z + 3), CFG.home.z + 3);
    person.group.visible = false;
    scene.add(person.group);
  }

  return {
    grownEnough() { return state.child && scaleNow() >= CFG.childGrow.helpAt; },
    update(dt) {
      build();
      if (!person) return;
      person.group.visible = !!state.child;
      if (!state.child) return;
      if (!state.childDay) state.childDay = state.day;   // ab jetzt wird gewachsen
      person.group.scale.setScalar(scaleNow());
      // fröhliches Herumtollen im Hof
      const p = person.group.position;
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) {
        idle -= dt;
        if (person.anim) person.anim.play('Idle');
        if (idle <= 0) {
          idle = 2 + Math.random() * 4;
          const ang = Math.random() * Math.PI * 2;
          tx = CFG.home.x + 4 + Math.cos(ang) * 4;
          tz = CFG.home.z + 3 + Math.sin(ang) * 3;
        }
      } else {
        const sp = 2.1 * dt;   // Kinder rennen
        p.x += (dx / d) * sp;
        p.z += (dz / d) * sp;
        p.y = terrain.heightAt(p.x, p.z);
        person.group.rotation.y = Math.atan2(dx, dz);
        if (person.anim) person.anim.play('Run', 0.2, 1.2);
      }
      if (person.anim) person.anim.update(dt);
    }
  };
}
