"""Clearspring: anonymous visitor statistics for the admin area.

Counts only: how many pages were opened, which parts of the app, phone app or
browser, signed in or not, how fast pages were, which crawlers were turned
away. Nothing that identifies anyone is stored. Each phone or browser is
counted once a day using a code made from the app's own sign-in cookie (so
changing between Wi-Fi and mobile data doesn't count twice) with a secret that
is replaced every day; once the day is over the codes are deleted and only the
total is kept, so a visit can't be traced back to a person.

Counts are gathered in memory and written to the database about once a
minute, so counting adds no work to each page."""
import hashlib
import secrets
import sqlite3
import threading
import time
from datetime import date, timedelta

KEEP_DAYS = 400
FLUSH_SECONDS = 60

_lock = threading.Lock()
_counts = {}            # (day, kind, key) -> n
_seen = {}              # (day, code) -> channel   (today's visitor codes, not yet written)
_salt = {"day": None, "value": None}
_last_flush = [time.time()]

# Which part of the app a page belongs to, by the start of its address.
AREAS = [
    ("/admin", None), ("/static", None), ("/api", None), ("/media", None), ("/audio", None), ("/cron", None),
    ("/bible/read", "Bible reading"), ("/bible/listen", "Audio Bible"), ("/bible/3d", "3D Bible world"),
    ("/library/fathers", "Early Church Fathers"), ("/library/classics", "Classic books"),
    ("/bible/plans", "Reading plans"), ("/memorise", "Memorise"), ("/bible", "Study and library"), ("/library", "Study and library"),
    ("/watch", "Watch and sermons"), ("/sunday", "Watch and sermons"),
    ("/prayer", "Prayer"), ("/groups", "Groups"), ("/community", "Community and More"), ("/events", "Calendar"),
    ("/grow", "Grow"), ("/faith", "Exploring faith"), ("/family", "Family devotions"), ("/college", "Bible College"),
    ("/games", "Games"), ("/giving", "Giving"), ("/store", "Store"), ("/visit", "Plan your visit"),
    ("/ministries", "Ministries"), ("/resources", "Resources"), ("/questions", "Questions"),
    ("/account", "Account and sign-in"), ("/settings", "Settings"), ("/more", "Community and More"),
]

BOT_NAMES = [
    ("meta-external", "Meta (AI crawler)"), ("facebookexternalhit", "Facebook"), ("googlebot", "Google"), ("google-", "Google"),
    ("bingbot", "Bing"), ("bingpreview", "Bing"), ("applebot", "Apple"), ("gptbot", "OpenAI"), ("chatgpt", "OpenAI"),
    ("oai-searchbot", "OpenAI"), ("claude", "Anthropic"), ("anthropic", "Anthropic"), ("ccbot", "Common Crawl"),
    ("bytespider", "ByteDance (TikTok)"), ("amazonbot", "Amazon"), ("perplexity", "Perplexity"), ("ahrefs", "Ahrefs (SEO)"),
    ("semrush", "Semrush (SEO)"), ("mj12bot", "Majestic (SEO)"), ("dotbot", "Moz (SEO)"), ("petalbot", "Huawei"),
    ("yandex", "Yandex"), ("baidu", "Baidu"), ("duckduck", "DuckDuckGo"), ("whatsapp", "WhatsApp"), ("twitterbot", "X / Twitter"),
    ("slack", "Slack"), ("discord", "Discord"), ("linkedin", "LinkedIn"), ("telegram", "Telegram"), ("python", "Scripts"),
    ("curl", "Scripts"), ("wget", "Scripts"), ("go-http", "Scripts"), ("headless", "Scripts"), ("scrapy", "Scripts"),
]


def area_for(path):
    if path == "/" or path.startswith("/home"):
        return "Home"
    for prefix, name in AREAS:
        if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
            return name
    return "Other pages"


def bot_name(ua):
    low = (ua or "").lower()
    if "facebookexternalhit" in low and "twitterbot" in low:
        return "iMessage"
    for needle, name in BOT_NAMES:
        if needle in low:
            return name
    return "Other crawlers"


def add(kind, key, n=1, day=None):
    k = (day or date.today().isoformat(), kind, key)
    with _lock:
        _counts[k] = _counts.get(k, 0) + n


def _code(identity, today, db_path):
    """Today's anonymous code for a visitor (the secret changes every day)."""
    if _salt["day"] != today:
        _salt["value"] = _load_salt(today, db_path)
        _salt["day"] = today
    return hashlib.sha256(f"{_salt['value']}|{identity}".encode()).hexdigest()[:20]


