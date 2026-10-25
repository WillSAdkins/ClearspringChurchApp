"""The Clearspring guide: ask in your own words, and it takes you there.

"Take me to prayer", "when's church?", "John 3:16", "Greek word for love",
"I feel anxious", "who was Ruth?", "how do I join a group?"

Everything here runs on the server with no AI and no cost: a map of every
page with the words people use for it, plus live facts (service times,
address, what's on). Only when that genuinely can't tell what someone means
does the app ask the AI (see app.guide_ask), and even then the AI may only
choose from this same map, so it can never invent a page.
"""

import re

import grammar_guide

import refs

# ---------------------------------------------------------------- the map
# id, title, endpoint, url arguments, one line on what's there, and the words
# and phrases people use for it. Phrases score more than single words.
PLACES = [
    # Home and tabs
    ("home", "Home", "index", {}, "The front page: this week, the latest talk and what's on.", "home|front page|start|main page|homepage"),
    ("watch", "Watch", "watch_hub", {}, "Sunday talks and the live stream.", "watch|sermon|sermons|talk|talks|message|messages|preach|preaching|video|videos|youtube|catch up|missed sunday|listen again"),
    ("courses", "Courses", "watch_learn", {}, "Free video courses from trusted teachers: the Bible, belief, prayer, church history.", "courses|course|learn|learning|classes|lectures|training|biblical training|bible course|theology course|seminary|teaching videos|alpha course|video course"),
    ("live", "Live stream", "watch_hub", {}, "Watch the service live when it's on.", "live|livestream|live stream|streaming|watch live|online service|watch online"),
    ("podcast", "Podcast", "podcast_feed", {}, "Every talk as a podcast to follow in your podcast app.", "podcast|audio|listen|spotify|apple podcasts"),
    ("sunday", "This Sunday", "sunday_page", {}, "This week's passage, fill-in notes and group questions.", "this sunday|sunday notes|fill in notes|fill-in|outline|sermon notes|notes for sunday|follow along"),
    ("community", "Community", "community_hub", {}, "Everything we do together.", "community|church family|get involved|connect"),
    ("bible", "The Bible", "bible_tab", {}, "Open the Bible where you left off.", "bible|read the bible|scripture|reader|open the bible|read|reading|chapter|carry on reading|where i left off|continue reading"),
    ("books", "Books of the Bible", "bible_books", {}, "All 66 books, to pick any chapter.", "books of the bible|all books|book list|choose a book|pick a book|contents"),
    ("study", "Study", "bible_hub", {}, "Verse of the day, plans and every study tool.", "study|study tab|bible study|study tools|dig deeper"),
    ("more", "More", "more_hub", {}, "Settings, giving, ministries, games and more.", "more|more tab|menu|everything else"),

    # Reading and study
    ("today", "Today's reading", "bible_today", {}, "Today's Bible reading and verse.", "today|todays reading|today's reading|daily reading|reading for today|verse of the day|daily verse"),
    ("plans", "Reading plans", "reading_plans", {}, "Bible-in-a-year and shorter plans to follow.", "reading plan|reading plans|plan|plans|bible in a year|read the bible in a year|through the bible|daily plan|schedule"),
    ("plan_new", "Make your own plan", "plan_builder", {}, "Build a reading plan for any books, at your own pace.", "make a plan|make my own plan|own reading plan|my own reading plan|create a reading plan|custom plan|create a plan|own plan|build a plan|new plan"),
    ("search", "Search the Bible", "bible_search", {}, "Find any verse by reference or word.", "search|find a verse|search the bible|look up a verse|find verse|keyword|concordance"),
    ("words", "Greek & Hebrew", "words_hub", {}, "The original words behind the English, and everywhere they're used.", "greek|hebrew|original language|original languages|original words|word study|lexicon|strongs|strong's|what does the word mean|meaning of the word"),
    ("wordbyword", "Word by word", "interlinear", {"book_slug": "john", "chapter": 1}, "Any chapter in Hebrew or Greek, word by word, with the grammar explained.", "interlinear|word by word|reverse interlinear|sentence flow|sentence diagram|diagram the sentence|how is the sentence built|parse|parsing"),
    ("grammar", "Grammar, simply", "grammar_page", {}, "What aorist, participle, Qal or genitive mean, in plain English.", "grammar|aorist|participle|genitive|dative|accusative|nominative|imperative|subjunctive|qal|piel|hiphil|niphal|wayyiqtol|perfect tense|greek tenses|hebrew verbs|what does aorist mean|grammar terms"),
    ("library", "Library", "library_hub", {}, "Dictionary, topics, commentaries, people, places, maps and timeline.", "library|reference|resources for study"),
    ("dictionary", "Bible dictionary", "dictionary_index", {}, "3,900 Bible words and names explained.", "dictionary|define|definition|what does mean|bible dictionary|eastons"),
    ("topics", "Topics", "topics_index", {}, "What the Bible says about thousands of subjects.", "topic|topics|what does the bible say about|bible say about|subject|subjects|theme|themes|naves"),
    ("people", "People of the Bible", "people_index", {}, "Everyone named in the Bible, with family trees.", "people|characters|who was|family tree|genealogy|bible characters|person"),
    ("places", "Places & maps", "places_index", {}, "1,200 places on the map.", "places|place|where was|geography|location in the bible|places in the bible"),
    ("map", "Map of the Bible world", "bible_map", {}, "Every place, on one map.", "map|maps|bible map|map of the bible|world map|bible world"),
    ("fathers", "The early church", "fathers_index", {}, "What the church fathers said about each verse.", "church fathers|early church|fathers|augustine|chrysostom|aquinas|catena aurea|jerome|ambrose|bede|patristic|what did the early church say"),
    ("b3d", "3D Bible world", "bible_3d_hub", {}, "The tabernacle, Solomon's temple, Noah's ark and the land, in 3D.", "3d|3 d|three d|model|models|tabernacle|temple model|solomons temple|noahs ark|ark of the covenant|monuments|3d map|relief map|see the temple|what did the temple look like|how big was the ark"),
    ("journeys", "Journeys", "journeys", {}, "Abram, the Exodus and Paul's voyages, step by step.", "journey|journeys|exodus route|pauls journeys|paul's journeys|missionary journeys|travels"),
    ("timeline", "Timeline", "timeline_page", {}, "From Creation to the early church.", "timeline|history|when did|chronology|dates in the bible|order of events"),
    ("harmony", "The four Gospels side by side", "harmony_page", {}, "The life of Jesus as all four Gospels tell it.", "harmony|four gospels|gospels side by side|life of jesus|parallel gospels"),
    ("otnt", "Old Testament in the New", "ot_in_nt_page", {}, "Where the New Testament quotes the Old.", "old testament in the new|quotes the old testament|prophecy fulfilled|fulfilled prophecy|quotations"),
    ("creeds", "Creeds", "creeds_index", {}, "The Apostles' and Nicene Creeds and more.", "creed|creeds|apostles creed|nicene|what we believe|confession of faith|beliefs"),
    ("compare", "Compare passages", "compare_passages", {}, "Put up to four passages side by side.", "compare passages|side by side|parallel passages|synoptic|same story in|compare gospels"),
    ("listen", "Listen to the Bible", "bible_listen", {}, "The audio Bible: keeps playing with your phone locked.", "audio bible|listen to the bible|listen|audiobook|audio|read to me|read it to me|play the bible|hear the bible|bible audio|while driving|in the car|can't read"),
    ("classics", "Classic books", "classics_shelf", {}, "Over thirty classics to read in the app: The Pilgrim's Progress, Augustine, Andrew Murray, Dante, Dostoevsky, MacDonald and more.", "classic books|christian classics|pilgrims progress|pilgrim's progress|imitation of christ|brother lawrence|practice of the presence|city of god|augustine|chesterton|orthodoxy|julian of norwich|in his steps|paradise lost|confessions|grace abounding|andrew murray|e m bounds|jonathan edwards|divine comedy|dante|ben-hur|ben hur|quo vadis|brothers karamazov|dostoevsky|george macdonald|princess and the goblin|john donne|boethius|books to read|book to read|reading list"),
    ("morning_evening", "Morning and Evening", "morning_evening", {}, "Spurgeon's daily readings, for this morning or this evening.", "morning and evening|spurgeon devotional|spurgeon daily|morning reading|evening reading|daily reading spurgeon"),
    ("reference", "Reference shelf", "reference_hub", {}, "The Bible encyclopedia (ISBE), Easton's and Smith's dictionaries, and Nave's and Torrey's topical Bibles.", "bible encyclopedia|encyclopedia|isbe|smith's dictionary|smiths dictionary|easton|eastons|nave|naves|topical bible|torrey|topical textbook|reference books"),
    ("videos", "Book overview videos", "bible_videos", {}, "BibleProject's animated overview of every book.", "bibleproject|bible project|overview video|book overview|animated|videos about the bible|explainer video|video about"),
    ("offline", "Read offline", "offline_packs", {}, "Save a whole book, with its notes, for reading with no signal.", "offline|read offline|read the bible offline|bible offline|reading offline|no signal|no internet|download a book|save for offline|airplane|plane|without wifi|without internet"),
    ("college", "Bible College", "college_hub", {}, "Monday evening teaching, 8–9pm: courses, readings and questions.", "bible college|college|course|courses|monday teaching|monday night|bible course|bible class|theology course"),
    ("passage", "Study a passage", "passage_study_page", {}, "Study a passage properly: translations side by side, notes, key words and a guided study.", "study a passage|passage study|bible study|inductive|observe interpret apply|group questions|discussion questions|compare translations|side by side|young's literal|darby"),
    ("notes", "Study notes", "notes_chapter", {"book_slug": "john", "chapter": 1}, "Modern notes on every chapter, verse by verse.", "study notes|study bible|notes on|explain this verse|explain the verse|what does this verse mean|tyndale notes|verse notes"),
    ("intros", "Book introductions", "intro_index", {}, "Who wrote each book, when, why and what to look for.", "book introduction|introduction to|intro to|who wrote|background to|overview of the book|author of|when was it written"),
    ("themes", "Themes", "themes_index", {}, "300 short articles on the Bible's big ideas.", "themes|theme|big ideas|bible themes|theology"),
    ("profiles", "People of the Bible", "profiles_index", {}, "Profiles of key people and what we learn from them.", "profile|profiles|life of|biography|character study|bible characters"),
    ("commentary", "Commentaries", "library_hub", {}, "Twelve classic commentaries, chapter by chapter: Matthew Henry, Spurgeon, Calvin, Wesley, Clarke, Barnes, JFB and more.", "commentary|commentaries|matthew henry|spurgeon|explain the chapter|explain this passage|calvin|wesley|adam clarke|barnes notes|jamieson|jfb|geneva notes|scofield|word pictures"),
    ("memorise", "Memorise scripture", "memorise_hub", {}, "Learn verses by heart, five minutes a day.", "memorise|memorize|memory verse|memory verses|learn verses|learn by heart|remember verses|scripture memory"),
    ("mystudy", "My study", "my_study", {}, "Your notes, highlights and journal.", "my study|my notes|notes|highlights|my highlights|what i wrote"),
    ("saved", "Saved verses", "my_study", {"f": "saved"}, "The verses you've kept.", "saved verses|saved|bookmarks|bookmarked|my verses|favourite verses|favorite verses"),
    ("journal", "Write in your journal", "soap_editor", {}, "Scripture, observation, application, prayer.", "journal|journalling|journaling|soap|write in my journal|quiet time|devotional journal"),
    ("talknotes", "Sermon notes", "talk_editor", {}, "Write notes on a talk.", "take sermon notes|write sermon notes|notes on the talk|notes on sermon"),
    ("stats", "How much you've read", "reading_stats", {}, "Every chapter you've read, book by book.", "how much have i read|reading progress|chapters read|reading stats|statistics|my reading"),
    ("devotionals", "Devotionals", "devotionals", {}, "Short daily reflections.", "devotional|devotionals|daily reflection|reflection|thought for the day|daily devotion"),
    ("feelings", "How are you feeling?", "feelings_index", {}, "Words from the Bible for anxious, low, thankful and other days.", "feeling|feelings|how am i feeling|emotions|verses for when|struggling|bad day|encouragement|comfort"),

    # Prayer
    ("prayer", "Prayer wall", "prayer_wall", {}, "Pray for others, and see answered prayers.", "prayer wall|prayer requests|pray for others|praying for|prayers|prayer|pray"),
    ("prayer_new", "Ask for prayer", "prayer_new", {}, "Share a request publicly, or just with the pastors.", "ask for prayer|prayer request|request prayer|need prayer|pray for me|please pray|share a request|submit prayer"),
    ("pray_now", "Pray now", "prayer_session", {}, "A guided few minutes of prayer.", "pray now|guided prayer|help me pray|how do i pray|how to pray|lead me in prayer|prayer time"),
    ("prayer_practices", "Ways to pray", "prayer_practices", {}, "Praying Scripture, the Lord's Prayer, the examen and more.", "ways to pray|prayer practices|lords prayer|lord's prayer|examen|lectio|breath prayer|pray the psalms"),
    ("prayer_list", "My prayer list", "prayer_journal", {}, "Cards for the people and things you pray for, a few each day.", "prayer list|my prayers|prayer journal|people i pray for|prayer diary|prayermate|prayer mate|prayer cards|pray for people|answered prayers|thank yous"),
    ("prayer_cards", "Today's prayer cards", "prayer_deck", {}, "Swipe through today's cards from your prayer list.", "todays prayer list|today's prayer cards|pray through my list|prayer cards today|swipe prayers"),
    ("night", "Before sleep", "prayer_night", {}, "A quiet way to end the day.", "before sleep|bedtime|night prayer|can't sleep|cant sleep|compline|end the day|evening prayer"),
    ("fasting", "Fasting", "prayer_fasting", {}, "A simple guide to fasting and prayer.", "fast|fasting|how to fast"),
    ("world", "Pray for the world", "prayer_world", {}, "A country to pray for each day.", "pray for the world|country|countries|nations|world prayer|mission prayer"),

    # Church life
    ("calendar", "Calendar", "calendar_page", {}, "Services and events, month by month.", "calendar|events|event|whats on|what's on|diary|dates|coming up|this week|next week|schedule of events"),
    ("visit", "Plan your visit", "plan_visit", {}, "Times, address, parking and what to expect.", "visit|first time|new here|newcomer|plan a visit|what to expect|parking|directions|where are you|where is the church|address|how do i get there|getting there|what to wear"),
    ("contact", "Contact us", "contact_page", {}, "Email, phone, a message to the pastors, safeguarding.", "contact|email address|phone number|email|phone|call|get in touch|speak to someone|talk to a pastor|pastor|minister|office|safeguarding|message the church"),
    ("ask", "Ask a question", "ask_question", {}, "Send a question to the pastors.", "ask a question|question for the pastor|ask the pastor|ask a pastor|send a question"),
    ("qa", "Questions & Answers", "questions", {}, "Questions people have asked, answered.", "questions and answers|q&a|q and a|faq|answered questions"),
    ("groups", "Groups", "groups_index", {}, "Small groups to read, pray and talk together.", "group|groups|small group|home group|life group|join a group|bible study group|cell group|connect group"),
    ("ministries", "Ministries", "ministries", {}, "Kids, youth, young adults, men, women, seniors and missions.", "ministry|ministries|kids|children|youth|young people|teens|young adults|mens|men's|men|womens|women's|women|seniors|older people|missions|mission|womens group|mens group|youth group|kids club|kids work|childrens work|sunday school|creche"),
    ("giving", "Giving", "giving", {}, "Give once or regularly, and current appeals.", "give|giving|donate|donation|tithe|tithing|offering|money|support the church|standing order|regular giving|appeal"),
    ("giftaid", "Gift Aid", "gift_aid_info", {}, "Add 25% to your gift at no cost to you.", "gift aid|giftaid|tax"),
    ("store", "Store", "store", {}, "Books and resources.", "store|shop|buy|books to buy|merchandise"),
    ("resources", "Resources", "resources", {}, "Guides, handbook and recommendations.", "resources|handbook|guides|recommendations|reading list|book recommendations"),
    ("stories", "Stories", "grow_stories", {}, "What God has been doing among us.", "stories|testimonies|testimony|what god is doing|share my story"),
    ("poll", "Live poll", "poll_active", {}, "Sunday's live poll.", "poll|vote|live poll|voting"),

    # Faith and growing
    ("faith", "Exploring faith", "faith_hub", {}, "Big questions, the big story and church words explained.", "exploring faith|explore faith|new to faith|not a christian|curious|seeker|is god real|does god exist"),
    ("gospel", "The good news", "faith_gospel", {}, "What Christians believe about Jesus, simply.", "what is the gospel|the gospel|gospel|good news|how to become a christian|become a christian|be saved|salvation|follow jesus|give my life to jesus|accept jesus"),
    ("bigq", "Big questions", "faith_questions", {}, "Honest answers to hard questions.", "big questions|hard questions|why does god allow suffering|suffering|science and faith|is the bible true|apologetics|doubts|questions about god"),
    ("churchwords", "Church words explained", "faith_words", {}, "What words like grace and communion mean.", "church words|jargon|what does grace mean|glossary|christian words"),
    ("sharefaith", "Sharing your faith", "faith_share", {}, "Talking about Jesus naturally.", "share my faith|sharing faith|evangelism|tell friends about jesus|witness"),
    ("bigstory", "The big story", "faith_story", {}, "The whole Bible in eleven chapters.", "big story|story of the bible|overview of the bible|bible overview|whole bible story"),
    ("grow", "Grow", "grow_hub", {}, "First steps, the Foundations course, your gifts and your story.", "grow|growing|discipleship|next step in faith|spiritual growth"),
    ("firststeps", "First steps", "grow_first_steps", {}, "Eight short steps for a new Christian.", "first steps|new christian|just became a christian|new believer|starting out"),
    ("foundations", "Foundations course", "grow_course", {}, "Nine sessions on the basics of following Jesus.", "foundations|course|alpha|basics course|nine sessions|beginners course"),
    ("gifts", "Your gifts", "grow_gifts", {}, "Discover how God has gifted you.", "spiritual gifts|my gifts|gifts test|gifting|what are my gifts"),
    ("checkin", "Check-in", "grow_checkin", {}, "A few honest questions on how you're growing.", "check in|check-in|how am i growing|spiritual health|self assessment"),
    ("rhythm", "Rhythm of life", "grow_rhythm", {}, "Simple daily and weekly habits.", "rhythm|habits|routine|rule of life|daily habits"),
    ("mystory", "Your story", "grow_story", {}, "Write your own faith story.", "write my story|my testimony|my story|tell my story"),
    ("nextsteps", "Next steps", "grow_next_steps", {}, "Baptism, membership, serving and more.", "next steps|baptism|baptised|baptized|be baptised|membership|join the church|become a member|serving|serve|volunteer|volunteering|dedication|communion"),
    ("family", "Family devotions", "family_hub", {}, "Bible stories, questions and prayers for the dinner table.", "family|family devotions|children's bible|kids devotions|bedtime story|parents|parenting|dinner table"),
    ("games", "Kids games", "games_hub", {}, "Bible games to play together.", "games|game|play|kids games|children's games|quiz|trivia|fun"),

    # You
    ("account", "Your account", "account", {}, "Your sign-in, your data, and deleting your account.", "account|my account|profile|delete my account|my data|export"),
    ("signin", "Sign in", "signin", {}, "Sign in to keep your notes on every device.", "sign in|log in|login|signin|logon|forgotten password|forgot password|reset password"),
    ("signup", "Create an account", "signup", {}, "Keep your notes, plans and verses on all your devices.", "sign up|create account|register|make an account|join the app"),
    ("settings", "Settings", "settings", {}, "Text size, dark mode and reading options.", "settings|dark mode|light mode|text size|font size|bigger text|theme|appearance|preferences"),
    ("notifications", "Notifications", "notification_settings", {}, "Choose what you hear about, and reading reminders.", "notifications|notification|reminder|reminders|alerts|push|daily reminder|turn off notifications"),
    ("discipleship", "My discipleship", "discipleship", {}, "Your prayer, Bible and study habits week by week, your goals and your next step.", "my discipleship|discipleship tracker|habit tracker|habits tracker|track my habits|track my prayer|track my reading|how am i doing|how am i getting on|my week|my growth|spiritual health|prayer habit|bible habit|my dashboard|performance"),
    ("progress", "Your progress", "member_progress", {}, "Streaks and badges.", "streak|streaks|badges|achievements|my progress"),
    ("privacy", "Privacy notice", "privacy_page", {}, "What we keep and why.", "privacy|data protection|gdpr|cookies|personal data"),
]

