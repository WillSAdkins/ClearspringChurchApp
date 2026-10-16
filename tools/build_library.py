"""
Build static/bibles/library.sqlite — the reference library behind the Bible
study pages: dictionary, topics, commentaries, people, places, events,
parallel passages, the Gospel harmony, journeys and creeds.

Sources (all free to use; see static/bibles/LIBRARY_LICENSES.txt):

  Theographic Bible Metadata     people, places, events, Easton's text   CC BY-SA 4.0
    github.com/robertrouse/theographic-bible-metadata (json/)
  Hitchcock's Bible Names        via BibleData (Brady Stephenson)         CC BY 4.0
    github.com/BradyStephenson/bible-data
  Nave's Topical Bible           SWORD module "Nave" (Ubuntu sword-dict-naves)      public domain
  Matthew Henry Concise          SWORD module "MHCC" (sword-comm-mhcc)              public domain
  Spurgeon, Treasury of David    SWORD module "TDavid" (sword-comm-tdavid)          public domain
  UBS Parallel Passages, Routes  github.com/ubsicap/ubs-open-license      CC BY-SA 4.0
  Creeds and confessions         github.com/NonlinearFruit/Creeds.json   public-domain texts only
  Gospel harmony                 built from Berean Standard Bible section headings (public domain)

Usage (SWORD modules exported first with `mod2imp MHCC > MHCC.imp` etc.):

  python tools/build_library.py --theographic DIR/json --bibledata DIR --sword DIR \
      --ubs DIR --creeds DIR/creeds --headings static/bibles/headings.sqlite \
      --out static/bibles/library.sqlite
"""

import argparse
import csv
import glob
import html
import json
import os
import re
import sqlite3
import sys
import unicodedata
import zlib
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from bible_books import ALL_BOOKS, BOOKS_BY_SLUG  # noqa: E402
import refs  # noqa: E402

OSIS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
        "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam",
        "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech",
        "Mal", "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col",
        "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John",
        "3John", "Jude", "Rev"]
OSIS_TO_SLUG = {o.lower(): b["slug"] for o, b in zip(OSIS, ALL_BOOKS)}
USFM_TO_SLUG = {b["usfm"]: b["slug"] for b in ALL_BOOKS}
BOOK_INDEX = {b["slug"]: i for i, b in enumerate(ALL_BOOKS)}


def z(obj):
    data = obj if isinstance(obj, str) else json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return zlib.compress(data.encode("utf-8"), 9)


def slugify(s):
    s = re.sub(r"['’]", "", s)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def verse_url(slug, ch, v=None):
    return f"/bible/v/{slug}/{ch}/{v}" if v else f"/bible/read/{slug}/{ch}"


def osis_ref(osis):
    """'Gen.11.27' / 'John.21.16' / 'Ps.23' → (slug, ch, v|None)."""
    m = re.match(r"^\s*([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?", osis or "")
    if not m:
        return None
    slug = OSIS_TO_SLUG.get(m.group(1).lower())
    if not slug:
        return None
    ch = int(m.group(2))
    if not 1 <= ch <= BOOKS_BY_SLUG[slug]["chapters"]:
        return None
    return slug, ch, int(m.group(3)) if m.group(3) else None


def link(slug, ch, v, text):
    return f'<a href="{verse_url(slug, ch, v)}">{text}</a>'


# --------------------------------------------------------------- OSIS → HTML

