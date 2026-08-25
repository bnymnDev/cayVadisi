// v3-Weltobjekte: Çay-Fabrik (kaufbar), begehbarer Supermarkt, Jandarma
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state } from '../state.js';
import { makeSignTexture } from './structures.js';

export function createExtras(ctx, terrain, mats) {
  const { scene } = ctx;
  const colliders = [];

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

  return {
    colliders,
    syncFactory,
    setLabel,
    update(dt, elevN, elapsed) {
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
