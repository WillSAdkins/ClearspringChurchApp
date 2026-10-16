/* Clearspring — Bible maps.
   A plain map of the Bible world (no modern borders), drawn as SVG from
   /static/maps/basemap.svg, with places, routes, pan and zoom.

   BibleMap.mount(el, {
     markers: [{lat, lon, label, href, main, rank}],   // rank: higher shows its label sooner
     lines:   [[[lon, lat], …], …],                     // journeys
     fit: true | {lat, lon, span}                        // what to show first
     labels: "all" | "auto"
   })
   Projection matches tools/build_basemap.py. */
window.BibleMap = (function () {
  "use strict";
  var LON0 = -8, LAT1 = 48, KX = 0.848, S = 100, W = 5936, H = 4200;
  var NS = "http://www.w3.org/2000/svg";
  var basePromise = null;

  function proj(lon, lat) { return [(lon - LON0) * KX * S, (LAT1 - lat) * S]; }

  function loadBase() {
    if (!basePromise) {
      basePromise = fetch("/static/maps/basemap.svg").then(function (r) { return r.text(); }).then(function (t) {
        var doc = new DOMParser().parseFromString(t, "image/svg+xml");
        return Array.prototype.slice.call(doc.querySelectorAll("path")).map(function (p) {
          return { cls: p.getAttribute("class"), d: p.getAttribute("d") };
        });
      });
    }
    return basePromise;
  }

  function mk(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function mount(el, opts) {
    opts = opts || {};
    el.classList.add("bmap");
    var svg = mk("svg", { "class": "bmap-svg", role: "img", "aria-label": opts.ariaLabel || "Map" });
    el.appendChild(svg);
    var sea = mk("rect", { x: -W, y: -H, width: W * 3, height: H * 3, "class": "bmap-sea" }, svg);
    var gBase = mk("g", {}, svg), gLines = mk("g", { "class": "bmap-lines" }, svg), gMarks = mk("g", {}, svg);

    // controls
    var ctl = document.createElement("div"); ctl.className = "bmap-ctl";
    ctl.innerHTML = '<button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button>';
    el.appendChild(ctl);
    var credit = document.createElement("span"); credit.className = "bmap-credit"; credit.textContent = "Map: Natural Earth";
    el.appendChild(credit);
    var pop = document.createElement("a"); pop.className = "bmap-pop"; pop.hidden = true; el.appendChild(pop);

    // ---- what to show
    var markers = (opts.markers || []).map(function (m) { var p = proj(m.lon, m.lat); return Object.assign({ x: p[0], y: p[1] }, m); });
    var lines = (opts.lines || []).map(function (ln) { return ln.map(function (c) { return proj(c[0], c[1]); }); });
    var vb;
    function fitTo(points, pad) {
      if (!points.length) return [proj(30, 35)[0] - 600, proj(30, 35)[1] - 450, 1200, 900];
      var xs = points.map(function (p) { return p[0]; }), ys = points.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var w = Math.max(x1 - x0, 120), h = Math.max(y1 - y0, 90);
      return [x0 - w * pad - (w < 120 ? 0 : 0), y0 - h * pad, w * (1 + 2 * pad), h * (1 + 2 * pad)];
    }
    if (opts.fit && opts.fit.lat != null) {
      var c = proj(opts.fit.lon, opts.fit.lat), span = (opts.fit.span || 2) * S;
      vb = [c[0] - span * 0.75, c[1] - span * 0.5, span * 1.5, span];
    } else {
      var pts = [];
      lines.forEach(function (l) { pts = pts.concat(l); });
      markers.forEach(function (m) { if (!opts.fitMain || m.main) pts.push([m.x, m.y]); });
      vb = fitTo(pts, 0.18);
    }
    function aspect() { var r = el.getBoundingClientRect(); return r.width && r.height ? r.width / r.height : 1.4; }
    function normalise() {
      var a = aspect();
      if (vb[2] / vb[3] > a) { var nh = vb[2] / a; vb[1] -= (nh - vb[3]) / 2; vb[3] = nh; }
      else { var nw = vb[3] * a; vb[0] -= (nw - vb[2]) / 2; vb[2] = nw; }
      vb[2] = Math.min(Math.max(vb[2], 40), W * 1.2); vb[3] = vb[2] / a;
    }
    normalise();

    function scale() { var r = el.getBoundingClientRect(); return vb[2] / (r.width || 360); }

    function drawLines() {
      gLines.textContent = "";
      lines.forEach(function (l, i) {
        var d = l.map(function (p, j) { return (j ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("");
        mk("path", { d: d, "class": "bmap-route" }, gLines);
      });
    }

    function draw() {
      svg.setAttribute("viewBox", vb.join(" "));
      var s = scale();
      gLines.style.strokeWidth = (3 * s) + "px";
      gMarks.textContent = "";
      var gDots = mk("g", {}, gMarks), gLabels = mk("g", {}, gMarks);
      var shown = [];
      var many = markers.length > 60;
      var sorted = markers.slice().sort(function (a, b) { return (b.main ? 1e9 : 0) + (b.rank || 0) - ((a.main ? 1e9 : 0) + (a.rank || 0)); });
      sorted.forEach(function (m) {
        if (m.x < vb[0] - 20 * s || m.x > vb[0] + vb[2] + 20 * s || m.y < vb[1] - 20 * s || m.y > vb[1] + vb[3] + 20 * s) return;
        var g = mk("g", { "class": "bmap-mark" + (m.main ? " main" : ""), transform: "translate(" + m.x + " " + m.y + ")" }, gDots);
        mk("circle", { r: (m.main ? 7 : (many ? 3.5 : 4.5)) * s, "class": "bmap-dot" }, g);
        // a bigger invisible target for fingers
        mk("circle", { r: 12 * s, "class": "bmap-hit" }, g);
        var w = (m.label || "").length * (m.main ? 8 : 7) * s + 12 * s, h = 16 * s;
        var box = { x0: m.x + 6 * s, x1: m.x + 6 * s + w, y0: m.y - h / 2, y1: m.y + h / 2 };
        var showLabel = m.main || opts.labels === "all";
        if (!showLabel) {
          showLabel = shown.length < 45 && shown.every(function (o) { return box.x1 < o.x0 || box.x0 > o.x1 || box.y1 < o.y0 || box.y0 > o.y1; });
        }
        if (showLabel) {
          shown.push(box);
          var t = mk("text", { x: m.x + 9 * s, y: m.y + 4 * s, "class": "bmap-label" + (m.main ? " main" : ""), "font-size": (m.main ? 14 : 12) * s }, gLabels);
          t.textContent = m.label;
          t.style.strokeWidth = (3.5 * s) + "px";
        }
        if (m.href) {
          g.setAttribute("tabindex", "0"); g.setAttribute("role", "link"); g.setAttribute("aria-label", m.label);
          g.addEventListener("click", function (e) { e.stopPropagation(); showPop(m); });
          g.addEventListener("keydown", function (e) { if (e.key === "Enter") location.href = m.href; });
        }
      });
    }

    function showPop(m) {
      pop.href = m.href; pop.textContent = "";
      var b = document.createElement("b"); b.textContent = m.label; pop.appendChild(b);
      if (m.note) { var sp = document.createElement("span"); sp.textContent = m.note; pop.appendChild(sp); }
      var go = document.createElement("i"); go.textContent = "Open →"; pop.appendChild(go);
      pop.hidden = false;
    }
    el.addEventListener("click", function () { pop.hidden = true; });

    // ---- pan & zoom
    function zoom(f, cx, cy) {
      var r = el.getBoundingClientRect();
      var px = cx == null ? 0.5 : (cx - r.left) / r.width, py = cy == null ? 0.5 : (cy - r.top) / r.height;
      var nw = Math.min(Math.max(vb[2] * f, 40), W * 1.2), nh = nw * vb[3] / vb[2];
      vb = [vb[0] + (vb[2] - nw) * px, vb[1] + (vb[3] - nh) * py, nw, nh];
      draw();
    }
    ctl.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; e.stopPropagation();
      zoom(b.getAttribute("data-z") === "in" ? 0.6 : 1 / 0.6);
    });
    el.addEventListener("wheel", function (e) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
    var pts = {}, last = null, pinch = null, moved = false;
    svg.addEventListener("pointerdown", function (e) { pts[e.pointerId] = [e.clientX, e.clientY]; moved = false; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return;
      var ids = Object.keys(pts);
      var prev = pts[e.pointerId]; pts[e.pointerId] = [e.clientX, e.clientY];
      if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoom(pinch / d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        pinch = d; moved = true; return;
      }
      var s = scale(), dx = (e.clientX - prev[0]) * s, dy = (e.clientY - prev[1]) * s;
      if (Math.abs(dx) + Math.abs(dy) > 0) moved = true;
      vb[0] -= dx; vb[1] -= dy; draw();
    });
    function up(e) { delete pts[e.pointerId]; pinch = null; }
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    svg.addEventListener("click", function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);

    loadBase().then(function (paths) {
      paths.forEach(function (p) { mk("path", { d: p.d, "class": "bmap-" + p.cls }, gBase); });
    });
    drawLines();
    draw();
    window.addEventListener("resize", function () { normalise(); draw(); });
    return { redraw: draw, zoom: zoom };
  }

  return { mount: mount, proj: proj };
})();
