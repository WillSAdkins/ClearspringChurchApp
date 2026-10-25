"""
Build static/bibles/classics.sqlite: classic Christian books to read in the
app, chapter by chapter.

Sources (all public domain in the UK and the US: every author and translator
died before 1956):
  Standard Ebooks (github.com/standardebooks), released under CC0
  Project Gutenberg texts via the GITenberg mirrors (github.com/GITenberg),
  with Project Gutenberg's header, footer and trademark removed as its
  licence asks when a text is redistributed without the name.

    python tools/build_classics.py --src DIR_WITH_CLONES

The HTML is rebuilt through an allow-list (paragraphs, headings, emphasis,
quotations, lists, line breaks); every other tag is unwrapped or dropped and
every attribute removed, so nothing from a source file reaches the page as
markup or script.
"""
import argparse
import html
import os
import re
import sqlite3
import zlib

from bs4 import BeautifulSoup, NavigableString, Tag

BOOKS = [
    # slug, folder, kind, title, author, year, translator, about
    ("pilgrims-progress", "john-bunyan_the-pilgrims-progress", "se", "The Pilgrim’s Progress", "John Bunyan", "1678", "",
     "Christian’s journey from the City of Destruction to the Celestial City, through the Slough of Despond, Vanity Fair and the Valley of the Shadow. For three centuries the best-loved picture of the Christian life in English. Part two follows his wife Christiana and their children."),
    ("imitation-of-christ", "thomas-a-kempis_the-imitation-of-christ_william-benham", "se", "The Imitation of Christ", "Thomas à Kempis", "c. 1420", "William Benham (1874)",
     "Short chapters on humility, prayer and following Jesus, written for monks and read ever since by Christians of every tradition. One of the most-translated books after the Bible. Good taken a chapter a day."),
    ("practice-of-the-presence-of-god", "practice", "pg-text", "The Practice of the Presence of God", "Brother Lawrence", "1692", "English translation (Fleming H. Revell, c. 1895)",
     "Conversations with, and letters by, a lay brother who worked in a monastery kitchen in Paris, on living every moment, washing pans included, in the company of God. Very short, and endlessly reread."),
    ("revelations-of-divine-love", "Revelations-of-Divine-Love_52958", "pg-html", "Revelations of Divine Love", "Julian of Norwich", "c. 1395", "Grace Warrack (1901)",
     "The first book in English known to be written by a woman: sixteen ‘showings’ given to an anchoress in Norwich during a serious illness, and twenty years’ reflection on them. ‘All shall be well.’"),
    ("city-of-god", "augustine-of-hippo_the-city-of-god_marcus-dods_george-wilson_j-j-smith", "se", "The City of God", "Augustine of Hippo", "426", "Marcus Dods, George Wilson and J. J. Smith (1871)",
     "Written after the sack of Rome, Augustine’s great answer to those who blamed Christianity, and a history of two cities, one built on love of self and one on love of God. Long, and best read a chapter at a time."),
    ("orthodoxy", "g-k-chesterton_orthodoxy", "se", "Orthodoxy", "G. K. Chesterton", "1908", "",
     "Chesterton’s witty account of how he came to believe the Christian creed, not because it was safe but because it alone made sense of the world. Paradoxes on every page."),
    ("the-everlasting-man", "g-k-chesterton_the-everlasting-man", "se", "The Everlasting Man", "G. K. Chesterton", "1925", "",
     "A history of humanity and of Christ, arguing that both are stranger and more unique than the modern world assumes. The book C. S. Lewis said baptised his imagination."),
    ("the-way-to-god", "d-l-moody_the-way-to-god-and-how-to-find-it", "se", "The Way to God", "D. L. Moody", "1884", "",
     "The great evangelist’s plain, warm explanation of the gospel: God’s love, the new birth, repentance, assurance. Written to be understood by anyone."),
    ("in-his-steps", "In-His-Steps_4540", "pg-html", "In His Steps", "Charles M. Sheldon", "1896", "",
     "A novel: a minister challenges his church to ask ‘What would Jesus do?’ before every decision for a year, and a town is turned upside down. Where the question first came from."),
    ("unspoken-sermons", "george-macdonald_unspoken-sermons", "se", "Unspoken Sermons", "George MacDonald", "1867–89", "",
     "Searching sermons on the character of God by the Scottish writer C. S. Lewis called his master. Some of MacDonald’s views were unusual for his day; read with discernment."),
    ("on-the-making-of-man", "gregory-of-nyssa_on-the-making-of-man_william-moore_henry-austin-wilson", "se", "On the Making of Man", "Gregory of Nyssa", "379", "William Moore and Henry Austin Wilson (1893)",
     "A fourth-century bishop on what it means that we are made in the image of God: body, mind and our calling. Early Christian thought at its most careful."),
    ("paradise-lost", "john-milton_paradise-lost", "se", "Paradise Lost", "John Milton", "1667", "",
     "The great English poem of the fall: Satan’s rebellion, Adam and Eve in the garden, and the promise of redemption, told to ‘justify the ways of God to men’."),
    ("art-of-illustration", "c-h-spurgeon_the-art-of-illustration", "se", "The Art of Illustration", "C. H. Spurgeon", "1894", "",
     "Spurgeon’s lectures to his students on using stories and pictures in preaching. Practical, funny, and still useful to anyone who teaches the Bible."),
    # Added November 2026
    ("confessions", "The-Confessions-of-St.-Augustine_3296", "pg-html", "Confessions", "Augustine of Hippo", "c. 400", "E. B. Pusey (1838)",
     "Augustine’s life told as a long prayer to God: a restless childhood, ambition, the famous stolen pears, years of searching, and the day in a Milan garden when he heard ‘take up and read’. ‘Our heart is restless until it rests in you.’"),
    ("grace-abounding", "Grace-Abounding-to-the-Chief-of-Sinners_654", "pg-html", "Grace Abounding to the Chief of Sinners", "John Bunyan", "1666", "",
     "Bunyan’s own story, written in Bedford gaol: years of doubt, fear and despair, and how the promises of Scripture brought him through to peace. The real-life road behind The Pilgrim’s Progress."),
    ("humility", "Humility-The-Beauty-of-Holiness_57121", "pg-roman", "Humility: The Beauty of Holiness", "Andrew Murray", "1895", "",
     "Twelve short chapters on the humility of Jesus and how it becomes ours: in prayer, in daily life, in the way we treat each other. A small book that has changed many lives."),
    ("lord-teach-us-to-pray", "Lord-Teach-Us-to-Pray_26709", "pg-html", "Lord, Teach Us to Pray", "Andrew Murray", "1896", "",
     "Four short lessons on prayer from the words of Jesus: the only Teacher, true worship, being alone with God, and the Lord’s Prayer. Taken from Murray’s much-loved With Christ in the School of Prayer."),
    ("the-masters-indwelling", "The-Master-s-Indwelling_12854", "pg-html", "The Master’s Indwelling", "Andrew Murray", "1895", "",
     "Addresses on the Christ-filled life: abiding, surrender, the Holy Spirit and the rest of faith. Given at a convention in America and taken down as he spoke."),
    ("power-through-prayer", "Power-Through-Prayer_65115", "pg-html", "Power Through Prayer", "E. M. Bounds", "1907", "",
     "A short, fiery book for preachers and everyone who serves: ‘Men are God’s method.’ Bounds argues that the church needs praying people more than better plans."),
    ("purpose-in-prayer", "Purpose-in-Prayer_66112", "pg-html", "Purpose in Prayer", "E. M. Bounds", "1920", "",
     "Why prayer matters and how to keep at it, drawn from the Bible and from the lives of praying men and women."),
    ("essentials-of-prayer", "Essentials-of-Prayer_73271", "pg-html", "The Essentials of Prayer", "E. M. Bounds", "1925", "",
     "Bounds on what real prayer needs: humility, devotion, faith that keeps going, and a life that matches what we pray."),
    ("edwards-sermons", "Selected-Sermons-of-Jonathan-Edwards_34632", "pg-html", "Selected Sermons", "Jonathan Edwards", "1731–1750", "",
     "Sermons by the great New England pastor and theologian, including ‘Sinners in the Hands of an Angry God’ and ‘A Divine and Supernatural Light’. Demanding reading, and deeply rewarding."),
    ("consolation-of-philosophy", "boethius_the-consolation-of-philosophy_h-r-james", "se", "The Consolation of Philosophy", "Boethius", "524", "H. R. James (1897)",
     "Written in prison while awaiting execution: Lady Philosophy visits a man who has lost everything and leads him to the goodness that fortune cannot take away. Read across the Middle Ages, and by Alfred, Chaucer and Elizabeth I."),
    ("divine-comedy", "dante-alighieri_the-divine-comedy_henry-wadsworth-longfellow", "se", "The Divine Comedy", "Dante Alighieri", "1320", "Henry Wadsworth Longfellow (1867)",
     "Dante’s journey through Hell, up the mountain of Purgatory and into Paradise, guided by Virgil and then Beatrice, ‘to the Love that moves the sun and the other stars’. The great Christian poem of the Middle Ages."),
    ("donne-poetry", "john-donne_poetry", "se", "Poetry", "John Donne", "1633", "",
     "Donne’s poems, from love poems to the Holy Sonnets (‘Death, be not proud’, ‘Batter my heart, three-person’d God’) and his hymns. Some of the love poems are frank; the holy poems are among the greatest in English."),
    ("heretics", "g-k-chesterton_heretics", "se", "Heretics", "G. K. Chesterton", "1905", "",
     "Chesterton takes on the leading thinkers of his day (Shaw, Wells, Kipling) and finds them wrong in interesting ways. The book that led to Orthodoxy."),
    ("man-who-was-thursday", "g-k-chesterton_the-man-who-was-thursday", "se", "The Man Who Was Thursday", "G. K. Chesterton", "1908", "",
     "A novel: a poet-detective joins a council of seven anarchists, each named after a day of the week, and the chase turns into something far stranger. A comic thriller that ends as a parable."),
    ("brothers-karamazov", "fyodor-dostoevsky_the-brothers-karamazov_constance-garnett", "se", "The Brothers Karamazov", "Fyodor Dostoevsky", "1880", "Constance Garnett (1912)",
     "Three brothers, a murdered father and a wise old monk: Dostoevsky’s last and greatest novel, wrestling with faith, doubt, suffering and forgiveness. Includes ‘The Grand Inquisitor’. Long, and worth it."),
    ("ben-hur", "lew-wallace_ben-hur", "se", "Ben-Hur: A Tale of the Christ", "Lew Wallace", "1880", "",
     "A Jewish prince is betrayed by his Roman friend, sent to the galleys, and comes back for revenge, while his story keeps crossing paths with Jesus of Nazareth. The chariot race is famous; the ending is better."),
    ("quo-vadis", "henryk-sienkiewicz_quo-vadis_jeremiah-curtin", "se", "Quo Vadis", "Henryk Sienkiewicz", "1896", "Jeremiah Curtin (1896)",
     "Rome under Nero: a young officer falls for a Christian girl, and is drawn into the world of the first believers, Peter and Paul, the great fire and the arena. Nobel Prize-winning historical novel. Some scenes of persecution are vivid."),
    ("phantastes", "george-macdonald_phantastes", "se", "Phantastes", "George MacDonald", "1858", "",
     "A young man wakes to find his bedroom turning into a forest, and wanders through Fairy Land. The book C. S. Lewis said ‘baptised’ his imagination."),
    ("lilith", "george-macdonald_lilith", "se", "Lilith", "George MacDonald", "1895", "",
     "MacDonald’s dark, dreamlike late fantasy about death, sleep and redemption. Strange and powerful; for older readers."),
    ("back-of-the-north-wind", "george-macdonald_at-the-back-of-the-north-wind", "se", "At the Back of the North Wind", "George MacDonald", "1871", "",
     "Diamond, a coachman’s little boy in London, is befriended by the North Wind. A gentle, sad and lovely story to read aloud with children."),
    ("princess-and-the-goblin", "george-macdonald_the-princess-and-the-goblin", "se", "The Princess and the Goblin", "George MacDonald", "1872", "",
     "Princess Irene, the miner’s boy Curdie, goblins under the mountain and a mysterious great-great-grandmother in the tower. A classic fairy tale about trusting what you can’t see; perfect for reading aloud."),
]

