# Rebuilds static/bibles/original_words.sqlite from STEPBible-Data (github.com/STEPBible/STEPBible-Data).
# Usage: clone that repo to /tmp/wsdata/step (or edit STEP below), then:
#   python tools/build_original_words.py static/bibles/original_words.sqlite

import sys, os, re, json, zlib, sqlite3, glob, unicodedata, html
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bible_books
STEP = "/tmp/wsdata/step"
OUT = sys.argv[1]
TXT = os.path.join(STEP, "Translators Amalgamated OT+NT")
files = ["TAHOT Gen-Deu", "TAHOT Jos-Est", "TAHOT Job-Sng", "TAHOT Isa-Mal", "TAGNT Mat-Jhn", "TAGNT Act-Rev"]
CANT = re.compile("[֑-ֽ֯׀׃׆]")   # cantillation & punctuation marks

def strong_key(s):
    m = re.search(r"\{([HG]\d+[A-Za-z]?)\}", s) or re.search(r"([HG]\d+[A-Za-z]?)", s)
    return m.group(1).upper() if m else None

order, verses = [], {}
for name in files:
    path = glob.glob(os.path.join(TXT, name + "*.txt"))[0]
    heb = name.startswith("TAHOT")
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:\([^)]*\))?#(\d+)=(\S*)\t", line)
        if not m: continue
        book, ch, vs, pos, typ = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
        cols = line.rstrip("\n").split("\t")
        if book not in order: order.append(book)
        if heb:
            if typ.startswith("K"):   # ketiv-only spelling; the qere/L row carries the reading
                continue
            orig = CANT.sub("", cols[1]).replace("/", "").replace("\\", "")
            tr = cols[2].replace("/", "").replace(".", "·").lower()
            gloss = re.sub(r"\s*/\s*", " ", cols[3]).strip()
            strong = strong_key(cols[4])
        else:
            gm = re.match(r"^(.*?)\s*\((.*)\)\s*$", cols[1])
            orig, tr = (gm.group(1), gm.group(2)) if gm else (cols[1], "")
            gloss = cols[2].strip()
            strong = strong_key(cols[3].split("=")[0])
        if not orig.strip(): continue
        verses.setdefault((book, ch, vs), []).append([pos, orig.strip(), tr.strip(), gloss, strong or ""])
print("books", len(order), order[:3], order[-3:])
assert len(order) == 66, order
slug_of = {b: bk["slug"] for b, bk in zip(order, bible_books.ALL_BOOKS)}

def clean_def(raw, heb):
    t = re.sub(r"<ref=[^>]*>(.*?)</ref>", r"\1", raw)
    t = re.sub(r"(?i)<br\s*/?>", "\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t).replace("__", "")
    lines = [l.strip() for l in t.split("\n") if l.strip()]
    if heb:
        lines = [l for l in lines if not l.lower().startswith("also means")][:8]
    out = "\n".join(lines)
    if len(out) > 520:
        cut = out[:520]; out = cut[: max(cut.rfind(";"), cut.rfind("."), cut.rfind("\n"), 300)].rstrip(" ;,") + "…"
    return out

POS = {"V":"Verb","N":"Noun","A":"Adjective","ADV":"Adverb","CONJ":"Conjunction","PREP":"Preposition","P":"Pronoun",
       "T":"Article","ART":"Article","PRT":"Particle","INJ":"Interjection","R":"Preposition","D":"Adverb","C":"Conjunction","HEB":"Hebrew word","ARAM":"Aramaic word"}
def pos_label(code):
    c = code.split(":")[-1]
    parts = c.split("-")
    base = parts[0].upper()
    lab = POS.get(base) or ("Noun" if base.startswith("N") else "")
    if lab == "Noun" and len(parts) > 1 and parts[1] in ("M", "F", "N"):
        lab += {"M": " (masculine)", "F": " (feminine)", "N": " (neuter)"}[parts[1]]
    if "PRI" in c or "-P" in c and lab.startswith("Noun"):
        lab = "Name"
    return lab

lex = {}
for fn, heb in [("TBESH", True), ("TBESG", False)]:
    path = glob.glob(os.path.join(STEP, "Lexicons", fn + "*.txt"))[0]
    for line in open(path, encoding="utf-8"):
        cols = line.rstrip("\n").split("\t")
        if len(cols) < 8: continue
        key = cols[1].split(" ")[0].strip().upper()
        if not re.match(r"^[HG]\d+[A-Z]?$", key): continue
        if key in lex: continue
        word = CANT.sub("", cols[3]) if heb else cols[3]
        lex[key] = (word, cols[4].replace(".", "·") if heb else cols[4], pos_label(cols[5]), cols[6].strip(), clean_def(cols[7], heb))
print("lexicon entries", len(lex))

used = {w[4] for ws in verses.values() for w in ws if w[4]}
missing = [u for u in used if u not in lex]
# Fall back to the base number (H7225 for H7225G) when an extended code has no entry.
def resolve(k):
    if k in lex: return k
    base = re.sub(r"[A-Z]$", "", k)
    for cand in (base, base + "A", base + "G"):
        if cand in lex: return cand
    return None
fix = {k: resolve(k) for k in used}
print("strongs used", len(used), "unresolved", sum(1 for v in fix.values() if v is None))

if os.path.exists(OUT): os.remove(OUT)
db = sqlite3.connect(OUT)
db.execute("CREATE TABLE chapter_words (slug TEXT, chapter INT, data BLOB, PRIMARY KEY (slug, chapter)) WITHOUT ROWID")
db.execute("CREATE TABLE lexicon (strong TEXT PRIMARY KEY, word TEXT, translit TEXT, pos TEXT, gloss TEXT, definition TEXT) WITHOUT ROWID")
needed = set(); chapters = {}
for (b, ch, vs), ws in verses.items():
    ws.sort(key=lambda w: w[0])
    rows = [[w[1], w[2], w[3], fix.get(w[4]) or ""] for w in ws]
    needed |= {r[3] for r in rows if r[3]}
    chapters.setdefault((slug_of[b], ch), {})[str(vs)] = rows
for (slug, ch), vmap in chapters.items():
    db.execute("INSERT INTO chapter_words VALUES (?,?,?)", (slug, ch, zlib.compress(json.dumps(vmap, ensure_ascii=False, separators=(",", ":")).encode(), 9)))
db.executemany("INSERT INTO lexicon VALUES (?,?,?,?,?,?)", [(k,)+lex[k] for k in needed])
db.commit(); db.execute("VACUUM"); db.close()
print("verses", len(verses), "lexicon rows", len(needed), "size MB", round(os.path.getsize(OUT)/1e6, 2))
