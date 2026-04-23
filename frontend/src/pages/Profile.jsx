/**
 * Profile.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Added: Saved Posts tab (4th tab)
 * Everything else unchanged from original.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    User, Mail, Building2, Lock, Eye, EyeOff, Save,
    FileText, Trash2, AlertCircle, Loader2, RefreshCw,
    Upload, ShieldCheck, ArrowLeft, CheckCircle2,
    Bookmark, BookmarkX, ExternalLink,
    BarChart2, MessageSquare, Heart, Download, ArrowUpRight, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import {
    getProfile, updateProfile, changePassword,
    getMyResources, deleteMyResource,
} from '../api/profile.js';
import { getSavedPosts, unsavePost, getMyPosts, getMyStats } from '../api/feed.js';
import { getMyDownloadUsage } from '../api/resources.js';
import { requestSubTypeUpgrade } from '../api/auth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate, timeAgo } from '../utils/dateFormatter.js';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

const ROLE_LABELS = {
    founding_member: 'Founding Member',
    council_member:  'Council Member',
    executive:       'Council Member',   // legacy safety
    professional:    'Professional',
};
const ROLE_COLORS = {
    founding_member: '#7C3AED',
    council_member:  '#003366',
    executive:       '#003366',
    professional:    '#0369A1',
};
const ROLE_BG = {
    founding_member: 'rgba(124,58,237,0.1)',
    council_member:  'rgba(0,51,102,0.09)',
    executive:       'rgba(0,51,102,0.09)',
    professional:    'rgba(3,105,161,0.09)',
};

const Field = ({ label, hint, error, children }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</label>
        {children}
        {hint  && !error && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>{hint}</p>}
        {error && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={11} />{error}</p>}
    </div>
);

const inputStyle = (hasErr) => ({
    width: '100%', padding: '0.7rem 0.95rem',
    border: `1.5px solid ${hasErr ? '#FCA5A5' : '#E2E8F0'}`,
    borderRadius: '9px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', color: '#1E293B', background: 'white',
    transition: 'border-color 0.15s',
});

const Card = ({ children, style = {} }) => (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: 'clamp(1.25rem,3vw,1.75rem)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', ...style }}>
        {children}
    </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle, accent = '#003366' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={17} color={accent} />
        </div>
        <div>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1E293B' }}>{title}</p>
            {subtitle && <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>{subtitle}</p>}
        </div>
    </div>
);

const SaveBtn = ({ loading, label = 'Save Changes', loadingLabel = 'Saving…', icon: Icon = Save }) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="submit" disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: loading ? '#94A3B8' : '#003366', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '9px', fontWeight: '700', fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.15s' }}>
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />{loadingLabel}</> : <><Icon size={14} />{label}</>}
        </button>
    </div>
);

// ─── Profile Info ─────────────────────────────────────────────────────────────
const ProfileInfoSection = ({ user, showToast }) => {
    const [form, setForm]     = useState({ name: user?.name || '', organisation: user?.organisation || '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [saved, setSaved]   = useState(false);

    useEffect(() => { setForm({ name: user?.name || '', organisation: user?.organisation || '' }); }, [user]);

    const validate = () => {
        const e = {};
        if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
        return e;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await updateProfile(form);
            showToast('Profile updated!', 'success');
            setSaved(true); setTimeout(() => setSaved(false), 2500);
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setLoading(false); }
    };

    return (
        <Card>
            <SectionHeader icon={User} title="Profile Information" subtitle="Update your display name and organisation" />
            <form onSubmit={handleSubmit} noValidate>
                <Field label="Full Name" error={errors.name}>
                    <input value={form.name}
                        onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: null })); }}
                        style={inputStyle(errors.name)} placeholder="Your full name"
                        onFocus={e => { if (!errors.name) e.target.style.borderColor = '#003366'; }}
                        onBlur={e => { if (!errors.name) e.target.style.borderColor = '#E2E8F0'; }} />
                </Field>
                <Field label="Email Address" hint="Email cannot be changed. Contact admin if needed.">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 0.95rem', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '9px', fontSize: '0.875rem', color: '#64748B' }}>
                        <Mail size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
                    </div>
                </Field>
                <Field label="Organisation">
                    <input value={form.organisation}
                        onChange={e => setForm(p => ({ ...p, organisation: e.target.value }))}
                        style={inputStyle(false)} placeholder="Your company or organisation"
                        onFocus={e => { e.target.style.borderColor = '#003366'; }}
                        onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }} />
                </Field>
                <SaveBtn loading={loading} label={saved ? '✓ Saved!' : 'Save Changes'} icon={saved ? CheckCircle2 : Save} />
            </form>
        </Card>
    );
};

// ─── Change Password ──────────────────────────────────────────────────────────
const ChangePasswordSection = ({ showToast }) => {
    const [form, setForm]     = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [errors, setErrors] = useState({});
    const [show, setShow]     = useState({ current: false, new: false, confirm: false });
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const e = {};
        if (!form.current_password) e.current_password = 'Current password is required.';
        if (form.new_password.length < 8) e.new_password = 'New password must be at least 8 characters.';
        if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match.';
        return e;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await changePassword({ current_password: form.current_password, new_password: form.new_password });
            setForm({ current_password: '', new_password: '', confirm_password: '' });
            setErrors({});
            showToast('Password changed successfully!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setLoading(false); }
    };

    const PwInput = ({ field, label, showKey }) => (
        <Field label={label} error={errors[field]}>
            <div style={{ position: 'relative' }}>
                <input
                    type={show[showKey] ? 'text' : 'password'}
                    value={form[field]}
                    onChange={e => { setForm(p => ({ ...p, [field]: e.target.value })); setErrors(p => ({ ...p, [field]: null })); }}
                    style={{ ...inputStyle(errors[field]), paddingRight: '2.75rem' }}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    autoComplete="off"
                    onFocus={e => { if (!errors[field]) e.target.style.borderColor = '#003366'; }}
                    onBlur={e => { if (!errors[field]) e.target.style.borderColor = '#E2E8F0'; }} />
                <button type="button" onClick={() => setShow(p => ({ ...p, [showKey]: !p[showKey] }))}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px', display: 'flex' }}>
                    {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </Field>
    );

    return (
        <Card>
            <SectionHeader icon={ShieldCheck} title="Change Password" subtitle="Use a strong password of at least 8 characters" accent="#7C3AED" />
            <form onSubmit={handleSubmit} noValidate>
                <PwInput field="current_password" label="Current Password" showKey="current" />
                <PwInput field="new_password"     label="New Password"     showKey="new" />
                <PwInput field="confirm_password" label="Confirm New Password" showKey="confirm" />
                <SaveBtn loading={loading} label="Update Password" loadingLabel="Updating…" icon={Lock} />
            </form>
        </Card>
    );
};

// ─── My Uploads ───────────────────────────────────────────────────────────────
const MyUploadsSection = ({ showToast, navigate }) => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [confirm, setConfirm]     = useState(null);
    const [deleting, setDeleting]   = useState({});

    const fetchMyResources = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getMyResources();
            setResources(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchMyResources(); }, [fetchMyResources]);

    const confirmDelete = async () => {
        const { resourceId } = confirm; setConfirm(null);
        setDeleting(p => ({ ...p, [resourceId]: true }));
        try {
            await deleteMyResource(resourceId);
            setResources(prev => prev.filter(r => r.id !== resourceId));
            showToast('Resource deleted.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting(p => ({ ...p, [resourceId]: false })); }
    };

    const TYPE_COLORS = { pdf: '#DC2626', video: '#7C3AED', link: '#0284C7', doc: '#059669' };

    return (
        <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <SectionHeader icon={FileText} title="My Uploads" subtitle={`${resources.length} resource${resources.length !== 1 ? 's' : ''}`} style={{ margin: 0 }} />
                <button onClick={() => navigate('/resources')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
                    <Upload size={13} /> Upload New
                </button>
            </div>

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[1,2,3].map(i => <div key={i} style={{ height: '62px', background: '#F1F5F9', borderRadius: '10px', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />)}
                </div>
            )}

            {error && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#EF4444' }}>
                    <AlertCircle size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.7 }} />
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>{error}</p>
                    <button onClick={fetchMyResources}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#003366', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', fontFamily: 'var(--font-sans)' }}>
                        <RefreshCw size={12} /> Retry
                    </button>
                </div>
            )}

            {!loading && !error && resources.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1.5px dashed #E2E8F0' }}>
                    <FileText size={28} style={{ margin: '0 auto 0.5rem', display: 'block', color: '#CBD5E1' }} />
                    <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '0.875rem', color: '#94A3B8' }}>No uploads yet</p>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#CBD5E1' }}>Share research, guides, or tools with the community.</p>
                    <button onClick={() => navigate('/resources')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#003366', color: 'white', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', fontFamily: 'var(--font-sans)' }}>
                        <Upload size={13} /> Upload a Resource
                    </button>
                </div>
            )}

            {!loading && !error && resources.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {resources.map(r => {
                        const typeColor = TYPE_COLORS[r.type?.toLowerCase()] || '#64748B';
                        return (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.875rem 1rem', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#FAFAFA', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${typeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <FileText size={15} color={typeColor} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '0.875rem', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
                                            {formatDate(r.created_at)}
                                            {r.type && <> · <span style={{ color: typeColor, fontWeight: '600', textTransform: 'uppercase', fontSize: '0.68rem' }}>{r.type}</span></>}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setConfirm({ resourceId: r.id })} disabled={!!deleting[r.id]}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.4rem 0.85rem', borderRadius: '7px', fontWeight: '700', fontSize: '0.78rem', cursor: deleting[r.id] ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', opacity: deleting[r.id] ? 0.5 : 1, flexShrink: 0 }}>
                                    {deleting[r.id] ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />} Delete
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog isOpen={!!confirm} title="Delete Resource" message="Permanently delete this resource? This action cannot be undone."
                confirmLabel="Delete" onConfirm={confirmDelete} onClose={() => setConfirm(null)} />
        </Card>
    );
};

// ─── Saved Posts ──────────────────────────────────────────────────────────────
const SavedPostsSection = ({ showToast }) => {
    const [posts,     setPosts]     = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [saveLimit, setSaveLimit] = useState(10);
    const [unsaving,  setUnsaving]  = useState({});
    const [confirm,   setConfirm]   = useState(null);

    const fetchSaved = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getSavedPosts({ limit: 50 });
            if (res.data?.success) {
                setPosts(res.data.data || []);
                setSaveLimit(res.data.save_limit || 10);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSaved(); }, [fetchSaved]);

    const handleUnsave = async () => {
        const { postId } = confirm;
        setConfirm(null);
        setUnsaving(p => ({ ...p, [postId]: true }));
        try {
            await unsavePost(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            showToast('Post removed from saved.', 'success');
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setUnsaving(p => ({ ...p, [postId]: false }));
        }
    };

    const usedSlots = posts.length;
    const pct       = Math.round((usedSlots / saveLimit) * 100);

    return (
        <Card>
            <SectionHeader icon={Bookmark} title="Saved Posts" subtitle={`${usedSlots} of ${saveLimit} slots used`} accent="#0369A1" />

            {/* Usage bar */}
            {!loading && !error && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#EF4444' : pct >= 70 ? '#D97706' : '#003366', borderRadius: '100px', transition: 'width 0.4s ease' }} />
                    </div>
                    {usedSlots >= saveLimit && (
                        <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#DC2626', fontWeight: '600' }}>
                            You've reached the 10 save limit. Remove a post to save new ones.
                        </p>
                    )}
                </div>
            )}

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1,2,3].map(i => <div key={i} style={{ height: '80px', background: '#F1F5F9', borderRadius: '12px', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />)}
                </div>
            )}

            {error && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#EF4444' }}>
                    <AlertCircle size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.7 }} />
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>{error}</p>
                    <button onClick={fetchSaved}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#003366', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', fontFamily: 'var(--font-sans)' }}>
                        <RefreshCw size={12} /> Retry
                    </button>
                </div>
            )}

            {!loading && !error && posts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1.5px dashed #E2E8F0' }}>
                    <Bookmark size={28} style={{ margin: '0 auto 0.5rem', display: 'block', color: '#CBD5E1' }} />
                    <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '0.875rem', color: '#94A3B8' }}>No saved posts</p>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#CBD5E1' }}>Bookmark posts from the feed to read later.</p>
                    <Link to="/community-qna"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#003366', color: 'white', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', textDecoration: 'none' }}>
                        Browse Feed
                    </Link>
                </div>
            )}

            {!loading && !error && posts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {posts.map(post => (
                        <div key={post.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '0.875rem 1rem', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FAFAFA', transition: 'background 0.12s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#F0F5FF'}
                            onMouseOut={e => e.currentTarget.style.background = '#FAFAFA'}>

                            {/* Post preview */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Link to={`/community-qna/${post.id}`} style={{ textDecoration: 'none' }}>
                                    <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '0.875rem', color: '#1E293B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                                        {post.content}
                                    </p>
                                </Link>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>by {post.author_name}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>·</span>
                                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{timeAgo(post.saved_at || post.created_at)}</span>
                                    {post.tags && post.tags.length > 0 && (
                                        <span style={{ fontSize: '0.68rem', color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '100px', padding: '1px 7px', fontWeight: '700' }}>
                                            #{post.tags[0]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                                <Link to={`/community-qna/${post.id}`}
                                    style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#003366', flexShrink: 0 }}
                                    title="View post">
                                    <ExternalLink size={13} />
                                </Link>
                                <button onClick={() => setConfirm({ postId: post.id })} disabled={!!unsaving[post.id]}
                                    style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', cursor: 'pointer', flexShrink: 0, opacity: unsaving[post.id] ? 0.5 : 1 }}
                                    title="Remove from saved">
                                    {unsaving[post.id] ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <BookmarkX size={13} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirm}
                title="Remove Saved Post"
                message="Remove this post from your saved list?"
                confirmLabel="Remove"
                onConfirm={handleUnsave}
                onClose={() => setConfirm(null)}
            />
        </Card>
    );
};



// ─── Profile Page ─────────────────────────────────────────────────────────────
const Profile = () => {
    const navigate      = useNavigate();
    const { user }      = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile]               = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError]     = useState('');
    const [activeTab, setActiveTab]           = useState('info');

    useEffect(() => { document.title = 'My Profile | AI Risk Council'; }, []);
    useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

    const fetchProfile = useCallback(async () => {
        setLoadingProfile(true); setProfileError('');
        try {
            const res = await getProfile();
            setProfile(res.data?.data || res.data);
        } catch (err) { setProfileError(getErrorMessage(err)); }
        finally { setLoadingProfile(false); }
    }, []);

    useEffect(() => { if (user) fetchProfile(); }, [user, fetchProfile]);

    if (!user) return null;

    const roleColor = ROLE_COLORS[user.role] || '#64748B';
    const roleLabel = ROLE_LABELS[user.role]  || user.role;
    const initial   = user.name?.charAt(0).toUpperCase() || '?';

    const canPost = ['founding_member','council_member'].includes(user.role);

    const TABS = [
        { key: 'info',     label: 'Profile Info', icon: User,         show: true   },
        { key: 'password', label: 'Password',     icon: ShieldCheck,  show: true   },
        { key: 'uploads',  label: 'My Uploads',   icon: FileText,     show: canPost },
        { key: 'saved',    label: 'Saved Posts',  icon: Bookmark,     show: true   },
    ].filter(t => t.show);

    return (
        <>
            <style>{`
                @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes adm-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
                .profile-tab-label { display: inline; }
                @media (max-width: 360px) {
                    .profile-tab-btn { font-size: 0.65rem !important; padding: 0.55rem 0.2rem !important; gap: 3px !important; }
                }
                .profile-tabs {
                    display: flex; gap: 0.3rem;
                    background: white; border: 1px solid #E2E8F0;
                    border-radius: 12px; padding: 5px;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    overflow-x: auto; scrollbar-width: none;
                }
                .profile-tabs::-webkit-scrollbar { display: none; }
                .profile-tab-btn {
                    flex: 1; min-width: 0;
                    display: flex; align-items: center; justify-content: center;
                    gap: 5px; padding: 0.6rem 0.4rem;
                    border: none; border-radius: 8px;
                    font-weight: 700; font-size: 0.78rem;
                    cursor: pointer; font-family: var(--font-sans);
                    transition: all 0.15s; white-space: nowrap;
                }
            `}</style>

            <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>

                {/* Hero */}
                <div style={{ background: 'linear-gradient(135deg,#001a33 0%,#003366 60%,#004d99 100%)', padding: 'clamp(1.25rem,4vw,2.5rem) clamp(1rem,4vw,2rem) clamp(2.5rem,4.5vw,3rem)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'220px', height:'220px', borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>
                    <div style={{ position:'absolute', bottom:'-40px', left:'10%', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(255,255,255,0.03)' }}/>
                    <div style={{ maxWidth:'800px', margin:'0 auto', position:'relative', zIndex:1 }}>
                        <button onClick={() => navigate('/user/dashboard')}
                            style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.8)', padding:'0.4rem 0.85rem', borderRadius:'7px', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', fontFamily:'var(--font-sans)', marginBottom:'1.25rem' }}>
                            <ArrowLeft size={13}/> Back to Dashboard
                        </button>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:'clamp(0.75rem,2vw,1.25rem)' }}>
                            <div style={{ width:'clamp(52px,8vw,68px)', height:'clamp(52px,8vw,68px)', borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'2.5px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(1.25rem,3vw,1.6rem)', fontWeight:'800', color:'white', flexShrink:0 }}>
                                {initial}
                            </div>
                            <div style={{ minWidth:0, flex:1 }}>
                                <h1 style={{ margin:'0 0 8px', fontSize:'clamp(1.1rem,3vw,1.75rem)', fontWeight:'800', color:'white', lineHeight:1.2, wordBreak:'break-word' }}>
                                    {user.name}
                                </h1>
                                <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', alignItems:'center' }}>
                                        <span style={{ display:'inline-block', padding:'3px 12px', borderRadius:'100px', fontSize:'0.72rem', fontWeight:'800', color:roleColor, background:'rgba(255,255,255,0.95)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                                            {roleLabel}
                                        </span>
                                        {user.role === 'professional' && user.professional_sub_type && (
                                            <span style={{ display:'inline-block', padding:'3px 12px', borderRadius:'100px', fontSize:'0.68rem', fontWeight:'700', color:'white', background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.25)' }}>
                                                {user.professional_sub_type === 'working_professional' ? '💼 Working Professional' : '🎓 Final Year Undergraduate'}
                                            </span>
                                        )}
                                    </div>
                                    {user.organisation && (
                                        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.8rem', color:'rgba(255,255,255,0.7)' }}>
                                            <Building2 size={12}/> {user.organisation}
                                        </span>
                                    )}
                                    {!loadingProfile && profile?.created_at && (
                                        <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>
                                            Member since {formatDate(profile.created_at)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main */}
                <div style={{ maxWidth:'800px', margin:'-2rem auto 0', padding:'0 clamp(0.75rem,3vw,1.5rem) 4rem', position:'relative', zIndex:1 }}>

                    {profileError && (
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'10px', padding:'0.75rem 1rem', marginBottom:'1.25rem', color:'#DC2626', fontSize:'0.875rem', flexWrap:'wrap' }}>
                            <AlertCircle size={15} style={{ flexShrink:0 }}/> {profileError}
                            <button onClick={fetchProfile} style={{ marginLeft:'auto', background:'none', border:'none', color:'#DC2626', cursor:'pointer', fontWeight:'700', fontSize:'0.78rem', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', gap:'4px' }}>
                                <RefreshCw size={11}/> Retry
                            </button>
                        </div>
                    )}

                    {/* Tab nav */}
                    <div className="profile-tabs">
                        {TABS.map(({ key, label, icon: Icon }) => (
                            <button key={key}
                                onClick={() => setActiveTab(key)}
                                className="profile-tab-btn"
                                style={{ background: activeTab === key ? '#003366' : 'transparent', color: activeTab === key ? 'white' : '#64748B' }}>
                                <Icon size={14}/>
                                <span className="profile-tab-label">{label}</span>
                            </button>
                        ))}
                    </div>

                    {activeTab === 'info'     && <ProfileInfoSection    user={profile || user} showToast={showToast} />}
                    {activeTab === 'password' && <ChangePasswordSection showToast={showToast} />}
                    {activeTab === 'uploads'  && <MyUploadsSection      showToast={showToast} navigate={navigate} />}
                    {activeTab === 'saved'    && <SavedPostsSection     showToast={showToast} />}
                </div>
            </div>
        </>
    );
};

export default Profile;