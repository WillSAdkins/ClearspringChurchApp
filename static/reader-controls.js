/* Clearspring — Bible reader controls (Aa)
   Text size, background, font, spacing, layout and the on/off switches
   (verse numbers, headings, red letters, footnotes, keep screen on), plus:
   footnote pop-ups, reading time, a progress line, and swipe to change
   chapter. Text size shares cs_text_size with the Settings page. */

(function () {
  "use strict";

  var SIZE_KEY = "cs_text_size", BG_KEY = "cs_reading_bg", PREF_KEY = "cs_reader_prefs";
  var SIZES = ["small", "normal", "large", "xlarge"], BGS = ["default", "sepia", "night"];
  var DEFAULTS = { font: "serif", space: "normal", layout: "flow", vn: true, heads: true, red: true, notes: true, xr: false, awake: false };

  var btn = document.getElementById("readerAaBtn");
  var panel = document.getElementById("readerAaPanel");
  var scripture = document.getElementById("scripture");
  var $ = function (id) { return document.getElementById(id); };

  function getStored(key, fallback, allowed) {
    try { var v = localStorage.getItem(key); return allowed.indexOf(v) !== -1 ? v : fallback; } catch (e) { return fallback; }
  }
  function setStored(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function loadPrefs() {
    var p = {};
    try { p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}") || {}; } catch (e) { p = {}; }
    for (var k in DEFAULTS) if (!(k in p)) p[k] = DEFAULTS[k];
    return p;
  }
  var prefs = loadPrefs();
  function savePrefs() { setStored(PREF_KEY, JSON.stringify(prefs)); }

  function markActive(container, attr, val) {
    if (!container) return;
    var opts = container.querySelectorAll("[data-" + attr + "]");
    for (var i = 0; i < opts.length; i++) opts[i].classList.toggle("on", opts[i].getAttribute("data-" + attr) === val);
  }

  /* ---------- apply ---------- */
  function applySize(size) { document.documentElement.setAttribute("data-text-size", size); markActive($("readerSizeOpts"), "size", size); }
  function applyBg(bg) {
    if (scripture) { if (bg === "default") scripture.removeAttribute("data-reading-bg"); else scripture.setAttribute("data-reading-bg", bg); }
    markActive($("readerBgOpts"), "bg", bg);
  }
  function applyPrefs() {
    if (scripture) {
      scripture.setAttribute("data-font", prefs.font);
      scripture.setAttribute("data-space", prefs.space);
      scripture.setAttribute("data-layout", prefs.layout);
      scripture.classList.toggle("no-vn", !prefs.vn);
      scripture.classList.toggle("no-heads", !prefs.heads);
      scripture.classList.toggle("no-red", !prefs.red);
      scripture.classList.toggle("no-notes", !prefs.notes);
      scripture.classList.toggle("show-xr", !!prefs.xr);
    }
    markActive($("readerFontOpts"), "font", prefs.font);
    markActive($("readerSpaceOpts"), "space", prefs.space);
    markActive($("readerLayoutOpts"), "layout", prefs.layout);
    var sw = document.querySelectorAll("#readerSwitches [data-pref]");
    for (var i = 0; i < sw.length; i++) sw[i].checked = !!prefs[sw[i].getAttribute("data-pref")];
    setAwake(prefs.awake);
  }

  /* ---------- keep the screen on ---------- */
  var lock = null;
  function setAwake(on) {
    if (!("wakeLock" in navigator)) { var row = $("awakeRow"); if (row) row.hidden = true; return; }
    if (on && !lock) {
      navigator.wakeLock.request("screen").then(function (l) { lock = l; l.addEventListener("release", function () { lock = null; }); }).catch(function () {});
    } else if (!on && lock) { lock.release().catch(function () {}); lock = null; }
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && prefs.awake) setAwake(true); });

  applySize(getStored(SIZE_KEY, "normal", SIZES));
  applyBg(getStored(BG_KEY, "default", BGS));
  applyPrefs();

  /* ---------- panel ---------- */
  if (btn && panel) {
    btn.addEventListener("click", function (e) { e.stopPropagation(); panel.hidden = !panel.hidden; var fp = $("fnPop"); if (fp) fp.hidden = true; });
    document.addEventListener("click", function (e) {
      if (panel.hidden || panel.contains(e.target) || btn.contains(e.target)) return;
      panel.hidden = true;
    });
    panel.addEventListener("click", function (e) {
      var b;
      if ((b = e.target.closest("[data-size]"))) { var s = b.getAttribute("data-size"); applySize(s); setStored(SIZE_KEY, s); }
      else if ((b = e.target.closest("[data-bg]"))) { var g = b.getAttribute("data-bg"); applyBg(g); setStored(BG_KEY, g); }
      else if ((b = e.target.closest("[data-font]"))) { prefs.font = b.getAttribute("data-font"); savePrefs(); applyPrefs(); }
      else if ((b = e.target.closest("[data-space]"))) { prefs.space = b.getAttribute("data-space"); savePrefs(); applyPrefs(); }
      else if ((b = e.target.closest("[data-layout]"))) { prefs.layout = b.getAttribute("data-layout"); savePrefs(); applyPrefs(); }
    });
    panel.addEventListener("change", function (e) {
      var k = e.target.getAttribute && e.target.getAttribute("data-pref");
      if (!k) return;
      prefs[k] = e.target.checked; savePrefs(); applyPrefs();
    });
  }

  if (!scripture) return;

  /* ---------- footnotes ---------- */
  var pop = $("fnPop"), popText = $("fnPopText");
  scripture.addEventListener("click", function (e) {
    var fn = e.target.closest(".fn");
    if (!fn) return;
    // Capture phase: a footnote tap must not also select the verse.
    e.stopPropagation(); e.preventDefault();
    if (!pop) return;
    popText.textContent = fn.getAttribute("data-note");
    pop.hidden = false;
    var r = fn.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 32);
    pop.style.width = w + "px";
    pop.style.left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 16)) + "px";
    pop.style.top = (r.bottom + window.scrollY + 8) + "px";
  }, true);
  document.addEventListener("click", function (e) { if (pop && !pop.hidden && !e.target.closest(".fn") && !pop.contains(e.target)) pop.hidden = true; });
  window.addEventListener("scroll", function () { if (pop && !pop.hidden) pop.hidden = true; }, { passive: true });

  /* ---------- reading time ---------- */
  var book = document.querySelector(".reader-book");
  if (book) {
    var words = (scripture.textContent || "").trim().split(/\s+/).length;
    var t = document.createElement("span");
    t.className = "reader-time";
    t.textContent = Math.max(1, Math.round(words / 200)) + " min read";
    book.appendChild(t);
  }

  /* ---------- progress line ---------- */
  var bar = document.createElement("div");
  bar.className = "reader-progress"; bar.setAttribute("aria-hidden", "true");
  var fill = document.createElement("i"); bar.appendChild(fill);
  var rb = document.querySelector(".reader-bar");
  if (rb) rb.appendChild(bar);
  function progress() {
    var r = scripture.getBoundingClientRect();
    var total = r.height - window.innerHeight * 0.5;
    var p = total > 0 ? Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.25) / total)) : 1;
    fill.style.transform = "scaleX(" + p.toFixed(3) + ")";
  }
  window.addEventListener("scroll", progress, { passive: true });
  progress();

  /* ---------- swipe to change chapter ---------- */
  var sx = 0, sy = 0, st = 0, tracking = false;
  var reader = document.querySelector(".reader") || scripture;
  reader.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  reader.addEventListener("touchend", function (e) {
    if (!tracking) return; tracking = false;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    var sel = window.getSelection && String(window.getSelection());
    if (sel || Date.now() - st > 600 || Math.abs(dx) < 80 || Math.abs(dy) > 50) return;
    var link = $(dx < 0 ? "nextCh" : "prevCh");
    if (link) {
      document.body.classList.add(dx < 0 ? "swipe-next" : "swipe-prev");
      location.href = link.href;
    }
  }, { passive: true });
})();
