// GPU-Gras: instanzierte Halme mit Windwellen, folgt dem Spieler
import * as THREE from 'three';
import { mulberry32 } from '../util.js';

const BLADE_H = 0.33, BLADE_W = 0.021;

export function createGrass(ctx, terrain, maxCount) {
  const geo = new THREE.PlaneGeometry(BLADE_W, BLADE_H, 1, 3);
  geo.translate(0, BLADE_H / 2, 0);

  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: 0.55 }
  };

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.88, metalness: 0,
    side: THREE.DoubleSide
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uWind;
        attribute vec4 aInfo;   // phase, scale, lean, colorMix
        varying vec3 vGCol;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.62));`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        float bendT = clamp(position.y / ${BLADE_H.toFixed(3)}, 0.0, 1.0);
        vec2 wpos = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        float gust = 0.5 + 0.5 * sin(dot(wpos, vec2(0.14, 0.11)) - uTime * 1.35);
        float flutter = sin(uTime * (1.4 + aInfo.x * 1.7) + aInfo.x * 6.2831);
        float bend = aInfo.z * 0.6 + uWind * (0.25 + 0.75 * gust) * (0.6 + 0.4 * flutter);
        transformed.x *= 1.0 - bendT * 0.9;
        transformed.z += bend * bendT * bendT * ${BLADE_H.toFixed(3)} * 1.1;
        transformed.y *= aInfo.y;
        vec3 gLow = vec3(0.04, 0.10, 0.028);
        vec3 gHigh = vec3(0.17, 0.34, 0.085);
        vec3 gDry = vec3(0.26, 0.31, 0.09);
        vGCol = mix(gLow, gHigh, bendT * (0.5 + 0.5 * aInfo.w));
        vGCol = mix(vGCol, gDry, aInfo.w * aInfo.w * 0.22);`)
      ;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGCol;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= vGCol * 2.0;`);
  };

  const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.name = 'grass';

  const info = new Float32Array(maxCount * 4);
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));

  ctx.scene.add(mesh);

  const rng = mulberry32(991);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);

  const api = {
    mesh,
    radius: 55,
    count: maxCount,
    _cx: 1e9, _cz: 1e9,

    setQuality(count, radius) {
      api.count = Math.min(count, maxCount);
      api.radius = radius;
      mesh.count = api.count;
      api._cx = 1e9; // Re-Seed erzwingen
    },

    seed(cx, cz) {
      const r = api.radius;
      for (let i = 0; i < api.count; i++) {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * r;
        const x = cx + Math.cos(a) * d;
        const z = cz + Math.sin(a) * d;
        const h = terrain.heightAt(x, z);
        let s = 0.7 + rng() * 0.75;
        if (h < 0.55 || terrain.pathWeight(x, z) > 0.4) s = 0.0001; // parken
        s *= 1 - terrain.fieldMask(x, z) * 0.62;                    // im Feld kurz halten
        pos.set(x, h - 0.02, z);
        q.setFromAxisAngle(up, rng() * Math.PI * 2);
        scl.set(1, s, 1);
        m4.compose(pos, q, scl);
        mesh.setMatrixAt(i, m4);
        info[i * 4 + 0] = rng();
        info[i * 4 + 1] = s;
        info[i * 4 + 2] = (rng() - 0.5) * 1.6;
        info[i * 4 + 3] = rng();
      }
      mesh.instanceMatrix.needsUpdate = true;
      geo.attributes.aInfo.needsUpdate = true;
      api._cx = cx; api._cz = cz;
    },

    update(dt, elapsed, playerPos, windStrength) {
      uniforms.uTime.value = elapsed;
      uniforms.uWind.value += (windStrength - uniforms.uWind.value) * Math.min(1, dt * 0.7);
      const dx = playerPos.x - api._cx, dz = playerPos.z - api._cz;
      if (dx * dx + dz * dz > 14 * 14) api.seed(playerPos.x, playerPos.z);
    }
  };

  return api;
}
