// Service Worker for MarryLocal
// Simplified version to avoid potential issues

const CACHE_VERSION = 'v5';
const CACHE_NAME = `marrylocal-${CACHE_VERSION}`;
const STATIC_CACHE = `marrylocal-static-${CACHE_VERSION}`;
const API_CACHE = `marrylocal-api-${CACHE_VERSION}`;

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        // Add other critical static assets here if needed
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating.');
  self.clients.claim();

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-HTTP requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never intercept cross-origin requests such as Supabase auth/profile calls.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Keep navigations network-first so mobile browsers do not get trapped on stale shells.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put('/index.html', responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match('/index.html');
          return cachedResponse || Response.error();
        })
    );
    return;
  }

  // Don't intercept requests for JavaScript, CSS, and meta.json to avoid caching issues
  if (request.url.includes('.js') || request.url.includes('.css') || request.url.includes('/assets/') || request.url.includes('meta.json')) {
    return; // Let the browser handle these directly
  }

  // Cache Google Fonts
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open('google-fonts').then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(response => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Cache API responses
  if (url.origin === 'https://localm-api.dgsbuu.easypanel.host' && url.pathname.startsWith('/localm-api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(response => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }
      return fetch(request).then(response => {
        // Only cache static assets that are not JS/CSS
        if (request.method === 'GET' && response.status === 200 &&
            !request.url.includes('/assets/') &&
            !request.url.includes('.js') &&
            !request.url.includes('.css')) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return cached version if available, otherwise offline page
        return caches.match('/index.html');
      });
    })
  );
});

// Message event - handle cache clearing
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Clearing all caches via service worker');
    caches.keys().then(names => {
      return Promise.all(names.map(name => {
        console.log('Deleting cache:', name);
        return caches.delete(name);
      }));
    }).then(() => {
      console.log('All caches cleared');
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    }).catch(error => {
      console.error('Error clearing caches:', error);
      event.ports[0].postMessage({ type: 'CACHE_CLEAR_ERROR', error: error.message });
    });
  }
});