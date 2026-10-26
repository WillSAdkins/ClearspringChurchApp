"""Build static/bibles/church_fathers.sqlite: the writings of the early church,
whole books read section by section.

Source: github.com/HistoricalChristianFaith/Writings-Database (public domain).
Most of it is the Ante-Nicene and Nicene & Post-Nicene Fathers (Schaff and
Roberts-Donaldson, 1867-1900) plus older translations collected by Roger
Pearse. The collection also holds machine translations and some 20th-century
translations; this build leaves those out:

  - anything marked as translated by ChatGPT, GPT, DeepL, Google or "AI"
    (in the file, or in an introduction or note for its folder);
  - any work whose opening or source note mentions a year from 1900 to 1989
    (a translation that may still be in copyright), unless listed in KEEP;
  - writers after AD 750 (the end of the patristic age, John of Damascus).

Usage:
  git clone --depth 1 https://github.com/HistoricalChristianFaith/Writings-Database SRC
  python -I tools/build_church_fathers.py SRC
"""
import html as htmllib
import json
import os
import re
import sqlite3
import sys
import tomllib
import zlib

import nh3
from bs4 import BeautifulSoup

ROOT_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "bibles")
OUT = os.path.join(ROOT_OUT, "church_fathers.sqlite")
SEARCH_OUT = os.path.join(ROOT_OUT, "church_fathers_search.sqlite")   # kept apart: GitHub limits files to 100 MB
LAST_YEAR = 750
AI = re.compile(r"chatgpt|\bgpt-?[34]|machine[- ]translat|\bopenai\b|translated (by|with|using) (an? )?ai\b|google translate|\bdeepl\b|\bLLM\b|"
                r"large language model|\bAI[- ]translat|\bclaude\b(?! of)|\bgemini\b", re.I)
MODERN = re.compile(r"\b(19[0-8][0-9])\b")
COPYRIGHT = re.compile(r"©|\bcopyright\b|all rights reserved", re.I)
# Checked by hand: old translations whose pages mention a later year.
# (UK copyright runs 70 years from the translator's death, so a translator who
# died before 1956 is public domain here and in the US.)
KEEP = {
    "Eusebius of Caesarea/The Preparation of the Gospel",            # E. H. Gifford, 1903 (died 1905)
    "Irenaeus/The Proof of the Apostolic Preaching",                  # J. Armitage Robinson, 1920 (died 1933)
    "Macarius of Egypt/Fifty Spiritual Homilies",                     # A. J. Mason, 1921 (died 1928)
    "Basil of Caesarea/Address to Young Men on the Right Use of Greek Literature",  # F. M. Padelford, 1902 (died 1942)
    "Ephrem the Syrian/Against Bardaisan's Domnus", "Ephrem the Syrian/Against Mani",   # C. W. Mitchell (died 1916),
    "Ephrem the Syrian/Against Marcion 1", "Ephrem the Syrian/Against Marcion 2",       # completed by A. A. Bevan
    "Ephrem the Syrian/Against Marcion 3", "Ephrem the Syrian/On Virginity",            # (d. 1933) and F. C. Burkitt
    "Ephrem the Syrian/Stanzas Against Bardaisan",                                      # (d. 1935), 1912-21
    "Ephrem the Syrian/Discourse to Hypatius 1", "Ephrem the Syrian/Discourse to Hypatius 2",
    "Ephrem the Syrian/Discourse to Hypatius 3", "Ephrem the Syrian/Discourse to Hypatius 4",
    "Ephrem the Syrian/Discourse to Hypatius 5",
}
# Recent or unattributed translations (no named translator, an edition
# from the last few decades, or the style of a machine translation): left out
# until their source can be checked.
UNSURE = re.compile(r"Litteral|Patristic Bible Commentary|Translated from Migne|\b(Latin|Greek|Syriac|Coptic|Armenian) source:|"
                    r"this (english )?translation is (placed )?in the public domain|revised in 20\d\d", re.I)