SKIP = {"titlepage", "imprint", "halftitlepage", "colophon", "uncopyright", "endnotes", "toc", "loi", "dedication"}
KEEP = {"p", "h2", "h3", "h4", "h5", "h6", "em", "i", "strong", "b", "blockquote", "br", "ol", "ul", "li", "hr", "cite"}
MAX_WORDS = 7000
PAGE_WORDS = 3500


def words(s):
    return len(re.findall(r"\w+", s))


def clean(node):
    """Allow-list a BeautifulSoup node into safe HTML."""
    out = []

    def walk(n):
        if isinstance(n, NavigableString):
            if n.__class__.__name__ in ("Comment", "ProcessingInstruction", "Doctype", "CData", "Declaration"):
                return
            out.append(html.escape(str(n), quote=False))
            return
        if not isinstance(n, Tag):
            return
        name = n.name.lower()
        et = n.get("epub:type", "") or ""
        if name in ("script", "style", "img", "figure", "svg", "math", "table", "head", "title"):
            return
        if name == "a" and ("noteref" in et or re.fullmatch(r"\[?\d+\]?", n.get_text(strip=True) or "")):
            return
        if name == "span" and "pagenum" in " ".join(n.get("class", [])):
            return
        if name in KEEP:
            tag = {"i": "em", "b": "strong", "h2": "h3", "h5": "h4", "h6": "h4"}.get(name, name)
            if tag == "blockquote" and ("verse" in et or "poem" in et or "song" in et):
                out.append('<blockquote class="poem">')
            elif tag == "p" and "poem" in " ".join(n.get("class", [])):
                out.append('<p class="poem">')
            elif tag == "br":
                out.append("<br>")
                return
            elif tag == "hr":
                out.append("<hr>")
                return
            else:
                out.append(f"<{tag}>")
            for c in n.children:
                walk(c)
            out.append(f"</{tag}>")
            return
        for c in n.children:      # unwrap everything else
            walk(c)

    walk(node)
    s = "".join(out)
    s = s.replace("⁠", "")                       # word joiners
    s = re.sub(r"[ \t\r\n]+", " ", s)
    s = re.sub(r"\s*(</?(?:p|h3|h4|blockquote|ol|ul|li)\b[^>]*>)\s*", r"\1", s)
    s = re.sub(r"<(p|h3|h4|em|strong|li)>\s*</\1>", "", s)
    s = re.sub(r"(</(?:p|h3|h4|blockquote|ol|ul)>)", r"\1\n", s)
    return s.strip()


