"""
The 3D Bible world: every model, with its title, a line about it, the passage
it's built from, and which pack of the 3D code draws it.

The drawing code is in tools/bible3d/pack-<pack>.js (one function per slug),
bundled into static/vendor/bible3d/. A model listed here without a function in
its pack shows the first model in that pack instead, so add both together.

kind decides the shelf it sits on in the hub. also = extra words people might
search for (other names, translations).
"""

KINDS = [
    ("places", "Places and buildings"),
    ("worship", "Tabernacle and temple"),
    ("war", "Weapons and armour"),
    ("work", "Farming, fishing and trades"),
    ("home", "Home and everyday life"),
    ("clothes", "Clothes and jewellery"),
    ("music", "Music"),
    ("money", "Money, weights and writing"),
    ("travel", "Boats, carts and chariots"),
    ("signs", "Signs, wonders and visions"),
    ("passion", "The cross and the resurrection"),
    ("nature", "Plants and animals"),
    ("scenes", "Scenes from the Bible"),
    ("size", "How big was it?"),
]

MODELS = []


def M(slug, kind, title, sub, ref, emoji, pack, **kw):
    MODELS.append({"slug": slug, "kind": kind, "title": title, "sub": sub, "ref": ref, "emoji": emoji, "pack": pack, **kw})


# The first models: places, holy objects, scenes and sizes.
M('map', 'places', 'The land in 3D', 'Hills, valleys and the Jordan rift, with the places of the Bible pinned on', '', '🗺️', "core"),
M('tabernacle', 'places', 'The tabernacle', 'The tent of meeting in the wilderness, 100 × 50 cubits', 'Exodus 25–27', '⛺', "core", inside="closed"),
M('temple', 'places', "Solomon's temple", 'The house, the pillars Jachin and Boaz, and the bronze Sea', '1 Kings 6–7', '🏛️', "core", inside="closed"),
M('ark-of-the-covenant', 'worship', 'The ark of the covenant', 'The gold chest with the mercy seat and cherubim', 'Exodus 25:10–22', '✨', "core"),
M('lampstand', 'worship', 'The golden lampstand', 'Seven lamps, hammered from one piece of gold', 'Exodus 25:31–40', '🕎', "core"),
M('table-of-showbread', 'worship', 'The table and the bread', 'Twelve loaves of the bread of the Presence', 'Exodus 25:23–30; Leviticus 24:5–9', '🍞', "core"),
M('altar-of-incense', 'worship', 'The altar of incense', 'Prayer rising like incense before the veil', 'Exodus 30:1–10', '🕯️', "core"),
M('bronze-altar', 'worship', 'The bronze altar', 'Where the sacrifices were offered, 5 cubits square', 'Exodus 27:1–8', '🔥', "core"),
M('breastplate', 'worship', "The high priest's breastplate", 'Twelve stones for the twelve tribes', 'Exodus 28:15–30', '💎', "core"),
M('throne', 'worship', "Solomon's throne", 'Ivory and gold, six steps and twelve lions', '1 Kings 10:18–20', '👑', "core"),
M('david-and-goliath', 'scenes', 'David and Goliath', 'The Valley of Elah, two armies and a giant', '1 Samuel 17', '🪨', "core"),
M('galilee-boat', 'scenes', 'A boat on Galilee', 'Jesus asleep in the stern as the storm rises', 'Mark 4:35–41', '⛵', "core"),
M('nativity', 'scenes', 'The first Christmas', 'A manger in a Bethlehem house, and shepherds', 'Luke 2:1–20', '⭐', "core", inside="open"),
M('last-supper', 'scenes', 'The Last Supper', 'Reclining round the table in the upper room', 'Luke 22:7–20; John 13', '🍷', "core"),
M('empty-tomb', 'passion', 'The empty tomb', 'The stone rolled away, in a garden', 'Mark 16; John 20', '🌅', "core"),
M('daniel-statue', 'size', "The statue in Daniel's vision", 'Gold, silver, bronze, iron and clay, and the stone cut without hands', 'Daniel 2:31–45', '🗿', "core"),
M('ark', 'size', "Noah's ark", '300 cubits long: see how big it really was', 'Genesis 6', '🛶', "core"),
M('nebuchadnezzar-statue', 'size', "Nebuchadnezzar's statue", '60 cubits of gold, and the fiery furnace', 'Daniel 3', '🗿', "core"),

# Tabernacle and temple (pack-worship.js)
M("laver", "worship", "The bronze laver", "Where the priests washed, made from bronze mirrors", "Exodus 30:17–21; 38:8", "🫧", "worship")
M("bronze-sea", "worship", "The Sea of bronze", "A basin 10 cubits across on twelve oxen", "1 Kings 7:23–26", "🌊", "worship", also="molten sea")
M("temple-stand", "worship", "A bronze stand on wheels", "One of Solomon's ten stands, with lions, oxen and cherubim", "1 Kings 7:27–39", "🛞", "worship", also="cart basin")
M("silver-trumpets", "music", "The silver trumpets", "Two trumpets of hammered silver for calling the camp", "Numbers 10:1–10", "🎺", "worship")
M("shofar", "music", "The shofar", "A ram's horn, blown at Jericho and for jubilee", "Joshua 6:4–5; Leviticus 25:9", "📯", "worship", also="ram's horn trumpet")
M("censer", "worship", "The censer", "Coals from the altar and incense before the LORD", "Leviticus 16:12–13; Revelation 8:3", "💨", "worship", also="firepan incense burner")
M("jar-of-manna", "worship", "The jar of manna", "An omer of the bread from heaven, kept in the ark", "Exodus 16:31–35; Hebrews 9:4", "🫙", "worship")
M("aarons-rod", "worship", "Aaron's rod that budded", "Buds, blossoms and almonds overnight", "Numbers 17:1–10", "🌸", "worship", also="staff almond")
M("tablets", "worship", "The tablets of stone", "The Ten Commandments, written by the finger of God", "Exodus 31:18; 34:1", "🪨", "worship", also="ten commandments law")
M("high-priest", "clothes", "The high priest's garments", "Ephod, breastplate, blue robe and the gold plate", "Exodus 28", "👘", "worship", also="aaron ephod turban urim thummim")
M("anointing-horn", "worship", "The horn of anointing oil", "Samuel anoints David", "1 Samuel 16:13", "🫗", "worship")
M("bronze-serpent", "signs", "The bronze serpent", "Lifted up on a pole in the wilderness", "Numbers 21:4–9; John 3:14", "🐍", "worship", also="nehushtan snake")
M("golden-calf", "worship", "The golden calf", "Made from the people's earrings while Moses was on the mountain", "Exodus 32", "🐂", "worship", also="idol")
M("altar-of-stones", "worship", "An altar of uncut stones", "No tools and no steps", "Exodus 20:24–26; Joshua 8:30–31", "🪨", "worship")
M("elijahs-altar", "signs", "Elijah's altar on Carmel", "Twelve stones, a trench of water, and fire from heaven", "1 Kings 18:30–39", "🔥", "worship", also="carmel prophets of baal")
M("memorial-stones", "places", "The twelve stones at Gilgal", "Carried out of the Jordan as a memorial", "Joshua 4", "🪨", "worship")
M("jacobs-pillar", "worship", "Jacob's pillar at Bethel", "The stone he slept on, anointed with oil", "Genesis 28:10–22", "🗿", "worship")
M("tabernacle-frame", "worship", "The tabernacle frames", "Gold-covered frames on silver bases, held by bars", "Exodus 26:15–30", "🧱", "worship", also="boards sockets")
M("altar-tools", "worship", "The altar's bronze tools", "Pots, shovels, basins, forks and firepans", "Exodus 27:3", "🥄", "worship", also="utensils")
M("dagon", "signs", "Dagon fallen before the ark", "The Philistine idol, face down with its head broken off", "1 Samuel 5:1–5", "🗿", "worship", also="philistines ashdod")
M("incense-spices", "worship", "The holy incense", "Stacte, onycha, galbanum and frankincense", "Exodus 30:34–38", "🌿", "worship", also="frankincense")
M("lampstand-tools", "worship", "Tongs and trays for the lamps", "Pure gold, for tending the lampstand", "Exodus 25:38", "🕯️", "worship", also="snuffers")


