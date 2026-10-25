/* Clearspring — offline study packs. Saves a whole book (each chapter in the
   reader, its study notes, the book introduction, and optionally word by
   word) into the "cs-packs-v1" cache, which the service worker serves when
   there's no connection. A list of what's saved lives in localStorage. */
(function () {
  "use strict";
  var root = document.getElementById("op"); if (!root) return;
  var CACHE = "cs-packs-v1", KEY = "cs_packs";
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function list() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function store(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function mb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  if (!("caches" in window) || !window.fetch) { $("opNo").hidden = false; $("opSave").disabled = true; return; }

  function urlsFor(slug, chapters, words) {
    var out = ["/bible/intro/" + slug];
    for (var c = 1; c <= chapters; c++) {
      out.push("/bible/read/" + slug + "/" + c, "/bible/notes/" + slug + "/" + c);
      if (words) out.push("/bible/interlinear/" + slug + "/" + c);
    }
    return out;
  }

  function render() {
    var packs = list(), keys = Object.keys(packs), ul = $("opSavedList");
    ul.textContent = "";
    $("opSaved").hidden = !keys.length;
    keys.sort(function (a, b) { return packs[a].order - packs[b].order; }).forEach(function (slug) {
      var p = packs[slug], li = el("li");
      var a = el("a", "op-name", p.name); a.href = "/bible/read/" + slug + "/1"; li.appendChild(a);
      li.appendChild(el("small", null, p.pages + " pages · " + mb(p.bytes) + (p.words ? " · with word by word" : "") + " · saved " + new Date(p.at).toLocaleDateString()));
      var rm = el("button", "ps-link op-rm", "Remove"); rm.type = "button";
      rm.addEventListener("click", function () { remove(slug); });
      li.appendChild(rm);
      ul.appendChild(li);
    });
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(function (e) {
        if (e && e.quota) $("opSpace").textContent = "This app is using " + mb(e.usage || 0) + " of the space your browser allows it (" + mb(e.quota) + ").";
      }).catch(function () {});
    }
  }

  function remove(slug) {
    var packs = list(), p = packs[slug]; if (!p) return;
    caches.open(CACHE).then(function (cache) {
      return Promise.all((p.urls || []).map(function (u) { return cache.delete(u); }));
    }).then(function () { delete packs[slug]; store(packs); render(); $("opStatus").textContent = p.name + " removed from this device."; });
  }

  var busy = false;
  $("opSave").addEventListener("click", function () {
    if (busy) return;
    var sel = $("opBook"), opt = sel.options[sel.selectedIndex];
    var slug = sel.value, name = opt.getAttribute("data-name"), chapters = +opt.getAttribute("data-ch"), words = $("opWords").checked;
    var urls = urlsFor(slug, chapters, words), done = 0, bytes = 0, failed = 0, assets = {};
    busy = true; $("opSave").disabled = true; $("opProgress").hidden = false; $("opStatus").textContent = "";
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    function step() {
      $("opProgress").querySelector("i").style.width = Math.round(done / urls.length * 100) + "%";
      $("opProgressText").textContent = "Saving " + name + ": " + done + " of " + urls.length;
    }
    step();
    caches.open(CACHE).then(function (cache) {
      var i = 0;
      function worker() {
        if (i >= urls.length) return Promise.resolve();
        var u = urls[i++];
        return fetch(u, { credentials: "same-origin" }).then(function (r) {
          if (!r.ok) { failed++; return; }
          if (/no-store/.test(r.headers.get("Cache-Control") || "")) return;   // licensed text is never stored
          return r.clone().text().then(function (html) {
            bytes += html.length;
            // The scripts and styles each page needs, so it works offline too.
            (html.match(/\/static\/[^"'\s)?]+\.(?:js|css)(?=[?"'\s)])(?:\?[^"'\s)]*)?/g) || []).forEach(function (a) { assets[a] = 1; });
            return cache.put(u, r);
          });
        }).catch(function () { failed++; }).then(function () { done++; step(); return worker(); });
      }
      return Promise.all([worker(), worker(), worker()]).then(function () {
        var list2 = Object.keys(assets);
        return Promise.all(list2.map(function (a) {
          return fetch(a, { credentials: "same-origin" }).then(function (r) { if (r.ok) return cache.put(a, r); }).catch(function () {});
        })).then(function () { return list2; });
      });
    }).then(function (assetList) {
      var packs = list(), order = Array.prototype.indexOf.call(sel.options, opt);
      packs[slug] = { name: name, at: Date.now(), pages: urls.length - failed, bytes: bytes, words: words, order: order, urls: urls.concat(assetList || []) };
      store(packs);
      $("opStatus").textContent = failed ? name + " saved, but " + failed + " page" + (failed === 1 ? "" : "s") + " couldn't be fetched. Try again with a better signal."
                                         : name + " is saved. You can now read and study it with no signal.";
    }).catch(function () {
      $("opStatus").textContent = "Couldn't save just now. Check your connection and try again.";
    }).then(function () { busy = false; $("opSave").disabled = false; $("opProgress").hidden = true; render(); });
  });

  render();
})();
