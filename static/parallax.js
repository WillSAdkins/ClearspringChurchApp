/* Clearspring: pictures that move as you scroll.

   - Page banners: each layer of the scene (sky, far hills, near hills…) moves
     at its own speed, so the picture has depth as the page scrolls.
   - Thumbnails (sermon videos, cards, photos): drift and zoom gently as they
     pass through the screen.
   - The home page photo sinks slowly behind the content.

   Only things on screen are worked on, only transforms change (smooth on
   phones), and it all switches off for anyone who has asked their device to
   reduce motion. */
(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("no-parallax");
    return;
  }
  var scenes = [], thumbs = [], hero = null, visible = new Set(), ticking = false, vh = window.innerHeight;

  var THUMBS = [
    ".sermon-feature-media img", ".sermon-row-thumb img", ".product-feature-media img", ".product-media img",
    ".sermon-thumb img", ".sermon-card img", ".latest-thumb img", ".sw-latest img", ".video-thumb img",
    ".product-card img", ".product-img img", ".resource-card img", ".devo-feature-img img",
    ".ministry-card img", ".campaign-card img", ".card img", ".ch-talk img", ".talk-thumb img",
    "img[data-thumb]"
  ].join(",");

  function collect() {
    document.querySelectorAll("[data-scene]").forEach(function (s) {
      scenes.push({ el: s, mini: s.classList.contains("sc-mini"), layers: Array.prototype.slice.call(s.querySelectorAll(".sc-layer")).map(function (l) {
        return { el: l, depth: parseFloat(l.getAttribute("data-depth")) || 0 };
      }) });
      s.classList.add("sc-live");
    });
    document.querySelectorAll(THUMBS).forEach(function (img) {
      if (img.closest("[data-scene]") || img.closest(".gd")) return;
      var box = img.parentElement;
      if (!box) return;
      var cs = getComputedStyle(box);
      // Only where the frame clips the picture, so the zoom never spills out.
      if (cs.overflow === "visible" && cs.overflowY === "visible") box.style.overflow = "hidden";
      img.classList.add("px-thumb");
      thumbs.push({ el: img, box: box });
    });
    hero = document.querySelector(".sw-hero-img");
  }

  function watch() {
    if (!("IntersectionObserver" in window)) { scenes.concat(thumbs).forEach(function (x) { visible.add(x); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var item = e.target.__px;
        if (e.isIntersecting) visible.add(item); else visible.delete(item);
      });
      request();
    }, { rootMargin: "120px 0px" });
    scenes.forEach(function (s) { s.el.__px = s; io.observe(s.el); });
    thumbs.forEach(function (t) { t.box.__px = t; io.observe(t.box); });
  }

  function frame() {
    ticking = false;
    var y = window.scrollY;
    visible.forEach(function (item) {
      var r = (item.box || item.el).getBoundingClientRect();
      if (item.layers && item.mini) {
        // A small scene inside a card: a gentle shift around its place on screen.
        var q = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
        q = Math.max(-1, Math.min(1, q));
        item.layers.forEach(function (l) {
          l.el.style.transform = "translate3d(0," + (q * (1 - l.depth) * 14).toFixed(1) + "px,0)";
        });
      } else if (item.layers) {
        // How far the banner has moved up the screen. Far layers lag behind
        // (move down relative to it); near layers keep pace with the page.
        var past = Math.max(-r.height, Math.min(vh, -r.top + 80));
        item.layers.forEach(function (l) {
          l.el.style.transform = "translate3d(0," + (past * (1 - l.depth) * 0.45).toFixed(1) + "px,0)";
        });
        var fade = Math.max(0, Math.min(1, 1 - (-r.top) / (r.height * 1.1)));
        item.el.style.setProperty("--sc-fade", fade.toFixed(3));
      } else {
        // -1 when entering at the bottom, 1 when leaving at the top.
        var p = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
        p = Math.max(-1, Math.min(1, p));
        item.el.style.transform = "translate3d(0," + (p * 12).toFixed(1) + "px,0) scale(" + (1.12 - Math.abs(p) * 0.04).toFixed(3) + ")";
      }
    });
    if (hero && y < vh * 1.2) {
      hero.style.transform = "translate3d(0," + (y * 0.35).toFixed(1) + "px,0) scale(" + (1 + y / 4000).toFixed(4) + ")";
    }
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  function start() {
    collect(); watch(); request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", function () { vh = window.innerHeight; request(); }, { passive: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
