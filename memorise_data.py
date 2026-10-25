"""
Scripture memorisation — the starter path and reference parsing.

Progress (XP, streaks, which verses are learned and when they're next due)
lives on the person's phone in localStorage, the same way reading position
does, so it works without an account. The server only supplies verse text.
"""

import re

from bible_books import BOOKS_BY_SLUG

# Five short units of well-known verses, easiest-to-hold first in each.
STARTER_PATH = [
    {"title": "The good news", "verses": [
        "john.3.16", "romans.3.23", "romans.6.23", "romans.5.8", "ephesians.2.8-9"]},
    {"title": "Trusting God", "verses": [
        "psalms.46.1", "joshua.1.9", "isaiah.41.10", "proverbs.3.5-6", "philippians.4.6-7"]},
    {"title": "Following Jesus", "verses": [
        "john.14.6", "matthew.6.33", "matthew.11.28", "2-corinthians.5.17", "galatians.2.20"]},
    {"title": "God's word and hope", "verses": [
        "psalms.119.105", "romans.8.28", "jeremiah.29.11", "2-timothy.3.16", "hebrews.4.12"]},
    {"title": "Living it out", "verses": [
        "psalms.23.1", "micah.6.8", "colossians.3.23", "1-john.1.9", "galatians.5.22-23"]},
]

_KEY = re.compile(r"^([a-z0-9-]+)\.(\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$")


def parse_key(key):
    """'proverbs.3.5-6' → ('proverbs', 3, 5, 6), or None if it isn't valid."""
    m = _KEY.match(key or "")
    if not m:
        return None
    slug, ch, v1 = m.group(1), int(m.group(2)), int(m.group(3))
    v2 = int(m.group(4)) if m.group(4) else v1
    book = BOOKS_BY_SLUG.get(slug)
    if not book or not 1 <= ch <= book["chapters"] or v1 < 1 or v2 < v1 or v2 - v1 > 5:
        return None
    return slug, ch, v1, v2


def label(key):
    p = parse_key(key)
    if not p:
        return key
    slug, ch, v1, v2 = p
    name = BOOKS_BY_SLUG[slug]["name"]
    return f"{name} {ch}:{v1}" + (f"-{v2}" if v2 != v1 else "")


def path_for_template():
    return [{"title": u["title"],
             "verses": [{"key": k, "label": label(k)} for k in u["verses"]]}
            for u in STARTER_PATH]


# Themed collections — open from the start, learned in any order.
COLLECTIONS = [
    {"title": "When you’re anxious", "emoji": "🕊️", "verses": [
        "matthew.6.34", "1-peter.5.7", "john.14.27", "isaiah.26.3", "psalms.56.3", "psalms.94.19"]},
    {"title": "Courage", "emoji": "🦁", "verses": [
        "deuteronomy.31.6", "psalms.27.1", "2-timothy.1.7", "isaiah.40.31", "psalms.118.6", "romans.8.31"]},
    {"title": "Forgiveness and grace", "emoji": "🌅", "verses": [
        "psalms.103.12", "isaiah.1.18", "lamentations.3.22-23", "ephesians.4.32", "colossians.3.13", "2-corinthians.12.9"]},
    {"title": "Prayer", "emoji": "🙏", "verses": [
        "matthew.6.9-13", "matthew.7.7", "jeremiah.33.3", "psalms.145.18", "1-thessalonians.5.16-18", "james.5.16"]},
    {"title": "Who Jesus is", "emoji": "✝️", "verses": [
        "john.1.1", "john.8.12", "john.11.25", "colossians.1.15", "hebrews.13.8", "philippians.2.9-11"]},
    {"title": "Love", "emoji": "❤️", "verses": [
        "1-corinthians.13.4-7", "john.13.34-35", "john.15.13", "1-john.4.10", "1-john.4.19", "romans.8.38-39"]},
    {"title": "Psalm 23", "emoji": "🐑", "verses": [
        "psalms.23.1-3", "psalms.23.4", "psalms.23.5-6"]},
    {"title": "Christmas", "emoji": "⭐", "verses": [
        "isaiah.9.6", "micah.5.2", "matthew.1.23", "luke.2.10-11", "john.1.14", "galatians.4.4-5"]},
    {"title": "Easter", "emoji": "🌿", "verses": [
        "isaiah.53.5", "1-peter.2.24", "romans.4.25", "luke.24.6", "1-corinthians.15.3-4", "john.20.29"]},
]


def collections_for_template():
    return [{"title": c["title"], "emoji": c["emoji"],
             "verses": [{"key": k, "label": label(k)} for k in c["verses"]]} for c in COLLECTIONS]
