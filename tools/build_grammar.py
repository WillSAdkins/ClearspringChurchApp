"""Build static/bibles/grammar.sqlite: the grammar of every Hebrew and Greek word.

For each word already in original_words.sqlite (same order, same verses) this
adds:
  - its grammar code, expanded from STEPBible's morphology tables
    (tense, voice, mood, case, stem, form, person, number, gender, state)
  - for Hebrew words made of several parts (and, the, in, his...), each part
  - its role in the sentence (subject, verb, object...) and which clause it
    sits in, from the MACULA syntax trees, so a verse can be laid out clause
    by clause
  - who a pronoun refers to, and who does the action of a verb
  - Greek: its meaning group (semantic domain, Louw & Nida numbering)
  - Hebrew: the Greek word the Septuagint uses for it
And, for word-study pages, totals by word: forms (tense or stem), meaning
groups, words that share a meaning, and Septuagint equivalents.

Sources (all CC BY 4.0, credited in the app):
  STEPBible-Data (Tyndale House, Cambridge): TAGNT, TAHOT, TEGMC, TEHMC
  MACULA Greek (SBLGNT trees) and MACULA Hebrew (WLC trees), Biblica / Clear
  Domain labels: UBS MARBLE (Semantic Dictionary of Biblical Greek)

Usage:
  python tools/build_grammar.py STEP_DIR MACULA_GREEK_DIR MACULA_HEBREW_DIR
"""
import collections
import glob
import json
import os
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import bible_books  # noqa: E402

OUT = os.path.join(ROOT, "static", "bibles", "grammar.sqlite")
STEP, MG, MH = sys.argv[1], sys.argv[2], sys.argv[3]
TXT = os.path.join(STEP, "Translators Amalgamated OT+NT")
FILES = ["TAHOT Gen-Deu", "TAHOT Jos-Est", "TAHOT Job-Sng", "TAHOT Isa-Mal", "TAGNT Mat-Jhn", "TAGNT Act-Rev"]
CANT = re.compile("[\u0591-\u05af\u05bd\u05c0\u05c3\u05c6]")   # accents only; keep the vowels
LINE = re.compile(r"^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\))?(?:\([^)]*\))?#(\d+)=(\S*)\t")
BOOKS = bible_books.ALL_BOOKS


def base_strong(s):
    m = re.search(r"([GH])(\d+)", s or "")
    return f"{m.group(1)}{int(m.group(2)):04d}" if m else ""


# ------------------------------------------------------------- morphology
def read_morph(path, lang):
    """code -> {"f": function, "x": [[field, value], ...], "ex": example}"""
    out, cur, lines = {}, None, []
    def flush():
        if not cur:
            return
        code, fields = cur
        texts = [l.strip() for l in lines if l.strip()]
        if lang == "G":
            ex = texts[-1] if len(texts) >= 3 else ""          # summary, meaning, then the example in quotes
        else:
            ex = next((t[8:].strip() for t in texts if t.startswith("Example:")), "")
        ex = re.sub(r"\s+", " ", ex.replace("_", "")).strip(' "')
        out[code] = {"f": fields.get("Function", ""), "x": [[k, v] for k, v in fields.items() if k != "Function"], "ex": ex[:80]}
    for raw in open(path, encoding="utf-8-sig"):
        line = raw.rstrip("\n")
        m = re.match(r"^([A-Z][A-Za-z0-9\-/]*)\t(Function=.*)$", line)
        if m:
            flush()
            fields = {}
            for part in re.sub(r"\s*\(hence[^)]*\)", "", m.group(2)).split(";"):
                if "=" in part:
                    k, v = part.split("=", 1)
                    v = v.strip()
                    fields[k.strip()] = v
            cur, lines = (m.group(1), fields), []
        elif line.strip() == "$":
            flush(); cur, lines = None, []
        elif cur and line.startswith("\t"):
            lines.append(line)
    flush()
    return out


GMORPH = read_morph(glob.glob(os.path.join(STEP, "Morphology codes", "TEGMC*"))[0], "G")
HMORPH = read_morph(glob.glob(os.path.join(STEP, "Morphology codes", "TEHMC*"))[0], "H")
print("morph codes", len(GMORPH), len(HMORPH))


