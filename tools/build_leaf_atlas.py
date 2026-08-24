"""Baut aus LeafSet021 Color+Opacity einen kompakten RGBA-Atlas und raeumt auf."""
import os, glob
from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), "..", "assets", "textures")
LS = os.path.join(BASE, "leafset021")

color = Image.open(os.path.join(LS, "LeafSet021_1K-PNG_Color.png")).convert("RGB")
alpha = Image.open(os.path.join(LS, "LeafSet021_1K-PNG_Opacity.png")).convert("L")
atlas = color.copy()
atlas.putalpha(alpha)
atlas = atlas.resize((1024, 1024), Image.LANCZOS)
atlas.save(os.path.join(LS, "leaf_atlas.png"), optimize=True)

nrm = Image.open(os.path.join(LS, "LeafSet021_1K-PNG_NormalGL.png")).convert("RGB")
nrm.resize((512, 512), Image.LANCZOS).save(os.path.join(LS, "leaf_normal.jpg"), quality=88)

for f in glob.glob(os.path.join(LS, "LeafSet021*")):
    os.remove(f)
    print("del", os.path.basename(f))

# Steel: unnoetige Maps raus
ST = os.path.join(BASE, "corrugated_steel")
for f in glob.glob(os.path.join(ST, "*Displacement*")) + glob.glob(os.path.join(ST, "*NormalDX*")) + glob.glob(os.path.join(ST, "*AmbientOcclusion*")):
    os.remove(f)
    print("del", os.path.basename(f))
print("OK")
