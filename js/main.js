// Bootstrap: Renderer, Composer, Module, Game-Loop
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CFG } from './config.js';
import { state, load, save, seasonOf } from './state.js';
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
import { createMinimap } from './minimap.js';
import { createNpcs } from './npcs.js';
import { createExtras } from './world/extras.js';
import { createCc0Props } from './world/cc0props.js';
import { createAirport } from './world/airport.js';
import { createAvatar } from './avatar.js';
import { createEvents } from './events.js';
import { createBoat } from './boat.js';
import { createDog } from './dog.js';
import { createIstanbul } from './world/istanbul.js';
import { createWildlife } from './wildlife.js';
import { createRace } from './race.js';
import { createSled } from './sled.js';
import { createHeli } from './heli.js';
import { createSelale } from './world/selale.js';
import { createDolmus } from './dolmus.js';
import { createCollectibles } from './collectibles.js';
import { createKarsikoy } from './world/karsikoy.js';
import { createFireworks } from './world/fireworks.js';
import { createOrchard } from './world/orchard.js';
import { createGulet } from './gulet.js';
import { createCats } from './cats.js';
import { createKonak } from './world/konak.js';
import { createVillage } from './world/village.js';
import { createChars } from './chars.js';
import { createAnimals3d } from './animals3d.js';
import { createStory } from './story.js';
import { createAchievements, ACH_DEFS } from './achievements.js';
import { createRadio } from './radio.js';
import { createYayla } from './world/yayla.js';
import { createUI } from './ui.js';
import { createGame } from './game.js';
import { applyDom } from './i18n.js';
import { initGate } from './gate.js';

// v6: PIN-Gate (nur auf github.io aktiv) + Service Worker für Offline/PWA
initGate();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, powerPreference: 'high-performance'
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // v10: weiche Schatten

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(69, innerWidth / innerHeight, 0.1, 1400);

const isTouch = matchMedia('(pointer: coarse)').matches;
const loadingManager = new THREE.LoadingManager();

const ctx = { renderer, scene, camera, loadingManager, isTouch };

// ---------- Composer ----------
// Hinweis: bewusst KEIN Bloom — die HDR-Sonnenscheibe des Sky-Shaders
// überstrahlt sonst die halbe Szene. MSAA + ACES reichen für den Look.
// Mobil: HalfFloat + 4×MSAA flackert auf vielen Mobil-GPUs (Adreno/Mali,
// iOS) — dort RGBA8 mit 2×MSAA, das ist überall stabil.
const rt = new THREE.WebGLRenderTarget(1, 1, isTouch
  ? { samples: 2, type: THREE.UnsignedByteType }
  : { samples: 4, type: THREE.HalfFloatType });
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
let farm = null, city = null, vehicles = null, workers = null, minimap = null, npcs = null, extras = null;
let cc0 = null, airport = null, avatar = null, events = null;
let boat = null, story = null, achievements = null, radio = null, yaylaApi = null;
let dog = null, istanbul = null, wildlife = null, race = null, sled = null;
let heli = null, selale = null;
let dolmus = null, collectibles = null, karsikoy = null;
let fireworks = null, orchard = null;
let gulet = null, cats = null, konak = null, village = null;
let thirdPerson = false;
let photoMode = false;

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

