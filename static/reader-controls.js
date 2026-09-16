/* Clearspring — Bible reader controls (Aa)
   Powers the in-reader "Aa" button: text size and reading background.
   Text size uses the SAME storage key as the Settings page (cs_text_size)
   so the two stay in sync. Reading background (cs_reading_bg) tints only
   the scripture area. */

(function () {
  "use strict";

  var SIZE_KEY = "cs_text_size";
  var BG_KEY = "cs_reading_bg";
  var SIZES = ["small", "normal", "large", "xlarge"];
  var BGS = ["default", "sepia", "night"];

  var btn = document.getElementById("readerAaBtn");
  var panel = document.getElementById("readerAaPanel");
  var sizeOpts = document.getElementById("readerSizeOpts");
  var bgOpts = document.getElementById("readerBgOpts");
  var scripture = document.getElementById("scripture");

  if (!btn || !panel) return;

  function getStored(key, fallback, allowed) {
    try { var v = localStorage.getItem(key); return allowed.indexOf(v) !== -1 ? v : fallback; }
    catch (e) { return fallback; }
  }
  function setStored(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  function applySize(size) {
    document.documentElement.setAttribute("data-text-size", size);
    markActive(sizeOpts, "size", size);
  }
  function applyBg(bg) {
    if (scripture) {
      if (bg === "default") scripture.removeAttribute("data-reading-bg");
      else scripture.setAttribute("data-reading-bg", bg);
    }
    markActive(bgOpts, "bg", bg);
  }
  function markActive(container, attr, val) {
    if (!container) return;
    var opts = container.querySelectorAll("[data-" + attr + "]");
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.toggle("on", opts[i].getAttribute("data-" + attr) === val);
    }
  }

  applySize(getStored(SIZE_KEY, "normal", SIZES));
  applyBg(getStored(BG_KEY, "default", BGS));

  btn.addEventListener("click", function (e) { e.stopPropagation(); panel.hidden = !panel.hidden; });
  document.addEventListener("click", function (e) {
    if (panel.hidden) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    panel.hidden = true;
  });

  if (sizeOpts) {
    sizeOpts.addEventListener("click", function (e) {
      var b = e.target.closest("[data-size]"); if (!b) return;
      var size = b.getAttribute("data-size"); applySize(size); setStored(SIZE_KEY, size);
    });
  }
  if (bgOpts) {
    bgOpts.addEventListener("click", function (e) {
      var b = e.target.closest("[data-bg]"); if (!b) return;
      var bg = b.getAttribute("data-bg"); applyBg(bg); setStored(BG_KEY, bg);
    });
  }
})();
