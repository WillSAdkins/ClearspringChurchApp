/* Clearspring — personal study store.
   Verse notes, study-journal (SOAP) entries and sermon notes. Kept on this
   device first (works signed out and offline) and synced to the account when
   signed in. Each item has an id and an "updated" time; when two devices
   disagree the newer edit wins. Deleting leaves a small marker so a delete on
   one device isn't undone by another device that still has the old copy. */
window.Study = (function () {
  "use strict";

  var KEYS = { vnote: "cs_verse_notes", soap: "cs_soap", talk: "cs_sermon_notes" };

  function now() { return new Date().toISOString(); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function raw(kind) {
    try { var v = JSON.parse(localStorage.getItem(KEYS[kind]) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function persist(kind, list) {
    try { localStorage.setItem(KEYS[kind], JSON.stringify(list)); } catch (e) {}
  }
  function push(kind, item) {
    if (window.Sync) window.Sync.push(kind, item.id, item, false);
  }

  function all(kind) { return raw(kind).filter(function (x) { return x && !x.deleted; }); }
  function get(kind, id) { return all(kind).find(function (x) { return x.id === id; }) || null; }

  function save(kind, item) {
    var list = raw(kind);
    item = Object.assign({}, item);
    if (!item.id) item.id = uid();
    if (!item.created) item.created = now();
    item.updated = now();
    item.tags = cleanTags(item.tags);
    var i = list.findIndex(function (x) { return x.id === item.id; });
    if (i >= 0) list[i] = item; else list.unshift(item);
    persist(kind, list);
    push(kind, item);
    emit();
    return item;
  }

  function remove(kind, id) {
    var list = raw(kind);
    var i = list.findIndex(function (x) { return x.id === id; });
    var tomb = { id: id, deleted: true, updated: now() };
    if (i >= 0) list[i] = tomb; else list.push(tomb);
    persist(kind, list);
    push(kind, tomb);
    emit();
  }

  function cleanTags(tags) {
    var out = [];
    (tags || []).forEach(function (t) {
      t = String(t || "").trim().replace(/^#+/, "").replace(/\s+/g, " ").toLowerCase().slice(0, 30);
      if (t && out.indexOf(t) < 0) out.push(t);
    });
    return out.slice(0, 12);
  }

  function allTags() {
    var counts = {};
    Object.keys(KEYS).forEach(function (k) {
      all(k).forEach(function (x) { (x.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    });
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
  }

  /* Verse notes that cover a given verse. */
  function notesFor(slug, chapter, verse) {
    return all("vnote").filter(function (n) {
      if (n.slug !== slug || n.chapter !== chapter) return false;
      var a = n.verse || 1, b = n.endVerse || a;
      return verse == null || (verse >= a && verse <= b);
    });
  }

  /* Merge with the account: newest edit wins, both ways. */
  function merge(kind) {
    return fetch("/api/sync/" + kind).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.signed_in) return false;
      var local = raw(kind), byId = {};
      local.forEach(function (x) { byId[x.id] = x; });
      var remoteIds = {}, changed = false;
      (data.items || []).forEach(function (row) {
        var r = row.value; if (!r || !r.id) return;
        remoteIds[r.id] = r;
        var l = byId[r.id];
        if (!l || (r.updated || "") > (l.updated || "")) {
          if (l) local[local.indexOf(l)] = r; else local.push(r);
          byId[r.id] = r; changed = true;
        }
      });
      var up = local.filter(function (x) { var r = remoteIds[x.id]; return !r || (x.updated || "") > (r.updated || ""); });
      up.forEach(function (x) { push(kind, x); });
      if (changed) { persist(kind, local); emit(); }
      return true;
    }).catch(function () { return false; });
  }

  function mergeAll() { return Promise.all(Object.keys(KEYS).map(merge)); }

  var listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  return { all: all, get: get, save: save, remove: remove, allTags: allTags, cleanTags: cleanTags,
           notesFor: notesFor, merge: merge, mergeAll: mergeAll, onChange: onChange, KEYS: KEYS };
})();
