/* ============================================================
   Clearspring — Listen to the chapter
   Plays the recorded audio Bible (BSB, read by Bob Souer) for the chapter
   you're reading. It keeps playing with the phone locked and carries on into
   the next chapter without leaving the page, with lock-screen controls.

   "Phone voice" is still here: the phone reads the open translation aloud,
   highlighting each verse. It's used when the recording can't be reached
   (offline and not saved) or when someone prefers to follow the text verse by
   verse. Speech stops when the screen locks; recordings don't.
   ============================================================ */
(function () {
  "use strict";

  var btn = document.getElementById("readerListenBtn");
  var main = document.getElementById("readerMain");
  if (!btn || !main) return;
  var slug = main.getAttribute("data-slug"), chapter = +main.getAttribute("data-chapter");
  var translation = main.getAttribute("data-translation") || "";
  var playIcon = btn.querySelector(".listen-icon-play"), pauseIcon = btn.querySelector(".listen-icon-pause");
  var verseEls = Array.prototype.slice.call(document.querySelectorAll(".scripture .v"));
  var synth = window.speechSynthesis;
  var canSpeak = !!(synth && typeof SpeechSynthesisUtterance !== "undefined" && verseEls.length);
  var canRecord = !!window.AudioBible;
  if (!canRecord && !canSpeak) { btn.hidden = true; return; }

  var KEY = "cs_audio_prefs";
  var prefs = { mode: "recorded", rate: 1 };
  try { var s0 = JSON.parse(localStorage.getItem(KEY) || "{}"); if (s0 && s0.mode === "voice") prefs.mode = "voice"; if (s0 && s0.rate) prefs.rate = s0.rate; } catch (e) {}
  function savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }
  if (!canRecord) prefs.mode = "voice";
  if (!canSpeak) prefs.mode = "recorded";

  /* ---------- the bar ---------- */
  var bar = document.createElement("div");
  bar.className = "audio-bar"; bar.hidden = true;
  bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Listening controls");
  function mk(cls, label, text) {
    var b = document.createElement("button"); b.type = "button"; b.className = cls;
    b.setAttribute("aria-label", label); b.textContent = text; bar.appendChild(b); return b;
  }
  var stopBtn = mk("ab-stop", "Stop listening", "");
  stopBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/></svg>';
  var label = document.createElement("span"); label.className = "ab-label"; bar.appendChild(label);
  var goBtn = document.createElement("a"); goBtn.className = "ab-go"; goBtn.hidden = true; bar.appendChild(goBtn);
  var speedBtn = mk("ab-chip", "Playback speed", "");
  var sleepBtn = mk("ab-chip", "Sleep timer", "");
  var modeBtn = mk("ab-chip", "Switch between the recording and your phone's voice", "");
  var more = document.createElement("a"); more.className = "ab-chip ab-more"; more.textContent = "Player";
  more.href = "/bible/listen?book=" + encodeURIComponent(slug) + "&chapter=" + chapter;
  more.setAttribute("aria-label", "Open the audio Bible player"); bar.appendChild(more);
  var note = document.createElement("p"); note.className = "ab-note"; note.hidden = true; note.setAttribute("role", "status");
  document.body.appendChild(bar); document.body.appendChild(note);
  function say(t) { note.textContent = t || ""; note.hidden = !t; if (t) setTimeout(function () { if (note.textContent === t) note.hidden = true; }, 7000); }

  function showPlaying(on) {
    // SVG elements have no .hidden property, so set the attribute itself.
    if (playIcon) playIcon.toggleAttribute("hidden", on);
    if (pauseIcon) pauseIcon.toggleAttribute("hidden", !on);
    btn.classList.toggle("is-playing", on);
    btn.setAttribute("aria-label", on ? "Pause listening" : "Listen to this chapter");
    if (on) bar.hidden = false;
  }

  /* ---------- recorded audio ---------- */
  var p = null;
  function recorded() {
    if (p) return p;
    p = AudioBible.player({ onChange: function (kind) {
      try { (window.__abEvents = window.__abEvents || []).push(kind); } catch (e) {}
      if (prefs.mode !== "recorded") return;
      showPlaying(!p.audio.paused);
      var t = p.times(), here = p.state.slug === slug && p.state.ch === chapter;
      label.textContent = (here ? "" : p.label() + " · ") + t[0];
      goBtn.hidden = here || !p.state.slug;
      if (!here && p.state.slug) { goBtn.textContent = "Go there"; goBtn.href = "/bible/read/" + p.state.slug + "/" + p.state.ch; }
      speedBtn.textContent = (p.state.rate === 1 ? "1" : p.state.rate) + "×";
      sleepBtn.textContent = p.sleepLabel(); sleepBtn.setAttribute("aria-pressed", p.sleeping() ? "true" : "false");
      if (kind === "error") {
        if (canSpeak) { say("The recording can’t be reached right now, so your phone’s voice will read it."); setMode("voice"); startVoice(); }
        else say("The recording wouldn’t load. Check your connection.");
      } else if (kind === "blocked") { showPlaying(false); bar.hidden = false; }
    } });
    return p;
  }
  function startRecorded() {
    var pl = recorded(), st = pl.state;
    if (st.slug === slug && st.ch === chapter) pl.play();
    else pl.open(slug, chapter, 0, true);
    if (translation && translation !== "bsb") say("Read by Bob Souer from the Berean Standard Bible, so the wording may differ a little from what’s on screen.");
  }

  /* ---------- phone voice (text to speech) ---------- */
  var idx = 0, speaking = false, sleepMins = 0, sleepTimer = null, VSPEEDS = [0.75, 1, 1.25, 1.5, 2];
  var fails = 0, voiceStarted = 0;
  function clearHighlight() { verseEls.forEach(function (v) { v.classList.remove("tts-reading"); }); }
  function highlight(el) {
    clearHighlight(); if (!el) return;
    el.classList.add("tts-reading");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    var r = el.getAttribute("data-ref") || ""; label.textContent = r.replace(/^.*?(\d+:\d+)$/, "$1");
  }
  function speakVerse(i) {
    if (i >= verseEls.length) {
      speaking = false; showPlaying(false); clearHighlight(); idx = 0;
      var next = document.getElementById("nextCh");
      // Only carry on if the chapter was really read aloud (not raced through by errors).
      if (next && Date.now() - voiceStarted > 4000 && fails < verseEls.length / 2) {
        try { sessionStorage.setItem("cs_autoplay", "voice"); } catch (e) {} location.href = next.href;
      }
      return;
    }
    idx = i;
    var el = verseEls[i], text = (el.getAttribute("data-text") || el.textContent || "").trim();
    if (!text) { speakVerse(i + 1); return; }
    highlight(el);
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95 * prefs.rate;
    u.onend = function () { fails = 0; if (speaking) speakVerse(i + 1); };
    u.onerror = function (ev) {
      if (!speaking || (ev && (ev.error === "interrupted" || ev.error === "canceled"))) return;
      fails++;
      if (fails >= 3) { pauseVoice(); say("Your phone’s voice isn’t working here. Try the recording instead."); return; }
      speakVerse(i + 1);
    };
    synth.speak(u);
  }
  function startVoice() { if (!canSpeak) return; speaking = true; fails = 0; voiceStarted = Date.now(); showPlaying(true); synth.cancel(); speakVerse(idx); }
  function pauseVoice() { speaking = false; showPlaying(false); if (synth) synth.cancel(); }

  /* ---------- controls ---------- */
  function setMode(m) {
    if (m === prefs.mode) return;
    if (prefs.mode === "recorded" && p) p.pause();
    if (prefs.mode === "voice") { pauseVoice(); clearHighlight(); }
    prefs.mode = m; savePrefs(); paintChips();
  }
  function paintChips() {
    modeBtn.hidden = !(canRecord && canSpeak);
    modeBtn.textContent = prefs.mode === "recorded" ? "Phone voice" : "Recording";
    if (prefs.mode === "voice") {
      speedBtn.textContent = (prefs.rate === 1 ? "1" : prefs.rate) + "×";
      sleepBtn.textContent = sleepMins ? "Sleep " + sleepMins + "m" : "Sleep";
      sleepBtn.setAttribute("aria-pressed", sleepMins ? "true" : "false");
      goBtn.hidden = true;
    } else if (p) {
      speedBtn.textContent = (p.state.rate === 1 ? "1" : p.state.rate) + "×";
    } else {
      var st = canRecord ? AudioBible.load() : { rate: 1 };
      speedBtn.textContent = (st.rate === 1 ? "1" : st.rate) + "×";
      sleepBtn.textContent = "Sleep";
    }
    more.hidden = prefs.mode !== "recorded";
  }
  paintChips();

  btn.addEventListener("click", function () {
    if (prefs.mode === "recorded") {
      var pl = recorded();
      if (!pl.audio.paused) pl.pause(); else startRecorded();
    } else if (speaking) pauseVoice();
    else startVoice();
  });
  stopBtn.addEventListener("click", function () {
    if (p) p.stop();
    pauseVoice(); clearHighlight(); idx = 0;
    bar.hidden = true; note.hidden = true; showPlaying(false);
    clearTimeout(sleepTimer); sleepMins = 0;
  });
  speedBtn.addEventListener("click", function () {
    if (prefs.mode === "recorded") { recorded().speed(); speedBtn.textContent = (p.state.rate === 1 ? "1" : p.state.rate) + "×"; return; }
    prefs.rate = VSPEEDS[(VSPEEDS.indexOf(prefs.rate) + 1) % VSPEEDS.length]; savePrefs(); paintChips();
    if (speaking) { synth.cancel(); speakVerse(idx); }
  });
  sleepBtn.addEventListener("click", function () {
    if (prefs.mode === "recorded") { recorded().cycleSleep(); sleepBtn.textContent = p.sleepLabel(); sleepBtn.setAttribute("aria-pressed", p.sleeping() ? "true" : "false"); return; }
    var opts = [0, 15, 30, 60]; sleepMins = opts[(opts.indexOf(sleepMins) + 1) % opts.length]; paintChips();
    clearTimeout(sleepTimer);
    if (sleepMins) sleepTimer = setTimeout(function () { pauseVoice(); sleepMins = 0; paintChips(); }, sleepMins * 60000);
  });
  modeBtn.addEventListener("click", function () {
    var was = (prefs.mode === "recorded" && p && !p.audio.paused) || speaking;
    setMode(prefs.mode === "recorded" ? "voice" : "recorded");
    if (was) { if (prefs.mode === "recorded") startRecorded(); else startVoice(); }
  });

  // Listening to the end of a chapter counts as reading it.
  document.addEventListener("cs:listened", function (e) {
    try { if (window.Plans && window.Plans.markRead) window.Plans.markRead(e.detail.slug, e.detail.chapter); } catch (err) {}
  });

  // Carrying on with the phone's voice from the previous chapter.
  var auto = null;
  try { auto = sessionStorage.getItem("cs_autoplay"); sessionStorage.removeItem("cs_autoplay"); } catch (e) {}
  if (auto && prefs.mode === "voice" && canSpeak) {
    startVoice();
    setTimeout(function () {
      if (!synth.speaking) {
        pauseVoice();
        var go = document.createElement("button"); go.type = "button"; go.className = "ab-resume";
        go.textContent = "Keep listening";
        go.addEventListener("click", function () { go.remove(); startVoice(); });
        bar.hidden = false; bar.insertBefore(go, label);
      }
    }, 1500);
  }

  // If this is where you stopped listening, offer to pick up from there.
  if (canRecord && prefs.mode === "recorded") {
    var last = AudioBible.load();
    // Still listening from another page: join the same player, so this
    // page's bar shows it (and the mini player steps aside).
    if (last.active) recorded();
    if (last.slug === slug && last.ch === chapter && last.t > 20) {
      bar.hidden = false;
      label.textContent = "Resume from " + AudioBible.fmt(last.t);
    }
  }

  window.addEventListener("pagehide", function () { if (synth) synth.cancel(); });
  // The phone's voice can't run with the screen off; the recording can.
  document.addEventListener("visibilitychange", function () { if (document.hidden && speaking) pauseVoice(); });
})();
