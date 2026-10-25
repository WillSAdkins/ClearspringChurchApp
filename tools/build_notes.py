"""Build static/bibles/notes.sqlite: modern study notes, book introductions,
theme articles, people profiles and a Bible dictionary.

Sources (BibleAquifer on GitHub, English folders; all CC BY-SA 4.0):
  AquiferOpenStudyNotes            verse-by-verse notes   } adapted by Mission Mutual from
  AquiferOpenStudyNotesBookIntros  book introductions     } Tyndale Open Study Notes
  AquiferOpenStudyNotesThemes      theme articles         } (c) 2023 Tyndale House Publishers
  AquiferOpenStudyNotesProfiles    people profiles        }
  AquiferOpenBibleDictionary       Bible dictionary: adapted from Tyndale Open Bible Dictionary
  BiblicaStudyNotes                section notes          } (c) 2023 Biblica, Inc.
  BiblicaStudyNotesBookIntros      book introductions     }
  BiblicaStudyNotesKeyTerms        key terms              }

The downloaded HTML is treated as untrusted: it is rebuilt from a short list
of allowed tags with no attributes carried over, Bible references become
links into the app, and cross-references between articles become app links.

Usage:
  git clone --depth 1 --filter=blob:none --sparse https://github.com/BibleAquifer/<repo>   (eng/json for each)
  python -I tools/build_notes.py AQUIFER_DIR
"""
import glob
import html
import json
import os
import re
import sqlite3
import sys
import zlib
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from bible_books import ALL_BOOKS  # noqa: E402

SRC = sys.argv[1]
OUT = os.path.join(ROOT, "static", "bibles", "notes.sqlite")
SLUG_BY_NUM = {i + 1: b["slug"] for i, b in enumerate(ALL_BOOKS)}
NAME_BY_SLUG = {b["slug"]: b["name"] for b in ALL_BOOKS}

RESOURCES = {
    # repo: (kind, source)
    "AquiferOpenStudyNotes": ("note", "tyndale"),
    "BiblicaStudyNotes": ("note", "biblica"),
    "AquiferOpenStudyNotesBookIntros": ("intro", "tyndale"),
    "BiblicaStudyNotesBookIntros": ("intro", "biblica"),
    "AquiferOpenStudyNotesThemes": ("theme", "tyndale"),
    "AquiferOpenStudyNotesProfiles": ("profile", "tyndale"),
    "AquiferOpenBibleDictionary": ("dictionary", "tyndale"),
    "BiblicaStudyNotesKeyTerms": ("term", "biblica"),
}
URL_BASE = {"theme": "/bible/themes/", "profile": "/bible/profiles/", "dictionary": "/bible/dictionary/", "term": "/bible/terms/"}


def ref_parts(code):
    """'43001003' -> ('john', 1, 3)"""
    code = (code or "").strip()
    if not re.match(r"^\d{8}$", code):
        return None
    b, c, v = int(code[:2]), int(code[2:5]), int(code[5:])
    slug = SLUG_BY_NUM.get(b)
    return (slug, c, v) if slug and c > 0 else None


def ref_url(start):
    p = ref_parts(start)
    if not p:
        return None
    slug, c, v = p
    return f"/bible/v/{slug}/{c}/{v}" if v else f"/bible/read/{slug}/{c}"


def slugify(t):
    t = re.sub(r"[’'`]", "", (t or "").lower())
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:80] or "item"


# ------------------------------------------------------------- read everything
items = {}       # (repo, reference_id) -> record
order = []
for repo, (kind, source) in RESOURCES.items():
    for f in sorted(glob.glob(os.path.join(SRC, repo, "eng", "json", "*.json"))):
        data = json.load(open(f, encoding="utf-8"))
        for r in data if isinstance(data, list) else [data]:
            rec = {"repo": repo, "kind": kind, "source": source, "title": (r.get("title") or "").strip(),
                   "html": r.get("content") or "", "rid": str(r.get("reference_id")), "cid": str(r.get("content_id")), "index": str(r.get("index_reference") or ""),
                   "passages": (r.get("associations") or {}).get("passage") or []}
            # Cross-references point at the content id in the dictionary and at the reference id everywhere else
            # (checked against the link text: 5,454 of 6,038 dictionary links match by content id, 0 by reference id).
            items[(repo, rec["cid"] if repo == "AquiferOpenBibleDictionary" else rec["rid"])] = rec
            order.append(rec)
print("records", len(order))

# slugs for articles; "See X" stubs redirect to X
used = {}
for rec in order:
    if rec["kind"] in URL_BASE:
        base = slugify(rec["title"])
        n = used.get((rec["kind"], base), 0) + 1
        used[(rec["kind"], base)] = n
        rec["slug"] = base if n == 1 else f"{base}-{n}"
