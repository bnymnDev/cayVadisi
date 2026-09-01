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
import { createTraffic } from './world/traffic.js';
import { createCityGrowth } from './world/citygrowth.js';
import { createKahyaNpc } from './world/kahya.js';
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
import { createVehModels } from './vehmodels.js';
import { setVehicleModels } from './vehicles.js';
import { createAda } from './world/ada.js';
import { createMemories } from './memories.js';
import { createWedding } from './wedding.js';
import { createFreighter } from './freighter.js';
import { createPanayir } from './world/panayir.js';
import { createMine } from './world/mine.js';
import { createFalcon } from './falcon.js';
import { createBridge } from './world/bridge.js';
import { createFactoryExt } from './world/factoryext.js';
import { createParcels } from './world/parcels.js';
import { createRailway } from './world/railway.js';
import { createLandslide } from './world/landslide.js';
import { createStall } from './world/stall.js';
import { createBeeCup } from './world/beecup.js';
import { createBillboards } from './world/billboards.js';
import { createValley2 } from './world/valley2.js';
import { createCirak } from './cirak.js';
import { createMuseum } from './world/museum.js';
import { createFlips } from './world/flips.js';
import { createPetrol } from './world/petrol.js';
import { createDiving } from './diving.js';
import { createCampfire } from './world/campfire.js';
import { createFestival2 } from './world/festival2.js';
import { createMotoRace } from './world/motorace.js';
import { createPlaneTree } from './world/planetree.js';
import { createPostcards } from './world/postcards.js';
import { createSeasonFest } from './world/seasonfest.js';
import { createWildAnimals } from './world/wildanimals.js';
import { createGhostHouse } from './world/ghosthouse.js';
import { createChild } from './world/child.js';
import { createGoatPath } from './world/goatpath.js';
import { createRiddle } from './world/riddle.js';
import { createBees, createRadyoMast, createBuddy, createIcePond, createKonakInt } from './world/vadi25.js';
import { loadCustomModels } from './custom.js';
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
// v25.7: Mini-Versionsbadge dauerhaft im Spiel (oben mittig) — jeder
// Screenshot zeigt damit sofort, welche Version das Gerät wirklich ausführt.
{
  const hv = document.createElement('div');
  hv.textContent = 'v' + CFG.version;
  hv.style.cssText = 'position:fixed;top:3px;left:50%;transform:translateX(-50%);'
    + 'font-size:10px;line-height:1;opacity:0.55;z-index:12;color:#fff;'
    + 'pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.8)';
  document.body.appendChild(hv);
}
// v25.2: sichtbare Versionsnummer (Start + Pause) — zeigt sofort, ob ein
// alter Cache noch die vorige Version ausliefert.
for (const pid of ['start-screen', 'pause-screen']) {
  const host = document.getElementById(pid);
  if (host) {
    const v = document.createElement('div');
    v.textContent = 'v' + CFG.version;
    v.style.cssText = 'position:absolute;right:10px;bottom:8px;font-size:11px;opacity:0.55;pointer-events:none';
    host.appendChild(v);
  }
}
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

const canvas = document.getElementById('scene');
const isTouch = matchMedia('(pointer: coarse)').matches;
// v25.3: Grafik-Diagnose-Flags (Pausenmenü, nur Mobil) — überleben Reloads.
let gfx = {};
try { gfx = JSON.parse(localStorage.getItem('cayvadisi_gfx') || '{}') || {}; } catch (e) { gfx = {}; }
// v25.1/25.3: Mobil rendert ohne Composer direkt in den Backbuffer.
// AA dort KOMPLETT aus: jede Version mit Flackern auf dem S24 hatte MSAA
// aktiv (erst Composer-Blit, dann Kontext-AA) — Xclipse/Adreno-Treiber
// haben bekannte MSAA-Resolve-Bugs.
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, powerPreference: 'default'   // v15.1: nicht zwanghaft die dGPU anwerfen
});
// v25.1: verlorener WebGL-Kontext (Mobil-GPU-Reset) → sauber neu laden
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  setTimeout(() => location.reload(), 800);
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = !isTouch;   // v25.2: Mobil ohne Schattenkarte (Flacker-Quelle)
renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // v10: weiche Schatten
// v15.1: Schattenkarte nur periodisch neu rendern — die Sonne wandert langsam
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(69, innerWidth / innerHeight, 0.1, 1400);

