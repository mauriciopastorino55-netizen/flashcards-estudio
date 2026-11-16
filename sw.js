const CACHE_NAME = 'flashcards-estudio-v44';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './emojis-literatura.png',
  './emojis-poesia.png',
  './emojis-frayluis.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method === 'POST' && event.request.url.includes('shared=1')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const file = formData.get('shared_file');
        if (file) {
          const text = await file.text();
          const name = file.name || 'Mazo Compartido.md';
          const cache = await caches.open('shared-files-v1');
          await cache.put(new Request('./shared-file'), new Response(JSON.stringify({ text, name })));
          return Response.redirect('./index.html?load_shared=1', 303);
        }
      } catch (err) {
        console.error('Error handling shared file:', err);
      }
      return Response.redirect('./index.html', 303);
    })());
    return;
  }

  if (!event.request.url.startsWith(self.location.origin)) return;

  const isHtml = event.request.mode === 'navigate' || event.request.url.endsWith('.html') || event.request.url.endsWith('/');
  if (isHtml) {
    event.respondWith(
      fetch(event.request.url, { cache: 'no-store' })
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
