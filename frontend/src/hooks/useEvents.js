import { useState, useEffect, useCallback, useRef } from 'react';
import { getEvents } from '../api/events.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

/**
 * Encapsulates all event fetching logic with pagination and filtering.
 * @param {object} initialParams
 */
export const useEvents = (initialParams = {}) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const [params, setParams] = useState({
        page: 1,
        limit: 10,
        ...initialParams,
    });

    const abortRef = useRef(null);

    const fetch = useCallback(async (currentParams) => {
        // Cancel previous request
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const res = await getEvents(currentParams);
            if (res.data?.success) {
                const { data, total, page, limit, totalPages } = res.data;
                setEvents(data ?? []);
                setPagination({ total, page, limit, totalPages });
            }
        } catch (err) {
            if (err?.code !== 'ERR_CANCELED') {
                setError(getErrorMessage(err));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch(params);
        return () => abortRef.current?.abort();
    }, [params, fetch]);

    const refetch = useCallback(() => fetch(params), [fetch, params]);

    return { events, loading, error, pagination, params, setParams, refetch };
};
