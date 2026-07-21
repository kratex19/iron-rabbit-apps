// Service Worker for Iron Rabbit - Offline-first PWA
const CACHE_NAME = 'iron-rabbit-v1';
const RUNTIME = 'iron-rabbit-runtime';

// App shell - cached on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - precache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => caches.delete(cacheToDelete)));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy for offline support
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME).then(cache => {
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          // Offline fallback - return cached index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      });
    })
  );
});
