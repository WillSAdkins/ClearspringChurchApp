"""
Words for the guided prayer pages: "Pray now" and the prayer practices.

The prompts are the app's own; the Scripture is the World English Bible
(public domain), filled in when a page is shown. Practices like Lectio Divina
and the Examen are centuries old and free for anyone to use.
"""

from datetime import date

# Psalms and passages of praise, one per day in turn.
PRAISE = ["Psalm 145:1-3", "Psalm 103:1-5", "Psalm 95:1-7", "Psalm 100:1-5", "Psalm 34:1-3", "Psalm 63:1-4",
          "Psalm 96:1-4", "Psalm 8:1-4", "Psalm 113:1-4", "Psalm 146:1-2", "Isaiah 40:28-31", "Revelation 4:11",
          "Psalm 36:5-9", "Psalm 92:1-4", "Lamentations 3:22-24", "Psalm 121:1-8", "Psalm 147:1-5"]

NAMES_OF_GOD = ["Father", "Shepherd", "Rock", "Refuge", "Redeemer", "Light", "Saviour", "Prince of Peace",
                "Wonderful Counsellor", "Bread of Life", "Good Shepherd", "Comforter", "Faithful", "Holy One",
                "The Lord who provides", "The Lord who heals", "Friend", "King"]

SESSION_SCRIPTURE = {
    "still": "Psalm 46:10",
    "search": "Psalm 139:23-24",
    "forgiven": "1 John 1:9",
    "lords_prayer": "Matthew 6:9-13",
    "blessing": "Numbers 6:24-26",
}


def praise_for_today(d=None):
    d = d or date.today()
    return PRAISE[d.toordinal() % len(PRAISE)]


# ------------------------------------------------------------------ practices

