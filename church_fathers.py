"""Clearspring: the writings of the early church, whole books read page by page,
from static/bibles/church_fathers.sqlite (built by tools/build_church_fathers.py
from public-domain translations: the Ante-Nicene and Nicene & Post-Nicene
Fathers, 1867-1900, and other translations of that age)."""
import os
import re
import sqlite3

import ro_db
import zlib
from functools import lru_cache

from markupsafe import Markup

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "church_fathers.sqlite")
SEARCH_DB = os.path.join(os.path.dirname(DB), "church_fathers_search.sqlite")
WPM = 230

# Better-known names than the collection's folder names.
NAMES = {
    "lucius-caecilius-firmianus-lactantius": "Lactantius", "hermias-sozomen": "Sozomen", "gregory-the-dialogist": "Gregory the Great",
    "marcus-minucius-felix": "Minucius Felix", "tyrannius-rufinus": "Rufinus", "vincent-of-l-rins": "Vincent of Lérins",
    "john-damascene": "John of Damascus", "tatian-the-assyrian": "Tatian", "aristides-the-philosopher": "Aristides",
    "caius-presbyter-of-rome": "Caius of Rome", "passion-of-saints-perpetua-and-felicity": "Perpetua and Felicity",
    "the-liturgy-of-the-blessed-apostles": "Liturgy of the Apostles", "aphrahat-the-persian-sage": "Aphrahat",
    "pseudo-dionysius-the-areopagite": "Dionysius the Areopagite", "religious-discussion-at-the-court-of-the-sassanids": "A Discussion at the Persian Court",
    "council-of-nicaea-of-325": "Council of Nicaea (325)", "council-of-constantinople-of-381": "Council of Constantinople (381)",
    "council-of-ephesus": "Council of Ephesus (431)", "council-of-chalcedon-of-451": "Council of Chalcedon (451)",
    "council-of-constantinople-of-553": "Council of Constantinople (553)", "council-of-constantinople-of-681": "Council of Constantinople (680-681)",
    "council-of-carthage-of-257": "Council of Carthage (257)", "council-of-carthage-of-419": "Council of Carthage (419)",
    "council-of-ancyra-of-314": "Council of Ancyra (314)", "council-of-neocaesarea-of-315": "Council of Neocaesarea (315)",
    "council-of-sardica-of-343": "Council of Sardica (343)", "council-of-constantinople-of-394": "Council of Constantinople (394)",
    "synod-of-antioch-of-341": "Synod of Antioch (341)", "quinisext-council": "Quinisext Council (692)",
    "council-of-gangra": "Council of Gangra", "council-of-laodicea": "Council of Laodicea",
}

