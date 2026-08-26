import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { getTeam } from '../api/team.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import SearchInput from '../components/common/SearchInput.jsx';
import TeamCard from '../components/team/TeamCard.jsx';
import TeamBioModal from '../components/team/TeamBioModal.jsx';

const SkeletonCard = () => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#E2E8F0', margin: '0 auto 1rem', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '16px', width: '60%', background: '#E2E8F0', borderRadius: '4px', margin: '0 auto 8px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '12px', width: '40%', background: '#E2E8F0', borderRadius: '4px', margin: '0 auto', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
    </div>
);

const FILTERS = [
    { key: 'all',        label: 'All' },
    { key: 'founding',   label: 'Founding Members' },
    { key: 'permanent',  label: 'Permanent Members' },
    { key: 'governing',  label: 'Governing Body' },
];

const AllMembers = () => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => { document.title = 'All Members | Risk AI Council'; }, []);

    const fetchTeam = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const res = await getTeam({ limit: 500 });
            if (!signal?.aborted) setTeam(res.data?.data || []);
        } catch (err) {
            if (!signal?.aborted) setError(getErrorMessage(err) || 'Failed to load members.');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const ctrl = new AbortController();
        fetchTeam(ctrl.signal);
        return () => ctrl.abort();
    }, [fetchTeam]);

    const filtered = useMemo(() => {
        let list = team;
        if (filter === 'governing') list = list.filter((m) => m.is_governing_body);
        else if (filter !== 'all') list = list.filter((m) => (m.member_category || 'founding') === filter);

        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((m) =>
                m.name?.toLowerCase().includes(q) ||
                m.role?.toLowerCase().includes(q) ||
                m.bio?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [team, filter, search]);

    return (
        <div style={{ background: '#F8FAFC', minHeight: 'calc(100vh - 66px)' }}>
            <style>{`@keyframes skeleton-pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#005599 100%)', padding: 'clamp(1.5rem,3vw,2.25rem) clamp(1rem,4vw,2rem)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <Link to="/about" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none', marginBottom: '1rem' }}>
                        <ChevronLeft size={14} /> Back to About
                    </Link>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.5rem,4vw,2.2rem)', fontWeight: '800', margin: '0 0 0.5rem' }}>All Members</h1>
                    <p style={{ color: '#CBD5E1', fontSize: '0.95rem', margin: 0 }}>
                        {loading ? 'Loading…' : `${team.length} member${team.length !== 1 ? 's' : ''} across the council`}
                    </p>
                </div>
            </div>

            {/* Filter bar */}
            <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 5 }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem clamp(1rem,4vw,2rem)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
                        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, role, or bio…" />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {FILTERS.map(({ key, label }) => (
                            <button key={key} onClick={() => setFilter(key)}
                                style={{ padding: '6px 14px', borderRadius: '100px', border: `1.5px solid ${filter === key ? '#003366' : '#E2E8F0'}`, background: filter === key ? '#003366' : 'white', color: filter === key ? 'white' : '#475569', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)' }}>
                {loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))', gap: '1.5rem' }} aria-busy="true">
                        {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
                    </div>
                )}

                {error && !loading && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444' }}>
                        <AlertCircle size={36} style={{ marginBottom: '1rem', opacity: 0.6, display: 'block', margin: '0 auto 1rem' }} />
                        <p style={{ marginBottom: '1rem' }}>{error}</p>
                        <button onClick={() => fetchTeam()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                            <RefreshCw size={15} /> Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#94A3B8', fontWeight: '600' }}>
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        </p>
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94A3B8' }}>
                                <Users size={38} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.85rem' }} />
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>No members match your search.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))', gap: '1.5rem' }} aria-live="polite">
                                {filtered.map((member) => (
                                    <TeamCard key={member.id} member={member} onSelect={setSelectedMember} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedMember && <TeamBioModal member={selectedMember} onClose={() => setSelectedMember(null)} />}
        </div>
    );
};

export default AllMembers;