LEAVE_OUT = {
    "Cyril of Alexandria": {"Commentary on Isaiah", "Commentary on the Twelve Minor Prophets", "Against Julian"},
    "Gregory the Dialogist": {"Commentary on 1 Kings", "Homilies on Ezekiel", "40 Homilies on the Gospels", "Commentary on the Song of Songs"},
    "Theodoret of Cyrus": {"Commentary on Romans"},
    "Odes of Solomon": {"Charlesworth"},
    "Papias of Hierapolis": {"Fragments of Papias - Schmidt"},
    "Origen of Alexandria": {"Dialogue with Heraclides", "Homilies on 1 Samuel"},
    "Hegemonius": {"Acta_Archelai"},
    "Didymus the Blind": {"On Genesis"},
}
SKIP_NAMES = {"metadata.toml", "images"}
TAGS = {"p", "br", "i", "em", "b", "strong", "u", "blockquote", "h2", "h3", "h4", "sup", "sub", "a", "span",
        "ul", "ol", "li", "hr", "small", "table", "tr", "td", "th", "tbody", "thead", "center", "div", "section"}


def slugify(s):
    s = re.sub(r"[’'`]", "", s.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:80] or "x"


def natural(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


SMALL = {"a", "an", "and", "the", "of", "on", "in", "to", "for", "against", "by", "with", "from", "at", "or"}


def nice_title(s):
    s = re.sub(r"\.html?$", "", s).strip()
    s = re.sub(r"^Translation-", "", s)
    if s.isupper() or (sum(c.isupper() for c in s) > 0.7 * sum(c.isalpha() for c in s) and len(s) > 4):
        words = s.lower().split()
        s = " ".join(w if (i and w in SMALL) else w[:1].upper() + w[1:] for i, w in enumerate(words))
    return s


def read(p):
    return open(p, encoding="utf-8", errors="replace").read()


def flagged(text):
    return bool(AI.search(text))


def source_note(text):
    m = re.search(r"<h1[^>]*>.*?</h1>\s*(?:<h2[^>]*>.*?</h2>\s*)*<i>(.*?)</i>", text[:6000], re.S | re.I)
    if not m:
        return ""
    note = re.sub(r"<[^>]+>", " ", m.group(1))
    note = htmllib.unescape(re.sub(r"\s+", " ", note)).strip()
    # Only a note about the translation (some works open with a chapter summary in italics instead).
    if not re.search(r"^\W*(translat|latin text|greek text|english translation)|translated by|translation by", note, re.I):
        return ""
    return note if 8 < len(note) < 400 else ""


# ------------------------------------------------------------------ cleaning

def clean_fragment(frag):
    return nh3.clean(frag, tags=TAGS, attributes={"a": {"href", "id"}, "span": {"id"}, "sup": {"id"}, "td": {"colspan"}, "th": {"colspan"}},
                     url_schemes=set(), link_rel=None, strip_comments=True)


def split_doc(text):
    """→ (title, [(section title, html)], footnotes {n: html})"""
    soup = BeautifulSoup(text, "html.parser")
    for t in soup(["script", "style", "img", "iframe", "object", "embed", "link", "meta", "title", "head"]):
        t.decompose()
    notes = {}
    for sec in soup.select("section.notes"):
        for sp in sec.select("span[id^=fn]"):
            n = sp.get("id")[2:]
            a = sp.find("a")
            if a:
                a.decompose()
            notes[n] = sp.decode_contents().replace("\xa0", " ").strip()
        sec.decompose()
    # Older files: footnote spans without the notes section.
    for sp in soup.select("span[id^=fn]"):
        n = sp.get("id")[2:]
        a = sp.find("a")
        if a:
            a.decompose()
        notes[n] = sp.decode_contents().replace("\xa0", " ").strip()
        nxt = sp.next_sibling
        sp.decompose()
        if getattr(nxt, "name", None) == "br":
            nxt.decompose()
    h1 = soup.find("h1")
    title = h1.get_text(" ", strip=True) if h1 else ""
    if h1:
        h1.decompose()
    root = soup.find("article") or soup
    body = root.decode_contents()
    # Split on h2 (or h3 when there are no h2s) when the piece is long.
    parts = []
    level = "h2" if re.search(r"<h2[\s>]", body) else ("h3" if re.search(r"<h3[\s>]", body) else None)
    if level and len(body) > 45000:
        pieces = re.split(rf"(?=<{level}[\s>])", body)
        intro = pieces[0]
        for p in pieces[1:]:
            m = re.match(rf"<{level}[^>]*>(.*?)</{level}>", p, re.S)
            t = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""
            parts.append([htmllib.unescape(re.sub(r"\s+", " ", t))[:140], p])
        if re.sub(r"<[^>]+>|\s|&nbsp;", "", intro):
            if parts and len(re.sub(r"<[^>]+>", "", intro)) < 1500:
                parts[0][1] = intro + parts[0][1]
            else:
                parts.insert(0, ["Introduction", intro])
        # Gather short chapters onto one page (about 1,500 words or more), so a
        # page isn't a single paragraph; the page is named first to last.
        merged = []
        for t, p in parts:
            if merged and words(merged[-1][2]) < 1500:
                merged[-1][1] = t or merged[-1][1]
                merged[-1][2] += p
            else:
                merged.append([t, t, p])
        parts = [((f"{a} to {b}" if a and b and a != b else (a or b)), p) for a, b, p in merged]
    else:
        parts = [("", body)]
    # Very long pages (no headings to split on) are cut at paragraph breaks.
    out = []
    for t, p in parts:
        if words(p) <= PAGE_MAX:
            out.append((t, p)); continue
        paras = re.split(r"(?<=</p>)|(?<=<br>)|(?<=<br/>)|(?=<h[234][\s>])", p)
        chunk, chunks = "", []
        for para in paras:
            chunk += para
            if words(chunk) >= PAGE_TARGET:
                chunks.append(chunk); chunk = ""
        if chunk.strip():
            if chunks and words(chunk) < 800:
                chunks[-1] += chunk
            else:
                chunks.append(chunk)
        for k, c in enumerate(chunks, 1):
            out.append(((t + " · " if t else "") + f"part {k} of {len(chunks)}", c))
    return title, out, notes


PAGE_MAX = 9000
PAGE_TARGET = 5000


FN_REF = re.compile(r'<sup[^>]*>\s*<a href="#fn(\w+)"[^>]*>[^<]*</a>\s*</sup>')


def finish(html, notes, prefix):
    """Clean one section and give it its own numbered notes."""
    used = []

    def ref(m):
        n = m.group(1)
        if n not in notes:
            return ""
        used.append(n)
        k = len(used)
        return f'<sup class="fn-ref"><a href="#{prefix}n{k}" id="{prefix}r{k}">{k}</a></sup>'
    html = FN_REF.sub(ref, html)
    html = re.sub(r"(<br\s*/?>\s*){3,}", "<br><br>", html)
    html = re.sub(r"<p[^>]*>(\s|&nbsp;|\xa0|<span[^>]*>\s*</span>|<br\s*/?>)*</p>", "", html)
    html = clean_fragment(html)
    if used:
        items = "".join(f'<li id="{prefix}n{k}">{clean_fragment(notes[n])} <a href="#{prefix}r{k}" class="fn-back" aria-label="Back to the text">↩</a></li>'
                        for k, n in enumerate(used, 1))
        html += f'<section class="fn-notes"><h4>Notes</h4><ol>{items}</ol></section>'
    # Only in-page links survive; a link to elsewhere becomes plain words.
    html = re.sub(r'<a href="(?!#)[^"]*"[^>]*>(.*?)</a>', r"\1", html, flags=re.S)
    html = re.sub(r"<a>(.*?)</a>", r"\1", html, flags=re.S)
    return html.strip()


def words(html):
    return len(re.sub(r"<[^>]+>", " ", html).split())


def plain(html):
    t = re.sub(r'<section class="fn-notes">.*?</section>', " ", html, flags=re.S)
    return htmllib.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t))).strip()


