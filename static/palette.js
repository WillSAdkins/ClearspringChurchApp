/* Clearspring: your own colour.
   People choose one colour in Settings; every colour token in the app is
   worked out from it, for light and dark, keeping the 60-30-10 balance
   (background / sea-glass tone / accent) and checking every text colour
   against the surface it sits on (at least 4.5:1, the WCAG AA level).
   Saved as cs_palette ("" = the church's own teal). Loaded in <head> so
   the page never flashes the wrong colour. */
(function () {
  "use strict";
  var KEY = "cs_palette", DEFAULT_HUE = 174;

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function hexToRgb(h) {
    h = String(h || "").replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; });
  }
  function rgbToHsl(c) {
    var r = c[0], g = c[1], b = c[2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [r + m, g + m, b + m];
  }
  function hex(c) { return "#" + c.map(function (v) { return ("0" + Math.round(clamp(v, 0, 1) * 255).toString(16)).slice(-2); }).join(""); }
  function hsl(h, s, l) { return hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1)); }
  function lum(c) {
    var a = c.map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /* Move a colour's lightness (keeping its hue) until it reads on every
     background given. dir -1 = darker, +1 = lighter. */
  function readable(h, s, l, bgs, ratio, dir) {
    for (var i = 0; i < 100; i++) {
      var c = hsl(h, s, l);
      if (bgs.every(function (b) { return contrast(c, b) >= ratio; })) return c;
      l += dir * 0.01;
      if (l <= 0 || l >= 1) break;
    }
    return hsl(h, s, clamp(l, 0, 1));
  }
  function rgba(c, a) { return "rgba(" + c.map(function (v) { return Math.round(v * 255); }).join(",") + "," + a + ")"; }

  function build(choice) {
    var rgb = hexToRgb(choice);
    if (!rgb) return null;
    var p = rgbToHsl(rgb), h = p[0], s = p[1], l = p[2];
    var grey = s < 0.08;                  // a grey or black/white choice: a calm neutral app
    var sat = grey ? 0.06 : clamp(s, 0.3, 0.9);
    var tint = grey ? 0.04 : 1;           // how much hue the surfaces carry
    var white = [1, 1, 1];

    // ---- light
    var L = {}, bgL = hsl(h, 0.3 * tint, 0.972), toneL = hsl(h, 0.3 * tint, 0.912);
    L.bg = bgL; L.surface = white; L["surface-2"] = hsl(h, 0.22 * tint, 0.945);
    L.tone = toneL; L["tone-line"] = hsl(h, 0.24 * tint, 0.85); L.line = hsl(h, 0.2 * tint, 0.875);
    L.ink = readable(h, grey ? 0.05 : Math.min(sat * 0.7, 0.62), 0.14, [bgL, toneL, white], 10, -1);
    L.muted = readable(h, grey ? 0.03 : 0.16, 0.4, [bgL, toneL, white], 4.6, -1);
    L.accent = readable(h, grey ? 0.05 : sat, clamp(l, 0.3, 0.46), [bgL, toneL, white], 4.6, -1);
    L["accent-soft"] = hsl(h, sat, 0.5);
    L["accent-fill"] = readable(h, grey ? 0.05 : Math.min(sat * 0.78, 0.68), 0.19, [white], 9, -1);
    L["on-accent"] = white; L["on-accent-fill"] = white;
    L.spring = hsl(h, sat, 0.42);
    var black = [0.02, 0.07, 0.07];
    L["invert-bg"] = L["accent-fill"]; L["invert-ink"] = bgL;
    L["quest-deep"] = hsl(h, 0.6 * tint, 0.08); L["quest-mid"] = hsl(h, 0.55 * tint, 0.24); L["quest-ember"] = hsl(h, Math.max(sat, 0.5) * tint, 0.56);
    var onSpringL = contrast(L.spring, black) >= contrast(L.spring, white) ? black : white;
    var lightVars = { "on-spring": hex(onSpringL), wash: rgba(L.accent, 0.12), glass: "rgba(255,255,255,0.8)", "invert-muted": rgba(bgL, 0.7), white: "#FFFFFF" };

    // ---- dark
    var D = {}, bgD = hsl(h, 0.55 * tint, 0.06), surfD = hsl(h, 0.45 * tint, 0.1), toneD = hsl(h, 0.42 * tint, 0.155);
    D.bg = bgD; D.surface = surfD; D["surface-2"] = hsl(h, 0.42 * tint, 0.13);
    D.tone = toneD; D["tone-line"] = hsl(h, 0.38 * tint, 0.21); D.line = hsl(h, 0.38 * tint, 0.17);
    D.ink = readable(h, 0.25 * tint, 0.92, [bgD, toneD, surfD], 10, 1);
    D.muted = readable(h, 0.16 * tint, 0.6, [bgD, toneD, surfD], 4.6, 1);
    D.accent = readable(h, grey ? 0.05 : sat, Math.max(l, 0.62), [bgD, toneD, surfD], 6, 1);
    D["accent-soft"] = hsl(h, sat, 0.8);
    D["accent-fill"] = D.accent; D["on-accent"] = bgD; D["on-accent-fill"] = bgD;
    D.spring = hsl(h, sat, 0.55);
    D["invert-bg"] = hsl(h, 0.45 * tint, 0.17); D["invert-ink"] = D.ink;
    D["quest-deep"] = hsl(h, 0.6 * tint, 0.05); D["quest-mid"] = hsl(h, 0.5 * tint, 0.18); D["quest-ember"] = hsl(h, Math.max(sat, 0.5) * tint, 0.66);
    var onSpringD = contrast(D.spring, black) >= contrast(D.spring, white) ? black : white;
    var darkVars = { "on-spring": hex(onSpringD), wash: rgba(D.accent, 0.13), glass: rgba(surfD, 0.8), "invert-muted": rgba(D.ink, 0.7), white: hex(surfD) };

    function block(T, extra) {
      var out = [];
      for (var k in T) out.push("--" + k + ":" + hex(T[k]));
      for (var e in extra) out.push("--" + e + ":" + extra[e]);
      return out.join(";");
    }
    // Illustrations are drawn in the church's teal: turn them to the chosen hue.
    var rot = grey ? "0deg" : Math.round(h - DEFAULT_HUE) + "deg";
    var art = grey ? "saturate(.15)" : "hue-rotate(" + rot + ")";
    var lb = block(L, lightVars), db = block(D, darkVars);
    var css =
      'html[data-theme="light"]{' + lb + ';--art-filter:' + art + '}' +
      '@media (prefers-color-scheme: light){html[data-theme="auto"]{' + lb + ';--art-filter:' + art + '}}' +
      'html[data-theme="dark"]{' + db + ';--art-filter:' + art + '}' +
      '@media (prefers-color-scheme: dark){html[data-theme="auto"]{' + db + ';--art-filter:' + art + '}}' +
      'svg.sc-layer{filter:var(--art-filter)}';
    return { css: css, light: hex(bgL), dark: hex(bgD), accentLight: hex(L.accent), accentDark: hex(D.accent) };
  }

  function current() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }

  function apply(choice) {
    var el = document.getElementById("cs-palette");
    var built = choice ? build(choice) : null;
    if (!built) { if (el) el.remove(); setMeta("#F5F8F7", "#061719"); return null; }
    if (!el) { el = document.createElement("style"); el.id = "cs-palette"; (document.head || document.documentElement).appendChild(el); }
    el.textContent = built.css;
    setMeta(built.light, built.dark);
    return built;
  }
  function setMeta(light, dark) {
    var t = "auto";
    try { t = localStorage.getItem("cs_theme") || "auto"; } catch (e) {}
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var m = metas[i], media = m.getAttribute("media") || "";
      m.setAttribute("content", t === "dark" ? dark : t === "light" ? light : (media.indexOf("dark") >= 0 ? dark : light));
    }
  }
  function save(choice) {
    try { if (choice) localStorage.setItem(KEY, choice); else localStorage.removeItem(KEY); } catch (e) {}
    apply(choice);
    try { document.dispatchEvent(new CustomEvent("cs:palette", { detail: choice })); } catch (e) {}
  }

  window.CSPalette = { build: build, apply: apply, save: save, current: current, contrast: function (a, b) { return contrast(hexToRgb(a), hexToRgb(b)); } };
  apply(current());
  // The theme-color tags come after this script in <head>: set them once they exist.
  document.addEventListener("DOMContentLoaded", function () { if (current()) apply(current()); });
})();
