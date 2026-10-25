"""
Build static/bibles/reference.sqlite: three classic reference works and
Spurgeon's daily readings, from CrossWire SWORD modules (all marked Public
Domain in their .conf files) exported with mod2imp.

  ISBE    International Standard Bible Encyclopedia (1915), ed. James Orr
  Smith   Smith's Bible Dictionary (1863), William Smith
  Torrey  The New Topical Text Book (1897), R. A. Torrey
  Easton  Easton's Bible Dictionary (1897), M. G. Easton
  Nave    Nave's Topical Bible (1896), Orville J. Nave
  SME     Morning and Evening: Daily Readings (1865–68), C. H. Spurgeon

    python tools/build_reference.py --imp DIR_WITH_IMP_FILES

Tables:
  entries(work, slug, title, summary, body)   body = zlib-compressed HTML
  daily(day 'MM-DD', part 'morning'|'evening', title, verse, ref, body)
The HTML is rebuilt by build_commentaries.to_html, which escapes everything
from the source and only adds back its own simple tags.
"""
import argparse
import html
import os
import re
import sqlite3
import sys
import unicodedata
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, ".."))
from build_commentaries import imp_entries, to_html  # noqa: E402

WORKS = {"isbe": "ISBE", "smith": "Smith", "torrey": "Torrey", "easton": "Easton", "nave": "Nave"}
SMALL = {"a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with", "from", "into"}
ROMAN_RE = re.compile(r"^(?:[IVXLC]+)$")


def nice_title(t):
    t = html.unescape(t).strip()
    if t != t.upper():
        return t
    words = re.split(r"(\s+|-)", t.lower())
    out = []
    for i, w in enumerate(words):
        if ROMAN_RE.match(w.upper()) and len(w) <= 4 and w.upper() not in ("I", "MIX", "LID", "DID", "CIVIL", "LIVID"):
            out.append(w.upper() if w.upper() != "I" or i > 0 else "I")
        elif i and w in SMALL:
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:])
    s = "".join(out)
    s = re.sub(r"'S\b", "'s", s)
    return s