# Weapons and armour (pack-war.js)
M("sling", "war", "David's sling and five stones", "A shepherd's sling, the stones from the brook, and his bag", "1 Samuel 17:40–50", "🪨", "war")
M("goliaths-armour", "war", "Goliath's armour", "A coat of scales, bronze helmet, greaves and that spear", "1 Samuel 17:5–7", "🛡️", "war")
M("goliath", "size", "How tall was Goliath?", "Six cubits and a span, beside David and an ordinary man", "1 Samuel 17:4", "📏", "war", also="giant philistine")
M("armour-of-god", "war", "The armour of God", "Belt, breastplate, shoes, shield, helmet and sword", "Ephesians 6:10–17", "⚔️", "war", also="roman soldier whole armor")
M("ehuds-sword", "war", "Ehud's two-edged sword", "A cubit long, strapped to his right thigh", "Judges 3:15–22", "🗡️", "war", also="dagger")
M("bow-and-quiver", "war", "A bow and a quiver of arrows", "The composite bow, and Jonathan's signal arrows", "1 Samuel 20:20; Psalm 127:4–5", "🏹", "war", also="archer")
M("gold-shields", "war", "Solomon's shields of gold", "200 large and 300 small, later replaced with bronze", "1 Kings 10:16–17; 14:25–28", "🛡️", "war")
M("chariot", "travel", "A war chariot", "Pharaoh's chariots, Sisera's iron chariots", "Exodus 14:6–9; Judges 4:3", "🐎", "war", also="horses")
M("battering-ram", "war", "A battering ram and siege ramp", "Assyrian siege engines like those at Lachish", "2 Chronicles 32:9; Ezekiel 4:2", "🏰", "war", also="siege lachish assyria")
M("gideons-jars", "war", "Gideon's trumpets, jars and torches", "300 men, and the jars smashed at night", "Judges 7:16–22", "🔥", "war", also="midian")
M("jawbone", "war", "Samson's jawbone", "The jawbone of a donkey at Lehi", "Judges 15:15–19", "🦴", "war")
M("ox-goad", "work", "An ox goad", "Shamgar's weapon, and kicking against the goads", "Judges 3:31; Acts 26:14", "🦯", "war")
M("tent-peg", "home", "A tent peg and a mallet", "Jael's tent peg, from the song of Deborah", "Judges 4:21; 5:26", "🔨", "war")
M("uzziahs-engines", "war", "Uzziah's war machines", "Devices on Jerusalem's towers to shoot arrows and great stones", "2 Chronicles 26:15", "🏹", "war", also="catapult")
M("ploughshares", "signs", "Swords into ploughshares", "A sword, a ploughshare and a pruning hook", "Isaiah 2:4; Micah 4:3", "🔨", "war", also="plowshares peace")
M("sauls-spear", "scenes", "Saul's spear and water jar", "David spares Saul's life in the camp at night", "1 Samuel 26:7–16", "🌙", "war")
M("wall-and-gate", "places", "A city wall and gate", "Towers, chambers, and elders sitting in the gate", "Ruth 4:1–11; Proverbs 31:23", "🏰", "war", also="gates elders walls")


