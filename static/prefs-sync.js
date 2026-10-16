/* Clearspring — keep small settings and markers in step across devices.

   Covers what the other stores don't: appearance, reader settings, devotionals
   marked read, prayer-wall requests you've prayed for, the private keys that
   let you update your own wall requests, and your days of prayer.

   Runs quietly on any page when signed in, at most every ten minutes. When
   two devices disagree, lists are combined (nothing is lost) and, for single
   settings, the device changed most recently wins. */
window.PrefsSync = (function () {
  "use strict";
  var SCALARS = ["cs_theme", "cs_text_size", "cs_reader_prefs", "cs_reading_bg", "cs_audio_prefs", "cs_autoplay", "cs_bell"];
  var LISTS = ["cs_devos_read", "cs_prayed", "cs_my_requests"];
  var MAPS = ["cs_prayer_days"];
  var SNAP = "cs_prefs_sync";

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function parse(v, d) { try { var x = JSON.parse(v); return x == null ? d : x; } catch (e) { return d; } }

  function snapshot() {
    var s = {};
    SCALARS.concat(LISTS, MAPS).forEach(function (k) { var v = get(k); if (v != null) s[k] = v; });
    return s;
  }
  function hash(s) { return JSON.stringify(Object.keys(s).sort().map(function (k) { return [k, s[k]]; })); }

  function union(a, b) {
    var out = parse(a, []), seen = {};
    if (!Array.isArray(out)) out = [];
    out.forEach(function (x) { seen[JSON.stringify(x)] = 1; });
    parse(b, []).forEach(function (x) { var k = JSON.stringify(x); if (!seen[k]) { seen[k] = 1; out.push(x); } });
    return JSON.stringify(out);
  }
  function mergeMap(a, b) {
    var x = parse(a, {}), y = parse(b, {});
    Object.keys(y).forEach(function (k) { x[k] = Math.max(+x[k] || 0, +y[k] || 0); });
    return JSON.stringify(x);
  }

  function apply(values, scalarsToo) {
    var changed = false;
    if (scalarsToo) SCALARS.forEach(function (k) { if (k in values && values[k] !== get(k)) { set(k, values[k]); changed = true; } });
    LISTS.forEach(function (k) { if (values[k] != null) { var m = union(get(k), values[k]); if (m !== get(k)) { set(k, m); changed = true; } } });
    MAPS.forEach(function (k) { if (values[k] != null) { var m = mergeMap(get(k), values[k]); if (m !== get(k)) { set(k, m); changed = true; } } });
    if (changed && scalarsToo) {
      var t = get("cs_theme"); if (t) document.documentElement.setAttribute("data-theme", t);
      var z = get("cs_text_size"); if (z) document.documentElement.setAttribute("data-text-size", z);
    }
    return changed;
  }

  function run(force) {
    if (!window.Sync) return Promise.resolve("off");
    try {
      if (!force && Date.now() - (+sessionStorage.getItem("cs_prefs_synced") || 0) < 600000) return Promise.resolve("recent");
    } catch (e) {}
    var last = parse(get(SNAP), {});
    // A device syncing for the first time takes the account's settings.
    var now = snapshot(), localChanged = last.h ? hash(now) !== last.h : false;
    return window.Sync.pullSingle("prefs", "state").then(function (remote) {
      var remoteNewer = remote && remote.u && remote.u > (last.u || "");
      if (remote && remote.v) apply(remote.v, remoteNewer && !localChanged);
      var merged = snapshot(), stamp = new Date().toISOString();
      var needPush = localChanged || !remote || hash(merged) !== hash(remote.v || {});
      var done = needPush ? window.Sync.pushSingle("prefs", "state", { u: stamp, v: merged }) : Promise.resolve(true);
      return done.then(function () {
        set(SNAP, JSON.stringify({ h: hash(snapshot()), u: needPush ? stamp : (remote && remote.u) || stamp }));
        try { sessionStorage.setItem("cs_prefs_synced", String(Date.now())); } catch (e) {}
        return "ok";
      });
    }).catch(function () { return "error"; });
  }

  return { run: run, snapshot: snapshot };
})();

(function () {
  "use strict";
  var signedIn = (document.querySelector('meta[name="member-signed-in"]') || {}).content === "true";
  if (signedIn) window.PrefsSync.run(false);

  // Tie this phone's notifications to the signed-in member (or untie them
  // after signing out), once per visit, so group notifications reach the
  // right people.
  try {
    var flag = signedIn ? "in" : "out";
    if (sessionStorage.getItem("cs_push_claim") === flag) return;
    var token = localStorage.getItem("cs_native_push_token");
    var send = function (body) {
      return fetch("/api/push/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function () { sessionStorage.setItem("cs_push_claim", flag); }).catch(function () {});
    };
    if (token) { send({ native_token: token }); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg || !reg.pushManager) return null;
      return reg.pushManager.getSubscription();
    }).then(function (sub) { if (sub) send({ endpoint: sub.endpoint }); }).catch(function () {});
  } catch (e) {}
})();
