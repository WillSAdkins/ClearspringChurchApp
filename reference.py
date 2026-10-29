"""
Clearspring: three classic reference works and Spurgeon's daily readings,
read from static/bibles/reference.sqlite (built by tools/build_reference.py
from public-domain CrossWire SWORD modules).
"""
import os
import re
import sqlite3

import ro_db
import zlib
from datetime import date, datetime
from functools import lru_cache

from markupsafe import Markup

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "reference.sqlite")

WORKS = {
    "isbe": {"name": "Bible encyclopedia", "short": "ISBE", "full": "The International Standard Bible Encyclopedia", "year": "1915",
             "editor": "James Orr", "kind": "encyclopedia",
             "about": "9,000 articles by scholars of its day on every person, place, object, custom and idea in the Bible. Thorough and detailed."},
    "smith": {"name": "Smith’s dictionary", "short": "Smith", "full": "Smith’s Bible Dictionary", "year": "1863",
              "editor": "William Smith", "kind": "dictionary",
              "about": "The classic Victorian Bible dictionary: 4,600 short entries, especially strong on names and places."},
    "torrey": {"name": "Torrey’s topics", "short": "Torrey", "full": "The New Topical Text Book", "year": "1897",
               "editor": "R. A. Torrey", "kind": "topics",
               "about": "600 subjects, each broken into what the Bible says about it, with the verses for each point."},
    "easton": {"name": "Easton’s dictionary", "short": "Easton", "full": "Easton’s Bible Dictionary", "year": "1897",
               "editor": "M. G. Easton", "kind": "dictionary",
               "about": "Nearly 4,000 clear, readable entries on the people, places, words and ideas of the Bible, by a Scottish minister. A good first place to look."},
    "nave": {"name": "Nave’s topics", "short": "Nave", "full": "Nave’s Topical Bible", "year": "1896",
             "editor": "Orville J. Nave", "kind": "topics",
             "about": "Over 5,000 subjects and names, with every passage on each one gathered under short headings. Compiled by an army chaplain over fourteen years."},
}
DAILY = {"full": "Morning and Evening: Daily Readings", "author": "C. H. Spurgeon", "year": "1865–68"}


def available():
    return os.path.exists(DB)


def db():
    return ro_db.connect(DB)


def _html(blob):
    return Markup(zlib.decompress(blob).decode("utf-8")) if blob else Markup("")


def entry(work, slug):
    if work not in WORKS or not available():
        return None
    r = db().execute("SELECT * FROM entries WHERE work=? AND slug=?", (work, slug)).fetchone()
    if not r:
        return None
    return {"work": work, "slug": r["slug"], "title": r["title"], "summary": r["summary"], "html": _html(r["body"])}


def neighbours(work, title):
    p = db().execute("SELECT slug, title FROM entries WHERE work=? AND title < ? COLLATE NOCASE ORDER BY title COLLATE NOCASE DESC LIMIT 1",
                     (work, title)).fetchone()
    n = db().execute("SELECT slug, title FROM entries WHERE work=? AND title > ? COLLATE NOCASE ORDER BY title COLLATE NOCASE LIMIT 1",
                     (work, title)).fetchone()
    return (dict(p) if p else None), (dict(n) if n else None)


def letter_index(work, letter):
    if not available() or work not in WORKS:
        return []
    return [dict(r) for r in db().execute(
        "SELECT slug, title, summary FROM entries WHERE work=? AND lower(substr(title,1,1))=? ORDER BY title COLLATE NOCASE",
        (work, letter.lower()))]


@lru_cache(maxsize=4)
def _slugs(work):
    if not available():
        return frozenset()
    return frozenset(r[0] for r in db().execute("SELECT slug FROM entries WHERE work=?", (work,)))


def also_in(slug, exclude=None):
    """The other works that have an entry with this slug: [(work, info)]."""
    return [(w, WORKS[w]) for w in WORKS if w != exclude and slug in _slugs(w)]


def counts():
    if not available():
        return {}
    return {r[0]: r[1] for r in db().execute("SELECT work, COUNT(*) FROM entries GROUP BY work")}


def search(q, limit=8):
    """Titles first (starts-with, then contains)."""
    q = (q or "").strip()
    if len(q) < 2 or not available():
        return []
    like = q.replace("%", "").replace("_", "")
    rows = db().execute(
        "SELECT work, slug, title, summary, (lower(title) LIKE lower(?)) AS starts FROM entries "
        "WHERE title LIKE ? ORDER BY starts DESC, length(title), title LIMIT ?",
        (like + "%", "%" + like + "%", limit)).fetchall()
    return [{"work": r["work"], "slug": r["slug"], "title": r["title"], "summary": r["summary"]} for r in rows]


# ---------------------------------------------------------------- daily readings

def part_for(now=None):
    """Morning until 3pm, evening after."""
    now = now or datetime.now()
    return "morning" if now.hour < 15 else "evening"


def daily(day=None, part=None):
    """day: date or 'MM-DD'. Leap-day reading only shows on 29 February."""
    if not available():
        return None
    if day is None:
        day = date.today()
    key = day if isinstance(day, str) else day.strftime("%m-%d")
    if not re.fullmatch(r"\d\d-\d\d", key or ""):
        return None
    part = part if part in ("morning", "evening") else part_for()
    r = db().execute("SELECT * FROM daily WHERE day=? AND part=?", (key, part)).fetchone()
    if not r:
        return None
    return {"day": key, "part": part, "title": r["title"], "verse": r["verse"], "ref": r["ref"], "html": _html(r["body"])}


def day_label(key):
    try:
        return datetime.strptime("2024-" + key, "%Y-%m-%d").strftime("%-d %B")
    except ValueError:
        return key


def step_day(key, delta):
    """Next/previous day key, through the leap year so 29 February is included."""
    d = datetime.strptime("2024-" + key, "%Y-%m-%d").date()
    from datetime import timedelta
    d2 = d + timedelta(days=delta)
    if d2.year != 2024:
        d2 = d2.replace(year=2024)
    return d2.strftime("%m-%d")
