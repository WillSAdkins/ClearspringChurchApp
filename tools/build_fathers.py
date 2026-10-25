"""Build static/bibles/fathers.sqlite: what the early church said, verse by verse.

Source: github.com/HistoricalChristianFaith/Commentaries-Database (its
compilation is dedicated to the public domain). That database also holds
excerpts from modern translations still in copyright, so only these
series are taken, all from public-domain 19th-century translations:

  - Thomas Aquinas, Catena Aurea (the four Gospels), translated under
    J. H. Newman, 1841-45: every father it quotes
  - John Chrysostom, Homilies on Matthew, John, Acts and Paul's letters
    (Nicene and Post-Nicene Fathers, first series, 1886-89)
  - Augustine, Expositions on the Psalms, Tractates on John, Ten Homilies on
    1 John, Our Lord's Sermon on the Mount, City of God (same series)

Usage:
  git clone --depth 1 https://github.com/HistoricalChristianFaith/Commentaries-Database SRC
  python tools/build_fathers.py SRC
"""
import os
import re
import sqlite3
import sys
import tomllib
import zlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import refs  # noqa: E402
from bible_books import ALL_BOOKS  # noqa: E402

BOOK_NAMES = {b["slug"]: b["name"] for b in ALL_BOOKS}

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "bibles", "fathers.sqlite")

CHRYSOSTOM = re.compile(r"^homil(y|ies) (on (the gospel of )?)?(\d+ )?(on )?(acts|john|matthew|\d? ?corinthians|hebrews|romans|\d? ?timothy|ephesians|galatians|colossians|philippians|titus|\d? ?thessalonians|philemon)", re.I)
AUGUSTINE = re.compile(r"^(exposition on psalm|tractates? on (the gospel of )?john|ten homilies on|sermon on the mount|city of god)", re.I)


AUGUSTINE_WORKS = [("exposition", "Expositions on the Psalms"), ("ten homilies", "Homilies on 1 John"),
                   ("tractate", "Tractates on John"), ("sermon on the mount", "Our Lord's Sermon on the Mount"),
                   ("city of god", "City of God")]


def work_for(author, title, book_name):
    t = (title or "").strip()
    if t.startswith("Catena Aurea"):
        return "Catena Aurea (Aquinas, 1274)"
    if t.isupper():
        return None  # titles in capitals come from a different, possibly modern, translation set
    m = CHRYSOSTOM.match(t) if author == "John Chrysostom" else None
    if m:
        named = re.sub(r"\s+", " ", m.group(6)).strip()
        if m.group(4) and not m.group(5) and not named[0].isdigit():
            named = m.group(4).strip() + " " + named   # "Homily on 1 Corinthians 12"
        return "Homilies on " + " ".join(w if w[0].isdigit() else w.capitalize() for w in named.split())
    if author == "Augustine of Hippo" and AUGUSTINE.match(t):
        low = t.lower()
        return next(name for key, name in AUGUSTINE_WORKS if key in low)
    return None


def parse_name(fname):
    m = re.match(r"^(.+?) (\d+)_(\d+)(?:-(\d+)(?:_(\d+))?)?\.toml$", fname)
    if not m:
        return None
    book, ch, v1 = m.group(1), int(m.group(2)), int(m.group(3))
    v2 = int(m.group(4)) if m.group(4) and not m.group(5) else v1
    r = refs.parse(f"{book} {ch}:{v1}")
    if not r:
        return None
    return r["slug"], r["chapter"], r["verse"] or v1, max(v2, v1)


def main(src):
    if os.path.exists(OUT):
        os.remove(OUT)
    db = sqlite3.connect(OUT)
    db.execute("CREATE TABLE fathers (book TEXT, chapter INT, v1 INT, v2 INT, author TEXT, year INT, work TEXT, quote BLOB)")
    rows, seen = [], set()
    for author in sorted(os.listdir(src)):
        folder = os.path.join(src, author)
        if not os.path.isdir(folder) or author.startswith("."):
            continue
        year = None
        meta = os.path.join(folder, "metadata.toml")
        if os.path.exists(meta):
            try:
                year = tomllib.load(open(meta, "rb")).get("default_year")
            except Exception:
                pass
        for fname in os.listdir(folder):
            if not fname.endswith(".toml") or fname == "metadata.toml":
                continue
            where = parse_name(fname)
            if not where:
                continue
            try:
                data = tomllib.load(open(os.path.join(folder, fname), "rb"))
            except Exception:
                continue
            for c in data.get("commentary", []):
                work = work_for(author, c.get("source_title"), BOOK_NAMES.get(where[0], where[0]))
                if not work:
                    continue
                q = re.sub(r"\s+", " ", (c.get("quote") or "")).strip()
                if len(q) < 40:
                    continue
                key = (where, author, q[:80])
                if key in seen:
                    continue
                seen.add(key)
                rows.append((*where, author, year, work, zlib.compress(q[:4000].encode("utf-8"), 9)))
    db.executemany("INSERT INTO fathers VALUES (?, ?, ?, ?, ?, ?, ?, ?)", rows)
    db.execute("CREATE INDEX fathers_ch ON fathers (book, chapter, v1)")
    db.commit()
    db.execute("VACUUM")
    db.close()
    print(f"{len(rows)} comments -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