# One line on who they were, for the best-known writers.
ABOUT = {
    "clement-of-rome": "Bishop of Rome in the 90s. His letter to the church in Corinth is the earliest Christian writing outside the New Testament.",
    "didache": "“The Teaching of the Twelve Apostles”: a short church handbook from about AD 100 on baptism, prayer, the Lord’s Supper and ministers.",
    "ignatius-of-antioch": "Bishop of Antioch, taken to Rome to die about AD 108. On the way he wrote seven letters to the churches.",
    "polycarp-of-smyrna": "Bishop of Smyrna and a disciple of the apostle John, martyred about AD 155 at the age of 86.",
    "epistle-of-barnabas": "An early letter reading the Old Testament as pointing to Christ.",
    "epistle-to-diognetus": "A beautiful short defence of Christian life, written to an enquiring pagan in the second century.",
    "shepherd-of-hermas": "Visions and parables on repentance from second-century Rome, widely read in the early church.",
    "justin-martyr": "A philosopher who became a Christian and defended the faith to the emperors. Martyred in Rome about AD 165.",
    "irenaeus": "Bishop of Lyon, who knew Polycarp. His Against Heresies answers the Gnostics with the apostles’ teaching.",
    "melito-of-sardis": "Bishop of Sardis. His Easter sermon On the Passover is one of the earliest Christian sermons we have.",
    "clement-of-alexandria": "Teacher in Alexandria around AD 200 who showed Christ as the true teacher of all wisdom.",
    "tertullian": "A lawyer from Carthage and the first great Christian writer in Latin. He gave the church the word “Trinity”.",
    "origen-of-alexandria": "The great Bible scholar of the third century in Alexandria and Caesarea; tortured in the persecution of Decius.",
    "hippolytus-of-rome": "A priest and theologian in Rome in the early 200s.",
    "cyprian": "Bishop of Carthage through plague and persecution, martyred in AD 258. He wrote on the unity of the church.",
    "eusebius-of-caesarea": "Bishop of Caesarea and the father of church history, who lived through the Great Persecution and Nicaea.",
    "athanasius-of-alexandria": "Bishop of Alexandria, exiled five times for holding to the Nicene faith that Jesus is fully God.",
    "ephrem-the-syrian": "Deacon and poet of the Syriac church, called “the harp of the Spirit” for his hymns.",
    "hilary-of-poitiers": "Bishop in Gaul who defended the divinity of Christ in the West.",
    "basil-of-caesarea": "Bishop of Caesarea, one of the three Cappadocian Fathers. He shaped monastic life and wrote on the Holy Spirit.",
    "gregory-of-nazianzus": "“The Theologian”, one of the Cappadocians, whose sermons on the Trinity helped settle the faith at Constantinople in 381.",
    "gregory-of-nyssa": "Basil’s younger brother, a deep thinker on the Trinity, the soul and the Christian life.",
    "cyril-of-jerusalem": "Bishop of Jerusalem. His lectures to people preparing for baptism walk through the creed.",
    "ambrose-of-milan": "Governor turned bishop of Milan, preacher and hymn writer, who baptised Augustine.",
    "john-chrysostom": "“Golden-mouthed” preacher of Antioch and Archbishop of Constantinople, famous for his sermons through the Bible.",
    "jerome": "Scholar and monk in Bethlehem who translated the Bible into Latin (the Vulgate).",
    "augustine-of-hippo": "Bishop of Hippo in North Africa, the most influential theologian of the Western church.",
    "john-cassian": "Monk who brought the wisdom of the Egyptian desert fathers to the West.",
    "cyril-of-alexandria": "Bishop of Alexandria who defended Mary as “mother of God” at the Council of Ephesus.",
    "leo-the-great": "Bishop of Rome whose letter (the Tome) helped the Council of Chalcedon describe Christ as one person in two natures.",
    "vincent-of-l-rins": "Monk of Lérins, who taught that the faith is what has been believed “everywhere, always, by all”.",
    "theodoret-of-cyrus": "Bishop and Bible commentator in Syria, and a historian of the church.",
    "gregory-the-dialogist": "Bishop of Rome from 590, who sent Augustine to England and wrote on pastoral care.",
    "john-damascene": "Monk near Jerusalem whose Exact Exposition of the Orthodox Faith sums up the teaching of the fathers.",
    "lucius-caecilius-firmianus-lactantius": "Teacher of rhetoric, tutor to Constantine’s son, called “the Christian Cicero”.",
    "methodius-of-olympus": "Bishop and martyr, best known for his Banquet of the Ten Virgins.",
    "apostolic-constitutions": "A fourth-century collection of church order: worship, ministry and Christian living.",
    "passion-of-saints-perpetua-and-felicity": "The diary of a young mother martyred in Carthage in AD 203, with her slave Felicity.",
    "athenagoras-of-athens": "A second-century philosopher who wrote to the emperor defending Christians.",
    "theophilus-of-antioch": "Bishop of Antioch in the second century, the first to use the word “Triad” of God.",
    "socrates-scholasticus": "A lawyer in Constantinople who continued Eusebius’ history of the church to AD 439.",
    "sulpicius-severus": "Friend and biographer of Martin of Tours.",
    "macarius-of-egypt": "Desert father of Egypt; the homilies under his name speak of the Spirit at work in the heart.",
}

# Where to begin.
START = [
    ("didache", "didache"), ("ignatius-of-antioch", "epistle-to-the-romans"), ("epistle-to-diognetus", "the-epistle-to-diognetus"),
    ("polycarp-of-smyrna", "martyrdom-of-polycarp"), ("passion-of-saints-perpetua-and-felicity", "the-passion-of-the-holy-martyrs-perpetua-and-felicitas"),
    ("athanasius-of-alexandria", "on-the-incarnation-of-the-word"), ("cyril-of-jerusalem", "catechetical-lectures"),
    ("augustine-of-hippo", "confessions"), ("john-chrysostom", "treatise-on-the-priesthood"), ("basil-of-caesarea", "on-the-spirit"),
    ("gregory-the-dialogist", "the-book-of-pastoral-rule"), ("vincent-of-l-rins", "the-commonitory"),
]


def available():
    return os.path.exists(DB)


def db():
    return ro_db.connect(DB)


def sdb():
    return ro_db.connect(SEARCH_DB)


def minutes(words):
    return max(1, round(words / WPM))


def time_label(words):
    m = words / WPM
    if m < 90:
        return f"{max(1, round(m / 5) * 5)} min"
    h = m / 60
    return f"{round(h)} hours" if h < 100 else f"{round(h / 10) * 10} hours"


def _is_council(slug):
    return slug.startswith(("council-", "synod-")) or slug == "quinisext-council"


def _author(r):
    slug = r["slug"]
    return {"slug": slug, "name": NAMES.get(slug, r["name"]), "year": r["year"], "era": r["era"], "works": r["works"],
            "words": r["words"], "time": time_label(r["words"]), "about": ABOUT.get(slug, ""), "council": _is_council(slug),
            "when": f"died about AD {r['year']}" if not _is_council(slug) else f"AD {r['year']}"}