createProps(ctx, terrain).then(async (p) => {
  // v13.3/13.5: geriggte Menschen & Tiere zuerst laden
  const chars = createChars(ctx);
  const animals3d = createAnimals3d(ctx);
  await Promise.all([chars.load(), animals3d.load()]);
  cc0 = await createCc0Props(ctx, terrain);
  farm = createFarm(ctx, terrain, p.mats, animals3d);
  city = createCity(ctx, terrain, p.mats);
  vehicles = createVehicles(ctx, terrain, player, () => allColliders);
  workers = createWorkers(ctx, terrain, teaField, particles, chars);
  extras = createExtras(ctx, terrain, p.mats);
  airport = createAirport(ctx, terrain, p.mats);
  events = createEvents(ctx, ui, audio);
  avatar = createAvatar(ctx, player, terrain, chars);
  boat = createBoat(ctx, terrain, player, audio, ui);
  dog = createDog(ctx, terrain, player, audio, animals3d);
  story = createStory(ctx, ui, audio, player);
  achievements = createAchievements(ctx, terrain, ui, audio);
  radio = createRadio();
  yaylaApi = createYayla(ctx, terrain, p.mats);
  allColliders.push(...p.colliders, ...farm.colliders, ...city.colliders,
    ...extras.colliders, ...cc0.colliders, ...airport.colliders, ...yaylaApi.colliders);
  wildlife = createWildlife(ctx, terrain, player, ui, audio);
  race = createRace(ctx, ui, audio);
  sled = createSled(ctx, terrain, player, ui, audio);
  heli = createHeli(ctx, terrain, player, audio);
  selale = createSelale(ctx, terrain);
  dolmus = createDolmus(ctx, terrain, audio);
  collectibles = createCollectibles(ctx, terrain);
  karsikoy = createKarsikoy(ctx, terrain, p.mats);
  fireworks = createFireworks(ctx, audio);
  orchard = createOrchard(ctx, terrain);
  gulet = createGulet(ctx, player, ui, audio);
  cats = createCats(ctx, terrain, animals3d);
  konak = createKonak(ctx, terrain, p.mats);
  village = createVillage(ctx, terrain, p.mats);
  allColliders.push(...selale.colliders, ...karsikoy.colliders, ...konak.colliders, ...village.colliders);
  if (state.upgrades.expand) teaField.setExtension(true);   // v9: gekaufte Parzellen laden
  const gameMods = {
    terrain, tea: teaField, props: p, player, audio, ui, particles, sky,
    farm, city, vehicles, workers, extras, events, boat, radio, yayla: yaylaApi, dog,
    race, sled, heli, selale, cc0, dolmus, collectibles, orchard,
    gulet, cats, konak, village, istanbul: null, npcs: null
  };
  game = createGame(ctx, gameMods);
  minimap = createMinimap(ctx, terrain, player, () => workers.list(), () => vehicles.fleet);
  // İstanbul NACH der Minimap erzeugen (die Höhen-Zone darf nicht mitgebacken werden)
  istanbul = createIstanbul(ctx, terrain);
  gameMods.istanbul = istanbul;
  allColliders.push(...istanbul.colliders);
  npcs = createNpcs(ctx, terrain, ui, player, () => game.playerShare(), chars);
  gameMods.npcs = npcs;
  ui.bindTouch(player, vehicles, boat);
  wireHooks();
  propsApi = p;      // erst jetzt: der Render-Loop prüft propsApi als "alles bereit"
  propsDone = true;
  maybeReady();
}).catch((e) => console.error('Props-Fehler:', e));

// ---------- Foto-Modus (F) ----------
const photo = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, drag: false };
ctx.photoActive = () => photoMode;
function setPhotoMode(v) {
  photoMode = v;
  document.getElementById('hud').classList.toggle('hidden', v);
  document.getElementById('vignette').style.display = v ? 'none' : '';
  if (v) {
    photo.pos.copy(camera.position);
    photo.yaw = player.euler.y;
    photo.pitch = player.euler.x;
    player.releaseLock();
    player.setEnabled(false);
  } else if (game && game.running && !vehicles.driving && !boat.driving) {
    player.setEnabled(true);
  }
}
window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.code === 'KeyF' && game && game.running && !ui.overlayOpen()) setPhotoMode(!photoMode);
  if (e.code === 'KeyC' && photoMode) {
    composer.render();
    const a = document.createElement('a');
    a.download = 'cayvadisi_' + Date.now() + '.png';
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
    // v7: verkleinerte Kopie ins Fotoalbum legen
    const c = renderer.domElement;
    const w = CFG.album.width;
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = Math.round(c.height / c.width * w);
    oc.getContext('2d').drawImage(c, 0, 0, oc.width, oc.height);
    ui.albumAdd(oc.toDataURL('image/jpeg', 0.75));
    // v12: Foto-Mission prüfen (Blickrichtung der Foto-Kamera)
    if (game) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      game.photoTaken(camera.position, dir);
    }
  }
});
window.addEventListener('mousedown', (e) => { if (photoMode && e.button === 0) photo.drag = true; });
window.addEventListener('mouseup', () => { photo.drag = false; });
window.addEventListener('mousemove', (e) => {
  if (!photoMode || !photo.drag) return;
  photo.yaw -= e.movementX * 0.0038;
  photo.pitch = Math.max(-1.5, Math.min(1.5, photo.pitch - e.movementY * 0.0038));
});
const _photoFwd = new THREE.Vector3();
const _photoRight = new THREE.Vector3();
function updatePhoto(dt) {
  const keys = player.keys;
  const sp = (keys.has('ShiftLeft') ? 26 : 10) * dt;
  _photoFwd.set(-Math.sin(photo.yaw) * Math.cos(photo.pitch), Math.sin(photo.pitch), -Math.cos(photo.yaw) * Math.cos(photo.pitch));
  _photoRight.set(-_photoFwd.z, 0, _photoFwd.x).normalize();
  if (keys.has('KeyW')) photo.pos.addScaledVector(_photoFwd, sp);
  if (keys.has('KeyS')) photo.pos.addScaledVector(_photoFwd, -sp);
  if (keys.has('KeyD')) photo.pos.addScaledVector(_photoRight, sp);
  if (keys.has('KeyA')) photo.pos.addScaledVector(_photoRight, -sp);
  if (keys.has('KeyQ')) photo.pos.y -= sp;
  if (keys.has('KeyE')) photo.pos.y += sp;
  photo.pos.y = Math.max(photo.pos.y, terrain.heightAt(photo.pos.x, photo.pos.z) + 0.3);
  camera.position.copy(photo.pos);
  camera.rotation.set(photo.pitch, photo.yaw, 0, 'YXZ');
}

