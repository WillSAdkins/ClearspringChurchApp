/* Clearspring — home screen actions: Add to Home Screen + Share the app.

   "Add to Home Screen" reality:
   - Android/Chrome fires a 'beforeinstallprompt' event we can save and fire
     from our button — a real one-tap install.
   - iOS/Safari gives web pages NO way to trigger it, so there we show the
     manual steps instead.
   - If the app is already installed (running standalone), we hide the button.

   "Share" uses the native share sheet, with a clipboard fallback. */

(function () {
  "use strict";

  var addBtn = document.getElementById("addToHomeBtn");
  var shareBtn = document.getElementById("shareAppBtn");
  var sheet = document.getElementById("a2hsSheet");
  var sheetClose = document.getElementById("a2hsClose");

  // ---------- Add to Home Screen ----------

  var deferredPrompt = null;

  // Already installed? (launched from home screen) → hide the add button.
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
           window.navigator.standalone === true;
  }
  if (addBtn && isStandalone()) {
    addBtn.hidden = true;
  }

  // Android/Chrome: capture the install prompt so our button can fire it.
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  // If the install completes, tidy up.
  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    if (addBtn) addBtn.hidden = true;
    hideSheet();
  });

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function showSheet() { if (sheet) sheet.hidden = false; }
  function hideSheet() { if (sheet) sheet.hidden = true; }

  if (addBtn) {
    addBtn.addEventListener("click", function () {
      if (deferredPrompt) {
        // Android: fire the real install prompt.
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
        });
      } else {
        // iOS (or a browser without the prompt): show manual instructions.
        showSheet();
      }
    });
  }
  if (sheetClose) sheetClose.addEventListener("click", hideSheet);
  if (sheet) {
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet) hideSheet(); // tap the backdrop to close
    });
  }

  // ---------- Share the app ----------

  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var url = window.location.origin;
      var shareData = {
        title: "Clearspring Church",
        text: "Check out the Clearspring Church app \u2014 sermons, the Bible, prayer and more, all in one place.",
        url: url,
      };
      if (navigator.share) {
        navigator.share(shareData).catch(function (e) {
          if (e && e.name === "AbortError") return; // user cancelled
        });
      } else {
        // Fallback: copy the link.
        var text = shareData.text + " " + url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () { toast("Link copied \u2014 paste it to share"); },
            function () { toast("Couldn't copy the link"); }
          );
        } else {
          toast("Sharing isn't supported on this device");
        }
      }
    });
  }

  function toast(msg) {
    if (window.Toast && typeof window.Toast.show === "function") {
      window.Toast.show(msg); return;
    }
    var el = document.getElementById("home-action-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "home-action-toast";
      el.style.cssText =
        "position:fixed;left:50%;bottom:5.5rem;transform:translateX(-50%);" +
        "background:rgba(20,20,20,0.92);color:#fff;padding:0.6rem 1rem;" +
        "border-radius:0.6rem;font-size:0.85rem;z-index:9999;max-width:80%;" +
        "text-align:center;transition:opacity 0.3s;";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = "0"; }, 2400);
  }
})();
