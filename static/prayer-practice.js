/* Clearspring — a prayer practice, step by step (Lectio Divina, the Examen,
   breath prayer, the Lord's Prayer, praying a Psalm, praying for someone). */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("ppData").textContent);
  var P = D.p, T = D.texts || {}, PASS = D.passage, B = window.PrayerBell, R = window.Prayers;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("psStage"), steps = [], i = 0, stop = null, answers = {}, started = 0;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function quote(t, cls) {
    if (!t) return el("span");
    var q = el("blockquote", "ps-scripture" + (cls ? " " + cls : ""));
    if (t.verses && t.verses.length > 1) {
      var p = el("p");
      t.verses.forEach(function (v) { var s = el("sup", null, String(v.verse)); p.append(s, document.createTextNode(v.text + " ")); });
      q.appendChild(p);
    } else q.appendChild(el("p", null, t.text));
    var a = el("a", "ps-ref", t.ref); a.href = t.href; a.target = "_blank"; a.rel = "noopener"; q.appendChild(a);
    return q;
  }

  /* ---------- ordinary step-by-step practices ---------- */
  function fromSteps() {
    return P.steps.map(function (s, n) {
      return { k: s.title, draw: function (box) {
        box.appendChild(el("h2", "ps-t" + (P.slug === "lords-prayer" ? " ps-t-line" : ""), s.title));
        box.appendChild(el("p", "ps-p", s.body));
        if (s.passage && PASS) box.appendChild(quote(PASS));
        if (s.scripture) box.appendChild(quote(T[s.scripture]));
        if (s.input) {
          var ta = el("textarea", "ps-input"); ta.rows = 3; ta.placeholder = s.input; ta.setAttribute("aria-label", s.input);
          ta.value = answers[n] || "";
          ta.addEventListener("input", function () { answers[n] = ta.value; });
          box.appendChild(ta);
        }
        if (s.timer) { var t = el("div", "ps-timer"); box.appendChild(t); return B.timer(t, s.timer); }
      } };
    });
  }

  /* ---------- breath prayer ---------- */
  var phrase = 0, minutes = 3;
  function breathSteps() {
    return [{ k: "Breathe", draw: function (box) {
      var pair = P.breath[phrase];
      box.appendChild(el("p", "ps-p", "Breathe in on the first line, out on the second. When your mind wanders, simply come back."));
      var b = el("div", "ps-breathe big"); b.appendChild(el("i"));
      var line = el("span", "ps-breathe-t", pair[0]); b.appendChild(line);
      box.appendChild(b);
      var phase = 0;
      var iv = setInterval(function () { phase = 1 - phase; line.textContent = pair[phase]; b.classList.toggle("out", !!phase); }, 5000);
      var t = el("div", "ps-timer"); box.appendChild(t);
      var st = B.timer(t, minutes * 60);
      return function () { clearInterval(iv); st(); };
    } }];
  }

  /* ---------- praying the Bible for someone ---------- */
  function nameSteps() {
    var name = ($("ppName").value || "").trim() || "them";
    return P.name_prayers.map(function (np) {
      return { k: np.ref, draw: function (box) {
        box.appendChild(el("p", "ps-small", "Pray this for " + name + ":"));
        box.appendChild(el("p", "ps-prayer", np.text.replace(/\{name\}/g, name)));
        var t = T[np.ref];
        if (t) {
          var d = el("details", "ps-orig"); d.appendChild(el("summary", null, "Read " + t.ref));
          d.appendChild(quote(t)); box.appendChild(d);
        }
      } };
    });
  }

  function dots() {
    var d = $("psDots"); d.textContent = "";
    steps.forEach(function (s, n) { var x = el("i", n === i ? "on" : (n < i ? "past" : "")); x.title = s.k; d.appendChild(x); });
  }
  function show(n) {
    if (stop) { stop(); stop = null; }
    i = Math.max(0, Math.min(steps.length - 1, n));
    stage.textContent = ""; stage.classList.remove("in"); void stage.offsetWidth; stage.classList.add("in");
    var box = el("div", "ps-box");
    if (steps.length > 1) box.appendChild(el("p", "ps-k", (i + 1) + " of " + steps.length));
    stage.appendChild(box);
    stop = steps[i].draw(box) || null;
    $("psBack").hidden = i === 0;
    $("psNext").textContent = i === steps.length - 1 ? "Finish" : "Next";
    dots(); window.scrollTo(0, 0);
  }

  function finish() {
    if (stop) stop();
    var mins = Math.max(1, Math.round((Date.now() - started) / 60000));
    if (R) R.logDay(mins);
    stage.textContent = "";
    var box = el("div", "ps-box ps-done");
    box.append(el("p", "ps-k", "Amen"), el("h2", "ps-t", "Well done"), el("p", "ps-p", "You spent about " + mins + " minute" + (mins === 1 ? "" : "s") + " in prayer."));
    var written = Object.keys(answers).filter(function (k) { return (answers[k] || "").trim(); });
    if (written.length && window.Study) {
      var saveBtn = el("button", "ps-go", "Save my notes to My study"); saveBtn.type = "button";
      saveBtn.addEventListener("click", function () {
        var lines = written.map(function (k) { return P.steps[k].title + ": " + answers[k].trim(); });
        var thanks = written.filter(function (k) { return P.steps[k].thanks; });
        thanks.forEach(function (k) { if (R) R.add({ text: answers[k].trim(), kind: "thanks" }); });
        window.Study.save("soap", {
          ref: PASS ? PASS.ref : "", refLabel: PASS ? PASS.ref : P.title, passage: PASS ? PASS.text : "",
          observation: lines.join("\n\n"), application: "", prayer: "", tags: [P.title.toLowerCase()]
        });
        saveBtn.textContent = "Saved ✓"; saveBtn.disabled = true;
      });
      box.appendChild(saveBtn);
    }
    if (P.name_prayers && R) {
      var who = ($("ppName").value || "").trim();
      if (who) {
        var add = el("button", "ps-alt", "Add " + who + " to My prayers"); add.type = "button";
        add.addEventListener("click", function () { R.add({ text: "Praying the Bible for " + who, who: who, cat: "friends" }); add.textContent = "Added ✓"; add.disabled = true; });
        box.appendChild(add);
      }
    }
    var back = el("a", "ps-alt", "More ways to pray"); back.href = "/prayer/practices"; box.appendChild(back);
    stage.appendChild(box);
    $("psFoot").hidden = true; $("psDots").textContent = "";
  }

  // intro choices
  document.querySelectorAll(".pp-phrase").forEach(function (b) {
    b.addEventListener("click", function () { phrase = +b.dataset.i; document.querySelectorAll(".pp-phrase").forEach(function (x) { x.classList.toggle("on", x === b); }); });
  });
  document.querySelectorAll(".ps-len button").forEach(function (b) {
    b.addEventListener("click", function () { minutes = +b.dataset.min; document.querySelectorAll(".ps-len button").forEach(function (x) { x.classList.toggle("on", x === b); }); });
  });
  $("psStart").addEventListener("click", function () {
    if (P.name_prayers && !($("ppName").value || "").trim()) { $("ppName").focus(); return; }
    B.unlock(); started = Date.now();
    steps = P.breath ? breathSteps() : P.name_prayers ? nameSteps() : fromSteps();
    $("psIntro").hidden = true; stage.hidden = false; $("psFoot").hidden = false;
    show(0);
  });
  $("psNext").addEventListener("click", function () { if (i === steps.length - 1) finish(); else show(i + 1); });
  $("psBack").addEventListener("click", function () { show(i - 1); });
  var snd = $("psSound");
  function paintSnd() { snd.setAttribute("aria-pressed", B.isOn() ? "true" : "false"); snd.textContent = B.isOn() ? "🔔" : "🔕"; }
  snd.addEventListener("click", function () { B.setOn(!B.isOn()); paintSnd(); });
  paintSnd();
})();
