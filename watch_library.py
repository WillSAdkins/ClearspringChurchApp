"""Clearspring — the Watch library: free courses and teaching from trusted
YouTube channels, arranged the way BiblicalTraining.org arranges its classes
(by level and by subject), with each course's lessons in order and your
progress kept.

A course is either a YouTube playlist or a hand-picked list of videos. The
app never copies the videos: it plays them in YouTube's privacy-enhanced
player (youtube-nocookie.com) and links to the channel that made them.

Lessons for a playlist come from YouTube:
  * with YOUTUBE_API_KEY set (free, from Google Cloud), the whole playlist,
    with lesson lengths;
  * without it, YouTube's public feed, which lists up to 15 lessons. The
    player still plays the whole playlist, and the app learns the rest of the
    lesson titles as people watch.
A playlist YouTube says doesn't exist (taken down or made private) is hidden
until staff look at it in Admin → Watch library.

"Latest from" shelves show the newest videos from chosen channels.

Staff add, edit and hide courses and channels in Admin. The starter list
below is a suggestion for the church to review; it's added once, and
anything deleted from it stays deleted.
"""
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

import requests

LEVELS = [
    ("start", "Start here", "Short, clear introductions. No background needed."),
    ("grow", "Grow", "Go further: whole books, big themes, everyday discipleship."),
    ("deep", "Go deeper", "Seminary-style lectures for anyone who wants to dig in."),
]
LEVEL_NAMES = {k: n for k, n, _d in LEVELS}

SUBJECTS = [
    ("bible", "The Bible"),
    ("theology", "What Christians believe"),
    ("living", "Following Jesus"),
    ("prayer", "Prayer"),
    ("history", "Church history"),
    ("questions", "Big questions"),
    ("family", "Children and families"),
]
SUBJECT_NAMES = dict(SUBJECTS)

PLAYLIST_RE = re.compile(r"(?:list=)?((?:PL|UU|OL|FL)[A-Za-z0-9_-]{10,40})")
VIDEO_RE = re.compile(r"(?:v=|youtu\.be/|/embed/|/shorts/|/live/)([A-Za-z0-9_-]{11})|^([A-Za-z0-9_-]{11})$")
FEED_PLAYLIST = "https://www.youtube.com/feeds/videos.xml?playlist_id={}"
FEED_CHANNEL = "https://www.youtube.com/feeds/videos.xml?channel_id={}"
API = "https://www.googleapis.com/youtube/v3/"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "media": "http://search.yahoo.com/mrss/"}
REFRESH_EVERY = timedelta(days=3)
CHANNEL_EVERY = timedelta(hours=6)

