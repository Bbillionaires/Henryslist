// Minimal service worker: enables PWA installability and caches static
// assets for faster repeat loads. Deliberately does not cache API responses
// or HTML pages — this is a classifieds marketplace where listings, prices,
// and availability change constantly, so serving stale data offline would
// be actively misleading. Network-first for navigation, cache-first for
// hashed static assets only.
const CACHE_NAME = "henryslist-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

  if (!isStaticAsset || event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    }),
  );
});
