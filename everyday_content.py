"""
Words for everyday faith: verses for how you're feeling, before sleep, a
fasting guide, praying for the world, family devotions, and the church year.

DRAFT FOR CHECKING by Clearspring's leaders. Scripture is filled in from the
World English Bible (public domain) when a page is shown.
"""

from datetime import date, timedelta

# ------------------------------------------------------------------ how are you feeling?
# "urgent" feelings show where to find help straight away, above the verses.

FEELINGS = [
    {"slug": "anxious", "label": "Anxious", "emoji": "😟",
     "word": "Jesus doesn’t tell anxious people off. He invites them to bring their worries to a Father who knows what they need.",
     "verses": ["Philippians 4:6-7", "Matthew 6:31-34", "1 Peter 5:7", "Psalm 94:19", "Isaiah 41:10"],
     "prayer": "Father, here is what I’m worried about. I give it to you. Guard my heart with your peace."},
    {"slug": "afraid", "label": "Afraid", "emoji": "😨",
     "word": "“Do not be afraid” is one of the most repeated commands in the Bible, and it always comes with a reason: God is with you.",
     "verses": ["Psalm 23:4", "Isaiah 43:1-2", "Psalm 56:3-4", "Joshua 1:9", "2 Timothy 1:7"],
     "prayer": "Lord, I’m frightened. Be with me. Help me trust you one step at a time."},
    {"slug": "lonely", "label": "Lonely", "emoji": "🫥",
     "word": "Loneliness is real and painful, and God sees it. He promises never to leave you, and he puts lonely people in families.",
     "verses": ["Deuteronomy 31:8", "Psalm 68:5-6", "Psalm 25:16", "Matthew 28:20", "Hebrews 13:5"],
     "prayer": "God, I feel alone. Thank you that you are with me. Please bring people into my life.",
     "help": "Being part of a group can help. Ask on a Sunday, or get in touch through the app."},
    {"slug": "grieving", "label": "Grieving", "emoji": "💔",
     "word": "Jesus wept at his friend’s grave, even knowing what he was about to do. Grief is love with nowhere to go, and God is close to the broken-hearted.",
     "verses": ["Psalm 34:18", "John 11:33-36", "Matthew 5:4", "Revelation 21:4", "1 Thessalonians 4:13-14"],
     "prayer": "Lord, it hurts. Hold me in my grief, and hold the one I miss. Thank you for your promise of resurrection."},
    {"slug": "sad", "label": "Low", "emoji": "😔",
     "word": "Many of the Psalms are prayed from the bottom of a pit. You can be honest with God about how low you feel.",
     "verses": ["Psalm 42:11", "Psalm 40:1-3", "Psalm 13:1-6", "Matthew 11:28-30", "Lamentations 3:22-24"],
     "prayer": "God, I feel low and I don’t know why. Be my hope when I can’t find any.",
     "help": "If low feelings last for weeks, it’s worth talking to your GP. Getting help is wise, not a lack of faith."},
    {"slug": "angry", "label": "Angry", "emoji": "😠",
     "word": "Anger isn’t always wrong; God is angry at injustice. But anger needs bringing to God before it takes us somewhere we’ll regret.",
     "verses": ["Ephesians 4:26-27", "James 1:19-20", "Psalm 4:4", "Proverbs 15:1", "Romans 12:19"],
     "prayer": "Lord, I’m angry. You know why. Help me not to sin in it, and show me what to do."},
    {"slug": "guilty", "label": "Guilty", "emoji": "😞",
     "word": "God doesn’t want you to carry guilt for ever. Bring it to him honestly, and believe his promise to forgive.",
     "verses": ["1 John 1:9", "Psalm 103:10-12", "Romans 8:1", "Psalm 32:1-5", "Isaiah 1:18"],
     "prayer": "Father, I’m sorry. Thank you that Jesus has paid for this. Help me receive your forgiveness, and put right what I can."},
    {"slug": "tired", "label": "Tired", "emoji": "😩",
     "word": "Jesus invites the weary to come to him, not to try harder. Rest is part of God’s design, not a reward for finishing everything.",
     "verses": ["Matthew 11:28-30", "Isaiah 40:29-31", "Psalm 127:2", "Psalm 23:1-3", "Mark 6:31"],
     "prayer": "Jesus, I’m exhausted. I come to you. Give me rest, and the strength for what really matters today."},
    {"slug": "overwhelmed", "label": "Overwhelmed", "emoji": "🌊",
     "word": "When everything is too much, the Psalms point to a rock that is higher than we are.",
     "verses": ["Psalm 61:1-3", "Psalm 46:1-3", "2 Corinthians 4:8-9", "Isaiah 43:2", "Psalm 55:22"],
     "prayer": "God, it’s all too much. Be my rock. Show me the next small step."},
    {"slug": "doubting", "label": "Doubting", "emoji": "🤔",
     "word": "Doubt is not the opposite of faith. Jesus was patient with Thomas, and with the father who said, “Help my unbelief.”",
     "verses": ["Mark 9:24", "John 20:27-29", "Psalm 73:16-17", "Jude 1:22", "Matthew 11:2-6"],
     "prayer": "Lord, I believe. Help my unbelief. Meet me in my questions."},
    {"slug": "tempted", "label": "Tempted", "emoji": "⚠️",
     "word": "Being tempted isn’t sin; Jesus was tempted too. God promises a way out, and he understands.",
     "verses": ["1 Corinthians 10:13", "Hebrews 4:15-16", "James 4:7-8", "Matthew 26:41", "Psalm 119:9-11"],
     "prayer": "Jesus, you know this temptation. Give me strength to say no, and show me the way out."},
    {"slug": "waiting", "label": "Waiting", "emoji": "⏳",
     "word": "Much of the life of faith is waiting. The Bible is full of people who waited, and found God faithful.",
     "verses": ["Psalm 27:14", "Isaiah 40:31", "Lamentations 3:25-26", "Psalm 130:5-6", "Romans 8:24-25"],
     "prayer": "Lord, I’m waiting and it’s hard. Help me trust your timing, and your goodness."},
    {"slug": "thankful", "label": "Thankful", "emoji": "🙌",
     "word": "Gratitude is one of the simplest ways to worship. Say thank you, and let it overflow.",
     "verses": ["Psalm 100:4-5", "1 Thessalonians 5:16-18", "Psalm 103:1-5", "James 1:17", "Colossians 3:17"],
     "prayer": "Thank you, Father, for every good gift. I see your kindness today."},
    {"slug": "joyful", "label": "Joyful", "emoji": "😊",
     "word": "Joy is a gift from God. Enjoy it, and turn it into praise.",
     "verses": ["Psalm 16:11", "Philippians 4:4", "Nehemiah 8:10", "Psalm 126:2-3", "Zephaniah 3:17"],
     "prayer": "Lord, my heart is full. You are good. I praise you."},
    {"slug": "hopeless", "label": "Hopeless", "emoji": "🕳️", "urgent": True,
     "word": "If you feel there’s no way forward, please don’t carry this alone. God is close to the broken-hearted, and there are people who want to help you today.",
     "verses": ["Psalm 34:18", "Psalm 40:1-2", "Isaiah 42:3", "Romans 15:13", "Psalm 139:7-12"],
     "prayer": "God, I can’t see a way through. Hold on to me. Please send help."},
]

