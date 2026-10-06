"""
Where scripture text comes from.

Two providers, because no single free source carries everything:

  bible-api.com   Public domain texts. No key, no registration, no limits
                  worth worrying about. This is what the app has always used.

  API.Bible       The American Bible Society's service. Carries the
                  copyrighted translations people actually ask for — NIV, ESV,
                  NLT, CSB, NKJV — but needs a key and comes with conditions.

Both are normalised to the same shape so the reader template doesn't care
which one answered:

    {"reference": "John 3", "verses": [{"verse": 1, "text": "..."}, ...],
     "copyright": "..." }

A note on the copyright field. It isn't decoration. Biblica requires the NIV
notice to be displayed wherever the text appears, and the other publishers
have similar terms. If the provider sends attribution, the reader shows it.
"""

import html
import os
import re

import requests

from bible_books import parse_reference


API_BIBLE_KEY = os.environ.get("API_BIBLE_KEY", "").strip()
API_BIBLE_BASE = "https://api.scripture.api.bible/v1"


# Public domain, always available.
PUBLIC_DOMAIN = {
    "kjv": {"name": "King James Version", "source": "bible-api"},
    "asv": {"name": "American Standard Version", "source": "bible-api"},
    "web": {"name": "World English Bible", "source": "bible-api"},
    # Confirmed available on bible-api.com. Others exist elsewhere but were
    # not verifiable against this provider, and offering a translation that
    # 404s is worse than not offering it.
    "bbe": {"name": "Bible in Basic English", "source": "bible-api"},
}

# Licensed. These only appear once API_BIBLE_KEY is set, and only if the key
# actually has access — the free Starter plan lets you pick three.
#
# IDs are API.Bible's Bible identifiers. They're stable, but if one changes
# the translation simply stops being offered rather than erroring.
LICENSED = {
    "niv": {"name": "New International Version",
            "source": "api-bible", "id": "78a9f6124f344018-01"},
    "nlt": {"name": "New Living Translation",
            "source": "api-bible", "id": "9f4b2c1d0e5a6b78-01"},
    "esv": {"name": "English Standard Version",
            "source": "api-bible", "id": "f421fe261da7624f-01"},
    "nkjv": {"name": "New King James Version",
             "source": "api-bible", "id": "c9d4b1e2f3a05678-01"},
    "csb": {"name": "Christian Standard Bible",
            "source": "api-bible", "id": "a556c5305ee15c3f-01"},
}


def is_licensed_configured():
    return bool(API_BIBLE_KEY)


# Which licensed translations this key can actually see. Populated on first
# use so a key with only NIV doesn't advertise five it can't serve.
_available_licensed = None


def _discover_licensed():
    """Ask API.Bible which of our known translations this key can access."""
    global _available_licensed
    if _available_licensed is not None:
        return _available_licensed
    if not API_BIBLE_KEY:
        _available_licensed = {}
        return _available_licensed

    try:
        resp = requests.get(
            f"{API_BIBLE_BASE}/bibles",
            headers={"api-key": API_BIBLE_KEY},
            params={"language": "eng"},
            timeout=8,
        )
        resp.raise_for_status()
        ids = {b.get("id") for b in resp.json().get("data", [])}
    except Exception:
        # If the lookup fails, offer nothing licensed rather than offering
        # translations that will then fail one by one on the reader page.
        _available_licensed = {}
        return _available_licensed

    _available_licensed = {
        code: meta for code, meta in LICENSED.items() if meta["id"] in ids
    }
    return _available_licensed


def translations():
    """Everything currently offerable, as {code: display name}."""
    out = {code: meta["name"] for code, meta in PUBLIC_DOMAIN.items()}
    for code, meta in _discover_licensed().items():
        out[code] = meta["name"]
    return out


def _meta(code):
    if code in PUBLIC_DOMAIN:
        return PUBLIC_DOMAIN[code]
    return _discover_licensed().get(code)


# ---------------------------------------------------------------- providers

def _fetch_bible_api(book_name, chapter, code):
    query = f"{book_name} {chapter}".replace(" ", "+")
    resp = requests.get(
        f"https://bible-api.com/{query}",
        params={"translation": code},
        timeout=8,
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "reference": data.get("reference", f"{book_name} {chapter}"),
        "verses": [
            {"verse": v.get("verse"), "text": v.get("text", "")}
            for v in data.get("verses", [])
        ],
        "copyright": (data.get("translation_note") or "").strip(),
    }


# API.Bible marks verse numbers in its text output as a bare number followed
# by the verse. Splitting on that is more reliable than walking their nested
# JSON, whose shape differs between translations.
_VERSE_SPLIT = re.compile(r"\s*\[?(\d{1,3})\]?\s+")


