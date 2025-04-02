// Service Worker for Video Frame Extractor PWA

const CACHE_NAME = 'frame-extractor-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './icon.svg',
  './manifest.json'  // Manifest is now in the list
];

// Create a basic manifest as fallback if the file can't be loaded
const FALLBACK_MANIFEST = {
  "name": "Video Frame Extractor",
  "short_name": "Frame Extractor",
  "description": "Standalone PWA for extracting frames from video at specified intervals",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "icon.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
};

// Install event - cache assets with better error handling
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache the basic assets
        const cachePromises = ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(error => {
            console.warn(`Failed to cache asset: ${url}`, error);
            
            // Special handling for manifest - if it fails to cache, create a fallback
            if (url.includes('manifest.json')) {
              const manifestBlob = new Blob([JSON.stringify(FALLBACK_MANIFEST)], 
                {type: 'application/json'});
              const manifestResponse = new Response(manifestBlob, {
                status: 200,
                headers: {'Content-Type': 'application/json'}
              });
              return cache.put('./manifest.json', manifestResponse);
            }
          });
        });
        
        return Promise.all(cachePromises);
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
  // Special handling for manifest.json
  if (event.request.url.includes('manifest.json')) {
    event.respondWith(
      caches.match('./manifest.json')
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Try to fetch the real file
          return fetch('./manifest.json')
            .then(response => {
              // Cache the manifest for future use
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put('./manifest.json', responseToCache);
                });
              return response;
            })
            .catch(error => {
              console.warn('Failed to fetch manifest, using fallback:', error);
              // Return the fallback manifest
              const manifestBlob = new Blob([JSON.stringify(FALLBACK_MANIFEST)], 
                {type: 'application/json'});
              return new Response(manifestBlob, {
                status: 200,
                headers: {'Content-Type': 'application/json'}
              });
            });
        })
    );
    return;
  }
  
  // Skip non-GET requests and specific problematic requests
  if (event.request.method !== 'GET' || 
      event.request.url.includes('@ffmpeg/ffmpeg') || // Skip ffmpeg libraries
      event.request.url.includes('jsdelivr.net') ||
      event.request.url.includes('unpkg.com') ||
      event.request.url.includes('skypack.dev')) {
    return;
  }

  // Standard fetch handling for other resources
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
