"""
Build static/bibles/commentaries/<code>.sqlite: one small database per classic
commentary, from CrossWire SWORD modules exported to text with mod2imp.

    SWORD_PATH=DIR mod2imp JFB > JFB.imp       (and so on for each module)
    python tools/build_commentaries.py --imp DIR_WITH_IMP_FILES

Every module used here is marked "Public Domain" in its SWORD .conf file,
except Robertson's Word Pictures ("Copyrighted; free non-commercial
distribution"), which this church app may use as it is free and has no ads.

Each database has one table:
    ch(book, chapter, data)   data = zlib-compressed JSON list of
                              [first verse, last verse, label, html]
chapter 0 = introduction to the book; v1 = 0 = introduction to the chapter.

The HTML is rebuilt from scratch: the source markup is reduced to plain text
with markers for the few things we keep (paragraphs, headings, bold, italic,
Greek/Hebrew, Bible links), escaped, and only then turned back into tags, so
nothing from the source can reach the page as markup.
"""
import argparse
import html
import json
import os
import re
import sqlite3
import sys
import zlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from bible_books import ALL_BOOKS, BOOKS_BY_SLUG  # noqa: E402
import refs  # noqa: E402
import study_data  # noqa: E402

# code: (SWORD module, file stem)
MODULES = {
    "mhc": "MHC", "jfb": "JFB", "barnes": "Barnes", "clarke": "Clarke", "calvin": "CalvinCommentaries",
    "wesley": "Wesley", "geneva": "Geneva", "pnt": "PNT", "rwp": "RWP", "scofield": "Scofield",
}

ROMAN = {"I": "1", "II": "2", "III": "3"}
NAME_FIX = {"Psalms": "psalms", "Song of Solomon": "song-of-solomon", "Revelation of John": "revelation"}
BOOK_ORDER = {b["slug"]: i for i, b in enumerate(ALL_BOOKS)}
BY_NAME = {b["name"].lower(): b["slug"] for b in ALL_BOOKS}


def book_slug(name):
    if name in NAME_FIX:
        return NAME_FIX[name]
    parts = name.split(" ", 1)
    if parts[0] in ROMAN and len(parts) == 2:
        name = ROMAN[parts[0]] + " " + parts[1]
    return BY_NAME.get(name.lower())


def imp_entries(path):
    """mod2imp output: '$$$key' lines, then the entry. Some modules are UTF-8,
    some Latin-1 (and one has a few stray bytes), so each line is read as
    UTF-8 where it can be and as Windows-1252 where it can't."""
    key, buf = None, []
    with open(path, "rb") as f:
        for raw in f:
            try:
                line = raw.decode("utf-8")
            except UnicodeDecodeError:
                line = raw.decode("cp1252", errors="replace")
            if line.startswith("$$$"):
                if key is not None:
                    yield key, "".join(buf)
                key, buf = line[3:].strip(), []
            else:
                buf.append(line)
    if key is not None:
        yield key, "".join(buf)


def parse_key(key):
    m = re.match(r"^(.+?) (\d+):(\d+)$", key)
    if not m:
        return None
    slug = book_slug(m.group(1))
    if not slug:
        return None
    return slug, int(m.group(2)), int(m.group(3))


def osis_target(t, ctx):
    """'John.3.16' / 'John.3.16-John.3.21' / 'mt 10:6' / 'Jn 6:33' → (slug, ch, v|None)."""
    t = (t or "").strip()
    t = re.sub(r"^[A-Za-z]+:", "", t)          # "Bible:John.3.16", "Scofield:Mt 4:8"
    first = re.split(r"[\s;,-]+(?=[1-3]?[A-Za-z])", t)[0] if t else t
    m = re.match(r"^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?", first)
    if m:
        f = refs.parse(f"{m.group(1)} {m.group(2)}" + (f":{m.group(3)}" if m.group(3) else ""))
        if f:
            return f["slug"], f["chapter"], f["verse"]
    f = refs.parse(first.replace(".", " ")) if first else None
    if f:
        return f["slug"], f["chapter"], f["verse"]
    m = re.match(r"^(\d+):(\d+)", first or "")
    if m and ctx:
        return ctx[0], int(m.group(1)), int(m.group(2))
    return None


def marker(r, text):
    if r and r[0] in BOOKS_BY_SLUG and 1 <= r[1] <= BOOKS_BY_SLUG[r[0]]["chapters"]:
        return f"\u0001R{r[0]}|{r[1]}|{r[2] or ''}\u0002{text}\u0003"
    return text


