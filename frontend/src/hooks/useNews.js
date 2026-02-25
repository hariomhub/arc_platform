import { useState, useEffect, useCallback, useRef } from 'react';
import { getNews } from '../api/news.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

export const useNews = (initialParams = {}) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [params, setParams] = useState({ page: 1, limit: 10, ...initialParams });
    const abortRef = useRef(null);

    const fetch = useCallback(async (currentParams) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        setError(null);
        try {
            const res = await getNews(currentParams);
            if (res.data?.success) setNews(res.data.data ?? []);
        } catch (err) {
            if (err?.code !== 'ERR_CANCELED') setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch(params);
        return () => abortRef.current?.abort();
    }, [params, fetch]);

    const refetch = useCallback(() => fetch(params), [fetch, params]);

    return { news, loading, error, params, setParams, refetch };
};
