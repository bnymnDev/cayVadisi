"""Laedt zusaetzliche CC0-Modelle von Poly Haven (v4): Ball, Faesser, Cayevi-Moebel."""
import json
import os
import urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "models", "extra")
UA = {"User-Agent": "cay-vadisi-asset-fetch/1.0"}
MODELS = [
    "football", "Barrel_01", "WoodenTable_02", "WoodenChair_01", "brass_pot_01",
    # v10: Grafik-Paket
    # Hinweis: pine_tree_01/coast_rocks_05 sind Photogrammetrie-Riesen (25MB-1GB) — NICHT aufnehmen!
    "Lantern_01", "painted_wooden_bench", "CoffeeCart_01", "modular_wooden_pier",
    "garden_gnome", "CheeseBox_01",
    "shrub_01", "boulder_01", "rock_moss_set_01",
]

# v10: PBR-Texturen (Putzwand & Ziegeldach) fuer schoenere Gebaeude
TEXTURES = ["painted_plaster_wall", "clay_roof_tiles"]
TEX_ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "textures")

def fetch(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        print(f"  skip   {os.path.relpath(dest, ROOT)}")
        return
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as f:
        f.write(r.read())
    print(f"  ok     {os.path.relpath(dest, ROOT)}  ({os.path.getsize(dest)//1024} KB)")

for slug in MODELS:
    print(slug + ":")
    with urllib.request.urlopen(urllib.request.Request(
            f"https://api.polyhaven.com/files/{slug}", headers=UA), timeout=60) as r:
        files = json.load(r)
    node = files["gltf"]["1k"]["gltf"]
    dest_dir = os.path.join(ROOT, slug)
    fetch(node["url"], os.path.join(dest_dir, f"{slug}_1k.gltf"))
    for rel, info in node.get("include", {}).items():
        fetch(info["url"], os.path.join(dest_dir, rel.replace("/", os.sep)))

for slug in TEXTURES:
    print(slug + ":")
    with urllib.request.urlopen(urllib.request.Request(
            f"https://api.polyhaven.com/files/{slug}", headers=UA), timeout=60) as r:
        files = json.load(r)
    dest_dir = os.path.join(TEX_ROOT, slug)
    for kind, suffix in [("Diffuse", "diff"), ("nor_gl", "nor_gl"), ("arm", "arm")]:
        url = files[kind]["1k"]["jpg"]["url"]
        fetch(url, os.path.join(dest_dir, f"{slug}_{suffix}_1k.jpg"))
print("FERTIG")
