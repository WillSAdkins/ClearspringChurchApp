"""
Reading plans: the Bible-in-a-year plans and the "make your own" builder.

A plan is a list of days; each day is a list of segments [book_slug, from_ch,
to_ch]. Days are balanced by how long the chapters take to read (measured from
the World English Bible text), not by counting chapters — so a day with Psalm
119 is a short day otherwise, and Obadiah doesn't get a day of its own.
"""

import math
import os
import sqlite3
from functools import lru_cache

from bible_books import ALL_BOOKS, BOOKS_BY_SLUG, OLD_TESTAMENT, NEW_TESTAMENT
from reading_plans import READING_PLANS
import refs

_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "web.sqlite")
WORDS_PER_MINUTE = 200
CHARS_PER_WORD = 5.6


@lru_cache(maxsize=1)
def weights():
    """{(slug, chapter): characters}"""
    w = {}
    if os.path.exists(_DB):
        con = sqlite3.connect(f"file:{_DB}?mode=ro", uri=True)
        for slug, ch, n in con.execute("SELECT book, chapter, SUM(LENGTH(text)) FROM verses GROUP BY book, chapter"):
            w[(slug, ch)] = n
        con.close()
    for b in ALL_BOOKS:
        for c in range(1, b["chapters"] + 1):
            w.setdefault((b["slug"], c), 3200)
    return w


def minutes(chapters):
    chars = sum(weights()[c] for c in chapters)
    return chars / CHARS_PER_WORD / WORDS_PER_MINUTE


def chapters_of(slug, a=1, b=None):
    b = b or BOOKS_BY_SLUG[slug]["chapters"]
    return [(slug, c) for c in range(a, b + 1)]


def books_chapters(books):
    out = []
    for b in books:
        out += chapters_of(b["slug"] if isinstance(b, dict) else b)
    return out


# A chronological reading order (one common arrangement; dates and order of
# some books are debated). Each entry: book, first chapter, last chapter.
CHRONO = [
    ("genesis", 1, 11), ("job", 1, 42), ("genesis", 12, 50), ("exodus", 1, 40), ("leviticus", 1, 27),
    ("numbers", 1, 36), ("deuteronomy", 1, 34), ("psalms", 90, 90), ("joshua", 1, 24), ("judges", 1, 21),
    ("ruth", 1, 4), ("1-chronicles", 1, 9), ("1-samuel", 1, 31), ("1-chronicles", 10, 12), ("2-samuel", 1, 24),
    ("1-chronicles", 13, 29), ("psalms", 1, 89), ("psalms", 91, 150), ("1-kings", 1, 11), ("2-chronicles", 1, 9),
    ("proverbs", 1, 31), ("song-of-solomon", 1, 8), ("ecclesiastes", 1, 12), ("1-kings", 12, 22),
    ("2-chronicles", 10, 20), ("2-kings", 1, 14), ("obadiah", 1, 1), ("joel", 1, 3), ("2-chronicles", 21, 25),
    ("jonah", 1, 4), ("amos", 1, 9), ("hosea", 1, 14), ("2-kings", 15, 17), ("2-chronicles", 26, 28),
    ("isaiah", 1, 39), ("micah", 1, 7), ("2-kings", 18, 20), ("2-chronicles", 29, 32), ("isaiah", 40, 66),
    ("2-kings", 21, 23), ("2-chronicles", 33, 35), ("nahum", 1, 3), ("zephaniah", 1, 3), ("habakkuk", 1, 3),
    ("jeremiah", 1, 52), ("lamentations", 1, 5), ("2-kings", 24, 25), ("2-chronicles", 36, 36),
    ("ezekiel", 1, 48), ("daniel", 1, 12), ("ezra", 1, 6), ("haggai", 1, 2), ("zechariah", 1, 14),
    ("esther", 1, 10), ("ezra", 7, 10), ("nehemiah", 1, 13), ("malachi", 1, 4),
    ("matthew", 1, 28), ("mark", 1, 16), ("luke", 1, 24), ("john", 1, 21), ("acts", 1, 12), ("james", 1, 5),
    ("acts", 13, 15), ("galatians", 1, 6), ("acts", 16, 17), ("1-thessalonians", 1, 5), ("2-thessalonians", 1, 3),
    ("acts", 18, 19), ("1-corinthians", 1, 16), ("2-corinthians", 1, 13), ("romans", 1, 16), ("acts", 20, 28),
    ("ephesians", 1, 6), ("philippians", 1, 4), ("colossians", 1, 4), ("philemon", 1, 1), ("1-timothy", 1, 6),
    ("titus", 1, 3), ("1-peter", 1, 5), ("hebrews", 1, 13), ("2-timothy", 1, 4), ("2-peter", 1, 3), ("jude", 1, 1),
    ("1-john", 1, 5), ("2-john", 1, 1), ("3-john", 1, 1), ("revelation", 1, 22),
]