FEELINGS_BY_SLUG = {f["slug"]: f for f in FEELINGS}

# UK helplines. Church staff should check now and then that these are still current.
URGENT_HELP = [
    ("Samaritans", "116 123", "tel:116123", "Free, any time, day or night"),
    ("Shout", "text SHOUT to 85258", "sms:85258?body=SHOUT", "Free text support, any time"),
    ("NHS", "111", "tel:111", "Choose the mental health option"),
    ("Emergency", "999", "tel:999", "If you or someone else is in danger now"),
]

# ------------------------------------------------------------------ before sleep

NIGHT_PSALMS = ["Psalm 4", "Psalm 91:1-6", "Psalm 121", "Psalm 131", "Psalm 139:1-12", "Psalm 23", "Psalm 62:1-8",
                "Psalm 16", "Psalm 63:1-8", "Psalm 134", "Psalm 46", "Psalm 27:1-5", "Psalm 36:5-9", "Psalm 116:1-9"]

NIGHT_STEPS = [
    {"key": "settle", "title": "Be still",
     "body": "Put the day down. Breathe slowly. God is here, and he never sleeps."},
    {"key": "psalm", "title": "A psalm for tonight",
     "body": "Read it slowly. If a line stands out, stay with it."},
    {"key": "look", "title": "Look back",
     "body": "Where did you see God’s kindness today? Thank him. Is there anything to put right? Tell him, and leave it with him."},
    {"key": "give", "title": "Give it to God",
     "body": "Name the people and worries on your mind, one by one, and hand each to God for the night.",
     "verse": "Psalm 4:8"},
    {"key": "commit", "title": "Into your hands",
     "body": "Jesus prayed these words of trust as he died. Christians have prayed them at bedtime for centuries.",
     "verse": "Psalm 31:5"},
    {"key": "bless", "title": "Go to sleep in peace",
     "verse": "Numbers 6:24-26"},
]

# ------------------------------------------------------------------ fasting

FASTING_ABOUT = [
    "Fasting means going without something, usually food, for a time, to give your attention to God. Jesus assumed his followers would fast: he said “when you fast”, not “if” (Matthew 6:16).",
    "Fasting doesn’t earn God’s favour or twist his arm. It’s a way of saying, with your whole self, “I need you more than this.” The hunger becomes a reminder to pray.",
    "In the Bible, people fasted when they were seeking God’s guidance, grieving, repenting, facing danger, or setting people apart for his work.",
]

