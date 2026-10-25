"""
Builds a formatted local Bible database from USFX (open-bibles: WEB, WEBBE)
or USFM (Berean Standard Bible), keeping what makes a page readable:
paragraphs, poetry lines, stanza breaks, the words of Jesus and footnotes.

    python tools/build_rich_bible.py usfx eng-web.usfx.xml   static/bibles/web.sqlite
    python tools/build_rich_bible.py usfm <dir of BSB .usfm>  static/bibles/bsb.sqlite --headings static/bibles/headings.sqlite

Each verse row keeps plain `text` (search, sharing, memorising) and `fmt`, a
compact JSON list of segments the reader renders:
    ["t", text]   ordinary text          ["w", text]  words of Jesus
    ["p"]         paragraph break        ["q", n]     poetry line, indent n
    ["b"]         stanza break           ["n", note]  footnote at this point
With --headings (USFM only) the section headings, Psalm titles and parallel-
passage references are written to a separate table shared by every
translation, so WEB and KJV show the same headings as the BSB.
"""
import html, json, os, re, sqlite3, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bible_books

USFM_CODES = bible_books._USFM_OT + bible_books._USFM_NT
SLUG = {code: b["slug"] for code, b in zip(USFM_CODES, bible_books.ALL_BOOKS)}


class Collector:
    def __init__(self):
        self.rows = {}          # (slug, ch, v) -> segments
        self.pending = []       # breaks seen before the next verse starts
        self.cur = None
        self.headings = []      # (slug, ch, v, kind, text)
        self.pending_heads = [] # (kind, text) waiting for the next verse
        self.slug = None; self.ch = 0

    def start_verse(self, v):
        self.cur = (self.slug, self.ch, v)
        segs = self.rows.setdefault(self.cur, [])
        segs.extend(self.pending); self.pending = []
        for kind, text in self.pending_heads:
            self.headings.append((self.slug, self.ch, v, kind, text))
        self.pending_heads = []

    def brk(self, seg):
        if self.cur:
            segs = self.rows[self.cur]
            # a break at the very end of a verse belongs to the next one
            self.pending.append(seg)
        else:
            self.pending.append(seg)

    def flush_pending_into_current(self):
        if self.cur and self.pending:
            self.rows[self.cur].extend(self.pending); self.pending = []

    def text(self, s, jesus=False):
        if not self.cur or not s:
            return
        s = re.sub(r"\s+", " ", s)
        if not s.strip() and not self.rows[self.cur]:
            return
        # breaks that arrived mid-verse go in before this text
        self.flush_pending_into_current()
        kind = "w" if jesus else "t"
        segs = self.rows[self.cur]
        if segs and segs[-1][0] == kind:
            segs[-1][1] += s
        else:
            segs.append([kind, s])

    def note(self, s):
        s = re.sub(r"\|[1-3]?[A-Z]{2,3} [0-9:.,–\-]+", "", s)   # BSB link codes
        s = re.sub(r"\s+", " ", s).strip()
        s = re.sub(r"\s+([;,.])", r"\1", s)
        if self.cur and s:
            self.rows[self.cur].append(["n", s])


def tidy(segs):
    out = []
    for s in segs:
        if s[0] in ("t", "w"):
            if out and out[-1][0] == s[0]:
                out[-1][1] += s[1]
            else:
                out.append([s[0], s[1]])
        elif s[0] == "q" and out and out[-1][0] == "q":
            out[-1] = s
        elif s[0] == "p" and out and out[-1][0] in ("p", "q", "b"):
            continue
        else:
            out.append(list(s))
    # trim whitespace at the edges of text runs and drop leading breaks inside verse 1 etc.
    for s in out:
        if s[0] in ("t", "w"):
            s[1] = re.sub(r"\s+", " ", s[1])
    for i, s in enumerate(out):
        if s[0] in ("t", "w"):
            if i == 0 or out[i - 1][0] in ("p", "q", "b"):
                s[1] = s[1].lstrip()
            if i + 1 < len(out) and out[i + 1][0] in ("p", "q", "b"):
                s[1] = s[1].rstrip()
    while out and out[-1][0] in ("p", "q", "b"):
        out.pop()
    if out and out[0][0] in ("t", "w"):
        out[0][1] = out[0][1].lstrip()
    for i in range(len(out) - 1, -1, -1):
        if out[i][0] in ("t", "w"):
            out[i][1] = out[i][1].rstrip(); break
    return [s for s in out if not (s[0] in ("t", "w") and not s[1])]


