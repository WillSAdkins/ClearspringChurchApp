/* Clearspring — your prayer list, kept the way PrayerMate does it.

   You keep a card for each person or cause you pray for, sorted into
   categories (Family, Friends, Church family…). Each card holds its own prayer
   points. Each day the app deals you a few cards from every category — the
   ones you've gone longest without praying for — so a long list comes round
   steadily instead of all at once. A card can also be pinned to every day,
   chosen weekdays, or a date each month.

   Some categories are "feeds" from the church instead of your own cards: the
   prayer wall, the country of the day, the church's ministries, and requests
   from your groups.

   Private: kept on this device, and in your own account when signed in
   (sync kind "pcards"). The church never sees it.

   Storage "cs_pcards": { cats: [...], catsU, subjects: [...], migrated }
     cat:     { id, name, perDay (0 = none, 99 = all), feed?: "wall"|"world"|"ministries"|"groups", on }
     subject: { id, cat, name, notes: [{ id, text, at, answered, answeredAt, answer }],
                sched: { t: "rotate"|"daily"|"days"|"month", days: [0-6], date: 1-31 },
                last: "YYYY-MM-DD" | null, count, created, u, del }
   "cs_pcards_today": { date, ids: [...], feed: {feedId: [itemIds]} }  today's dealt cards
   "cs_pcards_feeds":  cached feed items, for offline
   "cs_pcards_seen":   { feedId: { itemId: "YYYY-MM-DD" } }  when each feed item was last shown */