// ---------- Gamepad ----------
let padInteractHeld = false, padViewHeld = false;
function pollGamepad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && pads[0];
  if (!pad || !game || !game.running) return;
  const dz = (v) => Math.abs(v) > 0.16 ? v : 0;
  const lx = dz(pad.axes[0] || 0), ly = dz(pad.axes[1] || 0);
  const rx = dz(pad.axes[2] || 0), ry = dz(pad.axes[3] || 0);
  const rt = pad.buttons[7] ? pad.buttons[7].value : 0;
  const lt = pad.buttons[6] ? pad.buttons[6].value : 0;
  if (vehicles.driving) {
    vehicles.touchSteer = lx;
    vehicles.touchGas = rt - lt;
  } else if (boat.driving) {
    boat.touchSteer = lx;
    boat.touchGas = rt - lt;
  } else {
    player.touchMove.x = lx;
    player.touchMove.y = ly;
  }
  // Rechter Stick: Umsehen
  player.euler.y -= rx * 2.4 * dt;
  player.euler.x = Math.max(-1.45, Math.min(1.45, player.euler.x - ry * 1.8 * dt));
  // A = Benutzen, Y = Ansicht
  const a = pad.buttons[0] && pad.buttons[0].pressed;
  if (a && !padInteractHeld && !ui.overlayOpen()) game.doInteract();
  padInteractHeld = a;
  const y = pad.buttons[3] && pad.buttons[3].pressed;
  if (y && !padViewHeld && !vehicles.driving) {
    thirdPerson = !thirdPerson;
    avatar.setVisible(thirdPerson);
  }
  padViewHeld = y;
}