def plain(segs):
    t = "".join(s[1] if s[0] in ("t", "w") else " " if s[0] in ("p", "q", "b") else "" for s in segs)
    return re.sub(r"\s+", " ", t).strip()


# ------------------------------------------------------------------ USFX
def parse_usfx(path):
    c = Collector()
    xml = open(path, encoding="utf-8").read()
    xml = re.sub(r"<x\b.*?</x>", "", xml, flags=re.S)
    xml = re.sub(r"<(?:id|h|toc|rem|ide|s|d)\b[^>]*>.*?</(?:id|h|toc|rem|ide|s|d)>", "", xml, flags=re.S)
    tok = re.compile(r"<f\b[^>]*>(.*?)</f>|<book id=\"([^\"]+)\"|<c id=\"(\d+)\"[^>]*/>|<v id=\"(\d+)[^\"]*\"[^>]*/>|<ve\s*/>|"
                     r"<(p|q)\b([^>]*)>|<b\s*/>|<(/?)wj>|<[^>]+>|([^<]+)", re.S)
    jesus = False
    for m in tok.finditer(xml):
        if m.group(1) is not None:
            c.note(html.unescape(re.sub(r"<[^>]+>", "", m.group(1))))
        elif m.group(2):
            c.slug = SLUG.get(m.group(2)); c.ch = 0; c.cur = None; c.pending = []
        elif m.group(3):
            c.ch = int(m.group(3)); c.cur = None
        elif m.group(4):
            if c.slug: c.start_verse(int(m.group(4)))
        elif m.group(0).startswith("<ve"):
            pass
        elif m.group(5):
            if m.group(5) == "p":
                c.brk(["p"])
            else:
                lv = re.search(r'level="(\d)"', m.group(6) or "")
                c.brk(["q", int(lv.group(1)) if lv else 1])
        elif m.group(0).startswith("<b"):
            c.brk(["b"])
        elif m.group(7) is not None and m.group(0) in ("<wj>", "</wj>"):
            jesus = m.group(7) == ""
        elif m.group(8) is not None and c.slug:
            c.text(html.unescape(m.group(8)), jesus)
    return c


# ------------------------------------------------------------------ USFM
def parse_usfm(folder):
    c = Collector()
    order = {code: i for i, code in enumerate(USFM_CODES)}
    files = sorted((f for f in os.listdir(folder) if f.endswith(".usfm")),
                   key=lambda f: order.get(f[:3].upper(), 999))
    marker = re.compile(r"\\(\+?[a-z]+\d*\*?)")
    for fn in files:
        code = fn[:3].upper()
        if code not in SLUG:
            continue
        c.slug, c.ch, c.cur, c.pending = SLUG[code], 0, None, []
        src = open(os.path.join(folder, fn), encoding="utf-8").read()
        for line in src.splitlines():
            line = line.rstrip()
            m = re.match(r"\\(id|ide|h|toc\d|mt\d?|ms\d?|mr|rem|cl|cp)\b", line)
            if m:
                continue
            m = re.match(r"\\c (\d+)", line)
            if m:
                c.ch = int(m.group(1)); c.cur = None; continue
            m = re.match(r"\\(s\d?|d|r|sp|qa)\s+(.*)", line)
            if m:
                kind = {"r": "refs", "d": "title"}.get(m.group(1), "heading")
                raw = m.group(2)
                vnum = re.search(r"\\v\s+(\d+)", raw)
                text = re.sub(r"\\v\s+\d+\s*", "", raw)
                text = re.sub(r"\\[a-z]+\d*\*?", "", text).strip()
                if text:
                    c.pending_heads.append((kind, text))
                if vnum:
                    # BSB puts a Psalm's title on the same line as \v 1;
                    # the title shows above the verse, not inside it.
                    c.start_verse(int(vnum.group(1)))
                continue
            # paragraph-level markers at the line start
            m = re.match(r"\\(p|m|pi\d?|pmo|pc|pr|nb|li\d?|q\d?|qr|qc|qm\d?|b)\b\s?(.*)", line)
            body = line
            if m:
                mk = m.group(1); body = m.group(2)
                if mk == "b":
                    c.brk(["b"])
                elif mk.startswith("q"):
                    lv = re.search(r"\d", mk)
                    c.brk(["q", int(lv.group(0)) if lv else 1])
                elif mk in ("m", "nb"):
                    pass
                else:
                    c.brk(["p"])
            # inline: verses, words of Jesus, footnotes, added words
            pos, jesus, in_note, note_buf = 0, False, False, []
            parts = marker.split(body)
            text_buf = parts[0]
            def emit(s):
                if in_note: note_buf.append(s)
                else: c.text(s, jesus)
            emit(text_buf)
            i = 1
            while i < len(parts):
                mk, rest = parts[i], parts[i + 1] if i + 1 < len(parts) else ""
                i += 2
                plain_mk = mk.lstrip("+")
                if plain_mk == "v":
                    vm = re.match(r"\s*(\d+)[^\s]*\s?", rest)
                    c.start_verse(int(vm.group(1))); rest = rest[vm.end():]
                elif plain_mk == "wj":
                    jesus = True
                elif plain_mk == "wj*":
                    jesus = False
                elif plain_mk == "f":
                    in_note, note_buf = True, []
                    rest = re.sub(r"^\s*\+\s*", "", rest)
                elif plain_mk == "f*":
                    in_note = False
                    c.note(re.sub(r"\s+", " ", "".join(note_buf)))
                elif plain_mk == "fr":
                    rest = re.sub(r"^\s*[\d:.,–-]+\s*", "", rest)
                elif plain_mk == "x":
                    # cross-reference note: skip to its end marker
                    j = i
                    while j < len(parts) and parts[j - 1 if j else 0] != "x*" and parts[j] != "x*":
                        j += 2
                    i = j + 2 if j < len(parts) else j
                    rest = parts[j + 1] if j + 1 < len(parts) else ""
                elif plain_mk == "qs":
                    pass
                emit(rest)
    return c


