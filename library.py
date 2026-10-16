"""
The reference library: dictionary, topics, commentaries, people, places,
events, parallels, the Gospel harmony, journeys and creeds.

Everything is read from static/bibles/library.sqlite, built by
tools/build_library.py. Licences: static/bibles/LIBRARY_LICENSES.txt.
"""

import json
import os
import re
import sqlite3
import zlib
from functools import lru_cache

from bible_books import ALL_BOOKS, BOOKS_BY_SLUG

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "library.sqlite")
BOOK_INDEX = {b["slug"]: i for i, b in enumerate(ALL_BOOKS)}

COMMENTARIES = {
    "mhcc": {"name": "Matthew Henry", "full": "Matthew Henry’s Concise Commentary", "year": "1706",
             "about": "The much-loved one-volume abridgement of Henry’s commentary on the whole Bible: warm, practical and devotional."},
    "tdavid": {"name": "Spurgeon", "full": "C. H. Spurgeon’s Treasury of David", "year": "1869–85",
               "about": "Spurgeon’s great work on the Psalms: his own exposition verse by verse, with notes gathered from many older writers."},
}


def available():
    return os.path.exists(DB)


def _db():
    conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


_conn = None


def db():
    global _conn
    if _conn is None:
        _conn = _db()
    return _conn


def _z(blob, as_json=False):
    if blob is None:
        return None
    s = zlib.decompress(blob).decode("utf-8")
    return json.loads(s) if as_json else s


def ref_label(slug, ch, v1=None, v2=None):
    name = "Psalm" if slug == "psalms" and v1 else BOOKS_BY_SLUG[slug]["name"]
    if not v1:
        return f"{name} {ch}"
    return f"{name} {ch}:{v1}" + (f"–{v2}" if v2 and v2 != v1 else "")


def _ranges(verses):
    """[(slug, ch, v)…] → [{'label','href','slug','chapter','verse'}] merged into runs."""
    runs = []
    for slug, ch, v in verses:
        if runs and runs[-1][0] == slug and runs[-1][1] == ch and runs[-1][3] + 1 == v:
            runs[-1][3] = v
        else:
            runs.append([slug, ch, v, v])
    return [{"slug": s, "chapter": c, "verse": a, "end": b, "label": ref_label(s, c, a, b),
             "href": f"/bible/v/{s}/{c}/{a}"} for s, c, a, b in runs]


def by_book(verses):
    """Group verse references by book for long lists."""
    out = []
    for r in _ranges(verses):
        if not out or out[-1]["slug"] != r["slug"]:
            out.append({"slug": r["slug"], "name": BOOKS_BY_SLUG[r["slug"]]["name"], "refs": []})
        out[-1]["refs"].append(r)
    return out


# ---------------------------------------------------------------- search

def search(q, limit=8):
    """Library-wide name search: dictionary, topics, people, places."""
    q = (q or "").strip()
    if len(q) < 2:
        return {}
    like = q.replace("%", "").replace("_", "") + "%"
    word = "% " + like
    c = db()
    def rows(sql, *args):
        return [dict(r) for r in c.execute(sql, args).fetchall()]
    return {
        "people": rows("SELECT slug, name, title, verses FROM people WHERE name LIKE ? OR name LIKE ? OR title LIKE ? OR title LIKE ? "
                       "ORDER BY name = ? COLLATE NOCASE DESC, verses DESC LIMIT ?", like, word, like, word, q, limit),
        "places": rows("SELECT slug, name, verses FROM places WHERE name LIKE ? OR name LIKE ? ORDER BY name = ? DESC, verses DESC LIMIT ?", like, word, q, limit),
        "topics": rows("SELECT slug, name, refs FROM topics WHERE name LIKE ? OR name LIKE ? ORDER BY name = ? COLLATE NOCASE DESC, refs DESC LIMIT ?", like, word, q, limit),
        "dictionary": rows("SELECT slug, term FROM dictionary WHERE term LIKE ? OR term LIKE ? ORDER BY term = ? DESC, length(term) LIMIT ?", like, word, q, limit),
    }


