"""Read-only access to static/bibles/notes.sqlite (built by tools/build_notes.py):
modern study notes, book introductions, themes, people profiles, a Bible
dictionary and key terms. The HTML was cleaned when the file was built: only
basic formatting and links into the app survive."""
import functools
import os
import sqlite3
import zlib

from markupsafe import Markup

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "notes.sqlite")

SOURCES = {
    "tyndale": {"name": "Tyndale Open Study Notes",
                "credit": "Adapted by Mission Mutual (Aquifer Open Study Notes) from Tyndale Open Study Notes © 2023 Tyndale House Publishers. CC BY-SA 4.0."},
    "tyndale-dict": {"name": "Tyndale Open Bible Dictionary",
                     "credit": "Adapted by Mission Mutual (Aquifer Open Bible Dictionary) from Tyndale Open Bible Dictionary © 2023 Tyndale House Publishers. CC BY-SA 4.0."},
    "biblica": {"name": "Biblica Study Notes",
                "credit": "Biblica Study Notes © 2023 Biblica, Inc. CC BY-SA 4.0, via BibleAquifer."},
}
KINDS = {
    "theme": {"title": "Themes", "one": "Theme", "path": "themes", "about": "Short articles on the big ideas of the Bible, from altars to the ascension."},
    "profile": {"title": "People of the Bible", "one": "Profile", "path": "profiles", "about": "The lives of key people, and what we learn from them."},
    "dictionary": {"title": "Bible dictionary", "one": "Dictionary", "path": "dictionary", "about": "Over 6,000 articles on people, places, customs and ideas."},
    "term": {"title": "Key terms", "one": "Key term", "path": "terms", "about": "Short explanations of words and numbers you meet in the Bible."},
}


def available():
    return os.path.exists(PATH)


def _db():
    db = sqlite3.connect(f"file:{PATH}?mode=ro", uri=True, check_same_thread=False)
    db.row_factory = sqlite3.Row
    return db


def _html(blob):
    return Markup(zlib.decompress(blob).decode("utf-8")) if blob else Markup("")


def _note(r):
    return {"id": r["id"], "source": r["source"], "c1": r["c1"], "v1": r["v1"], "c2": r["c2"], "v2": r["v2"],
            "title": r["title"], "html": _html(r["html"])}


def chapter_notes(book, ch):
    """Every note touching a chapter, in order: Tyndale verse notes and Biblica section notes."""
    if not available():
        return []
    with _db() as db:
        rows = db.execute("SELECT * FROM notes WHERE book=? AND c1<=? AND c2>=? ORDER BY c1, v1, source DESC, id",
                          (book, ch, ch)).fetchall()
    return [_note(r) for r in rows]


@functools.lru_cache(maxsize=4096)
def chapter_count(book, ch):
    if not available():
        return 0
    with _db() as db:
        return db.execute("SELECT COUNT(*) FROM notes WHERE book=? AND c1<=? AND c2>=? AND source='tyndale'", (book, ch, ch)).fetchone()[0]


def verse_notes(book, ch, v):
    """Notes covering one verse: the Tyndale note(s) for it and the Biblica note for its section."""
    if not available():
        return []
    with _db() as db:
        rows = db.execute("""SELECT * FROM notes WHERE book=? AND (c1 < ? OR (c1 = ? AND v1 <= ?))
                             AND (c2 > ? OR (c2 = ? AND v2 >= ?)) ORDER BY source DESC, c1, v1""",
                          (book, ch, ch, v, ch, ch, v)).fetchall()
    return [_note(r) for r in rows]


def intro(book, source="tyndale"):
    if not available():
        return None
    with _db() as db:
        r = db.execute("SELECT html FROM intros WHERE book=? AND source=?", (book, source)).fetchone()
    return _html(r["html"]) if r else None


@functools.lru_cache(maxsize=256)
def has_intro(book):
    if not available():
        return False
    with _db() as db:
        return bool(db.execute("SELECT 1 FROM intros WHERE book=?", (book,)).fetchone())