# Farming, fishing and trades (pack-work.js)
M("plough", "work", "A plough and a yoke of oxen", "Hand to the plough, and Elisha's twelve yoke", "Luke 9:62; 1 Kings 19:19", "🐂", "work", also="plow ploughman farmer")
M("yoke", "work", "An easy yoke", "Carved to fit, and Jeremiah's yoke bars", "Matthew 11:29–30; Jeremiah 28", "🪵", "work")
M("threshing-floor", "work", "A threshing floor", "Sledges, winnowing, and Ruth and Boaz", "Ruth 3; 2 Samuel 24:18–25", "🌾", "work", also="araunah thresh chaff")
M("winnowing-fork", "work", "A winnowing fork", "Wheat into the barn, chaff into the fire", "Matthew 3:12", "🍂", "work", also="fan")
M("sickle-and-sheaves", "work", "Harvest: sickle and sheaves", "Reaping, sheaves, and Ruth gleaning", "Ruth 2; Revelation 14:14–16", "🌾", "work", also="reaping gleaning harvest wheat barley")
M("hand-mill", "work", "A hand mill", "Two women grinding at the mill", "Matthew 24:41; Deuteronomy 24:6", "🫓", "work", also="millstone quern flour")
M("great-millstone", "work", "A donkey's millstone", "The great millstone round the neck", "Matthew 18:6; Judges 16:21", "⚙️", "work", also="mill stone")
M("olive-press", "work", "An olive press", "Crushing and pressing: what Gethsemane means", "Matthew 26:36; Micah 6:15", "🫒", "work", also="oil gethsemane")
M("winepress", "work", "A winepress and vineyard", "Treading grapes, the vat and the watchtower", "Isaiah 5:1–2; 63:2–3; Matthew 21:33", "🍇", "work", also="wine vineyard grapes")
M("potters-wheel", "work", "The potter's wheel", "Clay in the potter's hand", "Jeremiah 18:1–6", "🏺", "work", also="pottery clay")
M("fishing-net", "work", "A net full of fish", "153 fish, and fishers of men", "John 21:6–11; Mark 1:16–18", "🐟", "work", also="dragnet cast net fishermen")
M("fish-hook", "work", "A fish hook and a coin", "The coin in the fish's mouth", "Matthew 17:24–27", "🎣", "work", also="temple tax shekel")
M("carpenters-tools", "work", "The carpenter's tools", "Adze, saw, hammer, chisel, drill and plumb line", "Mark 6:3", "🪚", "work", also="joseph jesus tekton builder")
M("floating-axe-head", "signs", "The axe head that floated", "Elisha and the borrowed axe", "2 Kings 6:1–7", "🪓", "work", also="axe")
M("plumb-line", "work", "A plumb line", "Amos's vision of a wall out of true", "Amos 7:7–9", "📐", "work")
M("measuring-reed", "work", "A measuring reed", "Six long cubits, for Ezekiel's temple and John's city", "Ezekiel 40:3–5; Revelation 11:1", "📏", "work", also="measuring rod line")
M("scales-and-weights", "money", "Scales and weights", "Just balances, and stone shekel weights", "Proverbs 11:1; Leviticus 19:36", "⚖️", "work", also="balance weigh shekel")
M("loom", "work", "A loom, spindle and distaff", "Weaving, Delilah's loom and the woman of Proverbs 31", "Judges 16:13–14; Proverbs 31:19", "🧶", "work", also="weaving spinning")
M("rod-and-staff", "work", "The shepherd's rod and staff", "“They comfort me”", "Psalm 23:4", "🦯", "work", also="crook shepherd")
M("sheepfold", "work", "A sheepfold", "“I am the door of the sheep”", "John 10:1–16", "🐑", "work", also="sheep pen good shepherd")
M("well", "work", "A well", "Jacob's well, Rebekah and Rachel", "John 4:5–14; Genesis 24; 29", "🪣", "work", also="woman of samaria water")
M("cistern", "work", "A cistern", "Jeremiah in the mud, and Joseph's pit", "Jeremiah 38:6–13; Genesis 37:24", "🕳️", "work", also="pit")
M("mud-bricks", "work", "Bricks without straw", "Brickmaking in Egypt", "Exodus 5:6–19", "🧱", "work", also="slavery egypt pharaoh")
M("refiners-fire", "work", "The refiner's fire", "Silver in the crucible, and the dross skimmed off", "Malachi 3:2–3; Isaiah 48:10", "🔥", "work", also="furnace silver crucible")
M("forge", "work", "A smith's forge", "Hearth, anvil, hammer and bellows", "Isaiah 44:12; 54:16", "⚒️", "work", also="blacksmith iron")


# Home and everyday life, clothes and jewellery (pack-home.js)
M("oil-lamp", "home", "A lamp on a lampstand", "Not under a basket, and the ten bridesmaids' lamps", "Matthew 5:14–16; 25:1–13", "🪔", "home", also="light lampstand bushel")
M("lost-coin", "home", "The lost coin", "A lamp, a broom and nine silver coins", "Luke 15:8–10", "🪙", "home", also="parable drachma")
M("bread-oven", "home", "A bread oven", "Baking the daily bread", "Leviticus 26:26; Matthew 6:11", "🫓", "home", also="tannur kneading")
M("passover", "home", "The Passover meal", "Lamb, unleavened bread, bitter herbs, and blood on the door", "Exodus 12", "🐑", "home", also="pesach exodus lamb")
M("water-jars", "home", "Six stone water jars", "The water made wine at Cana", "John 2:1–11", "🍷", "home", also="wedding cana miracle")
M("alabaster-jar", "home", "The alabaster jar of nard", "Poured out on Jesus at Bethany", "Mark 14:3–9; John 12:1–8", "🏺", "home", also="perfume ointment anointing")
M("wineskins", "home", "Old and new wineskins", "New wine into fresh skins", "Matthew 9:17", "🍷", "home")
M("through-the-roof", "scenes", "Lowered through the roof", "Four friends and a paralysed man", "Mark 2:1–12", "🏠", "home", also="paralytic healing capernaum house")
M("key-and-door", "home", "A door and the key of David", "Wooden locks and keys", "Isaiah 22:22; Revelation 3:7, 20", "🗝️", "home", also="knock")
M("sandals", "clothes", "Sandals", "Holy ground, a deal sealed, and a strap to untie", "Exodus 3:5; Ruth 4:7; Mark 1:7", "👡", "home", also="shoes")
M("seamless-tunic", "clothes", "The seamless tunic", "Woven in one piece; the soldiers cast lots", "John 19:23–24", "👕", "home", also="robe garment clothing cloak")
M("josephs-robe", "clothes", "Joseph's robe", "The special robe his father gave him", "Genesis 37:3", "🌈", "home", also="coat of many colours colors")
M("tassels", "clothes", "Tassels, phylacteries and a mezuzah", "A cord of blue, and words on the doorposts", "Numbers 15:38–41; Deuteronomy 6:8–9", "🧵", "home", also="fringe tzitzit tefillin prayer shawl")
M("signet-ring", "clothes", "A signet ring and seal", "Joseph's ring and the king's sealed decree", "Genesis 41:42; Esther 8:8", "💍", "home", also="seal")
M("crown-and-sceptre", "clothes", "A crown and a golden sceptre", "David's captured crown and Esther's king", "2 Samuel 12:30; Esther 5:2", "👑", "home", also="king queen esther")
M("nose-ring-and-bracelets", "clothes", "Rebekah's ring and bracelets", "Gold from Abraham's servant at the well", "Genesis 24:22, 47", "📿", "home", also="jewelry jewellery earring")
M("loaves-and-fishes", "home", "Five loaves and two fish", "And twelve baskets of leftovers", "John 6:1–13; Mark 8:1–9", "🧺", "home", also="feeding five thousand miracle")
M("manger", "home", "The manger", "Laid in a feeding trough", "Luke 2:7, 12", "🌟", "home", also="christmas baby jesus nativity")
M("abrahams-tent", "home", "Abraham's tent", "Black goats' hair at Mamre, and three visitors", "Genesis 18:1–15", "⛺", "home", also="tent mamre hospitality")


