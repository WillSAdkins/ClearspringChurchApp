"""Illustrated banners for the main pages: original, layered SVG scenes in the
app's colours, drawn here in code (no image files, nothing to license).

Each scene is a stack of layers, far to near. The page's scroll moves each
layer by a different amount (static/parallax.js), which gives the depth; a
few gentle CSS animations (drifting clouds, twinkling stars, swaying light)
keep it alive. Everything is seeded, so a scene looks the same every time.

If a church admin uploads a photo for a page, the photo is used instead
(see app.page_photo)."""

import math
import random
from functools import lru_cache
from markupsafe import Markup

W, H = 400, 220   # drawing units; the SVG scales to the banner


# ---------------------------------------------------------------- primitives

def _sky(id_, stops):
    n = len(stops) - 1
    s = "".join(f'<stop offset="{i / n:.2f}" stop-color="{c}"/>' for i, c in enumerate(stops))
    return (f'<defs><linearGradient id="{id_}" x1="0" y1="0" x2="0" y2="1">{s}</linearGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#{id_})"/>')


def _glow(id_, cx, cy, r, color, opacity=0.55):
    return (f'<defs><radialGradient id="{id_}"><stop offset="0" stop-color="{color}" stop-opacity="{opacity}"/>'
            f'<stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient></defs>'
            f'<circle class="sc-pulse" cx="{cx}" cy="{cy}" r="{r}" fill="url(#{id_})"/>')


def _sun(id_, cx, cy, r, color, glow):
    return _glow(id_, cx, cy, r * 3.4, glow) + f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}"/>'


def _moon(cx, cy, r, color, bg):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}"/>'
            f'<circle cx="{cx + r * .45}" cy="{cy - r * .25}" r="{r * .9}" fill="{bg}"/>')


def _stars(rng, n, color, ymax=120):
    out = []
    for _ in range(n):
        x, y, r = rng.uniform(0, W), rng.uniform(4, ymax), rng.choice([.6, .8, 1, 1.3])
        out.append(f'<circle class="sc-twinkle" style="animation-delay:{rng.uniform(0, 4):.1f}s" cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{color}"/>')
    return "".join(out)


def _ridge(rng, base, amp, color, peaks=7, jag=True, extra=40):
    """Mountains (jagged) or hills (smooth), filled to the bottom."""
    xs = [-extra + i * (W + 2 * extra) / peaks for i in range(peaks + 1)]
    ys = [base - rng.uniform(.25, 1) * amp for _ in xs]
    if jag:
        pts = []
        for i in range(len(xs) - 1):
            pts.append((xs[i], ys[i]))
            mx = (xs[i] + xs[i + 1]) / 2 + rng.uniform(-8, 8)
            pts.append((mx, base - rng.uniform(0, .3) * amp))
        pts.append((xs[-1], ys[-1]))
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    else:
        d = f"M{xs[0]:.1f},{ys[0]:.1f}"
        for i in range(1, len(xs)):
            cx = (xs[i - 1] + xs[i]) / 2
            d += f" C{cx:.1f},{ys[i - 1]:.1f} {cx:.1f},{ys[i]:.1f} {xs[i]:.1f},{ys[i]:.1f}"
    d += f" L{xs[-1]:.1f},{H + 60} L{xs[0]:.1f},{H + 60} Z"
    return f'<path d="{d}" fill="{color}"/>'


def _clouds(rng, n, color, ymax=90, opacity=.85):
    out = []
    for _ in range(n):
        x, y, s = rng.uniform(-40, W), rng.uniform(12, ymax), rng.uniform(.7, 1.4)
        dur = rng.uniform(50, 90)
        blobs = "".join(f'<ellipse cx="{dx * s:.1f}" cy="{dy * s:.1f}" rx="{rx * s:.1f}" ry="{ry * s:.1f}"/>'
                        for dx, dy, rx, ry in [(0, 0, 22, 9), (16, 2, 18, 8), (-16, 3, 16, 7), (4, -6, 14, 9)])
        out.append(f'<g class="sc-drift" style="animation-duration:{dur:.0f}s;animation-delay:-{rng.uniform(0, dur):.0f}s">'
                   f'<g transform="translate({x:.1f},{y:.1f})" fill="{color}" opacity="{opacity}">{blobs}</g></g>')
    return "".join(out)


