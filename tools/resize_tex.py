"""512er-Versionen der Baum-Texturen fuer Far-LODs."""
import glob, os
from PIL import Image

for slug in ["island_tree_01", "island_tree_02"]:
    src = os.path.join(os.path.dirname(__file__), "..", "assets", "_raw", slug, "textures")
    dst = os.path.join(os.path.dirname(__file__), "..", "assets", "_raw", slug, "tex512")
    os.makedirs(dst, exist_ok=True)
    for f in glob.glob(os.path.join(src, "*.jpg")):
        im = Image.open(f).convert("RGB").resize((512, 512), Image.LANCZOS)
        im.save(os.path.join(dst, os.path.basename(f)), quality=80)
        print("512:", os.path.basename(f))
print("OK")