# Music, money and writing (pack-words.js)
M("lyre", "music", "David's lyre", "The kinnor that soothed Saul", "1 Samuel 16:23; Psalm 137:2", "🎵", "words", also="harp kinnor")
M("harp", "music", "A harp", "Praise him with harp and lyre", "Psalm 150:3; 1 Chronicles 15:16", "🎶", "words", also="nevel psaltery")
M("cymbals", "music", "Cymbals", "Loud clashing cymbals, and a clanging cymbal", "Psalm 150:5; 1 Corinthians 13:1", "🥁", "words")
M("timbrel", "music", "Miriam's timbrel", "A hand drum by the Red Sea", "Exodus 15:20–21", "🪘", "words", also="tambourine drum")
M("double-pipe", "music", "The pipe", "Played at weddings and funerals", "Matthew 11:17; 1 Samuel 10:5", "🪈", "words", also="flute aulos")
M("widows-mites", "money", "The widow's two coins", "Everything she had, into the temple treasury", "Mark 12:41–44", "🪙", "words", also="mite lepton offering treasury")
M("denarius", "money", "A denarius of Caesar", "Whose image and inscription is this?", "Matthew 22:15–22", "🪙", "words", also="tribute coin tax roman")
M("thirty-pieces", "money", "Thirty pieces of silver", "Judas's price, and the potter's field", "Matthew 26:14–16; 27:3–10", "💰", "words", also="judas betrayal shekels")
M("talents", "money", "The parable of the talents", "Five, two and one, and the talent in the ground", "Matthew 25:14–30", "⚖️", "words", also="talent silver")
M("money-changers", "money", "The money changers' tables", "Overturned in the temple courts", "John 2:13–16; Mark 11:15–17", "🪙", "words", also="cleansing temple doves")
M("isaiah-scroll", "money", "The scroll of Isaiah", "Read by Jesus in the synagogue at Nazareth", "Luke 4:16–21", "📜", "words", also="scroll synagogue nazareth")
M("wax-tablet", "money", "A writing tablet", "“His name is John”", "Luke 1:62–64", "📝", "words", also="zechariah stylus")
M("pen-and-ink", "money", "Pen, ink and a letter", "Reed pens, a scribe's knife, and Paul's large letters", "3 John 13; Galatians 6:11; Jeremiah 36:23", "✒️", "words", also="writing scribe papyrus letter")
M("ostracon", "money", "A letter on a potsherd", "The Lachish letters: “we cannot see Azekah”", "Jeremiah 34:7", "🏺", "words", also="lachish ostraca archaeology")
M("ezekiels-brick", "signs", "Ezekiel's brick", "Jerusalem drawn on clay, under siege", "Ezekiel 4:1–3", "🧱", "words")
M("writing-on-the-wall", "signs", "The writing on the wall", "Mene, mene, tekel, parsin", "Daniel 5", "✋", "words", also="belshazzar feast daniel")


# The cross and the resurrection (pack-passion.js)
M("palm-sunday", "passion", "Into Jerusalem on a donkey", "Cloaks, palm branches and Hosanna", "Mark 11:1–10; John 12:12–15; Zechariah 9:9", "🌿", "passion", also="triumphal entry palms hosanna")
M("basin-and-towel", "passion", "The basin and the towel", "Jesus washes the disciples' feet", "John 13:1–15", "🫧", "passion", also="foot washing maundy thursday")
M("bread-and-cup", "passion", "The bread and the cup", "“Do this in remembrance of me”", "Luke 22:19–20; 1 Corinthians 11:23–26", "🍞", "passion", also="communion lord's supper eucharist")
M("crown-of-thorns", "passion", "The crown of thorns", "With the purple robe and the reed", "Matthew 27:27–31; John 19:1–5", "👑", "passion")
M("the-cross", "passion", "The cross and its title", "“Jesus of Nazareth, the King of the Jews” in three languages", "John 19:17–30", "✝️", "passion", also="crucifixion titulus inri good friday")
M("golgotha", "passion", "Golgotha", "Three crosses outside the city wall", "Luke 23:32–43; John 19:17–27", "⛰️", "passion", also="calvary skull hill")
M("torn-veil", "passion", "The veil torn in two", "From top to bottom, as Jesus died", "Matthew 27:51; Hebrews 10:19–20", "🎭", "passion", also="curtain temple")
M("sealed-tomb", "passion", "The sealed tomb", "The stone sealed and the guard set", "Matthew 27:62–66", "🪨", "passion", also="guard soldiers easter")
M("grave-clothes", "passion", "The grave clothes", "The linen lying there, the face cloth folded", "John 20:3–8", "🤍", "passion", also="empty tomb linen shroud resurrection easter")
M("charcoal-fire", "passion", "Breakfast by the charcoal fire", "Fish and bread on the shore, and Peter restored", "John 21:1–17", "🔥", "passion", also="peter galilee resurrection appearance")


