/* Clearspring — one reading plan: start it, see today's reading, tick days,
   catch up, set reminders. Works for built-in plans and ones you made. */
(function () {
  "use strict";
  var page = document.getElementById("planPage");
  if (!page || !window.Plans) return;
  var P = window.Plans, slug = page.getAttribute("data-slug");
  var $ = function (id) { return document.getElementById(id); };
  var plan = null;
  var embedded = $("planData");

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function readingDays() {
    return Array.prototype.slice.call(document.querySelectorAll(".pl-day.on")).map(function (b) { return +b.getAttribute("data-d"); });
  }

  function paintStart() {
    var d = $("plStartDate"), days = readingDays();
    var st = { start: d.value || P.today(), days: days.length < 7 ? days : null };
    var ds = P.dates(plan, st);
    $("plEnds").textContent = ds.length ? "You’ll finish on " + P.parse(ds[ds.length - 1]).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + "." : "";
  }

  function passages(n, day, compact) {
    var wrap = el("span", "pl-passages");
    day.forEach(function (g) {
      var a = el("a", "pl-passage", g.label);
      a.href = P.hrefFor(slug, n, g);
      wrap.appendChild(a);
    });
    return wrap;
  }

  function render() {
    var st = P.mine(slug);
    var started = !!(st && st.start);
    var s = P.status(plan, st);
    var avg = plan.minutes && plan.minutes.length ? Math.round(plan.minutes.reduce(function (a, b) { return a + b; }, 0) / plan.minutes.length) : null;
    $("plMeta").textContent = plan.days.length + " days" + (avg ? " · about " + avg + " min a day" : "");

    $("plStart").hidden = started;
    $("plOn").hidden = !started;
    $("plFoot").hidden = !started;

    if (started) {
      $("plPct").textContent = s.pct + "%";
      var c = 2 * Math.PI * 19;
      $("plRingFg").style.strokeDasharray = c;
      $("plRingFg").style.strokeDashoffset = c * (1 - s.pct / 100);
      $("plCount").textContent = s.done + " of " + s.total + " days read";
      var stateText;
      if (s.finished) stateText = "You’ve finished the plan. Well done!";
      else if (s.behind.length) stateText = s.behind.length + (s.behind.length === 1 ? " day" : " days") + " to catch up";
      else if (s.dates[0] > P.today()) stateText = "Starts " + P.nice(s.dates[0]).toLowerCase();
      else if (s.ahead) stateText = s.ahead + (s.ahead === 1 ? " day" : " days") + " ahead. Lovely!";
      else stateText = "On track";
      $("plState").textContent = stateText;
      $("plState").className = "pl-state" + (s.behind.length ? " behind" : "");

      $("plCatchup").hidden = s.behind.length < 2 || s.finished;
      $("plCatchupText").textContent = "You’ve missed " + s.behind.length + " days. No problem. Choose what suits you:";

      // Today's card: today's day, or the next unread one
      var todayBox = $("plToday"); todayBox.textContent = "";
      var n = s.finished ? null : (s.behind.length ? s.behind[0] : (s.today && !P.isDone(plan, st, s.today) ? s.today : s.next));
      if (n) {
        var card = el("div", "pl-today-card");
        var lab = s.dates[n - 1] === P.today() ? "Today’s reading" : (s.behind.indexOf(n) >= 0 ? "Next to catch up" : "Next reading");
        card.appendChild(el("p", "pl-today-k", lab + " · Day " + n + (s.dates[n - 1] ? " · " + P.nice(s.dates[n - 1]) : "")));
        card.appendChild(passages(n, plan.days[n - 1]));
        var row = el("div", "pl-today-row");
        var go = el("a", "pl-today-go", "Read now"); go.href = P.hrefFor(slug, n, plan.days[n - 1][0]);
        var tick = el("button", "pl-today-tick", "Mark as read"); tick.type = "button";
        tick.addEventListener("click", function () { P.setDone(slug, n, true); render(); });
        row.append(go, tick);
        if (plan.minutes) row.appendChild(el("span", "pl-today-min", "≈ " + plan.minutes[n - 1] + " min"));
        card.appendChild(row);
        todayBox.appendChild(card);
      }
      var t = $("plCalTime");
      var days = st.days && st.days.length ? st.days.join("") : "0123456";
      $("plCal").href = "/bible/plans/reminder.ics?time=" + encodeURIComponent(t.value) + "&days=" + days + "&start=" + st.start + "&title=" + encodeURIComponent("Read: " + plan.title);
    }

    // The list of days
    var list = $("plList"); list.textContent = "";
    var todayN = s.today;
    plan.days.forEach(function (day, i) {
      var n = i + 1, done = P.isDone(plan, st, n), skipped = st && (st.skipped || []).indexOf(n) >= 0;
      var li = el("li", "pl-row" + (done ? " done" : "") + (skipped ? " skipped" : "") + (n === todayN ? " today" : "") + (started && s.behind.indexOf(n) >= 0 ? " missed" : ""));
      li.id = "day-" + n;
      var box = el("button", "pl-check"); box.type = "button";
      box.setAttribute("aria-pressed", done ? "true" : "false");
      box.setAttribute("aria-label", (done ? "Untick" : "Tick") + " day " + n);
      box.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      box.addEventListener("click", function () {
        if (!started && !(st && st.done && st.done.length)) { P.start(slug, { start: P.today() }); st = P.mine(slug); }
        P.setDone(slug, n, !done); render();
      });
      var body = el("div", "pl-row-body");
      var top = el("p", "pl-row-top");
      top.appendChild(el("b", null, "Day " + n));
      if (s.dates[i]) top.appendChild(el("span", "pl-row-date", P.nice(s.dates[i])));
      if (skipped) top.appendChild(el("span", "pl-row-tag", "skipped"));
      body.append(top, passages(n, day));
      li.append(box, body);
      list.appendChild(li);
    });
    $("plJump").hidden = !todayN;
  }

  function wire() {
    // start form
    var d = $("plStartDate");
    var church = page.getAttribute("data-church-slug") === slug ? page.getAttribute("data-church-start") : null;
    d.value = church || P.today();
    if (plan.weekdays_only) {
      document.querySelectorAll(".pl-day").forEach(function (b) {
        var on = ["1", "2", "3", "4", "5"].indexOf(b.getAttribute("data-d")) >= 0;
        b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    d.addEventListener("change", paintStart);
    $("plDays").addEventListener("click", function (e) {
      var b = e.target.closest(".pl-day"); if (!b) return;
      if (readingDays().length === 1 && b.classList.contains("on")) return;
      b.classList.toggle("on"); b.setAttribute("aria-pressed", b.classList.contains("on") ? "true" : "false");
      paintStart();
    });
    $("plGo").addEventListener("click", function () {
      P.start(slug, { start: d.value || P.today(), days: readingDays(), keep: true, church: !!church && d.value === church });
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    $("plShift").addEventListener("click", function () { P.shiftToToday(slug, plan); render(); });
    $("plSkip").addEventListener("click", function () {
      if (confirm("Skip the days you’ve missed? They stay in the list, marked as skipped, if you want to read them later.")) { P.skipMissed(slug, plan); render(); }
    });
    $("plStop").addEventListener("click", function () {
      if (!confirm("Stop this plan? Your ticks will be cleared.")) return;
      P.stop(slug);
      if (slug.indexOf("c:") === 0 && confirm("Delete this plan you made, too?")) { P.removeCustom(slug.slice(2)); location.href = "/bible/plans"; return; }
      render();
    });
    $("plCalTime").addEventListener("change", render);
    $("plJump").addEventListener("click", function () {
      var t = document.querySelector(".pl-row.today"); if (t) t.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    paintStart();
    render();
    P.syncAll().then(function (ok) { if (ok) render(); });
  }

  if (embedded) {
    plan = JSON.parse(embedded.textContent);
    plan.slug = slug;
    wire();
  } else {
    P.load(slug).then(function (p) {
      plan = p;
      $("plTitle").textContent = p.title; $("plSub").textContent = p.subtitle || ""; $("plEmoji").textContent = p.emoji || "🧭";
      document.querySelector(".pl-list-head .pl-h").textContent = "All " + p.days.length + " days";
      document.title = p.title + " · Clearspring";
      wire();
    }).catch(function () {
      // may arrive from the account
      P.syncAll().then(function () {
        P.load(slug).then(function (p) { location.reload(); }).catch(function () { $("plMissing").hidden = false; });
      });
    });
  }
})();
