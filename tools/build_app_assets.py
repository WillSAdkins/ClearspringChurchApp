"""
Make the images the iPhone and Android apps and their store listings need,
from the church wordmark (static/logo-ink.png).

    python tools/build_app_assets.py

Writes:
  static/icons/icon-192.png, icon-512.png  the website's icons (from icon-1024.png)
  native/resources/icon-only.png         1024×1024 app icon (no transparency)
  native/resources/icon-foreground.png   Android adaptive icon, front layer
  native/resources/icon-background.png   Android adaptive icon, back layer
  native/resources/splash.png            2732×2732 launch screen (light)
  native/resources/splash-dark.png       2732×2732 launch screen (dark)
  native/resources/android-notification/drawable-*/ic_stat_clearspring.png
                                         the small white status-bar icon
  docs/store/app-icon-1024.png           the App Store / Play icon upload
  docs/store/play-icon-512.png           Play Console's 512×512 icon
  docs/store/feature-graphic.png         Play's 1024×500 banner

`npm run icons` in native/ (run by the build scripts) turns the resources
into every size Xcode and Android Studio want.

If the church has the wordmark as a larger PNG or an SVG, save it over
static/logo-ink.png (dark ink on a transparent background) and run this
again: the icon will be crisper.
"""
import os

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LOGO = os.path.join(ROOT, "static", "logo-ink.png")
RES = os.path.join(ROOT, "native", "resources")
STORE = os.path.join(ROOT, "docs", "store")

ICON_BG = (0, 0, 0)            # matches static/icons/icon-512.png
ICON_INK = (232, 232, 232)
LIGHT_BG = (0xF5, 0xF8, 0xF7)
DARK_BG = (0x06, 0x17, 0x19)
ACCENT = (0x0A, 0x72, 0x69)


def wordmark(colour):
    """The logo, trimmed, recoloured, on transparency."""
    im = Image.open(LOGO).convert("RGBA")
    im = im.crop(im.getbbox())
    alpha = im.split()[3]
    solid = Image.new("RGBA", im.size, colour + (255,))
    solid.putalpha(alpha)
    return solid


def place(canvas, mark, width):
    """Centre the mark on the canvas at the given width (high-quality resize)."""
    h = round(mark.height * width / mark.width)
    m = mark.resize((width, h), Image.LANCZOS)
    x = (canvas.width - width) // 2
    y = (canvas.height - h) // 2
    canvas.alpha_composite(m, (x, y))
    return canvas


ICON_MASTER = os.path.join(ROOT, "static", "icons", "icon-1024.png")      # made by tools/app_icon/make_app_icon.js
ICON_MARK = os.path.join(ROOT, "static", "icons", "icon-1024-mark.png")


def icon(size=1024):
    if os.path.exists(ICON_MASTER):
        return Image.open(ICON_MASTER).convert("RGB").resize((size, size), Image.LANCZOS)
    c = Image.new("RGBA", (size, size), ICON_BG + (255,))
    place(c, wordmark(ICON_INK), round(size * 0.86))
    return c.convert("RGB")


def main():
    os.makedirs(RES, exist_ok=True)
    os.makedirs(STORE, exist_ok=True)

    full = icon(1024)
    full.save(os.path.join(RES, "icon-only.png"))
    full.save(os.path.join(STORE, "app-icon-1024.png"))
    icon(512).save(os.path.join(STORE, "play-icon-512.png"))

    # Android adaptive icons are cropped to a circle or squircle: keep the
    # wordmark inside the middle 66% so no letters are cut off.
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    if os.path.exists(ICON_MARK):
        mark = Image.open(ICON_MARK).convert("RGBA")
        mark = mark.crop(mark.getbbox())
        place(fg, mark, round(1024 * 0.56))
    else:
        place(fg, wordmark(ICON_INK), round(1024 * 0.62))
    fg.save(os.path.join(RES, "icon-foreground.png"))
    # The website / installed-web-app icons
    for px in (192, 512):
        icon(px).save(os.path.join(ROOT, "static", "icons", f"icon-{px}.png"))
    Image.new("RGB", (1024, 1024), ICON_BG).save(os.path.join(RES, "icon-background.png"))

    for name, bg, ink in (("splash.png", LIGHT_BG, (0x14, 0x24, 0x23)), ("splash-dark.png", DARK_BG, (0xE8, 0xEF, 0xEE))):
        s = Image.new("RGBA", (2732, 2732), bg + (255,))
        place(s, wordmark(ink), 1100)
        s.convert("RGB").save(os.path.join(RES, name))

    # Notification icon: the "C" of the wordmark, white on transparent
    # (Android tints it). 24dp at each density.
    logo = Image.open(LOGO).convert("RGBA")
    c_letter = logo.crop((10, 0, 98, logo.height))
    c_letter = c_letter.crop(c_letter.getbbox())
    white = Image.new("RGBA", c_letter.size, (255, 255, 255, 255))
    white.putalpha(c_letter.split()[3])
    for folder, px in (("drawable-mdpi", 24), ("drawable-hdpi", 36), ("drawable-xhdpi", 48),
                       ("drawable-xxhdpi", 72), ("drawable-xxxhdpi", 96)):
        canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        inner = round(px * 20 / 24)       # Material keeps a 2dp margin
        scale = inner / max(white.size)
        m = white.resize((max(1, round(white.width * scale)), max(1, round(white.height * scale))), Image.LANCZOS)
        canvas.alpha_composite(m, ((px - m.width) // 2, (px - m.height) // 2))
        out = os.path.join(RES, "android-notification", folder)
        os.makedirs(out, exist_ok=True)
        canvas.save(os.path.join(out, "ic_stat_clearspring.png"))

    # Play feature graphic: 1024×500, no transparency. Wordmark on the
    # church's teal with a soft wash of light, and a plain line of text.
    fg = Image.new("RGBA", (1024, 500), ACCENT + (255,))
    glow = Image.new("L", (1024, 500), 0)
    ImageDraw.Draw(glow).ellipse((-200, -360, 820, 420), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    fg = Image.composite(Image.new("RGBA", fg.size, (255, 255, 255, 255)), fg, glow)
    place(fg, wordmark((255, 255, 255)), 620)
    fg.convert("RGB").save(os.path.join(STORE, "feature-graphic.png"))
    print("Wrote", RES, "and", STORE)


if __name__ == "__main__":
    main()
