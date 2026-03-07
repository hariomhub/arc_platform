import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, X, Filter, ChevronLeft, ChevronRight,
    Download, Trash2, FileText, BookOpen,
    Video, Globe, Lock, Plus, AlertCircle, CheckCircle,
    Edit2, Shield, Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getResources, uploadResource, updateResource, deleteResource, downloadResource } from '../api/resources.js';
import { getErrorMessage, downloadBlob } from '../utils/apiHelpers.js';
import { formatDate } from '../utils/dateFormatter.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_OPTIONS = ['article', 'whitepaper', 'video', 'tool', 'news', 'homepage video', 'lab result', 'product'];

const TYPE_ICONS = {
    article:          <FileText size={12} />,
    whitepaper:       <BookOpen size={12} />,
    video:            <Video size={12} />,
    tool:             <Globe size={12} />,
    news:             <FileText size={12} />,
    'homepage video': <Video size={12} />,
    'lab result':     <FileText size={12} />,
    product:          <Globe size={12} />,
};

const TYPE_COLORS = {
    article: '#3B82F6', whitepaper: '#8B5CF6', video: '#EC4899',
    tool: '#10B981', news: '#F59E0B', 'homepage video': '#EF4444',
    'lab result': '#6366F1', product: '#0EA5E9',
};

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
    label: { display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#1e293b' },
    input: { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', color: '#1e293b', background: '#fafafa', boxSizing: 'border-box', outline: 'none' },
    btnPrim: { padding: '0.65rem 1.25rem', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.15s' },
    btnSec: { padding: '0.65rem 1.25rem', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.15s' },
};

// ─── Upload / Edit Modal ──────────────────────────────────────────────────────
const ResourceModal = ({ resource, onClose, onSaved, showToast }) => {
    const isEdit = !!resource;
    const [form, setForm] = useState({
        title: resource?.title || '',
        summary: resource?.summary || resource?.description || '',
        source_url: resource?.source_url || '',
        category_slug: resource?.category_slug || '',
        type: resource?.type || 'article',
        access_level: resource?.access_level || 'public',
    });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.summary.trim()) { setError('Title and summary are required.'); return; }
        setLoading(true); setError('');
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (file) fd.append('file', file);

            let saved;
            if (isEdit) {
                const res = await updateResource(resource.id, fd);
                saved = res.data?.data || res.data;
            } else {
                const res = await uploadResource(fd);
                saved = res.data?.data || res.data;
            }
            onSaved(saved, isEdit);
            showToast(isEdit ? 'Resource updated!' : 'Resource uploaded!', 'success');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
                {/* Header */}
                <div style={{ padding: '1.4rem 1.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#001a33,#003366)', borderRadius: '16px 16px 0 0' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'white', fontFamily: 'var(--font-sans)', fontWeight: '700' }}>
                        {isEdit ? '✏️  Edit Resource' : '📤  Upload New Resource'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '6px', padding: '0.3rem', display: 'flex' }}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div>
                        <label style={S.label}>Title *</label>
                        <input name="title" value={form.title} onChange={handleChange} style={S.input} placeholder="Resource title" />
                    </div>
                    <div>
                        <label style={S.label}>Summary *</label>
                        <textarea name="summary" value={form.summary} onChange={handleChange} rows={3} style={{ ...S.input, resize: 'vertical' }} placeholder="Brief description..." />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={S.label}>Type</label>
                            <select name="type" value={form.type} onChange={handleChange} style={S.input}>
                                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={S.label}>Access Level</label>
                            <select name="access_level" value={form.access_level} onChange={handleChange} style={S.input}>
                                <option value="public">Public</option>
                                <option value="registered">Member Only</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={S.label}>Category Slug</label>
                        <input name="category_slug" value={form.category_slug} onChange={handleChange} style={S.input} placeholder="e.g. governance" />
                    </div>
                    <div>
                        <label style={S.label}>Source URL</label>
                        <input name="source_url" value={form.source_url} onChange={handleChange} style={S.input} placeholder="https://..." />
                    </div>
                    <div>
                        <label style={S.label}>File <span style={{ fontWeight: 400, color: '#64748b' }}>(PDF, Word, Excel, PowerPoint, Image, Video)</span></label>
                        <input type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.ogv,.mov,.avi"
                            onChange={(e) => setFile(e.target.files[0])}
                            style={{ fontSize: '0.85rem', color: '#475569', fontFamily: 'var(--font-sans)' }} />
                        {resource?.file_path && !file && (
                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                Current: <em>{String(resource.file_path).split('/').pop()}</em>
                            </p>
                        )}
                    </div>

                    {error && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem 0.9rem', color: '#dc2626', fontSize: '0.85rem' }}>
                            <AlertCircle size={15} /> {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <button type="button" onClick={onClose} style={S.btnSec}>Cancel</button>
                        <button type="submit" disabled={loading} style={{ ...S.btnPrim, flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: loading ? 0.7 : 1 }}>
                            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : (isEdit ? 'Save Changes' : 'Upload Resource')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
const DeleteDialog = ({ onConfirm, onCancel }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        onClick={onCancel}>
        <div style={{ background: 'white', borderRadius: '14px', padding: '2rem', maxWidth: '380px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '50px', height: '50px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px solid #fecaca' }}>
                <Trash2 size={22} color="#dc2626" />
            </div>
            <h3 style={{ margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.05rem', fontWeight: '700', textAlign: 'center' }}>Delete Resource?</h3>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.88rem', textAlign: 'center', lineHeight: '1.5' }}>
                This action cannot be undone. The file and all associated data will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={onCancel} style={{ ...S.btnSec, flex: 1 }}>Cancel</button>
                <button onClick={onConfirm} style={{ ...S.btnPrim, flex: 1, background: '#dc2626' }}>Delete</button>
            </div>
        </div>
    </div>
);

// ─── Resource Card ────────────────────────────────────────────────────────────
const ResourceCard = ({ resource, onDownload, onEdit, onDelete, downloading }) => {
    const accent = TYPE_COLORS[resource.type] || '#003366';
    return (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s, transform 0.2s', display: 'flex', flexDirection: 'column' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
            {/* Top accent bar */}
            <div style={{ height: '3px', background: accent }} />
            <div style={{ padding: '1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {/* Type + Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', color: accent, background: `${accent}14`, padding: '0.2rem 0.55rem', borderRadius: '100px' }}>
                        {TYPE_ICONS[resource.type] || <FileText size={12} />} {resource.type}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDate(resource.created_at)}</span>
                </div>

                {/* Title + Summary */}
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.35' }}>{resource.title}</h3>
                {(resource.summary || resource.description) && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {resource.summary || resource.description}
                    </p>
                )}

                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                    {resource.category_slug && (
                        <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '100px', fontWeight: '500' }}>
                            {resource.category_slug}
                        </span>
                    )}
                    <span style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.15rem 0.5rem', borderRadius: '100px', fontWeight: '600', background: resource.access_level === 'public' ? '#f0fdf4' : '#fef9c3', color: resource.access_level === 'public' ? '#15803d' : '#a16207' }}>
                        {resource.access_level === 'public' ? <Globe size={9} /> : <Lock size={9} />}
                        {resource.access_level === 'public' ? 'Public' : 'Member'}
                    </span>
                    {resource.status && resource.status !== 'approved' && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '100px', fontWeight: '600', background: resource.status === 'pending' ? '#fef3c7' : '#fef2f2', color: resource.status === 'pending' ? '#b45309' : '#dc2626', textTransform: 'capitalize' }}>
                            {resource.status}
                        </span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0.7rem 1.1rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fafafa' }}>
                <button onClick={() => onDownload(resource)} disabled={downloading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', padding: '0.35rem 0.8rem', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: downloading ? 0.6 : 1, transition: 'background 0.15s' }}
                    onMouseEnter={(e) => !downloading && (e.currentTarget.style.background = '#004080')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#003366')}>
                    {downloading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />}
                    Download
                </button>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: 'auto' }}>{resource.download_count || 0} downloads</span>
                <button onClick={() => onEdit(resource)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.33rem 0.55rem', cursor: 'pointer' }}
                    title="Edit">
                    <Edit2 size={12} color="#1d4ed8" />
                </button>
                <button onClick={() => onDelete(resource.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.33rem 0.55rem', cursor: 'pointer' }}
                    title="Delete">
                    <Trash2 size={12} color="#dc2626" />
                </button>
            </div>
        </div>
    );
};

// ─── Main Resources Page ──────────────────────────────────────────────────────
const Resources = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterAccess, setFilterAccess] = useState('all');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [modal, setModal] = useState(null);  // null | { mode: 'create' | 'edit', resource?: {} }
    const [deleteId, setDeleteId] = useState(null);
    const [downloading, setDownloading] = useState({});

    useEffect(() => { document.title = 'Research & Resources | ARC'; }, []);

    const fetchResources = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { limit: 100 };
            if (filterType !== 'all') params.type = filterType;
            const res = await getResources(params);
            const payload = res.data?.data;
            setResources(Array.isArray(payload) ? payload : (payload?.resources || []));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    // Client-side search + access filter
    const filtered = resources.filter((r) => {
        const q = search.toLowerCase();
        const matchSearch = !search || r.title?.toLowerCase().includes(q) || (r.summary || r.description || '').toLowerCase().includes(q);
        const matchAccess = filterAccess === 'all' || r.access_level === filterAccess;
        return matchSearch && matchAccess;
    });

    const typeCounts = TYPE_OPTIONS.reduce((acc, t) => {
        acc[t] = resources.filter((r) => r.type === t).length;
        return acc;
    }, {});

    const handleDownload = async (r) => {
        setDownloading((p) => ({ ...p, [r.id]: true }));
        try {
            const res = await downloadResource(r.id);
            downloadBlob(res.data, r.title || 'download');
            setResources((prev) => prev.map((x) => x.id === r.id ? { ...x, download_count: (x.download_count || 0) + 1 } : x));
            showToast('Download started!', 'success');
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setDownloading((p) => ({ ...p, [r.id]: false }));
        }
    };

    const handleDelete = async () => {
        try {
            await deleteResource(deleteId);
            setResources((prev) => prev.filter((r) => r.id !== deleteId));
            showToast('Resource deleted.', 'success');
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        }
        setDeleteId(null);
    };

    const handleSaved = (saved, isEdit) => {
        if (isEdit) setResources((prev) => prev.map((r) => r.id === saved.id ? saved : r));
        else setResources((prev) => [saved, ...prev]);
        setModal(null);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-sans)' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
                .res-filter-btn { width:100%; display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.7rem; border:none; background:transparent; color:#475569; font-size:0.83rem; font-weight:500; cursor:pointer; border-radius:7px; text-align:left; transition:background 0.15s, color 0.15s; font-family:var(--font-sans); }
                .res-filter-btn:hover { background:#f1f5f9; color:#003366; }
                .res-filter-btn.active { background:#003366; color:white; font-weight:700; }
                .res-search-input:focus { border-color:#003366 !important; box-shadow: 0 0 0 3px rgba(0,51,102,0.08); }
            `}</style>

            {/* ── Hero ── */}
            <div style={{ background: 'linear-gradient(135deg, #002244 0%, #003366 55%, #005599 100%)', padding: '3rem 2rem 4rem', position: 'relative', overflow: 'hidden' }}>
                {/* decorative circles */}
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

                <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.12)', borderRadius: '100px', padding: '0.3rem 0.9rem', marginBottom: '1.1rem', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
                        <Shield size={13} color="#A78BFA" /> Knowledge Library
                    </div>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '800', margin: '0 0 0.75rem', fontFamily: 'var(--font-serif, serif)', lineHeight: '1.2' }}>
                        Research &amp; Resources
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', margin: '0 0 0.6rem', lineHeight: '1.6' }}>
                        Admin workspace — upload, manage, and share frameworks, whitepapers, and AI governance resources.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1.75rem' }}>
                        <Shield size={13} color="#A78BFA" />
                        <span style={{ color: '#A78BFA', fontWeight: '700' }}>{user?.name || 'Admin'}</span>
                        <span>— full access</span>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', maxWidth: '520px', margin: '0 auto' }}>
                        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input
                            className="res-search-input"
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search resources…"
                            style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 2.75rem', borderRadius: '100px', border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: '0.9rem', fontFamily: 'var(--font-sans)', outline: 'none', backdropFilter: 'blur(8px)', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 0 }}>
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem', gap: '1.5rem', alignItems: 'flex-start', marginTop: '-1.5rem' }}>

                {/* ── Sidebar ── */}
                <aside style={{ width: sidebarOpen ? '220px' : '56px', flexShrink: 0, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: sidebarOpen ? '1.1rem' : '0.75rem', transition: 'width 0.25s ease', overflow: 'hidden', position: 'sticky', top: '90px', zIndex: 10 }}>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sidebarOpen ? '1rem' : '0', gap: '0.5rem' }}>
                        {sidebarOpen && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={15} color="#003366" /><span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#003366' }}>Filters</span></div>}
                        <button onClick={() => setSidebarOpen(!sidebarOpen)}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', display: 'flex', color: '#475569', transition: 'background 0.15s', flexShrink: 0 }}
                            title={sidebarOpen ? 'Collapse' : 'Expand'}>
                            {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                        </button>
                    </div>

                    {sidebarOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Type filter */}
                            <div>
                                <p style={{ margin: '0 0 0.4rem 0.1rem', fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>TYPE</p>
                                <button className={`res-filter-btn${filterType === 'all' ? ' active' : ''}`} onClick={() => setFilterType('all')}>
                                    All Types
                                    {filterType === 'all' && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                                </button>
                                {TYPE_OPTIONS.map((t) => (
                                    <button key={t} className={`res-filter-btn${filterType === t ? ' active' : ''}`} onClick={() => setFilterType(t)}>
                                        {TYPE_ICONS[t]}
                                        <span style={{ flex: 1 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                        <span style={{ fontSize: '0.72rem', opacity: 0.65 }}>{typeCounts[t] || 0}</span>
                                        {filterType === t && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', flexShrink: 0 }} />}
                                    </button>
                                ))}
                            </div>

                            {/* Access filter */}
                            <div>
                                <p style={{ margin: '0 0 0.4rem 0.1rem', fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ACCESS</p>
                                {[['all', 'All'], ['public', 'Public'], ['registered', 'Member Only']].map(([val, label]) => (
                                    <button key={val} className={`res-filter-btn${filterAccess === val ? ' active' : ''}`} onClick={() => setFilterAccess(val)}>
                                        {val === 'public' ? <Globe size={13} /> : val === 'registered' ? <Lock size={13} /> : null}
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Stats */}
                            <div style={{ padding: '0.6rem 0.7rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
                                {filtered.length} of {resources.length} resource{resources.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </aside>

                {/* ── Main Content ── */}
                <div style={{ flex: 1, minWidth: 0, padding: '2rem 0 4rem' }}>
                    {/* Upload button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#1e293b' }}>All Resources</h2>
                            {search && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Showing results for "<em>{search}</em>"</p>}
                        </div>
                        <button onClick={() => setModal({ mode: 'create' })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 2px 8px rgba(0,51,102,0.2)', transition: 'background 0.15s, transform 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#004080'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.transform = 'none'; }}>
                            <Plus size={15} /> Upload Resource
                        </button>
                    </div>

                    {/* Error */}
                    {error && !loading && (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '12px', border: '1px solid #fecaca' }}>
                            <AlertCircle size={36} color="#dc2626" style={{ margin: '0 auto 0.75rem' }} />
                            <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
                            <button onClick={fetchResources}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', ...S.btnPrim }}>
                                <RefreshCw size={13} /> Retry
                            </button>
                        </div>
                    )}

                    {/* Loading skeletons */}
                    {loading && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', height: '200px', animation: 'pulse 1.5s ease-in-out infinite' }}>
                                    <div style={{ height: '3px', background: '#e2e8f0', borderRadius: '12px 12px 0 0' }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && !error && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '5rem 1rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                            <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '500' }}>
                                {search ? `No results for "${search}"` : resources.length === 0 ? 'No resources uploaded yet.' : 'No resources match your filters.'}
                            </p>
                            {(search || filterType !== 'all' || filterAccess !== 'all') && (
                                <button onClick={() => { setSearch(''); setFilterType('all'); setFilterAccess('all'); }}
                                    style={{ border: 'none', background: 'none', color: '#003366', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'underline' }}>
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}

                    {/* Resource grid */}
                    {!loading && !error && filtered.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', animation: 'fadeIn 0.35s ease' }}>
                            {filtered.map((r) => (
                                <ResourceCard
                                    key={r.id}
                                    resource={r}
                                    onDownload={handleDownload}
                                    onEdit={(res) => setModal({ mode: 'edit', resource: res })}
                                    onDelete={setDeleteId}
                                    downloading={downloading[r.id]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modals ── */}
            {modal && (
                <ResourceModal
                    resource={modal.mode === 'edit' ? modal.resource : null}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                    showToast={showToast}
                />
            )}
            {deleteId && <DeleteDialog onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </div>
    );
};

export default Resources;