const loadingManager = new THREE.LoadingManager();

const ctx = { renderer, scene, camera, loadingManager, isTouch, gfx };

// ---------- Composer ----------
// Hinweis: bewusst KEIN Bloom — die HDR-Sonnenscheibe des Sky-Shaders
// überstrahlt sonst die halbe Szene. MSAA + ACES reichen für den Look.
// Mobil: HalfFloat + 4×MSAA flackert auf vielen Mobil-GPUs (Adreno/Mali,
// iOS) — dort RGBA8 mit 2×MSAA, das ist überall stabil.
// v25.5: Mobil rendert in ein Offscreen-Target OHNE MSAA (samples: 0) und
// bringt das Bild mit einem simplen Vollbild-Quad auf den Schirm. Der
// Xclipse-Treiber (Exynos-S24, Chrome/Vulkan) präsentiert den Backbuffer
// sonst kachelweise unfertig (schwarze Bänder) — direkter Render (v25.1-4)
// und MSAA-Targets (bis v25) flackerten beide.
const rt = new THREE.WebGLRenderTarget(1, 1, isTouch
  ? { samples: 0, type: THREE.UnsignedByteType }
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
let traffic = null, cityGrowth = null;
let kahyaNpc = null;
let timeScale = 1;   // v31: Zeitraffer ×1/×2/×4
let cc0 = null, airport = null, avatar = null, events = null;
let boat = null, story = null, achievements = null, radio = null, yaylaApi = null;
let dog = null, istanbul = null, wildlife = null, race = null, sled = null;
let heli = null, selale = null;
let dolmus = null, collectibles = null, karsikoy = null;
let fireworks = null, orchard = null;
let gulet = null, cats = null, konak = null, village = null;
let ada = null, memories = null;
let wedding = null, freighter = null, panayir = null, mine = null, falcon = null, bridgeMod = null;
let factoryext = null, parcels = null, railwayMod = null, landslideMod = null, stallMod = null, beecup = null, billboardsMod = null;
let valley2 = null, cirakMod = null, museumMod = null;
let flipsMod = null, petrolMod = null;
let divingMod = null, campfireMod = null, festival2Mod = null, motoraceMod = null, planetreeMod = null, postcardsMod = null;
let seasonfestMod = null, wildMod = null, ghostMod = null, childMod = null;
let goatpathMod = null, riddleMod = null;
let beesMod = null, radyoMastMod = null, buddyMod = null, icePondMod = null, konakIntMod = null;
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
  grass.setQuality(isTouch && gfx.noGrass ? 0 : q.grass, q.grassR);   // v25.3: Diagnose
  sky.setShadowSize(q.shadow);
  teaField.setCastShadow(level !== 'low');
  const pr = Math.min(devicePixelRatio || 1, q.pr, isTouch ? 1.3 : 99);   // v25.1: Mobil-Deckel
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
  const vehModels = createVehModels(ctx);
  await Promise.all([chars.load(), animals3d.load(), vehModels.load()]);
  setVehicleModels(vehModels);   // v13.6: vor createVehicles/createDolmus setzen
  cc0 = await createCc0Props(ctx, terrain);
  farm = createFarm(ctx, terrain, p.mats, animals3d);
  city = createCity(ctx, terrain, p.mats);
  traffic = createTraffic(ctx, terrain);
  cityGrowth = createCityGrowth(ctx, terrain, allColliders, chars);
  kahyaNpc = createKahyaNpc(ctx, terrain, chars);
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
  memories = createMemories(ctx, terrain);
  wedding = createWedding(ctx, terrain, chars, audio);
  freighter = createFreighter(ctx);
  panayir = createPanayir(ctx, terrain);
  mine = createMine(ctx, terrain);
  falcon = createFalcon(ctx, terrain, player);
  // v17: Imperium-Weltmodule
  factoryext = createFactoryExt(ctx, terrain);
  parcels = createParcels(ctx, terrain);
  railwayMod = createRailway(ctx, terrain);
  landslideMod = createLandslide(ctx, terrain);
  stallMod = createStall(ctx, terrain, chars);
  beecup = createBeeCup(ctx, terrain, chars);
  billboardsMod = createBillboards(ctx, terrain);
  cirakMod = createCirak(ctx, terrain, chars);      // v19
  museumMod = createMuseum(ctx, terrain);           // v19
  flipsMod = createFlips(ctx, terrain);             // v20
  petrolMod = createPetrol(ctx, terrain);           // v21
  divingMod = createDiving(ctx, terrain);           // v22
  campfireMod = createCampfire(ctx, terrain);
  festival2Mod = createFestival2(ctx, terrain, chars);
  motoraceMod = createMotoRace(ctx, terrain);
  postcardsMod = createPostcards(ctx, terrain);
  seasonfestMod = createSeasonFest(ctx, terrain);   // v23
  wildMod = createWildAnimals(ctx, terrain);
  ghostMod = createGhostHouse(ctx, terrain);
  childMod = createChild(ctx, terrain, chars);
  riddleMod = createRiddle(ctx, terrain);          // v24
  beesMod = createBees(ctx, terrain);              // v25
  radyoMastMod = createRadyoMast(ctx, terrain);
  buddyMod = createBuddy(ctx, terrain, chars);
  icePondMod = createIcePond(ctx, terrain, chars);
  allColliders.push(...ghostMod.colliders, ...riddleMod.colliders);
  allColliders.push(...flipsMod.colliders, ...petrolMod.colliders);
  allColliders.push(...stallMod.colliders, landslideMod.collider);
  allColliders.push(...mine.colliders);
  allColliders.push(...selale.colliders, ...karsikoy.colliders, ...konak.colliders, ...village.colliders);
  // v14: Arcade-Automat vorm Çayevi
  {
    const cab = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x24455a, roughness: 0.5 }));
    bodyM.position.y = 0.85;
    cab.add(bodyM);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x0d1a24, emissive: 0x2a9bd8, emissiveIntensity: 0.7 }));
    screen.position.set(0, 1.25, 0.36);
    screen.rotation.x = -0.15;
    cab.add(screen);
    cab.position.set(CFG.arcade.spot.x, terrain.heightAt(CFG.arcade.spot.x, CFG.arcade.spot.z), CFG.arcade.spot.z);
    cab.rotation.y = -0.6;
    cab.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(cab);
    allColliders.push({ x: CFG.arcade.spot.x, z: CFG.arcade.spot.z, r: 0.7 });
  }
  if (state.upgrades.expand) teaField.setExtension(true);   // v9: gekaufte Parzellen laden
  const gameMods = {
    terrain, tea: teaField, props: p, player, audio, ui, particles, sky,
    farm, city, vehicles, workers, extras, events, boat, radio, yayla: yaylaApi, dog,
    race, sled, heli, selale, cc0, dolmus, collectibles, orchard,
    gulet, cats, konak, village, memories, wedding, freighter, panayir, mine, falcon,
    factoryext, parcels, railway: railwayMod, landslide: landslideMod,
    stall: stallMod, beecup, billboards: billboardsMod,
    cirak: cirakMod, museum: museumMod, flips: flipsMod, petrol: petrolMod,
    diving: divingMod, campfire: campfireMod, festival2: festival2Mod,
    motorace: motoraceMod, planetree: null,
    seasonfest: seasonfestMod, wildanimals: wildMod, ghost: ghostMod, child: childMod,
    goatpath: null, riddle: riddleMod,
    bees: beesMod, radyomast: radyoMastMod, buddy: buddyMod, icepond: icePondMod,   // v25
    konakint: null,
    istanbul: null, npcs: null, ada: null, bridge: null
  };
  game = createGame(ctx, gameMods);
  minimap = createMinimap(ctx, terrain, player, () => workers.list(), () => vehicles.fleet);
  // İstanbul NACH der Minimap erzeugen (die Höhen-Zone darf nicht mitgebacken werden)
  istanbul = createIstanbul(ctx, terrain);
  gameMods.istanbul = istanbul;
  allColliders.push(...istanbul.colliders);
  // v14: Ada ebenfalls NACH der Minimap (eigene Höhen-Zone, siehe CLAUDE.md)
  ada = createAda(ctx, terrain, p.mats);
  gameMods.ada = ada;
  allColliders.push(...ada.colliders);
  bridgeMod = createBridge(ctx, terrain);   // v15: Zone erst beim Bau — trotzdem nach Minimap
  gameMods.bridge = bridgeMod;
  // v24: Ziegen-Bergpfad — Zonen ebenfalls NACH der Minimap
  goatpathMod = createGoatPath(ctx, terrain);
  gameMods.goatpath = goatpathMod;
  // v25: Konak-Innenraum — Höhen-Zone ebenfalls NACH der Minimap (siehe CLAUDE.md)
  konakIntMod = createKonakInt(ctx, terrain);
  gameMods.konakint = konakIntMod;
  // v22: Platanenbaum — Plattform-Zone ebenfalls NACH der Minimap
  planetreeMod = createPlaneTree(ctx, terrain);
  gameMods.planetree = planetreeMod;
  allColliders.push(...planetreeMod.colliders);
  // v18: Fındık Vadisi — Höhen-Zone ebenfalls NACH der Minimap (siehe CLAUDE.md)
  valley2 = createValley2(ctx, terrain, chars);
  gameMods.valley2 = valley2;
  allColliders.push(...valley2.colliders);
  // v18: eigene TRELLIS-/Custom-Modelle einstreuen (no-op ohne index.json)
  loadCustomModels(ctx, terrain);
  npcs = createNpcs(ctx, terrain, ui, player, () => game.playerShare(), chars);
  postcardsMod.sync(npcs);   // v22: hängende Postkarten wiederherstellen
  gameMods.npcs = npcs;
  ui.bindTouch(player, vehicles, boat, () => game);
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
  if (e.code === 'KeyF' && CFG.photoEnabled && game && game.running && !ui.overlayOpen()) setPhotoMode(!photoMode);   // v24: abschaltbar
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
function applyThirdPerson(dt, soft = false) {
  const yaw = player.euler.y, pitch = player.euler.x;
  const dist = soft ? 5.4 : 4.6;   // v31: Bot-Kamera etwas weiter weg
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
  tpSmooth.lerp(tpCam, Math.min(1, dt * (soft ? 3.5 : 9)));   // v31: Bot-Kamera gleitet
  camera.position.copy(tpSmooth);
  tpLook.set(player.pos.x, player.pos.y - 0.55, player.pos.z);  // Brusthöhe des Avatars
  camera.lookAt(tpLook);
}

