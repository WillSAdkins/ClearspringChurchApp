/* ============================================================
   Clearspring — Listen to the chapter (text-to-speech)
   ------------------------------------------------------------
   Reads the open chapter aloud using the device's own built-in
   voice (Web Speech API) — free, no server, no licensing, works
   with the local ASV. Highlights each verse as it's read so the
   reader can follow along. Reads verse-by-verse (not one giant
   blob) so highlighting stays in sync and pause/resume is clean.
   ============================================================ */

(function () {
  "use strict";

  var btn = document.getElementById("readerListenBtn");
  if (!btn) return;

  var synth = window.speechSynthesis;
  // Graceful out: no speech support -> hide the button rather than show a
  // control that does nothing.
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
    btn.hidden = true;
    return;
  }

  var playIcon = btn.querySelector(".listen-icon-play");
  var pauseIcon = btn.querySelector(".listen-icon-pause");
  var verseEls = Array.prototype.slice.call(document.querySelectorAll(".scripture .v"));
  if (!verseEls.length) { btn.hidden = true; return; }

  var idx = 0;          // which verse we're on
  var speaking = false; // are we actively reading?
  var current = null;   // current utterance

  function showPlaying(on) {
    if (playIcon) playIcon.hidden = on;
    if (pauseIcon) pauseIcon.hidden = !on;
    btn.classList.toggle("is-playing", on);
  }

  function clearHighlight() {
    verseEls.forEach(function (v) { v.classList.remove("tts-reading"); });
  }

  function highlight(el) {
    clearHighlight();
    if (!el) return;
    el.classList.add("tts-reading");
    // Keep the spoken verse comfortably in view.
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function speakVerse(i) {
    if (i >= verseEls.length) { stop(); return; }
    idx = i;
    var el = verseEls[i];
    var text = el.getAttribute("data-text") || el.textContent || "";
    text = text.trim();
    if (!text) { speakVerse(i + 1); return; }

    highlight(el);
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;   // a touch slower than default reads more naturally
    u.pitch = 1.0;
    u.onend = function () {
      // Advance only if we're still meant to be playing.
      if (speaking) speakVerse(i + 1);
    };
    u.onerror = function () {
      if (speaking) speakVerse(i + 1);
    };
    current = u;
    synth.speak(u);
  }

  function start() {
    speaking = true;
    showPlaying(true);
    // Chrome sometimes needs a cancel first to clear a stuck queue.
    synth.cancel();
    speakVerse(idx);
  }

  function pause() {
    speaking = false;
    showPlaying(false);
    synth.cancel();   // cancel (not pause) — more reliable across browsers
  }

  function stop() {
    speaking = false;
    idx = 0;
    showPlaying(false);
    clearHighlight();
    synth.cancel();
  }

  btn.addEventListener("click", function () {
    if (speaking) {
      pause();
    } else {
      start();
    }
  });

  // Stop cleanly when leaving the page, or the voice keeps talking after
  // you've navigated away.
  window.addEventListener("pagehide", stop);
  window.addEventListener("beforeunload", stop);
  // Also stop if the tab is hidden (e.g. app backgrounded) to be tidy.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && speaking) pause();
  });
})();
