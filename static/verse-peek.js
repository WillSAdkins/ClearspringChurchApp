/* Clearspring — tap a Bible reference in the library to read the verse in
   place (like hovering on a study site), with a link through to its page. */
(function () {
  "use strict";
  var pop = document.createElement("div");
  pop.className = "lib-peek"; pop.hidden = true; pop.setAttribute("role", "dialog");
  pop.innerHTML = '<p class="lib-peek-ref"></p><p class="lib-peek-text"></p><a class="lib-peek-go">Open the verse →</a>';
  document.body.appendChild(pop);
  var refEl = pop.querySelector(".lib-peek-ref"), textEl = pop.querySelector(".lib-peek-text"), go = pop.querySelector(".lib-peek-go");
  var cache = {};

  function place(a) {
    var r = a.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 32);
    pop.style.width = w + "px";
    pop.style.left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 16)) + "px";
    var below = r.bottom + window.scrollY + 8;
    pop.style.top = below + "px";
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='/bible/v/']");
    if (!a || !a.closest(".lib-article, .lib-topic, .cm-body, .lib-peekable")) {
      if (!pop.hidden && !pop.contains(e.target)) pop.hidden = true;
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    var m = /\/bible\/v\/([^/]+)\/(\d+)\/(\d+)/.exec(a.getAttribute("href"));
    if (!m) return;
    go.href = a.getAttribute("href");
    refEl.textContent = a.textContent;
    textEl.textContent = "…";
    place(a);
    pop.hidden = false;
    var key = m[1] + "." + m[2] + "." + m[3];
    function show(d) { if (d && d.ok) { refEl.textContent = d.ref; textEl.textContent = d.text; } else textEl.textContent = "Couldn't load this verse."; }
    if (cache[key]) return show(cache[key]);
    fetch("/api/passage?slug=" + m[1] + "&ch=" + m[2] + "&v=" + m[3]).then(function (r) { return r.json(); })
      .then(function (d) { cache[key] = d; show(d); }).catch(function () { show(null); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") pop.hidden = true; });
})();
