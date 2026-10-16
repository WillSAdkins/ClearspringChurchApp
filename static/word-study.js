/* Clearspring — original-language word study
   Opens from the verse menu ("Hebrew" / "Greek"). For each selected verse it
   lists the original words in order: the word itself, how to say it, what it
   means here, and — on tap — its dictionary entry and Strong's number.
   Everything is written with textContent; nothing from the data is parsed as
   HTML. */

window.WordStudy = (function () {
  "use strict";

  const panel = document.getElementById("wsPanel");
  if (!panel) return null;
  const body = document.getElementById("wsBody");
  const refEl = document.getElementById("wsRef");
  const closeBtn = document.getElementById("wsClose");
  const slug = panel.dataset.slug;
  const chapter = panel.dataset.chapter;
  const isHebrew = panel.dataset.language === "Hebrew";
  const MAX_VERSES = 5;
  const cache = new Map();

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  async function load(verse) {
    if (cache.has(verse)) return cache.get(verse);
    const res = await fetch(`/api/words/${encodeURIComponent(slug)}/${chapter}/${verse}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    cache.set(verse, data);
    return data;
  }

  function wordRow(w) {
    const li = el("li", "ws-word");
    const btn = el("button", "ws-word-btn");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");

    const orig = el("span", "ws-orig", w.word);
    orig.lang = isHebrew ? "he" : "grc";
    if (isHebrew) orig.dir = "rtl";
    const mid = el("span", "ws-mid");
    mid.appendChild(el("span", "ws-translit", w.translit));
    mid.appendChild(el("span", "ws-gloss", w.gloss));
    btn.appendChild(orig);
    btn.appendChild(mid);
    if (w.strong_display) btn.appendChild(el("span", "ws-num", w.strong_display));
    li.appendChild(btn);

    const detail = el("div", "ws-detail");
    detail.hidden = true;
    if (w.lemma) {
      const head = el("p", "ws-lemma-line");
      const lemma = el("span", "ws-lemma", w.lemma);
      lemma.lang = orig.lang;
      if (isHebrew) lemma.dir = "rtl";
      head.appendChild(lemma);
      if (w.lemma_translit) head.appendChild(el("span", "ws-lemma-tr", w.lemma_translit));
      detail.appendChild(head);
      const meta = [w.pos, w.strong_display ? "Strong's " + w.strong_display : ""].filter(Boolean).join(" · ");
      if (meta) detail.appendChild(el("p", "ws-meta", meta));
      if (w.meaning) detail.appendChild(el("p", "ws-meaning", w.meaning));
      if (w.definition) {
        const def = el("div", "ws-def");
        w.definition.split("\n").forEach((line) => {
          const p = el("p", null, line);
          // BDB-style outline numbering: indent the sub-senses (1a, 1a1 …)
          const m = /^(\d+[a-z]?\d*[a-z]?)\)/.exec(line);
          if (m) p.style.paddingLeft = Math.min(m[1].length - 1, 3) * 0.75 + "rem";
          def.appendChild(p);
        });
        detail.appendChild(def);
      }
      if (w.strong) {
        const more = el("a", "ws-more", "Every verse with this word");
        more.href = "/bible/word/" + encodeURIComponent(w.strong);
        detail.appendChild(more);
      }
    } else {
      detail.appendChild(el("p", "ws-meta", "No dictionary entry for this word."));
    }
    li.appendChild(detail);

    btn.addEventListener("click", () => {
      const open = detail.hidden;
      detail.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      li.classList.toggle("open", open);
    });
    return li;
  }

  function renderVerse(data, verse, many) {
    const section = el("section", "ws-verse");
    if (many) section.appendChild(el("p", "ws-verse-ref", data.ref || `Verse ${verse}`));
    if (!data.words || !data.words.length) {
      section.appendChild(el("p", "ws-empty", "There are no original-language words for this verse."));
      return section;
    }
    const line = el("p", "ws-line", data.words.map((w) => w.word).join(" "));
    line.lang = isHebrew ? "he" : "grc";
    if (isHebrew) line.dir = "rtl";
    section.appendChild(line);
    const list = el("ol", "ws-list");
    data.words.forEach((w) => list.appendChild(wordRow(w)));
    section.appendChild(list);
    return section;
  }

  async function open(verses) {
    verses = [...new Set(verses)].sort((a, b) => a - b).slice(0, MAX_VERSES);
    if (!verses.length) return;
    body.textContent = "";
    body.appendChild(el("p", "ws-loading", "Loading…"));
    refEl.textContent = "";
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("up"));
    document.body.style.overflow = "hidden";

    try {
      const results = await Promise.all(verses.map(load));
      body.textContent = "";
      const first = results[0];
      const last = results[results.length - 1];
      refEl.textContent = verses.length > 1
        ? `${first.ref}–${verses[verses.length - 1]}` : first.ref;
      body.appendChild(el("p", "ws-hint", "Tap a word for its full meaning."));
      results.forEach((r, i) => body.appendChild(renderVerse(r, verses[i], verses.length > 1)));
      body.appendChild(el("p", "ws-credit", last.attribution || ""));
      body.scrollTop = 0;
    } catch (e) {
      body.textContent = "";
      body.appendChild(el("p", "ws-empty",
        "Couldn't load the original words. Check your connection and try again."));
    }
  }

  function close() {
    panel.classList.remove("up");
    document.body.style.overflow = "";
    setTimeout(() => { panel.hidden = true; }, 240);
  }

  closeBtn.addEventListener("click", close);
  panel.addEventListener("click", (e) => { if (e.target === panel) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });

  return { open, close };
})();
