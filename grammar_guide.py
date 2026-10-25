"""Clearspring — Hebrew and Greek grammar in plain English.

Every grammar label the interlinear shows links to an entry here. Each entry
has a one-line meaning (shown on the word itself), a short explanation, why it
can matter when reading the Bible, and a real example.

Written for people who have never studied a language: no jargon without an
explanation, and the honest caveat that grammar helps but rarely settles a
question on its own.
"""
import re

GROUPS = [
    ("roles", "How a sentence works"),
    ("g-tense", "Greek verbs: the kind of action"),
    ("g-voice", "Greek verbs: who does what"),
    ("g-mood", "Greek verbs: fact, possibility or command"),
    ("g-case", "Greek nouns: their job in the sentence"),
    ("png", "Person, number and gender"),
    ("h-stem", "Hebrew verbs: the stem"),
    ("h-form", "Hebrew verbs: the form"),
    ("h-noun", "Hebrew nouns and the little words"),
]

# slug: (group, term, short, body, why, example_ref, note on the example verse)
E = [
    # ---- sentence roles
    ("subject", "roles", "Subject", "who or what does the action",
     "The person or thing the sentence is about: the one doing the verb (or, with a passive verb, the one it is done to).",
     "Greek and Hebrew often leave the subject inside the verb itself. “He gave” can be one word, so the app shows who “he” is when it’s known.",
     "John 3:16", "“God” is the subject: he is the one who loved."),
    ("verb", "roles", "Verb", "the action or state",
     "The word that says what happens or what is. Each clause is built around one.",
     "Following the verbs is the quickest way into a passage: who acts, and what they do.",
     "John 11:35", "“wept” is the verb. The whole sentence is built on it."),
    ("object", "roles", "Object", "what the action is done to",
     "The person or thing that receives the action of the verb.",
     "", "John 3:16", "“the world” is the object: what God loved."),
    ("indirect-object", "roles", "Indirect object", "to or for whom",
     "The person who receives or benefits, usually with “to” or “for” in English.",
     "", "Romans 8:28", "“those who love Him” are the ones it all works together for."),
    ("complement", "roles", "Complement", "what the subject is",
     "With verbs like “is” or “become”, the word that describes or renames the subject.",
     "Word order in Greek doesn’t decide which is subject and which is complement; the article usually does.",
     "John 1:1", "In “the Word was God”, “God” describes what the Word was."),
    ("adverbial", "roles", "When, where, how or why", "adds when, where, how or why",
     "Words and phrases that add the circumstances: time, place, manner, means, reason or purpose.",
     "", "Ephesians 2:8", "“by grace” and “through faith” say how you have been saved."),

    # ---- Greek tense (aspect)
    ("present", "g-tense", "Present", "ongoing or repeated action",
     "Pictures the action as in progress, continuing or happening again and again. In statements it is usually present time.",
     "Greek “tense” is mostly about how an action is viewed (as ongoing or as a whole), not only when it happens.",
     "Romans 8:28", "“works” is present: God is at work, continually."),
    ("imperfect", "g-tense", "Imperfect", "ongoing action in the past",
     "Like the present, but in past time: something that was going on, kept happening or was attempted.",
     "", "John 1:1", "“was” is imperfect: the Word already was, before anything began."),
    ("future", "g-tense", "Future", "something still to come",
     "An action expected, promised or commanded for the future.",
     "", "Matthew 5:4", "“will be comforted” is future: a promise."),
    ("aorist", "g-tense", "Aorist", "a whole action, seen as complete",
     "Pictures the action as a single whole, without describing it as ongoing. In statements it is usually past time: “he loved”, “she went”.",
     "Be careful: the aorist doesn’t mean “once for all” by itself. It simply tells the event without drawing attention to its progress.",
     "John 3:16", "“loved” and “gave” are aorist: the whole act, told as an event."),
    ("perfect", "g-tense", "Perfect", "done, and still standing",
     "A completed action whose result continues. “It has been written”, so it stands written.",
     "Often theologically rich: the past event and its lasting result together.",
     "John 19:30", "“It is finished” is perfect: completed, and it stays completed."),
    ("pluperfect", "g-tense", "Pluperfect", "had been done, with results then",
     "A completed action whose results stood at a point in the past.",
     "", "John 11:30", "“had not yet entered” is pluperfect."),

    # ---- Greek voice
    ("active", "g-voice", "Active", "the subject does it",
     "The subject performs the action.",
     "", "John 3:16", "“God … loved”: God does the loving."),
    ("middle", "g-voice", "Middle", "the subject acts for or on itself",
     "The subject is involved in its own action: doing something to itself, for itself, or with special personal interest.",
     "English has no middle, so translations choose between active and passive wording.",
     "Acts 22:16", "“wash your sins away” is middle: Paul is to act for himself."),
    ("passive", "g-voice", "Passive", "it is done to the subject",
     "The subject receives the action. Often the one acting is God, even when not named (sometimes called the “divine passive”).",
     "Ask “done by whom?” When no one is named, the context often points to God.",
     "Ephesians 2:8", "“you have been saved” is passive: salvation is done to us."),
    ("deponent", "g-voice", "Deponent", "looks middle or passive, means active",
     "Some verbs only appear in middle or passive forms but have an ordinary active meaning, like “come” or “answer”.",
     "Don’t read a passive meaning into these; the form is just how the word works.",
     "John 14:6", "“comes” looks middle or passive in Greek, but simply means “comes”."),

    # ---- Greek mood
    ("indicative", "g-mood", "Indicative", "a statement of fact",
     "Presents something as real: it happened, is happening or will happen. Also used in ordinary questions.",
     "", "John 11:35", "“wept” is indicative: it happened."),
    ("subjunctive", "g-mood", "Subjunctive", "possible, intended or hoped for",
     "Presents an action as possible or intended, often after “that”, “so that”, “if” or “whoever”.",
     "", "John 3:16", "“shall not perish” is subjunctive: the purpose of God’s giving."),
    ("imperative", "g-mood", "Imperative", "a command or request",
     "Tells someone to do something. Also used in prayers: “Your kingdom come.”",
     "In commands, a present often means “keep doing” and an aorist “do this”.",
     "Matthew 28:19", "“make disciples” is the command. “Go” and “baptizing” are participles that hang on it."),
    ("optative", "g-mood", "Optative", "a wish",
     "Expresses a wish or a remote possibility. Rare in the New Testament.",
     "", "Romans 6:2", "“Certainly not!” translates an optative: literally “may it not be”."),
    ("infinitive", "g-mood", "Infinitive", "the “to …” form",
     "The verb used like a noun or to express purpose: “to live”, “to die”.",
     "", "Philippians 1:21", "“to live” and “to die” are infinitives."),
    ("participle", "g-mood", "Participle", "an “-ing” verb that describes",
     "A verb used like an adjective or noun: “the one believing”, “having gone”. It can describe a person or add the circumstances of the main verb.",
     "Participles carry a lot of Greek’s meaning. Look at which main verb they hang on.",
     "Matthew 28:19", "“baptizing” is a participle: it describes how disciples are made."),

    # ---- Greek case
    ("nominative", "g-case", "Nominative", "the subject",
     "The form a noun takes when it is the subject (or describes the subject).",
     "", "John 1:1", "“the Word” is nominative: the subject."),
    ("genitive", "g-case", "Genitive", "of …: belonging, source or description",
     "Usually translated with “of”. It can mean belonging, source, content or description, so “the love of Christ” can mean Christ’s love for us or our love for him.",
     "Many debates in Bible study turn on what a genitive means. Context decides.",
     "Romans 8:35", "“of Christ” is genitive. Here it means Christ’s love for us."),
    ("dative", "g-case", "Dative", "to, for, with or by",
     "Used for the person something is given to or done for, and for the means or manner: “by grace”.",
     "", "Ephesians 2:8", "“by grace” is dative: the means by which you are saved."),
    ("accusative", "g-case", "Accusative", "the object",
     "The form a noun takes when it receives the action, and after some prepositions.",
     "", "John 3:16", "“the world” is accusative: the object of God’s love."),
    ("vocative", "g-case", "Vocative", "someone spoken to",
     "Used to address someone directly.",
     "", "Matthew 6:9", "“Father” is vocative: God is addressed directly."),
    ("article", "g-case", "The article (“the”)", "“the”",
     "Greek has “the” but no word for “a”. It uses “the” more than English, even with names and with “God”, so translations often leave it out (shown in brackets).",
     "Whether a noun has “the” can matter, as in John 1:1.",
     "John 1:1", "Greek says the Word was with “the God”. The “the” isn’t translated."),

    # ---- person, number, gender
    ("person", "png", "Person", "I/we, you, or he/she/it/they",
     "1st person is the speaker (I, we), 2nd the one spoken to (you), 3rd someone else (he, she, it, they).",
     "Greek and Hebrew verbs carry the person inside them, so “we know” is one word.",
     "Romans 8:28", "“we know” is a single Greek word: 1st person plural."),
    ("number", "png", "Number", "one, two or more",
     "Singular is one, plural more than one. Hebrew also has a dual for pairs, like eyes and hands.",
     "English “you” hides the difference; Greek and Hebrew show whether one person or a whole church is meant.",
     "Psalms 121:1", "“eyes” is dual in Hebrew: a pair."),
    ("gender", "png", "Gender", "a grammar class",
     "Nouns belong to a gender class (masculine, feminine, and in Greek neuter), and other words agree with them. It is grammar, not a statement about sex.",
     "Agreement in gender shows which words belong together, which helps with words like “this” and “it”.",
     "Ephesians 2:8", "“this” is neuter, while “faith” and “grace” are feminine, so “this” points to the whole of being saved."),

    # ---- Hebrew stems
    ("qal", "h-stem", "Qal", "simple action",
     "The basic stem: the plain meaning of the verb. Most Hebrew verbs are Qal.",
     "", "Genesis 1:1", "“created” is Qal: the plain verb."),
    ("niphal", "h-stem", "Niphal", "passive or reflexive",
     "Usually the passive of Qal (“was created”), sometimes reflexive (“hid himself”).",
     "", "Genesis 2:4", "“they were created” is Niphal: the passive."),
    ("piel", "h-stem", "Piel", "intensive, or bringing about a state",
     "Often intensifies the action or makes something into a state: “break” becomes “shatter”, “be holy” becomes “make holy”.",
     "", "Psalms 103:1", "“Bless” is Piel."),
    ("pual", "h-stem", "Pual", "passive of Piel",
     "The passive of the Piel stem.",
     "", "Psalms 139:15", "“I was made” is Pual: passive."),
    ("hiphil", "h-stem", "Hiphil", "causing someone to do it",
     "Usually causative: “make someone do” or “cause to happen”.",
     "", "Psalms 23:2", "“He makes me lie down” is Hiphil: God causes the resting."),
    ("hophal", "h-stem", "Hophal", "passive of Hiphil",
     "The passive of the Hiphil: being caused to do something.",
     "", "Isaiah 53:7", "“He was led” is Hophal: he was caused to be brought."),
    ("hithpael", "h-stem", "Hithpael", "doing it to yourself, or again and again",
     "Usually reflexive (“sanctify yourselves”) or repeated action (“walk about”).",
     "", "Genesis 5:22", "“walked” is Hithpael: walked about, living day by day with God."),
    ("aramaic-stem", "h-stem", "Aramaic stems", "the Aramaic equivalents",
     "Parts of Daniel and Ezra (and one verse of Jeremiah) are in Aramaic, a sister language. Its stems (Peal, Pael, Haphel, Aphel, Hitpeel…) work much like the Hebrew ones: simple, intensive, causative and their passives.",
     "", "Daniel 2:20", "Daniel 2:4–7:28 is written in Aramaic. “Blessed be” uses an Aramaic stem."),
    ("other-stem", "h-stem", "Rare stems", "less common patterns",
     "A few verbs use rarer stems (such as Hishtaphel, “bow down”). They usually work like one of the main ones.",
     "", "Genesis 22:5", "“worship” (literally “bow down”) uses the rare Hishtaphel stem."),

    # ---- Hebrew forms
    ("qatal", "h-form", "Perfect (qatal)", "a complete action, usually past",
     "Views an action as complete. Usually past (“he created”), but also used for states and for things so certain they are spoken of as done.",
     "Prophets sometimes use it for the future, as if already done (the “prophetic perfect”).",
     "Genesis 1:1", "“created” is a perfect: a complete act."),
    ("yiqtol", "h-form", "Imperfect (yiqtol)", "incomplete: ongoing, future or possible",
     "Views an action as not complete: future, repeated, habitual, possible or wished for.",
     "", "Psalms 23:1", "“I shall not want” is an imperfect: ongoing, into the future."),
    ("wayyiqtol", "h-form", "Wayyiqtol (“and he did”)", "and then …: the storyteller’s past",
     "“And” joined to an imperfect form, used to move a story along in the past: “and God said… and there was light”.",
     "A chain of these is the backbone of Hebrew narrative. Where the chain breaks, the writer is pausing to explain or highlight.",
     "Genesis 1:3", "“And God said” and “there was” are wayyiqtols, carrying the story forward."),
    ("weqatal", "h-form", "Weqatal (“and he will”)", "and then …: future or instructions",
     "“And” joined to a perfect form, usually continuing a future, a command or a habitual action.",
     "", "Genesis 2:24", "“be united” is a weqatal, continuing the future of “will leave”."),
    ("weyiqtol", "h-form", "And + imperfect", "and …, so that …",
     "“And” with an imperfect form, often expressing purpose or result: “so that”.",
     "", "Genesis 12:2", "The Hebrew begins “And I will make you”: and + imperfect."),
    ("h-imperative", "h-form", "Imperative", "a command",
     "A direct command or request.",
     "", "Genesis 12:1", "“Leave” (literally “go”) is an imperative."),
    ("jussive", "h-form", "Jussive", "let it be …",
     "A wish or mild command, usually for a third person: “let there be”, “may he”.",
     "", "Genesis 1:3", "“Let there be” is a jussive."),
    ("cohortative", "h-form", "Cohortative", "let me / let us …",
     "Encouragement or resolve, for the speaker: “let us”, “I will”.",
     "", "Psalms 95:1", "“let us sing” is cohortative."),
    ("h-infinitive", "h-form", "Infinitive", "“to …”, or for emphasis",
     "The construct form works like “to …” or “when …”. The absolute form is often doubled with another verb for emphasis: “you shall surely die”.",
     "", "Genesis 2:17", "“you will surely die” doubles the verb in Hebrew: “dying you will die”."),
    ("h-participle", "h-form", "Participle", "one who is doing",
     "Describes ongoing action or a person by what they do: “the one who keeps”. Passive participles mean “the one who is…ed”: “blessed”.",
     "", "Psalms 121:4", "“the Protector” is a participle: literally “the one keeping” Israel."),

    # ---- Hebrew nouns and small words
    ("absolute", "h-noun", "Absolute", "the word on its own",
     "The ordinary form of a noun.",
     "", "Genesis 1:1", "“God” stands on its own here: absolute."),
    ("construct", "h-noun", "Construct", "X of Y",
     "A noun joined tightly to the next word, which English says with “of”: “the Spirit of God”.",
     "", "Genesis 1:2", "“the Spirit of God” is a construct: Spirit-of God."),
    ("definite", "h-noun", "Definite (Aramaic)", "“the”, in Aramaic",
     "Aramaic marks “the” with an ending rather than a prefix.",
     "", "Daniel 2:20", "“God” here is elaha, the Aramaic definite form: “the God”."),
    ("prefixes", "h-noun", "The little words joined on", "and, the, in, to, from, like",
     "Hebrew joins short words to the front of the next word: and (ve-), the (ha-), in or with (be-), to (le-), from (mi-), like (ke-). The app shows each part separately.",
     "", "Genesis 1:1", "“In the beginning” is one Hebrew word: be (in) + reshit (beginning)."),
    ("object-marker", "h-noun", "Object marker (’et)", "marks the object; not translated",
     "A small word that points out the definite object of the verb. English has no equivalent, so it isn’t translated.",
     "", "Genesis 1:1", "Before “the heavens” and before “the earth” stands ’et, the object marker, untranslated."),
    ("suffix", "h-noun", "Pronoun endings", "my, your, his, her, our, their",
     "Hebrew adds pronouns to the end of words: “shepherd-my” is “my shepherd”.",
     "", "Psalms 23:1", "“my shepherd” is one Hebrew word: shepherd + my."),
]

