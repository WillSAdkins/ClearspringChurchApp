"""
Words for the "Grow" section: first steps, the Foundations course, the growth
check-in, spiritual gifts, writing your story, a rhythm of life, and next steps.

DRAFT FOR CHECKING. These were written for Clearspring as a starting point and
should be read by the church's leaders before they're relied on. Everything
here is plain Python text so it can be edited without touching anything else:
change a sentence, save, redeploy. Scripture references are filled in with the
World English Bible (public domain) when a page is shown.

Links inside "try" lists use app endpoints, so they keep working if URLs move.
"""

# ------------------------------------------------------------------ first steps

FIRST_STEPS = [
    {
        "slug": "new-life",
        "title": "You belong to God",
        "emoji": "🌱",
        "verse": "2 Corinthians 5:17",
        "read": "John 1:1-14",
        "body": [
            "If you’ve put your trust in Jesus, something real has happened, whether or not you feel different today. The Bible says you have been forgiven, welcomed into God’s family, and given a new start.",
            "That doesn’t depend on how strong your faith feels, or how much you know. It depends on Jesus, and on what he has done. Feelings come and go; his promise doesn’t.",
            "So the first step is simply to rest in it. You are not on probation. You belong.",
        ],
        "try": [
            ("Read John 1:1–14 slowly. Underline anything that surprises you.", "bible_read_chapter", {"book_slug": "john", "chapter": 1}),
            ("Tell one person at church that you’ve started following Jesus.", None, None),
        ],
    },
    {
        "slug": "prayer",
        "title": "Talk with God",
        "emoji": "🙏",
        "verse": "Philippians 4:6-7",
        "read": "Matthew 6:5-13",
        "body": [
            "Prayer is talking with God. There are no special words to learn and no right voice to use. You can pray out loud or silently, kneeling, walking or lying in bed.",
            "Jesus gave his friends a pattern, the Lord’s Prayer, and it’s a good place to start. Praise God for who he is, ask for what you need today, say sorry for what’s gone wrong, and ask for help to live his way.",
            "Start small. A few honest minutes most days is better than a long prayer once in a while.",
        ],
        "try": [
            ("Try a few guided minutes of prayer.", "prayer_session", {}),
            ("Start a list of people you want to pray for.", "prayer_journal", {}),
        ],
    },
    {
        "slug": "bible",
        "title": "Listen to God",
        "emoji": "📖",
        "verse": "Psalm 119:105",
        "read": "2 Timothy 3:14-17",
        "body": [
            "God speaks to us through the Bible. It isn’t one book but a library of sixty-six, written over many centuries, and all of it points to Jesus.",
            "Don’t start at Genesis and push through. Start with one of the Gospels. Mark is short and fast; John is deeper and slower. Read a little and ask three questions: What does this show me about God? About people? What will I do about it?",
            "When something doesn’t make sense, that’s normal. Write it down and ask someone.",
        ],
        "try": [
            ("Start the 7-day “Starting with Jesus” reading plan.", "reading_plan_detail", {"plan_slug": "new-believer"}),
            ("Or read the Gospel of Mark, one chapter a day.", "bible_read_chapter", {"book_slug": "mark", "chapter": 1}),
        ],
    },
    {
        "slug": "church",
        "title": "You’re part of a family",
        "emoji": "🏡",
        "verse": "Hebrews 10:24-25",
        "read": "Acts 2:42-47",
        "body": [
            "Following Jesus was never meant to be done alone. When you trust him, you’re joined to his people, the church. It’s a family, not a building or a meeting.",
            "Families are imperfect. You’ll meet people you click with and people you don’t. That’s part of how God grows us: we learn to love, forgive and be forgiven.",
            "Come on Sundays as often as you can. And try to find a smaller group where people will know your name and pray for you.",
        ],
        "try": [
            ("See what’s on this week.", "calendar_page", {}),
            ("Find a group to be part of.", "ministries", {}),
        ],
    },
    {
        "slug": "baptism",
        "title": "Being baptised",
        "emoji": "💧",
        "verse": "Romans 6:4",
        "read": "Acts 8:26-39",
        "body": [
            "In the New Testament, people who came to trust Jesus were baptised, usually very soon afterwards. Baptism is a public sign of what God has done inside: going under the water pictures dying to the old life, and coming up pictures rising to new life with Jesus.",
            "Baptism doesn’t make you a Christian, and it isn’t a reward for being good enough. It’s a step of obedience and a joyful way to say “I belong to Jesus” in front of your church family.",
            "If you haven’t been baptised as a believer, talk to one of the leaders. They’d love to hear your story.",
        ],
        "try": [
            ("Find out about baptism at Clearspring.", "grow_next_steps", {}),
        ],
    },
    {
        "slug": "spirit",
        "title": "Living differently, with help",
        "emoji": "🕊️",
        "verse": "Galatians 5:22-23",
        "read": "John 14:15-27",
        "body": [
            "Jesus doesn’t leave us to change ourselves by willpower. He gives his Holy Spirit to everyone who trusts him: God himself, living in us, helping us pray, understand the Bible and become more like Jesus.",
            "Change is usually slow, like fruit growing on a tree. Some things may shift quickly; others will take years. That’s normal.",
            "Each morning, you can simply ask: “Holy Spirit, help me today.”",
        ],
        "try": [
            ("Learn Galatians 5:22–23 by heart.", "memorise_add", {"book_slug": "galatians", "chapter": 5, "verse": 22, "to": 23}),
        ],
    },
    {
        "slug": "failure",
        "title": "When you get it wrong",
        "emoji": "🤍",
        "verse": "1 John 1:9",
        "read": "Luke 15:11-24",
        "body": [
            "You will get things wrong. Every Christian does. Following Jesus doesn’t mean never failing; it means knowing where to go when you do.",
            "When you know you’ve done wrong, don’t hide from God. Tell him honestly, and trust his promise to forgive. Put things right with others where you can. Then get up and carry on.",
            "Guilt that drives you back to God is a gift. Shame that tells you you’re worthless is a lie. You are forgiven and loved.",
        ],
        "try": [
            ("Read the story Jesus told about a son who came home.", "bible_read_chapter", {"book_slug": "luke", "chapter": 15}),
        ],
    },
    {
        "slug": "telling",
        "title": "Telling others",
        "emoji": "💬",
        "verse": "1 Peter 3:15",
        "read": "John 4:28-42",
        "body": [
            "Good news is for sharing. You don’t need to be an expert; you only need to tell what you know: what Jesus has done for you.",
            "The woman in John 4 had met Jesus only that day. She went back to her town and said, “Come and see.” That’s still the best invitation.",
            "Be gentle and respectful. Listen more than you speak. Pray for the people you love, and be ready for the moment they ask.",
        ],
        "try": [
            ("Write your story in a few short paragraphs.", "grow_story", {}),
            ("Get some help with sharing your faith.", "faith_share", {}),
        ],
    },
]