def build(c, out, headings_out=None):
    rows = []
    for (slug, ch, v), segs in c.rows.items():
        if not slug:
            continue
        segs = tidy(segs)
        text = plain(segs)
        if text:
            rows.append((slug, ch, v, text, json.dumps(segs, ensure_ascii=False, separators=(",", ":"))))
    if os.path.exists(out): os.remove(out)
    db = sqlite3.connect(out)
    # Plain text per verse (search, sharing, memorising) …
    db.execute("CREATE TABLE verses (book TEXT, chapter INT, verse INT, text TEXT, PRIMARY KEY (book, chapter, verse)) WITHOUT ROWID")
    db.executemany("INSERT OR REPLACE INTO verses VALUES (?,?,?,?)", [r[:4] for r in rows])
    # … and the formatting, compressed a chapter at a time.
    import zlib
    chap = {}
    for slug, ch, v, _, fmt in rows:
        chap.setdefault((slug, ch), {})[str(v)] = json.loads(fmt)
    db.execute("CREATE TABLE chapter_fmt (book TEXT, chapter INT, data BLOB, PRIMARY KEY (book, chapter)) WITHOUT ROWID")
    db.executemany("INSERT INTO chapter_fmt VALUES (?,?,?)",
                   [(s, ch, zlib.compress(json.dumps(m, ensure_ascii=False, separators=(",", ":")).encode(), 9)) for (s, ch), m in chap.items()])
    db.commit(); db.execute("VACUUM"); db.close()
    print(out, "verses", len(rows), "MB", round(os.path.getsize(out) / 1e6, 2))
    if headings_out:
        if os.path.exists(headings_out): os.remove(headings_out)
        db = sqlite3.connect(headings_out)
        db.execute("CREATE TABLE headings (book TEXT, chapter INT, verse INT, kind TEXT, text TEXT, seq INT)")
        def tidy_refs(k, t):
            # "( Genesis 1:1–2|GEN 1:1-2;  Hebrews 11:1–3|HEB 11:1-3)" → "Genesis 1:1–2; Hebrews 11:1–3"
            if k != "refs":
                return t
            parts = [p.split("|")[0].strip() for p in t.strip("() ").split(";")]
            return "; ".join(p for p in parts if p)
        db.executemany("INSERT INTO headings VALUES (?,?,?,?,?,?)",
                       [(s, ch, v, k, tidy_refs(k, t), i) for i, (s, ch, v, k, t) in enumerate(c.headings) if s])
        db.execute("CREATE INDEX idx_h ON headings(book, chapter)")
        db.commit(); db.execute("VACUUM"); db.close()
        print(headings_out, "headings", len(c.headings))


if __name__ == "__main__":
    kind, src, out = sys.argv[1:4]
    hd = sys.argv[sys.argv.index("--headings") + 1] if "--headings" in sys.argv else None
    build(parse_usfx(src) if kind == "usfx" else parse_usfm(src), out, hd)
