// Firebase Cloud Messaging - Service Worker (sin configs embebidas)
/* eslint-disable no-undef */

// Usa auto-init de Firebase Hosting para no exponer claves
// Disponible solo cuando se sirve desde Hosting: /__/firebase/... y /__/firebase/init.js
importScripts('/__/firebase/10.12.2/firebase-app-compat.js');
importScripts('/__/firebase/10.12.2/firebase-messaging-compat.js');
importScripts('/__/firebase/init.js');

// Inicializa Messaging desde la app ya inicializada por /__/firebase/init.js
const messaging = firebase.messaging();

// Manejo de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  const title = (payload && payload.notification && payload.notification.title) || 'Notificación';
  const body = (payload && payload.notification && payload.notification.body) || '';
  const options = {
    body,
    icon: '/favicon.ico',
    data: (payload && payload.data) || {}
  };
  self.registration.showNotification(title, options);
});

// Click en notificación: enfoca/abre la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