# A starter list for the church to review. Playlists and videos found on the
# makers' own YouTube channels, October 2026.
STARTER = [
    {"slug": "how-to-read-the-bible", "title": "How to Read the Bible", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "bible", "level": "start",
     "playlist_id": "PLH0Szn1yYNedn4FbBMMtOlGN-BPLQ54IH",
     "about": "Short animated videos on what the Bible is, how it fits together, and how to read its different kinds of writing: story, poetry, prophecy, law, letters and more."},
    {"slug": "alpha-film-series", "title": "Alpha: the big questions", "teacher": "The Alpha Film Series",
     "provider": "Alpha", "provider_url": "https://alpha.org", "subject": "questions", "level": "start",
     "videos": [("hBMMD5C0k-s", "Is there more to life than this?"), ("HtTnSMNtE44", "Who is Jesus?"),
                ("lIHqYqIjKVw", "Why did Jesus die?"), ("JLMyOr2fAoE", "How can I have faith?"),
                ("waIL-WeDW4k", "Why and how should I pray?"), ("4pf6LUohTtc", "Why and how should I read the Bible?"),
                ("xqzZXND7Hdg", "How does God guide us?"), ("m3IVlooVAXs", "Who is the Holy Spirit?")],
     "about": "Episodes from the Alpha Film Series, made for people exploring the Christian faith. Good to watch with a friend. The whole series runs as a course at many churches, including ours from time to time."},
    {"slug": "practicing-the-way", "title": "Practicing the Way", "teacher": "John Mark Comer",
     "provider": "Practicing the Way", "provider_url": "https://www.practicingtheway.org", "subject": "living", "level": "start",
     "playlist_id": "PLMrf8CQTGnBwfbs10gWZrIrO4JPIzwn3P",
     "about": "An eight-session course on being with Jesus, becoming like him, and doing what he did, through a rule of life and simple practices. Made to be done with others."},
    {"slug": "bible-basics", "title": "Bible Basics", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "bible", "level": "start",
     "playlist_id": "PLH0Szn1yYNee1eTBU01ZjogtYufHnO0QE",
     "about": "Short animated videos on the big picture: what the Bible is, how its story runs from Genesis to Revelation, and the main ideas that tie it together. A good first course for anyone."},
    {"slug": "the-bible-course", "title": "The Bible Course", "teacher": "Bible Society",
     "provider": "Bible Society", "provider_url": "https://www.biblesociety.org.uk", "subject": "bible", "level": "start",
     "playlist_id": "PLvI7ekSu0XHHao0fesKcNZ4UXxsOcDUkS",
     "about": "Bible Society’s course on the whole story of the Bible and how it fits together, made for church small groups. Watch a session, then talk it over."},
    {"slug": "prayer-course", "title": "The Prayer Course", "teacher": "Pete Greig",
     "provider": "24-7 Prayer", "provider_url": "https://www.prayercourse.org", "subject": "prayer", "level": "start",
     "videos": [("eO1WIawSAkQ", "Why pray?"), ("boklkec7NLE", "Adoration"), ("qSRIuPF32jQ", "Petition"),
                ("GuU2cZ5uCfA", "Intercession"), ("QjrZ6wCS2eM", "Unanswered prayer"), ("1aHA1yj8E2g", "Listening")],
     "about": "Honest, practical and often funny sessions on prayer from the founder of 24-7 Prayer: praising, asking, praying for others, when prayers aren’t answered, and listening to God. Made to be done in groups."},
    {"slug": "biblical-themes", "title": "Biblical Themes", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "bible", "level": "grow",
     "playlist_id": "PLH0Szn1yYNec-HZjVHooeb4BSDSeHhEoh",
     "about": "Follow one big idea right through the Bible: the image of God, the temple, sacrifice, justice, the Messiah, holiness and many more. Each video traces a theme from Genesis to Revelation."},
    {"slug": "wisdom-series", "title": "The Wisdom Books", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "bible", "level": "grow",
     "playlist_id": "PLH0Szn1yYNeeKPNIy7YXjO3MGD8h8ifhr",
     "about": "Proverbs, Ecclesiastes and Job: three very different books on how to live wisely, and what to do when life doesn’t make sense."},
    {"slug": "spiritual-beings", "title": "Spiritual Beings", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "theology", "level": "grow",
     "playlist_id": "PLH0Szn1yYNeef2AIszbltRK15dgoxA_57",
     "about": "What the Bible actually says about angels, cherubim, the Satan, demons and the angel of the Lord, without the myths that have grown up around them."},
    {"slug": "visual-commentaries", "title": "Visual Commentaries", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "bible", "level": "grow",
     "playlist_id": "PLH0Szn1yYNecMAddeR4wylgGhF1rjJqzH",
     "about": "Slow, close readings of single passages, with the text on screen and illustrations drawn as it’s explained. Great for learning how to read a passage carefully."},
    {"slug": "advent-word-studies", "title": "Advent Words", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "bible", "level": "start",
     "playlist_id": "PLH0Szn1yYNecujwVOMet2ywprWUbFcAQb",
     "about": "Hope, peace, joy and love: four short word studies on what these words mean in the Bible. Made for the weeks before Christmas, good at any time."},
    {"slug": "reason-for-god", "title": "The Reason for God", "teacher": "Tim Keller",
     "provider": "Gospel in Life", "provider_url": "https://gospelinlife.com", "subject": "questions", "level": "grow",
     "playlist_id": "PLZ7JZq0A3fr26xNPCdmO9p3puhSXGn2ua",
     "about": "Keller in conversation with a group of sceptics and seekers about the biggest objections to faith: suffering, exclusivity, the church’s failures, science and the Bible."},
    {"slug": "science-and-god", "title": "Has Science Buried God?", "teacher": "John Lennox",
     "provider": "John Lennox", "provider_url": "https://www.johnlennox.org", "subject": "questions", "level": "deep",
     "videos": [("wBio3y0Rrbc", "Has science buried God?"), ("g5r4l55MUe0", "Why science buries atheism, not God"),
                ("2NM1VT5dOoM", "The question of science and God")],
     "about": "An Oxford mathematician on whether science and faith are really at war. Clear, warm and good-humoured; ideal for students and anyone who has been told science has disproved God."},
    {"slug": "superbook", "title": "Superbook", "teacher": "Superbook",
     "provider": "CBN", "provider_url": "https://us-en.superbook.cbn.com", "subject": "family", "level": "start",
     "playlist_id": "PL0zvCDP_0LjCpNejEZmCRhf5sG8heMtS2",
     "about": "Animated adventures that take two children and their robot back into Bible stories. Full episodes for primary-school children; watch together and talk about what happened."},
    {"slug": "whats-in-the-bible-law", "title": "What’s in the Bible? The Books of the Law", "teacher": "Phil Vischer",
     "provider": "What’s in the Bible?", "provider_url": "https://whatsinthebible.com", "subject": "family", "level": "start",
     "playlist_id": "PLBA6F54351F7741CA",
     "about": "From the creator of VeggieTales: puppets, songs and jokes that explain Leviticus, Numbers and Deuteronomy to children (and their parents) without losing the meaning."},
    {"slug": "luke-acts", "title": "Luke and Acts", "teacher": "Tim Mackie and Jon Collins",
     "provider": "BibleProject", "provider_url": "https://bibleproject.com", "subject": "bible", "level": "grow",
     "playlist_id": "PLH0Szn1yYNec6O3ZOZzAMb2WW2abJwzZ-",
     "about": "A walk through Luke's two-part story of Jesus and the early church, section by section."},
    {"slug": "gospel-in-life", "title": "Gospel in Life", "teacher": "Tim Keller",
     "provider": "Gospel in Life", "provider_url": "https://gospelinlife.com", "subject": "living", "level": "grow",
     "playlist_id": "PLA28531D08A46AC12",
     "about": "How the good news of Jesus changes the heart, community, work and the world. A small-group study."},
    {"slug": "gospel-in-every-book", "title": "Discovering the Gospel in Every Book of the Bible", "teacher": "Tim Keller",
     "provider": "Gospel in Life", "provider_url": "https://gospelinlife.com", "subject": "bible", "level": "grow",
     "playlist_id": "PLqdAeLCMehGE0vhoqCwEtS6BBqg4UJydk",
     "about": "Short talks showing how each book of the Bible points to Jesus."},
    {"slug": "foundations-theology", "title": "Foundations: An Overview of Systematic Theology", "teacher": "R.C. Sproul",
     "provider": "Ligonier Ministries", "provider_url": "https://www.ligonier.org", "subject": "theology", "level": "deep",
     "playlist_id": "PLGLxdyvM_M7QKs18Svsy2q83IFd-9rmlH",
     "about": "Sixty short lectures covering the whole of Christian belief: Scripture, God, creation, Christ, the Spirit, salvation, the church and the last things."},
    {"slug": "doctrine-of-god", "title": "Defenders: The Doctrine of God", "teacher": "William Lane Craig",
     "provider": "Reasonable Faith", "provider_url": "https://www.reasonablefaith.org", "subject": "questions", "level": "deep",
     "playlist_id": "PLIpO3BUiq2IFdX50i-DIb6-posLJL7NEz",
     "about": "A philosopher's class on what Christians believe about God, and why it holds together. Thoughtful and careful; best for people who like to think things through."},
    {"slug": "church-history", "title": "A Survey of Church History: selected lessons", "teacher": "W. Robert Godfrey",
     "provider": "Ligonier Ministries", "provider_url": "https://www.ligonier.org", "subject": "history", "level": "deep",
     "videos": [("X4q0yXvumrM", "Defending the faith"), ("LwiA5tt_vxQ", "Augustine"),
                ("uHNakB1qgr0", "Popes and councils"), ("eQZovBpbmIM", "Mysticism and the Renaissance"),
                ("kKF2XhwDnqE", "Political revolutions"), ("nCvcPVqeQJ0", "Jonathan Edwards"),
                ("PWsFrFDhv1g", "The rise of cults in America"), ("Lk3D650QNc0", "Pentecostalism")],
     "about": "Lessons from a much longer course on two thousand years of the church: its people, arguments and turning points."},
    {"slug": "bible-stories-kids", "title": "Bible stories for children", "teacher": "Saddleback Kids",
     "provider": "Saddleback Kids", "provider_url": "https://www.youtube.com/@SaddlebackKids", "subject": "family", "level": "start",
     "videos": [("l7TDvJrjjz0", "Adam and Eve"), ("WOSadLyqshg", "Jonah and the fish"),
                ("f7cCV-IELLY", "The fiery furnace"), ("Z8HBbOIXLD8", "Jesus and the woman at the well")],
     "about": "Short, bright retellings for young children. Watch together and talk about them afterwards."},
]
# The courses in the first version of the starter list (October 2026).
OLD_STARTER = ["how-to-read-the-bible", "alpha-film-series", "practicing-the-way", "luke-acts", "gospel-in-life",
               "gospel-in-every-book", "foundations-theology", "doctrine-of-god", "church-history", "bible-stories-kids"]

