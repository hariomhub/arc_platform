import { useState, useEffect, useCallback, useRef } from 'react';
import { getTeam } from '../api/team.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

export const useTeam = () => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    const fetch = useCallback(async () => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        setError(null);
        try {
            const res = await getTeam();
            if (res.data?.success) setTeam(res.data.data ?? []);
        } catch (err) {
            if (err?.code !== 'ERR_CANCELED') setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
        return () => abortRef.current?.abort();
    }, [fetch]);

    return { team, loading, error, refetch: fetch };
};
