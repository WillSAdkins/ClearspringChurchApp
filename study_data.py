"""
Lookups behind the Bible reference pages ("everything is a page").

  verse pages   /bible/v/<book>/<chapter>/<verse>
  word pages    /bible/word/<strong>

Data files (all in static/bibles, each with its own licence note):
  asv.sqlite               American Standard Version (public domain) — used
                           for previews because it is local and instant
  cross_references.sqlite  Treasury of Scripture Knowledge cross-references
  original_words.sqlite    STEPBible Hebrew/Greek words, lexicon, concordance
"""

import json
import os
import re
import sqlite3
import zlib
from collections import Counter
from functools import lru_cache

from bible_books import ALL_BOOKS, BOOKS_BY_SLUG, NEW_TESTAMENT

_HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles")
# Previews use the app's default translation (WEB), falling back to ASV.
ASV_DB = os.path.join(_HERE, "web.sqlite") if os.path.exists(os.path.join(_HERE, "web.sqlite")) else os.path.join(_HERE, "asv.sqlite")
XREF_DB = os.path.join(_HERE, "cross_references.sqlite")
WORDS_DB = os.path.join(_HERE, "original_words.sqlite")

_NT_SLUGS = {b["slug"] for b in NEW_TESTAMENT}


def _ro(path):
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True)


def ref_label(slug, chapter, verse=None):
    name = BOOKS_BY_SLUG[slug]["name"]
    return f"{name} {chapter}:{verse}" if verse else f"{name} {chapter}"


# ------------------------------------------------------------------ ASV text

def asv_texts(refs):
    """{(slug, ch, v): text} for a batch of references, from the local ASV."""
    out = {}
    if not refs or not os.path.exists(ASV_DB):
        return out
    with _ro(ASV_DB) as db:
        for slug, ch, v in refs:
            row = db.execute("SELECT text FROM verses WHERE book=? AND chapter=? AND verse=?",
                             (slug, ch, v)).fetchone()
            if row:
                out[(slug, ch, v)] = row[0]
    return out


def chapter_verse_count(slug, chapter):
    if not os.path.exists(ASV_DB):
        return 0
    with _ro(ASV_DB) as db:
        row = db.execute("SELECT MAX(verse) FROM verses WHERE book=? AND chapter=?",
                         (slug, chapter)).fetchone()
    return row[0] or 0


def neighbours(slug, chapter, verse):
    """Previous and next verse, crossing chapter and book boundaries."""
    idx = next(i for i, b in enumerate(ALL_BOOKS) if b["slug"] == slug)
    prev = nxt = None
    if verse > 1:
        prev = (slug, chapter, verse - 1)
    elif chapter > 1:
        prev = (slug, chapter - 1, chapter_verse_count(slug, chapter - 1))
    elif idx > 0:
        pb = ALL_BOOKS[idx - 1]
        prev = (pb["slug"], pb["chapters"], chapter_verse_count(pb["slug"], pb["chapters"]))
    if verse < chapter_verse_count(slug, chapter):
        nxt = (slug, chapter, verse + 1)
    elif chapter < BOOKS_BY_SLUG[slug]["chapters"]:
        nxt = (slug, chapter + 1, 1)
    elif idx < len(ALL_BOOKS) - 1:
        nxt = (ALL_BOOKS[idx + 1]["slug"], 1, 1)
    return prev, nxt


# ------------------------------------------------------- cross-references

@lru_cache(maxsize=32)
def _xref_chapter(slug, chapter):
    if not os.path.exists(XREF_DB):
        return {}
    with _ro(XREF_DB) as db:
        row = db.execute("SELECT data FROM chapter_refs WHERE slug=? AND chapter=?",
                         (slug, chapter)).fetchone()
    return json.loads(zlib.decompress(row[0])) if row else {}


def cross_references(slug, chapter, verse):
    refs = [(ALL_BOOKS[b]["slug"], c, v) for b, c, v in _xref_chapter(slug, chapter).get(str(verse), [])]
    texts = asv_texts(refs)
    return [{"slug": s, "chapter": c, "verse": v, "ref": ref_label(s, c, v),
             "text": texts.get((s, c, v), "")} for s, c, v in refs]


