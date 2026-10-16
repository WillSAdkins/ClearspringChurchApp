/* Clearspring — "Sync everything now" and "Download from this device". */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function highlightsUp() {
    // Highlights only pull by themselves; send up any this device has that the account doesn't.
    var H = window.Highlights;
    if (!H || !window.Sync) return Promise.resolve(false);
    return H.pullFromAccount().then(function () {
      return window.Sync.pull("highlight").then(function (remote) {
        var have = {}; remote.forEach(function (r) { have[r.key] = 1; });
        var key = function (h) { return h.ref + "|" + h.translation + "|" + h.text; };
        var missing = H.getAll().filter(function (h) { return !have[key(h)]; }).map(function (h) { return { key: key(h), value: h }; });
        return missing.length ? window.Sync.pushAll("highlight", missing) : true;
      });
    });
  }

  var JOBS = [
    ["Settings and markers", function () { return window.PrefsSync ? window.PrefsSync.run(true) : null; }],
    ["Saved verses", function () { return window.SavedVerses && window.SavedVerses.syncWithAccount(); }],
    ["Highlights", highlightsUp],
    ["Notes, journal and sermon notes", function () { return window.Study && window.Study.mergeAll(); }],
    ["Reading plans and log", function () { return window.Plans && window.Plans.syncAll(); }],
    ["Where you were reading", function () { return window.ReadingPosition && window.ReadingPosition.syncWithAccount(); }],
    ["Memory verses", function () { return window.Memory && window.Memory.syncWithAccount(); }],
    ["My prayers", function () { return window.Prayers && window.Prayers.sync(); }],
    ["Grow", function () { return window.Grow && window.Grow.sync(); }],
  ];

  var go = $("syGo");
  if (go) go.addEventListener("click", function () {
    go.disabled = true; go.textContent = "Syncing…";
    var list = $("syList"); list.textContent = "";
    var rows = JOBS.map(function (j) { var li = el("li", "sy-item", j[0]); li.appendChild(el("span", "sy-state", "…")); list.appendChild(li); return li; });
    var failed = 0;
    Promise.all(JOBS.map(function (j, i) {
      var p;
      try { p = Promise.resolve(j[1]()); } catch (e) { p = Promise.reject(e); }
      return p.then(function () { rows[i].classList.add("ok"); rows[i].querySelector(".sy-state").textContent = "✓"; })
        .catch(function () { failed++; rows[i].classList.add("bad"); rows[i].querySelector(".sy-state").textContent = "Try again"; });
    })).then(function () {
      go.disabled = false; go.textContent = "Sync everything now";
      $("syStatus").textContent = failed ? "Some things couldn’t sync. Check your connection and try again." : "All up to date. Refresh the page to see the new totals.";
    });
  });

  var local = $("syLocal");
  if (local) local.addEventListener("click", function () {
    var out = { exported_at: new Date().toISOString(), device: navigator.userAgent, data: {} };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!/^cs_/.test(k) || /^cs_plan_def_/.test(k) || k === "cs_native_push_token") continue;
        var v = localStorage.getItem(k);
        try { out.data[k] = JSON.parse(v); } catch (e) { out.data[k] = v; }
      }
    } catch (e) {}
    var blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clearspring-this-device-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });
})();
