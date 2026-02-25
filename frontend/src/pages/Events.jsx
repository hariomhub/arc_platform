import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Calendar, MapPin, ArrowRight, Monitor, BookOpen, Mic, Radio,
    AlertCircle, RefreshCw, Loader2, Plus, Pencil, Trash2, X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/events.js';
import { formatDate } from '../utils/dateFormatter.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import Pagination from '../components/common/Pagination.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_META = {
    webinar: { color: '#1D4ED8', bg: '#EFF6FF', icon: <Monitor size={13} /> },
    seminar: { color: '#16A34A', bg: '#F0FDF4', icon: <BookOpen size={13} /> },
    workshop: { color: '#D97706', bg: '#FFFBEB', icon: <Mic size={13} /> },
    podcast: { color: '#7C3AED', bg: '#FAF5FF', icon: <Radio size={13} /> },
};
const CATEGORIES = ['webinar', 'seminar', 'workshop', 'podcast'];
const TABS = ['upcoming', 'past'];
const ITEMS_PER_PAGE = 9;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ height: '24px', width: '30%', background: '#E2E8F0', borderRadius: '20px', marginBottom: '0.75rem', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '18px', width: '90%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '6px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '12px', width: '60%', background: '#E2E8F0', borderRadius: '4px', marginBottom: '1rem', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '36px', width: '100%', background: '#E2E8F0', borderRadius: '6px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
    </div>
);