function wireHooks() {
  hooks.sellValue = () => game.sellValue();
  hooks.buyUpgrade = (id) => game.buyUpgrade(id);
  hooks.doSell = () => game.doSell();
  hooks.rescueHome = () => game.rescueHome();
  hooks.buyNextParcel = () => game.buyNextParcel();
  hooks.nextParcelInfo = () => game.nextParcelInfo();
  hooks.toggleKahya = () => game.toggleKahya();
  hooks.buyShop = (id) => game.buyShop(id);
  hooks.toggleKahyaPlan = (k) => game.toggleKahyaPlan(k);
  hooks.cycleKahyaReserve = () => game.cycleKahyaReserve();
  hooks.timeScale = () => timeScale;
  hooks.cycleTimeScale = () => {
    const T = CFG.timeScales;
    timeScale = T[(T.indexOf(timeScale) + 1) % T.length];
    ui.setTcState('ff', timeScale > 1);
    ui.toast(t('timeScale', timeScale), timeScale > 1, 3000);
    return timeScale;
  };
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
  hooks.lineForecast = () => game.lineForecast();
  hooks.runShift = () => game.runShift();
  hooks.buyCoal = () => game.buyCoal();
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
  hooks.story3Choose = (p2) => game.story3Choose(p2);
  hooks.arcadeStart = () => game.arcadeStart();
  hooks.arcadeResult = (s2) => game.arcadeResult(s2);
  hooks.buyFreighter = () => game.buyFreighter();
  hooks.shipFreight = (r2, ins) => game.shipFreight(r2, ins);
  hooks.buyLot = () => game.buyLot();
  hooks.kraftResult = (s2) => game.kraftResult(s2);
  hooks.mineReward = (s2) => game.mineReward(s2);
  hooks.weddingContribute = (id) => game.weddingContribute(id);
  hooks.weddingPlan = () => game.weddingPlan();
  hooks.buyLine = () => game.buyLine();
  hooks.bookCampaign = () => game.bookCampaign();
  hooks.stallStock = (id, n) => game.stallStock(id, n);
  hooks.stallCycleFactor = () => game.stallCycleFactor();
  hooks.enterBeeCup = () => game.enterBeeCup();
  hooks.buyQueen = () => game.buyQueen();
  hooks.featureOn = (id) => game.featureOn(id);
  hooks.buyBranch = () => game.buyBranch();
  hooks.branchHire = () => game.branchHire();
  hooks.branchMode = () => game.branchMode();
  hooks.taxiValley2 = () => game.taxiValley2();
  hooks.hireCirak = () => game.hireCirak();
  hooks.trainCirak = () => game.trainCirak();
  hooks.canavarResult = (s2) => game.canavarResult(s2);
  hooks.story4Sell = () => game.story4Sell();
  hooks.story4Refuse = () => game.story4Refuse();
  hooks.story4Finale = (c2) => game.story4Finale(c2);
  hooks.npcName = (i2) => npcs ? npcs.nameOf(i2) : '?';
  hooks.storeBasket = () => game.storeBasket();
  hooks.sellStore = () => game.sellStore();
  hooks.buyFlip = (i2) => game.buyFlip(i2);
  hooks.renoFlip = (i2) => game.renoFlip(i2);
  hooks.sellFlip = (i2) => game.sellFlip(i2);
  hooks.rentFlip = (i2) => game.rentFlip(i2);
  hooks.buyPetrol = () => game.buyPetrol();
  hooks.buyWerkstatt = () => game.buyWerkstatt();
  hooks.buyMask = () => game.buyMask();
  hooks.startDive = () => game.startDive();
  hooks.trainDog = (tr2) => game.trainDog(tr2);
  hooks.treeBuild = () => game.treeBuild();
  hooks.treeClimb = () => game.treeClimb();
  hooks.postcardReward = (i2) => game.postcardReward(i2);
  hooks.npcCount = () => npcs ? npcs.count : 0;
  hooks.postcardsSync = () => postcardsMod && postcardsMod.sync(npcs);
  hooks.buyKemence = () => game.buyKemence();
  hooks.buskResult = (s2) => game.buskResult(s2);
  hooks.arcade2Result = (s2) => game.arcade2Result(s2);
  hooks.cookDish = (id2) => game.cookDish(id2);
  hooks.setRadyoProgram = (p2) => game.setRadyoProgram(p2);   // v25
  hooks.enterPhoto = () => { if (!CFG.photoEnabled) return; ui.hideOverlays(); game.pause(false); setPhotoMode(true); };
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
  // v31: „Yenilikler" — einmal pro Version zeigen, was neu ist
  try {
    if (localStorage.getItem('cayvadisi_seenVer') !== CFG.version) {
      localStorage.setItem('cayvadisi_seenVer', CFG.version);
      setTimeout(() => ui.showWhatsNew(), 5000);
    }
  } catch (e) { /* privater Modus */ }
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

// ---------- v18: Feature-Reveal (GTA-Style-Kameraschwenk) ----------
let reveal = null;
ctx.revealActive = () => !!reveal;
ctx.runReveal = (opts) => {
  if (reveal || cinema) return false;
  const tx = opts.x, tz = opts.z;
  const ty = terrain.heightAt(tx, tz);
  const start = camera.position.clone();
  const mid = new THREE.Vector3((start.x + tx) / 2, Math.max(start.y, ty) + 34, (start.z + tz) / 2);
  const end = new THREE.Vector3(tx + 10, ty + 16, tz + 14);
  reveal = {
    t: 0, dur: 7,
    camCurve: new THREE.CatmullRomCurve3([start, mid, end]),
    look: new THREE.Vector3(tx, ty + 1.5, tz),
    wasLocked: player.locked
  };
  player.setEnabled(false);
  player.releaseLock();
  if (game) game.setFrozen(true);
  const el = document.getElementById('cinema');
  el.classList.remove('hidden');
  const te = document.getElementById('cinema-text');
  te.innerHTML = `<b>${opts.title}</b><br>${opts.text}`;
  te.style.opacity = 1;
  const skip = document.getElementById('btn-skip-cinema');
  skip.textContent = t('revealOk');
  skip.onclick = () => endReveal();
  audio.tierUp && audio.tierUp();
  return true;
};
function endReveal() {
  if (!reveal) return;
  document.getElementById('cinema').classList.add('hidden');
  reveal = null;
  if (game) game.setFrozen(false);
  player.setEnabled(true);
  if (!ctx.isTouch) player.requestLock();
}
function updateReveal(dt) {
  const r = reveal;
  r.t += dt;
  const u = Math.min(r.t / r.dur, 1);
  const eased = u < 0.7 ? (u / 0.7) : 1;   // hinfliegen, dann stehen und wirken lassen
  camera.position.copy(r.camCurve.getPointAt(Math.min(0.999, eased)));
  camera.lookAt(r.look);
  if (r.t >= r.dur + 2.5) endReveal();
}

// ---------- v19: Drohnen-Übersicht (M lang halten) ----------
let droneMode = false;
const droneKeys = {};
const dronePos = { x: 0, z: 0, h: CFG.drone.height };
const droneHud = document.createElement('div');
droneHud.id = 'drone-hud';
droneHud.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);'
  + 'background:rgba(10,20,16,.72);color:#e8f0dc;padding:10px 18px;border-radius:12px;'
  + 'font:14px/1.5 system-ui,sans-serif;z-index:40;display:none;text-align:center;pointer-events:none;max-width:80vw';
