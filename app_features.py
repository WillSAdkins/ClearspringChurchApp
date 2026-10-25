"""Feature tips: the app advertising itself.

Each tip is a small pop-up that points someone to a part of the app they
haven't tried yet. They show on the main tabs, at most one pop-up per visit
and one tip every few days (staff choose how often in Admin → Pop-ups). A
tip is skipped for good once the person has tried that feature (the "used"
check runs on their phone, from what the app already keeps there) or has
seen it twice.

Church notices and sponsor pop-ups scheduled in Admin always come first.

Fields:
  id        stable key (also used for the anonymous show/tap counts)
  emoji     shown large at the top of the card
  title     a short headline
  body      one or two sentences: what it is, and why it's worth a look
  button    the button's words
  endpoint  where the button goes (url_for), with kwargs
  used      the name of a check in static/popups.js ("" = never counts as used)
  audience  "everyone" | "guests" | "members"
"""

FEATURES = [
    {"id": "prayer-list", "emoji": "🙏", "title": "Keep a prayer list",
     "body": "Add the people and things you pray for, and get a few cards each day so everyone comes round in turn. Mark prayers answered and look back.",
     "button": "Start my list", "endpoint": "prayer_journal", "used": "prayerList"},
    {"id": "courses", "emoji": "🎓", "title": "Free courses, at your own pace",
     "body": "Short courses on the Bible, what Christians believe, prayer and church history, from teachers we trust. We’ll keep your place.",
     "button": "Browse courses", "endpoint": "watch_learn", "used": "courses"},
    {"id": "audio-bible", "emoji": "🎧", "title": "Listen to the Bible",
     "body": "The whole Bible read aloud. It keeps going chapter after chapter with your phone locked: good for the car or a walk.",
     "button": "Start listening", "endpoint": "bible_listen", "used": "listen"},
    {"id": "reading-plans", "emoji": "📅", "title": "Read the Bible with a plan",
     "body": "Pick a plan, from a few weeks in a Gospel to the whole Bible in a year, and the app keeps track of where you’re up to.",
     "button": "See the plans", "endpoint": "reading_plans", "used": "plans"},
    {"id": "notifications", "emoji": "🔔", "title": "Hear what’s happening",
     "body": "Choose reminders and news: Sunday’s talk, events, prayer times, a nudge to read. Only what you pick, and you can change it any time.",
     "button": "Choose notifications", "endpoint": "notification_settings", "used": "notifications"},
    {"id": "pray-now", "emoji": "🕊️", "title": "Five quiet minutes with God",
     "body": "A gentle guide to pray: be still, give thanks, say sorry, pray for others. Choose 5 or 10 minutes, or take your time.",
     "button": "Pray now", "endpoint": "prayer_session", "used": "prayed"},
    {"id": "memorise", "emoji": "🧠", "title": "Learn a verse by heart",
     "body": "Short daily practice that fixes a verse in your memory, a word at a time.",
     "button": "Try it", "endpoint": "memorise_hub", "used": "memorise"},
    {"id": "sunday-notes", "emoji": "📝", "title": "Follow along on Sunday",
     "body": "This week’s passage, fill-in notes for the talk, and questions to talk over in your group afterwards.",
     "button": "Open Sunday notes", "endpoint": "sunday_page", "used": ""},
    {"id": "groups", "emoji": "👥", "title": "Your group, in your pocket",
     "body": "Share news and prayer requests with your small group, and follow a reading plan together.",
     "button": "See groups", "endpoint": "groups_index", "used": "", "audience": "members"},
    {"id": "save-verses", "emoji": "🔖", "title": "Save the verses that speak to you",
     "body": "Tap any verse as you read to highlight it, save it or add a note. Everything you keep is in My study.",
     "button": "Open the Bible", "endpoint": "bible_hub", "used": "saved"},
    {"id": "classics", "emoji": "📚", "title": "A library of classic books",
     "body": "Bunyan, Augustine, Spurgeon and more, free to read in the app, a chapter at a time.",
     "button": "Visit the library", "endpoint": "classics_shelf", "used": "classics"},
    {"id": "games", "emoji": "🎮", "title": "Games for all ages",
     "body": "Bible quizzes, puzzles and Rock Slinger, the arcade game made by Finn from our church.",
     "button": "Play", "endpoint": "games_hub", "used": "games"},
    {"id": "account", "emoji": "☁️", "title": "Keep everything safe",
     "body": "Make a free account and your notes, saved verses, prayer list and progress follow you to any phone or computer.",
     "button": "Make an account", "endpoint": "signup", "used": "", "audience": "guests"},
]
BY_ID = {f["id"]: f for f in FEATURES}
OFTEN = {"2": "Every 2 days", "3": "Every 3 days", "7": "Once a week", "14": "Once a fortnight"}
