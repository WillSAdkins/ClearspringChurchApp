/* Clearspring — Bible College progress: sessions ticked off and your notes.
   Kept on this device ("cs_college") and in your account when signed in
   (the "college" sync kind). Each course carries its own "u" (updated) time;
   when two devices disagree, the newer course wins. */
(function () {
  "use strict";
  var KEY = "cs_college";
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; } }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  var timer = null;
  function save(s, cid) {
    if (cid) s[cid].u = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    clearTimeout(timer);
    timer = setTimeout(function () { if (window.Sync) window.Sync.pushSingle("college", "state", load()); }, 1000);
  }
  function course(s, cid) { s[cid] = s[cid] || { u: "", done: {}, notes: {} }; s[cid].done = s[cid].done || {}; s[cid].notes = s[cid].notes || {}; return s[cid]; }
  function sync() {
    if (!window.Sync) return Promise.resolve(false);
    return window.Sync.pullSingle("college", "state").then(function (remote) {
      var local = load(), changed = false, push = false;
      if (remote && typeof remote === "object") {
        Object.keys(remote).forEach(function (cid) {
          var r = remote[cid], l = local[cid];
          if (r && (!l || (r.u || "") > (l.u || ""))) { local[cid] = r; changed = true; }
        });
        push = Object.keys(local).some(function (cid) { return !remote[cid] || (local[cid].u || "") > (remote[cid].u || ""); });
      } else push = Object.keys(local).length > 0;
      if (changed) try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (e) {}
      if (push) window.Sync.pushSingle("college", "state", local);
      return changed;
    }).catch(function () { return false; });
  }

  function render() {
    var s = load();
    // Course list: progress per course
    Array.prototype.forEach.call(document.querySelectorAll(".bc-prog[data-course]"), function (el) {
      var c = s[el.getAttribute("data-course")], n = c ? Object.keys(c.done || {}).length : 0, t = +el.getAttribute("data-total") || 0;
      el.textContent = n ? (n >= t && t ? "Completed ✓" : n + " of " + t + " done") : "";
    });
    var main = document.querySelector("main[data-course]"); if (!main) return;
    var cid = main.getAttribute("data-course"), c = course(s, cid), n = main.getAttribute("data-n");
    // Course page: ticks and a progress bar
    var items = document.querySelectorAll(".bc-sessions li[data-n]");
    Array.prototype.forEach.call(items, function (li) { li.classList.toggle("done", !!c.done[li.getAttribute("data-n")]); });
    var bar = document.getElementById("bcProgress");
    if (bar) {
      var total = +bar.getAttribute("data-total") || 0, done = Object.keys(c.done).length;
      bar.hidden = !done;
      bar.querySelector("i").style.width = (total ? Math.min(100, done / total * 100) : 0) + "%";
      bar.querySelector("small").textContent = done + " of " + total + " sessions done";
    }
    // Session page: notes and the done button
    var notes = document.getElementById("bcNotes"), btn = document.getElementById("bcDone");
    if (notes && n) {
      if (document.activeElement !== notes) notes.value = c.notes[n] || "";
      var on = !!c.done[n];
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "Done ✓ (tap to undo)" : "Mark this session as done";
    }
  }

  function wire() {
    var main = document.querySelector("main[data-course][data-n]"); if (!main) return;
    var cid = main.getAttribute("data-course"), n = main.getAttribute("data-n");
    var notes = document.getElementById("bcNotes"), btn = document.getElementById("bcDone"), saved = document.getElementById("bcSaved"), t = null;
    notes.addEventListener("input", function () {
      var s = load(); course(s, cid).notes[n] = notes.value.slice(0, 20000); save(s, cid);
      clearTimeout(t); t = setTimeout(function () { saved.textContent = "Saved."; }, 600);
    });
    btn.addEventListener("click", function () {
      var s = load(), c = course(s, cid);
      if (c.done[n]) delete c.done[n]; else c.done[n] = today();
      save(s, cid); render();
    });
  }

  window.College = { load: load, sync: sync };
  render(); wire();
  sync().then(function (changed) { if (changed) render(); });
})();
