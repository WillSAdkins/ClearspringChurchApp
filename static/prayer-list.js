/* Clearspring — "My prayers": add, pray, mark answered, look back. */
(function () {
  "use strict";
  var R = window.Prayers; if (!R) return;
  var $ = function (id) { return document.getElementById(id); };
  var CAT = {}; R.CATS.forEach(function (c) { CAT[c[0]] = c[1]; });
  var DAYN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var state = { f: "open", cat: "" }, chosenCat = "other";

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function nice(iso) {
    if (!iso) return "";
    var d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso), t = R.today();
    var k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (k === t) return "today";
    var y = new Date(); y.setDate(y.getDate() - 1);
    if (k === y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0")) return "yesterday";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  }
  function daysLabel(days) {
    if (!days || !days.length || days.length === 7) return "Every day";
    var s = days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
    if (s.join() === "1,2,3,4,5") return "Weekdays";
    if (s.join() === "6,0") return "Weekends";
    return s.map(function (d) { return DAYN[d]; }).join(", ");
  }

  /* ---------- add form ---------- */
  var cats = $("prCats");
  R.CATS.forEach(function (c) {
    var b = el("button", "pr-cat" + (c[0] === chosenCat ? " on" : ""), c[1]); b.type = "button"; b.dataset.c = c[0];
    b.addEventListener("click", function () {
      chosenCat = c[0];
      cats.querySelectorAll(".pr-cat").forEach(function (x) { x.classList.toggle("on", x.dataset.c === chosenCat); });
    });
    cats.appendChild(b);
  });
  function chosenDays() { return Array.prototype.slice.call(document.querySelectorAll(".pr-day.on")).map(function (b) { return +b.dataset.d; }); }
  $("prDays").addEventListener("click", function (e) {
    var b = e.target.closest(".pr-day"); if (!b) return;
    b.classList.toggle("on"); b.setAttribute("aria-pressed", b.classList.contains("on") ? "true" : "false");
    var d = chosenDays();
    $("prDaysHint").textContent = d.length ? "On " + daysLabel(d).toLowerCase().replace(/^every day$/, "every day") + "." : "Every day, or choose days so a long list spreads across the week.";
  });
  var form = $("prAdd");
  function kind() { return form.querySelector("input[name=kind]:checked").value; }
  form.addEventListener("change", function () {
    $("prMore").hidden = kind() === "thanks";
    $("prText").placeholder = kind() === "thanks" ? "What are you thankful for today?" : "What are you praying for?";
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = $("prText").value.trim();
    if (!text) { $("prText").focus(); return; }
    var k = kind();
    var d = chosenDays();
    R.add(k === "thanks" ? { text: text, kind: "thanks", cat: "other" }
                         : { text: text, who: $("prWho").value.trim(), cat: chosenCat, days: d.length && d.length < 7 ? d : null });
    $("prText").value = ""; $("prWho").value = "";
    document.querySelectorAll(".pr-day.on").forEach(function (b) { b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); });
    state.f = k === "thanks" ? "thanks" : "open";
    render();
  });

  /* ---------- list ---------- */
  $("prFilter").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.f = b.dataset.f; state.cat = ""; render();
  });

  function card(it) {
    var c = el("article", "pr-card" + (it.answered ? " answered" : "") + (it.kind === "thanks" ? " thanks" : ""));
    var top = el("p", "pr-card-top");
    if (it.kind === "thanks") top.appendChild(el("span", "pr-tag thanks", "Thank you"));
    else {
      if (it.who) top.appendChild(el("b", "pr-who", it.who));
      top.appendChild(el("span", "pr-tag", CAT[it.cat] || "Other"));
    }
    c.appendChild(top);
    c.appendChild(el("p", "pr-text", it.text));
    if (it.answered) {
      var ans = el("div", "pr-answer");
      ans.appendChild(el("b", null, "Answered " + nice(it.answeredAt)));
      if (it.answer) ans.appendChild(el("p", null, it.answer));
      c.appendChild(ans);
    }
    var meta = [];
    if (it.kind === "request" && !it.answered) meta.push(daysLabel(it.days));
    if (it.prayed) meta.push("prayed " + it.prayed + (it.prayed === 1 ? " time" : " times") + (it.lastPrayed ? ", last " + nice(it.lastPrayed) : ""));
    meta.push("added " + nice(it.at));
    c.appendChild(el("p", "pr-meta", meta.join(" · ")));

    var acts = el("div", "pr-acts");
    function act(label, fn, cls) { var b = el("button", "pr-act" + (cls ? " " + cls : ""), label); b.type = "button"; b.addEventListener("click", fn); acts.appendChild(b); return b; }
    if (it.kind === "request" && !it.answered) {
      var p = act(it.lastPrayed === R.today() ? "Prayed today ✓" : "I’ve prayed", function () { R.prayedFor(it.at); render(); }, "primary");
      if (it.lastPrayed === R.today()) p.classList.add("done");
      act("Answered…", function () {
        var box = el("div", "pr-answer-form");
        var ta = el("textarea"); ta.rows = 2; ta.placeholder = "How was it answered? (optional)"; ta.maxLength = 1000;
        var save = el("button", "pr-act primary", "Mark answered"); save.type = "button";
        save.addEventListener("click", function () { R.update(it.at, { answered: true, answeredAt: new Date().toISOString(), answer: ta.value.trim() }); state.f = "answered"; render(); });
        box.append(ta, save); c.insertBefore(box, acts); acts.hidden = true; ta.focus();
      });
    } else if (it.answered) {
      act("Still praying", function () { R.update(it.at, { answered: false, answeredAt: null }); render(); });
    }
    act("Edit", function () {
      var ta = el("textarea", "pr-edit"); ta.value = it.text; ta.rows = 3;
      var save = el("button", "pr-act primary", "Save"); save.type = "button";
      save.addEventListener("click", function () { if (ta.value.trim()) R.update(it.at, { text: ta.value.trim() }); render(); });
      c.replaceChildren(ta, save); ta.focus();
    });
    act("Delete", function () { if (confirm("Delete this?")) { R.remove(it.at); render(); } }, "danger");
    c.appendChild(acts);
    return c;
  }

  function render() {
    var items = R.all();
    $("prFilter").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.f === state.f); });
    var shown = items.filter(function (x) {
      if (state.f === "thanks") return x.kind === "thanks";
      if (x.kind === "thanks") return false;
      return state.f === "answered" ? x.answered : !x.answered;
    });
    // category chips (requests only)
    var cf = $("prCatFilter"); cf.textContent = "";
    if (state.f !== "thanks") {
      var used = {}; shown.forEach(function (x) { used[x.cat] = (used[x.cat] || 0) + 1; });
      var keys = Object.keys(used);
      if (keys.length > 1) {
        [["", "All"]].concat(R.CATS.filter(function (c) { return used[c[0]]; })).forEach(function (c) {
          var b = el("button", "pr-cat" + (state.cat === c[0] ? " on" : ""), c[1] + (c[0] ? " " + used[c[0]] : "")); b.type = "button";
          b.addEventListener("click", function () { state.cat = c[0]; render(); });
          cf.appendChild(b);
        });
      }
      if (state.cat) shown = shown.filter(function (x) { return x.cat === state.cat; });
    }
    if (state.f === "answered") shown.sort(function (a, b) { return (b.answeredAt || "").localeCompare(a.answeredAt || ""); });
    var list = $("prList"); list.textContent = "";
    shown.forEach(function (x) { list.appendChild(card(x)); });
    $("prEmpty").hidden = shown.length > 0;
    $("prEmptyTitle").textContent = state.f === "answered" ? "No answered prayers yet" : state.f === "thanks" ? "No thank-yous yet" : "Nothing here yet";
    $("prEmptySub").textContent = state.f === "answered" ? "When God answers a prayer, mark it here. Looking back is a gift." :
      state.f === "thanks" ? "Note down what you’re grateful for. Little things count." :
      "Add the people and things you’re praying for. When a prayer is answered, mark it. It’s good to look back on.";
    var n = R.forToday().length;
    $("prNowText").textContent = n ? n + (n === 1 ? " prayer" : " prayers") + " for today, and a few quiet minutes with God" : "A few quiet minutes with God";
  }

  // Arriving from the prayer wall: "Add to my prayers"
  var params = new URLSearchParams(location.search);
  if (params.get("add")) {
    $("prText").value = params.get("add");
    chosenCat = "church";
    cats.querySelectorAll(".pr-cat").forEach(function (x) { x.classList.toggle("on", x.dataset.c === "church"); });
    history.replaceState(null, "", location.pathname);
    $("prText").focus();
  }

  render();
  R.sync().then(function (ok) { if (ok) render(); });
})();
