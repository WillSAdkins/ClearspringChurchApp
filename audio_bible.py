"""
Clearspring: the recorded audio Bible.

The Berean Standard Bible read by Bob Souer (and by Barry Hays), dedicated to
the public domain (CC0 1.0) by the BSB's publishers: "These audio versions of
God's Word have been dedicated to the public domain" (bereanbible.com/audio).
One MP3 per chapter, hosted by OpenBible.com, with a mirror kept by the Free
Use Bible API (audio.bible.helloao.org). File names follow
github.com/HelloAOLab/bible-api (packages/helloao-tools/generation/audio.ts).

The app does not keep 4 GB of audio itself. Phones are sent to the audio host
to play a chapter; a chapter someone saves for offline is fetched through
this server once, so the copy on the phone is same-origin and can be played
back with seeking. Set AUDIO_PROXY=on to send all listening through the
server instead (more private, but each listener then holds a server thread).
"""
import os

from bible_books import ALL_BOOKS, BOOKS_BY_SLUG

TRANSLATION = "BSB"
TRANSLATION_NAME = "Berean Standard Bible"
CREDIT = "Berean Standard Bible audio, read by Bob Souer and Barry Hays. Dedicated to the public domain (CC0) by its publishers."

# reader id: (name, OpenBible file suffix)
READERS = {
    "souer": ("Bob Souer", ""),
    "hays": ("Barry Hays", "_H"),
}
DEFAULT_READER = "souer"
ORDER = {b["slug"]: i + 1 for i, b in enumerate(ALL_BOOKS)}


def proxy_all():
    return os.environ.get("AUDIO_PROXY", "").lower() in ("1", "on", "true", "yes")


def _openbible_code(usfm):
    code = "TTS" if usfm == "TIT" else usfm
    if code[0].isdigit():
        return code[0] + code[1].upper() + code[2:].lower()
    return code[0].upper() + code[1:].lower()


def sources(reader, slug, chapter):
    """Where this chapter's MP3 lives, best first."""
    book = BOOKS_BY_SLUG[slug]
    suffix = READERS[reader][1]
    name = f"{TRANSLATION}_{ORDER[slug]:02d}_{_openbible_code(book['usfm'])}_{chapter:03d}{suffix}.mp3"
    return [
        f"https://openbible.com/audio/{reader}/{name}",
        f"https://audio.bible.helloao.org/api/{TRANSLATION}/{book['usfm']}/{chapter}/audio/{reader}.mp3",
    ]


def valid(reader, slug, chapter):
    return reader in READERS and slug in BOOKS_BY_SLUG and 1 <= chapter <= BOOKS_BY_SLUG[slug]["chapters"]


def books_for_js():
    return [[b["slug"], b["name"], b["chapters"]] for b in ALL_BOOKS]