# Boats, carts and chariots (pack-travel.js)
M("pauls-ship", "travel", "Paul's ship", "An Alexandrian grain ship, wrecked off Malta", "Acts 27", "⛵", "travel", also="shipwreck malta sail anchors")
M("jonahs-ship", "travel", "Jonah's ship to Tarshish", "The storm, the cargo overboard, and the great fish", "Jonah 1", "🐋", "travel", also="whale fish storm")
M("moses-basket", "travel", "Baby Moses' basket", "Papyrus and pitch among the reeds of the Nile", "Exodus 2:1–10", "🧺", "travel", also="nile reeds pharaoh's daughter")
M("new-cart", "travel", "The ark on a new cart", "Sent home by the Philistines, and Uzzah's fall", "1 Samuel 6:7–14; 2 Samuel 6:3–7", "🛒", "travel", also="ark of the covenant uzzah oxen")
M("camel-and-needle", "travel", "A camel and the eye of a needle", "Easier for a camel…", "Mark 10:25; Matthew 19:24", "🐪", "travel", also="rich young ruler")
M("ethiopians-chariot", "travel", "The Ethiopian's chariot", "Reading Isaiah on the Gaza road, and Philip", "Acts 8:26–39", "📖", "travel", also="eunuch philip baptism")
M("cedar-rafts", "travel", "Rafts of cedar from Lebanon", "Timber floated down the coast for the temple", "1 Kings 5:6–11", "🪵", "travel", also="hiram tyre timber")
M("ship-of-tyre", "travel", "The ship of Tyre", "Ezekiel's lament for a proud city", "Ezekiel 27", "⛵", "travel")
M("palanquin", "travel", "Solomon's carriage", "Posts of silver, back of gold, a seat of purple", "Song of Solomon 3:6–11", "👑", "travel", also="litter sedan song of songs")


# Places and buildings (pack-places.js)
M("tower-of-babel", "places", "The tower of Babel", "Brick and bitumen, reaching for the heavens", "Genesis 11:1–9", "🏯", "places", also="ziggurat babylon languages")
M("jericho", "places", "The walls of Jericho", "Rahab's house, the scarlet cord, and the wall falling flat", "Joshua 2; 6", "🧱", "places", also="rahab joshua trumpets")
M("herods-temple", "places", "Herod's temple", "The sanctuary, the altar and the courts Jesus knew", "Mark 13:1–2; John 2:20", "🏛️", "places", also="second temple jerusalem")
M("bethesda", "places", "The pool of Bethesda", "Five porticoes by the Sheep Gate", "John 5:1–15", "🏊", "places", also="healing pool porches")
M("siloam", "places", "The pool of Siloam", "“Go, wash”: the man born blind", "John 9:1–11", "💧", "places", also="blind man")
M("synagogue", "places", "A synagogue", "Benches, columns and a reading table", "Luke 4:16–20; Mark 1:21", "🕍", "places", also="capernaum magdala sabbath")
M("hezekiahs-tunnel", "places", "Hezekiah's tunnel", "Two crews meeting deep in the rock", "2 Kings 20:20; 2 Chronicles 32:30", "⛏️", "places", also="siloam inscription gihon water")
M("house-of-the-forest", "size", "The House of the Forest of Lebanon", "Solomon's great hall of cedar pillars", "1 Kings 7:2–5", "🌲", "places", also="solomon palace")
M("ishtar-gate", "places", "The Ishtar Gate of Babylon", "Blue glazed brick in Daniel's city", "Daniel 1; 4:29–30", "🦁", "places", also="nebuchadnezzar babylon exile")
M("lions-den", "scenes", "Daniel in the lions' den", "The stone sealed with the king's signet", "Daniel 6", "🦁", "places", also="darius lions")
M("ephesus-theatre", "places", "The theatre at Ephesus", "25,000 seats and “Great is Artemis!”", "Acts 19:23–41", "🏟️", "places", also="riot artemis diana paul")
M("stocks", "scenes", "Paul and Silas in the stocks", "Hymns at midnight in Philippi", "Acts 16:22–34", "⛓️", "places", also="prison jailer earthquake")
M("ogs-bed", "size", "Og's iron bed", "Nine cubits long and four wide", "Deuteronomy 3:11", "🛏️", "places", also="giant bashan rephaim")
M("grapes-of-eshcol", "size", "The grapes of Eshcol", "One cluster carried on a pole by two men", "Numbers 13:23–27", "🍇", "places", also="spies promised land")
M("nehemiahs-wall", "places", "Rebuilding Jerusalem's wall", "A tool in one hand and a weapon in the other", "Nehemiah 4; 6:15", "🧱", "places", also="nehemiah walls rebuild")
M("roman-road", "places", "A Roman road", "Paved roads and milestones on Paul's journeys", "Acts 28:15; Matthew 5:41", "🛣️", "places", also="appian way paul journeys")