PLACES_BY_ID = {p[0]: p for p in PLACES}

STOP = set("""a an the to me my i please can could would you show take go open find where is are was
what whats how do does get for of on in at about with want like need some any it this that there here
help app page bit just know tell im i'm id i'd let lets let's see look looking up into from be
""".split())

SYNONYMS = {
    "sermons": "sermon", "talks": "talk", "videos": "video", "events": "event", "groups": "group",
    "plans": "plan", "verses": "verse", "prayers": "prayer", "praying": "pray", "notes": "note",
    "kids": "kids", "children": "children", "colour": "color", "favourites": "favourite",
    "church": "church", "services": "service", "meetings": "meeting",
}

NAV_RE = re.compile(r"^\s*(?:please\s+)?(?:take me to|go to|open( up)?|show me|navigate to|bring up|load|i want to go to|can you open|jump to|get me to)\b", re.I)

FEELING_WORDS = {
    "anxious": ["anxious", "anxiety", "worried", "worry", "worrying", "stressed", "stress", "nervous"],
    "afraid": ["afraid", "scared", "frightened", "fear", "fearful"],
    "lonely": ["lonely", "alone", "isolated", "loneliness"],
    "grieving": ["grieving", "grief", "bereaved", "mourning", "lost someone", "died", "death of"],
    "sad": ["sad", "low", "down", "depressed", "unhappy", "blue", "miserable"],
    "angry": ["angry", "anger", "furious", "cross", "frustrated", "annoyed"],
    "guilty": ["guilty", "guilt", "ashamed", "shame", "messed up"],
    "tired": ["tired", "exhausted", "weary", "worn out", "burnt out", "burned out"],
    "overwhelmed": ["overwhelmed", "too much", "drowning", "swamped"],
    "doubting": ["doubting", "doubt", "doubts", "unsure about god", "questioning"],
    "tempted": ["tempted", "temptation"],
    "waiting": ["waiting", "impatient", "patience"],
    "thankful": ["thankful", "grateful", "thanks", "gratitude", "blessed"],
    "joyful": ["joyful", "happy", "joy", "glad", "excited", "celebrating"],
    "hopeless": ["hopeless", "no hope", "give up", "giving up", "no point"],
}


