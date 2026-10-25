"""
Bible reference parsing — "Jn 3:16", "1 Cor 13:4-7", "Psalm 23", "II Kings 2:11".

The same alias table is handed to the browser (static/bible-refs.js) so that
references typed into notes, journals and sermon notes become links, and both
sides agree on what counts as a reference.
"""

import re

from bible_books import ALL_BOOKS, BOOKS_BY_SLUG

# Extra names people actually type, beyond the unique prefixes worked out below.
_MANUAL = {
    "genesis": ["gn", "ge"], "exodus": ["ex", "exod"], "leviticus": ["lv", "le"],
    "numbers": ["nm", "nb", "nu"], "deuteronomy": ["dt", "de"], "joshua": ["jsh"],
    "judges": ["jdg", "jg", "jdgs"], "ruth": ["rth", "ru"], "samuel": ["sm", "sa"],
    "kings": ["kgs", "ki", "kg"], "chronicles": ["chr", "ch"],
    "nehemiah": ["ne"], "esther": ["es"], "job": ["jb"],
    "psalms": ["ps", "psa", "psalm", "pss", "psm"], "proverbs": ["pr", "prv"],
    "ecclesiastes": ["ec", "qoh", "qoheleth"],
    "song of solomon": ["song", "song of songs", "songs", "sos", "sng", "canticles", "sg", "so"],
    "isaiah": ["is", "isa"], "jeremiah": ["je", "jr"], "lamentations": ["la"],
    "ezekiel": ["ezk", "eze"], "daniel": ["dn", "da"], "hosea": ["ho"],
    "joel": ["jl"], "amos": ["am"], "obadiah": ["ob"], "jonah": ["jnh"],
    "micah": ["mi"], "nahum": ["na"], "habakkuk": ["hb"], "zephaniah": ["zp"],
    "haggai": ["hg"], "zechariah": ["zc"], "malachi": ["ml"],
    "matthew": ["mt", "mat"], "mark": ["mk", "mrk", "mr"], "luke": ["lk", "luk", "lu"],
    "john": ["jn", "jhn"], "acts": ["ac", "act"], "romans": ["ro", "rm"],
    "corinthians": ["co"], "galatians": ["ga"], "ephesians": ["ep"],
    "philippians": ["phil", "php", "pp"], "colossians": ["cl"],
    "thessalonians": ["th", "thes", "thess"], "timothy": ["ti", "tm"],
    "titus": ["ti"], "philemon": ["philem", "phm", "pm"], "hebrews": ["he"],
    "james": ["jas", "jm"], "peter": ["pe", "pt", "pet"],
    "jude": ["jud", "jd"], "revelation": ["rev", "rv", "re", "revelations", "apocalypse"],
}
# "ti" is both Timothy (with a number) and Titus (without), which the number
# prefix keeps apart; the same goes for "jn" (John / 1 John).

_NUM_WORDS = {"1": "1", "i": "1", "1st": "1", "first": "1",
              "2": "2", "ii": "2", "2nd": "2", "second": "2",
              "3": "3", "iii": "3", "3rd": "3", "third": "3"}


def _split(name):
    m = re.match(r"^([123]) (.+)$", name)
    return (m.group(1), m.group(2).lower()) if m else ("", name.lower())


def _build():
    table = {}
    by_base = {}
    for b in ALL_BOOKS:
        num, base = _split(b["name"])
        by_base.setdefault(base, []).append((num, b["slug"]))

    def put(num, alias, slug):
        key = f"{num} {alias}" if num else alias
        table.setdefault(key, slug)

    bases = list(by_base)
    for base, entries in by_base.items():
        compact = base.replace(" ", "")
        names = {base, compact}
        # every prefix (3+ letters) that no other book shares
        for n in range(3, len(compact) + 1):
            p = compact[:n]
            if sum(1 for other in bases if other.replace(" ", "").startswith(p)) == 1:
                names.add(p)
        names.update(_MANUAL.get(base, []))
        for num, slug in entries:
            for a in names:
                put(num, a, slug)
    # USFM codes: "1co", "jhn"
    for b in ALL_BOOKS:
        code = b["usfm"].lower()
        if code[0].isdigit():
            put(code[0], code[1:], b["slug"])
        else:
            put("", code, b["slug"])
    # "John" without a number is the Gospel, never 1 John — guard the table
    table["john"] = "john"
    table["jn"] = "john"
    # "1Jo" / "1 Jo" (1 John) in older books; plain "Jo" stays unclaimed
    for n in "123":
        table[f"{n} jo"] = f"{n}-john"
    return table


