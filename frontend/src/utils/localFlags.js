import { useCallback, useSyncExternalStore } from 'react';

/**
 * localFlags.js - small yes/no memories kept in this browser ("watched the tour", "shared my link").
 * They only make the page friendlier; anything that matters is decided on the server. Storage can be
 * blocked (private windows), so every access is guarded and the page works without it.
 *
 *   const [watched, setWatched] = useLocalFlag('tour:12');
 */

const EVENT = 'arc-local-flag';
const PREFIX = 'arc:';

const read = (key) => {
    try { return window.localStorage.getItem(PREFIX + key) === '1'; } catch { return false; }
};

export const setLocalFlag = (key, on = true) => {
    try {
        if (on) window.localStorage.setItem(PREFIX + key, '1');
        else window.localStorage.removeItem(PREFIX + key);
    } catch { /* storage unavailable: the flag simply does not stick */ }
    window.dispatchEvent(new Event(EVENT));
};

const subscribe = (notify) => {
    window.addEventListener(EVENT, notify);
    window.addEventListener('storage', notify);
    return () => {
        window.removeEventListener(EVENT, notify);
        window.removeEventListener('storage', notify);
    };
};

/** [value, set] for one flag. Every component that reads the same key updates together. */
export const useLocalFlag = (key) => {
    const value = useSyncExternalStore(subscribe, () => read(key), () => false);
    const set = useCallback((on = true) => setLocalFlag(key, on), [key]);
    return [value, set];
};