FASTING_VERSES = ["Matthew 6:16-18", "Isaiah 58:6-9", "Acts 13:2-3", "Joel 2:12-13", "Matthew 4:1-4"]

FASTING_SAFETY = (
    "Please don’t fast from food if you are pregnant or breastfeeding, have diabetes or another condition affected by "
    "eating, take medication that needs food, are under 18, are unwell, or have ever struggled with eating. "
    "If you’re not sure, ask your GP first. Fasting from something else, like your phone, social media or TV, "
    "is just as real a fast, and God welcomes it just as much."
)

FAST_KINDS = [
    {"key": "meal", "title": "Skip a meal", "about": "Use your lunch break, or the time you’d spend eating, to pray instead. A good first fast.", "food": True},
    {"key": "day", "title": "Daylight fast", "about": "No food from waking until the evening meal. Drink plenty of water.", "food": True},
    {"key": "simple", "title": "A simple fast", "about": "Eat plainly, like Daniel: no treats, no rich food, no snacks. For a few days or longer.", "food": True},
    {"key": "screen", "title": "Phone or social media", "about": "Put your phone away or delete an app for a set time. Every time you reach for it, pray.", "food": False},
    {"key": "other", "title": "Something else", "about": "TV, shopping, gaming, a habit you lean on. Choose something that will be a real gift of time to God.", "food": False},
]

FAST_STEPS = [
    ("Choose why", "What are you seeking God about? Write it down, so you remember why when it gets hard."),
    ("Plan it", "Decide what you’ll go without, and when you’ll start and stop. Start small; you can do more next time."),
    ("Fill the gap", "Plan what you’ll do with the time: read a psalm, pray through your list, take a walk with God."),
    ("Keep it quiet", "Jesus said to fast without drawing attention. Tell anyone who needs to know, and leave it there."),
    ("Break it gently", "End with thanks. If you’ve gone without food, eat something light first."),
]

FAST_DURING = ["Psalm 63:1-8", "Matthew 4:4", "Psalm 42:1-2", "John 4:34", "Psalm 27:4", "Isaiah 55:1-3", "John 6:35"]

# ------------------------------------------------------------------ praying for the world

WORLD_PROMPTS = [
    ("For its leaders", "That they would govern with justice, wisdom and care for the weakest.", "1 Timothy 2:1-2"),
    ("For the church there", "For Christians to be faithful, united and full of love, especially where following Jesus is costly.", "Ephesians 3:16-19"),
    ("For those who haven’t heard", "That people would hear the good news of Jesus, and respond.", "Romans 10:14-15"),
    ("For people in need", "For the poor, the sick, refugees, and anyone facing war, disaster or injustice.", "Psalm 146:7-9"),
    ("For people from there near you", "For anyone from this country living in Cheltenham or the UK: students, workers, families.", "Leviticus 19:34"),
]