# ------------------------------------------------------------------ course

COURSE = {
    "title": "Foundations",
    "subtitle": "Nine sessions on the heart of the Christian faith",
    "about": "For anyone new to faith, coming back to it, or wanting to be sure of the basics. Do it on your own, with a friend, or in a group. Each session has a passage to read, a short explanation, some questions and one thing to try this week.",
}

SESSIONS = [
    {
        "slug": "god",
        "title": "Who is God?",
        "read": "Isaiah 40:21-31",
        "memory": "Psalm 103:8",
        "body": [
            "Everyone has some picture of God, even if it’s a picture they’ve rejected: a distant force, a stern headmaster, a kindly grandfather. The Bible gives us God’s own self-portrait.",
            "He is the Creator, who made everything and is greater than all of it. The stars are named by him, and the nations are like a drop in a bucket. Yet the same God “gives power to the weak”. He is both far greater and far closer than we imagine.",
            "God is holy, which means utterly good, pure and other. He is also love. When Moses asked to see God’s glory, God described himself as “merciful and gracious, slow to anger, and abundant in loving kindness and truth” (Exodus 34:6).",
            "Christians believe in one God who exists eternally as Father, Son and Holy Spirit: the Trinity. We can’t fully picture it, and that shouldn’t surprise us. But it means that at the heart of reality there is relationship and love.",
        ],
        "questions": [
            "What picture of God did you grow up with?",
            "What in Isaiah 40 stands out to you about who God is?",
            "Which matters more to you right now: that God is great, or that God is near? Why?",
        ],
        "action": "Each day this week, thank God for one thing about who he is.",
        "prayer": "God, you are greater than I can imagine, and closer than I know. Show me who you really are.",
    },
    {
        "slug": "jesus",
        "title": "Who is Jesus?",
        "read": "Colossians 1:15-20",
        "memory": "John 14:6",
        "body": [
            "Jesus is the centre of the Christian faith. He was a real man who lived in first-century Israel, taught, healed, was executed by the Romans, and, his followers insisted, rose from the dead.",
            "But the New Testament claims far more than that he was a good teacher. Jesus forgave sins, accepted worship, and spoke as one with God the Father. Paul writes that he is “the image of the invisible God”: if you want to know what God is like, look at Jesus.",
            "Christians believe Jesus is fully God and fully human. He didn’t stop being God when he became a man, and he didn’t only appear to be human. He was hungry, tired and tempted, and he wept.",
            "C. S. Lewis pointed out that Jesus’ claims leave us few options. Either he was deluded, or deceiving people, or he is who he said he is. A merely “good teacher” is the one option he doesn’t leave open.",
        ],
        "questions": [
            "Before now, who did you think Jesus was?",
            "Which phrase in Colossians 1:15–20 stands out to you, and why?",
            "If Jesus really is God, what difference does that make?",
        ],
        "action": "Read one chapter of Mark’s Gospel each day this week. Notice how people react to Jesus.",
        "prayer": "Lord Jesus, I want to know you as you really are. Open my eyes.",
    },
    {
        "slug": "cross",
        "title": "Why did Jesus die?",
        "read": "Isaiah 53:3-6",
        "memory": "Romans 5:8",
        "body": [
            "The cross is the most recognisable Christian symbol. That’s strange when you think about it: it was an instrument of execution, designed to shame. Why do Christians put it at the centre?",
            "The Bible is honest about us. We have all turned away from God and gone our own way, which is what the Bible calls sin. It isn’t only the wrong things we do; it’s a heart that wants to run its own life. That breaks our relationship with God and damages everything else.",
            "God doesn’t shrug that off: he is just, and evil matters. But neither does he leave us. In Jesus, God himself came and took the consequences of our sin on himself. Isaiah wrote it centuries before: “he was wounded for our transgressions… by his wounds we are healed.”",
            "So the cross is where God’s justice and God’s love meet. It’s not an angry Father punishing an unwilling Son, but the Father, Son and Spirit together giving everything to bring us home.",
        ],
        "questions": [
            "How would you explain “sin” to a friend in everyday words?",
            "Isaiah 53 was written hundreds of years before Jesus. What do you notice in it?",
            "Romans 5:8 says Christ died for us “while we were still sinners”. Why does that matter?",
        ],
        "action": "Read Mark 15 slowly, then thank Jesus for what he did.",
        "prayer": "Jesus, thank you for taking what I deserved. I can’t repay it. Help me to live for you.",
    },
    {
        "slug": "resurrection",
        "title": "Did Jesus rise from the dead?",
        "read": "1 Corinthians 15:1-8",
        "memory": "1 Corinthians 15:20",
        "body": [
            "Everything hangs on this. Paul says plainly that if Christ has not been raised, Christian faith is useless. So it’s worth asking whether it really happened.",
            "Some facts are accepted by most historians, believing and not: Jesus died by crucifixion; his tomb was found empty; many people, including sceptics like his brother James and the persecutor Paul, were convinced they had met him alive; and his frightened followers were transformed into people willing to die for that claim.",
            "Alternative explanations, such as hallucinations, a stolen body or the wrong tomb, each struggle to account for all of these. The simplest explanation is the one the first Christians gave: God raised him.",
            "If it’s true, it changes everything. Jesus is who he said he was; death is not the end; and the future is new creation, not nothing.",
        ],
        "questions": [
            "What do you find most convincing about the evidence? What still puzzles you?",
            "Why do you think the first witnesses listed in the Gospels being women matters? (In that culture, their testimony wasn’t valued.)",
            "If Jesus is alive, what difference does that make to your week?",
        ],
        "action": "Read Luke 24. Imagine you are one of the two on the road to Emmaus.",
        "prayer": "Risen Jesus, you are alive. Let that hope fill my life.",
        "more": "faith_question:resurrection",
    },
    {
        "slug": "spirit",
        "title": "Who is the Holy Spirit?",
        "read": "John 14:15-27",
        "memory": "Galatians 5:22-23",
        "body": [
            "The Holy Spirit is sometimes the forgotten person of the Trinity. But Jesus told his disciples it was good for them that he was going away, because then he would send the Spirit (John 16:7).",
            "The Spirit isn’t a force or an influence; he is God, personal, and he lives in everyone who trusts Jesus. He helps us understand the Bible, prompts us to pray, assures us we’re God’s children, and gives gifts to build up the church.",
            "Most of all, the Spirit makes us more like Jesus. Paul calls this “the fruit of the Spirit”: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness and self-control. Fruit grows slowly, but it does grow.",
            "We can’t control the Spirit, but we can welcome him. Ask God to fill you with his Spirit; he loves to answer that prayer (Luke 11:13).",
        ],
        "questions": [
            "Jesus calls the Spirit a “Counselor” or “Helper”. What kind of help do you most need?",
            "Which part of the fruit of the Spirit would you most like to grow in?",
            "Have you ever had a sense of God prompting you? What happened?",
        ],
        "action": "Each morning this week, pray: “Holy Spirit, fill me and lead me today.”",
        "prayer": "Holy Spirit, come and fill me. Make me more like Jesus.",
    },
    {
        "slug": "prayer",
        "title": "How do I pray?",
        "read": "Luke 11:1-13",
        "memory": "Philippians 4:6",
        "body": [
            "Jesus’ disciples watched him pray and asked, “Lord, teach us to pray.” That’s encouraging: prayer is something we learn, not something we’re expected to know already.",
            "Jesus gave them a pattern (the Lord’s Prayer) and two pictures. One is a friend knocking at midnight, who keeps asking. The other is a father who wouldn’t give his child a snake instead of a fish. God is not reluctant. He is a good Father who wants to hear from us.",
            "Prayer isn’t about impressive words. It’s honest conversation: praise, thanks, saying sorry, asking for ourselves and others, and listening.",
            "Sometimes God answers in ways we don’t expect, or not yet. Keep praying anyway. Prayer changes things, and it changes us.",
        ],
        "questions": [
            "What makes prayer hard for you?",
            "What do the two pictures in Luke 11 tell you about God?",
            "Who would you love to see God answer prayer for?",
        ],
        "action": "Pray for three people every day this week. Add them to your prayer list.",
        "prayer": "Father, teach me to pray. Thank you that you love to hear me.",
    },
    {
        "slug": "bible",
        "title": "Why read the Bible?",
        "read": "2 Timothy 3:14-17",
        "memory": "2 Timothy 3:16",
        "body": [
            "The Bible is a library of sixty-six books, written by around forty authors over more than a thousand years, in three languages. Yet it tells one story: God’s rescue of the world through Jesus.",
            "Christians believe the Bible is “God-breathed”. God spoke through human authors, with their own personalities and styles, so that what they wrote is what he wanted to say. That’s why we trust it, and why we read it humbly.",
            "Reading the Bible isn’t only about information. Jesus said, “Man shall not live by bread alone, but by every word that proceeds out of the mouth of God.” It feeds us.",
            "Find a time and place that works for you. Use a reading plan. Read with others. And when you don’t understand, ask; that’s what the church is for.",
        ],
        "questions": [
            "What has put you off reading the Bible in the past?",
            "According to 2 Timothy 3, what is the Bible for?",
            "When in your day could you read for ten minutes?",
        ],
        "action": "Choose a reading plan and read five days out of seven this week.",
        "prayer": "Lord, as I read your word, speak to me. Give me a hunger for it.",
    },
    {
        "slug": "church",
        "title": "Why church?",
        "read": "1 Corinthians 12:12-27",
        "memory": "Hebrews 10:24",
        "body": [
            "Some people say, “I can be a Christian without going to church.” The New Testament would find that a puzzling idea. When people trusted Jesus, they were joined together: they learned, ate, prayed and shared their lives (Acts 2:42).",
            "Paul says the church is like a body. Every part is different and every part is needed. You have something to give that nobody else can, and you need what others bring.",
            "Church is also where we’re known and cared for, where we’re encouraged when we’re struggling and challenged when we drift.",
            "No church is perfect, and Clearspring isn’t either. But it’s a family God has given you. Come, belong, and help make it a place where others can find Jesus too.",
        ],
        "questions": [
            "What has your experience of church been like, good or bad?",
            "In 1 Corinthians 12, what does it mean that every part of the body is needed?",
            "What could you bring to the church family?",
        ],
        "action": "Introduce yourself to someone new at church this Sunday, or join a group.",
        "prayer": "Lord, thank you for your church. Help me to belong, and to serve.",
    },
    {
        "slug": "living",
        "title": "Following Jesus every day",
        "read": "Colossians 3:12-17",
        "memory": "Colossians 3:17",
        "body": [
            "Following Jesus isn’t a Sunday hobby. It’s for Monday morning too: work, school, home, friendships, money, phones, how we speak and how we rest.",
            "Paul pictures it as getting dressed: putting on compassion, kindness, humility, gentleness and patience, and over all of them, love. “Whatever you do, in word or in deed, do all in the name of the Lord Jesus.”",
            "Jesus also sends us. Before he returned to the Father he said, “Go and make disciples of all nations.” For most of us, that starts with the people we already know.",
            "You won’t do this perfectly. But day by day, with the Spirit’s help and the church around you, you’ll grow. Keep going, and keep looking to Jesus.",
        ],
        "questions": [
            "Which of the qualities in Colossians 3:12 would make the biggest difference this week?",
            "Where in your ordinary week is it hardest to follow Jesus?",
            "Who are three people you could pray for and share your faith with?",
        ],
        "action": "Write down one change you want to make, and tell someone who will pray for you.",
        "prayer": "Lord Jesus, I give you my ordinary life. Help me to follow you in all of it.",
    },
]

