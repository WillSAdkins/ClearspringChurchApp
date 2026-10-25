"""
Take the screenshots the App Store and Google Play ask for, from the live
site (or a local copy), looking as it does inside the app.

    pip install playwright && playwright install chromium
    python tools/store_screenshots.py https://clearspringchurchapp.onrender.com

Writes docs/store/screenshots/<device>/<n>-<page>.png at the exact sizes the
stores accept:
  iphone-6.9   1320 × 2868   (App Store: required; covers every iPhone)
  ipad-13      2064 × 2752   (App Store: only if the app is built for iPad)
  android      1080 × 1920   (Google Play phone screenshots)

Pick the 4–6 that tell the story best. Apple shows the first three in search.
"""
import asyncio
import os
import sys

from playwright.async_api import async_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://clearspringchurchapp.onrender.com").rstrip("/")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "store", "screenshots")

DEVICES = {
    "iphone-6.9": {"viewport": {"width": 440, "height": 956}, "scale": 3, "ua": "iPhone"},
    "ipad-13": {"viewport": {"width": 1032, "height": 1376}, "scale": 2, "ua": "iPad"},
    "android": {"viewport": {"width": 360, "height": 640}, "scale": 3, "ua": "Android"},
}

PAGES = [
    ("home", "/"),
    ("bible", "/bible/read/john/1"),
    ("listen", "/bible/listen"),
    ("prayer", "/prayer"),
    ("watch", "/watch"),
    ("study", "/bible/study"),
    ("game", "/games/rock-slinger"),
]

UA = {
    "iPhone": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ClearspringApp/1.0",
    "iPad": "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ClearspringApp/1.0",
    "Android": "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36 ClearspringApp/1.0",
}

# Look like the app: no splash video, no "Ask" bubble, no first-visit tips.
PREP = """
try {
  sessionStorage.setItem('cs_splash_shown', '1');
  sessionStorage.setItem('cs_popup_shown', '1');
  localStorage.setItem('cs_theme', 'light');
  localStorage.setItem('rs_ready', '1');
} catch (e) {}
document.addEventListener('DOMContentLoaded', function () {
  var s = document.createElement('style');
  s.textContent = '.guide-fab,.guide-launch,#guideFab,.cs-guide-btn,.toast{display:none!important}';
  document.head.appendChild(s);
});
"""


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for name, d in DEVICES.items():
            folder = os.path.join(OUT, name)
            os.makedirs(folder, exist_ok=True)
            ctx = await browser.new_context(viewport=d["viewport"], device_scale_factor=d["scale"],
                                            user_agent=UA[d["ua"]], is_mobile=d["ua"] != "iPad", has_touch=True)
            await ctx.add_init_script(PREP)
            page = await ctx.new_page()
            for i, (label, path) in enumerate(PAGES, 1):
                try:
                    await page.goto(BASE + path, wait_until="networkidle", timeout=60000)
                except Exception:
                    await page.goto(BASE + path, wait_until="load", timeout=60000)
                await page.wait_for_timeout(1200)
                # Reveal anything waiting for a scroll animation.
                await page.evaluate("document.querySelectorAll('.reveal,[data-reveal]').forEach(e=>e.classList.add('is-visible','in'))")
                out = os.path.join(folder, f"{i}-{label}.png")
                await page.screenshot(path=out)
                print(out)
            await ctx.close()
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