def chronological(subset=None):
    order = []
    for slug, a, b in CHRONO:
        order += chapters_of(slug, a, b)
    if subset is not None:
        keep = set(subset)
        order = [c for c in order if c in keep]
    return order


def split(chapters, ndays):
    """Cut an ordered list of chapters into ndays days of about equal reading time."""
    n = len(chapters)
    ndays = max(1, min(ndays, n))
    w = weights()
    cum, total = [], 0
    for c in chapters:
        total += w[c]
        cum.append(total)
    days, start = [], 0
    for d in range(ndays):
        remaining_days = ndays - d
        if d == ndays - 1:
            end = n
        else:
            target = total * (d + 1) / ndays
            end = start + 1
            # extend while it brings us closer to the target and leaves a chapter per remaining day
            while end < n - (remaining_days - 1) and abs(cum[end] - target) <= abs(cum[end - 1] - target):
                end += 1
        days.append(chapters[start:end])
        start = end
    return days


def segments(chapters):
    """[(slug, ch)…] → [[slug, from, to]…] merging runs."""
    out = []
    for slug, c in chapters:
        if out and out[-1][0] == slug and out[-1][2] + 1 == c:
            out[-1][2] = c
        else:
            out.append([slug, c, c])
    return out


def label(seg):
    slug, a, b = seg
    name = BOOKS_BY_SLUG[slug]["name"]
    if slug == "psalms":
        name = "Psalm" if a == b else "Psalms"
    if BOOKS_BY_SLUG[slug]["chapters"] == 1:
        return name
    return f"{name} {a}" if a == b else f"{name} {a}–{b}"


def make(chapter_days):
    return [segments(d) for d in chapter_days]