SESSIONS_BY_SLUG = {s["slug"]: s for s in SESSIONS}

# ------------------------------------------------------------------ growth check-in

CHECKIN_SCALE = ["Not really", "A little", "Mostly", "Yes"]

CHECKIN_AREAS = [
    {
        "key": "word", "title": "God’s word", "emoji": "📖",
        "statements": ["I read the Bible most weeks.", "The Bible is shaping how I think and act."],
        "next": [("Choose a reading plan", "reading_plans", {}), ("Learn a verse by heart", "memorise_hub", {})],
    },
    {
        "key": "prayer", "title": "Prayer", "emoji": "🙏",
        "statements": ["I talk with God most days.", "I bring the people and things I care about to God."],
        "next": [("A few guided minutes of prayer", "prayer_session", {}), ("Start a prayer list", "prayer_journal", {})],
    },
    {
        "key": "belong", "title": "Belonging", "emoji": "🏡",
        "statements": ["I meet with my church family regularly.", "There are Christians who know me well and pray for me."],
        "next": [("Find a group", "ministries", {}), ("See what’s on", "calendar_page", {})],
    },
    {
        "key": "serve", "title": "Serving", "emoji": "🤝",
        "statements": ["I use my gifts and time to help others.", "I have a place where I serve in the church or community."],
        "next": [("Discover your gifts", "grow_gifts", {}), ("Next steps at Clearspring", "grow_next_steps", {})],
    },
    {
        "key": "give", "title": "Generosity", "emoji": "🎁",
        "statements": ["I give money gladly and regularly.", "I hold my possessions and time loosely."],
        "next": [("Giving at Clearspring", "giving", {})],
    },
    {
        "key": "share", "title": "Sharing faith", "emoji": "💬",
        "statements": ["I pray for people who don’t yet know Jesus.", "I’d feel able to tell someone why I’m a Christian."],
        "next": [("Write your story", "grow_story", {}), ("Help with sharing your faith", "faith_share", {})],
    },
    {
        "key": "character", "title": "Becoming like Jesus", "emoji": "🌿",
        "statements": ["I’m growing in patience, kindness and self-control.", "When I go wrong, I’m quick to say sorry and put it right."],
        "next": [("The Examen: look back over your day", "practice_page", {"slug": "examen"})],
    },
    {
        "key": "rest", "title": "Rest and joy", "emoji": "☀️",
        "statements": ["I take time to rest and enjoy God’s gifts.", "My faith brings me joy and peace, not only duty."],
        "next": [("Build a rhythm of life", "grow_rhythm", {}), ("Before sleep", "prayer_night", {})],
    },
]

