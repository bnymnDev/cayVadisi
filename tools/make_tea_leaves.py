"""Erzeugt einen 2x2-Teeblatt-Atlas (1024px): 3 Reifblaetter + 1 heller Trieb mit Knospe."""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "textures", "tea")
os.makedirs(OUT, exist_ok=True)
random.seed(42)

CELL = 512
SS = 2  # Supersampling

def leaf_shape(cx, cy, L, W, tip=1.0, teeth=8.0, wob=0.02):
    """Punktliste einer Teeblatt-Silhouette (Laenge L, Breite W)."""
    pts = []
    n = 160
    for i in range(n + 1):
        t = i / n                       # 0 Stiel -> 1 Spitze
        w = math.sin(math.pi * (t ** 0.9)) ** 0.85 * W * 0.5
        w *= (1 - 0.25 * (t ** 6) * tip)
        serr = 1 + 0.035 * math.sin(t * teeth * math.pi * 2) * (0.2 + 0.8 * t)
        w *= serr * (1 + random.uniform(-wob, wob))
        pts.append((cx + w, cy + L * 0.5 - t * L))
    for i in range(n + 1):
        t = 1 - i / n
        w = math.sin(math.pi * (t ** 0.9)) ** 0.85 * W * 0.5
        w *= (1 - 0.25 * (t ** 6) * tip)
        serr = 1 + 0.035 * math.sin(t * teeth * math.pi * 2 + 1.7) * (0.2 + 0.8 * t)
        w *= serr * (1 + random.uniform(-wob, wob))
        pts.append((cx - w, cy + L * 0.5 - t * L))
    return pts

def draw_leaf(img, cx, cy, L, W, base_col, tip_col, vein_col, rot=0.0):
    s = CELL * SS
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = leaf_shape(cx, cy, L, W)
    d.polygon(pts, fill=(255, 255, 255, 255))
    mask = layer.split()[3]

    grad = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    steps = 90
    for i in range(steps):
        t = i / (steps - 1)
        col = tuple(int(base_col[c] + (tip_col[c] - base_col[c]) * t) for c in range(3)) + (255,)
        y0 = cy + L * 0.5 - t * L
        gd.rectangle([0, y0 - L / steps * 1.6, s, y0 + L / steps * 1.6], fill=col)

    # dezente dunkle Mikrovariation (Layer + echtes Alpha-Blending)
    lay = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    nd = ImageDraw.Draw(lay)
    for _ in range(60):
        rx, ry = random.uniform(cx - W, cx + W), random.uniform(cy - L * 0.55, cy + L * 0.55)
        rr = random.uniform(6, 14) * SS
        nd.ellipse([rx - rr, ry - rr, rx + rr, ry + rr], fill=(10, 30, 12, random.randint(10, 22)))
    lay = lay.filter(ImageFilter.GaussianBlur(6 * SS))
    grad.alpha_composite(lay)

    # eine Blatthaelfte minimal beschattet (Blattfaltung)
    lay2 = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sd = ImageDraw.Draw(lay2)
    steps2 = 40
    for i in range(steps2):
        tt = i / (steps2 - 1)
        a = int(20 * (1 - tt))
        x0 = cx - W * 0.55 + tt * W * 0.55
        sd.rectangle([x0, cy - L * 0.55, x0 + W * 0.55 / steps2 * 1.6, cy + L * 0.55], fill=(0, 0, 0, a))
    grad.alpha_composite(lay2)

    # Adern
    layv = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    vd = ImageDraw.Draw(layv)
    tipY, baseY = cy - L * 0.5, cy + L * 0.5
    vd.line([(cx, baseY), (cx, tipY + L * 0.04)], fill=vein_col + (110,), width=int(2.4 * SS))
    nv = 7
    for k in range(nv):
        t = 0.12 + 0.75 * k / (nv - 1)
        y = baseY - t * L
        ln = W * 0.5 * math.sin(math.pi * t ** 0.9) * 0.92
        for sgn in (-1, 1):
            x1, y1 = cx, y
            x2 = cx + sgn * ln
            y2 = y - L * 0.09
            midx = cx + sgn * ln * 0.5
            midy = y - L * 0.055
            vd.line([(x1, y1), (midx, midy), (x2, y2)], fill=vein_col + (60,), width=int(1.4 * SS))
    grad.alpha_composite(layv)

    leaf = Image.composite(grad, Image.new("RGBA", (s, s), (0, 0, 0, 0)), mask)
    if rot:
        leaf = leaf.rotate(rot, center=(cx, cy), resample=Image.BICUBIC)
    img.alpha_composite(leaf)

def make_cell_mature(variant):
    """Cluster aus 6-8 ueberlappenden Blaettern — fuellt das Quad wie echte Foliage-Karten."""
    s = CELL * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    palettes = [
        ((24, 62, 30), (44, 96, 40), (120, 150, 90)),
        ((20, 55, 26), (38, 88, 36), (110, 142, 84)),
        ((28, 68, 32), (52, 104, 46), (126, 156, 96)),
        ((30, 72, 30), (58, 110, 48), (130, 160, 98)),
    ]
    random.seed(variant * 913 + 5)
    n = 7
    for k in range(n):
        ang = (k / n) * 360 + random.uniform(-24, 24)
        dist = s * random.uniform(0.10, 0.24)
        cx = s / 2 + dist * math.cos(math.radians(ang))
        cy = s / 2 + dist * math.sin(math.radians(ang))
        L = s * random.uniform(0.46, 0.62)
        W = L * random.uniform(0.52, 0.62)
        cols = palettes[random.randrange(len(palettes))]
        rot = ang + 90 + random.uniform(-18, 18)
        draw_leaf(img, cx, cy, L, W, *cols, rot=rot)
    # Mittelblatt obenauf
    cols = palettes[variant % len(palettes)]
    draw_leaf(img, s / 2, s / 2, s * 0.6, s * 0.34, *cols, rot=random.uniform(-14, 14))
    return img.resize((CELL, CELL), Image.LANCZOS)

def make_cell_shoot():
    """Trieb: zwei zarte hellgruene Blaetter + stehende Knospe."""
    s = CELL * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cx, cy = s / 2, s * 0.55
    lc = ((104, 150, 52), (150, 190, 84), (190, 214, 140))
    draw_leaf(img, cx - s * 0.13, cy + s * 0.05, s * 0.52, s * 0.30, *lc, rot=24)
    draw_leaf(img, cx + s * 0.15, cy + s * 0.04, s * 0.55, s * 0.31, *lc, rot=-27)
    # Knospe mittig
    bud = ((128, 168, 64), (176, 205, 104), (205, 225, 150))
    draw_leaf(img, cx + s * 0.005, cy - s * 0.16, s * 0.34, s * 0.145, *bud, rot=2)
    return img.resize((CELL, CELL), Image.LANCZOS)

atlas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
atlas.paste(make_cell_mature(0), (0, 0))
atlas.paste(make_cell_mature(1), (512, 0))
atlas.paste(make_cell_mature(2), (0, 512))
atlas.paste(make_cell_shoot(), (512, 512))
atlas.save(os.path.join(OUT, "tea_atlas.png"), optimize=True)
print("tea_atlas.png", os.path.getsize(os.path.join(OUT, 'tea_atlas.png')) // 1024, "KB")
