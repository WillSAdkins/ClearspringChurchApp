/* Clearspring — "My prayers": the prayer list page (cards in categories),
   answered prayers, and thank-yous. Data: PrayerCards (prayer-cards.js) and,
   for thank-yous and older answered prayers, Prayers (prayers.js). */
(function () {
  "use strict";
  var P = window.PrayerCards, R = window.Prayers;
  if (!P) return;
  var $ = function (id) { return document.getElementById(id); };
  var open = {};       // which categories are expanded
  try { open = JSON.parse(sessionStorage.getItem("cs_pl_open") || "{}") || {}; } catch (e) {}

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(cls, text, fn, label) {
    var b = el("button", cls, text); b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    if (fn) b.addEventListener("click", fn);
    return b;
  }
  function ago(day) {
    if (!day) return "not prayed for yet";
    var a = new Date(day + "T12:00:00"), b = new Date(P.dayKey() + "T12:00:00");
    var n = Math.round((b - a) / 86400000);
    if (n <= 0) return "prayed for today";
    if (n === 1) return "prayed for yesterday";
    if (n < 14) return "prayed for " + n + " days ago";
    if (n < 60) return "prayed for " + Math.round(n / 7) + " weeks ago";
    return "prayed for " + Math.round(n / 30) + " months ago";
  }
  function nice(iso) {
    if (!iso) return "";
    var d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  }
  function openNotes(s) { return (s.notes || []).filter(function (n) { return !n.answered; }); }

  /* ------------------------------------------------------------ today */
  function paintToday() {
    var cards = P.todayCards();
    var n = cards.length;
    $("plTodayCount").textContent = n ? n + (n === 1 ? " card" : " cards") + " to pray through today" : "Add people to your list to get cards each day";
    var names = $("plTodayNames"); names.textContent = "";
    cards.slice(0, 6).forEach(function (c) { names.appendChild(el("span", null, c.kind === "feed" ? c.title : c.name)); });
    if (n > 6) names.appendChild(el("span", "more", "+" + (n - 6)));
    $("plToday").classList.toggle("empty", !n);
  }

  /* ------------------------------------------------------------ list */
  function paintList() {
    var box = $("plCats"); box.textContent = "";
    var dealt = {};
    P.today().cards.forEach(function (k) { if (!k.feed) dealt[k.id] = 1; });
    P.cats().forEach(function (c) {
      if (c.feed) return;
      var list = P.subjects(c.id).sort(function (a, b) { return a.name.localeCompare(b.name); });
      var d = el("details", "pl-cat");
      d.open = open[c.id] != null ? !!open[c.id] : list.length > 0 && list.length <= 6;
      d.addEventListener("toggle", function () {
        open[c.id] = d.open;
        try { sessionStorage.setItem("cs_pl_open", JSON.stringify(open)); } catch (e) {}
      });
      var sum = el("summary");
      sum.appendChild(el("span", "pl-cat-name", c.name));
      sum.appendChild(el("span", "pl-cat-n", list.length ? String(list.length) : ""));
      sum.appendChild(el("span", "pl-cat-rate", !c.perDay ? "pinned only" : c.perDay >= 99 ? "all each day" : c.perDay + " a day"));
      d.appendChild(sum);
      var ul = el("ul", "pl-subjects");
      list.forEach(function (s) {
        var li = el("li");
        var b = el("button", "pl-subject"); b.type = "button";
        var top = el("span", "pl-subject-top");
        top.appendChild(el("b", null, s.name));
        if (dealt[s.id]) top.appendChild(el("span", "pl-chip today", "Today"));
        if (s.sched && s.sched.t !== "rotate") top.appendChild(el("span", "pl-chip", P.schedLabel(s.sched)));
        b.appendChild(top);
        var on = openNotes(s);
        if (on.length) b.appendChild(el("span", "pl-subject-note", on[0].text + (on.length > 1 ? "  (+" + (on.length - 1) + " more)" : "")));
        b.appendChild(el("span", "pl-subject-meta", ago(s.last)));
        b.addEventListener("click", function () { editCard(s.id); });
        li.appendChild(b); ul.appendChild(li);
      });
      d.appendChild(ul);
      d.appendChild(btn("pl-cat-add", "+ Add to " + c.name, function () { editCard(null, { cat: c.id }); }));
      box.appendChild(d);
    });
  }

  /* ------------------------------------------------------------ the card sheet */
  var sheet = $("plCard"), editing = null, draftNotes = [], chosenCat = null;
  function closeOn(dlg) {
    dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }
  closeOn(sheet);

  function paintCatPick() {
    var box = $("plCatPick"); box.textContent = "";
    P.cats().filter(function (c) { return !c.feed; }).forEach(function (c) {
      var b = btn("pr-cat" + (c.id === chosenCat ? " on" : ""), c.name, function () { chosenCat = c.id; paintCatPick(); });
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", c.id === chosenCat ? "true" : "false");
      box.appendChild(b);
    });
  }
  function paintNotes() {
    var ul = $("plNotes"); ul.textContent = "";
    draftNotes.forEach(function (n) {
      var li = el("li", n.answered ? "answered" : "");
      var t = el("span", "pl-note-t", n.text); li.appendChild(t);
      if (n.answered) li.appendChild(el("span", "pl-note-ans", "Answered " + nice(n.answeredAt) + (n.answer ? ": " + n.answer : "")));
      var acts = el("span", "pl-note-acts");
      if (!n.answered) {
        acts.appendChild(btn("pl-mini", "Answered", function () {
          var ans = prompt("Answered! How? (optional)", "");
          if (ans === null) return;
          n.answered = true; n.answeredAt = new Date().toISOString(); n.answer = ans.trim();
          paintNotes();
        }, "Mark “" + n.text.slice(0, 40) + "” answered"));
      } else {
        acts.appendChild(btn("pl-mini", "Still praying", function () { n.answered = false; n.answeredAt = null; paintNotes(); }));
      }
      acts.appendChild(btn("pl-mini danger", "Remove", function () {
        draftNotes = draftNotes.filter(function (x) { return x !== n; }); paintNotes();
      }, "Remove “" + n.text.slice(0, 40) + "”"));
      li.appendChild(acts); ul.appendChild(li);
    });
  }
  function addDraftNote() {
    var v = $("plNote").value.trim(); if (!v) return;
    draftNotes.unshift({ id: "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: v, at: new Date().toISOString() });
    $("plNote").value = ""; paintNotes(); $("plNote").focus();
  }
  $("plNoteAdd").addEventListener("click", addDraftNote);
  $("plNote").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addDraftNote(); } });

  function when() { return sheet.querySelector("input[name=plWhen]:checked").value; }
  function paintWhen() {
    var w = when();
    $("plDays").hidden = w !== "days"; $("plMonth").hidden = w !== "month";
    $("plWhenHint").textContent = {
      rotate: "Comes round in turn with the others in its category.",
      daily: "On your list every day.",
      days: "On your list on the days you choose.",
      month: "On your list once a month, on this date."
    }[w];
  }
  sheet.querySelectorAll("input[name=plWhen]").forEach(function (r) { r.addEventListener("change", paintWhen); });
  $("plDays").addEventListener("click", function (e) {
    var b = e.target.closest(".pr-day"); if (!b) return;
    b.classList.toggle("on"); b.setAttribute("aria-pressed", b.classList.contains("on") ? "true" : "false");
  });

  function editCard(id, preset) {
    var s = id ? P.subject(id) : null;
    editing = s ? s.id : null;
    preset = preset || {};
    $("plCardTitle").textContent = s ? "Edit card" : "Add to your list";
    $("plName").value = s ? s.name : (preset.name || "");
    chosenCat = s ? s.cat : (preset.cat || "friends");
    if (!P.cat(chosenCat)) chosenCat = (P.cats().find(function (c) { return !c.feed; }) || {}).id;
    draftNotes = s ? JSON.parse(JSON.stringify(s.notes || [])) : [];
    if (preset.note) draftNotes.push({ id: "n" + Date.now().toString(36), text: preset.note, at: new Date().toISOString() });
    var sc = (s && s.sched) || { t: "rotate" };
    sheet.querySelectorAll("input[name=plWhen]").forEach(function (r) { r.checked = r.value === sc.t; });
    $("plDays").querySelectorAll(".pr-day").forEach(function (b) {
      var on = (sc.days || []).indexOf(+b.dataset.d) >= 0;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("plDate").value = String(sc.date || new Date().getDate());
    $("plStat").textContent = s ? "Added " + nice(s.created) + " · " + ago(s.last) + (s.count ? " · prayed for " + s.count + (s.count === 1 ? " time" : " times") : "") : "";
    $("plDelete").hidden = !s;
    $("plErr").hidden = true;
    $("plNote").value = "";
    paintCatPick(); paintNotes(); paintWhen();
    sheet.showModal();
    if (!s) $("plName").focus();
  }

  $("plCardForm").addEventListener("submit", function (e) {
    if (e.submitter && e.submitter.value !== "save") return;
    var name = $("plName").value.trim();
    if (!name) { e.preventDefault(); $("plErr").hidden = false; $("plName").focus(); return; }
    if ($("plNote").value.trim()) addDraftNote();
    var w = when(), sched = { t: w };
    if (w === "days") {
      sched.days = Array.prototype.map.call($("plDays").querySelectorAll(".pr-day.on"), function (b) { return +b.dataset.d; });
      if (!sched.days.length) sched = { t: "rotate" };
    }
    if (w === "month") sched.date = +$("plDate").value || 1;
    var fields = { name: name, cat: chosenCat, notes: draftNotes, sched: sched };
    if (editing) P.updateSubject(editing, fields);
    else { P.addSubject(fields); open[chosenCat] = true; }
    render();
  });
  $("plDelete").addEventListener("click", function () {
    if (!editing || !confirm("Remove this card from your list?")) return;
    P.removeSubject(editing); sheet.close(); render();
  });
  $("plAdd").addEventListener("click", function () { editCard(null); });

  /* ------------------------------------------------------------ categories sheet */
  var cs = $("plCatsSheet");
  closeOn(cs);
  var PER = [[0, "Pinned only"], [1, "1 a day"], [2, "2 a day"], [3, "3 a day"], [5, "5 a day"], [99, "All each day"]];
  function perSelect(c, label) {
    var sel = el("select", "pl-per"); sel.setAttribute("aria-label", label);
    PER.forEach(function (p) {
      if (c.feed && p[0] === 0) return;
      var o = el("option", null, p[1]); o.value = p[0]; if (+c.perDay === p[0]) o.selected = true; sel.appendChild(o);
    });
    if (!PER.some(function (p) { return p[0] === +c.perDay; })) { var o = el("option", null, c.perDay + " a day"); o.value = c.perDay; o.selected = true; sel.appendChild(o); }
    return sel;
  }
  function paintCatsSheet() {
    var list = P.cats().slice();
    var mine = list.filter(function (c) { return !c.feed; }), feeds = list.filter(function (c) { return c.feed; });
    function commit() { P.saveCats(mine.concat(feeds)); render(); }
    var ul = $("plCatEdit"); ul.textContent = "";
    mine.forEach(function (c, i) {
      var li = el("li");
      var name = el("input", "pl-cat-in"); name.type = "text"; name.value = c.name; name.maxLength = 40;
      name.setAttribute("aria-label", "Category name");
      name.addEventListener("change", function () { if (name.value.trim()) { c.name = name.value.trim(); commit(); } });
      var sel = perSelect(c, "Cards a day from " + c.name);
      sel.addEventListener("change", function () { c.perDay = +sel.value; commit(); });
      var up = btn("pl-mini", "↑", function () { if (i) { mine.splice(i - 1, 0, mine.splice(i, 1)[0]); commit(); paintCatsSheet(); } }, "Move " + c.name + " up");
      up.disabled = i === 0;
      var del = btn("pl-mini danger", "Delete", function () {
        var n = P.subjects(c.id).length, others = mine.filter(function (x) { return x !== c; });
        if (!others.length) return;
        if (n && !confirm("Move its " + n + (n === 1 ? " card" : " cards") + " to “" + others[0].name + "” and delete “" + c.name + "”?")) return;
        P.removeCat(c.id, others[0].id); render(); paintCatsSheet();
      }, "Delete " + c.name);
      li.append(name, sel, up, del); ul.appendChild(li);
    });
    var fl = $("plFeedEdit"); fl.textContent = "";
    feeds.forEach(function (c) {
      var li = el("li", "pl-feed");
      var lab = el("label", "pl-feed-on");
      var cb = el("input"); cb.type = "checkbox"; cb.checked = c.on !== false;
      cb.addEventListener("change", function () { c.on = cb.checked; commit(); });
      var txt = el("span"); txt.appendChild(el("b", null, c.name)); txt.appendChild(el("small", null, P.feedAbout[c.feed] || ""));
      lab.append(cb, txt);
      var sel = perSelect(c, "Cards a day from " + c.name);
      sel.disabled = c.feed === "world";
      sel.addEventListener("change", function () { c.perDay = +sel.value; commit(); });
      li.append(lab, sel); fl.appendChild(li);
    });
  }
  $("plManage").addEventListener("click", function () { paintCatsSheet(); cs.showModal(); });
  $("plNewCatAdd").addEventListener("click", function () {
    var v = $("plNewCat").value.trim(); if (!v) return;
    P.addCat(v); $("plNewCat").value = ""; paintCatsSheet(); render();
  });
  $("plNewCat").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("plNewCatAdd").click(); } });

  /* ------------------------------------------------------------ answered */
  function paintAnswered() {
    var rows = [];
    P.subjects().forEach(function (s) {
      (s.notes || []).forEach(function (n) { if (n.answered) rows.push({ who: s.name, text: n.text, at: n.answeredAt, answer: n.answer, id: s.id }); });
    });
    if (R) R.all().forEach(function (x) {
      if (x.kind !== "thanks" && x.answered) rows.push({ who: x.who, text: x.text, at: x.answeredAt, answer: x.answer });
    });
    rows.sort(function (a, b) { return (b.at || "").localeCompare(a.at || ""); });
    var box = $("plAnsweredList"); box.textContent = "";
    rows.forEach(function (r) {
      var c = el("article", "pr-card answered");
      if (r.who) c.appendChild(el("p", "pr-card-top")).appendChild(el("b", "pr-who", r.who));
      c.appendChild(el("p", "pr-text", r.text));
      var a = el("div", "pr-answer"); a.appendChild(el("b", null, "Answered " + nice(r.at)));
      if (r.answer) a.appendChild(el("p", null, r.answer));
      c.appendChild(a); box.appendChild(c);
    });
    $("plAnsweredEmpty").hidden = rows.length > 0;
  }

  /* ------------------------------------------------------------ thank-yous */
  function paintThanks() {
    var ul = $("plThanksList"); ul.textContent = "";
    if (!R) return;
    var list = R.all().filter(function (x) { return x.kind === "thanks"; });
    if (!list.length) ul.appendChild(el("li", "pl-thanks-empty", "Note down what you’re grateful for. Little things count."));
    list.forEach(function (x) {
      var li = el("li");
      li.appendChild(el("span", null, x.text));
      li.appendChild(el("small", null, nice(x.at)));
      li.appendChild(btn("pl-mini danger", "Delete", function () { if (confirm("Delete this thank-you?")) { R.remove(x.at); paintThanks(); } }, "Delete thank-you"));
      ul.appendChild(li);
    });
  }
  $("plThanksForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("plThanksText").value.trim(); if (!v || !R) return;
    R.add({ text: v, kind: "thanks", cat: "other" }); $("plThanksText").value = ""; paintThanks();
  });

  /* ------------------------------------------------------------ tabs */
  var tabs = document.querySelectorAll(".pl-tabs [role=tab]");
  var panels = { list: $("plList"), answered: $("plAnswered"), thanks: $("plThanks") };
  function showTab(name) {
    tabs.forEach(function (t) { var on = t.dataset.tab === name; t.classList.toggle("on", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
    if (name === "answered") paintAnswered();
    if (name === "thanks") paintThanks();
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { showTab(t.dataset.tab); }); });

  function render() { paintToday(); paintList(); if (!panels.answered.hidden) paintAnswered(); }

  // Arriving from the prayer wall's "Add to my prayers"
  var params = new URLSearchParams(location.search);
  if (params.get("add")) {
    history.replaceState(null, "", location.pathname);
    setTimeout(function () { editCard(null, { cat: P.cat("church") ? "church" : null, note: params.get("add").slice(0, 500) }); }, 50);
  }
  if (params.get("tab") && panels[params.get("tab")]) showTab(params.get("tab"));

  render();
  P.refreshFeeds().then(function () { paintToday(); });
  var syncs = [P.sync()];
  if (R && R.sync) syncs.push(R.sync());
  Promise.all(syncs).then(function (r) { if (r.some(Boolean)) render(); });
})();