ENTRIES = {}
for slug, group, term, short, body, why, ref, ex in E:
    ENTRIES[slug] = {"slug": slug, "group": group, "term": term, "short": short, "body": body, "why": why, "ref": ref, "example": ex}

ROLE_SLUG = {"s": "subject", "v": "verb", "o": "object", "io": "indirect-object", "p": "complement", "a": "adverbial"}
ROLE_NAME = {"s": "Subject", "v": "Verb", "o": "Object", "io": "To/for whom", "p": "Complement", "a": "When/where/how"}

ARAMAIC_STEMS = {"Peal", "Pael", "Haphel", "Aphel", "Hitpaal", "Hitpeel", "Peil", "Hothpaal", "Ishtaphel", "Shaphel", "Hitpael"}
MAIN_STEMS = {"Qal", "Niphal", "Piel", "Pual", "Hiphil", "Hophal", "Hithpael"}
HFORM = {"Perfect": "qatal", "Imperfect": "yiqtol", "Consecutive Imperfect": "wayyiqtol", "Consecutive Perfect": "weqatal",
         "Conjunction+Imperfect": "weyiqtol", "Imperative": "h-imperative", "Jussive": "jussive", "Cohortative": "cohortative",
         "Infinitive": "h-infinitive", "Participle": "h-participle", "Participle passive": "h-participle"}