# ------------------------------------------------------------------ spiritual gifts
# Kept to gifts most churches agree on. Leaders may want to add others (for
# example prophecy, healing or tongues) to match Clearspring's teaching.

GIFTS = [
    {"key": "teaching", "name": "Teaching", "refs": ["Romans 12:7", "Ephesians 4:11-12"],
     "about": "Explaining God’s truth clearly so others understand and apply it.",
     "use": "Kids and youth teams, leading a small group, Bible study, helping new Christians.",
     "statements": ["I enjoy studying something until I can explain it simply.", "People tell me I help them understand things.", "I notice when something is being taught inaccurately, and want to put it right gently."]},
    {"key": "encouragement", "name": "Encouragement", "refs": ["Romans 12:8", "Hebrews 3:13"],
     "about": "Strengthening, comforting and urging others on in their faith.",
     "use": "Welcome team, pastoral care, mentoring, simply noticing people who need a word.",
     "statements": ["I often know the right thing to say to lift someone up.", "People come to me when they’re discouraged.", "I love seeing people take steps forward and I tell them so."]},
    {"key": "giving", "name": "Generosity", "refs": ["Romans 12:8", "2 Corinthians 9:6-8"],
     "about": "Giving money and resources gladly, generously and wisely to God’s work.",
     "use": "Supporting appeals, quietly meeting needs, helping steward the church’s resources.",
     "statements": ["Giving brings me real joy.", "I notice practical needs and want to meet them with what I have.", "I’m careful with money so that I can give more."]},
    {"key": "leadership", "name": "Leadership", "refs": ["Romans 12:8", "Hebrews 13:7"],
     "about": "Seeing where a group needs to go and helping people get there together.",
     "use": "Leading a ministry or team, starting something new, coordinating events.",
     "statements": ["People tend to follow my lead without my asking.", "I can see a goal and the steps to reach it.", "I’m comfortable making decisions that affect a group."]},
    {"key": "mercy", "name": "Mercy", "refs": ["Romans 12:8", "Luke 10:33-37"],
     "about": "Feeling and showing Christ’s compassion to people who are suffering.",
     "use": "Visiting people who are ill or lonely, community projects, prayer ministry.",
     "statements": ["I feel deeply for people who are hurting.", "I’m drawn to people others overlook.", "I’m happy to sit with someone in their pain without needing to fix it."]},
    {"key": "serving", "name": "Serving", "refs": ["Romans 12:7", "Acts 6:1-4"],
     "about": "Seeing practical jobs that need doing and doing them gladly.",
     "use": "Setting up on Sundays, tech, refreshments, maintenance, helping at events.",
     "statements": ["I’d rather do a practical job than be up front.", "I notice what needs doing before others do.", "I find it satisfying to free others up for their work."]},
    {"key": "hospitality", "name": "Hospitality", "refs": ["1 Peter 4:9-10", "Romans 12:13"],
     "about": "Making people, especially strangers, feel welcome and at home.",
     "use": "Welcome team, hosting a group, inviting people for a meal, looking after newcomers.",
     "statements": ["I love having people round.", "I notice newcomers and go and talk to them.", "I can make people feel at ease quickly."]},
    {"key": "evangelism", "name": "Evangelism", "refs": ["Ephesians 4:11", "Acts 8:26-35"],
     "about": "Sharing the good news of Jesus in ways people can understand and respond to.",
     "use": "Outreach events, courses for people exploring faith, conversations with friends.",
     "statements": ["Conversations about faith come naturally to me.", "I have friends who aren’t Christians and I pray for them often.", "I get excited when someone is exploring faith."]},
    {"key": "pastoring", "name": "Shepherding", "refs": ["Ephesians 4:11", "1 Peter 5:2-3"],
     "about": "Caring for a group of people over time and helping them grow.",
     "use": "Leading a small group, youth and kids work, mentoring, pastoral care.",
     "statements": ["I feel responsible for how the people around me are doing.", "I enjoy walking with people over months and years.", "People trust me with what’s really going on in their lives."]},
    {"key": "wisdom", "name": "Wisdom", "refs": ["1 Corinthians 12:8", "James 3:17"],
     "about": "Applying God’s truth well to real situations and decisions.",
     "use": "Mentoring, leadership teams, helping people think through choices.",
     "statements": ["People ask my advice on tricky decisions.", "I can often see the way through a complicated situation.", "I think about how the Bible applies to everyday life."]},
    {"key": "faith", "name": "Faith", "refs": ["1 Corinthians 12:9", "Hebrews 11:1"],
     "about": "Trusting God boldly for what he has promised, and helping others to trust him.",
     "use": "Prayer ministry, new ventures, encouraging people through hard times.",
     "statements": ["I find it natural to trust God for big things.", "When others are worried, I’m confident God is at work.", "I’m willing to step out before I can see how things will work out."]},
    {"key": "administration", "name": "Organising", "refs": ["1 Corinthians 12:28", "Luke 14:28-30"],
     "about": "Bringing order, planning and detail so that ministry runs well.",
     "use": "Rotas, events, finances, the church office, making systems that free others.",
     "statements": ["I enjoy making plans and lists.", "I notice when things are disorganised and want to sort them out.", "Spreadsheets, timings and logistics don’t put me off."]},
    {"key": "creativity", "name": "Creativity and craft", "refs": ["Exodus 31:1-5", "Psalm 33:3"],
     "about": "Using artistic and practical skills to serve God and show his beauty.",
     "use": "Music, design, video, photography, decorating, building and making things.",
     "statements": ["I express myself best through making or creating something.", "I notice beauty and want others to see it.", "People ask me to help with creative or hands-on projects."]},
]

