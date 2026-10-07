// Service Worker for Iron Rabbit — Offline-first PWA
// v2: network-first for HTML (so users always get the latest bundle),
//     cache-first for hashed static assets,
//     network-first for the header-presets manifest + preset images so
//     the picker never shows stale/deleted backgrounds.
// v80: PRECACHE no longer includes `/` or `/index.html`. The reason —
//     precaching the shell was the mechanism by which old service
//     workers kept serving the previous app version to users AFTER a
//     new SW file had been published. With HTML now always fetched
//     network-first (and runtime-cached as a fallback for offline),
//     every deploy propagates to users on their next page load.
const CACHE_NAME = 'iron-rabbit-v200';
const RUNTIME = 'iron-rabbit-runtime-v87';

// ---- Runtime-cache bound ----
// The RUNTIME cache backs offline HTML, header-preset images, hashed
// static assets and — under the current fetch handler — every /api/*
// GET response as well. Prior to this bound it grew without limit,
// which the audit identified as a plausible contributor to origin-
// storage bloat over many sessions (matches the user's ~20 MB "clear
// Cache Storage → notes still intact → transitions became instant"
// observation).
//
// Policy: FIFO by insertion order, hard cap at RUNTIME_MAX_ENTRIES.
// Cache Storage `keys()` returns entries in insertion order, so
// deleting from the front approximates least-recently-inserted. This
// is intentionally simple, deterministic, and works identically in
// mobile Chrome, iOS Safari, and Chromium PWAs.
//
// The bound is scoped to RUNTIME only — CACHE_NAME (the precache
// bucket that holds `/manifest.json`) is never touched by this
// policy, and neither is any IndexedDB/localForage/localStorage/user
// data. See activate handler for the pre-existing cross-generation
// cleanup, which is deliberately left unchanged.
const RUNTIME_MAX_ENTRIES = 150;

// Serialize trims so a burst of concurrent puts can't produce
// interleaved delete storms that briefly evict below the target.
let __trimInFlight = null;
function trimRuntimeCache() {
  if (__trimInFlight) return __trimInFlight;
  __trimInFlight = (async () => {
    try {
      const cache = await caches.open(RUNTIME);
      const keys = await cache.keys();
      const excess = keys.length - RUNTIME_MAX_ENTRIES;
      if (excess > 0) {
        // Delete the oldest `excess` entries. Failures are non-fatal.
        for (let i = 0; i < excess; i++) {
          try { await cache.delete(keys[i]); } catch { /* best-effort */ }
        }
      }
    } catch { /* best-effort — never surface to fetch handler */ }
    finally { __trimInFlight = null; }
  })();
  return __trimInFlight;
}

// Helper that mirrors the previous `caches.open(RUNTIME).then(c => c.put(request, clone))`
// pattern, but schedules a bound-check after the write completes. The
// trim runs off the critical path — it never blocks the response
// returned to the page.
function putInRuntime(request, response) {
  return caches.open(RUNTIME)
    .then(cache => cache.put(request, response))
    .then(() => trimRuntimeCache())
    .catch(() => { /* swallow — cache writes are opportunistic */ });
}

// App shell — only the manifest is precached. HTML is deliberately
// left out so a stale precache can never override a fresh deploy.
const PRECACHE_URLS = [
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

  // ---- HTML / navigation: network-first, fallback to runtime cache
  //      (populated on previous successful visits) so offline still
  //      works even though we no longer precache the shell. ----
  if (isHTMLRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            putInRuntime(request, response.clone());
          }
          return response;
        })
        .catch(() =>
          // Offline fallback chain: exact match → root → any cached
          // HTML we've ever seen from this origin. Returns undefined
          // (browser default failure) if the user has never visited
          // the app online — acceptable trade for eliminating the
          // stale-shell class of bugs.
          caches.match(request)
            .then(cached => cached || caches.match('/'))
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
            putInRuntime(request, response.clone());
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
          putInRuntime(request, response.clone());
        }
        return response;
      });
    })
  );
});


// ---- Notification click: focus / open the app when a reminder is tapped ----
self.addEventListener('notificationclick', (event) => {
  const action = event.action || '';
  const data = event.notification.data || {};
  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // Prefer messaging an already-open Iron Rabbit tab so it can
    // perform the action (dismiss / snooze) without a full navigation.
    for (const client of allClients) {
      if (client.url && new URL(client.url).origin === self.location.origin) {
        try {
          client.postMessage({ type: 'ALARM_ACTION', action, noteId: data.noteId });
        } catch { /* ignore */ }
        return client.focus();
      }
    }

    // Otherwise open a fresh tab and hand the action to the app via URL
    // params — `NotesApp` reads these on boot and re-runs the same
    // dismiss/snooze code path as the in-app toast buttons.
    if (self.clients.openWindow) {
      const params = new URLSearchParams();
      if (action) params.set('alarm-action', action);
      if (data.noteId) params.set('alarm-note', String(data.noteId));
      const qs = params.toString();
      return self.clients.openWindow(qs ? `/?${qs}` : '/');
    }
  })());
});
