import { useState, useCallback } from 'react';

/**
 * Reusable modal state management.
 * @param {boolean} initialState
 */
export const useModal = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);
    const [data, setData] = useState(null);

    const open = useCallback((modalData = null) => {
        setData(modalData);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setData(null);
    }, []);

    return { isOpen, data, open, close };
};
