/* Clearspring — the verse-note editor (a bottom sheet), shared by the reader,
   verse pages and My study.

   NoteEditor.open({ slug, chapter, verse, endVerse, ref, text, translation, id })
   Opens the existing note for that passage if there is one. */
window.NoteEditor = (function () {
  "use strict";
  var root, refEl, quoteEl, ta, tagWrap, tagInput, sugg, delBtn, saveBtn, status, current, tags, onDone;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function build() {
    root = el("div", "ne"); root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "neRef");
    var scrim = el("div", "ne-scrim"); scrim.addEventListener("click", close);
    var inner = el("div", "ne-inner");
    var head = el("div", "ne-head");
    var kicker = el("p", "ne-kicker", "Your note");
    refEl = el("p", "ne-ref"); refEl.id = "neRef";
    var x = el("button", "ne-x"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    x.addEventListener("click", close);
    var hl = el("div"); hl.append(kicker, refEl); head.append(hl, x);
    quoteEl = el("blockquote", "ne-quote");
    ta = el("textarea", "ne-text"); ta.rows = 6; ta.maxLength = 8000;
    ta.placeholder = "What stands out? What is God saying? Questions, links to other passages (type “Romans 8:28” and it becomes a link)…";
    ta.setAttribute("aria-label", "Note");
    var tagLabel = el("p", "ne-label", "Tags");
    tagWrap = el("div", "ne-tags");
    tagInput = el("input", "ne-tag-input"); tagInput.type = "text"; tagInput.placeholder = "Add a tag (e.g. prayer, hope)";
    tagInput.setAttribute("aria-label", "Add a tag"); tagInput.maxLength = 30; tagInput.autocomplete = "off";
    tagWrap.appendChild(tagInput);
    sugg = el("div", "ne-sugg");
    var foot = el("div", "ne-foot");
    delBtn = el("button", "ne-del", "Delete"); delBtn.type = "button";
    status = el("span", "ne-status");
    saveBtn = el("button", "ne-save", "Save note"); saveBtn.type = "button";
    foot.append(delBtn, status, saveBtn);
    inner.append(head, quoteEl, ta, tagLabel, tagWrap, sugg, foot);
    root.append(scrim, inner);
    document.body.appendChild(root);

    tagInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput.value); }
      else if (e.key === "Backspace" && !tagInput.value && tags.length) { tags.pop(); paintTags(); }
    });
    tagInput.addEventListener("blur", function () { if (tagInput.value.trim()) addTag(tagInput.value); });
    tagInput.addEventListener("input", paintSugg);
    saveBtn.addEventListener("click", save);
    delBtn.addEventListener("click", function () {
      if (!current.id) return close();
      if (!confirm("Delete this note?")) return;
      window.Study.remove("vnote", current.id);
      close(true);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !root.hidden) close(); });
  }

  function addTag(t) {
    var clean = window.Study.cleanTags([t])[0];
    tagInput.value = "";
    if (clean && tags.indexOf(clean) < 0) tags.push(clean);
    paintTags();
  }
  function paintTags() {
    Array.prototype.slice.call(tagWrap.querySelectorAll(".ne-tag")).forEach(function (n) { n.remove(); });
    tags.forEach(function (t, i) {
      var b = el("button", "ne-tag", "#" + t); b.type = "button"; b.setAttribute("aria-label", "Remove tag " + t);
      b.addEventListener("click", function () { tags.splice(i, 1); paintTags(); });
      tagWrap.insertBefore(b, tagInput);
    });
    paintSugg();
  }
  function paintSugg() {
    sugg.textContent = "";
    var q = tagInput.value.trim().toLowerCase();
    window.Study.allTags().filter(function (t) { return tags.indexOf(t) < 0 && (!q || t.indexOf(q) === 0); })
      .slice(0, 8).forEach(function (t) {
        var b = el("button", "ne-sugg-chip", "#" + t); b.type = "button";
        b.addEventListener("mousedown", function (e) { e.preventDefault(); });
        b.addEventListener("click", function () { addTag(t); tagInput.focus(); });
        sugg.appendChild(b);
      });
  }

  function save() {
    var body = ta.value.trim();
    if (tagInput.value.trim()) addTag(tagInput.value);
    if (!body && !tags.length) {
      if (current.id) window.Study.remove("vnote", current.id);
      return close(true);
    }
    var item = Object.assign({}, current, { note: body, tags: tags.slice() });
    window.Study.save("vnote", item);
    close(true);
  }

  function open(opts, done) {
    if (!root) build();
    onDone = done || null;
    var existing = opts.id ? window.Study.get("vnote", opts.id) : null;
    if (!existing && opts.slug) {
      existing = window.Study.all("vnote").find(function (n) {
        return n.slug === opts.slug && n.chapter === opts.chapter && n.verse === opts.verse && (n.endVerse || n.verse) === (opts.endVerse || opts.verse);
      }) || null;
    }
    current = existing ? Object.assign({}, existing) : {
      slug: opts.slug, chapter: opts.chapter, verse: opts.verse, endVerse: opts.endVerse || opts.verse,
      ref: opts.ref, text: opts.text || "", translation: opts.translation || "web"
    };
    if (!existing && opts.text) current.text = opts.text;
    refEl.textContent = current.ref;
    quoteEl.textContent = current.text || "";
    quoteEl.hidden = !current.text;
    ta.value = current.note || "";
    tags = (current.tags || []).slice();
    delBtn.hidden = !current.id;
    status.textContent = current.updated ? "Edited " + new Date(current.updated).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
    paintTags();
    root.hidden = false;
    document.documentElement.classList.add("ne-open");
    requestAnimationFrame(function () { root.classList.add("up"); ta.focus(); });
  }

  function close(changed) {
    root.classList.remove("up");
    document.documentElement.classList.remove("ne-open");
    setTimeout(function () { root.hidden = true; }, 200);
    if (changed === true && onDone) onDone();
  }

  return { open: open };
})();
