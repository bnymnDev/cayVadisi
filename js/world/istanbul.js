// v8: İstanbul-Ausflug — begehbarer Kai mit Kapalıçarşı, Skyline hinter dem
// Bosporus (echte Spiegelung via Reflector), Brücke, Fähren, Kız Kulesi.
// Das Viertel liegt in der Südwest-Seeecke und ist nur während des Ausflugs
// sichtbar; die Höhen-Zone wird NACH dem Terrain-Bau registriert.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { CFG } from '../config.js';
import { makeSignTexture } from './structures.js';

function windowTexture(w, h, cols, rows, base, lit) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      g.fillStyle = Math.random() < 0.35 ? lit : 'rgba(20,26,34,0.9)';
      g.fillRect(6 + x * (52 / cols), 6 + y * (116 / rows), 52 / cols - 4, 116 / rows - 5);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createIstanbul(ctx, terrain) {
  const { scene } = ctx;
  const I = CFG.istanbul;
  const Z = I.zone;
  const g = new THREE.Group();
  g.visible = false;
  const colliders = [];

  const stone = new THREE.MeshStandardMaterial({ color: 0xb9b0a0, roughness: 0.85 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x8d8578, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.7 });
  const domeMat = new THREE.MeshStandardMaterial({ color: 0x6f8a94, roughness: 0.45, metalness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.75 });

  // ---------- Kai-Plattform ----------
  {
    const cx = (Z.x0 + Z.x1) / 2, cz = (Z.z0 + Z.z1) / 2;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(Z.x1 - Z.x0, 0.6, Z.z1 - Z.z0), stone);
    floor.position.set(cx, Z.h - 0.3 + 0.3, cz);   // Oberkante = Z.h
    floor.position.y = Z.h - 0.3;
    floor.receiveShadow = true;
    g.add(floor);
    // Kaimauer-Kante
    for (const [w, d, x, z] of [
      [Z.x1 - Z.x0, 0.5, cx, Z.z0 - 0.2], [Z.x1 - Z.x0, 0.5, cx, Z.z1 + 0.2],
      [0.5, Z.z1 - Z.z0, Z.x0 - 0.2, cz], [0.5, Z.z1 - Z.z0, Z.x1 + 0.2, cz]
    ]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), stoneDark);
      edge.position.set(x, Z.h - 0.1, z);
      g.add(edge);
    }
    // Poller entlang der Südkante
    for (let x = Z.x0 + 6; x < Z.x1; x += 10) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 8), stoneDark);
      b.position.set(x, Z.h + 0.25, Z.z0 + 1.2);
      g.add(b);
    }
  }

  // ---------- Bosporus mit ECHTER Spiegelung ----------
  const reflector = new Reflector(new THREE.PlaneGeometry(420, 260), {
    textureWidth: 768, textureHeight: 768,
    color: 0x89a7b8, clipBias: 0.003
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(-150, 0.14, -300);
  g.add(reflector);

  // ---------- Skyline hinterm Wasser (Silhouette + Fenster) ----------
  const skyline = new THREE.Group();
  {
    const winTex = windowTexture(64, 128, 5, 10, '#5c6673', '#ffd88a');
    const winTex2 = windowTexture(64, 128, 4, 8, '#6d6357', '#ffca6a');
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 44; i++) {
      const bx = -330 + i * 8.6 + rnd() * 3;
      const bz = -390 - rnd() * 60;
      const bh = 14 + rnd() * 34;
      const bw = 7 + rnd() * 6;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, bw),
        new THREE.MeshStandardMaterial({
          map: rnd() < 0.5 ? winTex : winTex2, roughness: 0.8,
          emissiveMap: rnd() < 0.5 ? winTex : winTex2, emissive: 0xffffff, emissiveIntensity: 0.25
        })
      );
      b.position.set(bx, bh / 2, bz);
      skyline.add(b);
    }
    g.add(skyline);
  }

  // ---------- Moscheen ----------
  function mosque(x, z, s, minarets) {
    const m = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(16 * s, 8 * s, 16 * s), white);
    base.position.y = 4 * s;
    m.add(base);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7.4 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.y = 8 * s;
    m.add(dome);
    for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
      const halfDome = new THREE.Mesh(new THREE.SphereGeometry(3 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      halfDome.position.set(dx * s, 7 * s, dz * s);
      m.add(halfDome);
    }
    const n = minarets;
    const spots = [[-9.5, -9.5], [9.5, -9.5], [-9.5, 9.5], [9.5, 9.5]].slice(0, n);
    for (const [dx, dz] of spots) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * s, 0.7 * s, 22 * s, 8), white);
      shaft.position.set(dx * s, 11 * s, dz * s);
      m.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.75 * s, 3.2 * s, 8), stoneDark);
      tip.position.set(dx * s, 23.4 * s, dz * s);
      m.add(tip);
    }
    m.position.set(x, 0, z);
    return m;
  }
  g.add(mosque(-210, -330, 1.5, 4));    // die Große am Wasser
  g.add(mosque(-120, -345, 1.1, 2));
  g.add(mosque(-285, -350, 0.9, 2));

  // ---------- Galata-Turm ----------
  {
    const t = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 30, 12), stone);
    shaft.position.y = 15;
    t.add(shaft);
    const balc = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 3, 12), white);
    balc.position.y = 31;
    t.add(balc);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 7, 12), red);
    roof.position.y = 37;
    t.add(roof);
    t.position.set(-70, 0, -350);
    g.add(t);
  }

  // ---------- Bosporus-Brücke ----------
  {
    const br = new THREE.Group();
    const deckY = 14;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(260, 1.2, 6), stoneDark);
    deck.position.set(0, deckY, 0);
    br.add(deck);
    for (const tx of [-70, 70]) {
      for (const tz of [-2.4, 2.4]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 34, 1.6), red);
        tower.position.set(tx, 17, tz);
        br.add(tower);
      }
      const cross = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.4, 1.4), red);
      cross.position.set(tx, 32, 0);
      br.add(cross);
    }
    // Hauptkabel als abgehängte Segmente + Lichterkette
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff1c4, emissive: 0xffdf9a, emissiveIntensity: 1.6
    });
    for (let i = 0; i <= 26; i++) {
      const u = i / 26;
      const x = -130 + u * 260;
      const dip = Math.abs(x) < 70
        ? 33 - 18 * (1 - Math.pow(x / 70, 2))
        : 33 - 18 * (1 - Math.pow((Math.abs(x) - 70) / 60 - 0, 2)) * 0;
      const y = Math.abs(x) < 70 ? 15 + 18 * Math.pow(x / 70, 2) : deckY + 1.5 + (Math.abs(x) - 70) * 0.28;
      for (const s of [-2.4, 2.4]) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), lampMat);
        seg.position.set(x, Math.min(y, 33), s);
        br.add(seg);
      }
    }
    br.position.set(-40, 0, -262);
    br.rotation.y = 0.12;
    g.add(br);
  }

  // ---------- Kız Kulesi ----------
  {
    const k = new THREE.Group();
    const islet = new THREE.Mesh(new THREE.CylinderGeometry(6, 7.5, 2, 10), stoneDark);
    islet.position.y = 0.6;
    k.add(islet);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 9, 10), white);
    tower.position.y = 6;
    k.add(tower);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.6, 10), white);
    top.position.y = 11;
    k.add(top);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.4, 10), stoneDark);
    spire.position.y = 13.5;
    k.add(spire);
    k.position.set(-236, 0, -252);
    g.add(k);
  }

  // ---------- Fähren (bewegt) ----------
  const ferries = [];
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 12, 4, 8), white);
    hull.rotation.z = Math.PI / 2;
    hull.scale.y = 0.5;
    hull.position.y = 1;
    f.add(hull);
    const deck2 = new THREE.Mesh(new THREE.BoxGeometry(11, 1.6, 3.6), white);
    deck2.position.y = 2.4;
    f.add(deck2);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9a13a, roughness: 0.6 }));
    funnel.position.set(-1.5, 4.2, 0);
    f.add(funnel);
    f.position.set(-240 + i * 160, 0, -238 - i * 18);
    g.add(f);
    ferries.push({ m: f, dir: i ? -1 : 1, sp: 4.5 + i });
  }

  // ---------- Kapalıçarşı auf dem Kai ----------
  {
    const B = I.bazaar;
    const hall = new THREE.Group();
    // Arkadenwand mit Bögen (vereinfachte Silhouette)
    const wall = new THREE.Mesh(new THREE.BoxGeometry(26, 5.5, 1), red);
    wall.position.set(0, 2.75, -5);
    hall.add(wall);
    for (let i = 0; i < 5; i++) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), stoneDark);
      dome.position.set(-10 + i * 5, 5.5, -5);
      hall.add(dome);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 1.1),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('KAPALIÇARŞI', '#6e3a1d'), roughness: 0.6 })
    );
    sign.position.set(0, 4.4, -4.4);
    hall.add(sign);
    // Stände mit Markisen & Waren
    const awnCols = [0xc23b2e, 0xe3c24f, 0x3f6d9a, 0x5d9138];
    for (let i = 0; i < 4; i++) {
      const sx = -9.5 + i * 6.4;
      const table = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 2), stoneDark);
      table.position.set(sx, 0.45, -1.5);
      hall.add(table);
      const awn = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.12, 2.8),
        new THREE.MeshStandardMaterial({ color: awnCols[i], roughness: 0.85 })
      );
      awn.position.set(sx, 2.6, -1.3);
      awn.rotation.x = 0.22;
      hall.add(awn);
      for (let k = 0; k < 6; k++) {
        const item = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 7, 5),
          new THREE.MeshStandardMaterial({ color: awnCols[(i + k) % 4], roughness: 0.7 })
        );
        item.position.set(sx - 1.5 + (k % 3) * 1.5, 1.15, -1.9 + Math.floor(k / 3) * 0.9);
        hall.add(item);
      }
    }
    hall.position.set(B.x, Z.h, B.z);
    hall.rotation.y = 0.2;
    g.add(hall);
    colliders.push({ x: B.x, z: B.z - 4, r: 3 });
  }

  // ---------- Vapur-Anleger (Rückweg) + Fahnen + Laternen ----------
  {
    const G2 = I.gate;
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(4, 3.2, 3), white);
    kiosk.position.set(G2.x, Z.h + 1.6, G2.z);
    g.add(kiosk);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 3.8), red);
    roof.position.set(G2.x, Z.h + 3.4, G2.z);
    g.add(roof);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.8),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('VAPUR — DÖNÜŞ', '#1e4d33'), roughness: 0.6, side: THREE.DoubleSide })
    );
    sign.position.set(G2.x, Z.h + 4.1, G2.z);
    g.add(sign);
    colliders.push({ x: G2.x, z: G2.z, r: 2.2 });

    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff1c4, emissive: 0xffdf9a, emissiveIntensity: 1.2
    });
    for (let x = Z.x0 + 10; x < Z.x1; x += 16) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6), stoneDark);
      post.position.set(x, Z.h + 1.8, Z.z0 + 3);
      g.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), lampMat);
      lamp.position.set(x, Z.h + 3.6, Z.z0 + 3);
      g.add(lamp);
      // Türk bayrağı an jedem zweiten Mast
      if ((x / 16) % 2 < 1) {
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xd0392b, roughness: 0.8, side: THREE.DoubleSide }));
        flag.position.set(x + 0.75, Z.h + 3.1, Z.z0 + 3);
        g.add(flag);
      }
    }
  }

  // ---------- Passanten auf dem Kai ----------
  const walkers = [];
  {
    const cols = [0x6a7ba0, 0x9a5f4a, 0x5f8a5a, 0x8a5f7d, 0xb8963f, 0x4a7d8a];
    for (let i = 0; i < 6; i++) {
      const w = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.75, 4, 8),
        new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.9 }));
      body.position.y = 0.85;
      w.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xd9b38c, roughness: 0.8 }));
      head.position.y = 1.6;
      w.add(head);
      g.add(w);
      walkers.push({
        m: w, u: Math.random(),
        x0: Z.x0 + 8, x1: Z.x1 - 8,
        z: Z.z0 + 8 + Math.random() * 30,
        sp: (0.02 + Math.random() * 0.02) * (Math.random() < 0.5 ? 1 : -1)
      });
    }
  }

  g.traverse((o) => { if (o.isMesh && o !== reflector) o.castShadow = true; });
  scene.add(g);

  // Höhen-Zone erst jetzt registrieren (Terrain-Mesh & Minimap sind gebaut)
  terrain.addHeightZone(Z);

  return {
    colliders,
    inZone(x, z) { return x >= Z.x0 && x <= Z.x1 && z >= Z.z0 && z <= Z.z1; },
    setVisible(v) { g.visible = !!v; },
    get visible() { return g.visible; },
    update(dt, elapsed) {
      if (!g.visible) return;
      for (const f of ferries) {
        f.m.position.x += f.dir * f.sp * dt;
        if (f.m.position.x > -60) f.dir = -1;
        if (f.m.position.x < -280) f.dir = 1;
        f.m.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        f.m.position.y = Math.sin(elapsed * 1.1 + f.m.position.x) * 0.15;
      }
      for (const w of walkers) {
        w.u += w.sp * dt;
        if (w.u > 1) { w.u = 1; w.sp *= -1; }
        if (w.u < 0) { w.u = 0; w.sp *= -1; }
        w.m.position.set(w.x0 + (w.x1 - w.x0) * w.u, Z.h, w.z);
        w.m.rotation.y = w.sp > 0 ? Math.PI / 2 : -Math.PI / 2;
        w.m.position.y = Z.h + Math.abs(Math.sin(elapsed * 6 + w.z)) * 0.04;
      }
    }
  };
}