def heading_of(sec):
    """'IV. The Ethics of Elfland', 'I. Of the imitation of Christ, and of contempt…'."""
    header = sec.find("header")
    if header is not None and header.find_parent(["section", "article"]) is not sec:
        header = None
    scope = header if header is not None else sec
    h = scope.find(["h2", "h3", "h4", "h5", "h6"])
    if not h or (header is None and h.find_parent(["section", "article"]) is not sec):
        return ""
    parts = []
    hg = h.find_parent("hgroup")
    if hg is not None:
        parts = [re.sub(r"\s+", " ", x.get_text(" ", strip=True)) for x in hg.find_all(["h2", "h3", "h4", "h5", "h6", "p"])]
    else:
        parts = [re.sub(r"\s+", " ", h.get_text(" ", strip=True))]
        bh = scope.find("p", attrs={"epub:type": re.compile("bridgehead|title")})
        if bh is not None and re.fullmatch(r"[IVXLC]+\.?|\d+\.?", parts[0]):
            t = re.sub(r"\s+", " ", bh.get_text(" ", strip=True))
            parts.append(t if len(t) <= 110 else t[:105].rsplit(" ", 1)[0] + "…")
    parts = [p for p in parts if p]
    if len(parts) >= 2 and re.fullmatch(r"[IVXLC]+\.?|\d+\.?", parts[0]):
        return f"{parts[0].rstrip('.')}. {' '.join(parts[1:])}"
    return ": ".join(parts)


