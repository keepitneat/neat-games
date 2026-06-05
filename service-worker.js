/* Neat Games — Service Worker. Precaches the hub + Crowns shell for offline.
 * Bump CACHE_VERSION on any change to the import graph (new module -> add to
 * APP_SHELL AND bump the version). */

const CACHE_VERSION = 'v5';
const CACHE_NAME = `neat-games-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/shared/rng.js',
  '/shared/store.js',
  '/shared/theme.js',
  '/crowns/',
  '/crowns/index.html',
  '/crowns/crowns.css',
  '/crowns/app.js',
  '/crowns/daily.js',
  '/crowns/share.js',
  '/crowns/board.js',
  '/crowns/rules.js',
  '/crowns/solver.js',
  '/crowns/generate.js',
  '/crowns/skins.js',
  '/crowns/persist.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('neat-games-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Network-first: fresh when online (updates show immediately), cache offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
