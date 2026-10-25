/* Clearspring — scripture memory store
   Progress lives in localStorage ("cs_memory"), like reading position.
   Spaced repetition: each verse sits in a box 1–6; a clean review moves it
   up a box and pushes the next review further out, a shaky one moves it
   down. That's what makes verses stick for good. */

window.Memory = (function () {
  "use strict";

  const KEY = "cs_memory";
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60];   // days, by box
  const DAILY_GOAL = 30;                         // XP

  function today(offset) {
    const d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
    s = s || {};
    s.verses = s.verses || {};
    s.xp = s.xp || 0;
    s.streak = s.streak || { count: 0, last: null };
    s.daily = s.daily || { date: today(), xp: 0 };
    s.translation = s.translation || "web";
    if (s.daily.date !== today()) s.daily = { date: today(), xp: 0 };
    // A streak survives until the end of the day after the last practice.
    if (s.streak.last && s.streak.last !== today() && s.streak.last !== today(-1)) s.streak.count = 0;
    return s;
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    pushSoon(s);
  }

  function level(xp) {
    // Each level needs a little more than the last: 100, 150, 200 …
    let lv = 1, need = 100, left = xp;
    while (left >= need) { left -= need; lv += 1; need += 50; }
    return { level: lv, into: left, need: need };
  }

  function isDue(v) {
    return v && v.box >= 1 && v.due && v.due <= today();
  }

  function dueList(s) {
    return Object.entries(s.verses)
      .filter(([, v]) => isDue(v))
      .sort((a, b) => (a[1].due < b[1].due ? -1 : 1))
      .map(([k]) => k);
  }

  /* Called when a lesson finishes. Returns what changed, for the results screen. */
  function finish(key, label, mode, mistakes) {
    const s = load();
    const v = s.verses[key] || { label: label, box: 0, reviews: 0 };
    v.label = label || v.label;
    const before = v.box || 0;
    if (mode === "learn" || before === 0) {
      v.box = Math.max(1, before);
      v.learnedAt = v.learnedAt || today();
    } else if (mistakes === 0) {
      v.box = Math.min(6, before + 1);
    } else if (mistakes > 2) {
      v.box = Math.max(1, before - 1);
    }
    v.reviews = (v.reviews || 0) + (mode === "review" ? 1 : 0);
    v.due = today(INTERVALS[v.box]);
    s.verses[key] = v;

    const xp = (mode === "learn" ? 15 : 10) + (mistakes === 0 ? 5 : 0);
    const lvBefore = level(s.xp).level;
    s.xp += xp;
    s.daily.xp += xp;

    let streakUp = false;
    if (s.streak.last !== today()) {
      s.streak.count = s.streak.last === today(-1) ? s.streak.count + 1 : 1;
      s.streak.last = today();
      streakUp = true;
    }
    save(s);
    return { xp: xp, streak: s.streak.count, streakUp: streakUp, box: v.box, boxBefore: before,
             due: v.due, levelUp: level(s.xp).level > lvBefore, level: level(s.xp).level,
             daily: s.daily.xp, goal: DAILY_GOAL };
  }

  function add(key, label) {
    const s = load();
    if (!s.verses[key]) { s.verses[key] = { label: label, box: 0, reviews: 0, added: today() }; save(s); }
  }

  function remove(key) {
    const s = load();
    delete s.verses[key];
    save(s);
  }

  function setTranslation(code) {
    const s = load();
    s.translation = code;
    save(s);
  }

  /* Keep memory progress on the account too, so it follows you between
     devices. For each verse keep whichever copy has had more reviews. */
  let pushTimer = null;
  function pushSoon(s) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { if (window.Sync) window.Sync.pushSingle("memory", "state", s); }, 1200);
  }
  async function syncWithAccount() {
    if (!window.Sync) return false;
    const remote = await window.Sync.pullSingle("memory", "state");
    const s = load();
    if (remote && remote.verses) {
      Object.keys(remote.verses).forEach((k) => {
        const r = remote.verses[k], l = s.verses[k];
        if (!l || (r.reviews || 0) > (l.reviews || 0)) s.verses[k] = r;
      });
      s.xp = Math.max(s.xp || 0, remote.xp || 0);
      if (remote.streak && (remote.streak.last || "") > (s.streak.last || "")) s.streak = remote.streak;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    }
    if (Object.keys(s.verses).length) window.Sync.pushSingle("memory", "state", s);
    return !!remote;
  }

  return { load, save, level, isDue, dueList, finish, add, remove, setTranslation, today, syncWithAccount, DAILY_GOAL, INTERVALS };
})();