# ------------------------------------------------------------- STEP words (same filter as build_original_words)
verses = collections.OrderedDict()   # (slug, ch, v) -> list of word dicts
heb_ref = {}                          # (slug, ch, v) -> (hch, hv) when Hebrew versification differs
order = []
for name in FILES:
    path = glob.glob(os.path.join(TXT, name + "*.txt"))[0]
    heb = name.startswith("TAHOT")
    for line in open(path, encoding="utf-8"):
        m = LINE.match(line)
        if not m:
            continue
        book, ch, vs, typ = m.group(1), int(m.group(2)), int(m.group(3)), m.group(7)
        if book not in order:
            order.append(book)
        slug = BOOKS[order.index(book)]["slug"]
        cols = line.rstrip("\n").split("\t")
        key = (slug, ch, vs)
        if heb:
            if typ.startswith("K"):
                continue
            orig = CANT.sub("", cols[1]).replace("/", "").replace("\\", "")
            if not orig.strip():
                continue
            if m.group(4):
                heb_ref[key] = (int(m.group(4)), int(m.group(5)))
            parts = CANT.sub("", cols[1]).replace("\\", "/").split("/")
            glosses = [g.strip() for g in cols[3].split("/")]
            strongs = cols[4].split("/")
            codes = cols[5].split("/") if len(cols) > 5 else []
            lang = codes[0][:1] if codes and codes[0][:1] in "HA" else "H"
            full = [(c if i == 0 else lang + c) for i, c in enumerate(codes)]
            main = next((i for i, s in enumerate(strongs) if "{" in s), len(strongs) - 1)
            segs = []
            if len(parts) > 1 and len(parts) == len(full):
                for i, p in enumerate(parts):
                    segs.append([p.strip(), glosses[i] if i < len(glosses) else "", full[i], 1 if i == main else 0])
            code = full[main] if main < len(full) else (full[-1] if full else "")
            verses.setdefault(key, []).append({"code": code, "segs": segs, "strong": base_strong(strongs[main] if main < len(strongs) else ""),
                                               "heb": True, "text": orig.strip(), "pos": int(m.group(6))})
        else:
            gm = re.match(r"^(.*?)\s*\((.*)\)\s*$", cols[1])
            orig = gm.group(1) if gm else cols[1]
            if not orig.strip():
                continue
            sm = cols[3].split("=")
            code = sm[1].strip() if len(sm) > 1 else ""
            eds = cols[5] if len(cols) > 5 else ""
            verses.setdefault(key, []).append({"code": code, "strong": base_strong(sm[0]), "sbl": "SBL" in eds, "heb": False,
                                               "text": orig.strip(), "var": bool(eds) and "NA28" not in eds,
                                               "pos": int(m.group(6))})
assert len(order) == 66, order
print("verses", len(verses))


# ------------------------------------------------------------- MACULA trees
USFM = {b["usfm"]: b["slug"] for b in BOOKS}


def walk_tree(root, lang):
    """Yield word dicts in document order with role, clause line and depth."""
    out = []
    def visit(node, roles, clauses):
        tag = node.tag
        if tag == "w":
            role = node.get("role") or (roles[-1] if roles else "")
            # line: the nearest clause that has a verb of its own; depth: subordinate clauses above it
            line = next((c for c in reversed(clauses) if c[1]), clauses[-1] if clauses else (0, False, False, 0))
            depth = sum(1 for c in clauses if c[2])
            out.append((node, role, line[0], depth))
            return
        is_cl = tag == "wg" and node.get("class") == "cl"
        if is_cl:
            has_v = any(ch.get("role") in ("v", "vc") for ch in node)
            embedded = bool(node.get("role")) or bool(clauses and len(roles) > clauses[-1][3])
            clauses = clauses + [(id(node), has_v, embedded, len(roles) + (1 if node.get("role") else 0))]
        if tag == "wg" and node.get("role"):
            roles = roles + [node.get("role")]
        for ch in node:
            visit(ch, roles, clauses)
    for s in root.iter("sentence"):
        for ch in s:
            visit(ch, [], [])
    return out


import unicodedata
def plain(t):
    t = unicodedata.normalize("NFD", t or "")
    return "".join(c for c in t if unicodedata.category(c)[0] == "L").lower()


def strong_int(s):
    m = re.match(r"\d+", s or "")
    return int(m.group(0)) if m else -1


