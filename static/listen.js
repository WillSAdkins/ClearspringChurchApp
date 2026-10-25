/* Clearspring — the Listen page: the audio Bible player, a book and chapter
   picker, and saving whole books of audio for offline listening (into the
   "cs-bible-audio" cache, which the service worker plays back from). */
(function () {
  "use strict";
  var root = document.getElementById("lis"); if (!root || !window.AudioBible) return;
  var CACHE = "cs-bible-audio", SAVED = "cs_listen_saved";
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  var BOOKS = window.CS_AUDIO_BOOKS || [], BY = {};
  function READERS_NAME(r) { return (window.CS_AUDIO_READERS || {})[r] || "That narrator"; }
  BOOKS.forEach(function (b) { BY[b[0]] = b; });

  var p = AudioBible.player({ onChange: paint });
  var st = p.state;

  // Chapters listened to the end count as read (reading log and discipleship).
  document.addEventListener("cs:listened", function (e) {
    try { if (window.Plans && window.Plans.markRead) window.Plans.markRead(e.detail.slug, e.detail.chapter); } catch (err) {}
  });

  var playBtn = $("lisPlay"), seek = $("lisSeek"), msg = $("lisMsg"), seeking = false;
  function paint(kind) {
    var has = !!st.slug;
    $("lisTitle").textContent = has ? p.label() : "Choose a chapter";
    $("lisSub").textContent = has ? p.readerName() + " · Berean Standard Bible" : "Pick a book below, or carry on from where you were";
    $("lisK").textContent = has ? (p.audio.paused ? "Paused" : "Now playing") : "The Bible, read aloud";
    playBtn.disabled = !has; seek.disabled = !has;
    var playing = has && !p.audio.paused;
    playBtn.querySelector(".i-play").toggleAttribute("hidden", playing);    // SVG: no .hidden property
    playBtn.querySelector(".i-pause").toggleAttribute("hidden", !playing);
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    var t = p.times();
    $("lisCur").textContent = t[0]; $("lisDur").textContent = has && t[1] !== "0:00" ? t[1] : "–:––";
    if (!seeking) seek.value = Math.round(t[2] * 1000);
    $("lisSpeed").textContent = (st.rate === 1 ? "1" : st.rate) + "×";
    $("lisSleep").textContent = p.sleepLabel();
    $("lisSleep").setAttribute("aria-pressed", p.sleeping() ? "true" : "false");
    $("lisAuto").setAttribute("aria-pressed", st.auto ? "true" : "false");
    $("lisAuto").textContent = st.auto ? "Carry on: on" : "Carry on: off";
    $("lisReader").value = st.reader;
    var read = $("lisRead");
    if (has) { read.hidden = false; read.href = "/bible/read/" + st.slug + "/" + st.ch + "?translation=bsb"; }
    if (kind === "error") msg.textContent = navigator.onLine === false
      ? "You’re offline, and this chapter isn’t saved on this phone."
      : "This chapter wouldn’t load. Check your connection and try again.";
    else if (kind === "blocked") msg.textContent = "Tap play to start.";
    else if (kind === "reader") msg.textContent = READERS_NAME(st.reader) + " hasn’t recorded this chapter, so Bob Souer reads it instead.";
    else if (kind === "open") msg.textContent = "";
    else if (kind === "play" && !p.standIn()) msg.textContent = "";
    else if (kind === "sleep") msg.textContent = "Sleep timer finished. Sleep well.";
    else if (kind === "ended") msg.textContent = st.auto ? "That’s the end of the Bible. Amen!" : "End of the chapter.";
    markChapters();
  }

  playBtn.addEventListener("click", function () { p.toggle(); });
  $("lisPrev").addEventListener("click", function () { p.prev(); });
  $("lisNext").addEventListener("click", function () { p.next(); });
  $("lisBack").addEventListener("click", function () { p.seek(-15); });
  $("lisFwd").addEventListener("click", function () { p.seek(30); });
  $("lisSpeed").addEventListener("click", function () { p.speed(); paint(); });
  $("lisSleep").addEventListener("click", function () { p.cycleSleep(); paint(); });
  $("lisAuto").addEventListener("click", function () { p.toggleAuto(); paint(); });
  $("lisReader").addEventListener("change", function () { p.setReader(this.value); paint(); });
  seek.addEventListener("input", function () { seeking = true; });
  seek.addEventListener("change", function () { seeking = false; p.seekTo(seek.value / 1000); });
  setInterval(function () { if (p.sleeping()) $("lisSleep").textContent = p.sleepLabel(); }, 20000);

  /* ---------------------------------------------------------------- picker */
  var shown = null;
  Array.prototype.forEach.call(document.querySelectorAll(".lis-tabs [data-t]"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".lis-tabs [data-t]"), function (x) {
        var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on ? "true" : "false");
      });
      $("lisBooks-ot").hidden = b.getAttribute("data-t") !== "ot";
      $("lisBooks-nt").hidden = b.getAttribute("data-t") !== "nt";
      $("lisChaps").hidden = true;
    });
  });
  function showBook(slug) {
    var b = BY[slug]; if (!b) return;
    shown = slug;
    $("lisChapsTitle").textContent = b[1];
    var g = $("lisChapsGrid"); g.textContent = "";
    for (var c = 1; c <= b[2]; c++) {
      var btn = el("button", null, String(c)); btn.type = "button"; btn.setAttribute("data-ch", c);
      btn.setAttribute("aria-label", (slug === "psalms" ? "Psalm " : b[1] + " chapter ") + c);
      g.appendChild(btn);
    }
    $("lisBooks-ot").hidden = true; $("lisBooks-nt").hidden = true; $("lisChaps").hidden = false;
    $("lisSaveMsg").textContent = "";
    paintSaveBtn();
    markChapters();
    $("lisChaps").scrollIntoView({ block: "nearest" });
  }
  function markChapters() {
    if (!shown) return;
    var saved = savedList()[shown];
    Array.prototype.forEach.call(document.querySelectorAll("#lisChapsGrid [data-ch]"), function (b) {
      var c = +b.getAttribute("data-ch");
      b.classList.toggle("on", st.slug === shown && st.ch === c);
      b.classList.toggle("saved", !!(saved && saved.reader === st.reader));
    });
  }
  document.querySelectorAll(".lis-books [data-book]").forEach(function (b) {
    b.addEventListener("click", function () { showBook(b.getAttribute("data-book")); });
  });
  $("lisChapsClose").addEventListener("click", function () {
    $("lisChaps").hidden = true;
    var nt = document.querySelector('.lis-tabs [data-t="nt"]').classList.contains("on");
    $("lisBooks-ot").hidden = nt; $("lisBooks-nt").hidden = !nt;
  });
  $("lisChapsGrid").addEventListener("click", function (e) {
    var b = e.target.closest("[data-ch]"); if (!b || !shown) return;
    p.open(shown, +b.getAttribute("data-ch"), 0, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------------------------------------------------------------- offline */
  function savedList() { try { return JSON.parse(localStorage.getItem(SAVED) || "{}") || {}; } catch (e) { return {}; } }
  function storeSaved(v) {
    try { localStorage.setItem(SAVED, JSON.stringify(v)); } catch (e) {}
    try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: "audio-saved-changed" }); } catch (e) {}
  }
  function mb(n) { return n > 1048576 ? (n / 1048576).toFixed(0) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  var canSave = "caches" in window && !!window.fetch;
  function paintSaveBtn() {
    var btn = $("lisSaveBook"); if (!canSave) { btn.hidden = true; return; }
    var s = shown && savedList()[shown];
    btn.textContent = s ? "Saved on this phone ✓ (remove)" : "Save " + (BY[shown] ? BY[shown][1] : "this book") + "’s audio for offline (about " + Math.max(1, Math.round(BY[shown][2] * 4.5)) + " MB)";
  }
  var saving = false;
  $("lisSaveBook").addEventListener("click", function () {
    if (!shown || saving) return;
    var slug = shown, b = BY[slug], list = savedList(), reader = st.reader;
    if (list[slug]) { removeBook(slug); return; }
    saving = true;
    var btn = $("lisSaveBook"), m = $("lisSaveMsg"), done = 0, bytes = 0, chapters = [];
    for (var c = 1; c <= b[2]; c++) chapters.push(c);
    btn.disabled = true;
    caches.open(CACHE).then(function (cache) {
      function one(c, tries) {
        var key = AudioBible.src(reader, slug, c, false);
        return cache.match(key).then(function (hit) {
          if (hit) { done++; return; }
          return fetch(key + "?save=1", { credentials: "same-origin" }).then(function (r) {
            if (r.status === 503 && tries < 6) return new Promise(function (ok) { setTimeout(ok, 4000); }).then(function () { return one(c, tries + 1); });
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.blob().then(function (blob) {
              bytes += blob.size; done++;
              m.textContent = "Saving " + b[1] + "… " + done + " of " + b[2] + " chapters (" + mb(bytes) + ")";
              return cache.put(key, new Response(blob, { headers: { "Content-Type": "audio/mpeg", "Content-Length": String(blob.size) } }));
            });
          });
        });
      }
      var queue = chapters.slice();
      function worker() { var c = queue.shift(); return c ? one(c, 0).then(worker) : Promise.resolve(); }
      return Promise.all([worker(), worker()]);
    }).then(function () {
      var l = savedList(); l[slug] = { reader: reader, chapters: b[2], bytes: bytes, at: Date.now() }; storeSaved(l);
      m.textContent = b[1] + " is saved. You can listen with no signal.";
    }).catch(function () {
      m.textContent = "Couldn’t save all of " + b[1] + ". What did save will still play; try again to finish.";
    }).then(function () {
      saving = false; btn.disabled = false; paintSaveBtn(); renderSaved(); markChapters();
      try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: "audio-saved-changed" }); } catch (e) {}
    });
  });
  function removeBook(slug) {
    var l = savedList(), s = l[slug], b = BY[slug]; if (!s || !b) return;
    caches.open(CACHE).then(function (cache) {
      var jobs = [];
      for (var c = 1; c <= b[2]; c++) jobs.push(cache.delete(AudioBible.src(s.reader, slug, c, false)));
      return Promise.all(jobs);
    }).then(function () { delete l[slug]; storeSaved(l); paintSaveBtn(); renderSaved(); markChapters(); $("lisSaveMsg").textContent = b[1] + " removed from this phone."; });
  }
  function renderSaved() {
    var l = savedList(), keys = Object.keys(l), ul = $("lisSavedList");
    ul.textContent = "";
    $("lisSaved").hidden = !keys.length;
    keys.forEach(function (slug) {
      var b = BY[slug]; if (!b) return;
      var li = el("li"), a = el("button", "lis-saved-name", b[1]); a.type = "button";
      a.addEventListener("click", function () { showBook(slug); });
      li.appendChild(a);
      li.appendChild(el("small", null, b[2] + " chapters · " + mb(l[slug].bytes || 0)));
      var rm = el("button", "ps-link", "Remove"); rm.type = "button";
      rm.addEventListener("click", function () { removeBook(slug); });
      li.appendChild(rm);
      ul.appendChild(li);
    });
    if (keys.length && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(function (e) { if (e && e.quota) $("lisSpace").textContent = "This app is using " + mb(e.usage || 0) + " of " + mb(e.quota) + " your browser allows."; }).catch(function () {});
    }
  }

  /* ---------------------------------------------------------------- start */
  var start = root.getAttribute("data-start");
  if (start) {
    var parts = start.split("/");
    p.open(parts[0], +parts[1], st.slug === parts[0] && st.ch === +parts[1] ? st.t : 0, false);
    showBook(parts[0]);
  } else if (st.slug) {
    p.open(st.slug, st.ch, st.t, false);
    showBook(st.slug);
  }
  renderSaved();
  paint();
})();