def osis_to_html(src, *, outline=True):
    """Turn a SWORD OSIS fragment into simple, safe HTML (paragraphs, headings,
    bold/italic, scripture links)."""
    s = src
    s = re.sub(r"<note\b.*?</note>", "", s, flags=re.S)
    s = re.sub(r"<milestone[^>]*/>", "", s)
    s = re.sub(r'<div[^>]*type="x-milestone"[^>]*/>', "", s)
    # tables used for chapter outlines
    s = re.sub(r"<row>\s*<cell>(.*?)</cell>\s*<cell>(.*?)</cell>\s*</row>",
               lambda m: f"\u0001OUT{m.group(1)}\u0002{m.group(2)}\u0003", s, flags=re.S)
    s = re.sub(r"</?(table|row|cell)[^>]*>", "", s)
    s = re.sub(r'<div[^>]*sID="[^"]*"[^>]*type="x-p"[^>]*/>|<div[^>]*type="x-p"[^>]*sID="[^"]*"[^>]*/>', "\n\n", s)
    s = re.sub(r"<lb\s*/>", "\n", s)
    s = re.sub(r"<title[^>]*>(.*?)</title>", lambda m: f"\n\n\u0001H{m.group(1)}\u0003\n\n", s, flags=re.S)
    s = re.sub(r'<hi type="bold">(.*?)</hi>', lambda m: f"\u0001B{m.group(1)}\u0003", s, flags=re.S)
    s = re.sub(r'<hi type="italic">(.*?)</hi>', lambda m: f"\u0001I{m.group(1)}\u0003", s, flags=re.S)

    def ref_sub(m):
        target = m.group(1).split()[0] if m.group(1) else ""
        r = osis_ref(target)
        if not r and target:
            # some modules use "mt 10:6" style
            f = refs.parse(target.replace(".", " "))
            r = (f["slug"], f["chapter"], f["verse"]) if f else None
        text = re.sub(r"<[^>]+>", "", m.group(2))
        if r:
            return f"\u0001R{r[0]}|{r[1]}|{r[2] or ''}\u0002{text}\u0003"
        return text
    s = re.sub(r'<reference[^>]*osisRef="([^"]*)"[^>]*>(.*?)</reference>', ref_sub, s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)          # everything else
    s = html.unescape(s)
    s = html.escape(s, quote=False)

    # restore our markers
    def restore(t):
        t = re.sub(r"\u0001B(.*?)\u0003", r"<strong>\1</strong>", t, flags=re.S)
        t = re.sub(r"\u0001I(.*?)\u0003", r"<em>\1</em>", t, flags=re.S)
        t = re.sub(r"\u0001R([^|]+)\|(\d+)\|(\d*)\u0002(.*?)\u0003",
                   lambda m: link(m.group(1), m.group(2), m.group(3) or None, m.group(4)), t, flags=re.S)
        return t
    out, items = [], []
    for para in re.split(r"\n\s*\n", s):
        para = para.strip()
        if not para:
            continue
        outs = re.findall(r"\u0001OUT(.*?)\u0002(.*?)\u0003", para, flags=re.S)
        if outs:
            for a, b in outs:
                items.append(f"<li>{restore(a.strip())} <span>{restore(b.strip())}</span></li>")
            para = re.sub(r"\u0001OUT.*?\u0003", "", para, flags=re.S).strip()
            if not para:
                continue
        if items:
            out.append('<ul class="cm-outline">' + "".join(items) + "</ul>")
            items = []
        h = re.fullmatch(r"\u0001H(.*?)\u0003", para, flags=re.S)
        if h:
            out.append(f"<h4>{restore(h.group(1).strip())}</h4>")
        else:
            out.append(f"<p>{restore(para)}</p>".replace("\n", "<br>"))
    if items:
        out.append('<ul class="cm-outline">' + "".join(items) + "</ul>")
    return "\n".join(out)


def md_links_to_html(text):
    """Theographic Easton text: '[Gen. 11:27](/gen#Gen.11.27)' → our links; plain otherwise."""
    parts, at = [], 0
    for m in re.finditer(r"\[([^\]]+)\]\(([^)]*)\)", text):
        parts.append(html.escape(text[at:m.start()], quote=False))
        target = m.group(2).split("#")[-1]
        r = osis_ref(target)
        label = html.escape(m.group(1), quote=False)
        parts.append(link(r[0], r[1], r[2], label) if r else label)
        at = m.end()
    parts.append(html.escape(text[at:], quote=False))
    body = "".join(parts)
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    return "\n".join(f"<p>{p}</p>" for p in paras)


def imp_entries(path):
    key, buf = None, []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith("$$$"):
                if key is not None:
                    yield key, "".join(buf)
                key, buf = line[3:].strip(), []
            else:
                buf.append(line)
    if key is not None:
        yield key, "".join(buf)


def sword_key(key):
    """'1 John 3:16' / 'Psalms 23:1' (KJV names) → (slug, ch, v)."""
    m = re.match(r"^(.+?) (\d+):(\d+)$", key)
    if not m:
        return None
    name = m.group(1)
    slug = {"Psalms": "psalms", "Song of Solomon": "song-of-solomon", "Revelation of John": "revelation"}.get(name)
    if not slug:
        f = refs.parse(f"{name} {m.group(2)}:{max(1, int(m.group(3)))}")
        slug = f["slug"] if f else None
    if not slug:
        return None
    return slug, int(m.group(2)), int(m.group(3))


# ------------------------------------------------------------------ builders

def build_commentary_mhcc(db, path):
    """MHCC: one SWORD entry per block of verses; inside, bold 'Verses 1-8'
    headings mark the sections. Store one row per section."""
    rows = 0
    for key, raw in imp_entries(path):
        k = sword_key(key)
        if not k or not raw.strip() or k[2] == 0 and k[1] == 0:
            continue
        slug, ch, v = k
        if ch == 0:
            continue
        body = osis_to_html(raw)
        # split on the "Verses a-b" / "Verse a" headings
        pieces = re.split(r"<p><strong>(Verses? [\d\s,\-–]+)</strong></p>", body)
        intro = pieces[0].strip()
        if v == 1 and intro and re.sub(r"<[^>]+>", "", intro).strip():
            db.execute("INSERT INTO commentary VALUES (?,?,?,?,?,?,?)", ("mhcc", slug, ch, 0, 0, "", z(intro)))
            rows += 1
        for i in range(1, len(pieces), 2):
            label = pieces[i].strip()
            nums = [int(n) for n in re.findall(r"\d+", label)]
            if not nums:
                continue
            v1, v2 = nums[0], nums[-1]
            text = pieces[i + 1].strip()
            db.execute("INSERT INTO commentary VALUES (?,?,?,?,?,?,?)",
                       ("mhcc", slug, ch, v1, v2, label.replace("-", "–"), z(text)))
            rows += 1
    return rows