GVOICE = {"Active": "active", "Middle": "middle", "Passive": "passive", "Middle or Passive": "passive",
          "Middle Deponent": "deponent", "Middle or Passive Deponent": "deponent", "Passive Deponent": "deponent"}
PERSON = {"1st": "1st person", "2nd": "2nd person", "3rd": "3rd person", "First": "1st person", "Second": "2nd person",
          "Third": "3rd person", "1st Person": "1st person", "2nd Person": "2nd person", "2nd Singular": "2nd person"}


def _slug_for(field, value, hebrew):
    v = value or ""
    if field == "Tense":
        return {"Present": "present", "Imperfect": "imperfect", "Future": "future", "Aorist": "aorist", "Perfect": "perfect",
                "Pluperfect": "pluperfect"}.get(v.replace("2nd ", ""))
    if field == "Voice":
        return GVOICE.get(v)
    if field == "Mood":
        return {"Indicative": "indicative", "Subjunctive": "subjunctive", "Imperative": "imperative", "Optative": "optative",
                "Jussive": "jussive", "Cohortative": "cohortative"}.get(v)
    if field == "Case":
        return v.lower() if v.lower() in ENTRIES else None
    if field == "Stem":
        return v.lower() if v in MAIN_STEMS else ("aramaic-stem" if v in ARAMAIC_STEMS else "other-stem")
    if field == "Form":
        if hebrew:
            return HFORM.get(v)
        return {"Participle": "participle", "Infinitive": "infinitive"}.get(v)
    if field == "State":
        return {"Absolute": "absolute", "Construct": "construct", "Definite": "definite"}.get(v)
    if field == "Person":
        return "person"
    if field == "Number":
        return "number"
    if field == "Gender":
        return "gender"
    return None