def multi(text, ctx):
    """'Ps 84:11; Jas 1:17' / 'Jn 6:33, 17:21' / 'Lu 15:4,6,32' → a link for each,
    carrying the book (and chapter) forward."""
    out, book, chap = [], ctx[0] if ctx else None, None
    for piece in re.split(r"(\s*[;,]\s*)", text):
        if not piece or re.fullmatch(r"\s*[;,]\s*", piece):
            out.append(piece)
            continue
        f = refs.parse(piece)
        if f:
            book, chap = f["slug"], f["chapter"]
            out.append(marker((f["slug"], f["chapter"], f["verse"]), piece))
            continue
        m = re.fullmatch(r"\s*(\d+):(\d+)(?:[-–]\d+)?\s*", piece)
        if m and book:
            chap = int(m.group(1))
            out.append(marker((book, chap, int(m.group(2))), piece))
            continue
        m = re.fullmatch(r"\s*(\d+)(?:[-–]\d+)?\s*", piece)
        if m and book and chap:
            out.append(marker((book, chap, int(m.group(1))), piece))
            continue
        out.append(piece)
    return "".join(out)


def to_html(src, ctx=None):
    """OSIS or ThML/HTML fragment → safe, simple HTML."""
    s = src
    s = re.sub(r"<note\b.*?</note>", "", s, flags=re.S)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    # paragraphs and line breaks
    s = re.sub(r'<div\b[^>]*type="(?:x-p|paragraph)"[^>]*/>', "\n\n", s)
    s = re.sub(r'<div\b[^>]*type="(?:introduction|section|x-milestone)"[^>]*/>', "\n\n", s)
    s = re.sub(r"</?p\b[^>]*>", "\n\n", s)
    s = re.sub(r"<br\s*/?>\s*<br\s*/?>", "\n\n", s)
    s = re.sub(r"<(?:br|lb)\b[^>]*/?>", "\n", s)
    s = re.sub(r"</?(?:lg|blockquote|ol|ul|entryFree)\b[^>]*>", "\n\n", s)
    s = re.sub(r"<li\b[^>]*>", "\n\n", s)
    s = re.sub(r"<term\b[^>]*>(.*?)</term>", lambda m: f"\u0001B{m.group(1)}\u0003", s, flags=re.S)
    s = re.sub(r"<l\b[^>]*>(.*?)</l>", r"\1\n", s, flags=re.S)
    # headings
    def title(m):
        t = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        if not t or re.fullmatch(r"(?i)(chapter|psalm)\s+[0-9ivxlc]+\.?", t):
            return "\n\n"
        return f"\n\n\u0001H{m.group(1)}\u0003\n\n"
    s = re.sub(r"<title\b[^>]*>(.*?)</title>", title, s, flags=re.S)
    s = re.sub(r"<h[1-6]\b[^>]*>(.*?)</h[1-6]>", title, s, flags=re.S)
    # emphasis
    s = re.sub(r'<hi type="bold">(.*?)</hi>|<(?:b|strong)\b[^>]*>(.*?)</(?:b|strong)>|<catchWord>(.*?)</catchWord>',
               lambda m: f"\u0001B{m.group(1) or m.group(2) or m.group(3) or ''}\u0003", s, flags=re.S)
    s = re.sub(r'<hi type="(?:italic|emphasis)">(.*?)</hi>|<(?:i|em)\b[^>]*>(.*?)</(?:i|em)>',
               lambda m: f"\u0001I{m.group(1) or m.group(2) or ''}\u0003", s, flags=re.S)
    s = re.sub(r'<hi type="super">(.*?)</hi>|<sup\b[^>]*>(.*?)</sup>',
               lambda m: f"\u0001S{m.group(1) or m.group(2) or ''}\u0003", s, flags=re.S)
    s = re.sub(r'<foreign[^>]*xml:lang="(grc|he|heb|hbo|el)"[^>]*>(.*?)</foreign>',
               lambda m: f"\u0001L{'he' if m.group(1) in ('he', 'heb', 'hbo') else 'grc'}\u0002{m.group(2)}\u0003", s, flags=re.S)

    # Bible references ("Ps 84:11; Jas 1:17" and "Jn 6:33, 17:21" become one link each)
    def ref(m):
        attr, text = m.group(1) or "", m.group(2)
        plain = html.unescape(re.sub(r"<[^>]+>", "", text))
        target = re.search(r'(?:osisRef|passage)="([^"]*)"', attr)
        target = html.unescape(target.group(1)) if target else plain
        if re.search(r"[;,]\s*\S", plain) and not target.startswith(("Bible:", "Scofield:")):
            return multi(plain, ctx)
        shown = refs.parse(plain) if re.match(r"^\s*[1-3]?\s*[A-Za-z]", plain) else None
        r = (shown["slug"], shown["chapter"], shown["verse"]) if shown else osis_target(target, ctx)
        return marker(r, plain)
    s = re.sub(r"<(?:reference|scripRef|ref)\b([^>]*)>(.*?)</(?:reference|scripRef|ref)>", ref, s, flags=re.S)
    s = re.sub(r"<scripRef\b[^>]*/>", "", s)
    s = re.sub(r"<[^>]+>", "", s)                      # everything else goes
    s = html.unescape(s).replace("\ufffd", "")
    s = html.escape(s, quote=False)

    def restore(t):
        for _ in range(3):   # nested emphasis
            t = re.sub(r"\u0001B([^\u0001\u0003]*)\u0003", r"<strong>\1</strong>", t)
            t = re.sub(r"\u0001I([^\u0001\u0003]*)\u0003", r"<em>\1</em>", t)
            t = re.sub(r"\u0001S([^\u0001\u0003]*)\u0003", r"<sup>\1</sup>", t)
            t = re.sub(r"\u0001L(he|grc)\u0002([^\u0001\u0003]*)\u0003",
                       lambda m: '<span lang="%s"%s>%s</span>' % (m.group(1), ' dir="rtl"' if m.group(1) == "he" else "", m.group(2)), t)
            t = re.sub(r"\u0001R([^|\u0001]+)\|(\d+)\|(\d*)\u0002([^\u0001\u0003]*)\u0003",
                       lambda m: f'<a href="/bible/v/{m.group(1)}/{m.group(2)}/{m.group(3)}">{m.group(4)}</a>' if m.group(3)
                       else f'<a href="/bible/read/{m.group(1)}/{m.group(2)}">{m.group(4)}</a>', t)
        return re.sub(r"[\u0001\u0002\u0003]", "", t)

    out = []
    for para in re.split(r"\n\s*\n", s):
        para = re.sub(r"[ \t]+", " ", para).strip()
        if not para or not re.sub(r"[\u0001\u0002\u0003\s]|[BIS](?=\u0003)", "", para):
            continue
        h = re.fullmatch(r"\u0001H(.*?)\u0003", para, flags=re.S)
        if h:
            out.append(f"<h4>{restore(h.group(1).strip())}</h4>")
        else:
            out.append(f"<p>{restore(para)}</p>".replace("\n", "<br>"))
    body = "\n".join(out)
    body = re.sub(r"(<br>\s*)+</p>", "</p>", body)
    body = re.sub(r"<p>(\s*<br>)+", "<p>", body)
    body = re.sub(r"\s*<br>\s*(?=<strong>)", "</p>\n<p>", body)
    body = re.sub(r"\s*&lt;&lt;&lt;", "", body)                       # end-of-volume marks
    body = re.sub(r"&lt;/?[a-zA-Z][^&<]{0,40}?(?:&gt;|(?=</p>))", "", body)   # stray escaped tags
    body = re.sub(r"<h4>(?:Unabridged|Abridged)</h4>\n?", "", body)
    body = re.sub(r"<p>\s*</p>\n?", "", body)
    body = re.sub(r"\(\s+", "(", body)
    body = re.sub(r"\s+\)", ")", body)
    return body