# Greek
gwords = collections.defaultdict(list)   # (slug, ch, v) -> [macula word]
gid = {}
for f in sorted(glob.glob(os.path.join(MG, "SBLGNT", "lowfat", "[0-9][0-9]-*.xml"))):
    root = ET.parse(f).getroot()
    for node, role, line, depth in walk_tree(root, "G"):
        ref = node.get("ref") or ""
        mm = re.match(r"^(\w+) (\d+):(\d+)!(\d+)", ref)
        if not mm or mm.group(1) not in USFM:
            continue
        w = {"id": node.get("{http://www.w3.org/XML/1998/namespace}id"), "n": int(mm.group(4)), "strong": strong_int(node.get("strong")),
             "role": role, "line": line, "depth": depth, "english": (node.get("english") or node.get("gloss") or "").strip(),
             "lemma": node.get("lemma") or "", "ref": node.get("referent") or "", "subj": node.get("subjref") or "",
             "text": node.text or "", "dom": (node.get("domain") or "").split(" ")[0], "ln": (node.get("ln") or "").split(" ")[0], "cls": node.get("class") or ""}
        gwords[(USFM[mm.group(1)], int(mm.group(2)), int(mm.group(3)))].append(w)
        gid[w["id"]] = w
for k in gwords:
    gwords[k].sort(key=lambda w: w["n"])
print("macula greek verses", len(gwords))

# Hebrew
hwords = collections.defaultdict(list)   # (slug, hch, hv) -> [word: list of morphemes]
hid = {}
for f in sorted(glob.glob(os.path.join(MH, "WLC", "lowfat", "*-lowfat.xml"))):
    root = ET.parse(f).getroot()
    groups = collections.OrderedDict()
    for node, role, line, depth in walk_tree(root, "H"):
        ref = node.get("ref") or ""
        mm = re.match(r"^(\w+) (\d+):(\d+)!(\d+)", ref)
        if not mm or mm.group(1) not in USFM:
            continue
        xid = (node.get("{http://www.w3.org/XML/1998/namespace}id") or "").lstrip("o")
        mo = {"id": xid, "strong": strong_int(node.get("strongnumberx")), "role": role, "line": line, "depth": depth,
              "english": (node.get("english") or node.get("gloss") or "").replace(".", " ").strip(), "cls": node.get("class") or "",
              "ref": (node.get("participantref") or "").strip(), "subj": (node.get("subjref") or "").strip(),
              "text": node.text or "", "greek": node.get("greek") or "", "gstrong": strong_int(node.get("greekstrong")), "lemma": node.get("lemma") or ""}
        hid[xid] = mo
        key = (USFM[mm.group(1)], int(mm.group(2)), int(mm.group(3)))
        groups.setdefault((key, int(mm.group(4))), []).append(mo)
    for (key, n), ms in groups.items():
        hwords[key].append(ms)
print("macula hebrew verses", len(hwords))


# ------------------------------------------------------------- alignment
def pick(window, want, used, start):
    for j in range(start, min(len(window), start + 8)):
        if j not in used and want(window[j]):
            return j
    return None


def name_of(ids, table):
    """The English for the first id that resolves (who a pronoun or verb points to)."""
    for x in re.split(r"[;\s]+", ids or ""):
        x = x.strip().lstrip("o")
        w = table.get(x) or table.get("n" + x) if x else None
        if w and w.get("english") and w.get("cls") in ("noun", "propernoun", "nmpr"):
            return w["english"].strip(" .")[:40]
    return ""