def _load_salt(today, db_path):
    try:
        with sqlite3.connect(db_path, timeout=5) as c:
            row = c.execute("SELECT value FROM settings WHERE key='traffic_salt'").fetchone()
            if row and row[0].startswith(today + ":"):
                return row[0]
            value = today + ":" + secrets.token_hex(16)     # yesterday's secret is overwritten: gone for good
            c.execute("INSERT INTO settings (key, value) VALUES ('traffic_salt', ?) "
                      "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (value,))
            return value
    except sqlite3.Error:
        return today + ":" + secrets.token_hex(16)


def visitor(identity, channel, db_path):
    """Count this phone or browser once today. `identity` is the random value
    already in the app's sign-in cookie (or address and browser if a device
    refuses cookies); only a daily, one-way code made from it is kept."""
    today = date.today().isoformat()
    code = _code(identity, today, db_path)
    with _lock:
        _seen.setdefault((today, code), channel)


def ensure_tables(db):
    db.executescript("""
    CREATE TABLE IF NOT EXISTS traffic_daily (day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
                                              PRIMARY KEY (day, kind, key));
    CREATE TABLE IF NOT EXISTS traffic_seen (day TEXT NOT NULL, code TEXT NOT NULL, channel TEXT, PRIMARY KEY (day, code));
    """)


def maybe_flush(db_path, force=False):
    if not force and time.time() - _last_flush[0] < FLUSH_SECONDS:
        return
    with _lock:
        if not force and time.time() - _last_flush[0] < FLUSH_SECONDS:
            return
        _last_flush[0] = time.time()
        counts, seen = dict(_counts), dict(_seen)
        _counts.clear(); _seen.clear()
    if not counts and not seen:
        return
    try:
        with sqlite3.connect(db_path, timeout=10) as c:
            ensure_tables(c)
            c.executemany("INSERT INTO traffic_daily (day, kind, key, n) VALUES (?,?,?,?) "
                          "ON CONFLICT(day, kind, key) DO UPDATE SET n = n + excluded.n",
                          [(d, k, key, n) for (d, k, key), n in counts.items()])
            c.executemany("INSERT OR IGNORE INTO traffic_seen (day, code, channel) VALUES (?,?,?)",
                          [(d, code, ch) for (d, code), ch in seen.items()])
            _roll_up(c)
    except sqlite3.Error:
        # Put them back for next time rather than lose them.
        with _lock:
            for k, n in counts.items():
                _counts[k] = _counts.get(k, 0) + n
            for k, ch in seen.items():
                _seen.setdefault(k, ch)


def _roll_up(c):
    """Turn finished days' visitor codes into totals, then delete the codes."""
    today = date.today().isoformat()
    for (day,) in c.execute("SELECT DISTINCT day FROM traffic_seen WHERE day < ?", (today,)).fetchall():
        for ch, n in c.execute("SELECT COALESCE(channel, 'web'), COUNT(*) FROM traffic_seen WHERE day=? GROUP BY 1", (day,)).fetchall():
            c.execute("INSERT INTO traffic_daily (day, kind, key, n) VALUES (?, 'visitors', ?, ?) "
                      "ON CONFLICT(day, kind, key) DO UPDATE SET n = excluded.n", (day, ch, n))
        c.execute("DELETE FROM traffic_seen WHERE day=?", (day,))
    c.execute("DELETE FROM traffic_daily WHERE day < ?", ((date.today() - timedelta(days=KEEP_DAYS)).isoformat(),))


# ------------------------------------------------------------------ the admin page

def report(db, days):
    """Everything the statistics page shows, for the last `days` days."""
    today = date.today()
    since = (today - timedelta(days=days - 1)).isoformat()
    rows = db.execute("SELECT day, kind, key, n FROM traffic_daily WHERE day >= ?", (since,)).fetchall()
    live = db.execute("SELECT day, COALESCE(channel, 'web'), COUNT(*) FROM traffic_seen WHERE day >= ? GROUP BY 1, 2", (since,)).fetchall()

    def total(kind, key=None):
        return sum(r[3] for r in rows if r[1] == kind and (key is None or r[2] == key))

    def by_key(kind, limit=None):
        out = {}
        for r in rows:
            if r[1] == kind:
                out[r[2]] = out.get(r[2], 0) + r[3]
        items = sorted(out.items(), key=lambda kv: -kv[1])
        return items[:limit] if limit else items

    daily = []
    for i in range(days):
        d = (today - timedelta(days=days - 1 - i)).isoformat()
        people = sum(r[3] for r in rows if r[0] == d and r[1] == "visitors") + sum(n for dd, _, n in live if dd == d)
        daily.append({"day": d, "people": people,
                      "pages": sum(r[3] for r in rows if r[0] == d and r[1] == "area"),
                      "bots": sum(r[3] for r in rows if r[0] == d and r[1] == "bot")})
    visits_app = total("visitors", "app") + sum(n for _, ch, n in live if ch == "app")
    visits_all = sum(x["people"] for x in daily)
    pages = total("area")
    ms_n = total("speed", "count")
    first = db.execute("SELECT MIN(day) FROM traffic_daily").fetchone()[0]
    return {
        "days": days, "since": since, "first_day": first, "daily": daily,
        "visits": visits_all, "visits_app": visits_app, "pages": pages,
        "today_people": daily[-1]["people"], "today_pages": daily[-1]["pages"],
        "app_pages": total("channel", "app"), "signed_in_pages": total("signed_in", "yes"),
        "bots": total("bot"), "previews": total("preview"), "limited": total("limited"), "errors": total("errors"),
        "avg_ms": round(total("speed", "ms") / ms_n) if ms_n else None, "slow": total("speed", "slow"),
        "areas": by_key("area"), "pages_top": by_key("page", 20), "bots_by": by_key("bot"), "previews_by": by_key("preview"),
    }
