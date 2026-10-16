# Adds a concordance (every verse each Strong's number appears in) to
# static/bibles/original_words.sqlite. Run after build_original_words.py.
import json, os, sqlite3, sys, zlib
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from bible_books import ALL_BOOKS
path = sys.argv[1] if len(sys.argv) > 1 else "static/bibles/original_words.sqlite"
order = {b["slug"]: i for i, b in enumerate(ALL_BOOKS)}
db = sqlite3.connect(path)
occ = {}
for slug, ch, data in db.execute("SELECT slug, chapter, data FROM chapter_words"):
    for v, words in json.loads(zlib.decompress(data)).items():
        for w in words:
            if w[3]:
                occ.setdefault(w[3], []).append((order[slug], ch, int(v), w[2]))
db.execute("DROP TABLE IF EXISTS concordance")
db.execute("CREATE TABLE concordance (strong TEXT PRIMARY KEY, count INT, data BLOB) WITHOUT ROWID")
for k, rows in occ.items():
    rows.sort()
    # one entry per verse, keeping how the word was translated there
    seen, uniq = set(), []
    for b, c, v, g in rows:
        if (b, c, v) not in seen:
            seen.add((b, c, v)); uniq.append([b, c, v, g])
    db.execute("INSERT INTO concordance VALUES (?,?,?)",
               (k, len(rows), zlib.compress(json.dumps(uniq, ensure_ascii=False, separators=(",", ":")).encode(), 9)))
db.commit(); db.execute("VACUUM"); db.close()
print("strongs", len(occ), "size MB", round(os.path.getsize(path) / 1e6, 2))
