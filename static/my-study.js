/* Clearspring — My study: every note, highlight, saved verse, journal entry
   and set of sermon notes in one searchable place, with export and backup. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $("msList"), emptyEl = $("msEmpty");
  var params = new URLSearchParams(location.search);
  var KINDS = { vnote: "Note", highlight: "Highlight", saved: "Saved verse", soap: "Journal", talk: "Sermon notes" };
  var COLOR_NAMES = { sun: "Yellow", spring: "Green", sky: "Blue", rose: "Pink", lilac: "Purple" };
  var state = {
    f: KINDS[params.get("f")] ? params.get("f") : "all",
    q: "", tag: params.get("tag") || "", color: "", sort: "new"
  };
  var sermonTitles = {};

  /* ---------- gather ---------- */
  function legacySermonNotes() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), m = /^cs_notes_(\d+)$/.exec(k || "");
        if (!m) continue;
        var v = localStorage.getItem(k);
        if (v && v.trim()) out.push({ sermonId: m[1], notes: v });
      }
    } catch (e) {}
    return out;
  }

  function gather() {
    var items = [];
    window.Study.all("vnote").forEach(function (n) {
      items.push({ kind: "vnote", id: n.id, date: n.updated || n.created, ref: n.ref, r: n.slug ? { slug: n.slug, chapter: n.chapter, verse: n.verse } : null,
                   quote: n.text, body: n.note, tags: n.tags || [], src: n });
    });
    window.Highlights.getAll().forEach(function (h) {
      items.push({ kind: "highlight", id: h.ref + "|" + h.translation + "|" + h.text, date: h.at, ref: h.ref, r: window.BibleRefs.parse(h.ref),
                   quote: h.text, color: h.color || "sun", translation: h.translation, tags: [], src: h });
    });
    window.SavedVerses.getAll().forEach(function (v) {
      items.push({ kind: "saved", id: v.ref + "|" + v.translation, date: v.savedAt, ref: v.ref, r: window.BibleRefs.parse(v.ref),
                   quote: v.text, translation: v.translation, tags: [], src: v });
    });
    window.Study.all("soap").forEach(function (s) {
      items.push({ kind: "soap", id: s.id, date: s.updated || s.created, ref: s.refLabel || s.ref || "", r: s.slug ? { slug: s.slug, chapter: s.chapter, verse: s.verse } : null,
                   quote: s.passage, tags: s.tags || [], src: s });
    });
    window.Study.all("talk").forEach(function (t) {
      items.push({ kind: "talk", id: t.id, date: t.updated || t.created, ref: t.refLabel || t.ref || "", r: t.slug ? { slug: t.slug, chapter: t.chapter, verse: t.verse } : null,
                   title: t.title || "Untitled talk", tags: t.tags || [], src: t });
    });
    legacySermonNotes().forEach(function (l) {
      var s = sermonTitles[l.sermonId] || {};
      items.push({ kind: "talk", legacy: true, id: "sermon-" + l.sermonId, date: s.date || "", ref: "", r: null,
                   title: s.title || "Notes on a Clearspring sermon", tags: [], src: { notes: l.notes, speaker: s.speaker, date: s.date, sermonId: l.sermonId } });
    });
    items.forEach(function (it) {
      var s = it.src;
      it.hay = [it.ref, it.quote, it.body, it.title, s.observation, s.application, s.prayer, s.notes, s.takeaway, s.action, s.speaker,
                (it.tags || []).map(function (t) { return "#" + t; }).join(" ")].join(" \n ").toLowerCase();
    });
    return items;
  }

  function visible(items) {
    var q = state.q.trim().toLowerCase();
    var words = q ? q.split(/\s+/) : [];
    var out = items.filter(function (it) {
      if (state.f !== "all" && it.kind !== state.f) return false;
      if (state.color && (it.kind !== "highlight" || it.color !== state.color)) return false;
      if (state.tag && (it.tags || []).indexOf(state.tag) < 0) return false;
      return words.every(function (w) { return it.hay.indexOf(w) >= 0; });
    });
    if (state.sort === "bible") {
      out.sort(function (a, b) {
        var ka = window.BibleRefs.orderKey(a.r), kb = window.BibleRefs.orderKey(b.r);
        return ka - kb || String(b.date || "").localeCompare(String(a.date || ""));
      });
    } else {
      out.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    }
    return out;
  }

  /* ---------- render ---------- */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function when(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var day = new Date(d); day.setHours(0, 0, 0, 0);
    var diff = Math.round((today - day) / 864e5);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
  }
  function verseHref(it) {
    if (!it.r) return null;
    var t = it.translation ? "?translation=" + encodeURIComponent(it.translation) : "";
    if (it.kind === "highlight" || it.kind === "saved") return "/bible/read/" + it.r.slug + "/" + it.r.chapter + (t ? t + "&" : "?") + "v=" + (it.r.verse || 1);
    return it.r.verse ? "/bible/v/" + it.r.slug + "/" + it.r.chapter + "/" + it.r.verse : "/bible/read/" + it.r.slug + "/" + it.r.chapter;
  }
  function editHref(it) {
    if (it.kind === "soap") return "/bible/journal/write?id=" + encodeURIComponent(it.id);
    if (it.kind === "talk") return it.legacy ? "/watch/" + it.src.sermonId : "/bible/sermon-notes/write?id=" + encodeURIComponent(it.id);
    return null;
  }
  function para(cls, text) { var p = el("p", cls); p.appendChild(window.BibleRefs.linkify(text)); return p; }
  function section(label, text) {
    if (!text || !text.trim()) return null;
    var d = el("div", "ms-sec"); d.append(el("span", "ms-sec-label", label), para("ms-sec-text", text.trim())); return d;
  }

  function card(it) {
    var c = el("article", "ms-card ms-" + it.kind);
    if (it.kind === "highlight") c.setAttribute("data-c", it.color);

    var top = el("div", "ms-card-top");
    var kind = el("span", "ms-kind", KINDS[it.kind] + (it.kind === "highlight" ? " · " + COLOR_NAMES[it.color] : ""));
    var time = el("span", "ms-when", when(it.date));
    var actions = el("div", "ms-actions");
    top.append(kind, time, actions);
    c.appendChild(top);

    if (it.kind === "talk") {
      var h = el("h3", "ms-title");
      var ah = el("a", null, it.title); ah.href = editHref(it); h.appendChild(ah);
      c.appendChild(h);
      var meta = [it.src.speaker, it.src.date ? when(it.src.date) : "", it.ref].filter(Boolean).join(" · ");
      if (meta) c.appendChild(el("p", "ms-meta", meta));
    } else if (it.ref) {
      var href = verseHref(it);
      var ref = el(href ? "a" : "span", "ms-ref", it.ref + (it.translation ? " · " + it.translation.toUpperCase() : ""));
      if (href) ref.href = href;
      c.appendChild(ref);
    }

    if (it.quote) c.appendChild(el("blockquote", "ms-quote" + (it.kind === "soap" ? " ms-clamp" : ""), it.quote));
    if (it.kind === "vnote" && it.body) c.appendChild(para("ms-body", it.body));
    if (it.kind === "soap") {
      [["Observation", it.src.observation], ["Application", it.src.application], ["Prayer", it.src.prayer]].forEach(function (p) {
        var s = section(p[0], p[1]); if (s) c.appendChild(s);
      });
    }
    if (it.kind === "talk") {
      if (it.src.notes) { var b = para("ms-body ms-clamp", it.src.notes); c.appendChild(b); }
      var k = section("Remember", it.src.takeaway); if (k) c.appendChild(k);
      var a = section("To do", it.src.action); if (a) c.appendChild(a);
    }
    if (it.tags && it.tags.length) {
      var tg = el("div", "ms-card-tags");
      it.tags.forEach(function (t) {
        var b = el("button", "ms-tag" + (state.tag === t ? " on" : ""), "#" + t); b.type = "button";
        b.addEventListener("click", function () { state.tag = state.tag === t ? "" : t; render(); });
        tg.appendChild(b);
      });
      c.appendChild(tg);
    }

    // actions
    function act(label, fn, cls) {
      var b = el("button", "ms-act" + (cls ? " " + cls : ""), label); b.type = "button";
      b.addEventListener("click", fn); actions.appendChild(b);
    }
    function link(label, href) { var a = el("a", "ms-act", label); a.href = href; actions.appendChild(a); }
    if (it.kind === "vnote") {
      act("Edit", function () { window.NoteEditor.open({ id: it.id }, render); });
      act("Delete", function () { if (confirm("Delete this note?")) { window.Study.remove("vnote", it.id); render(); } }, "danger");
    } else if (it.kind === "highlight") {
      act("Remove", function () { window.Highlights.remove(it.src.ref, it.src.text, it.src.translation); render(); }, "danger");
    } else if (it.kind === "saved") {
      act("Note", function () {
        var r = it.r; if (!r) return;
        window.NoteEditor.open({ slug: r.slug, chapter: r.chapter, verse: r.verse || 1, endVerse: r.endVerse || r.verse || 1,
                                 ref: it.ref, text: it.quote, translation: it.translation }, render);
      });
      act("Remove", function () { window.SavedVerses.remove(it.src.ref, it.src.translation); render(); }, "danger");
    } else if (it.legacy) {
      link("Open", editHref(it));
      act("Delete", function () {
        if (!confirm("Delete these notes?")) return;
        try { localStorage.removeItem("cs_notes_" + it.src.sermonId); } catch (e) {}
        if (window.Sync) window.Sync.push("note", "sermon-" + it.src.sermonId, null, true);
        render();
      }, "danger");
    } else {
      link("Edit", editHref(it));
      act("Delete", function () {
        if (confirm(it.kind === "soap" ? "Delete this journal entry?" : "Delete these notes?")) { window.Study.remove(it.kind, it.id); render(); }
      }, "danger");
    }
    return c;
  }

  var current = [];
  function render() {
    var items = gather();
    current = visible(items);

    // filter chips
    [].forEach.call($("msFilters").querySelectorAll("button"), function (b) {
      var on = b.getAttribute("data-f") === state.f;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("msColors").hidden = state.f !== "highlight";
    [].forEach.call($("msColors").querySelectorAll("button"), function (b) { b.classList.toggle("on", b.getAttribute("data-c") === state.color); });

    // tag chips (from everything, so a tag never vanishes while selected)
    var tagsEl = $("msTags"); tagsEl.textContent = "";
    var tags = window.Study.allTags();
    if (state.tag && tags.indexOf(state.tag) < 0) state.tag = "";
    tags.slice(0, 24).forEach(function (t) {
      var b = el("button", "ms-tag" + (state.tag === t ? " on" : ""), "#" + t); b.type = "button";
      b.addEventListener("click", function () { state.tag = state.tag === t ? "" : t; render(); });
      tagsEl.appendChild(b);
    });
    tagsEl.hidden = !tags.length;

    $("msCount").textContent = current.length === 1 ? "1 item" : current.length + " items";
    $("msSort").textContent = state.sort === "bible" ? "Bible order" : "Newest first";

    listEl.textContent = "";
    current.forEach(function (it) { listEl.appendChild(card(it)); });
    emptyEl.hidden = current.length > 0;
    if (!current.length) {
      var any = items.length > 0;
      $("msEmptyTitle").textContent = any ? "Nothing matches" : "Nothing here yet";
      $("msEmptySub").textContent = any ? "Try a different word, tag or filter." :
        "While reading, tap a verse to highlight it, save it, or write a note. Your journal and sermon notes live here too.";
    }

    var p = new URLSearchParams();
    if (state.f !== "all") p.set("f", state.f);
    if (state.tag) p.set("tag", state.tag);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  }

  /* ---------- controls ---------- */
  $("msFilters").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.f = b.getAttribute("data-f"); state.color = ""; render();
  });
  $("msColors").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.color = b.getAttribute("data-c"); render();
  });
  var qt;
  $("msQuery").addEventListener("input", function (e) { clearTimeout(qt); qt = setTimeout(function () { state.q = e.target.value; render(); }, 120); });
  $("msSort").addEventListener("click", function () { state.sort = state.sort === "new" ? "bible" : "new"; render(); });

  /* ---------- export ---------- */
  function today() { return new Date().toISOString().slice(0, 10); }
  function download(name, type, text) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function asMarkdown(items) {
    var out = ["# My study · Clearspring", "", "_Exported " + new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) + "_", ""];
    items.forEach(function (it) {
      var s = it.src, head = it.kind === "talk" ? it.title : (it.ref || KINDS[it.kind]);
      out.push("## " + head, "");
      out.push("*" + KINDS[it.kind] + (it.kind === "highlight" ? " (" + COLOR_NAMES[it.color] + ")" : "") + (it.date ? " · " + when(it.date) : "") + "*", "");
      if (it.kind === "talk") {
        var meta = [s.speaker, s.date, it.ref].filter(Boolean).join(" · ");
        if (meta) out.push(meta, "");
      }
      if (it.quote) out.push("> " + it.quote.replace(/\n/g, "\n> "), "");
      if (it.body) out.push(it.body, "");
      [["Observation", s.observation], ["Application", s.application], ["Prayer", s.prayer], ["Notes", it.kind === "talk" ? s.notes : null],
       ["The one thing to remember", s.takeaway], ["To do this week", s.action]].forEach(function (p) {
        if (p[1] && String(p[1]).trim()) out.push("**" + p[0] + "**", "", String(p[1]).trim(), "");
      });
      if (it.tags && it.tags.length) out.push(it.tags.map(function (t) { return "#" + t; }).join(" "), "");
    });
    return out.join("\n");
  }
  function printItems(items) {
    var box = $("msPrint"); box.textContent = "";
    box.appendChild(el("h1", null, "My study"));
    box.appendChild(el("p", "msp-date", new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })));
    items.forEach(function (it) {
      var s = it.src, sec = el("section", "msp-item");
      sec.appendChild(el("h2", null, it.kind === "talk" ? it.title : (it.ref || KINDS[it.kind])));
      sec.appendChild(el("p", "msp-kind", KINDS[it.kind] + (it.date ? " · " + when(it.date) : "")));
      if (it.quote) sec.appendChild(el("blockquote", null, it.quote));
      if (it.body) sec.appendChild(el("p", null, it.body));
      [["Observation", s.observation], ["Application", s.application], ["Prayer", s.prayer], ["Notes", it.kind === "talk" ? s.notes : null],
       ["Remember", s.takeaway], ["To do", s.action]].forEach(function (p) {
        if (p[1] && String(p[1]).trim()) { sec.appendChild(el("h3", null, p[0])); sec.appendChild(el("p", null, String(p[1]).trim())); }
      });
      if (it.tags && it.tags.length) sec.appendChild(el("p", "msp-kind", it.tags.map(function (t) { return "#" + t; }).join("  ")));
      box.appendChild(sec);
    });
    document.body.classList.add("ms-printing");
    window.print();
    setTimeout(function () { document.body.classList.remove("ms-printing"); }, 500);
  }
  function backup() {
    var notes = {};
    legacySermonNotes().forEach(function (l) { notes[l.sermonId] = l.notes; });
    return JSON.stringify({
      app: "clearspring", kind: "study-backup", version: 1, exported: new Date().toISOString(),
      verseNotes: window.Study.all("vnote"), journal: window.Study.all("soap"), sermonNotes: window.Study.all("talk"),
      highlights: window.Highlights.getAll(), saved: window.SavedVerses.getAll(), churchSermonNotes: notes
    }, null, 2);
  }
  function restore(text) {
    var d; try { d = JSON.parse(text); } catch (e) { alert("That file isn't a Clearspring backup."); return; }
    if (!d || d.kind !== "study-backup") { alert("That file isn't a Clearspring backup."); return; }
    var added = 0;
    [["vnote", d.verseNotes], ["soap", d.journal], ["talk", d.sermonNotes]].forEach(function (p) {
      (p[1] || []).forEach(function (x) { if (x && x.id && !x.deleted && !window.Study.get(p[0], x.id)) { window.Study.save(p[0], x); added++; } });
    });
    (d.highlights || []).forEach(function (h) {
      if (h && h.ref && !window.Highlights.exists(h.ref, h.text, h.translation)) { window.Highlights.add(h.ref, h.text, h.translation, h.color); added++; }
    });
    (d.saved || []).forEach(function (v) {
      if (v && v.ref && !window.SavedVerses.isSaved(v.ref, v.translation)) { window.SavedVerses.save(v.ref, v.text, v.translation); added++; }
    });
    Object.keys(d.churchSermonNotes || {}).forEach(function (id) {
      try { if (!localStorage.getItem("cs_notes_" + id)) { localStorage.setItem("cs_notes_" + id, d.churchSermonNotes[id]); added++; } } catch (e) {}
    });
    render();
    alert(added ? "Restored " + added + (added === 1 ? " item." : " items.") : "Everything in that backup is already here.");
  }
  document.querySelector(".ms-export-menu").addEventListener("click", function (e) {
    var b = e.target.closest("[data-export]"); if (!b) return;
    var kind = b.getAttribute("data-export");
    document.querySelector(".ms-export").open = false;
    if (kind === "md") download("my-study-" + today() + ".md", "text/markdown;charset=utf-8", asMarkdown(current));
    else if (kind === "print") printItems(current);
    else if (kind === "json") download("clearspring-study-backup-" + today() + ".json", "application/json", backup());
  });
  $("msRestore").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { restore(String(r.result)); }; r.readAsText(f);
    e.target.value = "";
    document.querySelector(".ms-export").open = false;
  });
  document.addEventListener("click", function (e) {
    var d = document.querySelector(".ms-export");
    if (d.open && !d.contains(e.target)) d.open = false;
  });

  /* ---------- start ---------- */
  render();
  var ids = legacySermonNotes().map(function (l) { return l.sermonId; });
  if (ids.length) {
    fetch("/api/sermon-titles?ids=" + ids.join(",")).then(function (r) { return r.json(); })
      .then(function (d) { sermonTitles = (d && d.items) || {}; render(); }).catch(function () {});
  }
  Promise.all([
    window.Study.mergeAll(),
    window.SavedVerses.syncWithAccount ? window.SavedVerses.syncWithAccount() : null,
    window.Highlights.pullFromAccount()
  ]).then(render, render);
  window.Study.onChange(function () { /* re-rendered by callers */ });
})();
