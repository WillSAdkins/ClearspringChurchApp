"""Merge an old backup into the current database.

"Restore" replaces everything with the backup. "Merge" keeps everything
that's here now and adds anything from the backup that's missing: events,
sermons, prayer requests, members, group posts and so on. It's for getting
back data lost in a crash from one or more older copies, without losing
what's been added since.

How it decides a row is already here:
  * tables with a natural key (a member's email, a ministry's slug, a
    setting's name...) match on that key;
  * other tables match on their content, ignoring things that change on
    their own over time (counts, "last seen", status flags, edit times).
    So a sermon whose title was edited since the backup can come back as a
    second copy: the preview lists what will be added so you can check.
  * when the current database is newer for something, the current version
    always wins. Merging never changes or deletes what's here now.

Rows that point at other rows (a group post's group, a member's saved
verses) are re-pointed when the parent got a new number, so links survive.
"""
import re
import sqlite3

SKIP_TABLES = {"sqlite_sequence", "sqlite_stat1"}
# Columns that change by themselves, so they're ignored when deciding whether
# a backup row is "the same" as one here.
VOLATILE = re.compile(
    r"(^id$|count|views|^last_|seen|status|^active$|published|reported|^sort|order$|hold_reason|updated_at|"
    r"fetched_at|problem|answered_at|^answer$|update_text|update_at|prayed|lessons_total|featured|"
    r"password_hash|^token|expires|archived)", re.I)
# References that aren't declared as foreign keys in the schema.
REFS = {
    ("*", "member_id"): "members",
    ("member_blocks", "blocked_id"): "members",
    ("group_posts", "parent_id"): "group_posts",
    ("group_posts", "group_id"): "groups",
    ("group_members", "group_id"): "groups",
    ("group_prayed", "post_id"): "group_posts",
    ("group_reports", "post_id"): "group_posts",
    ("poll_options", "poll_id"): "polls",
    ("poll_votes", "poll_id"): "polls",
    ("poll_votes", "option_id"): "poll_options",
    ("college_sessions", "course_id"): "college_courses",
    ("watch_lessons", "course_id"): "watch_courses",
}
LABEL_COLS = ("title", "name", "email", "body", "question", "slug", "key", "item_key")


def _tables(conn):
    return [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND sql NOT LIKE 'CREATE VIRTUAL%'") if r[0] not in SKIP_TABLES
        and not r[0].startswith("sqlite_")]


def _info(conn, t):
    cols = conn.execute(f'PRAGMA table_info("{t}")').fetchall()
    names = [c[1] for c in cols]
    types = {c[1]: (c[2] or "").upper() for c in cols}
    pk = [c[1] for c in sorted(cols, key=lambda c: c[5]) if c[5]]
    uniques = []
    for idx in conn.execute(f'PRAGMA index_list("{t}")').fetchall():
        if idx[2]:
            uniques.append([r[2] for r in conn.execute(f'PRAGMA index_info("{idx[1]}")').fetchall()])
    if pk and pk != ["id"] and pk not in uniques:
        uniques.append(pk)
    fks = {f[3]: f[2] for f in conn.execute(f'PRAGMA foreign_key_list("{t}")').fetchall()}
    return names, types, pk, uniques, fks


def _refs_for(t, cols, fks, tables):
    out = {}
    for c in cols:
        parent = fks.get(c) or REFS.get((t, c)) or REFS.get(("*", c))
        if parent and parent in tables:
            out[c] = parent
    return out


def _order(tables, deps):
    """Parents before children."""
    done, out = set(), []

    def visit(t, stack=()):
        if t in done or t in stack:
            return
        for p in deps.get(t, ()):
            if p != t:
                visit(p, stack + (t,))
        done.add(t)
        out.append(t)
    for t in sorted(tables):
        visit(t)
    return out


def _label(row):
    for c in LABEL_COLS:
        v = row.get(c)
        if isinstance(v, str) and v.strip():
            v = re.sub(r"\s+", " ", v).strip()
            return v[:70] + ("…" if len(v) > 70 else "")
    return None


