/* Clearspring — a soft bell and a gentle countdown, for prayer timers. */
window.PrayerBell = (function () {
  "use strict";
  var ctx = null, on = true;
  try { on = localStorage.getItem("cs_bell") !== "off"; } catch (e) {}
  function ring() {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var t = ctx.currentTime;
      [[523.25, 0.22], [1046.5, 0.07], [1569.75, 0.03]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 4.1);
      });
    } catch (e) {}
    if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
  }
  function unlock() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) {} }
  function setOn(v) { on = v; try { localStorage.setItem("cs_bell", v ? "on" : "off"); } catch (e) {} }

  /* A countdown ring in `box`. Calls done() when it ends. Returns stop(). */
  function timer(box, seconds, done) {
    box.textContent = "";
    var wrap = document.createElement("div"); wrap.className = "pt";
    wrap.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" class="pt-bg"/><circle cx="50" cy="50" r="45" class="pt-fg"/></svg><b class="pt-n"></b><button type="button" class="pt-btn">Pause</button>';
    box.appendChild(wrap);
    var fg = wrap.querySelector(".pt-fg"), n = wrap.querySelector(".pt-n"), btn = wrap.querySelector(".pt-btn");
    var C = 2 * Math.PI * 45; fg.style.strokeDasharray = C;
    var left = seconds, running = true, last = Date.now(), finished = false, iv = null;
    function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
    function paint() { n.textContent = fmt(left); fg.style.strokeDashoffset = C * (left / seconds); }
    function tick() {
      var now = Date.now();
      if (running) left -= (now - last) / 1000;
      last = now;
      if (left <= 0 && !finished) {
        finished = true; left = 0; paint(); clearInterval(iv); ring();
        btn.textContent = "Again"; wrap.classList.add("done");
        if (done) done();
        return;
      }
      paint();
    }
    function startTicking() { clearInterval(iv); last = Date.now(); iv = setInterval(tick, 250); }
    btn.addEventListener("click", function () {
      if (finished) { left = seconds; finished = false; running = true; btn.textContent = "Pause"; wrap.classList.remove("done"); startTicking(); return; }
      running = !running; btn.textContent = running ? "Pause" : "Resume"; last = Date.now();
    });
    startTicking();
    paint();
    return function () { clearInterval(iv); };
  }
  return { ring: ring, unlock: unlock, setOn: setOn, isOn: function () { return on; }, timer: timer };
})();
