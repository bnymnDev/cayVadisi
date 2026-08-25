// Teefeld: Büsche in Terrassenreihen, Triebe wachsen, werden gepflückt
import * as THREE from 'three';
import { CFG } from '../config.js';
import { mulberry32, clamp } from '../util.js';

const ST_GROW = 0, ST_RIPE = 1, ST_LATE = 2;

function buildLeafCloud(rng, quads, rMin, rMax, yScale, size, uvCells) {
  const pos = [], nor = [], uv = [], idx = [];
  const q = new THREE.Quaternion();
  const n = new THREE.Vector3();
  const t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < quads; i++) {
    // Punkt auf oberer Halbkugel-Schale
    const u = rng(), v = rng();
    const phi = u * Math.PI * 2;
    const cosT = Math.pow(v, 0.62);            // Richtung Kuppel verdichten
    const sinT = Math.sqrt(1 - cosT * cosT);
    const r = rMin + rng() * (rMax - rMin);
    c.set(Math.cos(phi) * sinT * r, cosT * r * yScale, Math.sin(phi) * sinT * r);
    n.copy(c).normalize();
    n.y += 0.55; n.normalize();               // Normale leicht nach oben
    // Tangentenbasis
    t1.set(-n.z, 0, n.x).normalize();
    if (t1.lengthSq() < 0.01) t1.set(1, 0, 0);
    t2.crossVectors(n, t1);
    const roll = rng() * Math.PI * 2;
    const ca = Math.cos(roll), sa = Math.sin(roll);
    const ax = t1.clone().multiplyScalar(ca).addScaledVector(t2, sa);
    const ay = t1.clone().multiplyScalar(-sa).addScaledVector(t2, ca);
    // leicht nach außen kippen
    ay.lerp(n, 0.35).normalize();
    const w = size * (0.8 + rng() * 0.5), h = w * 0.72;
    const cell = uvCells[Math.floor(rng() * uvCells.length)];
    const base = pos.length / 3;
    for (const [sx, sy] of [[-1, -0.15], [1, -0.15], [1, 1], [-1, 1]]) {
      pos.push(
        c.x + ax.x * sx * w * 0.5 + ay.x * sy * h,
        c.y + ax.y * sx * w * 0.5 + ay.y * sy * h,
        c.z + ax.z * sx * w * 0.5 + ay.z * sy * h);
      nor.push(n.x, n.y, n.z);
    }
    uv.push(cell[0], cell[1], cell[0] + 0.5, cell[1], cell[0] + 0.5, cell[1] + 0.5, cell[0], cell[1] + 0.5);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export function createTeaField(ctx, terrain) {
  const { scene, loadingManager } = ctx;
  const F = CFG.field;
  const rng = mulberry32(CFG.seed);

  // ---- Busch-Positionen (Reihen) ----
  // v9: Der Randring (Maske 0.38..0.6) sind Erweiterungs-Parzellen — erst nach
  // dem "Bahçe Genişletme"-Upgrade aktiv und sichtbar.
  const positions = [];
  const extFlag = [];
  for (let z = F.z0; z <= F.z1; z += F.rowGap) {
    for (let x = F.x0; x <= F.x1; x += F.bushGap) {
      const jx = x + (rng() - 0.5) * 0.5;
      const jz = z + (rng() - 0.5) * 0.45;
      const mask = terrain.fieldMask(jx, jz);
      if (mask < 0.38) continue;
      if (terrain.pathWeight(jx, jz) > 0.25) continue;
      const h = terrain.heightAt(jx, jz);
      if (h < 2.0) continue;
      positions.push(jx, h, jz);
      extFlag.push(mask < 0.6 ? 1 : 0);
    }
  }
  const count = positions.length / 3;
  const active = new Uint8Array(count);

  // ---- Zustand ----
  const states = new Uint8Array(count);
  const timers = new Float32Array(count);
  const growVis = new Float32Array(count);   // sichtbarer Trieb-Anteil 0..1
  const lateVis = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (roll < 0.42) { states[i] = ST_RIPE; timers[i] = CFG.tea.ripeTime * (0.3 + rng() * 0.7); growVis[i] = 1; }
    else if (roll < 0.47) { states[i] = ST_LATE; timers[i] = 999; growVis[i] = 1; lateVis[i] = 1; }
    else { states[i] = ST_GROW; timers[i] = (CFG.tea.growTime + (rng() - 0.5) * 2 * CFG.tea.growJitter) * rng(); }
  }

  // ---- Räumlicher Hash ----
  const CELL = 6;
  const hash = new Map();
  const keyOf = (x, z) => (Math.floor(x / CELL) + 512) * 4096 + (Math.floor(z / CELL) + 512);
  for (let i = 0; i < count; i++) {
    const k = keyOf(positions[i * 3], positions[i * 3 + 2]);
    let arr = hash.get(k);
    if (!arr) hash.set(k, arr = []);
    arr.push(i);
  }
  function queryNear(x, z, cb) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gz = cz - 1; gz <= cz + 1; gz++) {
        const arr = hash.get((gx + 512) * 4096 + (gz + 512));
        if (arr) for (const i of arr) cb(i);
      }
    }
  }

  // ---- Texturen / Materialien ----
  const tl = new THREE.TextureLoader(loadingManager);
  const atlas = tl.load('assets/textures/tea/tea_atlas.png');
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;

  const windUniforms = { uTime: { value: 0 }, uWind: { value: 0.5 } };
  function addWind(mat, amp) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, windUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          {
            vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
            float ph = wp.x * 0.8 + wp.y * 1.1;
            float sway = sin(uTime * 1.8 + ph) + 0.5 * sin(uTime * 3.1 + ph * 1.7);
            transformed.xz += sway * ${amp.toFixed(3)} * uWind * clamp(position.y, 0.0, 1.0);
          }`);
    };
  }

  const baseGeo = new THREE.SphereGeometry(1, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.52);
  baseGeo.scale(0.60, 0.48, 0.60);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x18240d, roughness: 1, envMapIntensity: 0.2 });
  const baseMesh = new THREE.InstancedMesh(baseGeo, baseMat, count);

  const RIPE_CELLS = [[0, 0.5], [0.5, 0.5], [0, 0]];
  const leafGeo = buildLeafCloud(mulberry32(77), 210, 0.55, 0.88, 0.80, 0.17, RIPE_CELLS);
  const leafMat = new THREE.MeshStandardMaterial({
    map: atlas, alphaTest: 0.45, side: THREE.DoubleSide,
    roughness: 0.72, metalness: 0, envMapIntensity: 0.18
  });
  addWind(leafMat, 0.016);
  // Tiefe des Buschs abdunkeln (gebackene AO), Spitzen leicht aufhellen
  {
    const prev = leafMat.onBeforeCompile;
    leafMat.onBeforeCompile = (shader) => {
      prev(shader);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vDepthTint;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vDepthTint = clamp(length(position.xz) * 1.05 + position.y * 0.85, 0.25, 1.25);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vDepthTint;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= 0.35 + 0.65 * min(vDepthTint, 1.05);
          float leafG = dot(diffuseColor.rgb, vec3(0.333));
          diffuseColor.rgb = clamp(mix(vec3(leafG), diffuseColor.rgb, 1.45), 0.0, 1.0);`);
    };
  }
  const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, count);
  leafMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking, map: atlas, alphaTest: 0.5
  });

  const SHOOT_CELL = [[0.5, 0]];
  const shootGeo = buildLeafCloud(mulberry32(31), 30, 0.72, 0.95, 0.88, 0.12, SHOOT_CELL);
  const aGrow = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const aLate = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  aGrow.setUsage(THREE.DynamicDrawUsage);
  aLate.setUsage(THREE.DynamicDrawUsage);
  shootGeo.setAttribute('aGrow', aGrow);
  shootGeo.setAttribute('aLate', aLate);
  const shootMat = new THREE.MeshStandardMaterial({
    map: atlas, alphaTest: 0.35, side: THREE.DoubleSide,
    roughness: 0.6, metalness: 0, envMapIntensity: 0.3,
    emissive: 0x8fc248, emissiveIntensity: 0.24
  });
  shootMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, windUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uWind;
        attribute float aGrow; attribute float aLate;
        varying float vLate; varying float vGrow;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLate = aLate; vGrow = aGrow;
        transformed *= max(aGrow, 0.001);
        transformed.y += 0.03 * aGrow;
        {
          vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          float sway = sin(uTime * 2.2 + wp.x + wp.y * 1.3);
          transformed.xz += sway * 0.02 * uWind * clamp(position.y, 0.0, 1.0);
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLate; varying float vGrow;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.05, 0.82, 0.45), vLate * 0.85);`);
  };
  const shootMesh = new THREE.InstancedMesh(shootGeo, shootMat, count);

  // ---- Instanz-Matrizen ----
  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3(), s = new THREE.Vector3();
  const rng2 = mulberry32(555);
  const bushAngle = new Float32Array(count);
  const bushScale = new Float32Array(count);
  const bushYMul = new Float32Array(count);
  function composeBush(i) {
    p.set(positions[i * 3], positions[i * 3 + 1] - 0.06, positions[i * 3 + 2]);
    quat.setFromAxisAngle(up, bushAngle[i]);
    const sc = active[i] ? bushScale[i] : 0.001;   // inaktive Parzellen unsichtbar
    s.set(sc, sc * bushYMul[i], sc);
    m4.compose(p, quat, s);
    baseMesh.setMatrixAt(i, m4);
    leafMesh.setMatrixAt(i, m4);
    shootMesh.setMatrixAt(i, m4);
  }
  for (let i = 0; i < count; i++) {
    bushAngle[i] = rng2() * Math.PI * 2;
    bushScale[i] = 0.85 + rng2() * 0.35;
    bushYMul[i] = 0.9 + rng2() * 0.25;
    active[i] = extFlag[i] ? 0 : 1;
    if (!active[i]) {   // inaktiv: neutraler Zustand, damit Arbeiter sie ignorieren
      states[i] = ST_GROW; timers[i] = 99999; growVis[i] = 0; lateVis[i] = 0;
    }
    composeBush(i);
    aGrow.array[i] = growVis[i];
    aLate.array[i] = lateVis[i];
  }

  for (const m of [baseMesh, leafMesh, shootMesh]) {
    m.receiveShadow = true;
    m.frustumCulled = false;
  }
  baseMesh.castShadow = true;
  leafMesh.castShadow = true;
  scene.add(baseMesh, leafMesh, shootMesh);

  // ---- API ----
  const api = {
    count,
    positions,
    states,
    windUniforms,

    setCastShadow(on) { leafMesh.castShadow = on; baseMesh.castShadow = on; },

    // v5: Jahreszeiten-Färbung der Büsche
    setSeason(snow, autumn) {
      const c = leafMat.color;
      c.setRGB(1, 1, 1);
      if (autumn > 0) c.lerp(new THREE.Color(1.15, 0.9, 0.55), autumn * 0.6);
      if (snow > 0) c.lerp(new THREE.Color(0.85, 0.9, 0.95), snow * 0.55);
      shootMat.color.copy(c);
    },

    update(dt, growSpeedFactor, elapsed, windStrength) {
      windUniforms.uTime.value = elapsed;
      windUniforms.uWind.value += (windStrength - windUniforms.uWind.value) * Math.min(1, dt);
      let dirty = false;
      for (let i = 0; i < count; i++) {
        if (!active[i]) continue;
        const st = states[i];
        if (st === ST_GROW) {
          timers[i] -= dt * growSpeedFactor;
          if (timers[i] <= 0) { states[i] = ST_RIPE; timers[i] = CFG.tea.ripeTime; }
        } else if (st === ST_RIPE) {
          timers[i] -= dt;
          if (timers[i] <= 0) { states[i] = ST_LATE; }
        }
        // sichtbare Animation
        const gTarget = st === ST_GROW ? 0 : 1;
        const lTarget = st === ST_LATE ? 1 : 0;
        const g0 = growVis[i], l0 = lateVis[i];
        if (Math.abs(g0 - gTarget) > 0.001) { growVis[i] = clamp(g0 + Math.sign(gTarget - g0) * dt * 1.4, 0, 1); dirty = true; }
        if (Math.abs(l0 - lTarget) > 0.001) { lateVis[i] = clamp(l0 + Math.sign(lTarget - l0) * dt * 0.8, 0, 1); dirty = true; }
        if (dirty) { aGrow.array[i] = growVis[i]; aLate.array[i] = lateVis[i]; }
      }
      if (dirty) { aGrow.needsUpdate = true; aLate.needsUpdate = true; }
    },

    // bester pflückbarer Busch im Blick
    findTarget(camPos, camDir) {
      let best = -1, bestScore = -1;
      const R = CFG.tea.pickRange;
      queryNear(camPos.x, camPos.z, (i) => {
        if (!active[i]) return;
        const st = states[i];
        if (st === ST_GROW) return;
        const dx = positions[i * 3] - camPos.x;
        const dy = positions[i * 3 + 1] + 0.62 - camPos.y;
        const dz = positions[i * 3 + 2] - camPos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > R || d < 0.3) return;
        const cos = (dx * camDir.x + dy * camDir.y + dz * camDir.z) / d;
        if (cos < CFG.tea.pickCos) return;
        const score = cos * 2 - d * 0.08;
        if (score > bestScore) { bestScore = score; best = i; }
      });
      return best;
    },

    targetPos(i, out) {
      out.set(positions[i * 3], positions[i * 3 + 1] + 0.6, positions[i * 3 + 2]);
      return out;
    },

    isLate(i) { return states[i] === ST_LATE; },

    pick(i, hasShears) {
      const late = states[i] === ST_LATE;
      let kg = CFG.tea.yieldMin + Math.random() * (CFG.tea.yieldMax - CFG.tea.yieldMin);
      if (hasShears) kg *= CFG.tea.shearsYield;
      let quality = 1.0;
      if (late) { kg *= CFG.tea.lateYieldFactor; quality = CFG.tea.lateQuality; }
      states[i] = ST_GROW;
      timers[i] = CFG.tea.growTime + (Math.random() - 0.5) * 2 * CFG.tea.growJitter;
      return { kg, quality, late };
    },

    // Kollisions-Abfrage für den Spieler
    collide(pos, radius) {
      queryNear(pos.x, pos.z, (i) => {
        if (!active[i]) return;
        const dx = pos.x - positions[i * 3];
        const dz = pos.z - positions[i * 3 + 2];
        const rr = radius + 0.55;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / d;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      });
    },

    // Nacht: ein Großteil reift über Nacht (growFactor 0 = Winterruhe)
    newDay(growFactor = 1) {
      if (growFactor <= 0) return;
      for (let i = 0; i < count; i++) {
        if (!active[i]) continue;
        if (states[i] === ST_GROW) {
          if (Math.random() < 0.7) { states[i] = ST_RIPE; timers[i] = CFG.tea.ripeTime * (0.5 + Math.random() * 0.5); }
          else timers[i] = Math.min(timers[i], CFG.tea.growTime * 0.5 * Math.random());
        } else if (states[i] === ST_LATE) {
          // über Nacht abgeworfen, wächst neu
          if (Math.random() < 0.5) { states[i] = ST_GROW; timers[i] = CFG.tea.growTime * (0.3 + Math.random() * 0.6); }
        } else if (states[i] === ST_RIPE) {
          timers[i] = CFG.tea.ripeTime * (0.4 + Math.random() * 0.6);
        }
      }
    },

    countRipe() {
      let n = 0;
      for (let i = 0; i < count; i++) if (active[i] && states[i] !== ST_GROW) n++;
      return n;
    },

    // v9: Erweiterungs-Parzellen freischalten (Bahçe Genişletme)
    extCount: extFlag.reduce((a, b) => a + b, 0),
    setExtension(on) {
      for (let i = 0; i < count; i++) {
        if (!extFlag[i]) continue;
        active[i] = on ? 1 : 0;
        if (on && states[i] === ST_GROW && timers[i] > CFG.tea.growTime * 2) {
          timers[i] = CFG.tea.growTime * (0.2 + Math.random() * 0.8);
        }
        composeBush(i);
      }
      baseMesh.instanceMatrix.needsUpdate = true;
      leafMesh.instanceMatrix.needsUpdate = true;
      shootMesh.instanceMatrix.needsUpdate = true;
    }
  };

  return api;
}