def article(kind, slug):
    if not available():
        return None
    with _db() as db:
        r = db.execute("SELECT * FROM articles WHERE kind=? AND slug=?", (kind, slug)).fetchone()
        if not r:
            return None
        a = dict(r)
        a["html"] = _html(r["html"])
        a["refs_list"] = [dict(x) for x in db.execute(
            "SELECT book, c1, v1, c2, v2 FROM article_refs WHERE article=? LIMIT 400", (r["id"],))]
        a["same_title"] = [dict(x) for x in db.execute(
            "SELECT slug, title FROM articles WHERE kind=? AND title=? AND id!=? AND redirect IS NULL", (kind, r["title"], r["id"]))]
    return a


def index(kind, letter=None):
    if not available():
        return []
    with _db() as db:
        if letter:
            rows = db.execute("SELECT slug, title, summary FROM articles WHERE kind=? AND redirect IS NULL "
                              "AND lower(substr(title,1,1))=? ORDER BY title COLLATE NOCASE", (kind, letter.lower())).fetchall()
        else:
            rows = db.execute("SELECT slug, title, summary FROM articles WHERE kind=? AND redirect IS NULL "
                              "ORDER BY title COLLATE NOCASE", (kind,)).fetchall()
    return [dict(r) for r in rows]


@functools.lru_cache(maxsize=16)
def count(kind):
    if not available():
        return 0
    with _db() as db:
        return db.execute("SELECT COUNT(*) FROM articles WHERE kind=? AND redirect IS NULL", (kind,)).fetchone()[0]


def search(q, kinds=("theme", "profile", "dictionary", "term"), limit=8):
    q = (q or "").strip()
    if len(q) < 2 or not available():
        return []
    like = q.replace("%", "").replace("_", "") + "%"
    word = "% " + like
    ph = ",".join("?" * len(kinds))
    with _db() as db:
        rows = db.execute(f"""SELECT kind, slug, title, summary FROM articles WHERE kind IN ({ph}) AND redirect IS NULL
                              AND (title LIKE ? OR title LIKE ?)
                              ORDER BY title = ? COLLATE NOCASE DESC, kind = 'profile' DESC, kind = 'theme' DESC, length(title)
                              LIMIT ?""", (*kinds, like, word, q, limit)).fetchall()
    return [dict(r) for r in rows]


def for_verse(book, ch, v, limit=8):
    """Articles linked to this verse: profiles and themes first, then the most
    specific dictionary entries (those linked to few passages)."""
    if not available():
        return []
    with _db() as db:
        rows = db.execute("""SELECT DISTINCT a.kind, a.slug, a.title, a.summary, a.refs FROM article_refs r JOIN articles a ON a.id = r.article
                             WHERE r.book=? AND (r.c1 < ? OR (r.c1 = ? AND r.v1 <= ?)) AND (r.c2 > ? OR (r.c2 = ? AND r.v2 >= ?))
                             AND a.redirect IS NULL AND a.kind != 'term'
                             ORDER BY a.kind = 'profile' DESC, a.kind = 'theme' DESC, a.refs ASC LIMIT ?""",
                          (book, ch, ch, v, ch, ch, v, limit)).fetchall()
    return [dict(r) for r in rows]


def profile_for(name):
    """The people profile with this name, if there is one."""
    if not available() or not name:
        return None
    with _db() as db:
        r = db.execute("SELECT slug, title, summary FROM articles WHERE kind='profile' AND redirect IS NULL "
                       "AND (title = ? COLLATE NOCASE OR title LIKE ? COLLATE NOCASE)", (name, name + " (%")).fetchone()
    return dict(r) if r else None


def dictionary_for(name):
    if not available() or not name:
        return None
    with _db() as db:
        r = db.execute("SELECT slug, title, summary FROM articles WHERE kind='dictionary' AND redirect IS NULL "
                       "AND title = ? COLLATE NOCASE", (name,)).fetchone()
    return dict(r) if r else None