# Signs, wonders and visions (pack-visions.js)
M("jacobs-ladder", "signs", "Jacob's ladder", "A stairway to heaven, and angels going up and down", "Genesis 28:10–17; John 1:51", "🪜", "visions", also="bethel dream stairway")
M("burning-bush", "signs", "The burning bush", "Burning, yet not consumed", "Exodus 3:1–15", "🔥", "visions", also="moses horeb i am")
M("pillar-of-fire", "signs", "The pillar of cloud and fire", "Leading Israel by day and by night", "Exodus 13:21–22; Numbers 9:15–23", "☁️", "visions", also="wilderness camp exodus")
M("red-sea", "signs", "Crossing the Red Sea", "Walls of water on the right and on the left", "Exodus 14:21–29", "🌊", "visions", also="sea parted exodus reed sea")
M("water-from-the-rock", "signs", "Water from the rock", "Massah and Meribah, and the rock that was Christ", "Exodus 17:1–7; Numbers 20:7–13", "💧", "visions", also="moses strikes rock")
M("chariot-of-fire", "signs", "Elijah's chariot of fire", "Taken up in a whirlwind; the cloak falls to Elisha", "2 Kings 2:9–14", "🔥", "visions", also="whirlwind elisha mantle")
M("ezekiels-wheels", "signs", "Ezekiel's wheels", "Wheels within wheels, full of eyes, under a crystal expanse", "Ezekiel 1", "☸️", "visions", also="vision chariot throne cherubim")
M("zechariahs-lampstand", "signs", "Zechariah's lampstand", "Seven lamps and two olive trees: not by might", "Zechariah 4", "🕎", "visions", also="olive trees zerubbabel")
M("flying-scroll", "size", "The flying scroll", "Twenty cubits by ten, over the land", "Zechariah 5:1–4", "📜", "visions")
M("sundial-of-ahaz", "signs", "The shadow on Ahaz's steps", "Ten steps back, a sign to Hezekiah", "2 Kings 20:8–11; Isaiah 38:7–8", "🕰️", "visions", also="sundial hezekiah healing")
M("gideons-fleece", "signs", "Gideon's fleece", "Wet then dry, dry then wet", "Judges 6:36–40", "🐑", "visions", also="dew sign")
M("rainbow", "signs", "The rainbow after the flood", "The sign of the covenant, over Ararat", "Genesis 9:8–17", "🌈", "visions", also="noah covenant ararat")
M("isaiahs-coal", "signs", "Isaiah's burning coal", "Holy, holy, holy, and “Here am I, send me”", "Isaiah 6:1–8", "🔥", "visions", also="seraphim call commission")
M("seven-lampstands", "signs", "The seven golden lampstands", "The seven churches of Revelation", "Revelation 1:9–20", "🕯️", "visions", also="seven churches ephesus laodicea")
M("throne-in-heaven", "signs", "The throne in heaven", "A rainbow like emerald, 24 elders, and a sea of glass", "Revelation 4", "👑", "visions", also="elders worship")
M("sealed-scroll", "signs", "The scroll with seven seals", "Only the Lamb is worthy to open it", "Revelation 5", "📜", "visions", also="seals lamb lion of judah")
M("new-jerusalem", "size", "The New Jerusalem", "A cube 12,000 stadia each way, with Britain for scale", "Revelation 21:9–27", "🏙️", "visions", also="heaven holy city pearly gates")
M("river-of-life", "signs", "The river of life", "And the tree of life, for the healing of the nations", "Revelation 22:1–5", "🌳", "visions", also="tree of life heaven")
M("valley-of-dry-bones", "signs", "The valley of dry bones", "“Can these bones live?”", "Ezekiel 37:1–14", "🦴", "visions", also="breath spirit")
M("balaams-donkey", "signs", "Balaam's donkey", "The angel in the path, and a donkey that spoke", "Numbers 22:21–35", "🫏", "visions", also="angel talking donkey")
M("wise-mens-gifts", "scenes", "The wise men's gifts", "Gold, frankincense and myrrh, under the star", "Matthew 2:1–12", "⭐", "visions", also="magi christmas star epiphany")
M("great-fish", "signs", "Jonah in the great fish", "Three days and three nights", "Jonah 1:17–2:10", "🐋", "visions", also="whale")
M("pentecost", "scenes", "Pentecost", "Wind, tongues of fire, and every language", "Acts 2:1–13", "🔥", "visions", also="holy spirit tongues")
M("aaron-and-hur", "scenes", "Moses' hands held up", "Aaron and Hur, and the battle with Amalek", "Exodus 17:8–16", "🙌", "visions", also="amalek joshua prayer")
M("mount-sinai", "places", "Mount Sinai", "Smoke, fire, thunder and the trumpet", "Exodus 19:16–25", "⛰️", "visions", also="horeb law ten commandments")


# Plants and animals (pack-nature.js)
M("mustard-seed", "nature", "The mustard seed", "The smallest seed, and birds in its branches", "Mark 4:30–32; Matthew 17:20", "🌱", "nature", also="parable kingdom faith")
M("fig-tree", "nature", "A fig tree", "Learn its lesson; sitting under your own fig tree", "Mark 11:12–14; 13:28; Micah 4:4", "🌳", "nature", also="cursed fig nathanael")
M("zacchaeus", "nature", "Zacchaeus' sycamore tree", "A short tax collector up a tree in Jericho", "Luke 19:1–10", "🌳", "nature", also="sycamore jericho tax collector")
M("olive-grafting", "nature", "The olive tree and the grafted branch", "Wild branches grafted in", "Romans 11:17–24", "🫒", "nature", also="graft gentiles israel")
M("true-vine", "nature", "The true vine", "“I am the vine; you are the branches”", "John 15:1–8", "🍇", "nature", also="abide pruning grapes")
M("cedar", "nature", "A cedar of Lebanon", "Tall, fragrant, and fit for a temple", "Psalm 92:12; Ezekiel 31", "🌲", "nature", also="lebanon tree")
M("lilies", "nature", "The lilies of the field", "And the birds of the air", "Matthew 6:25–34", "🌺", "nature", also="anemones flowers worry sermon on the mount")
M("wheat-and-tares", "nature", "The wheat and the weeds", "Let both grow together until the harvest", "Matthew 13:24–30", "🌾", "nature", also="tares darnel parable")
M("wolf-and-lamb", "nature", "The wolf and the lamb", "A little child shall lead them", "Isaiah 11:6–9; 65:25", "🐑", "nature", also="lion lamb peaceable kingdom")
M("ram-in-the-thicket", "nature", "The ram in the thicket", "Abraham and Isaac on Mount Moriah", "Genesis 22:1–14", "🐏", "nature", also="sacrifice of isaac akedah moriah")
M("dove-and-raven", "nature", "The dove and the olive leaf", "And the raven that didn't come back", "Genesis 8:6–12", "🕊️", "nature", also="noah flood")
M("eagle", "nature", "Wings like eagles", "Renewed strength, and borne on eagles' wings", "Isaiah 40:31; Exodus 19:4", "🦅", "nature")
M("sparrows", "nature", "Two sparrows for a penny", "Not one falls without your Father", "Matthew 10:29–31", "🐦", "nature", also="birds")
M("rooster", "nature", "The rooster crowed", "Peter's denial by the fire", "Mark 14:66–72", "🐓", "nature", also="cock peter denial")
M("scapegoat", "nature", "The scapegoat", "Sins confessed over it and sent into the wilderness", "Leviticus 16:20–22", "🐐", "nature", also="day of atonement azazel goat")
M("locusts-and-honey", "nature", "Locusts and wild honey", "John the Baptist's food and clothing", "Mark 1:6", "🍯", "nature", also="john the baptist")
M("garden-tree", "nature", "The tree in the garden", "The tree of knowledge, the serpent and the tree of life", "Genesis 2:8–17; 3:1–7", "🍎", "nature", also="eden adam eve serpent fall apple")
M("hen-and-chicks", "nature", "A hen and her chicks", "“How often would I have gathered your children”", "Matthew 23:37", "🐔", "nature", also="chickens jerusalem")
M("lost-sheep", "nature", "The lost sheep", "Carried home on the shepherd's shoulders", "Luke 15:3–7", "🐑", "nature", also="good shepherd parable ninety-nine")
M("ravens-feed-elijah", "nature", "Ravens feed Elijah", "Bread and meat by the brook Cherith", "1 Kings 17:1–7", "🐦‍⬛", "nature", also="raven elijah cherith")
M("go-to-the-ant", "nature", "Go to the ant", "Small but exceedingly wise", "Proverbs 6:6–8; 30:25", "🐜", "nature", also="sluggard proverbs ants")


