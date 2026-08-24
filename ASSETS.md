# Asset-Herkunft & Lizenzen

Alle externen Assets sind CC0 (Public Domain) oder MIT — frei auch für
kommerzielle Nutzung, keine Attribution nötig (hier trotzdem dokumentiert).

## Poly Haven — CC0 (https://polyhaven.com/license)

| Datei(en) | Quelle |
| --- | --- |
| `assets/textures/aerial_grass_rock/*` | https://polyhaven.com/a/aerial_grass_rock |
| `assets/textures/brown_mud_leaves_01/*` | https://polyhaven.com/a/brown_mud_leaves_01 |
| `assets/textures/aerial_rocks_02/*` | https://polyhaven.com/a/aerial_rocks_02 |
| `assets/textures/weathered_planks/*` | https://polyhaven.com/a/weathered_planks |
| `assets/models/island_tree_01_{hero,far}.glb` | https://polyhaven.com/a/island_tree_01 |
| `assets/models/island_tree_02_{hero,far}.glb` | https://polyhaven.com/a/island_tree_02 |
| `assets/models/rock_moss_set_01.glb` | https://polyhaven.com/a/rock_moss_set_01 |
| `assets/models/fern_02_v2.glb` | https://polyhaven.com/a/fern_02 |

Die Modelle wurden mit gltf-transform nachbearbeitet (selektive Dezimierung,
Meshopt-Kompression, Far-LODs mit 512-px-Texturen) — siehe
`tools/optimize_trees.mjs`.

## ambientCG — CC0 (https://ambientcg.com/license)

| Datei(en) | Quelle |
| --- | --- |
| `assets/textures/corrugated_steel/*` | https://ambientcg.com/view?id=CorrugatedSteel005 |

## three.js — MIT

| Datei(en) | Quelle |
| --- | --- |
| `vendor/*` | https://github.com/mrdoob/three.js (r0.185.1) |
| `assets/textures/water/waternormals.jpg` | three.js examples (MIT) |

## Selbst erstellt (Teil dieses Projekts, MIT)

| Datei(en) | Werkzeug |
| --- | --- |
| `assets/textures/tea/tea_atlas.png` | prozedural generiert (`tools/make_tea_leaves.py`) |
| sämtlicher Sound | prozedural zur Laufzeit (WebAudio, `js/audio.js`) |
