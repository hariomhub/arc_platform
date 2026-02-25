import { useState, useEffect } from 'react';

/**
 * Debounce a value by the given delay (ms).
 * @param {*} value
 * @param {number} delay - default 300ms
 */
export const useDebounce = (value, delay = 300) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
};
