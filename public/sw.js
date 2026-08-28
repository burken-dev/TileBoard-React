// ponytail: tiny offline shell — cache index + assets, network-first for navigation
const CACHE = 'tb-shell-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html']).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // config is user-editable, never serve stale for long — network first
  if (url.pathname.startsWith('/config/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const c = r.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, c));
          return r;
        })
        .catch(() =>
          caches.match(e.request).then((r) => r || caches.match('/index.html')),
        ),
    );
    return;
  }

  // assets: cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((r) => {
          if (r.ok) {
            const c = r.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, c));
          }
          return r;
        }),
    ),
  );
});
