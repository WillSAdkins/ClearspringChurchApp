"""Bring new talks in from the church's YouTube channel automatically.

YouTube publishes a small public feed for every channel (the latest 15
videos), with no API key, account or cost. This reads it, and adds any video
the app hasn't seen before as a sermon: title, date, video, and the Bible
passage if one is mentioned. An admin can then add notes, the speaker or
group questions as usual.

Rules that keep it from making a mess:
  * Each video is only ever imported once. If an admin deletes an imported
    talk, it doesn't come back.
  * A talk already typed in by hand for the same date, with no video yet,
    gets the video attached instead of a duplicate being made.
  * Shorts are skipped, and so is a live stream that hasn't happened yet
    (it has no views), until it has.
"""

import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

import requests

import refs

DEFAULT_CHANNEL_ID = "UCeFM-N0CVPTBIFe_Bx45ptw"   # youtube.com/@clearspringchurch
FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={}"
NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}
SEEN_KEY = "youtube_seen"
_CHANNEL_RE = re.compile(r"(UC[A-Za-z0-9_-]{22})")

# Bits of a video title that are about the channel, not the talk.
_NOISE = re.compile(
    r"\s*(?:[|\-–—:]\s*)?(?:clearspring(?:\s+church)?(?:\s+cheltenham)?|live\s*stream|livestream|"
    r"sunday\s+(?:morning\s+)?(?:service|worship|gathering)|full\s+service)\s*$",
    re.I)
_DATE_ONLY = re.compile(
    r"(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|(?:\w+day\s+)?\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\.?(?:\s+\d{4})?)", re.I)
_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def channel_id_from(text, fetch=None):
    """A channel ID from whatever an admin pastes: the ID itself, a
    /channel/ link, or an @handle link (looked up on YouTube)."""
    text = (text or "").strip()
    m = _CHANNEL_RE.search(text)
    if m:
        return m.group(1)
    handle = re.search(r"@([A-Za-z0-9._-]+)", text)
    if not handle:
        return None
    try:
        html = (fetch or _get)(f"https://www.youtube.com/@{handle.group(1)}")
    except Exception:
        return None
    for pat in (r'"externalId":"(UC[A-Za-z0-9_-]{22})"', r'channel_id=(UC[A-Za-z0-9_-]{22})',
                r'/channel/(UC[A-Za-z0-9_-]{22})'):
        m = re.search(pat, html or "")
        if m:
            return m.group(1)
    return None


def _get(url):
    r = requests.get(url, timeout=10, headers={"User-Agent": "ClearspringChurchApp/1.0"})
    r.raise_for_status()
    return r.text


def parse_feed(xml_text):
    """The videos in a channel feed, newest first."""
    root = ET.fromstring(xml_text)
    out = []
    for e in root.findall("a:entry", NS):
        vid = (e.findtext("yt:videoId", "", NS) or "").strip()
        if not vid:
            continue
        link = e.find("a:link", NS)
        href = link.get("href", "") if link is not None else ""
        group = e.find("media:group", NS)
        desc = group.findtext("media:description", "", NS) if group is not None else ""
        views = None
        stats = group.find("media:community/media:statistics", NS) if group is not None else None
        if stats is not None and stats.get("views") is not None:
            try:
                views = int(stats.get("views"))
            except ValueError:
                views = None
        try:
            published = datetime.fromisoformat((e.findtext("a:published", "", NS) or "").replace("Z", "+00:00"))
        except ValueError:
            continue
        out.append({
            "video_id": vid,
            "title": (e.findtext("a:title", "", NS) or "").strip(),
            "published": published,
            "description": (desc or "").strip(),
            "is_short": "/shorts/" in href,
            "views": views,
            "url": f"https://www.youtube.com/watch?v={vid}",
        })
    return out


def _date_in_title(title, near):
    """A date written in the title ("12/10/25", "12.10.2025", "12th October"),
    if there is one, so a talk uploaded a day late still gets the right date."""
    m = re.search(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b", title)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        y += 2000 if y < 100 else 0
        try:
            return datetime(y, mo, d).date()
        except ValueError:
            pass
    m = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s+(\d{4}))?",
                  title, re.I)
    if m:
        d, mo = int(m.group(1)), _MONTHS[m.group(2).lower()[:3]]
        y = int(m.group(3)) if m.group(3) else near.year
        try:
            got = datetime(y, mo, d).date()
            if not m.group(3) and got > near + timedelta(days=7):
                got = got.replace(year=y - 1)
            return got
        except ValueError:
            pass
    return None


def talk_date(entry, mode="youtube"):
    """The date to file a talk under (UK time).

    mode "youtube": the day YouTube says it went up (or went live).
    mode "sunday": the Sunday just before, for churches that upload on
    Monday or Tuesday. A date written in the title always wins."""
    try:
        from zoneinfo import ZoneInfo
        local = entry["published"].astimezone(ZoneInfo("Europe/London"))
    except Exception:
        local = entry["published"]
    day = local.date()
    in_title = _date_in_title(entry["title"], day)
    if in_title:
        return in_title
    if mode == "sunday":
        return day - timedelta(days=(day.weekday() + 1) % 7)
    return day