def build_commentary_tdavid(db, path):
    rows = 0
    for key, raw in imp_entries(path):
        k = sword_key(key)
        if not k or not raw.strip() or k[0] != "psalms" or k[1] == 0:
            continue
        slug, ch, v = k
        body = osis_to_html(raw)
        db.execute("INSERT INTO commentary VALUES (?,?,?,?,?,?,?)", ("tdavid", slug, ch, 0, 0, "", z(body)))
        rows += 1
        # Per-verse exposition: between the EXPOSITION heading and the next heading
        m = re.search(r"<h4>EXPOSITION</h4>(.*?)(?=<h4>|$)", body, flags=re.S)
        if m:
            parts = re.split(r"<p><strong>Verses? ([\d\s,\-–]+)\.?</strong>", m.group(1))
            for i in range(1, len(parts), 2):
                nums = [int(n) for n in re.findall(r"\d+", parts[i])]
                if not nums:
                    continue
                text = "<p>" + parts[i + 1].strip()
                text = re.sub(r"^<p>\s*</p>", "", text)
                db.execute("INSERT INTO commentary VALUES (?,?,?,?,?,?,?)",
                           ("tdavid-v", slug, ch, nums[0], nums[-1], f"Verse {parts[i].strip()}", z(text)))
                rows += 1
    return rows


