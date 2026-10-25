/* Clearspring — a memorisation lesson
   Builds a verse up in small steps, Duolingo style:
     intro      read (and hear) the verse
     order      tap the words of a phrase into the right order
     blank      pick the missing word
     next       pick the word that comes next
     ref        pick which verse this is
     letters    type the first letter of every word, from memory
   Anything answered wrongly comes back once at the end. */

(function () {
  "use strict";
  const root = document.getElementById("lesson");
  if (!root) return;
  const KEY = root.dataset.key;
  const LABEL = root.dataset.label;
  const MODE = root.dataset.mode;
  const HUB = root.dataset.hub;
  const OTHER_REFS = JSON.parse(root.dataset.otherRefs || "[]");
  const M = window.Memory;

  const stage = document.getElementById("lsStage");
  const bar = document.getElementById("lsBar");
  const footer = document.getElementById("lsFooter");
  const checkBtn = document.getElementById("lsCheck");
  const fb = document.getElementById("lsFeedback");
  const fbTitle = document.getElementById("lsFbTitle");
  const fbBody = document.getElementById("lsFbBody");
  const fbBtn = document.getElementById("lsFbBtn");

  let words = [], queue = [], done = 0, total = 0, mistakes = 0, current = null, requeued = new Set();

  /* ---------- helpers ---------- */
  const norm = (w) => w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  const STOP = new Set("a an the and of to in for is was be on that with as by it at his he i you my me we our your their they them but or not so from shall unto".split(" "));

  function chunks(ws) {
    const out = []; let cur = [];
    ws.forEach((w, i) => {
      cur.push(i);
      const end = /[,;:.!?]["’”)]?$/.test(w);
      if ((cur.length >= 4 && end) || cur.length >= 8) { out.push(cur); cur = []; }
    });
    if (cur.length) {
      if (cur.length < 3 && out.length) out[out.length - 1] = out[out.length - 1].concat(cur);
      else out.push(cur);
    }
    return out;
  }

  function keyWordIndexes() {
    const idx = words.map((w, i) => i).filter((i) => norm(words[i]).length > 3 && !STOP.has(norm(words[i])));
    return idx.length ? idx : words.map((w, i) => i);
  }

  function distractors(answer, n) {
    const a = norm(answer);
    const pool = [...new Set(words.filter((w) => norm(w) && norm(w) !== a).map((w) => w.replace(/[^\p{L}\p{N}'’-]/gu, "")))];
    const extra = ["grace", "mercy", "light", "truth", "peace", "faith", "heart", "glory", "power", "life", "word", "world", "spirit", "strength", "hope", "love"];
    const opts = shuffle(pool).filter((w) => w && norm(w) !== a);
    shuffle(extra).forEach((w) => { if (opts.length < n && norm(w) !== a && !opts.some((o) => norm(o) === norm(w))) opts.push(w); });
    return opts.slice(0, n);
  }
  const clean = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’]+$/gu, "");

  /* ---------- plan ---------- */
  function plan() {
    const cs = chunks(words);
    const keys = shuffle(keyWordIndexes());
    const q = [];
    if (MODE === "learn") {
      q.push({ type: "intro" });
      cs.forEach((c) => q.push({ type: "order", idx: c }));
      q.push({ type: "blank", at: keys[0] });
      const mid = Math.max(1, Math.min(words.length - 1, Math.floor(words.length / 2)));
      q.push({ type: "next", at: mid });
      q.push({ type: "order", idx: words.length <= 14 ? words.map((w, i) => i) : cs.slice(-2).flat() });
      if (keys.length > 1) q.push({ type: "blank", at: keys[1] });
      if (OTHER_REFS.length >= 2) q.push({ type: "ref" });
      q.push({ type: "letters" });
    } else {
      q.push({ type: "blank", at: keys[0] });
      q.push({ type: "order", idx: words.length <= 14 ? words.map((w, i) => i) : cs.slice(-2).flat() });
      q.push({ type: "letters" });
    }
    return q;
  }

  /* ---------- flow ---------- */
  function progress() { bar.style.width = Math.round(done / total * 100) + "%"; }

  function next() {
    fb.hidden = true; fb.className = "ls-feedback";
    footer.hidden = false;
    current = queue.shift();
    if (!current) return finish();
    stage.textContent = "";
    stage.classList.remove("ls-in"); void stage.offsetWidth; stage.classList.add("ls-in");
    checkBtn.disabled = true;
    checkBtn.textContent = "Check";
    checkBtn.onclick = null;
    RENDER[current.type](current);
  }

  function verdict(ok, answerText) {
    footer.hidden = true;
    fb.hidden = false;
    fb.classList.add(ok ? "good" : "bad");
    fbTitle.textContent = ok ? pick(["Nice!", "Well done!", "That's it!", "Spot on!", "Great!"]) : "Not quite";
    fbBody.textContent = ok ? "" : (answerText ? "Answer: " + answerText : "");
    fbBtn.textContent = "Continue";
    if (!ok) {
      mistakes++;
      if (navigator.vibrate) navigator.vibrate(60);
      if (!requeued.has(current)) { requeued.add(current); queue.push(current); total++; }
    }
    done++; progress();
    fbBtn.onclick = next;
    fbBtn.focus();
  }

  function setCheck(enabled, fn) {
    checkBtn.disabled = !enabled;
    checkBtn.onclick = fn;
  }

  function prompt(text) { stage.appendChild(el("h2", "ls-prompt", text)); }
  function refTag() { stage.appendChild(el("p", "ls-ref", LABEL)); }

  /* ---------- exercises ---------- */
  const RENDER = {
    intro() {
      prompt(MODE === "learn" ? "New verse" : "Review");
      const card = el("div", "ls-card");
      card.appendChild(el("p", "ls-verse", words.join(" ")));
      card.appendChild(el("p", "ls-card-ref", LABEL));
      stage.appendChild(card);
      stage.appendChild(el("p", "ls-tip", "Read it slowly, out loud if you can. Then we'll build it up together."));
      if ("speechSynthesis" in window) {
        const b = el("button", "ls-listen", "Listen");
        b.type = "button";
        b.onclick = () => { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(words.join(" ") + ". " + LABEL); u.rate = 0.92; speechSynthesis.speak(u); };
        stage.appendChild(b);
      }
      checkBtn.disabled = false;
      checkBtn.textContent = "Start";
      checkBtn.onclick = () => { done++; progress(); next(); };
    },

    order(ex) {
      prompt("Put the words in order");
      refTag();
      const target = ex.idx.map((i) => words[i]);
      const before = ex.idx[0] > 0 ? words.slice(Math.max(0, ex.idx[0] - 6), ex.idx[0]).join(" ") : "";
      if (before) stage.appendChild(el("p", "ls-context", "…" + before));
      const line = el("div", "ls-answer"); line.setAttribute("aria-label", "Your answer");
      const bank = el("div", "ls-bank");
      let order = shuffle(target.map((w, i) => i));
      if (order.every((v, i) => v === i) && order.length > 1) order.reverse();
      order.forEach((i) => {
        const t = el("button", "ls-tile", clean(target[i]) || target[i]);
        t.type = "button"; t.dataset.i = i;
        t.onclick = () => {
          (t.parentNode === bank ? line : bank).appendChild(t);
          setCheck(bank.children.length === 0, check);
        };
        bank.appendChild(t);
      });
      stage.appendChild(line); stage.appendChild(bank);
      function check() {
        const got = [...line.children].map((t) => norm(target[+t.dataset.i]));
        const ok = got.join(" ") === target.map(norm).join(" ");
        line.classList.add(ok ? "good" : "bad");
        verdict(ok, target.join(" "));
      }
    },

    blank(ex) {
      prompt("Fill in the missing word");
      refTag();
      const p = el("p", "ls-verse ls-verse-sm");
      words.forEach((w, i) => {
        if (i === ex.at) {
          const gap = el("span", "ls-gap", " ".repeat(6)); gap.id = "lsGap"; p.appendChild(gap);
          const trail = w.match(/[^\p{L}\p{N}'’]+$/u); if (trail) p.appendChild(document.createTextNode(trail[0]));
        } else p.appendChild(document.createTextNode(w));
        p.appendChild(document.createTextNode(" "));
      });
      stage.appendChild(p);
      const answer = clean(words[ex.at]);
      choices(shuffle([answer, ...distractors(answer, 2)]), answer, (c) => { document.getElementById("lsGap").textContent = c; });
    },

    next(ex) {
      prompt("What comes next?");
      refTag();
      stage.appendChild(el("p", "ls-verse ls-verse-sm", words.slice(0, ex.at).join(" ") + " …"));
      const answer = clean(words[ex.at]);
      choices(shuffle([answer, ...distractors(answer, 2)]), answer);
    },

    ref() {
      prompt("Which verse is this?");
      stage.appendChild(el("p", "ls-verse ls-verse-sm", words.join(" ")));
      const others = shuffle(OTHER_REFS.filter((r) => r !== LABEL)).slice(0, 2);
      choices(shuffle([LABEL, ...others]), LABEL);
    },

    letters() {
      prompt("Type the first letter of each word");
      refTag();
      const p = el("p", "ls-verse ls-letters");
      const spans = words.map((w) => {
        const s = el("span", "ls-hidden-word", w);
        p.appendChild(s); p.appendChild(document.createTextNode(" "));
        return s;
      });
      stage.appendChild(p);
      const input = el("input", "ls-type");
      input.type = "text"; input.autocomplete = "off"; input.autocapitalize = "none";
      input.setAttribute("autocorrect", "off"); input.spellcheck = false;
      input.placeholder = "Type here…"; input.setAttribute("aria-label", "First letter of the next word");
      stage.appendChild(input);
      const help = el("button", "ls-help", "Show the next word"); help.type = "button";
      stage.appendChild(help);
      let pos = 0, misses = 0, slips = 0;
      spans[0].classList.add("cursor");
      const firstLetter = (w) => (norm(w)[0] || "");
      function reveal(kind) {
        spans[pos].classList.remove("cursor", "shake");
        spans[pos].classList.add(kind);
        pos++; misses = 0;
        if (pos >= words.length) {
          input.disabled = true; help.disabled = true;
          const ok = slips <= Math.max(1, Math.floor(words.length / 10));
          setTimeout(() => verdict(ok, ok ? "" : "Keep practising. It'll come back in your next review."), 250);
          return;
        }
        while (pos < words.length && !firstLetter(words[pos])) { spans[pos].classList.add("shown"); pos++; }
        if (spans[pos]) { spans[pos].classList.add("cursor"); spans[pos].scrollIntoView({ block: "nearest" }); }
      }
      input.addEventListener("input", () => {
        const ch = norm(input.value.slice(-1));
        input.value = "";
        if (!ch || pos >= words.length) return;
        if (ch === firstLetter(words[pos])) { reveal("shown"); return; }
        misses++; slips++;
        spans[pos].classList.remove("shake"); void spans[pos].offsetWidth; spans[pos].classList.add("shake");
        if (navigator.vibrate) navigator.vibrate(30);
        if (misses >= 2) reveal("helped");
      });
      help.onclick = () => { slips++; reveal("helped"); input.focus(); };
      footer.hidden = true;
      setTimeout(() => input.focus(), 250);
    },
  };

  function choices(opts, answer, onPick) {
    const box = el("div", "ls-choices");
    let chosen = null;
    opts.forEach((o) => {
      const b = el("button", "ls-choice", o); b.type = "button";
      b.onclick = () => {
        box.querySelectorAll(".ls-choice").forEach((x) => x.classList.remove("on"));
        b.classList.add("on"); chosen = o;
        if (onPick) onPick(o);
        setCheck(true, () => {
          const ok = norm(chosen) === norm(answer);
          b.classList.add(ok ? "good" : "bad");
          verdict(ok, answer);
        });
      };
      box.appendChild(b);
    });
    stage.appendChild(box);
  }

  /* ---------- results ---------- */
  function finish() {
    const r = M.finish(KEY, LABEL, MODE, mistakes);
    footer.hidden = true; fb.hidden = true; bar.style.width = "100%";
    stage.textContent = "";
    const res = el("div", "ls-result");
    res.appendChild(el("p", "ls-result-kicker", MODE === "learn" ? "Verse learned" : "Review complete"));
    res.appendChild(el("h2", "ls-result-title", mistakes === 0 ? "Perfect!" : "Lesson complete"));
    res.appendChild(el("p", "ls-result-ref", LABEL));
    const stats = el("div", "ls-result-stats");
    const stat = (n, l, cls) => { const d = el("div", "ls-rs " + (cls || "")); d.appendChild(el("b", null, n)); d.appendChild(el("span", null, l)); stats.appendChild(d); };
    stat("+" + r.xp, "XP");
    stat(Math.max(0, Math.round((1 - mistakes / Math.max(1, total)) * 100)) + "%", "accuracy");
    stat(String(r.streak), r.streak === 1 ? "day streak" : "day streak", r.streakUp ? "lit" : "");
    res.appendChild(stats);
    const pips = el("div", "mz-pips big"); for (let i = 0; i < 6; i++) { const p = el("i"); if (i < r.box) p.className = "on"; pips.appendChild(p); }
    res.appendChild(pips);
    const days = Math.round((new Date(r.due) - new Date(M.today())) / 86400000);
    res.appendChild(el("p", "ls-result-note",
      r.levelUp ? "You reached level " + r.level + "!" :
      "Next review " + (days <= 0 ? "today" : days === 1 ? "tomorrow" : "in " + days + " days") + "."));
    const go = el("a", "btn-primary ls-done", "Continue"); go.href = HUB;
    res.appendChild(go);
    stage.appendChild(res);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) burst(res);
  }

  function burst(host) {
    const colors = ["#19A79B", "#5FDCCB", "#0B2E2F", "#F6D365"];
    for (let i = 0; i < 28; i++) {
      const c = el("i", "ls-confetti");
      c.style.left = 50 + (Math.random() * 60 - 30) + "%";
      c.style.background = pick(colors);
      c.style.setProperty("--dx", (Math.random() * 260 - 130) + "px");
      c.style.setProperty("--dy", (-120 - Math.random() * 160) + "px");
      c.style.setProperty("--r", (Math.random() * 540 - 270) + "deg");
      c.style.animationDelay = (Math.random() * 120) + "ms";
      host.appendChild(c);
    }
  }

  /* ---------- start ---------- */
  document.getElementById("lsClose").addEventListener("click", (e) => {
    if (done > 0 && queue.length && !confirm("Leave this lesson? Your progress in it won't be saved.")) e.preventDefault();
  });

  (async function start() {
    if (root.dataset.add === "1") M.add(KEY, LABEL);
    const s = M.load();
    try {
      // Every memory verse is in the World English Bible, so what people learn
      // matches across the path, reviews and anything they add themselves.
      const res = await fetch("/api/memorise/passage?ref=" + encodeURIComponent(KEY) + "&t=web");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      words = data.text.split(/\s+/).filter(Boolean);
      document.getElementById("lsTrans").textContent = data.translation.toUpperCase();
    } catch (e) {
      stage.textContent = "";
      stage.appendChild(el("p", "ls-tip", "This verse couldn't be loaded. Check your connection and try again."));
      return;
    }
    queue = plan(); total = queue.length; progress(); next();
  })();
})();