def tidy_title(title):
    """'Grace that finds us | Romans 5 | Clearspring Church' → parts."""
    cleaned = []
    for p in re.split(r"\s+[|•]\s+|\s+[-–—]\s+", title):
        p = p.strip()
        while True:  # "Clearspring Church Live Stream" has two bits of noise
            q = _NOISE.sub("", p).strip(" |-–—:")
            if q == p:
                break
            p = q
        if p and not _DATE_ONLY.fullmatch(p):
            cleaned.append(p)
    return cleaned


def to_sermon(entry, speakers=(), mode="youtube"):
    """Fields for a new sermon from a feed entry."""
    parts = tidy_title(entry["title"])
    passage = None
    speaker = None
    rest = []
    known = {s.lower(): s for s in speakers if s}
    for p in parts:
        ref = refs.parse(p)
        if ref and passage is None and len(p) <= len(ref["label"]) + 12:
            passage = ref["label"]
            continue
        if speaker is None and p.lower() in known:
            speaker = known[p.lower()]
            continue
        if speaker is None and p.lower().startswith(("with ", "by ")) and p[3:].strip().lower() in known:
            speaker = known[p[3:].strip().lower()]
            continue
        rest.append(p)
    when = talk_date(entry, mode)
    if rest:
        title = rest[0]
    elif passage:
        title = passage
    else:
        title = "Sunday service" if when.weekday() == 6 else (entry["title"].strip() or "Talk")
    series = "Bible College" if re.search(r"bible\s+college", entry["title"], re.I) else None
    if passage is None:
        ref = refs.parse(entry["title"]) or refs.parse(entry["description"][:400])
        if ref:
            passage = ref["label"]
    if speaker is None:
        for low, name in known.items():
            if low and re.search(r"\b" + re.escape(low) + r"\b", (entry["title"] + " " + entry["description"][:300]).lower()):
                speaker = name
                break
    summary = entry["description"].split("\n\n")[0].strip()[:600] or None
    if summary and ("http" in summary or len(summary) < 20):
        summary = None
    return {
        "title": title[:200],
        "speaker": speaker,
        "passage": passage,
        "summary": summary,
        "series": series,
        "preached_on": when.isoformat(),
        "video_url": entry["url"],
    }


def run(db, get_setting, set_setting, fetch=None, now=None):
    """Check the channel and import anything new. Returns a short report."""
    channel = get_setting("youtube_channel_id", DEFAULT_CHANNEL_ID) or ""
    if not channel or get_setting("youtube_import", "on") == "off":
        return {"ok": True, "added": 0, "linked": 0, "note": "Importing from YouTube is switched off."}
    set_setting("youtube_last_try", (now or datetime.now()).isoformat(timespec="seconds"))
    db.commit()
    try:
        entries = parse_feed((fetch or _get)(FEED_URL.format(channel)))
    except Exception as e:  # network, YouTube down, bad feed
        set_setting("youtube_last_error", f"{datetime.now():%d %b %H:%M}: {type(e).__name__}")
        db.commit()
        return {"ok": False, "added": 0, "linked": 0, "note": "Couldn't reach YouTube just now. It will try again later."}

    try:
        seen = set(json.loads(get_setting(SEEN_KEY, "[]") or "[]"))
    except ValueError:
        seen = set()
    first_run = not seen
    publish = 1 if get_setting("youtube_publish", "1") != "0" else 0
    mode = get_setting("youtube_date_mode", "youtube") or "youtube"
    speakers = [r[0] for r in db.execute("SELECT DISTINCT speaker FROM sermons WHERE speaker IS NOT NULL AND speaker != ''")]
    added = linked = 0

    for e in reversed(entries):  # oldest first, so ids grow with dates
        vid = e["video_id"]
        if vid in seen:
            continue
        if e["is_short"]:
            seen.add(vid)
            continue
        if e["views"] == 0:
            continue  # an upcoming live stream: look again next time
        if db.execute("SELECT 1 FROM sermons WHERE video_url LIKE ?", (f"%{vid}%",)).fetchone():
            seen.add(vid)
            continue
        s = to_sermon(e, speakers, mode)
        # A talk typed in by hand for that date with no video: attach it.
        row = db.execute(
            "SELECT id FROM sermons WHERE preached_on=? AND (video_url IS NULL OR video_url='') ORDER BY id LIMIT 1",
            (s["preached_on"],)).fetchone()
        if row:
            db.execute("UPDATE sermons SET video_url=? WHERE id=?", (s["video_url"], row[0]))
            linked += 1
        else:
            db.execute(
                "INSERT INTO sermons (title, speaker, series, passage, summary, preached_on, video_url, published) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (s["title"], s["speaker"], s["series"], s["passage"], s["summary"], s["preached_on"], s["video_url"], publish))
            added += 1
        seen.add(vid)

    set_setting(SEEN_KEY, json.dumps(sorted(seen)[-1000:]))
    set_setting("youtube_last_check", (now or datetime.now()).isoformat(timespec="seconds"))
    set_setting("youtube_last_error", "")
    db.commit()
    note = f"Added {added} new talk{'s' if added != 1 else ''}"
    if linked:
        note += f" and attached {linked} video{'s' if linked != 1 else ''} to talks already entered"
    note += "." if added or linked else ""
    if not added and not linked:
        note = "Up to date. No new videos." if not first_run else "Checked, but there were no videos to bring in."
    return {"ok": True, "added": added, "linked": linked, "note": note}
