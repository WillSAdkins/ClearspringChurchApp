/* ============================================================
   Clearspring — Listen to the chapter (text-to-speech)
   Reads the open chapter aloud with the device's own voice (free, offline
   for bundled translations), highlighting each verse as it goes. A small
   player bar offers speed, a sleep timer, and carrying on into the next
   chapter.
   ============================================================ */
(function () {
  "use strict";

  var btn = document.getElementById("readerListenBtn");
  if (!btn) return;
  var synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") { btn.hidden = true; return; }

  var playIcon = btn.querySelector(".listen-icon-play");
  var pauseIcon = btn.querySelector(".listen-icon-pause");
  var verseEls = Array.prototype.slice.call(document.querySelectorAll(".scripture .v"));
  if (!verseEls.length) { btn.hidden = true; return; }

  var KEY = "cs_audio_prefs";
  var SPEEDS = [0.75, 1, 1.25, 1.5, 2];
  var SLEEPS = [0, 15, 30, 60];
  var prefs = { rate: 1, auto: true };
  try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); if (s && typeof s === "object") { if (SPEEDS.indexOf(s.rate) >= 0) prefs.rate = s.rate; if (typeof s.auto === "boolean") prefs.auto = s.auto; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

  var idx = 0, speaking = false, sleepMins = 0, sleepTimer = null;

  /* ---------- player bar ---------- */
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
  var speedBtn = mk("ab-chip", "Playback speed", "");
  var sleepBtn = mk("ab-chip", "Sleep timer", "");
  var autoBtn = mk("ab-chip", "Carry on into the next chapter", "");
  document.body.appendChild(bar);

  function paint() {
    speedBtn.textContent = (prefs.rate === 1 ? "1" : String(prefs.rate)) + "×";
    sleepBtn.textContent = sleepMins ? "Sleep " + sleepMins + "m" : "Sleep";
    sleepBtn.setAttribute("aria-pressed", sleepMins ? "true" : "false");
    autoBtn.textContent = "Auto-next";
    autoBtn.setAttribute("aria-pressed", prefs.auto ? "true" : "false");
  }
  paint();

  speedBtn.addEventListener("click", function () {
    prefs.rate = SPEEDS[(SPEEDS.indexOf(prefs.rate) + 1) % SPEEDS.length]; save(); paint();
    if (speaking) { synth.cancel(); speakVerse(idx); }
  });
  sleepBtn.addEventListener("click", function () {
    sleepMins = SLEEPS[(SLEEPS.indexOf(sleepMins) + 1) % SLEEPS.length]; paint();
    clearTimeout(sleepTimer);
    if (sleepMins) sleepTimer = setTimeout(function () { pause(); sleepMins = 0; paint(); }, sleepMins * 60000);
  });
  autoBtn.addEventListener("click", function () { prefs.auto = !prefs.auto; save(); paint(); });
  stopBtn.addEventListener("click", stop);

  /* ---------- reading ---------- */
  function showPlaying(on) {
    if (playIcon) playIcon.hidden = on;
    if (pauseIcon) pauseIcon.hidden = !on;
    btn.classList.toggle("is-playing", on);
    if (on) bar.hidden = false;
  }
  function clearHighlight() { verseEls.forEach(function (v) { v.classList.remove("tts-reading"); }); }
  function highlight(el) {
    clearHighlight(); if (!el) return;
    el.classList.add("tts-reading");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    var r = el.getAttribute("data-ref") || ""; label.textContent = r.replace(/^.*?(\d+:\d+)$/, "$1");
  }
  function finished() {
    speaking = false; showPlaying(false); clearHighlight(); idx = 0;
    var next = document.getElementById("nextCh");
    if (prefs.auto && next) {
      try { sessionStorage.setItem("cs_autoplay", "1"); } catch (e) {}
      location.href = next.href;
    } else { bar.hidden = true; }
  }
  function speakVerse(i) {
    if (i >= verseEls.length) { finished(); return; }
    idx = i;
    var el = verseEls[i];
    var text = (el.getAttribute("data-text") || el.textContent || "").trim();
    if (!text) { speakVerse(i + 1); return; }
    highlight(el);
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95 * prefs.rate; u.pitch = 1.0;
    u.onend = function () { if (speaking) speakVerse(i + 1); };
    u.onerror = function () { if (speaking) speakVerse(i + 1); };
    synth.speak(u);
  }
  function start() { speaking = true; showPlaying(true); synth.cancel(); speakVerse(idx); }
  function pause() { speaking = false; showPlaying(false); synth.cancel(); }
  function stop() { speaking = false; idx = 0; showPlaying(false); clearHighlight(); synth.cancel(); bar.hidden = true; clearTimeout(sleepTimer); sleepMins = 0; paint(); }

  btn.addEventListener("click", function () { if (speaking) pause(); else start(); });

  // Carry on from the previous chapter. Some phones only allow speech after
  // a tap, so if it doesn't start, offer a one-tap "keep listening".
  var auto = null;
  try { auto = sessionStorage.getItem("cs_autoplay"); sessionStorage.removeItem("cs_autoplay"); } catch (e) {}
  if (auto === "1") {
    start();
    setTimeout(function () {
      if (!synth.speaking) {
        pause();
        var go = document.createElement("button"); go.type = "button"; go.className = "ab-resume";
        go.textContent = "Keep listening";
        go.addEventListener("click", function () { go.remove(); start(); });
        bar.hidden = false; bar.insertBefore(go, label);
      }
    }, 1500);
  }

  window.addEventListener("pagehide", function () { synth.cancel(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && speaking) pause(); });
})();