COUNTRIES = [
    ('Afghanistan', 'AF'), ('Albania', 'AL'), ('Algeria', 'DZ'), ('Andorra', 'AD'), ('Angola', 'AO'),
    ('Antigua and Barbuda', 'AG'), ('Argentina', 'AR'), ('Armenia', 'AM'), ('Australia', 'AU'), ('Austria', 'AT'),
    ('Azerbaijan', 'AZ'), ('Bahamas', 'BS'), ('Bahrain', 'BH'), ('Bangladesh', 'BD'), ('Barbados', 'BB'),
    ('Belarus', 'BY'), ('Belgium', 'BE'), ('Belize', 'BZ'), ('Benin', 'BJ'), ('Bhutan', 'BT'), ('Bolivia', 'BO'),
    ('Bosnia and Herzegovina', 'BA'), ('Botswana', 'BW'), ('Brazil', 'BR'), ('Brunei', 'BN'), ('Bulgaria', 'BG'),
    ('Burkina Faso', 'BF'), ('Burundi', 'BI'), ('Cambodia', 'KH'), ('Cameroon', 'CM'), ('Canada', 'CA'),
    ('Cape Verde', 'CV'), ('Central African Republic', 'CF'), ('Chad', 'TD'), ('Chile', 'CL'), ('China', 'CN'),
    ('Colombia', 'CO'), ('Comoros', 'KM'), ('Costa Rica', 'CR'), ("Côte d'Ivoire", 'CI'), ('Croatia', 'HR'),
    ('Cuba', 'CU'), ('Cyprus', 'CY'), ('Czech Republic', 'CZ'), ('DR Congo', 'CD'), ('Denmark', 'DK'),
    ('Djibouti', 'DJ'), ('Dominica', 'DM'), ('Dominican Republic', 'DO'), ('Ecuador', 'EC'), ('Egypt', 'EG'),
    ('El Salvador', 'SV'), ('Equatorial Guinea', 'GQ'), ('Eritrea', 'ER'), ('Estonia', 'EE'), ('Eswatini', 'SZ'),
    ('Ethiopia', 'ET'), ('Fiji', 'FJ'), ('Finland', 'FI'), ('France', 'FR'), ('Gabon', 'GA'), ('Gambia', 'GM'),
    ('Georgia', 'GE'), ('Germany', 'DE'), ('Ghana', 'GH'), ('Greece', 'GR'), ('Grenada', 'GD'),
    ('Guatemala', 'GT'), ('Guinea', 'GN'), ('Guinea-Bissau', 'GW'), ('Guyana', 'GY'), ('Haiti', 'HT'),
    ('Honduras', 'HN'), ('Hungary', 'HU'), ('Iceland', 'IS'), ('India', 'IN'), ('Indonesia', 'ID'), ('Iran', 'IR'),
    ('Iraq', 'IQ'), ('Ireland', 'IE'), ('Israel', 'IL'), ('Italy', 'IT'), ('Jamaica', 'JM'), ('Japan', 'JP'),
    ('Jordan', 'JO'), ('Kazakhstan', 'KZ'), ('Kenya', 'KE'), ('Kiribati', 'KI'), ('Kuwait', 'KW'),
    ('Kyrgyzstan', 'KG'), ('Laos', 'LA'), ('Latvia', 'LV'), ('Lebanon', 'LB'), ('Lesotho', 'LS'),
    ('Liberia', 'LR'), ('Libya', 'LY'), ('Liechtenstein', 'LI'), ('Lithuania', 'LT'), ('Luxembourg', 'LU'),
    ('Madagascar', 'MG'), ('Malawi', 'MW'), ('Malaysia', 'MY'), ('Maldives', 'MV'), ('Mali', 'ML'),
    ('Malta', 'MT'), ('Marshall Islands', 'MH'), ('Mauritania', 'MR'), ('Mauritius', 'MU'), ('Mexico', 'MX'),
    ('Micronesia', 'FM'), ('Moldova', 'MD'), ('Monaco', 'MC'), ('Mongolia', 'MN'), ('Montenegro', 'ME'),
    ('Morocco', 'MA'), ('Mozambique', 'MZ'), ('Myanmar', 'MM'), ('Namibia', 'NA'), ('Nauru', 'NR'),
    ('Nepal', 'NP'), ('Netherlands', 'NL'), ('New Zealand', 'NZ'), ('Nicaragua', 'NI'), ('Niger', 'NE'),
    ('Nigeria', 'NG'), ('North Korea', 'KP'), ('North Macedonia', 'MK'), ('Norway', 'NO'), ('Oman', 'OM'),
    ('Pakistan', 'PK'), ('Palau', 'PW'), ('Palestine', 'PS'), ('Panama', 'PA'), ('Papua New Guinea', 'PG'),
    ('Paraguay', 'PY'), ('Peru', 'PE'), ('Philippines', 'PH'), ('Poland', 'PL'), ('Portugal', 'PT'),
    ('Qatar', 'QA'), ('Republic of the Congo', 'CG'), ('Romania', 'RO'), ('Russia', 'RU'), ('Rwanda', 'RW'),
    ('Saint Kitts and Nevis', 'KN'), ('Saint Lucia', 'LC'), ('Saint Vincent and the Grenadines', 'VC'),
    ('Samoa', 'WS'), ('San Marino', 'SM'), ('Sao Tome and Principe', 'ST'), ('Saudi Arabia', 'SA'),
    ('Senegal', 'SN'), ('Serbia', 'RS'), ('Seychelles', 'SC'), ('Sierra Leone', 'SL'), ('Singapore', 'SG'),
    ('Slovakia', 'SK'), ('Slovenia', 'SI'), ('Solomon Islands', 'SB'), ('Somalia', 'SO'), ('South Africa', 'ZA'),
    ('South Korea', 'KR'), ('South Sudan', 'SS'), ('Spain', 'ES'), ('Sri Lanka', 'LK'), ('Sudan', 'SD'),
    ('Suriname', 'SR'), ('Sweden', 'SE'), ('Switzerland', 'CH'), ('Syria', 'SY'), ('Taiwan', 'TW'),
    ('Tajikistan', 'TJ'), ('Tanzania', 'TZ'), ('Thailand', 'TH'), ('Timor-Leste', 'TL'), ('Togo', 'TG'),
    ('Tonga', 'TO'), ('Trinidad and Tobago', 'TT'), ('Tunisia', 'TN'), ('Turkey', 'TR'), ('Turkmenistan', 'TM'),
    ('Tuvalu', 'TV'), ('Uganda', 'UG'), ('Ukraine', 'UA'), ('United Arab Emirates', 'AE'),
    ('United Kingdom', 'GB'), ('United States', 'US'), ('Uruguay', 'UY'), ('Uzbekistan', 'UZ'), ('Vanuatu', 'VU'),
    ('Venezuela', 'VE'), ('Vietnam', 'VN'), ('Yemen', 'YE'), ('Zambia', 'ZM'), ('Zimbabwe', 'ZW'),
]


