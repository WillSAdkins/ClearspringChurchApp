/* Clearspring guide: ask in your own words (or out loud) and it takes you there.

   The conversation is kept for this visit only (sessionStorage), so after it
   takes you to a page you can open it again and carry on. Nothing is saved
   on the server. */
(function () {
  "use strict";
  var fab = document.getElementById("guideFab"), sheet = document.getElementById("guide");
  if (!fab || !sheet) return;
  var log = document.getElementById("guideLog"), form = document.getElementById("guideForm"),
      input = document.getElementById("guideQ"), mic = document.getElementById("guideMic"),
      chips = document.getElementById("guideChips");
  var KEY = "cs_guide", busy = false, spoke = false;
  var csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || "";

  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(list) { try { sessionStorage.setItem(KEY, JSON.stringify(list.slice(-30))); } catch (e) {} }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function bubble(m) {
    var b = el("div", "gd-msg " + (m.who === "me" ? "gd-me" : "gd-bot"));
    b.appendChild(el("p", "gd-text", m.text));
    (m.links || []).forEach(function (l) {
      var a = el("a", "gd-link"); a.href = l.url;
      a.appendChild(el("b", null, l.title));
      if (l.about) a.appendChild(el("span", null, l.about));
      a.addEventListener("click", function () { close(true); });
      b.appendChild(a);
    });
    log.appendChild(b);
  }
  function render() {
    log.textContent = "";
    var list = load();
    if (!list.length) bubble({ who: "bot", text: "Hello! Where would you like to go? Ask in your own words, like “when is church?” or “John 3:16”." });
    list.forEach(bubble);
    log.scrollTop = log.scrollHeight;
  }
  function setChips(list) {
    chips.textContent = "";
    (list || []).forEach(function (t) {
      var c = el("button", "gd-chip", t); c.type = "button";
      c.addEventListener("click", function () { send(t); });
      chips.appendChild(c);
    });
    chips.hidden = !chips.children.length;
  }

  function open() {
    sheet.hidden = false; document.body.classList.add("gd-open");
    fab.setAttribute("aria-expanded", "true");
    render();
    if (!load().length) setChips(JSON.parse(chips.dataset.start || "[]"));
    setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
  }
  function close(leaving) {
    sheet.hidden = true; document.body.classList.remove("gd-open");
    fab.setAttribute("aria-expanded", "false");
    stopListening();
    if (!leaving) fab.focus({ preventScroll: true });
  }

  function speak(text) {
    try {
      if (!spoke || !("speechSynthesis" in window)) return;
      var u = new SpeechSynthesisUtterance(text); u.lang = "en-GB"; u.rate = 1;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true; setChips([]);
    var list = load(); list.push({ who: "me", text: text }); save(list); render();
    var typing = el("div", "gd-msg gd-bot gd-typing"); typing.appendChild(el("span")); typing.appendChild(el("span")); typing.appendChild(el("span"));
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    input.value = "";
    fetch("/api/guide", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
                          body: JSON.stringify({ q: text, page: location.pathname }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var l2 = load(); l2.push({ who: "bot", text: d.reply || "Sorry, I didn't catch that.", links: d.links || [] }); save(l2);
        render(); setChips(d.suggest);
        speak(d.reply);
        if (d.go && d.go !== location.pathname + location.search) {
          setTimeout(function () { close(true); location.href = d.go; }, 650);
        }
      })
      .catch(function () {
        var l2 = load(); l2.push({ who: "bot", text: "I can't reach the app just now. Check your connection and try again." }); save(l2); render();
      })
      .then(function () { busy = false; spoke = false; });
  }

  // Talking to it (where the browser supports speech recognition).
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false;
  function stopListening() { if (rec && listening) { try { rec.stop(); } catch (e) {} } }
  if (Rec && mic) {
    mic.hidden = false;
    mic.addEventListener("click", function () {
      if (listening) { stopListening(); return; }
      try {
        rec = new Rec(); rec.lang = "en-GB"; rec.interimResults = true; rec.maxAlternatives = 1;
        rec.onstart = function () { listening = true; mic.classList.add("on"); mic.setAttribute("aria-pressed", "true"); input.placeholder = "Listening…"; };
        rec.onresult = function (e) {
          var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
          input.value = t;
          if (e.results[e.results.length - 1].isFinal) { spoke = true; send(t); }
        };
        rec.onerror = function (e) {
          if (e.error === "not-allowed" || e.error === "service-not-allowed") input.placeholder = "Microphone blocked: type instead";
        };
        rec.onend = function () { listening = false; mic.classList.remove("on"); mic.setAttribute("aria-pressed", "false"); if (input.placeholder === "Listening…") input.placeholder = input.dataset.ph; };
        rec.start();
      } catch (e) { mic.hidden = true; }
    });
  }

  fab.addEventListener("click", function () { sheet.hidden ? open() : close(); });
  sheet.querySelector(".gd-x").addEventListener("click", function () { close(); });
  sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) close(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
  var clear = sheet.querySelector(".gd-clear");
  if (clear) clear.addEventListener("click", function () { save([]); render(); setChips(JSON.parse(chips.dataset.start || "[]")); });
  // Anything can open the guide: <a data-guide>, or ?ask=… in a link.
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-guide]");
    if (!t) return;
    e.preventDefault(); open();
    if (t.dataset.guide) send(t.dataset.guide);
  });
  window.ClearspringGuide = { open: open, ask: function (q) { open(); send(q); } };
})();
