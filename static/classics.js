/* Clearspring — classic books: where you're up to, chapters read, and books
   saved for offline reading.

   Progress lives on this device ("cs_books") and in your account when signed
   in (the "books" sync kind): { slug: { n: last chapter opened, done: {n: 1},
   u: updated time } }. When two devices disagree about a book, the newer wins.
   Offline copies go in the same "cs-packs-v1" cache as Bible study packs,
   which the service worker serves when there's no connection. */
(function () {
  "use strict";
  var KEY = "cs_books", OFF = "cs_books_offline", CACHE = "cs-packs-v1";
  function load(k) { try { var s = JSON.parse(localStorage.getItem(k || KEY) || "{}"); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  var timer = null;
  function save(s) {
    store(KEY, s);
    clearTimeout(timer);
    timer = setTimeout(function () { if (window.Sync) window.Sync.pushSingle("books", "state", load()); }, 1200);
  }
  function book(s, slug) { s[slug] = s[slug] || { n: 0, done: {}, u: "" }; s[slug].done = s[slug].done || {}; return s[slug]; }
  function touch(s, slug) { book(s, slug).u = new Date().toISOString(); }

  function sync() {
    if (!window.Sync) return Promise.resolve(false);
    return window.Sync.pullSingle("books", "state").then(function (remote) {
      var local = load(), changed = false, push = false;
      if (remote && typeof remote === "object") {
        Object.keys(remote).forEach(function (k) {
          var r = remote[k], l = local[k];
          if (r && typeof r === "object" && (!l || (r.u || "") > (l.u || ""))) { local[k] = r; changed = true; }
        });
        push = Object.keys(local).some(function (k) { return !remote[k] || (local[k].u || "") > (remote[k].u || ""); });
      } else push = Object.keys(local).length > 0;
      if (changed) store(KEY, local);
      if (push) window.Sync.pushSingle("books", "state", local);
      return changed;
    }).catch(function () { return false; });
  }

  /* ---------------------------------------------------------------- chapter page */
  var chap = $("clChapter");
  if (chap) {
    var slug = chap.getAttribute("data-book"), n = +chap.getAttribute("data-n"), total = +chap.getAttribute("data-total");
    var s = load(); book(s, slug).n = n; touch(s, slug); save(s);
    var bar = $("clBar"), marked = false;
    var onScroll = function () {
      var doc = document.documentElement, max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 1;
      if (bar) bar.style.width = (p * 100).toFixed(1) + "%";
      if (!marked && p > 0.9) {
        marked = true;
        var t = load(); book(t, slug).done[n] = 1; touch(t, slug); save(t);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return;
  }

  /* ---------------------------------------------------------------- book page */
  function renderBook() {
    var root = $("clBook"); if (!root) return;
    var slug = root.getAttribute("data-book"), total = +root.getAttribute("data-total");
    var b = load()[slug], done = b ? Object.keys(b.done || {}).length : 0;
    if (b && b.n) {
      var go = $("clGo");
      var next = b.done && b.done[b.n] && b.n < total ? b.n + 1 : b.n;
      go.href = "/library/classics/" + slug + "/" + next;
      go.textContent = done >= total ? "Read it again" : "Carry on: chapter " + next;
    }
    var prog = $("clProgress");
    if (done) {
      prog.hidden = false;
      prog.querySelector("i").style.width = Math.min(100, done / total * 100) + "%";
      prog.querySelector("small").textContent = done >= total ? "Finished. Well done!" : done + " of " + total + " chapters read";
    }
    Array.prototype.forEach.call(document.querySelectorAll(".cl-toc li[data-n]"), function (li) {
      var k = li.getAttribute("data-n");
      li.classList.toggle("done", !!(b && b.done && b.done[k]));
      li.classList.toggle("here", !!(b && String(b.n) === k));
    });
  }

  function setupOffline() {
    var root = $("clBook"), btn = $("clSave"); if (!root || !btn || !("caches" in window) || !window.fetch) return;
    var slug = root.getAttribute("data-book"), total = +root.getAttribute("data-total"), title = root.getAttribute("data-title");
    var urls = ["/library/classics/" + slug];
    for (var i = 1; i <= total; i++) urls.push("/library/classics/" + slug + "/" + i);
    function label() {
      var o = load(OFF)[slug];
      btn.textContent = o ? "Saved for offline ✓ (tap to remove)" : "Save for offline reading";
      btn.setAttribute("aria-pressed", o ? "true" : "false");
    }
    btn.hidden = false; label();
    btn.addEventListener("click", function () {
      var off = load(OFF), status = $("clStatus");
      if (off[slug]) {
        caches.open(CACHE).then(function (c) { return Promise.all(urls.map(function (u) { return c.delete(u); })); })
          .then(function () { delete off[slug]; store(OFF, off); label(); status.textContent = title + " removed from this device."; });
        return;
      }
      btn.disabled = true;
      var done = 0;
      var pass = fetch("/library/offline-pass", { method: "POST", credentials: "same-origin", headers: { "Accept": "application/json" } }).catch(function () {});
      pass.then(function () { return caches.open(CACHE); }).then(function (c) {
        // a few at a time, so a long book doesn't flood the connection
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
        var o = load(OFF); o[slug] = { at: Date.now(), pages: urls.length }; store(OFF, o);
        status.textContent = title + " is saved on this device. You can read it with no signal.";
      }).catch(function () {
        status.textContent = "Couldn’t save the whole book. Check your connection and try again.";
      }).then(function () { btn.disabled = false; label(); });
    });
  }

  /* ---------------------------------------------------------------- shelf */
  function renderShelf() {
    var root = $("clShelf"); if (!root) return;
    var s = load(), list = $("clContinueList"), shown = 0;
    list.textContent = "";
    var items = Array.prototype.slice.call(document.querySelectorAll(".cl-book[data-book]"));
    items.forEach(function (a) {
      var slug = a.getAttribute("data-book"), total = +a.getAttribute("data-total"), b = s[slug];
      var done = b ? Object.keys(b.done || {}).length : 0;
      a.querySelector(".cl-prog").textContent = done ? (done >= total ? " · Finished ✓" : " · " + done + " read") : "";
    });
    Object.keys(s).filter(function (k) { return s[k] && s[k].n; })
      .sort(function (a, b) { return (s[b].u || "") > (s[a].u || "") ? 1 : -1; })
      .slice(0, 3).forEach(function (slug) {
        var a = document.querySelector('.cl-book[data-book="' + slug.replace(/[^a-z0-9-]/g, "") + '"]'); if (!a) return;
        var total = +a.getAttribute("data-total"), b = s[slug];
        if (Object.keys(b.done || {}).length >= total) return;
        var link = el("a", "cl-cont");
        link.href = "/library/classics/" + slug + "/" + b.n;
        link.appendChild(el("b", null, a.querySelector(".cl-info b").textContent));
        link.appendChild(el("span", null, "Chapter " + b.n + " of " + total));
        list.appendChild(link); shown++;
      });
    $("clContinue").hidden = !shown;
  }

  renderShelf(); renderBook(); setupOffline();
  sync().then(function (changed) { if (changed) { renderShelf(); renderBook(); } });
})();