# ------------------------------------------------------------------ walking the collection

def html_files(folder):
    out = []
    for dp, dns, fns in os.walk(folder):
        dns.sort(key=natural)
        for f in sorted(fns, key=natural):
            if f.lower().endswith((".html", ".htm")):
                out.append(os.path.join(dp, f))
    return sorted(out, key=lambda p: natural(os.path.relpath(p, folder)))


def folder_notes(folder):
    t = ""
    for dp, _, fns in os.walk(folder):
        for f in fns:
            if f.lower().endswith((".txt", ".md")) or re.search(r"intro|preface|readme|about|note", f, re.I):
                try:
                    t += read(os.path.join(dp, f))[:20000]
                except OSError:
                    pass
    return t


GROUP = re.compile(r"^(.*?)[\s,:-]+(Book|Part|Volume|Vol\.)\s+([0-9IVXLC]+)$", re.I)


def works_of(adir):
    """[(work title, [file paths], key, attributed)] for one writer's folder."""
    entries = sorted(os.listdir(adir), key=natural)
    files = [e for e in entries if e.lower().endswith((".html", ".htm"))]
    dirs = [e for e in entries if os.path.isdir(os.path.join(adir, e)) and e not in SKIP_NAMES]
    out = []
    # Several translations of one work: keep the ANF one.
    if any(d.lower() == "translation-anf" for d in dirs):
        files = [f for f in files if not f.lower().startswith("translation-")]
    groups = {}
    for f in files:
        stem = re.sub(r"\.html?$", "", f)
        m = GROUP.match(stem)
        if m and len([x for x in files if x.startswith(m.group(1))]) > 1:
            groups.setdefault(m.group(1).strip(), []).append(os.path.join(adir, f))
        else:
            out.append((nice_title(stem), [os.path.join(adir, f)], stem, False))
    for g, ps in groups.items():
        out.append((nice_title(g), sorted(ps, key=natural), g, False))
    for d in dirs:
        full = os.path.join(adir, d)
        if d.lower().startswith("pseudo-"):
            for title, ps, key, _ in works_of(full):
                out.append((title, ps, d + "/" + key, True))
            continue
        ps = html_files(full)
        if ps:
            out.append((nice_title(d), ps, d, False))
    return out