def label(v1, v2):
    if not v1:
        return ""
    return f"Verse {v1}" if v2 == v1 else f"Verses {v1}–{v2}"


def build(code, path, out_dir):
    rows = {}
    for key, raw in imp_entries(path):
        k = parse_key(key)
        if not k or not raw.strip():
            continue
        slug, ch, v = k
        if ch > BOOKS_BY_SLUG[slug]["chapters"]:
            continue
        body = to_html(raw, (slug, ch))
        if not re.sub(r"<[^>]+>|\s", "", body):
            continue
        rows.setdefault((slug, ch), []).append((v, body))
    dest = os.path.join(out_dir, f"{code}.sqlite")
    if os.path.exists(dest):
        os.remove(dest)
    db = sqlite3.connect(dest)
    db.execute("CREATE TABLE ch (book TEXT, chapter INT, data BLOB, PRIMARY KEY (book, chapter))")
    n = 0
    for (slug, ch), items in sorted(rows.items(), key=lambda kv: (BOOK_ORDER[kv[0][0]], kv[0][1])):
        items.sort(key=lambda x: x[0])
        nverses = (study_data.chapter_verse_count(slug, ch) or 200) if ch else 0
        out = []
        for i, (v, body) in enumerate(items):
            if ch == 0 or v == 0:
                v2 = 0
            else:
                nxt = next((w for w, _ in items[i + 1:] if w > v), None)
                v2 = max(v, (nxt - 1) if nxt else nverses)
            out.append([v, v2, label(v, v2), body])
            n += 1
        db.execute("INSERT INTO ch VALUES (?,?,?)",
                   (slug, ch, zlib.compress(json.dumps(out, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9)))
    db.commit()
    db.execute("VACUUM")
    db.close()
    return n, os.path.getsize(dest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--imp", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "bibles", "commentaries"))
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for code, mod in MODULES.items():
        if a.only and code not in a.only:
            continue
        n, size = build(code, os.path.join(a.imp, mod + ".imp"), a.out)
        print(f"{code:9} {n:6} entries {size / 1e6:6.1f} MB")


if __name__ == "__main__":
    main()
