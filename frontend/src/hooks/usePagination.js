import { useState, useCallback } from 'react';

/**
 * Reusable pagination logic.
 * @param {number} initialPage
 * @param {number} initialLimit
 */
export const usePagination = (initialPage = 1, initialLimit = 10) => {
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);
    const [total, setTotal] = useState(0);

    const totalPages = Math.ceil(total / limit) || 0;

    const goToPage = useCallback(
        (p) => setPage(Math.max(1, Math.min(p, totalPages || 1))),
        [totalPages]
    );

    const nextPage = useCallback(() => goToPage(page + 1), [goToPage, page]);
    const prevPage = useCallback(() => goToPage(page - 1), [goToPage, page]);

    return {
        page,
        limit,
        total,
        totalPages,
        setTotal,
        setLimit,
        goToPage,
        nextPage,
        prevPage,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
};