def letter_index(table, letter, name_col="name", order="name"):
    letter = (letter or "a")[:1].lower()
    sql = f"SELECT * FROM {table} WHERE lower(substr({name_col},1,1)) = ? ORDER BY {order} COLLATE NOCASE"
    return [dict(r) for r in db().execute(sql, (letter,)).fetchall()]


# ------------------------------------------------------------ dictionary

def name_meaning(name):
    r = db().execute("SELECT name, meaning FROM names WHERE key=?", ((name or "").lower(),)).fetchone()
    return r["meaning"] if r else None


def dictionary(slug):
    r = db().execute("SELECT * FROM dictionary WHERE slug=?", (slug,)).fetchone()
    if not r:
        return None
    senses = _z(r["data"], True)
    return {"slug": slug, "term": r["term"], "senses": senses, "meaning": name_meaning(r["term"])}


def dictionary_neighbours(term):
    c = db()
    prev = c.execute("SELECT slug, term FROM dictionary WHERE term < ? ORDER BY term DESC LIMIT 1", (term,)).fetchone()
    nxt = c.execute("SELECT slug, term FROM dictionary WHERE term > ? ORDER BY term LIMIT 1", (term,)).fetchone()
    return (dict(prev) if prev else None, dict(nxt) if nxt else None)


def dictionary_for(name):
    r = db().execute("SELECT slug, term FROM dictionary WHERE term = ? COLLATE NOCASE", (name,)).fetchone()
    return dict(r) if r else None


# ---------------------------------------------------------------- topics

def topic(slug):
    r = db().execute("SELECT * FROM topics WHERE slug=?", (slug,)).fetchone()
    if not r:
        return None
    return {"slug": slug, "name": r["name"], "html": _z(r["body"]), "refs": r["refs"]}


def topics_for_verse(slug, ch, v, limit=12):
    rows = db().execute(
        "SELECT t.slug, t.name, t.refs FROM topic_verses tv JOIN topics t ON t.slug = tv.topic "
        "WHERE tv.book=? AND tv.chapter=? AND tv.verse=? ORDER BY t.refs DESC LIMIT ?", (slug, ch, v, limit)).fetchall()
    return [dict(r) for r in rows]


POPULAR_TOPICS = ["love", "faith", "prayer", "grace", "forgiveness", "hope", "joy", "peace", "fear",
                  "holy-spirit", "salvation", "repentance", "anger", "money", "marriage", "children",
                  "wisdom", "humility", "patience", "suffering", "heaven", "worship", "thankfulness", "temptation"]


def popular_topics():
    marks = ",".join("?" * len(POPULAR_TOPICS))
    rows = {r["slug"]: dict(r) for r in db().execute(f"SELECT slug, name, refs FROM topics WHERE slug IN ({marks})", POPULAR_TOPICS)}
    return [rows[s] for s in POPULAR_TOPICS if s in rows]


# ------------------------------------------------------------ commentary

def commentary_chapter(source, slug, ch):
    rows = db().execute("SELECT v1, v2, label, body FROM commentary WHERE source=? AND book=? AND chapter=? ORDER BY v1",
                        (source, slug, ch)).fetchall()
    return [{"v1": r["v1"], "v2": r["v2"], "label": r["label"], "html": _z(r["body"])} for r in rows]


def commentary_sources_for(slug, ch):
    out = []
    for src in COMMENTARIES:
        if db().execute("SELECT 1 FROM commentary WHERE source=? AND book=? AND chapter=? LIMIT 1", (src, slug, ch)).fetchone():
            out.append(src)
    return out


def commentary_for_verse(slug, ch, v):
    """The section of each commentary that covers this verse."""
    out = []
    for src, per in (("mhcc", "mhcc"), ("tdavid", "tdavid-v")):
        r = db().execute("SELECT v1, v2, label, body FROM commentary WHERE source=? AND book=? AND chapter=? "
                         "AND v1 <= ? AND v2 >= ? AND v1 > 0 ORDER BY v1 DESC LIMIT 1", (per, slug, ch, v, v)).fetchone()
        if r:
            out.append({"source": src, "name": COMMENTARIES[src]["name"], "label": r["label"],
                        "html": _z(r["body"]), "v1": r["v1"]})
    return out


