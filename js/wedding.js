// v15: Temels Dorfhochzeit — eine echte Szene auf der Festwiese:
// Lichterketten, Fahnen-Girlanden, Festtafeln, Brautpaar in der Mitte und
// ein Halay-Kreis aus geriggten Gästen, die im Kreis tanzen. Davul & Zurna
// kommen periodisch aus der WebAudio-Engine.
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

export function createWedding(ctx, terrain, chars, audio) {
  const { scene } = ctx;
  const W = CFG.wedding;
  const cx = W.spot.x, cz = W.spot.z;
  const gy = terrain.heightAt(cx, cz);

  const g = new THREE.Group();
  g.position.set(cx, gy, cz);
  g.visible = false;

  // ---- Deko: zwei Masten mit Lichterkette + Fahnen-Girlande ----
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 });
  const bulbs = [];
  for (const sx of [-7, 7]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 8), woodMat);
    pole.position.set(sx, 2.1, -4);
    g.add(pole);
  }
  const FLAG_COLORS = [0xd85555, 0xe3c24f, 0x5f9e6e, 0x5a8fd8, 0xc678d8];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const x = -7 + u * 14;
    const y = 4.0 - Math.sin(u * Math.PI) * 0.9;   // Durchhang
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5),
      new THREE.MeshStandardMaterial({
        color: 0xfff2c0, emissive: 0xffd870, emissiveIntensity: 0.9
      }));
    bulb.position.set(x, y, -4);
    bulbs.push(bulb);
    g.add(bulb);
    if (i < 16) {
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 3),
        new THREE.MeshStandardMaterial({ color: FLAG_COLORS[i % FLAG_COLORS.length], roughness: 0.85, side: THREE.DoubleSide }));
      flag.position.set(x + 0.42, y - 0.28, -4);
      flag.rotation.z = Math.PI;
      g.add(flag);
    }
  }
  // ---- Festtafeln mit weißen Decken ----
  for (const [tx, tz] of [[-6, 3], [6, 3]]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.8 }));
    top.position.set(tx, 0.78, tz);
    g.add(top);
    for (const s of [-1.3, 1.3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.9), woodMat);
      leg.position.set(tx + s, 0.38, tz);
      g.add(leg);
    }
    // Çay-Gläser & Teller angedeutet
    for (let i = 0; i < 4; i++) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.1, 6),
        new THREE.MeshStandardMaterial({ color: 0xc9762c, roughness: 0.3 }));
      cup.position.set(tx - 1.2 + i * 0.8, 0.88, tz);
      g.add(cup);
    }
  }
  // Geschenketisch
  const gift = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xd85555, roughness: 0.7 }));
  gift.position.set(0, 1.05, 4.5);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.54, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xe3c24f, roughness: 0.6 }));
  band.position.set(0, 1.05, 4.5);
  const giftTable = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.8, 10), woodMat);
  giftTable.position.set(0, 0.4, 4.5);
  g.add(gift, band, giftTable);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);

  // ---- Brautpaar & Halay-Gäste (geriggte Charaktere) ----
  let couple = [], guests = [];
  let built = false;
  function buildPeople() {
    if (built || !chars || !chars.ready) return;
    built = true;
    // Bräutigam (dunkler Anzug-Look) & Braut (weiß getintet + Schleier)
    const groom = chars.spawn({ tex: 3, tint: 0x555a63 });
    const bride = chars.spawn({ tex: 1, tint: 0xffffff });
    if (bride) {
      const veil = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
      bride.attach('Head', veil, { x: 0, y: 0.1, z: -0.03 });
    }
    for (const [p, sx] of [[groom, -0.5], [bride, 0.5]]) {
      if (!p) continue;
      p.group.position.set(cx + sx, gy, cz - 1);
      p.group.rotation.y = Math.PI;
      scene.add(p.group);
      p.group.visible = false;
      couple.push(p);
    }
    // Halay-Kreis
    for (let i = 0; i < W.guests; i++) {
      const p = chars.spawn({ tex: i % 6 });
      if (!p) continue;
      scene.add(p.group);
      p.group.visible = false;
      guests.push({ p, phase: (i / W.guests) * Math.PI * 2 });
    }
  }

  let musicTimer = 0;
  const R = 3.4;

  return {
    get active() {
      return state.wedding.stage === 1 && state.day === state.wedding.day;
    },
    near(px, pz) { return Math.hypot(px - cx, pz - cz) < 9; },
    update(dt, elapsed) {
      const on = this.active;
      if (on && !built) buildPeople();
      g.visible = on;
      for (const p of couple) p.group.visible = on;
      for (const gst of guests) gst.p.group.visible = on;
      if (!on) return;
      // Lichter funkeln
      for (let i = 0; i < bulbs.length; i++) {
        bulbs[i].material.emissiveIntensity = 0.7 + Math.sin(elapsed * 5 + i) * 0.35;
      }
      // Brautpaar wiegt sich
      for (let i = 0; i < couple.length; i++) {
        const p = couple[i];
        p.play('Idle');
        p.group.rotation.y = Math.PI + Math.sin(elapsed * 1.4 + i) * 0.15;
        p.update(dt);
      }
      // Halay: Kreis dreht sich, Schritte im Rhythmus
      for (const gst of guests) {
        gst.phase += dt * 0.55;
        const x = cx + Math.cos(gst.phase) * R;
        const z = cz + Math.sin(gst.phase) * R;
        gst.p.group.position.set(x, terrain.heightAt(x, z), z);
        gst.p.group.rotation.y = Math.atan2(-Math.sin(gst.phase), -Math.cos(gst.phase)) + Math.PI / 2;
        gst.p.play('Walk', 0.25, 1.35);
        gst.p.update(dt);
      }
      // Davul & Zurna in Wellen
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 6.5;
        if (audio.davulZurna) audio.davulZurna();
      }
    }
  };
}