SHOW = ["Stem", "Form", "Tense", "Voice", "Mood", "Case", "State", "Person", "Number", "Gender"]
FUNC = {"Definite article": "article", "Definite article (Hebrew)": "prefixes", "Object indicator": "object-marker", "Suffix": "suffix"}


def explain(code, data, hebrew):
    """Turn one grammar code into what the app shows: a short label, chips
    (each linked to the guide) and STEP's example pattern."""
    if not data:
        return None
    fields = dict(data.get("x") or [])
    func = data.get("f") or ""
    chips = []
    for k in SHOW:
        v = fields.get(k)
        if not v or v in ("Either gender", "Common") and k == "Form":
            continue
        if hebrew and k == "Form" and func != "Verb":
            continue
        label = PERSON.get(v, v) if k == "Person" else ("common gender" if v == "Either gender" else v)
        slug = _slug_for(k, v, hebrew)
        e = ENTRIES.get(slug) if slug else None
        if e and hebrew and k == "Form":
            label = e["term"]
        chips.append({"k": k, "v": label, "slug": slug if e else None, "short": e["short"] if e and k not in ("Person", "Number", "Gender") else ""})
    form = fields.get("Form", "")
    if func == "Particle" and form in FUNC:
        func_label, func_slug = form if form != "Definite article (Hebrew)" else "“the”", FUNC[form]
    else:
        func_label, func_slug = func, FUNC.get(func)
        if hebrew and func in ("Preposition", "Conjunction") and not func_slug:
            func_slug = "prefixes"
    tag = func_label.split(" (")[0]
    lead = next((c for c in chips if c["k"] in ("Stem", "Tense", "Case", "State")), None)
    mood = next((c for c in chips if c["k"] in ("Form", "Mood")), None)
    bits = [tag.lower()] + [c["v"].split(" (")[0].lower() for c in (lead, mood) if c]
    ex = (data.get("ex") or "").strip()
    if func != "Verb" or not re.search(r"[A-Za-z]{2}", ex):
        ex = ""
    return {"code": code, "fn": func_label, "fnslug": func_slug, "tag": " · ".join(dict.fromkeys(b for b in bits if b))[:48],
            "chips": chips, "ex": ex}


def groups():
    return [(g, title, [e for e in ENTRIES.values() if e["group"] == g]) for g, title in GROUPS]
