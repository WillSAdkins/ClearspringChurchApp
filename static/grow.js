/* Clearspring — your own growth: first steps, the Foundations course, check-ins,
   spiritual gifts, your story, your rhythm of life, and fasts.

   Private. Kept on this device, and in your own account when signed in (the
   "grow" sync kind). The church never sees any of it unless you choose to
   share your story. Each section carries its own "u" (updated) time so that
   when two devices disagree, the newer section wins. */
window.Grow = (function () {
  "use strict";
  var KEY = "cs_grow";
  var SECTIONS = ["steps", "course", "checkins", "gifts", "story", "rhythm", "fasts", "family"];

  function now() { return new Date().toISOString(); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function load() {
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    s.steps = s.steps || { u: "", done: {} };
    s.course = s.course || { u: "", done: {}, answers: {} };
    s.checkins = s.checkins || { u: "", list: [] };
    s.gifts = s.gifts || { u: "", answers: {}, results: null };
    s.story = s.story || { u: "", parts: {}, short: "" };
    s.rhythm = s.rhythm || { u: "", items: [], ticks: {} };
    s.fasts = s.fasts || { u: "", list: [] };
    s.family = s.family || { u: "", done: {} };
    return s;
  }
  var timer = null;
  function save(s, section) {
    if (section) s[section].u = now();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    // Gather quick edits (typing) into one upload.
    clearTimeout(timer);
    timer = setTimeout(function () { if (window.Sync) window.Sync.pushSingle("grow", "state", load()); }, 1200);
    return s;
  }
  function update(section, fn) { var s = load(); fn(s[section], s); return save(s, section); }

  /* Merge the account copy in: newer section wins, both ways. */
  var syncing = null;
  function sync() {           // once per page; later callers share the result
    if (!syncing) syncing = pull();
    return syncing;
  }
  function pull() {
    if (!window.Sync) return Promise.resolve(false);
    return window.Sync.pullSingle("grow", "state").then(function (remote) {
      if (!remote || typeof remote !== "object") { var mine = load(); if (SECTIONS.some(function (k) { return mine[k].u; })) window.Sync.pushSingle("grow", "state", mine); return false; }
      var local = load(), changed = false, pushBack = false;
      SECTIONS.forEach(function (k) {
        var r = remote[k], l = local[k];
        if (r && (r.u || "") > (l.u || "")) { local[k] = r; changed = true; }
        else if ((l.u || "") > ((r && r.u) || "")) pushBack = true;
      });
      if (changed) try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (e) {}
      if (pushBack) window.Sync.pushSingle("grow", "state", local);
      return changed;
    }).catch(function () { return false; });
  }

  /* ---------- helpers each page uses ---------- */
  function toggleDone(section, slug, on) {
    return update(section, function (x) { if (on) x.done[slug] = today(); else delete x.done[slug]; });
  }
  function doneCount(section, slugs) { var d = load()[section].done; return slugs.filter(function (s) { return d[s]; }).length; }
  function words(text) { return (String(text || "").trim().match(/\S+/g) || []).length; }

  return { load: load, save: save, update: update, sync: sync, today: today, toggleDone: toggleDone, doneCount: doneCount, words: words };
})();

/* Small shared behaviour for pages that only need a "mark as done" button.
   <button class="gw-done" data-section="steps" data-slug="prayer"> */
(function () {
  "use strict";
  function paint(b) {
    var on = !!window.Grow.load()[b.dataset.section].done[b.dataset.slug];
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.textContent = on ? (b.dataset.onLabel || "Done ✓") : (b.dataset.offLabel || "Mark as done");
  }
  function init() {
    document.querySelectorAll(".gw-done[data-section]").forEach(function (b) {
      paint(b);
      b.addEventListener("click", function () {
        var on = !window.Grow.load()[b.dataset.section].done[b.dataset.slug];
        window.Grow.toggleDone(b.dataset.section, b.dataset.slug, on);
        paint(b);
        if (on && b.dataset.then) { var t = document.getElementById(b.dataset.then); if (t) t.hidden = false; }
      });
    });
    // Ticks on lists: <a data-tick="steps:prayer">
    function ticks() {
      var s = window.Grow.load();
      document.querySelectorAll("[data-tick]").forEach(function (el) {
        var p = el.dataset.tick.split(":");
        el.classList.toggle("ticked", !!(s[p[0]] && s[p[0]].done && s[p[0]].done[p[1]]));
      });
      document.querySelectorAll("[data-progress]").forEach(function (el) {
        var p = el.dataset.progress.split(":"), slugs = p[1].split(",");
        var n = slugs.filter(function (k) { return s[p[0]].done[k]; }).length;
        el.textContent = n ? n + " of " + slugs.length + " done" : el.dataset.empty || "";
        var bar = el.parentNode && el.parentNode.querySelector(".gw-bar i");
        if (bar) bar.style.width = Math.round(100 * n / slugs.length) + "%";
      });
    }
    ticks();
    window.Grow.sync().then(function (changed) { if (changed) { ticks(); document.querySelectorAll(".gw-done[data-section]").forEach(paint); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