// ---------- Third-Person (V) ----------
window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.code === 'KeyV' && game && game.running && !vehicles.driving) {
    thirdPerson = !thirdPerson;
    avatar.setVisible(thirdPerson);
  }
});
const tpCam = new THREE.Vector3();
const tpLook = new THREE.Vector3();
const tpSmooth = new THREE.Vector3();
let tpSmoothInit = false;
function applyThirdPerson(dt) {
  const yaw = player.euler.y, pitch = player.euler.x;
  const dist = 4.6;
  tpCam.set(
    player.pos.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    player.pos.y + 1.1 - Math.sin(pitch) * dist * 0.9,
    player.pos.z + Math.cos(yaw) * Math.cos(pitch) * dist
  );
  // Kamera nicht unter den Boden
  const groundY = terrain.heightAt(tpCam.x, tpCam.z) + 0.4;
  if (tpCam.y < groundY) tpCam.y = groundY;
  // eigene Glättung — player.update setzt die Kamera jeden Frame neu
  if (!tpSmoothInit) { tpSmooth.copy(tpCam); tpSmoothInit = true; }
  tpSmooth.lerp(tpCam, Math.min(1, dt * 9));
  camera.position.copy(tpSmooth);
  tpLook.set(player.pos.x, player.pos.y - 0.55, player.pos.z);  // Brusthöhe des Avatars
  camera.lookAt(tpLook);
}

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
  hooks.openLife = () => { player.releaseLock(); ui.showLife(); };
  hooks.travelTo = (id) => game.travelTo(id);
  hooks.canTravel = (id) => game.canTravel(id);
  hooks.buyTravelGood = (c, g) => game.buyTravelGood(c, g);
  hooks.sellAtCity = (c, p2, n) => game.sellAtCity(c, p2, n);
  hooks.cityPrice = (c, p2) => game.cityPrice(c, p2);
  hooks.buyFactory = () => game.buyFactory();
  hooks.packBasket = () => game.packBasket();
  hooks.sellSuper = (n) => game.sellSuper(n);
  hooks.fulfillExport = (i) => game.fulfillExport(i);
  hooks.setIdentity = (n, l, o) => game.setIdentity(n, l, o);
  hooks.marry = () => game.marry();
  hooks.haveChild = () => game.haveChild();
  hooks.buyProperty = (id) => game.buyProperty(id);
  hooks.tradeStock = (id, n) => game.tradeStock(id, n);
  hooks.canFlyIstanbul = () => game.canFlyIstanbul();
  hooks.flyIstanbul = () => game.flyIstanbul();
  hooks.istanbulPrice = (p2) => game.istanbulPrice(p2);
  hooks.sellIstanbul = (p2, n) => game.sellIstanbul(p2, n);
  hooks.flyAlmanya = () => game.flyAlmanya();
  hooks.buyHomeUpgrade = () => game.buyHomeUpgrade();
  hooks.setRole = (r) => { const ok = game.setRole(r); if (ok && avatar) avatar.rebuild(); return ok; };
  hooks.buyFood = (id) => game.buyFood(id);
  hooks.rebuildAvatar = () => avatar && avatar.rebuild();
  hooks.buyRod = () => game.buyRod();
  hooks.buyBoat = () => game.buyBoat();
  hooks.playerShare = () => game.playerShare();
  hooks.storyCurrent = () => story.current();
  hooks.achCount = () => achievements.count();
  hooks.achTotal = () => achievements.total;
  hooks.achDefs = () => ACH_DEFS;
  hooks.takeLoan = (i) => game.takeLoan(i);
  hooks.repayLoan = () => game.repayLoan();
  hooks.toggleInsurance = () => game.toggleInsurance();
  hooks.setTeaStyle = (s) => game.setTeaStyle(s);
  hooks.buyGreenLine = () => game.buyGreenLine();
  hooks.promoteSofor = () => game.promoteSofor();
  hooks.playTavla = (s) => game.playTavla(s);
  hooks.joinKoop = () => game.joinKoop();
  hooks.repairVehicle = (id) => game.repairVehicle(id);
  hooks.buyTuning = (id, part) => game.buyTuning(id, part);
  hooks.buyDog = () => game.buyDog();
  hooks.newGamePlus = () => game.newGamePlus();
  hooks.ngpEligible = () => game.ngpEligible();
  hooks.seedPrice = (id) => game.seedPrice(id);
  hooks.bookVacation = (id) => game.bookVacation(id);
  hooks.setDecree = (id) => game.setDecree(id);
  hooks.taxiCost = (id) => game.taxiCost(id);
  hooks.callTaxi = (id) => game.callTaxi(id);
  hooks.forecast = () => game.forecast();
  hooks.marketTips = () => game.marketTips();
  hooks.haggleSell = (id) => game.haggleSell(id);
  hooks.brewReward = (s) => game.brewReward(s);
  hooks.buyNet = () => game.buyNet();
  hooks.buyMandira = () => game.buyMandira();
  hooks.buyRestaurant = () => game.buyRestaurant();
  hooks.buyHeli = () => game.buyHeli();
  hooks.buyDolmus = () => game.buyDolmus();
  hooks.hiveReward = (s) => game.hiveReward(s);
  hooks.karsikoyPrice = (p2) => game.karsikoyPrice(p2);
  hooks.sellKarsikoy = (p2, n) => game.sellKarsikoy(p2, n);
  hooks.macResult = (g) => game.macResult(g);
  hooks.collectCount = () => collectibles.count();
  hooks.collectTotal = () => collectibles.total;
  hooks.buyOrchard = () => game.buyOrchard();
  hooks.setLogi = (r, v) => game.setLogi(r, v);
  hooks.buyGulet = () => game.buyGulet();
  hooks.meisterResult = (avg) => game.meisterResult(avg);
  hooks.restoreKonak = () => game.restoreKonak();
  hooks.buyJointVenture = () => game.buyJointVenture();
  hooks.buyVillage = (id) => game.buyVillage(id);
  hooks.enterPhoto = () => { ui.hideOverlays(); game.pause(false); setPhotoMode(true); };
  hooks.radioNext = () => {
    if (!audio.ctx) audio.ensure();
    if (audio.ctx) radio.next(audio.ctx, audio.masterNode);
    return radio.stationName();
  };
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
  const startNow = () => {
    ui.hideStart();
    ui.refreshMoney();
    ui.refreshBasket();
    game.startDay();
    game.tutorialStart();
    save();
  };
  if (fresh && !state.introSeen) {
    state.introSeen = true;
    document.getElementById('start-screen').classList.add('hidden');
    runCinematic(startNow);
  } else startNow();
}

