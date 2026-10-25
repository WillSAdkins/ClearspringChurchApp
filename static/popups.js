/* Clearspring — pop-ups (see _popup.html).

   A scheduled notice shows once per person. Otherwise a feature tip may show:
   never on someone's first day with the app, never more than one pop-up per
   visit, one tip every few days (staff choose), never for something the
   person already uses, and each tip at most twice. On the home page (unless
   staff turn it off) a tip shows straight away once per visit, every visit. "Don't show tips" turns
   them off on this phone. Only anonymous totals are sent (shown / tapped). */
(function () {
  "use strict";
  var SEEN = "cs_popup_seen", TIPS = "cs_tips", DAY = 86400000;
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function shownThisVisit() { try { return !!sessionStorage.getItem("cs_popup_shown"); } catch (e) { return false; } }
  function markVisit() { try { sessionStorage.setItem("cs_popup_shown", "1"); } catch (e) {} }
  function stat(key, event) {
    try {
      fetch("/api/popup/stat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key, event: event }), keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  function count(k) { var v = jget(k, null); return Array.isArray(v) ? v.length : (v && typeof v === "object" ? Object.keys(v).length : 0); }
  function anyKey(prefix) {
    try { for (var i = 0; i < localStorage.length; i++) if (localStorage.key(i).indexOf(prefix) === 0) return true; } catch (e) {}
    return false;
  }

  /* Has this person already found the feature? Only looks at what the app
     already keeps on this phone. */
  var USED = {
    prayerList: function () { var s = jget("cs_pcards", {}); return (s.subjects || []).some(function (x) { return !x.del; }); },
    courses: function () { return count("cs_learn") > 0; },
    listen: function () { return !!(jget("cs_listen", {}) || {}).slug; },
    plans: function () { return anyKey("cs_plan_"); },
    notifications: function () { return count("cs_notif_prefs") > 0 || (window.Notification && Notification.permission === "granted"); },
    prayed: function () { return count("cs_prayer_days") > 0; },
    memorise: function () { return count("cs_memory") > 0; },
    saved: function () { return count("cs_saved_verses") > 0; },
    classics: function () { return count("cs_books") > 0; },
    games: function () { return anyKey("rs_best") || anyKey("cs_best") || anyKey("cs_game"); }
  };

  if (shownThisVisit()) return;
  var el = null, key = null;
  var pop = document.getElementById("popup");
  if (pop && jget(SEEN, []).indexOf(pop.dataset.key.slice(1)) < 0) { el = pop; key = pop.dataset.key; }
  if (!el) {
    var tipEl = document.getElementById("popupTip"), node = document.getElementById("puTips"), tipsData = null;
    try { tipsData = node ? JSON.parse(node.textContent) : null; } catch (e) { tipsData = null; }
    if (!tipEl || !tipsData || !tipsData.tips || !tipsData.tips.length) return;
    var t = jget(TIPS, {}), now = Date.now(), home = !!tipsData.home;
    if (!t.first) { t.first = now; jset(TIPS, t); if (!home) return; }   // first day: let them explore
    if (t.off) return;
    if (!home && (now - t.first < DAY || (t.last && now - t.last < (tipsData.every || 3) * DAY))) return;
    t.seen = t.seen || {};
    var choice = null;
    // Unseen tips first, in the church's order; then ones seen once.
    for (var round = 0; round < 2 && !choice; round++) {
      for (var i = 0; i < tipsData.tips.length; i++) {
        var tip = tipsData.tips[i];
        if ((t.seen[tip.id] || 0) !== round) continue;
        var used = false;
        try { used = !!(tip.used && USED[tip.used] && USED[tip.used]()); } catch (e) {}
        if (!used) { choice = tip; break; }
      }
    }
    if (!choice && home) {
      // The home page always has one: the tip they've seen least, skipping
      // things they already use where possible.
      var pool = tipsData.tips.filter(function (x) { try { return !(x.used && USED[x.used] && USED[x.used]()); } catch (e) { return true; } });
      if (!pool.length) pool = tipsData.tips;
      choice = pool.slice().sort(function (a, b) { return (t.seen[a.id] || 0) - (t.seen[b.id] || 0); })[0];
    }
    if (!choice) return;
    el = tipEl; key = "f-" + choice.id;
    el.querySelector(".pu-emoji").textContent = choice.emoji;
    el.querySelector(".pu-title").textContent = choice.title;
    el.querySelector(".pu-text").textContent = choice.body;
    var go = el.querySelector(".pu-go"); go.textContent = choice.button; go.href = choice.href;
    el.querySelector(".pu-notips").addEventListener("click", function () {
      var t2 = jget(TIPS, {}); t2.off = true; jset(TIPS, t2); close();
    });
  }

  function markSeen() {
    markVisit();
    if (key.charAt(0) === "p") {
      var s = jget(SEEN, []); var id = key.slice(1);
      if (s.indexOf(id) < 0) s.push(id);
      jset(SEEN, s.slice(-50));
    } else {
      var t3 = jget(TIPS, {}); t3.seen = t3.seen || {};
      var fid = key.slice(2); t3.seen[fid] = (t3.seen[fid] || 0) + 1; t3.last = Date.now();
      jset(TIPS, t3);
    }
  }

  var last = null;
  function close() { el.hidden = true; document.body.classList.remove("pu-open"); if (last && last.focus) last.focus(); }
  function show() {
    // Wait for the opening splash, the guide or the quick picker to be out of the way.
    if (document.getElementById("app-splash") || document.body.classList.contains("gd-open") || document.body.classList.contains("qp-open")) { setTimeout(show, 1500); return; }
    if (document.querySelector("dialog[open]")) { setTimeout(show, 3000); return; }
    last = document.activeElement; el.hidden = false; document.body.classList.add("pu-open"); markSeen();
    stat(key, "shown");
    var b = el.querySelector(".pu-go") || el.querySelector(".pu-later"); if (b) b.focus({ preventScroll: true });
  }
  el.querySelector(".pu-x").addEventListener("click", close);
  el.querySelector(".pu-later").addEventListener("click", close);
  var goBtn = el.querySelector(".pu-go");
  if (goBtn) goBtn.addEventListener("click", function () { stat(key, "tapped"); close(); });
  el.addEventListener("click", function (e) { if (e.target === el) close(); });
  document.addEventListener("keydown", function (e) {
    if (el.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") {    // keep focus inside the pop-up
      var f = Array.prototype.filter.call(el.querySelectorAll("a[href],button"), function (x) { return x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  // Let the page settle (and the splash finish) before asking for attention.
  setTimeout(show, key.charAt(0) === "p" ? 1800 : (tipsData && tipsData.home ? 700 : 2600));
})();
