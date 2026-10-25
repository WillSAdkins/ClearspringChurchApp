# Builds a local Bible database (static/bibles/<code>.sqlite) from a USFX file in
# github.com/seven1m/open-bibles — the same source bible-api.com serves from.
# Usage: python tools/build_local_bible.py eng-web.usfx.xml static/bibles/web.sqlite
import html, os, re, sqlite3, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bible_books

src, out = sys.argv[1], sys.argv[2]
usfm = bible_books._USFM_OT + bible_books._USFM_NT
slug_of = {code: b["slug"] for code, b in zip(usfm, bible_books.ALL_BOOKS)}

xml = open(src, encoding="utf-8").read()
xml = re.sub(r"<f\b.*?</f>", "", xml, flags=re.S)        # footnotes
xml = re.sub(r"<x\b.*?</x>", "", xml, flags=re.S)        # cross-reference notes
xml = re.sub(r"<(?:id|h|toc|rem|ide|s|d)\b[^>]*>.*?</(?:id|h|toc|rem|ide|s|d)>", "", xml, flags=re.S)  # headings/meta

rows, book, ch, v, buf = [], None, 0, 0, []
def flush():
    global buf
    if book and v and book in slug_of:
        text = re.sub(r"<[^>]+>", "", "".join(buf))
        text = re.sub(r"\s+", " ", html.unescape(text)).strip()
        if text:
            rows.append((slug_of[book], ch, v, text))
    buf = []

for m in re.finditer(r"<book id=\"([^\"]+)\"|<c id=\"(\d+)\"\s*/>|<v id=\"(\d+)[^\"]*\"\s*/>|<ve\s*/>|([^<]+|<[^>]+>)", xml):
    if m.group(1):
        flush(); book, ch, v = m.group(1), 0, 0
    elif m.group(2):
        flush(); ch, v = int(m.group(2)), 0
    elif m.group(3):
        flush(); v = int(m.group(3))
    elif m.group(0).startswith("<ve"):
        flush(); v = 0
    elif v:
        buf.append(m.group(4))
flush()

if os.path.exists(out): os.remove(out)
db = sqlite3.connect(out)
db.execute("CREATE TABLE verses (book TEXT, chapter INT, verse INT, text TEXT)")
db.executemany("INSERT INTO verses VALUES (?,?,?,?)", rows)
db.execute("CREATE INDEX idx_ref ON verses(book, chapter, verse)")
db.commit(); db.execute("VACUUM"); db.close()
print("verses", len(rows), "books", len({r[0] for r in rows}), "MB", round(os.path.getsize(out) / 1e6, 2))