// ---------- Cinematic-Intro ----------
import { t } from './i18n.js';
let cinema = null;
function runCinematic(done) {
  const camCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(70, 26, -168),
    new THREE.Vector3(20, 15, -128),
    new THREE.Vector3(-14, 11, -104),
    new THREE.Vector3(-2, 12, -70),
    new THREE.Vector3(10, 8, -96)
  ]);
  const lookCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-30, 4, -110),
    new THREE.Vector3(CFG.hut.x, 3, CFG.hut.z),
    new THREE.Vector3(0, 8, -45),
    new THREE.Vector3(4, 9, -30),
    new THREE.Vector3(CFG.home.x, 3, CFG.home.z)
  ]);
  cinema = { t: 0, dur: 16, camCurve, lookCurve, done, textIdx: -1 };
  const el = document.getElementById('cinema');
  el.classList.remove('hidden');
  const skip = document.getElementById('btn-skip-cinema');
  skip.textContent = t('introSkip');
  skip.onclick = () => endCinematic();
  audio.gull && setTimeout(() => audio.gull(), 1200);
}

function endCinematic() {
  if (!cinema) return;
  document.getElementById('cinema').classList.add('hidden');
  const done = cinema.done;
  cinema = null;
  done();
}

function updateCinematic(dt) {
  const c = cinema;
  c.t += dt;
  const u = Math.min(c.t / c.dur, 1);
  const eased = u;   // konstante Fahrt wirkt ruhiger
  camera.position.copy(c.camCurve.getPointAt(eased));
  camera.lookAt(c.lookCurve.getPointAt(eased));
  // Text-Karten
  const idx = Math.min(2, Math.floor(u * 3));
  if (idx !== c.textIdx) {
    c.textIdx = idx;
    const te = document.getElementById('cinema-text');
    te.style.opacity = 0;
    setTimeout(() => {
      if (!cinema) return;
      te.textContent = t('intro' + (idx + 1));
      te.style.opacity = 1;
    }, 350);
  }
  if (u >= 1) endCinematic();
}

// ---------- Auto-Qualität ----------
let autoTuneOn = state.settings.quality === 'auto';
if (!autoTuneOn) applyQuality(state.settings.quality);
else applyQuality(isTouch ? 'low' : 'high');   // Mobil: klein anfangen, hochtunen
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
  get cc0() { return cc0; },
  get events() { return events; },
  get avatar() { return avatar; },
  get boat() { return boat; },
  get dog() { return dog; },
  get istanbul() { return istanbul; },
  get wildlife() { return wildlife; },
  get race() { return race; },
  get sled() { return sled; },
  get heli() { return heli; },
  get selale() { return selale; },
  get dolmus() { return dolmus; },
  get collectibles() { return collectibles; },
  get fireworks() { return fireworks; },
  get orchard() { return orchard; },
  get gulet() { return gulet; },
  get cats() { return cats; },
  get konak() { return konak; },
  get village() { return village; },
  get story() { return story; },
  get achievements() { return achievements; },
  setPhotoMode,
  setThirdPerson(v) { thirdPerson = v; },
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
let seasonSnow = 0, seasonAutumn = 0;

