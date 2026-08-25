# Çay Vadisi — Projekt-Notizen

First-Person/Third-Person-Farmsimulation (three.js, Vanilla ES-Module, **kein Build-Schritt**,
komplett offline, DE/TR). Start: `npm start` → `http://localhost:8137`.

## Architektur-Regeln
- Kein Bundler, kein Framework: Module unter `js/`, three.js gevendort unter `vendor/`.
- Alle Sounds prozedural (WebAudio) — keine Audiodateien.
- Assets: Poly Haven / ambientCG (CC0). Neue Modelle über `tools/download_extra_models.py`
  nach `assets/models/extra/<slug>/` (plain glTF + Texturen, kein Meshopt nötig).
- Sky-Sonnenscheibe NIEMALS ins Environment-PMREM backen (`showSunDisc = 0` im envSky),
  sonst Inf/NaN → komplett schwarze Szene.
- Spielstand: `localStorage` (`cayvadisi_save_v2`), `state.js` migriert ältere Stände.
- Tests: headless Playwright gegen `http://127.0.0.1:8137` (localhost kann im Proxy-Setup
  hängen), Debug-API `window.__game` (`sim()` = Logik ohne Rendern, `shot()` = Canvas-JPEG).

## Roadmap / Merker
- **Multiplayer (Koop im Tal): vom Nutzer gewünscht, bewusst NOCH NICHT eingebaut.**
  Wenn es soweit ist: kleiner WebSocket-Server + Positions-/State-Sync, Save bleibt lokal.
- Ideen-Backlog: Bootfahren, Angeln, Jahreszeiten (Schnee), Foto-Modus,
  TRELLIS-2-Pipeline für eigene Bild→3D-Assets (lokal generieren, als glTF ablegen).
