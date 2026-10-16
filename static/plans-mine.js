/* Clearspring — "Your plans" cards (Plans page, Today page, Bible page) and the
   church plan's "today" line. Mount points: #plsMineList, #churchPlan. */
(function () {
  "use strict";
  var P = window.Plans; if (!P) return;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function card(slug, plan, opts) {
    var st = P.mine(slug), s = P.status(plan, st);
    var a = el("div", "pmc");
    var head = el("a", "pmc-head"); head.href = slug.indexOf("c:") === 0 ? "/bible/plans/mine/" + slug.slice(2) : "/bible/plans/" + slug;
    head.appendChild(el("span", "pmc-emoji", plan.emoji || "📖"));
    var t = el("span", "pmc-titles");
    t.appendChild(el("b", null, plan.title));
    var stateTxt = s.finished ? "Finished!" : (s.behind.length ? s.behind.length + " to catch up" : (s.dates[0] > P.today() ? "Starts " + P.nice(s.dates[0]).toLowerCase() : "On track"));
    t.appendChild(el("small", s.behind.length ? "behind" : "", s.done + " of " + s.total + " days · " + stateTxt));
    head.appendChild(t);
    var bar = el("span", "pmc-bar"); var fill = el("i"); fill.style.width = s.pct + "%"; bar.appendChild(fill);
    a.append(head, bar);
    var n = s.finished ? null : (s.behind.length ? s.behind[0] : (s.today && !P.isDone(plan, st, s.today) ? s.today : null));
    if (n) {
      var row = el("div", "pmc-today");
      row.appendChild(el("span", "pmc-k", (s.dates[n - 1] === P.today() ? "Today" : "Day " + n)));
      var links = el("span", "pmc-links");
      plan.days[n - 1].forEach(function (g) { var l = el("a", null, g.label); l.href = P.hrefFor(slug, n, g); links.appendChild(l); });
      row.appendChild(links);
      var tick = el("button", "pmc-tick"); tick.type = "button"; tick.setAttribute("aria-label", "Mark day " + n + " as read");
      tick.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      tick.addEventListener("click", function () { P.setDone(slug, n, true); draw(); });
      row.appendChild(tick);
      a.appendChild(row);
    } else if (s.today && P.isDone(plan, st, s.today)) {
      a.appendChild(el("p", "pmc-done", "✓ Today’s reading done"));
    }
    return a;
  }

  var list = document.getElementById("plsMineList");
  function draw() {
    if (!list) return;
    var slugs = P.active();
    var box = document.getElementById("plsMine");
    if (!slugs.length) { if (box) box.hidden = true; return; }
    Promise.all(slugs.map(function (s) { return P.load(s).then(function (p) { return [s, p]; }, function () { return null; }); })).then(function (pairs) {
      list.textContent = "";
      pairs.filter(Boolean).forEach(function (pp) { list.appendChild(card(pp[0], pp[1])); });
      if (box) box.hidden = !list.children.length;
    });
  }

  // The church plan: today's reading, and whether you've joined
  var cp = document.getElementById("churchPlan");
  function drawChurch() {
    if (!cp) return;
    var slug = cp.getAttribute("data-slug"), start = cp.getAttribute("data-start");
    P.load(slug).then(function (plan) {
      var joined = P.mine(slug);
      var st = joined && joined.start ? joined : { start: start, days: plan.weekdays_only ? [1, 2, 3, 4, 5] : null };
      var s = P.status(plan, st);
      var out = document.getElementById("churchToday"), cta = document.getElementById("churchCta");
      if (s.dates[0] > P.today()) out.textContent = "Starts " + P.nice(s.dates[0]).toLowerCase() + " with " + plan.days[0].map(function (g) { return g.label; }).join(", ");
      else if (s.today) out.textContent = "Today, day " + s.today + ": " + plan.days[s.today - 1].map(function (g) { return g.label; }).join(", ");
      else out.textContent = "";
      cta.textContent = joined && joined.start ? "You’re reading along →" : "Join in";
    }).catch(function () {});
  }

  draw(); drawChurch();
  P.syncAll().then(function (ok) { if (ok) { draw(); drawChurch(); } });
  window.PlansMine = { draw: draw, card: card };
})();
