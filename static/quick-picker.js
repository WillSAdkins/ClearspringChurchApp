/* Clearspring — jump anywhere in the Bible from the reader.
   Tap the book and chapter at the top: pick a book, then a chapter. Typing
   filters the books, and Enter goes straight to a reference like "jn 3:16". */
(function () {
  "use strict";
  var sheet = document.getElementById("qp"), btn = document.getElementById("refBtn"), main = document.getElementById("readerMain");
  if (!sheet || !btn || !main) return;
  var BOOKS = JSON.parse(document.getElementById("qpBooks").textContent);
  var body = document.getElementById("qpBody"), q = document.getElementById("qpQ");
  var testament = BOOKS.some(function (b) { return b.s === main.dataset.slug && b.t === "nt"; }) ? "nt" : "ot";
  var trans = main.dataset.translation, picked = null;
  var params = new URLSearchParams(location.search), keepTrans = params.get("translation");

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function href(slug, ch) { return "/bible/read/" + slug + "/" + ch + (keepTrans ? "?translation=" + encodeURIComponent(keepTrans) : ""); }

  function tabs() {
    sheet.querySelectorAll(".qp-tabs button").forEach(function (b) {
      var on = b.dataset.t === testament; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  function books(filter) {
    picked = null; body.textContent = "";
    var f = (filter || "").trim().toLowerCase().replace(/\s+/g, " ");
    var list = BOOKS.filter(function (b) {
      if (!f) return b.t === testament;
      var n = b.n.toLowerCase();
      return n.indexOf(f) === 0 || n.replace(/^\d /, "").indexOf(f) === 0 || n.replace(/ /g, "").indexOf(f.replace(/ /g, "")) === 0;
    });
    sheet.querySelector(".qp-tabs").hidden = !!f;
    var grid = el("div", "qp-books");
    list.forEach(function (b) {
      var x = el("button", "qp-book" + (b.s === main.dataset.slug ? " here" : ""), b.n); x.type = "button";
      x.addEventListener("click", function () { if (b.c === 1) location.href = href(b.s, 1); else chapters(b); });
      grid.appendChild(x);
    });
    if (!list.length) grid.appendChild(el("p", "qp-none", "Press Enter to search for “" + filter + "”."));
    body.appendChild(grid);
  }
  function chapters(b) {
    picked = b; body.textContent = "";
    sheet.querySelector(".qp-tabs").hidden = true;
    var head = el("div", "qp-head");
    var back = el("button", "qp-back", "‹ Books"); back.type = "button";
    back.addEventListener("click", function () { books(q.value); });
    head.append(back, el("b", null, b.n));
    body.appendChild(head);
    var grid = el("div", "qp-chs");
    for (var c = 1; c <= b.c; c++) {
      var a = el("a", "qp-ch" + (b.s === main.dataset.slug && c === +main.dataset.chapter ? " here" : ""), String(c));
      a.href = href(b.s, c); grid.appendChild(a);
    }
    body.appendChild(grid);
    var here = grid.querySelector(".here"); if (here) here.scrollIntoView({ block: "center" });
  }
  function recent() {
    var box = document.getElementById("qpRecent"); box.textContent = "";
    var R = window.ReadingPosition, list = R && R.recentBooks ? R.recentBooks() : [];
    (list || []).slice(0, 6).forEach(function (r) {
      var slug = r.bookSlug || r.slug, b = BOOKS.find(function (x) { return x.s === slug; });
      if (!b) return;
      var x = el("button", "qp-chip", b.n); x.type = "button";
      x.addEventListener("click", function () { chapters(b); });
      box.appendChild(x);
    });
    box.hidden = !box.children.length;
  }

  function open(e) {
    if (e) e.preventDefault();
    sheet.hidden = false; document.body.classList.add("qp-open");
    q.value = ""; tabs(); recent();
    // Start on this book's chapters: the commonest jump is to a nearby chapter.
    var cur = BOOKS.find(function (b) { return b.s === main.dataset.slug; });
    if (cur && cur.c > 1) chapters(cur); else books("");
  }
  function close() { sheet.hidden = true; document.body.classList.remove("qp-open"); }

  btn.addEventListener("click", open);
  document.getElementById("qpClose").addEventListener("click", close);
  sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) close(); });
  sheet.querySelectorAll(".qp-tabs button").forEach(function (b) {
    b.addEventListener("click", function () { testament = b.dataset.t; tabs(); books(""); });
  });
  q.addEventListener("input", function () { books(q.value); });
  document.getElementById("qpForm").addEventListener("submit", function (e) {
    // A single matching book with no chapter typed: open its chapters instead of searching.
    var v = q.value.trim();
    if (!v) { e.preventDefault(); return; }
    if (!/\d\s*$/.test(v.replace(/^\d\s*/, ""))) {
      var only = body.querySelectorAll(".qp-book");
      if (only.length === 1) { e.preventDefault(); only[0].click(); }
    }
  });
})();
