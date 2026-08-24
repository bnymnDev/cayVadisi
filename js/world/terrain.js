// Terrain: analytische Höhenfunktion (Terrassen im Teefeld) + 3-Wege-Splat
import * as THREE from 'three';
import { CFG, PATHS, PATH_WIDTH } from '../config.js';
import { fbm, smoothstep, lerp, clamp, segDist } from '../util.js';

const F = CFG.field;

// Ellipsen-Maske des Teefelds (1 = innen)
export function fieldMask(x, z) {
  const dx = (x - F.cx) / F.rx, dz = (z - F.cz) / F.rz;
  const r = Math.sqrt(dx * dx + dz * dz);
  return smoothstep(1.0, 0.82, r);
}

// Weg-Gewicht 0..1
export function pathWeight(x, z) {
  let d = 1e9;
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i++) {
      d = Math.min(d, segDist(x, z, line[i].x, line[i].z, line[i + 1].x, line[i + 1].z));
    }
  }
  return smoothstep(PATH_WIDTH, PATH_WIDTH * 0.45, d);
}

// Höhe VOR Terrassierung
function baseHeight(x, z) {
  let h = -6
    + 10 * smoothstep(-140, -100, z)     // Küstenanstieg
    + 13 * smoothstep(-95, -2, z)        // Teehang (steiler → echte Terrassen)
    + 26 * smoothstep(-15, 190, z);      // Berge dahinter
  const coastCalm = smoothstep(-128, -98, z);          // Strand glatt halten
  const amp = (2.2 + 13 * smoothstep(-90, 190, z)) * coastCalm;
  h += (fbm(x * 0.011 + 7.3, z * 0.011, 4) - 0.5) * 2 * amp;
  h += (fbm(x * 0.045, z * 0.045 + 3.1, 3) - 0.5) * 1.1 * coastCalm;
  // seitliche Schulter, damit das Tal gefasst wirkt
  h += 6 * smoothstep(120, 200, Math.abs(x)) * smoothstep(-120, -60, z);
  return h;
}

// Ebene Bau-Plätze (Hütte, Haus, Teleferik-Station)
const FLATS = [
  { x: CFG.hut.x, z: CFG.hut.z, r: 10 },
  { x: CFG.home.x, z: CFG.home.z, r: 8 },
  { x: CFG.cableTop.x, z: CFG.cableTop.z, r: 6 }
];
for (const f of FLATS) f.h = baseHeight(f.x, f.z);

const TERRACE = 1.15;
export function heightAt(x, z) {
  let h = baseHeight(x, z);
  const w = fieldMask(x, z);
  if (w > 0.001) {
    const q = Math.floor(h / TERRACE) * TERRACE;
    const f = (h - q) / TERRACE;
    const ht = q + smoothstep(0.7, 0.96, f) * TERRACE + 0.06;
    h = lerp(h, ht, w * 0.92);
    const pw = pathWeight(x, z);
    if (pw > 0) h = lerp(h, baseHeight(x, z), pw * 0.65);
  }
  for (const f of FLATS) {
    const dx = x - f.x, dz = z - f.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < f.r * f.r) {
      const d = Math.sqrt(d2);
      h = lerp(h, f.h, smoothstep(f.r, f.r * 0.4, d));
    }
  }
  return h;
}

export function normalAt(x, z) {
  const e = 0.35;
  const hL = heightAt(x - e, z), hR = heightAt(x + e, z);
  const hD = heightAt(x, z - e), hU = heightAt(x, z + e);
  const n = new THREE.Vector3(hL - hR, 2 * e, hD - hU);
  return n.normalize();
}