ALIASES = _build()
_BASES = sorted({k.split(" ", 1)[1] if k[0].isdigit() else k for k in ALIASES}, key=len, reverse=True)

PATTERN = (
    r"(?<![\w])(?:(1st|2nd|3rd|first|second|third|iii|ii|i|1|2|3)\s*)?"
    r"(" + "|".join(re.escape(b).replace(r"\ ", r"\s+") for b in _BASES) + r")\.?"
    r"\s*(\d{1,3})(?:\s*:\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3})(?:\s*:\s*(\d{1,3}))?)?)?(?![\d:\w])"
)
_RE = re.compile(PATTERN, re.IGNORECASE)


def _resolve(num, base):
    base = re.sub(r"\s+", " ", base.lower())
    n = _NUM_WORDS.get((num or "").lower(), "")
    return ALIASES.get(f"{n} {base}" if n else base)


def find(text):
    """Every reference in a piece of text, as dicts with the matched span."""
    out = []
    for m in _RE.finditer(text or ""):
        slug = _resolve(m.group(1), m.group(2))
        num = (m.group(1) or "").lower()
        if num in ("i", "ii", "iii") and m.start(2) == m.start(1) + len(num):
            # "Isa 6:8" is Isaiah, not "I Sa"; a roman numeral is only a
            # number when something separates it from the name ("I Sam")
            whole = ALIASES.get((num + m.group(2)).lower())
            slug = whole or (slug if m.group(1).isupper() else None)
        if not slug:
            continue
        book = BOOKS_BY_SLUG[slug]
        ch = int(m.group(3))
        if slug == "jude" and m.group(2).lower() == "jud" and m.group(4) and (ch > 1 or int(m.group(4)) > 25):
            slug, book = "judges", BOOKS_BY_SLUG["judges"]     # "Jud 3:5" in older books is Judges; Jude is one short chapter
        v1 = int(m.group(4)) if m.group(4) else None
        if book["chapters"] == 1 and v1 is None and ch > 1:
            ch, v1 = 1, ch          # "Jude 3" is verse 3
        if not 1 <= ch <= book["chapters"]:
            continue
        v2 = None
        ch2 = ch
        if m.group(5):
            if m.group(6):           # John 3:16-4:2
                ch2, v2 = int(m.group(5)), int(m.group(6))
            else:
                v2 = int(m.group(5))
        out.append({"slug": slug, "name": book["name"], "chapter": ch, "verse": v1,
                    "end_chapter": ch2, "end_verse": v2, "start": m.start(), "end": m.end(),
                    "label": label(slug, ch, v1, v2, ch2)})
    return out


def parse(text):
    """The first reference in the text, or None."""
    found = find(text)
    return found[0] if found else None


def label(slug, chapter, verse=None, end=None, end_chapter=None):
    name = BOOKS_BY_SLUG[slug]["name"]
    if slug == "psalms":
        name = "Psalm"
    if not verse:
        return f"{name} {chapter}"
    if end_chapter and end_chapter != chapter and end:
        return f"{name} {chapter}:{verse}–{end_chapter}:{end}"
    return f"{name} {chapter}:{verse}" + (f"–{end}" if end and end != verse else "")


def for_js():
    """Compact data for static/bible-refs.js."""
    return {
        "aliases": ALIASES,
        "books": {b["slug"]: [b["name"], b["chapters"]] for b in ALL_BOOKS},
    }
