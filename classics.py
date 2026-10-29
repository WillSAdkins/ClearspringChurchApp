"""
Clearspring: classic Christian books, read chapter by chapter, from
static/bibles/classics.sqlite (built by tools/build_classics.py from
Standard Ebooks and Project Gutenberg texts, all public domain).
"""
import os
import sqlite3

import ro_db
import zlib
from functools import lru_cache

from markupsafe import Markup

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "classics.sqlite")
WPM = 230    # reading speed for "minutes to read"


def available():
    return os.path.exists(DB)


def db():
    return ro_db.connect(DB)


def minutes(words):
    return max(1, round(words / WPM))


def hours_label(words):
    m = words / WPM
    if m < 90:
        return f"{max(1, round(m / 5) * 5)} minutes"
    return f"about {round(m / 60)} hours"


# The shelves on the classics page, in order, and which books go on each.
SHELVES = [
    ("prayer", "Prayer and devotion", ["practice-of-the-presence-of-god", "imitation-of-christ", "lord-teach-us-to-pray", "humility",
                                        "power-through-prayer", "purpose-in-prayer", "essentials-of-prayer", "revelations-of-divine-love"]),
    ("life", "The Christian life", ["pilgrims-progress", "grace-abounding", "the-way-to-god", "the-masters-indwelling",
                                     "unspoken-sermons", "edwards-sermons", "art-of-illustration"]),
    ("fathers", "The early and medieval church", ["confessions", "city-of-god", "on-the-making-of-man", "consolation-of-philosophy"]),
    ("thinking", "Thinking it through", ["orthodoxy", "the-everlasting-man", "heretics"]),
    ("poetry", "Poetry", ["paradise-lost", "divine-comedy", "donne-poetry"]),
    ("novels", "Novels", ["in-his-steps", "ben-hur", "quo-vadis", "brothers-karamazov", "man-who-was-thursday", "phantastes", "lilith"]),
    ("children", "To read with children", ["princess-and-the-goblin", "back-of-the-north-wind"]),
]


def shelves():
    """[(key, name, [books])], with any book not listed on an 'Other' shelf."""
    by = {b["slug"]: b for b in books()}
    out, used = [], set()
    for key, name, slugs in SHELVES:
        got = [by[s] for s in slugs if s in by]
        used.update(slugs)
        if got:
            out.append((key, name, got))
    rest = [b for b in books() if b["slug"] not in used]
    if rest:
        out.append(("other", "More", rest))
    return out


@lru_cache(maxsize=1)
def books():
    if not available():
        return ()
    return tuple({**dict(r), "time": hours_label(r["words"])} for r in db().execute("SELECT * FROM books ORDER BY seq"))


def book(slug):
    return next((b for b in books() if b["slug"] == slug), None)


@lru_cache(maxsize=32)
def contents(slug):
    return tuple({"n": r["n"], "title": r["title"], "words": r["words"], "mins": minutes(r["words"])}
                 for r in db().execute("SELECT n, title, words FROM chapters WHERE book=? ORDER BY n", (slug,)))


def chapter(slug, n):
    r = db().execute("SELECT n, title, words, body FROM chapters WHERE book=? AND n=?", (slug, n)).fetchone()
    if not r:
        return None
    return {"n": r["n"], "title": r["title"], "words": r["words"], "mins": minutes(r["words"]),
            "html": Markup(zlib.decompress(r["body"]).decode("utf-8"))}


def search(q, limit=5):
    q = (q or "").strip().lower()
    if len(q) < 2:
        return []
    return [b for b in books() if q in b["title"].lower() or q in b["author"].lower()][:limit]