GIFTS_SCALE = ["Not me", "A little", "Quite a lot", "Very much me"]

# ------------------------------------------------------------------ your story

STORY_PARTS = [
    {"key": "before", "title": "Before",
     "prompt": "What was your life like before you trusted Jesus? What were you looking for, or relying on?",
     "hint": "If you grew up as a Christian, think instead about when your faith became your own."},
    {"key": "how", "title": "How",
     "prompt": "How did you come to trust Jesus? Who or what did God use: a person, a moment, a verse, a hard time?",
     "hint": "Be specific. A real detail is worth more than a general statement."},
    {"key": "since", "title": "Since",
     "prompt": "What difference has Jesus made? What has changed, and what’s still hard?",
     "hint": "Honesty helps. People connect with real struggles more than with a perfect ending."},
    {"key": "verse", "title": "A verse",
     "prompt": "Is there a verse that means a lot to you? Why?",
     "hint": "Optional, but a verse can give your story a centre."},
]

STORY_TIPS = [
    "Aim for about three minutes out loud — roughly 400 words.",
    "Keep Jesus at the centre. It’s his story as much as yours.",
    "Avoid church jargon. If a friend wouldn’t understand a word, say it another way.",
    "You don’t need a dramatic story. A quiet, steady faith is a wonderful story too.",
    "Practise a one-minute version for when someone asks, “Why do you go to church?”",
]

