// Ethol Academic Notifier - Service Worker
const CACHE_NAME = 'ethol-sw-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => {
        if (k !== CACHE_NAME) {
          console.log('[SW] Menghapus cache usang:', k);
          return caches.delete(k);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('ethol-notifier') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, vibrate } = event.data;
    self.registration.showNotification(title || 'Ethol Academic Notifier', {
      body: body || 'Status presensi kuliah diperbarui.',
      icon: icon || '../src/sampul/book_cover.png',
      badge: '../src/sampul/book_cover.png',
      vibrate: vibrate || [200, 100, 200],
      tag: 'ethol-agent-sync',
    });
  }
});