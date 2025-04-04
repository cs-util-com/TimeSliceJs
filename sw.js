const CACHE_NAME = 'timeslicejs-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/ffmpeg-assets/classes.js',
  '/ffmpeg-assets/const.js',
  '/ffmpeg-assets/errors.js',
  '/ffmpeg-assets/ffmpeg-core.js',
  '/ffmpeg-assets/ffmpeg-core.wasm',
  '/ffmpeg-assets/index.js',  
  '/ffmpeg-assets/types.js',
  '/ffmpeg-assets/utils.js',
  '/ffmpeg-assets/worker.js',
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch resources
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});