# ------------------------------------------------------------------ rhythm of life

RHYTHM_GROUPS = [
    ("daily", "Every day", [
        "Read the Bible", "Pray in the morning", "Look back over the day (the Examen)", "Say thank you for three things",
        "Pray for someone by name", "A walk without my phone", "Pray before sleep",
    ]),
    ("weekly", "Every week", [
        "Sunday with the church", "Time with my small group", "A day of rest", "Serve somewhere",
        "Eat with friends or family", "Learn a verse by heart", "Give",
    ]),
    ("monthly", "Every month", [
        "A longer time of prayer", "Fast for a meal or a day", "Meet a friend to talk about faith",
        "Do something kind anonymously", "Review my rhythm",
    ]),
    ("yearly", "Every year", [
        "A day or weekend retreat", "Read through a whole book of the Bible", "Review my giving",
        "Write down what God has done this year",
    ]),
]

RHYTHM_ABOUT = "A “rule of life” is an old Christian idea: a simple pattern of habits that helps you make room for God. Think of it like a trellis that helps a plant grow, not a cage. Choose a few things that fit your real life, not an ideal one. You can always change it."

# ------------------------------------------------------------------ next steps
# Editable by church staff in Admin → Next steps. These are only the defaults.

NEXT_STEPS_DEFAULTS = {
    "next_baptism": (
        "Baptism is a public sign that you have put your trust in Jesus. At Clearspring we baptise people who have come to faith, by full immersion, usually as part of a Sunday service.\n\n"
        "If you’d like to be baptised, the first step is a relaxed conversation with one of the leaders. It isn’t a test; it’s a chance to hear your story and answer any questions. You’ll be invited to share a little of your story on the day, but short is fine and nobody is forced.\n\n"
        "Bring a change of clothes and a towel. You will get wet!"
    ),
    "next_belong": (
        "You don’t need to sign anything to belong at Clearspring. If you come regularly, you’re part of the family.\n\n"
        "If you’d like to commit more formally, for example to join a serving team or a leadership role, talk to one of the leaders about what that involves."
    ),
    "next_serve": (
        "Everyone has something to give. There are teams for welcome, kids and youth, tech, music, refreshments, prayer, and care for people in need.\n\n"
        "Not sure where you’d fit? Try the spiritual gifts questionnaire, then get in touch and we’ll help you find a place."
    ),
    "next_group": (
        "Sunday is where we gather; smaller groups are where we get to know each other. Groups meet in homes and at church during the week to read the Bible, pray and share life.\n\n"
        "Ask on a Sunday or get in touch and we’ll help you find one."
    ),
    "next_contact": "Get in touch through the app, or speak to anyone on the welcome team on a Sunday.",
}

NEXT_STEPS_SECTIONS = [
    ("next_baptism", "💧", "Being baptised"),
    ("next_belong", "🏡", "Belonging"),
    ("next_serve", "🤝", "Serving"),
    ("next_group", "👥", "Joining a group"),
]


def scripture_refs():
    """Every Scripture reference used in this module, for checking."""
    out = []
    for s in FIRST_STEPS:
        out += [s["verse"], s["read"]]
    for s in SESSIONS:
        out += [s["read"], s["memory"]]
    for g in GIFTS:
        out += g["refs"]
    return out