function step(rawDt, manual, skipRender = false) {
  const dt = Math.min(rawDt, 0.05);
  elapsedTime += dt;
  const elapsed = elapsedTime;

  if (cinema) updateCinematic(dt);

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
    } else if (emaDt < 0.012) {
      // Hochtunen, wenn Luft ist — Mobil bewusst maximal 'medium'
      if (qualityLevel === 'low') applyQuality('medium');
      else if (qualityLevel === 'medium' && !isTouch) applyQuality('high');
    }
  }

  const playing = game && game.running && !game.paused;

  if (game) game.update(dt, elapsed);
  if (game && vehicles) pollGamepad(dt);
  player.update(dt, state.upgrades.boots, game ? game.speedMul() : 1);
  if (photoMode) updatePhoto(dt);
  else if (thirdPerson && !vehicles?.driving && !boat?.driving && playing) applyThirdPerson(dt);
  if (avatar) {
    avatar.setVisible(thirdPerson && !vehicles?.driving);
    avatar.update(dt);
  }

  const growSpeed = game ? game.growSpeedFactor() : 1;
  const wind = game ? game.windStrength() : 0.5;
  teaField.update(playing ? dt : 0, growSpeed, elapsed, wind);
  sky.update(dt, player.pos, state);
  // v8: klare Sicht über den Bosporus — im İstanbul-Modus weniger Dunst
  if (game && game.istanbulMode) scene.fog.density *= 0.4;
  ocean.update(dt, elapsed, sky.rainT);
  grass.update(dt, elapsed, player.pos, wind);

  // v5: Jahreszeiten-Übergang weich blenden
  {
    const S = CFG.seasonCycle;
    const idx = window.__started ? seasonOf(state.day, CFG) : 0;
    seasonSnow += (S.snow[idx] - seasonSnow) * Math.min(1, dt * 0.4);
    seasonAutumn += (S.autumnTint[idx] - seasonAutumn) * Math.min(1, dt * 0.4);
    terrain.setSeason(seasonSnow, seasonAutumn);
    teaField.setSeason(seasonSnow, seasonAutumn);
    grass.setSeason(seasonSnow, seasonAutumn);
  }
  rain.update(dt, camera.position, sky.rainT * (1 - seasonSnow), sky.rainT * seasonSnow);
  birds.update(dt, elapsed);
  particles.update(dt);
  if (propsApi) {
    const elevN = Math.max(0, Math.sin((sky.hour - 6) / 14 * Math.PI));
    propsApi.update(dt, elevN, sky.rainT);
    farm.update(dt, elapsed);
    city.update(dt, elevN, sky.rainT, elapsed);
    vehicles.update(dt, elevN, sky.rainT);
    workers.update(dt, elapsed, playing && !game.winterRest());
    npcs.update(dt, elapsed);
    extras.update(dt, elevN, elapsed);
    airport.update(dt, elapsed);
    cc0.update(dt, player, vehicles.driving ? vehicles.speedKmh() / 3.6 : 0, elevN);
    boat.update(dt, elapsed);
    dog.update(dt, elapsed);
    istanbul.update(dt, elapsed);
    race.update(dt, elapsed, boat.pos, boat.driving);
    heli.update(dt, elapsed);
    selale.update(dt, elapsed);
    dolmus.update(dt);
    collectibles.update(dt, elapsed);
    gulet.update(dt, elapsed);
    cats.update(dt, elapsed, player.pos);
    fireworks.setActive(window.__started && game.isFestival() && game.isNight());
    fireworks.update(dt);
    orchard.setAutumn(seasonAutumn > 0.5);
    sled.setWinter(seasonSnow);
    if (playing) {
      story.update(dt);
      achievements.update(dt);
      wildlife.update(dt, elapsed, sky.hour);
      sled.update(dt, elapsed);
    }
    radio.update(audio.ctx);
    extras.setFestival(window.__started && game.isFestival());
    extras.setNight(window.__started && game.isNight());
    extras.setSummer(window.__started && game.season() === 0);
    minimap.update(dt);
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
