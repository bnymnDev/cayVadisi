// Schwarzes Meer: animierte Doppel-Normalmap + Environment-Reflexion
import * as THREE from 'three';
import { CFG } from '../config.js';

export function createOcean(ctx) {
  const { scene, loadingManager } = ctx;
  // v25.3: Diagnose — Wasser-Shader abschaltbar (schlichte dunkle Fläche)
  const simple = ctx.isTouch && ctx.gfx && ctx.gfx.noOcean;
  const tl = new THREE.TextureLoader(loadingManager);
  const nrm = tl.load('assets/textures/water/waternormals.jpg');
  nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;

  const geo = new THREE.PlaneGeometry(3000, 3000, 1, 1);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a2229,
    roughness: 0.21,
    metalness: 0.0,
    normalMap: nrm,
    normalScale: new THREE.Vector2(0.5, 0.5),
    envMapIntensity: 1.15
  });

  const uniforms = { uTime: { value: 0 } };
  if (!simple) mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOWPos = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vOWPos;')
      .replace('#include <normal_fragment_maps>', `
        vec2 wuv = vOWPos.xz;
        vec3 n1 = texture2D( normalMap, wuv * 0.24 + vec2(uTime * 0.020, uTime * 0.013) ).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D( normalMap, wuv * 0.055 - vec2(uTime * 0.008, uTime * 0.005) ).xyz * 2.0 - 1.0;
        vec3 n3 = texture2D( normalMap, wuv * 0.62 + vec2(-uTime * 0.035, uTime * 0.028) ).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(vec3(n1.xy * 0.8 + n2.xy * 0.7 + n3.xy * 0.3, n1.z * n2.z));
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );`);
  };

  if (simple) { mat.normalMap = null; mat.roughness = 0.4; }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = CFG.seaLevel;
  mesh.receiveShadow = true;
  mesh.name = 'ocean';
  scene.add(mesh);

  return {
    mesh,
    update(dt, elapsed, rainT) {
      uniforms.uTime.value = elapsed;
      const ns = 0.55 + rainT * 0.75;
      mat.normalScale.set(ns, ns);
      mat.roughness = 0.14 + rainT * 0.12;
    }
  };
}