STARTER_CHANNELS = [
    ("UCVfwlh9XpX2Y_tQfjeln9QA", "BibleProject"),
    ("UCQmUmqrMGfnesNpdL7T282Q", "Gospel in Life (Tim Keller)"),
]


# ---------------------------------------------------------------- tables

def ensure_tables(db):
    db.execute("""CREATE TABLE IF NOT EXISTS watch_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        teacher TEXT,
        provider TEXT,
        provider_url TEXT,
        subject TEXT NOT NULL DEFAULT 'bible',
        level TEXT NOT NULL DEFAULT 'start',
        about TEXT,
        playlist_id TEXT,
        status TEXT NOT NULL DEFAULT 'live',
        problem TEXT,
        featured INTEGER NOT NULL DEFAULT 0,
        sort INTEGER NOT NULL DEFAULT 0,
        lessons_total INTEGER,
        fetched_at TEXT,
        created_at TEXT NOT NULL)""")
    db.execute("""CREATE TABLE IF NOT EXISTS watch_lessons (
        course_id INTEGER NOT NULL,
        n INTEGER NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT,
        seconds INTEGER,
        PRIMARY KEY (course_id, n))""")
    db.execute("""CREATE TABLE IF NOT EXISTS watch_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        sort INTEGER NOT NULL DEFAULT 0,
        videos TEXT,
        fetched_at TEXT,
        problem TEXT)""")


