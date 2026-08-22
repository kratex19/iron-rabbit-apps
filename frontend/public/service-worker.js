// Service Worker for Iron Rabbit — Offline-first PWA
// v2: network-first for HTML (so users always get the latest bundle),
//     cache-first for hashed static assets,
//     network-first for the header-presets manifest + preset images so
//     the picker never shows stale/deleted backgrounds.
const CACHE_NAME = 'iron-rabbit-v47';
const RUNTIME = 'iron-rabbit-runtime-v23';

// App shell — precached on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: precache shell, activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete all old caches, take control of open pages
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME];
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => !currentCaches.includes(n))
             .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Listen for a message from the page to skip waiting (used to trigger update)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Detect an HTML/navigation request
function isHTMLRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Fetch strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // ---- HTML / navigation: network-first, fallback to cache (offline) ----
  if (isHTMLRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // ---- Header presets: network-first, so removed presets & updated
  //      manifest.json propagate to users immediately. Falls back to
  //      cache when offline. ----
  const url = new URL(request.url);
  if (url.pathname.startsWith('/header-presets/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ---- Static assets (hashed JS/CSS/images/fonts): cache-first ----
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
