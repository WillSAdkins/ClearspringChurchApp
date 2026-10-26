/* Clearspring: confirmations and small actions without inline JavaScript.
   Pages mark elements with data attributes instead of onclick/onsubmit, so
   the content security policy can refuse every inline handler, and a name
   in a message ("Remove Sam from the group?") is only ever text, never code.

     <form data-confirm="Delete this?">             asks first
     <button data-confirm="Take it down?">           asks first
     <form data-prompt="Why?" data-prompt-field="reason">  asks for a reason
     <select data-autosubmit>                        submits on change
     <button data-reload> / <button data-print>                          */
(function () {
  "use strict";
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!(f instanceof HTMLFormElement)) return;
    if (f.hasAttribute("data-confirm") && !window.confirm(f.getAttribute("data-confirm"))) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (f.hasAttribute("data-prompt")) {
      var r = window.prompt(f.getAttribute("data-prompt"));
      if (r === null) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      var field = f.elements[f.getAttribute("data-prompt-field") || "reason"];
      if (field) field.value = r;
    }
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-confirm]:not(form), [data-reload], [data-print]");
    if (!b) return;
    if (b.hasAttribute("data-reload")) { window.location.reload(); return; }
    if (b.hasAttribute("data-print")) { window.print(); return; }
    if (!window.confirm(b.getAttribute("data-confirm"))) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el && el.hasAttribute && el.hasAttribute("data-autosubmit") && el.form) el.form.submit();
  });
})();