function loadTex(loader, url, srgb, aniso) {
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

export function createTerrain(ctx) {
  const { loadingManager, renderer } = ctx;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tl = new THREE.TextureLoader(loadingManager);
  const T = 'assets/textures/';
  const grassD = loadTex(tl, T + 'aerial_grass_rock/aerial_grass_rock_diff_2k.jpg', true, aniso);
  const grassN = loadTex(tl, T + 'aerial_grass_rock/aerial_grass_rock_nor_gl_2k.jpg', false, aniso);
  const grassA = loadTex(tl, T + 'aerial_grass_rock/aerial_grass_rock_arm_2k.jpg', false, aniso);
  const dirtD = loadTex(tl, T + 'brown_mud_leaves_01/brown_mud_leaves_01_diff_2k.jpg', true, aniso);
  const dirtN = loadTex(tl, T + 'brown_mud_leaves_01/brown_mud_leaves_01_nor_gl_2k.jpg', false, aniso);
  const dirtA = loadTex(tl, T + 'brown_mud_leaves_01/brown_mud_leaves_01_arm_2k.jpg', false, aniso);
  const rockD = loadTex(tl, T + 'aerial_rocks_02/aerial_rocks_02_diff_2k.jpg', true, aniso);
  const rockN = loadTex(tl, T + 'aerial_rocks_02/aerial_rocks_02_nor_gl_2k.jpg', false, aniso);
  const rockA = loadTex(tl, T + 'aerial_rocks_02/aerial_rocks_02_arm_2k.jpg', false, aniso);

  const S = CFG.worldSize, segs = CFG.terrainSegs;
  const geo = new THREE.PlaneGeometry(S, S, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const count = pos.count;
  const mask = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    mask[i * 3 + 0] = pathWeight(x, z);
    mask[i * 3 + 1] = fieldMask(x, z);
    mask[i * 3 + 2] = fbm(x * 0.02 + 11.7, z * 0.02 - 4.2, 3);
  }
  geo.setAttribute('aMask', new THREE.BufferAttribute(mask, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: grassD, normalMap: grassN,
    aoMap: grassA, roughnessMap: grassA,
    roughness: 1.0, metalness: 0.0,
    normalScale: new THREE.Vector2(1, 1)
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.tDirtD = { value: dirtD };
    shader.uniforms.tDirtN = { value: dirtN };
    shader.uniforms.tDirtA = { value: dirtA };
    shader.uniforms.tRockD = { value: rockD };
    shader.uniforms.tRockN = { value: rockN };
    shader.uniforms.tRockA = { value: rockA };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aMask;
        varying vec3 vMask;
        varying vec3 vWPos;
        varying float vSlope;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vMask = aMask;
        vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vSlope = 1.0 - normalize(normal).y;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tDirtD, tDirtN, tDirtA, tRockD, tRockN, tRockA;
        varying vec3 vMask;
        varying vec3 vWPos;
        varying float vSlope;
        vec3 splatW() {
          float beach = smoothstep(1.6, 0.35, vWPos.y);
          float steep = smoothstep(0.42, 0.62, vSlope);
          float rockW = max(beach, steep * (1.0 - vMask.y));
          float dirtW = clamp(vMask.x + vMask.y * (0.30 + 0.55 * smoothstep(0.22, 0.5, vSlope)), 0.0, 1.0) * (1.0 - rockW);
          float grassW = max(1.0 - rockW - dirtW, 0.0);
          vec3 w = vec3(grassW, dirtW, rockW);
          return w / (w.x + w.y + w.z + 1e-5);
        }
        vec4 splatTex(sampler2D tg, sampler2D td, sampler2D tr, vec2 uv, vec3 w) {
          vec4 c = texture2D(tg, uv) * w.x + texture2D(td, uv * 1.31) * w.y + texture2D(tr, uv * 0.9) * w.z;
          return c;
        }
        vec3 calmDirt(vec3 c) {
          float g = dot(c, vec3(0.333));
          return mix(c, vec3(g) * vec3(0.98, 0.86, 0.6) * 0.9, 0.66);
        }`)
      .replace('#include <map_fragment>', `
        vec2 tUv = vWPos.xz * 0.092;
        vec3 sw = splatW();
        vec4 texelColor = splatTex(map, tDirtD, tRockD, tUv, sw);
        vec4 texelFar = splatTex(map, tDirtD, tRockD, tUv * 0.213 + 0.37, sw);
        texelColor = mix(texelColor, texelFar, 0.42);
        float tint = 0.86 + 0.26 * vMask.z;
        texelColor.rgb *= tint;
        texelColor.rgb = mix(texelColor.rgb, calmDirt(texelColor.rgb), sw.y);
        vec3 lush = texelColor.rgb * vec3(0.55, 1.02, 0.38) * 1.18;
        texelColor.rgb = mix(texelColor.rgb, lush, sw.x * (0.62 + 0.22 * vMask.z));
        diffuseColor *= texelColor;`)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = splatTex(normalMap, tDirtN, tRockN, tUv, sw).xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        vec4 texelRoughness = splatTex(roughnessMap, tDirtA, tRockA, tUv, sw);
        roughnessFactor *= texelRoughness.g;`)
      .replace('#include <aomap_fragment>', `
        float ambientOcclusion = splatTex(aoMap, tDirtA, tRockA, tUv, sw).r;
        ambientOcclusion = ambientOcclusion * 0.75 + 0.25;
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
          reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
        #endif`);
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'terrain';
  ctx.scene.add(mesh);
  return { mesh, heightAt, normalAt, fieldMask, pathWeight };
}