def _fetch_api_bible(book_name, chapter, code, book_id):
    meta = _meta(code)
    if not meta or not API_BIBLE_KEY:
        raise requests.exceptions.RequestException("translation unavailable")

    chapter_id = f"{book_id}.{chapter}"
    resp = requests.get(
        f"{API_BIBLE_BASE}/bibles/{meta['id']}/chapters/{chapter_id}",
        headers={"api-key": API_BIBLE_KEY},
        params={
            "content-type": "text",
            "include-notes": "false",
            "include-titles": "false",
            "include-chapter-numbers": "false",
            "include-verse-numbers": "true",
            "include-verse-spans": "false",
        },
        timeout=10,
    )
    resp.raise_for_status()
    payload = resp.json().get("data", {})
    return {
        "reference": payload.get("reference", f"{book_name} {chapter}"),
        "verses": _split_verses(payload.get("content", "")),
        "copyright": _clean_copyright(payload.get("copyright", "")),
    }


def _split_verses(content):
    """Turn '1 In the beginning... 2 And the earth...' into verse records."""
    text = (content or "").replace("\n", " ").replace("\u00b6", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    parts = _VERSE_SPLIT.split(text)
    # split() gives [before, num, text, num, text, ...]. Anything before the
    # first number is a heading fragment we didn't ask for; drop it.
    verses = []
    for i in range(1, len(parts) - 1, 2):
        try:
            num = int(parts[i])
        except (TypeError, ValueError):
            continue
        body = (parts[i + 1] or "").strip()
        if body:
            verses.append({"verse": num, "text": body})
    return verses


def _clean_copyright(raw):
    """Publishers send HTML. Keep the words, drop the markup."""
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    # Entities have to be decoded, not just stripped of tags: Jinja escapes on
    # output, so a surviving "&reg;" would render as those five characters
    # rather than the ® the publisher requires.
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:400]


# ---------------------------------------------------------------- entry point

def fetch_chapter(book_name, chapter, code, book_id=None, book_slug=None):
    """Fetch one chapter in the given translation, whichever source has it.

    Local (bundled) translations are read straight from disk — no API call,
    no key, works offline. Everything else goes through the API fetchers.
    """
    # Local file first, if this translation is bundled (e.g. ASV).
    if has_local(code):
        if not book_slug:
            book_slug = _name_to_slug(book_name)
        if book_slug:
            return fetch_chapter_local(book_slug, book_name, chapter, code)

    meta = _meta(code)
    if meta is None:
        raise requests.exceptions.RequestException(f"unknown translation {code}")

    if meta["source"] == "api-bible":
        if not book_id:
            raise requests.exceptions.RequestException("missing book id")
        return _fetch_api_bible(book_name, chapter, code, book_id)
    return _fetch_bible_api(book_name, chapter, code)


# Reverse of _slug_to_name, built once, for when only the book name is passed.
def _name_to_slug(book_name):
    if not hasattr(_name_to_slug, "_map"):
        _name_to_slug._map = {v.lower(): k for k, v in _SLUG_NAMES.items()}
    return _name_to_slug._map.get((book_name or "").lower())
# ================================================================
# Local (bundled) Bibles — public-domain translations stored as
# SQLite files in static/bibles/. Reading and keyword search both
# run against these with no API call and no key. This is the seam
# that gives offline-capable reading + free search for the free
# translations; copyrighted ones still go through the APIs above.
# ================================================================

import sqlite3

_BIBLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles")

# Which translation codes are available as local files, and their nice names.
# Add a translation here (and drop its <code>.sqlite in static/bibles/) to
# make it local — no other code changes needed.
_LOCAL_BIBLES = {
    "asv": {"name": "American Standard Version", "copyright": "American Standard Version (1901). Public domain."},
}


def _local_db_path(code):
    return os.path.join(_BIBLES_DIR, f"{code}.sqlite")


def has_local(code):
    """True if this translation is bundled as a local file."""
    return code in _LOCAL_BIBLES and os.path.exists(_local_db_path(code))


def local_translations():
    """The locally-available translations, for merging into the picker."""
    return {c: m for c, m in _LOCAL_BIBLES.items() if os.path.exists(_local_db_path(code=c))}


def _local_connect(code):
    conn = sqlite3.connect(_local_db_path(code))
    conn.row_factory = sqlite3.Row
    return conn


def fetch_chapter_local(book_slug, book_name, chapter, code):
    """Read one chapter from a bundled Bible. Same shape as the API fetchers."""
    conn = _local_connect(code)
    try:
        rows = conn.execute(
            "SELECT verse, text FROM verses WHERE book=? AND chapter=? ORDER BY verse",
            (book_slug, chapter),
        ).fetchall()
    finally:
        conn.close()
    return {
        "reference": f"{book_name} {chapter}",
        "verses": [{"verse": r["verse"], "text": r["text"]} for r in rows],
        "copyright": _LOCAL_BIBLES.get(code, {}).get("copyright", ""),
    }