# More objects (pack-things.js)
M("solomons-cherubim", "size", "Solomon's cherubim", "Ten cubits tall, wingtip to wingtip across the Most Holy Place", "1 Kings 6:23–28", "👼", "things", also="cherubim temple most holy place")
M("jachin-and-boaz", "worship", "Jachin and Boaz", "Two bronze pillars eighteen cubits high", "1 Kings 7:15–22", "🏛️", "things", also="pillars temple bronze")
M("solomons-altar", "size", "Solomon's bronze altar", "Twenty cubits square, beside the tabernacle's", "2 Chronicles 4:1", "🔥", "things", also="altar burnt offering")
M("teraphim", "worship", "Rachel's household gods", "Hidden in the camel's saddle", "Genesis 31:19–35", "🗿", "things", also="idols laban teraphim")
M("high-place", "worship", "A high place", "Standing stones and an Asherah pole", "1 Kings 14:23; 2 Kings 23:13–15", "⛰️", "things", also="idolatry asherah baal josiah")
M("bronze-mirror", "home", "A bronze mirror", "Seeing in a mirror dimly", "1 Corinthians 13:12; James 1:23", "🪞", "things", also="mirror love chapter")
M("jeremiahs-belt", "signs", "Jeremiah's linen belt", "Hidden by the Euphrates and dug up ruined", "Jeremiah 13:1–11", "🎗️", "things", also="loincloth sash girdle")
M("broken-flask", "signs", "Jeremiah's broken flask", "Smashed at the Potsherd Gate", "Jeremiah 19:1–11", "🏺", "things", also="potter jar")
M("deeds-in-a-jar", "money", "Deeds in a clay jar", "Jeremiah buys a field as Jerusalem falls", "Jeremiah 32:6–15", "🫙", "things", also="field anathoth hope")
M("lydias-purple", "work", "Lydia's purple cloth", "Dye vats, murex shells and the first church in Europe", "Acts 16:13–15, 40", "🟣", "things", also="purple dye philippi thyatira")
M("almond-branch", "nature", "The almond branch", "“I am watching over my word”", "Jeremiah 1:11–12", "🌸", "things", also="almond blossom")
M("jonahs-plant", "nature", "Jonah's plant", "Shade, a worm and a scorching wind", "Jonah 4:5–11", "🌿", "things", also="gourd vine nineveh")
M("pinnacle", "places", "The pinnacle of the temple", "“Throw yourself down”", "Matthew 4:5–7", "🏛️", "things", also="temptation corner temple mount")
M("unknown-god", "places", "The altar to an unknown god", "Paul in Athens", "Acts 17:16–34", "🏛️", "things", also="athens areopagus mars hill")
M("granaries", "work", "Joseph's granaries", "Grain like the sand of the sea", "Genesis 41:47–57", "🌾", "things", also="egypt famine storehouses")
M("ivory-house", "home", "Ahab's ivory house", "Carved ivory panels and beds of ivory", "1 Kings 22:39; Amos 6:4", "🐘", "things", also="samaria ivory luxury")
M("peters-vision", "signs", "Peter's vision on the roof", "A great sheet let down from heaven", "Acts 10:9–16", "🕊️", "things", also="joppa cornelius clean unclean")
M("measures", "money", "Omer, ephah and bath", "Measures of grain and oil, to scale", "Exodus 16:36; Ezekiel 45:11", "🧺", "things", also="weights measures volume homer seah")
M("cubit", "money", "How long is a cubit?", "Finger, handbreadth, span and cubit", "Genesis 6:15; Ezekiel 40:5", "📏", "things", also="measures length span handbreadth")

# Scenes from the stories (pack-stories.js)
M("prodigal-son", "scenes", "The prodigal son comes home", "The father runs; a robe, a ring, sandals and a feast", "Luke 15:11–32", "🏃", "stories", also="lost son parable father")
M("naaman", "scenes", "Naaman in the Jordan", "Seven times, and clean", "2 Kings 5:1–14", "🌊", "stories", also="leprosy elisha syria")
M("widows-oil", "signs", "The widow's oil", "Every jar filled from one", "2 Kings 4:1–7", "🫙", "stories", also="elisha miracle jars")
M("flour-and-oil", "signs", "Flour and oil that didn't run out", "The widow of Zarephath and Elijah", "1 Kings 17:8–16", "🫓", "stories", also="zarephath elijah widow")
M("prophets-room", "home", "The prophet's room on the roof", "A bed, a table, a chair and a lamp", "2 Kings 4:8–37", "🛏️", "stories", also="shunammite elisha hospitality")
M("broom-tree", "scenes", "Elijah under the broom tree", "“Arise and eat”", "1 Kings 19:1–8", "🌳", "stories", also="juniper angel jezebel depression")
M("gethsemane", "passion", "Gethsemane", "Praying among the olive trees", "Matthew 26:36–46; Luke 22:39–46", "🫒", "stories", also="garden prayer agony")
M("lots-wife", "signs", "Lot's wife", "A pillar of salt", "Genesis 19:15–26; Luke 17:32", "🧂", "stories", also="sodom gomorrah salt")
M("sackcloth", "scenes", "Sackcloth and ashes", "The king of Nineveh repents", "Jonah 3:5–10", "🙇", "stories", also="repentance mourning nineveh")
M("red-stew", "home", "Esau's red stew", "A birthright for a bowl of lentils", "Genesis 25:29–34", "🍲", "stories", also="jacob esau birthright lentils")
M("basket-over-the-wall", "scenes", "Paul let down in a basket", "Escaping Damascus by night", "Acts 9:23–25", "🧺", "stories", also="saul damascus escape")
M("lazarus", "scenes", "Lazarus, come out", "Raised after four days in the tomb", "John 11:1–44", "⚱️", "stories", also="resurrection bethany martha mary")
M("peter-freed", "scenes", "Peter freed from prison", "Chains fall off and the iron gate opens", "Acts 12:1–17", "⛓️", "stories", also="angel prison herod rhoda")
M("viper-on-malta", "scenes", "The viper on Malta", "Shaken off into the fire", "Acts 28:1–6", "🐍", "stories", also="snake paul shipwreck")
M("transfiguration", "signs", "The transfiguration", "Moses, Elijah and three tents on the mountain", "Matthew 17:1–8", "✨", "stories", also="mount moses elijah")
M("walking-on-water", "signs", "Walking on the water", "“Take heart; it is I”", "Matthew 14:22–33", "🌊", "stories", also="peter storm galilee")


