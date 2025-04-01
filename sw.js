// Service Worker for Video Frame Extractor PWA

const CACHE_NAME = 'frame-extractor-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './icon.svg'
  // We'll handle manifest.json separately
];

// Install event - cache assets with better error handling
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache each asset individually to handle failures gracefully
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`Failed to cache asset: ${url}`, error);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName !== CACHE_NAME;
          }).map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - improved handler with better error cases
self.addEventListener('fetch', event => {
  // Skip non-GET requests and specific problematic requests
  if (event.request.method !== 'GET' || 
      event.request.url.includes('ffmpeg') ||
      event.request.url.includes('jsdelivr.net') ||
      event.request.url.includes('unpkg.com') ||
      event.request.url.includes('skypack.dev') ||
      event.request.url.includes('manifest.json')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        // Make network request
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the new resource
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.warn('Failed to update cache for:', event.request.url, err);
              });

            return response;
          })
          .catch(error => {
            console.warn('Fetch failed:', error);
            // Return a fallback or let the error propagate
            throw error;
          });
      })
  );
});