def child_sections(sec):
    return [c for c in sec.find_all(["section", "article"], recursive=True) if c.find_parent(["section", "article"]) is sec]


def paginate(title, body):
    """Split one long chapter into pages at paragraph boundaries."""
    if words(re.sub(r"<[^>]+>", " ", body)) <= MAX_WORDS:
        return [(title, body)]
    blocks = re.findall(r"<(?:p|h3|h4|blockquote|ol|ul)\b.*?</(?:p|h3|h4|blockquote|ol|ul)>\n?", body, flags=re.S)
    pages, cur, n = [], [], 0
    for b in blocks:
        cur.append(b)
        n += words(re.sub(r"<[^>]+>", " ", b))
        if n >= PAGE_WORDS:
            pages.append("".join(cur))
            cur, n = [], 0
    if cur:
        if pages and n < PAGE_WORDS / 3:
            pages[-1] += "".join(cur)
        else:
            pages.append("".join(cur))
    return [(f"{title} ({i} of {len(pages)})", p) for i, p in enumerate(pages, 1)]


def units(sec, prefix=""):
    """A section → [(title, html)], splitting long ones at their own sub-sections."""
    title = heading_of(sec) or prefix or "Untitled"
    full = f"{prefix} · {title}" if prefix and title != prefix else title
    kids = child_sections(sec)
    text_words = words(sec.get_text(" "))
    if not kids or text_words <= MAX_WORDS:
        return paginate(full, clean(sec))
    lead = sec.__copy__()
    for k in child_sections(lead):
        k.decompose()
    lead_html = clean(lead)
    out = []
    lead_words = words(re.sub(r"<[^>]+>", " ", lead_html))
    for k in kids:
        out.extend(units(k, title))
    if lead_words > 600:
        out.insert(0, (full, lead_html))
    elif lead_words > 15 and out:          # a short opening joins the first chapter
        out[0] = (out[0][0], lead_html + "\n" + out[0][1])
    return out