# Kings and prophets (pack-prophets.js)
M("queen-of-sheba", "scenes", "The queen of Sheba's visit", "Spices, gold and hard questions for Solomon", "1 Kings 10:1–13", "🐪", "prophets", also="sheba solomon wisdom")
M("book-of-the-law", "scenes", "The Book of the Law found", "Josiah hears it read and tears his clothes", "2 Kings 22:3–13", "📜", "prophets", also="josiah hilkiah reform")
M("ezras-pulpit", "scenes", "Ezra reads the Law", "From a wooden platform, morning till midday", "Nehemiah 8:1–12", "📖", "prophets", also="ezra nehemiah reading scripture")
M("job-among-the-ashes", "scenes", "Job among the ashes", "Seven days of silence with his friends", "Job 2:7–13", "🏺", "prophets", also="suffering friends potsherd")
M("cornerstone", "signs", "The cornerstone", "The stone the builders rejected", "Psalm 118:22; Isaiah 28:16; 1 Peter 2:4–7", "🧱", "prophets", also="chief corner stone")
M("burned-scroll", "signs", "The king burns Jeremiah's scroll", "Cut column by column into the brazier", "Jeremiah 36:20–32", "🔥", "prophets", also="jehoiakim baruch")
M("river-from-the-temple", "signs", "The river from the temple", "Ankle-deep, knee-deep, deep enough to swim", "Ezekiel 47:1–12", "🏞️", "prophets", also="ezekiel vision water life")
M("daniels-window", "scenes", "Daniel's open window", "Praying three times a day towards Jerusalem", "Daniel 6:10", "🪟", "prophets", also="prayer daniel")
M("summer-fruit", "signs", "A basket of summer fruit", "Amos's vision of the end", "Amos 8:1–2", "🧺", "prophets", also="amos vision")

# Parables, Gospel scenes and the early church (pack-gospel.js)
M("good-samaritan", "scenes", "The good Samaritan", "Oil and wine, a donkey and an inn", "Luke 10:25–37", "🫏", "gospel", also="parable neighbour samaritan")
M("sower", "nature", "The parable of the sower", "Path, rocks, thorns and good soil", "Mark 4:1–20", "🌱", "gospel", also="seed soil parable")
M("wise-builder", "places", "The wise and foolish builders", "A house on the rock and a house on the sand", "Matthew 7:24–27", "🏠", "gospel", also="rock sand storm parable")
M("hidden-treasure", "money", "Hidden treasure and a pearl", "Worth everything", "Matthew 13:44–46", "💎", "gospel", also="pearl of great price parable")
M("baptism-of-jesus", "scenes", "The baptism of Jesus", "The Spirit like a dove, and the Father's voice", "Matthew 3:13–17", "🕊️", "gospel", also="jordan john baptist dove")
M("stone-pavement", "passion", "The Stone Pavement", "Pilate's judgment seat, Gabbatha", "John 19:13–16", "⚖️", "gospel", also="pilate gabbatha trial")
M("emmaus", "passion", "Supper at Emmaus", "Known in the breaking of the bread", "Luke 24:13–35", "🍞", "gospel", also="road to emmaus resurrection")
M("ascension", "passion", "The ascension", "A cloud took him out of their sight", "Acts 1:6–11", "☁️", "gospel", also="mount of olives")
M("damascus-road", "scenes", "The Damascus road", "A light from heaven, and Saul struck blind", "Acts 9:1–9", "💡", "gospel", also="paul conversion saul")
M("tabithas-garments", "scenes", "Tabitha, arise", "The widows show Peter the clothes she made", "Acts 9:36–42", "👗", "gospel", also="dorcas joppa")
M("pauls-cloak", "money", "Paul's cloak, books and parchments", "“Bring them before winter”", "2 Timothy 4:9–21", "🧥", "gospel", also="timothy prison scrolls")
M("victors-wreath", "signs", "Run the race", "The finish line and a perishable wreath", "1 Corinthians 9:24–27; Hebrews 12:1–2", "🏅", "gospel", also="crown race athlete games")


BY_SLUG = {m["slug"]: m for m in MODELS}


# ------------------------------------------------------------ which chapters each model shows

import re as _re

_BOOK_ALIASES = {"psalm": "Psalms", "song of songs": "Song of Solomon"}


def _book_slugs():
    from bible_books import ALL_BOOKS
    names = {b["name"].lower(): b["slug"] for b in ALL_BOOKS}
    for a, real in _BOOK_ALIASES.items():
        names[a] = names[real.lower()]
    return names


def _chapters_in(ref, names):
    """'Exodus 25:10–22; 38:8' -> [('exodus', 25), ('exodus', 38)]. Ranges of chapters
    ('Exodus 25–27', 'Jonah 1:17–2:10') give every chapter in between."""
    out, book = [], None
    for part in (ref or "").replace("—", "–").split(";"):
        part = part.strip()
        m = _re.match(r"^((?:[1-3] )?[A-Za-z][A-Za-z ]*?)\s+(\d.*)$", part)
        if m and m.group(1).lower() in names:
            book, spec = names[m.group(1).lower()], m.group(2)
        elif book and _re.match(r"^\d", part):
            spec = part
        else:
            continue
        spec = spec.split(",")[0].strip()
        r = _re.match(r"^(\d+)(?::(\d+))?(?:[–-](\d+)(?::(\d+))?)?", spec)
        if not r:
            continue
        c1 = int(r.group(1))
        c2 = c1
        if r.group(3):
            # "25–27" is a chapter range; "25:10–22" is verses in one chapter; "1:17–2:10" spans chapters.
            if r.group(2) is None or r.group(4) is not None:
                c2 = int(r.group(3))
        out += [(book, c) for c in range(c1, min(c2, c1 + 40) + 1)]
    return out


_INDEX = None


def for_chapter(book_slug, chapter):
    """Models built from this chapter, for the 'In 3D' links on the chapter page."""
    global _INDEX
    if _INDEX is None:
        names, idx = _book_slugs(), {}
        for m in MODELS:
            for key in dict.fromkeys(_chapters_in(m["ref"], names)):
                idx.setdefault(key, []).append(m)
        _INDEX = idx
    return _INDEX.get((book_slug, chapter), [])