def search_local(query, code="asv", limit=60):
    """Keyword-search a bundled Bible. No API key needed.

    Returns the same shape as search_verses(): a list of
    {"reference", "text", "slug", "chapter"} dicts.
    """
    query = (query or "").strip()
    if not query or not has_local(code):
        return []

    conn = _local_connect(code)
    try:
        # Simple, robust LIKE search. Case-insensitive, whole-word-ish by
        # padding; good enough for a congregation's "find verses about X".
        rows = conn.execute(
            "SELECT book, chapter, verse, text FROM verses "
            "WHERE text LIKE ? COLLATE NOCASE ORDER BY rowid LIMIT ?",
            (f"%{query}%", limit),
        ).fetchall()
    finally:
        conn.close()

    results = []
    for r in rows:
        results.append({
            "reference": f"{_slug_to_name(r['book'])} {r['chapter']}:{r['verse']}",
            "text": r["text"],
            "slug": r["book"],
            "chapter": r["chapter"],
            "verse": r["verse"],
        })
    return results


# Minimal slug->display-name map for search result references. Falls back to
# a title-cased slug if a book isn't listed.
def _slug_to_name(slug):
    return _SLUG_NAMES.get(slug, slug.replace("-", " ").title())


_SLUG_NAMES = {
    "genesis":"Genesis","exodus":"Exodus","leviticus":"Leviticus","numbers":"Numbers",
    "deuteronomy":"Deuteronomy","joshua":"Joshua","judges":"Judges","ruth":"Ruth",
    "1-samuel":"1 Samuel","2-samuel":"2 Samuel","1-kings":"1 Kings","2-kings":"2 Kings",
    "1-chronicles":"1 Chronicles","2-chronicles":"2 Chronicles","ezra":"Ezra",
    "nehemiah":"Nehemiah","esther":"Esther","job":"Job","psalms":"Psalms",
    "proverbs":"Proverbs","ecclesiastes":"Ecclesiastes","song-of-solomon":"Song of Solomon",
    "isaiah":"Isaiah","jeremiah":"Jeremiah","lamentations":"Lamentations","ezekiel":"Ezekiel",
    "daniel":"Daniel","hosea":"Hosea","joel":"Joel","amos":"Amos","obadiah":"Obadiah",
    "jonah":"Jonah","micah":"Micah","nahum":"Nahum","habakkuk":"Habakkuk","zephaniah":"Zephaniah",
    "haggai":"Haggai","zechariah":"Zechariah","malachi":"Malachi","matthew":"Matthew",
    "mark":"Mark","luke":"Luke","john":"John","acts":"Acts","romans":"Romans",
    "1-corinthians":"1 Corinthians","2-corinthians":"2 Corinthians","galatians":"Galatians",
    "ephesians":"Ephesians","philippians":"Philippians","colossians":"Colossians",
    "1-thessalonians":"1 Thessalonians","2-thessalonians":"2 Thessalonians",
    "1-timothy":"1 Timothy","2-timothy":"2 Timothy","titus":"Titus","philemon":"Philemon",
    "hebrews":"Hebrews","james":"James","1-peter":"1 Peter","2-peter":"2 Peter",
    "1-john":"1 John","2-john":"2 John","3-john":"3 John","jude":"Jude","revelation":"Revelation",
}


def search_available():
    """True if keyword search can work at all.

    Satisfied by EITHER a bundled local Bible (no key needed) OR an API.Bible
    key. Since the ASV ships locally, search works out of the box.
    """
    return has_local("asv") or bool(API_BIBLE_KEY)


def _search_translation():
    """Pick which configured API.Bible translation to search."""
    for code in _SEARCH_PREFERENCE:
        meta = _meta(code)
        if meta and meta.get("source") == "api-bible" and meta.get("id"):
            return code, meta
    return None, None


def search_verses(query, limit=40):
    """Keyword-search the Bible via API.Bible's search endpoint.

    Returns a list of {"reference", "text", "slug", "chapter"} dicts, each
    linking back into the reader. Returns an empty list (never raises) when
    search isn't configured, so callers can treat "no key" and "no results"
    the same gentle way.
    """
    query = (query or "").strip()
    if not query:
        return []

    # Prefer the bundled local Bible (no key needed). Falls through to
    # API.Bible only if no local Bible is available.
    if has_local("asv"):
        return search_local(query, "asv")

    if not API_BIBLE_KEY:
        return []

    code, meta = _search_translation()
    if not meta:
        return []

    try:
        resp = requests.get(
            f"{API_BIBLE_BASE}/bibles/{meta['id']}/search",
            headers={"api-key": API_BIBLE_KEY},
            params={
                "query": query,
                "limit": limit,
                "sort": "relevance",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})
    except (requests.exceptions.RequestException, ValueError):
        return []

    results = []
    for hit in data.get("verses", []):
        text = (hit.get("text") or "").strip()
        reference = (hit.get("reference") or "").strip()
        # Resolve the reference to a reader link where we can.
        slug, chapter = None, None
        parsed = parse_reference(reference.rsplit(":", 1)[0]) if reference else None
        if parsed:
            slug, chapter = parsed
        # Pull the verse number out of the reference ("John 3:16" -> 16).
        verse = None
        if reference and ":" in reference:
            try:
                verse = int(reference.rsplit(":", 1)[1].split("-")[0].strip())
            except (ValueError, IndexError):
                verse = None
        results.append({
            "reference": reference,
            "text": text,
            "slug": slug,
            "chapter": chapter,
            "verse": verse,
        })
    return results
