"""Clearspring — everything the passage study workspace shows for one passage.

Given a parsed reference, gathers the text in several translations, study
notes, key original words, cross references, the early church, people and
places, related articles, and prompts for guided study. All from data the
app already holds; nothing is fetched from outside.
"""
import math
import re
import sqlite3
import os
from collections import Counter, OrderedDict

import bible_sources
import fathers
import grammar
import library
import notes as notes_mod
import original_words
import study_data
from bible_books import BOOKS_BY_SLUG

MAX_VERSES = 80
TRANSLATIONS = OrderedDict([("bsb", "BSB"), ("web", "WEB"), ("webbe", "WEB (British)"), ("asv", "ASV"),
                            ("ylt", "Young's Literal"), ("darby", "Darby")])
STOP = set("""a an and are as at be been but by for from had has have he her him his how i if in into is it its
let me my not now of on or our out said say says she so that the their them then there these they this those
thus to unto up us was we were what when where which who whom why will with would you your ye thee thou thy
shall also all one did do does done may might no nor over upon very more than every any being being
him himself them themselves ourselves just yet even""".split())


def _verse_list(found):
    """[(chapter, verse)] in the passage, capped."""
    slug, ch = found["slug"], found["chapter"]
    book = BOOKS_BY_SLUG[slug]
    ch2 = min(found.get("end_chapter") or ch, book["chapters"])
    v1 = found.get("verse") or 1
    v2 = found.get("end_verse") or (found.get("verse") if found.get("verse") else None)
    out = []
    for c in range(ch, ch2 + 1):
        n = study_data.chapter_verse_count(slug, c) or 0
        lo = v1 if c == ch else 1
        hi = (v2 if (c == ch2 and v2) else n)
        for v in range(lo, min(hi, n) + 1):
            out.append((c, v))
            if len(out) >= MAX_VERSES:
                return out, True
    return out, False


def texts(found, codes):
    """{code: {(c, v): text}} for the passage."""
    slug = found["slug"]
    book = BOOKS_BY_SLUG[slug]
    verses, _ = _verse_list(found)
    chapters = sorted({c for c, _ in verses})
    want = set(verses)
    out = {}
    for code in codes:
        if not bible_sources.has_local(code):
            continue
        got = {}
        for c in chapters:
            try:
                data = bible_sources.fetch_chapter_local(slug, book["name"], c, code)
            except Exception:
                continue
            for v in data["verses"]:
                key = (c, int(v["verse"]))
                if key in want:
                    got[key] = re.sub(r"\s+", " ", v["text"]).strip()
        out[code] = got
    return out


def key_words(found, limit=10):
    """The words that matter most in this passage: frequent here, rarer elsewhere."""
    verses, _ = _verse_list(found)
    slug = found["slug"]
    here, info = Counter(), {}
    for c, v in verses:
        rows = grammar.chapter(slug, c).get(v) or []
        for k, w in enumerate(original_words.verse_words(slug, c, v) or []):
            r = rows[k] if k < len(rows) else {}
            ex = grammar.explain(r.get("m"))
            fn = (ex or {}).get("fn", "")
            if not w.get("strong") or not fn or not fn.split(" ")[0] in ("Verb", "Noun", "Adjective") and fn not in ("Name",):
                continue
            key = w.get("strong_display") or w["strong"]
            here[key] += 1
            info.setdefault(key, {"strong": w["strong"], "lemma": w.get("lemma") or w.get("word"), "translit": w.get("lemma_translit") or w.get("translit"),
                                  "meaning": w.get("meaning") or w.get("gloss"), "gloss": w.get("gloss")})
    if not here:
        return []
    totals = _totals(list(info.values()))
    scored = []
    for key, n in here.items():
        total = totals.get(info[key]["strong"], 50)
        if total > 1500:          # "to be", "to say", "and": everywhere, so they tell you little
            continue
        corpus = 420000 if info[key]["strong"].startswith("H") else 140000
        score = math.sqrt(n) * math.log(corpus / max(total, 1))
        scored.append((score, dict(info[key], here=n, total=total)))
    scored.sort(key=lambda x: -x[0])
    return [x for _, x in scored[:limit]]


def _totals(items):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "original_words.sqlite")
    if not items or not os.path.exists(path):
        return {}
    keys = [i["strong"] for i in items]
    out = {}
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as db:
        q = ",".join("?" * len(keys))
        for s, n in db.execute(f"SELECT strong, count FROM concordance WHERE strong IN ({q})", keys):
            out[s] = n
    return out


