import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen, Calendar, MapPin, Mic2,
    Loader2, AlertCircle, RefreshCw, Play, Clock, User,
    X, FileText, ExternalLink,
} from 'lucide-react';
import { getWorkshops } from '../api/workshops.js';
import { formatDate, formatDateTime } from '../utils/dateFormatter.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import Pagination from '../components/common/Pagination.jsx';

const ITEMS_PER_PAGE = 12;

// ─── Workshop Detail Modal ────────────────────────────────────────────────────
const WorkshopModal = ({ ws, onClose }) => {
    const overlayRef = useRef(null);
    const isPast = !ws.is_upcoming;

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    // Close on backdrop click
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,10,30,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
                animation: 'modal-fade 0.18s ease',
            }}
        >
            <style>{`
                @keyframes modal-fade { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
            `}</style>

            <div style={{
                background: 'white', borderRadius: '20px',
                width: '100%', maxWidth: '640px',
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
            }}>
                {/* Banner / Header */}
                {ws.banner_image && (
                    <div style={{
                        height: '200px',
                        background: `url(${ws.banner_image}) center/cover no-repeat`,
                        borderRadius: '20px 20px 0 0',
                        flexShrink: 0,
                        position: 'relative',
                    }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,26,51,0.45)', borderRadius: '20px 20px 0 0' }} />
                    </div>
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '14px', right: '14px',
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: ws.banner_image ? 'rgba(0,0,0,0.45)' : '#F1F5F9', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: ws.banner_image ? 'white' : '#64748B', zIndex: 10,
                        backdropFilter: ws.banner_image ? 'blur(4px)' : 'none',
                    }}
                    aria-label="Close"
                >
                    <X size={16} />
                </button>

                {/* Content */}
                <div style={{ padding: '1.75rem 2rem 2rem' }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span style={{
                            background: isPast ? '#f1f5f9' : '#eff6ff',
                            color: isPast ? '#475569' : '#1d4ed8',
                            fontSize: '0.65rem', fontWeight: '700', padding: '3px 10px',
                            borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>
                            <Mic2 size={9} />
                            {isPast ? 'Past Workshop' : 'Upcoming Workshop'}
                        </span>
                        <span style={{
                            background: '#f5f3ff', color: '#7c3aed',
                            fontSize: '0.65rem', fontWeight: '700', padding: '3px 10px',
                            borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>
                            Executive
                        </span>
                    </div>

                    {/* Title */}
                    <h2 style={{
                        fontSize: 'clamp(1.2rem,3vw,1.55rem)', fontWeight: '900',
                        color: '#0f172a', margin: '0 0 1.25rem', lineHeight: '1.25',
                    }}>
                        {ws.title}
                    </h2>

                    {/* Meta grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px,100%),1fr))',
                        gap: '0.75rem', marginBottom: '1.5rem',
                        background: '#f8fafc', borderRadius: '12px', padding: '1rem',
                        border: '1px solid #e2e8f0',
                    }}>
                        {/* Date */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Calendar size={15} color="#1d4ed8" />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Date & Time</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                                    {formatDateTime(ws.date)}
                                </p>
                            </div>
                        </div>

                        {/* Speaker */}
                        {ws.speaker && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <User size={15} color="#7c3aed" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Speaker</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>{ws.speaker}</p>
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        {ws.location && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={15} color="#16a34a" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>{ws.location}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {ws.description && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                About this Workshop
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.75' }}>
                                {ws.description}
                            </p>
                        </div>
                    )}

                    {/* Agenda */}
                    {ws.agenda && (
                        <div style={{
                            marginBottom: '1.5rem',
                            background: '#fafafa', border: '1px solid #e2e8f0',
                            borderRadius: '12px', padding: '1rem 1.25rem',
                        }}>
                            <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={13} color="#003366" /> Agenda
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: '1.75', whiteSpace: 'pre-line' }}>
                                {ws.agenda}
                            </p>
                        </div>
                    )}

                    {/* CTA */}
                    {isPast && ws.recording_url ? (
                        <a
                            href={ws.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                background: '#003366', color: 'white',
                                padding: '0.75rem 1.75rem', borderRadius: '10px',
                                fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none',
                                width: '100%', justifyContent: 'center', boxSizing: 'border-box',
                            }}
                        >
                            <Play size={15} fill="white" /> Watch Recording
                            <ExternalLink size={13} style={{ opacity: 0.7 }} />
                        </a>
                    ) : !isPast ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                            borderRadius: '10px', padding: '0.85rem',
                        }}>
                            <Clock size={15} color="#16a34a" />
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#16a34a' }}>Upcoming — Details to Follow</span>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '10px', padding: '0.85rem',
                        }}>
                            <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Recording Coming Soon</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Workshop Card ─────────────────────────────────────────────────────────────
const WorkshopCard = ({ ws, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const isPast = !ws.is_upcoming;

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'white', borderRadius: '16px', overflow: 'hidden',
                border: `1px solid ${hovered ? '#93c5fd' : '#e2e8f0'}`,
                boxShadow: hovered ? '0 12px 40px rgba(0,51,102,0.14)' : '0 2px 10px rgba(0,0,0,0.06)',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.22s ease',
                display: 'flex', flexDirection: 'column',
                cursor: 'pointer',
            }}
        >
            {/* Accent bar */}
            <div style={{ height: '4px', background: isPast ? '#94a3b8' : 'linear-gradient(90deg, #003366, #0055a5)' }} />

            {/* Banner */}
            {ws.banner_image && (
                <div style={{ height: '160px', background: `url(${ws.banner_image}) center/cover no-repeat`, flexShrink: 0 }} />
            )}

            <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Badges */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{
                        background: isPast ? '#f1f5f9' : '#eff6ff',
                        color: isPast ? '#64748b' : '#1d4ed8',
                        fontSize: '0.65rem', fontWeight: '700', padding: '3px 10px',
                        borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                        <Mic2 size={10} />
                        {isPast ? 'Past Workshop' : 'Upcoming Workshop'}
                    </span>
                    <span style={{
                        background: '#f5f3ff', color: '#7c3aed',
                        fontSize: '0.65rem', fontWeight: '700', padding: '3px 10px',
                        borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                        Executive
                    </span>
                </div>

                {/* Date */}
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={12} color="#0284c7" />
                    {formatDate(ws.date)}
                </p>

                {/* Title */}
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: '0 0 0.5rem', lineHeight: '1.4' }}>
                    {ws.title}
                </h3>

                {/* Speaker */}
                {ws.speaker && (
                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={12} color="#7c3aed" /> {ws.speaker}
                    </p>
                )}

                {/* Location */}
                {ws.location && (
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={12} color="#0284c7" /> {ws.location}
                    </p>
                )}

                {/* Description preview */}
                {ws.description && (
                    <p style={{
                        fontSize: '0.83rem', color: '#64748b', lineHeight: '1.6',
                        flexGrow: 1, marginBottom: '1rem',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        {ws.description}
                    </p>
                )}

                {/* Bottom CTA */}
                {isPast && ws.recording_url ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: '8px', padding: '0.55rem 0.9rem', marginTop: 'auto',
                    }}>
                        <Play size={12} color="#1d4ed8" fill="#1d4ed8" />
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1d4ed8' }}>Recording Available — Click to View</span>
                    </div>
                ) : !isPast ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: '8px', padding: '0.55rem 0.9rem', marginTop: 'auto',
                    }}>
                        <Clock size={13} color="#16a34a" />
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#16a34a' }}>Upcoming — Click for Details</span>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '8px', padding: '0.55rem 0.9rem', marginTop: 'auto',
                    }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click to View Details</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ExecutiveWorkshops = () => {
    const [workshops, setWorkshops] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [page, setPage]           = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal]         = useState(0);
    const [tab, setTab]             = useState('upcoming');
    const [selectedWs, setSelectedWs] = useState(null); // modal

    useEffect(() => { document.title = 'Executive Workshops | AI Risk Council'; }, []);

    const fetchWorkshops = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page, limit: ITEMS_PER_PAGE };
            if (tab === 'upcoming') params.upcoming = 'true';
            else if (tab === 'past') params.upcoming = 'false';
            const res = await getWorkshops(params);
            const payload = res.data;
            setWorkshops(payload.data || []);
            setTotal(payload.total || 0);
            setTotalPages(payload.totalPages || 1);
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load workshops.');
        } finally {
            setLoading(false);
        }
    }, [page, tab]);

    useEffect(() => { fetchWorkshops(); }, [fetchWorkshops]);

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
            `}</style>

            {/* ── Modal ── */}
            {selectedWs && (
                <WorkshopModal ws={selectedWs} onClose={() => setSelectedWs(null)} />
            )}

            {/* ── Hero ── */}
            <div style={{
                background: 'linear-gradient(135deg, #001a33 0%, #003366 60%, #005599 100%)',
                padding: 'clamp(2rem,4vw,3.5rem) clamp(1rem,4vw,3rem)',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <BookOpen size={20} color="#60a5fa" />
                        <span style={{ color: '#93c5fd', fontWeight: '700', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Executive Programme</span>
                    </div>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: '900', margin: '0 0 1rem', lineHeight: '1.15' }}>
                        Executive Workshops
                    </h1>
                    <p style={{ color: '#cbd5e1', fontSize: 'clamp(0.9rem,1.5vw,1.05rem)', lineHeight: '1.7', maxWidth: '600px', margin: 0 }}>
                        Half-day and full-day immersive sessions for Board Directors and C-Suite leaders to build AI risk literacy and fulfil their fiduciary oversight responsibilities.
                    </p>
                    {total > 0 && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '1.75rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'white', fontSize: '0.8rem', fontWeight: '600' }}>
                                {total} Workshop{total !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,2rem)' }}>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', borderRadius: '10px', padding: '4px', width: 'fit-content', marginBottom: '2rem' }}>
                    {[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }, { key: 'all', label: 'All' }].map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setTab(t.key); setPage(1); }}
                            style={{
                                padding: '0.5rem 1.25rem', borderRadius: '7px', fontSize: '0.85rem',
                                fontWeight: '700', border: 'none', cursor: 'pointer',
                                background: tab === t.key ? 'white' : 'transparent',
                                color: tab === t.key ? '#003366' : '#64748b',
                                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                                transition: 'all 0.15s', fontFamily: 'inherit',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div style={{ display: 'flex', gap: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1rem 1.25rem', color: '#dc2626', marginBottom: '1.5rem', alignItems: 'center' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem' }}>{error}</span>
                        <button onClick={fetchWorkshops} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><RefreshCw size={15} /></button>
                    </div>
                )}

                {/* Loading skeletons */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%),1fr))', gap: '1.5rem' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{ background: 'white', borderRadius: '16px', height: '320px', border: '1px solid #e2e8f0', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                        ))}
                    </div>
                ) : workshops.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <BookOpen size={40} style={{ opacity: 0.18, display: 'block', margin: '0 auto 1rem', color: '#003366' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: '0 0 0.5rem' }}>No workshops yet</p>
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
                            {tab === 'upcoming' ? 'No upcoming workshops scheduled. Check back soon!' : 'No workshops found for this filter.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%),1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            {workshops.map(ws => (
                                <WorkshopCard key={ws.id} ws={ws} onClick={() => setSelectedWs(ws)} />
                            ))}
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    );
};

export default ExecutiveWorkshops;
