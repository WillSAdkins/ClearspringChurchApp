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
    "web": {"name": "World English Bible", "source": "bible-api"},   # the app's default
    "webbe": {"name": "World English Bible (British)", "source": "local"},
    "bsb": {"name": "Berean Standard Bible", "source": "local"},
    "kjv": {"name": "King James Version", "source": "bible-api"},
    "asv": {"name": "American Standard Version", "source": "bible-api"},
    # Confirmed available on bible-api.com. Others exist elsewhere but were
    # not verifiable against this provider, and offering a translation that
    # 404s is worse than not offering it.
    "bbe": {"name": "Bible in Basic English", "source": "bible-api"},
    "ylt": {"name": "Young's Literal Translation", "source": "local"},
    "darby": {"name": "Darby Bible", "source": "local"},
}

# Licensed translations. Two routes, each with its own publisher's rules:
#
#   ESV        Crossway's own ESV API (ESV_API_KEY). Free for church and
#              non-commercial use. Rules: no more than 500 verses stored at once,
#              "ESV" shown with the text, a link to esv.org wherever the text
#              appears, and Crossway's notice on the copyright page.
#   API.Bible  The American Bible Society's service (API_BIBLE_KEY). The free
#              Starter plan gives non-commercial apps up to three copyrighted
#              translations. Rules: the publisher's notice shown, stored text
#              refreshed within 30 days, and every view reported through FUMS.
#
# API.Bible translations are found by their abbreviation in the key's own list,
# so the app never depends on internal IDs being right.
ESV_API_KEY = os.environ.get("ESV_API_KEY", "").strip()
ESV_URL = "https://api.esv.org/v3/passage/text/"
ESV_NOTICE = ("Scripture quotations marked “ESV” are from the ESV® Bible (The Holy Bible, English Standard Version®), "
              "© 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.")
ESV_VERSE_LIMIT = 500

LICENSED = {
    # code: (abbreviations API.Bible may use, display name)
    "niv": (("NIV", "NIV11", "NIV2011"), "New International Version"),
    "nlt": (("NLT",), "New Living Translation"),
    "csb": (("CSB",), "Christian Standard Bible"),
    "nkjv": (("NKJV",), "New King James Version"),
    "nasb": (("NASB", "NASB2020", "NASB1995"), "New American Standard Bible"),
}
API_BIBLE_REFRESH_DAYS = 30


def is_licensed_configured():
    return bool(API_BIBLE_KEY or ESV_API_KEY)


_available_licensed = None


def _discover_licensed():
    """Which licensed translations this app can actually serve right now."""
    global _available_licensed
    if _available_licensed is not None:
        return _available_licensed
    found = {}
    if ESV_API_KEY:
        found["esv"] = {"name": "English Standard Version", "source": "esv", "abbr": "ESV"}
    if API_BIBLE_KEY:
        try:
            resp = requests.get(f"{API_BIBLE_BASE}/bibles", headers={"api-key": API_BIBLE_KEY},
                                params={"language": "eng"}, timeout=8)
            resp.raise_for_status()
            bibles = resp.json().get("data", [])
        except Exception:
            bibles = None
        if bibles is None:
            # Don't remember a failure for ever: try again on a later request.
            return found
        for code, (abbrs, name) in LICENSED.items():
            for b in bibles:
                ab = (b.get("abbreviationLocal") or b.get("abbreviation") or "").upper().replace(" ", "")
                if ab in abbrs and b.get("id"):
                    found[code] = {"name": name, "source": "api-bible", "id": b["id"], "abbr": abbrs[0]}
                    break
    _available_licensed = found
    return _available_licensed


def licensed_status():
    """For the admin status page: what's switched on and working."""
    return {"esv_key": bool(ESV_API_KEY), "api_bible_key": bool(API_BIBLE_KEY),
            "live": {c: m["name"] for c, m in _discover_licensed().items()}}


def is_licensed(code):
    return code in _discover_licensed()


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


_api_bible_cache = {}   # (code, book_id, chapter) -> (fetched_at, result)
LAST_COPYRIGHT = {}     # code -> the publisher's notice, as last supplied (shown on the sources page)


