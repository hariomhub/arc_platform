import api from './axios.js';

/**
 * Fire-and-forget view tracking for Chapter Lead performance numbers.
 * type: 'post' | 'blog' | 'event' | 'workshop'   metric: 'view' | 'recording_click'
 *
 * The server already de-duplicates per viewer per day; the sessionStorage guard
 * here just avoids sending the same request repeatedly while navigating. It never
 * throws and never blocks the page.
 */
export const trackView = (type, id, metric = 'view') => {
    if (!type || !id) return;
    const key = `arc_view:${type}:${id}:${metric}`;
    try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
    } catch {
        /* storage unavailable — fall through and let the server de-duplicate */
    }
    api.post('/views', { type, id, metric }).catch(() => {});
};