ERAS = [(0, "apostolic", "The Apostolic Fathers", "Those who knew the apostles or their disciples, to about AD 150"),
        (200, "second", "The second century", "Apologists and the first theologians"),
        (300, "third", "The third century", "Persecution, the church in North Africa and Alexandria"),
        (400, "fourth", "The fourth century", "Nicaea, the Trinity and the Desert Fathers"),
        (500, "fifth", "The fifth century", "Augustine, Chalcedon and the fall of Rome"),
        (751, "later", "The sixth to eighth centuries", "Gregory the Great to John of Damascus")]


APOSTOLIC = {"clement-of-rome", "didache", "ignatius-of-antioch", "polycarp-of-smyrna", "papias-of-hierapolis",
             "epistle-of-barnabas", "epistle-to-diognetus", "shepherd-of-hermas"}


def era(year, slug=""):
    """By when they were writing: the year given is usually their death."""
    if slug in APOSTOLIC:
        return "apostolic"
    year = year - 15 if year > 150 else year
    for top, key, *_ in ERAS[1:]:
        if year < top:
            return key
    return "later"


def main(src):
    for f in (OUT, SEARCH_OUT):
        if os.path.exists(f):
            os.remove(f)
    db = sqlite3.connect(OUT)
    sdb = sqlite3.connect(SEARCH_OUT)
    sdb.executescript("""
    CREATE VIRTUAL TABLE search USING fts5(text, content='', tokenize='porter unicode61');
    CREATE TABLE search_map (rowid INTEGER PRIMARY KEY, work INTEGER, n INTEGER);
    """)
    db.executescript("""
    CREATE TABLE authors (slug TEXT PRIMARY KEY, name TEXT, year INTEGER, era TEXT, wiki TEXT, works INTEGER, words INTEGER);
    CREATE TABLE works (id INTEGER PRIMARY KEY, author TEXT, slug TEXT, title TEXT, attributed INTEGER, source TEXT,
                        sections INTEGER, words INTEGER, sort INTEGER, UNIQUE(author, slug));
    CREATE TABLE sections (work INTEGER, n INTEGER, title TEXT, words INTEGER, html BLOB, PRIMARY KEY (work, n));
    CREATE TABLE eras (key TEXT PRIMARY KEY, name TEXT, blurb TEXT, sort INTEGER);
    """)
    for i, (_, key, name, blurb) in enumerate(ERAS):
        db.execute("INSERT INTO eras VALUES (?,?,?,?)", (key, name, blurb, i))
    report = {"kept": 0, "ai": [], "modern": [], "copyright": [], "late": 0}
    rowid = 0
    for a in sorted(os.listdir(src), key=natural):
        adir = os.path.join(src, a)
        if not os.path.isdir(adir) or a.startswith(".") or a in SKIP_NAMES:
            continue
        meta = {}
        try:
            meta = tomllib.load(open(os.path.join(adir, "metadata.toml"), "rb"))
        except (OSError, tomllib.TOMLDecodeError):
            pass
        year = meta.get("default_year")
        if not isinstance(year, int) or year > LAST_YEAR:
            report["late"] += 1
            continue
        aslug = slugify(a)
        a_works = a_words = 0
        used_slugs = set()
        for sort, (title, paths, key, attributed) in enumerate(works_of(adir)):
            rel = a + "/" + key
            if title in LEAVE_OUT.get(a, ()):
                report["modern"].append(rel + " (listed)"); continue
            texts = [read(p) for p in paths]
            if rel not in KEEP and UNSURE.search(" ".join(t[:20000] for t in texts[:2])):
                report["modern"].append(rel + " (unattributed)"); continue
            work_dir = os.path.dirname(paths[0]) if len(paths) > 1 or os.path.dirname(paths[0]) != adir else None
            fnotes = folder_notes(work_dir) if work_dir and work_dir != adir else ""
            # Leave out machine translations: per file, or the whole folder when its note says so.
            if fnotes and flagged(fnotes):
                report["ai"].append(rel); continue
            keep_idx = [i for i, t in enumerate(texts) if not flagged(t)]
            if len(keep_idx) < len(texts):
                report["ai"].append(f"{rel} ({len(texts) - len(keep_idx)} of {len(texts)} files)")
            if rel not in KEEP:
                if MODERN.search(fnotes[:4000]):
                    report["modern"].append(rel); continue
                # One file of a work can be a later translation (Stromata book 3 is from 1954).
                old = [i for i in keep_idx if not MODERN.search(texts[i][:4000])
                       and not (COPYRIGHT.search(texts[i][:4000]) and not re.search(r"public domain", texts[i][:4000], re.I))]
                if len(old) < len(keep_idx):
                    report["modern"].append(f"{rel} ({len(keep_idx) - len(old)} of {len(texts)} files)")
                keep_idx = old
            if not keep_idx:
                continue
            sections = []
            source = ""
            for i in keep_idx:
                t = texts[i]
                source = source or source_note(t)
                ftitle, parts, notes = split_doc(t)
                label = ftitle
                if len(keep_idx) > 1:
                    relp = os.path.relpath(paths[i], work_dir) if work_dir else os.path.basename(paths[i])
                    bits = [nice_title(b) for b in re.sub(r"\.html?$", "", relp).split(os.sep)]
                    label = " · ".join(bits)
                for ptitle, phtml in parts:
                    st = ptitle if (len(parts) > 1 and ptitle) else label
                    if len(parts) > 1 and label and len(keep_idx) > 1:
                        st = f"{label} · {ptitle}" if ptitle else label
                    sections.append((st or title, phtml, notes))
            if not sections:
                continue
            wslug = slugify(title)
            while wslug in used_slugs:
                wslug += "-2"
            used_slugs.add(wslug)
            cur = db.execute("INSERT INTO works (author, slug, title, attributed, source, sections, words, sort) VALUES (?,?,?,?,?,?,?,?)",
                             (aslug, wslug, title, int(attributed), source, 0, 0, sort))
            wid = cur.lastrowid
            total = 0
            n = 0
            for st, phtml, notes in sections:
                h = finish(phtml, notes, "f")
                w = words(h)
                if w < 15:
                    continue
                n += 1
                total += w
                db.execute("INSERT INTO sections VALUES (?,?,?,?,?)", (wid, n, st[:160], w, zlib.compress(h.encode(), 9)))
                rowid += 1
                sdb.execute("INSERT INTO search (rowid, text) VALUES (?,?)", (rowid, f"{title} {st} {plain(h)}"))
                sdb.execute("INSERT INTO search_map VALUES (?,?,?)", (rowid, wid, n))
            if not n:
                db.execute("DELETE FROM works WHERE id=?", (wid,)); continue
            db.execute("UPDATE works SET sections=?, words=? WHERE id=?", (n, total, wid))
            a_works += 1; a_words += total; report["kept"] += 1
        if a_works:
            db.execute("INSERT INTO authors VALUES (?,?,?,?,?,?,?)", (aslug, a, year, era(year, aslug), meta.get("wiki", ""), a_works, a_words))
    sdb.execute("INSERT INTO search(search) VALUES ('optimize')")
    for d in (db, sdb):
        d.commit()
        d.execute("VACUUM")
        d.close()
    json.dump(report, open(os.path.join(os.path.dirname(OUT), "..", "..", "tools", "church_fathers_report.json"), "w"), indent=1)
    print("works kept", report["kept"], "| left out: machine-translated", len(report["ai"]), "modern", len(report["modern"]),
          "copyright", len(report["copyright"]), "| writers after 750:", report["late"])
    print("size MB", round(os.path.getsize(OUT) / 1e6, 1), "+ search", round(os.path.getsize(SEARCH_OUT) / 1e6, 1))


if __name__ == "__main__":
    main(sys.argv[1])
