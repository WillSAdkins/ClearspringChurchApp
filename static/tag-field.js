/* Clearspring — a small tag picker: type a tag and press Enter (or comma),
   tap a suggestion, tap a tag to remove it. TagField(container, tags, onChange) */
window.TagField = function (container, initial, onChange) {
  "use strict";
  var tags = window.Study.cleanTags(initial || []);
  var wrap = document.createElement("div"); wrap.className = "ne-tags";
  var input = document.createElement("input");
  input.type = "text"; input.className = "ne-tag-input"; input.maxLength = 30; input.autocomplete = "off";
  input.placeholder = "Add a tag (e.g. prayer, hope)"; input.setAttribute("aria-label", "Add a tag");
  wrap.appendChild(input);
  var sugg = document.createElement("div"); sugg.className = "ne-sugg";
  container.append(wrap, sugg);

  function changed() { paint(); if (onChange) onChange(tags.slice()); }
  function add(t) {
    var c = window.Study.cleanTags([t])[0];
    input.value = "";
    if (c && tags.indexOf(c) < 0) { tags.push(c); changed(); } else paint();
  }
  function paint() {
    Array.prototype.slice.call(wrap.querySelectorAll(".ne-tag")).forEach(function (n) { n.remove(); });
    tags.forEach(function (t, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "ne-tag";
      b.textContent = "#" + t; b.setAttribute("aria-label", "Remove tag " + t);
      b.addEventListener("click", function () { tags.splice(i, 1); changed(); });
      wrap.insertBefore(b, input);
    });
    sugg.textContent = "";
    var q = input.value.trim().toLowerCase();
    window.Study.allTags().filter(function (t) { return tags.indexOf(t) < 0 && (!q || t.indexOf(q) === 0); })
      .slice(0, 8).forEach(function (t) {
        var b = document.createElement("button"); b.type = "button"; b.className = "ne-sugg-chip"; b.textContent = "#" + t;
        b.addEventListener("mousedown", function (e) { e.preventDefault(); });
        b.addEventListener("click", function () { add(t); input.focus(); });
        sugg.appendChild(b);
      });
  }
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input.value); }
    else if (e.key === "Backspace" && !input.value && tags.length) { tags.pop(); changed(); }
  });
  input.addEventListener("blur", function () { if (input.value.trim()) add(input.value); });
  input.addEventListener("input", paint);
  paint();
  return {
    get: function () { if (input.value.trim()) add(input.value); return tags.slice(); },
    set: function (t) { tags = window.Study.cleanTags(t || []); paint(); }
  };
};
