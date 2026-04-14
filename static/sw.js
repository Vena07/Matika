const CACHE_NAME = 'statistika-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Uložíme základní aplikaci do paměti zařízení
      return cache.addAll(['/']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Pokud jsme offline, načteme z paměti. Jinak stáhneme z internetu.
      return response || fetch(event.request);
    })
  );
});