matched = total = 0
for key, words in verses.items():
    if words[0]["heb"]:
        hk = (key[0],) + heb_ref.get(key, key[1:])
        mws = hwords.get(hk, [])
        used, start = set(), 0
        positional = len(mws) == len(words)
        for i, w in enumerate(words):
            total += 1
            j = i if positional else pick(mws, lambda ms: any(m["strong"] == strong_int(w["strong"][1:]) for m in ms)
                                          or plain("".join(m["text"] for m in ms)) == plain(w["text"]), used, start)
            if j is None or j >= len(mws):
                continue
            used.add(j); start = j + 1; matched += 1
            ms = mws[j]
            main = next((m for m in ms if m["strong"] == strong_int(w["strong"][1:])), None) or \
                next((m for m in reversed(ms) if m["cls"] not in ("prep", "cj", "art", "conj")), ms[-1])
            w["role"], w["line"], w["depth"] = main["role"], main["line"], main["depth"]
            w["refto"] = name_of(main["ref"], hid) if main["cls"] in ("pron", "suffix") or main["ref"] else ""
            if not w["refto"]:
                sfx = [m for m in ms if m["ref"] and m is not main]
                if sfx:
                    w["refto"] = name_of(sfx[0]["ref"], hid)
            w["who"] = name_of(main["subj"], hid) if main["cls"] == "verb" else ""
            # The Septuagint word lined up with this one; skip "the", "and", "but" unless that is what the Hebrew is.
            if main["greek"] and main["gstrong"] > 0 and not (main["gstrong"] in (3588, 2532, 1161) and main["cls"] not in ("art", "cj")):
                w["lxx"] = [main["greek"], f"G{main['gstrong']:04d}"]
    else:
        mws = gwords.get(key, [])
        used, start = set(), 0
        for w in words:
            total += 1
            if not w.get("sbl"):
                continue
            j = pick(mws, lambda m: m["strong"] == strong_int(w["strong"][1:]) or plain(m["text"]) == plain(w["text"]), used, start)
            if j is None:
                continue
            used.add(j); start = j + 1; matched += 1
            m = mws[j]
            w["role"], w["line"], w["depth"] = m["role"], m["line"], m["depth"]
            w["refto"] = name_of(m["ref"], gid)
            w["who"] = name_of(m["subj"], gid) if m["cls"] == "verb" else ""
            w["dom"], w["ln"] = m["dom"], m["ln"]
print(f"aligned {matched} of {total} words ({matched / total:.1%})")


# ------------------------------------------------------------- lines: number clauses within each verse, carry stray words forward
FUNCTION = re.compile(r"^(CONJ|T-|PREP|PRT|COND|HC|HR|HTd|HTo|HTc|HTn|HTj|HTr|HD)")


def number_lines(words):
    """Group a verse's words into lines, one per clause run, for the sentence-flow view."""
    last = None
    for w in words:                     # words outside any tree join the line before them
        if "line" not in w:
            w["line"], w["depth"] = (last["line"], last["depth"]) if last else (0, 0)
        last = w
    runs = []
    for w in words:
        if runs and runs[-1][0]["line"] == w["line"]:
            runs[-1].append(w)
        else:
            runs.append([w])
    merged = []
    for i, run in enumerate(runs):      # "for", "that", "the", "in"... on their own join what follows
        small = len(run) <= 2 and all(FUNCTION.match(x["code"] or "") for x in run)
        if small and i + 1 < len(runs):
            runs[i + 1][0:0] = run
            continue
        if small and merged:
            merged[-1].extend(run)
            continue
        merged.append(run)
    def key(run):
        return next((x["line"] for x in run if not FUNCTION.match(x["code"] or "")), run[0]["line"])
    joined = []
    for run in merged:                  # pieces of the same clause side by side become one line
        if joined and key(joined[-1]) == key(run):
            joined[-1].extend(run)
        else:
            joined.append(run)
    merged = joined
    for n, run in enumerate(merged, 1):
        verbs = [x["depth"] for x in run if x.get("role") == "v"]
        depth = min(verbs) if verbs else min(x["depth"] for x in run)
        for x in run:
            x["L"], x["D"] = n, depth


ROLE = {"s": "s", "v": "v", "vc": "v", "aux": "v", "o": "o", "o2": "o", "io": "io", "p": "p", "adv": "a", "pp": "a"}
morph_used = {}
chapters = collections.defaultdict(dict)
for key, words in verses.items():
    number_lines(words)
    rows = []
    for w in words:
        table = HMORPH if w["heb"] else GMORPH
        if w["code"] not in table and " + " in w["code"]:
            w["code"] = w["code"].split(" + ")[0].strip()
        r = {"m": w["code"]}
        if w["code"] in table:
            morph_used[w["code"]] = table[w["code"]]
        for s in w.get("segs") or []:
            if s[2] in HMORPH:
                morph_used[s[2]] = HMORPH[s[2]]
        if w.get("segs"):
            r["s"] = [[s[0], s[1], s[2], s[3]] for s in w["segs"]]
        if w.get("role") in ROLE:
            r["r"] = ROLE[w["role"]]
        r["L"] = w["L"]
        if w["D"]:
            r["d"] = min(w["D"], 4)
        for k in ("refto", "who", "dom", "ln"):
            if w.get(k):
                r[{"refto": "to", "who": "by", "dom": "dm", "ln": "ln"}[k]] = w[k]
        if w.get("lxx"):
            r["x"] = w["lxx"]
        if w.get("var"):
            r["v"] = 1
        rows.append(r)
    chapters[(key[0], key[1])][key[2]] = rows