def cross_reference_counts(slug, chapter):
    """{verse: number of cross-references} for a whole chapter (reader badges)."""
    return {int(v): len(r) for v, r in _xref_chapter(slug, chapter).items()}


# ------------------------------------------------------------- word pages

def normalise_strong(code):
    """Accept G26, g0026, H7225, H7225G … → the key used in the data."""
    m = re.fullmatch(r"([HGhg])0*(\d{1,4})([A-Za-z]?)", (code or "").strip())
    if not m:
        return None
    return f"{m.group(1).upper()}{int(m.group(2)):04d}{m.group(3).upper()}"


def lexicon_entry(key):
    if not os.path.exists(WORDS_DB):
        return None
    with _ro(WORDS_DB) as db:
        row = db.execute("SELECT strong, word, translit, pos, gloss, definition FROM lexicon WHERE strong=?",
                         (key,)).fetchone()
        if not row and not key[-1].isalpha():
            # A bare number: pick the most-used sense of it (H7225 → H7225G)
            row = db.execute(
                "SELECT l.strong, l.word, l.translit, l.pos, l.gloss, l.definition FROM lexicon l "
                "LEFT JOIN concordance c ON c.strong = l.strong WHERE l.strong LIKE ? "
                "ORDER BY COALESCE(c.count, 0) DESC LIMIT 1", (key + "_",)).fetchone()
    if not row:
        return None
    k, word, tr, pos, gloss, definition = row
    return {"strong": k, "lemma": word, "translit": tr, "pos": pos,
            "meaning": (gloss or "").lstrip(": ").strip(), "definition": definition,
            "language": "Hebrew" if k.startswith("H") else "Greek",
            "display": re.sub(r"^([HG])0*(\d+)[A-Z]?$", r"\1\2", k)}


def related_senses(key):
    """Other senses that share the Strong's number (H0776G / H0776H …)."""
    base = re.sub(r"[A-Z]$", "", key)
    with _ro(WORDS_DB) as db:
        rows = db.execute("SELECT strong, gloss FROM lexicon WHERE strong LIKE ? AND strong != ?",
                          (base + "%", key)).fetchall()
    return [{"strong": s, "meaning": (g or "").lstrip(": ")} for s, g in rows if len(s) <= len(base) + 1]


@lru_cache(maxsize=32)
def _concordance(key):
    with _ro(WORDS_DB) as db:
        row = db.execute("SELECT count, data FROM concordance WHERE strong=?", (key,)).fetchone()
    if not row:
        return 0, []
    return row[0], json.loads(zlib.decompress(row[1]))


def _clean_gloss(g):
    g = re.sub(r"[\s,.;:·?!]+$", "", g or "").strip()
    g = re.sub(r"[<>\[\]]", "", g)
    return g.lower()


