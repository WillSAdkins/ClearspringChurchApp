/* Clearspring — your own prayers.
   Private: kept on this device, and in your own account when signed in (the
   church never sees it). Builds on the old prayer journal (cs_prayer_journal),
   so nothing written there is lost.

   item: { at (id), text, who, cat, kind: "request"|"thanks", days: null|[0-6],
           answered, answeredAt, answer, prayed, lastPrayed, wall }            */
window.Prayers = (function () {
  "use strict";
  var KEY = "cs_prayer_journal", LOG = "cs_prayer_days";
  var CATS = [
    ["family", "Family"], ["friends", "Friends"], ["church", "Church"], ["work", "Work & school"],
    ["world", "The world"], ["me", "Me"], ["other", "Other"]
  ];

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function all() {
    return jget(KEY, []).map(function (x) {
      x.kind = x.kind || "request"; x.cat = x.cat || "other"; x.prayed = x.prayed || 0;
      return x;
    });
  }
  function persist(list) { jset(KEY, list); }
  function push(item, del) { if (window.Sync) window.Sync.push("journal", item.at, del ? null : item, !!del); }

  function add(fields) {
    var list = all();
    var item = Object.assign({ at: new Date().toISOString(), text: "", who: "", cat: "other", kind: "request",
                               days: null, answered: false, prayed: 0 }, fields);
    list.unshift(item); persist(list); push(item);
    return item;
  }
  function update(at, fields) {
    var list = all(), it = list.find(function (x) { return x.at === at; });
    if (!it) return null;
    Object.assign(it, fields); persist(list); push(it);
    return it;
  }
  function remove(at) {
    var list = all(), i = list.findIndex(function (x) { return x.at === at; });
    if (i < 0) return;
    var it = list.splice(i, 1)[0]; persist(list); push(it, true);
  }
  function prayedFor(at) {
    var it = all().find(function (x) { return x.at === at; });
    if (!it) return;
    update(at, { prayed: (it.prayed || 0) + 1, lastPrayed: today() });
    logDay();
  }

  /* For today: open requests set for today's weekday (or every day), the
     ones not prayed for longest first. */
  function forToday() {
    var dow = new Date().getDay();
    return all().filter(function (x) {
      return x.kind === "request" && !x.answered && (!x.days || !x.days.length || x.days.indexOf(dow) >= 0);
    }).sort(function (a, b) { return (a.lastPrayed || "").localeCompare(b.lastPrayed || ""); });
  }

  function logDay(minutes) {
    var l = jget(LOG, {}), t = today();
    l[t] = (l[t] || 0) + (minutes || 0) || l[t] || 1;
    jset(LOG, l);
    if (window.Sync) window.Sync.pushSingle("prayerlog", "days", l);
  }
  function days() { return jget(LOG, {}); }

  function sync() {
    if (!window.Sync) return Promise.resolve(false);
    return window.Sync.merge("journal", KEY, function (x) { return x.at; });
  }

  return { CATS: CATS, all: all, add: add, update: update, remove: remove, prayedFor: prayedFor, forToday: forToday,
           logDay: logDay, days: days, sync: sync, today: today };
})();
