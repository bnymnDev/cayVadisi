// Bootstrap: Renderer, Composer, Module, Game-Loop
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CFG } from './config.js';
import { state, load, save } from './state.js';
import { setLang } from './i18n.js';
import { createTerrain } from './world/terrain.js';
import { createSky } from './world/sky.js';
import { createOcean } from './world/ocean.js';
import { createGrass } from './world/grass.js';
import { createTeaField } from './world/tea.js';
import { createProps } from './world/props.js';
import { createRain } from './world/rain.js';
import { createBirds } from './world/birds.js';
import { createParticles } from './world/particles.js';
import { createFarm } from './world/farm.js';
import { createCity } from './world/city.js';
import { createVehicles } from './vehicles.js';
import { createWorkers } from './workers.js';
import { createPlayer } from './player.js';
import { createAudio } from './audio.js';
import { createUI } from './ui.js';
import { createGame } from './game.js';
import { applyDom } from './i18n.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, powerPreference: 'high-performance'
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(69, innerWidth / innerHeight, 0.1, 1400);

const isTouch = matchMedia('(pointer: coarse)').matches;
const loadingManager = new THREE.LoadingManager();

const ctx = { renderer, scene, camera, loadingManager, isTouch };

// ---------- Composer ----------
// Hinweis: bewusst KEIN Bloom — die HDR-Sonnenscheibe des Sky-Shaders
// überstrahlt sonst die halbe Szene. MSAA + ACES reichen für den Look.
const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

// ---------- Zustand / Sprache ----------
load();
setLang(state.settings.lang);
applyDom();
if (state.settings.lang === 'tr') {
  document.getElementById('lang-tr').classList.add('active');
  document.getElementById('lang-de').classList.remove('active');
}

// ---------- Welt ----------
const terrain = createTerrain(ctx);
const sky = createSky(ctx);
const ocean = createOcean(ctx);
const teaField = createTeaField(ctx, terrain);
const grassMax = CFG.quality.high.grass;
const grass = createGrass(ctx, terrain, grassMax);
const rain = createRain(ctx);
const birds = createBirds(ctx);
const particles = createParticles(ctx, 'assets/textures/tea/tea_atlas.png');
const audio = createAudio();

let propsApi = null;
let game = null;
let farm = null, city = null, vehicles = null, workers = null;

const hooks = {};
const ui = createUI(ctx, hooks);
const allColliders = [];
const player = createPlayer(ctx, terrain,
  () => allColliders,
  (pos, r) => teaField.collide(pos, r));

// ---------- Qualität ----------
let qualityLevel = 'high';
function applyQuality(level) {
  const q = CFG.quality[level];
  qualityLevel = level;
  grass.setQuality(q.grass, q.grassR);
  sky.setShadowSize(q.shadow);
  teaField.setCastShadow(level !== 'low');
  const pr = Math.min(devicePixelRatio || 1, q.pr);
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  onResize();
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

// ---------- Laden ----------
let loadDone = false, propsDone = false;
loadingManager.onProgress = (url, n, total) => ui.setProgress(Math.min(0.98, n / Math.max(total, 18)));
loadingManager.onLoad = () => { loadDone = true; maybeReady(); };
loadingManager.onError = (url) => console.error('Ladefehler:', url);

function maybeReady() {
  if (loadDone && propsDone) {
    ui.setProgress(1);
    ui.readyToStart();
  }
}

createProps(ctx, terrain).then((p) => {
  propsApi = p;
  farm = createFarm(ctx, terrain, p.mats);
  city = createCity(ctx, terrain, p.mats);
  vehicles = createVehicles(ctx, terrain, player, () => allColliders);
  workers = createWorkers(ctx, terrain, teaField, particles);
  allColliders.push(...p.colliders, ...farm.colliders, ...city.colliders);
  game = createGame(ctx, {
    terrain, tea: teaField, props: p, player, audio, ui, particles, sky,
    farm, city, vehicles, workers
  });
  ui.bindTouch(player, vehicles);
  wireHooks();
  propsDone = true;
  maybeReady();
}).catch((e) => console.error('Props-Fehler:', e));

function wireHooks() {
  hooks.sellValue = () => game.sellValue();
  hooks.buyUpgrade = (id) => game.buyUpgrade(id);
  hooks.doSell = () => game.doSell();
  hooks.closeShop = () => { ui.hideOverlays(); game.pause(false); };
  hooks.plantCrop = (id) => game.plantCrop(id);
  hooks.buyAnimal = (id) => game.buyAnimal(id);
  hooks.sellProduct = (id, n) => game.sellProduct(id, n);
  hooks.buyVehicle = (id) => game.buyVehicle(id);
  hooks.hireWorker = () => game.hireWorker();
  hooks.fireWorker = () => game.fireWorker();
  hooks.openManage = () => { player.releaseLock(); ui.showManage(); };
  hooks.resume = () => game.pause(false);
  hooks.nextDay = () => game.nextDay();
  hooks.nextDay2 = () => game.startDay();
  hooks.setSound = (v) => audio.setEnabled(v);
  hooks.setQuality = (lv) => { if (lv !== 'auto') applyQuality(lv); autoTuneOn = lv === 'auto'; };
  hooks.onStart = () => beginPlay(true);
  hooks.onContinue = () => beginPlay(false);
}

function beginPlay(fresh) {
  window.__started = true;
  if (state.settings.sound) audio.ensure();
  audio.setEnabled(state.settings.sound);
  ui.hideStart();
  ui.refreshMoney();
  ui.refreshBasket();
  game.startDay();
  game.tutorialStart();
  save();
}

// ---------- Auto-Qualität ----------
let autoTuneOn = state.settings.quality === 'auto';
if (!autoTuneOn) applyQuality(state.settings.quality);
else applyQuality('high');
let emaDt = 1 / 60, tuneTimer = 0;

// ---------- Debug-API (für Tests) ----------
window.__game = {
  state, player, sky, camera, renderer, composer, scene, THREE, ctx,
  tea: teaField, ui,
  get game() { return game; },
  get props() { return propsApi; },
  get farm() { return farm; },
  get city() { return city; },
  get vehicles() { return vehicles; },
  get workers() { return workers; },
  setHour(h) { state.timeSec = (h - CFG.startHour) / (CFG.endHour - CFG.startHour) * CFG.dayLengthSec; },
  give(m) { state.money += m; ui.refreshMoney(); },
  teleport: (x, z) => player.teleport(x, z),
  look: (yaw, pitch) => player.look(yaw, pitch),
  quality: applyQuality,
  fps: () => Math.round(1 / emaDt),
  frame(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) step(dt, true); },
  sim(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) step(dt, true, true); },   // ohne Rendern (Tests)
  shot(w = 640) {
    step(1 / 60, true);
    const c = renderer.domElement;
    const s = w / c.width;
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = Math.round(c.height * s);
    oc.getContext('2d').drawImage(c, 0, 0, oc.width, oc.height);
    return oc.toDataURL('image/jpeg', 0.82);
  }
};

