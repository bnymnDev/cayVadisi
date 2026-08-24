import os, sys, zipfile
sys.path.insert(0, os.path.dirname(__file__))
import download_assets as d

R = d.ROOT
for m in ["diff", "nor_gl", "arm"]:
    d.fetch("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/weathered_planks/weathered_planks_%s_1k.jpg" % m,
            os.path.join(R, "textures", "weathered_planks", "weathered_planks_%s_1k.jpg" % m))
z = os.path.join(R, "_tmp_steel.zip")
d.fetch("https://ambientcg.com/get?file=CorrugatedSteel005_1K-JPG.zip", z)
out = os.path.join(R, "textures", "corrugated_steel")
os.makedirs(out, exist_ok=True)
with zipfile.ZipFile(z) as zf:
    for n in zf.namelist():
        if n.lower().endswith(".jpg"):
            open(os.path.join(out, os.path.basename(n)), "wb").write(zf.read(n))
            print("  unzip", os.path.basename(n))
os.remove(z)
print("OK")
