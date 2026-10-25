/* Clearspring — "Pray now": a gentle guided time of prayer, one step at a time. */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("psData").textContent);
  var T = D.texts, R = window.Prayers, B = window.PrayerBell;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("psStage"), len = "standard", steps = [], i = 0, stopTimer = null, started = 0;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function scripture(key, cls) {
    var t = T[key]; if (!t) return el("span");
    var q = el("blockquote", "ps-scripture" + (cls ? " " + cls : ""));
    q.appendChild(el("p", null, t.text));
    var a = el("a", "ps-ref", t.ref); a.href = t.href; a.target = "_blank"; a.rel = "noopener";
    q.appendChild(a);
    return q;
  }
  var secs = { short: { still: 30, confess: 20 }, standard: { still: 60, confess: 45 }, long: { still: 120, confess: 90 } };

  /* ---------------- the steps ---------------- */
  function build() {
    var s = secs[len];
    steps = [
      { k: "Be still", draw: function (box) {
          box.append(el("h2", "ps-t", "Be still"), el("p", "ps-p", "Breathe slowly. In… and out. You don’t need to say anything yet. God is here."));
          var b = el("div", "ps-breathe"); b.appendChild(el("i")); b.appendChild(el("span", "ps-breathe-t", "Breathe in"));
          box.appendChild(b);
          var txt = b.querySelector(".ps-breathe-t"), phase = 0;
          var iv = setInterval(function () { phase = 1 - phase; txt.textContent = phase ? "Breathe out" : "Breathe in"; b.classList.toggle("out", !!phase); }, 5000);
          box.appendChild(scripture("still"));
          var t = el("div", "ps-timer"); box.appendChild(t);
          var stop = B.timer(t, s.still);
          return function () { clearInterval(iv); stop(); };
        } },
      { k: "Praise", draw: function (box) {
          box.append(el("h2", "ps-t", "Praise"), el("p", "ps-p", "Read these words slowly, and make them your own. Then tell God who he is to you."));
          box.appendChild(scripture("praise"));
          box.appendChild(el("p", "ps-small", "You might use one of his names:"));
          var names = el("div", "ps-names");
          var pick = D.names.slice().sort(function () { return Math.random() - 0.5; }).slice(0, len === "short" ? 4 : 7);
          pick.forEach(function (n) { names.appendChild(el("span", null, n)); });
          box.appendChild(names);
        } },
      { k: "Thanks", draw: function (box) {
          box.append(el("h2", "ps-t", "Give thanks"), el("p", "ps-p", "What are you grateful for today? Small things count. Thank God for each one."));
          var f = el("form", "ps-thanks");
          var inp = el("input"); inp.type = "text"; inp.placeholder = "I’m thankful for…"; inp.maxLength = 200; inp.setAttribute("aria-label", "Something you’re thankful for");
          var b = el("button", null, "Add"); b.type = "submit";
          f.append(inp, b);
          var list = el("ul", "ps-thanks-list");
          f.addEventListener("submit", function (e) {
            e.preventDefault(); var v = inp.value.trim(); if (!v) return;
            R.add({ text: v, kind: "thanks" }); list.insertBefore(el("li", null, v), list.firstChild); inp.value = "";
          });
          box.append(f, list);
          var recent = R.all().filter(function (x) { return x.kind === "thanks"; }).slice(0, 3);
          if (recent.length) {
            box.appendChild(el("p", "ps-small", "Earlier thank-yous:"));
            var ul = el("ul", "ps-thanks-list old"); recent.forEach(function (x) { ul.appendChild(el("li", null, x.text)); }); box.appendChild(ul);
          }
        } },
      { k: "Say sorry", draw: function (box) {
          box.append(el("h2", "ps-t", "Say sorry"), el("p", "ps-p", "Ask God to show you anything that needs putting right. Be honest. He already knows, and he is kind."));
          box.appendChild(scripture("search"));
          var t = el("div", "ps-timer"); box.appendChild(t);
          var stop = B.timer(t, s.confess, function () { assurance.hidden = false; });
          var assurance = el("div", "ps-assure"); assurance.hidden = true;
          assurance.appendChild(el("p", "ps-small", "Hear the good news:"));
          assurance.appendChild(scripture("forgiven", "gold"));
          box.appendChild(assurance);
          var show = el("button", "ps-link", "I’m ready"); show.type = "button";
          show.addEventListener("click", function () { assurance.hidden = false; show.hidden = true; });
          box.appendChild(show);
          return stop;
        } },
      { k: "Ask", draw: drawAsk },
      { k: "The church", draw: function (box) {
          box.append(el("h2", "ps-t", "Pray for the church"), el("p", "ps-p", "These are requests shared on the church’s prayer wall. Pray for each, then let them know."));
          if (!D.wall.length) { box.appendChild(el("p", "ps-small", "There are no requests on the wall just now. Pray for Clearspring: its people, its leaders and its neighbours.")); return; }
          D.wall.forEach(function (w) {
            var c = el("div", "ps-wall");
            c.appendChild(el("p", null, w.body));
            var who = el("p", "ps-small", w.author_name || "Anonymous"); c.appendChild(who);
            var b = el("button", "ps-pray", "I’ve prayed"); b.type = "button";
            var done = (function () { try { return JSON.parse(localStorage.getItem("cs_prayed") || "[]").indexOf(w.id) >= 0; } catch (e) { return false; } })();
            if (done) { b.textContent = "Prayed ✓"; b.disabled = true; }
            b.addEventListener("click", function () {
              b.textContent = "Prayed ✓"; b.disabled = true;
              try { var s2 = JSON.parse(localStorage.getItem("cs_prayed") || "[]"); s2.push(w.id); localStorage.setItem("cs_prayed", JSON.stringify(s2)); } catch (e) {}
              fetch("/prayer/" + w.id + "/pray", { method: "POST" }).catch(function () {});
            });
            c.appendChild(b); box.appendChild(c);
          });
        } },
      { k: "Our Father", draw: function (box) {
          box.append(el("h2", "ps-t", "The prayer Jesus taught"), el("p", "ps-p", "Pray it slowly, aloud if you can."));
          box.appendChild(scripture("lords_prayer", "big"));
        } },
      { k: "Go in peace", draw: function (box) {
          box.append(el("h2", "ps-t", "Go in peace"));
          box.appendChild(scripture("blessing", "big"));
          box.appendChild(el("p", "ps-p", "Amen."));
        } }
    ];
    if (len === "short") steps = steps.filter(function (s) { return s.k !== "Say sorry" && s.k !== "The church"; });
  }

  function drawAsk(box) {
    // Today's cards from the prayer list (or the older list, if that's all there is).
    var PC = window.PrayerCards;
    var list = PC ? PC.todayPersonal().map(function (c) {
      var n = (c.notes || []).filter(function (x) { return !x.answered; });
      return { at: c.id, card: true, who: c.name, text: n.length ? n.map(function (x) { return x.text; }).join(" · ") : "", lastPrayed: c.last };
    }) : R.forToday();
    var max = len === "short" ? 3 : len === "standard" ? 6 : 99;
    box.append(el("h2", "ps-t", "Ask"), el("p", "ps-p", list.length ? "Bring each one to God. There’s no need for many words." : "Who or what is on your heart today? Tell God about them."));
    var wrap = el("div", "ps-asks");
    list.slice(0, max).forEach(function (it) {
      var c = el("div", "ps-ask");
      if (it.who) c.appendChild(el("b", null, it.who));
      if (it.text) c.appendChild(el("p", null, it.text));
      var b = el("button", "ps-pray", it.lastPrayed === R.today() ? "Prayed ✓" : "Amen"); b.type = "button";
      if (it.lastPrayed === R.today()) b.disabled = true;
      b.addEventListener("click", function () {
        if (it.card) PC.markPrayed(it.at); else R.prayedFor(it.at);
        b.textContent = "Prayed ✓"; b.disabled = true; c.classList.add("done");
      });
      c.appendChild(b); wrap.appendChild(c);
    });
    box.appendChild(wrap);
    var f = el("form", "ps-thanks");
    var inp = el("input"); inp.type = "text"; inp.placeholder = list.length ? "Add someone else…" : "I’m praying for…"; inp.maxLength = 300;
    inp.setAttribute("aria-label", "Add a prayer");
    var b = el("button", null, "Add"); b.type = "submit";
    f.append(inp, b);
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var v = inp.value.trim(); if (!v) return;
      if (PC) { var nc = PC.addSubject({ name: v.length > 48 ? v.slice(0, 46) + "…" : v, note: v.length > 48 ? v : "", cat: "friends" }); PC.markPrayed(nc.id); }
      else { var it = R.add({ text: v, kind: "request", cat: "other" }); R.prayedFor(it.at); }
      var c = el("div", "ps-ask done"); c.appendChild(el("p", null, v)); c.appendChild(el("span", "ps-small", "Added to My prayers"));
      wrap.appendChild(c); inp.value = "";
    });
    box.appendChild(f);
    if (list.length > max) box.appendChild(el("p", "ps-small", "And " + (list.length - max) + " more on today’s prayer list."));
  }

  /* ---------------- stepping ---------------- */
  function dots() {
    var d = $("psDots"); d.textContent = "";
    steps.forEach(function (s, n) { var x = el("i", n === i ? "on" : (n < i ? "past" : "")); x.title = s.k; d.appendChild(x); });
  }
  function show(n) {
    if (stopTimer) { stopTimer(); stopTimer = null; }
    i = Math.max(0, Math.min(steps.length - 1, n));
    stage.textContent = ""; stage.classList.remove("in"); void stage.offsetWidth; stage.classList.add("in");
    var box = el("div", "ps-box");
    box.appendChild(el("p", "ps-k", (i + 1) + " of " + steps.length + " · " + steps[i].k));
    stage.appendChild(box);
    stopTimer = steps[i].draw(box) || null;
    $("psBack").hidden = i === 0;
    $("psNext").textContent = i === steps.length - 1 ? "Amen" : "Next";
    dots();
    window.scrollTo(0, 0);
  }
  function finish() {
    if (stopTimer) stopTimer();
    var mins = Math.max(1, Math.round((Date.now() - started) / 60000));
    R.logDay(mins);
    stage.textContent = "";
    var box = el("div", "ps-box ps-done");
    box.append(el("p", "ps-k", "Amen"), el("h2", "ps-t", "Thank you for praying"),
               el("p", "ps-p", "You spent about " + mins + " minute" + (mins === 1 ? "" : "s") + " with God. He is with you through the rest of the day."));
    var links = el("div", "ps-done-links");
    var a1 = el("a", "ps-go", "My prayers"); a1.href = "/prayer/journal";
    var a2 = el("a", "ps-alt", "Back to the church’s prayer wall"); a2.href = "/prayer";
    links.append(a1, a2); box.appendChild(links);
    stage.appendChild(box);
    $("psFoot").hidden = true; $("psDots").textContent = "";
  }

  document.querySelectorAll(".ps-len button").forEach(function (b) {
    b.addEventListener("click", function () {
      len = b.dataset.len;
      document.querySelectorAll(".ps-len button").forEach(function (x) { x.classList.toggle("on", x === b); });
    });
  });
  $("psStart").addEventListener("click", function () {
    B.unlock(); build(); started = Date.now();
    $("psIntro").hidden = true; stage.hidden = false; $("psFoot").hidden = false;
    show(0);
  });
  $("psNext").addEventListener("click", function () { if (i === steps.length - 1) finish(); else show(i + 1); });
  $("psBack").addEventListener("click", function () { show(i - 1); });
  var snd = $("psSound");
  function paintSnd() { snd.setAttribute("aria-pressed", B.isOn() ? "true" : "false"); snd.textContent = B.isOn() ? "🔔" : "🔕"; }
  snd.addEventListener("click", function () { B.setOn(!B.isOn()); paintSnd(); });
  paintSnd();
  if (R.sync) R.sync();
  if (window.PrayerCards) window.PrayerCards.sync();
})();
