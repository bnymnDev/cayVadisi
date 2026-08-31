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
- **Mobil-Stabilität (v25.1/25.2):** Auf Touch-Geräten (`ctx.isTouch`) laufen
  NIEMALS: EffectComposer (direktes renderer.render + Kontext-AA), PMREM-Env-
  Bakes (sky.js — Hemi/Sonne kompensieren stattdessen), Schattenkarten und der
  Istanbul-Reflector (einfache Wasserfläche). Alles davon erzeugte schwarze
  Frame-Flacker auf Adreno/Mali/iOS. Ebenso NIEMALS `backdrop-filter` über
  dem Canvas (v25.4, Samsung-Compositor-Bug — per CSS-Media-Query pointer:
  coarse global deaktiviert). Versionsbadge (CFG.version) unten rechts
  auf Start-/Pausescreen zeigt, welche Version ein Gerät wirklich ausführt.
- Auf Touch NIEMALS Geometrien mit 32-Bit-Index (>65.535 Vertices) — der
  Terrain-Mesh läuft dort mit 254 statt 256 Segmenten (16-Bit-Index);
  32-Bit-Index-Fetches erzeugten auf dem S24 schwarze Dreiecks-Spieße.
- Sky-Sonnenscheibe NIEMALS ins Environment-PMREM backen (`showSunDisc = 0` im envSky),
  sonst Inf/NaN → komplett schwarze Szene.
- Spielstand: `localStorage` (`cayvadisi_save_v2`), `state.js` migriert ältere Stände.
- Tests: headless Playwright gegen `http://127.0.0.1:8137` (localhost kann im Proxy-Setup
  hängen), Debug-API `window.__game` (`sim()` = Logik ohne Rendern, `shot()` = Canvas-JPEG).

## Roadmap / Merker
- **Multiplayer (Koop im Tal): vom Nutzer gewünscht, bewusst NOCH NICHT eingebaut.**
  Wenn es soweit ist: kleiner WebSocket-Server + Positions-/State-Sync, Save bleibt lokal.
- **Deployment: KEIN GitHub Pages** (Repo bleibt privat). Live: **cayvadisi.nesbun.de**
  (Mittwald, Projekt `p-ng6rad`, PHP-App `a-kzcb7x` unter
  `/home/p-ng6rad/html/cayvadisi-php-k0qxx`). Das PIN-Gate (js/gate.js, PIN cay1453)
  ist auf `*.nesbun.de` scharf.
- **Deploy-Verfahren (nach JEDEM Release durchführen, vom Nutzer gewünscht):**
  1. Mittwald-MCP: temporären SSH-User anlegen (`ssh_user_create`, publicKey frisch
     generieren — Node crypto, openssh-key-v1-Format —, `expires: 2d`).
  2. GitHub-Actions-Workflow `.github/workflows/deploy-nesbun.yml` per
     `actions_run_trigger` (workflow_dispatch, ref main) starten — Inputs:
     `ssh_key` (privater Key), `ssh_user` (z. B. ssh-xxxxxx), `target`
     (Default = PHP-App-Pfad). Der Runner rsynct das Repo auf den Webspace.
  3. Live-Check: `curl https://cayvadisi.nesbun.de/sw.js` muss die neue
     CACHE-Version zeigen; `cloudsave.php` muss antworten (kein 403).
     Bei JEDEM Release außerdem: CFG.version, SW-CACHE UND die beiden
     `?v=`-Cache-Buster in index.html (style.css + js/main.js) hochzählen —
     alte Handy-Caches lieferten sonst tagelang gemischte Stände aus.
  4. SSH-User sofort wieder löschen (`ssh_user_delete`), lokale Key-Dateien entfernen.
  SSH direkt aus der Sandbox geht NICHT (nur HTTPS-Proxy) — deshalb der Actions-Umweg.
  Domain-Routing: Virtualhost `cayvadisi.nesbun.de` → Ingress-Path `/` auf die
  PHP-App (Ingress-ID 3ddaebb1-baec-475b-98d1-db27262dfa9e; Umschalten per
  Mittwald-REST `PATCH /v2/ingresses/{id}/paths` mit kurzlebigem API-Token).
- İstanbul-Viertel: eigene Höhen-Zone via `terrain.addHeightZone` — wird bewusst NACH
  Terrain-Mesh & Minimap registriert, sonst erscheint die Kai-Platte im Gelände.
  Gleiches gilt für Ada (v14) und das Fındık Vadisi (v18, `js/world/valley2.js`).
- Geführter Fortschritt (v18): `CFG.progress.features` + `state.featureUnlocks`;
  Reveals laufen über `ctx.runReveal` in main.js (friert das Spiel via
  `game.setFrozen` ein). Alte Saves bekommen `featureUnlocks._all = true`.
- Cloud-Save: `cloudsave.php` (läuft seit dem PHP-App-Umzug direkt auf
  cayvadisi.nesbun.de, saves/-Ordner entsteht automatisch); der Service
  Worker cached `.php` bewusst nie.
- Eigene TRELLIS-/Custom-Modelle: `assets/models/extra/custom/index.json`
  (nicht eingecheckt) → `js/custom.js`; Doku in `tools/TRELLIS.md`.
- Ideen-Backlog: TRELLIS-2-Pipeline für eigene Bild→3D-Assets (lokal generieren, als glTF ablegen).
