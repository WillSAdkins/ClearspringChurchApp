/* Clearspring — today's prayer cards, one at a time (like PrayerMate).
   Swipe left or tap Amen for the next card, right or ← to go back. */
(function () {
  "use strict";
  var P = window.PrayerCards; if (!P) return;
  var $ = function (id) { return document.getElementById(id); };
  var cards = [], i = 0, prayed = {}, started = 0;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function catName(id) { var c = P.cat(id); return c ? c.name : ""; }
  function prayedWall() { try { return JSON.parse(localStorage.getItem("cs_prayed") || "[]"); } catch (e) { return []; } }

  function load() {
    cards = P.todayCards();
    var n = cards.length;
    if (!n) {
      $("pdIntroT").textContent = "Your list is empty for today";
      $("pdIntroP").textContent = "Add the people and things you pray for to My prayers, and you’ll get a few cards each day.";
      $("pdStart").hidden = true;
      $("pdEdit").textContent = "Add to my list";
      $("pdEdit").className = "ps-go";
    } else {
      $("pdIntroT").textContent = n + (n === 1 ? " card" : " cards") + " for today";
      $("pdStart").hidden = false;
    }
  }

  function draw(card) {
    var c = el("article", "pd-card" + (card.kind === "feed" ? " feed feed-" + card.feed : ""));
    c.appendChild(el("p", "pd-cat", catName(card.cat)));
    if (card.kind === "subject") {
      c.appendChild(el("h2", "pd-name", card.name));
      var open = (card.notes || []).filter(function (x) { return !x.answered; });
      if (open.length) {
        var ul = el("ul", "pd-notes");
        open.forEach(function (n) {
          var li = el("li");
          li.appendChild(el("span", null, n.text));
          var a = el("button", "pd-answered", "Answered"); a.type = "button";
          a.setAttribute("aria-label", "Mark “" + n.text.slice(0, 40) + "” answered");
          a.addEventListener("click", function () {
            var ans = prompt("Answered! How? (optional)", "");
            if (ans === null) return;
            P.answerNote(card.id, n.id, ans.trim());
            li.classList.add("done"); a.replaceWith(el("span", "pd-ans-ok", "Answered ✓"));
          });
          li.appendChild(a); ul.appendChild(li);
        });
        c.appendChild(ul);
      } else {
        c.appendChild(el("p", "pd-empty", "Bring " + card.name + " to God: what they need today, and thanks for them."));
      }
      var f = el("form", "pd-addnote");
      var inp = el("input"); inp.type = "text"; inp.maxLength = 500; inp.placeholder = "Add a prayer point…";
      inp.setAttribute("aria-label", "Add a prayer point for " + card.name);
      var b = el("button", null, "Add"); b.type = "submit";
      f.append(inp, b);
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var v = inp.value.trim(); if (!v) return;
        P.addNote(card.id, v);
        var list = c.querySelector(".pd-notes") || c.insertBefore(el("ul", "pd-notes"), f);
        var e2 = c.querySelector(".pd-empty"); if (e2) e2.remove();
        list.insertBefore(el("li", null, v), list.firstChild); inp.value = "";
      });
      c.appendChild(f);
      var meta = card.last && card.last !== P.dayKey() ? "Last prayed for " + new Date(card.last + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
      if (meta) c.appendChild(el("p", "pd-meta", meta));
    } else {
      c.appendChild(el("h2", "pd-name", card.title));
      if (card.by) c.appendChild(el("p", "pd-by", card.by));
      c.appendChild(el("p", "pd-text", card.text));
      if (card.update) c.appendChild(el("p", "pd-update", "Update: " + card.update));
      if (card.points && card.points.length) {
        var pts = el("ul", "pd-notes plain");
        card.points.forEach(function (t) { pts.appendChild(el("li", null, t)); });
        c.appendChild(pts);
      }
      if (card.link) { var a2 = el("a", "pd-link", card.feed === "world" ? "More about praying for the world" : "Open"); a2.href = card.link; c.appendChild(a2); }
    }
    return c;
  }

  function show(n, dir) {
    i = Math.max(0, Math.min(cards.length - 1, n));
    var deck = $("pdDeck"); deck.textContent = "";
    var c = draw(cards[i]);
    if (dir) c.classList.add(dir > 0 ? "in-right" : "in-left");
    deck.appendChild(c);
    $("pdCount").textContent = (i + 1) + " of " + cards.length;
    $("pdBar").style.width = Math.round((i / cards.length) * 100) + "%";
    $("pdBack").disabled = i === 0;
    var done = prayed[i];
    $("pdAmen").textContent = i === cards.length - 1 ? "Amen, finish" : "Amen";
    $("pdAmen").classList.toggle("done", !!done);
    swipe(c);
  }

  function amen() {
    var card = cards[i];
    if (!prayed[i]) {
      prayed[i] = true;
      if (card.kind === "subject") P.markPrayed(card.id);
      else if (card.feed === "wall" && card.pid) {
        var list = prayedWall();
        if (list.indexOf(card.pid) < 0) {
          list.push(card.pid);
          try { localStorage.setItem("cs_prayed", JSON.stringify(list)); } catch (e) {}
          fetch("/prayer/" + card.pid + "/pray", { method: "POST" }).catch(function () {});
        }
      }
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
    }
    next();
  }
  function next() { if (i >= cards.length - 1) finish(); else show(i + 1, 1); }
  function back() { if (i > 0) show(i - 1, -1); }

  function finish() {
    var n = Object.keys(prayed).length;
    var mins = Math.max(1, Math.round((Date.now() - started) / 60000));
    if (window.Prayers && n) window.Prayers.logDay(mins);
    $("pdStage").hidden = true; $("pdDone").hidden = false;
    $("pdBar").style.width = "100%"; $("pdCount").textContent = "";
    $("pdDoneP").textContent = n ? "You prayed through " + n + (n === 1 ? " card" : " cards") + " today. Tomorrow you’ll get the next ones on your list."
                                 : "Come back tomorrow for the next cards on your list.";
    window.scrollTo(0, 0);
  }

  /* Swipe: drag the card sideways; far enough and it goes. */
  function swipe(c) {
    var x0 = null, y0 = 0, dx = 0, id = null;
    c.addEventListener("pointerdown", function (e) {
      if (e.target.closest("input,button,a,textarea")) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId;
    });
    c.addEventListener("pointermove", function (e) {
      if (x0 == null || e.pointerId !== id) return;
      dx = e.clientX - x0;
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - y0)) return;
      try { c.setPointerCapture(id); } catch (err) {}
      c.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 30) + "deg)";
      c.style.opacity = String(Math.max(0.4, 1 - Math.abs(dx) / 400));
    });
    function end() {
      if (x0 == null) return;
      x0 = null;
      if (dx < -90) { amen(); return; }
      if (dx > 90 && i > 0) { back(); return; }
      c.style.transform = ""; c.style.opacity = "";
    }
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  }

  document.addEventListener("keydown", function (e) {
    if ($("pdStage").hidden || e.target.closest("input,textarea")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); amen(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
  });
  $("pdAmen").addEventListener("click", amen);
  $("pdSkip").addEventListener("click", next);
  $("pdBack").addEventListener("click", back);
  $("pdStart").addEventListener("click", function () {
    cards = P.todayCards();
    if (!cards.length) return;
    started = Date.now();
    $("pdIntro").hidden = true; $("pdStage").hidden = false;
    show(0);
  });

  load();
  P.refreshFeeds().then(function () { if (!$("pdIntro").hidden) load(); });
  P.sync().then(function (changed) { if (changed && !$("pdIntro").hidden) load(); });
})();
