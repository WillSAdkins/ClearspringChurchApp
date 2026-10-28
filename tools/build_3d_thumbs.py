"""
Make the picture for each card in the 3D Bible world (static/3d/<slug>.jpg).

    pip install playwright pillow && playwright install chromium
    python app.py                                  # in another window
    python tools/build_3d_thumbs.py                # only models without a picture
    python tools/build_3d_thumbs.py --all          # redo every picture
    python tools/build_3d_thumbs.py lyre harp      # just these

It opens each model in a headless browser, hides the labels, waits for it to
draw, and saves a 480 × 360 JPEG. Add --base http://... to use another server.
"""
import asyncio
import io
import os
import sys

from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
sys.path.insert(0, ROOT)
import models3d  # noqa: E402

OUT = os.path.join(ROOT, "static", "3d")
PREP = """
try { sessionStorage.setItem('cs_splash_shown','1'); sessionStorage.setItem('cs_popup_shown','1'); localStorage.setItem('cs_theme','light'); } catch (e) {}
window.matchMedia = ((m) => (q) => q.includes('reduced-motion') ? { matches: true, addEventListener() {}, removeEventListener() {} } : m(q))(window.matchMedia.bind(window));
document.addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style');
  s.textContent = '.b3d{width:640px!important;height:480px!important;border-radius:0!important;margin:0!important}.b3d-labels,.b3d-loading{display:none!important}';
  document.head.appendChild(s);
});
"""


async def shoot(ctx, base, slug, sem):
    async with sem:
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            await page.goto(f"{base}/bible/3d/{slug}", wait_until="networkidle", timeout=90000)
            await page.wait_for_selector(".b3d-ready", timeout=90000)
            await page.wait_for_timeout(1500)
            png = await (await page.query_selector(".b3d")).screenshot()
            im = Image.open(io.BytesIO(png)).convert("RGB").resize((480, 360), Image.LANCZOS)
            im.save(os.path.join(OUT, slug + ".jpg"), "JPEG", quality=82, optimize=True, progressive=True)
            print("ok   ", slug, *errors)
        except Exception as e:  # keep going: one bad model shouldn't stop the rest
            print("FAIL ", slug, str(e)[:160], *errors)
        await page.close()


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    base = "http://localhost:5000"
    if "--base" in sys.argv:
        base = sys.argv[sys.argv.index("--base") + 1].rstrip("/")
        args = [a for a in args if a != base]
    slugs = args or [m["slug"] for m in models3d.MODELS
                     if "--all" in sys.argv or not os.path.exists(os.path.join(OUT, m["slug"] + ".jpg"))]
    if not slugs:
        print("Every model already has a picture. Use --all to redo them.")
        return
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        ctx = await browser.new_context(viewport={"width": 720, "height": 900}, device_scale_factor=1)
        await ctx.add_init_script(PREP)
        sem = asyncio.Semaphore(3)
        await asyncio.gather(*[shoot(ctx, base, s, sem) for s in slugs])
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