def merge(current, backup):
    """Add what's missing from `backup` into `current` (both sqlite3
    connections). Doesn't commit. Returns {table: {"added": n, "examples": [...]}}."""
    cur_tables, bak_tables = set(_tables(current)), set(_tables(backup))
    common = cur_tables & bak_tables
    plan, deps = {}, {}
    for t in common:
        c_names, c_types, c_pk, c_uniq, c_fks = _info(current, t)
        b_names = _info(backup, t)[0]
        cols = [c for c in c_names if c in b_names]
        refs = _refs_for(t, cols, c_fks, common)
        deps[t] = set(refs.values())
        plan[t] = (cols, c_types, c_pk, [u for u in c_uniq if all(x in cols for x in u)], refs)

    idmap = {}        # table -> {old id: new id}
    report = {}
    for t in _order(common, deps):
        cols, types, pk, uniques, refs = plan[t]
        if not cols:
            continue
        int_id = pk == ["id"] and "id" in cols
        sig = [c for c in cols if not VOLATILE.search(c) and "BLOB" not in types.get(c, "") and c != "id"]
        uniq_keys = [u for u in uniques if u != ["id"]]
        tmap = idmap.setdefault(t, {})
        added, examples = 0, []
        col_sql = ", ".join(f'"{c}"' for c in cols)
        for raw in backup.execute(f'SELECT {col_sql} FROM "{t}"').fetchall():
            row = dict(zip(cols, raw))
            for c, parent in refs.items():
                v = row.get(c)
                if v is not None and v in idmap.get(parent, {}):
                    row[c] = idmap[parent][v]
            found = None
            for u in uniq_keys:
                if any(row[c] is None for c in u):
                    continue
                r = current.execute(f'SELECT {"id" if int_id else "1"} FROM "{t}" WHERE ' +
                                    " AND ".join(f'"{c}" = ?' for c in u), [row[c] for c in u]).fetchone()
                if r:
                    found = r[0] if int_id else True
                    break
            if found is None and int_id and sig:
                r = current.execute(f'SELECT id FROM "{t}" WHERE ' + " AND ".join(f'"{c}" IS ?' for c in sig),
                                    [row[c] for c in sig]).fetchone()
                if r:
                    found = r[0]
            if found is None and not int_id and not uniq_keys and sig:
                r = current.execute(f'SELECT 1 FROM "{t}" WHERE ' + " AND ".join(f'"{c}" IS ?' for c in sig),
                                    [row[c] for c in sig]).fetchone()
                if r:
                    found = True
            if found is not None:
                if int_id:
                    tmap[raw[cols.index("id")]] = found
                continue
            # Missing: add it.
            ins_cols = list(cols)
            if int_id:
                old_id = row["id"]
                if current.execute(f'SELECT 1 FROM "{t}" WHERE id=?', (old_id,)).fetchone():
                    ins_cols.remove("id")      # that number is taken now: get a new one
            try:
                cur = current.execute(
                    f'INSERT INTO "{t}" (' + ", ".join(f'"{c}"' for c in ins_cols) + ") VALUES (" +
                    ", ".join("?" * len(ins_cols)) + ")", [row[c] for c in ins_cols])
            except sqlite3.IntegrityError:
                continue
            if int_id:
                tmap[raw[cols.index("id")]] = cur.lastrowid
            added += 1
            lab = _label(row)
            if lab and len(examples) < 5:
                examples.append(lab)
        if added:
            report[t] = {"added": added, "examples": examples}
    return report


FRIENDLY = {
    "events": "Events", "sermons": "Sermons", "prayers": "Prayer requests", "questions": "Questions",
    "devotionals": "Devotionals", "resources": "Resources", "ministries": "Ministries", "campaigns": "Appeals",
    "members": "Member accounts", "member_data": "Members' saved items (verses, notes, prayer lists…)",
    "groups": "Groups", "group_members": "Group memberships", "group_posts": "Group posts",
    "group_prayed": "“Prayed” taps on group posts", "products": "Store items", "testimonies": "Stories",
    "polls": "Polls", "poll_options": "Poll options", "settings": "Settings", "game_scores": "Game scores",
    "member_activity": "Activity days (streaks)", "member_badges": "Badges", "college_courses": "Bible College courses",
    "college_sessions": "Bible College sessions", "popups": "Pop-ups", "page_photos": "Page photos", "staff": "Staff logins",
    "push_subscriptions": "Phones signed up for notifications", "watch_courses": "Watch courses",
    "watch_lessons": "Watch lessons", "watch_channels": "Watch channels",
}


def friendly(t):
    return FRIENDLY.get(t, t.replace("_", " ").capitalize())