STUB = re.compile(r"^\s*(?:<h1>[^<]*</h1>)?\s*<p>\s*<em>See(?: also)?</em>\s*(<data class=\"resource-ref\"[^>]*>.*?</data>)\s*\.?\s*</p>\s*$", re.S)


def target_url(code, rid):
    t = items.get((code, rid))
    if not t:
        return None
    if t["kind"] in URL_BASE:
        return URL_BASE[t["kind"]] + t["slug"]
    if t["kind"] == "intro":
        p = ref_parts(t["index"])
        return f"/bible/intro/{p[0]}" if p else None
    if t["kind"] == "note" and t["passages"]:
        p = ref_parts(t["passages"][0]["start_ref"])
        return f"/bible/notes/{p[0]}/{p[1]}#v{p[2]}" if p else None
    return None


# ------------------------------------------------------------- sanitiser
ALLOWED = {"p", "em", "strong", "ul", "ol", "li", "blockquote", "br", "table", "thead", "tbody", "tr", "td", "th", "sup", "sub"}
MAP = {"b": "strong", "i": "em", "u": "em", "h1": "h3", "h2": "h3", "h3": "h4", "h4": "h4"}
VOID = {"br"}


class Clean(HTMLParser):
    def __init__(self, title):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.title = [], [], (title or "").strip().lower()
        self.link_depth = 0
        self.skip_h1 = None   # buffer for a heading that just repeats the title
        self.refs = []        # Bible references mentioned (for "related")

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "data":
            cls = a.get("class", "")
            url = None
            if cls == "bible-ref":
                url = ref_url(a.get("data-start-ref"))
                if url:
                    self.refs.append(a.get("data-start-ref"))
            elif cls == "resource-ref":
                url = target_url(a.get("data-resource-code", ""), a.get("data-content-id", ""))
            if url and not self.link_depth:
                self.out.append(f'<a href="{html.escape(url, quote=True)}">')
                self.stack.append("a"); self.link_depth += 1
            else:
                self.stack.append(None)
            return
        if tag == "a":                     # outside links and in-page anchors: keep the words only
            self.stack.append(None)
            return
        t = MAP.get(tag, tag)
        if tag == "h1" and self.skip_h1 is None and not self.out:
            self.skip_h1 = []
            self.stack.append("h1skip")
            return
        if t in ALLOWED or t in ("h3", "h4"):
            if t in VOID:
                self.out.append("<br>")
                return
            attr = ""
            if t in ("td", "th"):
                for k in ("colspan", "rowspan"):
                    if str(a.get(k, "")).isdigit() and 1 < int(a[k]) < 20:
                        attr += f' {k}="{int(a[k])}"'
            if t == "ol" and str(a.get("start", "")).isdigit():
                attr += f' start="{int(a["start"])}"'
            self.out.append(f"<{t}{attr}>")
            self.stack.append(t)
        else:
            self.stack.append(None)        # span, col, colgroup, anything unknown: drop the tag, keep the text

    def handle_endtag(self, tag):
        if tag in VOID or not self.stack:
            return
        t = self.stack.pop()
        if t == "h1skip":
            text = "".join(self.skip_h1).strip()
            if text.lower() != self.title and text.lower() != self.title.replace("’", "'"):
                self.out.append(f"<h3>{html.escape(text)}</h3>")
            self.skip_h1 = False
            return
        if t == "a":
            self.link_depth -= 1
        if t:
            self.out.append(f"</{t}>")

    def handle_data(self, data):
        if self.stack and self.stack[-1] == "h1skip":
            self.skip_h1.append(data)
            return
        self.out.append(html.escape(data, quote=False))

    def result(self):
        while self.stack:
            t = self.stack.pop()
            if t and t != "h1skip":
                self.out.append(f"</{t}>")
        s = "".join(self.out)
        s = re.sub(r"<p>\s*</p>", "", s)
        return s.strip()


def clean(rec):
    c = Clean(rec["title"])
    c.feed(rec["html"])
    c.close()
    return tidy_html(c.result()), c.refs


INLINE = r"(?:a|em|strong|i|b|span|sup|sub|small|cite)"


def tidy_text(t):
    """Spaces left where markup was: "( Genesis 8:20 )" -> "(Genesis 8:20)"."""
    t = re.sub(r"\(\s+", "(", t)
    t = re.sub(r"\s+\)", ")", t)
    t = re.sub(r"\s+([;,:])(?=\s)", r"\1", t)
    t = re.sub(r"\)\s+([.,;:])", r")\1", t)
    return t