def _water(y, color, ripple, rng, n=9):
    out = f'<rect x="-40" y="{y}" width="{W + 80}" height="{H - y + 60}" fill="{color}"/>'
    for i in range(n):
        yy = y + 6 + i * (H - y) / n
        x = rng.uniform(0, W - 60)
        w = rng.uniform(20, 70)
        out += (f'<g class="sc-ripple" style="animation-delay:-{rng.uniform(0, 6):.1f}s">'
                f'<line x1="{x:.1f}" y1="{yy:.1f}" x2="{x + w:.1f}" y2="{yy:.1f}" stroke="{ripple}" stroke-width="1.6" stroke-linecap="round"/></g>')
    return out


def _rays(cx, cy, color, n=7, spread=70, length=260):
    out = []
    for i in range(n):
        a = math.radians(90 + (i - (n - 1) / 2) * spread / n)
        x2, y2 = cx + math.cos(a) * length, cy + math.sin(a) * length
        x3, y3 = cx + math.cos(a + .06) * length, cy + math.sin(a + .06) * length
        out.append(f'<path d="M{cx},{cy} L{x2:.1f},{y2:.1f} L{x3:.1f},{y3:.1f} Z" fill="{color}"/>')
    return f'<g class="sc-sway" style="transform-origin:{cx}px {cy}px">{"".join(out)}</g>'


def _birds(rng, n, color):
    out = []
    for _ in range(n):
        x, y, s = rng.uniform(40, W - 40), rng.uniform(20, 70), rng.uniform(.6, 1.1)
        out.append(f'<g class="sc-glide" style="animation-delay:-{rng.uniform(0, 8):.1f}s"><path transform="translate({x:.0f},{y:.0f}) scale({s:.2f})" '
                   f'd="M-6,0 Q-3,-4 0,0 Q3,-4 6,0" fill="none" stroke="{color}" stroke-width="1.4" stroke-linecap="round"/></g>')
    return "".join(out)


def _town(rng, base, color, spire=True, lights=None):
    out, x = [], -10
    while x < W + 10:
        w, h = rng.uniform(12, 26), rng.uniform(14, 40)
        out.append(f'<rect x="{x:.1f}" y="{base - h:.1f}" width="{w:.1f}" height="{h + 80:.1f}" fill="{color}"/>')
        if rng.random() < .35:
            out.append(f'<path d="M{x:.1f},{base - h:.1f} L{x + w / 2:.1f},{base - h - w * .6:.1f} L{x + w:.1f},{base - h:.1f} Z" fill="{color}"/>')
        if lights:
            for _ in range(rng.randint(0, 3)):
                lx, ly = x + rng.uniform(2, w - 4), base - rng.uniform(4, h - 4)
                out.append(f'<rect class="sc-twinkle" style="animation-delay:{rng.uniform(0, 5):.1f}s" x="{lx:.1f}" y="{ly:.1f}" width="2.4" height="3" fill="{lights}"/>')
        x += w + rng.uniform(-2, 3)
    if spire:
        sx = W * .62
        out.append(f'<rect x="{sx}" y="{base - 62}" width="12" height="80" fill="{color}"/>'
                   f'<path d="M{sx - 2},{base - 62} L{sx + 6},{base - 92} L{sx + 14},{base - 62} Z" fill="{color}"/>'
                   f'<rect x="{sx + 5.2}" y="{base - 104}" width="1.6" height="14" fill="{color}"/><rect x="{sx + 2}" y="{base - 99}" width="8" height="1.6" fill="{color}"/>')
    return "".join(out)


def _trees(rng, base, color, n=14, size=1):
    out = []
    for _ in range(n):
        x, h = rng.uniform(-10, W + 10), rng.uniform(12, 26) * size
        out.append(f'<path d="M{x - h * .32:.1f},{base + 2:.1f} L{x:.1f},{base - h:.1f} L{x + h * .32:.1f},{base + 2:.1f} Z" fill="{color}"/>')
    return "".join(out)