def _fetch_api_bible(book_name, chapter, code, book_id):
    import time
    meta = _meta(code)
    if not meta or not API_BIBLE_KEY:
        raise requests.exceptions.RequestException("translation unavailable")
    key = (code, book_id, chapter)
    hit = _api_bible_cache.get(key)
    if hit and time.time() - hit[0] < API_BIBLE_REFRESH_DAYS * 86400:
        return hit[1]
    resp = requests.get(
        f"{API_BIBLE_BASE}/bibles/{meta['id']}/chapters/{book_id}.{chapter}",
        headers={"api-key": API_BIBLE_KEY},
        params={"content-type": "text", "include-notes": "false", "include-titles": "false",
                "include-chapter-numbers": "false", "include-verse-numbers": "true", "include-verse-spans": "false",
                "fums-version": "3"},
        timeout=10,
    )
    resp.raise_for_status()
    body = resp.json()
    payload = body.get("data", {})
    result = {
        "reference": payload.get("reference", f"{book_name} {chapter}"),
        "verses": _split_verses(payload.get("content", "")),
        "copyright": _clean_copyright(payload.get("copyright", "")),
        "fums": (body.get("meta") or {}).get("fumsToken"),
        "licensed": meta.get("abbr", code.upper()),
    }
    if result["copyright"]:
        LAST_COPYRIGHT[code] = result["copyright"]
    if len(_api_bible_cache) > 2000:
        _api_bible_cache.clear()
    _api_bible_cache[key] = (time.time(), result)
    return result


def report_views(tokens, device_id, session_id):
    """Tell API.Bible's Fair Use Management System that licensed text was shown
    (required by its licence). Done from the server so readers' browsers never
    contact a third party; fire and forget."""
    tokens = [t for t in tokens if t]
    if not tokens or not API_BIBLE_KEY:
        return
    import threading
    def go():
        try:
            requests.get("https://fums.api.bible/f3", params=[("t", t) for t in tokens] + [("dId", device_id), ("sId", session_id)], timeout=4)
        except Exception:
            pass
    threading.Thread(target=go, daemon=True).start()


# ESV: a small store that never holds more than 500 verses (Crossway's limit).
from collections import OrderedDict as _OD
_esv_cache = _OD()


