// v3-Weltobjekte: Çay-Fabrik (kaufbar), begehbarer Supermarkt, Jandarma
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

// terrain wird für Festival-Wimpel & Hausausbau gebraucht
export function createExtras(ctx, terrain, mats) {
  const { scene } = ctx;
  const colliders = [];

  // ---------- Hausausbau (Stufen erscheinen nach Kauf) ----------
  const homeUp = new THREE.Group();
  {
    const H = CFG.home;
    const y = terrain.heightAt(H.x, H.z);
    homeUp.position.set(H.x, y, H.z);
    homeUp.rotation.y = H.ry;
    // Stufe 1: Anbau seitlich
    const ext = new THREE.Group();
    const extBox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 2.4), mats.woodMat);
    extBox.position.set(2.9, 1.0, 0);
    ext.add(extBox);
    const extRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 2.8), mats.steelMat);
    extRoof.position.set(2.9, 2.1, 0);
    extRoof.rotation.z = -0.12;
    ext.add(extRoof);
    // Stufe 2: Obergeschoss
    const floor2 = new THREE.Group();
    const upBox = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 2.8), mats.woodMat);
    upBox.position.set(0, 3.6, 0);
    floor2.add(upBox);
    for (const sgn of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 3.3), mats.steelMat);
      r.position.set(sgn * 0.95, 5.05, 0);
      r.rotation.z = -sgn * 0.55;
      floor2.add(r);
    }
    const winMat2 = new THREE.MeshStandardMaterial({ color: 0x27333d, roughness: 0.2, emissive: 0xffb066, emissiveIntensity: 0.4 });
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.6), winMat2);
    win2.position.set(0, 3.7, 1.42);
    floor2.add(win2);
    // Stufe 3: Sat-Schüssel
    const dishG = new THREE.Group();
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
      new THREE.MeshStandardMaterial({ color: 0xdadfe2, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })
    );
    dish.rotation.x = Math.PI * 0.85;
    dish.position.set(-1.2, 5.3, 0.6);
    dishG.add(dish);
    homeUp.add(ext, floor2, dishG);
    homeUp.userData.levels = [ext, floor2, dishG];
    homeUp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(homeUp);
  }
  function syncHome() {
    homeUp.userData.levels.forEach((lvlGroup, i) => {
      lvlGroup.visible = state.homeLevel > i;
    });
  }
  syncHome();

  // ---------- Çay-Fabrik (sichtbar erst nach Kauf) ----------
  const factoryGroup = new THREE.Group();
  const smokePuffs = [];
  {
    const F = CFG.factory;
    const y = terrain.heightAt(F.x, F.z);
    factoryGroup.position.set(F.x, y, F.z);
    factoryGroup.rotation.y = F.ry;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(11, 4.2, 7), mats.steelMat);
    hall.position.y = 2.1;
    factoryGroup.add(hall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.18, 7.6), mats.steelMat);
    roof.position.y = 4.35;
    factoryGroup.add(roof);
    // Rolltor
    const gate = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x54606a, roughness: 0.5, metalness: 0.4 })
    );
    gate.position.set(0, 1.4, 3.53);
    factoryGroup.add(gate);
    // Schornstein
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 4.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 })
    );
    chimney.position.set(-4, 6, -2);
    factoryGroup.add(chimney);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 0.9),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('ÇAY FABRİKASI', '#274a2c'), roughness: 0.6 })
    );
    sign.position.set(0, 4.9, 3.6);
    factoryGroup.add(sign);
    factoryGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(factoryGroup);

    // Rauch-Sprites
    const smokeMat = new THREE.SpriteMaterial({
      color: 0xcfd4d8, transparent: true, opacity: 0.35, depthWrite: false
    });
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(smokeMat.clone());
      s.scale.setScalar(1.2);
      factoryGroup.add(s);
      smokePuffs.push({ s, t: i / 7 });
    }
  }
  // "Satılık"-Schild am Fabrikgelände, solange nicht gekauft
  const saleSign = (() => {
    const F = CFG.factory;
    const y = terrain.heightAt(F.x + 5, F.z + 5);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 1.9, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a5a42, roughness: 1 })
    );
    post.position.set(F.x + 5, y + 0.95, F.z + 5);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('SATILIK FABRİKA', '#6e3a1d'), roughness: 0.6, side: THREE.DoubleSide })
    );
    sign.position.set(F.x + 5, y + 1.7, F.z + 5);
    sign.rotation.y = -0.8;
    const grp = new THREE.Group();
    grp.add(post, sign);
    scene.add(grp);
    return grp;
  })();

  function syncFactory() {
    factoryGroup.visible = !!state.factory;
    saleSign.visible = !state.factory;
    const has = colliders.some(c => c._fab);
    if (state.factory && !has) {
      colliders.push({ x: CFG.factory.x, z: CFG.factory.z, r: 6.5, _fab: true });
    }
  }
  syncFactory();

  // ---------- Begehbarer Supermarkt ----------
  let labelTexMesh = null;
  {
    const S = CFG.supermarket;
    const y = terrain.heightAt(S.x, S.z);
    const g = new THREE.Group();
    g.position.set(S.x, y, S.z);
    g.rotation.y = S.ry;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.14, 7),
      new THREE.MeshStandardMaterial({ color: 0xb9b4a6, roughness: 0.6 })
    );
    floor.position.y = 0.07;
    g.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdad4c4, roughness: 0.85 });
    // Rückwand + Seitenwände (vorne offen)
    const back = new THREE.Mesh(new THREE.BoxGeometry(9, 3.1, 0.18), wallMat);
    back.position.set(0, 1.55, -3.4);
    g.add(back);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.1, 7), wallMat);
      side.position.set(s * 4.4, 1.55, 0);
      g.add(side);
    }
    // Front: zwei kurze Wandstücke mit Eingang in der Mitte
    for (const s of [-1, 1]) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.1, 0.18), wallMat);
      fr.position.set(s * 3.0, 1.55, 3.4);
      g.add(fr);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.16, 7.6), mats.steelMat);
    roof.position.y = 3.25;
    g.add(roof);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 0.8),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('ŞOK MARKET', '#8a2e1d'), roughness: 0.6 })
    );
    sign.position.set(0, 3.75, 3.7);
    g.add(sign);

    // Innenregale mit bunter Ware
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.7 });
    const goodsCols = [0xd0392b, 0xe3c24f, 0x7ba24a, 0x4a6b8a, 0xc9762c, 0x9c6b35];
    let gi = 0;
    for (const zz of [-1.6, 0.6]) {
      for (const xx of [-2.4, 0, 2.4]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 0.5), shelfMat);
        shelf.position.set(xx, 0.75, zz);
        g.add(shelf);
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const item = new THREE.Mesh(
              new THREE.BoxGeometry(0.28, 0.3, 0.3),
              new THREE.MeshStandardMaterial({ color: goodsCols[(gi++) % goodsCols.length], roughness: 0.65 })
            );
            item.position.set(xx - 0.6 + c * 0.6, 0.35 + r * 0.5, zz + 0.28);
            g.add(item);
          }
        }
      }
    }
    // Eigenes-Label-Regal an der Rückwand (Textur wird nach Fabrik-Kauf gesetzt)
    const labelShelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 0.4), shelfMat);
    labelShelf.position.set(0, 0.9, -3.05);
    g.add(labelShelf);
    labelTexMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.6),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('—', '#1e4d33'), roughness: 0.6 })
    );
    labelTexMesh.position.set(0, 2.2, -3.05);
    g.add(labelTexMesh);

    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);

    // Kollisionen: Wände als Kreis-Ketten (Eingang bleibt frei)
    const addWallColl = (lx, lz) => {
      const wx = S.x + Math.cos(-S.ry) * lx - Math.sin(-S.ry) * lz;
      const wz = S.z + Math.sin(-S.ry) * lx + Math.cos(-S.ry) * lz;
      colliders.push({ x: wx, z: wz, r: 0.75 });
    };
    for (let i = -3; i <= 3; i++) addWallColl(i * 1.3, -3.4);
    for (let i = -2; i <= 2; i++) { addWallColl(-4.4, i * 1.5); addWallColl(4.4, i * 1.5); }
    for (const s of [-1, 1]) { addWallColl(s * 3.0, 3.4); addWallColl(s * 4.1, 3.4); }
    for (const zz of [-1.6, 0.6]) for (const xx of [-2.4, 0, 2.4]) addWallColl(xx, zz);
  }

  function setLabel(name) {
    if (!labelTexMesh) return;
    labelTexMesh.material.map = makeSignTexture(name || 'ÇAY VADİSİ', '#1e4d33');
    labelTexMesh.material.needsUpdate = true;
  }

  // ---------- Jandarma-Fahrzeug ----------
  const blueLights = [];
  {
    const jx = CFG.city.x - 4, jz = CFG.city.z + 6;
    const y = terrain.heightAt(jx, jz);
    const g = new THREE.Group();
    g.position.set(jx, y, jz);
    g.rotation.y = 1.9;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.55, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.4, metalness: 0.3 })
    );
    body.position.y = 0.75;
    g.add(body);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.18, 3.62),
      new THREE.MeshStandardMaterial({ color: 0x1d3a6e, roughness: 0.4 })
    );
    stripe.position.y = 0.8;
    g.add(stripe);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.5, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x233038, roughness: 0.15, metalness: 0.3 })
    );
    cab.position.set(0, 1.25, 0.3);
    g.add(cab);
    for (const [lx, lz] of [[-0.78, -1.15], [0.78, -1.15], [-0.78, 1.15], [0.78, 1.15]]) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 })
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(lx, 0.36, lz);
      g.add(tire);
    }
    // Lichtbalken
    for (const s of [-1, 1]) {
      const lightMat = new THREE.MeshStandardMaterial({
        color: s < 0 ? 0x2a48ff : 0xff3a2a,
        emissive: s < 0 ? 0x2a48ff : 0xff3a2a,
        emissiveIntensity: 0
      });
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.3), lightMat);
      l.position.set(s * 0.25, 1.58, 0.3);
      g.add(l);
      blueLights.push(lightMat);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(g);
    colliders.push({ x: jx, z: jz, r: 1.6 });
  }

  // ---------- v6: Festival-Wimpelketten am Stadtplatz ----------
  const bunting = new THREE.Group();
  {
    const cols = [0xd0392b, 0xe3c24f, 0x5d9138, 0x3f6d9a, 0xe8e8ea];
    const spans = [
      [CFG.city.x - 8, CFG.city.z + 8, CFG.city.x + 8, CFG.city.z + 2],
      [CFG.city.x + 8, CFG.city.z + 2, CFG.city.x - 2, CFG.city.z - 10]
    ];
    for (const [x1, z1, x2, z2] of spans) {
      const y1 = terrain.heightAt(x1, z1) + 3.3;
      const y2 = terrain.heightAt(x2, z2) + 3.3;
      const n = 10;
      for (let i = 1; i < n; i++) {
        const f = i / n;
        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.34, 3),
          new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.85, side: THREE.DoubleSide })
        );
        flag.rotation.x = Math.PI;   // Spitze nach unten
        flag.position.set(
          x1 + (x2 - x1) * f,
          y1 + (y2 - y1) * f - Math.sin(f * Math.PI) * 0.45 - 0.2,
          z1 + (z2 - z1) * f
        );
        bunting.add(flag);
      }
    }
    bunting.visible = false;
    scene.add(bunting);
  }

  // ---------- v7: Sanayi-Werkstatt ----------
  {
    const Wk = CFG.workshop;
    const y = terrain.heightAt(Wk.x, Wk.z);
    const g = new THREE.Group();
    g.position.set(Wk.x, y, Wk.z);
    g.rotation.y = Wk.ry;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 5.5), mats.steelMat);
    hall.position.y = 1.7;
    g.add(hall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.16, 6.1), mats.steelMat);
    roof.position.y = 3.55;
    g.add(roof);
    const gate = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x7a4a1d, roughness: 0.6, metalness: 0.3 })
    );
    gate.position.set(0, 1.3, 2.78);
    g.add(gate);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.8),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('SANAYİ — TAMİR & TUNING', '#31404f'), roughness: 0.6 })
    );
    sign.position.set(0, 4.0, 2.85);
    g.add(sign);
    // Reifenstapel davor
    for (let i = 0; i < 3; i++) {
      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.16, 8, 14),
        new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.95 })
      );
      tire.rotation.x = Math.PI / 2;
      tire.position.set(2.9, 0.18 + i * 0.34, 3.4);
      g.add(tire);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    colliders.push({ x: Wk.x, z: Wk.z, r: 4.2 });
  }

  // ---------- v7: Schmugglerschiff (erscheint nur nachts vor der Küste) ----------
  const kacakShip = new THREE.Group();
  let lanternMat = null;
  {
    const K = CFG.night.kacak.ship;
    kacakShip.position.set(K.x, 0.1, K.z);
    kacakShip.rotation.y = 0.8;
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1d232a, roughness: 0.85 });
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 7, 4, 10), hullMat);
    hull.rotation.x = Math.PI / 2;
    hull.scale.y = 0.45;
    hull.position.y = 0.5;
    kacakShip.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 7.2),
      new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.8 }));
    deck.position.y = 1.05;
    kacakShip.add(deck);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x272d34, roughness: 0.7 }));
    cabin.position.set(0, 1.75, -1.6);
    kacakShip.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.6 }));
    mast.position.set(0, 2.8, 0.8);
    kacakShip.add(mast);
    // grüne Signal-Laterne — das Erkennungszeichen der Kaçakçılar
    lanternMat = new THREE.MeshStandardMaterial({
      color: 0x2a7d3a, emissive: 0x37e05a, emissiveIntensity: 0, roughness: 0.4
    });
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lanternMat);
    lantern.position.set(0, 4.4, 0.8);
    kacakShip.add(lantern);
    kacakShip.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    kacakShip.visible = false;
    scene.add(kacakShip);
  }

  return {
    colliders,
    syncFactory,
    syncHome,
    setLabel,
    setFestival(v) { bunting.visible = !!v; },
    setNight(v) { kacakShip.visible = !!v; },
    update(dt, elevN, elapsed) {
      if (kacakShip.visible) {
        kacakShip.position.y = 0.1 + Math.sin(elapsed * 0.8) * 0.08;
        kacakShip.rotation.z = Math.sin(elapsed * 0.6) * 0.02;
        lanternMat.emissiveIntensity = 2.2 + Math.sin(elapsed * 5) * 0.8;
      }
      // Fabrik-Rauch
      if (factoryGroup.visible) {
        for (const p of smokePuffs) {
          p.t += dt * 0.12;
          if (p.t > 1) p.t -= 1;
          const h = p.t * 6;
          p.s.position.set(-4 + h * 0.5, 8.3 + h, -2 + Math.sin(p.t * 9) * 0.4);
          p.s.scale.setScalar(0.8 + p.t * 2.6);
          p.s.material.opacity = 0.34 * (1 - p.t);
        }
      }
      // Jandarma-Blaulicht blitzt abends
      const dark = Math.max(0, 1 - elevN * 2.5);
      const flash = Math.sin(elapsed * 9) > 0 ? 1 : 0;
      blueLights[0].emissiveIntensity = dark * flash * 3;
      blueLights[1].emissiveIntensity = dark * (1 - flash) * 3;
    }
  };
}