window.PrayerCards = (function () {
  "use strict";
  var KEY = "cs_pcards", TODAY = "cs_pcards_today", FEEDS = "cs_pcards_feeds", SEEN = "cs_pcards_seen";

  var DEFAULT_CATS = [
    { id: "family", name: "Family", perDay: 1 },
    { id: "friends", name: "Friends", perDay: 1 },
    { id: "church", name: "Church family", perDay: 1 },
    { id: "mission", name: "Mission and missionaries", perDay: 1 },
    { id: "work", name: "Work, school and neighbours", perDay: 1 },
    { id: "world", name: "The world", perDay: 1 },
    { id: "me", name: "Me", perDay: 1 },
    { id: "f-wall", name: "Clearspring prayer wall", perDay: 2, feed: "wall" },
    { id: "f-groups", name: "My groups", perDay: 2, feed: "groups" },
    { id: "f-world", name: "Country of the day", perDay: 1, feed: "world" },
    { id: "f-ministries", name: "The church's ministries", perDay: 1, feed: "ministries", on: false }
  ];
  var FEED_ABOUT = {
    wall: "Requests people have shared on the church's prayer wall.",
    groups: "Prayer requests from groups you're in (when you're signed in).",
    world: "A different country each day, with ways to pray for it.",
    ministries: "One of the church's ministries each day, and the people in it."
  };
  var OLD_CATS = { family: "family", friends: "friends", church: "church", work: "work", world: "world", me: "me", other: "friends" };

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function now() { return Date.now(); }

  /* ------------------------------------------------------------ state */
  function load() {
    var s = jget(KEY, null);
    if (!s || !Array.isArray(s.cats)) {
      s = { cats: DEFAULT_CATS.map(function (c) { return Object.assign({ on: true }, c); }), catsU: 0, subjects: [] };
    }
    s.subjects = Array.isArray(s.subjects) ? s.subjects : [];
    s.cats.forEach(function (c) { if (c.on == null) c.on = true; if (c.perDay == null) c.perDay = 1; });
    // A feed added in a later version of the app shows up for everyone.
    DEFAULT_CATS.forEach(function (d) {
      if (d.feed && !s.cats.some(function (c) { return c.feed === d.feed; })) s.cats.push(Object.assign({ on: d.on !== false }, d));
    });
    migrate(s);
    return s;
  }
  function save(s) { jset(KEY, s); }

  /* Requests added the older way (the old "My prayers" list, or "Add to my
     prayers" on other pages) become cards, named after who they're for, so
     nothing is lost. Each is brought in once (remembered by "from"). */
  function migrate(s) {
    var old = jget("cs_prayer_journal", []);
    if (!old.length) return;
    var have = {}, added = false;
    s.subjects.forEach(function (x) { if (x.from) have[x.from] = 1; });
    old.forEach(function (x) {
      if (!x || x.kind === "thanks" || x.answered || have[x.at]) return;
      var text = (x.text || "").trim(), name = (x.who || "").trim();
      if (!name) name = text.length > 48 ? text.slice(0, 46).replace(/\s+\S*$/, "") + "…" : text;
      if (!name) return;
      var note = x.who || text.length > 48 ? [{ id: uid("n"), text: text, at: x.at }] : [];
      var it = {
        id: uid("s"), from: x.at, cat: OLD_CATS[x.cat] || "friends", name: name, notes: note,
        sched: x.days && x.days.length && x.days.length < 7 ? { t: "days", days: x.days } : { t: "rotate" },
        last: x.lastPrayed || null, count: x.prayed || 0, created: x.at, u: now()
      };
      s.subjects.push(it); added = true;
      if (window.Sync) setTimeout(function () { pushSubject(it); }, 0);
    });
    if (added) save(s);
  }

  function cats() { return load().cats; }
  function cat(id) { return cats().find(function (c) { return c.id === id; }) || null; }
  function subjects(catId) {
    return load().subjects.filter(function (x) { return !x.del && (!catId || x.cat === catId); });
  }
  function subject(id) { return load().subjects.find(function (x) { return x.id === id && !x.del; }) || null; }

  function changeSubject(id, fn) {
    var s = load(), it = s.subjects.find(function (x) { return x.id === id; });
    if (!it) return null;
    fn(it); it.u = now(); save(s); pushSubject(it);
    return it;
  }
  function addSubject(fields) {
    var s = load();
    var it = Object.assign({ id: uid("s"), cat: "friends", name: "", notes: [], sched: { t: "rotate" },
                             last: null, count: 0, created: new Date().toISOString() }, fields, { u: now() });
    if (typeof fields.note === "string" && fields.note.trim()) {
      it.notes = [{ id: uid("n"), text: fields.note.trim(), at: new Date().toISOString() }];
    }
    delete it.note;
    s.subjects.push(it); save(s); pushSubject(it);
    return it;
  }
  function updateSubject(id, fields) { return changeSubject(id, function (it) { Object.assign(it, fields); }); }
  function removeSubject(id) {
    // Kept as a tombstone so another device doesn't bring it back.
    return changeSubject(id, function (it) { it.del = true; it.notes = []; it.name = ""; });
  }
  function addNote(id, text) {
    return changeSubject(id, function (it) { it.notes.unshift({ id: uid("n"), text: text, at: new Date().toISOString() }); });
  }
  function updateNote(id, noteId, fields) {
    return changeSubject(id, function (it) {
      var n = it.notes.find(function (x) { return x.id === noteId; });
      if (n) Object.assign(n, fields);
    });
  }
  function removeNote(id, noteId) {
    return changeSubject(id, function (it) { it.notes = it.notes.filter(function (x) { return x.id !== noteId; }); });
  }
  function answerNote(id, noteId, answer) {
    return updateNote(id, noteId, { answered: true, answeredAt: new Date().toISOString(), answer: answer || "" });
  }
  function markPrayed(id) {
    var t = dayKey();
    var it = changeSubject(id, function (x) { if (x.last !== t) x.count = (x.count || 0) + 1; x.last = t; });
    if (window.Prayers && window.Prayers.logDay) window.Prayers.logDay();
    return it;
  }

  function saveCats(list) {
    var s = load();
    s.cats = list; s.catsU = now(); save(s); pushCats(s);
    jset(TODAY, null);   // deal again with the new settings
  }
  function addCat(name) {
    var list = cats().slice();
    var c = { id: uid("c"), name: name, perDay: 1, on: true };
    var firstFeed = list.findIndex(function (x) { return x.feed; });
    if (firstFeed < 0) list.push(c); else list.splice(firstFeed, 0, c);
    saveCats(list);
    return c;
  }
  function removeCat(id, moveTo) {
    var s = load();
    s.subjects.forEach(function (x) { if (x.cat === id && !x.del) { x.cat = moveTo; x.u = now(); pushSubject(x); } });
    save(s);
    saveCats(cats().filter(function (c) { return c.id !== id; }));
  }

  /* ------------------------------------------------------------ schedule */
  function dueToday(it, d) {
    d = d || new Date();
    var sc = it.sched || { t: "rotate" };
    if (sc.t === "daily") return true;
    if (sc.t === "days") return (sc.days || []).indexOf(d.getDay()) >= 0;
    if (sc.t === "month") {
      var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return Math.min(sc.date || 1, last) === d.getDate();
    }
    return false;
  }
  var DAYN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function schedLabel(sc) {
    sc = sc || { t: "rotate" };
    if (sc.t === "daily") return "Every day";
    if (sc.t === "days") {
      var s = (sc.days || []).slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
      if (s.join() === "1,2,3,4,5") return "Weekdays";
      if (s.join() === "6,0") return "Weekends";
      return s.map(function (x) { return DAYN[x]; }).join(", ") || "Chosen days";
    }
    if (sc.t === "month") return "The " + ordinal(sc.date || 1) + " of each month";
    return "In turn";
  }

  /* The cards for a category today: anything pinned to today, plus the
     next few in turn (longest since last prayed first). */
  function dealCategory(c, d) {
    var list = subjects(c.id);
    var pinned = list.filter(function (x) { return dueToday(x, d); });
    var turn = list.filter(function (x) { return !x.sched || x.sched.t === "rotate"; })
      .sort(function (a, b) { return (a.last || "").localeCompare(b.last || "") || (a.created || "").localeCompare(b.created || ""); });
    var n = c.perDay >= 99 ? turn.length : Math.max(0, c.perDay | 0);
    return pinned.concat(turn.slice(0, n)).map(function (x) { return x.id; });
  }

  function feedCache() { return jget(FEEDS, { at: 0, feeds: {} }); }
  function dealFeed(c, d) {
    var items = (feedCache().feeds || {})[c.feed] || [];
    if (!items.length || !c.perDay) return [];
    if (c.feed === "world") return items.slice(0, 1).map(function (x) { return x.id; });
    var seen = jget(SEEN, {})[c.feed] || {};
    var n = c.perDay >= 99 ? items.length : c.perDay;
    return items.slice().sort(function (a, b) { return (seen[a.id] || "").localeCompare(seen[b.id] || ""); })
      .slice(0, n).map(function (x) { return x.id; });
  }

  /* Today's deck, dealt once a day and kept so it doesn't shuffle as you go. */
  function today(opts) {
    opts = opts || {};
    var t = dayKey(), saved = jget(TODAY, null);
    if (saved && saved.date === t && !opts.redeal) return saved;
    var deck = { date: t, cards: [] };
    cats().forEach(function (c) {
      if (c.on === false) return;
      if (c.feed) dealFeed(c).forEach(function (id) { deck.cards.push({ feed: c.feed, cat: c.id, id: id }); });
      else dealCategory(c).forEach(function (id) { deck.cards.push({ cat: c.id, id: id }); });
    });
    jset(TODAY, deck);
    var seen = jget(SEEN, {});
    deck.cards.forEach(function (k) { if (k.feed) { seen[k.feed] = seen[k.feed] || {}; seen[k.feed][k.id] = t; } });
    jset(SEEN, seen);
    return deck;
  }
  /* Resolve a dealt card to what's shown (skips cards since deleted). */
  function resolve(card) {
    if (card.feed) {
      var items = (feedCache().feeds || {})[card.feed] || [];
      var f = items.find(function (x) { return x.id === card.id; });
      return f ? Object.assign({ kind: "feed", feed: card.feed, cat: card.cat }, f) : null;
    }
    var s = subject(card.id);
    return s ? Object.assign({ kind: "subject" }, s) : null;
  }
  function todayCards() {
    return today().cards.map(resolve).filter(Boolean);
  }
  function todayPersonal() {
    return todayCards().filter(function (c) { return c.kind === "subject"; });
  }

  /* ------------------------------------------------------------ feeds */
  function refreshFeeds() {
    return fetch("/api/prayer/feeds", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.feeds) return false;
        var before = JSON.stringify(feedCache().feeds || {});
        jset(FEEDS, { at: now(), feeds: data.feeds });
        var deck = jget(TODAY, null);
        // First time today with fresh feeds: re-deal the feed cards only.
        if (deck && deck.date === dayKey() && before !== JSON.stringify(data.feeds) && !deck.feedsFresh) {
          var keep = deck.cards.filter(function (k) { return !k.feed; });
          var re = { date: deck.date, cards: [], feedsFresh: true };
          cats().forEach(function (c) {
            if (c.on === false) return;
            if (c.feed) dealFeed(c).forEach(function (id) { re.cards.push({ feed: c.feed, cat: c.id, id: id }); });
            else keep.filter(function (k) { return k.cat === c.id; }).forEach(function (k) { re.cards.push(k); });
          });
          jset(TODAY, re);
        }
        return true;
      }).catch(function () { return false; });
  }

  /* ------------------------------------------------------------ sync */
  function pushSubject(it) { if (window.Sync) window.Sync.push("pcards", it.id, it); }
  function pushCats(s) { if (window.Sync) window.Sync.push("pcards", "cats", { cats: s.cats, u: s.catsU }); }
  function signedIn() {
    var m = document.querySelector('meta[name="member-signed-in"]');
    return !!(m && m.content === "true");
  }
  function sync() {
    if (!window.Sync || !signedIn()) return Promise.resolve(false);
    return window.Sync.pull("pcards").then(function (remote) {
      var s = load(), changed = false, up = [];
      var byId = {};
      s.subjects.forEach(function (x) { byId[x.id] = x; });
      var remoteIds = {};
      (remote || []).forEach(function (r) {
        if (!r || !r.value) return;
        if (r.key === "cats") {
          if ((r.value.u || 0) > (s.catsU || 0) && Array.isArray(r.value.cats)) { s.cats = r.value.cats; s.catsU = r.value.u; changed = true; }
          else if ((s.catsU || 0) > (r.value.u || 0)) up.push({ key: "cats", value: { cats: s.cats, u: s.catsU } });
          remoteIds.cats = 1;
          return;
        }
        remoteIds[r.key] = 1;
        var mine = byId[r.key];
        if (!mine) { s.subjects.push(r.value); changed = true; }
        else if ((r.value.u || 0) > (mine.u || 0)) { Object.assign(mine, r.value); changed = true; }
        else if ((mine.u || 0) > (r.value.u || 0)) up.push({ key: mine.id, value: mine });
      });
      s.subjects.forEach(function (x) { if (!remoteIds[x.id]) up.push({ key: x.id, value: x }); });
      if (!remoteIds.cats && s.catsU) up.push({ key: "cats", value: { cats: s.cats, u: s.catsU } });
      if (changed) save(s);
      if (up.length) window.Sync.pushAll("pcards", up);
      return changed;
    }).catch(function () { return false; });
  }

  return {
    cats: cats, cat: cat, subjects: subjects, subject: subject,
    addSubject: addSubject, updateSubject: updateSubject, removeSubject: removeSubject,
    addNote: addNote, updateNote: updateNote, removeNote: removeNote, answerNote: answerNote,
    markPrayed: markPrayed, saveCats: saveCats, addCat: addCat, removeCat: removeCat,
    dueToday: dueToday, schedLabel: schedLabel, today: today, todayCards: todayCards, todayPersonal: todayPersonal,
    refreshFeeds: refreshFeeds, feedAbout: FEED_ABOUT, sync: sync, dayKey: dayKey
  };
})();
