"""
Groups: small groups, reading buddies, prayer circles, mentoring pairs and
families, for members with an account.

A group is private. People join only with its invite link or code, and only
its members can see what's in it. Church staff can see that a group exists,
how many are in it, and any post someone has reported, but not the
conversation itself. Leaders (whoever made the group, and anyone they make a
leader) can change the group's plan and verse, remove posts and members.

Progress in a group's reading plan and memory verse is worked out from what
each member's devices already sync to their account (the "plan", "readlog" and
"memory" kinds), so nothing extra has to be tracked. Members can switch off
sharing their progress in any group.
"""

import json
import secrets
from datetime import date, datetime, timedelta

KINDS = [
    ("small-group", "Small group", "👥"),
    ("reading", "Reading together", "📖"),
    ("prayer", "Prayer circle", "🙏"),
    ("mentoring", "Mentoring", "🤝"),
    ("family", "Family", "🏡"),
    ("other", "Other", "✨"),
]
KIND_NAMES = {k: n for k, n, _ in KINDS}
KIND_EMOJI = {k: e for k, _, e in KINDS}

MAX_MEMBERS = 60
MAX_GROUPS_PER_MEMBER = 20
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

CHECKIN_QUESTIONS = [
    ("week", "How has this week been with God?"),
    ("word", "What have you been reading or learning?"),
    ("pray", "What can we pray for?"),
]


def ensure_tables(db):
    db.execute("""
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT 'small-group',
            about TEXT,
            invite_code TEXT NOT NULL UNIQUE,
            created_by INTEGER,
            created_at TEXT NOT NULL,
            plan_slug TEXT,
            plan_start TEXT,
            verse_key TEXT,
            verse_label TEXT,
            verse_note TEXT,
            archived INTEGER NOT NULL DEFAULT 0
        )""")
    db.execute("""
        CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            joined_at TEXT NOT NULL,
            share_progress INTEGER NOT NULL DEFAULT 1,
            last_seen_post INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (group_id, member_id),
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        )""")
    db.execute("""
        CREATE TABLE IF NOT EXISTS group_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            member_id INTEGER,
            kind TEXT NOT NULL DEFAULT 'post',
            body TEXT NOT NULL,
            meta TEXT,
            ref TEXT,
            plan_day INTEGER,
            parent_id INTEGER,
            created_at TEXT NOT NULL,
            answered_at TEXT,
            answer TEXT,
            status TEXT NOT NULL DEFAULT 'live',
            reported INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        )""")
    db.execute("CREATE INDEX IF NOT EXISTS idx_group_posts ON group_posts(group_id, id)")
    db.execute("""
        CREATE TABLE IF NOT EXISTS group_prayed (
            post_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            prayed_on TEXT NOT NULL,
            PRIMARY KEY (post_id, member_id),
            FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE
        )""")
    db.execute("""
        CREATE TABLE IF NOT EXISTS group_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            member_id INTEGER,
            reason TEXT,
            created_at TEXT NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE
        )""")
    cols = [r[1] for r in db.execute("PRAGMA table_info(push_subscriptions)").fetchall()]
    if "member_id" not in cols:
        db.execute("ALTER TABLE push_subscriptions ADD COLUMN member_id INTEGER")


def now():
    return datetime.now().isoformat(timespec="seconds")


def new_code(db):
    for _ in range(50):
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
        if not db.execute("SELECT 1 FROM groups WHERE invite_code=?", (code,)).fetchone():
            return code
    raise RuntimeError("could not make an invite code")


def clean_code(code):
    c = "".join(ch for ch in (code or "").upper() if ch.isalnum())
    return c[:8] if len(c) >= 8 else ""


def display_name(row):
    """What other members see: the member's own name, never their email."""
    name = (row["name"] or "").strip() if row and "name" in row.keys() else ""
    return name or "A member"


# ------------------------------------------------------------------ groups

