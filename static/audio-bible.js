/* Clearspring — the recorded audio Bible engine.

   One <audio> element plays a chapter at a time from /audio/bible/…, and on
   "ended" loads the next chapter itself, so listening carries on through the
   Bible with the phone locked (the browser keeps a playing media element
   alive; speech synthesis it does not). The lock screen and headphones get
   title, artwork and controls through the Media Session API.

   Where you are is kept in localStorage ("cs_listen") so the player and the
   reader can pick up where you left off. Used by templates/listen.html and
   static/reader-audio.js:  var p = AudioBible.player({ onChange: fn }). */
(function () {
  "use strict";
  var KEY = "cs_listen";
  var BOOKS = window.CS_AUDIO_BOOKS || [];          // [[slug, name, chapters], …]
  var READERS = window.CS_AUDIO_READERS || { souer: "Bob Souer" };
  var SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
  var SLEEPS = [0, 15, 30, 45, 60, "chapter"];
  var INDEX = {};
  BOOKS.forEach(function (b, i) { INDEX[b[0]] = i; });

  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    return {
      reader: READERS[s.reader] ? s.reader : (window.CS_AUDIO_DEFAULT_READER || "souer"),
      rate: SPEEDS.indexOf(s.rate) >= 0 ? s.rate : 1,
      slug: INDEX[s.slug] != null ? s.slug : null,
      ch: +s.ch || 0,
      t: +s.t || 0,
      auto: s.auto !== false
    };
  }
  function store(st) {
    try { localStorage.setItem(KEY, JSON.stringify({ reader: st.reader, rate: st.rate, slug: st.slug, ch: st.ch, t: Math.floor(st.t || 0), auto: st.auto, at: Date.now() })); } catch (e) {}
  }
  function bookName(slug) { var b = BOOKS[INDEX[slug]]; return b ? b[1] : slug; }
  function chapLabel(slug, ch) { return (slug === "psalms" ? "Psalm" : bookName(slug)) + " " + ch; }
  function step(slug, ch, d) {
    var i = INDEX[slug]; if (i == null) return null;
    var c = ch + d;
    if (c >= 1 && c <= BOOKS[i][2]) return [slug, c];
    var j = i + d; if (j < 0 || j >= BOOKS.length) return null;
    return [BOOKS[j][0], d > 0 ? 1 : BOOKS[j][2]];
  }
  function src(reader, slug, ch, alt) { return "/audio/bible/" + reader + "/" + slug + "/" + ch + ".mp3" + (alt ? "?alt=1" : ""); }
  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(ss).padStart(2, "0");
  }

  function player(opts) {
    opts = opts || {};
    var st = load();
    var audio = document.getElementById("csAudioBible");
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "csAudioBible"; audio.preload = "metadata";
      audio.setAttribute("playsinline", "");
      document.body.appendChild(audio);
    }
    var tried = 0, sleep = 0, sleepAt = 0, lastSave = 0, loaded = null, wantPlay = false, listened = {}, stand = null;

    function emit(kind) { if (opts.onChange) opts.onChange(kind, api); }

    function meta() {
      if (!("mediaSession" in navigator) || !st.slug) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: chapLabel(st.slug, st.ch),
          artist: READERS[stand || st.reader] + " · Berean Standard Bible",
          album: "Clearspring · Audio Bible",
          artwork: [{ src: "/static/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
                    { src: "/static/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" }]
        });
      } catch (e) {}
    }
    function position() {
      if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState || !isFinite(audio.duration)) return;
      try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: Math.min(audio.currentTime, audio.duration) }); } catch (e) {}
    }
    if ("mediaSession" in navigator) {
      var ms = navigator.mediaSession, h = function (a, f) { try { ms.setActionHandler(a, f); } catch (e) {} };
      h("play", function () { api.play(); });
      h("pause", function () { api.pause(); });
      h("previoustrack", function () { api.prev(); });
      h("nexttrack", function () { api.next(); });
      h("seekbackward", function (d) { api.seek(-(d && d.seekOffset || 15)); });
      h("seekforward", function (d) { api.seek(d && d.seekOffset || 30); });
      h("seekto", function (d) { if (d && d.seekTime != null) { audio.currentTime = d.seekTime; position(); } });
      h("stop", function () { api.stop(); });
    }

    function open(slug, ch, at, play) {
      if (INDEX[slug] == null) return;
      st.slug = slug; st.ch = ch; st.t = at || 0; tried = 0; stand = null;
      loaded = slug + "/" + ch;
      wantPlay = !!play;
      audio.src = src(st.reader, slug, ch, false);
      audio.playbackRate = st.rate;
      if (st.t) {
        var seekOnce = function () { audio.removeEventListener("loadedmetadata", seekOnce); try { audio.currentTime = Math.min(st.t, (audio.duration || st.t + 1) - 1); } catch (e) {} };
        audio.addEventListener("loadedmetadata", seekOnce);
      }
      store(st); meta();
      if (play) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () { wantPlay = false; emit("blocked"); });
      }
      emit("open");
    }

    audio.addEventListener("error", function () {
      if (!st.slug) return;
      tried++;
      if (tried === 1) { audio.src = src(st.reader, st.slug, st.ch, true); audio.playbackRate = st.rate; if (wantPlay) audio.play().catch(function () {}); return; }
      // This narrator hasn't recorded the chapter: Bob Souer reads it instead,
      // just for this chapter (the chosen narrator stays the setting).
      if (tried === 2 && st.reader !== "souer") { stand = "souer"; audio.src = src("souer", st.slug, st.ch, false); audio.playbackRate = st.rate; if (wantPlay) audio.play().catch(function () {}); meta(); emit("reader"); return; }
      wantPlay = false;
      emit("error");
    });
    audio.addEventListener("play", function () { wantPlay = true; if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; emit("play"); });
    audio.addEventListener("pause", function () {
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
      st.t = audio.currentTime; store(st); emit("pause");
    });
    audio.addEventListener("loadedmetadata", function () { audio.playbackRate = st.rate; position(); emit("time"); });
    audio.addEventListener("ratechange", position);
    audio.addEventListener("timeupdate", function () {
      st.t = audio.currentTime;
      var now = Date.now();
      if (now - lastSave > 4000) { lastSave = now; store(st); position(); }
      // Timers are unreliable with the screen locked; timeupdate keeps firing while audio plays.
      if (sleep && sleep !== "chapter" && sleepAt && now >= sleepAt) { sleep = 0; sleepAt = 0; audio.pause(); emit("sleep"); }
      if (audio.duration && audio.currentTime / audio.duration > 0.9 && !listened[loaded]) {
        listened[loaded] = 1;
        try { document.dispatchEvent(new CustomEvent("cs:listened", { detail: { slug: st.slug, chapter: st.ch } })); } catch (e) {}
      }
      emit("time");
    });
    audio.addEventListener("ended", function () {
      st.t = 0; store(st);
      if (sleep === "chapter") { sleep = 0; emit("sleep"); emit("ended"); return; }
      var n = st.auto ? step(st.slug, st.ch, 1) : null;
      if (n) open(n[0], n[1], 0, true);   // same element, no page load: keeps playing while locked
      else emit("ended");
    });

    var api = {
      audio: audio,
      state: st,
      label: function () { return st.slug ? chapLabel(st.slug, st.ch) : ""; },
      readerName: function () { return READERS[stand || st.reader]; },
      standIn: function () { return stand; },
      open: open,
      play: function () {
        if (!st.slug) return;
        if (!audio.src || loaded !== st.slug + "/" + st.ch) { open(st.slug, st.ch, st.t, true); return; }
        wantPlay = true;
        var p = audio.play(); if (p && p.catch) p.catch(function () { emit("blocked"); });
      },
      pause: function () { wantPlay = false; audio.pause(); },
      toggle: function () { if (audio.paused) api.play(); else api.pause(); },
      stop: function () { wantPlay = false; audio.pause(); try { audio.currentTime = 0; } catch (e) {} st.t = 0; store(st); emit("stop"); },
      seek: function (d) { if (!isFinite(audio.duration)) return; audio.currentTime = Math.max(0, Math.min(audio.duration - 0.5, audio.currentTime + d)); position(); emit("time"); },
      seekTo: function (frac) { if (isFinite(audio.duration)) { audio.currentTime = frac * audio.duration; position(); emit("time"); } },
      next: function () { var n = step(st.slug, st.ch, 1); if (n) open(n[0], n[1], 0, !audio.paused || wantPlay); },
      prev: function () {
        if (audio.currentTime > 5) { audio.currentTime = 0; emit("time"); return; }
        var n = step(st.slug, st.ch, -1); if (n) open(n[0], n[1], 0, !audio.paused || wantPlay);
      },
      speed: function () { st.rate = SPEEDS[(SPEEDS.indexOf(st.rate) + 1) % SPEEDS.length]; audio.playbackRate = st.rate; store(st); emit("prefs"); return st.rate; },
      setReader: function (r) {
        if (!READERS[r] || r === st.reader) return;
        var playing = !audio.paused, at = audio.currentTime || 0;
        st.reader = r; store(st);
        if (st.slug) open(st.slug, st.ch, at, playing);
        emit("prefs");
      },
      toggleAuto: function () { st.auto = !st.auto; store(st); emit("prefs"); return st.auto; },
      cycleSleep: function () {
        sleep = SLEEPS[(SLEEPS.indexOf(sleep) + 1) % SLEEPS.length];
        sleepAt = typeof sleep === "number" && sleep ? Date.now() + sleep * 60000 : 0;
        emit("prefs"); return sleep;
      },
      sleepLabel: function () {
        if (!sleep) return "Sleep";
        if (sleep === "chapter") return "End of chapter";
        var left = Math.max(0, Math.round((sleepAt - Date.now()) / 60000));
        return "Sleep " + left + "m";
      },
      sleeping: function () { return !!sleep; },
      times: function () { return [fmt(audio.currentTime), fmt(audio.duration), isFinite(audio.duration) && audio.duration ? audio.currentTime / audio.duration : 0]; },
      step: step, chapLabel: chapLabel, src: src
    };
    return api;
  }

  window.AudioBible = { player: player, load: load, store: store, chapLabel: chapLabel, step: step, src: src, fmt: fmt };
})();