document.body.appendChild(droneHud);
let droneHudTimer = 0;

let droneQualityBefore = null;
function setDroneMode(v) {
  droneMode = v;
  droneHud.style.display = v ? '' : 'none';
  if (v) {
    dronePos.x = player.pos.x;
    dronePos.z = player.pos.z;
    dronePos.h = CFG.drone.height;
    player.setEnabled(false);
    player.releaseLock();
    droneHudTimer = 0;
    // Ganzes Tal im Bild = teuer: für den Flug auf 'low' schalten
    droneQualityBefore = qualityLevel;
    if (qualityLevel !== 'low') applyQuality('low');
    audio.gull && audio.gull();
  } else {
    if (droneQualityBefore && droneQualityBefore !== 'low') applyQuality(droneQualityBefore);
    droneQualityBefore = null;
    player.setEnabled(true);
    if (!ctx.isTouch) player.requestLock();
  }
}

function updateDrone(dt) {
  const sp = CFG.drone.speed * dt * (dronePos.h / CFG.drone.height);
  if (droneKeys.KeyW || droneKeys.ArrowUp) dronePos.z -= sp;
  if (droneKeys.KeyS || droneKeys.ArrowDown) dronePos.z += sp;
  if (droneKeys.KeyA || droneKeys.ArrowLeft) dronePos.x -= sp;
  if (droneKeys.KeyD || droneKeys.ArrowRight) dronePos.x += sp;
  const lim = CFG.worldSize / 2 - 10;
  dronePos.x = Math.max(-lim, Math.min(lim, dronePos.x));
  dronePos.z = Math.max(-lim, Math.min(lim, dronePos.z));
  camera.position.set(dronePos.x, dronePos.h, dronePos.z + 14);
  camera.lookAt(dronePos.x, 0, dronePos.z);
  droneHudTimer -= dt;
  if (droneHudTimer <= 0 && game) {
    droneHudTimer = 1;
    const d = game.droneInfo();
    let line2 = '';
    if (d.bestProd) line2 += `📈 ${t('prod_' + d.bestProd)} +${d.bestMul - 100}% `;
    line2 += `· 🚩 ${d.myParcels} (${d.freeParcels} ${t('droneFree')}) · 👷 ${d.workers}`;
    if (d.lines > 0) line2 += ` · 🏭 ${d.lines}`;
    if (d.branch >= 0) line2 += ` · 🌰 ${d.branch}`;
    if (d.fair) line2 += ' · 🎪';
    droneHud.innerHTML = `<b>🚁 ${t('droneTitle')}</b><br>${line2}<br><span style="opacity:.7">${t('droneHint')}</span>`;
  }
}

