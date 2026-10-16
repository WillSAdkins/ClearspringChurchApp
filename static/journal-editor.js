/* Clearspring — the study journal (SOAP) and sermon-notes editors.
   Every field autosaves to this device (and the account, when signed in).
   ?id=… edits an entry; ?ref=… starts a journal entry on a passage. */
(function () {
  "use strict";
  var main = document.querySelector(".jx");
  if (!main || !window.Study) return;
  var KIND = main.getAttribute("data-kind");
  var params = new URLSearchParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var status = $("jxStatus");
  var fields = Array.prototype.slice.call(main.querySelectorAll("[data-field]"));

  var item = params.get("id") ? window.Study.get(KIND, params.get("id")) : null;
  var isNew = !item;
  item = item || { kind: KIND };

  // Fill in the form
  fields.forEach(function (f) {
    var k = f.getAttribute("data-field");
    if (item[k] != null) f.value = item[k];
  });
  if (isNew) {
    if (params.get("ref") && $("jxRef")) $("jxRef").value = params.get("ref");
    if (params.get("translation") && $("jxTrans")) {
      var t = params.get("translation");
      if ([].some.call($("jxTrans").options, function (o) { return o.value === t; })) $("jxTrans").value = t;
    }
    if ($("jxDate") && !$("jxDate").value) $("jxDate").value = new Date().toISOString().slice(0, 10);
  }

  var tagField = window.TagField($("jxTags"), item.tags || [], function () { schedule(); });

  /* ---------- saving ---------- */
  function hasContent() {
    return fields.some(function (f) {
      var k = f.getAttribute("data-field");
      return k !== "translation" && k !== "date" && f.value.trim();
    });
  }
  var timer;
  function schedule() { clearTimeout(timer); status.textContent = "Saving…"; timer = setTimeout(save, 500); }
  function save() {
    if (!hasContent() && !item.id) { status.textContent = ""; return; }
    fields.forEach(function (f) { item[f.getAttribute("data-field")] = f.value; });
    var found = $("jxRef") ? window.BibleRefs.parse($("jxRef").value) : null;
    item.slug = found ? found.slug : null;
    item.chapter = found ? found.chapter : null;
    item.verse = found ? found.verse : null;
    item.refLabel = found ? found.label : (item.ref || "");
    item.tags = tagField.get();
    item = window.Study.save(KIND, item);
    if (!params.get("id")) {
      params.set("id", item.id); params.delete("ref");
      history.replaceState(null, "", location.pathname + "?" + params.toString());
    }
    $("jxDelete").hidden = false;
    status.textContent = "Saved";
  }
  fields.forEach(function (f) { f.addEventListener("input", schedule); f.addEventListener("change", schedule); });
  window.addEventListener("pagehide", function () { if (timer) { clearTimeout(timer); save(); } });
  $("jxDelete").hidden = !item.id;
  $("jxDelete").addEventListener("click", function () {
    if (!confirm(KIND === "soap" ? "Delete this journal entry?" : "Delete these notes?")) return;
    clearTimeout(timer); timer = null;
    window.Study.remove(KIND, item.id);
    location.href = "/bible/study?f=" + KIND;
  });

  /* ---------- the passage link under the reference ---------- */
  function paintRefLink() {
    var box = $("jxRefLinks"); if (!box || !$("jxRef")) return;
    box.textContent = "";
    var r = window.BibleRefs.parse($("jxRef").value);
    if (!r) return;
    var a = document.createElement("a");
    a.href = "/bible/read/" + r.slug + "/" + r.chapter + (r.verse ? "?v=" + r.verse : "");
    a.textContent = "Open " + r.label + " in the Bible";
    box.appendChild(a);
  }
  if ($("jxRef")) $("jxRef").addEventListener("input", paintRefLink);
  paintRefLink();

  /* ---------- SOAP: fill in the passage text ---------- */
  var lookup = $("jxLookup");
  function fill(auto) {
    var ref = $("jxRef").value.trim(), err = $("jxRefError");
    err.hidden = true;
    if (!ref) { if (!auto) { err.textContent = "Type a reference first, like John 15:1-8."; err.hidden = false; } return; }
    lookup.disabled = true; lookup.textContent = "…";
    fetch("/api/passage?ref=" + encodeURIComponent(ref) + "&translation=" + encodeURIComponent($("jxTrans").value))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) { err.textContent = d.error || "Couldn't find that passage."; err.hidden = false; return; }
        $("jxRef").value = d.ref;
        $("jxPassage").value = d.text + (d.truncated ? " …" : "");
        paintRefLink();
        schedule();
      })
      .catch(function () { err.textContent = "Couldn't reach the Bible text just now. You can type or paste it instead."; err.hidden = false; })
      .then(function () { lookup.disabled = false; lookup.textContent = "Fill in"; });
  }
  if (lookup) {
    lookup.addEventListener("click", function () { fill(false); });
    $("jxRef").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); fill(false); } });
    $("jxTrans").addEventListener("change", function () { if ($("jxRef").value.trim()) fill(true); });
    if (isNew && params.get("ref")) fill(true);
  }

  /* ---------- Sermon notes: passages mentioned ---------- */
  var notes = $("jxNotes");
  function paintMentioned() {
    var box = $("jxMentioned"), list = $("jxMentionedList");
    if (!box) return;
    var seen = {}, found = window.BibleRefs.find(notes.value, true).filter(function (r) {
      if (seen[r.label]) return false; seen[r.label] = 1; return true;
    });
    list.textContent = "";
    found.forEach(function (r) {
      var a = document.createElement("a"); a.className = "jx-chip"; a.href = r.href; a.textContent = r.label;
      list.appendChild(a);
    });
    box.hidden = !found.length;
  }
  if (notes && $("jxMentioned")) { notes.addEventListener("input", paintMentioned); paintMentioned(); }

  if (window.Study.merge && params.get("id") === null) window.Study.merge(KIND);
})();
