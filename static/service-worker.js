const CACHE_NAME = "clearspring-v7";
const PAGE_CACHE = "cs-pages-v1";
const OFFLINE_URLS = ["/static/style.css", "/static/loading-screen.mp4"];

const KEEP_CACHES = [CACHE_NAME, PAGE_CACHE, "cs-sermon-audio"];
const MAX_CACHED_PAGES = 160;

function isNeverCache(pathname) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/prayer") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/games/") && pathname.includes("/leaderboard")
  );
}

function isSafePage(pathname) {
  if (pathname === "/") return true;
  if (pathname === "/more") return true;
  if (pathname === "/community") return true;
  if (pathname === "/community/calendar") return true;
  if (pathname === "/questions") return true;
  if (pathname === "/visit") return true;
  if (pathname === "/bible") return true;
  if (/^\/bible\/read(\/|$)/.test(pathname)) return true;
  if (/^\/bible\/plans(\/|$)/.test(pathname)) return true;
  if (/^\/bible\/devotionals(\/|$)/.test(pathname)) return true;
  if (pathname === "/watch") return true;
  if (/^\/watch\/\d+$/.test(pathname)) return true;
  if (/^\/resources(\/|$)/.test(pathname)) return true;
  if (/^\/ministries(\/|$)/.test(pathname)) return true;
  if (/^\/store(\/|$)/.test(pathname)) return true;
  if (/^\/giving(\/|$)/.test(pathname)) return true;
  return false;
}

async function trimPageCache() {
  const cache = await caches.open(PAGE_CACHE);
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHED_PAGES) return;
  const excess = keys.length - MAX_CACHED_PAGES;
  for (let i = 0; i < excess; i++) { await cache.delete(keys[i]); }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !KEEP_CACHES.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.endsWith(".xml")) return;
  if (url.pathname.startsWith("/static/games/rockslinger/")) return;

  const isPage = event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    if (isNeverCache(url.pathname)) {
      event.respondWith(fetch(event.request).catch(() =>
        caches.match("/offline").then((r) => r || caches.match("/"))));
      return;
    }
    if (isSafePage(url.pathname)) {
      event.respondWith(
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(PAGE_CACHE).then((cache) => { cache.put(event.request, clone).then(trimPageCache); });
          }
          return response;
        }).catch(() =>
          caches.match(event.request).then((cached) =>
            cached || caches.match("/offline").then((r) => r || caches.match("/"))))
      );
      return;
    }
    event.respondWith(fetch(event.request).catch(() =>
      caches.match("/offline").then((r) => r || caches.match("/"))));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: "Clearspring", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Clearspring";
  const options = {
    body: data.body || "",
    icon: "/static/icons/icon-192.png",
    badge: "/static/icons/icon-192.png",
    tag: (data.tag || "clearspring") + "-" + Date.now(),
    data: { url: data.url || "/" },
    renotify: true, requireInteraction: false, vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) { client.navigate(target); return client.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
