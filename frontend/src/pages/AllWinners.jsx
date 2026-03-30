import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Trophy, Award, ChevronRight, X, Search,
    Linkedin, AlertCircle, RefreshCw, ArrowRight,
    Users, Star,
} from 'lucide-react';
import { getAwards, getNominees } from '../api/nominations.js';
import { useAuth } from '../hooks/useAuth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMELINE_META = {
    quarterly:     { label: 'Quarterly',   color: '#7C3AED', bg: '#F5F3FF' },
    'half-yearly': { label: 'Half-Yearly', color: '#0284C7', bg: '#EFF6FF' },
    yearly:        { label: 'Yearly',      color: '#059669', bg: '#F0FDF4' },
};

const getPhotoUrl = (photo_url) =>
    photo_url
        ? photo_url.startsWith('http') ? photo_url : `http://localhost:5000/${photo_url}`
        : null;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ height: '3px', background: '#E2E8F0' }} />
        <div style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F1F5F9', flexShrink: 0, animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ height: '14px', width: '70%', background: '#F1F5F9', borderRadius: '4px', marginBottom: '8px', animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ height: '10px', width: '50%', background: '#F1F5F9', borderRadius: '4px', animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
                </div>
            </div>
            <div style={{ height: '10px', width: '90%', background: '#F1F5F9', borderRadius: '4px', marginBottom: '6px', animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '10px', width: '65%', background: '#F1F5F9', borderRadius: '4px', marginBottom: '1rem', animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ height: '22px', width: '80px', background: '#F1F5F9', borderRadius: '4px', animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: '22px', width: '60px', background: '#F1F5F9', borderRadius: '4px', animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
            </div>
        </div>
    </div>
);

// ─── Winner Detail Modal ──────────────────────────────────────────────────────
const WinnerModal = ({ winner, onClose }) => {
    const tl = TIMELINE_META[winner.category_timeline] || TIMELINE_META.yearly;
    const photoUrl = getPhotoUrl(winner.photo_url);
    const achievements = winner.achievements
        ? winner.achievements.split(';').map(s => s.trim()).filter(Boolean)
        : [];
    const initials = winner.name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?';

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: '#FAFAFA', borderRadius: '16px', maxWidth: '580px', width: '100%', maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', position: 'relative' }}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <X size={15} />
                </button>

                {/* Header */}
                <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: 'clamp(1.25rem,3vw,1.75rem)', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', gap: 'clamp(0.75rem,2vw,1.25rem)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '12px', flexShrink: 0, background: photoUrl ? `url(${photoUrl}) center/cover no-repeat` : 'linear-gradient(145deg,#D97706 0%,#F59E0B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>
                            {!photoUrl && initials}
                        </div>
                        <div style={{ flex: 1, minWidth: '160px', paddingRight: '2.5rem' }}>
                            {winner.award_name && (
                                <p style={{ margin: '0 0 5px', fontSize: '0.68rem', fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{winner.award_name}</p>
                            )}
                            <h2 style={{ margin: '0 0 3px', fontSize: 'clamp(1.1rem,3vw,1.3rem)', fontWeight: '800', color: '#111827', lineHeight: '1.25', letterSpacing: '-0.01em' }}>{winner.name}</h2>
                            {winner.designation && <p style={{ margin: '0 0 2px', fontSize: '0.82rem', color: '#4B5563' }}>{winner.designation}</p>}
                            {winner.company && <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>{winner.company}</p>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontSize: '0.63rem', fontWeight: '700', padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Trophy size={9} /> Winner
                        </span>
                        {winner.category_name && (
                            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#92400E', background: '#FFFBEB', padding: '3px 10px', borderRadius: '6px' }}>
                                {winner.category_name}
                            </span>
                        )}
                        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: tl.color, background: tl.bg, padding: '3px 10px', borderRadius: '6px' }}>
                            {tl.label}
                        </span>
                        {winner.linkedin_url && (
                            <a href={winner.linkedin_url} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '600', color: '#0077B5', background: '#F0F9FF', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none', marginLeft: 'auto' }}
                                onMouseOver={e => e.currentTarget.style.background = '#E0F2FE'}
                                onMouseOut={e => e.currentTarget.style.background = '#F0F9FF'}>
                                <Linkedin size={11} /> LinkedIn
                            </a>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: 'clamp(1rem,3vw,1.5rem) clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {winner.description && (
                        <div>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>About</p>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: '1.75' }}>{winner.description}</p>
                        </div>
                    )}
                    {achievements.length > 0 && (
                        <div>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Key Achievements</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {achievements.map((a, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                                        <p style={{ margin: 0, fontSize: '0.845rem', color: '#374151', lineHeight: '1.65' }}>{a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.85rem 1.25rem', color: '#92400E', fontWeight: '700', fontSize: '0.88rem' }}>
                            <Trophy size={17} color="#D97706" /> Award Winner — Congratulations!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Winner Card ──────────────────────────────────────────────────────────────
const WinnerCard = ({ winner, onClick, index }) => {
    const [hovered, setHovered] = useState(false);
    const tl = TIMELINE_META[winner.category_timeline] || TIMELINE_META.yearly;
    const photoUrl = getPhotoUrl(winner.photo_url);
    const firstAchievement = winner.achievements ? winner.achievements.split(';')[0]?.trim() : null;

    return (
        <div
            onClick={() => onClick(winner)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'white',
                borderRadius: '14px',
                border: `1px solid ${hovered ? '#FCD34D' : '#E2E8F0'}`,
                cursor: 'pointer',
                boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.22s ease',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'aw-fadein 0.35s ease both',
                animationDelay: `${index * 0.04}s`,
            }}
        >
            <div style={{ height: '3px', background: 'linear-gradient(90deg,#F59E0B,#FBBF24,#F59E0B)', flexShrink: 0 }} />
            <div style={{ padding: '1.2rem 1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Winner badge */}
                <div style={{ alignSelf: 'flex-start', background: '#FEF3C7', color: '#92400E', fontSize: '0.58rem', fontWeight: '800', padding: '3px 9px', borderRadius: '20px', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '3px', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                    <Trophy size={8} /> Winner
                </div>
                {/* Person */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0, background: photoUrl ? `url(${photoUrl}) center/cover no-repeat` : 'linear-gradient(135deg,#D97706 0%,#FBBF24 100%)', border: '2px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>
                        {!photoUrl && winner.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '0.93rem', color: '#111827', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{winner.name}</p>
                        <p style={{ margin: '0 0 2px', fontSize: '0.73rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{winner.designation}</p>
                        {winner.company && <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{winner.company}</p>}
                    </div>
                </div>
                {/* Achievement snippet */}
                {firstAchievement && (
                    <p style={{ fontSize: '0.73rem', color: '#6B7280', lineHeight: '1.55', margin: '0 0 0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                        {firstAchievement}
                    </p>
                )}
                {/* Tags */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', gap: '5px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        {winner.category_name && (
                            <span style={{ background: '#FFFBEB', color: '#92400E', fontSize: '0.6rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {winner.category_name}
                            </span>
                        )}
                        <span style={{ background: tl.bg, color: tl.color, fontSize: '0.6rem', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${tl.color}22` }}>
                            {tl.label}
                        </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: hovered ? '#D97706' : '#9CA3AF', transition: 'color 0.18s', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        View <ChevronRight size={11} />
                    </span>
                </div>
            </div>
        </div>
    );
};

// ─── AllWinners Page ──────────────────────────────────────────────────────────
const AllWinners = () => {
    const navigate = useNavigate();

    const [winners, setWinners]   = useState([]);
    const [awards, setAwards]     = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [selected, setSelected] = useState(null);

    const [search, setSearch]                 = useState('');
    const [filterAward, setFilterAward]       = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterTimeline, setFilterTimeline] = useState('all');

    const searchRef = useRef(null);

    useEffect(() => { document.title = 'Award Winners | AI Risk Council'; }, []);

    const fetchData = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [nomRes, awardRes] = await Promise.allSettled([
                getNominees({ is_winner: true }),
                getAwards({}),
            ]);
            if (nomRes.status === 'fulfilled')   setWinners(nomRes.value.data?.data || []);
            if (awardRes.status === 'fulfilled') setAwards(awardRes.value.data?.data || []);
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load winners.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const allCategories = [...new Set(winners.map(n => n.category_name).filter(Boolean))];
    const allTimelines  = [...new Set(winners.map(n => n.category_timeline).filter(Boolean))];

    const filtered = winners.filter(n => {
        if (filterAward !== 'all' && String(n.award_id) !== filterAward) return false;
        if (filterCategory !== 'all' && n.category_name !== filterCategory) return false;
        if (filterTimeline !== 'all' && n.category_timeline !== filterTimeline) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return (
                n.name?.toLowerCase().includes(q) ||
                n.designation?.toLowerCase().includes(q) ||
                n.company?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const grouped = awards.reduce((acc, award) => {
        const group = filtered.filter(n => n.award_id === award.id);
        if (group.length > 0) acc.push({ award, nominees: group });
        return acc;
    }, []);

    const ungrouped = filtered.filter(n => !awards.find(a => a.id === n.award_id));
    const hasActiveFilters = search || filterAward !== 'all' || filterCategory !== 'all' || filterTimeline !== 'all';

    const clearFilters = () => {
        setSearch(''); setFilterAward('all');
        setFilterCategory('all'); setFilterTimeline('all');
        searchRef.current?.focus();
    };

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
            <style>{`
                @keyframes aw-fadein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes aw-pulse  { 0%,100%{opacity:1} 50%{opacity:0.45} }

                .aw-select {
                    padding: 6px 32px 6px 10px;
                    border: 1px solid #CBD5E1; border-radius: 8px;
                    font-size: 0.8rem; font-weight: 600; color: #374151;
                    background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
                    appearance: none; cursor: pointer;
                    font-family: var(--font-sans); outline: none; transition: border-color 0.15s;
                }
                .aw-select:focus { border-color: #003366; }

                .aw-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(280px,100%), 1fr));
                    gap: 1.25rem;
                }

                .aw-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
                .aw-search-wrap > svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
                .aw-search-input {
                    width: 100%; padding: 8px 36px;
                    border: 1px solid #CBD5E1; border-radius: 8px;
                    font-size: 0.85rem; font-family: var(--font-sans);
                    color: #1E293B; background: white; outline: none;
                    transition: border-color 0.15s; box-sizing: border-box;
                }
                .aw-search-input:focus { border-color: #003366; }
                .aw-search-input::placeholder { color: #94A3B8; }

                .aw-stat-card {
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 10px; padding: 1rem 1.25rem; text-align: center; min-width: 100px;
                }

                @media (max-width: 640px) {
                    .aw-hero-stats { flex-wrap: wrap; gap: 8px !important; }
                    .aw-filter-row { flex-direction: column; align-items: stretch !important; }
                    .aw-search-wrap { max-width: 100%; }
                }
            `}</style>

            {/* ── Hero ── */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 55%,#005599 100%)', padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,3rem)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.10) 1px,transparent 1px)', backgroundSize: '32px 32px', opacity: 0.4, pointerEvents: 'none' }} />

                <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
                        <button onClick={() => navigate('/events')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: '600', padding: 0, fontFamily: 'var(--font-sans)' }}
                            onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
                            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
                            Events
                        </button>
                        <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
                        <button onClick={() => navigate('/nominees')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: '600', padding: 0, fontFamily: 'var(--font-sans)' }}
                            onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
                            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
                            Nominees
                        </button>
                        <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: '600' }}>Winners</span>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '100px', padding: '4px 13px', marginBottom: '1rem' }}>
                        <Trophy size={12} color="#FBBF24" />
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Hall of Fame</span>
                    </div>

                    <h1 style={{ color: 'white', fontSize: 'clamp(1.6rem,4vw,2.6rem)', fontWeight: '800', margin: '0 0 0.75rem', lineHeight: '1.12', letterSpacing: '-0.02em' }}>
                        Award Winners
                    </h1>
                    <p style={{ color: '#CBD5E1', fontSize: 'clamp(0.875rem,1.5vw,1rem)', lineHeight: '1.7', maxWidth: '520px', margin: '0 0 1.75rem' }}>
                        Celebrating professionals recognised for outstanding contributions to AI governance, cybersecurity, and risk management.
                    </p>

                    <div className="aw-hero-stats" style={{ display: 'flex', gap: '12px' }}>
                        {[
                            { icon: <Trophy size={14} color="#FBBF24" />, val: winners.length,       label: 'Total Winners' },
                            { icon: <Award  size={14} color="#60A5FA" />, val: awards.length,        label: 'Awards' },
                            { icon: <Users  size={14} color="#34D399" />, val: allCategories.length, label: 'Categories' },
                        ].map(({ icon, val, label }) => (
                            <div key={label} className="aw-stat-card">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '4px' }}>{icon}</div>
                                <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{val}</p>
                                <p style={{ margin: '3px 0 0', fontSize: '0.63rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Sticky filter bar ── */}
            <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '1rem clamp(1rem,4vw,3rem)', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div className="aw-filter-row" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="aw-search-wrap">
                            <Search size={14} color="#94A3B8" />
                            <input ref={searchRef} className="aw-search-input" placeholder="Search by name, company…" value={search} onChange={e => setSearch(e.target.value)} />
                            {search && (
                                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}>
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {awards.length > 0 && (
                            <select className="aw-select" value={filterAward} onChange={e => setFilterAward(e.target.value)}>
                                <option value="all">All Awards</option>
                                {awards.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                            </select>
                        )}

                        {allCategories.length > 0 && (
                            <select className="aw-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                <option value="all">All Categories</option>
                                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}

                        {allTimelines.length > 0 && (
                            <select className="aw-select" value={filterTimeline} onChange={e => setFilterTimeline(e.target.value)}>
                                <option value="all">All Timelines</option>
                                {allTimelines.map(t => <option key={t} value={t}>{TIMELINE_META[t]?.label || t}</option>)}
                            </select>
                        )}

                        {!loading && (
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                {filtered.length} winner{filtered.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        {hasActiveFilters && (
                            <button onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,3rem)' }}>

                {loading && <div className="aw-grid">{[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}</div>}

                {error && !loading && (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                        <AlertCircle size={40} color="#EF4444" style={{ marginBottom: '1rem', opacity: 0.6 }} />
                        <p style={{ color: '#64748B', marginBottom: '1.25rem' }}>{error}</p>
                        <button onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontFamily: 'var(--font-sans)' }}>
                            <RefreshCw size={15} /> Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                        <Trophy size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', marginBottom: '0.5rem' }}>
                            {winners.length === 0 ? 'No winners announced yet.' : 'No results match your filters.'}
                        </h3>
                        <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            {winners.length === 0 ? 'Check back after the next award cycle.' : 'Try adjusting your filters or search term.'}
                        </p>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontFamily: 'var(--font-sans)' }}>
                                Clear All Filters
                            </button>
                        )}
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                        {grouped.map(({ award, nominees: group }) => (
                            <div key={award.id}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                                            <div style={{ width: '4px', height: '20px', background: 'linear-gradient(180deg,#F59E0B,#FBBF24)', borderRadius: '2px', flexShrink: 0 }} />
                                            <h2 style={{ margin: 0, fontSize: 'clamp(1rem,2.5vw,1.3rem)', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>{award.name}</h2>
                                        </div>
                                        {award.description && (
                                            <p style={{ margin: '0 0 0 12px', fontSize: '0.82rem', color: '#64748B', lineHeight: '1.6', maxWidth: '520px' }}>{award.description}</p>
                                        )}
                                    </div>
                                    <span style={{ background: '#FFFBEB', color: '#92400E', fontSize: '0.7rem', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', border: '1px solid #FDE68A', whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: '4px' }}>
                                        {group.length} winner{group.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="aw-grid">
                                    {group.map((n, i) => <WinnerCard key={n.id} winner={n} onClick={setSelected} index={i} />)}
                                </div>
                            </div>
                        ))}
                        {ungrouped.length > 0 && (
                            <div>
                                <h2 style={{ fontSize: 'clamp(1rem,2.5vw,1.3rem)', fontWeight: '800', color: '#0F172A', marginBottom: '1.5rem' }}>Other Winners</h2>
                                <div className="aw-grid">
                                    {ungrouped.map((n, i) => <WinnerCard key={n.id} winner={n} onClick={setSelected} index={i} />)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── CTA: cross-link to nominees ── */}
            {!loading && (
                <div style={{ background: '#1E293B', padding: 'clamp(2rem,5vw,3.5rem) clamp(1rem,4vw,2rem)', textAlign: 'center' }}>
                    <div style={{ maxWidth: '620px', margin: '0 auto' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '4px 14px', marginBottom: '1rem' }}>
                            <Star size={11} color="#FBBF24" />
                            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Open Nominations</span>
                        </div>
                        <h2 style={{ color: 'white', fontSize: 'clamp(1.2rem,3vw,1.75rem)', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                            Want to cast your vote?
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: 'clamp(0.875rem,1.5vw,0.97rem)', lineHeight: '1.7', marginBottom: '2rem' }}>
                            See all currently open nominations and vote for the professionals you believe deserve recognition this cycle.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => navigate('/nominees')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#003366', color: 'white', border: 'none', padding: '0.8rem 1.75rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
                                onMouseOver={e => e.currentTarget.style.background = '#002244'}
                                onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                                View Open Nominations <ArrowRight size={14} />
                            </button>
                            <button onClick={() => navigate('/membership')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'transparent', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.2)', padding: '0.8rem 1.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}>
                                Join the Council
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selected && <WinnerModal winner={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};

export default AllWinners;