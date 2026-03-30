const CACHE_NAME = 'parking-lot-v18';
const STATIC_ASSETS = [
  './',
  './index.html',
  './js/app-main.js',
  './js/app/orchestrator.js',
  './js/constants.js',
  './js/state.js',
  './styles.css',
  './manifest.json',
  './supabase.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/**
 * Network-first for shell + all app JS under /js/ so new modules work offline after
 * first load without editing this list every time. Other assets: cache-first.
 */
function isNetworkFirst(pathname) {
  if (pathname.endsWith('/') || pathname.endsWith('index.html')) return true;
  if (pathname.endsWith('styles.css')) return true;
  if (pathname.endsWith('app.js')) return true;
  if (pathname.endsWith('app-main.js')) return true;
  if (pathname.includes('/js/') && pathname.endsWith('.js')) return true;
  return false;
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('supabase') || url.hostname.includes('supabase')) return;
  if (url.pathname.endsWith('config.js') || url.pathname.endsWith('sw.js')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if (isNetworkFirst(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
