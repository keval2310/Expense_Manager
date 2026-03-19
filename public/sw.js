const CACHE_NAME = 'kd-financial-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './logo.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Take over immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear old caches on update
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Handle SKIP_WAITING message from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip caching for API calls to ensure fresh data
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("push", (event) => {
  try {
    const data = event.data ? event.data.json() : { title: 'Notification', body: 'New activity detected' };
    const options = {
      body: data.body,
      icon: data.icon || "/logo.png",
      badge: "/logo.png",
      vibrate: [100, 50, 100],
      // 'tag' ensures only ONE notification shows at a time — new ones replace old ones
      tag: 'kd-financial-activity',
      renotify: true,
      data: {
        url: '/dashboard',
      },
    };

    event.waitUntil(
      // Close any existing notification with this tag before showing the new one
      self.registration.getNotifications({ tag: 'kd-financial-activity' })
        .then((notifications) => {
          notifications.forEach(n => n.close());
          return self.registration.showNotification(data.title || 'System Alert', options);
        })
    );
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Priority 1: find a window already showing the dashboard (root '/')
      const dashboardClient = clientList.find((c) => {
        const url = new URL(c.url);
        return url.origin === self.location.origin && url.pathname === '/';
      });

      if (dashboardClient) {
        return dashboardClient.focus();
      }

      // Priority 2: find any window at our origin and navigate it to '/'
      const anyClient = clientList.find(
        (c) => new URL(c.url).origin === self.location.origin
      );

      if (anyClient) {
        return anyClient.focus().then((focused) => {
          if (focused && 'navigate' in focused) {
            return focused.navigate('/');
          }
        });
      }

      // Priority 3: no window open at all — open a brand new one
      return clients.openWindow('/');
    })
  );
});
