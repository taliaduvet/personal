/* Studio OS — minimal service worker.
 * M0: just enough for installability ("Add to Home Screen") and an offline
 * fallback to the app shell. Real offline data caching arrives in v1.5. */
const CACHE = "studio-os-shell-v1";
const SHELL = ["/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        const cached = await caches.match(request);
        return cached || (await caches.match("/")) || Response.error();
      }
    })()
  );
});