# --------------------------------------------------------- people & places

def person(slug):
    r = db().execute("SELECT * FROM people WHERE slug=?", (slug,)).fetchone()
    if not r:
        return None
    data = _z(r["data"], True)
    p = {"slug": slug, "name": r["name"], "title": r["title"], "verse_count": r["verses"],
         "summary": _z(r["summary"]), **data}
    p["meaning"] = name_meaning(r["name"])
    rel = data.get("rel", {})
    p["family"] = {k: [mini_person(s) for s in v] for k, v in rel.items()}
    p["family"] = {k: [x for x in v if x] for k, v in p["family"].items()}
    # grandparents and grandchildren for the tree
    fathers = rel.get("father", [])
    p["grandparents"] = []
    for f in fathers + rel.get("mother", []):
        fp = _person_rel(f)
        for k in ("father", "mother"):
            for s in fp.get(k, []):
                mp = mini_person(s)
                if mp:
                    p["grandparents"].append(mp)
    p["born_at"] = [mini_place(s) for s in data.get("born_at", [])]
    p["died_at"] = [mini_place(s) for s in data.get("died_at", [])]
    verses = [tuple(x) for x in data.get("verses", [])]
    p["by_book"] = by_book(verses)
    p["first"] = _ranges(verses[:1])[0] if verses else None
    p["dictionary"] = dictionary_for(r["name"])
    return p


def _person_rel(slug):
    r = db().execute("SELECT data FROM people WHERE slug=?", (slug,)).fetchone()
    return (_z(r["data"], True) or {}).get("rel", {}) if r else {}


@lru_cache(maxsize=4096)
def mini_person(slug):
    r = db().execute("SELECT slug, name, title, verses FROM people WHERE slug=?", (slug,)).fetchone()
    return dict(r) if r else None


@lru_cache(maxsize=4096)
def mini_place(slug):
    r = db().execute("SELECT slug, name, lat, lon, verses FROM places WHERE slug=?", (slug,)).fetchone()
    return dict(r) if r else None


def namesakes(name, slug):
    rows = db().execute("SELECT slug, name, title, verses FROM people WHERE name=? AND slug != ? ORDER BY verses DESC", (name, slug)).fetchall()
    return [dict(r) for r in rows]


def place(slug):
    r = db().execute("SELECT * FROM places WHERE slug=?", (slug,)).fetchone()
    if not r:
        return None
    data = _z(r["data"], True)
    p = {"slug": slug, "name": r["name"], "lat": r["lat"], "lon": r["lon"], "verse_count": r["verses"],
         "summary": _z(r["summary"]), **data}
    p["meaning"] = name_meaning(r["name"])
    verses = [tuple(x) for x in data.get("verses", [])]
    p["by_book"] = by_book(verses)
    p["dictionary"] = dictionary_for(r["name"])
    return p


def nearby_places(lat, lon, slug, n=8):
    if lat is None:
        return []
    rows = db().execute(
        "SELECT slug, name, lat, lon, verses, ((lat-?)*(lat-?) + (lon-?)*(lon-?)*0.72) AS d2 FROM places "
        "WHERE lat IS NOT NULL AND slug != ? AND verses > 0 ORDER BY d2 LIMIT ?", (lat, lat, lon, lon, slug, n * 40)).fetchall()
    out = []
    for r in rows:
        km = (r["d2"] ** 0.5) * 111
        if 3 <= km <= 45:     # skip places inside the same town (Jerusalem's gates, hills…)
            out.append({**dict(r), "km": round(km)})
    # the best-known places round about, nearest first
    out = sorted(sorted(out, key=lambda x: -x["verses"])[:n], key=lambda x: x["km"])
    return out


