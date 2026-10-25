/* Clearspring Arcade: the title screen in front of each game.
   Games that run on their own (a timer, enemies moving) wait for Play:
     if (window.Arcade && Arcade.waiting()) Arcade.onStart(restart); else restart(); */
window.Arcade = (function () {
  "use strict";
  var waits = [], started = false;
  var cab = document.getElementById("arcCab");
  if (cab) document.body.classList.add("arcade", "arc-wait");
  else document.body.classList.add("arcade");
  function start() {
    if (started) return;
    started = true;
    document.body.classList.remove("arc-wait");
    document.body.classList.add("arc-on");
    window.scrollTo(0, 0);
    waits.splice(0).forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    var board = document.querySelector(".board");
    var first = board && board.querySelector("button:not([disabled]), [tabindex='0'], a[href]");
    if (first) first.focus({ preventScroll: true });
    try { document.dispatchEvent(new CustomEvent("arcade:start")); } catch (e) {}
  }
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("arcPlay");
    if (b) b.addEventListener("click", start);
  });
  document.addEventListener("keydown", function (e) {
    if (!started && cab && (e.key === "Enter" || e.key === " ") && document.activeElement === document.body) { e.preventDefault(); start(); }
  });
  return {
    waiting: function () { return !!cab && !started; },
    onStart: function (fn) { if (started || !cab) fn(); else waits.push(fn); },
    start: start
  };
})();
