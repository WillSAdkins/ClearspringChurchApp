/* Clearspring — back buttons go back to the page you actually came from.

   Every back arrow in the app (the arrow in a page's header, the reader's
   arrow, the floating "Back" button, the close button on focus pages) used to
   link to a fixed "parent" page. Now the app keeps a short list of the pages
   visited in this session and steps back through that, exactly like the
   phone's own back gesture, keeping your scroll position.

   If there's nowhere in the app to go back to (you arrived from a shared link
   or a notification), the arrow still works: it falls back to the page's
   usual parent. */
(function () {
  "use strict";
  var KEY = "cs_nav", MAX = 60;
  var ss = null;
  try { ss = window.sessionStorage; ss.getItem(KEY); } catch (e) { ss = null; }

  function here() { return location.pathname + location.search; }
  function page(u) { return (u || "").split("#")[0]; }
  function load() { try { var v = JSON.parse(ss.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function store(list) { try { ss.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) {} }

  function navType() {
    try { var n = performance.getEntriesByType("navigation")[0]; return n ? n.type : "navigate"; } catch (e) { return "navigate"; }
  }

  // Keep the list in step with the browser's own history.
  function record(isBackForward) {
    if (!ss) return;
    var list = load(), url = here();
    if (isBackForward) {
      var i = list.length - 1;
      while (i >= 0 && page(list[i]) !== url) i--;
      if (i >= 0) { store(list.slice(0, i + 1)); return; }
    } else if (navType() === "reload" && list[list.length - 1] === url) {
      return;
    }
    list.push(url);
    store(list);
  }
  record(navType() === "back_forward");
  window.addEventListener("pageshow", function (e) { if (e.persisted) record(true); });
  // A page may tidy its own address (history.replaceState) after loading;
  // keep the list's entry for it matching what the browser will show.
  window.addEventListener("pagehide", function () {
    if (!ss) return;
    var list = load();
    if (list.length && page(list[list.length - 1]) !== page(here())) { list[list.length - 1] = here() + location.hash; store(list); }
  });
  // In-page jumps (#anchors) add history entries too.
  window.addEventListener("hashchange", function () {
    if (!ss) return;
    var list = load(); list.push(here() + location.hash); store(list);
  });

  // How many steps back to the previous *different* page (a form that reloads
  // the same page, or an anchor jump, doesn't count as a page).
  function stepsBack() {
    if (!ss) return 0;
    var list = load(), cur = page(here()), top = page(list[list.length - 1]);
    for (var j = list.length - 2; j >= 0; j--) {
      var p = page(list[j]);
      if (p !== cur && p !== top) return list.length - 1 - j;
    }
    return 0;
  }

  function goBack(fallback) {
    var n = stepsBack();
    if (n > 0 && history.length > n) { history.go(-n); return true; }
    // No session list (private browsing): fall back to the browser's own idea.
    var ref = document.referrer;
    if (!ss && ref && ref.indexOf(location.origin) === 0 && history.length > 1) { history.back(); return true; }
    if (fallback) location.assign(fallback);
    return false;
  }
  window.goBack = goBack;

  var SELECTOR = ".bible-back, .reader-bar-back, .ps-x, .global-back, [data-back]";
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest(SELECTOR);
    if (!el || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var fallback = el.getAttribute("href") || el.dataset.fallback || "/";
    if (stepsBack() > 0 || (!ss && el.tagName !== "A")) { e.preventDefault(); goBack(fallback); }
    else if (el.tagName !== "A") { e.preventDefault(); location.assign(fallback); }
    // An <a> with nowhere to go back to simply follows its own link.
  });
})();
