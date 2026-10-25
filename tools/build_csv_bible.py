"""Build a local Bible file (static/bibles/<code>.sqlite) from a scrollmapper
bible_databases CSV (github.com/scrollmapper/bible_databases, MIT; the texts
used here are public domain).

Usage: python -I tools/build_csv_bible.py formats/csv/YLT.csv ylt
"""
import csv
import os
import re
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from bible_books import ALL_BOOKS  # noqa: E402

src, code = sys.argv[1], sys.argv[2]
names = {b["name"].lower(): b["slug"] for b in ALL_BOOKS}
names.update({"psalm": "psalms", "song of songs": "song-of-solomon", "revelation of john": "revelation"})
ROMAN = {"I ": "1 ", "II ": "2 ", "III ": "3 "}
out = os.path.join(ROOT, "static", "bibles", f"{code}.sqlite")
if os.path.exists(out):
    os.remove(out)
db = sqlite3.connect(out)
db.execute("CREATE TABLE verses (book TEXT, chapter INT, verse INT, text TEXT)")
rows, missing = [], set()
for r in csv.DictReader(open(src, encoding="utf-8")):
    name = r["Book"]
    for k, v in ROMAN.items():
        if name.startswith(k):
            name = v + name[len(k):]
    slug = names.get(name.lower())
    if not slug:
        missing.add(r["Book"]); continue
    text = re.sub(r"\s+", " ", r["Text"]).strip()
    if text:
        rows.append((slug, int(r["Chapter"]), int(r["Verse"]), text))
db.executemany("INSERT INTO verses VALUES (?,?,?,?)", rows)
db.execute("CREATE INDEX idx_ref ON verses(book, chapter, verse)")
db.commit(); db.execute("VACUUM"); db.close()
print(code, len(rows), "verses; unmatched books:", sorted(missing), os.path.getsize(out) // 1024, "KB")
