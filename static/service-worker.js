const CACHE_NAME = "clearspring-v50";
const PAGE_CACHE = "cs-pages-v1";
const OFFLINE_URLS = ["/offline", "/static/style.css", "/static/loading-screen.mp4"];

const PACK_CACHE = "cs-packs-v1";   // whole books saved for offline (filled by static/packs.js)
const AUDIO_CACHE = "cs-bible-audio";   // audio Bible chapters saved for offline (filled by static/listen.js)
const KEEP_CACHES = [CACHE_NAME, PAGE_CACHE, PACK_CACHE, AUDIO_CACHE, "cs-sermon-audio"];

// Which audio Bible chapters are saved, so unsaved ones are never intercepted.
let savedAudio = null;
function loadSavedAudio() {
  return caches.open(AUDIO_CACHE).then((c) => c.keys()).then((keys) => {
    savedAudio = new Set(keys.map((r) => new URL(r.url).pathname));
  }).catch(() => { savedAudio = null; });
}
loadSavedAudio();
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "audio-saved-changed") event.waitUntil(loadSavedAudio());
});

/* Media elements ask for byte ranges, and iOS won't play audio without a
   proper 206 answer, so saved audio is sliced here. */
async function rangedResponse(request, cached) {
  const range = request.headers.get("range");
  if (!range) return cached;
  const blob = await cached.blob();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return cached;
  const size = blob.size;
  let start = m[1] === "" ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  let end = m[1] !== "" && m[2] !== "" ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
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
  if (pathname === "/visit" || pathname === "/contact" || pathname === "/privacy") return true;
  if (pathname === "/bible") return true;
  if (/^\/bible\/read(\/|$)/.test(pathname)) return true;
  if (/^\/bible\/v\//.test(pathname)) return true;
  if (/^\/bible\/word\//.test(pathname)) return true;
  if (/^\/memorise(\/learn)?$/.test(pathname)) return true;
  if (/^\/bible\/plans(\/|$)/.test(pathname)) return true;
  if (/^\/bible\/devotionals(\/|$)/.test(pathname)) return true;
  if (pathname === "/watch") return true;
  if (/^\/watch\/\d+$/.test(pathname)) return true;
  if (/^\/resources(\/|$)/.test(pathname)) return true;
  if (/^\/ministries(\/|$)/.test(pathname)) return true;
  if (/^\/store(\/|$)/.test(pathname)) return true;
  if (/^\/giving(\/|$)/.test(pathname)) return true;
  // Reading and learning pages that hold nothing personal
  if (/^\/(grow|faith|family|college)(\/|$)/.test(pathname)) return true;
  if (/^\/bible\/(feelings|library|dictionary|topics|people|places|creeds|timeline|today|words|word|v|journeys|harmony|ot-in-nt|map|3d|interlinear|grammar|notes|intro|themes|profiles|terms|passage|commentary|reference|morning-evening|videos|compare|listen)(\/|$)/.test(pathname)) return true;
  if (/^\/library\/classics(\/|$)/.test(pathname)) return true;
  if (pathname === "/sunday") return true;
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
  // Audio Bible: play saved chapters from this phone; otherwise leave the
  // request to the browser, which follows the redirect to the audio host.
  if (url.pathname.startsWith("/audio/bible/")) {
    if (url.search) return;
    // Known not to be saved: don't touch it (the safest path for media on iOS).
    if (savedAudio && !savedAudio.has(url.pathname)) return;
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) => cache.match(url.pathname)).then((hit) =>
        hit ? rangedResponse(event.request, hit) : fetch(event.request))
    );
    return;
  }
  // Scripture data that never changes and holds nothing personal: fetch fresh,
  // but keep a copy so lessons and word studies still work without signal.
  if (url.pathname === "/api/memorise/passage" || url.pathname.startsWith("/api/words/")) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
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
          // Pages with licensed Bible text say "no-store": publishers limit how much may be kept.
          const noStore = /no-store/.test(response && response.headers.get("Cache-Control") || "");
          if (response && response.status === 200 && !noStore) {
            const clone = response.clone();
            caches.open(PAGE_CACHE).then((cache) => { cache.put(event.request, clone).then(trimPageCache); });
          }
          return response;
        }).catch(() =>
          caches.match(event.request).then((cached) =>
            cached || caches.match(event.request, { ignoreSearch: true, ignoreVary: true }).then((loose) =>
              loose || caches.match("/offline").then((r) => r || caches.match("/")))))
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
    icon: "/static/icons/icon-192.png?v=3",
    badge: "/static/icons/icon-192.png?v=3",
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