def concordance(key, page=1, per_page=40):
    total, rows = _concordance(key)
    renderings = Counter(_clean_gloss(r[3]) for r in rows if _clean_gloss(r[3]))
    books = Counter(ALL_BOOKS[r[0]]["name"] for r in rows)
    start = (page - 1) * per_page
    chunk = rows[start:start + per_page]
    refs = [(ALL_BOOKS[b]["slug"], c, v) for b, c, v, _ in chunk]
    texts = asv_texts(refs)
    items = [{"slug": s, "chapter": c, "verse": v, "ref": ref_label(s, c, v),
              "text": texts.get((s, c, v), ""), "gloss": _clean_gloss(r[3])}
             for (s, c, v), r in zip(refs, chunk)]
    return {
        "total_uses": total,
        "verse_count": len(rows),
        "renderings": renderings.most_common(8),
        "books": books.most_common(),
        "items": items,
        "page": page,
        "pages": max(1, -(-len(rows) // per_page)),
    }


def testament_of(slug):
    return "Greek" if slug in _NT_SLUGS else "Hebrew"


_NAME_TO_SLUG = {b["name"].lower(): b["slug"] for b in ALL_BOOKS}
_NAME_TO_SLUG.update({"psalm": "psalms", "song of songs": "song-of-solomon"})


def parse_verse_ref(ref):
    """'Galatians 5:22-23' → ('galatians', 5, 22), or None."""
    m = re.match(r"^\s*(.+?)\s+(\d{1,3}):(\d{1,3})", ref or "")
    if not m:
        return None
    slug = _NAME_TO_SLUG.get(m.group(1).strip().lower())
    return (slug, int(m.group(2)), int(m.group(3))) if slug else None


# ---------- Searching the Greek and Hebrew lexicon ----------

def _plain(text):
    """'agapē' → 'agape', 'sha·lom' → 'shalom', for forgiving matching."""
    import unicodedata
    t = unicodedata.normalize("NFKD", text or "")
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    return re.sub(r"[·ʼʾʿ'\-\s]", "", t).lower()


@lru_cache(maxsize=1)
def _lexicon_index():
    if not os.path.exists(WORDS_DB):
        return []
    with _ro(WORDS_DB) as db:
        counts = dict(db.execute("SELECT strong, count FROM concordance"))
        rows = db.execute("SELECT strong, word, translit, gloss FROM lexicon").fetchall()
    out = []
    for strong, word, translit, gloss in rows:
        meaning = (gloss or "").lstrip(": ").strip()
        out.append({
            "strong": strong, "word": word or "", "translit": translit or "",
            "meaning": meaning, "count": counts.get(strong, 0),
            "language": "Greek" if strong.startswith("G") else "Hebrew",
            "display": re.sub(r"^([HG])0*(\d+)[A-Z]?$", r"\1\2", strong),
            "_m": meaning.lower(), "_t": _plain(translit), "_w": _plain(word),
        })
    return out


def search_lexicon(q, language=None, limit=40):
    """Words whose meaning, transliteration, original spelling or Strong's
    number matches. Best matches first, then the most used."""
    q = (q or "").strip()
    if not q:
        return []
    idx = _lexicon_index()
    if language in ("Greek", "Hebrew"):
        idx = [w for w in idx if w["language"] == language]
    key = normalise_strong(q)
    if key:
        hits = [w for w in idx if w["strong"] == key or re.sub(r"[A-Z]$", "", w["strong"]) == key]
        return sorted(hits, key=lambda w: -w["count"])[:limit]
    ql, qp = q.lower(), _plain(q)
    scored = []
    word_re = re.compile(r"(^|[^a-z])" + re.escape(ql) + r"($|[^a-z])")
    for w in idx:
        m = w["_m"]
        if m == ql or m == "to " + ql:
            s = 0
        elif qp and (w["_t"] == qp or w["_w"] == qp):
            s = 0
        elif word_re.search(m):
            s = 1
        elif qp and len(qp) >= 3 and (w["_t"].startswith(qp) or w["_w"].startswith(qp)
                                     or (len(qp) >= 4 and w["_t"].endswith(qp))):
            s = 2  # "hesed" finds che·sed; "agap" finds agapē
        elif len(ql) >= 4 and ql in m:
            s = 3
        else:
            continue
        if w["meaning"][:1].isupper() and not w["meaning"].split(":")[0].isupper() and not q[:1].isupper():
            s += 2.5  # a person or place called that comes after the word itself
        scored.append((s, -w["count"], w))
    scored.sort(key=lambda x: (x[0], x[1]))
    return [w for _, _, w in scored[:limit]]


FEATURED_WORDS = {
    "Greek": ["G0026", "G5485", "G4102G", "G1680", "G1515", "G3056", "G4151G", "G0932",
              "G4991", "G3341", "G2098", "G1577", "G3875", "G2222"],
    "Hebrew": ["H2617A", "H7965G", "H3068G", "H0430G", "H8451", "H7307G", "H3519",
               "H0571G", "H1288", "H1350A", "H6944G", "H0539"],
}


def featured_words():
    by = {w["strong"]: w for w in _lexicon_index()}
    return {lang: [by[k] for k in keys if k in by] for lang, keys in FEATURED_WORDS.items()}
