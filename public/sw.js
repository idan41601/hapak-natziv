self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || 'חפ"ק נציב כבאות';
  const options = {
    body: data.body || '',
    icon: '/chapak-hero.jpg',
    badge: '/chapak-hero.jpg',
    dir: 'rtl',
    lang: 'he',
    vibrate: [200, 100, 200],
    data: { url: self.location.origin },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
