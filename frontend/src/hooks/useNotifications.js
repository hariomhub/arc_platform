/**
 * useNotifications.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   - FCM token registration after login
 *   - FCM token removal on logout
 *   - Unread count polling for bell badge
 *   - Foreground message handling (toast when app is open)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '../config/firebase.js';
import { registerPushToken, removePushToken, getUnreadCount } from '../api/notifications.js';

const POLL_INTERVAL_MS = 60 * 1000; // poll unread count every 60 seconds

const useNotifications = (user, isLoggedIn) => {
    const [unreadCount,   setUnreadCount]   = useState(0);
    const [fcmToken,      setFcmToken]      = useState(null);
    const pollIntervalRef = useRef(null);
    const tokenRegistered = useRef(false);

    // ── Fetch unread count ────────────────────────────────────────────────────
    const fetchUnreadCount = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await getUnreadCount();
            if (res.data?.success) {
                setUnreadCount(res.data.data.count || 0);
            }
        } catch {
            // silently fail — bell icon just shows stale count
        }
    }, [isLoggedIn]);

    // ── Register FCM token after login ────────────────────────────────────────
    const registerToken = useCallback(async () => {
        if (!isLoggedIn || tokenRegistered.current) return;

        // Only request permission after a short delay — don't bombard user on login
        setTimeout(async () => {
            try {
                const token = await requestNotificationPermission();
                if (token) {
                    await registerPushToken(token, 'web');
                    setFcmToken(token);
                    tokenRegistered.current = true;
                    console.info('[useNotifications] FCM token registered');
                }
            } catch (err) {
                console.error('[useNotifications] Token registration failed:', err.message);
            }
        }, 3000); // 3 second delay — let user settle after login
    }, [isLoggedIn]);

    // ── Remove FCM token on logout ────────────────────────────────────────────
    const removeToken = useCallback(async () => {
        if (!fcmToken) return;
        try {
            await removePushToken(fcmToken);
            setFcmToken(null);
            tokenRegistered.current = false;
            console.info('[useNotifications] FCM token removed');
        } catch (err) {
            console.error('[useNotifications] Token removal failed:', err.message);
        }
    }, [fcmToken]);

    // ── Handle foreground messages (app is open) ──────────────────────────────
    useEffect(() => {
        if (!isLoggedIn) return;

        const unsubscribe = onForegroundMessage((payload) => {
            console.info('[useNotifications] Foreground message:', payload);
            // Increment unread count when notification arrives while app is open
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [isLoggedIn]);

    // ── Start polling unread count ────────────────────────────────────────────
    useEffect(() => {
        if (!isLoggedIn) {
            setUnreadCount(0);
            clearInterval(pollIntervalRef.current);
            return;
        }

        fetchUnreadCount();

        pollIntervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

        // Also refetch when tab becomes visible
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') fetchUnreadCount();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(pollIntervalRef.current);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [isLoggedIn, fetchUnreadCount]);

    // ── Register token when user logs in ─────────────────────────────────────
    useEffect(() => {
        if (isLoggedIn) {
            registerToken();
        } else {
            tokenRegistered.current = false;
        }
    }, [isLoggedIn, registerToken]);

    return {
        unreadCount,
        setUnreadCount,
        fcmToken,
        removeToken,
        fetchUnreadCount,
    };
};

export default useNotifications;