def _path(color, edge):
    return (f'<path d="M150,{H + 20} C180,170 230,150 200,128 C185,117 205,108 212,104 L216,104 C214,110 196,118 214,130 '
            f'C250,152 230,180 280,{H + 20} Z" fill="{color}"/>'
            f'<path d="M150,{H + 20} C180,170 230,150 200,128 C185,117 205,108 212,104" fill="none" stroke="{edge}" stroke-width="1.2"/>')


def _glyphs(rng, chars, color, n=16):
    out = []
    for _ in range(n):
        x, y, s = rng.uniform(10, W - 10), rng.uniform(20, H - 30), rng.uniform(12, 30)
        out.append(f'<text class="sc-float" style="animation-delay:-{rng.uniform(0, 9):.1f}s" x="{x:.0f}" y="{y:.0f}" font-size="{s:.0f}" '
                   f'font-family="Georgia, serif" fill="{color}" opacity="{rng.uniform(.25, .7):.2f}">{rng.choice(chars)}</text>')
    return "".join(out)


def _sprouts(rng, base, stem, leaf, n=9):
    out = []
    for i in range(n):
        x = 20 + i * (W - 40) / (n - 1) + rng.uniform(-8, 8)
        h = rng.uniform(16, 40)
        out.append(f'<g class="sc-sway" style="transform-origin:{x:.0f}px {base}px;animation-delay:-{rng.uniform(0, 5):.1f}s">'
                   f'<path d="M{x:.1f},{base} Q{x - 4:.1f},{base - h / 2:.1f} {x:.1f},{base - h:.1f}" stroke="{stem}" stroke-width="2" fill="none"/>'
                   f'<ellipse cx="{x - 6:.1f}" cy="{base - h * .7:.1f}" rx="7" ry="3.2" fill="{leaf}" transform="rotate(-30 {x - 6:.1f} {base - h * .7:.1f})"/>'
                   f'<ellipse cx="{x + 6:.1f}" cy="{base - h * .85:.1f}" rx="7" ry="3.2" fill="{leaf}" transform="rotate(30 {x + 6:.1f} {base - h * .85:.1f})"/></g>')
    return "".join(out)


def _rings(rng, color, n=6):
    out = []
    for i in range(n):
        x, y, r = 70 + i * 52 + rng.uniform(-10, 10), 90 + rng.uniform(-25, 25), rng.uniform(26, 44)
        out.append(f'<circle class="sc-float" style="animation-delay:-{rng.uniform(0, 9):.1f}s" cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}" fill="none" stroke="{color}" stroke-width="2.2" opacity=".55"/>')
    return "".join(out)


def _lanterns(rng, color, n=18, ymin=60, ymax=170):
    return "".join(f'<circle class="sc-twinkle" style="animation-delay:{rng.uniform(0, 5):.1f}s" cx="{rng.uniform(0, W):.1f}" cy="{rng.uniform(ymin, ymax):.1f}" r="{rng.uniform(1.5, 3):.1f}" fill="{color}"/>'
                   for _ in range(n))


# ---------------------------------------------------------------- the scenes
# Each returns [(depth, svg), …] far to near. Depth 0 doesn't move; 1 moves most.

def _dawn(rng, key):
    return [
        (0, _sky(f"{key}s", ["#CFE9E4", "#F6E7CF", "#F8D9B5"]) + _sun(f"{key}g", 270, 120, 18, "#FFF4DC", "#FFD9A0")),
        (.15, _clouds(rng, 4, "#FFFFFF")),
        (.3, _ridge(rng, 150, 50, "#9CC9C1", peaks=6)),
        (.55, _ridge(rng, 178, 40, "#5FA79C", peaks=5, jag=False)),
        (.9, _ridge(rng, 205, 26, "#1E6B65", peaks=4, jag=False)),
    ]