// ---------- Loop ----------
let lastNow = performance.now();
let elapsedTime = 0;
let hudTimer = 0;

function tick() {
  requestAnimationFrame(tick);
  const now = performance.now();
  const rawDt = Math.max(0, (now - lastNow) / 1000);
  lastNow = now;
  step(rawDt, false);
}

let menuYaw = Math.PI * 0.86;
const menuEuler = new THREE.Euler(-0.05, 0, 0, 'YXZ');

function step(rawDt, manual, skipRender = false) {
  const dt = Math.min(rawDt, 0.05);
  elapsedTime += dt;
  const elapsed = elapsedTime;

  // Idle-Kamera hinter dem Startscreen (bis zum ersten Spielstart)
  if (!window.__started) {
    menuYaw += dt * 0.022;
    menuEuler.y = menuYaw;
    camera.position.set(CFG.player.spawn.x, 6.5, CFG.player.spawn.z);
    camera.quaternion.setFromEuler(menuEuler);
  }

  emaDt = emaDt * 0.96 + rawDt * 0.04;
  tuneTimer += rawDt;
  if (autoTuneOn && tuneTimer > 4 && document.visibilityState === 'visible') {
    tuneTimer = 0;
    if (emaDt > 0.022) {
      if (qualityLevel === 'high') applyQuality('medium');
      else if (qualityLevel === 'medium') applyQuality('low');
    } else if (emaDt < 0.012 && qualityLevel === 'medium') {
      applyQuality('high');
    }
  }

  const playing = game && game.running && !game.paused;

  if (game) game.update(dt, elapsed);
  player.update(dt, state.upgrades.boots);

  const growSpeed = game ? game.growSpeedFactor() : 1;
  const wind = game ? game.windStrength() : 0.5;
  teaField.update(playing ? dt : 0, growSpeed, elapsed, wind);
  sky.update(dt, player.pos, state);
  ocean.update(dt, elapsed, sky.rainT);
  grass.update(dt, elapsed, player.pos, wind);
  rain.update(dt, camera.position, sky.rainT);
  birds.update(dt, elapsed);
  particles.update(dt);
  if (propsApi) {
    const elevN = Math.max(0, Math.sin((sky.hour - 6) / 14 * Math.PI));
    propsApi.update(dt, elevN, sky.rainT);
    farm.update(dt, elapsed);
    city.update(dt, elevN, sky.rainT, elapsed);
    vehicles.update(dt, elevN, sky.rainT);
    workers.update(dt, elapsed, playing);
  }

  if (game) {
    const seaDist = Math.abs(player.pos.z - (-119));
    audio.update(dt, seaDist, wind, sky.rainT, player.moving, player.running);
  }

  hudTimer += dt;
  if (hudTimer > 0.25) {
    hudTimer = 0;
    ui.refreshClock(sky.hour);
    ui.refreshMoney();
  }
  ui.updateMarker(camera);

  if (!skipRender) composer.render();
}

onResize();
tick();