@lru_cache(maxsize=1)
def eras():
    """[(era, [writers])] in date order; councils kept apart."""
    rows = db().execute("SELECT * FROM authors ORDER BY year, name").fetchall()
    out = []
    for e in db().execute("SELECT * FROM eras ORDER BY sort").fetchall():
        people = [_author(r) for r in rows if r["era"] == e["key"] and not _is_council(r["slug"])]
        if people:
            out.append({"key": e["key"], "name": e["name"], "blurb": e["blurb"], "authors": people})
    return out


@lru_cache(maxsize=1)
def councils():
    return [_author(r) for r in db().execute("SELECT * FROM authors ORDER BY year").fetchall() if _is_council(r["slug"])]


@lru_cache(maxsize=1)
def totals():
    r = db().execute("SELECT COUNT(*) AS works, SUM(words) AS words, SUM(sections) AS pages FROM works").fetchone()
    a = db().execute("SELECT COUNT(*) FROM authors").fetchone()[0]
    return {"authors": a, "works": r["works"], "words": r["words"], "pages": r["pages"]}


@lru_cache(maxsize=512)
def author(slug):
    r = db().execute("SELECT * FROM authors WHERE slug=?", (slug,)).fetchone()
    return _author(r) if r else None


def _work(r):
    return {"id": r["id"], "author": r["author"], "slug": r["slug"], "title": r["title"], "attributed": bool(r["attributed"]),
            "source": r["source"] or "", "sections": r["sections"], "words": r["words"], "time": time_label(r["words"])}


@lru_cache(maxsize=512)
def works(author_slug):
    rows = db().execute("SELECT * FROM works WHERE author=? ORDER BY attributed, (title LIKE '%SYRIAC%'), sort, title", (author_slug,)).fetchall()
    return [_work(r) for r in rows]


@lru_cache(maxsize=2048)
def work(author_slug, slug):
    r = db().execute("SELECT * FROM works WHERE author=? AND slug=?", (author_slug, slug)).fetchone()
    return _work(r) if r else None


@lru_cache(maxsize=512)
def contents(work_id):
    return [{"n": r["n"], "title": r["title"], "mins": minutes(r["words"])}
            for r in db().execute("SELECT n, title, words FROM sections WHERE work=? ORDER BY n", (work_id,)).fetchall()]


def section(work_id, n):
    r = db().execute("SELECT * FROM sections WHERE work=? AND n=?", (work_id, n)).fetchone()
    if not r:
        return None
    # Built and cleaned by tools/build_church_fathers.py (an allow-list of tags,
    # no scripts, no attributes but in-page note links).
    return {"n": r["n"], "title": r["title"], "mins": minutes(r["words"]),
            "html": Markup(zlib.decompress(r["html"]).decode("utf-8"))}


def start_here():
    out = []
    for a, w in START:
        x, y = author(a), work(a, w)
        if x and y:
            out.append({"author": x, "work": y})
    return out


def _fts_query(q):
    words = [w for w in re.findall(r"\w+", q.lower()) if len(w) > 1][:8]
    return " ".join('"' + w + '"' for w in words)


def search(q, limit=30):
    """Pages that mention every word, best first."""
    fq = _fts_query(q)
    if not fq:
        return []
    try:
        rows = sdb().execute(
            "SELECT m.work, m.n, bm25(search) AS score FROM search JOIN search_map m ON m.rowid = search.rowid "
            "WHERE search MATCH ? ORDER BY score LIMIT ?", (fq, limit)).fetchall()
    except sqlite3.Error:
        return []
    out = []
    for r in rows:
        w = db().execute("SELECT * FROM works WHERE id=?", (r["work"],)).fetchone()
        s = db().execute("SELECT title, html FROM sections WHERE work=? AND n=?", (r["work"], r["n"])).fetchone()
        if not w or not s:
            continue
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", zlib.decompress(s["html"]).decode("utf-8")))
        out.append({"author": author(w["author"]), "work": _work(w), "n": r["n"], "title": s["title"], "snippet": snippet(text, q)})
    return out


def snippet(text, q, width=220):
    import html as htmllib
    text = htmllib.unescape(text)
    words = [w for w in re.findall(r"[\w']+", q.lower()) if len(w) > 2] or re.findall(r"[\w']+", q.lower())
    low = text.lower()
    pos = min([p for p in (low.find(w) for w in words) if p >= 0] or [0])
    start = max(0, pos - width // 3)
    cut = text[start:start + width].strip()
    return ("…" if start else "") + cut + ("…" if start + width < len(text) else "")


def search_works(q, limit=8):
    """Books and writers whose name matches, for the library search."""
    q = (q or "").strip().lower()
    if len(q) < 3:
        return []
    out = []
    for r in db().execute("SELECT * FROM works WHERE lower(title) LIKE ? ORDER BY words DESC LIMIT ?", (f"%{q}%", limit)).fetchall():
        out.append({"author": author(r["author"]), "work": _work(r)})
    return out
