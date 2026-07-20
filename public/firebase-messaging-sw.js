try {
  importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyBlsfPOb2WcY_SQp3HgLuoOEJLtBllJxS8",
    authDomain: "familiesenter-837bb.firebaseapp.com",
    projectId: "familiesenter-837bb",
    storageBucket: "familiesenter-837bb.firebasestorage.app",
    messagingSenderId: "146555872592",
    appId: "1:146555872592:web:c16cd0d2eb179c21d17855"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'Familiesenter';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.data?.eventId || 'familiesenter',
      data: payload.data || {},
      requireInteraction: true,
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('[SW] Firebase messaging init failed:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', () => {
  // Pass through all requests — never intercept or cache
});