def slugify(s):
    s = re.sub(r"['’]", "", s)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def text_of(h, n=200):
    t = re.sub(r"</?(?:a|em|strong|span|sup)\b[^>]*>", "", h)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", html.unescape(t)).strip()
    if len(t) > n:
        t = t[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return t


def torrey_html(body):
    """Torrey's lines: '- God is the Giver of' starts a point, '. Sovereign'
    a sub-point under it, and the line after each holds its verses."""
    items, rest, cur = [], [], None
    for p in re.findall(r"<p>(.*?)</p>", body, flags=re.S):
        for line in re.split(r"\s*<br>\s*", p):
            line = line.strip()
            if not line:
                continue
            m = re.match(r"^([-.])\s*(.*)$", line, flags=re.S)
            if m and not m.group(2).startswith("<a "):
                cur = {"sub": m.group(1) == ".", "h": m.group(2), "refs": []}
                items.append(cur)
            elif cur is not None:
                cur["refs"].append(line)
            else:
                rest.append(f"<p>{line}</p>")
    lis = "".join(f'<li class="{"tt-sub" if it["sub"] else ""}"><span class="tt-h">{it["h"]}</span> '
                  f'<span class="tt-r">{" ".join(it["refs"])}</span></li>' for it in items)
    return "".join(rest) + (f'<ul class="tt-list">{lis}</ul>' if items else "")


def easton_refs(raw):
    """Easton's module links a reference that carries on from the one before
    ("Rev. 1:8, 11; 21:6") to the wrong book: re-point it at the book (and
    chapter) of the last full reference."""
    state = {"book": None, "ch": None}

    def fix(m):
        attr, text = m.group(1), m.group(2)
        plain = re.sub(r"<[^>]+>", "", text).strip()
        t = re.search(r'osisRef="(?:Bible:)?([1-3]?[A-Za-z]+)\.(\d+)', attr)
        if re.match(r"^[1-3]?\s*[A-Za-z]", plain):
            if t:
                state["book"], state["ch"] = t.group(1), t.group(2)
            return m.group(0)
        if not state["book"]:
            return m.group(0)
        cv = re.match(r"^(\d+):(\d+)", plain)
        v = re.match(r"^(\d+)", plain)
        if cv:
            state["ch"] = cv.group(1)
            target = f"Bible:{state['book']}.{cv.group(1)}.{cv.group(2)}"
        elif v and state["ch"]:
            target = f"Bible:{state['book']}.{state['ch']}.{v.group(1)}"
        else:
            return m.group(0)
        return f'<ref osisRef="{target}">{text}</ref>'
    return re.sub(r"<ref\b([^>]*)>(.*?)</ref>", fix, raw, flags=re.S)


def nave_html(body):
    """Nave's lines start with an arrow: one point and its verses each."""
    out, items = [], []
    for p in re.findall(r"<p>(.*?)</p>", body, flags=re.S):
        for line in re.split(r"\s*(?:<br>|\n)\s*", p):
            line = line.strip()
            if not line:
                continue
            if line.startswith("→"):
                line = line.lstrip("→ ").strip()
                m = re.match(r"^(.*?)(\s*<a .*)$", line, flags=re.S)
                h, r = (m.group(1), m.group(2)) if m else (line, "")
                items.append(f'<li><span class="tt-h">{h.strip()}</span> <span class="tt-r">{r.strip()}</span></li>')
            else:
                if items:
                    out.append('<ul class="tt-list">' + "".join(items) + "</ul>")
                    items = []
                out.append(f"<p>{line}</p>")
    if items:
        out.append('<ul class="tt-list">' + "".join(items) + "</ul>")
    return "".join(out)


def build_works(db, imp):
    counts = {}
    for code, mod in WORKS.items():
        seen = set()
        n = 0
        for key, raw in imp_entries(os.path.join(imp, mod + ".imp")):
            if not raw.strip() or len(key) < 2:
                continue
            raw = re.sub(r"^\s*<entryFree[^>]*>\s*<p>[^<]{0,40}:</p>", "", raw)   # ISBE pronunciation line
            if code == "easton":
                raw = re.sub(r"<title>.*?</title>", "", easton_refs(raw), count=1, flags=re.S)
            body = to_html(raw)
            if code == "nave":
                body = nave_html(body)
            if code == "torrey":
                body = torrey_html(body)
            if not re.sub(r"<[^>]+>|\s", "", body):
                continue
            title = nice_title(key)
            slug = slugify(re.split(r",\s*(?:or|OR)\s|\s\(", title)[0]) or slugify(title)
            base, i = slug, 2
            while slug in seen:
                slug, i = f"{base}-{i}", i + 1
            seen.add(slug)
            db.execute("INSERT INTO entries VALUES (?,?,?,?,?)",
                       (code, slug, title, text_of(body), zlib.compress(body.encode("utf-8"), 9)))
            n += 1
        counts[code] = n
    return counts


def build_daily(db, imp):
    n = 0
    for key, raw in imp_entries(os.path.join(imp, "SME.imp")):
        m = re.match(r"^(\d\d)\.(\d\d)$", key)
        if not m:
            continue
        day = f"{m.group(1)}-{m.group(2)}"
        for part, sec in re.findall(r'<div type="section" osisID="\d\d\.\d\d\.(am|pm)">(.*?)(?=<div type="section"|</div>\s*</div>\s*$)', raw, flags=re.S):
            t = re.search(r"<title>(.*?)</title>", sec)
            title = html.unescape(re.sub(r"<[^>]+>", "", t.group(1))) if t else ""
            sec = re.sub(r"<title>.*?</title>", "", sec, count=1, flags=re.S)
            first = re.search(r"<p>(.*?)</p>", sec, flags=re.S)
            verse, ref = "", ""
            if first and re.search(r"<reference", first.group(1)):
                q = re.sub(r"<reference.*?</reference>", "", first.group(1), flags=re.S)
                verse = html.unescape(re.sub(r"<[^>]+>", "", q)).strip()
                r = re.search(r"<reference[^>]*>(.*?)</reference>", first.group(1), flags=re.S)
                ref = html.unescape(re.sub(r"<[^>]+>", "", r.group(1))).strip() if r else ""
                sec = sec.replace(first.group(0), "", 1)
            body = to_html(sec)
            db.execute("INSERT INTO daily VALUES (?,?,?,?,?,?)",
                       (day, "morning" if part == "am" else "evening", title, verse, ref, zlib.compress(body.encode("utf-8"), 9)))
            n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--imp", required=True)
    ap.add_argument("--out", default=os.path.join(HERE, "..", "static", "bibles", "reference.sqlite"))
    a = ap.parse_args()
    if os.path.exists(a.out):
        os.remove(a.out)
    db = sqlite3.connect(a.out)
    db.execute("CREATE TABLE entries (work TEXT, slug TEXT, title TEXT, summary TEXT, body BLOB, PRIMARY KEY (work, slug))")
    db.execute("CREATE TABLE daily (day TEXT, part TEXT, title TEXT, verse TEXT, ref TEXT, body BLOB, PRIMARY KEY (day, part))")
    print(build_works(db, a.imp))
    print("daily", build_daily(db, a.imp))
    db.execute("CREATE INDEX entries_title ON entries (work, title COLLATE NOCASE)")
    db.commit()
    db.execute("VACUUM")
    db.close()
    print(f"{os.path.getsize(a.out) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
