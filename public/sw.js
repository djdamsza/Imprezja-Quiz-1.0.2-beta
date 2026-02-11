// Service Worker – VoteBattle: cache stron, aby działały offline (sieć lokalna)
const CACHE_NAME = 'votebattle-v3';

const PRECACHE = [
  '/Screen.html',
  '/admin.html',
  '/vote.html',
  '/editor.html',
  '/manifest.json',
  '/socket.io/socket.io.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strony HTML i socket.io: sieć pierwsza, przy braku sieci – z cache
// Pozostałe żądania (API, uploads, itp.): sieć pierwsza
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  const isPrecached =
    url.pathname === '/Screen.html' ||
    url.pathname === '/admin.html' ||
    url.pathname === '/vote.html' ||
    url.pathname === '/editor.html' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/socket.io/socket.io.js';

  if (isPrecached) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/vote.html')))
    );
    return;
  }

  // Inne zasoby (CSS, obrazy, uploads): sieć, fallback do cache
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});
