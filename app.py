import os
import time

# The church is in Cheltenham, so "today" means today in the UK. Servers such
# as Render run on UTC, which would make Sunday's notes, the church season,
# plan days and reminders change over an hour late in summer. A TZ setting in
# the environment still wins.
if not os.environ.get("TZ"):
    os.environ["TZ"] = "Europe/London"
try:
    time.tzset()
except AttributeError:  # Windows has no tzset; it already uses local time
    pass

import json
import re
import shutil
from urllib.parse import quote_plus
import calendar as calendar_mod
import sqlite3
import secrets
import hashlib
from datetime import datetime, date, timedelta
from functools import wraps, lru_cache

import requests
import threading
import youtube_import
import guide as guide_mod
import scenes
import fathers
from flask import Flask, render_template, request, redirect, url_for, session, g, flash, Response, abort, make_response, send_from_directory, send_file, stream_with_context

from recurrence import occurrences
from ics import build_calendar
from trivia_data import TRIVIA_LADDER, TRIVIA_FOOTBALL
from verses_data import VERSES
from bible_books import ALL_BOOKS, OLD_TESTAMENT, NEW_TESTAMENT, BOOKS_BY_SLUG, parse_reference
from prayer_safety import screen as prayer_screen
from sermon_media import embed_url, thumbnail_url, format_duration, build_podcast_feed
from reading_plans import get_plan, plan_summary
from devotionals_data import STARTER_DEVOTIONALS
from resources_data import STARTER_RESOURCES, RESOURCE_CATEGORIES
from notifications import (
    NOTIFICATION_TYPES,
    TYPE_KEYS,
    VAPID_PUBLIC_KEY,
    is_configured as push_is_configured,
    native_is_configured as native_push_is_configured,
    native_status as native_push_status,
    send_to_subscription as send_push,
)
import achievements
import bible_sources
import original_words
import notes as notes_mod
import passage_study
import college
import watch_library
import app_features
import db_merge
import bibleproject
import audio_bible
import threading as _threading
import reference
import classics
import study_assistant
import grammar
import grammar_guide
import study_data
import memorise_data
import refs
import library
import plans_engine
import prayer_content
import grow_content
import faith_content
import everyday_content
import groups as groups_mod
from concurrent.futures import ThreadPoolExecutor
from study_assistant import (
    is_available as study_available,
    ask as study_ask_ai,
)
import emailer
from auth import (
    valid_email, normalise_email, password_problem,
    hash_password, verify_password,
    new_token, hash_token, token_expiry, token_expired,
    SESSION_DAYS,
)

CHURCH_NAME = "Clearspring"

# The seven ministry areas. `safeguarded` marks those working with under-18s —
# these are restricted to role-based contacts only (no personal names or mobiles),
# so a volunteer's private details can never be published on a page children see.
DEFAULT_MINISTRIES = [
    {"slug": "kids", "name": "Kids", "tagline": "Sundays for children up to 11", "safeguarded": True},
    {"slug": "youth", "name": "Youth", "tagline": "Ages 11–18", "safeguarded": True},
    {"slug": "young-adults", "name": "Young Adults", "tagline": "Late teens to thirties", "safeguarded": False},
    {"slug": "men", "name": "Men", "tagline": "Fellowship, breakfasts and study", "safeguarded": False},
    {"slug": "women", "name": "Women", "tagline": "Fellowship, study and support", "safeguarded": False},
    {"slug": "seniors", "name": "Seniors", "tagline": "Friendship and care for our older members", "safeguarded": False},
    {"slug": "missions", "name": "Missions", "tagline": "Our work at home and overseas", "safeguarded": False},
]

SAFEGUARDED_SLUGS = {m["slug"] for m in DEFAULT_MINISTRIES if m["safeguarded"]}

app = Flask(__name__)
def _secret_key():
    """Session signing key.

    A predictable key means anyone can forge a session cookie, which would
    undo both the admin login and the CSRF protection. If one isn't supplied,
    generate a random one and keep it alongside the database so sessions
    survive a restart without a known value ever being shipped in the code.
    """
    from_env = os.environ.get("SECRET_KEY")
    if from_env:
        return from_env

    key_path = os.path.join(os.path.dirname(DB_PATH), "secret_key")
    try:
        if os.path.exists(key_path):
            with open(key_path) as f:
                existing = f.read().strip()
                if existing:
                    return existing
        generated = secrets.token_urlsafe(48)
        with open(key_path, "w") as f:
            f.write(generated)
        try:
            os.chmod(key_path, 0o600)
        except OSError:
            pass
        return generated
    except OSError:
        # Can't persist one — fall back to a per-run key. Sessions won't
        # survive a restart, but they still can't be forged.
        return secrets.token_urlsafe(48)


app.permanent_session_lifetime = timedelta(days=SESSION_DAYS)


@app.template_filter("pretty_date")
def pretty_date(value):
    try:
        d = datetime.strptime(value, "%Y-%m-%d")
    except (ValueError, TypeError):
        return value
    # UK order ("Sunday 5 July"), with the year when it isn't this year.
    out = f"{d.strftime('%A')} {d.day} {d.strftime('%B')}"
    return out if d.year == date.today().year else f"{out} {d.year}"


@app.template_filter("pretty_time")
def pretty_time(value):
    """'19:00' → '7pm', '10:30' → '10.30am' (the UK way)."""
    try:
        h, m = (int(x) for x in str(value).split(":")[:2])
    except (ValueError, TypeError):
        return value or ""
    suffix = "am" if h < 12 else "pm"
    h12 = h % 12 or 12
    return f"{h12}{suffix}" if m == 0 else f"{h12}.{m:02d}{suffix}"


@app.template_filter("pretty_datetime")
def pretty_datetime(value):
    try:
        d = datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return value
    return f"{d.day} {d.strftime('%B')} {d.year}"


@app.template_filter("pretty_date_short_day")
def pretty_date_short_day(value):
    try:
        d = datetime.strptime(value, "%Y-%m-%d")
    except (ValueError, TypeError):
        return value
    return d.strftime("%a")


@app.template_filter("pretty_date_num")
def pretty_date_num(value):
    try:
        d = datetime.strptime(value, "%Y-%m-%d")
    except (ValueError, TypeError):
        return value
    return str(d.day)


@app.template_filter("gbp")
def gbp(pence):
    """Format pence as a readable pounds figure, e.g. 250000 -> £2,500."""
    if pence is None:
        return ""
    pounds = pence / 100
    if pounds == int(pounds):
        return f"£{int(pounds):,}"
    return f"£{pounds:,.2f}"


@app.template_filter("excerpt")
def excerpt(text, length=140):
    """Truncate to roughly `length` characters without cutting a word in half."""
    if not text or len(text) <= length:
        return text
    cut = text[:length].rsplit(" ", 1)[0]
    return f"{cut}…"

def _resolve_db_path():
    """Work out where the database should live.

    The database deliberately sits OUTSIDE the app folder so that replacing the
    app with a new version never touches your data. Order of preference:

      1. CHURCH_DB env var — explicit override, useful on a server
      2. A 'church-data' folder next to the app folder
      3. The app folder itself — last resort, e.g. read-only parent

    If a database already exists inside the app folder from an older version,
    it is moved to the new location automatically the first time this runs.
    """
    explicit = os.environ.get("CHURCH_DB")
    if explicit:
        path = os.path.abspath(explicit)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        return path

    app_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(app_dir), "church-data")

    try:
        os.makedirs(data_dir, exist_ok=True)
        target = os.path.join(data_dir, "church.db")
    except OSError:
        # Can't create a sibling folder — fall back to the app folder.
        return os.path.join(app_dir, "church.db")

    # One-time migration from the old in-app location.
    legacy = os.path.join(app_dir, "church.db")
    if os.path.exists(legacy) and not os.path.exists(target):
        try:
            import shutil
            shutil.copy2(legacy, target)
            shutil.move(legacy, legacy + ".migrated")
            print(f"Moved your existing data to {target}")
            print(f"(The old file is kept as {os.path.basename(legacy)}.migrated)")
        except OSError as e:
            print(f"Couldn't move existing database: {e}")
            return legacy

    return target


# True when this is a real deployment rather than someone running it locally.
# Defined early because both the storage check and the cookie policy need it.
_HTTPS_ONLY = os.environ.get("HTTPS_ONLY") == "1" or os.environ.get("RENDER") == "1"

DB_PATH = _resolve_db_path()


def _assert_persistent_storage():
    """On a real deployment, refuse to run from an ephemeral filesystem.

    The fallback in _resolve_db_path() is deliberately forgiving so the app
    always starts locally. In production that forgiveness is dangerous: if
    CHURCH_DB is unset or misspelled, the app writes to the container's own
    filesystem, works perfectly, and then loses every account, prayer and
    sermon the next time the service redeploys. Nothing warns you.

    So in production we require the database to sit on a mounted disk.
    """
    if not _HTTPS_ONLY:
        return

    explicit = os.environ.get("CHURCH_DB")
    if not explicit:
        raise RuntimeError(
            "CHURCH_DB is not set. On a deployed instance the database must "
            "live on a mounted persistent disk (e.g. /var/data/church.db), or "
            "all data is lost on the next deploy."
        )

    parent = os.path.dirname(os.path.abspath(explicit))

    # Directory existence is not enough. _resolve_db_path() calls makedirs(),
    # so if the disk failed to mount we will have cheerfully created an
    # ordinary folder at the same path on the container's own filesystem —
    # which looks identical and is wiped on the next deploy. Check that the
    # path actually sits on a mounted volume.
    probe_dir = parent
    on_mount = False
    while probe_dir and probe_dir != "/":
        if os.path.ismount(probe_dir):
            on_mount = True
            break
        probe_dir = os.path.dirname(probe_dir)

    if not on_mount:
        # This check is a safety net, not gospel. Mount detection can in
        # principle disagree with reality on some hosts, and a false positive
        # here would take a working site offline — which is worse than the
        # problem it guards against. So there is a documented way past it.
        if os.environ.get("SKIP_DISK_CHECK") == "1":
            print(
                "WARNING: CHURCH_DB is not on a detected mount point, and "
                "SKIP_DISK_CHECK=1 is set, so starting anyway. If the disk "
                "really isn't mounted, all data will be lost on the next "
                "deploy. Check /admin/status and take a backup.",
                flush=True,
            )
        else:
            raise RuntimeError(
                f"CHURCH_DB points at {parent}, which is not on a mounted "
                "disk. The persistent disk is probably missing, or its mount "
                "path doesn't match CHURCH_DB. Data written here is lost on "
                "redeploy.\n\n"
                "In Render: Settings -> Disks. The mount path must match the "
                "folder in CHURCH_DB (e.g. disk at /var/data, and "
                "CHURCH_DB=/var/data/church.db).\n\n"
                "If you are certain the disk is fine and this check is wrong, "
                "set SKIP_DISK_CHECK=1 to start anyway."
            )

    # A writable check catches a disk that exists but is mounted read-only.
    probe = os.path.join(parent, ".write-probe")
    try:
        with open(probe, "w") as fh:
            fh.write("ok")
        os.remove(probe)
    except OSError as e:
        raise RuntimeError(
            f"Cannot write to {parent} ({e}). The database directory must be "
            "writable, or nothing will be saved."
        )


_assert_persistent_storage()

app.secret_key = _secret_key()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")

# On a real deployment an unset admin password means the entire admin area is
# open to anyone who guesses "changeme". Fail loudly at startup instead of
# quietly serving a wide-open site.
if _HTTPS_ONLY and ADMIN_PASSWORD == "changeme":
    raise RuntimeError(
        "ADMIN_PASSWORD is unset (or still 'changeme') on a production "
        "deployment. Set it in your environment variables before starting."
    )

# Simple in-memory rate limit on the admin login. Held per-process, which is
# fine for a single worker; swap for Flask-Limiter + Redis if this ever runs
# behind several.
_login_attempts = {}
LOGIN_MAX_ATTEMPTS = 8
LOGIN_WINDOW_SECONDS = 300


def _login_rate_limited(ip):
    now = datetime.now().timestamp()
    attempts = [t for t in _login_attempts.get(ip, []) if now - t < LOGIN_WINDOW_SECONDS]
    _login_attempts[ip] = attempts
    return len(attempts) >= LOGIN_MAX_ATTEMPTS


def _record_login_failure(ip):
    _login_attempts.setdefault(ip, []).append(datetime.now().timestamp())


# Generic per-IP limiter for anything that sends email or costs money to run.
# Session-based limits are trivially bypassed by clearing cookies; this is
# keyed on address instead.
_action_hits = {}


def json_body():
    """The request's JSON object, or {} for anything else (a list, a string,
    a number, or not JSON at all), so handlers can always call .get()."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def same_secret(a, b):
    """Constant-time comparison that copes with any characters (the standard
    one raises an error for non-ASCII text, which someone can simply type)."""
    return secrets.compare_digest(str(a).encode("utf-8"), str(b).encode("utf-8"))


def rate_limited(bucket, ip, limit, window_seconds):
    """True if this IP has already used up its allowance for this action."""
    now = datetime.now().timestamp()
    key = (bucket, ip)
    hits = [t for t in _action_hits.get(key, []) if now - t < window_seconds]

    # Stop the dict growing without bound on a long-running process.
    if len(_action_hits) > 5000:
        _action_hits.clear()

    if len(hits) >= limit:
        _action_hits[key] = hits
        return True
    hits.append(now)
    _action_hits[key] = hits
    return False


def client_ip():
    """Caller's address, trusting Render's proxy header when present."""
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"

# Cookie hardening. Lax lets ordinary links into the site work while blocking
# cookies on cross-site POSTs, which is the shape a CSRF attack takes.
#
# Secure is decided once at startup from the environment. It must NOT be set
# per-request: app.config is global and shared by every worker thread, so
# mutating it mid-request is a race, and one visitor's connection type would
# silently change the cookie policy for everyone else.

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,      # JavaScript can't read the session cookie
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=_HTTPS_ONLY,
    # Cap request bodies. Without this the database restore upload will happily
    # read an arbitrarily large file straight into memory.
    MAX_CONTENT_LENGTH=32 * 1024 * 1024,   # 32 MB
)


@app.after_request
def compress_large_pages(response):
    """Gzip big HTML and JSON answers (the word-by-word pages run to several
    hundred kilobytes before compression, about a tenth after). Only when the
    browser asks for it, and never for files, streams or anything already encoded."""
    try:
        if (response.direct_passthrough or response.status_code != 200 or "Content-Encoding" in response.headers
                or response.mimetype not in ("text/html", "application/json")
                or "gzip" not in (request.headers.get("Accept-Encoding") or "")):
            return response
        data = response.get_data()
        if len(data) < 32 * 1024:
            return response
        import gzip as _gzip
        response.set_data(_gzip.compress(data, 6))
        response.headers["Content-Encoding"] = "gzip"
        response.headers["Content-Length"] = str(len(response.get_data()))
        response.vary.add("Accept-Encoding")
    except Exception:
        pass
    return response


@app.after_request
def security_headers(response):
    """Standard protective headers.

    The content security policy is the substantive one: even if a script did
    somehow get injected, the browser would refuse to run it unless it came
    from somewhere on this list.
    """
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
    )

    # Only send HSTS over a genuinely secure connection, never on local HTTP.
    if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )

    # Skip CSP on the podcast feed and other non-HTML responses.
    if response.mimetype == "text/html":
        # The native iOS/Android shell runs the page inside a WKWebView /
        # WebView whose bridge lives on capacitor://localhost (iOS) or
        # https://localhost (Android). Without these origins the Capacitor
        # bridge is blocked and native push, the back button, and external
        # link handling all silently stop working.
        NATIVE_ORIGINS = "capacitor://localhost https://localhost http://localhost"

        response.headers.setdefault("Content-Security-Policy", "; ".join([
            f"default-src 'self' {NATIVE_ORIGINS}",
            # 'unsafe-inline' is needed because the app uses inline scripts and
            # styles throughout. Removing it would mean refactoring every
            # template to external files — worth doing eventually.
            # 'wasm-unsafe-eval' is needed by the Unity WebGL game, which
            # compiles WebAssembly at runtime. It is far narrower than
            # 'unsafe-eval' — it permits WebAssembly compilation only, and
            # does not re-enable eval() or new Function() for JavaScript.
            f"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' {NATIVE_ORIGINS}",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://i.ytimg.com",
            "media-src 'self' blob: https:",
            "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com "
            "https://www.facebook.com",
            f"connect-src 'self' https://bible-api.com {NATIVE_ORIGINS}",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
        ]))

    return response


# ---------- CSRF protection ----------

def csrf_token():
    """The token for this session, created on first use."""
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)
    return session["csrf_token"]


# Which stylesheet to serve. Set CLEARSPRING_THEME=classic to put the original
# warm cream-and-brown design back without touching any templates — the old
# stylesheet is kept at static/style-classic.css.
CLASSIC_THEME = os.environ.get("CLEARSPRING_THEME", "").strip().lower() == "classic"


@app.context_processor
def inject_theme_choice():
    return {"classic_theme": CLASSIC_THEME}


@app.context_processor
def inject_csrf():
    return {"csrf_token": csrf_token, "in_app": in_native_app()}


def in_native_app():
    """True inside the iPhone/Android app (its webview adds this to the user agent)."""
    try:
        return "ClearspringApp/" in (request.headers.get("User-Agent") or "")
    except RuntimeError:
        return False


@app.before_request
def protect_against_csrf():
    """Reject state-changing requests that don't carry a valid token.

    Applied globally rather than per-route, so a route added later is covered
    by default rather than by remembering to decorate it.
    """
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return None

    expected = session.get("csrf_token")

    # Look in both places rather than deciding by endpoint name.
    #
    # This used to consult a hand-maintained list of endpoints that send the
    # token as a header. The list added no security — the token itself is the
    # protection, and where it travels doesn't change that — but it did mean
    # any new fetch-based endpoint silently rejected every request until
    # someone remembered to add it, and the failure looked like a network
    # error rather than a missing entry.
    supplied = (
        request.form.get("csrf_token")
        or request.headers.get("X-CSRF-Token")
        or ""
    )

    if not expected or not supplied or not same_secret(expected, supplied):
        # A missing token usually means an expired session rather than an attack,
        # so say something a person can act on.
        #
        # How we say it depends on who's listening: a fetch() call needs JSON
        # it can parse, a submitted form needs a page with a message on it.
        wants_json = (
            request.is_json
            or request.headers.get("X-CSRF-Token") is not None
            or "application/json" in (request.headers.get("Accept") or "")
        )
        if wants_json:
            return {"ok": False, "error": "csrf"}, 400
        flash("Your session expired, so that wasn't submitted. Please try again.")
        return redirect(request.referrer or url_for("index")), 303

    return None


# ---------- Database ----------

_schema_checked = False


@app.before_request
def _ensure_schema():
    """Belt and braces: bring the database up to date on each worker's first
    request, in case it was swapped or restored after the app started.
    Every step in init_db is safe to repeat."""
    global _schema_checked
    if _schema_checked:
        return
    _schema_checked = True
    try:
        init_db()
    except Exception:
        app.logger.exception("Database update on first request failed")


def get_db():
    if "db" not in g:
        # timeout: wait for a lock rather than failing instantly. Without this
        # two people saving at the same moment can produce "database is locked".
        g.db = sqlite3.connect(DB_PATH, timeout=15.0)
        g.db.row_factory = sqlite3.Row
        # WAL lets reads carry on while a write is in progress. On a read-heavy
        # site like this one that is the difference between smooth and stalling.
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA busy_timeout=15000")
        g.db.execute("PRAGMA foreign_keys=ON")
        g.db.execute("PRAGMA synchronous=NORMAL")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH, timeout=15.0)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'event',
            event_date TEXT NOT NULL,
            event_time TEXT NOT NULL,
            location TEXT,
            description TEXT,
            recurring TEXT NOT NULL DEFAULT 'none'
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_text TEXT NOT NULL,
            asker_name TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            answer_text TEXT,
            submitted_at TEXT NOT NULL,
            answered_at TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS sermons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            speaker TEXT,
            series TEXT,
            topic TEXT,
            passage TEXT,
            summary TEXT,
            preached_on TEXT NOT NULL,
            video_url TEXT,
            audio_url TEXT,
            duration_seconds INTEGER,
            published INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            password_hash TEXT,
            email_verified INTEGER NOT NULL DEFAULT 0,
            login_token_hash TEXT,
            login_token_expires TEXT,
            created_at TEXT NOT NULL,
            last_login TEXT,
            active INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS member_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            kind TEXT NOT NULL,
            item_key TEXT NOT NULL,
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(member_id, kind, item_key),
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'other',
            summary TEXT,
            description TEXT,
            price_pence INTEGER,
            price_note TEXT,
            image_url TEXT,
            buy_url TEXT,
            stock TEXT NOT NULL DEFAULT 'available',
            featured INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS game_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            game_key TEXT NOT NULL,
            score INTEGER NOT NULL,
            achieved_at TEXT NOT NULL,
            UNIQUE(member_id, game_key),
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS reminder_log (
            endpoint TEXT PRIMARY KEY,
            last_date TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint TEXT NOT NULL UNIQUE,
            subscription_json TEXT NOT NULL,
            prefs_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            last_seen TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'growing',
            summary TEXT,
            body TEXT,
            url TEXT,
            file_path TEXT,
            kind TEXT NOT NULL DEFAULT 'link',
            author TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            published INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS ministries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            tagline TEXT,
            description TEXT,
            meets TEXT,
            location TEXT,
            contact_name TEXT,
            contact_email TEXT,
            contact_phone TEXT,
            resources TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            blurb TEXT,
            target_pence INTEGER,
            raised_pence INTEGER NOT NULL DEFAULT 0,
            give_url TEXT,
            closes_on TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS prayers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            body TEXT NOT NULL,
            author_name TEXT,
            visibility TEXT NOT NULL DEFAULT 'public',
            kind TEXT NOT NULL DEFAULT 'request',
            status TEXT NOT NULL DEFAULT 'live',
            hold_reason TEXT,
            pray_count INTEGER NOT NULL DEFAULT 0,
            submitted_at TEXT NOT NULL,
            answered_at TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS devotionals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            verse_ref TEXT,
            body TEXT NOT NULL,
            video_url TEXT,
            created_at TEXT NOT NULL,
            published INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            show_results TEXT NOT NULL DEFAULT 'live',
            created_at TEXT NOT NULL,
            opened_at TEXT,
            closed_at TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS poll_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poll_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            vote_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
        )
        """
    )
    # Seed starter devotionals once (only if the table is empty)
    existing = db.execute("SELECT COUNT(*) FROM devotionals").fetchone()[0]
    if existing == 0:
        base = datetime.now()
        for i, d in enumerate(STARTER_DEVOTIONALS):
            created = (base - timedelta(days=i)).isoformat()
            db.execute(
                "INSERT INTO devotionals (title, verse_ref, body, created_at, published) VALUES (?, ?, ?, ?, 1)",
                (d["title"], d["verse_ref"], d["body"], created),
            )
    # Migration: add an optional video to devotionals for existing databases
    devo_cols = [r[1] for r in db.execute("PRAGMA table_info(devotionals)").fetchall()]
    if "video_url" not in devo_cols:
        db.execute("ALTER TABLE devotionals ADD COLUMN video_url TEXT")

    # Wave 7: groups
    groups_mod.ensure_tables(db)

    # Wave 6: stories people share, and Sunday notes on sermons
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS testimonies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            body TEXT NOT NULL,
            author_name TEXT,
            title TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            hold_reason TEXT,
            submitted_at TEXT NOT NULL,
            published_at TEXT
        )
        """
    )
    sermon_cols = [r[1] for r in db.execute("PRAGMA table_info(sermons)").fetchall()]
    for col in ("outline", "group_questions"):
        if col not in sermon_cols:
            db.execute(f"ALTER TABLE sermons ADD COLUMN {col} TEXT")

    # Migration: let people update their own prayer requests
    pr_cols = [r[1] for r in db.execute("PRAGMA table_info(prayers)").fetchall()]
    for col in ("update_text", "update_at", "owner_hash"):
        if col not in pr_cols:
            db.execute(f"ALTER TABLE prayers ADD COLUMN {col} TEXT")

    # Migration: add ministry tag to events for existing databases
    achievements.ensure_tables(db)
    college.ensure_tables(db)
    college.seed_sample(db)
    watch_library.ensure_tables(db)
    watch_library.seed(
        db,
        lambda k, d="": (db.execute("SELECT value FROM settings WHERE key=?", (k,)).fetchone() or [d])[0],
        lambda k, v: db.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, v)))

    cols = [r[1] for r in db.execute("PRAGMA table_info(events)").fetchall()]
    if "ministry" not in cols:
        db.execute("ALTER TABLE events ADD COLUMN ministry TEXT")

    # Seed the standard ministries once (only if the table is empty)
    if db.execute("SELECT COUNT(*) FROM ministries").fetchone()[0] == 0:
        for order, m in enumerate(DEFAULT_MINISTRIES):
            db.execute(
                """INSERT INTO ministries (slug, name, tagline, sort_order, active)
                   VALUES (?, ?, ?, ?, 1)""",
                (m["slug"], m["name"], m["tagline"], order),
            )

    # Seed starter resources once (only if the table is empty)
    if db.execute("SELECT COUNT(*) FROM resources").fetchone()[0] == 0:
        now = datetime.now().isoformat()
        for order, r in enumerate(STARTER_RESOURCES):
            db.execute(
                """INSERT INTO resources (title, category, summary, body, kind,
                   sort_order, published, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
                (r["title"], r["category"], r.get("summary"), r.get("body"),
                 r.get("kind", "article"), order, now),
            )

    db.execute(
        """CREATE TABLE IF NOT EXISTS popups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT,
            button_text TEXT,
            button_url TEXT,
            starts TEXT NOT NULL,
            ends TEXT NOT NULL,
            pages TEXT NOT NULL DEFAULT 'home',
            audience TEXT NOT NULL DEFAULT 'everyone',
            active INTEGER NOT NULL DEFAULT 1,
            image BLOB,
            image_mime TEXT,
            image_at TEXT,
            created_at TEXT NOT NULL
        )"""
    )
    pu_cols = [r[1] for r in db.execute("PRAGMA table_info(popups)").fetchall()]
    for col, decl in (("kind", "TEXT NOT NULL DEFAULT 'church'"), ("sponsor_name", "TEXT")):
        if col not in pu_cols:
            db.execute(f"ALTER TABLE popups ADD COLUMN {col} {decl}")
    db.execute("""CREATE TABLE IF NOT EXISTS popup_stats (
        key TEXT NOT NULL, day TEXT NOT NULL, shown INTEGER NOT NULL DEFAULT 0, tapped INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (key, day))""")
    db.execute(
        """CREATE TABLE IF NOT EXISTS page_photos (
            key TEXT PRIMARY KEY,
            mime TEXT NOT NULL,
            data BLOB NOT NULL,
            updated_at TEXT NOT NULL
        )"""
    )
    db.execute(
        """CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            areas TEXT NOT NULL DEFAULT '',
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            last_login TEXT
        )"""
    )

    # Seed the Monday evening meetings once, as weekly events admin can edit
    # or delete. The flag stops them coming back after a delete.
    if not db.execute("SELECT 1 FROM settings WHERE key='seeded_monday_rhythm'").fetchone():
        have = db.execute("SELECT COUNT(*) FROM events WHERE title LIKE '%Bible College%' "
                          "OR title LIKE '%Prayer and Worship%' OR title LIKE '%Prayer & Worship%'").fetchone()[0]
        if not have:
            today = date.today()
            monday = (today + timedelta(days=(0 - today.weekday()) % 7)).isoformat()
            for title, cat, at, about in (
                ("Prayer and Worship", "service", "19:00",
                 "An hour of sung worship and praying together, 7pm to 8pm. Everyone is welcome."),
                ("Bible College", "event", "20:00",
                 "An hour of teaching through the Bible, 8pm to 9pm, straight after Prayer and Worship. Open to anyone who wants to go deeper."),
            ):
                db.execute("INSERT INTO events (title, category, event_date, event_time, location, description, recurring) "
                           "VALUES (?, ?, ?, ?, '', ?, 'weekly')", (title, cat, monday, at, about))
        db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded_monday_rhythm', '1')")

    db.commit()
    db.close()


# ---------- Auth ----------

# ---------- Staff roles ----------
#
# The ADMIN_PASSWORD (in Render's environment) signs in the owner, who can do
# everything. The owner can add volunteer accounts that only reach the areas
# they're given. Anything not listed below is owner-only, so a page added later
# is safe by default.

STAFF_AREAS = {
    "sermons": ("Sermons, live stream and polls", "Add talks, notes and group questions; switch the live stream on; run Sunday polls."),
    "events": ("Calendar and ministries", "Add and edit events and ministry pages."),
    "content": ("Pages and devotionals", "Home page, Plan your visit, devotionals, resources, next steps and the church reading plan."),
    "pastoral": ("Prayer, questions, stories and groups", "Includes private prayer requests sent only to the pastors. Give this to pastors only."),
    "giving": ("Giving and store", "Giving links, appeals and store items."),
    "notify": ("Notifications", "Send a notification to everyone's phones."),
    "members": ("Member accounts", "See who has an account (name, email, when they joined and last used the app, their groups) and delete an account when someone asks. Never their notes, journal or prayer list."),
}

ENDPOINT_AREA = {}
for _area, _eps in {
    "sermons": "admin_watch_library admin_sermons admin_live_settings admin_youtube new_sermon edit_sermon delete_sermon admin_polls new_poll open_poll close_poll delete_poll",
    "events": "new_event edit_event delete_event admin_ministries edit_ministry",
    "content": "admin_college admin_college_edit admin_college_session admin_popups admin_popup_edit admin_pictures admin_home admin_visit admin_next_steps admin_church_plan admin_resources new_resource edit_resource delete_resource "
               "admin_devotionals new_devotional edit_devotional delete_devotional",
    "pastoral": "admin_prayers admin_prayer_action admin_questions answer_question reject_question delete_question "
                "admin_stories admin_story_action admin_groups admin_group_action admin_group_report",
    "giving": "admin_giving admin_giving_settings new_campaign edit_campaign delete_campaign admin_store admin_store_settings "
              "new_product edit_product delete_product",
    "notify": "admin_notifications notification_check",
    "members": "admin_members admin_member",
    "any": "admin admin_my_account",
}.items():
    for _ep in _eps.split():
        ENDPOINT_AREA[_ep] = _area


def current_staff():
    """None for the owner; the staff row for a volunteer. Cached per request."""
    if "staff" not in g:
        g.staff = None
        sid = session.get("staff_id")
        if sid:
            g.staff = get_db().execute("SELECT * FROM staff WHERE id=? AND active=1", (sid,)).fetchone()
    return g.staff


def staff_areas():
    """The areas the signed-in staff member can reach ('*' for the owner)."""
    if not session.get("is_admin"):
        return set()
    if not session.get("staff_id"):
        return {"*"}
    st = current_staff()
    return set((st["areas"] or "").split(",")) - {""} if st else set()


def can_open(endpoint):
    areas = staff_areas()
    if "*" in areas:
        return True
    area = ENDPOINT_AREA.get(endpoint)
    return bool(areas) and (area == "any" or area in areas)


@app.context_processor
def inject_staff():
    return {"can_open": can_open, "data_missing": data_missing, "is_owner": lambda: "*" in staff_areas(), "staff_name": lambda: (current_staff() or {"name": None})["name"]}


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("is_admin"):
            return redirect(url_for("login", next=request.path))
        if session.get("staff_id") and not current_staff():
            # The account was removed or switched off: sign them out.
            session.pop("is_admin", None); session.pop("staff_id", None)
            flash("That staff account is no longer active.")
            return redirect(url_for("login"))
        if not can_open(request.endpoint):
            flash("You don't have access to that part of the admin area. Ask the church's app owner if you need it.")
            return redirect(url_for("admin"))
        return view(*args, **kwargs)
    return wrapped


def _safe_next(target):
    """Only follow ?next= to a page on this site (never to another website)."""
    if target and target.startswith("/") and not target.startswith("//") and "\\" not in target:
        return target
    return None


@app.route("/admin/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        # Behind a proxy the real address is in X-Forwarded-For; fall back to
        # the direct address locally.
        ip = (request.headers.get("X-Forwarded-For", request.remote_addr or "")
              .split(",")[0].strip())

        if _login_rate_limited(ip):
            flash("Too many attempts. Please wait a few minutes and try again.")
            return render_template(
                "login.html",
                using_default_password=(ADMIN_PASSWORD == "changeme"),
            ), 429

        email = normalise_email(request.form.get("email", ""))
        password = request.form.get("password", "")
        staff = None
        if email:
            row = get_db().execute("SELECT * FROM staff WHERE email=? AND active=1", (email,)).fetchone()
            if row and password and verify_password(row["password_hash"], password):
                staff = row
        ok = staff is not None or (not email and password and same_secret(password, ADMIN_PASSWORD))
        if ok:
            session.pop("staff_id", None)
            session["is_admin"] = True
            if staff is not None:
                session["staff_id"] = staff["id"]
                get_db().execute("UPDATE staff SET last_login=? WHERE id=?", (datetime.now().isoformat(), staff["id"]))
                get_db().commit()
            session.permanent = False
            _login_attempts.pop(ip, None)
            return redirect(_safe_next(request.args.get("next")) or url_for("admin"))

        _record_login_failure(ip)
        flash("That email or password isn't right. Try again." if email else "That password isn't right. Try again.")
    return render_template(
        "login.html",
        using_default_password=(ADMIN_PASSWORD == "changeme"),
    )


def _staff_form_areas():
    return ",".join(a for a in STAFF_AREAS if request.form.get(f"area_{a}"))


@app.route("/admin/staff", methods=["GET", "POST"])
@login_required
def admin_staff():
    db = get_db()
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()[:80]
        email = normalise_email(request.form.get("email", ""))
        password = request.form.get("password", "")
        problem = None
        if not name:
            problem = "Please give their name."
        elif not valid_email(email):
            problem = "Please enter a valid email address. They'll use it to sign in."
        elif db.execute("SELECT 1 FROM staff WHERE email=?", (email,)).fetchone():
            problem = "There's already a staff account with that email."
        else:
            problem = password_problem(password, email=email, name=name)
        if problem:
            flash(problem)
        else:
            db.execute("INSERT INTO staff (name, email, password_hash, areas, active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
                       (name, email, hash_password(password), _staff_form_areas(), datetime.now().isoformat()))
            db.commit()
            flash(f"Added {name}. Give them their password in person, not by email.")
            return redirect(url_for("admin_staff"))
    rows = db.execute("SELECT * FROM staff ORDER BY active DESC, name COLLATE NOCASE").fetchall()
    return render_template("admin_staff.html", staff=rows, areas=STAFF_AREAS,
                           form=request.form if request.method == "POST" else {})


@app.route("/admin/staff/<int:staff_id>", methods=["POST"])
@login_required
def admin_staff_action(staff_id):
    db = get_db()
    row = db.execute("SELECT * FROM staff WHERE id=?", (staff_id,)).fetchone()
    if not row:
        abort(404)
    action = request.form.get("action")
    if action == "areas":
        db.execute("UPDATE staff SET areas=? WHERE id=?", (_staff_form_areas(), staff_id))
        flash(f"Updated what {row['name']} can reach.")
    elif action in ("off", "on"):
        db.execute("UPDATE staff SET active=? WHERE id=?", (1 if action == "on" else 0, staff_id))
        flash(f"{row['name']} can {'now' if action == 'on' else 'no longer'} sign in.")
    elif action == "password":
        pw = request.form.get("password", "")
        problem = password_problem(pw, email=row["email"], name=row["name"])
        if problem:
            flash(problem)
        else:
            db.execute("UPDATE staff SET password_hash=? WHERE id=?", (hash_password(pw), staff_id))
            flash(f"Set a new password for {row['name']}.")
    elif action == "delete":
        db.execute("DELETE FROM staff WHERE id=?", (staff_id,))
        flash(f"Removed {row['name']}'s staff account.")
    db.commit()
    return redirect(url_for("admin_staff"))


@app.route("/admin/me", methods=["GET", "POST"])
@login_required
def admin_my_account():
    st = current_staff()
    if not st:
        return redirect(url_for("admin_staff"))
    if request.method == "POST":
        if not verify_password(st["password_hash"], request.form.get("current", "")):
            flash("Your current password wasn't right.")
        else:
            problem = password_problem(request.form.get("password", ""), email=st["email"], name=st["name"])
            if problem:
                flash(problem)
            else:
                get_db().execute("UPDATE staff SET password_hash=? WHERE id=?",
                                 (hash_password(request.form.get("password", "")), st["id"]))
                get_db().commit()
                flash("Password changed.")
                return redirect(url_for("admin"))
    return render_template("admin_me.html", st=st,
                           areas=[STAFF_AREAS[a][0] for a in STAFF_AREAS if a in staff_areas()])


@app.route("/admin/logout")
def logout():
    session.pop("is_admin", None)
    session.pop("staff_id", None)
    return redirect(url_for("index"))


# ---------- Public ----------

WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


def verse_of_the_day():
    day_number = date.today().toordinal()
    v = VERSES[day_number % len(VERSES)]
    # Show it in the app's default translation (WEB, bundled locally) so it
    # matches what opens when someone taps through. Falls back to the stored text.
    text = _web_text(v["ref"])
    return {**v, "text": text} if text else v


@lru_cache(maxsize=64)
def _web_text(ref):
    m = re.match(r"^\s*(.+?)\s+(\d+):(\d+)(?:-(\d+))?\s*$", ref or "")
    parsed = study_data.parse_verse_ref(ref)
    if not m or not parsed:
        return None
    slug, ch, v1 = parsed
    v2 = int(m.group(4) or v1)
    try:
        import sqlite3 as _sq
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles", "web.sqlite")
        with _sq.connect(f"file:{path}?mode=ro", uri=True) as db:
            rows = db.execute("SELECT text FROM verses WHERE book=? AND chapter=? AND verse BETWEEN ? AND ? ORDER BY verse",
                              (slug, ch, v1, v2)).fetchall()
    except Exception:
        return None
    return " ".join(r[0] for r in rows) or None


def upcoming_occurrences(limit=3, days_ahead=45):
    db = get_db()
    rows = db.execute("SELECT * FROM events").fetchall()
    today = date.today()
    range_end = today + timedelta(days=days_ahead)
    items = []
    for row in rows:
        for occ_date in occurrences(row, today, range_end):
            items.append((occ_date.isoformat(), row))
    items.sort(key=lambda pair: (pair[0], pair[1]["event_time"]))
    return items[:limit]


HOME_DEFAULTS = {
    "home_eyebrow": "Cheltenham · Sundays 11am",
    "home_statement": "Jesus is always\nthe *lead story*",
    "home_sub": "Centenary Hall, Dean Close Prep School, GL51 6QS",
    "home_cta": "Plan your visit",
}


def render_statement(raw):
    """Turn 'the *lead story*' into markup with the signature italic word.

    Built as DOM-safe pieces rather than dropping the setting straight into
    the page: this text is editable from admin, and admin input should never
    become live HTML. Only two things are emitted — <em> and <br> — and the
    words themselves are escaped.
    """
    from markupsafe import Markup, escape

    out = []
    for i, line in enumerate((raw or "").split("\n")):
        if i:
            out.append("<br>")
        # Split on *emphasis*, keeping the delimiters.
        for part in re.split(r"(\*[^*]+\*)", line):
            if len(part) > 2 and part.startswith("*") and part.endswith("*"):
                out.append(f"<em>{escape(part[1:-1])}</em>")
            else:
                out.append(str(escape(part)))
    return Markup("".join(out))


@app.route("/admin/home", methods=["GET", "POST"])
@login_required
def admin_home():
    saved = False
    if request.method == "POST":
        for key in HOME_DEFAULTS:
            set_setting(key, (request.form.get(key) or "").strip())
        if request.form.get("guide_field"):  # only when the form actually had the tick-box
            set_setting("guide_enabled", "1" if request.form.get("guide_enabled") else "0")
        for key in SECTIONS:
            mode = request.form.get(f"section_{key}")
            if mode in ("auto", "on", "off"):
                set_setting(f"section_{key}", mode)
        get_db().commit()
        saved = True
    return render_template(
        "admin_home.html",
        church_name=CHURCH_NAME,
        content={k: (get_setting(k, v) or v) for k, v in HOME_DEFAULTS.items()},
        sections=[(k, label, auto, get_setting(f"section_{k}", "auto") or "auto") for k, (label, auto) in SECTIONS.items()],
        guide_enabled=get_setting("guide_enabled", "1") != "0",
        saved=saved,
    )


@app.route("/")
def index():
    youtube_check_soon()
    db = get_db()
    latest_sermon = db.execute(
        "SELECT * FROM sermons WHERE published=1 ORDER BY preached_on DESC LIMIT 1"
    ).fetchone()
    devotional = db.execute(
        "SELECT * FROM devotionals WHERE published=1 ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    live_on = get_setting("live_is_on", "0") == "1"
    return render_template(
        "home.html",
        church_name=CHURCH_NAME,
        verse=verse_of_the_day(),
        upcoming=upcoming_occurrences(),
        latest_sermon=latest_sermon,
        sermon_thumb=thumbnail_url(latest_sermon["video_url"]) if latest_sermon else None,
        devotional=devotional,
        live_on=live_on,
        hero={k: (get_setting(k, v) or v) for k, v in HOME_DEFAULTS.items()},
        hero_statement=render_statement(
            get_setting("home_statement", HOME_DEFAULTS["home_statement"])
        ),
    )


def get_setting(key, default=None):
    db = get_db()
    row = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(key, value):
    db = get_db()
    db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )
    db.commit()


@app.route("/watch")
def watch_hub():
    youtube_check_soon()
    db = get_db()
    q = request.args.get("q", "").strip()
    speaker = request.args.get("speaker", "").strip()
    series = request.args.get("series", "").strip()

    sql = "SELECT * FROM sermons WHERE published=1"
    params = []
    if q:
        sql += (" AND (title LIKE ? OR speaker LIKE ? OR topic LIKE ? "
                "OR passage LIKE ? OR series LIKE ? OR summary LIKE ?)")
        params.extend([f"%{q}%"] * 6)
    if speaker:
        sql += " AND speaker = ?"
        params.append(speaker)
    if series:
        sql += " AND series = ?"
        params.append(series)
    sql += " ORDER BY preached_on DESC"

    rows = db.execute(sql, params).fetchall()

    sermons = []
    for r in rows:
        sermons.append({
            "row": r,
            "thumb": thumbnail_url(r["video_url"]),
            "duration": format_duration(r["duration_seconds"]),
        })

    speakers = [r["speaker"] for r in db.execute(
        "SELECT DISTINCT speaker FROM sermons WHERE published=1 AND speaker IS NOT NULL "
        "AND speaker != '' ORDER BY speaker"
    ).fetchall()]
    all_series = [r["series"] for r in db.execute(
        "SELECT DISTINCT series FROM sermons WHERE published=1 AND series IS NOT NULL "
        "AND series != '' ORDER BY series"
    ).fetchall()]

    latest = sermons[0] if sermons and not (q or speaker or series) else None
    rest = sermons[1:] if latest else sermons

    live_url = get_setting("live_stream_url", "")
    live_on = get_setting("live_is_on", "0") == "1"

    watch_library_soon()
    lib = watch_library.courses(db)
    return render_template(
        "watch.html",
        learn_featured=([c for c in lib if c["featured"]] or lib)[:8],
        learn_count=len(lib),
        church_name=CHURCH_NAME,
        latest=latest,
        sermons=rest,
        speakers=speakers,
        all_series=all_series,
        q=q,
        active_speaker=speaker,
        active_series=series,
        live_embed=embed_url(live_url) if live_url else None,
        live_on=live_on,
        total=len(sermons),
        sunday=sunday_sermon(),
    )


@app.route("/watch/<int:sermon_id>")
def sermon_detail(sermon_id):
    db = get_db()
    row = db.execute(
        "SELECT * FROM sermons WHERE id=? AND published=1", (sermon_id,)
    ).fetchone()
    if not row:
        abort(404)
    passage_link = parse_reference(row["passage"]) if row["passage"] else None
    return render_template(
        "sermon_detail.html",
        church_name=CHURCH_NAME,
        s=row,
        video_embed=embed_url(row["video_url"]),
        duration=format_duration(row["duration_seconds"]),
        passage_link=passage_link,
    )


@app.route("/watch/podcast.xml")
def podcast_feed():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM sermons WHERE published=1 AND audio_url IS NOT NULL "
        "AND audio_url != '' ORDER BY preached_on DESC"
    ).fetchall()
    site = request.url_root.rstrip("/")
    xml = build_podcast_feed(
        rows,
        church_name=CHURCH_NAME,
        site_url=site,
        feed_url=url_for("podcast_feed", _external=True),
    )
    return Response(xml, mimetype="application/rss+xml")


# ---------- Live Polls ----------
#
# A lightweight "ask the room a question during the service" feature. No
# sign-in required to vote — like the prayer wall's "praying for you" count,
# one vote per browser session is tracked in the session itself rather than
# tied to a member account, so it stays anonymous and frictionless on a
# phone mid-service.

def poll_to_dict(poll_row, option_rows, voted_option_id):
    total = sum(o["vote_count"] for o in option_rows)
    reveal = poll_row["show_results"] == "live" or poll_row["status"] == "closed"
    options = []
    for o in option_rows:
        pct = round(100 * o["vote_count"] / total) if total and reveal else 0
        options.append({
            "id": o["id"],
            "label": o["label"],
            "votes": o["vote_count"] if reveal else None,
            "pct": pct if reveal else None,
        })
    return {
        "id": poll_row["id"],
        "question": poll_row["question"],
        "status": poll_row["status"],
        "options": options,
        "total_votes": total if reveal else None,
        "reveal": reveal,
        "voted_option_id": voted_option_id,
    }


@app.route("/poll/active")
def poll_active():
    """The current live (or just-closed) poll, if any — polled every few
    seconds from the Watch page rather than pushed, since a service-length
    poll doesn't need anything fancier than that."""
    db = get_db()
    poll = db.execute(
        "SELECT * FROM polls WHERE status IN ('live', 'closed') "
        "ORDER BY (status = 'live') DESC, COALESCE(closed_at, opened_at) DESC LIMIT 1"
    ).fetchone()
    if not poll:
        return {"ok": True, "poll": None}, 200

    options = db.execute(
        "SELECT * FROM poll_options WHERE poll_id=? ORDER BY sort_order, id",
        (poll["id"],),
    ).fetchall()
    voted = session.get("poll_votes", {}).get(str(poll["id"]))
    return {"ok": True, "poll": poll_to_dict(poll, options, voted)}, 200


@app.route("/poll/<int:poll_id>/vote", methods=["POST"])
def poll_vote(poll_id):
    voted = session.get("poll_votes", {})
    if str(poll_id) in voted:
        return {"ok": False, "error": "already_voted"}, 200

    db = get_db()
    poll = db.execute(
        "SELECT * FROM polls WHERE id=? AND status='live'", (poll_id,)
    ).fetchone()
    if not poll:
        return {"ok": False, "error": "not_live"}, 404

    data = json_body()
    try:
        option_id = int(data.get("option_id"))
    except (TypeError, ValueError):
        return {"ok": False, "error": "invalid_option"}, 400

    option = db.execute(
        "SELECT * FROM poll_options WHERE id=? AND poll_id=?", (option_id, poll_id)
    ).fetchone()
    if not option:
        return {"ok": False, "error": "invalid_option"}, 400

    db.execute(
        "UPDATE poll_options SET vote_count = vote_count + 1 WHERE id=?", (option_id,)
    )
    db.commit()

    voted[str(poll_id)] = option_id
    session["poll_votes"] = voted

    options = db.execute(
        "SELECT * FROM poll_options WHERE poll_id=? ORDER BY sort_order, id",
        (poll_id,),
    ).fetchall()
    return {"ok": True, "poll": poll_to_dict(poll, options, option_id)}, 200


@app.route("/community")
def community_hub():
    return render_template("community.html", church_name=CHURCH_NAME)


@app.route("/bible")
def bible_hub():
    db = get_db()
    todays_devotional = db.execute(
        "SELECT * FROM devotionals WHERE published=1 ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    return render_template(
        "bible.html",
        church_name=CHURCH_NAME,
        commentary_names={k: v["name"] for k, v in library.COMMENTARIES.items()},
        me_part=reference.part_for(), me_verse=(reference.daily() or {}).get("verse"),
        nt_slugs=[b["slug"] for b in NEW_TESTAMENT],
        verse=verse_of_the_day(),
        devotional=todays_devotional,
        plans=[p for p in plans_engine.catalogue() if p["group"] != "seasonal"],
        church=church_plan(),
        quick_books=QUICK_BOOKS,
        season=everyday_content.season_for(),
    )


@app.route("/bible/search")
def bible_search():
    """One box for both: a reference jumps to the reader; a word searches.

    A reference ("John 3", "John 3:16", "Psalm 23") redirects into the reader.
    Otherwise it's a keyword search, which now runs against the bundled local
    ASV (no API key needed).
    """
    query = (request.args.get("q") or "").strip()

    if not query:
        return render_template(
            "bible_search.html", church_name=CHURCH_NAME,
            query="", results=None, is_reference=False,
            search_enabled=bible_sources.search_available(),
        )

    # 1. Reference? -> jump straight to the reader. Be forgiving: drop any
    #    ":verse" suffix, and accept singular "Psalm" as well as "Psalms".
    # A full reference with a verse ("jn 3:16", "Ps 23:4") lands on that verse.
    whole = refs.parse(query)
    if whole and len(query) <= 40:
        if whole.get("verse"):
            return redirect(url_for("bible_read_chapter", book_slug=whole["slug"], chapter=whole["chapter"], v=whole["verse"]))
        return redirect(url_for("bible_read_chapter", book_slug=whole["slug"], chapter=whole["chapter"]))
    ref_try = query.split(":", 1)[0].strip()
    parsed = parse_reference(ref_try)
    if not parsed and ref_try.lower().startswith("psalm "):
        parsed = parse_reference("Psalms " + ref_try.split(" ", 1)[1])
    if parsed:
        slug, chapter = parsed
        return redirect(url_for("bible_read_chapter", book_slug=slug, chapter=chapter))

    # 2. Keyword search (local ASV; gracefully empty if nothing configured).
    results = bible_sources.search_verses(query)
    return render_template(
        "bible_search.html", church_name=CHURCH_NAME,
        query=query, results=results, is_reference=False,
        search_enabled=bible_sources.search_available(),
        also=_search_also(query),
        groups=_search_everything(query),
    )


def _search_also(query):
    """Beyond verses: Library entries and Greek/Hebrew words that match, so
    one search box finds everything."""
    out = []
    q = query.strip()
    if len(q) < 3 or len(q) > 40:
        return out
    try:
        if library.available():
            found = library.search(q, 3)
            for p in found.get("people", []):
                out.append(("Person", p["name"] + (f" ({p['title']})" if p.get("title") and p["title"] != p["name"] else ""), url_for("person_page", slug=p["slug"])))
            for p in found.get("places", []):
                out.append(("Place", p["name"], url_for("place_page", slug=p["slug"])))
            for t in found.get("topics", []):
                out.append(("Topic", t["name"], url_for("topic_page", slug=t["slug"])))
            for d in found.get("dictionary", []):
                out.append(("Dictionary", d["term"], url_for("dictionary_page", slug=d["slug"])))
        if " " not in q:
            close = re.compile(r"(^|[^a-z])" + re.escape(q.lower()) + r"($|[^a-z])")
            words = [w for w in study_data.search_lexicon(q, limit=8)
                     if close.search(w["meaning"].lower()) or study_data._plain(w["translit"]) == study_data._plain(q)]
            for w in words[:3]:
                out.append((w["language"], f"{w['word']} {w['translit']}: {w['meaning']}", url_for("word_page", code=w["strong"])))
    except Exception:
        app.logger.exception("search extras failed")
    return out[:12]


def _search_everything(query):
    """Everything else one search box can find, grouped: pages of the app,
    sermons, study articles, the reference shelf and classic books.
    [(heading, [(label, detail, href)])]."""
    q = query.strip()
    if len(q) < 2 or len(q) > 60:
        return []
    ql = q.lower()
    groups = []
    try:
        # Pages of the app ("prayer wall", "give", "baptism"), from the guide's map of the app.
        words = set(re.findall(r"[a-z']+", ql))
        pages = []
        for key, title, endpoint, kwargs, about, keys in guide_mod.PLACES:
            kws = [k.strip() for k in keys.split("|")]
            hit = ql in title.lower() or ql in kws or any(len(ql) >= 4 and k.startswith(ql) for k in kws) \
                or (len(words) == 1 and next(iter(words)) in kws)
            if hit:
                try:
                    pages.append((title, about, url_for(endpoint, **kwargs)))
                except Exception:
                    continue
            if len(pages) >= 4:
                break
        if pages:
            groups.append(("In the app", pages))
        # Sermons
        like = "%" + q.replace("%", "").replace("_", "") + "%"
        rows = get_db().execute(
            """SELECT id, title, speaker, passage, preached_on FROM sermons WHERE published=1 AND
               (title LIKE ? OR series LIKE ? OR passage LIKE ? OR speaker LIKE ? OR topic LIKE ? OR summary LIKE ?)
               ORDER BY preached_on DESC LIMIT 5""", (like,) * 6).fetchall()
        if rows:
            groups.append(("Sermons", [(r["title"], " · ".join(x for x in (r["speaker"], r["passage"], pretty_date(r["preached_on"]) if r["preached_on"] else "") if x),
                                         url_for("sermon_detail", sermon_id=r["id"])) for r in rows]))
        # Watch courses
        crs = get_db().execute(
            """SELECT slug, title, teacher, provider FROM watch_courses WHERE status='live' AND
               (title LIKE ? OR teacher LIKE ? OR provider LIKE ? OR about LIKE ?) ORDER BY sort LIMIT 4""", (like,) * 4).fetchall()
        if crs:
            groups.append(("Courses", [(r["title"], " · ".join(x for x in (r["teacher"], r["provider"]) if x),
                                        url_for("watch_course", slug=r["slug"])) for r in crs]))
        # Study articles: themes, people of the Bible, key terms
        arts = []
        for kind, ep, label in (("theme", "theme_page", "Theme"), ("profile", "profile_page", "Person"), ("term", "term_page", "Key term")):
            for r in notes_mod.search(q, (kind,), 3):
                arts.append((r["title"], label, url_for(ep, slug=r["slug"])))
        if arts:
            groups.append(("Study articles", arts[:6]))
        # Reference shelf and classic books
        shelf = [(r["title"], reference.WORKS[r["work"]]["full"], url_for("reference_entry", work=r["work"], slug=r["slug"]))
                 for r in reference.search(q, 4)]
        shelf += [(b["title"], f"{b['author']} · classic book", url_for("classics_book", slug=b["slug"])) for b in classics.search(q, 3)]
        if shelf:
            groups.append(("Reference and classic books", shelf[:6]))
    except Exception:
        app.logger.exception("search everything failed")
    return groups


@app.route("/bible/saved")
def saved_verses():
    # Saved verses now live in "My study", alongside notes and highlights.
    return redirect(url_for("my_study", f="saved"))


@app.route("/bible/study")
def my_study():
    return render_template("my_study.html", church_name=CHURCH_NAME)


@app.route("/bible/journal/write")
def soap_editor():
    return render_template("soap_editor.html", church_name=CHURCH_NAME)


@app.route("/bible/sermon-notes/write")
def talk_editor():
    return render_template("talk_editor.html", church_name=CHURCH_NAME)


# ---------- Reference library (Wave 3) ----------

def _letter():
    l = (request.args.get("l") or "a").lower()[:1]
    return l if l.isalpha() else "a"


LETTERS = "abcdefghijklmnopqrstuvwxyz"


@app.route("/bible/library")
def library_hub():
    if not library.available():
        abort(404)
    return render_template("library/hub.html", topics=library.popular_topics(),
                           commentaries={k: v for k, v in library.COMMENTARIES.items() if library.commentary_available(k)},
                           people=library.notable_people(16), places=library.notable_places(16),
                           creeds=library.creeds()[:4])


@app.route("/api/library/search")
def api_library_search():
    if not library.available():
        return {"ok": False}, 404
    resp = make_response({"ok": True, **library.search(request.args.get("q", ""), 6)})
    resp.headers["Cache-Control"] = "public, max-age=3600"
    return resp


@app.route("/bible/library/sources")
def library_licenses():
    live = bible_sources.licensed_status()["live"]
    return render_template("library/sources.html", licensed=live, esv_notice=bible_sources.ESV_NOTICE,
                           licensed_notes=bible_sources.LAST_COPYRIGHT)


@app.route("/bible/library/search")
def library_search():
    q = request.args.get("q", "")
    results = dict(library.search(q, 40)) if q and library.available() else {}
    if q:
        for kind in ("profile", "theme", "dictionary", "term"):
            rows = notes_mod.search(q, (kind,), 20)
            if kind == "dictionary":
                have = {r["slug"] for r in rows}
                rows += [{"slug": r["slug"], "title": r["term"]} for r in results.get("dictionary", []) if r["slug"] not in have]
                results["dictionary"] = rows
            elif rows:
                results[kind + "s"] = rows
        refs_found = reference.search(q, 12)
        if refs_found:
            results["reference"] = refs_found
        books_found = classics.search(q)
        if books_found:
            results["classics"] = books_found
    return render_template("library/search.html", q=q, results=results, ref_works=reference.WORKS)


@app.route("/bible/dictionary")
def dictionary_index():
    """The Tyndale dictionary first; Easton's (1897) entries fill in anything it doesn't cover."""
    l = _letter()
    modern = notes_mod.index("dictionary", l)
    have = {x["slug"] for x in modern}
    older = [x for x in library.letter_index("dictionary", l, "term", "term") if x["slug"] not in have] if library.available() else []
    items = sorted([{"slug": x["slug"], "title": x["title"]} for x in modern] + [{"slug": x["slug"], "title": x["term"]} for x in older],
                   key=lambda x: x["title"].lower())
    return render_template("library/index.html", kind="dictionary", title="Bible dictionary", letter=l, letters=LETTERS, items=items)


@app.route("/bible/dictionary/<slug>")
def dictionary_page(slug):
    if request.args.get("v") != "easton":
        a = notes_mod.article("dictionary", slug)
        if a:
            return _article_page("dictionary", a)
    d = library.dictionary(slug) if library.available() else None
    if not d:
        abort(404)
    prev, nxt = library.dictionary_neighbours(d["term"])
    links = []
    for s in d["senses"]:
        for kind, target in s.get("links", []):
            item = library.mini_person(target) if kind == "person" else library.mini_place(target)
            if item:
                links.append((kind, item))
    return render_template("library/dictionary.html", d=d, prev=prev, nxt=nxt, links=links,
                           topic=library.topic(slug), modern=notes_mod.article("dictionary", slug) is not None)


@app.route("/bible/topics")
def topics_index():
    l = _letter()
    return render_template("library/index.html", kind="topics", title="Topics", letter=l, letters=LETTERS,
                           items=library.letter_index("topics", l), popular=library.popular_topics())


@app.route("/bible/topics/<slug>")
def topic_page(slug):
    t = library.topic(slug)
    if not t:
        abort(404)
    return render_template("library/topic.html", t=t, d=library.dictionary_for(t["name"]))


@app.route("/bible/people")
def people_index():
    l = request.args.get("l")
    items = library.letter_index("people", _letter(), "name", "verses DESC, name") if l else library.notable_people(60)
    return render_template("library/index.html", kind="people", title="People", letter=(l or "")[:1].lower(),
                           letters=LETTERS, items=items)


@app.route("/bible/people/<slug>")
def person_page(slug):
    p = library.person(slug)
    if not p:
        abort(404)
    return render_template("library/person.html", p=p, events=library.events_for_person(slug)[:30],
                           namesakes=library.namesakes(p["name"], slug),
                           profile=notes_mod.profile_for(p["name"]) if slug == re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-") else None,
                           modern=notes_mod.dictionary_for(p["name"]))


@app.route("/bible/places")
def places_index():
    l = request.args.get("l")
    items = library.letter_index("places", _letter(), "name", "verses DESC, name") if l else library.notable_places(60)
    return render_template("library/index.html", kind="places", title="Places", letter=(l or "")[:1].lower(),
                           letters=LETTERS, items=items)


@app.route("/bible/places/<slug>")
def place_page(slug):
    p = library.place(slug)
    if not p:
        abort(404)
    return render_template("library/place.html", p=p, nearby=library.nearby_places(p["lat"], p["lon"], slug),
                           events=library.events_for_place(slug)[:20])


@app.route("/bible/map")
def bible_map():
    return render_template("library/map.html")


@app.route("/api/map/places")
def api_map_places():
    resp = make_response({"ok": True, "places": library.map_places()})
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@app.route("/bible/journeys")
def journeys():
    rs = library.routes()
    eras = []
    for r in rs:
        if not eras or eras[-1][0] != r["era"]:
            eras.append((r["era"], []))
        eras[-1][1].append(r)
    return render_template("library/journeys.html", eras=eras)


@app.route("/bible/journeys/<slug>")
def journey_page(slug):
    r = library.route(slug)
    if not r:
        abort(404)
    found = refs.parse(r["ref"])
    rs = library.routes()
    i = next((k for k, x in enumerate(rs) if x["slug"] == slug), 0)
    return render_template("library/journey.html", r=r, ref=found,
                           prev=rs[i - 1] if i > 0 else None, nxt=rs[i + 1] if i + 1 < len(rs) else None)


@app.route("/bible/timeline")
def timeline_page():
    eras = []
    for e in library.timeline():
        if not eras or eras[-1][0] != e["era"]:
            eras.append((e["era"], []))
        eras[-1][1].append(e)
    return render_template("library/timeline.html", eras=eras)


@app.route("/bible/harmony")
def harmony_page():
    return render_template("library/harmony.html", rows=library.harmony())


@app.route("/bible/compare")
def compare_passages():
    """Passages side by side (from the harmony or parallels)."""
    labels = [x.strip() for x in request.args.getlist("r") if x and x.strip()]
    if request.args.get("refs"):          # one box, passages split by ";" or new lines
        labels += [x.strip() for x in re.split(r"[;\n]", request.args["refs"]) if x.strip()]
    labels = labels[:4]
    code = request.args.get("translation", DEFAULT_TRANSLATION)
    if code not in PASSAGE_TRANSLATIONS:
        code = "web"
    cols, bad = [], []
    for lab in labels:
        f = refs.parse(lab[:80])
        if not f:
            bad.append(lab[:80])
            continue
        cols.append({"ref": f, "label": f["label"], "verses": _passage_verses(f, code, 120)})
    return render_template("library/compare.html", cols=cols, bad=bad, translation=code,
                           translations=[(c, TRANSLATION_SHORT.get(c, c.upper())) for c in PASSAGE_TRANSLATIONS],
                           title=(request.args.get("t") or "Compare passages")[:80], examples=COMPARE_EXAMPLES)


def _passage_verses(found, code, limit=60):
    slug, ch = found["slug"], found["chapter"]
    book = BOOKS_BY_SLUG[slug]
    v1 = found["verse"] or 1
    ch2 = found["end_chapter"] or ch
    v2 = found["end_verse"] or (found["verse"] if found["verse"] else None)
    out = []
    for c in range(ch, min(ch2, book["chapters"]) + 1):
        data = bible_sources.fetch_chapter_local(slug, book["name"], c, code)
        for v in data["verses"]:
            n = int(v["verse"])
            if (c == ch and n < v1) or (c == ch2 and v2 is not None and n > v2):
                continue
            out.append({"chapter": c, "verse": n, "text": re.sub(r"\s+", " ", v["text"]).strip()})
            if len(out) >= limit:
                return out
    return out


@app.route("/bible/ot-in-nt")
def ot_in_nt_page():
    return render_template("library/ot_in_nt.html", books=library.ot_in_nt())


@app.route("/bible/creeds")
def creeds_index():
    return render_template("library/creeds.html", creeds=library.creeds())


@app.route("/bible/creeds/<slug>")
def creed_page(slug):
    c = library.creed(slug)
    if not c:
        abort(404)
    return render_template("library/creed.html", c=c)


# ---------- Bible College (Wave 3) ----------
@app.template_filter("college_text")
def college_text_filter(text):
    """Teaching notes: '# ' headings, '- ' bullets, blank lines between paragraphs; Bible references linked."""
    from markupsafe import Markup, escape
    out, items = [], []
    def flush():
        if items:
            out.append("<ul>" + "".join(f"<li>{scripture_links_filter(i)}</li>" for i in items) + "</ul>")
            items.clear()
    for block in re.split(r"\n\s*\n", (text or "").strip()):
        for line in block.split("\n"):
            line = line.rstrip()
            if line.startswith("- ") or line.startswith("* "):
                items.append(line[2:].strip()); continue
            flush()
            if line.startswith("#"):
                out.append(f"<h3>{escape(line.lstrip('#').strip())}</h3>")
            elif line.strip():
                out.append(f"<p>{scripture_links_filter(line.strip())}</p>")
        flush()
    return Markup("".join(out))


def _college_staff():
    return bool(session.get("is_admin")) and can_open("admin_college")


def _college_course_or_404(cid):
    c = college.course(get_db(), cid)
    if not c or (c["status"] != "published" and not _college_staff()):
        abort(404)
    return c


def _ref_href(ref):
    f = refs.parse(ref or "")
    return url_for("passage_study_page", ref=ref) if f else None


@app.route("/college")
def college_hub():
    db = get_db()
    return render_template("college/hub.html", courses=college.courses(db, include_drafts=_college_staff()),
                           upcoming=college.next_session(db), staff=_college_staff(), today=date.today().isoformat())


@app.route("/college/<int:cid>")
def college_course(cid):
    c = _college_course_or_404(cid)
    rows = college.sessions(get_db(), cid)
    today = date.today().isoformat()
    nxt = next((s for s in rows if s["session_date"] and s["session_date"] >= today), None)
    return render_template("college/course.html", c=c, sessions=rows, next_s=nxt, staff=_college_staff(), today=today)


@app.route("/college/<int:cid>/<int:n>")
def college_session(cid, n):
    c = _college_course_or_404(cid)
    db = get_db()
    s = college.session(db, cid, n)
    if not s:
        abort(404)
    passage = None
    f = refs.parse(s["passage"] or "")
    if f:
        verses = passage_study.texts(f, ["bsb"]).get("bsb", {})
        passage = {"label": _passage_label(f), "verses": [{"c": c_, "v": v, "t": t} for (c_, v), t in sorted(verses.items())],
                   "study": url_for("passage_study_page", ref=_passage_label(f)),
                   "notes": url_for("notes_chapter", book_slug=f["slug"], chapter=f["chapter"])}
    readings = [{"ref": r.strip(), "href": _ref_href(r.strip())} for r in re.split(r"[;\n]+", s["reading"] or "") if r.strip()]
    rows = college.sessions(db, cid)
    return render_template("college/session.html", c=c, s=s, passage=passage, readings=readings,
                           questions=[q.strip() for q in (s["questions"] or "").split("\n") if q.strip()],
                           prev_s=next((x for x in rows if x["n"] == n - 1), None), next_s=next((x for x in rows if x["n"] == n + 1), None),
                           total=len(rows), staff=_college_staff())


def _college_course_form():
    f = request.form
    vals = {k: (f.get(k) or "").strip() for k in ("title", "subtitle", "description", "term")}
    vals["title"] = vals["title"][:120]
    vals["subtitle"] = vals["subtitle"][:200]
    vals["description"] = vals["description"][:4000]
    vals["term"] = vals["term"][:60]
    vals["status"] = f.get("status") if f.get("status") in college.STATUSES else "draft"
    return vals, (None if vals["title"] else "Give the course a title.")


@app.route("/admin/college")
@login_required
def admin_college():
    return render_template("college/admin_list.html", courses=college.courses(get_db(), include_drafts=True), statuses=college.STATUSES)


@app.route("/admin/college/new", methods=["GET", "POST"])
@app.route("/admin/college/<int:cid>/edit", methods=["GET", "POST"])
@login_required
def admin_college_edit(cid=None):
    db = get_db()
    c = college.course(db, cid) if cid else None
    if cid and not c:
        abort(404)
    if request.method == "POST":
        action = request.form.get("action")
        if action == "delete" and c:
            db.execute("DELETE FROM college_sessions WHERE course_id=?", (cid,))
            db.execute("DELETE FROM college_courses WHERE id=?", (cid,))
            db.commit()
            flash("Course deleted.")
            return redirect(url_for("admin_college"))
        if action == "dates" and c:
            n = college.fill_weekly_dates(db, cid, request.form.get("first_date"))
            db.commit()
            flash(f"Dates filled in for {n} session{'s' if n != 1 else ''}." if n else "Pick a first date (and leave the other sessions' dates empty).")
            return redirect(url_for("admin_college_edit", cid=cid))
        vals, problem = _college_course_form()
        if problem:
            flash(problem)
            return render_template("college/admin_course.html", c=dict(vals, id=cid), sessions=college.sessions(db, cid) if cid else [], statuses=college.STATUSES)
        now = datetime.now().isoformat(timespec="seconds")
        if c:
            db.execute("UPDATE college_courses SET title=?, subtitle=?, description=?, term=?, status=?, updated_at=? WHERE id=?",
                       (vals["title"], vals["subtitle"], vals["description"], vals["term"], vals["status"], now, cid))
        else:
            cid = db.execute("INSERT INTO college_courses (title, subtitle, description, term, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
                             (vals["title"], vals["subtitle"], vals["description"], vals["term"], vals["status"], now, now)).lastrowid
        db.commit()
        flash("Course saved.")
        return redirect(url_for("admin_college_edit", cid=cid))
    c = c or {"id": None, "title": "", "subtitle": "", "description": "", "term": "", "status": "draft"}
    return render_template("college/admin_course.html", c=c, sessions=college.sessions(db, cid) if cid else [], statuses=college.STATUSES)


@app.route("/admin/college/<int:cid>/session/new", methods=["GET", "POST"])
@app.route("/admin/college/<int:cid>/session/<int:sid>", methods=["GET", "POST"])
@login_required
def admin_college_session(cid, sid=None):
    db = get_db()
    c = college.course(db, cid)
    if not c:
        abort(404)
    s = db.execute("SELECT * FROM college_sessions WHERE id=? AND course_id=?", (sid, cid)).fetchone() if sid else None
    if sid and not s:
        abort(404)
    if request.method == "POST":
        if request.form.get("action") == "delete" and s:
            db.execute("DELETE FROM college_sessions WHERE id=?", (sid,))
            college.renumber(db, cid)
            db.commit()
            flash("Session deleted.")
            return redirect(url_for("admin_college_edit", cid=cid))
        f = request.form
        vals = {"title": (f.get("title") or "").strip()[:120], "passage": (f.get("passage") or "").strip()[:80],
                "reading": (f.get("reading") or "").strip()[:300], "teaching": (f.get("teaching") or "").strip()[:20000],
                "questions": (f.get("questions") or "").strip()[:3000], "link_label": (f.get("link_label") or "").strip()[:60],
                "link_url": (f.get("link_url") or "").strip()[:300], "session_date": (f.get("session_date") or "").strip()[:10] or None}
        problem = None
        if not vals["title"]:
            problem = "Give the session a title."
        elif vals["passage"] and not refs.parse(vals["passage"]):
            problem = f"Couldn't understand the passage “{vals['passage']}”. Try something like “John 3:1-21”."
        elif vals["link_url"] and not vals["link_url"].startswith("https://"):
            problem = "The link must be a full https:// address."
        elif vals["session_date"]:
            try:
                date.fromisoformat(vals["session_date"])
            except ValueError:
                problem = "That date doesn't look right."
        if problem:
            flash(problem)
            return render_template("college/admin_session.html", c=c, s=dict(vals, id=sid, n=s["n"] if s else None))
        now = datetime.now().isoformat(timespec="seconds")
        cols = list(vals)
        if s:
            db.execute(f"UPDATE college_sessions SET {', '.join(k + '=?' for k in cols)}, updated_at=? WHERE id=?", [vals[k] for k in cols] + [now, sid])
        else:
            n = (db.execute("SELECT MAX(n) FROM college_sessions WHERE course_id=?", (cid,)).fetchone()[0] or 0) + 1
            db.execute(f"INSERT INTO college_sessions (course_id, n, {', '.join(cols)}, updated_at) VALUES (?, ?, {', '.join('?' * len(cols))}, ?)",
                       [cid, n] + [vals[k] for k in cols] + [now])
        db.commit()
        flash("Session saved.")
        return redirect(url_for("admin_college_edit", cid=cid))
    s = dict(s) if s else {"id": None, "n": None, "title": "", "passage": "", "reading": "", "teaching": "", "questions": "",
                           "link_label": "", "link_url": "", "session_date": None}
    return render_template("college/admin_session.html", c=c, s=s)


# ---------- Passage study workspace (Wave 3) ----------
def _passage_label(found):
    book = BOOKS_BY_SLUG[found["slug"]]["name"]
    c1, v1 = found["chapter"], found.get("verse")
    c2, v2 = found.get("end_chapter") or c1, found.get("end_verse")
    if not v1:
        return f"{book} {c1}" + (f"–{c2}" if c2 != c1 else "")
    if c2 != c1:
        return f"{book} {c1}:{v1}–{c2}:{v2 or ''}".rstrip(":")
    return f"{book} {c1}:{v1}" + (f"–{v2}" if v2 and v2 != v1 else "")


@app.route("/bible/offline")
def offline_packs():
    """Save whole books for reading and study without a connection."""
    books = [{"slug": b["slug"], "name": b["name"], "chapters": b["chapters"], "nt": b in NEW_TESTAMENT} for b in ALL_BOOKS]
    return render_template("offline_packs.html", books=books, start=request.args.get("book") or "")


@app.route("/bible/passage")
def passage_study_page():
    """Study one passage: translations side by side, notes, key words, cross
    references, the early church, guided study and questions."""
    raw = (request.args.get("ref") or "").strip()[:60]
    found = refs.parse(raw) if raw else None
    codes = [c for c in (request.args.get("t") or "bsb").split(",") if c in passage_study.TRANSLATIONS][:3] or ["bsb"]
    if not found:
        return render_template("passage.html", found=None, raw=raw, bad=bool(raw), translations=passage_study.TRANSLATIONS,
                               codes=codes, suggestions=PASSAGE_SUGGESTIONS)
    if found.get("verse") and not found.get("end_verse") and request.args.get("whole") == "1":
        c1, v1, c2, v2 = passage_study.section_for(found["slug"], found["chapter"], found["verse"])
        found = dict(found, chapter=c1, verse=v1, end_chapter=c2, end_verse=v2)
    verses, capped = passage_study._verse_list(found)
    if not verses:
        abort(404)
    label = _passage_label(found)
    by_code = passage_study.texts(found, codes)
    rows = [{"c": c, "v": v, "lines": [(code, passage_study.TRANSLATIONS[code], by_code.get(code, {}).get((c, v), "")) for code in codes]}
            for c, v in verses]
    main = by_code.get(codes[0], {})
    people, places = passage_study.people_places(found)
    single = found.get("verse") and not found.get("end_verse")
    section = passage_study.section_for(found["slug"], found["chapter"], found["verse"]) if single else None
    return render_template(
        "passage.html", found=found, raw=raw, label=label, rows=rows, codes=codes, capped=capped,
        translations=passage_study.TRANSLATIONS, book=BOOKS_BY_SLUG[found["slug"]],
        notes=passage_study.study_notes(found), words=passage_study.key_words(found),
        xrefs=passage_study.cross_refs(found), early=passage_study.early_church(found),
        people=people, places=places, related=passage_study.related(found), notes_kinds=notes_mod.KINDS,
        repeated=passage_study.repeated_english(main), guide=passage_study.GUIDE,
        has_intro=notes_mod.has_intro(found["slug"]), can_ask=study_assistant.is_available(),
        section=section, chapters=sorted({c for c, _ in verses}), bp_video=bibleproject.for_chapter(found["slug"], verses[0][0]),
        parallels=_passage_parallels(found["slug"], verses),
        study_data={"ref": label, "slug": found["slug"], "chapter": verses[0][0], "verse": verses[0][1],
                    "text": " ".join(f"{v}" + " " + main.get((c, v), "") for c, v in verses)[:4000]})


PASSAGE_SUGGESTIONS = ["Psalm 23", "John 3:1-21", "Romans 8:28-39", "Philippians 2:1-11", "Genesis 1", "Isaiah 53",
                       "Matthew 5:1-12", "Luke 15:11-32", "1 Corinthians 13", "Ruth 1"]


@app.route("/api/passage/ask", methods=["POST"])
def api_passage_ask():
    """A question about a passage, answered only from the app's study notes."""
    data = json_body()
    q = (data.get("q") or "").strip()[:500]
    found = refs.parse((data.get("ref") or "")[:60])
    if not q or not found:
        return {"ok": False, "error": "Ask a question about a passage."}, 400
    if not study_assistant.is_available():
        return {"ok": False, "error": "The study helper isn't switched on."}, 503
    if rate_limited("passage_ai", client_ip(), limit=20, window_seconds=3600):
        return {"ok": False, "error": "That's a lot of questions for one hour. Please try again a little later."}, 429
    label = _passage_label(found)
    main = passage_study.texts(found, ["bsb"]).get("bsb", {})
    passage_text = " ".join(f"{v} {t}" for (c, v), t in sorted(main.items()))
    sources = []
    for n in passage_study.study_notes(found)[:14]:
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(n["html"]))).strip()
        title = ("Biblica section note on " if n["source"] == "biblica" else "Tyndale study note on ") + \
            f"{BOOKS_BY_SLUG[found['slug']]['name']} {n['c1']}:{n['v1']}" + (f"–{n['v2']}" if n["v2"] != n["v1"] or n["c2"] != n["c1"] else "")
        sources.append({"title": title, "text": text,
                        "url": url_for("notes_chapter", book_slug=found["slug"], chapter=n["c1"]) + f"#v{n['v1']}"})
    for a in passage_study.related(found, 4):
        art = notes_mod.article(a["kind"], a["slug"])
        if art:
            text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(art["html"]))).strip()
            sources.append({"title": f"{notes_mod.KINDS[a['kind']]['one']}: {art['title']}", "text": text,
                            "url": url_for(a["kind"] + "_page", slug=a["slug"])})
    ok, answer = study_assistant.ask_grounded(q, label, passage_text, sources)
    cited = sorted({int(m) for m in re.findall(r"\[(\d+)\]", answer or "") if 0 < int(m) <= len(sources)})
    return {"ok": ok, "answer": answer, "sources": [{"n": i, "title": sources[i - 1]["title"], "url": sources[i - 1]["url"]} for i in cited]}


# ---------- Study notes, introductions, themes, profiles, key terms (Wave 2) ----------
def _note_label(n, book_name):
    if n["c1"] == n["c2"]:
        return f"{n['c1']}:{n['v1']}" + (f"–{n['v2']}" if n["v2"] != n["v1"] else "")
    return f"{n['c1']}:{n['v1']}–{n['c2']}:{n['v2']}"


@app.route("/bible/notes/<book_slug>/<int:chapter>")
def notes_chapter(book_slug, chapter):
    """Study notes for a chapter: Tyndale's verse notes with Biblica's section notes."""
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book or not 1 <= chapter <= book["chapters"] or not notes_mod.available():
        abort(404)
    items = notes_mod.chapter_notes(book_slug, chapter)
    used = set()
    for n in items:       # each verse's first verse note gets #v<verse>; everything else its own id
        n["label"] = _note_label(n, book["name"])
        a = f"v{n['v1']}"
        n["anchor"] = a if n["source"] == "tyndale" and n["c1"] == chapter and a not in used else f"n{n['id']}"
        used.add(n["anchor"])
    return render_template("notes_chapter.html", book=book, chapter=chapter, items=items,
                           tyndale=sum(1 for n in items if n["source"] == "tyndale"),
                           biblica=sum(1 for n in items if n["source"] == "biblica"),
                           has_intro=notes_mod.has_intro(book_slug), sources=notes_mod.SOURCES,
                           prev_ch=_chapter_step(book_slug, chapter, -1), next_ch=_chapter_step(book_slug, chapter, 1))


def _passage_parallels(slug, verses, limit=3):
    """The same event in the other Gospels, from the harmony, for "Compare with".
    Only whole sections: the harmony row that overlaps the passage most."""
    if slug not in ("matthew", "mark", "luke", "john") or not verses or not library.available():
        return []
    want = set(verses)
    best, score = None, 0
    for row in library.harmony():
        f = refs.parse((row.get(slug) or "").replace("–", "-"))
        if not f:
            continue
        c1, v1 = f["chapter"], f["verse"] or 1
        c2, v2 = f["end_chapter"] or c1, f["end_verse"] or f["verse"] or 999
        n = sum(1 for c, v in want if (c1, v1) <= (c, v) <= (c2, v2))
        if n > score:
            best, score = row, n
    if not best:
        return []
    return [best[g].replace("–", "-") for g in ("matthew", "mark", "luke", "john") if g != slug and best.get(g)][:limit]


# ------------------------------------------------------------ reference shelf

@app.route("/bible/reference")
def reference_hub():
    if not reference.available():
        abort(404)
    today = reference.daily()
    return render_template("library/reference_hub.html", works=reference.WORKS, counts=reference.counts(), today=today)


@app.route("/bible/reference/<work>")
def reference_index(work):
    if work not in reference.WORKS or not reference.available():
        abort(404)
    l = _letter()
    return render_template("library/reference_index.html", work=work, info=reference.WORKS[work], letter=l, letters=LETTERS,
                           items=reference.letter_index(work, l))


@app.route("/bible/reference/<work>/<slug>")
def reference_entry(work, slug):
    e = reference.entry(work, slug[:120])
    if not e:
        abort(404)
    prev, nxt = reference.neighbours(work, e["title"])
    modern = notes_mod.article("dictionary", slug) is not None
    easton = library.dictionary(slug) if library.available() else None
    topic = library.topic(slug) if library.available() else None
    return render_template("library/reference_entry.html", e=e, work=work, info=reference.WORKS[work], prev=prev, nxt=nxt,
                           also=reference.also_in(slug, work), modern=modern, easton=bool(easton), topic=topic)


@app.route("/bible/morning-evening")
def morning_evening():
    day = request.args.get("day") or None
    if day and not re.fullmatch(r"\d\d-\d\d", day):
        day = None
    part = request.args.get("part")
    r = reference.daily(day, part if part in ("morning", "evening") else None)
    if not r:
        abort(404)
    d = r["day"]
    if r["part"] == "morning":
        prev = (reference.step_day(d, -1), "evening")
        nxt = (d, "evening")
    else:
        prev = (d, "morning")
        nxt = (reference.step_day(d, 1), "morning")
    return render_template("library/morning_evening.html", r=r, info=reference.DAILY, label=reference.day_label(d),
                           prev=(prev[0], prev[1], f"{prev[1].capitalize()}, {reference.day_label(prev[0])}"),
                           nxt=(nxt[0], nxt[1], f"{nxt[1].capitalize()}, {reference.day_label(nxt[0])}"),
                           is_today=d == date.today().strftime("%m-%d"))


# ------------------------------------------------------------ audio Bible

_AUDIO_SLOTS = _threading.BoundedSemaphore(2)   # saving for offline: at most two downloads through the server at once


@app.route("/audio/bible/<reader>/<book_slug>/<int:chapter>.mp3")
def audio_bible_file(reader, book_slug, chapter):
    """One chapter of the recorded Bible. Normally a redirect to the audio host;
    ?save=1 (saving for offline) or AUDIO_PROXY=on fetches it through here."""
    if not audio_bible.valid(reader, book_slug, chapter):
        abort(404)
    urls = audio_bible.sources(reader, book_slug, chapter)
    if request.args.get("alt") == "1":
        urls = urls[1:] + urls[:1]
    if not (request.args.get("save") == "1" or audio_bible.proxy_all()):
        resp = redirect(urls[0], 302)
        resp.headers["Cache-Control"] = "public, max-age=86400"
        return resp
    if not _AUDIO_SLOTS.acquire(timeout=20):
        resp = make_response("Busy, try again shortly", 503)
        resp.headers["Retry-After"] = "5"
        return resp
    released = [False]

    def release():
        if not released[0]:
            released[0] = True
            _AUDIO_SLOTS.release()
    up = None
    try:
        headers = {"User-Agent": "ClearspringChurchApp/1.0 (+church app; audio Bible)"}
        rng = request.headers.get("Range", "")
        if re.fullmatch(r"bytes=\d*-\d*", rng) and request.args.get("save") != "1":
            headers["Range"] = rng
        for u in urls:
            try:
                r = requests.get(u, headers=headers, stream=True, timeout=(6, 30))
            except requests.RequestException:
                continue
            if r.status_code in (200, 206) and "html" not in r.headers.get("Content-Type", ""):
                up = r
                break
            r.close()
        if up is None:
            release()
            abort(502)
    except Exception:
        release()
        raise

    def body():
        try:
            for chunk in up.iter_content(65536):
                yield chunk
        finally:
            up.close()
            release()
    out = Response(stream_with_context(body()), status=up.status_code, mimetype="audio/mpeg", direct_passthrough=True)
    for h in ("Content-Length", "Content-Range"):
        if up.headers.get(h):
            out.headers[h] = up.headers[h]
    out.headers["Accept-Ranges"] = "bytes"
    out.headers["Cache-Control"] = "public, max-age=2592000"
    return out


@app.route("/bible/listen")
def bible_listen():
    """The audio Bible player: keeps going chapter after chapter, with the screen locked."""
    start = None
    book_slug = request.args.get("book", "")
    try:
        chapter = int(request.args.get("chapter", "0"))
    except ValueError:
        chapter = 0
    if book_slug in BOOKS_BY_SLUG and 1 <= chapter <= BOOKS_BY_SLUG[book_slug]["chapters"]:
        start = {"slug": book_slug, "chapter": chapter}
    return render_template("listen.html", books=audio_bible.books_for_js(), readers=audio_bible.READERS,
                           readers_js={k: v[0] for k, v in audio_bible.READERS.items()},
                           default_reader=audio_bible.DEFAULT_READER, credit=audio_bible.CREDIT, start=start,
                           ot=OLD_TESTAMENT, nt=NEW_TESTAMENT)


# ------------------------------------------------------------ classics

@app.route("/library/classics")
def classics_shelf():
    if not classics.available():
        abort(404)
    return render_template("library/classics.html", books=classics.books(), shelves=classics.shelves())


@app.route("/library/classics/<slug>")
def classics_book(slug):
    b = classics.book(slug)
    if not b:
        abort(404)
    return render_template("library/classics_book.html", b=b, contents=classics.contents(slug))


@app.route("/library/classics/<slug>/<int:n>")
def classics_chapter(slug, n):
    b = classics.book(slug)
    ch = classics.chapter(slug, n) if b else None
    if not ch:
        abort(404)
    toc = classics.contents(slug)
    return render_template("library/classics_chapter.html", b=b, ch=ch, total=len(toc),
                           prev=toc[n - 2] if n > 1 else None, nxt=toc[n] if n < len(toc) else None)


@app.route("/bible/videos")
def bible_videos():
    """BibleProject's book overviews, linked by book."""
    rows = [{"book": b, "videos": bibleproject.for_book(b["slug"])} for b in ALL_BOOKS]
    seen, out = set(), []
    for r in rows:     # books sharing one video (1 & 2 Kings) list it once
        key = tuple(v["url"] for v in r["videos"])
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return render_template("bible_videos.html", rows=out, whole=[{"title": t, "url": bibleproject.BASE + p} for t, p in bibleproject.WHOLE],
                           credit=bibleproject.CREDIT, nt_start=NEW_TESTAMENT[0]["slug"])


@app.route("/bible/intro")
def intro_index():
    return render_template("intro_index.html", ot=OLD_TESTAMENT, nt=NEW_TESTAMENT)


@app.route("/bible/intro/<book_slug>")
def book_intro(book_slug):
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book:
        abort(404)
    source = request.args.get("source") if request.args.get("source") in ("tyndale", "biblica") else "tyndale"
    body = notes_mod.intro(book_slug, source)
    other = "biblica" if source == "tyndale" else "tyndale"
    if body is None:
        body, source, other = notes_mod.intro(book_slug, other), other, None
        if body is None:
            abort(404)
    elif notes_mod.intro(book_slug, other) is None:
        other = None
    idx = next(i for i, b in enumerate(ALL_BOOKS) if b["slug"] == book_slug)
    return render_template("book_intro.html", book=book, body=body, source=source, other=other, sources=notes_mod.SOURCES,
                           videos=bibleproject.for_book(book_slug), bp_credit=bibleproject.CREDIT,
                           prev_b=ALL_BOOKS[idx - 1] if idx else None, next_b=ALL_BOOKS[idx + 1] if idx + 1 < len(ALL_BOOKS) else None)


def _article_page(kind, a):
    if a.get("redirect"):
        return redirect(a["redirect"], 301)
    info = notes_mod.KINDS[kind]
    refs_out, seen = [], set()
    for r in a["refs_list"]:
        key = (r["book"], r["c1"], r["v1"])
        if key in seen or r["book"] not in BOOKS_BY_SLUG:
            continue
        seen.add(key)
        name = BOOKS_BY_SLUG[r["book"]]["name"]
        label = f"{name} {r['c1']}:{r['v1']}" + (f"–{r['v2']}" if r["c2"] == r["c1"] and r["v2"] != r["v1"] else (f"–{r['c2']}:{r['v2']}" if r["c2"] != r["c1"] else ""))
        refs_out.append({"label": label, "href": url_for("verse_page", book_slug=r["book"], chapter=r["c1"], verse=max(1, r["v1"]))})
    person = place = easton = None
    if library.available():
        base = re.sub(r"\s*\((person|people|place)\)\s*$", "", a["title"], flags=re.I)
        lib_slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
        if kind in ("profile", "dictionary") and not a["title"].lower().endswith("(place)"):
            person = library.mini_person(lib_slug)
        if kind == "dictionary" and not a["title"].lower().endswith("(person)"):
            place = library.mini_place(lib_slug)
        if kind == "dictionary":
            easton = library.dictionary(a["slug"])
    profile = notes_mod.profile_for(re.sub(r"\s*\(.*\)$", "", a["title"])) if kind == "dictionary" else None
    source = notes_mod.SOURCES["tyndale-dict" if kind == "dictionary" else ("biblica" if a["source"] == "biblica" else "tyndale")]
    return render_template("library/article.html", a=a, kind=kind, info=info, refs=refs_out[:24], more_refs=max(0, len(refs_out) - 24),
                           person=person, place=place, easton=easton, profile=profile, source=source)


def _article_route(kind):
    def view(slug):
        a = notes_mod.article(kind, slug)
        if not a:
            abort(404)
        return _article_page(kind, a)
    return view


def _articles_index(kind):
    def view():
        if not notes_mod.available():
            abort(404)
        return render_template("library/articles.html", kind=kind, info=notes_mod.KINDS[kind], items=notes_mod.index(kind),
                               source=notes_mod.SOURCES["biblica" if kind == "term" else "tyndale"])
    return view


for _k, _path in (("theme", "themes"), ("profile", "profiles"), ("term", "terms")):
    app.add_url_rule(f"/bible/{_path}", f"{_k}s_index", _articles_index(_k))
    app.add_url_rule(f"/bible/{_path}/<slug>", f"{_k}_page", _article_route(_k))


@app.route("/bible/commentary/<source>/<book_slug>/<int:chapter>")
def commentary_page(source, book_slug, chapter):
    if source not in library.COMMENTARIES or book_slug not in BOOKS_BY_SLUG or not library.commentary_available(source):
        abort(404)
    book = BOOKS_BY_SLUG[book_slug]
    if not 1 <= chapter <= book["chapters"] or (source == "tdavid" and book_slug != "psalms"):
        abort(404)
    sections = library.commentary_chapter(source, book_slug, chapter)
    all_sources = library.commentary_sources_for(book_slug, chapter)
    if source not in all_sources:
        all_sources = [source] + all_sources
    prev_ch = _chapter_step(book_slug, chapter, -1)
    next_ch = _chapter_step(book_slug, chapter, 1)
    return render_template("library/commentary.html", source=source, info=library.COMMENTARIES[source],
                           commentaries=library.COMMENTARIES, all_sources=all_sources,
                           book=book, chapter=chapter, sections=sections,
                           prev_ch=prev_ch, next_ch=next_ch)


@app.errorhandler(404)
def page_not_found(e):
    """A friendly page instead of the server's bare "Not Found"; data stays data."""
    if request.path.startswith(("/api/", "/audio/", "/games/rockslinger/build/", "/static/")) or request.accept_mimetypes.best == "application/json":
        return {"ok": False, "error": "not found"}, 404
    try:
        return render_template("error_404.html"), 404
    except Exception:
        return "Page not found", 404


@app.errorhandler(500)
def server_error(e):
    """Self-contained (no database, no base layout), so it still shows when those are what failed."""
    if request.path.startswith("/api/"):
        return {"ok": False, "error": "server error"}, 500
    return render_template("error_500.html"), 500


@app.context_processor
def inject_ref_also():
    return {"ref_also_for": lambda slug, exclude=None: reference.also_in(slug or "", exclude)}


@app.template_filter("scripture_links")
def scripture_links_filter(text):
    """Plain text → escaped HTML with Bible references linked."""
    from markupsafe import Markup, escape
    text = text or ""
    out, at = [], 0
    for r in refs.find(text):
        frag = text[r["start"]:r["end"]]
        base = re.sub(r"^(?:[123]|i{1,3}|1st|2nd|3rd|first|second|third)\s*", "", frag, flags=re.I)
        if not base[:1].isupper():
            continue
        out.append(escape(text[at:r["start"]]))
        href = url_for("verse_page", book_slug=r["slug"], chapter=r["chapter"], verse=r["verse"]) if r["verse"] \
            else url_for("bible_read_chapter", book_slug=r["slug"], chapter=r["chapter"])
        out.append(Markup('<a class="ref-link" href="%s">%s</a>') % (href, frag))
        at = r["end"]
    out.append(escape(text[at:]))
    return Markup("").join(out)


@app.template_filter("paras")
def paras_filter(text):
    from markupsafe import Markup
    parts = [p.strip() for p in re.split(r"\n\s*\n", text or "") if p.strip()]
    return Markup("").join(Markup("<p>%s</p>") % scripture_links_filter(p) for p in parts)


@app.route("/bible-refs.js")
def bible_refs_data():
    """Book names and abbreviations for the browser's reference finder."""
    body = "window.BIBLE_REF_DATA=" + json.dumps(refs.for_js(), separators=(",", ":")) + ";"
    resp = make_response(body)
    resp.headers["Content-Type"] = "application/javascript; charset=utf-8"
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


PASSAGE_TRANSLATIONS = ("web", "webbe", "bsb", "asv", "ylt", "darby")
TRANSLATION_SHORT = {"web": "WEB", "webbe": "WEB (British)", "bsb": "BSB", "asv": "ASV", "ylt": "Young's Literal", "darby": "Darby"}
COMPARE_EXAMPLES = [  # passages the Bible itself tells twice
    ("The Lord's Prayer", ["Matthew 6:9-13", "Luke 11:2-4"]),
    ("The Ten Commandments", ["Exodus 20:1-17", "Deuteronomy 5:6-21"]),
    ("The Beatitudes", ["Matthew 5:1-12", "Luke 6:20-26"]),
    ("Feeding the five thousand", ["Matthew 14:13-21", "Mark 6:30-44", "Luke 9:10-17", "John 6:1-14"]),
    ("The Last Supper", ["Matthew 26:26-29", "Mark 14:22-25", "Luke 22:14-20", "1 Corinthians 11:23-26"]),
    ("David's song of deliverance", ["2 Samuel 22:1-20", "Psalm 18:1-19"]),
    ("Swords into ploughshares", ["Isaiah 2:1-4", "Micah 4:1-4"]),
    ("Paul's conversion, told three times", ["Acts 9:1-19", "Acts 22:6-16", "Acts 26:12-18"]),
]


@app.route("/api/passage")
def api_passage():
    """The text of a reference such as 'John 15:1-8', from a bundled Bible.
    Used by the study journal to fill in the passage being studied."""
    if request.args.get("slug") in BOOKS_BY_SLUG:
        slug_ = request.args["slug"]
        ch_ = request.args.get("ch", type=int) or 1
        v_ = request.args.get("v", type=int)
        found = refs.parse(f"{BOOKS_BY_SLUG[slug_]['name']} {ch_}" + (f":{v_}" if v_ else ""))
    else:
        found = refs.parse(request.args.get("ref", ""))
    if not found:
        return {"ok": False, "error": "I couldn't find a Bible reference in that."}, 400
    code = request.args.get("translation", "web")
    if code not in PASSAGE_TRANSLATIONS or not bible_sources.has_local(code):
        code = "web"
    slug, ch = found["slug"], found["chapter"]
    book = BOOKS_BY_SLUG[slug]
    v1 = found["verse"] or 1
    ch2 = found["end_chapter"] or ch
    v2 = found["end_verse"] or (found["verse"] if found["verse"] else None)
    verses = []
    for c in range(ch, min(ch2, book["chapters"]) + 1):
        data = bible_sources.fetch_chapter_local(slug, book["name"], c, code)
        for v in data["verses"]:
            n = int(v["verse"])
            if c == ch and n < v1:
                continue
            if c == ch2 and v2 is not None and n > v2:
                continue
            verses.append({"chapter": c, "verse": n, "text": re.sub(r"\s+", " ", v["text"]).strip()})
            if len(verses) >= 60:
                break
        if len(verses) >= 60:
            break
    if not verses:
        return {"ok": False, "error": "That passage doesn't seem to exist."}, 404
    multi = len({v["chapter"] for v in verses}) > 1
    text = " ".join((f"[{v['chapter']}:{v['verse']}] " if multi else (f"[{v['verse']}] " if len(verses) > 1 else "")) + v["text"] for v in verses)
    resp = make_response({
        "ok": True, "ref": found["label"], "slug": slug, "chapter": ch, "verse": found["verse"],
        "text": text, "verses": verses, "translation": code,
        "truncated": len(verses) >= 60,
    })
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@app.route("/api/sermon-titles")
def api_sermon_titles():
    """Titles for the sermons someone has taken notes on (My study list)."""
    ids = [int(x) for x in (request.args.get("ids") or "").split(",") if x.strip().isdigit()][:200]
    if not ids:
        return {"ok": True, "items": {}}
    rows = get_db().execute(
        f"SELECT id, title, speaker, preached_on FROM sermons WHERE published=1 AND id IN ({','.join('?' * len(ids))})",
        ids,
    ).fetchall()
    return {"ok": True, "items": {str(r["id"]): {"title": r["title"], "speaker": r["speaker"], "date": r["preached_on"]} for r in rows}}


# ---------- Reading Plans ----------

def _resolve_passages(refs):
    """Turn a list of references into dicts with reader links."""
    resolved = []
    for ref in refs:
        parsed = parse_reference(ref)
        if parsed:
            slug, chapter = parsed
            resolved.append({"ref": ref, "slug": slug, "chapter": chapter})
        else:
            resolved.append({"ref": ref, "slug": None, "chapter": None})
    return resolved


def church_plan():
    """The plan the whole church is reading together, if the staff have set one."""
    try:
        cp = json.loads(get_setting("church_plan", "") or "null")
    except (ValueError, TypeError):
        return None
    if not cp or not cp.get("slug"):
        return None
    summary = plans_engine.summary(cp["slug"])
    if not summary:
        return None
    return {**summary, "start": cp.get("start"), "note": cp.get("note", "")}


@app.route("/bible/plans")
def reading_plans():
    cat = plans_engine.catalogue()
    groups = [(label, [p for p in cat if p["group"] == g]) for g, label in plans_engine.GROUPS]
    return render_template("reading_plans.html", church_name=CHURCH_NAME, groups=groups,
                           church=church_plan())


@app.route("/bible/plans/new")
def plan_builder():
    return render_template("plan_builder.html", books=ALL_BOOKS)


@app.route("/bible/plans/mine/<plan_id>")
def custom_plan(plan_id):
    if not re.fullmatch(r"[a-z0-9]{4,24}", plan_id):
        abort(404)
    return render_template("plan.html", plan=None, custom_id=plan_id, church=church_plan())


@app.route("/bible/plans/<plan_slug>")
def reading_plan_detail(plan_slug):
    plan = plans_engine.builtin(plan_slug)
    if not plan:
        abort(404)
    return render_template("plan.html", plan=plans_engine.for_client(plan), custom_id=None,
                           summary=plans_engine.summary(plan_slug), church=church_plan(),
                           video_embed=embed_url(plan.get("video_url")))


@app.route("/api/plans/<plan_slug>")
def api_plan(plan_slug):
    plan = plans_engine.builtin(plan_slug)
    if not plan:
        return {"ok": False}, 404
    resp = make_response({"ok": True, "plan": plans_engine.for_client(plan)})
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@app.route("/api/plans/build", methods=["POST"])
def api_plan_build():
    d = json_body()
    try:
        plan = plans_engine.build(d.get("scope", "bible"), d.get("books"), d.get("order", "canonical"),
                                  d.get("days", 365), d.get("title"))
    except (ValueError, TypeError) as e:
        return {"ok": False, "error": str(e) or "That plan couldn't be made."}, 400
    return {"ok": True, "plan": plan}


@app.route("/bible/today")
def bible_today():
    return render_template("today.html", verse=verse_of_the_day(), church=church_plan(),
                           season=everyday_content.season_for(), sunday=sunday_sermon())


@app.route("/bible/stats")
def reading_stats():
    return render_template("reading_stats.html",
                           books=[{"slug": b["slug"], "name": b["name"], "chapters": b["chapters"]} for b in ALL_BOOKS])


@app.route("/bible/plans/reminder.ics")
def plan_reminder_ics():
    """A repeating calendar reminder to read — works on any phone, no account needed."""
    t = request.args.get("time", "07:30")
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", t):
        t = "07:30"
    days = "".join(sorted(set(c for c in request.args.get("days", "0123456") if c in "0123456"))) or "0123456"
    title = (request.args.get("title") or "Bible reading")[:80]
    start = request.args.get("start") or date.today().isoformat()
    try:
        d0 = datetime.strptime(start, "%Y-%m-%d")
    except ValueError:
        d0 = datetime.combine(date.today(), datetime.min.time())
    byday = ",".join(["MO", "TU", "WE", "TH", "FR", "SA", "SU"][(int(c) + 6) % 7] for c in days)  # JS: 0=Sunday
    from ics import escape_ics
    url = url_for("bible_today", _external=True)
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Clearspring//Reading reminder//EN", "CALSCALE:GREGORIAN",
             "BEGIN:VEVENT", f"UID:reading-{secrets.token_hex(6)}@clearspring", f"DTSTAMP:{stamp}",
             f"DTSTART;TZID=Europe/London:{d0.strftime('%Y%m%d')}T{t.replace(':', '')}00",
             "DURATION:PT15M", f"RRULE:FREQ=WEEKLY;BYDAY={byday}",
             f"SUMMARY:{escape_ics(title)}", f"DESCRIPTION:{escape_ics('Today’s reading: ' + url)}", f"URL:{url}",
             "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{escape_ics(title)}", "TRIGGER:PT0M", "END:VALARM",
             "END:VEVENT", "END:VCALENDAR"]
    resp = make_response("\r\n".join(lines))
    resp.headers["Content-Type"] = "text/calendar; charset=utf-8"
    resp.headers["Content-Disposition"] = 'attachment; filename="bible-reading.ics"'
    return resp


@app.route("/admin/church-plan", methods=["GET", "POST"])
@login_required
def admin_church_plan():
    if request.method == "POST":
        if request.form.get("clear"):
            set_setting("church_plan", "")
            flash("The church plan has been taken down.")
        else:
            slug = request.form.get("slug", "")
            start = request.form.get("start", "")
            if not plans_engine.summary(slug) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", start):
                flash("Choose a plan and a start date.")
            else:
                set_setting("church_plan", json.dumps({"slug": slug, "start": start,
                                                       "note": request.form.get("note", "").strip()[:280]}))
                flash("Saved. Everyone will see the church plan on the Bible and Plans pages.")
        return redirect(url_for("admin_church_plan"))
    return render_template("admin_church_plan.html", plans=plans_engine.catalogue(), current=church_plan(),
                           today=date.today().isoformat())


@app.route("/cron/reminders")
def cron_reminders():
    """Send daily reading reminders. Call every 15 minutes from a scheduler
    (Render Cron Job, cron-job.org…) with ?key=CRON_SECRET."""
    secret = os.environ.get("CRON_SECRET", "")
    if not secret or not same_secret(request.args.get("key", ""), secret):
        abort(404)
    try:
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo("Europe/London"))
    except Exception:
        now = datetime.now()
    slot = now.hour * 60 + (now.minute // 15) * 15
    today_s = now.date().isoformat()
    db = get_db()
    sent = 0
    for row in db.execute("SELECT endpoint, subscription_json, prefs_json FROM push_subscriptions").fetchall():
        try:
            prefs = json.loads(row["prefs_json"] or "{}")
            sub = json.loads(row["subscription_json"])
        except (ValueError, TypeError):
            continue
        for kind, tkey, default, title, body, url in (
                ("reading", "reading_time", "07:30", "Time to read", "Today’s Bible reading is ready for you.", url_for("bible_today")),
                ("praytime", "praytime_time", "08:00", "Time to pray", "A few quiet minutes with God.", url_for("prayer_session"))):
            if not prefs.get(kind):
                continue
            try:
                hh, mm = str(prefs.get(tkey) or default).split(":")
                mins = int(hh) * 60 + int(mm)
            except ValueError:
                continue
            # Due, and not more than two hours late: a scheduler that skips a
            # run (they do) still gets the reminder out on the next one.
            if not (mins <= slot + 14 and slot - mins < 120):
                continue
            log_key = row["endpoint"] if kind == "reading" else f"{row['endpoint']}|{kind}"
            done = db.execute("SELECT last_date FROM reminder_log WHERE endpoint=?", (log_key,)).fetchone()
            if done and done["last_date"] == today_s:
                continue
            ok, should_remove = send_push(sub, title, body, url, tag=kind)
            if ok:
                sent += 1
                db.execute("INSERT INTO reminder_log (endpoint, last_date) VALUES (?, ?) "
                           "ON CONFLICT(endpoint) DO UPDATE SET last_date=excluded.last_date", (log_key, today_s))
            elif should_remove:
                db.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (row["endpoint"],))
                break
    db.commit()
    yt = youtube_check()  # at most every few hours; quick when nothing's new
    return {"ok": True, "sent": sent, "slot": f"{slot // 60:02d}:{slot % 60:02d}",
            "youtube": (yt or {}).get("note", "not due")}


def ministry_options():
    db = get_db()
    return db.execute(
        "SELECT slug, name FROM ministries WHERE active=1 ORDER BY sort_order, name"
    ).fetchall()


@app.route("/service-worker.js")
def service_worker():
    """Served from the root so its scope covers the whole app.

    A worker served from /static/ can only control /static/ pages, which means
    navigator.serviceWorker.ready never resolves for the rest of the site and
    push registration silently hangs.
    """
    response = make_response(
        send_from_directory(app.static_folder, "service-worker.js")
    )
    response.headers["Content-Type"] = "application/javascript"
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response


# ---------- Page pictures: illustrated banners, or the church's own photos ----------

PHOTO_TYPES = {b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png", b"RIFF": "image/webp"}
PHOTO_MAX = 4 * 1024 * 1024
PHOTO_KEYS = ["home"] + list(scenes.PAGES)


def _photo_versions():
    """{key: version} for pages with an uploaded photo, cached per request."""
    if "photo_versions" not in g:
        try:
            g.photo_versions = {k: v for k, v in get_db().execute("SELECT key, updated_at FROM page_photos")}
        except sqlite3.Error:
            g.photo_versions = {}
    return g.photo_versions


def page_photo(key):
    v = _photo_versions().get(key)
    return url_for("page_photo_file", key=key, v=v.replace(":", "").replace("-", "")[:15]) if v else None


@app.context_processor
def inject_scenes():
    def banner(key):
        scene, line = scenes.PAGES.get(key, (key, ""))
        return {"key": key, "scene": scenes.render(scene), "line": line, "photo": page_photo(key)}
    def sermon_art(row):
        """A moving illustrated thumbnail for a talk with no video picture.
        Talks in the same series share a scene."""
        try:
            seed = (row["series"] or row["title"] or "talk")
        except (KeyError, IndexError, TypeError):
            seed = "talk"
        return scenes.render(scenes.THUMB_SCENES[sum(map(ord, seed)) % len(scenes.THUMB_SCENES)])
    return {"page_banner": banner, "page_photo": page_photo, "sermon_art": sermon_art}


@app.route("/media/page/<key>")
def page_photo_file(key):
    row = get_db().execute("SELECT mime, data, updated_at FROM page_photos WHERE key=?", (key,)).fetchone()
    if not row:
        abort(404)
    resp = app.response_class(row["data"], mimetype=row["mime"])
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable" if request.args.get("v") else "public, max-age=3600"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp


@app.route("/admin/pictures", methods=["GET", "POST"])
@login_required
def admin_pictures():
    db = get_db()
    if request.method == "POST":
        key = request.form.get("key", "")
        if key not in PHOTO_KEYS:
            abort(400)
        if request.form.get("action") == "remove":
            db.execute("DELETE FROM page_photos WHERE key=?", (key,))
            db.commit()
            flash("Photo removed. The page shows its illustration again." if key != "home" else "Photo removed. The home page shows the original picture again.")
            return redirect(url_for("admin_pictures") + f"#p-{key}")
        f = request.files.get("photo")
        data = f.read(PHOTO_MAX + 1) if f else b""
        mime = next((m for sig, m in PHOTO_TYPES.items() if data.startswith(sig)), None)
        if mime == "image/webp" and data[8:12] != b"WEBP":
            mime = None
        if not data:
            flash("Choose a photo first.")
        elif len(data) > PHOTO_MAX:
            flash("That photo is too big. Try one under 4 MB.")
        elif not mime:
            flash("That doesn't look like a photo. Use a JPEG, PNG or WebP picture.")
        else:
            db.execute("INSERT INTO page_photos (key, mime, data, updated_at) VALUES (?, ?, ?, ?) "
                       "ON CONFLICT(key) DO UPDATE SET mime=excluded.mime, data=excluded.data, updated_at=excluded.updated_at",
                       (key, mime, data, datetime.now().isoformat(timespec="seconds")))
            db.commit()
            flash("Photo saved.")
        return redirect(url_for("admin_pictures") + f"#p-{key}")
    pages = [{"key": k, "title": "Home page" if k == "home" else scenes.TITLES.get(k, k.title()),
              "photo": page_photo(k), "scene": scenes.render(scenes.PAGES[k][0]) if k in scenes.PAGES else None,
              "line": scenes.PAGES.get(k, ("", ""))[1]} for k in PHOTO_KEYS]
    return render_template("admin_pictures.html", pages=pages)


# ---------- Pop-up announcements ----------
# Three kinds, all made by the church, never from an ad network:
#   church   the church's own notices (Christmas services, a new course, an appeal)
#   sponsor  a business or charity the church chooses to promote, labelled
#            "Sponsored", shown only while staff have sponsor pop-ups switched on
#   tips     built-in feature tips (app_features.py): the app advertising itself
# Each shows once per person, at most one pop-up per visit, closes with one
# tap, and counts only anonymous totals (shown / tapped per day).

POPUP_KINDS = {"church": "Church notice", "sponsor": "Sponsor (labelled “Sponsored”)"}
TIP_ENDPOINTS = {"index", "watch_hub", "community_hub", "bible_hub", "more_hub"}


def popup_settings():
    try:
        v = json.loads(get_setting("popup_settings", "") or "{}")
    except ValueError:
        v = {}
    return {"tips_on": bool(v.get("tips_on", True)), "tips_every": str(v.get("tips_every", "3")) if str(v.get("tips_every", "3")) in app_features.OFTEN else "3",
            "tips_off": [x for x in v.get("tips_off", []) if x in app_features.BY_ID], "sponsors_on": bool(v.get("sponsors_on", False))}


def feature_tips():
    """The tips this page may show (the phone picks one it hasn't seen)."""
    if request.endpoint not in TIP_ENDPOINTS:
        return []
    st = popup_settings()
    if not st["tips_on"]:
        return []
    signed_in = bool(session.get("member_id"))
    out = []
    for f in app_features.FEATURES:
        aud = f.get("audience", "everyone")
        if f["id"] in st["tips_off"] or (aud == "guests" and signed_in) or (aud == "members" and not signed_in):
            continue
        try:
            href = url_for(f["endpoint"], **f.get("kwargs", {}))
        except Exception:
            continue
        if href == request.path:
            continue
        out.append({"id": f["id"], "emoji": f["emoji"], "title": f["title"], "body": f["body"],
                    "button": f["button"], "href": href, "used": f.get("used", "")})
    return out

POPUP_PAGES = {
    "home": ("Home page", ["index"]),
    "tabs": ("Any main tab", ["index", "watch_hub", "community_hub", "bible_hub", "more_hub"]),
    "watch": ("Watch", ["watch_hub", "sermon_detail"]),
    "community": ("Community and calendar", ["community_hub", "calendar_page", "groups_index"]),
    "study": ("Study", ["bible_hub"]),
    "prayer": ("Prayer", ["prayer_wall", "prayer_new"]),
    "giving": ("Giving", ["giving"]),
}
POPUP_AUDIENCES = {"everyone": "Everyone", "guests": "People who aren't signed in", "members": "Signed-in members"}


def _popup_form():
    f = request.form
    title = (f.get("title") or "").strip()[:80]
    url = (f.get("button_url") or "").strip()[:300]
    starts, ends = _form_date("starts"), _form_date("ends")
    problem = None
    if not title:
        problem = "Give the pop-up a title."
    elif not starts or not ends:
        problem = "Choose the first and last day it shows."
    elif ends < starts:
        problem = "The last day can't be before the first."
    elif url and not (url.startswith("/") and not url.startswith("//") or url.startswith("https://")):
        problem = "The button link should be a page in the app (starting with /) or a full https:// address."
    vals = {"title": title, "body": (f.get("body") or "").strip()[:400], "button_text": (f.get("button_text") or "").strip()[:30],
            "button_url": url, "starts": starts or "", "ends": ends or "",
            "pages": f.get("pages") if f.get("pages") in POPUP_PAGES else "home",
            "audience": f.get("audience") if f.get("audience") in POPUP_AUDIENCES else "everyone",
            "active": 1 if f.get("active") else 0,
            "kind": f.get("kind") if f.get("kind") in POPUP_KINDS else "church",
            "sponsor_name": (f.get("sponsor_name") or "").strip()[:80]}
    if not problem and vals["kind"] == "sponsor" and not vals["sponsor_name"]:
        problem = "Say who the sponsor is: their name shows on the pop-up."
    return vals, problem


def _popup_image():
    f = request.files.get("image")
    data = f.read(PHOTO_MAX + 1) if f else b""
    if not data:
        return None, None
    mime = next((m for sig, m in PHOTO_TYPES.items() if data.startswith(sig)), None)
    if mime == "image/webp" and data[8:12] != b"WEBP":
        mime = None
    if not mime or len(data) > PHOTO_MAX:
        return False, None
    return data, mime


def current_popup():
    """The pop-up for this page, if any (newest first)."""
    if request.endpoint is None or request.path.startswith(("/admin", "/api", "/media")):
        return None
    try:
        today = date.today().isoformat()
        rows = get_db().execute("SELECT id, title, body, button_text, button_url, pages, audience, image_at, kind, sponsor_name FROM popups "
                                "WHERE active=1 AND starts<=? AND ends>=? ORDER BY id DESC", (today, today)).fetchall()
        sponsors_on = popup_settings()["sponsors_on"]
    except sqlite3.Error:
        return None
    signed_in = bool(session.get("member_id"))
    for r in rows:
        if request.endpoint not in POPUP_PAGES.get(r["pages"], ("", []))[1]:
            continue
        if (r["audience"] == "guests" and signed_in) or (r["audience"] == "members" and not signed_in):
            continue
        if r["kind"] == "sponsor" and not sponsors_on:
            continue
        p = dict(r)
        p["image_url"] = url_for("popup_image", popup_id=r["id"], v=(r["image_at"] or "").replace(":", "")[:15]) if r["image_at"] else None
        return p
    return None


@app.context_processor
def inject_popup():
    return {"current_popup": current_popup, "feature_tips": feature_tips, "popup_settings": popup_settings}


@app.route("/api/popup/stat", methods=["POST"])
def popup_stat():
    """Anonymous counts: how many times a pop-up was shown and tapped, per day.
    Nothing about who saw it is kept."""
    data = json_body()
    key, event = str(data.get("key") or ""), str(data.get("event") or "")
    if event not in ("shown", "tapped") or not re.fullmatch(r"p\d{1,9}|f-[a-z0-9-]{1,40}", key):
        return {"ok": False}, 400
    if key.startswith("f-") and key[2:] not in app_features.BY_ID:
        return {"ok": False}, 400
    counted = session.get("pu_counted") or []
    mark = f"{key}:{event}"
    if mark in counted:
        return {"ok": True}, 200
    session["pu_counted"] = (counted + [mark])[-40:]
    db = get_db()
    db.execute(f"INSERT INTO popup_stats (key, day, {event}) VALUES (?, ?, 1) "
               f"ON CONFLICT(key, day) DO UPDATE SET {event}={event}+1", (key, date.today().isoformat()))
    db.commit()
    return {"ok": True}, 200


def popup_totals(days=30):
    since = (date.today() - timedelta(days=days)).isoformat()
    try:
        rows = get_db().execute("SELECT key, SUM(shown) s, SUM(tapped) t FROM popup_stats WHERE day >= ? GROUP BY key", (since,)).fetchall()
    except sqlite3.Error:
        return {}
    return {r["key"]: (r["s"] or 0, r["t"] or 0) for r in rows}


@app.route("/media/popup/<int:popup_id>")
def popup_image(popup_id):
    row = get_db().execute("SELECT image, image_mime FROM popups WHERE id=? AND image IS NOT NULL", (popup_id,)).fetchone()
    if not row:
        abort(404)
    resp = app.response_class(row["image"], mimetype=row["image_mime"])
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable" if request.args.get("v") else "public, max-age=3600"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp


@app.route("/admin/popups", methods=["GET", "POST"])
@login_required
def admin_popups():
    if request.method == "POST":
        st = popup_settings()
        if request.form.get("action") == "tips":
            st["tips_on"] = bool(request.form.get("tips_on"))
            st["tips_every"] = request.form.get("tips_every") if request.form.get("tips_every") in app_features.OFTEN else "3"
            st["tips_off"] = [f["id"] for f in app_features.FEATURES if not request.form.get("tip_" + f["id"])]
            flash("Feature tips saved.")
        elif request.form.get("action") == "sponsors":
            st["sponsors_on"] = bool(request.form.get("sponsors_on"))
            flash("Sponsor pop-ups are " + ("on." if st["sponsors_on"] else "off."))
        set_setting("popup_settings", json.dumps(st))
        return redirect(url_for("admin_popups"))
    rows = get_db().execute("SELECT id, title, starts, ends, pages, audience, active, image_at, kind, sponsor_name FROM popups ORDER BY ends DESC, id DESC").fetchall()
    return render_template("admin_popups.html", popups=rows, pages=POPUP_PAGES, audiences=POPUP_AUDIENCES, today=date.today().isoformat(),
                           settings=popup_settings(), features=app_features.FEATURES, often=app_features.OFTEN, totals=popup_totals())


@app.route("/admin/popups/new", methods=["GET", "POST"])
@app.route("/admin/popups/<int:popup_id>/edit", methods=["GET", "POST"])
@login_required
def admin_popup_edit(popup_id=None):
    db = get_db()
    row = db.execute("SELECT * FROM popups WHERE id=?", (popup_id,)).fetchone() if popup_id else None
    if popup_id and not row:
        abort(404)
    if request.method == "POST":
        if request.form.get("action") == "delete" and row:
            db.execute("DELETE FROM popups WHERE id=?", (popup_id,))
            db.commit()
            flash("Pop-up deleted.")
            return redirect(url_for("admin_popups"))
        vals, problem = _popup_form()
        img, mime = _popup_image()
        if img is False:
            problem = problem or "That picture isn't a JPEG, PNG or WebP under 4 MB."
        if problem:
            flash(problem)
            vals["id"] = popup_id
            vals["image_at"] = row["image_at"] if row else None
            return render_template("admin_popup_form.html", p=vals, pages=POPUP_PAGES, audiences=POPUP_AUDIENCES, kinds=POPUP_KINDS)
        cols = ["title", "body", "button_text", "button_url", "starts", "ends", "pages", "audience", "active", "kind", "sponsor_name"]
        if row:
            db.execute(f"UPDATE popups SET {', '.join(c + '=?' for c in cols)} WHERE id=?", [vals[c] for c in cols] + [popup_id])
        else:
            cur = db.execute(f"INSERT INTO popups ({', '.join(cols)}, created_at) VALUES ({', '.join('?' * len(cols))}, ?)",
                             [vals[c] for c in cols] + [datetime.now().isoformat(timespec="seconds")])
            popup_id = cur.lastrowid
        if img:
            db.execute("UPDATE popups SET image=?, image_mime=?, image_at=? WHERE id=?", (img, mime, datetime.now().isoformat(timespec="seconds"), popup_id))
        if request.form.get("remove_image"):
            db.execute("UPDATE popups SET image=NULL, image_mime=NULL, image_at=NULL WHERE id=?", (popup_id,))
        db.commit()
        flash("Pop-up saved.")
        return redirect(url_for("admin_popups"))
    p = dict(row) if row else {"title": "", "body": "", "button_text": "", "button_url": "", "starts": date.today().isoformat(),
                               "ends": (date.today() + timedelta(days=14)).isoformat(), "pages": "home", "audience": "everyone",
                               "active": 1, "id": None, "image_at": None, "kind": request.args.get("kind") if request.args.get("kind") in POPUP_KINDS else "church", "sponsor_name": ""}
    return render_template("admin_popup_form.html", p=p, pages=POPUP_PAGES, audiences=POPUP_AUDIENCES, kinds=POPUP_KINDS)


# ---------- The app guide ("take me to…") ----------

def _guide_ctx():
    import study_assistant
    from flask import url_for as _u

    def facts():
        info = visit_info()
        return {"service_times": info["visit_service_times"], "weekly": info["weekly"],
                "address": info["full_address"], "parking": info.get("visit_parking") or ""}

    def upcoming():
        out = []
        for iso, row in upcoming_occurrences(limit=4, days_ahead=21):
            d = date.fromisoformat(iso)
            when = "Today" if d == date.today() else "Tomorrow" if d == date.today() + timedelta(days=1) else f"{d.strftime('%a')} {d.day} {d.strftime('%b')}"
            out.append({"when": f"{when}, {pretty_time(row['event_time'])}" if row["event_time"] else when, "title": row["title"]})
        return out

    def library_find(q):
        found = []
        try:
            if library.available() and len(q) >= 2:
                hit = library.search(q, 3)
                for p in hit.get("people", []):
                    found.append({"kind": "Person", "title": p["name"] + (f" ({p['title']})" if p.get("title") and p["title"] != p["name"] else ""), "url": _u("person_page", slug=p["slug"])})
                for p in hit.get("places", []):
                    found.append({"kind": "Place", "title": p["name"], "url": _u("place_page", slug=p["slug"])})
                for t in hit.get("topics", []):
                    found.append({"kind": "Topic", "title": t["name"], "url": _u("topic_page", slug=t["slug"]), "about": "What the Bible says"})
                for d in hit.get("dictionary", []):
                    found.append({"kind": "Dictionary", "title": d["term"], "url": _u("dictionary_page", slug=d["slug"])})
        except Exception:
            app.logger.exception("guide library lookup failed")
        ql = q.strip().lower()
        found.sort(key=lambda x: x["title"].split(" (")[0].lower() != ql)  # exact names first
        return found

    def lexicon(term, lang):
        close = re.compile(r"(^|[^a-z])" + re.escape(term.lower()) + r"($|[^a-z])")
        hits = study_data.search_lexicon(term, lang, limit=10)
        good = [w for w in hits if close.search(w["meaning"].lower()) or study_data._plain(w["translit"]) == study_data._plain(term)]
        good.sort(key=lambda w: (w["meaning"].lower() != term.lower(), -w["count"]))  # "love" before "to love"
        return good or hits[:1]

    return {
        "url": _u, "facts": facts, "upcoming": upcoming,
        "live_now": lambda: get_setting("live_is_on", "0") == "1",
        "library_find": library_find, "lexicon": lexicon,
        "feeling_label": lambda slug: everyday_content.FEELINGS_BY_SLUG[slug]["label"],
        "needs_a_person": study_assistant.needs_a_person,
        "verse_count": study_data.chapter_verse_count,
    }


GUIDE_AI_PROMPT = """You are the guide inside the Clearspring Church app (Cheltenham, UK). Someone typed a \
message, and simple matching couldn't tell which page they want. Choose up to 3 pages from the list \
that best help them, and write one or two short, warm sentences in British English. Only use page ids \
from the list. Don't answer Bible or faith questions at length: point them to the right page. If \
nothing fits, return no ids and suggest asking a pastor.

Church facts: {facts}

Pages (id: title - what's there):
{pages}

Their message: "{q}"

Reply as JSON: {{"reply": "...", "ids": ["id1", "id2"]}}"""


def guide_ai(q, ctx, base):
    import study_assistant
    if not study_assistant.is_available() or rate_limited("guide_ai", client_ip(), limit=30, window_seconds=3600):
        return None
    f = ctx["facts"]()
    facts = f"{f['service_times']}; " + "; ".join(f"{w['when']} {w['what'].split(':')[0]}" for w in f["weekly"]) + (f"; meets at {f['address']}" if f["address"] else "")
    got = study_assistant.ask_json(GUIDE_AI_PROMPT.format(facts=facts, pages=guide_mod.catalogue_for_ai(), q=q.replace('"', "'")))
    if not isinstance(got, dict):
        return None
    ids = [i for i in (got.get("ids") or []) if isinstance(i, str) and i in guide_mod.PLACES_BY_ID][:3]
    reply = str(got.get("reply") or "").strip()[:400]
    if not reply and not ids:
        return None
    links = []
    for i in ids:
        p = guide_mod.PLACES_BY_ID[i]
        links.append({"title": p[1], "url": url_for(p[2], **p[3]), "about": p[4]})
    # Keep any specific links the simple matcher found (a search, a Library entry).
    for l in ([] if links else base.get("links", [])):
        if l["url"] not in {x["url"] for x in links} and len(links) < 4:
            links.append(l)
    return {"reply": reply or base["reply"], "links": links, "go": None, "confident": bool(ids), "suggest": [], "ai": True}


@app.route("/api/guide", methods=["POST"])
def api_guide():
    if rate_limited("guide", client_ip(), limit=120, window_seconds=600):
        return {"reply": "That's a lot of questions! Give me a moment and try again.", "links": [], "go": None}, 200
    data = json_body()
    q = str(data.get("q") or "").strip()[:300]
    if get_setting("guide_enabled", "1") == "0":
        return {"reply": "The guide is switched off at the moment.", "links": [], "go": None}, 200
    ctx = _guide_ctx()
    try:
        res = guide_mod.respond(q, ctx)
    except Exception:
        app.logger.exception("guide failed")
        res = {"reply": "Sorry, something went wrong there. Try asking another way.", "links": [], "go": None, "confident": False, "suggest": []}
    if q and not res.get("confident") and len(q) > 3:
        better = guide_ai(q, ctx, res)
        if better:
            res = better
    return res


# ---------- Original words (Hebrew & Greek word study) ----------

def _with_grammar(book_slug, chapter, verse, words):
    """Copies of the verse's words with a short grammar label and sentence role added."""
    rows = grammar.chapter(book_slug, chapter).get(verse) or []
    out = []
    for k, w in enumerate(words):
        w = dict(w)
        r = rows[k] if k < len(rows) else {}
        ex = grammar.explain(r.get("m"))
        if ex:
            w["grammar"] = ex["tag"]
        for src, dst in (("to", "refers_to"), ("by", "done_by")):
            if r.get(src):
                w[dst] = r[src]
        out.append(w)
    return out


@app.route("/api/words/<book_slug>/<int:chapter>/<int:verse>")
def api_original_words(book_slug, chapter, verse):
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book or chapter < 1 or chapter > book["chapters"] or verse < 1:
        return {"ok": False, "error": "unknown verse"}, 404
    words = original_words.verse_words(book_slug, chapter, verse)
    if words is None:
        return {"ok": False, "error": "unavailable"}, 503
    resp = make_response({
        "ok": True,
        "ref": f"{book['name']} {chapter}:{verse}",
        "language": original_words.language_of(book_slug),
        "words": _with_grammar(book_slug, chapter, verse, words),
        "interlinear": url_for("interlinear", book_slug=book_slug, chapter=chapter) + f"#v{verse}",
        "attribution": original_words.ATTRIBUTION,
    })
    # The text never changes; let phones keep it.
    resp.headers["Cache-Control"] = "public, max-age=604800"
    return resp


# ---------- Bible study assistant ----------

@app.route("/api/study/ask", methods=["POST"])
def study_ask():
    if not study_available():
        return {"ok": False, "answer": "The study assistant isn't switched on yet."}, 200

    data = json_body()
    question = str(data.get("question") or "").strip()[:500]
    if not question:
        return {"ok": False, "answer": "Please type a question first."}, 200

    # Modest per-session rate limit, so the free daily quota isn't burned
    # through by one person and left empty for everyone else.
    #
    # Session limits alone are bypassed by simply clearing cookies, so this is
    # backed by a per-IP ceiling. This endpoint calls a paid API — an unmetered
    # one would let a single script run up the bill.
    if rate_limited("study_ask", client_ip(), limit=40, window_seconds=3600):
        return {
            "ok": False,
            "answer": "The study assistant is busy right now. Please try again shortly.",
        }, 200

    asked = session.get("study_asked", [])
    now = datetime.now().timestamp()
    asked = [t for t in asked if now - t < 3600]
    if len(asked) >= 15:
        return {
            "ok": False,
            "answer": "You've asked quite a few questions in the last hour. "
                      "Please take a break and come back shortly.",
        }, 200
    asked.append(now)
    session["study_asked"] = asked

    # Conversation history from the client, so follow-up questions make sense.
    # It comes from the browser and is therefore untrusted: validate the shape,
    # cap the length, and never let it through unchecked.
    raw_history = data.get("history")
    history = []
    if isinstance(raw_history, list):
        for turn in raw_history[-20:]:
            if not isinstance(turn, dict):
                continue
            role = turn.get("role")
            text = turn.get("text")
            if role in ("user", "model") and isinstance(text, str) and text.strip():
                history.append({"role": role, "text": text.strip()[:2000]})

    ok, answer = study_ask_ai(
        question,
        passage_ref=str(data.get("ref") or "")[:80],
        passage_text=str(data.get("text") or "")[:2500],
        history=history,
    )
    return {"ok": ok, "answer": answer}, 200


# ---------- Member accounts ----------

def current_member():
    """The signed-in member, or None. Cached per request."""
    if "member" not in g:
        g.member = None
        member_id = session.get("member_id")
        if member_id:
            row = get_db().execute(
                "SELECT * FROM members WHERE id=? AND active=1", (member_id,)
            ).fetchone()
            g.member = row
            if row is None:
                session.pop("member_id", None)
    return g.member


@app.context_processor
def inject_member():
    return {"member": current_member()}


def member_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_member():
            session["after_signin"] = request.path
            return redirect(url_for("signin"))
        return view(*args, **kwargs)
    return wrapped


def _finish_signin(member_row):
    session["member_id"] = member_row["id"]
    session.permanent = True
    get_db().execute(
        "UPDATE members SET last_login=? WHERE id=?",
        (datetime.now().isoformat(), member_row["id"]),
    )
    get_db().commit()
    target = session.pop("after_signin", None)
    return redirect(target or url_for("account"))


@app.route("/account/signup", methods=["GET", "POST"])
def signup():
    if current_member():
        return redirect(url_for("account"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = normalise_email(request.form.get("email", ""))
        password = request.form.get("password", "")

        if not valid_email(email):
            flash("Please enter a valid email address.")
            return render_template("signup.html", name=name, email=email)

        if not request.form.get("agree"):
            flash("Please confirm you're 13 or older and have read the privacy notice.")
            return render_template("signup.html", name=name, email=email)

        problem = password_problem(password, email=email, name=name)
        if problem:
            flash(problem)
            return render_template("signup.html", name=name, email=email)

        db = get_db()
        existing = db.execute(
            "SELECT id FROM members WHERE email=?", (email,)
        ).fetchone()
        if existing:
            # Don't confirm the address is registered — point them at sign-in.
            flash("That email may already have an account. Try signing in, "
                  "or use the email link option if you've forgotten your password.")
            return redirect(url_for("signin"))

        db.execute(
            """INSERT INTO members (email, name, password_hash, created_at, active)
               VALUES (?, ?, ?, ?, 1)""",
            (email, name or None, hash_password(password), datetime.now().isoformat()),
        )
        db.commit()
        row = db.execute("SELECT * FROM members WHERE email=?", (email,)).fetchone()
        return _finish_signin(row)

    return render_template("signup.html", name="", email="")


@app.route("/account/signin", methods=["GET", "POST"])
def signin():
    if current_member():
        return redirect(url_for("account"))

    if request.method == "POST":
        email = normalise_email(request.form.get("email", ""))
        password = request.form.get("password", "")

        db = get_db()
        row = db.execute(
            "SELECT * FROM members WHERE email=? AND active=1", (email,)
        ).fetchone()

        if row and verify_password(row["password_hash"], password):
            return _finish_signin(row)

        # Same message whether the account exists or the password was wrong.
        flash("That email and password don't match. Please try again, or use "
              "the email link option below.")
        return render_template("signin.html", email=email)

    return render_template("signin.html", email="")


@app.route("/account/link", methods=["GET", "POST"])
def magic_link_request():
    """Request a one-time sign-in link by email."""
    if request.method == "POST":
        email = normalise_email(request.form.get("email", ""))

        # Without this, anyone can point a script at this form and send an
        # unbounded number of emails to a member — and burn through the
        # sending quota for everyone else.
        if rate_limited("magic_link", client_ip(), limit=5, window_seconds=900):
            return render_template(
                "magic_link_sent.html",
                email=email,
                email_working=email_is_configured(),
            )

        db = get_db()
        row = db.execute(
            "SELECT * FROM members WHERE email=? AND active=1", (email,)
        ).fetchone()

        if row:
            token = new_token()
            db.execute(
                "UPDATE members SET login_token_hash=?, login_token_expires=? WHERE id=?",
                (hash_token(token), token_expiry(), row["id"]),
            )
            db.commit()
            link = url_for("magic_link_use", token=token, _external=True)
            send_magic_link(row["email"], row["name"], link)

        # The same confirmation either way, so this page can't be used to
        # discover which addresses have accounts.
        #
        # The link is NEVER shown on screen. Doing so would let anyone type
        # someone else's address and sign in as them.
        return render_template(
            "magic_link_sent.html",
            email=email,
            email_working=email_is_configured(),
        )

    return render_template(
        "magic_link.html", email="", email_working=email_is_configured()
    )


@app.route("/account/link/<token>")
def magic_link_use(token):
    db = get_db()
    row = db.execute(
        "SELECT * FROM members WHERE login_token_hash=? AND active=1",
        (hash_token(token),),
    ).fetchone()

    if not row or token_expired(row["login_token_expires"]):
        flash("That sign-in link has expired or already been used. "
              "Please request a new one.")
        return redirect(url_for("magic_link_request"))

    # Single use: clear the token immediately.
    db.execute(
        "UPDATE members SET login_token_hash=NULL, login_token_expires=NULL, "
        "email_verified=1 WHERE id=?",
        (row["id"],),
    )
    db.commit()
    if request.args.get("then") == "password":
        # A password-reset link: having opened it proves they own the email,
        # so they may set a new password without the old one, for a while.
        session["pw_reset_ok"] = datetime.now().isoformat()
        session["after_signin"] = url_for("account_password")
    return _finish_signin(row)


def _send_reset(row):
    token = new_token()
    db = get_db()
    db.execute("UPDATE members SET login_token_hash=?, login_token_expires=? WHERE id=?",
               (hash_token(token), token_expiry(), row["id"]))
    db.commit()
    link = url_for("magic_link_use", token=token, then="password", _external=True)
    ok, message = emailer.send_password_reset(CHURCH_NAME, row["email"], row["name"], link)
    if not ok:
        app.logger.warning("Could not send password reset to member %s: %s", row["id"], message)
    return ok


@app.route("/account/forgot", methods=["GET", "POST"])
def account_forgot():
    """Forgotten password: email a one-time link to choose a new one."""
    if request.method == "POST":
        email = normalise_email(request.form.get("email", ""))
        if not rate_limited("pw_reset", client_ip(), limit=5, window_seconds=900):
            row = get_db().execute("SELECT * FROM members WHERE email=? AND active=1", (email,)).fetchone()
            if row:
                _send_reset(row)
        # Same answer either way, so this can't be used to find out who has an account.
        return render_template("magic_link_sent.html", email=email, reset=True, email_working=email_is_configured())
    return render_template("account_forgot.html", email_working=email_is_configured())


def _reset_still_ok():
    t = session.get("pw_reset_ok")
    try:
        return bool(t) and datetime.now() - datetime.fromisoformat(t) < timedelta(minutes=30)
    except ValueError:
        return False


@app.route("/account/password", methods=["GET", "POST"])
@member_required
def account_password():
    """Set, change or reset the password."""
    m = current_member()
    db = get_db()
    row = db.execute("SELECT email, name, password_hash FROM members WHERE id=?", (m["id"],)).fetchone()
    needs_current = bool(row["password_hash"]) and not _reset_still_ok()
    if request.method == "POST":
        new = request.form.get("password", "")
        again = request.form.get("password2", "")
        if needs_current and not verify_password(row["password_hash"], request.form.get("current", "")):
            flash("Your current password wasn't right. Forgotten it? Use “Email me a reset link” below.")
        elif new != again:
            flash("The two new passwords don't match.")
        else:
            problem = password_problem(new, email=row["email"], name=row["name"])
            if problem:
                flash(problem)
            else:
                db.execute("UPDATE members SET password_hash=?, login_token_hash=NULL, login_token_expires=NULL WHERE id=?",
                           (hash_password(new), m["id"]))
                db.commit()
                session.pop("pw_reset_ok", None)
                flash("Your password has been changed." if row["password_hash"] else "Password set. You can now sign in with it as well as by email link.")
                return redirect(url_for("account"))
        return redirect(url_for("account_password"))
    return render_template("account_password.html", needs_current=needs_current, has_password=bool(row["password_hash"]),
                           resetting=_reset_still_ok())


@app.route("/account/signout", methods=["POST"])
def signout():
    session.pop("member_id", None)
    g.pop("member", None)
    flash("You've been signed out.")
    return redirect(url_for("index"))


@app.route("/account/unblock/<int:blocked_id>", methods=["POST"])
@member_required
def account_unblock(blocked_id):
    m = current_member()
    db = get_db()
    groups_mod.unblock(db, m["id"], blocked_id)
    db.commit()
    flash("Done. You’ll see their posts again.")
    return redirect(url_for("account") + "#blocked")


@app.route("/account/delete", methods=["POST"])
@member_required
def account_delete():
    """Permanently delete the signed-in member and everything they own.

    Required for App Store approval (guideline 5.1.1(v)): any app that offers
    account creation must offer account deletion inside the app. Password is
    re-confirmed so a borrowed unlocked phone can't destroy an account.
    """
    m = current_member()
    password = request.form.get("password", "")
    confirm_email = (request.form.get("confirm_email") or "").strip().lower()

    db = get_db()
    row = db.execute(
        "SELECT password_hash, email FROM members WHERE id=?", (m["id"],)
    ).fetchone()

    if not row:
        flash("That account no longer exists.")
        return redirect(url_for("index"))

    # Members who signed up by magic link have no password at all. Requiring
    # one meant they could never delete their account — they'd be told the
    # password was wrong forever. That breaks the right to erasure, and it
    # breaks the App Store rule this route exists to satisfy. So confirm by
    # typing the account's own email address instead: still a deliberate act
    # that a borrowed phone won't produce by accident.
    if row["password_hash"]:
        confirmed = verify_password(row["password_hash"], password)
        failure = "That password wasn't right, so nothing was deleted."
    else:
        confirmed = confirm_email == (row["email"] or "").strip().lower()
        failure = ("That email address didn't match, so nothing was deleted.")

    if not confirmed:
        flash(failure)
        return redirect(url_for("account"))

    delete_member_everywhere(db, m["id"])
    db.commit()

    session.pop("member_id", None)
    g.pop("member", None)
    flash("Your account and all its data have been deleted.")
    return redirect(url_for("index"))


def delete_member_everywhere(db, member_id):
    """Remove a member and everything they own (doesn't commit)."""
    mid = member_id
    # Their synced data (saved verses, notes, journal, reading progress).
    db.execute("DELETE FROM member_data WHERE member_id=?", (mid,))
    # Their groups: leave each one and remove what they wrote there.
    groups_mod.forget_member(db, mid)
    # Their leaderboard entries.
    db.execute("DELETE FROM game_scores WHERE member_id=?", (mid,))
    # Streaks and badges. These also cascade from the foreign key, but delete
    # them explicitly so it doesn't depend on foreign_keys being on.
    db.execute("DELETE FROM member_activity WHERE member_id=?", (mid,))
    db.execute("DELETE FROM member_badges WHERE member_id=?", (mid,))
    # People they'd hidden, and people who'd hidden them.
    try:
        db.execute("DELETE FROM member_blocks WHERE member_id=? OR blocked_id=?", (mid, mid))
    except sqlite3.Error:
        pass
    # Notifications on their phones stay on, but are no longer tied to them.
    db.execute("UPDATE push_subscriptions SET member_id=NULL WHERE member_id=?", (mid,))
    # The account itself.
    db.execute("DELETE FROM members WHERE id=?", (mid,))


@app.route("/account/progress")
@member_required
def member_progress():
    """Streaks and badges for the signed-in member."""
    m = current_member()
    db = get_db()
    # Re-check on view, so anything earned before this feature existed
    # gets picked up rather than only counting from now on.
    achievements.evaluate(db, m["id"], total_games=len(GAMES))
    db.commit()
    data = achievements.summary(db, m["id"], total_games=len(GAMES))
    return render_template(
        "progress.html",
        church_name=CHURCH_NAME,
        member=m,
        grace_days=achievements.GRACE_DAYS,
        **data,
    )


SYNC_LABELS = [
    ("verse", "Saved verses"), ("highlight", "Highlights"), ("vnote", "Verse notes"), ("soap", "Study journal"),
    ("talk", "Sermon notes"), ("note", "Older sermon notes"), ("plan", "Reading plans and position"),
    ("cplan", "Plans you made"), ("readlog", "Reading log"), ("memory", "Memory verses"),
    ("journal", "My prayers"), ("pcards", "Prayer list"), ("learn", "Watch courses: progress and notes"), ("prayerlog", "Days of prayer"), ("grow", "Grow: steps, course, check-ins, story"),
    ("college", "Bible College progress and notes"), ("books", "Classic books: where you're up to"), ("prefs", "Settings and markers"),
]


def _sync_counts(member_id):
    db = get_db()
    rows = dict(db.execute("SELECT kind, COUNT(*) FROM member_data WHERE member_id=? GROUP BY kind", (member_id,)).fetchall())
    last = db.execute("SELECT MAX(updated_at) FROM member_data WHERE member_id=?", (member_id,)).fetchone()[0]
    return [(k, label, rows.get(k, 0)) for k, label in SYNC_LABELS], last


@app.route("/account")
@member_required
def account():
    m = current_member()
    counts, last = _sync_counts(m["id"])
    total = sum(n for _, _, n in counts)
    return render_template("account.html", m=m, total=total, last_sync=last,
                           groups=groups_mod.groups_of(get_db(), m["id"]),
                           blocked=groups_mod.blocked(get_db(), m["id"]))


@app.route("/account/name", methods=["POST"])
@member_required
def account_name():
    m = current_member()
    name = (request.form.get("name") or "").strip()[:60]
    db = get_db()
    db.execute("UPDATE members SET name=? WHERE id=?", (name or None, m["id"]))
    db.commit()
    g.pop("member", None)
    flash("Your name has been updated." if name else "Your name has been removed.")
    return redirect(url_for("account"))


@app.route("/account/data")
@member_required
def account_data():
    m = current_member()
    counts, last = _sync_counts(m["id"])
    return render_template("account_data.html", m=m, counts=counts, last_sync=last)


@app.route("/account/export.json")
@member_required
def account_export():
    """Everything this account holds, as one file: the right to a copy of
    your own data, and a backup you can keep."""
    m = current_member()
    db = get_db()
    data = {"exported_at": datetime.now().isoformat(timespec="seconds"),
            "account": {"email": m["email"], "name": m["name"], "created_at": m["created_at"]},
            "synced": {}, "groups": [], "group_posts": []}
    for r in db.execute("SELECT kind, item_key, payload, updated_at FROM member_data WHERE member_id=? ORDER BY kind, item_key", (m["id"],)):
        try:
            value = json.loads(r["payload"])
        except (ValueError, TypeError):
            value = r["payload"]
        data["synced"].setdefault(r["kind"], []).append({"key": r["item_key"], "updated": r["updated_at"], "value": value})
    for x in groups_mod.groups_of(db, m["id"]):
        data["groups"].append({"name": x["name"], "role": x["role"]})
    for r in db.execute("""SELECT p.kind, p.body, p.ref, p.created_at, g.name AS group_name FROM group_posts p
                           JOIN groups g ON g.id=p.group_id WHERE p.member_id=? AND p.status='live' ORDER BY p.id""", (m["id"],)):
        data["group_posts"].append(dict(r))
    resp = make_response(json.dumps(data, ensure_ascii=False, indent=1))
    resp.headers["Content-Type"] = "application/json; charset=utf-8"
    resp.headers["Content-Disposition"] = f'attachment; filename="clearspring-my-data-{date.today().isoformat()}.json"'
    return resp


def email_is_configured():
    return emailer.is_configured()


def send_magic_link(to, name, link):
    """Send a sign-in link. Logs rather than crashes if it fails, so a mail
    outage never breaks the sign-in page."""
    ok, message = emailer.send_sign_in_link(CHURCH_NAME, to, name, link)
    if not ok:
        app.logger.warning("Could not send sign-in link to %s: %s", to, message)
    return ok


SYNC_KINDS = {"verse", "note", "plan", "journal", "pcards", "learn", "highlight", "vnote", "soap", "talk", "cplan", "readlog", "memory", "prayerlog", "grow", "prefs", "college", "books"}


@app.route("/api/sync/<kind>", methods=["GET"])
def sync_get(kind):
    """Return everything of this kind for the signed-in member."""
    if kind not in SYNC_KINDS:
        return {"ok": False, "error": "unknown kind"}, 400
    m = current_member()
    if not m:
        return {"ok": False, "signed_in": False, "items": []}, 200

    rows = get_db().execute(
        "SELECT item_key, payload, updated_at FROM member_data "
        "WHERE member_id=? AND kind=? ORDER BY updated_at DESC",
        (m["id"], kind),
    ).fetchall()
    items = []
    for r in rows:
        try:
            payload = json.loads(r["payload"])
        except (ValueError, TypeError):
            continue
        items.append({"key": r["item_key"], "value": payload, "updated": r["updated_at"]})
    return {"ok": True, "signed_in": True, "items": items}, 200


@app.route("/api/sync/<kind>", methods=["POST"])
def sync_put(kind):
    """Store or update one item. Silently ignored when signed out."""
    if kind not in SYNC_KINDS:
        return {"ok": False, "error": "unknown kind"}, 400
    m = current_member()
    if not m:
        return {"ok": False, "signed_in": False}, 200

    data = json_body()
    item_key = str(data.get("key", ""))[:200]
    if not item_key:
        return {"ok": False, "error": "missing key"}, 400

    if len(json.dumps(data.get("value"))) > 512 * 1024:
        return {"ok": False, "error": "too large"}, 413

    db = get_db()
    if data.get("delete"):
        db.execute(
            "DELETE FROM member_data WHERE member_id=? AND kind=? AND item_key=?",
            (m["id"], kind, item_key),
        )
    else:
        db.execute(
            """INSERT INTO member_data (member_id, kind, item_key, payload, updated_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(member_id, kind, item_key) DO UPDATE SET
                 payload=excluded.payload, updated_at=excluded.updated_at""",
            (m["id"], kind, item_key, json.dumps(data.get("value")),
             datetime.now().isoformat()),
        )
        # Saving a verse, note or journal entry counts as showing up today.
        # Deleting doesn't — otherwise tidying up would count as activity.
        achievements.record(db, m["id"], kind if kind in
                            achievements.ACTIVITY_SOURCES else "read")

    new_badges = achievements.evaluate(db, m["id"], total_games=len(GAMES))
    db.commit()
    return {
        "ok": True,
        "signed_in": True,
        "new_badges": [{"name": b["name"], "desc": b["desc"]} for b in new_badges],
    }, 200


@app.route("/api/sync/<kind>/bulk", methods=["POST"])
def sync_bulk(kind):
    """Upload everything held locally — used once when someone first signs in,
    so nothing they saved before having an account is lost."""
    if kind not in SYNC_KINDS:
        return {"ok": False, "error": "unknown kind"}, 400
    m = current_member()
    if not m:
        return {"ok": False, "signed_in": False}, 200

    data = json_body()
    items = data.get("items") or []
    db = get_db()
    stored = 0
    for item in items[:500]:
        if not isinstance(item, dict) or len(json.dumps(item.get("value"))) > 512 * 1024:
            continue
        key = str(item.get("key", ""))[:200]
        if not key:
            continue
        db.execute(
            """INSERT INTO member_data (member_id, kind, item_key, payload, updated_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(member_id, kind, item_key) DO NOTHING""",
            (m["id"], kind, key, json.dumps(item.get("value")),
             datetime.now().isoformat()),
        )
        stored += 1
    db.commit()
    return {"ok": True, "stored": stored}, 200


# ---------- Notifications ----------

@app.route("/settings")
def settings():
    return render_template("settings.html", church_name=CHURCH_NAME)


@app.route("/settings/notifications")
def notification_settings():
    return render_template(
        "notifications.html",
        church_name=CHURCH_NAME,
        types=NOTIFICATION_TYPES,
        vapid_public_key=VAPID_PUBLIC_KEY,
        push_configured=push_is_configured(),
        native_push_configured=native_push_is_configured(),
    )


@app.route("/api/push/subscribe", methods=["POST"])
def push_subscribe():
    data = json_body()
    sub = data.get("subscription")
    if not isinstance(sub, dict):
        sub = None
    prefs = data.get("prefs")
    if not isinstance(prefs, dict):
        prefs = {}

    # The native iOS/Android shell has no Web Push endpoint. It sends an APNs
    # or FCM token instead, which we store under a synthetic endpoint so it
    # shares the same table and uniqueness guarantee as web subscriptions.
    native_token = str(data.get("native_token") or "").strip()
    if native_token:
        platform = str(data.get("platform") or "").strip().lower()
        if platform not in ("ios", "android"):
            return {"ok": False, "error": "unknown platform"}, 400
        if len(native_token) > 4096:
            return {"ok": False, "error": "token too long"}, 400
        # Firebase rotates tokens now and then; forget the one this replaces.
        replaces = str(data.get("replaces") or "").strip()
        if replaces and replaces != native_token:
            db0 = get_db()
            db0.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (f"native:{platform}:{replaces}",))
            db0.commit()
        sub = {
            "endpoint": f"native:{platform}:{native_token}",
            "native": True,
            "platform": platform,
            "token": native_token,
        }

    if not sub or not sub.get("endpoint"):
        return {"ok": False, "error": "missing subscription"}, 400

    # Only store keys we recognise, all defaulting to off.
    clean_prefs = {k: bool(prefs.get(k)) for k in TYPE_KEYS}
    for tkey in ("reading_time", "praytime_time"):
        rt = str(prefs.get(tkey) or "")
        if re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", rt):
            clean_prefs[tkey] = rt

    db = get_db()
    # Remember whose phone this is when they're signed in, so group
    # notifications reach only that group's members.
    m = current_member()
    db.execute(
        """INSERT INTO push_subscriptions (endpoint, subscription_json, prefs_json, created_at, last_seen, member_id)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(endpoint) DO UPDATE SET
             subscription_json=excluded.subscription_json,
             prefs_json=excluded.prefs_json,
             last_seen=excluded.last_seen,
             member_id=COALESCE(excluded.member_id, push_subscriptions.member_id)""",
        (
            sub["endpoint"],
            json.dumps(sub),
            json.dumps(clean_prefs),
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            m["id"] if m else None,
        ),
    )
    db.commit()
    return {"ok": True}, 200


@app.route("/api/push/unsubscribe", methods=["POST"])
def push_unsubscribe():
    data = json_body()
    endpoint = str(data.get("endpoint") or "")

    native_token = str(data.get("native_token") or "").strip()
    if native_token:
        platform = str(data.get("platform") or "").strip().lower()
        endpoint = f"native:{platform}:{native_token}"

    if endpoint:
        db = get_db()
        db.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (endpoint,))
        db.commit()
    return {"ok": True}, 200


def notify_members(member_ids, type_key, title, body, url="/"):
    """Send a notification to particular members' phones (those signed in
    when they turned notifications on), if they've opted in to this type."""
    ids = [int(i) for i in member_ids]
    if not ids or type_key not in TYPE_KEYS:
        return 0
    if not push_is_configured() and not native_push_is_configured():
        return 0
    db = get_db()
    rows = db.execute("SELECT * FROM push_subscriptions WHERE member_id IN (%s)" % ",".join("?" * len(ids)), ids).fetchall()
    sent = 0
    for row in rows:
        try:
            prefs = json.loads(row["prefs_json"])
            sub = json.loads(row["subscription_json"])
        except (ValueError, TypeError):
            continue
        if not prefs.get(type_key):
            continue
        ok, should_remove = send_push(sub, title, body, url, tag=type_key)
        sent += 1 if ok else 0
        if should_remove:
            db.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (row["endpoint"],))
    db.commit()
    return sent


def broadcast(type_key, title, body, url="/"):
    """Send a notification to everyone opted in to this type.

    Returns (sent, failed). Safe to call even when push isn't configured —
    it simply does nothing, so features that trigger it never break.
    """
    if type_key not in TYPE_KEYS:
        return 0, 0
    # Either transport being available is enough — a church might run the
    # native apps without web push configured, or the other way round.
    if not push_is_configured() and not native_push_is_configured():
        return 0, 0

    db = get_db()
    rows = db.execute("SELECT * FROM push_subscriptions").fetchall()
    sent = failed = 0
    dead = []

    for row in rows:
        try:
            prefs = json.loads(row["prefs_json"])
        except (ValueError, TypeError):
            continue
        if not prefs.get(type_key):
            continue
        try:
            sub = json.loads(row["subscription_json"])
        except (ValueError, TypeError):
            continue

        ok, should_remove = send_push(sub, title, body, url, tag=type_key)
        if ok:
            sent += 1
        else:
            failed += 1
            if should_remove:
                dead.append(row["endpoint"])

    for endpoint in dead:
        db.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (endpoint,))
    if dead:
        db.commit()

    return sent, failed


# ---------- Resources ----------

@app.route("/resources")
def resources():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM resources WHERE published=1 ORDER BY sort_order, title"
    ).fetchall()
    grouped = []
    for slug, name, blurb in RESOURCE_CATEGORIES:
        items = [r for r in rows if r["category"] == slug]
        if items:
            grouped.append({"slug": slug, "name": name, "blurb": blurb, "items": items})
    return render_template(
        "resources.html", church_name=CHURCH_NAME, grouped=grouped
    )


@app.route("/resources/<int:resource_id>")
def resource_detail(resource_id):
    db = get_db()
    r = db.execute(
        "SELECT * FROM resources WHERE id=? AND published=1", (resource_id,)
    ).fetchone()
    if not r:
        abort(404)
    # Links and files go straight out; only articles have a reader page.
    if r["kind"] != "article":
        target = r["url"] or r["file_path"]
        if target:
            return redirect(target)
        abort(404)
    category_name = next(
        (n for s, n, _ in RESOURCE_CATEGORIES if s == r["category"]), "Resources"
    )
    return render_template(
        "resource_detail.html", church_name=CHURCH_NAME, r=r, category_name=category_name
    )


# ---------- Ministries ----------

@app.route("/ministries")
def ministries():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM ministries WHERE active=1 ORDER BY sort_order, name"
    ).fetchall()
    return render_template("ministries.html", church_name=CHURCH_NAME, ministries=rows)


@app.route("/ministries/<slug>")
def ministry_detail(slug):
    db = get_db()
    m = db.execute(
        "SELECT * FROM ministries WHERE slug=? AND active=1", (slug,)
    ).fetchone()
    if not m:
        abort(404)

    # Upcoming events tagged to this ministry, using the same recurrence logic
    today = date.today()
    range_end = today + timedelta(days=120)
    rows = db.execute("SELECT * FROM events WHERE ministry=?", (slug,)).fetchall()
    items = []
    for row in rows:
        for occ in occurrences(row, today, range_end):
            items.append((occ.isoformat(), row))
    items.sort(key=lambda pair: (pair[0], pair[1]["event_time"]))

    resources = []
    if m["resources"]:
        for line in m["resources"].splitlines():
            line = line.strip()
            if not line:
                continue
            if "|" in line:
                label, url = line.split("|", 1)
                resources.append({"label": label.strip(), "url": url.strip()})
            else:
                resources.append({"label": line, "url": None})

    return render_template(
        "ministry_detail.html",
        church_name=CHURCH_NAME,
        m=m,
        events=items[:6],
        resources=resources,
        safeguarded=slug in SAFEGUARDED_SLUGS,
    )


# ---------- Store ----------

STORE_CATEGORIES = [
    ("books", "Books & resources"),
    ("merchandise", "Merchandise"),
    ("tickets", "Events & tickets"),
    ("music", "Music"),
    ("gifts", "Gifts"),
    ("other", "Other"),
]

STOCK_LABELS = {
    "available": None,                    # nothing shown — the normal case
    "low": "Only a few left",
    "out": "Sold out",
    "preorder": "Available to pre-order",
    "collect": "Collect at church",
}


def store_settings():
    return {
        "enabled": get_setting("store_enabled", "0") == "1",
        "provider": get_setting("store_provider", ""),
        "default_buy_url": get_setting("store_buy_url", ""),
        "delivery_note": get_setting("store_delivery_note", ""),
        "returns_url": get_setting("store_returns_url", ""),
    }


@app.route("/store")
def store():
    cfg = store_settings()
    if not cfg["enabled"]:
        return render_template("store_closed.html", church_name=CHURCH_NAME)

    category = request.args.get("category", "").strip()
    db = get_db()

    sql = "SELECT * FROM products WHERE active=1"
    params = []
    if category and category in dict(STORE_CATEGORIES):
        sql += " AND category=?"
        params.append(category)
    sql += " ORDER BY featured DESC, sort_order, name"
    rows = db.execute(sql, params).fetchall()

    # Only offer category filters that actually have something in them
    used = {
        r["category"] for r in db.execute(
            "SELECT DISTINCT category FROM products WHERE active=1"
        ).fetchall()
    }
    categories = [(slug, label) for slug, label in STORE_CATEGORIES if slug in used]

    featured = [r for r in rows if r["featured"]] if not category else []
    rest = [r for r in rows if not r["featured"]] if not category else rows

    return render_template(
        "store.html",
        church_name=CHURCH_NAME,
        featured=featured,
        products=rest,
        categories=categories,
        active_category=category,
        stock_labels=STOCK_LABELS,
        charity_number=CHARITY_NUMBER,
        **cfg,
    )


@app.route("/store/<int:product_id>")
def product_detail(product_id):
    cfg = store_settings()
    if not cfg["enabled"]:
        abort(404)
    p = get_db().execute(
        "SELECT * FROM products WHERE id=? AND active=1", (product_id,)
    ).fetchone()
    if not p:
        abort(404)
    category_label = dict(STORE_CATEGORIES).get(p["category"], "Other")
    return render_template(
        "product_detail.html",
        church_name=CHURCH_NAME,
        p=p,
        category_label=category_label,
        stock_labels=STOCK_LABELS,
        charity_number=CHARITY_NUMBER,
        **cfg,
    )


# ---------- Giving ----------

CHARITY_NUMBER = "1201405"


def giving_settings():
    return {
        "give_url": get_setting("give_url", ""),
        "regular_url": get_setting("give_regular_url", ""),
        "portal_url": get_setting("give_portal_url", ""),
        "provider": get_setting("give_provider", "Stewardship"),
    }


@app.route("/giving")
def giving():
    db = get_db()
    campaigns = db.execute(
        "SELECT * FROM campaigns WHERE active=1 ORDER BY created_at DESC"
    ).fetchall()
    items = []
    for c in campaigns:
        pct = None
        if c["target_pence"]:
            pct = min(100, round((c["raised_pence"] / c["target_pence"]) * 100))
        items.append({"row": c, "pct": pct})
    return render_template(
        "giving.html",
        church_name=CHURCH_NAME,
        charity_number=CHARITY_NUMBER,
        campaigns=items,
        **giving_settings(),
    )


@app.route("/giving/campaign/<int:campaign_id>")
def campaign_detail(campaign_id):
    db = get_db()
    c = db.execute(
        "SELECT * FROM campaigns WHERE id=? AND active=1", (campaign_id,)
    ).fetchone()
    if not c:
        abort(404)
    pct = None
    if c["target_pence"]:
        pct = min(100, round((c["raised_pence"] / c["target_pence"]) * 100))
    return render_template(
        "campaign_detail.html",
        church_name=CHURCH_NAME,
        charity_number=CHARITY_NUMBER,
        c=c,
        pct=pct,
        **giving_settings(),
    )


@app.route("/giving/gift-aid")
def gift_aid_info():
    return render_template(
        "gift_aid.html",
        church_name=CHURCH_NAME,
        charity_number=CHARITY_NUMBER,
        **giving_settings(),
    )


# ---------- Prayer ----------

CRISIS_NOTE = {
    "line": "If you are in immediate danger or crisis, please don't wait for a reply here.",
    "contacts": [
        ("Samaritans (UK, 24/7)", "116 123"),
        ("Emergency services", "999"),
    ],
}


PRAYER_WALL_DAYS = 60      # a request stays on the wall this long
PRAYER_KEEP_DAYS = 365     # after this, every prayer request is deleted


def wall_cutoff():
    return (datetime.now() - timedelta(days=PRAYER_WALL_DAYS)).isoformat()


def purge_old_prayers(db=None):
    """Delete prayer requests older than a year (see the privacy notice)."""
    db = db or get_db()
    cutoff = (datetime.now() - timedelta(days=PRAYER_KEEP_DAYS)).isoformat()
    n = db.execute("DELETE FROM prayers WHERE submitted_at < ?", (cutoff,)).rowcount
    if n:
        db.commit()
    return n


@app.route("/prayer")
def prayer_wall():
    db = get_db()
    purge_old_prayers(db)
    requests_ = db.execute(
        """SELECT * FROM prayers
           WHERE visibility='public' AND status='live' AND kind='request' AND submitted_at >= ?
           ORDER BY submitted_at DESC LIMIT 50""", (wall_cutoff(),)
    ).fetchall()
    praises = db.execute(
        """SELECT * FROM prayers
           WHERE visibility='public' AND status='live' AND kind='praise'
           ORDER BY COALESCE(answered_at, submitted_at) DESC LIMIT 20"""
    ).fetchall()
    return render_template(
        "prayer.html",
        church_name=CHURCH_NAME,
        requests=requests_,
        praises=praises,
    )


@app.route("/prayer/new", methods=["GET", "POST"])
def prayer_new():
    if request.method == "POST":
        # Honeypot
        if request.form.get("website"):
            return redirect(url_for("prayer_new", sent=1))

        body = request.form.get("body", "").strip()
        if not body:
            flash("Please write your prayer request before submitting.")
            return render_template(
                "prayer_form.html", church_name=CHURCH_NAME, crisis=CRISIS_NOTE
            )

        visibility = request.form.get("visibility", "public")
        if visibility not in ("public", "team", "pastors"):
            visibility = "public"

        kind = request.form.get("kind", "request")
        if kind not in ("request", "praise"):
            kind = "request"

        # Safeguarding screen: hold sensitive posts for a human, even public ones.
        hold_reason = prayer_screen(body)
        if visibility == "public" and hold_reason:
            status = "held"
        elif visibility == "public":
            status = "live"
        else:
            # Team/pastor requests never appear publicly; they sit in the staff queue.
            status = "private"

        # A name only goes on the wall if the person ticked to say it can.
        # Without that tick a public request is saved without the name at all.
        author_name = request.form.get("author_name", "").strip()[:80] or None
        if visibility == "public" and not request.form.get("show_name"):
            author_name = None

        # A private key, kept only on the sender's device, lets them post an
        # update or say it's been answered later — no account needed.
        owner_token = secrets.token_urlsafe(18)
        db = get_db()
        cur = db.execute(
            """INSERT INTO prayers (body, author_name, visibility, kind, status,
                                    hold_reason, submitted_at, owner_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                body,
                author_name,
                visibility,
                kind,
                status,
                hold_reason,
                datetime.now().isoformat(),
                hashlib.sha256(owner_token.encode()).hexdigest(),
            ),
        )
        db.commit()
        new_id = cur.lastrowid

        # Only public, immediately-live requests trigger a notification.
        # Held, team-only and pastor-only requests never do.
        if status == "live" and visibility == "public":
            broadcast(
                "prayer",
                "New prayer request",
                "Someone has asked for prayer.",
                url_for("prayer_wall"),
            )

        if visibility == "public":
            session["new_prayer"] = {"id": new_id, "token": owner_token}
        return redirect(url_for("prayer_new", sent=1, held=1 if status == "held" else None))

    return render_template(
        "prayer_form.html",
        church_name=CHURCH_NAME,
        crisis=CRISIS_NOTE,
        new_prayer=session.pop("new_prayer", None) if request.args.get("sent") else None,
        sent=request.args.get("sent"),
        held=request.args.get("held"),
    )


def _own_prayer(prayer_id):
    data = json_body()
    token = str(data.get("token") or "")
    row = get_db().execute("SELECT * FROM prayers WHERE id=?", (prayer_id,)).fetchone()
    if not row or not row["owner_hash"] or not token or not secrets.compare_digest(
            row["owner_hash"], hashlib.sha256(token.encode()).hexdigest()):
        return None, data
    return row, data


@app.route("/prayer/<int:prayer_id>/update", methods=["POST"])
def prayer_update(prayer_id):
    """The person who shared a request adds news, or says it's been answered."""
    row, data = _own_prayer(prayer_id)
    if not row:
        return {"ok": False, "error": "This request can only be updated from the device it was shared on."}, 403
    text = str(data.get("text") or "").strip()[:1000]
    answered = bool(data.get("answered"))
    if not text and not answered:
        return {"ok": False, "error": "Write an update first."}, 400
    db = get_db()
    now = datetime.now().isoformat()
    hold = prayer_screen(text) if text else None
    status = "held" if hold and row["visibility"] == "public" else row["status"]
    db.execute("UPDATE prayers SET update_text=?, update_at=?, status=?, hold_reason=COALESCE(?, hold_reason) WHERE id=?",
               (text or row["update_text"], now if text else row["update_at"], status, hold, prayer_id))
    if answered:
        db.execute("UPDATE prayers SET kind='praise', answered_at=? WHERE id=?", (now, prayer_id))
    db.commit()
    return {"ok": True, "held": status == "held"}


@app.route("/prayer/<int:prayer_id>/remove", methods=["POST"])
def prayer_remove(prayer_id):
    row, _ = _own_prayer(prayer_id)
    if not row:
        return {"ok": False}, 403
    db = get_db()
    db.execute("UPDATE prayers SET status='removed' WHERE id=?", (prayer_id,))
    db.commit()
    return {"ok": True}


@app.template_filter("ago")
def ago_filter(iso):
    try:
        then = datetime.fromisoformat(str(iso))
    except (TypeError, ValueError):
        return ""
    days = (datetime.now().date() - then.date()).days
    if days <= 0:
        return "today"
    if days == 1:
        return "yesterday"
    if days < 7:
        return f"{days} days ago"
    if days < 14:
        return "last week"
    if days < 60:
        return f"{days // 7} weeks ago"
    return f"{then.day} {then.strftime('%b %Y')}"


@app.route("/prayer/<int:prayer_id>/report", methods=["POST"])
def prayer_report(prayer_id):
    """Anyone can report a request on the wall. It comes straight off the wall
    and waits for staff in Admin → Prayer, like an automatically held one."""
    reported = session.get("prayer_reported", [])
    if prayer_id in reported or len(reported) > 20:
        flash("Thank you. The church staff will look at it.")
        return redirect(url_for("prayer_wall"))
    db = get_db()
    row = db.execute("SELECT id FROM prayers WHERE id=? AND status='live' AND visibility='public'", (prayer_id,)).fetchone()
    if row:
        reason = (request.form.get("reason") or "").strip()[:200]
        db.execute("UPDATE prayers SET status='held', hold_reason=? WHERE id=?",
                   ("Reported by someone using the app" + (f": {reason}" if reason else ""), prayer_id))
        db.commit()
    reported.append(prayer_id)
    session["prayer_reported"] = reported
    flash("Thank you. It’s been taken off the wall until the church staff have looked at it.")
    return redirect(url_for("prayer_wall"))


@app.route("/prayer/<int:prayer_id>/pray", methods=["POST"])
def prayer_pray(prayer_id):
    """Increment the 'praying for you' count. Rate-limited per session."""
    prayed = session.get("prayed_for", [])
    if prayer_id in prayed:
        return {"ok": False, "reason": "already"}, 200
    db = get_db()
    row = db.execute(
        "SELECT id FROM prayers WHERE id=? AND status='live' AND visibility='public'",
        (prayer_id,),
    ).fetchone()
    if not row:
        return {"ok": False, "reason": "not_found"}, 404
    db.execute("UPDATE prayers SET pray_count = pray_count + 1 WHERE id=?", (prayer_id,))
    db.commit()
    prayed.append(prayer_id)
    session["prayed_for"] = prayed
    count = db.execute("SELECT pray_count FROM prayers WHERE id=?", (prayer_id,)).fetchone()[0]
    return {"ok": True, "count": count}, 200


def scripture_text(ref, code="web"):
    """{'ref': label, 'text': plain text, 'verses': […]} for a reference, from the bundled WEB."""
    found = refs.parse(ref)
    if not found:
        return None
    verses = _passage_verses(found, code, 80)
    if not verses:
        return None
    return {"ref": found["label"], "text": " ".join(v["text"] for v in verses), "verses": verses,
            "href": url_for("verse_page", book_slug=found["slug"], chapter=found["chapter"], verse=found["verse"] or 1)}


@app.route("/prayer/pray")
def prayer_session():
    pc = prayer_content
    texts = {k: scripture_text(r) for k, r in pc.SESSION_SCRIPTURE.items()}
    texts["praise"] = scripture_text(pc.praise_for_today())
    wall = get_db().execute(
        "SELECT id, body, author_name, pray_count FROM prayers WHERE visibility='public' AND status='live' "
        "AND kind='request' AND submitted_at >= ? ORDER BY submitted_at DESC LIMIT 3", (wall_cutoff(),)).fetchall()
    return render_template("prayer_session.html", texts=texts, names=pc.NAMES_OF_GOD,
                           wall=[dict(r) for r in wall])


@app.route("/prayer/practices")
def prayer_practices():
    return render_template("prayer_practices.html", practices=prayer_content.PRACTICES)


@app.route("/prayer/practices/<slug>")
def practice_page(slug):
    p = prayer_content.PRACTICES_BY_SLUG.get(slug)
    if not p:
        abort(404)
    texts = {r: scripture_text(r) for r in prayer_content.scripture_refs(p)}
    passage = None
    if p.get("choose_passage"):
        choice = request.args.get("passage")
        options = p["choose_passage"]
        ref = choice if choice and refs.parse(choice) else options[date.today().toordinal() % len(options)]
        passage = scripture_text(ref)
    return render_template("prayer_practice.html", p=p, texts=texts, passage=passage)


@app.route("/prayer/journal")
def prayer_journal():
    """My prayer list: cards for people and causes, dealt a few a day."""
    return render_template("prayer_journal.html", church_name=CHURCH_NAME)


@app.route("/prayer/list/pray")
def prayer_deck():
    """Today's prayer cards, one at a time."""
    return render_template("prayer_deck.html", texts={"open": scripture_text("Philippians 4:6-7")})


@app.route("/api/prayer/feeds")
def prayer_feeds():
    """The church's prayer feeds for the prayer list: the wall, today's
    country, the ministries, and (signed in) requests from your groups.
    Short texts only; nothing here is private to anyone but the viewer."""
    db = get_db()
    feeds = {}
    wall = db.execute(
        "SELECT id, body, author_name, submitted_at, update_text FROM prayers WHERE visibility='public' AND status='live' "
        "AND kind='request' AND submitted_at >= ? ORDER BY submitted_at DESC LIMIT 40", (wall_cutoff(),)).fetchall()
    feeds["wall"] = [{"id": f"w{r['id']}", "pid": r["id"], "title": (r["author_name"] or "").strip() or "A request on the prayer wall",
                      "text": r["body"][:600], "update": (r["update_text"] or "")[:300],
                      "at": (r["submitted_at"] or "")[:10]} for r in wall]
    ec = everyday_content
    c = ec.country_for(date.today())
    feeds["world"] = [{"id": f"c-{date.today().isoformat()}", "title": f"{c['flag']} {c['name']}",
                       "text": f"Today, pray for {c['name']}.",
                       "points": [f"{h}: {t}" for h, t, _ref in ec.WORLD_PROMPTS], "link": url_for("prayer_world")}]
    try:
        mins = db.execute("SELECT slug, name, tagline FROM ministries WHERE active=1 ORDER BY sort_order, name").fetchall()
    except sqlite3.Error:
        mins = []
    feeds["ministries"] = [{"id": f"m-{r['slug']}", "title": r["name"],
                            "text": (r["tagline"] or "").strip() or f"Pray for {r['name']}.",
                            "points": ["For the leaders and helpers: energy, wisdom and joy",
                                       "For everyone who comes: to meet Jesus and grow",
                                       "For the people it hasn't reached yet"],
                            "link": url_for("ministry_detail", slug=r["slug"])} for r in mins]
    feeds["groups"] = []
    m = current_member()
    if m:
        for g in groups_mod.groups_of(db, m["id"])[:12]:
            for p in groups_mod.posts(db, g["id"], m["id"], kinds=("prayer",), limit=8):
                if (p.get("created_at") or "") < (datetime.now() - timedelta(days=30)).isoformat():
                    continue
                feeds["groups"].append({"id": f"g{p['id']}", "title": g["name"],
                                        "by": groups_mod.display_name(p),
                                        "text": (p["body"] or "")[:600], "at": (p.get("created_at") or "")[:10],
                                        "link": url_for("group_page", gid=g["id"])})
    resp = app.response_class(json.dumps({"ok": True, "feeds": feeds}), mimetype="application/json")
    resp.headers["Cache-Control"] = "private, no-store"
    return resp


# ---------- Grow, exploring faith and everyday faith (Wave 6) ----------
#
# The words live in grow_content.py, faith_content.py and everyday_content.py
# so they can be checked and edited without touching any code. Progress,
# answers and drafts stay on the person's device (and their account when
# signed in, via the "grow" sync kind). The only thing that reaches the church
# is a story someone chooses to share, and that waits for a person to approve.

@app.template_filter("ref_url")
def ref_url_filter(ref):
    """Any reference → its verse page, or the chapter in the reader."""
    f = refs.parse(ref or "")
    if not f:
        return url_for("bible_hub")
    if f["verse"]:
        return url_for("verse_page", book_slug=f["slug"], chapter=f["chapter"], verse=f["verse"])
    return url_for("bible_read_chapter", book_slug=f["slug"], chapter=f["chapter"])


def _texts(refs_list):
    return {r: scripture_text(r) for r in refs_list if r}


def _link(endpoint, args):
    if not endpoint:
        return None
    try:
        return url_for(endpoint, **(args or {}))
    except Exception:
        return None


@app.route("/grow")
def grow_hub():
    return render_template("grow/hub.html", steps=grow_content.FIRST_STEPS, sessions=grow_content.SESSIONS,
                           course=grow_content.COURSE, season=everyday_content.season_for())


@app.route("/grow/first-steps")
def grow_first_steps():
    return render_template("grow/first_steps.html", steps=grow_content.FIRST_STEPS)


@app.route("/grow/first-steps/<slug>")
def grow_step(slug):
    steps = grow_content.FIRST_STEPS
    i = next((n for n, s in enumerate(steps) if s["slug"] == slug), None)
    if i is None:
        abort(404)
    s = steps[i]
    tries = [{"text": t, "href": _link(e, a)} for t, e, a in s["try"]]
    return render_template("grow/step.html", s=s, n=i + 1, total=len(steps), tries=tries,
                           texts=_texts([s["verse"], s["read"]]),
                           prev=steps[i - 1] if i else None, next=steps[i + 1] if i + 1 < len(steps) else None)


@app.route("/grow/foundations")
def grow_course():
    return render_template("grow/course.html", course=grow_content.COURSE, sessions=grow_content.SESSIONS)


@app.route("/grow/foundations/<slug>")
def grow_session(slug):
    sessions = grow_content.SESSIONS
    i = next((n for n, s in enumerate(sessions) if s["slug"] == slug), None)
    if i is None:
        abort(404)
    s = sessions[i]
    mem = refs.parse(s["memory"])
    more = None
    if s.get("more", "").startswith("faith_question:"):
        q = faith_content.QUESTIONS_BY_SLUG.get(s["more"].split(":", 1)[1])
        if q:
            more = {"title": q["q"], "href": url_for("faith_question", slug=q["slug"])}
    return render_template("grow/session.html", s=s, n=i + 1, total=len(sessions), course=grow_content.COURSE,
                           texts=_texts([s["read"], s["memory"]]), more=more,
                           memory_href=url_for("memorise_add", book_slug=mem["slug"], chapter=mem["chapter"],
                                               verse=mem["verse"] or 1, to=mem.get("end_verse") or None) if mem else None,
                           prev=sessions[i - 1] if i else None, next=sessions[i + 1] if i + 1 < len(sessions) else None)


@app.route("/grow/check-in")
def grow_checkin():
    areas = []
    for a in grow_content.CHECKIN_AREAS:
        areas.append(dict(a, next=[{"text": t, "href": _link(e, x)} for t, e, x in a["next"]]))
    return render_template("grow/checkin.html", areas=areas, scale=grow_content.CHECKIN_SCALE)


@app.route("/grow/gifts")
def grow_gifts():
    gifts = [dict(g, links=[{"t": r.replace("-", "–"), "h": ref_url_filter(r)} for r in g["refs"]])
             for g in grow_content.GIFTS]
    # Interleave the statements so the questionnaire doesn't read gift by gift.
    items = []
    for k in range(3):
        for g in gifts:
            items.append({"gift": g["key"], "text": g["statements"][k]})
    return render_template("grow/gifts.html", gifts=gifts, items=items, scale=grow_content.GIFTS_SCALE)


@app.route("/grow/story")
def grow_story():
    return render_template("grow/story.html", parts=grow_content.STORY_PARTS, tips=grow_content.STORY_TIPS)


@app.route("/grow/stories")
def grow_stories():
    rows = get_db().execute(
        "SELECT * FROM testimonies WHERE status='live' ORDER BY published_at DESC").fetchall()
    return render_template("grow/stories.html", stories=rows, sent=request.args.get("sent"))


@app.route("/grow/stories/share", methods=["POST"])
def grow_story_share():
    if request.form.get("website"):            # honeypot
        return redirect(url_for("grow_stories", sent=1))
    body = (request.form.get("body") or "").strip()[:6000]
    if len(body) < 40:
        flash("Your story looks a little short. Write a few sentences before sharing it.")
        return redirect(url_for("grow_story"))
    if not request.form.get("consent"):
        flash("Please tick the box to say the church may share your story.")
        return redirect(url_for("grow_story"))
    db = get_db()
    db.execute(
        "INSERT INTO testimonies (body, author_name, title, status, hold_reason, submitted_at) VALUES (?, ?, ?, 'pending', ?, ?)",
        (body, (request.form.get("author_name") or "").strip()[:80] or None,
         (request.form.get("title") or "").strip()[:120] or None, prayer_screen(body), datetime.now().isoformat()))
    db.commit()
    return redirect(url_for("grow_stories", sent=1))


@app.route("/grow/rhythm")
def grow_rhythm():
    return render_template("grow/rhythm.html", groups=grow_content.RHYTHM_GROUPS, about=grow_content.RHYTHM_ABOUT)


def next_steps_info():
    return {k: (get_setting(k, v) or v) for k, v in grow_content.NEXT_STEPS_DEFAULTS.items()}


@app.route("/grow/next-steps")
def grow_next_steps():
    info = next_steps_info()
    return render_template("grow/next_steps.html", info=info, sections=grow_content.NEXT_STEPS_SECTIONS)


@app.route("/grow/me")
def discipleship():
    """Your discipleship at a glance: prayer, scripture and study over the
    weeks, your goals, where you are on the path, and a next step.

    Worked out in the browser from what this device holds, after a sync with
    the account when signed in, the same way the rest of Grow works. So it is
    always current, works offline, and nothing personal is rendered by the
    server or seen by anyone at the church."""
    m = current_member()
    books = [{"s": b["slug"], "n": b["name"], "c": b["chapters"], "nt": i >= 39} for i, b in enumerate(ALL_BOOKS)]
    data = {
        "books": books,
        "steps": [{"slug": x["slug"], "title": x["title"]} for x in grow_content.FIRST_STEPS],
        "sessions": [{"slug": x["slug"], "title": x["title"]} for x in grow_content.SESSIONS],
        "areas": [{"key": a["key"], "title": a["title"], "emoji": a["emoji"]} for a in grow_content.CHECKIN_AREAS],
        "scale": grow_content.CHECKIN_SCALE,
        "signedIn": bool(m),
        "inGroup": bool(m and groups_mod.groups_of(get_db(), m["id"])),
        "name": (m["name"] or "").split(" ")[0] if m else "",
    }
    return render_template("grow/discipleship.html", data=data)


@app.route("/family")
def family_hub():
    items = everyday_content.FAMILY
    today = date.today().toordinal() % len(items)
    return render_template("grow/family.html", items=items, today=today)


@app.route("/family/<int:n>")
def family_page(n):
    items = everyday_content.FAMILY
    if not 1 <= n <= len(items):
        abort(404)
    f = items[n - 1]
    return render_template("grow/family_page.html", f=f, n=n, total=len(items), text=scripture_text(f["read"]))


# ----- exploring faith

@app.route("/faith")
def faith_hub():
    return render_template("faith/hub.html", questions=faith_content.QUESTIONS[:6])


@app.route("/faith/gospel")
def faith_gospel():
    return render_template("faith/gospel.html", panels=faith_content.GOSPEL, prayer=faith_content.GOSPEL_PRAYER,
                           texts=_texts([p["verse"] for p in faith_content.GOSPEL]))


@app.route("/faith/story")
def faith_story():
    story = faith_content.BIG_STORY
    return render_template("faith/story.html", story=story, texts=_texts([s["verse"] for s in story]))


@app.route("/faith/questions")
def faith_questions():
    return render_template("faith/questions.html", questions=faith_content.QUESTIONS)


@app.route("/faith/questions/<slug>")
def faith_question(slug):
    q = faith_content.QUESTIONS_BY_SLUG.get(slug)
    if not q:
        abort(404)
    others = [x for x in faith_content.QUESTIONS if x["slug"] != slug]
    i = faith_content.QUESTIONS.index(q)
    return render_template("faith/question.html", q=q, texts=_texts(q["verses"]),
                           others=(others[i:] + others[:i])[:4])


@app.route("/faith/words")
def faith_words():
    words = []
    for word, meaning, ref in faith_content.GLOSSARY:
        words.append({"word": word, "meaning": meaning, "ref": ref, "id": re.sub(r"[^a-z]+", "-", word.lower()).strip("-")})
    return render_template("faith/words.html", words=words)


@app.route("/faith/share")
def faith_share():
    return render_template("faith/share.html", starters=faith_content.SHARE_STARTERS, tips=faith_content.SHARE_TIPS,
                           texts=_texts(faith_content.SHARE_VERSES), verses=faith_content.SHARE_VERSES)


# ----- everyday faith

@app.route("/bible/feelings")
def feelings_index():
    return render_template("everyday/feelings.html", feelings=everyday_content.FEELINGS)


@app.route("/bible/feelings/<slug>")
def feeling_page(slug):
    f = everyday_content.FEELINGS_BY_SLUG.get(slug)
    if not f:
        abort(404)
    return render_template("everyday/feeling.html", f=f, texts=_texts(f["verses"]),
                           help=everyday_content.URGENT_HELP, feelings=everyday_content.FEELINGS)


@app.route("/prayer/night")
def prayer_night():
    ps = everyday_content.NIGHT_PSALMS
    choice = request.args.get("psalm")
    psalm = choice if choice in ps else ps[date.today().toordinal() % len(ps)]
    steps = everyday_content.NIGHT_STEPS
    texts = _texts([s.get("verse") for s in steps] + [psalm])
    return render_template("everyday/night.html", steps=steps, texts=texts, psalm=psalm, psalms=ps)


@app.route("/prayer/fasting")
def prayer_fasting():
    ec = everyday_content
    return render_template("everyday/fasting.html", about=ec.FASTING_ABOUT, safety=ec.FASTING_SAFETY, kinds=ec.FAST_KINDS,
                           steps=ec.FAST_STEPS, verses=ec.FASTING_VERSES, during=_texts(ec.FAST_DURING),
                           texts=_texts(ec.FASTING_VERSES[:2]))


@app.route("/prayer/world")
def prayer_world():
    ec = everyday_content
    d = date.today()
    try:
        offset = int(request.args.get("d", 0))
    except ValueError:
        offset = 0
    offset = max(-400, min(400, offset))
    c = ec.country_for(d + timedelta(days=offset))
    return render_template("everyday/world.html", c=c, prompts=ec.WORLD_PROMPTS, offset=offset,
                           texts=_texts([p[2] for p in ec.WORLD_PROMPTS]),
                           countries=[{"name": n, "flag": ec.flag(code)} for n, code in ec.COUNTRIES])


# ----- Sunday

def parse_outline(text):
    """Sermon outline → lines with [blanks]. '# ' starts a heading."""
    out = []
    n = 0
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line:
            continue
        kind = "p"
        if line.startswith("#"):
            kind, line = "h", line.lstrip("#").strip()
        elif line[:2] in ("- ", "* ", "• "):
            line = line[2:].strip()
        parts, at = [], 0
        for m in re.finditer(r"\[([^\[\]]{1,60})\]", line):
            if m.start() > at:
                parts.append({"t": line[at:m.start()]})
            parts.append({"b": m.group(1).strip(), "n": n})
            n += 1
            at = m.end()
        if at < len(line):
            parts.append({"t": line[at:]})
        out.append({"kind": kind, "parts": parts})
    return out


SECTIONS = {
    # key: (label, what "automatic" means)
    "sunday": ("This Sunday", "Shown when this week's talk has fill-in notes or group questions."),
    "questions": ("Questions & Answers", "Shown once at least one question has been answered."),
    "store": ("Store", "Shown once at least one product is listed."),
}


def _section_has_content(key):
    db = get_db()
    if key == "sunday":
        s = sunday_sermon()
        return bool(s and (s["outline"] or s["group_questions"] or s["passage"]))
    if key == "questions":
        return bool(db.execute("SELECT 1 FROM questions WHERE status='answered' LIMIT 1").fetchone())
    if key == "store":
        return bool(db.execute("SELECT 1 FROM products WHERE active=1 LIMIT 1").fetchone())
    return True


def section_on(key):
    """Whether a section is shown in menus: an admin's choice, or automatic
    (shown once it has something in it, so nobody lands on an empty page)."""
    if "sections" not in g:
        g.sections = {}
    if key not in g.sections:
        mode = get_setting(f"section_{key}", "auto") or "auto"
        g.sections[key] = True if mode == "on" else False if mode == "off" else _section_has_content(key)
    return g.sections[key]


def sunday_sermon():
    """This week's talk: the one nearest today (within six days either way),
    preferring one with an outline. An upcoming talk can be added in advance,
    unpublished, and still shows here so people can follow along on Sunday."""
    db = get_db()
    today = date.today()
    lo, hi = (today - timedelta(days=6)).isoformat(), (today + timedelta(days=6)).isoformat()
    return db.execute(
        "SELECT * FROM sermons WHERE preached_on BETWEEN ? AND ? AND (published=1 OR preached_on >= ?) "
        "ORDER BY (COALESCE(outline,'') != '') DESC, ABS(julianday(preached_on) - julianday(?)) ASC LIMIT 1",
        (lo, hi, today.isoformat(), today.isoformat())).fetchone()


DBS_QUESTIONS = [
    "What stood out to you in this passage, or in Sunday’s talk?",
    "What does it show us about God?",
    "What does it show us about people?",
    "Is there an example to follow, a promise to trust, or a warning to heed?",
    "What will you do about it this week? Who will you tell?",
]


def sermon_passage(row):
    p = refs.parse(row["passage"]) if row and row["passage"] else None
    return p


@app.route("/sunday")
def sunday_page():
    row = sunday_sermon()
    if not row:
        return render_template("sunday.html", s=None, outline=[], passage=None, text=None)
    p = sermon_passage(row)
    return render_template("sunday.html", s=row, outline=parse_outline(row["outline"]), passage=p,
                           text=scripture_text(row["passage"]) if p else None,
                           has_group=True)


@app.route("/watch/<int:sermon_id>/group")
def sermon_group(sermon_id):
    row = get_db().execute("SELECT * FROM sermons WHERE id=?", (sermon_id,)).fetchone()
    if not row or (not row["published"] and row["preached_on"] < date.today().isoformat()):
        abort(404)
    qs = [q.strip(" -•*\t") for q in (row["group_questions"] or "").splitlines() if q.strip(" -•*\t")]
    p = sermon_passage(row)
    return render_template("sermon_group.html", s=row, questions=qs or DBS_QUESTIONS, written=bool(qs),
                           passage=p, text=scripture_text(row["passage"]) if p else None)


def talks_on(slug, chapter):
    """Clearspring talks whose passage includes this chapter."""
    out = []
    for r in get_db().execute(
            "SELECT id, title, speaker, preached_on, passage FROM sermons WHERE published=1 AND passage IS NOT NULL AND passage != '' "
            "ORDER BY preached_on DESC").fetchall():
        for f in refs.find(r["passage"]):
            end_ch = f.get("end_chapter") or f["chapter"]
            if f["slug"] == slug and f["chapter"] <= chapter <= end_ch:
                out.append(dict(r))
                break
    return out[:5]


@app.context_processor
def inject_season():
    return {"church_season": everyday_content.season_for}


@app.context_processor
def inject_site():
    """Church details every page can use (looked up once per request, only if used)."""
    def site():
        if "site_info" not in g:
            g.site_info = visit_info()
        return g.site_info
    return {"site": site, "wall_days": PRAYER_WALL_DAYS, "section_on": section_on,
            "guide_on": lambda: get_setting("guide_enabled", "1") != "0"}


# ----- staff

@app.route("/admin/stories")
@login_required
def admin_stories():
    db = get_db()
    pending = db.execute("SELECT * FROM testimonies WHERE status='pending' ORDER BY submitted_at").fetchall()
    live = db.execute("SELECT * FROM testimonies WHERE status='live' ORDER BY published_at DESC").fetchall()
    return render_template("admin_stories.html", pending=pending, live=live)


@app.route("/admin/stories/<int:story_id>/<action>", methods=["POST"])
@login_required
def admin_story_action(story_id, action):
    db = get_db()
    if action == "publish":
        title = (request.form.get("title") or "").strip()[:120] or None
        body = (request.form.get("body") or "").strip()
        db.execute("UPDATE testimonies SET status='live', published_at=?, title=COALESCE(?, title), body=CASE WHEN ?='' THEN body ELSE ? END WHERE id=?",
                   (datetime.now().isoformat(), title, body, body, story_id))
        flash("Story published.")
    elif action == "hide":
        db.execute("UPDATE testimonies SET status='hidden' WHERE id=?", (story_id,))
        flash("Story taken down.")
    elif action == "delete":
        db.execute("DELETE FROM testimonies WHERE id=?", (story_id,))
        flash("Story deleted.")
    else:
        abort(404)
    db.commit()
    return redirect(url_for("admin_stories"))


@app.route("/admin/next-steps", methods=["GET", "POST"])
@login_required
def admin_next_steps():
    saved = False
    if request.method == "POST":
        for key in grow_content.NEXT_STEPS_DEFAULTS:
            set_setting(key, (request.form.get(key) or "").strip())
        get_db().commit()
        saved = True
    labels = dict((k, t) for k, e, t in grow_content.NEXT_STEPS_SECTIONS)
    labels["next_contact"] = "How to get in touch"
    return render_template("admin_next_steps.html", info=next_steps_info(), labels=labels, saved=saved)


# ---------- Groups (Wave 7) ----------
#
# Private groups for members with an account. See groups.py for what is
# shared with whom.

@app.route("/api/push/claim", methods=["POST"])
def push_claim():
    """Tie this phone's notifications to whoever is signed in (or untie them
    after signing out), so group notifications reach the right people."""
    data = json_body()
    endpoint = str(data.get("endpoint") or "").strip()
    token = str(data.get("native_token") or "").strip()
    m = current_member()
    db = get_db()
    if token:
        rows = db.execute("SELECT endpoint FROM push_subscriptions WHERE endpoint LIKE ?", (f"native:%:{token}",)).fetchall()
        endpoints = [r["endpoint"] for r in rows]
    else:
        endpoints = [endpoint] if endpoint else []
    for e in endpoints:
        db.execute("UPDATE push_subscriptions SET member_id=? WHERE endpoint=?", (m["id"] if m else None, e))
    db.commit()
    return {"ok": True, "claimed": bool(endpoints) and bool(m)}, 200


def _group_or_404(gid):
    m = current_member()
    g_ = groups_mod.get(get_db(), gid)
    if not g_:
        abort(404)
    mem = groups_mod.membership(get_db(), gid, m["id"])
    if not mem:
        abort(404)
    return m, g_, mem


def _leader_only(mem):
    if mem["role"] != "leader":
        abort(403)


def _back(gid, tab="talk", anchor=""):
    return redirect(url_for("group_page", gid=gid, tab=tab) + (f"#{anchor}" if anchor else ""))


def _needs_name(m):
    return not (m["name"] or "").strip()


def _set_name_from_form(m):
    """Groups show names, never emails, so ask for one the first time."""
    name = (request.form.get("display_name") or "").strip()[:60]
    if name:
        db = get_db()
        db.execute("UPDATE members SET name=? WHERE id=?", (name, m["id"]))
        g.pop("member", None)
        return True
    return not _needs_name(m)


@app.route("/groups")
def groups_index():
    m = current_member()
    mine = groups_mod.groups_of(get_db(), m["id"]) if m else []
    for x in mine:
        x["kind_name"] = groups_mod.KIND_NAMES.get(x["kind"], "Group")
        x["emoji"] = groups_mod.KIND_EMOJI.get(x["kind"], "✨")
    return render_template("groups/index.html", mine=mine, kinds=groups_mod.KINDS,
                           needs_name=bool(m and _needs_name(m)))


@app.route("/groups/new", methods=["POST"])
@member_required
def group_new():
    m = current_member()
    db = get_db()
    name = (request.form.get("name") or "").strip()[:80]
    if not name:
        flash("Give your group a name.")
        return redirect(url_for("groups_index"))
    if not _set_name_from_form(m):
        flash("Add your name so others in the group know who you are.")
        return redirect(url_for("groups_index"))
    n = db.execute("SELECT COUNT(*) FROM group_members WHERE member_id=?", (m["id"],)).fetchone()[0]
    if n >= groups_mod.MAX_GROUPS_PER_MEMBER:
        flash("You’re in as many groups as the app allows. Leave one to start another.")
        return redirect(url_for("groups_index"))
    if rate_limited("group_new", str(m["id"]), limit=5, window_seconds=3600):
        flash("You’ve made several groups just now. Please try again later.")
        return redirect(url_for("groups_index"))
    gid = groups_mod.create(db, m["id"], name, request.form.get("kind", "other"),
                            (request.form.get("about") or "").strip()[:400])
    db.commit()
    return redirect(url_for("group_page", gid=gid, tab="people", new=1))


@app.route("/groups/join", methods=["POST"])
def group_join_code():
    code = groups_mod.clean_code(request.form.get("code"))
    if not code:
        flash("That code doesn’t look right. Codes are 8 letters and numbers.")
        return redirect(url_for("groups_index"))
    return redirect(url_for("group_join", code=code))


@app.route("/groups/join/<code>", methods=["GET", "POST"])
def group_join(code):
    code = groups_mod.clean_code(code)
    db = get_db()
    grp = groups_mod.by_code(db, code) if code else None
    m = current_member()
    if not grp:
        return render_template("groups/join.html", grp=None, code=code), 404
    if m and groups_mod.membership(db, grp["id"], m["id"]):
        return redirect(url_for("group_page", gid=grp["id"]))
    if request.method == "POST":
        if not m:
            session["after_signin"] = request.path
            return redirect(url_for("signin"))
        if not _set_name_from_form(m):
            flash("Add your name so others in the group know who you are.")
            return redirect(request.path)
        result = groups_mod.join(db, grp["id"], m["id"])
        db.commit()
        if result == "full":
            flash("Sorry, this group is full.")
            return redirect(request.path)
        if result == "too-many":
            flash("You’re in as many groups as the app allows. Leave one to join this.")
            return redirect(url_for("groups_index"))
        return redirect(url_for("group_page", gid=grp["id"], joined=1))
    if not m:
        session["after_signin"] = request.path
    return render_template("groups/join.html", grp=grp, code=code,
                           count=groups_mod.member_count(db, grp["id"]),
                           kind_name=groups_mod.KIND_NAMES.get(grp["kind"], "Group"),
                           emoji=groups_mod.KIND_EMOJI.get(grp["kind"], "✨"),
                           needs_name=bool(m and _needs_name(m)))


def _verse_text(ref):
    try:
        return scripture_text(ref) if ref else None
    except Exception:
        return None


@app.route("/groups/<int:gid>")
@member_required
def group_page(gid):
    m, grp, mem = _group_or_404(gid)
    db = get_db()
    tab = request.args.get("tab", "talk")
    if tab not in ("talk", "pray", "read", "learn", "people"):
        tab = "talk"
    ctx = {"grp": grp, "mem": mem, "tab": tab, "me": m,
           "kind_name": groups_mod.KIND_NAMES.get(grp["kind"], "Group"),
           "emoji": groups_mod.KIND_EMOJI.get(grp["kind"], "✨"),
           "is_leader": mem["role"] == "leader", "kinds": groups_mod.KINDS,
           "unread_from": mem["last_seen_post"], "today_iso": date.today().isoformat()}
    people = groups_mod.members(db, gid)
    ctx["people"] = people

    plan = None
    if grp["plan_slug"]:
        p = plans_engine.builtin(grp["plan_slug"])
        if p:
            today_n = groups_mod.plan_day_today(grp)
            total = len(p["days"])
            plan = {"slug": grp["plan_slug"], "title": p["title"], "emoji": p.get("emoji", "📖"), "total": total,
                    "start": grp["plan_start"], "today": today_n if today_n and today_n <= total else None,
                    "finished": bool(today_n and today_n > total)}
            if plan["today"]:
                plan["today_label"] = ", ".join(plans_engine.label(seg) for seg in p["days"][plan["today"] - 1])
                plan["today_href"] = url_for("bible_read_chapter", book_slug=p["days"][plan["today"] - 1][0][0],
                                             chapter=p["days"][plan["today"] - 1][0][1],
                                             plan=grp["plan_slug"], day=plan["today"])
            if tab == "read":
                # Days that should be done by now: today's reading isn't late yet.
                expected = min(total, max(0, (today_n or 0) - 1))
                rows = []
                for person in people:
                    if not person["share_progress"] and person["member_id"] != m["id"]:
                        rows.append({"name": groups_mod.display_name(person), "hidden": True})
                        continue
                    pr = groups_mod.plan_progress(db, person["member_id"], grp["plan_slug"], grp["plan_start"], p["days"])
                    rows.append({"name": groups_mod.display_name(person), "me": person["member_id"] == m["id"],
                                 "joined": pr["joined"], "done": pr["done"],
                                 "pct": round(100 * pr["done"] / total) if total else 0,
                                 "status": ("finished" if pr["done"] >= total else
                                            "up to date" if pr["done"] >= expected else
                                            f"{expected - pr['done']} behind")})
                rows.sort(key=lambda r: (r.get("hidden", False), not r.get("joined", False), -r.get("done", 0)))
                plan["people"] = rows
                plan["expected"] = expected
                plan["my"] = next((r for r in rows if r.get("me")), None)
    ctx["plan"] = plan

    if tab == "talk":
        ctx["posts"] = groups_mod.posts(db, gid, m["id"], kinds=("post", "checkin", "verse"))
        for p_ in ctx["posts"]:
            if p_["kind"] == "verse":
                p_["verse"] = _verse_text(p_["ref"])
        ctx["checkin_qs"] = groups_mod.CHECKIN_QUESTIONS
    elif tab == "pray":
        allp = groups_mod.posts(db, gid, m["id"], kinds=("prayer",), limit=100)
        ctx["praying"] = [p_ for p_ in allp if not p_["answered_at"]]
        ctx["answered"] = [p_ for p_ in allp if p_["answered_at"]]
    elif tab == "read" and plan and plan["today"]:
        ctx["day_posts"] = groups_mod.posts(db, gid, m["id"], plan_day=plan["today"], kinds=("post",))
    elif tab == "learn" and grp["verse_key"]:
        ctx["verse"] = _verse_text(grp["verse_label"])
        rows = []
        for person in people:
            if not person["share_progress"] and person["member_id"] != m["id"]:
                continue
            rows.append({"name": groups_mod.display_name(person), "me": person["member_id"] == m["id"],
                         "status": groups_mod.memory_status(db, person["member_id"], grp["verse_key"])})
        order = {"known": 0, "learning": 1, "added": 2, "not-started": 3}
        rows.sort(key=lambda r: order[r["status"]])
        ctx["learners"] = rows
        ctx["verse_learn_href"] = url_for("memorise_lesson", ref=grp["verse_key"], add=1)
    if tab == "people":
        ctx["invite_url"] = url_for("group_join", code=grp["invite_code"], _external=True)
        ctx["plans"] = [p_ for p_ in plans_engine.catalogue()]
    if tab == "read" and not plan:
        ctx["plans"] = [p_ for p_ in plans_engine.catalogue()]

    groups_mod.mark_seen(db, gid, m["id"])
    db.commit()
    return render_template("groups/group.html", **ctx)


def _notify_group(grp, author, title, body, tab):
    others = [r["member_id"] for r in get_db().execute(
        "SELECT member_id FROM group_members WHERE group_id=? AND member_id!=?", (grp["id"], author["id"])).fetchall()]
    try:
        notify_members(others, "groups", title, body, url_for("group_page", gid=grp["id"], tab=tab))
    except Exception:
        app.logger.exception("group notification failed")


@app.route("/groups/<int:gid>/post", methods=["POST"])
@member_required
def group_post(gid):
    m, grp, mem = _group_or_404(gid)
    db = get_db()
    kind = request.form.get("kind", "post")
    if kind not in ("post", "prayer", "checkin", "verse", "reply"):
        abort(400)
    tab = {"prayer": "pray"}.get(kind, request.form.get("tab") or "talk")
    if groups_mod.posts_in_last_hour(db, m["id"]) >= 40:
        flash("You’ve posted a lot in the last hour. Please wait a little before posting again.")
        return _back(gid, tab)
    body = (request.form.get("body") or "").strip()[:4000]
    meta = None
    ref = None
    parent_id = None
    plan_day = None
    if kind == "checkin":
        answers = {}
        for key, q in groups_mod.CHECKIN_QUESTIONS:
            a = (request.form.get("q_" + key) or "").strip()[:1500]
            if a:
                answers[key] = a
        if not answers:
            flash("Answer at least one of the questions.")
            return _back(gid, "talk")
        meta = {"answers": answers}
        body = "\n\n".join(f"{q}\n{answers[k]}" for k, q in groups_mod.CHECKIN_QUESTIONS if k in answers)
    elif kind == "verse":
        f = refs.parse(request.form.get("ref") or "")
        if not f:
            flash("That Bible reference wasn’t recognised.")
            return _back(gid, "talk")
        ref = f["label"].replace("–", "-")
    elif kind == "reply":
        parent = groups_mod.post(db, gid, request.form.get("parent_id", type=int) or 0)
        if not parent or parent["parent_id"]:
            abort(400)
        parent_id = parent["id"]
        kind = parent["kind"] if parent["kind"] != "checkin" else "post"
        kind = "reply"
    if kind in ("post", "prayer", "reply") and not body:
        flash("Write something first.")
        return _back(gid, tab)
    pd = request.form.get("plan_day", type=int)
    if pd and grp["plan_slug"]:
        plan_day = pd
    pid = groups_mod.add_post(db, gid, m["id"], kind, body, ref=ref, plan_day=plan_day, parent_id=parent_id, meta=meta)
    db.commit()
    who = groups_mod.display_name(m)
    if kind == "prayer":
        _notify_group(grp, m, f"{grp['name']}: prayer request", f"{who} has asked the group to pray.", "pray")
    elif kind in ("post", "checkin", "verse"):
        _notify_group(grp, m, grp["name"], f"{who} posted in the group.", "talk")
    # A gentle word to someone who may be struggling; the post still goes up.
    if prayer_screen(body) and "self-harm" in (prayer_screen(body) or ""):
        flash("Thank you for sharing. If you’re struggling to stay safe, please call Samaritans free on 116 123, any time.")
    anchor = f"p{parent_id or pid}"
    return _back(gid, tab, anchor)


@app.route("/groups/<int:gid>/posts/<int:pid>/<action>", methods=["POST"])
@member_required
def group_post_action(gid, pid, action):
    m, grp, mem = _group_or_404(gid)
    db = get_db()
    p = groups_mod.post(db, gid, pid)
    if not p:
        if action == "pray":
            return {"ok": False}, 404
        abort(404)
    mine = p["member_id"] == m["id"]
    tab = "pray" if p["kind"] == "prayer" else ("read" if p["plan_day"] else "talk")
    if action == "pray":
        on, n = groups_mod.toggle_prayed(db, pid, m["id"])
        db.commit()
        return {"ok": True, "on": on, "count": n}, 200
    if action == "delete":
        if not (mine or mem["role"] == "leader"):
            abort(403)
        groups_mod.remove_post(db, pid)
    elif action == "answered":
        if not mine or p["kind"] != "prayer":
            abort(403)
        db.execute("UPDATE group_posts SET answered_at=?, answer=? WHERE id=?",
                   (groups_mod.now(), (request.form.get("answer") or "").strip()[:1000] or None, pid))
        _notify_group(grp, m, f"{grp['name']}: prayer answered", f"{groups_mod.display_name(m)} says a prayer has been answered!", "pray")
    elif action == "unanswered":
        if not mine:
            abort(403)
        db.execute("UPDATE group_posts SET answered_at=NULL, answer=NULL WHERE id=?", (pid,))
    elif action == "report":
        groups_mod.report(db, pid, m["id"], request.form.get("reason"))
        flash("Thank you. The church staff will look at this.")
    elif action == "block":
        if mine or not p["member_id"]:
            abort(400)
        groups_mod.block(db, m["id"], p["member_id"])
        flash("You won’t see their posts any more. You can undo this in Account.")
    else:
        abort(404)
    db.commit()
    return _back(gid, tab)


@app.route("/groups/<int:gid>/settings", methods=["POST"])
@member_required
def group_settings(gid):
    m, grp, mem = _group_or_404(gid)
    _leader_only(mem)
    db = get_db()
    what = request.form.get("what")
    if what == "details":
        name = (request.form.get("name") or "").strip()[:80] or grp["name"]
        kind = request.form.get("kind") if request.form.get("kind") in groups_mod.KIND_NAMES else grp["kind"]
        db.execute("UPDATE groups SET name=?, kind=?, about=? WHERE id=?",
                   (name, kind, (request.form.get("about") or "").strip()[:400] or None, gid))
        flash("Saved.")
        tab = "people"
    elif what == "plan":
        tab = "read"
        if request.form.get("clear"):
            db.execute("UPDATE groups SET plan_slug=NULL, plan_start=NULL WHERE id=?", (gid,))
        else:
            slug = request.form.get("slug", "")
            start = request.form.get("start") or date.today().isoformat()
            try:
                date.fromisoformat(start)
            except ValueError:
                start = date.today().isoformat()
            if not plans_engine.builtin(slug):
                abort(400)
            db.execute("UPDATE groups SET plan_slug=?, plan_start=? WHERE id=?", (slug, start, gid))
            p = plans_engine.builtin(slug)
            groups_mod.add_post(db, gid, m["id"], "post",
                                f"We’re reading “{p['title']}” together, starting {date.fromisoformat(start).day} {date.fromisoformat(start).strftime('%B')}. Join in on the Read tab.")
            _notify_group(grp, m, grp["name"], f"New reading plan: {p['title']}", "read")
    elif what == "verse":
        tab = "learn"
        if request.form.get("clear"):
            db.execute("UPDATE groups SET verse_key=NULL, verse_label=NULL, verse_note=NULL WHERE id=?", (gid,))
        else:
            f = refs.parse(request.form.get("ref") or "")
            if not f or not f["verse"]:
                flash("Choose a verse, like John 3:16 or Romans 8:38-39.")
                return _back(gid, "learn")
            end = f.get("end_verse") if (f.get("end_chapter") or f["chapter"]) == f["chapter"] else None
            key = f"{f['slug']}.{f['chapter']}.{f['verse']}" + (f"-{end}" if end and end != f["verse"] else "")
            if not memorise_data.parse_key(key):
                flash("That verse couldn’t be used. Try a shorter passage.")
                return _back(gid, "learn")
            db.execute("UPDATE groups SET verse_key=?, verse_label=?, verse_note=? WHERE id=?",
                       (key, f["label"].replace("–", "-"), (request.form.get("note") or "").strip()[:280] or None, gid))
            _notify_group(grp, m, grp["name"], f"A verse to learn together: {f['label']}", "learn")
    elif what == "invite":
        tab = "people"
        db.execute("UPDATE groups SET invite_code=? WHERE id=?", (groups_mod.new_code(db), gid))
        flash("New invite link made. The old one no longer works.")
    elif what == "delete":
        db.execute("UPDATE groups SET archived=1 WHERE id=?", (gid,))
        db.commit()
        flash("The group has been closed.")
        return redirect(url_for("groups_index"))
    else:
        abort(400)
    db.commit()
    return _back(gid, tab)


@app.route("/groups/<int:gid>/members/<int:mid>/<action>", methods=["POST"])
@member_required
def group_member_action(gid, mid, action):
    m, grp, mem = _group_or_404(gid)
    db = get_db()
    target = groups_mod.membership(db, gid, mid)
    if not target:
        abort(404)
    if action == "sharing" and mid == m["id"]:
        db.execute("UPDATE group_members SET share_progress=? WHERE group_id=? AND member_id=?",
                   (0 if target["share_progress"] else 1, gid, mid))
    else:
        _leader_only(mem)
        if action == "remove" and mid != m["id"]:
            db.execute("DELETE FROM group_members WHERE group_id=? AND member_id=?", (gid, mid))
        elif action == "leader":
            db.execute("UPDATE group_members SET role='leader' WHERE group_id=? AND member_id=?", (gid, mid))
        elif action == "member" and mid != m["id"]:
            db.execute("UPDATE group_members SET role='member' WHERE group_id=? AND member_id=?", (gid, mid))
        else:
            abort(400)
    db.commit()
    return _back(gid, "people")


@app.route("/groups/<int:gid>/leave", methods=["POST"])
@member_required
def group_leave(gid):
    m, grp, mem = _group_or_404(gid)
    db = get_db()
    groups_mod.leave(db, gid, m["id"])
    db.commit()
    flash(f"You’ve left {grp['name']}.")
    return redirect(url_for("groups_index"))


@app.route("/api/groups/mine")
def api_my_groups():
    m = current_member()
    if not m:
        return {"ok": True, "signed_in": False, "groups": []}
    return {"ok": True, "signed_in": True,
            "groups": [{"id": x["id"], "name": x["name"]} for x in groups_mod.groups_of(get_db(), m["id"])]}


@app.route("/groups/share-verse", methods=["POST"])
@member_required
def group_share_verse():
    m = current_member()
    gid = request.form.get("group_id", type=int) or 0
    _group_or_404(gid)
    return group_post(gid)


# ----- staff

@app.route("/admin/groups")
@login_required
def admin_groups():
    db = get_db()
    rows = db.execute(
        """SELECT g.*, (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id=g.id) AS members,
                  (SELECT COUNT(*) FROM group_posts p WHERE p.group_id=g.id AND p.status='live') AS posts,
                  (SELECT MAX(created_at) FROM group_posts p WHERE p.group_id=g.id) AS last_post
           FROM groups g ORDER BY g.archived, COALESCE(last_post, g.created_at) DESC""").fetchall()
    reports = db.execute(
        """SELECT r.id AS report_id, r.reason, r.created_at AS reported_at, p.*, g.name AS group_name, m.name AS author
           FROM group_reports r JOIN group_posts p ON p.id=r.post_id JOIN groups g ON g.id=p.group_id
           LEFT JOIN members m ON m.id=p.member_id
           WHERE r.resolved=0 ORDER BY r.created_at""").fetchall()
    return render_template("admin_groups.html", groups=rows, reports=reports, kinds=groups_mod.KIND_NAMES)


@app.route("/admin/groups/<int:gid>/<action>", methods=["POST"])
@login_required
def admin_group_action(gid, action):
    db = get_db()
    if action == "close":
        db.execute("UPDATE groups SET archived=1 WHERE id=?", (gid,))
    elif action == "reopen":
        db.execute("UPDATE groups SET archived=0 WHERE id=?", (gid,))
    else:
        abort(404)
    db.commit()
    return redirect(url_for("admin_groups"))


@app.route("/admin/group-reports/<int:rid>/<action>", methods=["POST"])
@login_required
def admin_group_report(rid, action):
    db = get_db()
    r = db.execute("SELECT * FROM group_reports WHERE id=?", (rid,)).fetchone()
    if not r:
        abort(404)
    if action == "remove":
        groups_mod.remove_post(db, r["post_id"])
        db.execute("UPDATE group_reports SET resolved=1 WHERE post_id=?", (r["post_id"],))
        flash("Post removed.")
    elif action == "keep":
        db.execute("UPDATE group_reports SET resolved=1 WHERE post_id=?", (r["post_id"],))
        flash("Report dismissed.")
    else:
        abort(404)
    db.commit()
    return redirect(url_for("admin_groups"))


# ---------- Devotionals ----------

@app.route("/bible/devotionals")
def devotionals():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM devotionals WHERE published=1 ORDER BY created_at DESC"
    ).fetchall()
    items = []
    for r in rows:
        parsed = parse_reference(r["verse_ref"]) if r["verse_ref"] else None
        items.append({"row": r, "ref_link": parsed, "video_embed": embed_url(r["video_url"])})
    today = items[0] if items else None
    archive = items[1:] if len(items) > 1 else []
    return render_template(
        "devotionals.html",
        church_name=CHURCH_NAME,
        today=today,
        archive=archive,
    )


@app.route("/bible/devotionals/<int:devotional_id>")
def devotional_detail(devotional_id):
    db = get_db()
    row = db.execute(
        "SELECT * FROM devotionals WHERE id=? AND published=1", (devotional_id,)
    ).fetchone()
    if not row:
        abort(404)
    ref_link = parse_reference(row["verse_ref"]) if row["verse_ref"] else None
    found = refs.parse(row["verse_ref"] or "")
    newer = db.execute("SELECT id, title FROM devotionals WHERE published=1 AND created_at > ? ORDER BY created_at LIMIT 1",
                       (row["created_at"],)).fetchone()
    older = db.execute("SELECT id, title FROM devotionals WHERE published=1 AND created_at < ? ORDER BY created_at DESC LIMIT 1",
                       (row["created_at"],)).fetchone()
    return render_template(
        "devotional_detail.html", church_name=CHURCH_NAME, d=row, ref_link=ref_link, found=found,
        video_embed=embed_url(row["video_url"]), minutes=max(1, round(len((row["body"] or "").split()) / 200)),
        newer=newer, older=older,
    )


QUICK_BOOKS = [{"s": b["slug"], "n": b["name"], "c": b["chapters"], "t": "ot" if b in OLD_TESTAMENT else "nt"}
               for b in ALL_BOOKS]


@app.route("/bible/reader")
def bible_tab():
    """The Bible tab: straight back to wherever this person was reading.

    The reader keeps a small cookie (cs_bible = "slug|chapter|translation|verse")
    up to date as they read, so this works on the very first tap of a fresh
    visit, before any script has run. With nothing saved it opens John 1, a
    good first page for anyone."""
    raw = (request.cookies.get("cs_bible") or "").split("|")
    slug = raw[0] if raw and raw[0] in BOOKS_BY_SLUG else "john"
    try:
        chapter = int(raw[1]) if len(raw) > 1 and slug == raw[0] else 1
    except ValueError:
        chapter = 1
    chapter = max(1, min(chapter, BOOKS_BY_SLUG[slug]["chapters"]))
    args = {}
    trans = raw[2] if len(raw) > 2 else ""
    if trans and trans in available_translations() and trans != DEFAULT_TRANSLATION:
        args["translation"] = trans
    try:
        verse = int(raw[3]) if len(raw) > 3 else 0
    except ValueError:
        verse = 0
    if verse > 1:
        args["at"] = verse
    return redirect(url_for("bible_read_chapter", book_slug=slug, chapter=chapter, **args))


@app.route("/bible/read")
def bible_books():
    return render_template(
        "bible_books.html", church_name=CHURCH_NAME,
        old_testament=OLD_TESTAMENT, new_testament=NEW_TESTAMENT,
    )


@app.route("/bible/read/<book_slug>")
def bible_chapters(book_slug):
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book:
        abort(404)
    return render_template("bible_chapters.html", church_name=CHURCH_NAME, book=book)


DEFAULT_TRANSLATION = "web"


def available_translations():
    """Public domain always; licensed ones only when a key is configured."""
    return bible_sources.translations()


@lru_cache(maxsize=512)
def _fetch_chapter_open(book_name, chapter, translation, book_usfm=None):
    return bible_sources.fetch_chapter(book_name, chapter, translation, book_id=book_usfm)


def fetch_chapter(book_name, chapter, translation, book_usfm=None):
    """Free translations are kept in memory freely. Licensed ones go through
    their own stores, which keep to each publisher's limits (ESV: no more than
    500 verses; API.Bible: refreshed within 30 days)."""
    if bible_sources.is_licensed(translation):
        return bible_sources.fetch_chapter(book_name, chapter, translation, book_id=book_usfm)
    return _fetch_chapter_open(book_name, chapter, translation, book_usfm)


def _fums_ids():
    """Anonymous IDs API.Bible's view reporting needs: one per browser, one per day."""
    d = session.get("fums_d")
    if not d:
        d = secrets.token_hex(8)
        session["fums_d"] = d
    return d, hashlib.sha256(f"{d}:{date.today().isoformat()}".encode()).hexdigest()[:16]


def _licensed_response(resp, tokens):
    """Licensed text: report the view, and keep the page out of phone storage
    so we never hold more than the publishers allow."""
    resp = make_response(resp)
    resp.headers["Cache-Control"] = "no-store"
    if tokens:
        bible_sources.report_views(tokens, *_fums_ids())
    return resp


# ---------- Memorise: Duolingo-style scripture memory ----------

MEMORISE_TRANSLATIONS = ("web", "kjv", "asv", "bbe")


@app.route("/memorise")
def memorise_hub():
    return render_template(
        "memorise.html",
        path=memorise_data.path_for_template(),
        collections=memorise_data.collections_for_template(),
        church_name=CHURCH_NAME,
    )


@app.route("/memorise/learn")
def memorise_lesson():
    key = request.args.get("ref", "")
    if not key:
        return redirect(url_for("memorise_hub"))
    if not memorise_data.parse_key(key):
        abort(404)
    mode = "review" if request.args.get("mode") == "review" else "learn"
    return render_template(
        "memorise_lesson.html",
        key=key, label=memorise_data.label(key), mode=mode,
        path_labels=[memorise_data.label(k) for u in memorise_data.STARTER_PATH for k in u["verses"]],
        church_name=CHURCH_NAME,
    )


@app.route("/memorise/add/<book_slug>/<int:chapter>/<int:verse>")
def memorise_add(book_slug, chapter, verse):
    end = request.args.get("to", type=int) or verse
    key = f"{book_slug}.{chapter}.{verse}" + (f"-{end}" if end != verse else "")
    if not memorise_data.parse_key(key):
        abort(404)
    return redirect(url_for("memorise_lesson", ref=key, add=1))


@app.route("/api/memorise/passage")
def api_memorise_passage():
    parsed = memorise_data.parse_key(request.args.get("ref", ""))
    if not parsed:
        return {"ok": False, "error": "bad reference"}, 400
    slug, ch, v1, v2 = parsed
    book = BOOKS_BY_SLUG[slug]
    # Memory verses are always the World English Bible. The others are only a
    # fallback for when WEB can't be reached, and the lesson shows which it got.
    order = list(MEMORISE_TRANSLATIONS)
    for code in order:
        if code not in available_translations():
            continue
        try:
            data = fetch_chapter(book["name"], ch, code, book_usfm=book.get("usfm"))
        except Exception:
            continue
        parts = [re.sub(r"\s+", " ", (v.get("text") or "")).strip()
                 for v in (data or {}).get("verses", []) if v1 <= int(v.get("verse") or 0) <= v2]
        if parts and all(parts):
            resp = make_response({"ok": True, "ref": memorise_data.label(request.args["ref"]),
                                  "text": " ".join(parts), "translation": code})
            resp.headers["Cache-Control"] = "public, max-age=86400"
            return resp
    return {"ok": False, "error": "unavailable"}, 503


app.jinja_env.globals["BOOK_NAMES"] = {b["slug"]: b["name"] for b in ALL_BOOKS}


@app.template_filter("ref_links")
def ref_links_filter(text):
    """'Ezekiel 34:11–24; John 10:1–21' → links to each verse page."""
    from markupsafe import Markup, escape
    out = []
    for label in (text or "").split(";"):
        label = label.strip()
        if not label:
            continue
        parsed = study_data.parse_verse_ref(label)
        if parsed:
            href = url_for("verse_page", book_slug=parsed[0], chapter=parsed[1], verse=parsed[2])
            out.append(Markup('<a href="%s">%s</a>') % (href, label))
        else:
            out.append(escape(label))
    return Markup("; ").join(out)


@app.template_filter("verse_url")
def verse_url_filter(ref):
    """Turn 'John 3:16' into a link to that verse's page (or the Bible home)."""
    parsed = study_data.parse_verse_ref(ref)
    if not parsed:
        return url_for("bible_hub")
    return url_for("verse_page", book_slug=parsed[0], chapter=parsed[1], verse=parsed[2])


# ---------- Reference pages: every verse and every word is a page ----------

def _verse_in_translations(book, chapter, verse):
    """The verse in every available translation, fetched side by side."""
    codes = list(available_translations().items())

    def one(item):
        code, name = item
        try:
            data = fetch_chapter(book["name"], chapter, code, book_usfm=book.get("usfm"))
        except Exception:
            return None
        for v in (data or {}).get("verses", []):
            if int(v.get("verse") or 0) == verse:
                return {"code": code, "name": name, "text": (v.get("text") or "").strip(),
                        "copyright": (data or {}).get("copyright", ""), "copyright_url": (data or {}).get("copyright_url"),
                        "licensed": (data or {}).get("licensed"), "fums": (data or {}).get("fums")}
        return None

    with ThreadPoolExecutor(max_workers=min(6, len(codes) or 1)) as pool:
        results = list(pool.map(one, codes))
    return [r for r in results if r and r["text"]]


@app.route("/bible/v/<book_slug>/<int:chapter>/<int:verse>")
def verse_page(book_slug, chapter, verse):
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book or chapter < 1 or chapter > book["chapters"] or verse < 1:
        abort(404)
    count = study_data.chapter_verse_count(book_slug, chapter)
    if count and verse > count:
        abort(404)
    texts = _verse_in_translations(book, chapter, verse)
    preferred = request.args.get("translation") or DEFAULT_TRANSLATION
    texts.sort(key=lambda r: (r["code"] != preferred, r["code"] != DEFAULT_TRANSLATION))
    words = _with_grammar(book_slug, chapter, verse, original_words.verse_words(book_slug, chapter, verse) or [])
    xrefs = study_data.cross_references(book_slug, chapter, verse)
    prev, nxt = study_data.neighbours(book_slug, chapter, verse)
    lib = {}
    if library.available():
        people, places = library.verse_people_places(book_slug, chapter, verse)
        lib = {"commentary": library.commentary_for_verse(book_slug, chapter, verse),
               "parallels": library.parallels_for(book_slug, chapter, verse),
               "people": people, "places": places,
               "topics": library.topics_for_verse(book_slug, chapter, verse)}
    page = render_template(
        "verse_page.html", lib=lib, early=fathers.for_verse(book_slug, chapter, verse, 5),
        more_commentary=library.more_commentary_for_verse(book_slug, chapter, verse),
        study_notes=notes_mod.verse_notes(book_slug, chapter, verse), related=notes_mod.for_verse(book_slug, chapter, verse),
        notes_kinds=notes_mod.KINDS,
        early_count=fathers.count_verse(book_slug, chapter, verse),
        book=book, chapter=chapter, verse=verse,
        ref=study_data.ref_label(book_slug, chapter, verse),
        texts=texts, words=words, language=original_words.language_of(book_slug),
        xrefs=xrefs, prev=prev, nxt=nxt,
        # Same book: just "3:15"; across books: the full name.
        prev_label=(f"{prev[1]}:{prev[2]}" if prev and prev[0] == book_slug else study_data.ref_label(*prev)) if prev else None,
        nxt_label=(f"{nxt[1]}:{nxt[2]}" if nxt and nxt[0] == book_slug else study_data.ref_label(*nxt)) if nxt else None,
        attribution=original_words.ATTRIBUTION,
        church_name=CHURCH_NAME,
        talks=talks_on(book_slug, chapter),
        my_groups=groups_mod.groups_of(get_db(), current_member()["id"]) if current_member() else [],
    )
    licensed = [t for t in texts if t.get("licensed")]
    if licensed:
        return _licensed_response(page, [t.get("fums") for t in licensed])
    return page


# ---------- 3D: models built to the Bible's measurements, and a relief map ----------

MODELS_3D = [
    {"slug": "map", "title": "The land in 3D", "sub": "Hills, valleys and the Jordan rift, with the places of the Bible pinned on", "ref": "", "emoji": "🗺️"},
    {"slug": "tabernacle", "title": "The tabernacle", "sub": "The tent of meeting in the wilderness, 100 × 50 cubits", "ref": "Exodus 25–27", "emoji": "⛺"},
    {"slug": "temple", "title": "Solomon's temple", "sub": "The house, the pillars Jachin and Boaz, and the bronze Sea", "ref": "1 Kings 6–7", "emoji": "🏛️"},
    {"slug": "ark", "title": "Noah's ark", "sub": "300 cubits long: see how big it really was", "ref": "Genesis 6", "emoji": "🛶"},
    {"slug": "ark-of-the-covenant", "title": "The ark of the covenant", "sub": "The gold chest with the mercy seat and cherubim", "ref": "Exodus 25:10–22", "emoji": "✨"},
]
MODELS_3D_BY_SLUG = {m["slug"]: m for m in MODELS_3D}


def _map_places_3d():
    """Places inside the relief map, best known first, with a line about each."""
    if not library.available():
        return []
    out = []
    rows = library.db().execute(
        "SELECT slug, name, lat, lon, verses, summary FROM places WHERE lat BETWEEN 30.85 AND 33.75 "
        "AND lon BETWEEN 34.15 AND 36.4 AND verses >= 4 ORDER BY verses DESC LIMIT 70").fetchall()
    seen = set()
    for r in rows:
        key = (round(r["lat"], 2), round(r["lon"], 2))
        if key in seen:
            continue
        seen.add(key)
        text = re.sub(r"<[^>]+>", "", library._z(r["summary"]) or "")
        text = re.sub(r"\s+", " ", text).strip()
        first = re.split(r"(?<=[.;])\s", text, maxsplit=1)[0][:220]
        out.append({"slug": r["slug"], "name": r["name"], "lat": r["lat"], "lon": r["lon"], "summary": first})
    return out


@app.route("/bible/fathers")
def fathers_index():
    return render_template("fathers_index.html", books=fathers.index(), available=fathers.available())


@app.route("/bible/fathers/<book_slug>/<int:chapter>")
def fathers_chapter(book_slug, chapter):
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book or not 1 <= chapter <= book["chapters"]:
        abort(404)
    groups = fathers.chapter(book_slug, chapter)
    if not groups:
        abort(404)
    chs = next((b["chapters"] for b in fathers.index() if b["slug"] == book_slug), [])
    nums = [c for c, _ in chs]
    i = nums.index(chapter) if chapter in nums else -1
    return render_template("fathers_chapter.html", book=book, chapter=chapter, groups=groups,
                           prev_ch=nums[i - 1] if i > 0 else None, next_ch=nums[i + 1] if 0 <= i < len(nums) - 1 else None,
                           total=sum(len(g["items"]) for g in groups))


@app.route("/bible/3d")
def bible_3d_hub():
    return render_template("bible3d_hub.html", models=MODELS_3D)


@app.route("/bible/3d/<slug>")
def bible_3d(slug):
    m = MODELS_3D_BY_SLUG.get(slug)
    if not m:
        abort(404)
    focus = request.args.get("focus", "")
    return render_template("bible3d.html", m=m, models=MODELS_3D,
                           places=_map_places_3d() if slug == "map" else [],
                           focus=focus if re.fullmatch(r"[a-z0-9-]{1,80}", focus or "") else "")


@app.route("/bible/words")
def words_hub():
    """Greek and Hebrew: search the lexicon in English, and start with the
    words that matter most."""
    q = (request.args.get("q") or "").strip()[:60]
    lang = request.args.get("lang") if request.args.get("lang") in ("Greek", "Hebrew") else None
    results = study_data.search_lexicon(q, lang) if q else None
    if results and len(results) == 1 and study_data.normalise_strong(q):
        return redirect(url_for("word_page", code=results[0]["strong"]))
    return render_template("words.html", q=q, lang=lang, results=results, books=ALL_BOOKS,
                           featured=study_data.featured_words(),
                           available=original_words.available(),
                           attribution=original_words.ATTRIBUTION)


def _word_study_extras(entry, conc):
    """Grammar-based additions to a word page: where it falls across the
    Testament, the forms it takes, its meaning group, words like it, and how
    the Greek Old Testament connects Hebrew and Greek."""
    hebrew = entry["strong"].startswith("H")
    books = (OLD_TESTAMENT if hebrew else NEW_TESTAMENT)
    counts = dict(conc["books"])
    top = max(counts.values()) if counts else 1
    dist = [{"name": b["name"], "slug": b["slug"], "n": counts.get(b["name"], 0), "pct": round(counts.get(b["name"], 0) / top * 100)} for b in books]
    st = grammar.word_stats(entry["strong"])
    forms = []
    titles = {"tense": "Tense", "mood": "Mood and form", "stem": "Stem", "form": "Form"}
    for kind in (("stem", "form") if hebrew else ("tense", "mood")):
        merged = {}
        for label, n in st["forms"].get(kind, []):
            field = {"tense": "Tense", "mood": "Mood", "stem": "Stem", "form": "Form"}[kind]
            slug = grammar_guide._slug_for(field, label, hebrew) or (grammar_guide._slug_for("Form", label, hebrew) if kind == "mood" else None)
            e = grammar_guide.ENTRIES.get(slug) if slug else None
            name = e["term"] if e else label
            m = merged.setdefault(name, {"label": name, "slug": slug if e else None, "short": e["short"] if e else "", "n": 0})
            m["n"] += n
        rows = sorted(merged.values(), key=lambda r: -r["n"])
        total = sum(r["n"] for r in rows) or 1
        for r in rows:
            r["pct"] = round(r["n"] / total * 100)
            r["pct_label"] = f"{r['pct']}%" if r["pct"] or not r["n"] else "<1%"
        if rows:
            forms.append({"title": titles[kind], "rows": rows[:6]})

    def lex(code):
        e = study_data.lexicon_entry(code)
        return {"strong": e["strong"], "lemma": e["lemma"], "translit": e["translit"], "meaning": e["meaning"]} if e else None
    similar = [dict(x, **(lex(x["strong"]) or {})) for x in st["similar"]]
    similar = [x for x in similar if x.get("lemma")][:8]
    def common(rows):          # drop one-off pairings, which are mostly where the texts don't line up
        top = max((x["n"] for x in rows), default=0)
        return [x for x in rows if x["n"] >= max(2, top * 0.03)]
    lxx = [dict(x, **(lex(x["strong"]) or {})) for x in common(st["lxx"])]
    lxx_of = [dict(x, **(lex(x["strong"]) or {})) for x in common(st["lxx_of"])]
    return {"dist": dist, "forms": forms, "domains": st["domains"], "similar": similar,
            "lxx": [x for x in lxx if x.get("lemma")], "lxx_of": [x for x in lxx_of if x.get("lemma")],
            "testament": "Old Testament" if hebrew else "New Testament"}


@app.route("/bible/word/<code>")
def word_page(code):
    key = study_data.normalise_strong(code)
    entry = study_data.lexicon_entry(key) if key else None
    if not entry:
        abort(404)
    if entry["strong"] != key and len(code) > 1 and code[-1].isalpha():
        abort(404)
    page = max(1, request.args.get("page", 1, type=int))
    conc = study_data.concordance(entry["strong"], page=page)
    if page > conc["pages"]:
        abort(404)
    return render_template(
        "word_page.html",
        entry=entry, conc=conc, study=_word_study_extras(entry, conc),
        related=study_data.related_senses(entry["strong"]),
        attribution=original_words.ATTRIBUTION,
        church_name=CHURCH_NAME,
    )


@app.route("/bible/grammar")
def grammar_page():
    """Hebrew and Greek grammar in plain English; every label in the interlinear links here."""
    texts = {}
    for e in grammar_guide.ENTRIES.values():
        if e["ref"] not in texts:
            f = refs.parse(e["ref"])
            if f:
                try:
                    data = bible_sources.fetch_chapter_local(f["slug"], BOOKS_BY_SLUG[f["slug"]]["name"], f["chapter"], "bsb")
                    v = next((x for x in data["verses"] if int(x["verse"]) == f["verse"]), None)
                    texts[e["ref"]] = {"text": re.sub(r"\s+", " ", v["text"]).strip() if v else "",
                                       "href": url_for("interlinear", book_slug=f["slug"], chapter=f["chapter"], v=f["verse"]) + f"#v{f['verse']}"}
                except Exception:
                    texts[e["ref"]] = None
    return render_template("grammar_guide.html", groups=grammar_guide.groups(), texts=texts,
                           roles=grammar_guide.ROLE_NAME, role_slug=grammar_guide.ROLE_SLUG)


def _interlinear_words(book_slug, chapter, nums):
    """Every word of the chapter with its grammar, for the interlinear page."""
    gram = grammar.chapter(book_slug, chapter)
    morph, details, verses = {}, [], []
    for n in nums:
        words = original_words.verse_words(book_slug, chapter, n) or []
        rows = gram.get(n) or []
        out = []
        for k, w in enumerate(words):
            r = rows[k] if k < len(rows) else {}
            code = r.get("m") or ""
            ex = grammar.explain(code)
            if ex:
                morph[code] = ex
            segs = []
            for sg in r.get("s") or []:
                se = grammar.explain(sg[2])
                if se:
                    morph[sg[2]] = se
                segs.append({"t": sg[0], "g": sg[1], "c": sg[2], "main": sg[3]})
            dom = grammar.domain_label(r.get("dm"))
            lxx = None
            if r.get("x"):
                le = study_data.lexicon_entry(r["x"][1])
                lxx = {"w": r["x"][0], "s": r["x"][1], "lemma": le["lemma"] if le else "", "tr": le["translit"] if le else "",
                       "meaning": le["meaning"] if le else ""}
            i = len(details)
            det = {"w": w.get("word"), "tr": w.get("translit"), "g": w.get("gloss"), "lemma": w.get("lemma"),
                   "ltr": w.get("lemma_translit"), "mean": w.get("meaning"), "s": w.get("strong"),
                   "c": code, "segs": segs, "r": r.get("r"), "to": r.get("to"), "by": r.get("by"),
                   "dom": list(dom) if dom else None, "x": lxx, "var": bool(r.get("v")), "ref": f"{n}"}
            if det["lemma"] == det["w"]:
                det.pop("lemma")
            details.append({k: v for k, v in det.items() if v not in (None, False, "", [])})
            out.append({"i": i, "w": w.get("word"), "tr": w.get("translit"), "g": w.get("gloss"), "tag": ex["tag"] if ex else "",
                        "r": r.get("r") or "", "L": r.get("L", 1), "d": r.get("d", 0), "var": bool(r.get("v"))})
        verses.append({"n": n, "words": out})
    return verses, details, morph


@app.route("/bible/interlinear")
def interlinear_go():
    """The chapter picker on the Greek & Hebrew page."""
    book = BOOKS_BY_SLUG.get(request.args.get("book") or "")
    ch = request.args.get("chapter", 1, type=int) or 1
    if not book:
        return redirect(url_for("words_hub") + "#word-by-word")
    return redirect(url_for("interlinear", book_slug=book["slug"], chapter=max(1, min(ch, book["chapters"]))))


@app.route("/bible/interlinear/<book_slug>/<int:chapter>")
def interlinear(book_slug, chapter):
    """A chapter word by word in Hebrew or Greek: each word's meaning and
    grammar, how the sentences are built, and who the pronouns point to."""
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book or chapter < 1 or chapter > book["chapters"] or not original_words.available():
        abort(404)
    try:
        data = bible_sources.fetch_chapter_local(book_slug, book["name"], chapter, "bsb")
        english = {int(v["verse"]): re.sub(r"\s+", " ", v["text"]).strip() for v in data["verses"]}
    except Exception:
        english = {}
    nums = sorted(set(english) | set(grammar.chapter(book_slug, chapter))) or list(range(1, (study_data.chapter_verse_count(book_slug, chapter) or 0) + 1))
    verses, details, morph = _interlinear_words(book_slug, chapter, nums)
    for v in verses:
        v["en"] = english.get(v["n"], "")
    prev, nxt = _chapter_step(book_slug, chapter, -1), _chapter_step(book_slug, chapter, 1)
    language = original_words.language_of(book_slug)
    return render_template("interlinear.html", book=book, chapter=chapter, verses=verses, language=language,
                           hebrew=language != "Greek", prev=prev, nxt=nxt,
                           data={"words": details, "morph": morph, "roles": grammar_guide.ROLE_NAME,
                                 "roleSlug": grammar_guide.ROLE_SLUG, "book": book["name"], "chapter": chapter},
                           attribution=original_words.ATTRIBUTION, grammar_attribution=grammar.ATTRIBUTION)


def _chapter_step(slug, chapter, step):
    """The chapter before/after, carrying on across books (Malachi 4 → Matthew 1)."""
    idx = next(i for i, b in enumerate(ALL_BOOKS) if b["slug"] == slug)
    book = ALL_BOOKS[idx]
    ch = chapter + step
    if 1 <= ch <= book["chapters"]:
        return (slug, ch, f"{book['name']} {ch}")
    j = idx + step
    if 0 <= j < len(ALL_BOOKS):
        nb = ALL_BOOKS[j]
        ch = 1 if step > 0 else nb["chapters"]
        return (nb["slug"], ch, f"{nb['name']} {ch}")
    return None


@app.route("/bible/read/<book_slug>/<int:chapter>")
def bible_read_chapter(book_slug, chapter):
    book = BOOKS_BY_SLUG.get(book_slug)
    if not book or chapter < 1 or chapter > book["chapters"]:
        abort(404)

    all_translations = available_translations()
    translation = request.args.get("translation", DEFAULT_TRANSLATION)
    if translation not in all_translations:
        translation = DEFAULT_TRANSLATION

    error = None
    fell_back = False
    data = None
    try:
        data = fetch_chapter(book["name"], chapter, translation,
                             book_usfm=book.get("usfm"))
    except requests.exceptions.RequestException:
        # One translation being unavailable — a licence lapsing, an ID
        # changing, a provider outage — shouldn't leave someone unable to
        # read at all. Fall back to a public domain text and say so.
        if translation != DEFAULT_TRANSLATION:
            try:
                data = fetch_chapter(book["name"], chapter, DEFAULT_TRANSLATION,
                                     book_usfm=book.get("usfm"))
                translation = DEFAULT_TRANSLATION
                fell_back = True
            except requests.exceptions.RequestException:
                error = True
        else:
            error = True

    gateway_query = f"{book['name']} {chapter}".replace(" ", "%20")

    # Note the read for streaks and badges. Only for signed-in members, and
    # only when the chapter actually loaded — recording a failed fetch as
    # "read today" would be dishonest. Chapters are stored per book/chapter so
    # re-reading the same one doesn't inflate the count.
    new_badges = []
    member = current_member()
    if member and data and not error:
        db = get_db()
        db.execute(
            "INSERT OR IGNORE INTO member_data "
            "(member_id, kind, item_key, payload, updated_at) VALUES (?,?,?,?,?)",
            (member["id"], "read", f"{book_slug}/{chapter}", "{}",
             datetime.now().isoformat(timespec="seconds")),
        )
        achievements.record(db, member["id"], "read")
        new_badges = achievements.evaluate(db, member["id"], total_games=len(GAMES))
        db.commit()

    page = render_template(
        "bible_reader.html",
        church_name=CHURCH_NAME,
        book=book,
        chapter=chapter,
        data=data,
        error=error,
        translation=translation,
        translations=all_translations,
        fell_back=fell_back,
        study_enabled=study_available(),
        headings=bible_sources.chapter_headings(book_slug, chapter) if not error else {},
        prev_ch=_chapter_step(book_slug, chapter, -1),
        next_ch=_chapter_step(book_slug, chapter, 1),
        words_enabled=original_words.available(),
        fathers_count=fathers.chapter_count(book_slug, chapter),
        orig_language=original_words.language_of(book_slug),
        notes_count=notes_mod.chapter_count(book_slug, chapter), has_intro=notes_mod.has_intro(book_slug),
        bp_video=bibleproject.for_chapter(book_slug, chapter),
        words_language=original_words.language_of(book_slug),
        xr_counts=study_data.cross_reference_counts(book_slug, chapter) if not error else {},
        chapter_lib=library.chapter_resources(book_slug, chapter) if library.available() and not error else None,
        audio_books=audio_bible.books_for_js(), audio_readers={k: v[0] for k, v in audio_bible.READERS.items()},
        commentaries=library.COMMENTARIES,
        new_badges=new_badges,
        gateway_url=f"https://www.biblegateway.com/passage/?search={gateway_query}",
        talks=talks_on(book_slug, chapter) if not error else [],
        quick_books=QUICK_BOOKS,
    )
    if data and data.get("licensed"):
        return _licensed_response(page, [data.get("fums")])
    return page


VISIT_DEFAULTS = {
    "visit_address": "Centenary Hall, Dean Close Prep School, Cheltenham",
    "visit_postcode": "GL51 6QS",
    "visit_what3words": "",
    "visit_service_times": "Sundays at 11am",
    # One meeting per line, "when | what". Shown under the Sunday time.
    "visit_weekly": "Mondays, 7pm to 8pm | Prayer and Worship\nMondays, 8pm to 9pm | Bible College: an hour of teaching through the Bible, open to anyone",
    "visit_duration": "About 90 minutes",
    "visit_parking": "",
    "visit_transport": "",
    "visit_accessibility": "",
    "visit_kids": "",
    "visit_dress": "Come as you are. You'll see everything from jeans to smart.",
    "visit_expect": "",
    "visit_contact_email": "",
    "visit_contact_phone": "",
    "safeguarding_name": "",
    "safeguarding_email": "",
    "safeguarding_phone": "",
    "safeguarding_policy_url": "",
}


def visit_info():
    """Everything the visit page shows, with sensible fallbacks."""
    info = {k: (get_setting(k, v) or v) for k, v in VISIT_DEFAULTS.items()}

    # Build map links from whatever address detail we have. Deep links rather
    # than an embedded map: no API key to manage or pay for, and it opens in
    # whichever maps app the person already uses and trusts.
    full = ", ".join(p for p in [info["visit_address"], info["visit_postcode"]] if p)
    info["full_address"] = full
    info["weekly"] = []
    for line in (info.get("visit_weekly") or "").splitlines():
        when, _, what = line.partition("|")
        if when.strip():
            info["weekly"].append({"when": when.strip(), "what": what.strip()})
    if full:
        q = quote_plus(full)
        info["maps_google"] = f"https://www.google.com/maps/dir/?api=1&destination={q}"
        info["maps_apple"] = f"https://maps.apple.com/?daddr={q}"
        info["maps_citymapper"] = f"https://citymapper.com/directions?endcoord=&endname={q}"
    else:
        info["maps_google"] = info["maps_apple"] = info["maps_citymapper"] = ""
    return info


@app.route("/offline")
def offline_page():
    """Shown by the service worker when a page is requested with no connection.

    Deliberately public and dependency-free: it must render even when the
    device is offline. Reassures the reader that already-opened Bible
    chapters and cached pages still work, rather than a dead end.
    """
    return render_template("offline.html", church_name=CHURCH_NAME)


@app.route("/contact")
def contact_page():
    return render_template("contact.html", info=visit_info())


# ---------------------------------------------------------------------------
# App links: let links to this site (sign-in emails, shared verses) open in
# the iPhone and Android apps when they're installed. The values come from
# environment variables so nothing about the signing keys lives in the code:
#   APPLE_TEAM_ID              the 10-character Team ID from developer.apple.com
#   ANDROID_CERT_SHA256        the app-signing certificate fingerprint(s) from
#                              Play Console → Test and release → App signing,
#                              comma-separated if there are several
# ---------------------------------------------------------------------------
NATIVE_APP_ID = "uk.org.clearspring.app"


@app.route("/.well-known/apple-app-site-association")
@app.route("/apple-app-site-association")
def apple_app_site_association():
    team = (os.environ.get("APPLE_TEAM_ID") or "").strip()
    if not re.fullmatch(r"[A-Z0-9]{10}", team):
        abort(404)
    body = {
        "applinks": {
            "details": [{
                "appIDs": [f"{team}.{NATIVE_APP_ID}"],
                "components": [
                    {"/": "/giving*", "exclude": True, "comment": "Giving opens in Safari"},
                    {"/": "/admin*", "exclude": True},
                    {"/": "/static/*", "exclude": True},
                    {"/": "/*"},
                ],
            }]
        },
        "webcredentials": {"apps": [f"{team}.{NATIVE_APP_ID}"]},
    }
    resp = app.response_class(json.dumps(body), mimetype="application/json")
    resp.headers["Cache-Control"] = "public, max-age=3600"
    return resp


@app.route("/.well-known/assetlinks.json")
def android_asset_links():
    prints = [p.strip().upper() for p in (os.environ.get("ANDROID_CERT_SHA256") or "").split(",") if p.strip()]
    prints = [p for p in prints if re.fullmatch(r"(?:[0-9A-F]{2}:){31}[0-9A-F]{2}", p)]
    if not prints:
        abort(404)
    body = [{
        "relation": ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
        "target": {"namespace": "android_app", "package_name": NATIVE_APP_ID, "sha256_cert_fingerprints": prints},
    }]
    resp = app.response_class(json.dumps(body), mimetype="application/json")
    resp.headers["Cache-Control"] = "public, max-age=3600"
    return resp


@app.route("/privacy")
def privacy_page():
    return render_template("privacy.html", info=visit_info(), wall_days=PRAYER_WALL_DAYS, charity_number=CHARITY_NUMBER,
                           keep_days=PRAYER_KEEP_DAYS, updated=PRIVACY_UPDATED)


PRIVACY_UPDATED = "October 2026"


@app.route("/visit")
def plan_visit():
    """For someone thinking about coming for the first time.

    Deliberately answers the practical worries rather than selling the church:
    where to park, what to wear, what happens to the children, how long it
    lasts, and whether anyone will make a fuss of them.
    """
    return render_template(
        "visit.html",
        church_name=CHURCH_NAME,
        info=visit_info(),
    )


@app.route("/admin/visit", methods=["GET", "POST"])
@login_required
def admin_visit():
    saved = False
    if request.method == "POST":
        for key in VISIT_DEFAULTS:
            set_setting(key, (request.form.get(key) or "").strip())
        get_db().commit()
        saved = True
    return render_template(
        "admin_visit.html",
        church_name=CHURCH_NAME,
        info=visit_info(),
        defaults=VISIT_DEFAULTS,
        saved=saved,
    )


@app.route("/more")
def more_hub():
    return render_template("more.html", church_name=CHURCH_NAME)


@app.route("/community/calendar")
def calendar_page():
    today = date.today()
    cat = request.args.get("cat", "all")

    month_param = request.args.get("month")
    if month_param:
        try:
            view_year, view_month = map(int, month_param.split("-"))
            first_day = date(view_year, view_month, 1)
        except (ValueError, TypeError):
            first_day = date(today.year, today.month, 1)
    else:
        first_day = date(today.year, today.month, 1)

    view_year, view_month = first_day.year, first_day.month
    last_day_num = calendar_mod.monthrange(view_year, view_month)[1]
    last_day = date(view_year, view_month, last_day_num)

    # Full weeks (Sun-Sat) covering the month, so the grid has no gaps
    grid_start = first_day - timedelta(days=(first_day.weekday() + 1) % 7)
    grid_end = last_day + timedelta(days=(6 - (last_day.weekday() + 1) % 7))

    db = get_db()
    if cat in ("service", "event"):
        rows = db.execute("SELECT * FROM events WHERE category=?", (cat,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM events").fetchall()

    occ_map = {}
    for row in rows:
        for occ_date in occurrences(row, grid_start, grid_end):
            occ_map.setdefault(occ_date.isoformat(), []).append(row)

    # Build the grid: list of weeks, each a list of day dicts
    weeks = []
    cursor = grid_start
    while cursor <= grid_end:
        week = []
        for _ in range(7):
            iso = cursor.isoformat()
            week.append({
                "date": cursor,
                "iso": iso,
                "in_month": cursor.month == view_month,
                "is_today": cursor == today,
                "categories": sorted({e["category"] for e in occ_map.get(iso, [])}),
                "has_events": iso in occ_map,
            })
            cursor += timedelta(days=1)
        weeks.append(week)

    # Agenda: occurrences within the visible month only, chronological
    agenda_items = []
    for iso, evs in occ_map.items():
        if first_day.isoformat() <= iso <= last_day.isoformat():
            for e in evs:
                agenda_items.append((iso, e))
    agenda_items.sort(key=lambda pair: (pair[0], pair[1]["event_time"]))

    agenda = {}
    for iso, e in agenda_items:
        agenda.setdefault(iso, []).append(e)

    prev_month = _shift_month(first_day, -1)
    next_month = _shift_month(first_day, 1)

    feed_url = url_for("calendar_feed", _external=True)
    webcal_url = feed_url.replace("https://", "webcal://").replace("http://", "webcal://")

    return render_template(
        "calendar.html",
        weeks=weeks,
        weekday_labels=WEEKDAY_LABELS,
        month_label=first_day.strftime("%B %Y"),
        agenda=agenda,
        cat=cat,
        prev_month=prev_month.strftime("%Y-%m"),
        next_month=next_month.strftime("%Y-%m"),
        today_month=today.strftime("%Y-%m"),
        feed_url=feed_url,
        webcal_url=webcal_url,
        church_name=CHURCH_NAME,
    )


def _shift_month(d, delta):
    month = d.month - 1 + delta
    year = d.year + month // 12
    month = month % 12 + 1
    return date(year, month, 1)


@app.route("/event/<int:event_id>.ics")
def event_ics(event_id):
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
    if not event:
        abort(404)
    ics_text = build_calendar([event], cal_name=event["title"])
    return Response(
        ics_text,
        mimetype="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=event-{event_id}.ics"},
    )


@app.route("/calendar.ics")
def calendar_feed():
    db = get_db()
    rows = db.execute("SELECT * FROM events ORDER BY event_date").fetchall()
    ics_text = build_calendar(rows, cal_name=f"{CHURCH_NAME} Calendar")
    return Response(ics_text, mimetype="text/calendar")


# ---------- Q&A ----------

@app.route("/questions")
def questions():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM questions WHERE status='answered' ORDER BY answered_at DESC"
    ).fetchall()
    return render_template("questions.html", questions=rows, church_name=CHURCH_NAME)


@app.route("/questions/ask", methods=["GET", "POST"])
def ask_question():
    if request.method == "POST":
        # Honeypot: a real visitor never fills this hidden field in
        if request.form.get("website"):
            return redirect(url_for("ask_question", sent=1))

        question_text = request.form.get("question_text", "").strip()
        if not question_text:
            flash("Please write your question before submitting.")
            return render_template("ask.html", church_name=CHURCH_NAME)

        db = get_db()
        db.execute(
            "INSERT INTO questions (question_text, asker_name, status, submitted_at) VALUES (?, ?, 'pending', ?)",
            (
                question_text,
                request.form.get("asker_name", "").strip() or None,
                datetime.now().isoformat(),
            ),
        )
        db.commit()
        return redirect(url_for("ask_question", sent=1))

    return render_template("ask.html", church_name=CHURCH_NAME, sent=request.args.get("sent"))


# ---------- Kids Games ----------

GAMES = {
    "giant_slayer": {"label": "Giant Slayer", "unit": "points", "higher_is_better": True},
    "manna_maze": {"label": "Manna Maze", "unit": "moves", "higher_is_better": False},
    "memory_game": {"label": "Memory Match", "unit": "moves", "higher_is_better": False},
    "trivia_challenge": {"label": "Bible Trivia Challenge", "unit": "points", "higher_is_better": True},
    "trivia_football": {"label": "Bible Trivia Football", "unit": "touchdowns", "higher_is_better": True},
    "chess": {"label": "Chess", "unit": "toughest bot beaten", "higher_is_better": True},
    "verse_builder": {"label": "Verse Builder", "unit": "points", "higher_is_better": True},
    "books_sprint": {"label": "Books Sprint", "unit": "points", "higher_is_better": True},
    "lost_sheep": {"label": "Lost Sheep", "unit": "searches", "higher_is_better": False},
    "rock_slinger": {"label": "Rock Slinger", "unit": "points", "higher_is_better": True},
}


def leaderboard_display_name(full_name):
    """First name + last initial only — this board is visible to any signed-in
    member, including in the Kids Games section, so we never show a full name."""
    parts = (full_name or "").strip().split()
    if not parts:
        return "A church member"
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


@app.route("/games/giant-slayer")
def giant_slayer():
    return render_template("giant_slayer.html", church_name=CHURCH_NAME)


@app.route("/games/rockslinger/build/<path:filename>")
def rockslinger_build(filename):
    """Serve the Unity build files with explicit headers.

    Unity ships its build brotli-compressed (.br). The browser only knows to
    decompress those if the response carries `Content-Encoding: br`, and if it
    doesn't, Unity is handed compressed bytes and reports "Unable to load
    file" — which looks like a missing file but isn't.

    Flask can work this out from the filename, but only when the Python
    version and the OS mime database both know about `.br`. That landed in
    Python's table in 3.9, and on Windows it comes from the registry, where
    it's usually absent. So it works on one machine and fails on another.

    Setting the headers here removes that whole class of problem.
    """
    safe = os.path.basename(filename)
    build_dir = os.path.join(app.static_folder, "games", "rockslinger", "Build")
    path = os.path.join(build_dir, safe)
    if not os.path.isfile(path):
        abort(404)

    if safe.endswith(".wasm.br"):
        mime = "application/wasm"
    elif safe.endswith(".js.br") or safe.endswith(".js"):
        mime = "application/javascript"
    else:
        mime = "application/octet-stream"

    resp = send_from_directory(build_dir, safe, mimetype=mime)
    if safe.endswith(".br"):
        resp.headers["Content-Encoding"] = "br"
    # These files never change without their name changing, so they can be
    # cached hard. It's an 11 MB download; not repeating it matters.
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


@app.route("/games/rock-slinger")
def rock_slinger():
    """A Unity WebGL game contributed by a member of the church.

    Hosted from static/ rather than the Unity default template: that template
    ships Unity branding, a fixed 1080x1920 canvas that overflows every phone,
    and an alert() on failure.
    """
    return render_template("rock_slinger.html", church_name=CHURCH_NAME,
                           member=current_member())


@app.route("/games/verse-builder")
def verse_builder():
    """Reassemble a scrambled verse. Uses the same verse set as the rest of
    the app so nothing new has to be maintained."""
    return render_template(
        "verse_builder.html",
        church_name=CHURCH_NAME,
        verses=VERSES,
    )


@app.route("/games/books-sprint")
def books_sprint():
    """Which book comes first? Position is sent with each book because the
    name alone doesn't tell you where it sits."""
    books = [
        {"name": b["name"], "pos": i}
        for i, b in enumerate(ALL_BOOKS)
    ]
    return render_template(
        "books_sprint.html",
        church_name=CHURCH_NAME,
        books=books,
    )


@app.route("/games/lost-sheep")
def lost_sheep():
    return render_template("lost_sheep.html", church_name=CHURCH_NAME)


@app.route("/games/<game_key>/score", methods=["POST"])
def submit_game_score(game_key):
    """Record a member's best score. Called by each game's own 'Publish score'
    button — never automatically, so nothing is shared without the player
    (or their parent, on a shared device) choosing to."""
    if game_key not in GAMES:
        return {"ok": False, "error": "unknown game"}, 404

    m = current_member()
    if not m:
        return {"ok": True, "signed_in": False}, 200

    data = json_body()
    try:
        score = int(data.get("score"))
    except (TypeError, ValueError):
        return {"ok": False, "error": "invalid score"}, 400
    if score < 0 or score > 10_000_000:
        return {"ok": False, "error": "score out of range"}, 400

    higher_is_better = GAMES[game_key]["higher_is_better"]
    db = get_db()
    existing = db.execute(
        "SELECT score FROM game_scores WHERE member_id=? AND game_key=?",
        (m["id"], game_key),
    ).fetchone()

    improved = existing is None or (
        score > existing["score"] if higher_is_better else score < existing["score"]
    )
    if improved:
        db.execute(
            """INSERT INTO game_scores (member_id, game_key, score, achieved_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(member_id, game_key) DO UPDATE SET
                 score=excluded.score, achieved_at=excluded.achieved_at""",
            (m["id"], game_key, score, datetime.now().isoformat()),
        )

    # Publishing a score counts as activity whether or not it beat your best,
    # otherwise a bad day at Manna Maze wouldn't count as showing up.
    achievements.record(db, m["id"], "game")
    new_badges = achievements.evaluate(db, m["id"], total_games=len(GAMES))
    db.commit()

    best = score if improved else existing["score"]
    return {
        "ok": True, "signed_in": True, "improved": improved, "best": best,
        "new_badges": [{"name": b["name"], "desc": b["desc"]} for b in new_badges],
    }, 200


@app.route("/games/<game_key>/leaderboard")
def game_leaderboard(game_key):
    if game_key not in GAMES:
        abort(404)
    info = GAMES[game_key]
    order_sql = "DESC" if info["higher_is_better"] else "ASC"
    rows = get_db().execute(
        f"""SELECT gs.member_id, gs.score, gs.achieved_at, m.name
            FROM game_scores gs JOIN members m ON m.id = gs.member_id
            WHERE gs.game_key = ?
            ORDER BY gs.score {order_sql}, gs.achieved_at ASC
            LIMIT 20""",
        (game_key,),
    ).fetchall()

    me = current_member()
    board = [
        {
            "rank": i + 1,
            "name": leaderboard_display_name(r["name"]),
            "score": r["score"],
            "is_me": bool(me and me["id"] == r["member_id"]),
        }
        for i, r in enumerate(rows)
    ]

    return render_template(
        "game_leaderboard.html",
        church_name=CHURCH_NAME,
        game_key=game_key,
        info=info,
        board=board,
        signed_in=bool(me),
    )


@app.route("/games")
def games_hub():
    # Presentation lives here rather than in GAMES, which is the scoring
    # registry and is also read by the leaderboard and score endpoints.
    # Order is deliberate: gentlest first, chess last.
    tiles = [
        {"key": "rock_slinger", "endpoint": "rock_slinger", "emoji": "🪨",
         "name": "Rock Slinger", "desc": "Five smooth stones · by Finn",
         "c1": "#2DD4BF", "c2": "#0C4F4A"},
        {"key": "memory_game", "sprite": "memory", "acc": "#7FB8FF", "endpoint": "memory_game", "emoji": "🃏",
         "name": "Memory Match", "desc": "Find the matching pairs",
         "c1": "#27BAA9", "c2": "#145C54"},
        {"key": "lost_sheep", "sprite": "sheep", "acc": "#9BE37A", "endpoint": "lost_sheep", "emoji": "🐑",
         "name": "Lost Sheep", "desc": "Bring them all home",
         "c1": "#23A899", "c2": "#12544D"},
        {"key": "verse_builder", "sprite": "verse", "acc": "#F3C623", "endpoint": "verse_builder", "emoji": "🧩",
         "name": "Verse Builder", "desc": "Put the verse back together",
         "c1": "#1F9689", "c2": "#104C46"},
        {"key": "manna_maze", "sprite": "manna", "acc": "#FFE9A8", "endpoint": "manna_maze", "emoji": "🗺️",
         "name": "Manna Maze", "desc": "Gather it before morning",
         "c1": "#1B847A", "c2": "#0E443F"},
        {"key": "books_sprint", "sprite": "books", "acc": "#FF9F5A", "endpoint": "books_sprint", "emoji": "📖",
         "name": "Books Sprint", "desc": "Which one comes first?",
         "c1": "#17726A", "c2": "#0D3C38"},
        {"key": "trivia_challenge", "sprite": "trophy", "acc": "#F3C623", "endpoint": "trivia_challenge", "emoji": "🎯",
         "name": "Bible Trivia", "desc": "How much do you know?",
         "c1": "#12605A", "c2": "#0A3431"},
        {"key": "trivia_football", "sprite": "football", "acc": "#7CF07C", "endpoint": "trivia_football", "emoji": "🏈",
         "name": "Trivia Football", "desc": "Answer to move down the field",
         "c1": "#0E4E4A", "c2": "#082C2A"},
        {"key": "giant_slayer", "sprite": "shield", "acc": "#2DD4BF", "endpoint": "giant_slayer", "emoji": "🛡️",
         "name": "Giant Slayer", "desc": "Hold off the Philistine camp",
         "c1": "#0A3C3B", "c2": "#072423"},
        {"key": "chess", "sprite": "knight", "acc": "#E8E8F0", "endpoint": "chess_game", "emoji": "♟️",
         "name": "Chess", "desc": "Two players, or the computer",
         "c1": "#062A2B", "c2": "#051C1C"},
    ]
    return render_template("games.html", church_name=CHURCH_NAME, games=tiles)


@app.route("/games/memory")
def memory_game():
    return render_template("memory_game.html", church_name=CHURCH_NAME)


@app.route("/games/trivia-challenge")
def trivia_challenge():
    return render_template(
        "trivia_challenge.html", church_name=CHURCH_NAME, questions=TRIVIA_LADDER
    )


@app.route("/games/trivia-football")
def trivia_football():
    return render_template(
        "trivia_football.html", church_name=CHURCH_NAME, questions=TRIVIA_FOOTBALL
    )


@app.route("/games/manna-maze")
def manna_maze():
    return render_template("manna_maze.html", church_name=CHURCH_NAME)


@app.route("/games/chess")
def chess_game():
    return render_template("chess.html", church_name=CHURCH_NAME)


# ---------- Admin ----------

@app.route("/admin")
@login_required
def admin():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM events ORDER BY event_date ASC, event_time ASC"
    ).fetchall()
    pending_count = db.execute(
        "SELECT COUNT(*) FROM questions WHERE status='pending'"
    ).fetchone()[0]
    held_count = db.execute(
        "SELECT COUNT(*) FROM prayers WHERE status='held'"
    ).fetchone()[0]
    story_count = db.execute(
        "SELECT COUNT(*) FROM testimonies WHERE status='pending'"
    ).fetchone()[0]
    return render_template(
        "admin.html", events=rows, pending_count=pending_count, held_count=held_count,
        story_count=story_count,
        report_count=db.execute("SELECT COUNT(*) FROM group_reports WHERE resolved=0").fetchone()[0],
    )


def _event_form_values():
    """The event form, checked. Returns (values, problem)."""
    f = request.form
    title = (f.get("title") or "").strip()[:200]
    category = f.get("category") if f.get("category") in ("service", "event") else "event"
    ev_date = (f.get("event_date") or "").strip()
    ev_time = (f.get("event_time") or "").strip()
    recurring = f.get("recurring") if f.get("recurring") in ("none", "weekly", "monthly") else "none"
    problem = None
    try:
        datetime.strptime(ev_date, "%Y-%m-%d")
    except ValueError:
        problem = "Please choose a date for the event."
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", ev_time):
        problem = problem or "Please choose a time for the event."
    if not title:
        problem = "Please give the event a title."
    values = (title, category, ev_date, ev_time, (f.get("location") or "").strip()[:200],
              (f.get("description") or "").strip()[:5000], recurring, (f.get("ministry") or "").strip() or None)
    return values, problem


@app.route("/admin/new", methods=["GET", "POST"])
@login_required
def new_event():
    if request.method == "POST":
        db = get_db()
        values, problem = _event_form_values()
        if problem:
            flash(problem)
            return render_template("event_form.html", event=dict(zip(
                ("title", "category", "event_date", "event_time", "location", "description", "recurring", "ministry"), values)),
                ministries=ministry_options())
        db.execute(
            """INSERT INTO events (title, category, event_date, event_time, location, description, recurring, ministry)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            values,
        )
        db.commit()
        flash("Event added.")
        return redirect(url_for("admin"))
    return render_template("event_form.html", event=None, ministries=ministry_options())


@app.route("/admin/<int:event_id>/edit", methods=["GET", "POST"])
@login_required
def edit_event(event_id):
    db = get_db()
    if request.method == "POST":
        values, problem = _event_form_values()
        if problem:
            flash(problem)
            ev = dict(zip(("title", "category", "event_date", "event_time", "location", "description", "recurring", "ministry"), values))
            ev["id"] = event_id
            return render_template("event_form.html", event=ev, ministries=ministry_options())
        db.execute(
            """UPDATE events SET title=?, category=?, event_date=?, event_time=?,
               location=?, description=?, recurring=?, ministry=? WHERE id=?""",
            values + (event_id,),
        )
        db.commit()
        flash("Event updated.")
        return redirect(url_for("admin"))
    event = db.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
    if not event:
        abort(404)
    return render_template("event_form.html", event=event, ministries=ministry_options())


@app.route("/admin/<int:event_id>/delete", methods=["POST"])
@login_required
def delete_event(event_id):
    db = get_db()
    db.execute("DELETE FROM events WHERE id=?", (event_id,))
    db.commit()
    flash("Event removed.")
    return redirect(url_for("admin"))


# ---------- Admin: Q&A moderation ----------

@app.route("/admin/questions")
@login_required
def admin_questions():
    db = get_db()
    pending = db.execute(
        "SELECT * FROM questions WHERE status='pending' ORDER BY submitted_at ASC"
    ).fetchall()
    answered = db.execute(
        "SELECT * FROM questions WHERE status='answered' ORDER BY answered_at DESC"
    ).fetchall()
    return render_template("admin_questions.html", pending=pending, answered=answered)


@app.route("/admin/questions/<int:question_id>/answer", methods=["POST"])
@login_required
def answer_question(question_id):
    answer_text = request.form.get("answer_text", "").strip()
    if not answer_text:
        flash("Write an answer before publishing.")
        return redirect(url_for("admin_questions"))
    db = get_db()
    db.execute(
        "UPDATE questions SET status='answered', answer_text=?, answered_at=? WHERE id=?",
        (answer_text, datetime.now().isoformat(), question_id),
    )
    db.commit()
    flash("Answer published.")
    return redirect(url_for("admin_questions"))


@app.route("/admin/questions/<int:question_id>/reject", methods=["POST"])
@login_required
def reject_question(question_id):
    db = get_db()
    db.execute("UPDATE questions SET status='rejected' WHERE id=?", (question_id,))
    db.commit()
    flash("Question dismissed.")
    return redirect(url_for("admin_questions"))


@app.route("/admin/questions/<int:question_id>/delete", methods=["POST"])
@login_required
def delete_question(question_id):
    db = get_db()
    db.execute("DELETE FROM questions WHERE id=?", (question_id,))
    db.commit()
    flash("Question deleted.")
    return redirect(url_for("admin_questions"))


# ---------- Admin: Devotionals ----------

@app.route("/admin/email", methods=["GET", "POST"])
@login_required
def admin_email():
    """Check email is working, and send the safeguarding digest on demand.

    emailer.py already had send_test() and send_prayer_digest() written but
    nothing called them, so there was no way to find out whether SMTP worked
    short of asking a member to try signing in.
    """
    db = get_db()
    result = None

    if request.method == "POST":
        action = request.form.get("action", "")

        if action == "test":
            to = (request.form.get("to") or "").strip()
            if not to or "@" not in to:
                result = ("bad", "Enter an email address to send the test to.")
            elif not emailer.is_configured():
                result = ("bad", "Email isn't configured yet. See the list below.")
            else:
                ok, message = emailer.send_test(CHURCH_NAME, to)
                result = ("good" if ok else "bad",
                          f"Test sent to {to}." if ok else f"Failed: {message}")

        elif action == "digest":
            to = (request.form.get("to") or "").strip()
            held = db.execute(
                "SELECT body, submitted_at FROM prayers WHERE status='held' "
                "ORDER BY submitted_at ASC"
            ).fetchall()
            if not to or "@" not in to:
                result = ("bad", "Enter an email address to send the digest to.")
            elif not held:
                result = ("bad", "Nothing is held for review, so there's no digest to send.")
            else:
                # No part of the request text goes in the email.
                #
                # A first attempt truncated each request to 70 characters,
                # which turned out to be useless as a safeguard: "Please pray
                # for my mum who is very unwell in hospital" is 67 characters,
                # so a full health disclosure went out untouched. These are
                # exactly the messages held back for review — often the most
                # sensitive things anyone submits — and email is not a private
                # channel. The reminder therefore carries only how many are
                # waiting, when they arrived, and a link to read them behind
                # the admin login.
                items = []
                for i, row in enumerate(held, start=1):
                    when = (row["submitted_at"] or "")[:10]
                    items.append(f"Request {i}, submitted {when}" if when
                                 else f"Request {i}")
                ok, message = emailer.send_prayer_digest(
                    CHURCH_NAME, to, len(held), items,
                    url_for("admin_prayers", _external=True),
                )
                result = ("good" if ok else "bad",
                          f"Digest sent to {to}." if ok else f"Failed: {message}")

    held_count = db.execute(
        "SELECT COUNT(*) FROM prayers WHERE status='held'"
    ).fetchone()[0]

    return render_template(
        "admin_email.html",
        church_name=CHURCH_NAME,
        configured=emailer.is_configured(),
        problems=emailer.config_problems(),
        smtp_host=emailer.SMTP_HOST or "(not set)",
        smtp_port=emailer.SMTP_PORT,
        smtp_from=emailer.SMTP_FROM or "(not set)",
        smtp_security=emailer.SMTP_SECURITY,
        max_recipients=emailer.MAX_RECIPIENTS_PER_SEND,
        held_count=held_count,
        result=result,
    )


# The Bible data files. They're too big for the app zip, so they travel in
# separate zips, and a server without them quietly loses features. This is
# what tells you, plainly, which one is missing.
DATA_FILES = [
    ("headings.sqlite", "headings", "Section headings in the reader (\u201cThe Word Became Flesh\u201d)", "Clearspring_2_bibles_a.zip"),
    ("web.sqlite", "verses", "World English Bible (the main translation) and keyword search", "Clearspring_2_bibles_a.zip"),
    ("bsb.sqlite", "verses", "Berean Standard Bible", "Clearspring_2_bibles_a.zip"),
    ("original_words.sqlite", "lexicon", "Greek and Hebrew word study", "Clearspring_3_bibles_b.zip"),
    ("cross_references.sqlite", "chapter_refs", "Cross references", "Clearspring_3_bibles_b.zip"),
    ("asv.sqlite", "verses", "American Standard Version", "Clearspring_3_bibles_b.zip"),
    ("ylt.sqlite", "verses", "Young's Literal Translation", "Clearspring_COMPLETE.zip"),
    ("darby.sqlite", "verses", "Darby Bible", "Clearspring_COMPLETE.zip"),
    ("webbe.sqlite", "verses", "World English Bible (British)", "Clearspring_3_bibles_b.zip"),
    ("notes.sqlite", "notes", "Study notes, book introductions, themes, profiles and the Tyndale dictionary", "Clearspring_COMPLETE.zip"),
    ("grammar.sqlite", "chapters", "Word by word: grammar, sentence structure and word-study totals", "Clearspring_COMPLETE.zip"),
    ("fathers.sqlite", "fathers", "The early church on each verse (Catena Aurea, Chrysostom, Augustine)", "Clearspring_COMPLETE.zip"),
    ("library.sqlite", "dictionary", "Library: dictionary, topics, commentaries, people, places, maps, timeline", "Clearspring_4_library.zip"),
]
_data_health_cache = {}


def data_health(refresh=False):
    """Each data file: present and readable, or what's wrong with it."""
    if _data_health_cache and not refresh:
        return _data_health_cache["v"]
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "bibles")
    out = []
    for name, table, feature, zipname in DATA_FILES:
        path = os.path.join(base, name)
        problem = None
        if not os.path.exists(path):
            problem = "missing"
        else:
            try:
                conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
                try:
                    conn.execute(f"SELECT 1 FROM {table} LIMIT 1").fetchone()
                finally:
                    conn.close()
            except sqlite3.Error:
                problem = "damaged or incomplete"
        out.append({"file": name, "feature": feature, "zip": zipname, "ok": problem is None,
                    "problem": problem, "size": os.path.getsize(path) if os.path.exists(path) else 0})
    _data_health_cache["v"] = out
    return out


def data_missing():
    return [d for d in data_health() if not d["ok"]]


for _d in data_missing():
    # Shows in Render's logs on every start, so a missing file is easy to spot.
    print(f"WARNING: Bible data file {_d['file']} is {_d['problem']}; "
          f"'{_d['feature']}' is switched off. Upload {_d['zip']}.", flush=True)


@app.route("/admin/status")
@login_required
def admin_status():
    """What's switched on and what isn't.

    Optional features fail silently by design — a missing API key just hides
    the feature rather than breaking the page. That's the right behaviour for
    visitors, but it makes it very hard to tell whether something is off
    because it's misconfigured or because you're looking in the wrong place.
    This page answers that directly.
    """
    import study_assistant

    def state(on, env_names, note_on, note_off, where):
        return {
            "on": on,
            "env": env_names,
            "note": note_on if on else note_off,
            "where": where,
        }

    features = [
        ("Bible study assistant", state(
            study_available(),
            ["GEMINI_API_KEY"],
            f"Working. Model: {study_assistant.current_model()}.",
            "Off. Add GEMINI_API_KEY, then redeploy.",
            "Bible → open any chapter → 'Study help' button, bottom right",
        )),
        ("ESV Bible (Crossway)", state(
            bool(bible_sources.ESV_API_KEY),
            ["ESV_API_KEY"],
            "Working. The ESV is in the translation picker. Crossway's rules are built in: under 500 verses stored, ESV shown, esv.org linked.",
            "Off. Get a free key at api.esv.org (church, non-commercial use), add ESV_API_KEY, then redeploy.",
            "Bible → translation picker",
        )),
        ("Audio Bible", state(
            True,
            ["AUDIO_PROXY (optional)"],
            ("Working. All listening goes through this server (AUDIO_PROXY is on): more private, but each listener holds a server thread."
             if audio_bible.proxy_all() else
             "Working. Phones play chapters straight from OpenBible.com; saving a book for offline goes through this server, two chapters at a time."),
            "",
            "Bible → Listen",
        )),
        ("Other modern translations (API.Bible)", state(
            bool(bible_sources.API_BIBLE_KEY) and any(c != "esv" for c in bible_sources.licensed_status()["live"]),
            ["API_BIBLE_KEY"],
            "Working: " + (", ".join(n for c, n in bible_sources.licensed_status()["live"].items() if c != "esv") or "none found") + ". Views are reported to API.Bible as its licence requires.",
            ("Key set, but none of NIV, NLT, CSB, NKJV or NASB is switched on for it. Choose them in your API.Bible dashboard (up to three on the free plan)."
             if bible_sources.API_BIBLE_KEY else "Off. Make a free Starter account at api.bible, pick up to three translations, add API_BIBLE_KEY, then redeploy."),
            "Bible → translation picker",
        )),
        ("Web push notifications", state(
            push_is_configured(),
            ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
            "Working for browsers.",
            "Off. All three VAPID values are needed.",
            "Settings → Notifications",
        )),
        ("Native app notifications", state(
            native_push_is_configured(),
            ["FIREBASE_SERVICE_ACCOUNT"],
            "Working for the iOS and Android apps (Firebase).",
            ("The old FCM_SERVER_KEY is set, but Google switched that off in 2024. Add FIREBASE_SERVICE_ACCOUNT instead (see native/README.md) and remove the old key."
             if native_push_status() == "legacy" else
             "Off. Only needed once the native apps are published. Paste the Firebase service-account JSON into FIREBASE_SERVICE_ACCOUNT."),
            "iOS / Android app only",
        )),
        ("Outgoing email", state(
            email_is_configured(),
            ["SMTP_HOST", "SMTP_FROM"],
            "Working. Sign-in links will be delivered.",
            "Off. Members cannot receive sign-in links.",
            "Account → Sign in",
        )),
    ]

    # Where the database actually lives, since that is the other thing people
    # need to be able to confirm at a glance.
    storage = {
        "path": DB_PATH,
        "explicit": bool(os.environ.get("CHURCH_DB")),
        "exists": os.path.exists(DB_PATH),
        "production": _HTTPS_ONLY,
    }

    return render_template(
        "admin_status.html",
        church_name=CHURCH_NAME,
        features=features,
        storage=storage,
        data=data_health(refresh=True),
    )


@app.route("/admin/data")
@login_required
def admin_data():
    """Where the data lives, plus backup and restore."""
    db = get_db()
    counts = {}
    for label, table in [
        ("Events", "events"), ("Sermons", "sermons"), ("Prayer requests", "prayers"),
        ("Questions", "questions"), ("Devotionals", "devotionals"),
        ("Resources", "resources"), ("Ministries", "ministries"),
        ("Appeals", "campaigns"),
    ]:
        try:
            counts[label] = db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        except sqlite3.Error:
            counts[label] = 0

    size = 0
    if os.path.exists(DB_PATH):
        size = os.path.getsize(DB_PATH)
        # WAL and shared-memory files count towards the disk quota too.
        for suffix in ("-wal", "-shm"):
            extra = DB_PATH + suffix
            if os.path.exists(extra):
                size += os.path.getsize(extra)

    # A full disk is one of the few ways SQLite can actually corrupt: writes
    # fail mid-transaction. Surface the headroom so it never comes as a
    # surprise.
    disk_free_mb = disk_total_mb = disk_used_pct = None
    try:
        usage = shutil.disk_usage(os.path.dirname(DB_PATH))
        disk_free_mb = round(usage.free / (1024 * 1024))
        disk_total_mb = round(usage.total / (1024 * 1024))
        if usage.total:
            disk_used_pct = round((usage.used / usage.total) * 100)
    except OSError:
        pass

    return render_template(
        "admin_data.html",
        db_path=DB_PATH,
        db_size_kb=round(size / 1024, 1),
        counts=counts,
        disk_free_mb=disk_free_mb,
        disk_total_mb=disk_total_mb,
        disk_used_pct=disk_used_pct,
        copies=saved_copies(),
    )


@app.route("/admin/data/backup")
@login_required
def admin_backup():
    """Download a complete copy of the database."""
    if not os.path.exists(DB_PATH):
        flash("No database file found yet.")
        return redirect(url_for("admin_data"))

    # Use SQLite's backup API so the copy is consistent even if something
    # is mid-write. Copying the file directly can produce a corrupt backup.
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    source = sqlite3.connect(DB_PATH)
    dest = sqlite3.connect(tmp.name)
    with dest:
        source.backup(dest)
    dest.close()
    source.close()

    stamp = date.today().isoformat()
    return send_file(
        tmp.name,
        as_attachment=True,
        download_name=f"clearspring-backup-{stamp}.db",
        mimetype="application/octet-stream",
    )


def _check_backup_file(path):
    """None if it's a usable Clearspring database, else what's wrong."""
    try:
        check = sqlite3.connect(path)
        tables = {r[0] for r in check.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        ok = check.execute("PRAGMA quick_check").fetchone()
        check.close()
    except sqlite3.Error:
        return "That file isn't a valid database. Nothing was changed."
    if "events" not in tables:
        return "That doesn't look like a Clearspring backup. Nothing was changed."
    if not ok or ok[0] != "ok":
        return "That backup is damaged (SQLite's check failed), so it wasn't used. Nothing was changed."
    return None


def _save_upload(field="backup"):
    import tempfile
    upload = request.files.get(field)
    if not upload or not upload.filename:
        return None, "Choose a backup file first."
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False, dir=os.path.dirname(DB_PATH) or None)
    upload.save(tmp.name)
    tmp.close()
    problem = _check_backup_file(tmp.name)
    if problem:
        os.unlink(tmp.name)
        return None, problem
    return tmp.name, None


def _safety_copy(kind):
    """A consistent copy of the current database next to it, before changing
    it: clearspring.db.before-<kind>-<time>. Keeps the newest five of each."""
    import glob
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = f"{DB_PATH}.before-{kind}-{stamp}"
    if os.path.exists(DB_PATH):
        src = sqlite3.connect(DB_PATH)
        out = sqlite3.connect(dest)
        with out:
            src.backup(out)
        out.close()
        src.close()
    old = sorted(glob.glob(f"{DB_PATH}.before-{kind}-*"))
    for f in old[:-5]:
        try:
            os.remove(f)
        except OSError:
            pass
    return dest


def saved_copies():
    """Safety copies kept on the server, newest first."""
    import glob
    out = []
    for f in glob.glob(f"{DB_PATH}.before-*"):
        m = re.search(r"\.before-(restore|merge|undo)-(\d{8})-(\d{6})$", f)
        if not m:
            continue
        try:
            when = datetime.strptime(m.group(2) + m.group(3), "%Y%m%d%H%M%S")
        except ValueError:
            continue
        out.append({"name": os.path.basename(f), "kind": m.group(1), "when": when,
                    "size_kb": round(os.path.getsize(f) / 1024)})
    return sorted(out, key=lambda x: x["when"], reverse=True)


def _replace_db_with(src):
    """Swap the live database for the file at `src` (moved into place)."""
    import shutil
    old = g.pop("db", None)
    if old is not None:
        try:
            old.close()
        except sqlite3.Error:
            pass
    # In WAL mode the database is three files: the .db plus -wal and -shm.
    # Replacing only the .db leaves the old -wal in place, and SQLite will
    # replay it over the restored file — so the restore silently appears to
    # work while the old data comes back. Clear them (the safety copy made
    # with SQLite's backup already includes their contents).
    for suffix in ("-wal", "-shm"):
        stale = DB_PATH + suffix
        if os.path.exists(stale):
            try:
                os.remove(stale)
            except OSError:
                pass
    shutil.move(src, DB_PATH)
    try:
        fresh = sqlite3.connect(DB_PATH)
        fresh.execute("PRAGMA journal_mode=WAL")
        fresh.close()
    except sqlite3.Error:
        pass
    # A backup made by an older version of the app won't have the newer
    # tables and columns, so bring it up to date straight away.
    try:
        init_db()
    except Exception:
        app.logger.exception("Couldn't update the restored database")


@app.route("/admin/data/restore", methods=["POST"])
@login_required
def admin_restore():
    """Replace the current database with an uploaded backup."""
    path, problem = _save_upload()
    if problem:
        flash(problem)
        return redirect(url_for("admin_data"))
    _safety_copy("restore")
    _replace_db_with(path)
    flash("Backup restored. Your previous data was kept on the server: see “Safety copies” below.")
    return redirect(url_for("admin_data"))


def _merge_pending_path(token):
    return os.path.join(os.path.dirname(DB_PATH) or ".", f".merge-pending-{token}.db")


@app.route("/admin/data/merge", methods=["POST"])
@login_required
def admin_merge():
    """Step 1: upload an old backup and see what merging would add."""
    import shutil
    import tempfile
    # Only one pending merge at a time.
    old_token = session.pop("merge_pending", None)
    if old_token and re.fullmatch(r"[A-Za-z0-9_-]{8,64}", old_token) and os.path.exists(_merge_pending_path(old_token)):
        os.remove(_merge_pending_path(old_token))
    path, problem = _save_upload()
    if problem:
        flash(problem)
        return redirect(url_for("admin_data"))
    token = secrets.token_urlsafe(16)
    shutil.move(path, _merge_pending_path(token))
    session["merge_pending"] = token
    session["merge_name"] = (request.files["backup"].filename or "backup.db")[:120]
    # Rehearse the merge on a copy of the current data, so the preview is exact.
    trial = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    trial.close()
    try:
        live = sqlite3.connect(DB_PATH)
        copy = sqlite3.connect(trial.name)
        with copy:
            live.backup(copy)
        live.close()
        bak = sqlite3.connect(_merge_pending_path(token))
        _bring_up_to_date(bak)
        report = db_merge.merge(copy, bak)
        bak.close()
        copy.close()
    except Exception:
        app.logger.exception("Merge preview failed")
        flash("Something went wrong reading that backup. Nothing was changed.")
        return redirect(url_for("admin_data"))
    finally:
        try:
            os.unlink(trial.name)
        except OSError:
            pass
    rows = sorted(({"table": t, "name": db_merge.friendly(t), **v} for t, v in report.items()),
                  key=lambda r: -r["added"])
    return render_template("admin_merge.html", rows=rows, filename=session["merge_name"])


def _bring_up_to_date(conn):
    """An old backup may lack newer columns; that's fine for merging (only
    shared columns are used), so nothing to do except make it readable."""
    conn.execute("PRAGMA query_only=1")


@app.route("/admin/data/merge/confirm", methods=["POST"])
@login_required
def admin_merge_confirm():
    token = session.pop("merge_pending", None)
    name = session.pop("merge_name", "the backup")
    if not token or not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", token) or not os.path.exists(_merge_pending_path(token)):
        flash("That merge has expired. Upload the backup again.")
        return redirect(url_for("admin_data"))
    pending = _merge_pending_path(token)
    if request.form.get("action") != "merge":
        os.remove(pending)
        flash("Merge cancelled. Nothing was changed.")
        return redirect(url_for("admin_data"))
    _safety_copy("merge")
    db = get_db()
    bak = sqlite3.connect(pending)
    try:
        report = db_merge.merge(db, bak)
        db.commit()
    except Exception:
        db.rollback()
        app.logger.exception("Merge failed")
        flash("The merge didn't work, so nothing was changed. Your data is as it was.")
        return redirect(url_for("admin_data"))
    finally:
        bak.close()
        try:
            os.remove(pending)
        except OSError:
            pass
    total = sum(v["added"] for v in report.values())
    if total:
        flash(f"Merged {name}: added {total} item{'s' if total != 1 else ''} (" +
              ", ".join(f"{v['added']} {db_merge.friendly(t).lower()}" for t, v in sorted(report.items(), key=lambda kv: -kv[1]['added'])[:6]) +
              "). A copy from just before the merge is kept below if you need to undo it.")
    else:
        flash(f"Merged {name}: everything in it was already here, so nothing was added.")
    return redirect(url_for("admin_data"))


@app.route("/admin/data/copies/<name>", methods=["GET", "POST"])
@login_required
def admin_saved_copy(name):
    """Download a safety copy, or go back to it."""
    if not any(c["name"] == name for c in saved_copies()):
        abort(404)
    path = os.path.join(os.path.dirname(DB_PATH) or ".", name)
    if request.method == "GET":
        return send_file(path, as_attachment=True, download_name=f"clearspring-{name.split('.before-')[1]}.db",
                         mimetype="application/octet-stream")
    if request.form.get("action") != "restore":
        abort(400)
    import shutil
    import tempfile
    problem = _check_backup_file(path)
    if problem:
        flash(problem)
        return redirect(url_for("admin_data"))
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False, dir=os.path.dirname(DB_PATH) or None)
    tmp.close()
    shutil.copy2(path, tmp.name)
    _safety_copy("undo")
    _replace_db_with(tmp.name)
    flash("Gone back to that copy. What was there a moment ago was kept as a safety copy too.")
    return redirect(url_for("admin_data"))


# ---------- Admin: member accounts ----------
# Who has an account, for running the app and helping people (a forgotten
# sign-in, a request to delete their account). Shows only what's needed:
# name, email, when they joined and last used the app, and their groups.
# Never what they've saved privately (notes, journal, prayer list).

def _staff_log(action, detail=""):
    db = get_db()
    db.execute("""CREATE TABLE IF NOT EXISTS staff_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, staff TEXT, action TEXT NOT NULL, detail TEXT)""")
    who = (current_staff() or {}).get("name") or ("Owner" if session.get("is_admin") else "")
    db.execute("INSERT INTO staff_log (at, staff, action, detail) VALUES (?,?,?,?)",
               (datetime.now().isoformat(timespec="seconds"), who, action, detail[:300]))


@app.route("/admin/members")
@login_required
def admin_members():
    db = get_db()
    q = (request.args.get("q") or "").strip()[:80]
    page = max(1, request.args.get("page", 1, type=int))
    per = 50
    where, args = "", []
    if q:
        like = "%" + q.replace("%", "").replace("_", "") + "%"
        where, args = "WHERE m.email LIKE ? OR m.name LIKE ?", [like, like]
    total_all = db.execute("SELECT COUNT(*) FROM members").fetchone()[0]
    total = db.execute(f"SELECT COUNT(*) FROM members m {where}", args).fetchone()[0]
    rows = db.execute(f"""
        SELECT m.id, m.name, m.email, m.created_at, m.last_login, m.active,
               (SELECT MAX(day) FROM member_activity a WHERE a.member_id=m.id) AS last_active,
               (SELECT COUNT(*) FROM group_members gm WHERE gm.member_id=m.id) AS groups
        FROM members m {where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?""", args + [per, (page - 1) * per]).fetchall()
    since = (date.today() - timedelta(days=30)).isoformat()
    stats = {
        "total": total_all,
        "new30": db.execute("SELECT COUNT(*) FROM members WHERE created_at >= ?", (since,)).fetchone()[0],
        "active30": db.execute("SELECT COUNT(DISTINCT member_id) FROM member_activity WHERE day >= ?", (since,)).fetchone()[0],
    }
    return render_template("admin_members.html", rows=rows, q=q, page=page, pages=max(1, -(-total // per)), total=total, stats=stats)


@app.route("/admin/members/<int:member_id>", methods=["GET", "POST"])
@login_required
def admin_member(member_id):
    db = get_db()
    m = db.execute("SELECT id, name, email, created_at, last_login, email_verified, active, password_hash IS NOT NULL AS has_password FROM members WHERE id=?",
                   (member_id,)).fetchone()
    if not m:
        abort(404)
    if request.method == "POST" and request.form.get("action") == "reset":
        if not email_is_configured():
            flash("Email isn't set up on the server yet (Admin → Status → Outgoing email), so a reset link can't be sent.")
        elif rate_limited("staff_reset", str(member_id), limit=3, window_seconds=3600):
            flash("A reset link was sent recently. Please wait a while before sending another.")
        else:
            ok = _send_reset(dict(db.execute("SELECT * FROM members WHERE id=?", (member_id,)).fetchone()))
            _staff_log("Sent a password reset link", f"#{member_id}")
            db.commit()
            flash(f"A password reset link has been emailed to {m['email']}. It works once, for 20 minutes." if ok
                  else "The email couldn't be sent. Check Admin → Status → Outgoing email.")
        return redirect(url_for("admin_member", member_id=member_id))
    if request.method == "POST" and request.form.get("action") == "delete":
        typed = (request.form.get("confirm_email") or "").strip().lower()
        if typed != (m["email"] or "").lower():
            flash("The email you typed didn't match, so nothing was deleted.")
            return redirect(url_for("admin_member", member_id=member_id))
        delete_member_everywhere(db, member_id)
        _staff_log("Deleted a member account", f"#{member_id}, on request" + (f": {request.form.get('reason')[:200]}" if request.form.get("reason") else ""))
        db.commit()
        flash("That account and everything in it have been deleted.")
        return redirect(url_for("admin_members"))
    groups = db.execute("SELECT g.id, g.name, gm.role FROM groups g JOIN group_members gm ON gm.group_id=g.id WHERE gm.member_id=? ORDER BY g.name",
                        (member_id,)).fetchall()
    days = db.execute("SELECT COUNT(*), MAX(day) FROM member_activity WHERE member_id=?", (member_id,)).fetchone()
    phones = db.execute("SELECT COUNT(*) FROM push_subscriptions WHERE member_id=?", (member_id,)).fetchone()[0]
    return render_template("admin_member.html", m=m, groups=groups, active_days=days[0], last_active=days[1], phones=phones)


# ---------- Admin: Notifications ----------

@app.route("/admin/notifications", methods=["GET", "POST"])
@login_required
def admin_notifications():
    db = get_db()

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        body = request.form.get("body", "").strip()
        type_key = request.form.get("type_key", "emergency")
        url_path = request.form.get("url", "/").strip() or "/"

        if not title or not body:
            flash("Both a title and a message are needed.")
        elif not push_is_configured() and not native_push_is_configured():
            flash("Notifications aren't configured on this server yet.")
        else:
            sent, failed = broadcast(type_key, title, body, url_path)
            flash(f"Sent to {sent} device{'s' if sent != 1 else ''}."
                  + (f" {failed} failed." if failed else ""))
        return redirect(url_for("admin_notifications"))

    counts = {}
    rows = db.execute("SELECT prefs_json FROM push_subscriptions").fetchall()
    for t in NOTIFICATION_TYPES:
        counts[t["key"]] = 0
    for row in rows:
        try:
            prefs = json.loads(row["prefs_json"])
        except (ValueError, TypeError):
            continue
        for k, v in prefs.items():
            if v and k in counts:
                counts[k] += 1

    return render_template(
        "admin_notifications.html",
        types=NOTIFICATION_TYPES,
        counts=counts,
        total=len(rows),
        configured=push_is_configured() or native_push_is_configured(),
    )


@app.route("/admin/notifications/check")
@login_required
def notification_check():
    """Plain diagnostics so setup problems are visible rather than guesswork."""
    import notifications as notif_mod

    key_ok, key_msg = notif_mod.validate_public_key()

    checks = [
        {
            "label": "pywebpush installed",
            "ok": notif_mod.PUSH_AVAILABLE,
            "fix": "Run:  pip install pywebpush",
        },
        {
            "label": "VAPID_PUBLIC_KEY set",
            "ok": bool(notif_mod.VAPID_PUBLIC_KEY),
            "fix": "Set it in the same window before running the app.",
        },
        {
            "label": "VAPID_PRIVATE_KEY set",
            "ok": bool(notif_mod.VAPID_PRIVATE_KEY),
            "fix": "Set it in the same window before running the app.",
        },
        {
            "label": "Public key valid",
            "ok": key_ok,
            "fix": key_msg,
        },
        {
            "label": "Ready to send",
            "ok": notif_mod.is_configured() and key_ok,
            "fix": "All of the above must pass.",
        },
    ]

    db = get_db()
    subs = db.execute("SELECT COUNT(*) FROM push_subscriptions").fetchone()[0]

    return render_template(
        "notification_check.html",
        checks=checks,
        subs=subs,
        key_length=len(notif_mod.VAPID_PUBLIC_KEY),
        key_message=key_msg,
        public_key_preview=(notif_mod.VAPID_PUBLIC_KEY[:14] + "…")
        if notif_mod.VAPID_PUBLIC_KEY else "(not set)",
    )


# ---------- Admin: Resources ----------

@app.route("/admin/resources")
@login_required
def admin_resources():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM resources ORDER BY category, sort_order, title"
    ).fetchall()
    grouped = []
    for slug, name, _ in RESOURCE_CATEGORIES:
        items = [r for r in rows if r["category"] == slug]
        grouped.append({"slug": slug, "name": name, "items": items})
    return render_template("admin_resources.html", grouped=grouped)


def _save_resource(resource_id):
    db = get_db()
    kind = request.form.get("kind", "link")
    fields = (
        request.form.get("title", "").strip(),
        request.form.get("category", "growing"),
        request.form.get("summary", "").strip() or None,
        request.form.get("body", "").strip() or None,
        request.form.get("url", "").strip() or None,
        kind,
        request.form.get("author", "").strip() or None,
        int(request.form.get("sort_order") or 0),
        1 if request.form.get("published") else 0,
    )
    if resource_id:
        db.execute(
            """UPDATE resources SET title=?, category=?, summary=?, body=?, url=?,
               kind=?, author=?, sort_order=?, published=? WHERE id=?""",
            fields + (resource_id,),
        )
    else:
        db.execute(
            """INSERT INTO resources (title, category, summary, body, url, kind,
               author, sort_order, published, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            fields + (datetime.now().isoformat(),),
        )
    db.commit()


@app.route("/admin/resources/new", methods=["GET", "POST"])
@login_required
def new_resource():
    if request.method == "POST":
        _save_resource(None)
        flash("Resource added.")
        return redirect(url_for("admin_resources"))
    return render_template(
        "resource_form.html", r=None, categories=RESOURCE_CATEGORIES
    )


@app.route("/admin/resources/<int:resource_id>/edit", methods=["GET", "POST"])
@login_required
def edit_resource(resource_id):
    db = get_db()
    if request.method == "POST":
        _save_resource(resource_id)
        flash("Resource updated.")
        return redirect(url_for("admin_resources"))
    r = db.execute("SELECT * FROM resources WHERE id=?", (resource_id,)).fetchone()
    if not r:
        abort(404)
    return render_template(
        "resource_form.html", r=r, categories=RESOURCE_CATEGORIES
    )


@app.route("/admin/resources/<int:resource_id>/delete", methods=["POST"])
@login_required
def delete_resource(resource_id):
    db = get_db()
    db.execute("DELETE FROM resources WHERE id=?", (resource_id,))
    db.commit()
    flash("Resource deleted.")
    return redirect(url_for("admin_resources"))


# ---------- Admin: Ministries ----------

@app.route("/admin/ministries")
@login_required
def admin_ministries():
    db = get_db()
    rows = db.execute("SELECT * FROM ministries ORDER BY sort_order, name").fetchall()
    return render_template(
        "admin_ministries.html", ministries=rows, safeguarded=SAFEGUARDED_SLUGS
    )


@app.route("/admin/ministries/<slug>/edit", methods=["GET", "POST"])
@login_required
def edit_ministry(slug):
    db = get_db()
    m = db.execute("SELECT * FROM ministries WHERE slug=?", (slug,)).fetchone()
    if not m:
        abort(404)

    is_safeguarded = slug in SAFEGUARDED_SLUGS

    if request.method == "POST":
        contact_name = request.form.get("contact_name", "").strip() or None
        contact_email = request.form.get("contact_email", "").strip() or None
        contact_phone = request.form.get("contact_phone", "").strip() or None

        # Safeguarding: ministries working with under-18s must not publish a
        # named individual or a personal phone number. Enforced here, not just
        # in the form, so it holds even if the form is bypassed.
        if is_safeguarded:
            contact_name = None
            contact_phone = None

        db.execute(
            """UPDATE ministries SET name=?, tagline=?, description=?, meets=?,
               location=?, contact_name=?, contact_email=?, contact_phone=?,
               resources=?, active=? WHERE slug=?""",
            (
                request.form.get("name", "").strip() or m["name"],
                request.form.get("tagline", "").strip() or None,
                request.form.get("description", "").strip() or None,
                request.form.get("meets", "").strip() or None,
                request.form.get("location", "").strip() or None,
                contact_name,
                contact_email,
                contact_phone,
                request.form.get("resources", "").strip() or None,
                1 if request.form.get("active") else 0,
                slug,
            ),
        )
        db.commit()
        if is_safeguarded and (request.form.get("contact_name") or request.form.get("contact_phone")):
            flash("Saved. Personal name and phone were not published: Kids and Youth "
                  "use a role email only, to protect volunteers and children.")
        else:
            flash("Ministry updated.")
        return redirect(url_for("admin_ministries"))

    return render_template("ministry_form.html", m=m, is_safeguarded=is_safeguarded)


# ---------- Admin: Store ----------

@app.route("/admin/store")
@login_required
def admin_store():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM products ORDER BY active DESC, featured DESC, sort_order, name"
    ).fetchall()
    return render_template(
        "admin_store.html",
        products=rows,
        categories=STORE_CATEGORIES,
        **store_settings(),
    )


@app.route("/admin/store/settings", methods=["POST"])
@login_required
def admin_store_settings():
    set_setting("store_enabled", "1" if request.form.get("store_enabled") else "0")
    set_setting("store_provider", request.form.get("store_provider", "").strip())
    set_setting("store_buy_url", request.form.get("store_buy_url", "").strip())
    set_setting("store_delivery_note", request.form.get("store_delivery_note", "").strip())
    set_setting("store_returns_url", request.form.get("store_returns_url", "").strip())
    flash("Store settings saved.")
    return redirect(url_for("admin_store"))


def _save_product(product_id):
    db = get_db()
    fields = (
        request.form.get("name", "").strip(),
        request.form.get("category", "other"),
        request.form.get("summary", "").strip() or None,
        request.form.get("description", "").strip() or None,
        _pence(request.form.get("price")),
        request.form.get("price_note", "").strip() or None,
        request.form.get("image_url", "").strip() or None,
        request.form.get("buy_url", "").strip() or None,
        request.form.get("stock", "available"),
        1 if request.form.get("featured") else 0,
        int(request.form.get("sort_order") or 0),
        1 if request.form.get("active") else 0,
    )
    if product_id:
        db.execute(
            """UPDATE products SET name=?, category=?, summary=?, description=?,
               price_pence=?, price_note=?, image_url=?, buy_url=?, stock=?,
               featured=?, sort_order=?, active=? WHERE id=?""",
            fields + (product_id,),
        )
    else:
        db.execute(
            """INSERT INTO products (name, category, summary, description,
               price_pence, price_note, image_url, buy_url, stock, featured,
               sort_order, active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            fields + (datetime.now().isoformat(),),
        )
    db.commit()


@app.route("/admin/store/new", methods=["GET", "POST"])
@login_required
def new_product():
    if request.method == "POST":
        _save_product(None)
        flash("Product added.")
        return redirect(url_for("admin_store"))
    return render_template(
        "product_form.html", p=None, categories=STORE_CATEGORIES, stock_labels=STOCK_LABELS
    )


@app.route("/admin/store/<int:product_id>/edit", methods=["GET", "POST"])
@login_required
def edit_product(product_id):
    db = get_db()
    if request.method == "POST":
        _save_product(product_id)
        flash("Product updated.")
        return redirect(url_for("admin_store"))
    p = db.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()
    if not p:
        abort(404)
    return render_template(
        "product_form.html", p=p, categories=STORE_CATEGORIES, stock_labels=STOCK_LABELS
    )


@app.route("/admin/store/<int:product_id>/delete", methods=["POST"])
@login_required
def delete_product(product_id):
    db = get_db()
    db.execute("DELETE FROM products WHERE id=?", (product_id,))
    db.commit()
    flash("Product deleted.")
    return redirect(url_for("admin_store"))


# ---------- Admin: Giving ----------

@app.route("/admin/giving")
@login_required
def admin_giving():
    db = get_db()
    campaigns = db.execute(
        "SELECT * FROM campaigns ORDER BY active DESC, created_at DESC"
    ).fetchall()
    return render_template(
        "admin_giving.html", campaigns=campaigns, **giving_settings()
    )


@app.route("/admin/giving/settings", methods=["POST"])
@login_required
def admin_giving_settings():
    set_setting("give_provider", request.form.get("give_provider", "").strip())
    set_setting("give_url", request.form.get("give_url", "").strip())
    set_setting("give_regular_url", request.form.get("give_regular_url", "").strip())
    set_setting("give_portal_url", request.form.get("give_portal_url", "").strip())
    flash("Giving links saved.")
    return redirect(url_for("admin_giving"))


def _pence(value):
    """Parse a pounds figure like '2500' or '2,500.50' into pence."""
    if not value:
        return None
    cleaned = str(value).replace(",", "").replace("£", "").strip()
    try:
        return int(round(float(cleaned) * 100))
    except ValueError:
        return None


def _form_date(key):
    """A YYYY-MM-DD date from the form, or None if it's missing or not a real date."""
    v = (request.form.get(key) or "").strip()
    try:
        return datetime.strptime(v, "%Y-%m-%d").date().isoformat()
    except ValueError:
        return None


@app.route("/admin/giving/campaign/new", methods=["GET", "POST"])
@login_required
def new_campaign():
    if request.method == "POST":
        db = get_db()
        db.execute(
            """INSERT INTO campaigns (title, blurb, target_pence, raised_pence,
               give_url, closes_on, active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                request.form.get("title", "").strip(),
                request.form.get("blurb", "").strip() or None,
                _pence(request.form.get("target")),
                _pence(request.form.get("raised")) or 0,
                request.form.get("give_url", "").strip() or None,
                _form_date("closes_on"),
                1 if request.form.get("active") else 0,
                datetime.now().isoformat(),
            ),
        )
        db.commit()
        flash("Campaign created.")
        return redirect(url_for("admin_giving"))
    return render_template("campaign_form.html", c=None)


@app.route("/admin/giving/campaign/<int:campaign_id>/edit", methods=["GET", "POST"])
@login_required
def edit_campaign(campaign_id):
    db = get_db()
    if request.method == "POST":
        db.execute(
            """UPDATE campaigns SET title=?, blurb=?, target_pence=?, raised_pence=?,
               give_url=?, closes_on=?, active=? WHERE id=?""",
            (
                request.form.get("title", "").strip(),
                request.form.get("blurb", "").strip() or None,
                _pence(request.form.get("target")),
                _pence(request.form.get("raised")) or 0,
                request.form.get("give_url", "").strip() or None,
                _form_date("closes_on"),
                1 if request.form.get("active") else 0,
                campaign_id,
            ),
        )
        db.commit()
        flash("Campaign updated.")
        return redirect(url_for("admin_giving"))
    c = db.execute("SELECT * FROM campaigns WHERE id=?", (campaign_id,)).fetchone()
    if not c:
        abort(404)
    return render_template("campaign_form.html", c=c)


@app.route("/admin/giving/campaign/<int:campaign_id>/delete", methods=["POST"])
@login_required
def delete_campaign(campaign_id):
    db = get_db()
    db.execute("DELETE FROM campaigns WHERE id=?", (campaign_id,))
    db.commit()
    flash("Campaign deleted.")
    return redirect(url_for("admin_giving"))


# ---------- Admin: Sermons ----------

@app.route("/admin/sermons")
@login_required
def admin_sermons():
    db = get_db()
    rows = db.execute("SELECT * FROM sermons ORDER BY preached_on DESC").fetchall()
    return render_template(
        "admin_sermons.html",
        sermons=rows,
        live_url=get_setting("live_stream_url", ""),
        live_on=get_setting("live_is_on", "0") == "1",
        yt=youtube_settings(),
    )


# ---------- Talks from YouTube ----------

YOUTUBE_EVERY = timedelta(hours=3)
_yt_lock = threading.Lock()


def _youtube_run_with(conn):
    conn.row_factory = sqlite3.Row
    def gs(k, d=None):
        r = conn.execute("SELECT value FROM settings WHERE key=?", (k,)).fetchone()
        return r["value"] if r else d
    def ss(k, v):
        conn.execute("INSERT INTO settings (key, value) VALUES (?, ?) "
                     "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, v))
    return youtube_import.run(conn, gs, ss)


def youtube_check(force=False):
    """Bring in new talks from YouTube if it's been a while (or now, if forced).
    Never more than one check at a time; never raises."""
    if not _yt_lock.acquire(blocking=force):
        return {"ok": True, "added": 0, "linked": 0, "note": "A check is already running."}
    try:
        conn = sqlite3.connect(DB_PATH, timeout=15.0)
        try:
            conn.execute("PRAGMA busy_timeout=15000")
            if not force:
                r = conn.execute("SELECT value FROM settings WHERE key='youtube_last_try'").fetchone()
                try:
                    if r and datetime.now() - datetime.fromisoformat(r[0]) < YOUTUBE_EVERY:
                        return None
                except ValueError:
                    pass
            return _youtube_run_with(conn)
        finally:
            conn.close()
    except Exception as e:
        app.logger.warning("YouTube import failed: %s", e)
        return {"ok": False, "added": 0, "linked": 0, "note": "Something went wrong checking YouTube."}
    finally:
        _yt_lock.release()


def youtube_check_soon():
    """Called when someone opens Watch or Home: check in the background so the
    page never waits on YouTube."""
    if app.config.get("TESTING") or os.environ.get("YOUTUBE_IMPORT") == "off":
        return
    try:
        r = get_db().execute("SELECT value FROM settings WHERE key='youtube_last_try'").fetchone()
        if r and datetime.now() - datetime.fromisoformat(r["value"]) < YOUTUBE_EVERY:
            return
    except (ValueError, TypeError):
        pass
    threading.Thread(target=youtube_check, daemon=True).start()


_wl_lock = threading.Lock()


def watch_library_refresh(force=False):
    """Refresh course lessons and channel shelves from YouTube (one at a time)."""
    if not _wl_lock.acquire(blocking=force):
        return None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=15.0)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA busy_timeout=15000")
            conn.execute("INSERT INTO settings (key, value) VALUES ('watch_lib_last_try', ?) "
                         "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (datetime.now().isoformat(),))
            conn.commit()
            return watch_library.refresh_due(conn, os.environ.get("YOUTUBE_API_KEY") or None, force=force)
        finally:
            conn.close()
    except Exception as e:
        app.logger.warning("Watch library refresh failed: %s", e)
        return None
    finally:
        _wl_lock.release()


def watch_library_soon():
    """Opened Watch: refresh the library in the background if it's been an hour."""
    if app.config.get("TESTING") or os.environ.get("YOUTUBE_IMPORT") == "off":
        return
    try:
        r = get_db().execute("SELECT value FROM settings WHERE key='watch_lib_last_try'").fetchone()
        if r and datetime.now() - datetime.fromisoformat(r["value"]) < timedelta(hours=1):
            return
    except (ValueError, TypeError):
        pass
    threading.Thread(target=watch_library_refresh, daemon=True).start()


@app.route("/watch/learn")
def watch_learn():
    """Courses from trusted teachers, by level and subject."""
    watch_library_soon()
    db = get_db()
    lib = watch_library.courses(db)
    subject = request.args.get("subject", "")
    level = request.args.get("level", "")
    shown = [c for c in lib if (not subject or c["subject"] == subject) and (not level or c["level"] == level)]
    used = {c["subject"] for c in lib}
    return render_template("watch_learn.html", courses=shown, all_courses=lib,
                           levels=watch_library.LEVELS, subjects=[x for x in watch_library.SUBJECTS if x[0] in used],
                           subject=subject, level=level, channels=watch_library.channels(db),
                           fmt_length=watch_library.fmt_length)


@app.route("/watch/learn/<slug>")
def watch_course(slug):
    db = get_db()
    c = watch_library.course(db, slug)
    if not c or (c["status"] != "live" and not session.get("is_admin")):
        abort(404)
    watch_library_soon()
    more = [x for x in watch_library.courses(db) if x["slug"] != slug and (x["subject"] == c["subject"] or x["level"] == c["level"])][:4]
    return render_template("watch_course.html", c=c, more=more, fmt_length=watch_library.fmt_length)


@app.route("/watch/v/<video_id>")
def watch_video(video_id):
    """One video from a "Latest from" channel shelf."""
    ch_id = request.args.get("ch", type=int)
    db = get_db()
    ch = next((c for c in watch_library.channels(db) if c["id"] == ch_id), None)
    if not ch or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        abort(404)
    v = next((x for x in ch["video_list"] if x.get("id") == video_id), None)
    if not v:
        abort(404)
    return render_template("watch_video.html", v=v, ch=ch, others=[x for x in ch["video_list"] if x.get("id") != video_id][:8])


@app.route("/admin/watch-library", methods=["GET", "POST"])
@login_required
def admin_watch_library():
    db = get_db()
    if request.method == "POST":
        action = request.form.get("action", "")
        cid = request.form.get("id", type=int)
        if action in ("add", "save"):
            title = (request.form.get("title") or "").strip()[:150]
            source = request.form.get("source") or ""
            playlist = watch_library.playlist_from(source)
            videos = [] if playlist else watch_library.videos_from(source)
            fields = {
                "title": title, "teacher": (request.form.get("teacher") or "").strip()[:120],
                "provider": (request.form.get("provider") or "").strip()[:120],
                "provider_url": (request.form.get("provider_url") or "").strip()[:300],
                "subject": request.form.get("subject") if request.form.get("subject") in watch_library.SUBJECT_NAMES else "bible",
                "level": request.form.get("level") if request.form.get("level") in watch_library.LEVEL_NAMES else "start",
                "about": (request.form.get("about") or "").strip()[:2000],
                "featured": 1 if request.form.get("featured") else 0,
            }
            if fields["provider_url"] and not fields["provider_url"].startswith(("https://", "http://")):
                fields["provider_url"] = "https://" + fields["provider_url"]
            if not title:
                flash("Give the course a title.")
            elif action == "add" and not (playlist or videos):
                flash("Paste a YouTube playlist link, or video links (one per line).")
            else:
                if action == "add":
                    slug = watch_library.slugify(title)
                    base, i = slug, 2
                    while db.execute("SELECT 1 FROM watch_courses WHERE slug=?", (slug,)).fetchone():
                        slug, i = f"{base}-{i}", i + 1
                    cid = db.execute(
                        "INSERT INTO watch_courses (slug, title, teacher, provider, provider_url, subject, level, about, featured, playlist_id, sort, created_at) "
                        "VALUES (?,?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(sort),0)+10 FROM watch_courses),?)",
                        (slug, *fields.values(), playlist, datetime.now().isoformat())).lastrowid
                else:
                    db.execute("UPDATE watch_courses SET title=?, teacher=?, provider=?, provider_url=?, subject=?, level=?, about=?, featured=? WHERE id=?",
                               (*fields.values(), cid))
                    if playlist:
                        db.execute("UPDATE watch_courses SET playlist_id=?, fetched_at=NULL WHERE id=?", (playlist, cid))
                if videos:
                    db.execute("UPDATE watch_courses SET playlist_id=NULL WHERE id=?", (cid,))
                    watch_library.set_videos(db, cid, videos)
                db.commit()
                if playlist:
                    row = db.execute("SELECT * FROM watch_courses WHERE id=?", (cid,)).fetchone()
                    ok = watch_library.refresh_course(db, row, os.environ.get("YOUTUBE_API_KEY") or None)
                    db.commit()
                    flash("Saved." if ok else "Saved, but YouTube didn't list the lessons yet: " +
                          (db.execute("SELECT problem FROM watch_courses WHERE id=?", (cid,)).fetchone()["problem"] or "try Refresh later."))
                else:
                    flash("Saved.")
        elif action in ("hide", "show") and cid:
            db.execute("UPDATE watch_courses SET status=? WHERE id=?", ("hidden" if action == "hide" else "live", cid))
            db.commit()
        elif action == "delete" and cid:
            db.execute("DELETE FROM watch_lessons WHERE course_id=?", (cid,))
            db.execute("DELETE FROM watch_courses WHERE id=?", (cid,))
            db.commit()
            flash("Course removed.")
        elif action in ("up", "down") and cid:
            rows = [r["id"] for r in db.execute("SELECT id FROM watch_courses ORDER BY sort, title").fetchall()]
            if cid in rows:
                i = rows.index(cid)
                j = i - 1 if action == "up" else i + 1
                if 0 <= j < len(rows):
                    rows[i], rows[j] = rows[j], rows[i]
                for n, r in enumerate(rows):
                    db.execute("UPDATE watch_courses SET sort=? WHERE id=?", (n * 10, r))
                db.commit()
        elif action == "refresh":
            done = watch_library_refresh(force=True) or {}
            flash(f"Checked YouTube: {done.get('courses', 0)} course(s) and {done.get('channels', 0)} channel(s) updated.")
        elif action == "add_channel":
            ch = youtube_import.channel_id_from(request.form.get("channel") or "")
            name = (request.form.get("channel_name") or "").strip()[:80]
            if not ch or not name:
                flash("Paste the channel's link and give it a name.")
            else:
                db.execute("INSERT OR IGNORE INTO watch_channels (channel_id, name, sort) VALUES (?,?,(SELECT COALESCE(MAX(sort),0)+10 FROM watch_channels))", (ch, name))
                row = db.execute("SELECT * FROM watch_channels WHERE channel_id=?", (ch,)).fetchone()
                watch_library.refresh_channel(db, row)
                db.commit()
                flash(f"Added {name}.")
        elif action in ("channel_off", "channel_on", "channel_delete") and cid:
            if action == "channel_delete":
                db.execute("DELETE FROM watch_channels WHERE id=?", (cid,))
            else:
                db.execute("UPDATE watch_channels SET active=? WHERE id=?", (1 if action == "channel_on" else 0, cid))
            db.commit()
        return redirect(url_for("admin_watch_library") + (f"#c{cid}" if cid else ""))
    edit = request.args.get("edit", type=int)
    return render_template("admin_watch_library.html",
                           courses=watch_library.courses(db, include_hidden=True),
                           channels=watch_library.channels(db, include_hidden=True),
                           levels=watch_library.LEVELS, subjects=watch_library.SUBJECTS,
                           edit=db.execute("SELECT * FROM watch_courses WHERE id=?", (edit,)).fetchone() if edit else None,
                           edit_videos=[dict(r) for r in db.execute("SELECT video_id, title FROM watch_lessons WHERE course_id=? ORDER BY n", (edit,)).fetchall()] if edit else [],
                           api_key=bool(os.environ.get("YOUTUBE_API_KEY")))


def youtube_settings():
    return {
        "channel": get_setting("youtube_channel_id", youtube_import.DEFAULT_CHANNEL_ID) or "",
        "on": get_setting("youtube_import", "on") != "off",
        "publish": get_setting("youtube_publish", "1") != "0",
        "date_mode": get_setting("youtube_date_mode", "youtube") or "youtube",
        "last_check": get_setting("youtube_last_check", ""),
        "last_error": get_setting("youtube_last_error", ""),
    }


@app.route("/admin/sermons/youtube", methods=["POST"])
@login_required
def admin_youtube():
    if request.form.get("action") == "save":
        raw = (request.form.get("channel") or "").strip()
        if raw:
            cid = youtube_import.channel_id_from(raw)
            if cid:
                set_setting("youtube_channel_id", cid)
            else:
                flash("Couldn't find that YouTube channel. Paste the channel's link, e.g. youtube.com/@yourchurch.")
        set_setting("youtube_import", "on" if request.form.get("on") else "off")
        set_setting("youtube_publish", "1" if request.form.get("publish") else "0")
        mode = request.form.get("date_mode")
        set_setting("youtube_date_mode", mode if mode in ("youtube", "sunday") else "youtube")
        get_db().commit()
        flash("YouTube settings saved.")
    else:
        result = youtube_check(force=True) or {"note": "Checked."}
        flash(result["note"])
    return redirect(url_for("admin_sermons") + "#youtube")


@app.route("/admin/sermons/live", methods=["POST"])
@login_required
def admin_live_settings():
    set_setting("live_stream_url", request.form.get("live_stream_url", "").strip())
    set_setting("live_is_on", "1" if request.form.get("live_is_on") else "0")
    flash("Live stream settings saved.")
    return redirect(url_for("admin_sermons"))


@app.route("/admin/sermons/new", methods=["GET", "POST"])
@login_required
def new_sermon():
    if request.method == "POST":
        problem = _save_sermon(None)
        if problem:
            return _sermon_form_again(problem, None)
        title = request.form.get("title", "").strip()
        if request.form.get("notify") and request.form.get("published"):
            sent, _ = broadcast(
                "sermon",
                "New message available",
                title,
                url_for("watch_hub"),
            )
            flash(f"Sermon added. Notified {sent} device{'s' if sent != 1 else ''}.")
        else:
            flash("Sermon added.")
        return redirect(url_for("admin_sermons"))
    return render_template("sermon_form.html", s=None)


@app.route("/admin/sermons/<int:sermon_id>/edit", methods=["GET", "POST"])
@login_required
def edit_sermon(sermon_id):
    db = get_db()
    if request.method == "POST":
        if not db.execute("SELECT 1 FROM sermons WHERE id=?", (sermon_id,)).fetchone():
            abort(404)
        problem = _save_sermon(sermon_id)
        if problem:
            return _sermon_form_again(problem, sermon_id)
        flash("Sermon updated.")
        return redirect(url_for("admin_sermons"))
    row = db.execute("SELECT * FROM sermons WHERE id=?", (sermon_id,)).fetchone()
    if not row:
        abort(404)
    return render_template("sermon_form.html", s=row)


SERMON_FIELDS = ("title", "speaker", "series", "topic", "passage", "summary", "preached_on", "video_url",
                 "audio_url", "duration_seconds", "published", "outline", "group_questions")


def _sermon_form_values():
    """The sermon form, checked. Returns (values, problem)."""
    f = request.form
    def txt(k, n=200):
        return (f.get(k) or "").strip()[:n] or None
    mins = (f.get("duration_minutes") or "").strip()
    try:
        duration = int(float(mins) * 60) if mins else None
        if duration is not None and not (0 < duration <= 24 * 3600):
            duration = None
    except (ValueError, OverflowError):
        duration = None
    preached = (f.get("preached_on") or "").strip() or date.today().isoformat()
    problem = None
    try:
        datetime.strptime(preached, "%Y-%m-%d")
    except ValueError:
        problem = "Please choose the date the sermon was preached."
    title = txt("title")
    if not title:
        problem = "Please give the sermon a title."
    values = (title or "", txt("speaker"), txt("series"), txt("topic"), txt("passage"), txt("summary", 5000),
              preached, txt("video_url", 500), txt("audio_url", 500), duration,
              1 if f.get("published") else 0, txt("outline", 20000), txt("group_questions", 5000))
    return values, problem


def _save_sermon(sermon_id):
    """Shared insert/update for the sermon form. Returns a problem to show, or None."""
    db = get_db()
    fields, problem = _sermon_form_values()
    if problem:
        return problem
    if sermon_id:
        db.execute(
            """UPDATE sermons SET title=?, speaker=?, series=?, topic=?, passage=?,
               summary=?, preached_on=?, video_url=?, audio_url=?, duration_seconds=?,
               published=?, outline=?, group_questions=? WHERE id=?""",
            fields + (sermon_id,),
        )
    else:
        db.execute(
            """INSERT INTO sermons (title, speaker, series, topic, passage, summary,
               preached_on, video_url, audio_url, duration_seconds, published, outline, group_questions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            fields,
        )
    db.commit()
    return None


def _sermon_form_again(problem, sermon_id):
    """Show the form again with what was typed, and what needs fixing."""
    flash(problem)
    s = dict(zip(SERMON_FIELDS, _sermon_form_values()[0]))
    s["id"] = sermon_id
    return render_template("sermon_form.html", s=s)


@app.route("/admin/sermons/<int:sermon_id>/delete", methods=["POST"])
@login_required
def delete_sermon(sermon_id):
    db = get_db()
    db.execute("DELETE FROM sermons WHERE id=?", (sermon_id,))
    db.commit()
    flash("Sermon deleted.")
    return redirect(url_for("admin_sermons"))


# ---------- Admin: Live Polls ----------

@app.route("/admin/polls")
@login_required
def admin_polls():
    db = get_db()
    polls = db.execute(
        "SELECT * FROM polls ORDER BY (status = 'live') DESC, created_at DESC"
    ).fetchall()
    polls_with_options = []
    for p in polls:
        options = db.execute(
            "SELECT * FROM poll_options WHERE poll_id=? ORDER BY sort_order, id",
            (p["id"],),
        ).fetchall()
        polls_with_options.append({"row": p, "options": options})
    return render_template("admin_polls.html", polls=polls_with_options)


@app.route("/admin/polls/new", methods=["POST"])
@login_required
def new_poll():
    question = request.form.get("question", "").strip()
    show_results = "live" if request.form.get("show_results") == "live" else "after_close"
    option_labels = [
        v.strip() for v in request.form.getlist("option") if v.strip()
    ]

    if not question or len(option_labels) < 2:
        flash("A poll needs a question and at least two options.")
        return redirect(url_for("admin_polls"))

    db = get_db()
    cur = db.execute(
        "INSERT INTO polls (question, status, show_results, created_at) "
        "VALUES (?, 'draft', ?, ?)",
        (question, show_results, datetime.now().isoformat()),
    )
    poll_id = cur.lastrowid
    for i, label in enumerate(option_labels):
        db.execute(
            "INSERT INTO poll_options (poll_id, label, sort_order) VALUES (?, ?, ?)",
            (poll_id, label, i),
        )
    db.commit()
    flash("Poll created. Open it when you're ready to take votes.")
    return redirect(url_for("admin_polls"))


@app.route("/admin/polls/<int:poll_id>/open", methods=["POST"])
@login_required
def open_poll(poll_id):
    db = get_db()
    poll = db.execute("SELECT * FROM polls WHERE id=?", (poll_id,)).fetchone()
    if not poll:
        abort(404)
    # Only one poll live at a time — close any other so the Watch page
    # never has to reconcile two active polls at once.
    db.execute(
        "UPDATE polls SET status='closed', closed_at=? "
        "WHERE status='live' AND id != ?",
        (datetime.now().isoformat(), poll_id),
    )
    db.execute(
        "UPDATE polls SET status='live', opened_at=? WHERE id=?",
        (datetime.now().isoformat(), poll_id),
    )
    db.commit()
    flash("Poll is live.")
    return redirect(url_for("admin_polls"))


@app.route("/admin/polls/<int:poll_id>/close", methods=["POST"])
@login_required
def close_poll(poll_id):
    db = get_db()
    db.execute(
        "UPDATE polls SET status='closed', closed_at=? WHERE id=?",
        (datetime.now().isoformat(), poll_id),
    )
    db.commit()
    flash("Poll closed.")
    return redirect(url_for("admin_polls"))


@app.route("/admin/polls/<int:poll_id>/delete", methods=["POST"])
@login_required
def delete_poll(poll_id):
    db = get_db()
    # SQLite foreign keys aren't enforced on this connection, so the
    # options need deleting explicitly rather than relying on the
    # table's ON DELETE CASCADE.
    db.execute("DELETE FROM poll_options WHERE poll_id=?", (poll_id,))
    db.execute("DELETE FROM polls WHERE id=?", (poll_id,))
    db.commit()
    flash("Poll deleted.")
    return redirect(url_for("admin_polls"))


# ---------- Admin: Prayer ----------

@app.route("/admin/prayers")
@login_required
def admin_prayers():
    db = get_db()
    held = db.execute(
        "SELECT * FROM prayers WHERE status='held' ORDER BY submitted_at ASC"
    ).fetchall()
    private = db.execute(
        "SELECT * FROM prayers WHERE status='private' ORDER BY submitted_at DESC"
    ).fetchall()
    live = db.execute(
        "SELECT * FROM prayers WHERE status='live' ORDER BY submitted_at DESC LIMIT 40"
    ).fetchall()
    hidden = db.execute(
        "SELECT * FROM prayers WHERE status='hidden' ORDER BY submitted_at DESC LIMIT 20"
    ).fetchall()
    return render_template(
        "admin_prayers.html", held=held, private=private, live=live, hidden=hidden
    )


@app.route("/admin/prayers/<int:prayer_id>/<action>", methods=["POST"])
@login_required
def admin_prayer_action(prayer_id, action):
    db = get_db()
    if action == "approve":
        db.execute("UPDATE prayers SET status='live', hold_reason=NULL WHERE id=?", (prayer_id,))
        flash("Prayer request published.")
    elif action == "hide":
        db.execute("UPDATE prayers SET status='hidden' WHERE id=?", (prayer_id,))
        flash("Prayer request hidden from the wall.")
    elif action == "answered":
        db.execute(
            "UPDATE prayers SET kind='praise', answered_at=? WHERE id=?",
            (datetime.now().isoformat(), prayer_id),
        )
        flash("Marked as answered and moved to praise reports.")
    elif action == "delete":
        db.execute("DELETE FROM prayers WHERE id=?", (prayer_id,))
        flash("Prayer request deleted.")
    else:
        abort(404)
    db.commit()
    return redirect(url_for("admin_prayers"))


@app.route("/admin/devotionals")
@login_required
def admin_devotionals():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM devotionals ORDER BY created_at DESC"
    ).fetchall()
    return render_template("admin_devotionals.html", devotionals=rows)


@app.route("/admin/devotionals/new", methods=["GET", "POST"])
@login_required
def new_devotional():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        body = request.form.get("body", "").strip()
        if not title or not body:
            flash("A devotional needs a title and a body.")
            return render_template("devotional_form.html", devotional=None)
        db = get_db()
        db.execute(
            "INSERT INTO devotionals (title, verse_ref, body, video_url, created_at, published) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                title,
                request.form.get("verse_ref", "").strip() or None,
                body,
                request.form.get("video_url", "").strip() or None,
                datetime.now().isoformat(),
                1 if request.form.get("published") else 0,
            ),
        )
        db.commit()
        flash("Devotional saved.")
        return redirect(url_for("admin_devotionals"))
    return render_template("devotional_form.html", devotional=None)


@app.route("/admin/devotionals/<int:devotional_id>/edit", methods=["GET", "POST"])
@login_required
def edit_devotional(devotional_id):
    db = get_db()
    if request.method == "POST":
        db.execute(
            "UPDATE devotionals SET title=?, verse_ref=?, body=?, video_url=?, published=? "
            "WHERE id=?",
            (
                request.form.get("title", "").strip(),
                request.form.get("verse_ref", "").strip() or None,
                request.form.get("body", "").strip(),
                request.form.get("video_url", "").strip() or None,
                1 if request.form.get("published") else 0,
                devotional_id,
            ),
        )
        db.commit()
        flash("Devotional updated.")
        return redirect(url_for("admin_devotionals"))
    row = db.execute("SELECT * FROM devotionals WHERE id=?", (devotional_id,)).fetchone()
    if not row:
        abort(404)
    return render_template("devotional_form.html", devotional=row)


@app.route("/admin/devotionals/<int:devotional_id>/delete", methods=["POST"])
@login_required
def delete_devotional(devotional_id):
    db = get_db()
    db.execute("DELETE FROM devotionals WHERE id=?", (devotional_id,))
    db.commit()
    flash("Devotional deleted.")
    return redirect(url_for("admin_devotionals"))


if __name__ == "__main__":
    init_db()
    # Debug mode exposes an interactive console to anyone who can trigger an
    # error, so it is only ever enabled explicitly for local development.
    debug = os.environ.get("FLASK_DEBUG", "1") == "1" and not os.environ.get("RENDER")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=debug, host="0.0.0.0", port=port)
else:
    init_db()
