/* Clearspring: the Early Church Fathers library. Where you're up to, pages
   read, and works saved for offline reading.

   Progress lives on this device ("cs_fathers") and in your account when
   signed in (the "fathers" sync kind): { "author/work": { n: last page
   opened, done: {n: 1}, total, t: title, a: author, u: updated } }.
   Offline copies go in the "cs-packs-v1" cache, which the service worker
   serves when there's no connection. */
(function () {
  "use strict";
  var KEY = "cs_fathers", OFF = "cs_fathers_offline", CACHE = "cs-packs-v1", BASE = "/library/fathers/";
  function load(k) { try { var s = JSON.parse(localStorage.getItem(k || KEY) || "{}"); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function safeKey(k) { return /^[a-z0-9-]+\/[a-z0-9-]+$/.test(k || "") ? k : null; }
  var timer = null;
  function save(s) {
    store(KEY, s);
    clearTimeout(timer);
    timer = setTimeout(function () { if (window.Sync) window.Sync.pushSingle("fathers", "state", load()); }, 1200);
  }
  function entry(s, key, root) {
    var e = s[key] = s[key] || { n: 0, done: {} };
    e.done = e.done || {};
    if (root) {
      e.total = +root.getAttribute("data-total") || e.total;
      e.t = root.getAttribute("data-title") || e.t;
      e.a = root.getAttribute("data-author") || e.a;
    }
    e.u = new Date().toISOString();
    return e;
  }

  function sync() {
    if (!window.Sync) return Promise.resolve(false);
    return window.Sync.pullSingle("fathers", "state").then(function (remote) {
      var local = load(), changed = false, push = false;
      if (remote && typeof remote === "object") {
        Object.keys(remote).forEach(function (k) {
          var r = remote[k], l = local[k];
          if (safeKey(k) && r && typeof r === "object" && (!l || (r.u || "") > (l.u || ""))) { local[k] = r; changed = true; }
        });
        push = Object.keys(local).some(function (k) { return !remote[k] || (local[k].u || "") > (remote[k].u || ""); });
      } else push = Object.keys(local).length > 0;
      if (changed) store(KEY, local);
      if (push) window.Sync.pushSingle("fathers", "state", local);
      return changed;
    }).catch(function () { return false; });
  }

  /* ---------------------------------------------------------------- a page */
  var page = $("cfSection");
  if (page) {
    var key = page.getAttribute("data-key"), n = +page.getAttribute("data-n");
    var s = load(); entry(s, key, page).n = n; save(s);
    var bar = $("cfBar"), marked = false;
    var onScroll = function () {
      var doc = document.documentElement, max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 1;
      if (bar) bar.style.width = (p * 100).toFixed(1) + "%";
      if (!marked && p > 0.9) {
        marked = true;
        var t = load(); entry(t, key, page).done[n] = 1; save(t);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return;
  }

  /* ---------------------------------------------------------------- a work's contents */
  function renderWork() {
    var root = $("cfWork"); if (!root) return;
    var key = root.getAttribute("data-key"), total = +root.getAttribute("data-total");
    var b = load()[key], done = b ? Object.keys(b.done || {}).length : 0;
    if (b && b.n) {
      var go = $("cfGo");
      var next = b.done && b.done[b.n] && b.n < total ? b.n + 1 : b.n;
      go.href = BASE + key + "/" + next;
      go.textContent = done >= total ? "Read it again" : (total > 1 ? "Carry on: page " + next : "Carry on reading");
    }
    var prog = $("cfProgress");
    if (done && total > 1) {
      prog.hidden = false;
      prog.querySelector("i").style.width = Math.min(100, done / total * 100) + "%";
      prog.querySelector("small").textContent = done >= total ? "Finished. Well done!" : done + " of " + total + " pages read";
    }
    Array.prototype.forEach.call(document.querySelectorAll(".cl-toc li[data-n]"), function (li) {
      var k = li.getAttribute("data-n");
      li.classList.toggle("done", !!(b && b.done && b.done[k]));
      li.classList.toggle("here", !!(b && String(b.n) === k));
    });
  }

  function setupOffline() {
    var root = $("cfWork"), btn = $("cfSave"); if (!root || !btn || !("caches" in window) || !window.fetch) return;
    var key = root.getAttribute("data-key"), total = +root.getAttribute("data-total"), title = root.getAttribute("data-title");
    var urls = [BASE + key];
    for (var i = 1; i <= total; i++) urls.push(BASE + key + "/" + i);
    function label() {
      var o = load(OFF)[key];
      btn.textContent = o ? "Saved for offline ✓ (tap to remove)" : "Save for offline reading" + (total > 60 ? " (" + total + " pages)" : "");
      btn.setAttribute("aria-pressed", o ? "true" : "false");
    }
    btn.hidden = false; label();
    btn.addEventListener("click", function () {
      var off = load(OFF), status = $("cfStatus");
      if (off[key]) {
        caches.open(CACHE).then(function (c) { return Promise.all(urls.map(function (u) { return c.delete(u); })); })
          .then(function () { delete off[key]; store(OFF, off); label(); status.textContent = title + " removed from this device."; });
        return;
      }
      btn.disabled = true;
      var done = 0;
      fetch("/library/offline-pass", { method: "POST", credentials: "same-origin", headers: { "Accept": "application/json" } }).catch(function () {})
        .then(function () { return caches.open(CACHE); }).then(function (c) {
          var queue = urls.slice(), workers = [];
          function next() {
            var u = queue.shift(); if (!u) return Promise.resolve();
            return fetch(u, { credentials: "same-origin", headers: { "X-CS-Pack": "1" } }).then(function (r) {
              if (!r.ok) throw new Error("HTTP " + r.status);
              return c.put(u, r);
            }).then(function () { done++; status.textContent = "Saving… " + done + " of " + urls.length; return next(); });
          }
          for (var w = 0; w < 4; w++) workers.push(next());
          return Promise.all(workers);
        }).then(function () {
          var o = load(OFF); o[key] = { at: Date.now(), pages: urls.length }; store(OFF, o);
          status.textContent = title + " is saved on this device. You can read it with no signal.";
        }).catch(function () {
          status.textContent = "Couldn’t save it all. Check your connection and try again.";
        }).then(function () { btn.disabled = false; label(); });
    });
  }

  /* ---------------------------------------------------------------- the library's front page */
  function renderHub() {
    var root = $("cfHub"); if (!root) return;
    var s = load(), list = $("cfContinueList"), shown = 0;
    list.textContent = "";
    Object.keys(s).filter(function (k) { return safeKey(k) && s[k] && s[k].n; })
      .sort(function (a, b) { return (s[b].u || "") > (s[a].u || "") ? 1 : -1; })
      .forEach(function (k) {
        var e = s[k];
        if (shown >= 3 || (e.total && Object.keys(e.done || {}).length >= e.total)) return;
        var link = el("a", "cl-cont");
        link.href = BASE + k + "/" + (+e.n || 1);
        link.appendChild(el("b", null, String(e.t || "Carry on")));
        link.appendChild(el("span", null, String(e.a || "") + (e.total > 1 ? " · page " + e.n + " of " + e.total : "")));
        list.appendChild(link); shown++;
      });
    $("cfContinue").hidden = !shown;
  }

  renderHub(); renderWork(); setupOffline();
  sync().then(function (changed) { if (changed) { renderHub(); renderWork(); } });
})();