// v22: Tasten unter Wasser an die Tauchsteuerung leiten
window.addEventListener('keydown', (e) => { if (divingMod && divingMod.active) divingMod.keyDown(e.code); });
window.addEventListener('keyup', (e) => { if (divingMod) divingMod.keyUp(e.code); });

let mHoldTimer = null;
window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (droneMode) {
    droneKeys[e.code] = true;
    if (e.code === 'KeyM' && !e.repeat) { window.__droneSuppressM = true; setDroneMode(false); }
    if (e.code === 'Escape') { e.stopImmediatePropagation(); setDroneMode(false); }
    return;
  }
  if (e.code === 'KeyM' && !e.repeat && window.__started && game && game.running
      && !game.paused && !ui.overlayOpen() && !photoMode && !vehicles?.driving) {
    mHoldTimer = setTimeout(() => { window.__droneSuppressM = true; setDroneMode(true); }, 550);
  }
}, { capture: true });
window.addEventListener('keyup', (e) => {
  droneKeys[e.code] = false;
  if (e.code === 'KeyM' && mHoldTimer) { clearTimeout(mHoldTimer); mHoldTimer = null; }
});
window.addEventListener('wheel', (e) => {
  if (!droneMode) return;
  dronePos.h = Math.max(CFG.drone.minH, Math.min(CFG.drone.maxH, dronePos.h + e.deltaY * 0.08));
}, { passive: true });

