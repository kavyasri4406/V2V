// Simple Service Worker for V2V AlertCast
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required to satisfy PWA installability criteria
  event.respondWith(fetch(event.request).catch(() => {
    return caches.match(event.request);
  }));
});
