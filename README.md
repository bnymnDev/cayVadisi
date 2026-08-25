# 🍃 Çay Vadisi — Teetal am Schwarzen Meer

Ein First-Person-Farm- und Management-Spiel im Browser: Du führst einen
Teegarten an der türkischen Schwarzmeerküste (Karadeniz). Pflücke frische
Triebe nach der echten Regel **„iki yaprak bir tomurcuk"** (zwei Blätter, eine
Knospe), stelle Arbeiter ein, baue Gemüse an, halte Tiere, verkaufe auf dem
Wochenmarkt — und arbeite dich vom Teepflücker zum **Çay-Baron** hoch, mit
Traktor, Pickup und am Ende dem Sportwagen mit Goldfelgen.

Gebaut mit **three.js** (Vanilla, kein Framework, kein Build-Schritt).
Komplett zweisprachig: **Deutsch / Türkçe**. Spielbar am Desktop **und am
Smartphone** (virtueller Joystick, Touch-Pedale).

![Abendstimmung an der Annahmestelle](docs/screenshot_abend.jpg)

| | |
| --- | --- |
| ![Teefeld](docs/screenshot_feld.jpg) | ![Arbeiter im Feld](docs/screenshot_arbeiter.jpg) |
| ![Tiergehege](docs/screenshot_tiere.jpg) | ![Mit dem Sportwagen in die Stadt](docs/screenshot_stadt.jpg) |

## Spielen

Beliebigen statischen Webserver im Projektordner starten, z. B.:

```bash
python -m http.server 8137
```

Dann `http://localhost:8137` öffnen. Kein Build, keine externen CDNs —
alles liegt im Repo (offline lauffähig, direkt hostbar auf jedem Webspace).

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| `W A S D` | Laufen / Fahren |
| Maus | Umsehen (Klick ins Bild aktiviert Mauslock) |
| Linksklick **halten** | Tee pflücken |
| `E` | Benutzen: Verkaufen, Schlafen, Seilbahn, Ein-/Aussteigen, Ernten, Hof/Markt/Autohaus |
| `Tab` | Betriebs-Panel (Arbeiter · Lager · Bilanz) |
| `P` | Privatleben (Profil · Familie · Immobilien · Börse) |
| `M` | Minimap ein/aus |
| `Shift` | Rennen |
| `Esc` | Pause |

Touch-Geräte: virtueller Joystick links = Laufen, Ziehen rechts = Umsehen,
Finger auf Busch halten = Pflücken, Aktions-Prompt antippen = Benutzen.
Im Fahrzeug: Joystick lenkt, ▲/▼-Pedale geben Gas und bremsen.

## Spielmechanik

### Teegarten
- **Wachstum:** Triebe sprießen über den Tag; nach **Regen** doppelt so schnell.
- **Qualität:** Frische Triebe = voller Preis (★). Wer zu lange wartet, pflückt
  überständige Blätter (weniger wert). Bei Regen gepflückt = leichter Abschlag.
- **Tagesauftrag:** Jeden Tag ein Liefer-Ziel mit Bonus.
- **Ausrüstung:** größere Körbe, Teeschere, Gummistiefel, Dünger, Teleferik.

### Betrieb & Management (v2)
- **Arbeiter:** Bis zu 6 Pflücker anstellen — sie ernten selbstständig, abends
  wird ihr Tee verkauft und der Lohn gezahlt. Der **Vorarbeiter** macht sie schneller.
- **Bauernhof (Westen):** 12 Beete für Mais, Tomaten, Schwarzkohl und
  **Haselnuss**; Tiergehege mit Hühnern (Eier), Kühen (Milch) und Schafen (Wolle) —
  Produkte entstehen über Nacht.
- **Stadt (Osten):** Wochenmarkt mit **täglich schwankenden Preisen** (verkaufe,
  wenn der Kurs gut steht!) und Autohaus.
- **Fahrzeuge:** Traktor, Pickup, Limousine, Sportwagen — echtes Fahren mit
  Chase-Kamera, Scheinwerfern bei Nacht und Motorsound. Steht Traktor oder
  Pickup in der Nähe, wächst dein Pflückkorb (Ladefläche ×3 / Anhänger ×5).
- **Automatisierung:** Teleferik, Bewässerung (Ernten reifen schneller),
  **Silo** (Lager wird abends automatisch verkauft).
- **Wohlstand:** Nettovermögen bestimmt deinen Rang — vom *Teepflücker* über
  den *Hofbesitzer* bis zur *Legende vom Karadeniz*.

### Reisen & Imperium (v3)
- **İskele-Reisen:** Vom Bootssteg aus nach **Zonguldak** (billige Kohle),
  **Kdz. Ereğli** (Osmanlı-Erdbeer-Setzlinge) und **Devrek** (Baston mit
  +8 % Tempo, Walnuss-Setzlinge). Jede Stadt zahlt Premium-Preise für
  passende Waren — Reisezeit kostet Tagesstunden.
