import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, X, Filter, ChevronLeft, ChevronRight,
    Download, Trash2, FileText, BookOpen, Video, Globe, Lock,
    Plus, AlertCircle, Edit2, Shield, Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getResources, uploadResource, updateResource, deleteResource, downloadResource } from '../api/resources.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate } from '../utils/dateFormatter.js';
import StarRating from '../components/resources/StarRating.jsx';

const TYPE_OPTIONS = ['article', 'whitepaper', 'video', 'tool', 'news', 'homepage video', 'lab result', 'product'];
const DOWNLOAD_ROLES = ['founding_member', 'council_member'];

const getUploadableTypes = (role) => {
    if (role === 'founding_member') return TYPE_OPTIONS;
    return ['article', 'whitepaper', 'tool', 'video', 'lab result'];
};

const TYPE_ICONS = {
    article: <FileText size={12} />, whitepaper: <BookOpen size={12} />, video: <Video size={12} />,
    tool: <Globe size={12} />, news: <FileText size={12} />, 'homepage video': <Video size={12} />,
    'lab result': <FileText size={12} />, product: <Globe size={12} />,
};
const TYPE_COMPONENTS = {
    article: FileText, whitepaper: BookOpen, video: Video,
    tool: Globe, news: FileText, 'homepage video': Video,
    'lab result': FileText, product: Globe,
};
const TYPE_COLORS = {
    article: '#3B82F6', whitepaper: '#8B5CF6', video: '#EC4899', tool: '#10B981',
    news: '#F59E0B', 'homepage video': '#EF4444', 'lab result': '#6366F1', product: '#0EA5E9',
};

