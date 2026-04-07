/**
 * firebase.js
 * Firebase initialization for AI Risk Council web app.
 * Used for FCM push notifications only.
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let _app       = null;
let _messaging = null;

const getFirebaseApp = () => {
    if (!_app) _app = initializeApp(firebaseConfig);
    return _app;
};

export const getFirebaseMessaging = () => {
    if (!_messaging) {
        const app = getFirebaseApp();
        _messaging = getMessaging(app);
    }
    return _messaging;
};

export const requestNotificationPermission = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.info('[FCM] Notification permission denied');
            return null;
        }

        const messaging = getFirebaseMessaging();
        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });

        if (token) {
            console.info('[FCM] Token obtained');
            return token;
        }

        console.warn('[FCM] No token received');
        return null;
    } catch (err) {
        console.error('[FCM] Permission/token error:', err.message);
        return null;
    }
};

export const onForegroundMessage = (callback) => {
    try {
        const messaging = getFirebaseMessaging();
        return onMessage(messaging, callback);
    } catch (err) {
        console.error('[FCM] onMessage error:', err.message);
        return () => {};
    }
};