// Gemeinsame Bau-Helfer: Materialien, Gebäude, Zäune, Schilder
// (genutzt von props.js, farm.js, city.js)
import * as THREE from 'three';

export function makeSignTexture(text, bg = '#1e4d33') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#f4efe4';
  g.lineWidth = 6;
  g.strokeRect(10, 10, 492, 108);
  g.fillStyle = '#f4efe4';
  g.font = 'bold 52px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Textur-Materialien einmalig bauen (props.js reicht sie weiter)
export function makeBuildMaterials(ctx) {
  const { loadingManager, renderer } = ctx;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tl = new THREE.TextureLoader(loadingManager);
  function tex(url, srgb, rx = 1, ry = 1) {
    const t = tl.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  }
  const P = 'assets/textures/';
  const woodMat = new THREE.MeshStandardMaterial({
    map: tex(P + 'weathered_planks/weathered_planks_diff_1k.jpg', true, 2, 1.4),
    normalMap: tex(P + 'weathered_planks/weathered_planks_nor_gl_1k.jpg', false, 2, 1.4),
    aoMap: tex(P + 'weathered_planks/weathered_planks_arm_1k.jpg', false, 2, 1.4),
    roughnessMap: tex(P + 'weathered_planks/weathered_planks_arm_1k.jpg', false, 2, 1.4),
    roughness: 1
  });
  const woodBeamMat = new THREE.MeshStandardMaterial({
    map: tex(P + 'weathered_planks/weathered_planks_diff_1k.jpg', true, 0.5, 1.2),
    roughness: 0.9, color: 0xcfc4ae
  });
  const steelMat = new THREE.MeshStandardMaterial({
    map: tex(P + 'corrugated_steel/CorrugatedSteel005_1K-JPG_Color.jpg', true, 2.5, 1.6),
    normalMap: tex(P + 'corrugated_steel/CorrugatedSteel005_1K-JPG_NormalGL.jpg', false, 2.5, 1.6),
    roughnessMap: tex(P + 'corrugated_steel/CorrugatedSteel005_1K-JPG_Roughness.jpg', false, 2.5, 1.6),
    metalnessMap: tex(P + 'corrugated_steel/CorrugatedSteel005_1K-JPG_Metalness.jpg', false, 2.5, 1.6),
    metalness: 1, roughness: 1
  });
  return { woodMat, woodBeamMat, steelMat };
}

// Einfaches Satteldach-Gebäude. opts: {wallMat, tint, signText, signBg, twoWindows}
export function building(ctx, terrain, colliders, x, z, ry, w, d, hWall, opts = {}) {
  const { scene } = ctx;
  const mats = opts.mats;
  const g = new THREE.Group();
  const y = terrain.heightAt(x, z);
  g.position.set(x, y, z);
  g.rotation.y = ry;

  let wallMat = opts.wallMat || mats.woodMat;
  if (opts.tint) {
    wallMat = wallMat.clone();
    wallMat.color = new THREE.Color(opts.tint);
  }
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, hWall, d), wallMat);
  walls.position.y = hWall / 2;
  g.add(walls);

  // Satteldach aus zwei Platten
  const roofL = w * 0.62;
  for (const sgn of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(roofL, 0.06, d + 0.5), mats.steelMat);
    r.position.set(sgn * roofL * 0.42, hWall + roofL * 0.30, 0);
    r.rotation.z = -sgn * 0.62;
    g.add(r);
  }
  // Giebel-Dreiecke
  const gable = new THREE.Shape();
  gable.moveTo(-w / 2, 0); gable.lineTo(w / 2, 0); gable.lineTo(0, roofL * 0.55); gable.closePath();
  const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.1, bevelEnabled: false });
  for (const sgn of [-1, 1]) {
    const gm = new THREE.Mesh(gGeo, wallMat);
    gm.position.set(0, hWall, sgn * (d / 2 - (sgn > 0 ? 0.1 : 0)));
    g.add(gm);
  }
  // Tür
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.9 })
  );
  door.position.set(0, 0.96, d / 2 + 0.012);
  g.add(door);
  // Fenster (leuchtet abends)
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x27333d, roughness: 0.2, metalness: 0.1,
    emissive: 0xffb066, emissiveIntensity: 0
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), winMat);
  win.position.set(w * 0.28, 1.45, d / 2 + 0.012);
  g.add(win);
  if (opts.twoWindows) {
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), winMat);
    win2.position.set(-w * 0.28, 1.45, d / 2 + 0.012);
    g.add(win2);
  }

  if (opts.signText) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.62),
      new THREE.MeshStandardMaterial({ map: makeSignTexture(opts.signText, opts.signBg), roughness: 0.6 })
    );
    sign.position.set(0, hWall + 0.32, d / 2 + 0.05);
    g.add(sign);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  colliders.push({ x, z, r: Math.max(w, d) * 0.62 });
  return { group: g, winMat };
}

// Zaun-Ring (Kreis) aus Pfosten + Querlatten, mit Lücke als Tor
export function fenceRing(ctx, terrain, cx, cz, r, mats, gapAngle = 0.5, gapAt = 0) {
  const { scene } = ctx;
  const g = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.1, 6);
  const n = Math.round(r * 4.2);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let da = Math.abs(((a - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (da < gapAngle * 0.5) continue;   // Tor-Lücke
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const y = terrain.heightAt(x, z);
    const p = new THREE.Mesh(postGeo, mats.woodBeamMat);
    p.position.set(x, y + 0.52, z);
    p.castShadow = true;
    g.add(p);
    pts.push({ x, z, y, a });
  }
  // Querlatten zwischen Nachbar-Pfosten
  const railMat = mats.woodBeamMat;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len > 3) continue;   // über die Tor-Lücke keine Latte
    for (const h of [0.42, 0.82]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.055, 0.03), railMat);
      rail.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + h, (a.z + b.z) / 2);
      rail.rotation.y = -Math.atan2(dz, dx);
      rail.rotation.z = Math.atan2(b.y - a.y, len) * 0.8;
      g.add(rail);
    }
  }
  scene.add(g);
  return g;
}