def create(db, member_id, name, kind, about):
    code = new_code(db)
    cur = db.execute(
        "INSERT INTO groups (name, kind, about, invite_code, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (name, kind if kind in KIND_NAMES else "other", about or None, code, member_id, now()))
    gid = cur.lastrowid
    db.execute("INSERT INTO group_members (group_id, member_id, role, joined_at) VALUES (?, ?, 'leader', ?)",
               (gid, member_id, now()))
    return gid


def get(db, gid):
    return db.execute("SELECT * FROM groups WHERE id=? AND archived=0", (gid,)).fetchone()


def by_code(db, code):
    return db.execute("SELECT * FROM groups WHERE invite_code=? AND archived=0", (code,)).fetchone()


def membership(db, gid, member_id):
    return db.execute("SELECT * FROM group_members WHERE group_id=? AND member_id=?", (gid, member_id)).fetchone()


def member_count(db, gid):
    return db.execute("SELECT COUNT(*) FROM group_members WHERE group_id=?", (gid,)).fetchone()[0]


def groups_of(db, member_id):
    rows = db.execute(
        """SELECT g.*, gm.role, gm.last_seen_post,
                  (SELECT COUNT(*) FROM group_members x WHERE x.group_id=g.id) AS members,
                  (SELECT COUNT(*) FROM group_posts p WHERE p.group_id=g.id AND p.status='live'
                       AND p.id > gm.last_seen_post AND COALESCE(p.member_id, 0) != ?) AS unread,
                  (SELECT MAX(created_at) FROM group_posts p WHERE p.group_id=g.id AND p.status='live') AS last_post
           FROM groups g JOIN group_members gm ON gm.group_id=g.id
           WHERE gm.member_id=? AND g.archived=0
           ORDER BY COALESCE(last_post, g.created_at) DESC""", (member_id, member_id)).fetchall()
    return [dict(r) for r in rows]


def join(db, gid, member_id):
    if membership(db, gid, member_id):
        return "already"
    if member_count(db, gid) >= MAX_MEMBERS:
        return "full"
    n = db.execute("SELECT COUNT(*) FROM group_members WHERE member_id=?", (member_id,)).fetchone()[0]
    if n >= MAX_GROUPS_PER_MEMBER:
        return "too-many"
    last = db.execute("SELECT COALESCE(MAX(id), 0) FROM group_posts WHERE group_id=?", (gid,)).fetchone()[0]
    db.execute("INSERT INTO group_members (group_id, member_id, role, joined_at, last_seen_post) VALUES (?, ?, 'member', ?, ?)",
               (gid, member_id, now(), max(0, last - 5)))
    return "joined"


def leave(db, gid, member_id):
    """Leave a group. The last leader leaving hands over to the longest-standing
    member; the last person leaving closes the group."""
    m = membership(db, gid, member_id)
    if not m:
        return
    db.execute("DELETE FROM group_members WHERE group_id=? AND member_id=?", (gid, member_id))
    left = db.execute("SELECT member_id, role FROM group_members WHERE group_id=? ORDER BY joined_at", (gid,)).fetchall()
    if not left:
        db.execute("UPDATE groups SET archived=1 WHERE id=?", (gid,))
    elif not any(r["role"] == "leader" for r in left):
        db.execute("UPDATE group_members SET role='leader' WHERE group_id=? AND member_id=?", (gid, left[0]["member_id"]))


def members(db, gid):
    return [dict(r) for r in db.execute(
        """SELECT gm.*, m.name FROM group_members gm JOIN members m ON m.id=gm.member_id
           WHERE gm.group_id=? AND m.active=1 ORDER BY gm.role='leader' DESC, m.name COLLATE NOCASE""", (gid,)).fetchall()]


def mark_seen(db, gid, member_id):
    last = db.execute("SELECT COALESCE(MAX(id), 0) FROM group_posts WHERE group_id=?", (gid,)).fetchone()[0]
    db.execute("UPDATE group_members SET last_seen_post=? WHERE group_id=? AND member_id=?", (last, gid, member_id))


# ------------------------------------------------------------------ posts

def add_post(db, gid, member_id, kind, body, ref=None, plan_day=None, parent_id=None, meta=None):
    cur = db.execute(
        """INSERT INTO group_posts (group_id, member_id, kind, body, meta, ref, plan_day, parent_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (gid, member_id, kind, body, json.dumps(meta) if meta else None, ref or None, plan_day, parent_id, now()))
    return cur.lastrowid


def post(db, gid, pid):
    return db.execute("SELECT * FROM group_posts WHERE id=? AND group_id=? AND status='live'", (pid, gid)).fetchone()


def posts(db, gid, viewer_id, kinds=None, plan_day=None, limit=60):
    """Top-level posts, newest first, each with its replies (oldest first)."""
    sql = ["""SELECT p.*, m.name,
                     (SELECT COUNT(*) FROM group_prayed x WHERE x.post_id=p.id) AS prayed,
                     (SELECT COUNT(*) FROM group_prayed x WHERE x.post_id=p.id AND x.member_id=?) AS i_prayed
              FROM group_posts p LEFT JOIN members m ON m.id=p.member_id
              WHERE p.group_id=? AND p.status='live' AND p.parent_id IS NULL"""]
    args = [viewer_id, gid]
    if kinds:
        sql.append("AND p.kind IN (%s)" % ",".join("?" * len(kinds)))
        args += list(kinds)
    if plan_day is not None:
        sql.append("AND p.plan_day=?")
        args.append(plan_day)
    sql.append("ORDER BY p.id DESC LIMIT ?")
    args.append(limit)
    top = [dict(r) for r in db.execute(" ".join(sql), args).fetchall()]
    if not top:
        return []
    ids = [p["id"] for p in top]
    replies = {}
    for r in db.execute(
            "SELECT p.*, m.name FROM group_posts p LEFT JOIN members m ON m.id=p.member_id "
            "WHERE p.parent_id IN (%s) AND p.status='live' ORDER BY p.id" % ",".join("?" * len(ids)), ids).fetchall():
        replies.setdefault(r["parent_id"], []).append(dict(r))
    for p in top:
        p["replies"] = replies.get(p["id"], [])
        p["meta"] = json.loads(p["meta"]) if p.get("meta") else None
    return top


def toggle_prayed(db, pid, member_id):
    if db.execute("SELECT 1 FROM group_prayed WHERE post_id=? AND member_id=?", (pid, member_id)).fetchone():
        db.execute("DELETE FROM group_prayed WHERE post_id=? AND member_id=?", (pid, member_id))
        on = False
    else:
        db.execute("INSERT INTO group_prayed (post_id, member_id, prayed_on) VALUES (?, ?, ?)", (pid, member_id, now()))
        on = True
    n = db.execute("SELECT COUNT(*) FROM group_prayed WHERE post_id=?", (pid,)).fetchone()[0]
    return on, n


def remove_post(db, pid):
    db.execute("UPDATE group_posts SET status='removed' WHERE id=? OR parent_id=?", (pid, pid))


def report(db, pid, member_id, reason):
    db.execute("INSERT INTO group_reports (post_id, member_id, reason, created_at) VALUES (?, ?, ?, ?)",
               (pid, member_id, (reason or "").strip()[:300] or None, now()))
    db.execute("UPDATE group_posts SET reported=reported+1 WHERE id=?", (pid,))


def posts_in_last_hour(db, member_id):
    since = (datetime.now() - timedelta(hours=1)).isoformat(timespec="seconds")
    return db.execute("SELECT COUNT(*) FROM group_posts WHERE member_id=? AND created_at>=?", (member_id, since)).fetchone()[0]


# ------------------------------------------------------------------ progress

def _synced(db, member_id, kind, key):
    row = db.execute("SELECT payload FROM member_data WHERE member_id=? AND kind=? AND item_key=?",
                     (member_id, kind, key)).fetchone()
    if not row:
        return None
    try:
        return json.loads(row["payload"])
    except (ValueError, TypeError):
        return None


def plan_day_today(group):
    """Which day of the group's plan today is (1-based), or None before it starts."""
    if not group["plan_start"]:
        return None
    try:
        start = date.fromisoformat(group["plan_start"])
    except ValueError:
        return None
    n = (date.today() - start).days + 1
    return n if n >= 1 else None


def plan_progress(db, member_id, slug, start, plan_days):
    """How far one member has got with the group's plan, from what they've synced.

    plan_days is the plan's list of days, each a list of [book, from, to]."""
    st = _synced(db, member_id, "plan", "plan-" + slug)
    if not st or not isinstance(st, dict):
        return {"joined": False, "done": 0}
    joined = st.get("start") == start
    done = set(n for n in (st.get("done") or []) if isinstance(n, int))
    log = (_synced(db, member_id, "readlog", "log") or {}).get("chapters") or {}
    since = st.get("start") or "0000"
    for n, day in enumerate(plan_days, 1):
        if n in done:
            continue
        chs = [f"{s}.{c}" for s, a, b in day for c in range(a, b + 1)]
        if chs and all(log.get(c) and log[c] >= since for c in chs):
            done.add(n)
    return {"joined": joined, "done": len(done), "days": sorted(done)}


def memory_status(db, member_id, key):
    st = _synced(db, member_id, "memory", "state") or {}
    v = (st.get("verses") or {}).get(key)
    if not v:
        return "not-started"
    box = v.get("box") or 0
    if box >= 4:
        return "known"
    if box >= 1 or (v.get("reviews") or 0) > 0:
        return "learning"
    return "added"


def forget_member(db, member_id):
    """Account deletion: leave every group and remove everything they wrote."""
    for r in db.execute("SELECT group_id FROM group_members WHERE member_id=?", (member_id,)).fetchall():
        leave(db, r["group_id"], member_id)
    ids = [r[0] for r in db.execute("SELECT id FROM group_posts WHERE member_id=?", (member_id,)).fetchall()]
    for pid in ids:
        db.execute("DELETE FROM group_posts WHERE parent_id=?", (pid,))
    db.execute("DELETE FROM group_posts WHERE member_id=?", (member_id,))
    db.execute("DELETE FROM group_prayed WHERE member_id=?", (member_id,))
    db.execute("UPDATE group_reports SET member_id=NULL WHERE member_id=?", (member_id,))
    db.execute("UPDATE push_subscriptions SET member_id=NULL WHERE member_id=?", (member_id,))
