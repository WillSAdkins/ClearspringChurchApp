/* Clearspring — passage study workspace: tabs, guided study (kept as you
   type, saved to the study journal), group questions, recent studies and
   questions answered from the app's own notes. Text from the server is
   always inserted with textContent. */
(function () {
  "use strict";
  var root = document.getElementById("ps2"); if (!root) return;
  var node = document.getElementById("ps2Data"), D = null;
  try { D = node ? JSON.parse(node.textContent) : null; } catch (e) { D = null; }
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* recent studies (this device) */
  var RECENT = "cs_passage_recent";
  if (D) {
    var r = jget(RECENT, []).filter(function (x) { return x !== D.ref; });
    r.unshift(D.ref); jset(RECENT, r.slice(0, 8));
  } else if ($("ps2Recent")) {
    var list = jget(RECENT, []);
    if (list.length) {
      $("ps2Recent").hidden = false;
      list.forEach(function (ref) { var a = el("a", "filter-pill", ref); a.href = "/bible/passage?ref=" + encodeURIComponent(ref); $("ps2RecentList").appendChild(a); });
    }
  }
  if (!D) return;

  /* tabs */
  var tabs = root.querySelectorAll("[role=tab]"), panels = root.querySelectorAll("[data-panel]");
  function show(name, focus) {
    Array.prototype.forEach.call(tabs, function (t) { t.setAttribute("aria-selected", t.getAttribute("data-tab") === name ? "true" : "false"); });
    Array.prototype.forEach.call(panels, function (p) { p.hidden = p.getAttribute("data-panel") !== name; });
    if (focus) { var t = root.querySelector('[data-tab="' + name + '"]'); if (t) t.scrollIntoView({ block: "nearest" }); }
  }
  root.classList.add("ps2-js");
  Array.prototype.forEach.call(tabs, function (t) { t.addEventListener("click", function () { show(t.getAttribute("data-tab")); }); });
  root.addEventListener("click", function (e) { var g = e.target.closest("[data-goto]"); if (g) show(g.getAttribute("data-goto"), true); });
  show("study");

  /* guided study: drafts kept per passage */
  var KEY = "cs_passage_draft:" + D.ref, areas = root.querySelectorAll("[data-answer]"), draft = jget(KEY, {});
  Array.prototype.forEach.call(areas, function (a) {
    a.value = draft[a.getAttribute("data-answer")] || "";
    a.addEventListener("input", function () { draft[a.getAttribute("data-answer")] = a.value; jset(KEY, draft); });
  });
  function answers() { var o = {}; Array.prototype.forEach.call(areas, function (a) { o[a.getAttribute("data-answer")] = a.value.trim(); }); return o; }
  $("ps2Save").addEventListener("click", function () {
    var a = answers(), status = $("ps2Status");
    if (!a.observe && !a.interpret && !a.apply && !a.pray) { status.textContent = "Write something in at least one step first."; return; }
    if (!window.Study) { status.textContent = "Couldn't save just now."; return; }
    var obs = [a.observe ? "Observe: " + a.observe : "", a.interpret ? "Interpret: " + a.interpret : ""].filter(Boolean).join("\n\n");
    var item = window.Study.save("soap", { id: draft._id || undefined, ref: D.ref, refLabel: D.ref, slug: D.slug, chapter: D.chapter, verse: D.verse,
                                           passage: D.text, translation: "bsb", observation: obs, application: a.apply, prayer: a.pray, tags: ["passage study"] });
    if (item && item.id) { draft._id = item.id; jset(KEY, draft); }
    status.textContent = "Saved to your study journal. ";
    var l = el("a", null, "Open My study"); l.href = "/bible/study?f=soap"; status.appendChild(l);
  });

  /* group questions */
  $("ps2Group").addEventListener("click", function () { var b = $("ps2GroupBox"); b.hidden = !b.hidden; if (!b.hidden) b.scrollIntoView({ block: "nearest" }); });
  $("ps2Print").addEventListener("click", function () { document.documentElement.classList.add("ps2-printing"); window.print(); setTimeout(function () { document.documentElement.classList.remove("ps2-printing"); }, 500); });
  $("ps2Copy").addEventListener("click", function () {
    var items = Array.prototype.map.call($("ps2GroupBox").querySelectorAll("li"), function (li, i) { return (i + 1) + ". " + li.textContent; });
    var text = "Discussion questions: " + D.ref + "\n\n" + items.join("\n") + "\n\n" + location.href;
    var done = function () { $("ps2Copy").textContent = "Copied ✓"; };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {}); else done();
  });

  /* questions answered from the app's notes */
  var form = $("ps2AskForm");
  if (form) {
    var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || "";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = $("ps2Q").value.trim(), out = $("ps2Answer");
      if (!q) return;
      out.textContent = ""; out.appendChild(el("p", "gw-note", "Looking through the notes…"));
      var btn = form.querySelector("button"); btn.disabled = true;
      fetch("/api/passage/ask", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
                                  body: JSON.stringify({ ref: D.ref, q: q }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          out.textContent = "";
          var box = el("div", "ps2-ans");
          box.appendChild(el("p", "ps2-q", q));
          String(d.answer || d.error || "Couldn't get an answer just now.").split(/\n{2,}/).forEach(function (para) {
            var p = el("p");
            para.split(/(\[\d+\])/).forEach(function (bit) {
              var m = /^\[(\d+)\]$/.exec(bit), s = m && (d.sources || []).find(function (x) { return x.n === +m[1]; });
              if (s) { var a = el("a", "ps2-cite", "[" + m[1] + "]"); a.href = s.url; a.title = s.title; p.appendChild(a); }
              else p.appendChild(document.createTextNode(bit));
            });
            box.appendChild(p);
          });
          if (d.sources && d.sources.length) {
            var ul = el("ul", "ps2-sources");
            d.sources.forEach(function (s) { var li = el("li"); li.appendChild(el("b", null, "[" + s.n + "] ")); var a = el("a", null, s.title); a.href = s.url; li.appendChild(a); ul.appendChild(li); });
            box.appendChild(el("p", "ps2-h", "Sources")); box.appendChild(ul);
          }
          out.appendChild(box);
        })
        .catch(function () { out.textContent = "Couldn't reach the study helper just now."; })
        .then(function () { btn.disabled = false; });
    });
  }
})();
