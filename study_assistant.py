"""Bible study assistant.

Design principle, set by the church: this must NOT teach with authority. It
surveys how different Christian traditions and teachers have understood a
passage, and points people to their pastor for what Clearspring itself holds.

Provider is Google Gemini, which has a free tier. The key lives in the
environment; without it the feature is simply switched off.
"""

import json
import os
import re
import urllib.error
import urllib.request

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

# Google retires Gemini models faster than their own published shutdown dates,
# and a retired model returns 404 rather than anything obviously fatal — so the
# feature just quietly stops working. Rather than hardcode one name, try a list
# in order and remember the first that answers. Setting GEMINI_MODEL overrides
# the lot.
_MODEL_OVERRIDE = os.environ.get("GEMINI_MODEL", "").strip()
MODEL_CANDIDATES = [
    "gemini-3.5-flash",       # current stable flash tier (from May 2026)
    "gemini-3.1-flash-lite",  # cheaper sibling, free tier
    "gemini-flash-latest",    # rolling alias, whatever flash is current
    "gemini-2.5-flash",       # previous generation, retired for new keys
]

# Which model actually worked. Populated on first success so we don't retry
# dead models on every question.
_working_model = None


def current_model():
    """The model in use, for display on the admin status page."""
    if _MODEL_OVERRIDE:
        return _MODEL_OVERRIDE
    return _working_model or MODEL_CANDIDATES[0]


# Kept as a module-level name because other code and the check script read it.
GEMINI_MODEL = _MODEL_OVERRIDE or MODEL_CANDIDATES[0]
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent"
)

# How much of the conversation to carry forward. Enough for a real thread of
# follow-ups, capped so a long session can't balloon the request.
MAX_HISTORY_TURNS = 10
MAX_TURN_CHARS = 2000

# Questions that need a person, not a machine. These are handled before any
# API call is made, so nothing sensitive leaves the building.
PASTORAL_PATTERNS = [
    r"\bkill (?:myself|me)\b", r"\bsuicid\w*", r"\bend (?:my|it all)\b",
    r"\bself[- ]?harm\w*", r"\bwant to die\b",
    r"\babus\w*", r"\brape\w*", r"\bassault\w*",
    r"\bmy (?:marriage|husband|wife) is\b.{0,30}\b(?:over|failing|ending)\b",
    r"\bshould i (?:leave|divorce|forgive)\b",
    r"\bam i going to hell\b", r"\bhave i lost my salvation\b",
    r"\bunforgivable sin\b",
]
_PASTORAL_RE = [re.compile(p, re.IGNORECASE) for p in PASTORAL_PATTERNS]

PASTORAL_REPLY = (
    "That's a really important question, and it deserves a proper conversation "
    "with someone who knows you — not an answer from an app.\n\n"
    "Please do speak to one of our pastors. You can reach them through the "
    "Contact page, or come and find someone on a Sunday. If something is urgent "
    "and you need to talk to someone right now, Samaritans are available "
    "day or night on 116 123."
)

SYSTEM_PROMPT = """You are a study assistant inside a church app, helping someone \
understand a Bible passage they are reading.

Your role is to SURVEY, not to TEACH. You are not a pastor and you do not speak \
for this church.

How to answer:

- Explain what the passage says plainly, and give the historical and literary \
context that helps it make sense.
- Where Christians have understood a passage differently, say so clearly and \
outline the main views fairly, naming the traditions that hold them \
(e.g. "Reformed teachers tend to read this as...", "Many Catholic and Orthodox \
readers understand..."). Do not adjudicate between them.
- Where a passage is genuinely contested, say plainly that Christians disagree \
and suggest asking a pastor what this church teaches.
- Attribute views to traditions or well-known teachers where you are confident. \
If you are not sure who holds a view, describe the view without inventing a name.
- Never invent Bible references, quotations, or attributions. If you are unsure \
of a reference, leave it out.
- Keep to around 200 words unless more is genuinely needed. Warm, plain English. \
No jargon without explaining it.
- Do not give personal, medical, legal or financial advice, and do not tell the \
person what to do about their own life. Point them to a pastor instead.

End with a short line reminding them this is a study aid and their pastor is the \
place to go for what this church teaches."""


def is_available():
    return bool(GEMINI_KEY)


def needs_a_person(question):
    """True if this should go to a pastor rather than an AI."""
    if not question:
        return False
    return any(p.search(question) for p in _PASTORAL_RE)


