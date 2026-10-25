/*
 * native-bridge.js
 *
 * Loaded on every page. Does nothing at all in a normal browser.
 *
 * When the site is running inside the Capacitor native shell (the iOS/Android
 * app), this adapts the page for it:
 *   - marks <html> with data-native so CSS can target the app build
 *   - swaps web push for native push registration
 *   - sends giving out to Safari and other sites to the in-app browser
 *   - gives the page's Share buttons the native share sheet
 *   - hides "install this app" prompts, which make no sense once installed
 */
(function () {
  "use strict";

  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  if (!isNative) return;

  const platform = window.Capacitor.getPlatform(); // "ios" | "android"
  const root = document.documentElement;
  root.setAttribute("data-native", platform);

  /* ------------------------------------------------------------------ *
   * 1. Hide anything that only makes sense on the web
   * ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-web-only]").forEach(function (el) {
      el.hidden = true;
    });
  });

  /* ------------------------------------------------------------------ *
   * 2. External + payment links leave the app
   *
   * Apple (guideline 3.2.2) wants donations made outside the app, so on
   * iPhone /giving opens in Safari itself. The shop and other websites open
   * in the in-app browser sheet, which keeps saved cards and wallet autofill.
   * ------------------------------------------------------------------ */
  const P = window.Capacitor.Plugins || {};
  const SAFARI_PREFIXES = ["/giving"];
  const EXTERNAL_PREFIXES = ["/giving", "/store"];

  function openOutside(href, inSafari) {
    if (inSafari && P.AppLauncher) {
      P.AppLauncher.openUrl({ url: href }).catch(function () { window.open(href, "_system"); });
    } else if (P.Browser) {
      P.Browser.open({ url: href, presentationStyle: "popover" });
    } else {
      window.open(href, "_system");
    }
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("sms:")) return;

    let url;
    try {
      url = new URL(href, window.location.origin);
    } catch (e) {
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;

    const isOffsite = url.origin !== window.location.origin;
    const startsWith = function (list) { return list.some(function (p) { return url.pathname === p || url.pathname.startsWith(p + "/"); }); };
    const isPayment = !isOffsite && startsWith(EXTERNAL_PREFIXES);
    const isFlagged = link.hasAttribute("data-external");

    if (isOffsite || isPayment || isFlagged) {
      event.preventDefault();
      openOutside(url.href, platform === "ios" && !isOffsite && startsWith(SAFARI_PREFIXES));
    }
  }, true);

  // Forms that post to the giving pages go the same way.
  document.addEventListener("submit", function (event) {
    const form = event.target;
    let url;
    try { url = new URL(form.getAttribute("action") || location.href, location.origin); } catch (e) { return; }
    if (url.origin === location.origin && (url.pathname === "/giving" || url.pathname.startsWith("/giving/")) && form.method.toLowerCase() === "get") {
      event.preventDefault();
      const q = new URLSearchParams(new FormData(form)).toString();
      openOutside(url.origin + url.pathname + (q ? "?" + q : ""), platform === "ios");
    }
  }, true);

  /* ------------------------------------------------------------------ *
   * 3. Share sheet
   *
   * The Android webview has no navigator.share, so the page's own Share
   * buttons would fall back to copying a link. Hand them the native sheet.
   * ------------------------------------------------------------------ */
  if (P.Share && !navigator.share) {
    navigator.share = function (data) {
      data = data || {};
      return P.Share.share({ title: data.title, text: data.text, url: data.url, dialogTitle: "Share" }).then(function () {});
    };
    navigator.canShare = function () { return true; };
  }

  /* ------------------------------------------------------------------ *
   * 4. Native push notifications (Firebase Cloud Messaging)
   *
   * The web build uses the Push API with a VAPID key. That does not exist
   * inside a native webview, so the app asks Firebase for a device token
   * (Firebase passes iPhone notifications on to Apple) and posts it to the
   * same endpoint, tagged by platform.
   * ------------------------------------------------------------------ */
  const FCM = P.FirebaseMessaging;
  const TOKEN_KEY = "cs_native_push_token";

  function notifPrefs() {
    try { return JSON.parse(localStorage.getItem("cs_notif_prefs") || "{}") || {}; } catch (e) { return {}; }
  }

  // Sends the device token with the choices made on the Notifications page,
  // so a refreshed token never resets them.
  function sendToken(token) {
    if (!token) return Promise.resolve();
    let old = null;
    try { old = localStorage.getItem(TOKEN_KEY); localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
    const csrf = document.querySelector('meta[name="csrf-token"]');
    const headers = { "Content-Type": "application/json" };
    if (csrf) headers["X-CSRF-Token"] = csrf.content;
    return fetch("/api/push/subscribe", {
      method: "POST", headers: headers, credentials: "same-origin",
      body: JSON.stringify({ native_token: token, platform: platform, prefs: notifPrefs(), replaces: old && old !== token ? old : undefined }),
    }).catch(function () { /* retried next launch */ });
  }

  window.ClearspringNative = {
    platform: platform,

    pushAvailable: !!FCM,

    enablePush: async function () {
      if (!FCM) throw new Error("Push plugin unavailable");
      let perm = await FCM.checkPermissions();
      if (perm.receive !== "granted") perm = await FCM.requestPermissions();
      if (perm.receive !== "granted") return { ok: false, reason: "denied" };
      const res = await FCM.getToken();
      await sendToken(res && res.token);
      return { ok: !!(res && res.token) };
    },

    // Is this phone signed up for notifications? (token sent and still allowed)
    pushEnabled: async function () {
      if (!FCM) return false;
      let token = null;
      try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
      if (!token) return false;
      const perm = await FCM.checkPermissions().catch(function () { return {}; });
      return perm.receive === "granted";
    },

    pushDenied: async function () {
      if (!FCM) return false;
      const perm = await FCM.checkPermissions().catch(function () { return {}; });
      return perm.receive === "denied";
    },

    // Re-send the token after the person changes what they want to hear about.
    syncPush: function () {
      let token = null;
      try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
      return sendToken(token);
    },

    disablePush: async function () {
      let token = null;
      try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
      if (!token) return;
      const csrf = document.querySelector('meta[name="csrf-token"]');
      const headers = { "Content-Type": "application/json" };
      if (csrf) headers["X-CSRF-Token"] = csrf.content;
      await fetch("/api/push/unsubscribe", {
        method: "POST", headers: headers, credentials: "same-origin",
        body: JSON.stringify({ native_token: token, platform: platform }),
      });
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      if (FCM.deleteToken) FCM.deleteToken().catch(function () {});
    },

    haptic: function (style) {
      if (P.Haptics) P.Haptics.impact({ style: style || "LIGHT" }).catch(function () {});
    },
  };

  if (FCM) {
    FCM.addListener("tokenReceived", function (ev) { sendToken(ev && ev.token); });

    // Tapping a notification should land you on the relevant page.
    FCM.addListener("notificationActionPerformed", function (ev) {
      const data = (ev && ev.notification && ev.notification.data) || {};
      const path = data.url;
      if (path && typeof path === "string" && path.charAt(0) === "/" && path.charAt(1) !== "/") window.location.assign(path);
    });

    // Already allowed on an earlier launch: refresh the token quietly so the
    // server always has the current one.
    FCM.checkPermissions().then(function (perm) {
      if (perm.receive === "granted") return FCM.getToken().then(function (r) { if (r && r.token) {
        let known = null; try { known = localStorage.getItem(TOKEN_KEY); } catch (e) {}
        if (known !== r.token) sendToken(r.token);
      } });
    }).catch(function () {});
  }

  /* ------------------------------------------------------------------ *
   * 5. App links: a link to the site (a sign-in email, a shared verse)
   *    opened the app. Go to that page inside it.
   * ------------------------------------------------------------------ */
  if (P.App) {
    P.App.addListener("appUrlOpen", function (ev) {
      let u;
      try { u = new URL(ev && ev.url); } catch (e) { return; }
      if (u.host !== location.host) return;
      const path = u.pathname + u.search + u.hash;
      if (path !== location.pathname + location.search + location.hash) location.assign(path);
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. Android hardware back button
   * ------------------------------------------------------------------ */
  const App = P.App;
  if (App && platform === "android") {
    App.addListener("backButton", function (info) {
      if (info.canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. Coming back to the app after a long time away: refresh content
   *    that may be stale (the home page's "this week", for example).
   * ------------------------------------------------------------------ */
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 6 * 3600 * 1000 && location.pathname === "/") location.reload();
  });
})();
