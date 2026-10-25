/* Clearspring: the mini player.
   The app is made of separate pages, so moving to another one closes the
   audio element that was playing. The audio Bible remembers where it was
   (cs_listen: chapter, second, and that it was playing), and this script,
   on every page, carries straight on from there and shows a slim player
   above the tab bar: chapter, play/pause, a progress line and close.

   If the phone won't let a new page start sound by itself (some browsers
   ask for a tap first), the bar shows "Tap to carry on" instead. */
(function () {
  "use strict";
  if (!window.AudioBible) return;
  var KEEP_GOING_MS = 20000;   // carry on only straight after leaving a page, not hours later
  var onListen = /^\/bible\/listen\b/.test(location.pathname);

  function start() {
    var saved = AudioBible.load();
    if (!saved.active || !saved.slug) { watchForStart(); return; }
    build();
    var p = player();
    if (saved.on && Date.now() - saved.at < KEEP_GOING_MS) {
      p.open(saved.slug, saved.ch, saved.t, true);
    } else {
      blocked = false; paint();
    }
  }

  // Nothing playing yet: show the bar as soon as something starts on this page.
  function watchForStart() {
    var p = null;
    var check = function () {
      if (p) return;
      var a = document.getElementById("csAudioBible");
      if (a && !a.paused) { build(); p = player(); paint(); }
    };
    document.addEventListener("play", check, true);
  }

  var bar, title, sub, toggle, closeBtn, fill, p0 = null, blocked = false;
  function player() {
    if (p0) return p0;
    p0 = AudioBible.player({ onChange: function (kind) {
      if (kind === "blocked") blocked = true;
      if (kind === "play") blocked = false;
      if (kind === "close") { hide(); return; }
      paint();
    } });
    return p0;
  }

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; return n; }
  var PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  var PAUSE = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>';
  var X = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var EAR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z"/><path d="M3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/></svg>';

  function build() {
    if (bar || onListen) return;
    bar = el("div", "mp");
    bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Audio Bible");
    var go = el("a", "mp-go"); go.href = "/bible/listen";
    go.setAttribute("aria-label", "Open the audio Bible player");
    go.appendChild(el("span", "mp-art", EAR));
    var words = el("span", "mp-words");
    title = el("b", "mp-title"); sub = el("small", "mp-sub");
    words.appendChild(title); words.appendChild(sub); go.appendChild(words);
    toggle = el("button", "mp-btn mp-toggle"); toggle.type = "button";
    closeBtn = el("button", "mp-btn mp-close", X); closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Stop and close the player");
    var line = el("span", "mp-line"); fill = el("i"); line.appendChild(fill);
    bar.appendChild(go); bar.appendChild(toggle); bar.appendChild(closeBtn); bar.appendChild(line);
    toggle.addEventListener("click", function () {
      var p = player();
      if (p.playing()) p.pause(); else p.play();
    });
    closeBtn.addEventListener("click", function () { player().close(); });
    document.body.appendChild(bar);
    document.body.classList.add("has-mp");
  }

  function hide() {
    if (!bar) return;
    bar.remove(); bar = null; document.body.classList.remove("has-mp");
  }

  function paint() {
    if (!bar) return;
    var p = player(), st = p.state;
    // The reader has its own listening bar: don't show two.
    var readerBar = document.querySelector(".audio-bar:not([hidden])");
    bar.hidden = !!readerBar;
    document.body.classList.toggle("has-mp", !readerBar);
    var on = p.playing();
    title.textContent = p.label() || "Audio Bible";
    sub.textContent = blocked && !on ? "Tap play to carry on" : (on ? "Playing" : "Paused") + " · " + p.readerName();
    toggle.innerHTML = on ? PAUSE : PLAY;
    toggle.setAttribute("aria-label", on ? "Pause" : "Play");
    toggle.classList.toggle("mp-nudge", blocked && !on);
    var t = p.times();
    fill.style.width = (t[2] * 100).toFixed(1) + "%";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