def scene_layers(key):
    rng = random.Random(key)
    k = key
    if key in ("watch", "sunday"):
        return [
            (0, _sky(f"{k}s", ["#0B2E2F", "#124847", "#1C6A64"]) + _glow(f"{k}g", 200, 30, 170, "#7FF0DF", .35)),
            (.2, _rays(200, -10, "rgba(180,255,240,0.10)", n=9, spread=110)),
            (.45, _lanterns(rng, "#9FF3E4", 26, 90, 150)),
            (.7, _ridge(rng, 178, 30, "#0A3B3A", peaks=10, jag=False)),
            (1, _ridge(rng, 206, 22, "#06201F", peaks=14, jag=False)),
        ]
    if key in ("community", "groups", "ministries"):
        return [
            (0, _sky(f"{k}s", ["#BFE4DF", "#E7F3EF", "#F7EFE0"]) + _sun(f"{k}g", 90, 70, 14, "#FFF6E2", "#FFE2B0")),
            (.12, _clouds(rng, 5, "#FFFFFF")),
            (.3, _ridge(rng, 160, 34, "#A9D2CB", peaks=5, jag=False)),
            (.5, _town(rng, 176, "#4E9389", spire=key == "community", lights=None) + _trees(rng, 178, "#3E8379", 8)),
            (.85, _ridge(rng, 204, 20, "#1F6C66", peaks=5, jag=False) + (_rings(rng, "#FFFFFF", 5) if key == "groups" else "")),
        ]
    if key in ("prayer", "night"):
        return [
            (0, _sky(f"{k}s", ["#071C22", "#0E3138", "#1D4E52"]) + _stars(rng, 60, "#E8FFF9") + _moon(300, 50, 16, "#F3F0D8", "#0B262C")),
            (.25, _ridge(rng, 168, 40, "#14403F", peaks=6)),
            (.55, _ridge(rng, 190, 26, "#0D302F", peaks=5, jag=False) + _lanterns(rng, "#FFD98A", 8, 176, 196)),
            (.9, _ridge(rng, 212, 16, "#061A1A", peaks=6, jag=False)),
        ]
    if key in ("calendar", "plans", "visit"):
        layers = _dawn(rng, key)
        if key == "plans":
            layers.append((1, _path("#E9DCC3", "#C9B48E")))
        if key == "visit":
            layers[3] = (.55, _ridge(rng, 182, 30, "#5FA79C", peaks=5, jag=False) + _town(random.Random(key + "t"), 186, "#2F7D74", spire=True))
        return layers
    if key in ("study", "library", "resources"):
        return [
            (0, _sky(f"{k}s", ["#D9EEEA", "#EEF6F2", "#F5EEDD"]) + _sun(f"{k}g", 320, 60, 12, "#FFF8E8", "#FFE6B8")),
            (.15, _glyphs(rng, list("αβγδλΩאבגדש"), "#5FA79C", 10) if key == "study" else _clouds(rng, 4, "#FFFFFF")),
            (.35, _ridge(rng, 150, 56, "#A6CFC7", peaks=7)),
            (.6, _ridge(rng, 180, 34, "#5E9F95", peaks=6)),
            (.95, _ridge(rng, 208, 20, "#255F59", peaks=5, jag=False) + _trees(rng, 206, "#1A4E49", 10)),
        ]
    if key == "words":
        return [
            (0, _sky(f"{k}s", ["#0E3634", "#145049", "#1E6B62"])),
            (.2, _glyphs(rng, ["ἀγάπη", "χάρις", "λόγος", "πίστις", "ἐλπίς", "α", "Ω", "λ"], "#BDF5EA", 14)),
            (.5, _glyphs(rng, ["שָׁלוֹם", "חֶסֶד", "רוּחַ", "אֱמֶת", "א", "ש"], "#FFE3B0", 10)),
            (.9, _ridge(rng, 208, 18, "#0A2826", peaks=5, jag=False)),
        ]
    if key in ("grow", "faith", "firststeps"):
        return [
            (0, _sky(f"{k}s", ["#CDEBE2", "#EAF5EC", "#F9F1DE"]) + _sun(f"{k}g", 200, 96, 16, "#FFF6DC", "#FFDFA3")),
            (.15, _rays(200, 96, "rgba(255,236,190,0.35)", n=10, spread=150, length=200) if key == "faith" else _clouds(rng, 4, "#FFFFFF")),
            (.35, _ridge(rng, 160, 30, "#A8D3C4", peaks=5, jag=False)),
            (.65, _ridge(rng, 190, 22, "#69AE93", peaks=4, jag=False) + (_path("#F1E5CB", "#D5BF94") if key == "faith" else "")),
            (1, _sprouts(rng, 214, "#2E6E52", "#4FA27A") if key != "faith" else _ridge(rng, 214, 12, "#2E6E52", peaks=6, jag=False)),
        ]
    if key in ("giving", "more", "devotionals"):
        return [
            (0, _sky(f"{k}s", ["#CFEAE6", "#EAF4F0", "#F8EBD6"]) + _sun(f"{k}g", 120 if key == "giving" else 260, 104, 15, "#FFF4DA", "#FFD99C")),
            (.15, _clouds(rng, 4, "#FFFFFF") + _birds(rng, 4, "#4C7C77")),
            (.35, _ridge(rng, 128, 36, "#A2CFC6", peaks=6)),
            (.7, _water(140, "#5DAFA4", "rgba(255,255,255,0.55)", rng)),
        ]
    if key in ("memorise",):
        return [
            (0, _sky(f"{k}s", ["#0A2A2E", "#103F42", "#1A5D5A"]) + _stars(rng, 50, "#DFFFF8")),
            (.3, _rings(rng, "#7FE3D2", 5)),
            (.8, _ridge(rng, 208, 22, "#062022", peaks=6, jag=False)),
        ]
    if key in ("feelings",):
        return [
            (0, _sky(f"{k}s", ["#D3E6EC", "#ECF1F0", "#F7EEE2"]) + _sun(f"{k}g", 310, 64, 14, "#FFF6E0", "#FFDCA6")),
            (.15, _clouds(rng, 7, "#FFFFFF", 110, .9)),
            (.45, _ridge(rng, 172, 30, "#A9C9CC", peaks=5, jag=False)),
            (.85, _ridge(rng, 204, 20, "#5D8C90", peaks=5, jag=False)),
        ]
    return _dawn(rng, key)


