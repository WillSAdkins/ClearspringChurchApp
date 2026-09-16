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

def fetch_chapter(book_name, chapter, code, book_id=None):
    """Fetch one chapter in the given translation, whichever source has it."""
    meta = _meta(code)
    if meta is None:
        raise requests.exceptions.RequestException(f"unknown translation {code}")

    if meta["source"] == "api-bible":
        if not book_id:
            raise requests.exceptions.RequestException("missing book id")
        return _fetch_api_bible(book_name, chapter, code, book_id)
    return _fetch_bible_api(book_name, chapter, code)
