"""Neon gradient pin + glass martini icon set (2026 redesign)."""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import os, math
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons'))
S = 1024

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def grad(size, stops, angle=120):
    w, h = size; im = Image.new('RGB', size)
    px = im.load(); a = math.radians(angle); dx, dy = math.sin(a), -math.cos(a)
    ext = abs(dx) * w + abs(dy) * h
    for y in range(h):
        for x in range(w):
            t = ((x - w/2) * dx + (y - h/2) * dy) / ext + .5
            t = min(1, max(0, t))
            for i in range(len(stops) - 1):
                p0, c0 = stops[i]; p1, c1 = stops[i+1]
                if t <= p1: px[x, y] = lerp(c0, c1, (t - p0) / max(1e-6, p1 - p0)); break
    return im

def background():
    bg = Image.new('RGB', (S, S), (9, 8, 18))
    glow = Image.new('RGB', (S, S), (0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse([-150, -200, 650, 600], fill=(120, 20, 110)); g.ellipse([450, 500, 1250, 1250], fill=(10, 90, 120)); g.ellipse([300, 250, 800, 750], fill=(70, 30, 140))
    glow = glow.filter(ImageFilter.GaussianBlur(170))
    return ImageChops.add(bg, glow)

def pin_mask(cx, cy, r):
    m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    # tapered tail
    tip = cy + r * 1.75
    ang = math.radians(42)
    p1 = (cx - r * math.cos(ang), cy + r * math.sin(ang)); p2 = (cx + r * math.cos(ang), cy + r * math.sin(ang))
    d.polygon([p1, p2, (cx, tip)], fill=255)
    return m.filter(ImageFilter.GaussianBlur(1.2))

def draw(size, maskable=False, rounded=False):
    im = background().convert('RGBA')
    sc = .78 if maskable else 1.0
    cx, cy, r = S/2, S/2 - 95*sc, 255*sc
    pm = pin_mask(cx, cy, r)
    # neon glow
    bx0, by0, bx1, by1 = int(cx - r), int(cy - r), int(cx + r), int(cy + r * 1.8)
    gsmall = grad((96, 96 * (by1 - by0) // (bx1 - bx0)), [(0, (255, 61, 154)), (.5, (168, 85, 247)), (1, (34, 211, 238))], 150).resize((bx1 - bx0, by1 - by0), Image.BICUBIC)
    gl = Image.new('RGBA', (S, S), (168, 85, 247, 255)); gl.paste(gsmall.convert('RGBA'), (bx0, by0))
    halo = Image.new('RGBA', (S, S)); halo.paste(gl, (0, 0), pm.filter(ImageFilter.GaussianBlur(40)))
    im = Image.alpha_composite(im, halo); im = Image.alpha_composite(im, halo)
    body = Image.new('RGBA', (S, S)); body.paste(gl, (0, 0), pm); im = Image.alpha_composite(im, body)
    # glossy highlight on the pin head
    hl = Image.new('L', (S, S), 0); ImageDraw.Draw(hl).ellipse([cx - r*.85, cy - r*.95, cx + r*.55, cy - r*.05], fill=70)
    hl = ImageChops.multiply(hl.filter(ImageFilter.GaussianBlur(30)), pm)
    white = Image.new('RGBA', (S, S), (255, 255, 255, 255)); wl = Image.new('RGBA', (S, S)); wl.paste(white, (0, 0), hl); im = Image.alpha_composite(im, wl)
    # frosted glass disc
    gr = r * .64
    disc = Image.new('L', (S, S), 0); ImageDraw.Draw(disc).ellipse([cx - gr, cy - gr, cx + gr, cy + gr], fill=255)
    glass = Image.new('RGBA', (S, S), (255, 255, 255, 0)); gd = ImageDraw.Draw(glass)
    gd.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], fill=(255, 255, 255, 64), outline=(255, 255, 255, 150), width=int(7*sc))
    im = Image.alpha_composite(im, glass)
    # martini glass (white, crisp)
    ln = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(ln); g = gr * .62; top = cy - g * .62
    W = (255, 255, 255, 255); lw = max(4, int(g * .12))
    d.polygon([(cx - g, top), (cx + g, top), (cx, top + g * 1.0)], fill=W)
    d.polygon([(cx - g*.66, top + g*.2), (cx + g*.66, top + g*.2), (cx, top + g*.8)], fill=(255, 120, 190, 255))
    d.rectangle([cx - lw/2, top + g*.95, cx + lw/2, top + g*1.55], fill=W)
    d.rounded_rectangle([cx - g*.48, top + g*1.5, cx + g*.48, top + g*1.5 + lw], radius=lw//2, fill=W)
    d.line([(cx + g*.55, top - g*.42), (cx + g*.05, top + g*.45)], fill=W, width=lw)
    d.ellipse([cx + g*.08, top + g*.0, cx + g*.36, top + g*.28], fill=(190, 242, 100, 255))
    im = Image.alpha_composite(im, ln)
    # sparkle
    sp = Image.new('RGBA', (S, S)); sd = ImageDraw.Draw(sp)
    for (x, y, k) in [(cx + r*1.05, cy - r*.95, 46), (cx - r*1.15, cy + r*.55, 30)]:
        k *= sc; sd.polygon([(x, y - k), (x + k*.22, y - k*.22), (x + k, y), (x + k*.22, y + k*.22), (x, y + k), (x - k*.22, y + k*.22), (x - k, y), (x - k*.22, y - k*.22)], fill=(255, 255, 255, 230))
    im = Image.alpha_composite(im, sp.filter(ImageFilter.GaussianBlur(.8)))
    if rounded:
        m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, S-1, S-1], radius=230, fill=255); im.putalpha(m)
    return im.resize((size, size), Image.LANCZOS)

big = draw(1024); big_m = draw(1024, maskable=True)
for n, s in [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180), ('favicon-32.png', 32)]:
    big.resize((s, s), Image.LANCZOS).convert('RGB').save(n)
for n, s in [('icon-maskable-512.png', 512), ('icon-maskable-192.png', 192)]:
    big_m.resize((s, s), Image.LANCZOS).convert('RGB').save(n)
print('icons ok')