// ---------- Auto-Qualität ----------
let autoTuneOn = state.settings.quality === 'auto';
if (!autoTuneOn) applyQuality(state.settings.quality);
else applyQuality(isTouch ? 'low' : 'high');   // Mobil: klein anfangen, hochtunen
let emaDt = 1 / 60, tuneTimer = 0;

// v26: einmaliger Hinweis — Querformat + Vollbild spielt sich am besten
if (isTouch && matchMedia('(orientation: portrait)').matches) {
  try {
    if (!localStorage.getItem('cayvadisi_rot_hint')) {
      localStorage.setItem('cayvadisi_rot_hint', '1');
      setTimeout(() => { if (window.__started) ui.toast(t('rotateHint'), false, 9000); }, 15000);
    }
  } catch (e) { /* egal */ }
}

// ---------- Debug-API (für Tests) ----------
window.__game = {
  state, player, sky, camera, renderer, composer, scene, THREE, ctx, terrain,
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
  get ada() { return ada; },
  get memories() { return memories; },
  get wedding() { return wedding; },
  get freighter() { return freighter; },
  get panayir() { return panayir; },
  get falcon() { return falcon; },
  get bridge() { return bridgeMod; },
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

// v15.1: Energie-Drossel — ohne FPS-Limit rannte das Spiel auf schnellen
// Notebooks mit 100+ FPS ins GPU-Limit (Hitze, Akku leer in Minuten).
let onBattery = false;
if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    const upd = () => { onBattery = !b.charging; };
    upd();
    b.addEventListener('chargingchange', upd);
  }).catch(() => {});
}
function currentFpsCap() {
  // Menü, Pause und offene Fenster brauchen keine 60 FPS
  if (!window.__started) return 30;
  if (game && (!game.running || game.paused)) return 15;
  if (ui.overlayOpen && ui.overlayOpen()) return 20;
  const eco = state.settings.eco || 'auto';
  if (eco === 'eco') return 30;
  if (eco === 'auto' && onBattery) return 30;
  return 60;
}
let shadowTimer = 0;