const S = {
    label:   { display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#1e293b' },
    input:   { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', color: '#1e293b', background: '#fafafa', boxSizing: 'border-box', outline: 'none' },
    btnPrim: { padding: '0.65rem 1.25rem', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.15s' },
    btnSec:  { padding: '0.65rem 1.25rem', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.15s' },
};

// ─── Upload / Edit Modal ──────────────────────────────────────────────────────
const ResourceModal = ({ resource, userRole, onClose, onSaved, showToast }) => {
    const isEdit = !!resource;
    const allowedTypes = getUploadableTypes(userRole);
    const [form, setForm] = useState({
        title: resource?.title || '', description: resource?.description || '',
        abstract: resource?.abstract || '', demo_url: resource?.demo_url || '',
        category_slug: resource?.category_slug || '', type: resource?.type || 'article',
        access_level: resource?.access_level || 'public',
    });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) { setError('Title and description are required.'); return; }
        setLoading(true); setError('');
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (file) fd.append('file', file);
            let saved;
            if (isEdit) { const res = await updateResource(resource.id, fd); saved = res.data?.data || res.data; }
            else        { const res = await uploadResource(fd);              saved = res.data?.data || res.data; }
            onSaved(saved, isEdit);
            showToast(isEdit ? 'Resource updated!' : 'Resource uploaded!', 'success');
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    };

    const inp = {
        width: '100%', padding: '9px 12px',
        border: '1.5px solid #e2e8f0', borderRadius: '8px',
        fontSize: '0.875rem', fontFamily: 'var(--font-sans)',
        color: '#1e293b', background: 'white', boxSizing: 'border-box',
        outline: 'none', transition: 'border-color 0.15s',
    };
    const lbl = {
        display: 'block', marginBottom: '5px',
        fontSize: '0.75rem', fontWeight: '700',
        color: '#374151', letterSpacing: '0.03em',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '92dvh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f3f7', flexShrink: 0 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1a1a2e' }}>
                            {isEdit ? 'Edit Resource' : 'Upload New Resource'}
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#9aaab7' }}>
                            {isEdit ? 'Update resource details below' : 'Fill in the details and attach a file'}
                        </p>
                    </div>
                    <button onClick={onClose}
                        style={{ width: 32, height: 32, borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aaab7', flexShrink: 0, transition: 'all 0.12s' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1a1a2e'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#9aaab7'; }}>
                        <X size={15} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>

                    {/* Title */}
                    <div>
                        <label style={lbl}>Title <span style={{ color: '#dc2626' }}>*</span></label>
                        <input name="title" value={form.title} onChange={handleChange}
                            placeholder="e.g. NIST AI Risk Management Framework"
                            style={inp}
                            onFocus={e => e.target.style.borderColor = '#003366'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={lbl}>Description <span style={{ color: '#dc2626' }}>*</span></label>
                        <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                            placeholder="Brief description of this resource…"
                            style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }}
                            onFocus={e => e.target.style.borderColor = '#003366'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>

                    {/* Type + Access row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={lbl}>Type</label>
                            <select name="type" value={form.type} onChange={handleChange}
                                style={{ ...inp, cursor: 'pointer' }}>
                                {allowedTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Access</label>
                            <select name="access_level" value={form.access_level} onChange={handleChange}
                                style={{ ...inp, cursor: 'pointer' }}>
                                <option value="public">Public</option>
                                <option value="registered">Member Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Abstract — collapsible feel with smaller rows */}
                    <div>
                        <label style={lbl}>Abstract <span style={{ color: '#9aaab7', fontWeight: '500' }}>(optional)</span></label>
                        <textarea name="abstract" value={form.abstract} onChange={handleChange} rows={2}
                            placeholder="Extended abstract or summary…"
                            style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }}
                            onFocus={e => e.target.style.borderColor = '#003366'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>

                    {/* Demo URL */}
                    <div>
                        <label style={lbl}>Demo / Source URL <span style={{ color: '#9aaab7', fontWeight: '500' }}>(optional)</span></label>
                        <input name="demo_url" value={form.demo_url} onChange={handleChange}
                            placeholder="https://…"
                            style={inp}
                            onFocus={e => e.target.style.borderColor = '#003366'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    </div>

                    {/* File upload — styled drop area feel */}
                    <div>
                        <label style={lbl}>Attach File <span style={{ color: '#9aaab7', fontWeight: '500' }}>(optional)</span></label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1.5px dashed #c8d3e0', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', transition: 'border-color 0.15s' }}
                            onMouseOver={e => e.currentTarget.style.borderColor = '#003366'}
                            onMouseOut={e => e.currentTarget.style.borderColor = '#c8d3e0'}>
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={15} color="#003366" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                                    {file ? file.name : 'Click to choose file'}
                                </p>
                                <p style={{ margin: '1px 0 0', fontSize: '0.7rem', color: '#9aaab7' }}>
                                    {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'PDF, Word, Excel, PPT, Image, Video · max 100MB'}
                                </p>
                            </div>
                            {file && (
                                <button type="button" onClick={e => { e.preventDefault(); setFile(null); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aaab7', display: 'flex', padding: '2px', flexShrink: 0 }}>
                                    <X size={14} />
                                </button>
                            )}
                            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.ogv,.mov,.avi"
                                onChange={e => setFile(e.target.files[0])}
                                style={{ display: 'none' }} />
                        </label>
                        {resource?.file_path && !file && (
                            <p style={{ margin: '5px 0 0', fontSize: '0.73rem', color: '#9aaab7' }}>
                                Current file: <em>{String(resource.file_path).split('/').pop()}</em>
                            </p>
                        )}
                    </div>

                    {error && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', color: '#dc2626', fontSize: '0.83rem' }}>
                            <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                        <button type="button" onClick={onClose}
                            style={{ flex: 1, padding: '10px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: '#5e6e82', transition: 'all 0.13s' }}
                            onMouseOver={e => e.currentTarget.style.borderColor = '#003366'}
                            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            style={{ flex: 2, padding: '10px', background: loading ? '#94a3b8' : '#003366', border: 'none', borderRadius: '9px', fontWeight: '700', fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.13s' }}
                            onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#002244'; }}
                            onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#003366'; }}>
                            {loading
                                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                                : isEdit ? 'Save Changes' : 'Upload Resource'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Delete Dialog ────────────────────────────────────────────────────────────
const DeleteDialog = ({ onConfirm, onCancel }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        onClick={onCancel}>
        <div style={{ background: 'white', borderRadius: '14px', padding: 'clamp(1.5rem,3vw,2rem)', maxWidth: '380px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
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
const ResourceCard = ({ resource, currentUser, onDownload, onEdit, onDelete, downloading }) => {
    const accent      = TYPE_COLORS[resource.type] || '#003366';
    const canDownload = DOWNLOAD_ROLES.includes(currentUser?.role);
    const canEdit     = currentUser?.role === 'founding_member';
    const canDelete   = currentUser?.role === 'founding_member' || (currentUser && resource.uploader_id === currentUser?.id);
    const hasRating   = resource.avg_rating > 0;
    const reviewCount = resource.review_count || 0;
    const isVideo     = ['video', 'homepage video'].includes(resource.type);
    const TypeIcon    = TYPE_COMPONENTS[resource.type] || FileText;

    return (
        <>
            <style>{`
                .rc2 {
                    background: white;
                    border-radius: 12px;
                    border: 1.5px solid #b8c5d1;
                    display: flex; flex-direction: column;
                    transition: box-shadow 0.18s, border-color 0.18s;
                    overflow: hidden;
                }
                .rc2:hover {
                    box-shadow: 0 4px 20px rgba(0,51,102,0.09);
                    border-color: rgba(0,51,102,0.18);
                }
                .rc2-view {
                    display: flex; align-items: center; justify-content: center;
                    gap: 5px; flex: 1; padding: 0 8px;
                    height: 36px; border-radius: 7px;
                    font-size: 0.79rem; font-weight: 700;
                    text-decoration: none; transition: background 0.13s;
                    color: #003366; background: #eef2ff;
                    border: 1.5px solid #c7d2fe;
                    white-space: nowrap;
                }
                .rc2-view:hover { background: #dde7ff; }
                .rc2-view.video-cta {
                    background: #1a1a2e; color: white; border-color: transparent;
                }
                .rc2-view.video-cta:hover { background: #2d2d44; }
                .rc2-dl {
                    display: flex; align-items: center; justify-content: center;
                    gap: 5px; flex: 1; padding: 0 8px;
                    height: 36px; border-radius: 7px;
                    font-size: 0.79rem; font-weight: 700;
                    border: none; cursor: pointer; font-family: inherit;
                    transition: background 0.13s;
                    text-decoration: none;
                }
            `}</style>

            <div className="rc2">

                {/* ── Unified card header — same height for all types ── */}
                <Link to={`/resources/${resource.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: isVideo ? '#0f172a' : `${accent}0d`, borderBottom: isVideo ? 'none' : `3px solid ${accent}` }}>
                        {/* Dot pattern */}
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${isVideo ? 'rgba(255,255,255,0.03)' : `${accent}18`} 1.5px, transparent 1.5px)`, backgroundSize: '18px 18px' }} />
                        {/* Icon circle */}
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: isVideo ? accent : `${accent}22`, border: isVideo ? 'none' : `2px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                            <TypeIcon size={18} color={isVideo ? 'white' : accent} />
                        </div>
                        {/* Type label bottom-left */}
                        <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.09em', textTransform: 'uppercase', color: isVideo ? 'rgba(255,255,255,0.6)' : `${accent}cc`, background: isVideo ? 'rgba(0,0,0,0.45)' : `${accent}14`, padding: '2px 8px', borderRadius: 100 }}>
                            {resource.type}
                        </div>
                        {/* Rating badge top-right if rated */}
                        {hasRating && (
                            <div style={{ position: 'absolute', top: 8, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: isVideo ? 'rgba(0,0,0,0.5)' : 'white', padding: '3px 8px', borderRadius: 100, border: isVideo ? 'none' : '1px solid #f0f3f7' }}>
                                <StarRating value={parseFloat(resource.avg_rating)} size={11} color="#f59e0b" />
                                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: isVideo ? 'white' : '#1a1a2e' }}>{parseFloat(resource.avg_rating).toFixed(1)}</span>
                            </div>
                        )}
                    </div>
                </Link>

                {/* ── Body ── */}
                <div style={{ padding: '14px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Date */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.67rem', color: '#c4cdd6' }}>{formatDate(resource.created_at)}</span>
                    </div>

                    {/* Title */}
                    <h3 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: '700', color: '#1a1a2e', lineHeight: '1.38', minHeight: '2.5em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {resource.title}
                    </h3>

                    {/* Description */}
                    <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: '#8896a7', lineHeight: '1.55', minHeight: '3.6em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {resource.summary || resource.description || '—'}
                    </p>

                    <div style={{ flex: 1 }} />

                    {/* ── Review nudge + access badge ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        {!hasRating ? (
                            <span style={{ fontSize: '0.71rem', color: '#c4cdd6', fontStyle: 'italic' }}>No reviews yet</span>
                        ) : (
                            <span style={{ fontSize: '0.71rem', color: '#9aaab7' }}>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                        )}
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {resource.status && resource.status !== 'approved' && (
                                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 100, fontWeight: '700', background: resource.status === 'pending' ? '#fef3c7' : '#fef2f2', color: resource.status === 'pending' ? '#b45309' : '#dc2626', textTransform: 'capitalize' }}>
                                    {resource.status}
                                </span>
                            )}
                            <span style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 7px', borderRadius: 100, fontWeight: '700', background: resource.access_level === 'public' ? '#f0fdf4' : '#fef9c3', color: resource.access_level === 'public' ? '#15803d' : '#a16207' }}>
                                {resource.access_level === 'public' ? <Globe size={8} /> : <Lock size={8} />}
                                {resource.access_level === 'public' ? 'Public' : 'Member'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Divider ── */}
                <div style={{ height: 1, background: '#f3f4f6', margin: '0 16px' }} />

                {/* ── Action bar — always visible, touch-friendly ── */}
                <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>

                    {/* View & review */}
                    <Link to={`/resources/${resource.id}`} className={isVideo ? "rc2-view video-cta" : "rc2-view"}>
                        {isVideo
                            ? <><Video size={13} /> {reviewCount === 0 ? 'Watch & Review' : `Watch · ${reviewCount} Review${reviewCount !== 1 ? 's' : ''}`}</>
                            : reviewCount === 0 ? '✦ View & Review' : `View & Reviews (${reviewCount})`
                        }
                    </Link>

                    {/* Download / upgrade / login */}
                    {!currentUser ? (
                        <a href="/login" className="rc2-dl"
                            style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0' }}>
                            <Lock size={11} /> Sign in
                        </a>
                    ) : !canDownload ? (
                        <a href="/membership" className="rc2-dl"
                            style={{ background: '#f0fdf4', color: '#0f766e', border: '1.5px solid #bbf7d0' }}>
                            <Lock size={11} /> Upgrade
                        </a>
                    ) : (
                        <button onClick={() => onDownload(resource)} disabled={downloading} className="rc2-dl"
                            style={{ background: downloading ? '#f1f5f9' : '#003366', color: downloading ? '#94a3b8' : 'white', border: 'none', opacity: downloading ? 0.7 : 1 }}
                            onMouseEnter={e => { if (!downloading) e.currentTarget.style.background = '#002244'; }}
                            onMouseLeave={e => { if (!downloading) e.currentTarget.style.background = '#003366'; }}>
                            {downloading
                                ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                                : <Download size={11} />
                            }
                            {downloading ? 'Preparing…' : 'Download'}
                        </button>
                    )}

                    {/* Admin controls */}
                    {canEdit && (
                        <button onClick={() => onEdit(resource)}
                            style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer' }}>
                            <Edit2 size={12} color="#94a3b8" />
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={() => onDelete(resource.id)}
                            style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer' }}>
                            <Trash2 size={12} color="#dc2626" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Resources = () => {
    const { user }      = useAuth();
    const { showToast } = useToast();

    const [resources,    setResources]    = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState('');
    const [search,       setSearch]       = useState('');
    const [filterType,   setFilterType]   = useState('all');
    const [filterAccess, setFilterAccess] = useState('all');
    const [filterRating, setFilterRating] = useState('all');
    const [sortBy,       setSortBy]       = useState('newest');
    const [sidebarOpen,  setSidebarOpen]  = useState(true);
    const [modal,        setModal]        = useState(null);
    const [deleteId,     setDeleteId]     = useState(null);
    const [downloading,  setDownloading]  = useState({});

    useEffect(() => { document.title = 'Research & Resources | ARC'; }, []);

    const fetchResources = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res     = await getResources({ limit: 500 });
            const payload = res.data?.data;
            setResources(Array.isArray(payload) ? payload : (payload?.resources || []));
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    const baseFiltered = resources.filter(r => {
        const q           = search.toLowerCase();
        const matchSearch = !search || r.title?.toLowerCase().includes(q) || (r.summary || r.description || '').toLowerCase().includes(q);
        const access      = r.access_level === 'public' ? 'public' : 'registered';
        const matchAccess = filterAccess === 'all' || access === filterAccess;
        const matchType   = filterType === 'all' || r.type === filterType;
        const matchRating = filterRating === 'all'
            ? true
            : filterRating === 'unreviewed'
            ? (!r.review_count || r.review_count === 0)
            : parseFloat(r.avg_rating || 0) >= parseInt(filterRating, 10);
        return matchSearch && matchAccess && matchType && matchRating;
    });

    const filtered = [...baseFiltered].sort((a, b) => {
        if (sortBy === 'oldest')        return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === 'most_downloaded') return (b.download_count || 0) - (a.download_count || 0);
        if (sortBy === 'highest_rated') return (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0);
        if (sortBy === 'most_reviewed') return (b.review_count || 0) - (a.review_count || 0);
        return new Date(b.created_at) - new Date(a.created_at); // newest default
    });

    const typeCounts = TYPE_OPTIONS.reduce((acc, t) => {
        acc[t] = resources.filter(r => {
            const q           = search.toLowerCase();
            const matchSearch = !search || r.title?.toLowerCase().includes(q) || (r.summary || r.description || '').toLowerCase().includes(q);
            const access      = r.access_level === 'public' ? 'public' : 'registered';
            const matchAccess = filterAccess === 'all' || access === filterAccess;
            return matchSearch && matchAccess && r.type === t;
        }).length;
        return acc;
    }, {});

    const handleDownload = async (r) => {
        setDownloading(p => ({ ...p, [r.id]: true }));
        try {
            const res = await downloadResource(r.id);
            window.open(res.data.url, '_blank', 'noopener,noreferrer');
            setResources(prev => prev.map(x => x.id === r.id ? { ...x, download_count: (x.download_count || 0) + 1 } : x));
            showToast('Download started!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDownloading(p => ({ ...p, [r.id]: false })); }
    };

    const handleDelete = async () => {
        try {
            await deleteResource(deleteId);
            setResources(prev => prev.filter(r => r.id !== deleteId));
            showToast('Resource deleted.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        setDeleteId(null);
    };

    const handleSaved = (saved, isEdit) => {
        if (isEdit) setResources(prev => prev.map(r => r.id === saved.id ? saved : r));
        else        setResources(prev => [saved, ...prev]);
        setModal(null);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-sans)' }}>
            <style>{`
                @keyframes spin   { to { transform: rotate(360deg) } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
                @keyframes pulse  { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }

                .res-filter-btn { width:100%; display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.7rem; border:none; background:transparent; color:#475569; font-size:0.83rem; font-weight:500; cursor:pointer; border-radius:7px; text-align:left; transition:background 0.15s,color 0.15s; font-family:var(--font-sans); }
                .res-filter-btn:hover  { background:#f1f5f9; color:#003366; }
                .res-filter-btn.active { background:#003366; color:white; font-weight:700; }
                .res-search-input:focus { border-color:#003366 !important; box-shadow:0 0 0 3px rgba(0,51,102,0.08); }

                .res-collapse-btn { background:white; border:1px solid #E2E8F0; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748B; transition:all 0.2s; flex-shrink:0; margin-left:auto; }
                .res-collapse-btn:hover { background:#f8fafc; color:#003366; border-color:#CBD5E1; }

                .res-sidebar { width:220px; flex-shrink:0; background:white; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 12px rgba(0,0,0,0.06); padding:1.1rem; transition:width 0.25s ease; overflow:hidden; position:sticky; top:90px; z-index:10; align-self:flex-start; }
                .res-sidebar.collapsed { width:56px; padding:0.75rem; }

                .res-body { display:flex; max-width:1400px; margin:2rem auto 0; padding:0 clamp(0.75rem,3vw,1.5rem); gap:1.5rem; align-items:flex-start; }
                .res-main { flex:1; min-width:0; padding:0 0 4rem; }

                .res-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr)); gap:1rem; }

                .res-mobile-filters { display:none; }

                @media (max-width: 700px) {
                    .res-sidebar        { display:none !important; }
                    .res-mobile-filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:1rem; }
                    .res-body           { margin-top:1.5rem; }
                }
            `}</style>

            {/* ── Hero ── */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 55%,#005599 100%)', padding: 'clamp(1.5rem,2.5vw,2rem) clamp(1rem,4vw,2rem) clamp(2.5rem,5vw,4rem)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.12)', borderRadius: '100px', padding: '0.3rem 0.9rem', marginBottom: '1.1rem', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
                        <Shield size={13} color="#A78BFA" />Knowledge Library
                    </div>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.6rem,4vw,2.5rem)', fontWeight: '800', margin: '0 0 0.75rem', lineHeight: '1.2' }}>
                        Research &amp; Resources
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.875rem,1.5vw,1rem)', margin: '0 0 0.6rem', lineHeight: '1.6' }}>
                        Explore frameworks, whitepapers, videos, and AI governance resources curated by the AI Risk Council community.
                    </p>
                    {user && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1.75rem' }}>
                            <Shield size={13} color="#A78BFA" />
                            <span style={{ color: '#A78BFA', fontWeight: '700' }}>{user.name}</span>
                            {user.role === 'founding_member' && <span>— full access</span>}
                            {user.role === 'professional'    && <span>— community member</span>}
                        </div>
                    )}
                    <div style={{ position: 'relative', maxWidth: '520px', margin: '0 auto' }}>
                        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input className="res-search-input" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search resources…"
                            style={{ width: '100%', padding: '0.85rem 2.5rem 0.85rem 2.75rem', borderRadius: '100px', border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: '0.9rem', fontFamily: 'var(--font-sans)', outline: 'none', backdropFilter: 'blur(8px)', boxSizing: 'border-box', transition: 'border-color 0.2s,box-shadow 0.2s' }} />
                        {search && (
                            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 0 }}>
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="res-body">

                {/* Sidebar */}
                <aside className={`res-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', marginBottom: sidebarOpen ? '1.2rem' : '0', gap: '0.5rem' }}>
                        {sidebarOpen && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Filter size={15} color="#003366" />
                                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#003366' }}>Filters</span>
                            </div>
                        )}
                        <button className="res-collapse-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Collapse' : 'Expand'}>
                            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                    </div>
                    {sidebarOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <p style={{ margin: '0 0 0.4rem 0.1rem', fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>TYPE</p>
                                <button className={`res-filter-btn${filterType === 'all' ? ' active' : ''}`} onClick={() => setFilterType('all')}>
                                    All Types
                                    {filterType === 'all' && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                                </button>
                                {TYPE_OPTIONS.map(t => (
                                    <button key={t} className={`res-filter-btn${filterType === t ? ' active' : ''}`} onClick={() => setFilterType(t)}>
                                        {TYPE_ICONS[t]}
                                        <span style={{ flex: 1 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                        <span style={{ fontSize: '0.72rem', opacity: 0.65 }}>{typeCounts[t] || 0}</span>
                                        {filterType === t && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', flexShrink: 0 }} />}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <p style={{ margin: '0 0 0.4rem 0.1rem', fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ACCESS</p>
                                {[['all', 'All'], ['public', 'Public'], ['registered', 'Member Only']].map(([val, label]) => (
                                    <button key={val} className={`res-filter-btn${filterAccess === val ? ' active' : ''}`} onClick={() => setFilterAccess(val)}>
                                        {val === 'public' ? <Globe size={13} /> : val === 'registered' ? <Lock size={13} /> : null}
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {/* SORT BY */}
                            <div>
                                <p style={{ margin: '0 0 0.4rem 0.1rem', fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SORT BY</p>
                                {[
                                    ['newest',          'Newest First'],
                                    ['oldest',          'Oldest First'],
                                    ['most_downloaded',  'Most Downloaded'],
                                    ['highest_rated',    'Highest Rated'],
                                    ['most_reviewed',    'Most Reviewed'],
                                ].map(([val, label]) => (
                                    <button key={val} className={`res-filter-btn${sortBy === val ? ' active' : ''}`} onClick={() => setSortBy(val)}>
                                        <span style={{ flex: 1 }}>{label}</span>
                                        {sortBy === val && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', flexShrink: 0 }} />}
                                    </button>
                                ))}
                            </div>

                            {/* RATING */}
                            <div>
                                <p style={{ margin: '0 0 0.4rem 0.1rem', fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RATING</p>
                                {[
                                    ['all',        'All Ratings'],
                                    ['4',          '4★ & above'],
                                    ['3',          '3★ & above'],
                                    ['unreviewed', 'Not yet reviewed'],
                                ].map(([val, label]) => (
                                    <button key={val} className={`res-filter-btn${filterRating === val ? ' active' : ''}`} onClick={() => setFilterRating(val)}>
                                        <span style={{ flex: 1 }}>{label}</span>
                                        {filterRating === val && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', flexShrink: 0 }} />}
                                    </button>
                                ))}
                            </div>

                            <div style={{ padding: '0.6rem 0.7rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.78rem', color: '#64748b', fontWeight: '500', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{filtered.length} of {resources.length} resource{resources.length !== 1 ? 's' : ''}</span>
                                {(filterType !== 'all' || filterAccess !== 'all' || filterRating !== 'all' || sortBy !== 'newest') && (
                                    <button onClick={() => { setFilterType('all'); setFilterAccess('all'); setFilterRating('all'); setSortBy('newest'); }}
                                        style={{ background: 'none', border: 'none', color: '#003366', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                {/* Main content */}
                <div className="res-main">

                    {/* Mobile filter chips */}
                    <div className="res-mobile-filters">
                        <button onClick={() => setFilterType('all')} style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', borderColor: filterType === 'all' ? '#003366' : '#CBD5E1', background: filterType === 'all' ? '#003366' : 'white', color: filterType === 'all' ? 'white' : '#475569', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>All</button>
                        {TYPE_OPTIONS.map(t => (
                            <button key={t} onClick={() => setFilterType(filterType === t ? 'all' : t)}
                                style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', borderColor: filterType === t ? '#003366' : '#CBD5E1', background: filterType === t ? '#003366' : 'white', color: filterType === t ? 'white' : '#475569', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Mobile sort + rating row */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }} className="res-mobile-filters">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                            style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="most_downloaded">Most Downloaded</option>
                            <option value="highest_rated">Highest Rated</option>
                            <option value="most_reviewed">Most Reviewed</option>
                        </select>
                        <select value={filterRating} onChange={e => setFilterRating(e.target.value)}
                            style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                            <option value="all">All Ratings</option>
                            <option value="4">4★ &amp; above</option>
                            <option value="3">3★ &amp; above</option>
                            <option value="unreviewed">Not yet reviewed</option>
                        </select>
                        <select value={filterAccess} onChange={e => setFilterAccess(e.target.value)}
                            style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                            <option value="all">All Access</option>
                            <option value="public">Public</option>
                            <option value="registered">Member Only</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#1e293b' }}>
                                All Resources
                                {!loading && (
                                    <span style={{ marginLeft: 8, fontSize: '0.78rem', fontWeight: '500', color: '#94a3b8' }}>
                                        — {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
                                    </span>
                                )}
                            </h2>
                            {!loading && (search || sortBy !== 'newest' || filterRating !== 'all') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                                    {search && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>"{search}"</span>}
                                    {sortBy !== 'newest' && <span style={{ fontSize: '0.72rem', color: '#003366', fontWeight: '700', background: '#eef2ff', padding: '2px 7px', borderRadius: '100px' }}>{{'oldest':'Oldest','most_downloaded':'Most Downloaded','highest_rated':'Highest Rated','most_reviewed':'Most Reviewed'}[sortBy]}</span>}
                                    {filterRating !== 'all' && <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '700', background: '#fffbeb', padding: '2px 7px', borderRadius: '100px' }}>{filterRating === 'unreviewed' ? 'Unreviewed' : filterRating + '★+'}</span>}
                                </div>
                            )}
                        </div>
                        {/* Upload button — council_member (pending review) and founding_member (auto-approved) only */}
                        {user && ['founding_member', 'council_member'].includes(user.role) && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <button onClick={() => setModal({ mode: 'create' })}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 2px 8px rgba(0,51,102,0.2)', transition: 'background 0.15s,transform 0.15s', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#004080'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#003366'; e.currentTarget.style.transform = 'none'; }}>
                                    <Plus size={15} />Upload Resource
                                </button>
                                {user.role === 'council_member' && (
                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Pending admin review before publishing</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Active filters bar with reset */}
                    {!loading && (search || filterType !== 'all' || filterAccess !== 'all' || filterRating !== 'all' || sortBy !== 'newest') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e8ecf0', borderRadius: '9px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#5e6e82', marginRight: 2 }}>Active:</span>
                            {search         && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', background:'#f1f5f9', color:'#374151', padding:'3px 8px', borderRadius:100, fontWeight:'600' }}>Search: "{search}" <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex', lineHeight:1 }}><X size={10}/></button></span>}
                            {filterType !== 'all'   && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', background:'#eef2ff', color:'#003366', padding:'3px 8px', borderRadius:100, fontWeight:'700' }}>{filterType.charAt(0).toUpperCase()+filterType.slice(1)} <button onClick={() => setFilterType('all')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex', lineHeight:1 }}><X size={10}/></button></span>}
                            {filterAccess !== 'all' && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', background:'#f0fdf4', color:'#15803d', padding:'3px 8px', borderRadius:100, fontWeight:'700' }}>{filterAccess === 'public' ? 'Public' : 'Member Only'} <button onClick={() => setFilterAccess('all')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex', lineHeight:1 }}><X size={10}/></button></span>}
                            {filterRating !== 'all' && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', background:'#fffbeb', color:'#d97706', padding:'3px 8px', borderRadius:100, fontWeight:'700' }}>{filterRating === 'unreviewed' ? 'Unreviewed' : filterRating+'★+'} <button onClick={() => setFilterRating('all')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex', lineHeight:1 }}><X size={10}/></button></span>}
                            {sortBy !== 'newest'    && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', background:'#f5f3ff', color:'#7c3aed', padding:'3px 8px', borderRadius:100, fontWeight:'700' }}>{{'oldest':'Oldest','most_downloaded':'Most Downloaded','highest_rated':'Highest Rated','most_reviewed':'Most Reviewed'}[sortBy]} <button onClick={() => setSortBy('newest')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex', lineHeight:1 }}><X size={10}/></button></span>}
                            <button onClick={() => { setSearch(''); setFilterType('all'); setFilterAccess('all'); setFilterRating('all'); setSortBy('newest'); }}
                                style={{ marginLeft:'auto', fontSize:'0.72rem', fontWeight:'700', color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:'2px 6px', borderRadius:6, whiteSpace:'nowrap' }}>
                                Reset all
                            </button>
                        </div>
                    )}

                    {error && !loading && (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '12px', border: '1px solid #fecaca' }}>
                            <AlertCircle size={36} color="#dc2626" style={{ margin: '0 auto 0.75rem' }} />
                            <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
                            <button onClick={fetchResources} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', ...S.btnPrim }}>
                                <RefreshCw size={13} />Retry
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="res-grid">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', height: '200px', animation: 'pulse 1.5s ease-in-out infinite' }}>
                                    <div style={{ height: '3px', background: '#e2e8f0', borderRadius: '12px 12px 0 0' }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && !error && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '5rem 1rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                            <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '500' }}>
                                {search ? `No results for "${search}"` : resources.length === 0 ? 'No resources uploaded yet.' : 'No resources match your filters.'}
                            </p>
                            {(search || filterType !== 'all' || filterAccess !== 'all' || filterRating !== 'all' || sortBy !== 'newest') && (
                                <button onClick={() => { setSearch(''); setFilterType('all'); setFilterAccess('all'); setFilterRating('all'); setSortBy('newest'); }}
                                    style={{ border: 'none', background: 'none', color: '#003366', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', textDecoration: 'underline' }}>
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && !error && filtered.length > 0 && (
                        <div className="res-grid" style={{ animation: 'fadeIn 0.35s ease' }}>
                            {filtered.map(r => (
                                <ResourceCard
                                    key={r.id}
                                    resource={r}
                                    currentUser={user}
                                    onDownload={handleDownload}
                                    onEdit={res => setModal({ mode: 'edit', resource: res })}
                                    onDelete={setDeleteId}
                                    downloading={downloading[r.id]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {modal    && <ResourceModal resource={modal.mode === 'edit' ? modal.resource : null} userRole={user?.role} onClose={() => setModal(null)} onSaved={handleSaved} showToast={showToast} />}
            {deleteId && <DeleteDialog onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </div>
    );
};

export default Resources;