def repeated_english(texts_by_verse, limit=8):
    """Words a careful reader would notice repeating (English, the main translation)."""
    words = Counter()
    for t in texts_by_verse.values():
        for w in re.findall(r"[A-Za-z’']+", t):
            w = w.lower().strip("’'")
            if len(w) > 2 and w not in STOP:
                words[w] += 1
    return [w for w, n in words.most_common(limit * 2) if n >= 2][:limit]


def cross_refs(found, limit=24):
    verses, _ = _verse_list(found)
    slug = found["slug"]
    seen, out = set(), []
    inside = {(slug, c, v) for c, v in verses}
    for c, v in verses:
        for x in study_data.cross_references(slug, c, v)[:4]:
            key = (x["slug"], x["chapter"], x["verse"])
            if key in seen or key in inside:
                continue
            seen.add(key)
            out.append(dict(x, from_v=f"{c}:{v}"))
            if len(out) >= limit:
                return out
    return out


def early_church(found, limit=8):
    verses, _ = _verse_list(found)
    slug, out, seen = found["slug"], [], set()
    for c, v in verses:
        for f in fathers.for_verse(slug, c, v, 2):
            key = (f["author"], f["quote"][:60])
            if key in seen:
                continue
            seen.add(key)
            out.append(dict(f, ref=f"{c}:{v}"))
            if len(out) >= limit:
                return out
    return out


def study_notes(found):
    """Tyndale verse notes and Biblica section notes that fall in or cover the passage."""
    verses, _ = _verse_list(found)
    if not verses:
        return []
    slug = found["slug"]
    first, last = verses[0], verses[-1]
    out, seen = [], set()
    for c in sorted({c for c, _ in verses}):
        for n in notes_mod.chapter_notes(slug, c):
            if n["id"] in seen:
                continue
            starts_after = (n["c1"], n["v1"]) > last
            ends_before = (n["c2"], n["v2"]) < first
            if starts_after or ends_before:
                continue
            seen.add(n["id"])
            out.append(n)
    out.sort(key=lambda n: (n["source"] != "biblica", n["c1"], n["v1"]))
    return out


def people_places(found):
    verses, _ = _verse_list(found)
    people, places = OrderedDict(), OrderedDict()
    if not library.available():
        return [], []
    for c, v in verses:
        pp, pl = library.verse_people_places(found["slug"], c, v)
        for p in pp:
            people.setdefault(p["slug"], p)
        for p in pl:
            places.setdefault(p["slug"], p)
    return list(people.values())[:12], list(places.values())[:8]


def related(found, limit=10):
    verses, _ = _verse_list(found)
    out, seen = [], set()
    for c, v in verses[:: max(1, len(verses) // 12)]:
        for a in notes_mod.for_verse(found["slug"], c, v, 6):
            if (a["kind"], a["slug"]) not in seen:
                seen.add((a["kind"], a["slug"]))
                out.append(a)
    out.sort(key=lambda a: (a["kind"] != "profile", a["kind"] != "theme", a["refs"]))
    return out[:limit]


def section_for(slug, ch, v):
    """A natural passage around one verse: the Biblica section note covering it, else the chapter."""
    for n in notes_mod.verse_notes(slug, ch, v):
        if n["source"] == "biblica" and (n["c2"] - n["c1"]) <= 1:
            return n["c1"], n["v1"], n["c2"], n["v2"]
    return ch, 1, ch, study_data.chapter_verse_count(slug, ch) or 1


GUIDE = [
    {"key": "observe", "title": "Observe", "lead": "What does it say?",
     "prompts": ["Read it slowly, twice. Then say what happens in your own words.",
                 "Who is speaking, and to whom? Where are they?",
                 "Which words or ideas are repeated? Anything surprising?"]},
    {"key": "interpret", "title": "Interpret", "lead": "What did it mean then?",
     "prompts": ["What did this mean for the people who first heard it?",
                 "What does it show us about God, about Jesus, about people?",
                 "How do the cross references and notes help?"]},
    {"key": "apply", "title": "Apply", "lead": "What does it mean for me?",
     "prompts": ["Is there something to believe, to stop, to start, or to thank God for?",
                 "What is one thing you will do this week because of it?",
                 "Who could you share it with?"]},
    {"key": "pray", "title": "Pray", "lead": "Talk to God about it",
     "prompts": ["Turn what you have learned into a short prayer."]},
]
