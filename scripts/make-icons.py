"""Genera los íconos PWA (192, 512, maskable, apple-touch) dibujando a Cuernito (etapa Cría) con Pillow."""
from PIL import Image, ImageDraw, ImageFilter
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
INK = (7, 9, 13, 255)
SKIN = (250, 214, 176, 255)
SKIN_LIGHT = (255, 240, 222, 255)
HORN = (255, 193, 94, 255)
CHEEK = (255, 143, 163, 190)

def cuernito(size, safe=1.0):
    s = size * 4
    img = Image.new('RGBA', (s, s), INK)
    c = s / 2
    r = s * 0.5 * safe

    # halo coral
    glow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([c - r * 0.95, c - r * 0.8, c + r * 0.95, c + r * 1.0], fill=(255, 122, 107, 95))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s * 0.07)))

    d = ImageDraw.Draw(img)
    # cuernitos
    for dx in (-0.46, 0.46):
        x = c + r * dx
        d.ellipse([x - r * 0.17, c - r * 0.78, x + r * 0.17, c - r * 0.44], fill=HORN)
    # cabeza
    d.ellipse([c - r * 0.72, c - r * 0.6, c + r * 0.72, c + r * 0.84], fill=SKIN)
    d.ellipse([c - r * 0.66, c - r * 0.6, c + r * 0.62, c + r * 0.74], fill=SKIN_LIGHT)
    # brillo
    d.ellipse([c - r * 0.46, c - r * 0.42, c - r * 0.14, c - r * 0.28], fill=(255, 255, 255, 190))
    # ojos grandes con brillo
    for dx in (-0.27, 0.27):
        x = c + r * dx
        d.ellipse([x - r * 0.11, c - r * 0.06, x + r * 0.11, c + r * 0.2], fill=INK)
        d.ellipse([x - r * 0.07 + r * 0.03, c - r * 0.03, x + r * 0.01 + r * 0.03, c + r * 0.05], fill=(255, 255, 255, 255))
    # mejillas
    cheeks = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cheeks)
    for dx in (-0.46, 0.46):
        x = c + r * dx
        cd.ellipse([x - r * 0.1, c + r * 0.18, x + r * 0.1, c + r * 0.3], fill=CHEEK)
    img.alpha_composite(cheeks)
    d = ImageDraw.Draw(img)
    # sonrisa con colmillo
    w = max(2, int(s * 0.014))
    d.arc([c - r * 0.13, c + r * 0.14, c + r * 0.13, c + r * 0.34], 20, 160, fill=INK, width=w)
    d.polygon([(c + r * 0.05, c + r * 0.27), (c + r * 0.11, c + r * 0.25), (c + r * 0.085, c + r * 0.34)], fill=(255, 255, 255, 255), outline=INK)
    return img.resize((size, size), Image.LANCZOS)

for name, size, safe in [('pwa-192.png', 192, 0.86), ('pwa-512.png', 512, 0.86), ('maskable-512.png', 512, 0.66), ('apple-touch-icon.png', 180, 0.8)]:
    cuernito(size, safe).convert('RGB').save(os.path.join(OUT, name), optimize=True)
    print('ok', name)
