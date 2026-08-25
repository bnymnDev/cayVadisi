// Himmel, Sonne, Licht, Nebel, Environment (PMREM aus Sky-Shader)
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { CFG } from '../config.js';
import { lerp, clamp, smoothstep } from '../util.js';

export function createSky(ctx) {
  const { scene, renderer } = ctx;

  const sky = new Sky();
  sky.scale.setScalar(2000);
  scene.add(sky);
  const U = sky.material.uniforms;

  const sun = new THREE.DirectionalLight(0xfff2dd, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 420;
  const EXT = 62;
  sun.shadow.camera.left = -EXT; sun.shadow.camera.right = EXT;
  sun.shadow.camera.top = EXT; sun.shadow.camera.bottom = -EXT;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xbcd4e4, 0x46583b, 0.5);
  scene.add(hemi);

  scene.fog = new THREE.FogExp2(0xc3d2d8, 0.0018);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(800);
  // Sonnenscheibe NICHT mitbacken: ihre extremen HDR-Werte laufen im
  // PMREM-Mipping zu Inf/NaN über und schwärzen dann die ganze Szene.
  envSky.material.uniforms.showSunDisc.value = 0;
  envScene.add(envSky);
  // Das Sky-HDR trägt die volle Sonnenscheibe — als IBL stark dämpfen,
  // direkte Beleuchtung übernimmt die DirectionalLight.
  scene.environmentIntensity = 0.3;

  const api = {
    sun, hemi,
    rainT: 0,          // 0 = klar, 1 = Regen
    sunDir: new THREE.Vector3(0, 1, 0),
    hour: CFG.startHour,
    _envRT: null,
    _envTimer: 99,     // sofort beim Start erzeugen
    _lastElev: -99
  };

  const colDay = new THREE.Color(0xaabfc9);
  const colDawn = new THREE.Color(0xe3b48a);
  const colRain = new THREE.Color(0x76828a);
  const fogCol = new THREE.Color();
  const sunColDay = new THREE.Color(0xfff3e0);
  const sunColLow = new THREE.Color(0xffb265);
  const sunColRain = new THREE.Color(0xaebfca);
  const sunCol = new THREE.Color();

  function skyUniforms(u, rainT, elevN) {
    u.turbidity.value = lerp(7, 19, rainT);
    u.rayleigh.value = lerp(lerp(2.6, 1.6, elevN), 0.9, rainT);
    u.mieCoefficient.value = lerp(0.006, 0.045, rainT);
    u.mieDirectionalG.value = lerp(0.8, 0.55, rainT);
  }

  api.update = function (dt, playerPos, state) {
    // Tageszeit
    const t01 = clamp(state.timeSec / CFG.dayLengthSec, 0, 1);
    api.hour = CFG.startHour + t01 * (CFG.endHour - CFG.startHour);
    const dayFrac = clamp((api.hour - 6) / 14, 0, 1);       // 06:00..20:00
    const elev = Math.sin(dayFrac * Math.PI) * 1.08;         // rad, max ~62°
    const elevN = clamp(Math.sin(dayFrac * Math.PI), 0, 1);
    const azim = (95 + dayFrac * 170) * Math.PI / 180;

    api.sunDir.set(
      Math.cos(elev) * Math.sin(azim),
      Math.sin(elev),
      -Math.cos(elev) * Math.cos(azim)
    ).normalize();

    // Regen-Übergang
    const target = state.raining ? 1 : 0;
    api.rainT += clamp(target - api.rainT, -dt * 0.35, dt * 0.35);
    const r = api.rainT;

    skyUniforms(U, r, elevN);
    U.sunPosition.value.copy(api.sunDir);

    // Sonne folgt dem Spieler (stabile Shadow-Kachel)
    const px = Math.round(playerPos.x * 2) / 2, pz = Math.round(playerPos.z * 2) / 2;
    sun.position.set(px + api.sunDir.x * 160, api.sunDir.y * 160 + 20, pz + api.sunDir.z * 160);
    sun.target.position.set(px, 0, pz);

    const lowSun = smoothstep(0.35, 0.05, elevN);
    sunCol.copy(sunColDay).lerp(sunColLow, lowSun).lerp(sunColRain, r * 0.85);
    sun.color.copy(sunCol);
    sun.intensity = (0.2 + 2.3 * elevN) * lerp(1, 0.22, r);
    sun.visible = elev > -0.05;

    hemi.intensity = (0.3 + 0.38 * elevN) * lerp(1, 0.75, r);
    hemi.color.setHex(0xbcd4e4).lerp(colRain, r);

    // Nebel
    fogCol.copy(colDay).lerp(colDawn, lowSun * 0.8).lerp(colRain, r);
    scene.fog.color.copy(fogCol);
    scene.fog.density = lerp(lerp(0.0019, 0.0033, lowSun), 0.0066, r);
    renderer.setClearColor(fogCol);

    renderer.toneMappingExposure = lerp(lerp(0.6, 0.8, 0.2 + 0.8 * elevN), 0.52, r * 0.8);

    // Environment nur gelegentlich neu backen
    api._envTimer += dt;
    const elevChanged = Math.abs(elev - api._lastElev) > 0.03;
    if (api._envTimer > 2.5 && (elevChanged || Math.abs(r - (api._lastRain ?? -1)) > 0.05)) {
      api._envTimer = 0;
      api._lastElev = elev;
      api._lastRain = r;
      const eu = envSky.material.uniforms;
      skyUniforms(eu, r, elevN);
      eu.sunPosition.value.copy(api.sunDir);
      const old = api._envRT;
      api._envRT = pmrem.fromScene(envScene, 0, 1, 1100);
      scene.environment = api._envRT.texture;
      if (old) old.dispose();
    }
  };

  api.setShadowSize = function (px) {
    sun.shadow.mapSize.set(px, px);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  };

  return api;
}