def blend(ot, nt, ndays, daily=None):
    """Old and New Testament side by side, optionally with a daily Psalm/Proverb."""
    def spread(chs):
        if len(chs) >= ndays:
            return split(chs, ndays)
        # fewer chapters than days: one chapter on most days, none on a few
        out = [[] for _ in range(ndays)]
        for i, c in enumerate(chs):
            out[i * ndays // len(chs)].append(c)
        return out
    a, b = spread(ot), spread(nt)
    days = []
    for i in range(ndays):
        day = segments(a[i]) + segments(b[i])
        if daily:
            day += segments([daily[i % len(daily)]])
        days.append(day)
    return days


@lru_cache(maxsize=None)
def builtin(slug):
    ot = books_chapters(OLD_TESTAMENT)
    nt = books_chapters(NEW_TESTAMENT)
    allc = ot + nt
    gospels = books_chapters(["matthew", "mark", "luke", "john"])
    wisdom = chapters_of("psalms") + chapters_of("proverbs")
    ot_minus = [c for c in ot if c[0] not in ("psalms", "proverbs")]
    defs = {
        "bible-in-a-year": ("The Bible in a year", "Genesis to Revelation, in order", "📖", lambda: make(split(allc, 365)), "whole"),
        "chronological": ("The Bible in a year, in time order", "The story as it happened — Job with the patriarchs, the prophets with the kings", "⏳", lambda: make(split(chronological(), 365)), "whole"),
        "old-and-new": ("Old and New together", "A little of the Old Testament, the New, and a Psalm or Proverb each day", "🔗", lambda: blend(ot_minus, nt, 365, wisdom), "whole"),
        "bible-in-two-years": ("The Bible in two years", "Genesis to Revelation at a gentler pace", "🌿", lambda: make(split(allc, 730)), "whole"),
        "new-testament-90": ("The New Testament in 90 days", "Matthew to Revelation in three months", "✉️", lambda: make(split(nt, 90)), "shorter"),
        "new-testament-260": ("The New Testament on weekdays", "One chapter each weekday for a year", "☀️", lambda: make(split(nt, 260)), "shorter"),
        "gospels-40": ("The four Gospels in 40 days", "Matthew, Mark, Luke and John", "✝️", lambda: make(split(gospels, 40)), "shorter"),
        "psalms-proverbs-60": ("Psalms and Proverbs in 60 days", "Prayer and wisdom for two months", "🎵", lambda: make(split(wisdom, 60)), "shorter"),
    }
    if slug in defs:
        t, sub, emoji, fn, group = defs[slug]
        return {"slug": slug, "title": t, "subtitle": sub, "emoji": emoji, "days": fn(), "group": group,
                "weekdays_only": slug == "new-testament-260"}
    if slug in READING_PLANS:
        p = READING_PLANS[slug]
        days = []
        for day in p["days"]:
            chs = []
            for r in day:
                f = refs.parse(r)
                if f:
                    chs.append((f["slug"], f["chapter"]))
            days.append(segments(chs))
        return {"slug": slug, "title": p["title"], "subtitle": p["subtitle"], "emoji": p["emoji"], "days": days,
                "group": p.get("group", "topical"), "video_url": p.get("video_url"), "weekdays_only": False}
    return None


CATALOGUE = ["bible-in-a-year", "chronological", "old-and-new", "bible-in-two-years",
             "new-testament-90", "new-testament-260", "gospels-40", "psalms-proverbs-60"] + list(READING_PLANS)

GROUPS = [("whole", "The whole Bible"), ("shorter", "Shorter plans"), ("topical", "Short and topical"), ("seasonal", "For the church year")]


def summary(slug):
    p = builtin(slug)
    if not p:
        return None
    mins = [minutes(day_chapters(d)) for d in p["days"]]
    return {"slug": slug, "title": p["title"], "subtitle": p["subtitle"], "emoji": p["emoji"], "group": p["group"],
            "length": len(p["days"]), "minutes": round(sum(mins) / max(1, len(mins))),
            "weekdays_only": p.get("weekdays_only"), "has_video": bool(p.get("video_url"))}


def catalogue():
    return [s for s in (summary(x) for x in CATALOGUE) if s]


def day_chapters(day):
    out = []
    for slug, a, b in day:
        out += [(slug, c) for c in range(a, b + 1)]
    return out


def for_client(p):
    """What the browser needs to show and track a plan."""
    return {
        "slug": p["slug"], "title": p["title"], "subtitle": p.get("subtitle", ""), "emoji": p.get("emoji", "📖"),
        "weekdays_only": bool(p.get("weekdays_only")),
        "days": [[{"slug": s, "from": a, "to": b, "label": label([s, a, b])} for s, a, b in d] for d in p["days"]],
        "minutes": [max(1, round(minutes(day_chapters(d)))) for d in p["days"]],
    }


# --------------------------------------------------------------- builder

SCOPES = {
    "bible": ("The whole Bible", lambda: books_chapters(ALL_BOOKS)),
    "ot": ("The Old Testament", lambda: books_chapters(OLD_TESTAMENT)),
    "nt": ("The New Testament", lambda: books_chapters(NEW_TESTAMENT)),
    "gospels": ("The Gospels", lambda: books_chapters(["matthew", "mark", "luke", "john"])),
    "wisdom": ("Psalms and Proverbs", lambda: chapters_of("psalms") + chapters_of("proverbs")),
    "letters": ("The letters", lambda: books_chapters([b for b in NEW_TESTAMENT if b["slug"] not in ("matthew", "mark", "luke", "john", "acts", "revelation")])),
}


def build(scope="bible", books=None, order="canonical", days=365, title=None):
    if scope == "books":
        books = [b for b in (books or []) if b in BOOKS_BY_SLUG]
        books.sort(key=lambda s: [b["slug"] for b in ALL_BOOKS].index(s))
        if not books:
            raise ValueError("Choose at least one book.")
        chapters = books_chapters(books)
        default_title = ", ".join(BOOKS_BY_SLUG[b]["name"] for b in books[:3]) + ("…" if len(books) > 3 else "")
    elif scope in SCOPES:
        default_title, fn = SCOPES[scope]
        chapters = fn()
    else:
        raise ValueError("Unknown choice.")
    days = int(days)
    if not 1 <= days <= 1100:
        raise ValueError("Choose between 1 and 1,100 days.")
    days = min(days, len(chapters))
    if order == "chronological":
        chapters = chronological(chapters)
        plan_days = make(split(chapters, days))
    elif order == "blend" and scope == "bible":
        ot = [c for c in chapters if c[0] in {b["slug"] for b in OLD_TESTAMENT}]
        nt = [c for c in chapters if c[0] in {b["slug"] for b in NEW_TESTAMENT}]
        plan_days = blend(ot, nt, days)
    else:
        plan_days = make(split(chapters, days))
    p = {"slug": "custom", "title": str(title or "").strip()[:80] or default_title, "subtitle": f"{len(chapters)} chapters in {len(plan_days)} days",
         "emoji": "🧭", "days": plan_days}
    return for_client(p)