function tick() {
  requestAnimationFrame(tick);
  const now = performance.now();
  const rawDt = Math.max(0, (now - lastNow) / 1000);
  if (rawDt < 1 / currentFpsCap() - 0.0005) return;   // Frame auslassen — GPU ruht
  lastNow = now;
  // Schatten höchstens 4× pro Sekunde aktualisieren (Mobil: gar nicht)
  if (!isTouch) {
    shadowTimer -= rawDt;
    if (shadowTimer <= 0) {
      shadowTimer = 0.25;
      renderer.shadowMap.needsUpdate = true;
    }
  }
  // v31: Zeitraffer — mehrere Sim-Schritte pro Frame, nur der letzte rendert
  const ts = (game && game.running && !game.paused && !ui.overlayOpen()) ? timeScale : 1;
  for (let i = 0; i < ts; i++) step(rawDt, false, i < ts - 1);
}

let menuYaw = Math.PI * 0.86;
const menuEuler = new THREE.Euler(-0.05, 0, 0, 'YXZ');
let seasonSnow = 0, seasonAutumn = 0;

function step(rawDt, manual, skipRender = false) {
  const dt = Math.min(rawDt, 0.05);
  elapsedTime += dt;
  const elapsed = elapsedTime;

  if (cinema) updateCinematic(dt);
  if (reveal) updateReveal(dt);

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
  else if (droneMode) updateDrone(dt);
  else if (reveal) { camera.position.copy(reveal.camCurve.getPointAt(Math.min(0.999, reveal.t / reveal.dur < 0.7 ? reveal.t / reveal.dur / 0.7 : 1))); camera.lookAt(reveal.look); }
  else if ((thirdPerson || (game && game.autoFarmOn)) && !vehicles?.driving && !boat?.driving && playing) applyThirdPerson(dt, !thirdPerson);   // v31: ruhige Bot-Kamera
  if (avatar) {
    avatar.setVisible((thirdPerson || !!(game && game.autoFarmOn)) && !vehicles?.driving);
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
    if (traffic) traffic.update(dt);
    if (cityGrowth) cityGrowth.update(dt, elevN, elapsed);
    if (kahyaNpc) kahyaNpc.update(dt, sky.hour, playing);
    vehicles.update(dt, elevN, sky.rainT);
    workers.update(dt, elapsed, playing && !game.winterRest());
    npcs.update(dt, elapsed, sky.hour);
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
    if (ada) ada.update(dt, elapsed, window.__started && game.isNight());
    if (memories) memories.update(elapsed);
    if (wedding) wedding.update(dt, elapsed);
    if (freighter) freighter.update(dt, elapsed);
    if (panayir) panayir.update();
    if (falcon) falcon.update(dt, elapsed);
    if (bridgeMod) bridgeMod.update(dt, elapsed, player.pos);
    if (valley2) valley2.update(dt, elapsed);
    if (cirakMod) cirakMod.update(dt);
    if (petrolMod) petrolMod.update(dt,
      window.__started && game && game.running && !game.paused && !game.isNight(),
      () => game.petrolPay());
    if (divingMod) divingMod.update(dt, elapsed);
    if (campfireMod) campfireMod.update(dt, elapsed, window.__started && game && game.isNight());
    if (festival2Mod) festival2Mod.update(dt, elapsed, sky.hour);
    if (motoraceMod) motoraceMod.update(dt, elapsed, game ? game.motoRaceTime : -1);
    if (planetreeMod) planetreeMod.update(dt, elapsed);
    if (seasonfestMod) seasonfestMod.update(dt, elapsed, window.__started && game && game.isNight());
    if (wildMod) wildMod.update(dt, elapsed, sky.hour, player.pos);
    if (ghostMod) ghostMod.update(dt, elapsed, window.__started && game && game.isNight());
    if (childMod) childMod.update(dt);
    if (goatpathMod) goatpathMod.update(dt, elapsed);
    if (beesMod) beesMod.update(dt, elapsed);
    if (radyoMastMod) radyoMastMod.update(dt, elapsed, window.__started && game && game.isNight());
    if (buddyMod) buddyMod.update(dt);
    if (icePondMod) icePondMod.update(dt, elapsed);
    if (factoryext) factoryext.update(dt);
    if (parcels) parcels.update(dt, elapsed);
    if (railwayMod) railwayMod.update(dt);
    if (beecup) beecup.update(dt, elapsed);
    if (stallMod) stallMod.update(dt, elapsed,
      window.__started && game && game.running && !game.paused && !game.isNight(),
      () => game.stallCustomer());
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
    // v31: Stadt-Ambiente wächst mit der Ausbaustufe, hörbar nur in Stadtnähe
    const cityD = Math.hypot(player.pos.x - CFG.city.x, player.pos.z - CFG.city.z);
    const cityLvl = cityGrowth ? (cityGrowth.stage() / 3) * Math.max(0, Math.min(1, 1 - (cityD - 30) / 80)) : 0;
    audio.update(dt, seaDist, wind, sky.rainT, player.moving, player.running, cityLvl);
  }

  hudTimer += dt;
  if (hudTimer > 0.25) {
    hudTimer = 0;
    ui.refreshClock(sky.hour);
    ui.refreshMoney();
  }
  ui.updateMarker(camera);

  if (!skipRender) {
    // v25.5: Standard ist überall der Composer (Mobil ohne MSAA, s. oben).
    // Diagnose-Schalter „Render-Pfad" erzwingt den direkten Backbuffer-Weg.
    if (isTouch && gfx.directRender) renderer.render(scene, camera);
    else composer.render();
  }
}

onResize();
tick();