// ─── Event Card ───────────────────────────────────────────────────────────────
const EventCard = ({ ev, isAdmin, onEdit, onDelete }) => {
    const cat = (ev.event_category || '').toLowerCase();
    const meta = CATEGORY_META[cat] || { color: '#64748B', bg: '#F1F5F9', icon: <Calendar size={13} /> };
    const isPast = !ev.is_upcoming;

    return (
        <div
            style={{
                background: 'white', borderRadius: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column',
                transition: 'box-shadow 0.2s, transform 0.2s',
                overflow: 'hidden',
            }}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,51,102,0.12)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            {/* Colour accent top bar */}
            <div style={{ height: '4px', background: meta.color }} />

            <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Category + past badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{
                        background: meta.bg, color: meta.color,
                        fontSize: '0.7rem', fontWeight: '700', padding: '3px 10px',
                        borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}>
                        {meta.icon} {ev.event_category}
                    </span>
                    {isPast && (
                        <span style={{ background: '#F1F5F9', color: '#64748B', fontSize: '0.65rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' }}>
                            PAST
                        </span>
                    )}
                </div>

                {/* Date */}
                <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={12} color={meta.color} />
                    {formatDate ? formatDate(ev.date) : new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Title */}
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    {ev.title}
                </h3>

                {/* Location */}
                {ev.location && (
                    <p style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.75rem', flexGrow: 1 }}>
                        <MapPin size={12} color={meta.color} /> {ev.location}
                    </p>
                )}

                {/* Description */}
                {ev.description && (
                    <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: '1.6', flexGrow: 1, marginBottom: '0.9rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ev.description}
                    </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    {isPast ? (
                        ev.recording_url ? (
                            <a
                                href={ev.recording_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#003366', color: 'white', padding: '0.55rem 1rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.82rem', textDecoration: 'none' }}
                            >
                                Watch Recording <ArrowRight size={13} />
                            </a>
                        ) : (
                            <span style={{ flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem 1rem', background: '#F1F5F9', color: '#94A3B8', borderRadius: '6px', fontWeight: '600', fontSize: '0.82rem' }}>
                                Recording Coming Soon
                            </span>
                        )
                    ) : (
                        ev.link ? (
                            <a
                                href={ev.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#003366', color: 'white', padding: '0.55rem 1rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.82rem', textDecoration: 'none' }}
                                onMouseOver={(e) => (e.currentTarget.style.background = '#00509E')}
                                onMouseOut={(e) => (e.currentTarget.style.background = '#003366')}
                            >
                                Register Now <ArrowRight size={13} />
                            </a>
                        ) : (
                            <span style={{ flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem 1rem', background: '#F1F5F9', color: '#94A3B8', borderRadius: '6px', fontWeight: '600', fontSize: '0.82rem' }}>
                                Registration TBD
                            </span>
                        )
                    )}

                    {/* Admin controls */}
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => onEdit(ev)}
                                title="Edit event"
                                style={{ background: '#F0F4F8', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.55rem 0.7rem', cursor: 'pointer', color: '#003366', display: 'flex', alignItems: 'center' }}
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => onDelete(ev)}
                                title="Delete event"
                                style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '0.55rem 0.7rem', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Event Form Modal ─────────────────────────────────────────────────────────
const EventFormModal = ({ initial, onSave, onClose }) => {
    const isEdit = Boolean(initial?.id);
    const [form, setForm] = useState({
        title: initial?.title || '',
        date: initial?.date ? new Date(initial.date).toISOString().slice(0, 16) : '',
        location: initial?.location || '',
        description: initial?.description || '',
        event_category: initial?.event_category || 'webinar',
        link: initial?.link || '',
        is_upcoming: initial?.is_upcoming !== false,
        recording_url: initial?.recording_url || '',
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { setError('Title is required.'); return; }
        if (!form.date) { setError('Date is required.'); return; }
        setError('');
        setSaving(true);
        try {
            await onSave(form);
        } catch (err) {
            setError(getErrorMessage(err));
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.65rem 0.75rem', border: '1.5px solid #CBD5E1',
        borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box',
        fontFamily: 'var(--font-sans)', outline: 'none',
    };
    const labelStyle = { display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#374151', marginBottom: '4px' };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose}
        >
            <div
                style={{ background: 'white', borderRadius: '14px', padding: '2rem', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                        {isEdit ? 'Edit Event' : 'Add Event'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div style={{ display: 'flex', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#DC2626', fontSize: '0.875rem' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} /> {error}
                    </div>
                )}

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} noValidate>
                    <div><label style={labelStyle}>Title *</label><input name="title" value={form.title} onChange={handleChange} disabled={saving} style={inputStyle} placeholder="Event title" onFocus={(e) => (e.target.style.borderColor = '#003366')} onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')} /></div>
                    <div><label style={labelStyle}>Date &amp; Time *</label><input name="date" type="datetime-local" value={form.date} onChange={handleChange} disabled={saving} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = '#003366')} onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')} /></div>
                    <div><label style={labelStyle}>Location</label><input name="location" value={form.location} onChange={handleChange} disabled={saving} style={inputStyle} placeholder="e.g. Online (Zoom)" onFocus={(e) => (e.target.style.borderColor = '#003366')} onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')} /></div>
                    <div><label style={labelStyle}>Description</label><textarea name="description" value={form.description} onChange={handleChange} disabled={saving} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Event description…" onFocus={(e) => (e.target.style.borderColor = '#003366')} onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')} /></div>
                    <div>
                        <label style={labelStyle}>Category</label>
                        <select name="event_category" value={form.event_category} onChange={handleChange} disabled={saving} style={{ ...inputStyle, cursor: 'pointer' }}>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                    </div>
                    <div><label style={labelStyle}>Registration Link (URL)</label><input name="link" type="url" value={form.link} onChange={handleChange} disabled={saving} style={inputStyle} placeholder="https://…" onFocus={(e) => (e.target.style.borderColor = '#003366')} onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')} /></div>
                    <div><label style={labelStyle}>Recording URL</label><input name="recording_url" type="url" value={form.recording_url} onChange={handleChange} disabled={saving} style={inputStyle} placeholder="https://…" onFocus={(e) => (e.target.style.borderColor = '#003366')} onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="is_upcoming" name="is_upcoming" checked={form.is_upcoming} onChange={handleChange} disabled={saving} />
                        <label htmlFor="is_upcoming" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>Is Upcoming (uncheck for past events)</label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: saving ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Event')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Confirm Delete Dialog ─────────────────────────────────────────────────────
const ConfirmDeleteDialog = ({ ev, onConfirm, onCancel, deleting }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onCancel}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
            <Trash2 size={32} color="#DC2626" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>Delete Event?</h3>
            <p style={{ color: '#64748B', lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Are you sure you want to delete <strong>&ldquo;{ev?.title}&rdquo;</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: '0.75rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '0.75rem', background: deleting ? '#94A3B8' : '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {deleting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                    {deleting ? 'Deleting…' : 'Delete'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Events Page ──────────────────────────────────────────────────────────────
const Events = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAdmin } = useAuth();
    const { showToast } = useToast();

    // URL-synced filters
    const tab = searchParams.get('tab') || 'upcoming';
    const category = searchParams.get('category') || 'all';
    const pageParam = parseInt(searchParams.get('page') || '1', 10);

    // Data state
    const [events, setEvents] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state
    const [editTarget, setEditTarget] = useState(null);   // null = closed, object = open (id=null means create)
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        document.title = 'Events | AI Risk Council';
    }, []);

    const fetchData = useCallback(async (signal) => {
        setLoading(true);
        setError('');
        try {
            const params = { tab, page: pageParam, limit: ITEMS_PER_PAGE };
            if (category !== 'all') params.category = category;
            const res = await getEvents(params);
            if (!signal?.aborted) {
                const payload = res.data?.data;
                setEvents(Array.isArray(payload) ? payload : (payload?.events || []));
                setTotalPages(payload?.totalPages || 1);
            }
        } catch (err) {
            if (!signal?.aborted) setError(getErrorMessage(err) || 'Failed to load events.');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [tab, category, pageParam]);

    useEffect(() => {
        const ctrl = new AbortController();
        fetchData(ctrl.signal);
        return () => ctrl.abort();
    }, [fetchData]);

    const setFilter = useCallback((key, value) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set(key, value);
            if (key !== 'page') next.set('page', '1');
            return next;
        });
    }, [setSearchParams]);

    // Admin save (create or update)
    const handleSave = useCallback(async (formData) => {
        if (editTarget?.id) {
            await updateEvent(editTarget.id, formData);
            showToast('Event updated successfully.', 'success');
        } else {
            await createEvent(formData);
            showToast('Event created successfully.', 'success');
        }
        setEditTarget(null);
        fetchData();
    }, [editTarget, showToast, fetchData]);

    // Admin delete
    const handleDelete = useCallback(async () => {
        setDeleting(true);
        try {
            await deleteEvent(deleteTarget.id);
            showToast('Event deleted.', 'success');
            setDeleteTarget(null);
            fetchData();
        } catch (err) {
            showToast(getErrorMessage(err) || 'Delete failed.', 'error');
        } finally {
            setDeleting(false);
        }
    }, [deleteTarget, showToast, fetchData]);

    const upcomingCount = events.filter((e) => e.is_upcoming).length;

    return (
        <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
            {/* ── Hero ───────────────────────────────────────────────────── */}
            <div style={{ background: 'linear-gradient(135deg, #002244 0%, #003366 55%, #005599 100%)', padding: '5rem 2rem 4rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <Calendar size={22} color="#60A5FA" />
                        <span style={{ color: '#93C5FD', fontWeight: '700', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Events &amp; Learning</span>
                    </div>
                    <h1 style={{ color: 'white', fontSize: '2.75rem', fontWeight: '800', marginBottom: '1rem', lineHeight: '1.15' }}>
                        AI Governance Events<br />for Risk Professionals
                    </h1>
                    <p style={{ color: '#CBD5E1', fontSize: '1.05rem', lineHeight: '1.7', maxWidth: '600px' }}>
                        Webinars, seminars, workshops, and podcast episodes designed for compliance leaders, risk officers, and technologists navigating the AI regulatory landscape.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => document.getElementById('all-events')?.scrollIntoView({ behavior: 'smooth' })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'white', color: '#003366', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
                        >
                            Browse Events <ArrowRight size={14} />
                        </button>
                        <Link to="/membership" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem', textDecoration: 'none' }}>
                            Join the Council
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── All Events ─────────────────────────────────────────────── */}
            <div id="all-events" style={{ padding: '3.5rem 2rem 5rem' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>

                    {/* Toolbar: tabs + filters + admin add button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                            {/* Tab bar */}
                            <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                                {TABS.map((t) => (
                                    <button key={t} onClick={() => setFilter('tab', t)} style={{ padding: '7px 20px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700', border: 'none', cursor: 'pointer', background: tab === t ? 'white' : 'transparent', color: tab === t ? '#003366' : '#64748B', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Category filter pills */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} role="group" aria-label="Filter by category">
                                {['all', ...CATEGORIES].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setFilter('category', c)}
                                        aria-pressed={category === c}
                                        style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', border: '1px solid', borderColor: category === c ? '#003366' : '#CBD5E1', background: category === c ? '#003366' : 'white', color: category === c ? 'white' : '#475569', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}
                                    >
                                        {c.charAt(0).toUpperCase() + c.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Admin add button */}
                        {isAdmin && isAdmin() && (
                            <button
                                onClick={() => setEditTarget({})}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                <Plus size={16} /> Add Event
                            </button>
                        )}
                    </div>

                    {/* Count label */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                            {tab === 'upcoming' ? 'Upcoming Events' : 'Past Events'}
                        </h2>
                        {!loading && (
                            <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: '500' }} aria-live="polite">
                                {events.length} event{events.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Loading skeleton */}
                    {loading && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }} aria-busy="true">
                            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#EF4444' }}>
                            <AlertCircle size={40} style={{ marginBottom: '1rem', opacity: 0.6 }} />
                            <p style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>{error}</p>
                            <button onClick={() => fetchData()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
                                <RefreshCw size={15} /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && events.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#94A3B8' }}>
                            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ fontSize: '1.05rem' }}>
                                {tab === 'upcoming' ? 'No upcoming events found.' : 'No past events found.'}
                            </p>
                            {category !== 'all' && (
                                <button onClick={() => setFilter('category', 'all')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#003366', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    Clear filter →
                                </button>
                            )}
                        </div>
                    )}

                    {/* Grid */}
                    {!loading && !error && events.length > 0 && (
                        <>
                            <div
                                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}
                                aria-live="polite"
                            >
                                {events.map((ev) => (
                                    <EventCard
                                        key={ev.id}
                                        ev={ev}
                                        isAdmin={isAdmin?.()}
                                        onEdit={(e) => setEditTarget(e)}
                                        onDelete={(e) => setDeleteTarget(e)}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
                                    <Pagination
                                        currentPage={pageParam}
                                        totalPages={totalPages}
                                        onPageChange={(p) => setFilter('page', String(p))}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── CTA ────────────────────────────────────────────────────── */}
            <div style={{ background: '#1E293B', padding: '4rem 2rem', textAlign: 'center' }}>
                <div className="container" style={{ maxWidth: '680px', margin: '0 auto' }}>
                    <h2 style={{ color: 'white', fontSize: '1.9rem', fontWeight: '800', marginBottom: '0.9rem' }}>Never Miss an Event</h2>
                    <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                        Council members receive priority registration, exclusive early-access invitations, and access to all session recordings in the members library.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/membership" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#003366', color: 'white', padding: '0.8rem 2rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.92rem', textDecoration: 'none' }}>
                            Join the Council <ArrowRight size={15} />
                        </Link>
                        <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'transparent', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.2)', padding: '0.8rem 2rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.92rem', textDecoration: 'none' }}>
                            Contact Us
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Modals ─────────────────────────────────────────────────── */}
            {editTarget !== null && (
                <EventFormModal
                    initial={editTarget}
                    onSave={handleSave}
                    onClose={() => setEditTarget(null)}
                />
            )}
            {deleteTarget && (
                <ConfirmDeleteDialog
                    ev={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    deleting={deleting}
                />
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default Events;
