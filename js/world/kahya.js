// v31: Der Kâhya als sichtbarer NPC — läuft tagsüber über den Hof (Beete,
// Alım Yeri, Haus), wenn der Kâhya-Modus aktiv ist; abends verschwindet er.
import { CFG } from '../config.js';
import { state } from '../state.js';
import { spawnPerson } from '../workers.js';

export function createKahyaNpc(ctx, terrain, chars) {
  const parts = spawnPerson(chars, 5, { hat: true, basket: false, tex: 2 });
  const g = parts.group;
  g.visible = false;
  ctx.scene.add(g);
  const P = CFG.farm.plots;
  const spots = [
    { x: P.x0 + 6, z: P.z0 + 4 }, { x: P.x0 + 14, z: P.z0 + 9 }, { x: P.x0 - 4, z: P.z0 + 8 },
    { x: CFG.farm.barn.x + 5, z: CFG.farm.barn.z + 4 },
    { x: CFG.hut.x + 4, z: CFG.hut.z + 4 }, { x: CFG.home.x + 5, z: CFG.home.z + 3 }
  ];
  let idx = 0, target = spots[0], x = target.x, z = target.z, workT = 0, anim = '';
  function play(n) {
    if (anim !== n && parts.anim && parts.anim.play) { parts.anim.play(n, 0.25, 1); anim = n; }
  }
  return {
    update(dt, hour, playing) {
      const on = !!(state.kahya && state.cirak) && hour >= 7 && hour < 18.5;
      g.visible = on;
      if (!on || !playing) return;
      if (workT > 0) {
        workT -= dt; play('Working');
      } else {
        const dx = target.x - x, dz = target.z - z, d = Math.hypot(dx, dz);
        if (d < 0.6) {
          workT = 3 + Math.random() * 3;
          idx = (idx + 1 + Math.floor(Math.random() * 2)) % spots.length;
          target = spots[idx];
        } else {
          x += dx / d * 2.0 * dt; z += dz / d * 2.0 * dt;
          g.rotation.y = Math.atan2(dx, dz);
          play('Walk');
        }
      }
      g.position.set(x, terrain.heightAt(x, z), z);
      if (parts.anim && parts.anim.update) parts.anim.update(dt);
    }
  };
}
