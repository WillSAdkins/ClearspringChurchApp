"""
Check the 3D Bible world hangs together, without a browser:

    python tools/check_3d.py

- every model in models3d.py has a drawing function in its pack, and every
  drawing function is listed (so nothing is unreachable);
- every pack is wired into the engine and built into static/vendor/bible3d/;
- every model has a card picture in static/3d/;
- every model page and the hub load, and links in labels point at real models;
- every reference in the list can be read, so the chapter links work.
Prints problems and exits with 1 if there are any.
"""
import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)
os.environ.setdefault("CHURCH_DB", "/tmp/check3d.db")
os.environ.setdefault("SECRET_KEY", "check")
import models3d  # noqa: E402

SRC = os.path.join(ROOT, "tools", "bible3d")
problems = []

# Drawing functions in each pack: lines like `  name({ scene, labels`, or `  "name"({ ...`.
packs = {}
for f in glob.glob(os.path.join(SRC, "pack-*.js")):
    name = os.path.basename(f)[5:-3]
    keys = re.findall(r'^  "?([a-z0-9-]+)"?\(\{ scene', open(f, encoding="utf-8").read(), re.M)
    packs[name] = set(keys)

engine = open(os.path.join(SRC, "bible3d.src.js"), encoding="utf-8").read()
for name in packs:
    if f'import("./pack-{name}.js")' not in engine:
        problems.append(f"pack {name} isn't in PACKS in bible3d.src.js")
    if not glob.glob(os.path.join(ROOT, "static", "vendor", "bible3d", f"pack-{name}-*.js")):
        problems.append(f"pack {name} hasn't been built (run tools/bible3d/build.sh)")

listed = {}
for m in models3d.MODELS:
    if m["slug"] in listed:
        problems.append(f"{m['slug']} is listed twice")
    listed[m["slug"]] = m
    if m["pack"] not in packs:
        problems.append(f"{m['slug']}: no pack called {m['pack']}")
    elif m["slug"] not in packs[m["pack"]]:
        problems.append(f"{m['slug']}: no drawing function in pack-{m['pack']}.js")
    if m["kind"] not in dict(models3d.KINDS):
        problems.append(f"{m['slug']}: unknown kind {m['kind']}")
    if not os.path.exists(os.path.join(ROOT, "static", "3d", m["slug"] + ".jpg")):
        problems.append(f"{m['slug']}: no card picture (run tools/build_3d_thumbs.py)")
for name, keys in packs.items():
    for k in keys - {s for s, m in listed.items() if m["pack"] == name}:
        problems.append(f"pack-{name}.js draws {k}, but it isn't listed in models3d.py")

# Links from labels to other models.
for f in glob.glob(os.path.join(SRC, "pack-*.js")):
    for slug in re.findall(r'"/bible/3d/([a-z0-9-]+)"', open(f, encoding="utf-8").read()):
        if slug not in listed:
            problems.append(f"{os.path.basename(f)} links to /bible/3d/{slug}, which doesn't exist")

# References readable.
names = models3d._book_slugs()
for m in models3d.MODELS:
    if m["ref"] and not models3d._chapters_in(m["ref"], names):
        problems.append(f"{m['slug']}: can't read the reference {m['ref']!r}")

# Pages load.
import app as appmod  # noqa: E402
client = appmod.app.test_client()
for url in ["/bible/3d", "/bible/3d/random"] + [f"/bible/3d/{s}" for s in listed]:
    r = client.get(url)
    if r.status_code not in (200, 302):
        problems.append(f"{url} returned {r.status_code}")

print(f"{len(listed)} models in {len(packs)} packs.")
for p in problems:
    print("  -", p)
print("All good." if not problems else f"{len(problems)} problem(s).")
sys.exit(1 if problems else 0)
