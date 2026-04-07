// firebase-messaging-sw.js
// Place this file in frontend/public/firebase-messaging-sw.js
// This service worker handles background push notifications when the app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These values are injected at build time or set directly here
// They must match your frontend .env values
firebase.initializeApp({
    apiKey:            'AIzaSyBOfqLR5iID5tWYh-YXVurMj553m6Wqaek',
    authDomain:        'riskaicouncil-rac.firebaseapp.com',
    projectId:         'riskaicouncil-rac',
    storageBucket:     'riskaicouncil-rac.firebasestorage.app',
    messagingSenderId: '939401755916',
    appId:             '1:939401755916:web:8d5f45a3061756ba639d29',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const { title, body } = payload.notification || {};
    const data = payload.data || {};

    const notificationTitle = title || "What's new on AI Risk Council";
    const notificationOptions = {
        body:    body || 'You have new updates.',
        icon:    '/ai_logo.png',
        badge:   '/ai_logo.png',
        data:    { url: data.url || 'https://www.riskaicouncil.com' },
        requireInteraction: false,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || 'https://www.riskaicouncil.com';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});