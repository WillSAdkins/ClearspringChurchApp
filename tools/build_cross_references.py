# Builds static/bibles/cross_references.sqlite from github.com/josephilipraja/bible-cross-reference-json
# (Treasury of Scripture Knowledge references via the MetaV project).
# Usage: python tools/build_cross_references.py <path-to-cloned-repo> static/bibles/cross_references.sqlite
import glob, json, os, sqlite3, sys, zlib
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from bible_books import ALL_BOOKS

CODES = ("GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SOS ISA JER "
         "LAM EZE DAN HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL MAT MAR LUK JOH ACT ROM 1CO 2CO GAL EPH "
         "PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAM 1PE 2PE 1JO 2JO 3JO JDE REV").split()
assert len(CODES) == 66
IDX = {c: i for i, c in enumerate(CODES)}
src, out = sys.argv[1], sys.argv[2]

chapters = {}
for f in glob.glob(os.path.join(src, "*.json")):
    for _, e in json.load(open(f)).items():
        b, c, v = e["v"].split()
        refs = []
        for key in sorted(e.get("r", {}), key=int):
            rb, rc, rv = e["r"][key].split()
            if rb in IDX:
                refs.append([IDX[rb], int(rc), int(rv)])
        chapters.setdefault((ALL_BOOKS[IDX[b]]["slug"], int(c)), {})[v] = refs

if os.path.exists(out): os.remove(out)
db = sqlite3.connect(out)
db.execute("CREATE TABLE chapter_refs (slug TEXT, chapter INT, data BLOB, PRIMARY KEY (slug, chapter)) WITHOUT ROWID")
for (slug, ch), vmap in chapters.items():
    db.execute("INSERT INTO chapter_refs VALUES (?,?,?)",
               (slug, ch, zlib.compress(json.dumps(vmap, separators=(",", ":")).encode(), 9)))
db.commit(); db.execute("VACUUM"); db.close()
print("chapters", len(chapters), "size MB", round(os.path.getsize(out) / 1e6, 2))