def seed(db, get_setting, set_setting):
    """Add starter courses that haven't been offered before. Each is offered
    once: one staff delete stays deleted. A hand-picked video course that
    hasn't been edited gets new lessons added when the starter list grows."""
    import json as _json
    try:
        offered = set(_json.loads(get_setting("watch_seeded_slugs", "") or "[]"))
    except ValueError:
        offered = set()
    if get_setting("watch_library_seeded", "") and not offered:
        offered = set(OLD_STARTER)          # installs from before this list existed
    changed = False
    top = db.execute("SELECT COALESCE(MAX(sort), 0) FROM watch_courses").fetchone()[0] or 0
    for i, c in enumerate(STARTER):
        row = db.execute("SELECT id FROM watch_courses WHERE slug=?", (c["slug"],)).fetchone()
        if row and c.get("videos"):
            have = [r[0] for r in db.execute("SELECT video_id FROM watch_lessons WHERE course_id=? ORDER BY n", (row[0],))]
            want = [v for v, _t in c["videos"]]
            if have and len(have) < len(want) and want[:len(have)] == have:
                set_videos(db, row[0], c["videos"])
                changed = True
        if c["slug"] in offered or row:
            offered.add(c["slug"])
            continue
        fresh = not get_setting("watch_library_seeded", "")
        cid = db.execute(
            """INSERT INTO watch_courses (slug, title, teacher, provider, provider_url, subject, level, about,
                                          playlist_id, featured, sort, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (c["slug"], c["title"], c.get("teacher"), c.get("provider"), c.get("provider_url"), c["subject"],
             c["level"], c.get("about"), c.get("playlist_id"), 1 if (fresh and i < 4) else 0,
             i * 10 if fresh else top + 10 * (i + 1), datetime.now().isoformat())).lastrowid
        if c.get("videos"):
            set_videos(db, cid, c["videos"])
        offered.add(c["slug"])
        changed = True
    if not get_setting("watch_library_seeded", ""):
        for i, (chid, name) in enumerate(STARTER_CHANNELS):
            db.execute("INSERT OR IGNORE INTO watch_channels (channel_id, name, sort) VALUES (?,?,?)", (chid, name, i * 10))
        set_setting("watch_library_seeded", datetime.now().isoformat())
        changed = True
    set_setting("watch_seeded_slugs", _json.dumps(sorted(offered)))
    if changed:
        db.commit()


# ---------------------------------------------------------------- parsing what staff paste

def playlist_from(text):
    m = PLAYLIST_RE.search(text or "")
    return m.group(1) if m else None


def videos_from(text):
    """Video IDs (and optional titles) from pasted lines: one video per line,
    a link or ID, optionally followed by '|' and a title."""
    out = []
    for line in (text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        link, _, title = line.partition("|")
        link = link.strip()
        m = VIDEO_RE.search(link)
        if not m:
            continue
        vid = m.group(1) or m.group(2)
        if vid and vid not in [v for v, _t in out]:
            out.append((vid, title.strip()[:200]))
    return out[:200]


def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s[:60] or "course"


def set_videos(db, course_id, videos):
    db.execute("DELETE FROM watch_lessons WHERE course_id=?", (course_id,))
    for n, (vid, title) in enumerate(videos, 1):
        db.execute("INSERT INTO watch_lessons (course_id, n, video_id, title) VALUES (?,?,?,?)",
                   (course_id, n, vid, title or None))
    db.execute("UPDATE watch_courses SET lessons_total=?, fetched_at=? WHERE id=?",
               (len(videos), datetime.now().isoformat(), course_id))


# ---------------------------------------------------------------- reading

def courses(db, include_hidden=False):
    rows = db.execute(
        "SELECT c.*, (SELECT COUNT(*) FROM watch_lessons l WHERE l.course_id=c.id) AS known, "
        "(SELECT video_id FROM watch_lessons l WHERE l.course_id=c.id ORDER BY n LIMIT 1) AS first_video, "
        "(SELECT SUM(seconds) FROM watch_lessons l WHERE l.course_id=c.id) AS seconds "
        "FROM watch_courses c " + ("" if include_hidden else "WHERE c.status='live' ") +
        "ORDER BY c.sort, c.title").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["lessons"] = max(d.get("lessons_total") or 0, d["known"] or 0)
        d["level_name"] = LEVEL_NAMES.get(d["level"], d["level"])
        d["subject_name"] = SUBJECT_NAMES.get(d["subject"], d["subject"])
        d["thumb"] = f"https://i.ytimg.com/vi/{d['first_video']}/hqdefault.jpg" if d["first_video"] else None
        if not include_hidden and not d["lessons"] and not d["playlist_id"]:
            continue
        out.append(d)
    return out


def course(db, slug):
    r = db.execute("SELECT * FROM watch_courses WHERE slug=?", (slug,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["lesson_list"] = [dict(x) for x in db.execute(
        "SELECT n, video_id, title, seconds FROM watch_lessons WHERE course_id=? ORDER BY n", (d["id"],)).fetchall()]
    d["lessons"] = max(d.get("lessons_total") or 0, len(d["lesson_list"]))
    d["level_name"] = LEVEL_NAMES.get(d["level"], d["level"])
    d["subject_name"] = SUBJECT_NAMES.get(d["subject"], d["subject"])
    d["seconds"] = sum(x["seconds"] or 0 for x in d["lesson_list"])
    return d


def channels(db, include_hidden=False):
    rows = db.execute("SELECT * FROM watch_channels " + ("" if include_hidden else "WHERE active=1 ") +
                      "ORDER BY sort, name").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        try:
            d["video_list"] = json.loads(d["videos"] or "[]")
        except ValueError:
            d["video_list"] = []
        out.append(d)
    return out


# ---------------------------------------------------------------- fetching from YouTube

def _get(url, params=None):
    return requests.get(url, params=params, timeout=12, headers={"User-Agent": "ClearspringChurchApp/1.0"})


def _parse_entries(xml_text):
    root = ET.fromstring(xml_text)
    out = []
    for e in root.findall("a:entry", NS):
        vid = (e.findtext("yt:videoId", "", NS) or "").strip()
        if not vid:
            continue
        link = e.find("a:link", NS)
        out.append({"video_id": vid, "title": (e.findtext("a:title", "", NS) or "").strip(),
                    "published": (e.findtext("a:published", "", NS) or "")[:10],
                    "short": "/shorts/" in (link.get("href", "") if link is not None else "")})
    return out


def _iso_seconds(d):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d or "")
    if not m:
        return None
    dd, h, mi, s = (int(x or 0) for x in m.groups())
    return dd * 86400 + h * 3600 + mi * 60 + s


def fetch_playlist(playlist_id, api_key=None, get=None):
    """[(video_id, title, seconds)] in playlist order, and the total.
    Raises LookupError if YouTube says the playlist doesn't exist."""
    get = get or _get
    if api_key:
        items, token = [], None
        for _ in range(10):        # up to 500 lessons
            params = {"part": "snippet,contentDetails", "playlistId": playlist_id, "maxResults": 50, "key": api_key}
            if token:
                params["pageToken"] = token
            r = get(API + "playlistItems", params)
            if r.status_code == 404:
                raise LookupError("YouTube says this playlist doesn't exist (or it's private).")
            r.raise_for_status()
            data = r.json()
            for it in data.get("items", []):
                sn = it.get("snippet") or {}
                vid = (it.get("contentDetails") or {}).get("videoId") or (sn.get("resourceId") or {}).get("videoId")
                if vid and sn.get("title") not in ("Private video", "Deleted video"):
                    items.append([vid, sn.get("title") or "", None])
            token = data.get("nextPageToken")
            if not token:
                break
        for i in range(0, len(items), 50):
            ids = ",".join(x[0] for x in items[i:i + 50])
            r = get(API + "videos", {"part": "contentDetails", "id": ids, "key": api_key})
            if r.ok:
                lengths = {v["id"]: _iso_seconds((v.get("contentDetails") or {}).get("duration")) for v in r.json().get("items", [])}
                for x in items[i:i + 50]:
                    x[2] = lengths.get(x[0])
        return [tuple(x) for x in items], len(items)
    r = get(FEED_PLAYLIST.format(playlist_id))
    if r.status_code in (400, 404):
        raise LookupError("YouTube says this playlist doesn't exist (or it's private).")
    r.raise_for_status()
    entries = _parse_entries(r.text)
    return [(e["video_id"], e["title"], None) for e in entries], None


def refresh_course(db, row, api_key=None, get=None):
    try:
        lessons, total = fetch_playlist(row["playlist_id"], api_key, get)
    except LookupError as e:
        db.execute("UPDATE watch_courses SET status='broken', problem=?, fetched_at=? WHERE id=?",
                   (str(e), datetime.now().isoformat(), row["id"]))
        return False
    except Exception as e:      # network trouble: try again next time
        db.execute("UPDATE watch_courses SET problem=? WHERE id=?", (f"Couldn't reach YouTube: {type(e).__name__}", row["id"]))
        return False
    if not lessons:
        db.execute("UPDATE watch_courses SET problem=?, fetched_at=? WHERE id=?",
                   ("YouTube listed no videos in this playlist.", datetime.now().isoformat(), row["id"]))
        return False
    if total:      # a full list from the API: replace
        db.execute("DELETE FROM watch_lessons WHERE course_id=?", (row["id"],))
    for n, (vid, title, secs) in enumerate(lessons, 1):
        db.execute("INSERT OR REPLACE INTO watch_lessons (course_id, n, video_id, title, seconds) VALUES (?,?,?,?,?)",
                   (row["id"], n, vid, title, secs))
    status = "live" if row["status"] == "broken" else row["status"]
    db.execute("UPDATE watch_courses SET status=?, problem=NULL, fetched_at=?, "
               "lessons_total=CASE WHEN ? IS NOT NULL THEN ? ELSE MAX(COALESCE(lessons_total,0), ?) END WHERE id=?",
               (status, datetime.now().isoformat(), total, total, len(lessons), row["id"]))
    return True


def refresh_channel(db, row, get=None):
    get = get or _get
    try:
        r = get(FEED_CHANNEL.format(row["channel_id"]))
        if r.status_code in (400, 404):
            db.execute("UPDATE watch_channels SET problem=?, fetched_at=? WHERE id=?",
                       ("YouTube says this channel doesn't exist.", datetime.now().isoformat(), row["id"]))
            return False
        r.raise_for_status()
        vids = [e for e in _parse_entries(r.text) if not e["short"] and "#shorts" not in e["title"].lower()][:12]
    except Exception as e:
        db.execute("UPDATE watch_channels SET problem=? WHERE id=?", (f"Couldn't reach YouTube: {type(e).__name__}", row["id"]))
        return False
    db.execute("UPDATE watch_channels SET videos=?, fetched_at=?, problem=NULL WHERE id=?",
               (json.dumps([{"id": v["video_id"], "title": v["title"], "date": v["published"]} for v in vids]),
                datetime.now().isoformat(), row["id"]))
    return True


def refresh_due(db, api_key=None, get=None, force=False):
    """Refresh courses and channels whose lists are old. Returns counts."""
    now = datetime.now()
    done = {"courses": 0, "channels": 0}
    for row in db.execute("SELECT * FROM watch_courses WHERE playlist_id IS NOT NULL AND status != 'hidden'").fetchall():
        if not force and row["fetched_at"] and now - datetime.fromisoformat(row["fetched_at"]) < REFRESH_EVERY:
            continue
        if refresh_course(db, row, api_key, get):
            done["courses"] += 1
        db.commit()
    for row in db.execute("SELECT * FROM watch_channels WHERE active=1").fetchall():
        if not force and row["fetched_at"] and now - datetime.fromisoformat(row["fetched_at"]) < CHANNEL_EVERY:
            continue
        if refresh_channel(db, row, get):
            done["channels"] += 1
        db.commit()
    return done


def fmt_length(seconds):
    if not seconds:
        return ""
    h, m = divmod(int(seconds) // 60, 60)
    return f"{h} hr {m} min" if h else f"{max(1, m)} min"
