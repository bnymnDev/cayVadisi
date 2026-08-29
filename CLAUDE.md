# Çay Vadisi — Projekt-Notizen

First-Person/Third-Person-Farmsimulation (three.js, Vanilla ES-Module, **kein Build-Schritt**,
komplett offline, DE/TR). Start: `npm start` → `http://localhost:8137`.

## Architektur-Regeln
- Kein Bundler, kein Framework: Module unter `js/`, three.js gevendort unter `vendor/`.
- Alle Sounds prozedural (WebAudio) — keine Audiodateien.
- Assets: Poly Haven / ambientCG (CC0). Neue Modelle über `tools/download_extra_models.py`
  nach `assets/models/extra/<slug>/` (plain glTF + Texturen, kein Meshopt nötig).
- Menschen: geriggtes GLB `assets/models/extra/human/human.glb` (Quaternius CC0,
  aus FBX via `npm i fbx2gltf` → `FBX2glTF --binary` konvertiert; Anims Idle/Walk/
  Run/Working). Instanzen via `js/chars.js` (SkeletonUtils-Klone + Palettentextur-
  Tausch); `makeWorkerMesh` bleibt als Fallback.
- Sky-Sonnenscheibe NIEMALS ins Environment-PMREM backen (`showSunDisc = 0` im envSky),
  sonst Inf/NaN → komplett schwarze Szene.
- Spielstand: `localStorage` (`cayvadisi_save_v2`), `state.js` migriert ältere Stände.
- Tests: headless Playwright gegen `http://127.0.0.1:8137` (localhost kann im Proxy-Setup
  hängen), Debug-API `window.__game` (`sim()` = Logik ohne Rendern, `shot()` = Canvas-JPEG).

## Roadmap / Merker
- **Multiplayer (Koop im Tal): vom Nutzer gewünscht, bewusst NOCH NICHT eingebaut.**
  Wenn es soweit ist: kleiner WebSocket-Server + Positions-/State-Sync, Save bleibt lokal.
- **Deployment: KEIN GitHub Pages** (Repo bleibt privat, kein Plan-Upgrade). Ziel ist
  eine **Subdomain auf nesbun.de** — statisches Hosting reicht (Dateien 1:1 hochladen),
  das PIN-Gate (js/gate.js, PIN cay1453) ist bereits auf `*.nesbun.de` scharf.
- İstanbul-Viertel: eigene Höhen-Zone via `terrain.addHeightZone` — wird bewusst NACH
  Terrain-Mesh & Minimap registriert, sonst erscheint die Kai-Platte im Gelände.
  Gleiches gilt für Ada (v14) und das Fındık Vadisi (v18, `js/world/valley2.js`).
- Geführter Fortschritt (v18): `CFG.progress.features` + `state.featureUnlocks`;
  Reveals laufen über `ctx.runReveal` in main.js (friert das Spiel via
  `game.setFrozen` ein). Alte Saves bekommen `featureUnlocks._all = true`.
- Cloud-Save: `cloudsave.php` (Mittwald-PHP auf nesbun.de, saves/-Ordner
  entsteht automatisch); der Service Worker cached `.php` bewusst nie.
- Eigene TRELLIS-/Custom-Modelle: `assets/models/extra/custom/index.json`
  (nicht eingecheckt) → `js/custom.js`; Doku in `tools/TRELLIS.md`.
- Ideen-Backlog: TRELLIS-2-Pipeline für eigene Bild→3D-Assets (lokal generieren, als glTF ablegen).
