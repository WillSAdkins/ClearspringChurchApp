"""BibleProject book overview videos, linked (not hosted) as BibleProject's
terms for app makers ask: link or embed from their website, never edit or
re-host, never charge for access, and credit them.
(help.bibleproject.com, "I'm building an app. Can I use your content in it?")

Paths are from bibleproject.com/videos/collections/old-testament/ and
/new-testament/, checked October 2026.
"""
BASE = "https://bibleproject.com"
CREDIT = "BibleProject is the author and owner of this content."

# book slug: [(title, path, first chapter, last chapter)]
VIDEOS = {
    "genesis": [("Genesis 1–11", "/videos/genesis-1-11/", 1, 11), ("Genesis 12–50", "/videos/genesis-12-50/", 12, 50)],
    "exodus": [("Exodus 1–18", "/videos/exodus-1-18/", 1, 18), ("Exodus 19–40", "/videos/exodus-19-40/", 19, 40)],
    "leviticus": [("Leviticus", "/videos/leviticus/", 1, 27)],
    "numbers": [("Numbers", "/videos/numbers/", 1, 36)],
    "deuteronomy": [("Deuteronomy", "/videos/deuteronomy/", 1, 34)],
    "joshua": [("Joshua", "/videos/joshua/", 1, 24)],
    "judges": [("Judges", "/videos/judges/", 1, 21)],
    "ruth": [("Ruth", "/videos/ruth/", 1, 4)],
    "1-samuel": [("1 Samuel", "/videos/1-samuel/", 1, 31)],
    "2-samuel": [("2 Samuel", "/videos/2-samuel/", 1, 24)],
    "1-kings": [("1 & 2 Kings", "/videos/kings/", 1, 22)],
    "2-kings": [("1 & 2 Kings", "/videos/kings/", 1, 25)],
    "1-chronicles": [("1 & 2 Chronicles", "/videos/chronicles/", 1, 29)],
    "2-chronicles": [("1 & 2 Chronicles", "/videos/chronicles/", 1, 36)],
    "ezra": [("Ezra–Nehemiah", "/videos/ezra-nehemiah/", 1, 10)],
    "nehemiah": [("Ezra–Nehemiah", "/videos/ezra-nehemiah/", 1, 13)],
    "esther": [("Esther", "/videos/esther/", 1, 10)],
    "job": [("Job", "/videos/job/", 1, 42)],
    "psalms": [("Psalms", "/videos/psalms/", 1, 150)],
    "proverbs": [("Proverbs", "/videos/proverbs/", 1, 31)],
    "ecclesiastes": [("Ecclesiastes", "/videos/ecclesiastes/", 1, 12)],
    "song-of-solomon": [("Song of Songs", "/videos/song-songs/", 1, 8)],
    "isaiah": [("Isaiah 1–39", "/videos/isaiah-1-39/", 1, 39), ("Isaiah 40–66", "/videos/isaiah-40-66/", 40, 66)],
    "jeremiah": [("Jeremiah", "/videos/jeremiah/", 1, 52)],
    "lamentations": [("Lamentations", "/videos/lamentations/", 1, 5)],
    "ezekiel": [("Ezekiel 1–33", "/videos/ezekiel-1-33/", 1, 33), ("Ezekiel 34–48", "/videos/ezekiel-34-48/", 34, 48)],
    "daniel": [("Daniel", "/videos/daniel/", 1, 12)],
    "hosea": [("Hosea", "/videos/hosea/", 1, 14)],
    "joel": [("Joel", "/videos/joel/", 1, 3)],
    "amos": [("Amos", "/videos/amos/", 1, 9)],
    "obadiah": [("Obadiah", "/videos/obadiah/", 1, 1)],
    "jonah": [("Jonah", "/videos/jonah/", 1, 4)],
    "micah": [("Micah", "/videos/micah/", 1, 7)],
    "nahum": [("Nahum", "/videos/nahum/", 1, 3)],
    "habakkuk": [("Habakkuk", "/videos/habakkuk/", 1, 3)],
    "zephaniah": [("Zephaniah", "/videos/zephaniah/", 1, 3)],
    "haggai": [("Haggai", "/videos/haggai/", 1, 2)],
    "zechariah": [("Zechariah", "/videos/zechariah/", 1, 14)],
    "malachi": [("Malachi", "/videos/malachi/", 1, 4)],
    "matthew": [("Matthew 1–13", "/videos/matthew-1-13/", 1, 13), ("Matthew 14–28", "/videos/matthew-14-28/", 14, 28)],
    "mark": [("Mark", "/videos/mark/", 1, 16)],
    "luke": [("Luke 1–9", "/videos/luke-1-9/", 1, 9), ("Luke 10–24", "/videos/luke-10-24/", 10, 24)],
    "john": [("John 1–12", "/videos/john-1-12/", 1, 12), ("John 13–21", "/videos/john-13-21/", 13, 21)],
    "acts": [("Acts 1–12", "/videos/acts-1-12/", 1, 12), ("Acts 13–28", "/videos/acts-13-28/", 13, 28)],
    "romans": [("Romans 1–4", "/videos/romans-1-4/", 1, 4), ("Romans 5–16", "/videos/romans-5-16/", 5, 16)],
    "1-corinthians": [("1 Corinthians", "/videos/1-corinthians/", 1, 16)],
    "2-corinthians": [("2 Corinthians", "/videos/2-corinthians/", 1, 13)],
    "galatians": [("Galatians", "/videos/galatians/", 1, 6)],
    "ephesians": [("Ephesians", "/videos/ephesians/", 1, 6)],
    "philippians": [("Philippians", "/videos/philippians/", 1, 4)],
    "colossians": [("Colossians", "/videos/colossians/", 1, 4)],
    "1-thessalonians": [("1 Thessalonians", "/videos/1-thessalonians/", 1, 5)],
    "2-thessalonians": [("2 Thessalonians", "/videos/2-thessalonians/", 1, 3)],
    "1-timothy": [("1 Timothy", "/videos/1-timothy/", 1, 6)],
    "2-timothy": [("2 Timothy", "/videos/2-timothy/", 1, 4)],
    "titus": [("Titus", "/videos/titus/", 1, 3)],
    "philemon": [("Philemon", "/videos/philemon/", 1, 1)],
    "hebrews": [("Hebrews", "/videos/hebrews/", 1, 13)],
    "james": [("James", "/videos/james/", 1, 5)],
    "1-peter": [("1 Peter", "/videos/1-peter/", 1, 5)],
    "2-peter": [("2 Peter", "/videos/2-peter/", 1, 3)],
    "1-john": [("1–3 John", "/videos/1-3-john/", 1, 5)],
    "2-john": [("1–3 John", "/videos/1-3-john/", 1, 1)],
    "3-john": [("1–3 John", "/videos/1-3-john/", 1, 1)],
    "jude": [("Jude", "/videos/jude/", 1, 1)],
    "revelation": [("Revelation 1–11", "/videos/revelation-1-11/", 1, 11), ("Revelation 12–22", "/videos/revelation-12-22/", 12, 22)],
}
WHOLE = [("The Old Testament (TaNaK)", "/videos/old-testament-tanak/"), ("The New Testament", "/videos/new-testament-overview/")]


def for_book(slug):
    return [{"title": t, "url": BASE + p} for t, p, _, _ in VIDEOS.get(slug, [])]


def for_chapter(slug, chapter):
    """The overview video that covers this chapter."""
    for t, p, a, b in VIDEOS.get(slug, []):
        if a <= chapter <= b:
            return {"title": t, "url": BASE + p}
    v = VIDEOS.get(slug)
    return {"title": v[0][0], "url": BASE + v[0][1]} if v else None
