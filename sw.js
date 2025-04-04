// Basic Cache-First Service Worker
const CACHE_NAME = 'frame-extractor-v1';
// Adjust these paths based on your actual file structure
const urlsToCache = [
  '.', // Alias for index.html
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com?plugins=forms', // Cache Tailwind
  // IMPORTANT: Cache the WASM assets IF they are stable and versioned
  // If they change often, this might cause issues.
  // Consider versioning the cache name if assets change.
  'ffmpeg-assets/index.js',
  'ffmpeg-assets/ffmpeg-core.js',
  'ffmpeg-assets/ffmpeg-core.wasm',
  'ffmpeg-assets/worker.js'
  // Add paths to your icons (e.g., 'icon-192.png', 'icon-512.png')
];

self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        // Use addAll for atomic caching
        return cache.addAll(urlsToCache).catch(error => {
            console.error('[SW] Failed to cache initial assets:', error);
            // Decide if install should fail or continue partially
             throw error; // Fail install if core assets missing
        });
      })
      .then(() => {
          console.log('[SW] All assets cached successfully.');
          return self.skipWaiting(); // Activate worker immediately
      })
  );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                         .map(name => caches.delete(name))
            );
        }).then(() => {
            console.log('[SW] Old caches removed.');
            return self.clients.claim(); // Take control of open pages
        })
    );
});


self.addEventListener('fetch', event => {
  // Let the browser handle non-GET requests
  if (event.request.method !== 'GET') {
      return;
  }

  // For navigation requests, try network first, then cache (Network Falling Back to Cache)
  // This ensures the user gets the latest HTML if online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request)) // Fallback to cache on network failure
    );
    return;
  }

  // For other assets (CSS, JS, WASM, images), use Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
             // Optional: Cache dynamically fetched resources if needed
             // Be careful caching external resources like the CDN without control
             // if (networkResponse.ok && urlsToCache.includes(event.request.url)) {
             //     const responseToCache = networkResponse.clone();
             //     caches.open(CACHE_NAME).then(cache => {
             //         cache.put(event.request, responseToCache);
             //     });
             // }
             return networkResponse;
        }).catch(error => {
            console.error('[SW] Fetch failed for:', event.request.url, error);
            // Optionally return a fallback offline page/resource here
        });
      })
  );
});