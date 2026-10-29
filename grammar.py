"""Read-only access to static/bibles/grammar.sqlite (built by tools/build_grammar.py):
the grammar of each Hebrew and Greek word, sentence structure, and word-study totals."""
import functools
import json
import os
import re
import sqlite3
import zlib

import grammar_guide

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "grammar.sqlite")
ATTRIBUTION = ("Grammar from STEPBible.org (Tyndale House, Cambridge, CC BY 4.0). Sentence structure and references "
               "from MACULA Greek and Hebrew (Biblica / Clear Bible, CC BY 4.0). Meaning groups from the UBS MARBLE "
               "Semantic Dictionary of Biblical Greek, based on Louw & Nida.")


def available():
    return os.path.exists(PATH)


def _db():
    db = sqlite3.connect(f"file:{PATH}?mode=ro", uri=True)
    return db


@functools.lru_cache(maxsize=12)
def chapter(slug, ch):
    """{verse number (int): [grammar row per word]} or {}."""
    if not available():
        return {}
    with _db() as db:
        row = db.execute("SELECT data FROM chapters WHERE slug=? AND chapter=?", (slug, ch)).fetchone()
    if not row:
        return {}
    return {int(k): v for k, v in json.loads(zlib.decompress(row[0])).items()}


@functools.lru_cache(maxsize=1)
def _morph():
    if not available():
        return {}
    with _db() as db:
        return {k: json.loads(v) for k, v in db.execute("SELECT code, data FROM morph")}


@functools.lru_cache(maxsize=4096)
def explain(code):
    if not code:
        return None
    hebrew = bool(re.match(r"^[HA][A-Z]", code)) and not code.startswith(("ADV", "ARAM", "HEB"))
    return grammar_guide.explain(code, _morph().get(code), hebrew)


@functools.lru_cache(maxsize=1)
def _labels():
    if not available():
        return {}
    with _db() as db:
        return dict(db.execute("SELECT code, label FROM domain_labels"))


def domain_label(code):
    """'025003' -> ('Attitudes and Emotions', 'Love, Affection, Compassion')"""
    if not code:
        return None
    lab = _labels()
    top, sub = lab.get(code[:3]), lab.get(code)
    return (top, sub) if top else None


def _base(strong):
    m = re.match(r"([GH])(\d+)", strong or "")
    return f"{m.group(1)}{int(m.group(2)):04d}" if m else ""


def word_stats(strong):
    """Totals for a word-study page."""
    key = _base(strong)
    out = {"forms": {}, "domains": [], "similar": [], "lxx": [], "lxx_of": []}
    if not key or not available():
        return out
    with _db() as db:
        for kind, label, n in db.execute("SELECT kind, label, n FROM forms WHERE strong=? ORDER BY n DESC", (key,)):
            out["forms"].setdefault(kind, []).append((label, n))
        doms = db.execute("SELECT domain, n FROM domains WHERE strong=? ORDER BY n DESC LIMIT 4", (key,)).fetchall()
        total = sum(n for _, n in doms) or 1
        for d, n in doms:
            lab = domain_label(d)
            if lab:
                out["domains"].append({"code": d, "top": lab[0], "sub": lab[1], "share": round(n / total * 100)})
        lns = [r[0] for r in db.execute("SELECT ln FROM ln_words WHERE strong=? ORDER BY n DESC LIMIT 3", (key,))]
        if lns:
            q = ",".join("?" * len(lns))
            rows = db.execute(f"SELECT strong, SUM(n) FROM ln_words WHERE ln IN ({q}) AND strong != ? GROUP BY strong ORDER BY SUM(n) DESC LIMIT 12",
                              (*lns, key)).fetchall()
            out["similar"] = [{"strong": s, "n": n} for s, n in rows]
        if key.startswith("H"):
            rows = db.execute("SELECT gstrong, greek, n FROM lxx WHERE strong=? ORDER BY n DESC LIMIT 6", (key,)).fetchall()
            tot = sum(r[2] for r in rows) or 1
            out["lxx"] = [{"strong": g, "greek": w, "n": n, "share": round(n / tot * 100)} for g, w, n in rows]
        else:
            rows = db.execute("SELECT strong, SUM(n) FROM lxx WHERE gstrong=? GROUP BY strong ORDER BY SUM(n) DESC LIMIT 6", (key,)).fetchall()
            out["lxx_of"] = [{"strong": h, "n": n} for h, n in rows]
    return out
