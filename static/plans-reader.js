/* Clearspring — the reader's side of plans and the reading log.
   • Counts a chapter as read when you reach the end of it (or tap "Mark as read").
   • Arriving from a plan (?plan=…&day=…), shows that day's readings and moves
     you on to the next one, ticking the day when it's done. */
(function () {
  "use strict";
  var P = window.Plans; if (!P) return;
  var m = /^\/bible\/read\/([^/]+)\/(\d+)/.exec(location.pathname);
  var box = document.getElementById("readMark");
  var scripture = document.getElementById("scripture");
  if (!m || !box || !scripture) return;
  var SLUG = m[1], CH = +m[2];
  var params = new URLSearchParams(location.search);
  var planSlug = params.get("plan"), dayN = +params.get("day") || 0;
  var openedAt = Date.now();
  var words = (scripture.textContent || "").trim().split(/\s+/).length;
  var minMs = Math.max(15000, Math.min(60000, words / 200 * 60000 * 0.3));

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var btn = el("button", "read-mark-btn"); btn.type = "button";
  box.appendChild(btn);
  function paint() {
    var on = P.hasRead(SLUG, CH);
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.innerHTML = (on ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Read' : "Mark as read");
  }
  function mark() {
    if (!P.readToday(SLUG, CH)) P.markRead(SLUG, CH);
    paint(); planCheck();
  }
  btn.addEventListener("click", function () {
    if (P.hasRead(SLUG, CH) && P.readToday(SLUG, CH)) P.unmarkRead(SLUG, CH); else P.markRead(SLUG, CH);
    paint(); planCheck();
  });
  paint();

  // Reaching the end of the chapter, after a reasonable time on the page
  var autoDone = false;
  function check() {
    if (autoDone) return;
    var r = scripture.getBoundingClientRect();
    if (r.bottom <= window.innerHeight + 40 && Date.now() - openedAt >= minMs) {
      autoDone = true; mark();
    }
  }
  window.addEventListener("scroll", check, { passive: true });
  setInterval(check, 5000);
  var next = document.getElementById("nextCh");
  if (next) next.addEventListener("click", function () { if (Date.now() - openedAt >= 15000) mark(); });

  /* ---------------- plan context ---------------- */
  var planBox = document.getElementById("planBar");
  var plan = null, dayChapters = [];
  function planCheck() {
    if (!plan || !planBox) return;
    drawPlan();
  }
  function drawPlan() {
    var day = plan.days[dayN - 1]; if (!day) return;
    dayChapters = P.chaptersOf(day);
    var idx = dayChapters.indexOf(SLUG + "." + CH);
    var st = P.mine(planSlug), allRead = dayChapters.every(function (k) { var p = k.split("."); return P.hasRead(p[0], +p[1]) && (!st || !st.start || P.readLog().chapters[k] >= st.start || P.readToday(p[0], +p[1])); });
    planBox.textContent = ""; planBox.hidden = false;
    var head = el("a", "plan-bar-head");
    head.href = planSlug.indexOf("c:") === 0 ? "/bible/plans/mine/" + planSlug.slice(2) + "#day-" + dayN : "/bible/plans/" + planSlug + "#day-" + dayN;
    head.append(el("span", "plan-bar-emoji", plan.emoji || "📖"), el("span", "plan-bar-t", plan.title + " · Day " + dayN));
    planBox.appendChild(head);
    var chips = el("div", "plan-bar-chips");
    dayChapters.forEach(function (k) {
      var p = k.split("."), a = el("a", "plan-bar-chip" + (P.hasRead(p[0], +p[1]) ? " read" : "") + (k === SLUG + "." + CH ? " here" : ""));
      a.href = "/bible/read/" + p[0] + "/" + p[1] + "?plan=" + encodeURIComponent(planSlug) + "&day=" + dayN;
      a.textContent = labelOf(p[0], +p[1]);
      chips.appendChild(a);
    });
    planBox.appendChild(chips);
    var nextK = null;
    for (var i = idx + 1; i < dayChapters.length; i++) { var q = dayChapters[i].split("."); if (!P.hasRead(q[0], +q[1])) { nextK = dayChapters[i]; break; } }
    if (!nextK) nextK = dayChapters.filter(function (k) { var q = k.split("."); return k !== SLUG + "." + CH && !P.hasRead(q[0], +q[1]); })[0] || null;
    var act = el("a", "plan-bar-next");
    if (nextK) {
      var q = nextK.split(".");
      act.href = "/bible/read/" + q[0] + "/" + q[1] + "?plan=" + encodeURIComponent(planSlug) + "&day=" + dayN;
      act.textContent = "Next: " + labelOf(q[0], +q[1]) + " →";
      // keep the plan going when using the ordinary "next chapter" button too
      if (next && idx >= 0 && dayChapters[idx + 1] === nextK) next.href = act.href;
    } else {
      if (allRead) P.setDone(planSlug, dayN, true);
      var done = P.isDone(plan, st, dayN) || allRead;
      act.href = head.href;
      act.textContent = done ? "✓ Day " + dayN + " done. Back to the plan" : "Finish day " + dayN + " ✓";
      if (!done) act.addEventListener("click", function () { mark(); P.setDone(planSlug, dayN, true); });
    }
    planBox.appendChild(act);
  }
  function labelOf(slug, ch) {
    var d = window.BIBLE_BOOK_NAMES || {};
    var name = d[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    if (slug === "psalms") name = "Psalm";
    return name + " " + ch;
  }

  if (planSlug && dayN && planBox) {
    P.load(planSlug).then(function (p) { plan = p; drawPlan(); }).catch(function () {});
  }
})();