def ask(question, passage_ref=None, passage_text=None, history=None):
    """Return (ok, answer). Never raises — failures come back as a message.

    `history` is a list of {"role": "user"|"model", "text": str} from earlier
    in the same conversation. Without it every question is answered cold, so
    follow-ups like "what did you mean by the second view?" make no sense.
    """
    if not is_available():
        return False, "The study assistant isn't switched on yet."

    if needs_a_person(question):
        return True, PASTORAL_REPLY

    context = ""
    if passage_ref:
        context = f"The person is reading {passage_ref}."
        if passage_text:
            snippet = passage_text[:2000]
            context += f'\n\nThe passage reads:\n"{snippet}"'

    prompt = f"{SYSTEM_PROMPT}\n\n{context}\n\nTheir question: {question}"

    # Gemini takes the conversation as alternating turns. The instructions and
    # passage context ride on the newest message so they stay in view rather
    # than scrolling out of the model's attention as the thread grows.
    contents = []
    for turn in (history or [])[-MAX_HISTORY_TURNS:]:
        role = turn.get("role")
        text = (turn.get("text") or "").strip()
        if role not in ("user", "model") or not text:
            continue
        contents.append({"role": role, "parts": [{"text": text[:MAX_TURN_CHARS]}]})

    # A conversation must begin with a user turn.
    while contents and contents[0]["role"] != "user":
        contents.pop(0)

    contents.append({"role": "user", "parts": [{"text": prompt}]})

    body = json.dumps({
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            # The current Gemini flash models spend tokens on internal
            # "thinking" BEFORE writing the visible answer, and that thinking
            # counts against this budget. At 700 the reasoning could eat most
            # of it and the answer got cut off mid-sentence — which showed up
            # as very short, incomplete replies. 2048 leaves ample room.
            "maxOutputTokens": 2048,
        },
        "safetySettings": [
            {"category": c, "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
            for c in [
                "HARM_CATEGORY_HARASSMENT",
                "HARM_CATEGORY_HATE_SPEECH",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "HARM_CATEGORY_DANGEROUS_CONTENT",
            ]
        ],
    }).encode("utf-8")

    global _working_model

    # If the operator pinned a model, honour it and don't try anything else.
    models = [_MODEL_OVERRIDE] if _MODEL_OVERRIDE else (
        # A model known to work goes first; the rest stay as fallbacks in case
        # it is retired mid-life.
        ([_working_model] if _working_model else [])
        + [m for m in MODEL_CANDIDATES if m != _working_model]
    )

    last_error = "Couldn't reach the study assistant just now."

    for model in models:
        req = urllib.request.Request(
            GEMINI_URL.format(model=model),
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_KEY,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            _working_model = model
            break
        except urllib.error.HTTPError as e:
            # 404 means retired or unavailable to this key.
            # 5xx means Google's end is having trouble with that particular
            # model — often one model is overloaded while its siblings are
            # fine. Both are worth trying the next candidate for. Anything
            # else is about the key or the request, so trying another model
            # would just repeat the same failure.
            if e.code == 404:
                last_error = ("The study assistant needs updating — the model "
                              "it uses is no longer available.")
                continue
            if 500 <= e.code < 600:
                last_error = ("The study assistant is briefly unavailable. "
                              "Please try again in a moment.")
                continue
            if e.code == 429:
                return False, ("The study assistant is busy at the moment — "
                               "the daily free limit may have been reached. "
                               "Please try again later.")
            if e.code in (401, 403):
                return False, ("The study assistant isn't set up correctly. "
                               "Please let the church office know.")
            return False, "Couldn't reach the study assistant just now."
        except urllib.error.URLError:
            # Network-level failure — no model will fix that.
            return False, "Couldn't reach the study assistant just now."
        except Exception:
            return False, "Couldn't reach the study assistant just now."
    else:
        # Every candidate 404'd.
        return False, last_error

    try:
        candidate = data["candidates"][0]
        finish = candidate.get("finishReason")
        if finish == "SAFETY":
            return True, ("I'd rather not answer that one here. "
                          "Please have a chat with one of our pastors.")
        parts = (candidate.get("content") or {}).get("parts") or []
        text = "".join(part.get("text", "") for part in parts).strip()
    except (KeyError, IndexError, TypeError):
        return False, "The study assistant gave an unexpected reply."

    if not text:
        if finish == "MAX_TOKENS":
            return False, ("That answer was going to be long and got cut off "
                           "before it started. Try asking about a smaller part "
                           "of the passage.")
        return False, "The study assistant didn't have an answer for that."

    if finish == "MAX_TOKENS":
        text += ("\n\n(That's as far as I got before running out of room — "
                 "ask me to carry on, or about a specific part, for more.)")

    return True, text