def map_places(min_verses=1):
    rows = db().execute("SELECT slug, name, lat, lon, verses FROM places WHERE lat IS NOT NULL AND verses >= ? ORDER BY verses DESC",
                        (min_verses,)).fetchall()
    return [[r["slug"], r["name"], round(r["lat"], 3), round(r["lon"], 3), r["verses"]] for r in rows]


def chapter_people(slug, ch, limit=24):
    rows = db().execute("SELECT p.slug, p.name, p.title, cp.n FROM chapter_people cp JOIN people p ON p.slug = cp.slug "
                        "WHERE cp.book=? AND cp.chapter=? AND p.slug NOT IN ('god', 'holy-spirit') ORDER BY cp.n DESC, p.verses DESC LIMIT ?", (slug, ch, limit)).fetchall()
    return [dict(r) for r in rows]


def chapter_places(slug, ch, limit=24):
    rows = db().execute("SELECT p.slug, p.name, p.lat, p.lon, cp.n FROM chapter_places cp JOIN places p ON p.slug = cp.slug "
                        "WHERE cp.book=? AND cp.chapter=? ORDER BY cp.n DESC LIMIT ?", (slug, ch, limit)).fetchall()
    return [dict(r) for r in rows]


def verse_people_places(slug, ch, v):
    """People and places named in one verse."""
    ppl, pls = [], []
    for r in chapter_people(slug, ch, 200):
        d = _z(db().execute("SELECT data FROM people WHERE slug=?", (r["slug"],)).fetchone()["data"], True)
        if [slug, ch, v] in d.get("verses", []):
            ppl.append(r)
    for r in chapter_places(slug, ch, 200):
        d = _z(db().execute("SELECT data FROM places WHERE slug=?", (r["slug"],)).fetchone()["data"], True)
        if [slug, ch, v] in d.get("verses", []):
            pls.append(r)
    return ppl, pls