def nave_to_html(raw, topic_names):
    """The Nave entry: '→ HEADING refs' lines and nested lists → HTML rows;
    returns (html, [(slug, ch, v)])."""
    found, saved = [], []
    s = raw
    s = re.sub(r"</?entryFree[^>]*>|</?def>", "", s)
    def keep(h):
        saved.append(h)
        return f"\u0001{len(saved) - 1}\u0002"
    def ref_sub(m):
        r = osis_ref(m.group(1))
        text = html.escape(re.sub(r"<[^>]+>", "", m.group(2)).strip(), quote=False)
        if not r:
            return text
        found.append(r)
        return keep(link(r[0], r[1], r[2], text))
    s = re.sub(r'<ref[^>]*osisRef="([^"]+)"[^>]*>(.*?)</ref>', ref_sub, s, flags=re.S)
    def see_sub(m):
        name = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        slug = slugify(m.group(1).split(":", 1)[-1])
        if slug in topic_names:
            return keep(f'<a class="tp-see" href="/bible/topics/{slug}">{html.escape(name.title())}</a>')
        return html.escape(name.title())
    s = re.sub(r'<ref[^>]*target="([^"]+)"[^>]*>(.*?)</ref>', see_sub, s, flags=re.S)
    s = re.sub(r"<list>", "\u0003", s)
    s = re.sub(r"</list>", "\u0004", s)
    s = re.sub(r"<item>", "\u0005", s)
    s = re.sub(r"</item>", "", s)
    s = re.sub(r"<lb\s*/>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    # escape text but not our pre-built links
    out, depth, html_parts = [], 0, []
    tokens = re.split(r"(\u0001.*?\u0002|[\u0003\u0004\u0005\n])", s, flags=re.S)
    line = []
    def flush():
        t = "".join(line).strip().lstrip("→").strip()
        line.clear()
        if not t:
            return
        # split label from refs: label is the text before the first link
        m = re.match(r"^(.*?)(<a href=.*)$", t, flags=re.S)
        if m and m.group(1).strip():
            lab, rest = m.group(1).strip().rstrip(",;:"), m.group(2)
            html_parts.append(f'<div class="tp-row d{min(depth, 3)}"><span class="tp-label">{lab}</span> <span class="tp-refs">{rest}</span></div>')
        elif m:
            html_parts.append(f'<div class="tp-row d{min(depth, 3)}"><span class="tp-refs">{t}</span></div>')
        else:
            html_parts.append(f'<div class="tp-row d{min(depth, 3)}"><span class="tp-label">{t}</span></div>')
    for tok in tokens:
        if not tok:
            continue
        if tok == "\n" or tok == "\u0005":
            flush()
        elif tok == "\u0003":
            flush(); depth += 1
        elif tok == "\u0004":
            flush(); depth = max(0, depth - 1)
        elif tok.startswith("\u0001"):
            line.append(saved[int(tok[1:-1])])
        else:
            line.append(html.escape(tok, quote=False))
    flush()
    return "\n".join(html_parts), found


def build_topics(db, path):
    entries = [(k, v) for k, v in imp_entries(path) if v.strip() and not k.startswith("[")]
    names = {slugify(k): k for k, _ in entries}
    n = 0
    for key, raw in entries:
        slug = slugify(key)
        body, found = nave_to_html(raw, names)
        name = key.title() if key.isupper() else key
        db.execute("INSERT OR REPLACE INTO topics VALUES (?,?,?,?)", (slug, name, z(body), len(found)))
        for r in set(found):
            if r[2]:
                db.execute("INSERT INTO topic_verses VALUES (?,?,?,?)", (slug, r[0], r[1], r[2]))
        n += 1
    return n


def build_names(db, bibledata):
    n = 0
    with open(os.path.join(bibledata, "HitchcocksBibleNamesDictionary.csv"), encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            name, meaning = row["Name"].strip(), row["Meaning"].strip()
            if name and meaning:
                db.execute("INSERT OR REPLACE INTO names VALUES (?,?,?)", (name.lower(), name, meaning))
                n += 1
    return n


def build_theographic(db, tdir):
    J = lambda f: json.load(open(os.path.join(tdir, f + ".json"), encoding="utf-8"))
    people, places, events, easton, verses, groups = J("people"), J("places"), J("events"), J("easton"), J("verses"), J("peopleGroups")

    verse_ref = {}
    for v in verses:
        r = osis_ref(v["fields"].get("osisRef", ""))
        if r and r[2]:
            verse_ref[v["id"]] = r

    # ---- slugs: plain name when unique, else name-N
    def make_slugs(items, name_key, id_key):
        """Plain name when unique; for shared names the best-known one keeps the
        plain name (if far better known), the rest use their title or an id."""
        groups = defaultdict(list)
        for x in items:
            groups[slugify(x["fields"].get(name_key) or "") or "unknown"].append(x)
        taken = set(groups)
        out = {}
        for base, xs in groups.items():
            if len(xs) == 1:
                out[xs[0]["id"]] = base
                continue
            xs = sorted(xs, key=lambda x: -(x["fields"].get("verseCount") or 0))
            top, second = xs[0]["fields"].get("verseCount") or 0, xs[1]["fields"].get("verseCount") or 0
            for i, x in enumerate(xs):
                if i == 0 and top >= 3 * max(second, 1):
                    out[x["id"]] = base
                    continue
                t = slugify(x["fields"].get("displayTitle") or "")
                if t and t != base and t not in taken:
                    out[x["id"]] = t
                    taken.add(t)
                else:
                    out[x["id"]] = f"{base}-{x['fields'].get(id_key)}"
        return out
    pslug = make_slugs(people, "name", "personID")
    lslug = make_slugs(places, "displayTitle", "placeID")
    group_name = {g["id"]: g["fields"].get("groupName") for g in groups}
    theo_people = {p["fields"].get("slug"): pslug[p["id"]] for p in people}
    theo_places = {p["fields"].get("slug"): lslug[p["id"]] for p in places}

    def years(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    # ---- people
    for p in people:
        f = p["fields"]
        if f.get("status") not in ("publish", "wip", None):
            continue
        refs_ = sorted({verse_ref[v] for v in f.get("verses", []) if v in verse_ref},
                       key=lambda r: (BOOK_INDEX[r[0]], r[1], r[2]))
        summary = ""
        if f.get("dictText"):
            summary = md_links_to_html(f["dictText"][0] if isinstance(f["dictText"], list) else f["dictText"])
        rel = {}
        for k in ("father", "mother", "partners", "children", "siblings", "halfSiblingsSameFather", "halfSiblingsSameMother"):
            ids = [pslug[i] for i in f.get(k, []) if i in pslug]
            if ids:
                rel[k] = ids
        data = {
            "also": f.get("alsoCalled"), "gender": f.get("gender"),
            "birth": years(f.get("birthYear")), "death": years(f.get("deathYear")),
            "groups": [group_name[g] for g in f.get("memberOf", []) if g in group_name],
            "rel": rel, "verses": refs_[:4000],
            "born_at": [lslug[i] for i in f.get("birthPlace", []) if i in lslug],
            "died_at": [lslug[i] for i in f.get("deathPlace", []) if i in lslug],
            "wrote": f.get("chaptersWritten") and len(f.get("chaptersWritten")),
        }
        db.execute("INSERT INTO people VALUES (?,?,?,?,?,?,?)",
                   (pslug[p["id"]], f.get("name") or f.get("displayTitle"), f.get("displayTitle"),
                    len(refs_), z(summary), z(data), (f.get("minYear") if isinstance(f.get("minYear"), int) else None)))
        per_ch = defaultdict(int)
        for r in refs_:
            per_ch[(r[0], r[1])] += 1
        for (b, c), n in per_ch.items():
            db.execute("INSERT INTO chapter_people VALUES (?,?,?,?)", (b, c, pslug[p["id"]], n))

    # ---- places
    for pl in places:
        f = pl["fields"]
        if f.get("duplicate_of"):
            continue
        refs_ = sorted({verse_ref[v] for v in f.get("verses", []) if v in verse_ref},
                       key=lambda r: (BOOK_INDEX[r[0]], r[1], r[2]))
        try:
            lat, lon = float(f.get("latitude")), float(f.get("longitude"))
        except (TypeError, ValueError):
            lat = lon = None
        summary = ""
        dt = f.get("dictText")
        if dt:
            summary = md_links_to_html(dt[0] if isinstance(dt, list) else dt)
        data = {"type": f.get("featureType"), "sub": f.get("featureSubType"), "comment": f.get("comment"),
                "precision": f.get("precision"), "verses": refs_[:4000],
                "aliases": f.get("aliases")}
        db.execute("INSERT INTO places VALUES (?,?,?,?,?,?,?)",
                   (lslug[pl["id"]], f.get("displayTitle"), lat, lon, len(refs_), z(summary), z(data)))
        per_ch = defaultdict(int)
        for r in refs_:
            per_ch[(r[0], r[1])] += 1
        for (b, c), n in per_ch.items():
            db.execute("INSERT INTO chapter_places VALUES (?,?,?,?)", (b, c, lslug[pl["id"]], n))

    # ---- events (the timeline)
    for e in events:
        f = e["fields"]
        refs_ = sorted({verse_ref[v] for v in f.get("verses", []) if v in verse_ref},
                       key=lambda r: (BOOK_INDEX[r[0]], r[1], r[2]))
        data = {"duration": f.get("duration"),
                "people": [pslug[i] for i in f.get("participants", []) if i in pslug],
                "places": [lslug[i] for i in f.get("locations", []) if i in lslug],
                "verses": refs_, "range": ranges(refs_)}
        db.execute("INSERT INTO events VALUES (?,?,?,?,?)",
                   (f.get("eventID"), f.get("title"), years(f.get("startDate")), f.get("sortKey"), z(data)))

    # ---- Easton's dictionary
    by_term = defaultdict(list)
    for x in easton:
        f = x["fields"]
        if not f.get("dictText"):
            continue
        by_term[f["termLabel"]].append(f)
    for term, senses in by_term.items():
        slug = slugify(term)
        senses.sort(key=lambda f: f.get("itemNum") or 0)
        out = []
        for f in senses:
            links = []
            for s_ in (f.get("matchSlugs") or "").split(","):
                s_ = s_.strip()
                if s_ in theo_people:
                    links.append(["person", theo_people[s_]])
                elif s_ in theo_places:
                    links.append(["place", theo_places[s_]])
            out.append({"html": md_links_to_html(f["dictText"]), "links": links})
        db.execute("INSERT OR REPLACE INTO dictionary VALUES (?,?,?,?)", (slug, term, len(out), z(out)))
    return len(people), len(places), len(events), len(by_term)


def ranges(refs_):
    """[(slug,ch,v)…] → compact labels 'Genesis 12:1–9; 13:1'."""
    out = []
    for r in refs_:
        if out and out[-1][0] == r[0] and out[-1][1] == r[1] and out[-1][3] + 1 == r[2]:
            out[-1][3] = r[2]
        else:
            out.append([r[0], r[1], r[2], r[2]])
    return [[a, b, c, d] for a, b, c, d in out]


def build_parallels(db, ubs):
    import xml.etree.ElementTree as ET
    root = ET.parse(os.path.join(ubs, "parallel passages", "ParallelPassages.xml")).getroot()
    gid = 0
    for p in root.findall("Passage"):
        rows = []
        for v in p.findall("Verse"):
            m = re.match(r"^([1-3A-Z]{3}) (\d+):(\d+)(?:-(\d+))?$", (v.text or "").strip())
            if not m or m.group(1) not in USFM_TO_SLUG:
                continue
            lang = "heb" if v.get("HEB") is not None else "grk"
            rows.append((USFM_TO_SLUG[m.group(1)], int(m.group(2)), int(m.group(3)), int(m.group(4) or m.group(3)), lang))
        if len(rows) < 2:
            continue
        gid += 1
        ot = any(BOOK_INDEX[r[0]] < 39 for r in rows)
        nt = any(BOOK_INDEX[r[0]] >= 39 for r in rows)
        kind = "quote" if ot and nt else ("gospels" if all(r[0] in ("matthew", "mark", "luke", "john") for r in rows) else "parallel")
        for r in rows:
            db.execute("INSERT INTO parallels VALUES (?,?,?,?,?,?)", (gid, kind, r[0], r[1], r[2], r[3]))
    return gid


def build_harmony(db, headings_db):
    """Sections of the Gospels from the BSB headings, with their parallels."""
    hd = sqlite3.connect(headings_db)
    gospels = ["matthew", "mark", "luke", "john"]
    rows = hd.execute("SELECT book, chapter, verse, kind, text, seq FROM headings WHERE book IN (?,?,?,?) ORDER BY book, chapter, verse, seq", gospels).fetchall()
    # pair each heading with the refs line that follows it
    sections = []
    last = None
    for book, ch, v, kind, text, seq in rows:
        if kind == "heading":
            last = {"book": book, "ch": ch, "v": v, "title": text, "refs": ""}
            sections.append(last)
        elif kind == "refs" and last and last["book"] == book and last["ch"] == ch and last["v"] == v:
            last["refs"] = text
    # section end = next section start - 1 (same book)
    web = sqlite3.connect(os.path.join(os.path.dirname(headings_db), "web.sqlite"))
    def last_verse(book, ch):
        return web.execute("SELECT MAX(verse) FROM verses WHERE book=? AND chapter=?", (book, ch)).fetchone()[0] or 1
    by_book = defaultdict(list)
    for s in sections:
        by_book[s["book"]].append(s)
    for b, lst in by_book.items():
        for i, s in enumerate(lst):
            nxt = lst[i + 1] if i + 1 < len(lst) else None
            if nxt and nxt["v"] > 1:
                s["end"] = (nxt["ch"], nxt["v"] - 1)
            elif nxt:
                s["end"] = (nxt["ch"] - 1, last_verse(b, nxt["ch"] - 1))
            else:
                s["end"] = (BOOKS_BY_SLUG[b]["chapters"], last_verse(b, BOOKS_BY_SLUG[b]["chapters"]))
    def label(book, ch, v, end):
        name = BOOKS_BY_SLUG[book]["name"]
        ech, ev = end
        if ech == ch:
            return f"{name} {ch}:{v}–{ev}" if ev != v else f"{name} {ch}:{v}"
        return f"{name} {ch}:{v}–{ech}:{ev}"
    def parse_refs(text):
        out = {}
        for part in (text or "").split(";"):
            f = refs.parse(part.strip())
            if f and f["slug"] in gospels:
                out.setdefault(f["slug"], f["label"])
        return out
    # Each section, with the parallels its heading lists
    # A heading's parallels can be thematic (the Lord's Prayer in Matthew 6 and
    # Luke 11). For a harmony keep only those at a similar point in the story.
    def rel(book, ch):
        return (ch - 1) / BOOKS_BY_SLUG[book]["chapters"]
    for b, lst in by_book.items():
        for s in lst:
            s["cols"] = {b: label(b, s["ch"], s["v"], s["end"])}
            for k, v in parse_refs(s["refs"]).items():
                f = refs.parse(v)
                if k == b or not f:
                    continue
                if "john" in (k, b):
                    # John follows his own order; it only meets the others at
                    # the Baptist, the feeding and the walk on water, the entry
                    # into Jerusalem, the Last Supper and the Passion.
                    jch = f["chapter"] if k == "john" else s["ch"]
                    other = rel(b, s["ch"]) if k == "john" else rel(k, f["chapter"])
                    ok = ((jch == 1 and other < 0.2) or (jch == 6 and 0.3 <= other <= 0.7)
                          or (jch in (12, 13, 18, 19, 20) and other >= 0.75))
                else:
                    ok = abs(rel(k, f["chapter"]) - rel(b, s["ch"])) <= 0.25
                if ok:
                    s["cols"][k] = v
    # Story order: Matthew's order where a section has a Matthew parallel (or
    # Mark's, mapped through its Matthew parallel); sections without one keep
    # their place after the previous anchored section of the same Gospel.
    mt_pos = {}
    for s in by_book["matthew"]:
        mt_pos[("matthew", s["ch"], s["v"])] = s["ch"] * 1000 + s["v"]
    def anchor(s):
        mt = s["cols"].get("matthew")
        if mt:
            f = refs.parse(mt)
            return f["chapter"] * 1000 + (f["verse"] or 0)
        return None
    harmony, covered = [], set()
    for b in gospels:
        prev = -1.0
        for i, s in enumerate(by_book[b]):
            a = anchor(s)
            if a is None and b in ("luke", "john"):
                mk = s["cols"].get("mark")
                if mk:
                    f = refs.parse(mk)
                    m_sec = next((x for x in by_book["mark"] if x["ch"] == f["chapter"] and x["v"] == f["verse"]), None)
                    a = anchor(m_sec) if m_sec else None
            key = a if a is not None else prev + 0.001
            prev = key if a is None else a
            starts = set()
            for g, lab in s["cols"].items():
                f = refs.parse(lab)
                if f:
                    starts.add((g, f["chapter"], f["verse"]))
            if (b, s["ch"], s["v"]) in covered:
                continue
            covered.update(starts)
            harmony.append((key, s["title"], s["cols"]))
    harmony.sort(key=lambda h: h[0])
    harmony = [(None, t, None, None, None, c.get("matthew"), c.get("mark"), c.get("luke"), c.get("john")) for _, t, c in harmony]
    for i, h in enumerate(harmony, 1):
        db.execute("INSERT INTO harmony VALUES (?,?,?,?,?,?)", (i, h[1], h[5], h[6], h[7], h[8]))
    return len(harmony)


JOURNEYS = [
    # (filename prefix, title, era, refs)
    ("001.", "Abram goes to Haran", "Patriarchs", "Genesis 11:31"),
    ("003.", "Abram comes to Canaan", "Patriarchs", "Genesis 12:4-9"),
    ("005.", "Abram goes down to Egypt", "Patriarchs", "Genesis 12:10-20"),
    ("008.", "The battle in the Valley of Siddim", "Patriarchs", "Genesis 14:1-12"),
    ("012.", "Abram rescues Lot; meets Melchizedek", "Patriarchs", "Genesis 14:13-24"),
    ("019.", "Abraham takes Isaac to Moriah", "Patriarchs", "Genesis 22:1-19"),
    ("023.", "Jacob flees to Haran", "Patriarchs", "Genesis 28:10-22"),
    ("028.", "Jacob returns from Haran", "Patriarchs", "Genesis 31:17-55"),
    ("031.", "Joseph goes to his brothers at Dothan", "Patriarchs", "Genesis 37:12-36"),
    ("035.", "Jacob goes down to Egypt", "Patriarchs", "Genesis 46:1-7"),
    ("039.", "Moses flees to Midian", "Exodus & wilderness", "Exodus 2:11-22"),
    ("042.", "The Exodus (route 1)", "Exodus & wilderness", "Exodus 13:17-14:31"),
    ("043.", "The Exodus (route 2)", "Exodus & wilderness", "Exodus 13:17-14:31"),
    ("044.", "The twelve spies", "Exodus & wilderness", "Numbers 13:1-33"),
    ("046.", "Forty years in the wilderness", "Exodus & wilderness", "Numbers 33:1-49"),
    ("054.", "Crossing the Jordan", "Conquest & judges", "Joshua 3:1-17"),
    ("055.", "The fall of Jericho", "Conquest & judges", "Joshua 6:1-27"),
    ("062.", "The southern campaign", "Conquest & judges", "Joshua 10:28-43"),
    ("064.", "The northern campaign", "Conquest & judges", "Joshua 11:1-15"),
    ("068.", "Deborah and Barak", "Conquest & judges", "Judges 4:1-24"),
    ("069.", "Gideon", "Conquest & judges", "Judges 7:1-25"),
    ("072.", "Samson", "Conquest & judges", "Judges 14:1-16:31"),
    ("075.", "Ruth and Naomi", "Conquest & judges", "Ruth 1:1-22"),
    ("078.", "The journeys of the ark", "Kingdom", "1 Samuel 5:1-7:2"),
    ("085.", "David and Goliath", "Kingdom", "1 Samuel 17:1-58"),
    ("086.", "David on the run (1)", "Kingdom", "1 Samuel 21:1-22:5"),
    ("087.", "David on the run (2)", "Kingdom", "1 Samuel 23:1-29"),
    ("104.", "The Queen of Sheba visits Solomon", "Kingdom", "1 Kings 10:1-13"),
    ("115.", "Elijah on Mount Carmel", "Prophets", "1 Kings 18:20-46"),
    ("116.", "Elijah flees to Sinai", "Prophets", "1 Kings 19:1-18"),
    ("127.", "Naaman", "Prophets", "2 Kings 5:1-27"),
    ("155. Jonah", "Jonah", "Prophets", "Jonah 1:1-3:4"),
    ("141.", "Israel deported to Assyria", "Exile", "2 Kings 17:1-23"),
    ("144.", "Sennacherib's invasion", "Exile", "2 Kings 18:13-19:37"),
    ("151. Babylonian", "Judah taken to Babylon", "Exile", "2 Kings 25:1-21"),
    ("153. Nazareth to Bethlehem", "Mary and Joseph go to Bethlehem", "Life of Jesus", "Luke 2:1-7"),
    ("155b.", "Escape to Egypt and return to Nazareth", "Life of Jesus", "Matthew 2:13-23"),
    ("161.", "The wedding at Cana", "Life of Jesus", "John 2:1-11"),
    ("162.", "Jesus goes through Samaria", "Life of Jesus", "John 4:1-42"),
    ("165.", "From Nazareth to Capernaum", "Life of Jesus", "Matthew 4:12-17"),
    ("170b.", "Calming the storm", "Life of Jesus", "Mark 4:35-5:20"),
    ("172.", "The Transfiguration", "Life of Jesus", "Mark 9:2-13"),
    ("177.", "Raising Lazarus", "Life of Jesus", "John 11:1-44"),
    ("179.", "The last journey to Jerusalem", "Life of Jesus", "Luke 18:31-19:44"),
    ("192.", "The road to Emmaus", "Life of Jesus", "Luke 24:13-35"),
    ("198.", "Philip and the Ethiopian official", "Early church", "Acts 8:26-40"),
    ("199. Saul", "Saul on the road to Damascus", "Early church", "Acts 9:1-19"),
    ("202. First", "Paul's first missionary journey", "Early church", "Acts 13:1-14:28"),
    ("203.", "Paul's second missionary journey", "Early church", "Acts 15:36-18:22"),
    ("204.", "Paul's third missionary journey", "Early church", "Acts 18:23-21:17"),
    ("205.", "Paul's voyage to Rome", "Early church", "Acts 27:1-28:16"),
]


def build_routes(db, ubs):
    folder = os.path.join(ubs, "ubs-bible-routes", "GeoJsonRoutes")
    files = sorted(os.listdir(folder))
    n = 0
    for i, (prefix, title, era, ref) in enumerate(JOURNEYS):
        fn = next((f for f in files if f.startswith(prefix)), None)
        if not fn:
            print("  route missing:", prefix, file=sys.stderr)
            continue
        gj = json.load(open(os.path.join(folder, fn), encoding="utf-8"))
        feats = gj["features"] if gj.get("type") == "FeatureCollection" else [gj]
        lines = []
        for f in feats:
            g = f.get("geometry") or {}
            if g.get("type") == "LineString":
                lines.append(g["coordinates"])
            elif g.get("type") == "MultiLineString":
                lines.extend(g["coordinates"])
        lines = [[[round(x, 3), round(y, 3)] for x, y in ln[::max(1, len(ln) // 120)] + [ln[-1]]] for ln in lines if ln]
        if not lines:
            continue
        db.execute("INSERT INTO routes VALUES (?,?,?,?,?,?)", (slugify(title), i, title, era, ref, z(lines)))
        n += 1
    return n


PUBLIC_DOMAIN_CREEDS = [
    "apostles_creed", "nicene_creed", "athanasian_creed", "chalcedonian_definition",
    "heidelberg_catechism", "westminster_shorter_catechism", "westminster_larger_catechism",
    "westminster_confession_of_faith", "london_baptist_1689", "belgic_confession_of_faith",
    "canons_of_dort", "scots_confession", "second_helvetic_confession", "catechism_for_young_children",
    "1695_baptist_catechism", "council_of_orange",
]


def build_creeds(db, folder):
    n = 0
    for i, name in enumerate(PUBLIC_DOMAIN_CREEDS):
        path = os.path.join(folder, name + ".json")
        if not os.path.exists(path):
            continue
        d = json.load(open(path, encoding="utf-8"))
        meta = d.get("Metadata", {})
        if "public domain" not in (meta.get("SourceAttribution") or "").lower():
            print("  skipping (not marked public domain):", name, file=sys.stderr)
            continue
        db.execute("INSERT INTO creeds VALUES (?,?,?,?,?,?)",
                   (slugify(meta.get("Title") or name), i, meta.get("Title"), meta.get("Year"),
                    meta.get("CreedFormat"), z(d)))
        n += 1
    return n


SCHEMA = """
CREATE TABLE dictionary (slug TEXT PRIMARY KEY, term TEXT, senses INT, data BLOB);
CREATE TABLE names (key TEXT PRIMARY KEY, name TEXT, meaning TEXT);
CREATE TABLE topics (slug TEXT PRIMARY KEY, name TEXT, body BLOB, refs INT);
CREATE TABLE topic_verses (topic TEXT, book TEXT, chapter INT, verse INT);
CREATE TABLE commentary (source TEXT, book TEXT, chapter INT, v1 INT, v2 INT, label TEXT, body BLOB);
CREATE TABLE people (slug TEXT PRIMARY KEY, name TEXT, title TEXT, verses INT, summary BLOB, data BLOB, min_year INT);
CREATE TABLE places (slug TEXT PRIMARY KEY, name TEXT, lat REAL, lon REAL, verses INT, summary BLOB, data BLOB);
CREATE TABLE chapter_people (book TEXT, chapter INT, slug TEXT, n INT);
CREATE TABLE chapter_places (book TEXT, chapter INT, slug TEXT, n INT);
CREATE TABLE events (id INT PRIMARY KEY, title TEXT, year INT, sort REAL, data BLOB);
CREATE TABLE parallels (gid INT, kind TEXT, book TEXT, chapter INT, v1 INT, v2 INT);
CREATE TABLE harmony (seq INT PRIMARY KEY, title TEXT, matthew TEXT, mark TEXT, luke TEXT, john TEXT);
CREATE TABLE routes (slug TEXT PRIMARY KEY, seq INT, title TEXT, era TEXT, ref TEXT, lines BLOB);
CREATE TABLE creeds (slug TEXT PRIMARY KEY, seq INT, title TEXT, year TEXT, format TEXT, data BLOB);
"""
INDEXES = """
CREATE INDEX tv_verse ON topic_verses(book, chapter, verse);
CREATE INDEX cm_ch ON commentary(source, book, chapter);
CREATE INDEX cp_ch ON chapter_people(book, chapter);
CREATE INDEX cpl_ch ON chapter_places(book, chapter);
CREATE INDEX pp_ch ON parallels(book, chapter);
CREATE INDEX pp_g ON parallels(gid);
CREATE INDEX people_name ON people(name);
CREATE INDEX places_name ON places(name);
CREATE INDEX dict_term ON dictionary(term);
CREATE INDEX topic_name ON topics(name);
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theographic", required=True)
    ap.add_argument("--bibledata", required=True)
    ap.add_argument("--sword", required=True)
    ap.add_argument("--ubs", required=True)
    ap.add_argument("--creeds", required=True)
    ap.add_argument("--headings", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    if os.path.exists(a.out):
        os.remove(a.out)
    db = sqlite3.connect(a.out)
    db.executescript(SCHEMA)
    print("names", build_names(db, a.bibledata))
    print("topics", build_topics(db, os.path.join(a.sword, "Nave.imp")))
    print("mhcc", build_commentary_mhcc(db, os.path.join(a.sword, "MHCC.imp")))
    print("tdavid", build_commentary_tdavid(db, os.path.join(a.sword, "TDavid.imp")))
    print("people/places/events/dictionary", build_theographic(db, a.theographic))
    print("parallels", build_parallels(db, a.ubs))
    print("harmony", build_harmony(db, a.headings))
    print("routes", build_routes(db, a.ubs))
    print("creeds", build_creeds(db, a.creeds))
    db.executescript(INDEXES)
    db.commit()
    db.execute("VACUUM")
    db.close()
    print("size", os.path.getsize(a.out))


if __name__ == "__main__":
    main()