def flag(code):
    return "".join(chr(0x1F1E6 + ord(c) - 65) for c in code.upper())


def country_for(d=None):
    d = d or date.today()
    name, code = COUNTRIES[d.toordinal() % len(COUNTRIES)]
    return {"name": name, "code": code, "flag": flag(code)}


# ------------------------------------------------------------------ family devotions
# For the dinner table: a short reading, a sentence of the story, questions for
# younger and older children, a one-line prayer and something to do.

FAMILY = [
    {"title": "God makes everything", "read": "Genesis 1:1-25",
     "story": "God made light, sky, sea, land, plants and animals, just by speaking, and he said it was all good.",
     "little": "What’s your favourite thing God made?", "older": "What does creation tell us about what God is like?",
     "pray": "Thank you, God, for making such a wonderful world.", "do": "Go outside and find three things God made."},
    {"title": "Made like God", "read": "Genesis 1:26-31",
     "story": "God made people last of all, in his own image, to know him and look after his world.",
     "little": "Who made you?", "older": "What does it mean that everyone is made in God’s image? How should we treat people?",
     "pray": "Thank you, God, that you made me and you love me.", "do": "Say one kind thing to each person at the table."},
    {"title": "The snake’s lie", "read": "Genesis 3:1-13",
     "story": "Adam and Eve believed the snake instead of God, disobeyed him, and then hid.",
     "little": "Why did Adam and Eve hide?", "older": "What lie did the snake tell? Do we ever believe the same lie?",
     "pray": "God, help us to trust you and do what you say.", "do": "Talk about a time it was hard to own up."},
    {"title": "Noah and the rainbow", "read": "Genesis 9:8-17",
     "story": "After the flood, God put a rainbow in the sky as a sign of his promise.",
     "little": "What colours are in a rainbow?", "older": "Why do you think God made promises to people?",
     "pray": "Thank you, God, that you always keep your promises.", "do": "Draw a rainbow and write a promise of God on it."},
    {"title": "Count the stars", "read": "Genesis 15:1-6",
     "story": "God told old Abraham his family would be as many as the stars, and Abraham believed him.",
     "little": "Can you count the stars?", "older": "Why was it hard for Abraham to believe? What helped him?",
     "pray": "God, help us to believe you even when it seems impossible.", "do": "Look at the stars tonight if it’s clear."},
    {"title": "Joseph forgives", "read": "Genesis 45:1-15",
     "story": "Joseph’s brothers sold him as a slave, but years later he forgave them and saved their lives.",
     "little": "How do you think Joseph’s brothers felt?", "older": "Joseph said God meant it for good (Genesis 50:20). What does that mean?",
     "pray": "God, help us to forgive like Joseph did.", "do": "Is there anyone you need to say sorry to, or forgive?"},
    {"title": "Baby in a basket", "read": "Exodus 2:1-10",
     "story": "Moses’ mum hid him in a basket on the river, and God kept him safe.",
     "little": "Who found baby Moses?", "older": "How did God look after Moses through other people?",
     "pray": "Thank you, God, for looking after us and the people we love.", "do": "Name the people who look after you, and thank God for them."},
    {"title": "Through the sea", "read": "Exodus 14:21-31",
     "story": "God made a path through the sea so his people could escape from Egypt.",
     "little": "What did the water do?", "older": "What does this story tell us about how God rescues?",
     "pray": "God, you are strong enough to rescue us.", "do": "Act the story out, with a towel for the sea!"},
    {"title": "Ten good rules", "read": "Exodus 20:1-17",
     "story": "God gave his people ten commandments to show them how to love him and love each other.",
     "little": "Can you remember any of the ten?", "older": "Which commandment do you think is hardest to keep? Why?",
     "pray": "God, help us to love you and love each other.", "do": "Try to learn the commandments with your fingers."},
    {"title": "The walls fall down", "read": "Joshua 6:1-20",
     "story": "God’s people marched around Jericho, blew trumpets and shouted, and the walls fell down.",
     "little": "How many times did they march?", "older": "Why do you think God asked them to do something so strange?",
     "pray": "God, help us to trust you even when we don’t understand.", "do": "March round the table seven times."},
    {"title": "Ruth stays", "read": "Ruth 1:6-18",
     "story": "Ruth refused to leave her mother-in-law Naomi, and promised to follow her God.",
     "little": "Who did Ruth look after?", "older": "What does loyalty look like in our family?",
     "pray": "God, help us to be loyal and kind to each other.", "do": "Do something kind for an older person this week."},
    {"title": "Speak, Lord", "read": "1 Samuel 3:1-10",
     "story": "God called the boy Samuel in the night, and Samuel said, “Speak, for your servant is listening.”",
     "little": "How many times did God call Samuel?", "older": "How does God speak to us today?",
     "pray": "Speak, Lord. We’re listening.", "do": "Be quiet together for one minute and listen."},
    {"title": "David and the giant", "read": "1 Samuel 17:32-50",
     "story": "Young David trusted God and defeated the giant Goliath with a sling and a stone.",
     "little": "What did David use to fight Goliath?", "older": "What “giants” do we face? How can we trust God with them?",
     "pray": "God, help us to be brave because you are with us.", "do": "Talk about something that feels big and scary right now."},
    {"title": "The Lord is my shepherd", "read": "Psalm 23",
     "story": "David wrote a song about God looking after him like a shepherd looks after sheep.",
     "little": "What does a shepherd do?", "older": "Which line of the psalm do you like best? Why?",
     "pray": "Thank you, Lord, for being our shepherd.", "do": "Try to learn the first verse together."},
    {"title": "Fire from heaven", "read": "1 Kings 18:20-39",
     "story": "Elijah prayed and God sent fire from heaven, showing that he is the only true God.",
     "little": "What happened when Elijah prayed?", "older": "Why did the people need to choose?",
     "pray": "Lord, you are God. We choose to follow you.", "do": "Pray for someone you know who doesn’t know God yet."},
    {"title": "Daniel and the lions", "read": "Daniel 6:10-23",
     "story": "Daniel kept praying even when it was against the law, and God shut the lions’ mouths.",
     "little": "What did Daniel keep doing?", "older": "Why was Daniel willing to risk so much to pray?",
     "pray": "God, help us to keep praying, whatever happens.", "do": "Choose a time each day this week to pray as a family."},
    {"title": "Jonah runs away", "read": "Jonah 1:1-17",
     "story": "Jonah ran from God, but God sent a great fish to bring him back.",
     "little": "Where did Jonah end up?", "older": "Why did Jonah run away? Do we ever run from God?",
     "pray": "Thank you, God, that you never give up on us.", "do": "Read what happened next in Jonah 3."},
    {"title": "Jesus is born", "read": "Luke 2:1-20",
     "story": "Jesus was born in Bethlehem and laid in a manger, and angels told the shepherds the good news.",
     "little": "Where did baby Jesus sleep?", "older": "Why do you think God told shepherds first?",
     "pray": "Thank you, God, for sending Jesus.", "do": "Sing a carol together, whatever the time of year."},
    {"title": "Jesus calms the storm", "read": "Mark 4:35-41",
     "story": "Jesus told the wind and waves, “Be still!” and the storm stopped.",
     "little": "What did Jesus say to the storm?", "older": "What does this show us about who Jesus is?",
     "pray": "Jesus, when we’re scared, help us remember you are with us.", "do": "Share something that worries you, and pray about it."},
    {"title": "A boy’s lunch", "read": "John 6:1-14",
     "story": "Jesus fed five thousand people with one boy’s five loaves and two fish.",
     "little": "What was in the boy’s lunch?", "older": "What small thing could you give to Jesus?",
     "pray": "Jesus, take what we have and use it.", "do": "Share some of your food or toys with someone this week."},
    {"title": "The good Samaritan", "read": "Luke 10:25-37",
     "story": "A man from a group people hated stopped to help someone everyone else walked past.",
     "little": "Who stopped to help?", "older": "Who might be our “neighbour” that we usually walk past?",
     "pray": "Jesus, help us to love our neighbours.", "do": "Plan one way to help a neighbour."},
    {"title": "The lost sheep", "read": "Luke 15:1-7",
     "story": "A shepherd left ninety-nine sheep to find the one that was lost, and threw a party when he found it.",
     "little": "How many sheep were there?", "older": "What does this story tell us about how God feels about us?",
     "pray": "Thank you, God, that you came looking for us.", "do": "Play hide and seek, and talk about how it feels to be found."},
    {"title": "The son who came home", "read": "Luke 15:11-24",
     "story": "A son wasted everything and came home ashamed, but his father ran to hug him.",
     "little": "What did the dad do when he saw his son?", "older": "Why is it surprising that the father ran?",
     "pray": "Father God, thank you that you always welcome us home.", "do": "Give each other a big hug."},
    {"title": "Zacchaeus climbs a tree", "read": "Luke 19:1-10",
     "story": "Jesus went to tea with a cheating tax collector, and Zacchaeus’ whole life changed.",
     "little": "Why did Zacchaeus climb a tree?", "older": "What did Zacchaeus do to show he had changed?",
     "pray": "Jesus, thank you that you want to be our friend.", "do": "Who could you invite round for tea?"},
    {"title": "Let the children come", "read": "Mark 10:13-16",
     "story": "The disciples tried to send children away, but Jesus welcomed them and blessed them.",
     "little": "What did Jesus do with the children?", "older": "Why do you think Jesus said we must be like children?",
     "pray": "Thank you, Jesus, that you love children.", "do": "Each person put a hand on the next and pray a blessing."},
    {"title": "Washing feet", "read": "John 13:1-15",
     "story": "Jesus did the job of a servant and washed his friends’ dirty feet.",
     "little": "What did Jesus wash?", "older": "What does serving each other look like at home?",
     "pray": "Jesus, help us to serve each other like you did.", "do": "Each choose a job to do for someone else this week."},
    {"title": "Jesus dies", "read": "Luke 23:33-47",
     "story": "Jesus died on a cross, and even there he forgave the people who hurt him.",
     "little": "What did Jesus say about the people who hurt him?", "older": "Why did Jesus have to die?",
     "pray": "Thank you, Jesus, for loving us so much.", "do": "Be quiet for a moment and say thank you."},
    {"title": "He is risen!", "read": "Luke 24:1-12",
     "story": "The women found the tomb empty: Jesus was alive again!",
     "little": "What did the women find?", "older": "Why is Jesus coming back to life such good news?",
     "pray": "Jesus, you are alive! Thank you!", "do": "Shout “He is risen!” together."},
    {"title": "The Spirit comes", "read": "Acts 2:1-13",
     "story": "God sent his Holy Spirit like wind and fire, and the disciples told everyone about Jesus.",
     "little": "What did the Spirit sound like?", "older": "How does the Holy Spirit help us today?",
     "pray": "Holy Spirit, fill us and help us.", "do": "Blow bubbles or a windmill and talk about the Spirit’s power."},
    {"title": "Everything new", "read": "Revelation 21:1-5",
     "story": "One day God will make everything new, with no more crying, pain or sadness.",
     "little": "What won’t there be any more of?", "older": "What are you looking forward to most?",
     "pray": "Come, Lord Jesus. Make everything new.", "do": "Draw what you think the new creation will be like."},
]

