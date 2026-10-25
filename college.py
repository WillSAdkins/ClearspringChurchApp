"""Clearspring — Bible College: courses taught on Monday evenings (8–9pm),
each a series of weekly sessions with a passage, teaching notes and
questions. Staff manage them in Admin; anyone can follow along in the app,
and signed-in members keep their progress and notes (the "college" sync kind).
"""
from datetime import date, datetime, timedelta

STATUSES = {"draft": "Draft (only staff can see it)", "published": "Published"}


def ensure_tables(db):
    db.execute("""CREATE TABLE IF NOT EXISTS college_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        term TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        sort INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL)""")
    db.execute("""CREATE TABLE IF NOT EXISTS college_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        n INTEGER NOT NULL,
        title TEXT NOT NULL,
        session_date TEXT,
        passage TEXT,
        reading TEXT,
        teaching TEXT,
        questions TEXT,
        link_url TEXT,
        link_label TEXT,
        updated_at TEXT NOT NULL)""")
    db.execute("CREATE INDEX IF NOT EXISTS college_sessions_course ON college_sessions (course_id, n)")


SAMPLE = {
    "title": "Sample course: Meeting Jesus in John",
    "subtitle": "Eight Monday evenings through the Gospel of John",
    "description": "A sample to show how a course looks in the app. Edit it into a real course, or delete it and start your own.\n\n"
                   "Each week has a passage to read before you come, teaching notes and questions for discussion.",
    "term": "Sample",
    "sessions": [
        ("The Word became flesh", "John 1:1-18", "Genesis 1:1-5"),
        ("Come and see", "John 1:35-51", ""),
        ("Born again", "John 3:1-21", "Numbers 21:4-9"),
        ("Living water", "John 4:1-42", ""),
        ("The bread of life", "John 6:25-51", "Exodus 16:1-15"),
        ("The good shepherd", "John 10:1-18", "Psalm 23"),
        ("The resurrection and the life", "John 11:17-44", ""),
        ("Do you love me?", "John 21:1-19", ""),
    ],
}
SAMPLE_QUESTIONS = ("What stands out to you in this passage?\n"
                    "What does it show us about who Jesus is?\n"
                    "What is one thing to take into this week?")
SAMPLE_TEACHING = ("# Teaching notes\nThese notes are a placeholder. Replace them with the outline for the evening.\n\n"
                   "- Read the passage together.\n- Look at the setting: where is Jesus, and who is with him?\n- Discuss the questions in groups.")


def seed_sample(db):
    """One draft course so staff can see the shape of things. Only on a brand-new table."""
    if db.execute("SELECT COUNT(*) FROM college_courses").fetchone()[0]:
        return
    now = datetime.now().isoformat(timespec="seconds")
    cur = db.execute("INSERT INTO college_courses (title, subtitle, description, term, status, created_at, updated_at) VALUES (?,?,?,?, 'draft', ?, ?)",
                     (SAMPLE["title"], SAMPLE["subtitle"], SAMPLE["description"], SAMPLE["term"], now, now))
    cid = cur.lastrowid
    for i, (title, passage, reading) in enumerate(SAMPLE["sessions"], 1):
        db.execute("INSERT INTO college_sessions (course_id, n, title, passage, reading, teaching, questions, updated_at) VALUES (?,?,?,?,?,?,?,?)",
                   (cid, i, title, passage, reading, SAMPLE_TEACHING, SAMPLE_QUESTIONS, now))


def courses(db, include_drafts=False):
    where = "" if include_drafts else "WHERE c.status='published'"
    return [dict(r) for r in db.execute(f"""
        SELECT c.*, COUNT(s.id) AS sessions, MIN(s.session_date) AS first_date, MAX(s.session_date) AS last_date
        FROM college_courses c LEFT JOIN college_sessions s ON s.course_id = c.id {where}
        GROUP BY c.id ORDER BY c.status = 'published' DESC, c.sort, COALESCE(MIN(s.session_date), c.created_at) DESC""")]


def course(db, cid):
    r = db.execute("SELECT * FROM college_courses WHERE id=?", (cid,)).fetchone()
    return dict(r) if r else None


def sessions(db, cid):
    return [dict(r) for r in db.execute("SELECT * FROM college_sessions WHERE course_id=? ORDER BY n, id", (cid,))]


def session(db, cid, n):
    r = db.execute("SELECT * FROM college_sessions WHERE course_id=? AND n=?", (cid, n)).fetchone()
    return dict(r) if r else None


def next_session(db, today=None):
    """The next published session from today on: what's on this Monday."""
    today = (today or date.today()).isoformat()
    r = db.execute("""SELECT s.*, c.title AS course_title FROM college_sessions s JOIN college_courses c ON c.id = s.course_id
                      WHERE c.status='published' AND s.session_date >= ? ORDER BY s.session_date, s.n LIMIT 1""", (today,)).fetchone()
    return dict(r) if r else None


def fill_weekly_dates(db, cid, first):
    """Give every undated session a date, a week apart from the first."""
    try:
        start = date.fromisoformat(first)
    except (TypeError, ValueError):
        return 0
    n = 0
    for s in sessions(db, cid):
        if not s["session_date"]:
            db.execute("UPDATE college_sessions SET session_date=? WHERE id=?", ((start + timedelta(days=7 * (s["n"] - 1))).isoformat(), s["id"]))
            n += 1
    return n


def renumber(db, cid):
    for i, s in enumerate(sessions(db, cid), 1):
        if s["n"] != i:
            db.execute("UPDATE college_sessions SET n=? WHERE id=?", (i, s["id"]))
