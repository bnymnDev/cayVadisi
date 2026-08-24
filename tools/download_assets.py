"""Laedt alle externen Assets (CC0/MIT) fuer Cay Vadisi herunter.
Quellen: Poly Haven (CC0), ambientCG (CC0), three.js examples (MIT).
"""
import json
import os
import sys
import urllib.request
import zipfile

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")
UA = {"User-Agent": "cay-vadisi-asset-fetch/1.0"}

def fetch(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        print(f"  skip   {os.path.basename(dest)}")
        return
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())
    print(f"  ok     {os.path.basename(dest)}  ({os.path.getsize(dest)//1024} KB)")

# ---------- Poly Haven Terrain-Texturen ----------
PH_TEX = "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/{res}/{slug}/{slug}_{map}_{res}.jpg"
TEXTURES = [
    ("aerial_grass_rock", "2k", ["diff", "nor_gl", "arm"]),      # Wiese
    ("brown_mud_leaves_01", "2k", ["diff", "nor_gl", "arm"]),    # Erde/Weg
    ("aerial_rocks_02", "2k", ["diff", "nor_gl", "arm"]),        # Fels/Klippe
]

def get_textures():
    print("Poly Haven Texturen:")
    for slug, res, maps in TEXTURES:
        for m in maps:
            url = PH_TEX.format(res=res, slug=slug, map=m)
            fetch(url, os.path.join(ROOT, "textures", slug, f"{slug}_{m}_{res}.jpg"))

# ---------- Poly Haven Modelle (gltf 1k) ----------
PH_MODEL_BASE = "https://dl.polyhaven.org/file/ph-assets/Models/gltf/{res}/{slug}/"
MODELS = ["island_tree_01", "island_tree_02", "rock_moss_set_01", "fern_02", "dead_tree_trunk"]

def get_models():
    print("Poly Haven Modelle:")
    for slug in MODELS:
        res = "1k"
        base = PH_MODEL_BASE.format(res=res, slug=slug)
        gltf_name = f"{slug}_{res}.gltf"
        dest_dir = os.path.join(ROOT, "models", slug)
        gltf_dest = os.path.join(dest_dir, gltf_name)
        try:
            fetch(base + gltf_name, gltf_dest)
        except Exception as e:
            print(f"  FAIL   {slug}: {e}")
            continue
        with open(gltf_dest, "r", encoding="utf-8") as f:
            doc = json.load(f)
        uris = set()
        for buf in doc.get("buffers", []):
            if "uri" in buf: uris.add(buf["uri"])
        for img in doc.get("images", []):
            if "uri" in img: uris.add(img["uri"])
        for uri in sorted(uris):
            if uri.startswith("data:"):
                continue
            try:
                fetch(base + uri, os.path.join(dest_dir, uri))
            except Exception:
                # .bin liegt bei manchen Assets nur im 8k-Ordner
                alt = PH_MODEL_BASE.format(res="8k", slug=slug) + uri
                fetch(alt, os.path.join(dest_dir, uri))

# ---------- ambientCG Blatt-Atlas (PNG + Alpha) ----------
def get_leafset():
    print("ambientCG LeafSet021:")
    zdest = os.path.join(ROOT, "_tmp_leafset.zip")
    fetch("https://ambientcg.com/get?file=LeafSet021_1K-PNG.zip", zdest)
    outdir = os.path.join(ROOT, "textures", "leafset021")
    os.makedirs(outdir, exist_ok=True)
    with zipfile.ZipFile(zdest) as z:
        for n in z.namelist():
            if n.lower().endswith(".png"):
                data = z.read(n)
                with open(os.path.join(outdir, os.path.basename(n)), "wb") as f:
                    f.write(data)
                print(f"  unzip  {os.path.basename(n)}")
    os.remove(zdest)

# ---------- three.js Wassernormalen (MIT) ----------
def get_water():
    print("three.js waternormals:")
    fetch("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/waternormals.jpg",
          os.path.join(ROOT, "textures", "water", "waternormals.jpg"))

if __name__ == "__main__":
    get_textures()
    get_models()
    get_leafset()
    get_water()
    print("FERTIG")
