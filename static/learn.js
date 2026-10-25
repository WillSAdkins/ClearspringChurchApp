/* Clearspring — your place in each Watch course.
   Kept on this device ("cs_learn") and, when signed in, in your account
   (sync kind "learn", one item per course).

   cs_learn = { <slug>: { done: {<videoId>: 1}, last: {n, vid, t, at}, titles: {<n>: title},
                          total, notes, u } } */
window.Learn = (function () {
  "use strict";
  var KEY = "cs_learn";
  function all() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function saveAll(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function get(slug) {
    var c = all()[slug] || {};
    c.done = c.done || {}; c.titles = c.titles || {};
    return c;
  }
  var timers = {};
  function put(slug, c, quiet) {
    var a = all(); c.u = Date.now(); a[slug] = c; saveAll(a);
    if (quiet || !window.Sync || !signedIn()) return;
    clearTimeout(timers[slug]);
    timers[slug] = setTimeout(function () { window.Sync.push("learn", slug, c); }, 1500);
  }
  function signedIn() {
    var m = document.querySelector('meta[name="member-signed-in"]');
    return !!(m && m.content === "true");
  }
  function markDone(slug, vid, on) {
    var c = get(slug);
    if (on === false) delete c.done[vid]; else c.done[vid] = 1;
    put(slug, c);
  }
  function setLast(slug, n, vid, t) {
    var c = get(slug);
    c.last = { n: n, vid: vid, t: Math.floor(t || 0), at: Date.now() };
    put(slug, c, true);
    // Don't send every few seconds of watching; the next lesson or note will.
  }
  function learnTitle(slug, n, title) {
    var c = get(slug);
    if (!title || c.titles[n] === title) return;
    c.titles[n] = String(title).slice(0, 200); put(slug, c, true);
  }
  function setTotal(slug, total) { var c = get(slug); if (total && total !== c.total) { c.total = total; put(slug, c, true); } }
  function setNotes(slug, text) { var c = get(slug); c.notes = String(text || "").slice(0, 20000); put(slug, c); }
  function reset(slug) { put(slug, { done: {}, titles: get(slug).titles, notes: get(slug).notes }); }
  function progress(slug, total) {
    var c = get(slug), done = Object.keys(c.done).length;
    total = Math.max(total || 0, c.total || 0, done);
    return { done: done, total: total, frac: total ? done / total : 0, complete: total > 0 && done >= total, last: c.last };
  }
  function recent() {
    var a = all();
    return Object.keys(a).filter(function (k) { return a[k] && a[k].last; })
      .map(function (k) { return { slug: k, at: a[k].last.at || 0 }; })
      .sort(function (x, y) { return y.at - x.at; });
  }
  function sync() {
    if (!window.Sync || !signedIn()) return Promise.resolve(false);
    return window.Sync.pull("learn").then(function (remote) {
      var a = all(), changed = false, up = [];
      var seen = {};
      (remote || []).forEach(function (r) {
        if (!r || !r.value || typeof r.value !== "object") return;
        seen[r.key] = 1;
        var mine = a[r.key];
        if (!mine) { a[r.key] = r.value; changed = true; return; }
        // Lessons watched anywhere count everywhere.
        var before = Object.keys(mine.done || {}).length;
        mine.done = Object.assign({}, r.value.done || {}, mine.done || {});
        if (Object.keys(mine.done).length !== before) changed = true;
        if ((r.value.u || 0) > (mine.u || 0)) {
          if (r.value.last && (!mine.last || r.value.last.at > mine.last.at)) { mine.last = r.value.last; changed = true; }
          if (r.value.notes != null && r.value.notes !== mine.notes) { mine.notes = r.value.notes; changed = true; }
        } else if ((mine.u || 0) > (r.value.u || 0)) up.push({ key: r.key, value: mine });
      });
      Object.keys(a).forEach(function (k) { if (!seen[k]) up.push({ key: k, value: a[k] }); });
      if (changed) saveAll(a);
      if (up.length) window.Sync.pushAll("learn", up);
      return changed;
    }).catch(function () { return false; });
  }
  return { get: get, markDone: markDone, setLast: setLast, learnTitle: learnTitle, setTotal: setTotal,
           setNotes: setNotes, reset: reset, progress: progress, recent: recent, sync: sync };
})();