def standard_ebook(folder):
    opf = open(os.path.join(folder, "src", "epub", "content.opf"), encoding="utf-8").read()
    spine = re.findall(r'<itemref idref="([^"]+)"', opf)
    chapters, parents = [], {}
    for item in spine:
        stem = item.rsplit(".", 1)[0]
        if stem in SKIP or stem.startswith(("titlepage", "imprint", "colophon", "uncopyright", "endnotes", "halftitle")):
            continue
        path = os.path.join(folder, "src", "epub", "text", item)
        if not os.path.exists(path):
            continue
        soup = BeautifulSoup(open(path, encoding="utf-8").read(), "lxml-xml")
        body = soup.find("body")
        tops = [c for c in body.find_all(["section", "article"]) if not c.find_parent(["section", "article"])]
        for t in tops:
            parent = parents.get(t.get("data-parent") or "")
            if t.get("id"):
                parents[t["id"]] = heading_of(t)
            got = units(t, parent or "")
            if parent:
                got = [(tt if tt.startswith(parent) else f"{parent} · {tt}", h) for tt, h in got]
            chapters.extend(got)
    return chapters


def strip_gutenberg(text):
    a = re.search(r"\*\*\* ?START OF (THIS|THE) PROJECT GUTENBERG[^\n]*\n", text)
    b = re.search(r"\*\*\* ?END OF (THIS|THE) PROJECT GUTENBERG|\n[^\n]*End of (the )?Project Gutenberg", text, re.I)
    return text[a.end() if a else 0: b.start() if b else len(text)]