- **Çay-Fabrik:** Verpackt die Arbeiter-Ernte abends automatisch zu Paketen
  unter **deinem eigenen Label** (Name frei wählbar). Energie kommt aus
  Zonguldak-Kohle oder von der Stromrechnung.
- **Begehbarer Supermarkt:** Dein Label steht sichtbar im Regal; verkaufe
  Pakete zum Tages-Einzelhandelspreis.
- **Export:** Täglich neue Aufträge nach 🇩🇪 🇳🇱 🇦🇿 🇯🇵 🇺🇸 mit Großabnehmer-Preisen.

### Privatleben (v3)
- **Profil [P]:** Name, Label, Outfit-Farbe.
- **Familie:** Hochzeit und Nachwuchs geben dauerhafte Verkaufsboni.
- **Immobilien:** Yayla-Hütte, Stadthaus, Villa am Meer — Miete jeden Abend.
- **Börse:** Drei Aktien mit Tageskursen (kaufen, halten, verkaufen).
- **Kaçak çay:** Nachts hinterm Markt wartet ein Schwarzhändler: +60 %
  steuerfrei — aber die Jandarma kontrolliert, beschlagnahmt und kassiert
  Bußgelder. Jeder Deal erhöht den Fahndungsdruck.

### Saison
- 7 Tage, danach Medaille (Bronze/Silber/Gold) und Endlosmodus.
- Cinematic-Intro beim ersten Start, Minimap (M), Sternenhimmel mit Mond,
  Dorfbewohner-NPCs, Traktor-Anhänger.
- Fortschritt wird automatisch gespeichert (`localStorage`, alte v1-Stände
  werden übernommen).

## Technik

- three.js r0.185, ES-Module mit Importmap, **kein Bundler**
- Prozedurales Terrain mit analytischer Höhenfunktion (Terrassen!),
  3-Wege-PBR-Splatting (Wiese/Erde/Fels) via `onBeforeCompile`
- ~70 000 instanzierte Grashalme mit Wind-Böen im Vertex-Shader
- ~1 000 Teebüsche als 3 InstancedMeshes (Körper, Blattwolke, Trieb-Layer
  mit Per-Instanz-Wachstumsattribut)
- Physischer Himmel (three.js `Sky`) mit Tagesverlauf; Environment-Map wird
  periodisch per PMREM aus dem Himmel gebacken
- Fotogescannte CC0-Modelle (Poly Haven), selektiv dezimiert:
  Stämme ~6 %, Blattwerk ~16 % der Original-Polygone, Meshopt-komprimiert
- Meer mit dreifach gescrollten Normal-Maps + Environment-Reflexion
- Regen, Möwen, Pflück-Partikel, Tag/Nacht, dynamischer Nebel
- **Kompletter Sound prozedural per WebAudio** (Meer, Wind, Regen, Möwen,
  Pflücken, Verkauf, Motor, Kuh/Schaf/Huhn) — keine Audiodateien, keine Lizenzfragen
- Automatische Qualitätsstufen (Gras-Dichte, Schattenauflösung, Pixel-Ratio)
- v2: prozedurale Low-Poly-Fahrzeuge, -Tiere, -NPCs und -Stadt (0 zusätzliche
  Assets, alles aus Code), Arcade-Fahrphysik auf dem analytischen Terrain

## Projektstruktur

```
index.html          Einstieg + UI-Overlays
css/style.css       HUD, Menüs, Shop
js/
  main.js           Bootstrap, Loop, Qualität
  config.js         Balancing & Welt-Konstanten
  game.js           Tageszyklus, Wetter, Pflücken, Wirtschaft, Interaktionen
  player.js         First-Person-Controller (+ Touch-Joystick)
  vehicles.js       Fahrzeuge: Modelle, Fahrphysik, Chase-Cam
  workers.js        Arbeiter-NPCs mit Pflück-KI
  ui.js / i18n.js   HUD, Panels & Zweisprachigkeit (DE/TR)
  audio.js          prozedurale WebAudio-Engine
  world/            terrain, sky, ocean, grass, tea, props, rain, birds,
                    particles, farm (Beete+Tiere), city (Kasaba), structures
vendor/             three.js + Addons (lokal, publish-ready)
assets/             CC0-Texturen & -Modelle (siehe ASSETS.md)
tools/              Download-/Optimierungs-Skripte (nur Entwicklung)
```

## Lizenzen

Code: MIT. Assets: CC0 (Poly Haven, ambientCG) bzw. MIT (three.js,
Wasser-Normal-Map) — Details in [ASSETS.md](ASSETS.md).
