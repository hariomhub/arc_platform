import { useState, useEffect, useCallback, useRef } from 'react';
import { getQnaPosts } from '../api/qna.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

export const useQnA = (initialParams = {}) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const [params, setParams] = useState({ page: 1, limit: 10, ...initialParams });

    const abortRef = useRef(null);

    const fetch = useCallback(async (currentParams) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        setError(null);
        try {
            const res = await getQnaPosts(currentParams);
            if (res.data?.success) {
                const { data, total, page, limit, totalPages } = res.data;
                setPosts(data ?? []);
                setPagination({ total, page, limit, totalPages });
            }
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

    return { posts, loading, error, pagination, params, setParams, refetch };
};
