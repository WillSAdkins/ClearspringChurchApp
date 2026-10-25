/* Clearspring — reading plans and the reading log.

   Everything is kept on this device first and synced to the account when
   signed in.

   cs_plan_state   { slug: { start: "YYYY-MM-DD", days: [0-6…], done: [n…], skipped: [n…], church: bool } }
   cs_custom_plans { id: plan }               plans made with "Make your own"
   cs_read_log     { chapters: { "genesis.1": "YYYY-MM-DD" (first read) }, days: { "YYYY-MM-DD": count } }

   A plan's slug is its built-in name, or "c:<id>" for one you made. */
window.Plans = (function () {
  "use strict";
  var STATE = "cs_plan_state", CUSTOM = "cs_custom_plans", LOG = "cs_read_log";

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------- dates (local, not UTC) ---------------- */
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parse(s) { var p = (s || "").split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return iso(new Date()); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function nice(s, withYear) {
    var d = parse(s), t = today();
    if (s === t) return "Today";
    if (s === addDays(t, -1)) return "Yesterday";
    if (s === addDays(t, 1)) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: withYear ? "numeric" : undefined });
  }

  /* ---------------- state ---------------- */
  function migrate(st) {
    // Older versions kept a plain list of ticked days per plan in cs_plan_<slug>.
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), m = /^cs_plan_([a-z0-9-]+)$/.exec(k || "");
        if (!m || m[1] === "state" || st[m[1]]) continue;
        var arr = JSON.parse(localStorage.getItem(k) || "[]");
        if (Array.isArray(arr) && arr.length) st[m[1]] = { start: null, days: null, done: arr, skipped: [] };
      }
    } catch (e) {}
    return st;
  }
  function state() { return migrate(jget(STATE, {})); }
  function saveState(st, slug) {
    jset(STATE, st);
    if (slug && window.Sync) window.Sync.pushSingle("plan", "plan-" + slug, st[slug] || null);
  }
  function mine(slug) { return state()[slug] || null; }

  function custom() { return jget(CUSTOM, {}); }
  function saveCustom(id, plan) {
    var all = custom(); all[id] = plan; jset(CUSTOM, all);
    if (window.Sync) window.Sync.push("cplan", id, plan, false);
  }
  function removeCustom(id) {
    var all = custom(); delete all[id]; jset(CUSTOM, all);
    if (window.Sync) window.Sync.push("cplan", id, null, true);
  }

  /* ---------------- plan definitions ---------------- */
  var cache = {};
  function load(slug) {
    if (cache[slug]) return Promise.resolve(cache[slug]);
    if (slug.indexOf("c:") === 0) {
      var p = custom()[slug.slice(2)];
      return p ? Promise.resolve(cache[slug] = Object.assign({}, p, { slug: slug })) : Promise.reject(new Error("missing"));
    }
    var key = "cs_plan_def_" + slug, stored = jget(key, null);
    if (stored && stored.v === 2) { cache[slug] = stored.plan; return Promise.resolve(stored.plan); }
    return fetch("/api/plans/" + slug).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) throw new Error("missing");
      cache[slug] = d.plan; jset(key, { v: 2, plan: d.plan });
      return d.plan;
    });
  }

  /* ---------------- schedule ---------------- */
  // The date of each day of the plan, given a start date and the reading days
  // of the week (0 = Sunday … 6 = Saturday; null = every day).
  function dates(p, st) {
    var out = [], n = p.days.length;
    if (!st || !st.start) return out;
    var days = st.days && st.days.length ? st.days : null, d = parse(st.start), guard = 0;
    while (out.length < n && guard++ < 5000) {
      if (!days || days.indexOf(d.getDay()) >= 0) out.push(iso(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function chaptersOf(day) {
    var out = [];
    day.forEach(function (g) { for (var c = g.from; c <= g.to; c++) out.push(g.slug + "." + c); });
    return out;
  }

  function isDone(p, st, n) {
    if (!st) return false;
    if ((st.done || []).indexOf(n) >= 0) return true;
    // a day counts as done once every chapter in it has been read since the plan began
    var log = readLog().chapters, since = st.start || "0000";
    var chs = chaptersOf(p.days[n - 1]);
    return chs.length > 0 && chs.every(function (c) { return log[c] && log[c] >= since; });
  }

  function status(p, st) {
    var ds = dates(p, st), t = today(), total = p.days.length;
    var done = 0, behind = [], ahead = 0, next = null, todayN = null;
    for (var n = 1; n <= total; n++) {
      var d = isDone(p, st, n), sk = st && (st.skipped || []).indexOf(n) >= 0, date = ds[n - 1];
      if (d) { done++; if (date && date > t) ahead++; }
      if (!d && !sk && next === null) next = n;
      if (date === t) todayN = n;
      if (date && date < t && !d && !sk) behind.push(n);
    }
    var finished = next === null;
    return { done: done, total: total, pct: total ? Math.round(done * 100 / total) : 0, behind: behind, ahead: ahead,
             next: next, today: todayN, dates: ds, finished: finished,
             upcoming: todayN || (ds.length && ds[0] > t ? 1 : null) };
  }

  /* ---------------- actions ---------------- */
  function start(slug, opts) {
    var st = state();
    st[slug] = { start: opts.start || today(), days: opts.days && opts.days.length < 7 ? opts.days : null,
                 done: (st[slug] && opts.keep) ? st[slug].done : [], skipped: [], church: !!opts.church };
    saveState(st, slug);
  }
  function stop(slug) {
    var st = state(); delete st[slug]; saveState(st, null);
    try { localStorage.removeItem("cs_plan_" + slug); } catch (e) {}
    if (window.Sync) window.Sync.push("plan", "plan-" + slug, null, true);
  }
  function setDone(slug, n, on) {
    var st = state(); var s = st[slug] || (st[slug] = { start: null, days: null, done: [], skipped: [] });
    s.done = (s.done || []).filter(function (x) { return x !== n; });
    s.skipped = (s.skipped || []).filter(function (x) { return x !== n; });
    if (on) s.done.push(n);
    saveState(st, slug);
  }
  // Move the schedule so the next unread day falls today.
  function shiftToToday(slug, p) {
    var st = state(), s = st[slug]; if (!s) return;
    var stt = status(p, s); if (!stt.next) return;
    var days = s.days && s.days.length ? s.days : null, d = new Date(), back = stt.next - 1;
    if (days) { while (days.indexOf(d.getDay()) < 0) d.setDate(d.getDate() + 1); }
    while (back > 0) { d.setDate(d.getDate() - 1); if (!days || days.indexOf(d.getDay()) >= 0) back--; }
    s.start = iso(d);
    saveState(st, slug);
  }
  function skipMissed(slug, p) {
    var st = state(), s = st[slug]; if (!s) return;
    var stt = status(p, s);
    s.skipped = (s.skipped || []).concat(stt.behind);
    saveState(st, slug);
  }

  function active() {
    var st = state();
    return Object.keys(st).filter(function (k) { return st[k] && (st[k].start || (st[k].done || []).length); });
  }

  /* ---------------- reading log ---------------- */
  function readLog() {
    var l = jget(LOG, null) || {}; l.chapters = l.chapters || {}; l.days = l.days || {};
    // Days the reader was opened before the log existed still count as reading days.
    var older = jget("cs_reading_days", []);
    if (Array.isArray(older)) older.forEach(function (d) { if (!(d in l.days)) l.days[d] = 1; });
    return l;
  }
  var pushTimer;
  function saveLog(l) {
    jset(LOG, l);
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { if (window.Sync) window.Sync.pushSingle("readlog", "log", l); }, 1500);
  }
  function markRead(slug, ch) {
    var l = readLog(), k = slug + "." + ch, t = today();
    if (!l.chapters[k]) l.chapters[k] = t;
    l.last = l.last || {};
    if (l.last[k] !== t) { l.days[t] = (l.days[t] || 0) + 1; l.last[k] = t; }
    saveLog(l);
    return l;
  }
  function unmarkRead(slug, ch) {
    var l = readLog(), k = slug + "." + ch, t = today();
    if (l.last && l.last[k] === t) { l.days[t] = Math.max(0, (l.days[t] || 1) - 1); delete l.last[k]; }
    delete l.chapters[k];
    saveLog(l);
  }
  // For chapters read before using the app: counted, but not on any day.
  function markEarlier(slug, ch) {
    var l = readLog(), k = slug + "." + ch;
    if (!l.chapters[k]) { l.chapters[k] = "2000-01-01"; saveLog(l); }
  }
  function hasRead(slug, ch) { return !!readLog().chapters[slug + "." + ch]; }
  function readToday(slug, ch) { var l = readLog(); return !!(l.last && l.last[slug + "." + ch] === today()); }

  function streak() {
    var days = readLog().days, t = today(), cur = 0, d = t;
    if (!days[d]) d = addDays(d, -1);           // the streak survives until today ends
    while (days[d]) { cur++; d = addDays(d, -1); }
    var keys = Object.keys(days).filter(function (k) { return days[k] > 0; }).sort(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; });
    return { current: cur, best: Math.max(best, cur), readToday: !!days[t] };
  }

  /* ---------------- account sync ---------------- */
  function syncAll() {
    if (!window.Sync) return Promise.resolve(false);
    var jobs = [];
    jobs.push(window.Sync.pull("plan").then(function (items) {
      if (!items.length) { var st0 = state(); Object.keys(st0).forEach(function (k) { window.Sync.pushSingle("plan", "plan-" + k, st0[k]); }); return; }
      var st = state(), changed = false;
      items.forEach(function (it) {
        var slug = (it.key || "").replace(/^plan-/, ""), v = it.value;
        if (!slug || v == null) return;
        if (Array.isArray(v)) v = { start: null, days: null, done: v, skipped: [] };
        var mineV = st[slug];
        if (!mineV) { st[slug] = v; changed = true; return; }
        // merge ticks; keep the earlier start
        var done = {}; (mineV.done || []).concat(v.done || []).forEach(function (n) { done[n] = 1; });
        mineV.done = Object.keys(done).map(Number);
        if (!mineV.start && v.start) mineV.start = v.start;
        changed = true;
      });
      if (changed) jset(STATE, st);
    }));
    jobs.push(window.Sync.pull("cplan").then(function (items) {
      var all = custom(), changed = false;
      items.forEach(function (it) { if (it.value && !all[it.key]) { all[it.key] = it.value; changed = true; } });
      Object.keys(all).forEach(function (id) { if (!items.some(function (it) { return it.key === id; })) window.Sync.push("cplan", id, all[id], false); });
      if (changed) jset(CUSTOM, all);
    }));
    jobs.push(window.Sync.pullSingle("readlog", "log").then(function (r) {
      if (!r || !r.chapters) { var l0 = readLog(); if (Object.keys(l0.chapters).length) window.Sync.pushSingle("readlog", "log", l0); return; }
      var l = readLog();
      Object.keys(r.chapters).forEach(function (k) { if (!l.chapters[k] || r.chapters[k] < l.chapters[k]) l.chapters[k] = r.chapters[k]; });
      Object.keys(r.days || {}).forEach(function (k) { l.days[k] = Math.max(l.days[k] || 0, r.days[k]); });
      jset(LOG, l);
      window.Sync.pushSingle("readlog", "log", l);
    }));
    return Promise.all(jobs).then(function () { return true; }, function () { return false; });
  }

  function hrefFor(slug, n, seg) {
    return "/bible/read/" + seg.slug + "/" + seg.from + "?plan=" + encodeURIComponent(slug) + "&day=" + n;
  }

  return { state: state, mine: mine, load: load, dates: dates, status: status, isDone: isDone, chaptersOf: chaptersOf,
           start: start, stop: stop, setDone: setDone, shiftToToday: shiftToToday, skipMissed: skipMissed, active: active,
           custom: custom, saveCustom: saveCustom, removeCustom: removeCustom,
           readLog: readLog, markRead: markRead, markEarlier: markEarlier, unmarkRead: unmarkRead, hasRead: hasRead, readToday: readToday, streak: streak,
           syncAll: syncAll, today: today, addDays: addDays, nice: nice, parse: parse, iso: iso, hrefFor: hrefFor };
})();
