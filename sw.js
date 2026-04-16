const CACHE_NAME = 'zenoccaz-admin-v1';
const ASSETS = [
  '/admin.html',
  '/admin.css',
  '/admin-main.js',
  '/chat-ia-js-final.js',
  '/supabase-config.js',
  '/manifest.json'
];

// Installation : mise en cache des assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage ancien cache
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : network first, fallback cache
self.addEventListener('fetch', e => {
  // Ignorer les requêtes non-GET et les API externes
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.url.includes('serpapi.com')) return;
  if (e.request.url.includes('onrender.com')) return;
  if (e.request.url.includes('cdn.jsdelivr')) return;
  if (e.request.url.includes('cdnjs.cloudflare')) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});