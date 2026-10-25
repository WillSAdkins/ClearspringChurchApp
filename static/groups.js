/* Clearspring — the small bits of behaviour on a group's page. */
(function () {
  "use strict";
  var root = document.getElementById("gr"); if (!root) return;

  // Composer: Post / Check in / Share a verse
  document.querySelectorAll(".gr-compose-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".gr-compose-tabs button").forEach(function (x) {
        var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on ? "true" : "false");
        var pane = document.getElementById(x.dataset.pane); if (pane) pane.hidden = !on;
      });
    });
  });

  // "I've prayed" without leaving the page
  document.querySelectorAll(".gp-pray").forEach(function (b) {
    b.addEventListener("click", function () {
      b.disabled = true;
      fetch(b.dataset.url, { method: "POST" }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) return;
        b.classList.toggle("on", d.on); b.setAttribute("aria-pressed", d.on ? "true" : "false");
        b.innerHTML = "🙏 <span>" + (d.on ? "Prayed" : "I’ve prayed") + "</span>" + (d.count ? " · <i>" + d.count + "</i>" : "");
        if (d.on && window.Prayers) try { window.Prayers.logDay(); } catch (e) {}
      }).catch(function () {}).then(function () { b.disabled = false; });
    });
  });

  // Invite link
  var share = document.getElementById("grShare"), copy = document.getElementById("grCopy");
  function copyText(t, btn, done) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { btn.textContent = done; });
  }
  if (share) share.addEventListener("click", function () {
    var text = "Join " + share.dataset.name + " on the Clearspring app:";
    if (navigator.share) navigator.share({ title: share.dataset.name, text: text, url: share.dataset.url }).catch(function () {});
    else copyText(text + " " + share.dataset.url, share, "Invite copied");
  });
  if (copy) copy.addEventListener("click", function () { copyText(copy.dataset.url, copy, "Link copied"); });

  // Join the group's plan on this device, on the same days as everyone else
  var plan = document.getElementById("grPlan"), P = window.Plans;
  if (plan && P) {
    var slug = plan.dataset.slug, start = plan.dataset.start, box = document.getElementById("grJoin");
    var mine = P.mine(slug);
    if (!mine || mine.start !== start) box.hidden = false;
    document.getElementById("grJoinBtn").addEventListener("click", function () {
      var cur = P.mine(slug);
      if (cur && cur.start && cur.start !== start &&
          !confirm("You’re already reading this plan on your own. Restart it to keep in step with the group?")) return;
      P.start(slug, { start: start });
      this.textContent = "Joined ✓"; this.disabled = true;
      setTimeout(function () { location.reload(); }, 900);
    });
  }

  // Jump to a post we were sent to, and open its reply box
  if (location.hash && /^#p\d+$/.test(location.hash)) {
    var el = document.querySelector(location.hash);
    if (el) el.classList.add("flash");
  }
})();