def gutenberg_html(folder):
    found = sorted((os.path.join(dp, x) for dp, _, fs in os.walk(folder) for x in fs if x.endswith((".htm", ".html"))),
                   key=lambda p: ("/old/" in p, len(p)))
    f = found[0]
    raw = open(f, encoding="utf-8", errors="replace").read()
    raw = strip_gutenberg(raw)
    soup = BeautifulSoup(raw, "lxml")
    body = soup.body or soup
    chapters, title, buf = [], None, []
    for el in body.find_all(recursive=True):
        if el.name in ("h1", "h2", "h3") and el.find_parent(["h1", "h2", "h3"]) is None:
            t = re.sub(r"\s+", " ", el.get_text(" ", strip=True))
            if not t or t.upper() in ("CONTENTS", "THE END.", "[THE END.]"):
                continue
            if title and buf:
                chapters.append((title, "".join(buf)))
            title, buf = t, []
            nxt = el.find_next_sibling()
            if nxt is not None and nxt.name in ("h4",) and len(nxt.get_text(strip=True)) < 120:
                title = f"{title}: {nxt.get_text(' ', strip=True)}"
            continue
        if title and el.name in ("p", "blockquote") and el.find_parent(["p", "blockquote"]) is None:
            buf.append(clean(el))
    if title and buf:
        chapters.append((title, "".join(buf)))
    out = []
    for t, h in chapters:
        if words(re.sub(r"<[^>]+>", " ", h)) < 40:
            continue
        t = t.title() if t.isupper() else t
        out.extend(paginate(t, h))
    return out


def gutenberg_text(folder):
    f = next(os.path.join(folder, x) for x in os.listdir(folder) if x.endswith(".txt"))
    text = strip_gutenberg(open(f, encoding="utf-8", errors="replace").read())
    parts = re.split(r"\n((?:[A-Z]+ )?(?:CONVERSATION|LETTER)S?\.|PREFACE\.)\n", text)
    out = []
    for i in range(1, len(parts), 2):
        title = parts[i].strip(". ").title()
        body = parts[i + 1]
        paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
        paras = [p for p in paras if not re.fullmatch(r"[A-Z .,'-]{3,}", p)]
        if not paras or title in ("Conversations", "Letters"):
            continue
        h = "".join("<p>" + re.sub(r"_([^_]+)_", lambda m: "<em>" + m.group(1) + "</em>", html.escape(p, quote=False)) + "</p>\n" for p in paras)
        out.extend(paginate(title, h))
    return out


def gutenberg_roman(folder):
    """Plain text with chapters headed by a Roman numeral line and a title line."""
    f = next(os.path.join(folder, x) for x in sorted(os.listdir(folder)) if x.endswith(".txt"))
    text = strip_gutenberg(open(f, encoding="utf-8", errors="replace").read()).replace("\r", "")
    parts = re.split(r"\n\n([IVXL]+)\.\n\n([^\n]+)\n", text)
    out = []
    for i in range(1, len(parts), 3):
        title = f"{parts[i]}. {parts[i + 1].strip()}"
        body = re.split(r"\n\s*NOTES?\.?\s*\n", parts[i + 2], flags=re.I)[0]
        paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
        h = "".join("<p>" + re.sub(r"_([^_]+)_", lambda m: "<em>" + m.group(1) + "</em>", html.escape(p, quote=False)) + "</p>\n" for p in paras)
        out.extend(paginate(title, h))
    return out


ROMAN = re.compile(r"^([IVXL][ivxlIVXL]*)(?=[\s.:]|$)")
# What to call a chapter whose heading is only a number.
NUMBERED = {"the-masters-indwelling": "Address", "power-through-prayer": "Chapter", "purpose-in-prayer": "Chapter"}


