/* Clearspring — My discipleship.

   Prayer, scripture and study over the weeks, worked out from what the app
   already keeps (prayer log and journal, reading log, study notes, memory
   verses, the Foundations course, your rhythm of life), plus anything ticked
   by hand on this page.

   The same gentle rules as streaks elsewhere: one missed day never breaks a
   run, days-this-month never resets, and the words never scold. */
window.Discipleship = (function () {
  "use strict";
  var GRACE = 1;
  var DEFAULT_GOALS = { prayer: 5, scripture: 5, study: 2 };
  var HABITS = [
    { key: "prayer", name: "Prayer", verb: "prayed", tick: "I prayed today", icon: "🙏" },
    { key: "scripture", name: "Scripture", verb: "read the Bible", tick: "I read the Bible today", icon: "📖" },
    { key: "study", name: "Study", verb: "studied", tick: "I studied or memorised", icon: "✍️" }
  ];
  var PRAYERISH = /pray|examen|thank|worship|fast|silence|lord's prayer/i;
  var READISH = /read|bible|scripture|psalm|gospel/i;

  /* ---------- dates, all local ---------- */
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parse(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function add(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function today() { return iso(new Date()); }
  function dayOf(stamp) {                       // ISO timestamp or date → local YYYY-MM-DD
    if (!stamp) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return stamp;
    var d = new Date(stamp); return isNaN(d) ? null : iso(d);
  }
  function weekStart(s) { var d = parse(s), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); }  // Monday
  function isDate(k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }

  /* ---------- gathering ---------- */
  function safe(fn, d) { try { var v = fn(); return v == null ? d : v; } catch (e) { return d; } }

  function gather() {
    var t = today(), sets = { prayer: {}, scripture: {}, study: {} };
    function mark(h, day) { if (day && isDate(day) && day <= t && day > "2000-01-01") sets[h][day] = 1; }

    // Prayer: days logged, journal entries written, requests prayed for.
    var pdays = safe(function () { return window.Prayers.days(); }, {});
    Object.keys(pdays).forEach(function (k) { if (pdays[k]) mark("prayer", k); });
    var prayers = safe(function () { return window.Prayers.all(); }, []);
    prayers.forEach(function (p) { mark("prayer", dayOf(p.at)); mark("prayer", p.lastPrayed); if (p.answeredAt) mark("prayer", dayOf(p.answeredAt)); });

    // Scripture: the reading log.
    var log = safe(function () { return window.Plans.readLog(); }, { chapters: {}, days: {} });
    Object.keys(log.days || {}).forEach(function (k) { if (log.days[k] > 0) mark("scripture", k); });

    // Study: study journal, verse notes, sermon notes, memory verses, the course.
    var notes = [];
    ["soap", "vnote", "talk"].forEach(function (k) {
      safe(function () { return window.Study.all(k); }, []).forEach(function (n) { notes.push(n); mark("study", dayOf(n.created)); mark("study", dayOf(n.updated)); });
    });
    var mem = safe(function () { return window.Memory.load(); }, { verses: {}, streak: {} });
    Object.keys(mem.verses || {}).forEach(function (k) { mark("study", mem.verses[k].learnedAt); });
    if (mem.streak && mem.streak.last) mark("study", mem.streak.last);

    var col = safe(function () { return JSON.parse(localStorage.getItem("cs_college") || "{}"); }, {}) || {};
    Object.keys(col).forEach(function (cid) { var d = (col[cid] || {}).done || {}; Object.keys(d).forEach(function (n) { mark("study", d[n]); }); });

    var grow = safe(function () { return window.Grow.load(); }, null) || {};
    var course = (grow.course && grow.course.done) || {};
    Object.keys(course).forEach(function (k) { mark("study", course[k]); });

    // Rhythm of life ticks, sorted by what the habit is about.
    var rh = grow.rhythm || { items: [], ticks: {} }, byId = {};
    (rh.items || []).forEach(function (x) { byId[x.id] = x.text || ""; });
    Object.keys(rh.ticks || {}).forEach(function (day) {
      if (!isDate(day)) return;
      (rh.ticks[day] || []).forEach(function (id) {
        var txt = byId[id] || "";
        if (READISH.test(txt)) mark("scripture", day); else if (PRAYERISH.test(txt)) mark("prayer", day);
      });
    });

    // Ticked by hand on this page.
    var habits = grow.habits || { goals: {}, manual: {} };
    Object.keys(habits.manual || {}).forEach(function (day) {
      (habits.manual[day] || []).forEach(function (h) { if (sets[h]) mark(h, day); });
    });

    return { sets: sets, prayers: prayers, log: log, notes: notes, mem: mem, grow: grow, habits: habits };
  }

  /* ---------- the sums ---------- */
  function streak(set) {
    var t = today(), d = set[t] ? t : add(t, -1), cur = 0, gap = 0, n = 0;
    while (n++ < 800) {
      if (set[d]) { cur++; gap = 0; }
      else { gap++; if (gap > GRACE) break; }
      d = add(d, -1);
    }
    return cur;
  }
  function best(set) {
    var keys = Object.keys(set).sort(), run = 0, top = 0, prev = null;
    keys.forEach(function (k) {
      if (prev && add(prev, 1 + GRACE) >= k) run++; else run = 1;
      top = Math.max(top, run); prev = k;
    });
    return top;
  }
  function countBetween(set, from, to) { var n = 0; for (var k in set) if (k >= from && k <= to) n++; return n; }

  function stats(g) {
    var t = today(), ws = weekStart(t), month = t.slice(0, 7), out = {};
    var goals = Object.assign({}, DEFAULT_GOALS, g.habits.goals || {});
    HABITS.forEach(function (h) {
      var set = g.sets[h.key], week = [];
      for (var i = 0; i < 7; i++) { var d = add(ws, i); week.push({ day: d, on: !!set[d], future: d > t, today: d === t }); }
      var recent = countBetween(set, add(t, -27), t), before = countBetween(set, add(t, -55), add(t, -28));
      out[h.key] = {
        week: week, weekDays: week.filter(function (x) { return x.on; }).length,
        goal: Math.max(1, Math.min(7, +goals[h.key] || DEFAULT_GOALS[h.key])),
        streak: streak(set), best: best(set), month: Object.keys(set).filter(function (k) { return k.slice(0, 7) === month; }).length,
        recent: recent, before: before, total: Object.keys(set).length, today: !!set[t]
      };
    });
    return out;
  }

  /* ---------- small DOM helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function link(href, cls, text) { var a = el("a", cls, text); a.href = href; return a; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  var DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  // Where the first three letters would clash or mislead.
  var ABBR = { judges: "Jdg", jude: "Jud", philippians: "Php", philemon: "Phm", "song-of-songs": "Sng", "song-of-solomon": "Sng",
               john: "Jhn", jonah: "Jon", "1-john": "1Jn", "2-john": "2Jn", "3-john": "3Jn", james: "Jas", joel: "Jol", ezekiel: "Ezk", ezra: "Ezr",
               numbers: "Num", nahum: "Nah", matthew: "Mat", mark: "Mrk" };

  function ring(h, s) {
    var pct = Math.min(1, s.weekDays / s.goal), r = 26, c = 2 * Math.PI * r;
    var wrap = el("div", "dp-ring dp-" + h.key);
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 64 64"); svg.setAttribute("aria-hidden", "true");
    [["dp-ring-bg", c], ["dp-ring-fg", c * (1 - pct)]].forEach(function (x) {
      var ci = document.createElementNS(NS, "circle");
      ci.setAttribute("cx", 32); ci.setAttribute("cy", 32); ci.setAttribute("r", r); ci.setAttribute("class", x[0]);
      ci.setAttribute("stroke-dasharray", c.toFixed(1)); ci.setAttribute("stroke-dashoffset", x[1].toFixed(1));
      svg.appendChild(ci);
    });
    wrap.appendChild(svg);
    var mid = el("span", "dp-ring-n"); mid.appendChild(el("b", null, String(s.weekDays))); mid.appendChild(el("small", null, "of " + s.goal));
    wrap.appendChild(mid);
    wrap.appendChild(el("span", "dp-ring-l", h.name));
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", h.name + ": " + s.weekDays + " of " + s.goal + " days this week");
    return wrap;
  }

  function trendWords(s) {
    if (!s.recent && !s.before) return "";
    if (s.recent > s.before + 1) return "More than the four weeks before";
    if (s.recent < s.before - 1) return "Fewer than the four weeks before";
    return "About the same as the four weeks before";
  }

  /* ---------- sections ---------- */
  function renderHero(D, S) {
    var hour = new Date().getHours(), hi = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    $("dpHello").textContent = D.name ? hi + ", " + D.name : "Your week with God";
    $("dpWeekOf").textContent = "Week of " + parse(weekStart(today())).toLocaleDateString(undefined, { day: "numeric", month: "long" });
    var bits = [], p = S.prayer.weekDays, r = S.scripture.weekDays, st = S.study.weekDays;
    if (!p && !r && !st) {
      var any = S.prayer.total + S.scripture.total + S.study.total;
      $("dpSummary").textContent = any ? "A new week, and a fresh start. Even five minutes with God today is a good place to begin."
                                       : "This page fills in as you pray, read and study in the app. Start with one small thing today.";
    } else {
      if (p) bits.push("prayed on " + plural(p, "day"));
      if (r) bits.push("read the Bible on " + plural(r, "day"));
      if (st) bits.push("studied on " + plural(st, "day"));
      var s = "This week you’ve " + (bits.length > 1 ? bits.slice(0, -1).join(", ") + " and " + bits[bits.length - 1] : bits[0]) + ".";
      var met = HABITS.filter(function (h) { return S[h.key].weekDays >= S[h.key].goal; }).map(function (h) { return h.name.toLowerCase(); });
      if (met.length === 3) s += " You’ve met all three goals.";
      else if (met.length) s += " You’ve met your " + met.join(" and ") + " goal" + (met.length > 1 ? "s" : "") + ".";
      $("dpSummary").textContent = s;
    }
    var rings = $("dpRings"); rings.textContent = "";
    HABITS.forEach(function (h) { rings.appendChild(ring(h, S[h.key])); });
  }

  function renderLog(G, S) {
    var box = $("dpLog"); box.textContent = "";
    HABITS.forEach(function (h) {
      var t = today(), hand = ((G.habits.manual || {})[t] || []).indexOf(h.key) >= 0, auto = S[h.key].today && !hand;
      var b = el("button", "dp-tick dp-" + h.key + (S[h.key].today ? " on" : "")); b.type = "button";
      b.setAttribute("aria-pressed", S[h.key].today ? "true" : "false");
      b.appendChild(el("i", null, S[h.key].today ? "✓" : ""));
      b.appendChild(el("span", null, h.tick));
      if (auto) { b.appendChild(el("small", null, "Counted from the app")); b.disabled = true; }
      b.addEventListener("click", function () {
        window.Grow.update("habits", function (x) {
          x.manual = x.manual || {}; var l = x.manual[t] = x.manual[t] || [], i = l.indexOf(h.key);
          if (i >= 0) l.splice(i, 1); else l.push(h.key);
          if (!l.length) delete x.manual[t];
          // keep about a year of hand-ticked days
          Object.keys(x.manual).sort().slice(0, -370).forEach(function (k) { delete x.manual[k]; });
        });
        render();
      });
      box.appendChild(b);
    });
  }

  function renderHabits(G, S) {
    var box = $("dpHabits"); box.textContent = "";
    var openReq = G.prayers.filter(function (p) { return p.kind === "request" && !p.answered; }).length;
    var answered = G.prayers.filter(function (p) { return p.answered; }).length;
    var month = today().slice(0, 7), log = G.log;
    var readThisMonth = 0; Object.keys(log.days || {}).forEach(function (k) { if (k.slice(0, 7) === month) readThisMonth += log.days[k] || 0; });
    var chapters = Object.keys(log.chapters || {}).length;
    var notesMonth = G.notes.filter(function (n) { return (dayOf(n.created) || "").slice(0, 7) === month; }).length;
    var verses = Object.keys(G.mem.verses || {}).map(function (k) { return G.mem.verses[k]; });
    var learnt = verses.filter(function (v) { return (v.box || 0) >= 1; }).length;
    var due = safe(function () { return window.Memory.dueList(G.mem).length; }, 0);
    var facts = {
      prayer: [["Praying for", openReq], ["Answered", answered]],
      scripture: [["Chapters this month", readThisMonth], ["Chapters read", chapters]],
      study: [["Notes this month", notesMonth], ["Verses learnt", learnt]]
    };
    var links = {
      prayer: [["Pray now", "/prayer/pray"], ["My prayers", "/prayer/journal"]],
      scripture: [["Today’s reading", "/bible/today"], ["Reading plans", "/bible/plans"]],
      study: [[due ? "Review " + plural(due, "verse") : "Memorise", "/memorise"], ["Study journal", "/bible/journal/write"]]
    };
    HABITS.forEach(function (h) {
      var s = S[h.key], card = el("article", "dp-habit dp-" + h.key);
      var top = el("div", "dp-habit-top");
      top.appendChild(el("span", "dp-habit-ic", h.icon));
      var tt = el("div"); tt.appendChild(el("h3", null, h.name));
      tt.appendChild(el("p", "dp-habit-goal", s.weekDays + " of " + s.goal + " days this week" + (s.weekDays >= s.goal ? " · goal met" : "")));
      top.appendChild(tt); card.appendChild(top);

      var dots = el("div", "dp-dots"); dots.setAttribute("role", "img");
      dots.setAttribute("aria-label", "This week: " + s.week.map(function (w, i) { return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] + (w.on ? " yes" : w.future ? " to come" : " no"); }).join(", "));
      s.week.forEach(function (w, i) {
        var d = el("span", "dp-dot" + (w.on ? " on" : "") + (w.future ? " fut" : "") + (w.today ? " now" : ""));
        d.appendChild(el("i")); d.appendChild(el("small", null, DAYS[i])); dots.appendChild(d);
      });
      card.appendChild(dots);

      var nums = el("dl", "dp-nums");
      [["Streak", plural(s.streak, "day")], ["This month", plural(s.month, "day")]].concat(facts[h.key]).forEach(function (x) {
        var d = el("div"); d.appendChild(el("dt", null, x[0])); d.appendChild(el("dd", null, String(x[1]))); nums.appendChild(d);
      });
      card.appendChild(nums);
      var tw = trendWords(s);
      if (tw || s.best > 1) card.appendChild(el("p", "dp-trend", [tw, s.best > 1 ? "Longest run: " + plural(s.best, "day") : ""].filter(Boolean).join(" · ")));
      var acts = el("div", "dp-acts");
      links[h.key].forEach(function (l) { acts.appendChild(link(l[1], "dp-act", l[0])); });
      card.appendChild(acts);
      box.appendChild(card);
    });
  }

  var filter = "all";
  function renderCal(G) {
    var cal = $("dpCal"); cal.textContent = "";
    var t = today(), start = add(weekStart(t), -77), active = 0, total = 0;
    for (var w = 0; w < 12; w++) {
      var col = el("div", "dp-cal-col");
      for (var i = 0; i < 7; i++) {
        var d = add(start, w * 7 + i), which = HABITS.filter(function (h) { return G.sets[h.key][d]; });
        var n = filter === "all" ? which.length : (G.sets[filter][d] ? 1 : 0);
        var c = el("span", "dp-cell" + (d > t ? " fut" : "") + (d === t ? " now" : ""));
        if (d <= t) {
          total++; if (n) active++;
          c.setAttribute("data-n", filter === "all" ? n : (n ? 3 : 0));
          if (filter !== "all") c.classList.add("dp-" + filter);
          c.title = parse(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + ": " +
            (which.length ? which.map(function (h) { return h.name.toLowerCase(); }).join(", ") : "nothing logged");
        }
        col.appendChild(c);
      }
      if (w % 4 === 0) col.setAttribute("data-m", parse(add(start, w * 7)).toLocaleDateString(undefined, { month: "short" }));
      cal.appendChild(col);
    }
    var name = filter === "all" ? "any habit" : filter;
    cal.setAttribute("aria-label", "Last twelve weeks: " + active + " of " + total + " days with " + name);
    var key = $("dpCalKey"); key.textContent = "";
    key.appendChild(el("span", null, active + " of " + total + " days with " + name));
    if (filter === "all") {
      var lg = el("span", "dp-legend"); lg.appendChild(el("small", null, "Less"));
      [0, 1, 2, 3].forEach(function (n) { var c = el("span", "dp-cell"); c.setAttribute("data-n", n); lg.appendChild(c); });
      lg.appendChild(el("small", null, "All three")); key.appendChild(lg);
    }
  }

  function renderBible(D, G) {
    var ch = G.log.chapters || {}, per = {};
    Object.keys(ch).forEach(function (k) { var b = k.split(".")[0]; per[b] = (per[b] || 0) + 1; });
    var tot = { ot: [0, 0], nt: [0, 0] };
    D.books.forEach(function (b) { var x = tot[b.nt ? "nt" : "ot"]; x[0] += Math.min(per[b.s] || 0, b.c); x[1] += b.c; });
    var all = tot.ot[0] + tot.nt[0], allN = tot.ot[1] + tot.nt[1];
    var box = $("dpTestaments"); box.textContent = "";
    [["Whole Bible", all, allN], ["Old Testament", tot.ot[0], tot.ot[1]], ["New Testament", tot.nt[0], tot.nt[1]]].forEach(function (x, i) {
      var pct = x[2] ? x[1] / x[2] * 100 : 0, row = el("div", "dp-test" + (i ? "" : " main"));
      var lab = el("div", "dp-test-l"); lab.appendChild(el("span", null, x[0]));
      lab.appendChild(el("b", null, (pct > 0 && pct < 1 ? "<1" : Math.round(pct)) + "%"));
      row.appendChild(lab);
      var bar = el("span", "dp-bar"), fill = el("i"); fill.style.width = Math.max(pct ? 1.5 : 0, pct) + "%"; bar.appendChild(fill); row.appendChild(bar);
      row.appendChild(el("small", null, x[1] + " of " + x[2] + " chapters"));
      box.appendChild(row);
    });
    var grid = $("dpBooks"); grid.textContent = "";
    D.books.forEach(function (b, i) {
      var n = Math.min(per[b.s] || 0, b.c), pct = n / b.c;
      var a = link("/bible/read/" + b.s + "/1", "dp-book" + (pct >= 1 ? " full" : n ? " part" : "") + (i === 39 ? " nt1" : ""));
      a.style.setProperty("--p", (pct * 100).toFixed(0) + "%");
      a.title = b.n + ": " + n + " of " + b.c + " chapters";
      a.setAttribute("aria-label", b.n + ", " + n + " of " + b.c + " chapters read");
      a.appendChild(el("span", null, ABBR[b.s] || b.n.replace(/^(\d) /, "$1").slice(0, 3)));
      grid.appendChild(a);
    });
  }

  function pathStages(D, G) {
    var g = G.grow, stepsDone = 0, courseDone = 0;
    var sd = (g.steps && g.steps.done) || {}, cd = (g.course && g.course.done) || {};
    D.steps.forEach(function (s) { if (sd[s.slug]) stepsDone++; });
    D.sessions.forEach(function (s) { if (cd[s.slug]) courseDone++; });
    var ci = (g.checkins && g.checkins.list) || [], story = g.story || {};
    var storyStarted = !!(story.short || Object.keys(story.parts || {}).some(function (k) { return (story.parts[k] || "").trim(); }));
    return [
      { t: "First steps", s: "For your first weeks as a Christian", href: "/grow/first-steps", n: stepsDone, of: D.steps.length, optional: true },
      { t: "Foundations", s: "The basics of the faith, session by session", href: "/grow/foundations", n: courseDone, of: D.sessions.length },
      { t: "A rhythm of life", s: "A few habits that fit your week", href: "/grow/rhythm", done: !!(g.rhythm && g.rhythm.items && g.rhythm.items.length) },
      { t: "Check in", s: ci.length ? "Last time: " + new Date(ci[0].at).toLocaleDateString(undefined, { day: "numeric", month: "long" }) : "How you’re really doing, in eight areas", href: "/grow/check-in", done: !!ci.length },
      { t: "Belong to a group", s: "Grow alongside others", href: D.signedIn ? "/groups" : "/grow/next-steps", done: !!D.inGroup },
      { t: "Find your gifts", s: "How God has made you to serve", href: "/grow/gifts", done: !!(g.gifts && g.gifts.results) },
      { t: "Your story", s: "Put what God has done into words", href: "/grow/story", done: storyStarted },
      { t: "Next steps at church", s: "Baptism, serving and membership", href: "/grow/next-steps", done: false, open: true }
    ];
  }

  function renderPath(D, G) {
    var stages = pathStages(D, G), ol = $("dpPath"); ol.textContent = "";
    var laterStarted = stages.slice(1).some(function (s) { return s.done || s.n; });
    var next = null;
    stages.forEach(function (s) {
      s.complete = s.of ? s.n >= s.of : s.done;
      if (!next && !s.complete && !(s.optional && laterStarted) && !s.open) next = s;
    });
    if (!next) next = stages[stages.length - 1];
    stages.forEach(function (s) {
      var li = el("li", "dp-stage" + (s.complete ? " done" : "") + (s.of && s.n && !s.complete ? " part" : "") + (s === next ? " next" : ""));
      var a = link(s.href, "dp-stage-a");
      a.appendChild(el("i", "dp-stage-mark", s.complete ? "✓" : ""));
      var tx = el("span", "dp-stage-t"); tx.appendChild(el("b", null, s.t));
      var sub = s.of ? (s.n ? s.n + " of " + s.of + " done" : s.s) : s.s;
      tx.appendChild(el("small", null, sub));
      if (s.of && s.n && !s.complete) { var bar = el("span", "dp-bar"), f = el("i"); f.style.width = (s.n / s.of * 100) + "%"; bar.appendChild(f); tx.appendChild(bar); }
      a.appendChild(tx);
      if (s === next) a.appendChild(el("span", "dp-stage-next", "Next"));
      li.appendChild(a); ol.appendChild(li);
    });
    return next;
  }

  function renderCheck(D, G) {
    var box = $("dpCheck"); box.textContent = "";
    var list = (G.grow.checkins && G.grow.checkins.list) || [];
    if (!list.length) {
      var p = el("p", "gw-note", "Answer a few honest questions about eight areas of following Jesus, and see where you’d like to grow. It takes about five minutes, and only you see it.");
      box.appendChild(p); box.appendChild(link("/grow/check-in", "ps-link", "Check in now"));
      return;
    }
    function score(e, k) { var v = (e.a || {})[k] || []; return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / (v.length * 3) : 0; }
    var last = list[0], prev = list[1], wrap = el("div", "dp-check");
    D.areas.forEach(function (a) {
      var s = score(last, a.key), row = el("div", "ci-bar");
      row.appendChild(el("span", "ci-bar-l", a.emoji + " " + a.title));
      var tr = el("span", "ci-bar-t"), f = el("i"); f.style.width = Math.max(4, Math.round(s * 100)) + "%"; tr.appendChild(f); row.appendChild(tr);
      if (prev) { var d = s - score(prev, a.key); row.appendChild(el("span", "ci-bar-d" + (d > 0.01 ? " up" : d < -0.01 ? " down" : ""), d > 0.01 ? "↑" : d < -0.01 ? "↓" : "–")); }
      wrap.appendChild(row);
    });
    box.appendChild(wrap);
    var days = Math.round((new Date() - new Date(last.at)) / 864e5);
    box.appendChild(el("p", "gw-note", "From your check-in " + (days < 1 ? "today" : days === 1 ? "yesterday" : days + " days ago") + (prev ? ", with arrows showing the change since the one before." : ".")));
    box.appendChild(link("/grow/check-in", "ps-link", days > 30 ? "Time for a fresh check-in" : "See your check-in"));
  }

  function renderNext(D, G, S, nextStage) {
    var ul = $("dpNext"), items = []; ul.textContent = "";
    var t = today();
    var due = safe(function () { return window.Memory.dueList(G.mem).length; }, 0);
    var forToday = safe(function () { return window.PrayerCards ? window.PrayerCards.todayPersonal().length : window.Prayers.forToday().length; }, 0);
    var plans = safe(function () { return window.Plans.active().length; }, 0);
    var lastPray = Object.keys(G.sets.prayer).sort().pop(), lastRead = Object.keys(G.sets.scripture).sort().pop();
    if (!S.prayer.today) {
      if (forToday) items.push(["🙏", "Pray for " + plural(forToday, "card") + " on your prayer list for today", "/prayer/list/pray"]);
      else items.push(["🙏", lastPray && lastPray >= add(t, -1) ? "Keep going: a few minutes with God today" : "Take five minutes to pray, with a guide to help", "/prayer/pray"]);
    }
    if (!S.scripture.today) items.push(["📖", plans ? "Carry on with your reading plan" : (lastRead ? "Read today’s passage" : "Start with today’s reading: one short passage"), plans ? "/bible/plans" : "/bible/today"]);
    if (due) items.push(["🧠", plural(due, "memory verse") + " ready to review", "/memorise"]);
    if (S.scripture.weekDays && !S.study.weekDays) items.push(["✍️", "Go deeper with something you read: write a study journal entry", "/bible/journal/write"]);
    if (nextStage && items.length < 4) items.push(["🌱", (nextStage.of && nextStage.n ? "Carry on: " : "Your next step: ") + nextStage.t, nextStage.href]);
    if (!items.length) items.push(["✨", "You’ve prayed and read today. Why not encourage someone with a verse?", "/community"]);
    items.slice(0, 4).forEach(function (x) {
      var li = el("li"), a = link(x[2], "dp-next-a");
      a.appendChild(el("span", "dp-next-ic", x[0])); a.appendChild(el("span", null, x[1])); a.appendChild(el("span", "dp-next-go", "→"));
      li.appendChild(a); ul.appendChild(li);
    });
  }

  function renderGoals(G, S) {
    var box = $("dpGoals"); box.textContent = "";
    HABITS.forEach(function (h) {
      var row = el("div", "dp-goal"), v = S[h.key].goal;
      row.appendChild(el("span", "dp-goal-l", h.icon + " " + h.name));
      var minus = el("button", "dp-step", "−"), plus = el("button", "dp-step", "+"), out = el("output", null, plural(v, "day") + " a week");
      minus.type = plus.type = "button";
      minus.setAttribute("aria-label", "Fewer days for " + h.name); plus.setAttribute("aria-label", "More days for " + h.name);
      minus.disabled = v <= 1; plus.disabled = v >= 7;
      function set(n) { window.Grow.update("habits", function (x) { x.goals = x.goals || {}; x.goals[h.key] = n; }); render(); $("dpGoalsBox").open = true; }
      minus.addEventListener("click", function () { set(Math.max(1, v - 1)); });
      plus.addEventListener("click", function () { set(Math.min(7, v + 1)); });
      row.appendChild(minus); row.appendChild(out); row.appendChild(plus);
      box.appendChild(row);
    });
  }

  var D = null;
  function render() {
    var G = gather(), S = stats(G);
    renderHero(D, S); renderLog(G, S); renderHabits(G, S); renderCal(G); renderBible(D, G);
    var next = renderPath(D, G); renderNext(D, G, S, next); renderCheck(D, G); renderGoals(G, S);
  }

  function start() {
    var node = $("dpData"); if (!node) return;
    try { D = JSON.parse(node.textContent); } catch (e) { return; }
    $("dpFilter").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-h]"); if (!b) return;
      filter = b.getAttribute("data-h");
      Array.prototype.forEach.call(this.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      renderCal(gather());
    });
    render();
    if (D.signedIn) {
      // Bring in anything from your other devices, then draw again.
      var jobs = [
        safe(function () { return window.Plans.syncAll(); }, null), safe(function () { return window.Prayers.sync(); }, null),
        safe(function () { return window.Study.mergeAll(); }, null), safe(function () { return window.Memory.syncWithAccount(); }, null),
        safe(function () { return window.Grow.sync(); }, null)
      ].map(function (p) { return Promise.resolve(p).catch(function () {}); });
      Promise.all(jobs).then(render);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  return { gather: gather, stats: stats, streak: streak, best: best };
})();
