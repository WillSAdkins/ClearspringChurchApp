"""
Hebrew and Greek behind each verse — a word study for the Bible reader.

Data: STEPBible.org (Tyndale House, Cambridge), licensed CC BY 4.0.
  TAHOT  Translators Amalgamated Hebrew OT
  TAGNT  Translators Amalgamated Greek NT
  TBESH / TBESG  Translators Brief lexicons of Extended Strong's
The licence requires attribution, which the reader shows under every study.

Built into static/bibles/original_words.sqlite (compressed per chapter) by
the build script kept alongside the handover notes. The words follow the
original-language text, so the study works with any English translation —
the English words people see differ, the Hebrew and Greek underneath don't.
"""

import json
import os
import re
import sqlite3
import zlib
from functools import lru_cache

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "static", "bibles", "original_words.sqlite")

ATTRIBUTION = ("Hebrew and Greek data from STEPBible.org (Tyndale House, Cambridge), "
               "CC BY 4.0.")

_TRAIL = re.compile(r"[\s,.;:·᾽’'?!»«·׃]+$")


def available():
    return os.path.exists(DB_PATH)


def _connect():
    # Read-only, one connection per call: cheap, and safe under gunicorn.
    return sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)


@lru_cache(maxsize=64)
def _chapter(slug, chapter):
    with _connect() as db:
        row = db.execute("SELECT data FROM chapter_words WHERE slug=? AND chapter=?",
                         (slug, chapter)).fetchone()
    return json.loads(zlib.decompress(row[0])) if row else {}


def _gloss(text):
    text = _TRAIL.sub("", text or "").strip()
    # STEP marks untranslatable grammar words in angle brackets; say what they do.
    text = text.replace("<obj.>", "(marks the object)")
    return re.sub(r"<([^<>]+)>", r"(\1)", text)


def verse_words(slug, chapter, verse):
    """Every original-language word in the verse, in order, with its entry."""
    if not available():
        return None
    words = _chapter(slug, int(chapter)).get(str(int(verse)), [])
    if not words:
        return []
    keys = sorted({w[3] for w in words if w[3]})
    entries = {}
    if keys:
        with _connect() as db:
            q = "SELECT strong, word, translit, pos, gloss, definition FROM lexicon WHERE strong IN (%s)" % ",".join("?" * len(keys))
            for k, word, tr, pos, gloss, definition in db.execute(q, keys):
                entries[k] = {"lemma": word, "lemma_translit": tr, "pos": pos,
                              "meaning": gloss.lstrip(": ").strip(), "definition": definition}
    out = []
    for orig, translit, gloss, strong in words:
        item = {
            "word": _TRAIL.sub("", orig),
            "translit": translit,
            "gloss": _gloss(gloss),
            "strong": strong,
            # Strong's own numbering, without STEP's sense letters (H7225G → H7225)
            "strong_display": re.sub(r"^([HG])0*(\d+)[A-Z]?$", r"\1\2", strong) if strong else "",
        }
        item.update(entries.get(strong, {}))
        out.append(item)
    return out


def language_of(slug):
    from bible_books import NEW_TESTAMENT
    return "Greek" if slug in {b["slug"] for b in NEW_TESTAMENT} else "Hebrew"