def notable_people(limit=40):
    rows = db().execute("SELECT slug, name, title, verses FROM people WHERE slug NOT IN ('god', 'holy-spirit') ORDER BY verses DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


def notable_places(limit=40):
    rows = db().execute("SELECT slug, name, verses FROM places WHERE lat IS NOT NULL ORDER BY verses DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------- events

ERAS = [
    (-99999, -2100, "Beginnings"), (-2100, -1500, "The patriarchs"), (-1500, -1050, "Exodus, conquest and judges"),
    (-1050, -930, "The united kingdom"), (-930, -586, "The divided kingdom"), (-586, -400, "Exile and return"),
    (-400, -5, "Between the Testaments"), (-5, 34, "The life of Jesus"), (34, 200, "The early church"),
]


def era_of(year):
    if year is None:
        return "Undated"
    for a, b, name in ERAS:
        if a <= year < b:
            return name
    return "The early church"


def fmt_year(y):
    if y is None:
        return ""
    return f"{-y} BC" if y < 0 else f"AD {y}"


@lru_cache(maxsize=1)
def timeline():
    rows = db().execute("SELECT id, title, year, sort, data FROM events ORDER BY sort").fetchall()
    out = []
    for r in rows:
        d = _z(r["data"], True)
        rng = d.get("range") or []
        first = rng[0] if rng else None
        out.append({"id": r["id"], "title": r["title"], "year": r["year"], "when": fmt_year(r["year"]),
                    "era": era_of(r["year"]),
                    "ref": ref_label(first[0], first[1], first[2], first[3]) if first else None,
                    "href": f"/bible/v/{first[0]}/{first[1]}/{first[2]}" if first else None,
                    "people": d.get("people", [])[:4], "places": d.get("places", [])[:3],
                    "names": [(x, (mini_person(x) or {}).get("name", x)) for x in d.get("people", [])[:4]]})
    return tuple(out)


def events_for_person(slug):
    out = []
    for e in timeline():
        if slug in e["people"]:
            out.append(e)
    return out


def events_for_place(slug):
    return [e for e in timeline() if slug in e["places"]]


# ------------------------------------------------------------- parallels

def parallels_for(slug, ch, v):
    c = db()
    gids = [r["gid"] for r in c.execute("SELECT DISTINCT gid FROM parallels WHERE book=? AND chapter=? AND v1<=? AND v2>=?",
                                         (slug, ch, v, v)).fetchall()]
    out = []
    for g in gids:
        rows = c.execute("SELECT kind, book, chapter, v1, v2 FROM parallels WHERE gid=?", (g,)).fetchall()
        others = [r for r in rows if not (r["book"] == slug and r["chapter"] == ch and r["v1"] <= v <= r["v2"])]
        for r in others:
            out.append({"kind": r["kind"], "slug": r["book"], "chapter": r["chapter"], "verse": r["v1"],
                        "label": ref_label(r["book"], r["chapter"], r["v1"], r["v2"]),
                        "href": f"/bible/v/{r['book']}/{r['chapter']}/{r['v1']}"})
    seen, uniq = set(), []
    for o in sorted(out, key=lambda o: (BOOK_INDEX[o["slug"]], o["chapter"], o["verse"])):
        if o["label"] not in seen:
            seen.add(o["label"])
            uniq.append(o)
    return uniq


def ot_in_nt():
    """OT passages quoted or echoed in the NT, grouped by NT book."""
    c = db()
    groups = {}
    for r in c.execute("SELECT gid, book, chapter, v1, v2 FROM parallels WHERE kind='quote' ORDER BY gid"):
        groups.setdefault(r["gid"], []).append(dict(r))
    by_nt = {}
    for gid, rows in groups.items():
        nt = [r for r in rows if BOOK_INDEX[r["book"]] >= 39]
        ot = [r for r in rows if BOOK_INDEX[r["book"]] < 39]
        for n in nt:
            key = (BOOK_INDEX[n["book"]], n["chapter"], n["v1"])
            item = by_nt.setdefault(key, {"nt": {"label": ref_label(n["book"], n["chapter"], n["v1"], n["v2"]),
                                                 "href": f"/bible/v/{n['book']}/{n['chapter']}/{n['v1']}", "slug": n["book"]},
                                          "ot": []})
            for o in ot:
                lab = ref_label(o["book"], o["chapter"], o["v1"], o["v2"])
                if lab not in [x["label"] for x in item["ot"]]:
                    item["ot"].append({"label": lab, "href": f"/bible/v/{o['book']}/{o['chapter']}/{o['v1']}"})
    books = []
    for key in sorted(by_nt):
        item = by_nt[key]
        if not books or books[-1]["slug"] != item["nt"]["slug"]:
            books.append({"slug": item["nt"]["slug"], "name": BOOKS_BY_SLUG[item["nt"]["slug"]]["name"], "items": []})
        books[-1]["items"].append(item)
    return books


def harmony():
    return [dict(r) for r in db().execute("SELECT * FROM harmony ORDER BY seq").fetchall()]


# ---------------------------------------------------------------- routes

def routes():
    return [dict(r) for r in db().execute("SELECT slug, seq, title, era, ref FROM routes ORDER BY seq").fetchall()]


def route(slug):
    r = db().execute("SELECT * FROM routes WHERE slug=?", (slug,)).fetchone()
    if not r:
        return None
    return {"slug": slug, "title": r["title"], "era": r["era"], "ref": r["ref"], "lines": _z(r["lines"], True)}


# ---------------------------------------------------------------- creeds

def creeds():
    return [dict(r) for r in db().execute("SELECT slug, title, year, format FROM creeds ORDER BY seq").fetchall()]


def creed(slug):
    r = db().execute("SELECT * FROM creeds WHERE slug=?", (slug,)).fetchone()
    if not r:
        return None
    d = _z(r["data"], True)
    return {"slug": slug, "title": r["title"], "year": r["year"], "format": r["format"],
            "meta": d.get("Metadata", {}), "data": d.get("Data")}


# -------------------------------------------------------- chapter summary

def chapter_resources(slug, ch):
    """What the library has for a chapter, for the reader's 'Study this chapter'."""
    return {
        "commentaries": commentary_sources_for(slug, ch),
        "people": chapter_people(slug, ch, 12),
        "places": chapter_places(slug, ch, 12),
    }