# ------------------------------------------------------------- word-study totals
forms = collections.Counter()       # (strong, label)
doms = collections.Counter()        # (strong, domain)
lns = collections.Counter()         # (ln, strong)
lxx = collections.Counter()         # (hstrong, gstrong, greek)
for key, words in verses.items():
    for w in words:
        st = w["strong"]
        if not st:
            continue
        mo = (HMORPH if w["heb"] else GMORPH).get(w["code"]) or {}
        fx = dict(mo.get("x") or [])
        if mo.get("f", "").startswith("Verb"):
            label = fx.get("Stem") if w["heb"] else fx.get("Tense")
            form = fx.get("Form") or fx.get("Mood")
            if label:
                forms[(st, "stem" if w["heb"] else "tense", label)] += 1
            if form:
                forms[(st, "form" if w["heb"] else "mood", form)] += 1
        if w.get("dom"):
            doms[(st, w["dom"])] += 1
        if w.get("ln"):
            lns[(w["ln"], st)] += 1
        if w.get("lxx"):
            lxx[(st, w["lxx"][1], w["lxx"][0])] += 1

labels = json.load(open(os.path.join(MG, "sources", "MARBLE", "SDBG", "marble-domain-label-mapping.json"), encoding="utf-8"))


# ------------------------------------------------------------- write
if os.path.exists(OUT):
    os.remove(OUT)
db = sqlite3.connect(OUT)
db.executescript("""
CREATE TABLE chapters (slug TEXT, chapter INT, data BLOB, PRIMARY KEY (slug, chapter));
CREATE TABLE morph (code TEXT PRIMARY KEY, data TEXT);
CREATE TABLE forms (strong TEXT, kind TEXT, label TEXT, n INT);
CREATE TABLE domains (strong TEXT, domain TEXT, n INT);
CREATE TABLE ln_words (ln TEXT, strong TEXT, n INT);
CREATE TABLE lxx (strong TEXT, gstrong TEXT, greek TEXT, n INT);
CREATE TABLE domain_labels (code TEXT PRIMARY KEY, label TEXT);
""")
for (slug, ch), vs in chapters.items():
    db.execute("INSERT INTO chapters VALUES (?,?,?)", (slug, ch, zlib.compress(json.dumps(vs, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9)))
db.executemany("INSERT INTO morph VALUES (?,?)", [(k, json.dumps(v, ensure_ascii=False)) for k, v in morph_used.items()])
db.executemany("INSERT INTO forms VALUES (?,?,?,?)", [(s, k, l, n) for (s, k, l), n in forms.items()])
db.executemany("INSERT INTO domains VALUES (?,?,?)", [(s, d, n) for (s, d), n in doms.items()])
db.executemany("INSERT INTO ln_words VALUES (?,?,?)", [(l, s, n) for (l, s), n in lns.items()])
lxx_rows = collections.defaultdict(collections.Counter)
for (h, g, gw), n in lxx.items():
    lxx_rows[(h, g)][gw] += n
db.executemany("INSERT INTO lxx VALUES (?,?,?,?)", [(h, g, c.most_common(1)[0][0], sum(c.values())) for (h, g), c in lxx_rows.items()])
used_dom = {d for (_, d) in doms} | {d[:3] for (_, d) in doms}
db.executemany("INSERT INTO domain_labels VALUES (?,?)", [(k, v) for k, v in labels.items() if k in used_dom])
db.executescript("""
CREATE INDEX forms_s ON forms (strong); CREATE INDEX domains_s ON domains (strong);
CREATE INDEX ln_l ON ln_words (ln); CREATE INDEX ln_s ON ln_words (strong); CREATE INDEX lxx_s ON lxx (strong);
""")
db.commit(); db.execute("VACUUM"); db.close()
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
