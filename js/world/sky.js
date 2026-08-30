// Himmel, Sonne, Licht, Nebel, Environment (PMREM aus Sky-Shader)
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { CFG } from '../config.js';
import { lerp, clamp, smoothstep } from '../util.js';
import { mulberry32 } from '../util.js';

export function createSky(ctx) {
  const { scene, renderer, isTouch } = ctx;

  const sky = new Sky();
  sky.scale.setScalar(2000);
  scene.add(sky);
  const U = sky.material.uniforms;

  const sun = new THREE.DirectionalLight(0xfff2dd, 3.0);
  // v25.2: Auf Mobil keine Schattenkarte — das periodische Neu-Rendern des
  // Shadow-Rendertargets ist eine der Flacker-Quellen auf Mobil-GPUs.
  sun.castShadow = !isTouch;
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

  // ---- Sternenhimmel (abends einblenden) ----
  const stars = (() => {
    const rng = mulberry32(9001);
    const N = 900;
    const pos = new Float32Array(N * 3);
    const sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      // obere Halbkugel, Richtung Zenit verdichtet
      const a = rng() * Math.PI * 2;
      const e = Math.asin(0.06 + rng() * 0.94);     // Elevation > Horizont
      const r = 950;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      pos[i * 3 + 1] = Math.sin(e) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
      sz[i] = 1.2 + rng() * rng() * 2.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aSize;
        varying float vTw;
        uniform float uTime;
        void main() {
          vTw = 0.7 + 0.3 * sin(uTime * (1.0 + fract(aSize) * 3.0) + position.x);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vTw;
        uniform float uOpacity;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float a = smoothstep(0.5, 0.12, length(d));
          gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a * uOpacity * vTw);
        }`
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = 1;
    scene.add(pts);
    return { pts, mat: m };
  })();

  // ---- Mond ----
  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xf5f0dd, transparent: true, opacity: 0, fog: false
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 12), moonMat);
  scene.add(moon);
  const moonGlowMat = new THREE.SpriteMaterial({
    color: 0xdfe6f0, transparent: true, opacity: 0, fog: false,
    map: (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g2 = c.getContext('2d');
      const grad = g2.createRadialGradient(32, 32, 4, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.8)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      return t;
    })()
  });
  const moonGlow = new THREE.Sprite(moonGlowMat);
  moonGlow.scale.setScalar(90);
  scene.add(moonGlow);

  // ---- Regenbogen (nach Regen) ----
  const rainbow = new THREE.Group();
  {
    const cols = [0xd0392b, 0xe07b2c, 0xe3c24f, 0x5d9138, 0x3f6d9a, 0x6a4f9a];
    cols.forEach((c, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(150 - i * 2.4, 1.1, 6, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, fog: false, depthWrite: false })
      );
      rainbow.add(arc);
    });
    rainbow.position.set(-60, -10, 90);   // über den Bergen im Norden
    rainbow.rotation.y = 0.4;
    rainbow.visible = false;
    scene.add(rainbow);
  }

  scene.fog = new THREE.FogExp2(0xc3d2d8, 0.0018);

  // v25.2: Auf Mobil KEIN PMREM-Environment. Der Bake alle ~2,5 s rendert in
  // ein HalfFloat-Rendertarget — auf vielen Mobil-GPUs (Adreno/Mali/iOS)
  // erzeugt genau das rhythmische schwarze Frames. Ohne Env gleichen
  // Hemisphären- und Sonnenlicht die Helligkeit aus (siehe update()).
  const pmrem = isTouch ? null : new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  let envSky = null;
  if (!isTouch) {
    envSky = new Sky();
    envSky.scale.setScalar(800);
    // Sonnenscheibe NICHT mitbacken: ihre extremen HDR-Werte laufen im
    // PMREM-Mipping zu Inf/NaN über und schwärzen dann die ganze Szene.
    envSky.material.uniforms.showSunDisc.value = 0;
    envScene.add(envSky);
  }
  // Das Sky-HDR trägt die volle Sonnenscheibe — als IBL stark dämpfen,
  // direkte Beleuchtung übernimmt die DirectionalLight.
  scene.environmentIntensity = 0.38;   // v10: etwas satteres Umgebungslicht

  const api = {
    sun, hemi,
    rainT: 0,          // 0 = klar, 1 = Regen
    extraFog: 0,       // v5: Morgennebel-Zuschlag (von game gesetzt)
    rainbowT: 0,       // v5: 0..1 Regenbogen-Sichtbarkeit
    sunDir: new THREE.Vector3(0, 1, 0),
    hour: CFG.startHour,
    _envRT: null,
    _envTimer: 99,     // sofort beim Start erzeugen
    _lastElev: -99
  };

  const colNight = new THREE.Color(0x0e1622);
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
    // Tageszeit (v7: läuft über endHour hinaus in die Nacht bis night.endHour)
    const tMax = (CFG.night.endHour - CFG.startHour) / (CFG.endHour - CFG.startHour);
    const t01 = clamp(state.timeSec / CFG.dayLengthSec, 0, tMax);
    api.hour = CFG.startHour + t01 * (CFG.endHour - CFG.startHour);
    const dayFrac = clamp((api.hour - 6) / 14, 0, 1.28);    // >1 = Sonne unterm Horizont
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

    // v7: Nachtanteil (Sonne unterm Horizont)
    const nightDeep = smoothstep(-0.02, -0.16, elev);

    // Nebel
    fogCol.copy(colDay).lerp(colDawn, lowSun * 0.8).lerp(colRain, r).lerp(colNight, nightDeep * 0.92);
    scene.fog.color.copy(fogCol);
    scene.fog.density = lerp(lerp(0.0019, 0.0033, lowSun), 0.0066, r) + api.extraFog;
    renderer.setClearColor(fogCol);
    hemi.intensity *= 1 - nightDeep * 0.45;   // Nacht: nur Mond-Restlicht
    if (isTouch) { hemi.intensity *= 1.5; sun.intensity *= 1.08; }   // v25.2: Env-Ersatz

    // Regenbogen ein-/ausblenden
    rainbow.visible = api.rainbowT > 0.01;
    if (rainbow.visible) {
      rainbow.children.forEach((arc, i) => {
        arc.material.opacity = api.rainbowT * 0.22 * (1 - i * 0.06);
      });
      rainbow.position.x = playerPos.x - 60;
      rainbow.position.z = playerPos.z + 150;
    }

    renderer.toneMappingExposure = lerp(lerp(0.6, 0.8, 0.2 + 0.8 * elevN), 0.52, r * 0.8);

    // Sterne & Mond: bei tiefer Sonne einblenden
    const nightT = smoothstep(0.16, 0.02, elevN) * (1 - r * 0.7);
    stars.mat.uniforms.uOpacity.value = nightT * 0.9;
    stars.mat.uniforms.uTime.value += dt;
    stars.pts.position.set(playerPos.x, 0, playerPos.z);
    moonMat.opacity = nightT;
    moonGlowMat.opacity = nightT * 0.55;
    // Mond steht der Sonne grob gegenüber
    const mAz = azim + Math.PI * 0.85;
    const mEl = 0.45 + 0.25 * (1 - elevN);
    moon.position.set(
      playerPos.x + Math.cos(mEl) * Math.sin(mAz) * 800,
      Math.sin(mEl) * 800,
      playerPos.z - Math.cos(mEl) * Math.cos(mAz) * 800
    );
    moonGlow.position.copy(moon.position);

    // Environment nur gelegentlich neu backen (Desktop; Mobil: siehe oben)
    api._envTimer += dt;
    const elevChanged = Math.abs(elev - api._lastElev) > 0.03;
    if (!isTouch && api._envTimer > 2.5 && (elevChanged || Math.abs(r - (api._lastRain ?? -1)) > 0.05)) {
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