@lru_cache(maxsize=64)
def render(key):
    """The scene as stacked SVG layers (safe, generated markup)."""
    parts = []
    for depth, inner in scene_layers(key):
        parts.append(f'<svg class="sc-layer" data-depth="{depth}" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice" '
                     f'aria-hidden="true" focusable="false">{inner}</svg>')
    return Markup("".join(parts))


THUMB_SCENES = ["watch", "study", "grow", "giving", "prayer", "calendar", "community", "feelings"]

# Which pages get a banner, their scene, and the line shown on it.
PAGES = {
    "watch": ("watch", "Sundays at Clearspring, wherever you are"),
    "community": ("community", "Church is people. Here's how to belong."),
    "study": ("study", "Read it, dig into it, live it"),
    "more": ("more", "Everything else, in one place"),
    "prayer": ("prayer", "Carry each other's burdens"),
    "calendar": ("calendar", "What's coming up"),
    "groups": ("groups", "Read, pray and do life together"),
    "grow": ("grow", "Rooted, and growing"),
    "faith": ("faith", "Honest answers on the way"),
    "ministries": ("ministries", "There's a place for everyone"),
    "giving": ("giving", "Generosity that flows"),
    "visit": ("visit", "We'd love to meet you"),
    "library": ("library", "The world of the Bible"),
    "memorise": ("memorise", "Hide God's word in your heart"),
    "plans": ("plans", "One day at a time"),
    "devotionals": ("devotionals", "A moment with God"),
    "feelings": ("feelings", "Whatever today is like"),
    "words": ("words", "The words behind the words"),
    "sunday": ("sunday", "Follow along this Sunday"),
    "resources": ("resources", "Guides for the journey"),
}

TITLES = {
    "watch": "Watch", "community": "Community", "study": "Study", "more": "More", "prayer": "Prayer",
    "calendar": "Calendar", "groups": "Groups", "grow": "Grow", "faith": "Exploring faith",
    "ministries": "Ministries", "giving": "Giving", "visit": "Plan your visit", "library": "Library",
    "memorise": "Memorise", "plans": "Reading plans", "devotionals": "Devotionals",
    "feelings": "How are you feeling?", "words": "Greek & Hebrew", "sunday": "This Sunday", "resources": "Resources",
}
