# TRELLIS-Pipeline: eigene Bild→3D-Assets für Çay Vadisi

Ziel: einzigartige Gebäude (Konak, Cami, Fabrik, …) aus einem Foto/Rendering
lokal generieren und ohne Build-Schritt ins Spiel legen.

## 1. Modell lokal generieren (einmalige Einrichtung, GPU nötig)

```bash
git clone https://github.com/microsoft/TRELLIS.git && cd TRELLIS
# Anleitung im TRELLIS-Repo folgen (conda env, ~16 GB VRAM für das große Modell)
python example.py --image mein_konak_foto.jpg --output konak.glb
```

Alternativ funktioniert jedes Werkzeug, das ein **glTF/GLB mit eingebetteten
oder danebenliegenden Texturen** erzeugt (kein Meshopt/Draco nötig — es gibt
keinen Decoder im Spiel).

## 2. Ins Spiel legen

```
assets/models/extra/custom/
├── index.json
└── konak/
    └── konak.glb
```

`index.json` (Position in Weltkoordinaten, Höhe kommt vom Terrain):

```json
[
  { "file": "konak/konak.glb", "x": -20, "z": -60, "ry": 0.4, "scale": 1.0 }
]
```

## 3. Fertig

`js/custom.js` lädt beim Start alles aus der Liste und platziert es in der
Welt (Schatten inklusive). Ohne `index.json` passiert nichts — die Datei ist
bewusst NICHT eingecheckt, damit jeder lokal experimentieren kann.

Tipps:
- GLB unter ~8 MB halten (Ladezeit + 16-MB-Cache des Service Workers).
- `scale` anhand einer Referenz prüfen: eine Tür ist im Spiel ~2 m hoch.
- Kollision: eigene Modelle haben KEINE Collider — bei begehbaren Gebäuden
  Position so wählen, dass niemand durchlaufen muss.
