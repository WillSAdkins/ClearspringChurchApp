/* Clearspring — the Bible tab remembers your place.

   While you read, the verse at the top of the screen is remembered (on this
   device, and in a small cookie so the server can send you straight back).
   Tapping the Bible tab from anywhere opens that chapter at that verse, and
   it stays there until you move to another chapter. */
(function () {
  "use strict";
  var KEY = "cs_bible_place";
  function get() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function put(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    document.cookie = "cs_bible=" + encodeURIComponent([p.slug, p.chapter, p.translation || "", p.verse || 1].join("|")) +
      "; path=/; max-age=31536000; samesite=lax";
  }
  function urlFor(p) {
    var qs = [];
    if (p.translation && p.translation !== "web") qs.push("translation=" + encodeURIComponent(p.translation));
    if (p.verse > 1) qs.push("at=" + p.verse);
    return "/bible/read/" + p.slug + "/" + p.chapter + (qs.length ? "?" + qs.join("&") : "");
  }

  var tab = document.getElementById("bibleTab");
  var main = document.getElementById("readerMain");

  // Not on the reader: point the tab straight at the remembered place.
  if (!main) {
    var p = get();
    if (tab && p && p.slug) tab.href = urlFor(p);
    return;
  }

  // On the reader.
  var here = { slug: main.dataset.slug, chapter: +main.dataset.chapter, translation: main.dataset.translation };
  var verses = Array.prototype.slice.call(document.querySelectorAll("#scripture .v[data-num]"));
  var prev = get();
  var sameChapter = prev && prev.slug === here.slug && prev.chapter === here.chapter;
  var params = new URLSearchParams(location.search);
  var at = parseInt(params.get("at"), 10);

  function barBottom() {
    var bar = document.querySelector(".reader-bar");
    return bar ? bar.getBoundingClientRect().bottom : 0;
  }
  function topVerse() {
    var line = barBottom() + 8;
    for (var i = 0; i < verses.length; i++) {
      var r = verses[i].getBoundingClientRect();
      if (r.bottom > line) return +verses[i].dataset.num;
    }
    return verses.length ? +verses[verses.length - 1].dataset.num : 1;
  }
  function save() { put({ slug: here.slug, chapter: here.chapter, translation: here.translation, verse: window.scrollY < 60 ? 1 : topVerse(), at: Date.now() }); }

  // Coming back via the tab: put the remembered verse just under the bar.
  if (at > 1) {
    var target = verses.find(function (v) { return +v.dataset.num === at; });
    if (target) {
      var go = function () { window.scrollTo(0, Math.max(0, window.scrollY + target.getBoundingClientRect().top - barBottom() - 12)); };
      go(); requestAnimationFrame(go); setTimeout(go, 250);
    }
    params.delete("at");
    var qs = params.toString();
    try { history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash); } catch (e) {}
  }
  // A new chapter starts at its beginning; the same chapter keeps its verse.
  put({ slug: here.slug, chapter: here.chapter, translation: here.translation, verse: at > 1 ? at : (sameChapter && prev.verse) || 1, at: Date.now() });
  if (tab) tab.href = urlFor(get());

  var t = null;
  window.addEventListener("scroll", function () {
    clearTimeout(t);
    t = setTimeout(function () { save(); if (tab) tab.href = urlFor(get()); }, 300);
  }, { passive: true });
  window.addEventListener("pagehide", save);

  // Already here: the tab does nothing rather than reloading the page.
  if (tab) tab.addEventListener("click", function (e) { e.preventDefault(); });
})();
