/* Clearspring — word-by-word view.

   Two layouts of the same words: "Words" (each verse in the original order)
   and "Sentence flow" (one clause per line, dependent clauses indented).
   Options for pronunciation, grammar labels, role colours and the English
   line are remembered on this device. Tapping a word opens a sheet with its
   meaning, its grammar in plain English, its job in the sentence and who it
   refers to. Everything is built with textContent. */
(function () {
  "use strict";
  var root = document.getElementById("il"), node = document.getElementById("ilData");
  if (!root || !node) return;
  var D; try { D = JSON.parse(node.textContent); } catch (e) { return; }
  var KEY = "cs_interlinear";
  var GUIDE = "/bible/grammar";

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var S = Object.assign({ mode: "words", tr: true, tag: true, col: false, en: true }, load());

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function link(href, cls, text) { var a = el("a", cls, text); a.href = href; return a; }

  /* ---------- layout ---------- */
  function toFlow(box) {
    if (box.__flow) return;
    var words = Array.prototype.slice.call(box.querySelectorAll(".il-w")), line = null, last = null;
    box.__flat = words;
    words.forEach(function (w) {
      var l = w.getAttribute("data-l");
      if (l !== last) {
        line = el("div", "il-line"); line.style.setProperty("--d", w.getAttribute("data-d") || "0");
        box.appendChild(line); last = l;
      }
      line.appendChild(w);
    });
    box.__flow = true;
  }
  function toWords(box) {
    if (!box.__flow) return;
    box.__flat.forEach(function (w) { box.appendChild(w); });
    Array.prototype.forEach.call(box.querySelectorAll(".il-line"), function (l) { l.remove(); });
    box.__flow = false;
  }
  function apply() {
    root.classList.toggle("il-flow", S.mode === "flow");
    root.classList.toggle("no-tr", !S.tr);
    root.classList.toggle("no-tag", !S.tag);
    root.classList.toggle("il-col", !!S.col || S.mode === "flow");
    root.classList.toggle("no-en", !S.en);
    Array.prototype.forEach.call(root.querySelectorAll(".il-words"), function (b) { if (S.mode === "flow") toFlow(b); else toWords(b); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-mode]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-mode") === S.mode ? "true" : "false"); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-opt]"), function (b) {
      var k = b.getAttribute("data-opt"), on = k === "col" ? (S.col || S.mode === "flow") : S[k];
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (k === "col") b.disabled = S.mode === "flow";
    });
    document.getElementById("ilLegend").hidden = !(S.col || S.mode === "flow");
    document.getElementById("ilFlowNote").hidden = S.mode !== "flow";
  }
  root.querySelector(".il-bar").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.hasAttribute("data-mode")) S.mode = b.getAttribute("data-mode");
    else if (b.hasAttribute("data-opt")) { var k = b.getAttribute("data-opt"); S[k] = !S[k]; }
    save(S); apply();
  });

  /* ---------- the word sheet ---------- */
  var sheet = document.getElementById("ilSheet"), body = document.getElementById("ilSheetBody"), lastBtn = null;

  function chipRow(ex) {
    var row = el("div", "il-chips");
    (ex.chips || []).forEach(function (c) {
      var chip = c.slug ? link(GUIDE + "#" + c.slug, "il-chip") : el("span", "il-chip");
      chip.appendChild(el("b", null, c.v));
      if (c.short) chip.appendChild(el("small", null, c.short));
      row.appendChild(chip);
    });
    return row;
  }
  function section(title) { var s = el("section", "il-s"); s.appendChild(el("h3", null, title)); return s; }

  function open(i, btn) {
    var w = D.words[i]; if (!w) return;
    lastBtn = btn;
    body.textContent = "";
    var head = el("header", "il-sh");
    var word = el("p", "il-sh-w", w.w); word.id = "ilSheetWord"; word.lang = root.classList.contains("il-heb") ? "he" : "grc";
    if (root.classList.contains("il-heb")) word.dir = "rtl";
    head.appendChild(word);
    head.appendChild(el("p", "il-sh-tr", w.tr || ""));
    head.appendChild(el("p", "il-sh-g", "“" + (w.g || "") + "”"));
    head.appendChild(el("p", "il-sh-ref", D.book + " " + D.chapter + ":" + w.ref));
    body.appendChild(head);

    if (w["var"]) body.appendChild(el("p", "il-sh-var", "Found in some manuscripts but not in the main modern edition (Nestle-Aland), so some translations leave it out."));

    // Parts of a Hebrew word: and + the + word + his…
    if (w.segs && w.segs.length > 1) {
      var ps = section("Made of " + w.segs.length + " parts"), ul = el("ul", "il-parts");
      w.segs.forEach(function (sg) {
        var ex = D.morph[sg.c], li = el("li", sg.main ? "main" : "");
        var t = el("span", "il-part-t", sg.t); t.lang = "he"; t.dir = "rtl"; li.appendChild(t);
        li.appendChild(el("span", "il-part-g", sg.g || ""));
        if (ex) { var tg = ex.fnslug && !sg.main ? link(GUIDE + "#" + ex.fnslug, "il-part-m", ex.tag) : el("span", "il-part-m", ex.tag); li.appendChild(tg); }
        ul.appendChild(li);
      });
      ps.appendChild(ul); body.appendChild(ps);
    }

    var ex = D.morph[w.c];
    if (ex) {
      var gs = section("Grammar");
      var fn = el("p", "il-fn"); fn.appendChild(el("b", null, ex.fn || ""));
      if (ex.fnslug) { fn.appendChild(document.createTextNode(" · ")); fn.appendChild(link(GUIDE + "#" + ex.fnslug, null, "what’s this?")); }
      gs.appendChild(fn);
      if (ex.chips && ex.chips.length) gs.appendChild(chipRow(ex));
      if (ex.ex) gs.appendChild(el("p", "il-pattern", "Pattern: " + ex.ex));
      body.appendChild(gs);
    }

    if (w.r || w.to || w.by) {
      var rs = section("In this sentence");
      if (w.r) {
        var p = el("p", "il-role r-" + w.r); p.appendChild(el("i"));
        p.appendChild(link(GUIDE + "#" + (D.roleSlug[w.r] || ""), null, D.roles[w.r] || ""));
        rs.appendChild(p);
      }
      if (w.to) { var t2 = el("p", "il-ref"); t2.appendChild(document.createTextNode("Refers to: ")); t2.appendChild(el("b", null, w.to)); rs.appendChild(t2); }
      if (w.by) { var t3 = el("p", "il-ref"); t3.appendChild(document.createTextNode("Who does it: ")); t3.appendChild(el("b", null, w.by)); rs.appendChild(t3); }
      body.appendChild(rs);
    }

    var ms = section("Meaning");
    var lem = el("p", "il-lemma");
    var lw = el("b", null, w.lemma || w.w); lw.lang = root.classList.contains("il-heb") ? "he" : "grc"; lem.appendChild(lw);
    if (w.ltr) lem.appendChild(el("span", null, " " + w.ltr));
    if (w.mean) lem.appendChild(el("span", "il-mean", " · " + w.mean));
    ms.appendChild(lem);
    if (w.dom) ms.appendChild(el("p", "il-dom", "Meaning group: " + w.dom[0] + (w.dom[1] ? " › " + w.dom[1] : "")));
    if (w.x) {
      var lx = el("p", "il-lxx");
      lx.appendChild(document.createTextNode("In the Greek Old Testament: "));
      var a = link("/bible/word/" + encodeURIComponent(w.x.s), null, (w.x.lemma || w.x.w) + (w.x.tr ? " (" + w.x.tr + ")" : ""));
      a.lang = "grc"; lx.appendChild(a);
      if (w.x.meaning) lx.appendChild(document.createTextNode(", " + w.x.meaning));
      ms.appendChild(lx);
    }
    if (w.s) ms.appendChild(link("/bible/word/" + encodeURIComponent(w.s), "ps-go il-study", "Study this word: every use →"));
    body.appendChild(ms);

    sheet.hidden = false;
    document.documentElement.classList.add("il-open");
    requestAnimationFrame(function () { sheet.classList.add("on"); });
    document.getElementById("ilSheetClose").focus();
  }
  function close() {
    sheet.classList.remove("on");
    document.documentElement.classList.remove("il-open");
    setTimeout(function () { sheet.hidden = true; }, 180);
    if (lastBtn) lastBtn.focus();
  }
  root.addEventListener("click", function (e) {
    var b = e.target.closest(".il-w"); if (!b) return;
    open(+b.getAttribute("data-i"), b);
  });
  document.getElementById("ilSheetClose").addEventListener("click", close);
  sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) close(); });

  apply();
  // Arriving at a verse: bring it into view and mark it briefly.
  var m = /^#v(\d+)$/.exec(location.hash) || /[?&]v=(\d+)/.exec(location.search);
  if (m) { var tgt = document.getElementById("v" + m[1]); if (tgt) { tgt.classList.add("il-here"); setTimeout(function () { tgt.scrollIntoView({ block: "start" }); }, 60); } }
})();