def _norm(text):
    t = (text or "").lower().replace("’", "'")
    t = re.sub(r"[^a-z0-9'&\s-]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _words(text):
    out = []
    for w in _norm(text).replace("'", "").split():
        w = SYNONYMS.get(w, w)
        if w not in STOP:
            out.append(w)
    return out


def _stem(w):
    for suf in ("ing", "ers", "er", "es", "s"):
        if len(w) > 4 and w.endswith(suf):
            return w[: -len(suf)]
    return w


_INDEX = []
for _p in PLACES:
    phrases = [k.strip() for k in _p[5].split("|") if k.strip()]
    _INDEX.append({
        "id": _p[0],
        "phrases": [p.replace("'", "") for p in phrases if " " in p],
        "words": {_stem(w) for p in phrases for w in _words(p)} | {_stem(w) for w in _words(_p[1])},
    })


def score_places(query):
    """Every page that fits, best first, as (score, id)."""
    q = " " + _norm(query).replace("'", "") + " "
    qwords = {_stem(w) for w in _words(query)}
    scored = []
    for entry in _INDEX:
        s = 0.0
        for ph in entry["phrases"]:
            if f" {ph} " in q:
                s += 3 + len(ph.split())
        hits = qwords & entry["words"]
        s += 1.5 * len(hits)
        if s:
            scored.append((s, entry["id"]))
    scored.sort(key=lambda x: -x[0])
    return scored


def feeling_in(query):
    q = " " + _norm(query) + " "
    if not re.search(r"\b(i feel|i'm feeling|im feeling|feeling|i am|i'm|im|i've been|ive been|so|really|very|bit)\b", q):
        return None
    for slug, words in FEELING_WORDS.items():
        for w in words:
            if f" {w} " in q:
                return slug
    return None


def reference_in(query):
    """A Bible reference the person wants to read, if that's the point of
    the message ("John 3:16", "open Psalm 23", "read Romans 8")."""
    r = refs.parse(query)
    if not r:
        return None
    rest = _norm(query.replace(query[r["start"]:r["end"]], " "))
    rest_words = [w for w in rest.split() if w not in STOP and w not in ("read", "verse", "chapter", "passage", "bible", "the")]
    return r if len(rest_words) <= 2 else None


TOPIC_RE = re.compile(r"(?:what does the bible say about|bible verses? (?:about|on|for)|verses? (?:about|on|for)|scriptures? (?:about|on|for)|what does god say about)\s+(.+)", re.I)
# Grammar words that mean nothing else; and everyday words that only count with a grammar word nearby.
_GRAMMAR_SURE = {"aorist": "aorist", "participle": "participle", "participles": "participle", "genitive": "genitive", "dative": "dative",
                 "accusative": "accusative", "nominative": "nominative", "vocative": "vocative", "subjunctive": "subjunctive",
                 "optative": "optative", "infinitive": "infinitive", "indicative": "indicative", "imperative": "imperative",
                 "deponent": "deponent", "pluperfect": "pluperfect", "qal": "qal", "niphal": "niphal", "piel": "piel", "pual": "pual",
                 "hiphil": "hiphil", "hophal": "hophal", "hithpael": "hithpael", "wayyiqtol": "wayyiqtol", "weqatal": "weqatal",
                 "qatal": "qatal", "yiqtol": "yiqtol", "jussive": "jussive", "cohortative": "cohortative", "septuagint": None}
_GRAMMAR_MAYBE = {"present": "present", "imperfect": "imperfect", "future": "future", "perfect": "perfect", "active": "active",
                  "middle": "middle", "passive": "passive", "construct": "construct", "absolute": "absolute", "subject": "subject",
                  "object": "object", "article": "article", "gender": "gender", "person": "person"}
_GRAMMAR_CONTEXT = re.compile(r"\b(tense|grammar|greek|hebrew|voice|mood|case|stem|verb|noun|form)\b", re.I)


INTRO_RE = re.compile(r"(?:who wrote|introduction to|intro to|introducing|background (?:to|of)|overview of|when was|why was)\s+(?:the (?:book|letter|gospel|epistle) of\s+)?([1-3]?\s?[a-z][a-z ]+?)(?:\s+written)?\s*\??$", re.I)


def grammar_term(q):
    words = re.findall(r"[a-z]+", (q or "").lower())
    for w in words:
        if w in _GRAMMAR_SURE and _GRAMMAR_SURE[w]:
            return _GRAMMAR_SURE[w]
    if _GRAMMAR_CONTEXT.search(q or ""):
        for w in words:
            if w in _GRAMMAR_MAYBE:
                return _GRAMMAR_MAYBE[w]
    return None


WORD_RE = re.compile(r"(?:(greek|hebrew)\s+(?:word\s+)?(?:for|meaning)\s+(.+)|what (?:is|was) the (greek|hebrew) (?:word\s+)?for\s+(.+)|(?:what does|meaning of)\s+(?:the word\s+)?([a-zA-Zāēīōū·]+)\s+mean)", re.I)
SERMON_RE = re.compile(r"(?:sermons?|talks?|messages?|preach(?:ing|ed)?)\s+(?:on|about|from|through)\s+(.+)", re.I)
WHO_RE = re.compile(r"^(?:who (?:was|is|were)|tell me about)\s+(.+?)\??$", re.I)
WHERE_PLACE_RE = re.compile(r"^where (?:was|is)\s+(.+?)\??$", re.I)

SERVICE_TIME_RE = re.compile(r"(what time|when).{0,25}(church|service|sunday|meet|start)|(service|church) times?|sunday service|when do you meet|what time is church", re.I)
WHERE_CHURCH_RE = re.compile(r"(where|address|directions|postcode|location|parking|park\b|get there|how do i get)", re.I)
WHATS_ON_RE = re.compile(r"(what'?s on|whats happening|what is happening|coming up|next event|events? (this|next) week|this week|upcoming|anything on)", re.I)
LIVE_RE = re.compile(r"\b(live|livestream|streaming)\b", re.I)
GREETING_RE = re.compile(r"^\s*(hi|hello|hey|hiya|good (morning|afternoon|evening)|yo)\b[\s!.]*$", re.I)
THANKS_RE = re.compile(r"^\s*(thanks|thank you|cheers|ta|great|perfect|brilliant|lovely)\b", re.I)
HELP_RE = re.compile(r"^\s*(help|what can you do|how does this work|what are you)\??\s*$", re.I)

CRISIS_RE = re.compile(r"\b(kill (?:myself|me)|suicid\w*|end (?:my life|it all)|self[- ]?harm\w*|hurt myself|want to die|don'?t want to (?:live|be here))\b", re.I)

SUGGESTIONS = ["When is church?", "Open the Bible", "I'd like prayer", "What's on this week?",
               "Greek word for love", "How do I join a group?"]


def respond(query, ctx):
    """Work out what someone wants. `ctx` gives live facts and lookups:
    url(endpoint, **kw), facts(), upcoming(), live_now(), library_find(q),
    lexicon(q), feeling_label(slug), ai_available.

    Returns {"reply", "links": [{title, url, about}], "go": url|None,
             "confident": bool, "suggest": [...]}"""
    q = (query or "").strip()[:300]
    url = ctx["url"]

    def link(pid, title=None, about=None, **extra):
        p = PLACES_BY_ID[pid]
        kw = dict(p[3]); kw.update(extra)
        return {"title": title or p[1], "url": url(p[2], **kw), "about": about if about is not None else p[4]}

    def out(reply, links=(), go=None, confident=True, suggest=None):
        return {"reply": reply, "links": list(links)[:4], "go": go, "confident": confident,
                "suggest": suggest or []}

    if not q:
        return out("Hello! Ask me anything about the app, or where to find something. You can type or tap the microphone.",
                   suggest=SUGGESTIONS)
    nav = bool(NAV_RE.search(q))

    # Someone in distress gets people, not pages.
    if CRISIS_RE.search(q) or feeling_in(q) == "hopeless":
        return out("I'm really glad you said something. Please talk to someone today. "
                   "If you might act on thoughts of ending your life, call 999 now. "
                   "Samaritans are there day and night on 116 123, free. "
                   "And our pastors would want to know: you can reach them here.",
                   [link("contact", about="Reach a pastor"),
                    {"title": "Words for when it feels hopeless", "url": url("feeling_page", slug="hopeless"), "about": "Scripture and help, gently"}],
                   suggest=["Ask for prayer"])

    if ctx["needs_a_person"](q):
        return out("That deserves a proper conversation with someone who knows you, not an answer from an app. "
                   "Please talk to one of our pastors. If anyone is in danger, call 999.",
                   [link("contact", about="Reach a pastor, or our safeguarding lead"),
                    link("prayer_new", about="Ask privately for prayer, just to the pastors")])

    if GREETING_RE.match(q):
        return out("Hello! What can I help you find?", suggest=SUGGESTIONS)
    if THANKS_RE.match(q) and len(q) < 30 and not grammar_term(q):
        return out("You're welcome. Anything else?", suggest=SUGGESTIONS[:3])
    if HELP_RE.match(q):
        return out("I can take you anywhere in the app. Try a Bible reference like “John 3:16”, a question like "
                   "“when is church?”, or a page like “prayer wall”. You can also say how you're feeling.",
                   suggest=SUGGESTIONS)

    # A Bible passage to read.
    r = reference_in(q)
    if r:
        kw = {"book_slug": r["slug"], "chapter": r["chapter"]}
        n = ctx.get("verse_count", lambda *a: None)(r["slug"], r["chapter"])
        if r.get("verse") and n and r["verse"] > n:
            r = dict(r, verse=None, label=refs.label(r["slug"], r["chapter"]))  # no such verse: open the chapter
        if r.get("verse"):
            kw["v"] = r["verse"]
        go = url("bible_read_chapter", **kw)
        links = [{"title": r["label"], "url": go, "about": "Open in the Bible"}]
        if r.get("verse"):
            links.append({"title": f"Study {r['label']}", "url": url("verse_page", book_slug=r["slug"], chapter=r["chapter"], verse=r["verse"]),
                          "about": "Other translations, Greek or Hebrew, cross references"})
        return out(f"Opening {r['label']}.", links, go=go)

    facts = ctx["facts"]()

    # Facts people ask for most.
    if SERVICE_TIME_RE.search(q):
        extra = "".join(f" {w['when']}: {w['what'].split(':')[0]}." for w in facts.get("weekly", []))
        return out(f"{facts['service_times']}.{extra}", [link("visit", about="Address, parking and what to expect"), link("calendar")])
    if WHERE_CHURCH_RE.search(q) and re.search(r"church|you|service|meet|sunday|building|venue|parking|park", q, re.I):
        addr = facts.get("address")
        reply = f"We meet at {addr}." if addr else "Everything about getting here is on the Plan your visit page."
        if facts.get("parking") and re.search(r"park", q, re.I):
            reply += " " + facts["parking"]
        return out(reply, [link("visit", about="Maps, parking and what to expect")])
    if LIVE_RE.search(q) and re.search(r"watch|live|stream|on now|service", q, re.I):
        if ctx["live_now"]():
            return out("We're live right now.", [link("live", about="Watch now")], go=url("watch_hub") if nav else None)
        return out("We're not live at the moment. Sunday's service is streamed, and past talks are on Watch.", [link("watch")])
    if WHATS_ON_RE.search(q):
        items = ctx["upcoming"]()
        if items:
            lines = "; ".join(f"{i['when']}: {i['title']}" for i in items[:3])
            return out(f"Coming up: {lines}.", [link("calendar")])
        return out("There's nothing on the calendar just yet.", [link("calendar")])

    # How someone's feeling.
    slug = feeling_in(q)
    if slug:
        label = ctx["feeling_label"](slug)
        return out(f"I'm sorry it's like that{' today' if slug not in ('thankful', 'joyful') else ''}. Here are some words from the Bible for when you're feeling {label.lower()}."
                   if slug not in ("thankful", "joyful") else f"That's good to hear! Here's something for when you're feeling {label.lower()}.",
                   [{"title": f"Feeling {label.lower()}", "url": url("feeling_page", slug=slug), "about": "Scripture, a prayer and a next step"},
                    link("prayer_new", about="We'd love to pray for you")])

    # "Who wrote Romans?", "introduction to Ruth" -> that book's introduction.
    m = INTRO_RE.search(q)
    if m:
        f = refs.parse(m.group(1).strip(" ?.!") + " 1")
        if f:
            name = f.get("name") or m.group(1).strip(" ?.!").title()
            return out(f"Here's an introduction to {name}: who wrote it, when and why.",
                       [{"title": f"Introducing {name}", "url": url("book_intro", book_slug=f["slug"]), "about": "Author, date, setting and what to look for"},
                        {"title": f"Study notes on {name} 1", "url": url("notes_chapter", book_slug=f["slug"], chapter=1), "about": "Verse by verse"}],
                       go=url("book_intro", book_slug=f["slug"]) if nav else None)

    # Grammar terms: "what does aorist mean", "what is a participle".
    g = grammar_term(q)
    if g:
        e = grammar_guide.ENTRIES[g]
        return out(f"{e['term']}: {e['short']}. {e['body']}",
                   [{"title": f"{e['term']} in Grammar, simply", "url": url("grammar_page") + "#" + g, "about": f"With an example from {e['ref']}"},
                    link("grammar")], go=(url("grammar_page") + "#" + g) if nav else None)

    # Greek and Hebrew.
    m = WORD_RE.search(q)
    if m:
        lang = (m.group(1) or m.group(3) or "").title() or None
        term = (m.group(2) or m.group(4) or m.group(5) or "").strip(" ?.!'\"")
        hits = ctx["lexicon"](term, lang) if term else []
        if hits:
            w = hits[0]
            links = [{"title": f"{w['word']} ({w['translit']})", "url": url("word_page", code=w["strong"]),
                      "about": f"{w['language']}: {w['meaning']}, used {w['count']} times"}]
            links.append({"title": f"All words for “{term}”", "url": url("words_hub", q=term, **({"lang": lang} if lang else {})),
                          "about": "Every Greek and Hebrew match"})
            return out(f"The main {w['language']} word for “{term}” is {w['word']} ({w['translit']}), meaning “{w['meaning']}”.", links)
        return out("Here's where to look up the Greek and Hebrew.", [link("words")])

    # Sermons on a subject.
    m = SERMON_RE.search(q)
    if m:
        term = m.group(1).strip(" ?.!")
        return out(f"Here are talks on “{term}”.", [{"title": f"Talks on {term}", "url": url("watch_hub", q=term), "about": "From the Watch tab"}],
                   go=url("watch_hub", q=term) if nav else None)

    # What the Bible says about something.
    m = TOPIC_RE.search(q)
    if m:
        term = m.group(1).strip(" ?.!")
        found = ctx["library_find"](term)
        links = [x for x in found if x["kind"] == "Topic"][:2]
        links.append({"title": f"Verses about {term}", "url": url("bible_search", q=term), "about": "Search the whole Bible"})
        fs = feeling_in("i feel " + term)
        if fs:
            links.insert(0, {"title": f"Feeling {ctx['feeling_label'](fs).lower()}", "url": url("feeling_page", slug=fs), "about": "Scripture for when you feel like this"})
        return out(f"Here's what the Bible says about {term}.", [{"title": x["title"], "url": x["url"], "about": x.get("about", "")} for x in links])

    # A person or place in the Bible.
    m = WHO_RE.match(q) or WHERE_PLACE_RE.match(q)
    if m:
        term = re.sub(r"^(the|a)\s+", "", m.group(1).strip(" ?.!"), flags=re.I)
        found = [x for x in ctx["library_find"](term) if x["kind"] in ("Person", "Place", "Dictionary")]
        if found:
            best = found[0]
            return out(f"Here's {best['title']}.", [{"title": x["title"], "url": x["url"], "about": x["kind"]} for x in found[:3]],
                       go=best["url"] if nav else None)

    # Pages.
    scored = score_places(q)
    if scored:
        top_score, top_id = scored[0]
        second = scored[1][0] if len(scored) > 1 else 0
        links = [link(pid) for _, pid in scored[:3]]
        clear = top_score >= 3 and top_score >= second + 1.5
        if clear:
            p = PLACES_BY_ID[top_id]
            return out(f"{p[1]}: {p[4]}" if not nav else f"Opening {p[1]}.", links, go=links[0]["url"] if nav else None)
        if top_score >= 1.5:
            return out("Is it one of these?", links, confident=False)

    # Nothing obvious: maybe it's a name or a word in the Library.
    found = ctx["library_find"](q)
    if found and len(q) <= 40:
        return out("I found these in the Library.", [{"title": x["title"], "url": x["url"], "about": x["kind"]} for x in found[:3]], confident=False)

    return out("I'm not sure where that is. You could search the Bible for it, or ask a pastor.",
               [{"title": f"Search the Bible for “{q[:40]}”", "url": url("bible_search", q=q[:80]), "about": "Verses that mention it"},
                link("ask", about="Send your question to the pastors")],
               confident=False, suggest=SUGGESTIONS[:4])


def catalogue_for_ai():
    """The page list the AI may choose from (ids only, so it can't invent URLs)."""
    return "\n".join(f"{p[0]}: {p[1]} - {p[4]}" for p in PLACES)