PRACTICES = [
    {
        "slug": "lectio-divina",
        "title": "Lectio Divina",
        "emoji": "📖",
        "minutes": "15–20",
        "summary": "“Divine reading”: read a short passage slowly, several times, and let God speak through it.",
        "about": "An ancient way of reading the Bible prayerfully, practised since the early church. Rather than reading a lot, you read a little, slowly, and listen.",
        "choose_passage": ["Psalm 23:1-6", "John 15:1-11", "Isaiah 40:28-31", "Matthew 11:28-30", "Philippians 4:4-9",
                           "Psalm 139:1-12", "Luke 10:38-42", "Isaiah 43:1-3", "Romans 8:31-39", "Mark 4:35-41",
                           "John 21:15-19", "Psalm 62:1-8", "Colossians 3:12-17", "1 Kings 19:9-13"],
        "steps": [
            {"title": "Settle", "body": "Sit comfortably. Breathe slowly. Ask the Holy Spirit to speak to you as you read.", "timer": 60},
            {"title": "Read", "body": "Read the passage slowly, perhaps aloud. Notice any word or phrase that catches your attention.", "passage": True},
            {"title": "Reflect", "body": "Read it again. Stay with the word or phrase that stood out. Why might it matter to you today?", "passage": True, "input": "The word or phrase that stood out", "timer": 120},
            {"title": "Respond", "body": "Read it a third time. Now talk to God about it, honestly, in your own words. Thanks, questions, a request: whatever rises in you.", "passage": True, "input": "Your prayer"},
            {"title": "Rest", "body": "Stop talking. Simply be with God, who is with you. If your mind wanders, gently return to the word you were given.", "timer": 180},
            {"title": "Go", "body": "Is there one small thing this passage is asking of you today? Carry the word with you.", "input": "One thing to carry into today"},
        ],
    },
    {
        "slug": "examen",
        "title": "The Examen",
        "emoji": "🌙",
        "minutes": "10–15",
        "summary": "A prayerful look back over your day: where was God, and how did you respond?",
        "about": "A simple evening prayer taught by Ignatius of Loyola in the 1500s, and loved by Christians of many traditions since. It helps you notice God in the ordinary.",
        "steps": [
            {"title": "God is here", "body": "Become aware that God is with you now. Ask him to help you see your day as he sees it, with honesty and with love.", "timer": 45, "scripture": "Psalm 139:1-3"},
            {"title": "Give thanks", "body": "Look back over the day, hour by hour. What were the gifts? A conversation, a meal, a kindness, a moment of beauty. Thank God for each.", "input": "Today I’m thankful for…", "thanks": True},
            {"title": "Notice your feelings", "body": "When did you feel most alive, most at peace? When were you anxious, frustrated or low? Don’t judge. Just notice, and tell God.", "input": "What I noticed"},
            {"title": "Pray from one moment", "body": "Choose one moment from the day that stands out. Pray about it: give thanks, say sorry, or ask for help.", "input": "My prayer about it"},
            {"title": "Look to tomorrow", "body": "Think about tomorrow. What are you looking forward to, and what are you dreading? Ask God for what you need.", "input": "For tomorrow, I ask…"},
            {"title": "Close", "body": "End by praying the Lord’s Prayer, slowly.", "scripture": "Matthew 6:9-13"},
        ],
    },
    {
        "slug": "breath-prayer",
        "title": "Breath prayer",
        "emoji": "🌬️",
        "minutes": "3–10",
        "summary": "Pray one short line, slowly, in time with your breathing.",
        "about": "Christians have prayed short, repeated prayers for centuries. The best known is the Jesus Prayer. Breathe in on the first half, out on the second.",
        "breath": [
            ["Lord Jesus Christ, Son of God,", "have mercy on me."],
            ["Be still,", "and know that I am God."],
            ["The Lord is my shepherd;", "I shall lack nothing."],
            ["Abba, Father,", "I belong to you."],
            ["Come, Holy Spirit,", "fill me again."],
            ["My grace", "is enough for you."],
        ],
    },
    {
        "slug": "lords-prayer",
        "title": "The Lord’s Prayer, line by line",
        "emoji": "🙏",
        "minutes": "10",
        "summary": "Slow down the prayer Jesus taught, and let each line lead you into your own prayer.",
        "about": "Jesus gave his friends this prayer as a pattern (Matthew 6:9–13). Here you pray it a line at a time, pausing to fill each line with your own words.",
        "steps": [
            {"title": "Our Father in heaven,", "body": "You are praying to a Father who loves you, and who is over all things. Thank him that you can come to him as his child.", "timer": 60},
            {"title": "may your name be kept holy.", "body": "Praise God for who he is. What do you love about him? Name it.", "input": "I praise you for…"},
            {"title": "Let your Kingdom come. Let your will be done, as in heaven, so on earth.", "body": "Where do you long to see God’s goodness and justice: in the world, in your town, in the people you love, in you?", "input": "Your kingdom come in…"},
            {"title": "Give us today our daily bread.", "body": "Ask for what you need today: practical things, strength, wisdom. Nothing is too ordinary.", "input": "Today I need…"},
            {"title": "Forgive us our debts, as we also forgive our debtors.", "body": "Is there anything to say sorry for? And is there anyone you need to forgive, or to begin to forgive?", "timer": 60},
            {"title": "Bring us not into temptation, but deliver us from the evil one.", "body": "Where are you vulnerable right now? Ask God to guard you and lead you on a good path.", "timer": 45},
            {"title": "For yours is the Kingdom, the power, and the glory forever. Amen.", "body": "Finish with trust: it’s his kingdom, his power, his glory. Pray the whole prayer through once more.", "scripture": "Matthew 6:9-13"},
        ],
    },
    {
        "slug": "praying-the-psalms",
        "title": "Praying a Psalm",
        "emoji": "🎵",
        "minutes": "10",
        "summary": "The Psalms are the Bible’s prayer book. Read one, then pray it back to God in your own words.",
        "about": "Jesus prayed the Psalms, and the church always has. They give us words for joy, grief, anger, fear and praise: every part of life.",
        "choose_passage": ["Psalm 23", "Psalm 13", "Psalm 16", "Psalm 27", "Psalm 31", "Psalm 32", "Psalm 42", "Psalm 46",
                           "Psalm 51", "Psalm 62", "Psalm 63", "Psalm 84", "Psalm 86", "Psalm 90", "Psalm 91", "Psalm 103",
                           "Psalm 121", "Psalm 130", "Psalm 131", "Psalm 139", "Psalm 145"],
        "steps": [
            {"title": "Read", "body": "Read the psalm slowly, as a prayer.", "passage": True},
            {"title": "Which line is yours?", "body": "Which line could be your own prayer today? Read the psalm again and find it.", "passage": True, "input": "The line that’s mine today"},
            {"title": "Pray it back", "body": "Now pray that line back to God in your own words, about your own life.", "input": "My prayer"},
            {"title": "Pray it for others", "body": "Who else needs this psalm today? Pray its words for them.", "timer": 60},
        ],
    },
    {
        "slug": "scripture-prayers",
        "title": "Pray the Bible for someone",
        "emoji": "💌",
        "minutes": "5",
        "summary": "Pray the prayers Paul prayed for his friends, with the name of someone you love.",
        "about": "Paul’s letters are full of prayers for the people he loved. They are good prayers to pray for anyone. Type a name and pray each one for them.",
        "name_prayers": [
            {"ref": "Ephesians 1:17-19", "text": "Father of glory, give {name} a spirit of wisdom and revelation, so that {name} may know you better. Open the eyes of {name}’s heart to see the hope you have called them to, and how great your power is for those who believe."},
            {"ref": "Ephesians 3:16-19", "text": "Father, out of your riches strengthen {name} with power through your Spirit in their inner being. May Christ live in {name}’s heart through faith. Root them and ground them in love, and help {name} grasp how wide and long and high and deep is the love of Christ."},
            {"ref": "Philippians 1:9-11", "text": "Lord, may {name}’s love overflow more and more, with knowledge and good judgement, so that {name} can tell what really matters, and be pure and blameless, full of the good things that come through Jesus, to your glory."},
            {"ref": "Colossians 1:9-12", "text": "God, fill {name} with the knowledge of your will, in all spiritual wisdom and understanding. Help {name} live a life worthy of you, pleasing you in every way, bearing fruit, growing in knowing you, strengthened with all power for patience and joy, and giving thanks to you."},
            {"ref": "2 Thessalonians 1:11-12", "text": "Our God, count {name} worthy of your calling. By your power, bring to completion every good desire and work of faith in {name}’s life, so that the name of the Lord Jesus is honoured in them, and they in him."},
            {"ref": "Numbers 6:24-26", "text": "The Lord bless {name} and keep them. The Lord make his face shine on {name}, and be gracious to them. The Lord turn his face toward {name}, and give them peace."},
        ],
    },
]

PRACTICES_BY_SLUG = {p["slug"]: p for p in PRACTICES}


def scripture_refs(practice):
    """Every Scripture reference a practice uses, so the page can embed them."""
    out = []
    for s in practice.get("steps", []):
        if s.get("scripture"):
            out.append(s["scripture"])
    for n in practice.get("name_prayers", []):
        out.append(n["ref"])
    return out