# ------------------------------------------------------------------ the church year


def easter(year):
    """Western Easter Sunday (anonymous Gregorian algorithm)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def advent_sunday(year):
    xmas = date(year, 12, 25)
    last = xmas - timedelta(days=(xmas.weekday() + 1) % 7 or 7)
    return last - timedelta(days=21)


SEASONS = {
    "advent": {"name": "Advent", "colour": "purple", "plan": "advent",
               "about": "Four weeks of waiting and getting ready for Christmas: remembering how God’s people longed for the Messiah, and looking forward to Jesus coming again."},
    "christmas": {"name": "Christmas", "colour": "gold", "plan": None,
                  "about": "Twelve days of celebrating that God became one of us. The Word became flesh and lived among us."},
    "epiphany": {"name": "Epiphany", "colour": "gold", "plan": "life-of-jesus",
                 "about": "Jesus revealed to the world: the wise men, his baptism and his first miracles. A good season to read a Gospel."},
    "lent": {"name": "Lent", "colour": "purple", "plan": "lent-40",
             "about": "Forty days of preparing for Easter, remembering Jesus’ forty days in the wilderness. Many Christians pray more, fast and give."},
    "holy-week": {"name": "Holy Week", "colour": "red", "plan": None,
                  "about": "The last week of Jesus’ life, from his entry into Jerusalem to the cross and the tomb."},
    "easter": {"name": "Easter", "colour": "gold", "plan": "easter-50",
               "about": "Fifty days of celebrating that Jesus is risen, from Easter Sunday to Pentecost."},
    "pentecost": {"name": "Pentecost", "colour": "red", "plan": None,
                  "about": "The day the Holy Spirit came on the first Christians, and the church was born."},
    "ordinary": {"name": "Ordinary Time", "colour": "green", "plan": None,
                 "about": "The long green seasons of the church year: “ordinary” means counted, not dull. A time for steady growth."},
}

HOLY_WEEK = [
    (-7, "Palm Sunday", "Luke 19:28-40"),
    (-3, "Maundy Thursday", "John 13:1-15"),
    (-2, "Good Friday", "Luke 23:26-49"),
    (-1, "Holy Saturday", "Luke 23:50-56"),
    (0, "Easter Sunday", "Luke 24:1-12"),
]


def season_for(d=None):
    """The season today, with a countdown to the next big day where it helps."""
    d = d or date.today()
    e = easter(d.year)
    ash = e - timedelta(days=46)
    palm = e - timedelta(days=7)
    pent = e + timedelta(days=49)
    adv = advent_sunday(d.year)
    xmas = date(d.year, 12, 25)
    if d >= xmas or d <= date(d.year, 1, 5):
        key = "christmas"
    elif d >= adv:
        key = "advent"
    elif date(d.year, 1, 6) <= d <= date(d.year, 2, 2) and d < ash:
        key = "epiphany"
    elif ash <= d < palm:
        key = "lent"
    elif palm <= d < e:
        key = "holy-week"
    elif e <= d < pent:
        key = "easter"
    elif d == pent:
        key = "pentecost"
    else:
        key = "ordinary"
    s = dict(SEASONS[key], key=key)
    countdown = None
    if key == "advent":
        countdown = ("Christmas", (xmas - d).days)
    elif key == "lent":
        countdown = ("Easter", (e - d).days)
    elif key == "easter":
        countdown = ("Pentecost", (pent - d).days)
    elif key == "ordinary" and 0 < (adv - d).days <= 21:
        countdown = ("Advent", (adv - d).days)
    elif key == "ordinary" and 0 < (ash - d).days <= 21:
        countdown = ("Lent", (ash - d).days)
    s["countdown"] = countdown
    if key == "holy-week":
        for off, name, ref in HOLY_WEEK:
            if d == e + timedelta(days=off):
                s["today"] = {"name": name, "read": ref}
    if key == "easter" and d == e:
        s["today"] = {"name": "Easter Sunday", "read": "Luke 24:1-12"}
    if key == "pentecost":
        s["today"] = {"name": "Pentecost", "read": "Acts 2:1-21"}
    s["dates"] = {"ash": ash, "easter": e, "pentecost": pent, "advent": adv}
    return s


# Seasonal reading plans, added to the plan catalogue (see reading_plans.py).

_lent = ["Joel 2", "Psalms 51", "Matthew 4"]
for _n in range(1, 25):
    _lent.append(f"Luke {_n}")
    if _n in (4, 8, 12, 16, 20):
        _lent.append({4: "Psalms 32", 8: "Psalms 130", 12: "Isaiah 53", 16: "Psalms 22", 20: "Isaiah 55"}[_n])
_lent += ["Hebrews 4", "Hebrews 12", "Philippians 2", "Romans 5", "Lamentations 3", "Psalms 103", "Psalms 143", "Psalms 6"]

_easter = ["John 20", "John 21", "Luke 24", "1 Corinthians 15", "Acts 1"] + [f"Acts {n}" for n in range(3, 29)] + \
          ["Colossians 1", "Colossians 2", "Colossians 3", "Colossians 4", "1 Peter 1", "1 Peter 2", "1 Peter 3",
           "1 Peter 4", "1 Peter 5", "Romans 6", "Romans 8", "Ephesians 1", "Ephesians 2", "Ephesians 3", "Ephesians 4", "Ephesians 5", "Ephesians 6",
           "Revelation 21", "Acts 2"]

SEASONAL_PLANS = {
    "advent": {
        "title": "Advent: the promised King",
        "subtitle": "24 days of promises, from Genesis to Bethlehem",
        "emoji": "🕯️",
        "days": [[r] for r in ["Genesis 3", "Genesis 12", "2 Samuel 7", "Psalms 2", "Isaiah 7", "Isaiah 9", "Isaiah 11",
                               "Micah 5", "Jeremiah 23", "Isaiah 40", "Isaiah 42", "Isaiah 52", "Isaiah 53", "Psalms 72",
                               "Zechariah 9", "Isaiah 60", "Malachi 3", "Matthew 1", "John 1", "Philippians 2",
                               "Hebrews 1", "Galatians 4", "Luke 1", "Luke 2"]],
    },
    "lent-40": {
        "title": "Lent: the road to the cross",
        "subtitle": "40 days through Luke’s Gospel, with psalms and prophets",
        "emoji": "🌿",
        "days": [[r] for r in _lent],
    },
    "easter-50": {
        "title": "Easter to Pentecost",
        "subtitle": "50 days of resurrection life, ending with the Spirit",
        "emoji": "🌅",
        "days": [[r] for r in _easter],
    },
}

assert len(SEASONAL_PLANS["advent"]["days"]) == 24
assert len(SEASONAL_PLANS["lent-40"]["days"]) == 40, len(_lent)
assert len(SEASONAL_PLANS["easter-50"]["days"]) == 50, len(_easter)


def scripture_refs():
    out = []
    for f in FEELINGS:
        out += f["verses"]
    out += NIGHT_PSALMS + FASTING_VERSES + FAST_DURING
    out += [s["verse"] for s in NIGHT_STEPS if s.get("verse")]
    out += [p[2] for p in WORLD_PROMPTS]
    out += [f["read"] for f in FAMILY]
    out += [h[2] for h in HOLY_WEEK]
    return out