def tidy_html(h):
    """The same tidy, applied only to text between tags. Also moves spaces
    out of links ("<a> 3:1</a>" -> " <a>3:1</a>") and drops links left empty."""
    h = re.sub(r"(<a\b[^>]*>)(\s+)", r"\2\1", h)
    h = re.sub(r"(\s+)(</a>)", r"\2\1", h)
    h = re.sub(r"<a\b[^>]*></a>", "", h)
    h = re.sub(r"\(\s+(<a\b)", r"(\1", h)
    h = re.sub(r"(</a>)\s+\)", r"\1)", h)
    h = re.sub(r"\)\s+([.,;:])(?=\s|<|$)", r")\1", h)
    return re.sub(r">([^<]+)<", lambda m: ">" + re.sub(r"\(\s+", "(", re.sub(r"\s+\)", ")", m.group(1))) + "<", h)


def text_of(h, n=220):
    t = re.sub(r"</?" + INLINE + r"\b[^>]*>", "", h)
    t = re.sub(r"<[^>]+>", " ", t)
    t = tidy_text(re.sub(r"\s+", " ", html.unescape(t)).strip())
    if len(t) > n:
        t = t[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return t


def span(p):
    a, b = ref_parts(p.get("start_ref")), ref_parts(p.get("end_ref"))
    if not a:
        return None
    if not b or b[0] != a[0]:
        b = a
    return a[0], a[1], a[2], b[1], b[2]


# ------------------------------------------------------------- write
if os.path.exists(OUT):
    os.remove(OUT)
db = sqlite3.connect(OUT)
db.executescript("""
CREATE TABLE notes (id INTEGER PRIMARY KEY, source TEXT, book TEXT, c1 INT, v1 INT, c2 INT, v2 INT, title TEXT, html BLOB);
CREATE TABLE intros (book TEXT, source TEXT, html BLOB, PRIMARY KEY (book, source));
CREATE TABLE articles (id INTEGER PRIMARY KEY, kind TEXT, slug TEXT, title TEXT, source TEXT, summary TEXT, html BLOB,
                       redirect TEXT, refs INT, UNIQUE (kind, slug));
CREATE TABLE article_refs (article INT, book TEXT, c1 INT, v1 INT, c2 INT, v2 INT);
""")
counts = {}
for rec in order:
    k = rec["kind"]
    if k == "note":
        body, _ = clean(rec)
        for p in rec["passages"][:1] or []:
            s = span(p)
            if s and body:
                db.execute("INSERT INTO notes (source, book, c1, v1, c2, v2, title, html) VALUES (?,?,?,?,?,?,?,?)",
                           (rec["source"], s[0], s[1], s[2], s[3], s[4], rec["title"], zlib.compress(body.encode(), 9)))
                counts[(k, rec["source"])] = counts.get((k, rec["source"]), 0) + 1
    elif k == "intro":
        p = ref_parts(rec["index"]) or ref_parts((rec["passages"] or [{}])[0].get("start_ref"))
        if not p:
            name = rec["title"].strip()
            p = next(((b["slug"], 0, 0) for b in ALL_BOOKS if b["name"].lower() == name.lower()), None)
        body, _ = clean(rec)
        if p and body:
            db.execute("INSERT OR REPLACE INTO intros VALUES (?,?,?)", (p[0], rec["source"], zlib.compress(body.encode(), 9)))
            counts[(k, rec["source"])] = counts.get((k, rec["source"]), 0) + 1
    else:
        m = STUB.match(rec["html"])
        redirect = None
        if m:
            cid = re.search(r'data-content-id="([^"]*)"', m.group(1))
            code = re.search(r'data-resource-code="([^"]*)"', m.group(1))
            if cid and code:
                redirect = target_url(code.group(1), cid.group(1))
        body, _ = clean(rec)
        if not body and not redirect:
            continue
        cur = db.execute("INSERT INTO articles (kind, slug, title, source, summary, html, redirect, refs) VALUES (?,?,?,?,?,?,?,?)",
                         (k, rec["slug"], rec["title"], rec["source"], text_of(body), zlib.compress(body.encode(), 9), redirect,
                          len(rec["passages"])))
        aid = cur.lastrowid
        for p in rec["passages"]:
            s = span(p)
            if s:
                db.execute("INSERT INTO article_refs VALUES (?,?,?,?,?,?)", (aid, *s))
        counts[(k, rec["source"])] = counts.get((k, rec["source"]), 0) + 1
db.executescript("""
CREATE INDEX notes_ch ON notes (book, c1, c2);
CREATE INDEX articles_title ON articles (kind, title COLLATE NOCASE);
CREATE INDEX article_refs_ch ON article_refs (book, c1, c2);
""")
db.commit(); db.execute("VACUUM"); db.close()
for k, v in sorted(counts.items()):
    print(k, v)
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