def tidy_titles(slug, kind, title, chs):
    """Tidy headings taken from Gutenberg HTML: page-number anchors, note
    markers, lower-cased Roman numerals, and the notes at the back."""
    out, seen = [], set()
    for t, h in chs:
        t = re.sub(r"\s+", " ", t)
        t = re.sub(r"^p\.\s*\d+\s*", "", t)
        t = re.sub(r"\s*°", "", t).strip()
        m = re.match(r"^(.*?)(\s*\(\d+ of \d+\))?$", t)
        base, part = m.group(1), m.group(2) or ""
        if base.isupper():
            base = base.title()
        base = ROMAN.sub(lambda r: r.group(1).upper(), base)
        base = re.sub(r"\b(Book|Chapter|Part|Lesson|Letter)\s+([IVXL][ivxl]+)\b", lambda r: f"{r.group(1)} {r.group(2).upper()}", base)
        base = re.sub(r":\s*([^a-z]{6,})$", lambda r: ": " + r.group(1).title(), base)
        base = re.sub(r"\(\s*(\w+)\s*\)", r"(\1)", base)
        base = re.sub(r"^Grace Abounding To The Chief Of Sinners Or,.*", "Grace Abounding", base)
        if base.lower() == title.lower() and not part and words(re.sub(r"<[^>]+>", " ", h)) < 300:
            continue                            # a title page
        if re.fullmatch(r"[IVXL]+\.?", base) and slug in NUMBERED:
            base = f"{NUMBERED[slug]} {base.rstrip('.')}"
        if kind != "se":
            if re.match(r"(Footnotes|Notes|Endnotes)$", base, re.I):
                continue
            if base in seen and not part:      # the notes repeat the sermon titles
                continue
        seen.add(base)
        out.append((base + part, h))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "bibles", "classics.sqlite"))
    a = ap.parse_args()
    if os.path.exists(a.out):
        os.remove(a.out)
    db = sqlite3.connect(a.out)
    db.execute("CREATE TABLE books (slug TEXT PRIMARY KEY, seq INT, title TEXT, author TEXT, year TEXT, translator TEXT, about TEXT, source TEXT, chapters INT, words INT)")
    db.execute("CREATE TABLE chapters (book TEXT, n INT, title TEXT, words INT, body BLOB, PRIMARY KEY (book, n))")
    for seq, (slug, folder, kind, title, author, year, tr, about) in enumerate(BOOKS):
        path = os.path.join(a.src, folder)
        chs = {"se": standard_ebook, "pg-html": gutenberg_html, "pg-text": gutenberg_text, "pg-roman": gutenberg_roman}[kind](path)
        merged = []
        for t, h in chs:   # a short opening ("Book II" + its Argument) joins the chapter after it
            if merged and words(re.sub(r"<[^>]+>", " ", merged[-1][1])) < 400 and t.startswith(merged[-1][0]):
                merged[-1] = (t, merged[-1][1] + "\n" + h)
            else:
                merged.append((t, h))
        chs = [(re.sub(r"(\w)['’]S\b", r"\1’s", t), h) for t, h in merged]
        chs = [(t, h) for t, h in chs if h and words(re.sub(r"<[^>]+>", " ", h)) >= 80
               and not re.search(r"Notes to This Edition|^Untitled$|^A version from the MS", t)]
        def drop_repeat(t, h):
            """The page already shows the chapter title, so a first heading that repeats it goes."""
            base = re.sub(r"\s*\(\d+ of \d+\)$", "", t).lower().replace("…", "")
            for _ in range(3):
                m = re.match(r"\s*<(h[34]|p)>(.*?)</\1>\s*", h, flags=re.S)
                if not m:
                    break
                inner = re.sub(r"<[^>]+>|\s+", " ", m.group(2)).strip().lower().rstrip(".")
                if inner and len(inner) < 160 and (inner in base or base.endswith(inner) or base.split(". ", 1)[-1][:60] in inner):
                    h = h[m.end():]
                else:
                    break
            return h
        chs = [(t, drop_repeat(t, h)) for t, h in chs]
        chs = tidy_titles(slug, kind, title, chs)
        total = 0
        for n, (t, h) in enumerate(chs, 1):
            w = words(re.sub(r"<[^>]+>", " ", h))
            total += w
            db.execute("INSERT INTO chapters VALUES (?,?,?,?,?)", (slug, n, t[:200], w, zlib.compress(h.encode("utf-8"), 9)))
        source = "Standard Ebooks (CC0)" if kind == "se" else "Project Gutenberg (public domain)"
        db.execute("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?)", (slug, seq, title, author, year, tr, about, source, len(chs), total))
        print(f"{slug:32} {len(chs):4} chapters {total:7} words")
    db.commit()
    db.execute("VACUUM")
    db.close()
    print(f"{os.path.getsize(a.out) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
