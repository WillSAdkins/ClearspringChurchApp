"""What the early church said, verse by verse (static/bibles/fathers.sqlite,
built by tools/build_fathers.py from public-domain translations)."""
import os
import sqlite3
import zlib
from functools import lru_cache

from bible_books import ALL_BOOKS, BOOKS_BY_SLUG

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "fathers.sqlite")


def available():
    return os.path.exists(DB)


def _db():
    c = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    c.row_factory = sqlite3.Row
    return c


def _row(r):
    return {"author": r["author"], "year": r["year"], "work": r["work"], "v1": r["v1"], "v2": r["v2"],
            "quote": zlib.decompress(r["quote"]).decode("utf-8")}


def for_verse(slug, ch, v, limit=6):
    if not available():
        return []
    with _db() as c:
        rows = c.execute("SELECT * FROM fathers WHERE book=? AND chapter=? AND v1<=? AND v2>=? "
                         "ORDER BY (v1=?) DESC, year, author LIMIT ?", (slug, ch, v, v, v, limit)).fetchall()
    return [_row(r) for r in rows]


def count_verse(slug, ch, v):
    if not available():
        return 0
    with _db() as c:
        return c.execute("SELECT COUNT(*) FROM fathers WHERE book=? AND chapter=? AND v1<=? AND v2>=?", (slug, ch, v, v)).fetchone()[0]


def chapter(slug, ch):
    """Every comment on a chapter, grouped by the verse it starts at."""
    if not available():
        return []
    with _db() as c:
        rows = c.execute("SELECT * FROM fathers WHERE book=? AND chapter=? ORDER BY v1, v2, year, author", (slug, ch)).fetchall()
    groups = []
    for r in rows:
        item = _row(r)
        if not groups or groups[-1]["v1"] != item["v1"] or groups[-1]["v2"] != item["v2"]:
            groups.append({"v1": item["v1"], "v2": item["v2"], "items": []})
        groups[-1]["items"].append(item)
    return groups


@lru_cache(maxsize=1)
def index():
    """Books (in Bible order) with the chapters that have comments."""
    if not available():
        return []
    with _db() as c:
        rows = c.execute("SELECT book, chapter, COUNT(*) n FROM fathers GROUP BY book, chapter").fetchall()
    by = {}
    for r in rows:
        by.setdefault(r["book"], []).append((r["chapter"], r["n"]))
    out = []
    for b in ALL_BOOKS:
        if b["slug"] in by:
            chs = sorted(by[b["slug"]])
            out.append({"slug": b["slug"], "name": b["name"], "chapters": chs, "total": sum(n for _, n in chs)})
    return out


def chapter_count(slug, ch):
    for b in index():
        if b["slug"] == slug:
            return dict(b["chapters"]).get(ch, 0)
    return 0