def _fetch_esv(book_name, chapter):
    key = (book_name, chapter)
    if key in _esv_cache:
        _esv_cache.move_to_end(key)
        return _esv_cache[key]
    resp = requests.get(ESV_URL, headers={"Authorization": f"Token {ESV_API_KEY}"}, timeout=10, params={
        "q": f"{book_name} {chapter}", "include-passage-references": "false", "include-verse-numbers": "true",
        "include-first-verse-numbers": "true", "include-footnotes": "false", "include-footnote-body": "false",
        "include-headings": "false", "include-short-copyright": "false", "include-copyright": "false",
        "include-passage-horizontal-lines": "false", "include-heading-horizontal-lines": "false",
        "include-selahs": "true", "indent-paragraphs": "0", "indent-poetry": "false", "line-length": "0"})
    resp.raise_for_status()
    text = " ".join(resp.json().get("passages") or [])
    verses = []
    for m in re.finditer(r"\[(\d{1,3})\]\s*(.*?)(?=\s*\[\d{1,3}\]|$)", re.sub(r"\s+", " ", text).strip()):
        body = m.group(2).strip()
        if body:
            verses.append({"verse": int(m.group(1)), "text": body})
    result = {"reference": f"{book_name} {chapter}", "verses": verses, "copyright": "ESV® Bible © 2001 by Crossway. Used by permission.",
              "copyright_url": "https://www.esv.org", "licensed": "ESV"}
    _esv_cache[key] = result
    while sum(len(r["verses"]) for r in _esv_cache.values()) > ESV_VERSE_LIMIT and len(_esv_cache) > 1:
        _esv_cache.popitem(last=False)
    return result


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
            result = fetch_chapter_local(book_slug, book_name, chapter, code)
            if "_restore_bracketed" in globals():
                result = _restore_bracketed(book_name, chapter, code, result)
            return result

    meta = _meta(code)
    if meta is None:
        raise requests.exceptions.RequestException(f"unknown translation {code}")

    if meta["source"] == "esv":
        return _fetch_esv(book_name, chapter)
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
    # The app's default. Same text bible-api.com serves (github.com/seven1m/open-bibles).
    "web": {"name": "World English Bible", "copyright": "World English Bible. Public domain."},
    "webbe": {"name": "World English Bible (British)", "copyright": "World English Bible, British Edition. Public domain."},
    "bsb": {"name": "Berean Standard Bible", "copyright": "The Holy Bible, Berean Standard Bible (BSB). Dedicated to the public domain."},
    # Older literal translations, handy for comparing (tools/build_csv_bible.py).
    "ylt": {"name": "Young's Literal Translation", "copyright": "Young's Literal Translation (1898). Public domain."},
    "darby": {"name": "Darby Bible", "copyright": "J. N. Darby's translation (1890). Public domain."},
    # Same texts bible-api.com served, now bundled so verse pages don't wait on
    # another website and work offline (scrollmapper bible_databases CSVs).
    "kjv": {"name": "King James Version", "copyright": "King James Version (Authorised Version, 1611)."},
    "bbe": {"name": "Bible in Basic English", "copyright": "Bible in Basic English (1949/1964). Public domain."},
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
    fmt = _chapter_fmt(code, book_slug, chapter)
    return {
        "reference": f"{book_name} {chapter}",
        "verses": [{"verse": r["verse"], "text": r["text"], "fmt": fmt.get(str(r["verse"]))} for r in rows],
        "copyright": _LOCAL_BIBLES.get(code, {}).get("copyright", ""),
    }


def _chapter_fmt(code, book_slug, chapter):
    """Paragraphs, poetry, words of Jesus and footnotes for a chapter, if the
    bundled file carries them (see tools/build_rich_bible.py)."""
    import json, zlib
    try:
        conn = sqlite3.connect(f"file:{_local_db_path(code)}?mode=ro", uri=True)
        row = conn.execute("SELECT data FROM chapter_fmt WHERE book=? AND chapter=?",
                           (book_slug, chapter)).fetchone()
        conn.close()
    except sqlite3.Error:
        return {}
    return json.loads(zlib.decompress(row[0])) if row else {}


def chapter_headings(book_slug, chapter):
    """Section headings, Psalm titles and parallel passages (from the BSB),
    shown with every translation: {verse: [{"kind", "text"}, ...]}."""
    path = os.path.join(_BIBLES_DIR, "headings.sqlite")
    if not book_slug or not os.path.exists(path):
        return {}
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        rows = conn.execute("SELECT verse, kind, text FROM headings WHERE book=? AND chapter=? ORDER BY seq",
                            (book_slug, chapter)).fetchall()
    finally:
        conn.close()
    out = {}
    for v, kind, text in rows:
        out.setdefault(v, []).append({"kind": kind, "text": text})
    # Show a Psalm's title above its first heading
    for v, items in out.items():
        items.sort(key=lambda h: {"title": 0, "heading": 1, "refs": 2}.get(h["kind"], 3))
    return out


def search_local(query, code="web", limit=60):
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
        # The bundled Bibles are WITHOUT ROWID tables (keyed by book,
        # chapter, verse), so there is no rowid to keep Bible order by.
        # Fetch the matches and put them in canonical order here.
        like = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        rows = conn.execute(
            "SELECT book, chapter, verse, text FROM verses "
            "WHERE text LIKE ? ESCAPE '\\' COLLATE NOCASE LIMIT 5000",
            (f"%{like}%",),
        ).fetchall()
    finally:
        conn.close()
    order = {slug: i for i, slug in enumerate(_SLUG_NAMES)}
    rows = sorted(rows, key=lambda r: (order.get(r["book"], 99), r["chapter"], r["verse"]))[:limit]

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
    if has_local("web"):
        return search_local(query, "web")

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
