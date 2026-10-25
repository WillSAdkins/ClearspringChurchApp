/* Clearspring — find Bible references in text ("Jn 3:16", "1 Cor 13:4-7")
   and turn them into links. Book names come from /bible-refs.js, built from
   the same table the server uses (refs.py). */
window.BibleRefs = (function () {
  "use strict";
  var D = window.BIBLE_REF_DATA || { aliases: {}, books: {} };
  var NUM = { "1": "1", i: "1", "1st": "1", first: "1", "2": "2", ii: "2", "2nd": "2", second: "2", "3": "3", iii: "3", "3rd": "3", third: "3" };
  var ORDER = {};
  Object.keys(D.books).forEach(function (slug, i) { ORDER[slug] = i; });

  var seen = {}, bases = [];
  Object.keys(D.aliases).forEach(function (k) {
    var b = /^\d /.test(k) ? k.slice(2) : k;
    if (!seen[b]) { seen[b] = 1; bases.push(b); }
  });
  bases.sort(function (a, b) { return b.length - a.length; });
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"); }
  var SRC = "(^|[^\\w])(?:(1st|2nd|3rd|first|second|third|iii|ii|i|1|2|3)\\s*)?(" +
    bases.map(esc).join("|") +
    ")\\.?\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3})(?:\\s*[-\u2013\u2014]\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3}))?)?)?(?![\\d:\\w])";

  function name(slug) { return slug === "psalms" ? "Psalm" : (D.books[slug] || [slug])[0]; }

  function label(r) {
    var n = name(r.slug);
    if (!r.verse) return n + " " + r.chapter;
    if (r.endChapter && r.endChapter !== r.chapter && r.endVerse) return n + " " + r.chapter + ":" + r.verse + "\u2013" + r.endChapter + ":" + r.endVerse;
    return n + " " + r.chapter + ":" + r.verse + (r.endVerse && r.endVerse !== r.verse ? "\u2013" + r.endVerse : "");
  }

  /* strict: only references that look deliberate in running prose — the book
     name capitalised, and short abbreviations only with chapter:verse. */
  function find(text, strict) {
    var out = [], re = new RegExp(SRC, "gi"), m;
    text = text || "";
    while ((m = re.exec(text))) {
      var num = NUM[(m[2] || "").toLowerCase()] || "";
      var base = m[3].toLowerCase().replace(/\s+/g, " ");
      var slug = D.aliases[num ? num + " " + base : base];
      // "Isa 6:8" is Isaiah, not "I Sa": a roman numeral glued to the name is
      // only a number when it's a capital ("ISam")
      if (m[2] && /^i{1,3}$/i.test(m[2]) && text.charAt(m.index + m[1].length + m[2].length) !== " ") {
        slug = D.aliases[(m[2] + m[3]).toLowerCase()] || (/^[IVX]+$/.test(m[2]) ? slug : null);
      }
      if (!slug) continue;
      if (slug === "jude" && base === "jud" && m[5] && (+m[4] > 1 || +m[5] > 25)) slug = "judges";
      if (strict) {
        if (!/^[A-Z]/.test(m[3])) continue;
        if (!m[5] && base.length < 3) continue;
      }
      var book = D.books[slug], ch = +m[4], v1 = m[5] ? +m[5] : null, v2 = null, ch2 = ch;
      if (book[1] === 1 && v1 === null && ch > 1) { v1 = ch; ch = 1; ch2 = 1; }
      if (ch < 1 || ch > book[1]) continue;
      if (m[6]) { if (m[7]) { ch2 = +m[6]; v2 = +m[7]; } else v2 = +m[6]; }
      var start = m.index + m[1].length;
      var r = { slug: slug, chapter: ch, verse: v1, endChapter: ch2, endVerse: v2, start: start, end: re.lastIndex };
      r.label = label(r);
      r.href = v1 ? "/bible/v/" + slug + "/" + ch + "/" + v1 : "/bible/read/" + slug + "/" + ch;
      out.push(r);
    }
    return out;
  }

  function parse(text) { var f = find(text, false); return f.length ? f[0] : null; }

  /* Text → DocumentFragment with references as links. Never uses innerHTML. */
  function linkify(text) {
    var frag = document.createDocumentFragment(), at = 0;
    find(text, true).forEach(function (r) {
      if (r.start > at) frag.appendChild(document.createTextNode(text.slice(at, r.start)));
      var a = document.createElement("a");
      a.className = "ref-link"; a.href = r.href; a.textContent = text.slice(r.start, r.end);
      frag.appendChild(a); at = r.end;
    });
    if (at < text.length) frag.appendChild(document.createTextNode(text.slice(at)));
    return frag;
  }

  /* A number that sorts references into Bible order. */
  function orderKey(r) {
    if (!r || !(r.slug in ORDER)) return 1e9;
    return ORDER[r.slug] * 1e6 + r.chapter * 1e3 + (r.verse || 0);
  }

  return { find: find, parse: parse, linkify: linkify, label: label, orderKey: orderKey, name: name };
})();
