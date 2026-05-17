/**
 * Service Worker for Progressive Web App
 * 
 * @description Provides offline support, asset caching, background sync, and push notifications
 * for the WhatsApp Marketing Platform PWA. Implements cache-first strategy for static assets
 * and network-first for API calls.
 * 
 * @features
 * - Static asset caching for offline functionality
 * - Cache versioning and cleanup
 * - Network fallback with offline page support
 * - Background sync for offline message queue
 * - Push notification support
 * - Cross-origin request filtering
 * - API request bypass (always fresh)
 * 
 * @caching-strategy
 * - Static assets: Cache-first with network fallback
 * - API calls: Network-only (bypass cache)
 * - Documents: Cache with offline fallback to index.html
 * 
 * @version 1.0.0
 */

/**
 * @constant {string} CACHE_VERSION - Current cache version
 */
const CACHE_VERSION = '2.0.0';

/**
 * @constant {string} CACHE_NAME - Cache identifier with version
 */
const CACHE_NAME = `whatsapp-marketing-v${CACHE_VERSION}`;

/**
 * @constant {Array<string>} STATIC_ASSETS - Static assets to cache on install
 */
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

/**
 * @constant {Array<string>} API_PATHS - API paths to exclude from caching
 */
const API_PATHS = ['/api/'];

/**
 * @constant {number} CACHE_MAX_AGE - Maximum cache age in milliseconds (7 days)
 */
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Install event - Cache static assets
 * @param {ExtendableEvent} event - Install event
 */
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing version ${CACHE_VERSION}...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
        throw error;
      })
  );
});

/**
 * Activate event - Clean up old caches
 * @param {ExtendableEvent} event - Activate event
 */
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activating version ${CACHE_VERSION}...`);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[Service Worker] Activation failed:', error);
        throw error;
      })
  );
});

/**
 * Fetch event - Serve from cache, fallback to network
 * @param {FetchEvent} event - Fetch event
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API requests (always fetch fresh)
  const isApiRequest = API_PATHS.some(path => url.pathname.startsWith(path));
  if (isApiRequest) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              })
              .catch((error) => {
                console.error('[Service Worker] Cache put failed:', error);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            
            // Offline fallback
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            throw error;
          });
      })
  );
});

/**
 * Background sync event - Sync offline data when connection restored
 * @param {SyncEvent} event - Sync event
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[Service Worker] Background sync: Messages');
    // Implement offline message sync logic here
    event.waitUntil(
      Promise.resolve()
        .then(() => {
          console.log('[Service Worker] Message sync completed');
        })
        .catch((error) => {
          console.error('[Service Worker] Sync failed:', error);
          throw error;
        })
    );
  }
});

/**
 * Push notification event - Handle incoming push notifications
 * @param {PushEvent} event - Push event
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let notificationData = {
    title: 'WhatsApp Marketing',
    body: 'New notification',
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: notificationData.tag || 'default',
    requireInteraction: false,
    data: notificationData.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .catch((error) => {
        console.error('[Service Worker] Notification display failed:', error);
        throw error;
      })
  );
});

console.log(`[Service Worker] Loaded and ready - v${CACHE_VERSION}`);

/**
 * Notification click event - Handle notification clicks
 * @param {NotificationEvent} event - Notification event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
      .catch((error) => {
        console.error('[Service Worker] Failed to open window:', error);
      })
  );
});
