import React, { useState, useEffect, useCallback } from 'react';
import {
    Trophy, Plus, Trash2, Edit2, Save, X, Loader2,
    Award, Star, Users, ChevronDown, ChevronRight,
    Upload, AlertCircle, RefreshCw, Linkedin, BadgeCheck,
} from 'lucide-react';
import { useToast } from '../hooks/useToast.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate } from '../utils/dateFormatter.js';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import {
    getAwards, getNominees, getLeaderboard,
    createAward, updateAward, deleteAward,
    createCategory, updateCategory, deleteCategory,
    createNominee, updateNominee, deleteNominee,
    uploadNomineePhoto,
} from '../api/nominations.js';

// ─── Shared Styles ────────────────────────────────────────────────────────────
const PILL = (color, bg) => ({
    display: 'inline-block', whiteSpace: 'nowrap', textTransform: 'capitalize',
    fontSize: '0.7rem', fontWeight: '700', padding: '3px 10px', borderRadius: '100px',
    color, background: bg,
});

const IBTN = (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    border: 'none', padding: '5px 11px', borderRadius: '7px',
    fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
    fontFamily: 'inherit', color, background: bg, transition: 'opacity 0.15s',
});

const SkeletonRow = ({ cols = 4 }) => (
    <tr>
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} style={{ padding: '0.85rem 1rem' }}>
                <div style={{ height: '11px', background: '#E2E8F0', borderRadius: '4px', width: `${50 + (i * 15) % 40}%`, animation: 'an-pulse 1.4s ease-in-out infinite' }} />
            </td>
        ))}
    </tr>
);

const EmptyState = ({ icon: Icon, message }) => (
    <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94A3B8' }}>
        <Icon size={38} style={{ opacity: 0.25, display: 'block', margin: '0 auto 0.75rem' }} />
        <p style={{ fontSize: '0.875rem', margin: 0 }}>{message}</p>
    </div>
);

const ErrorState = ({ message, onRetry }) => (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#EF4444' }}>
        <AlertCircle size={32} style={{ opacity: 0.7, display: 'block', margin: '0 auto 0.75rem' }} />
        <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>{message}</p>
        {onRetry && (
            <button onClick={onRetry} style={{ ...IBTN('white', '#003366'), padding: '8px 18px' }}>
                <RefreshCw size={13} /> Retry
            </button>
        )}
    </div>
);

const TableWrapper = ({ children, headers }) => (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                        {headers.map((h) => (
                            <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    </div>
);

const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' };
const labelStyle = { fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' };

const TIMELINE_META = {
    quarterly:     { label: 'Quarterly',    color: '#0284C7', bg: '#EFF6FF' },
    'half-yearly': { label: 'Half-Yearly',  color: '#7C3AED', bg: '#FAF5FF' },
    yearly:        { label: 'Yearly',       color: '#D97706', bg: '#FFFBEB' },
};

// ─── 1. Nominees Tab ──────────────────────────────────────────────────────────
const NomineesTab = ({ showToast, awards }) => {
    const EMPTY_FORM = {
        award_id: '', category_id: '', name: '', designation: '', company: '',
        linkedin_url: '', achievements: '', description: '', is_active: true, is_winner: false,
    };

    const [nominees, setNominees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [editId, setEditId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState({});
    const [photoUploading, setPhotoUploading] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [filterAward, setFilterAward] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [availableCats, setAvailableCats] = useState([]);

    useEffect(() => {
        if (!form.award_id) { setAvailableCats([]); return; }
        const award = awards.find(a => String(a.id) === String(form.award_id));
        setAvailableCats(award?.categories || []);
    }, [form.award_id, awards]);

    const fetchNominees = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = {};
            if (filterAward) params.award_id = filterAward;
            if (filterCat)   params.category_id = filterCat;
            const res = await getNominees(params);
            const payload = res.data?.data;
            setNominees(Array.isArray(payload) ? payload : []);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [filterAward, filterCat]);

    useEffect(() => { fetchNominees(); }, [fetchNominees]);

    const field = (key) => (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((p) => ({ ...p, [key]: val }));
        if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: null }));
        if (key === 'award_id') setForm((p) => ({ ...p, award_id: val, category_id: '' }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Name required';
        if (!form.award_id) e.award_id = 'Award required';
        if (!form.category_id) e.category_id = 'Category required';
        return e;
    };

    const resetForm = () => { setForm(EMPTY_FORM); setFormErrors({}); setEditId(null); setShowForm(false); setPhotoFile(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setFormErrors(errs); return; }
        setSubmitting(true);
        try {
            let nomineeId = editId;
            if (editId) {
                await updateNominee(editId, form);
                showToast('Nominee updated!', 'success');
            } else {
                const r = await createNominee(form);
                nomineeId = r.data?.data?.id;
                showToast('Nominee added!', 'success');
            }
            if (photoFile && nomineeId) {
                const fd = new FormData();
                fd.append('photo', photoFile);
                try { await uploadNomineePhoto(nomineeId, fd); }
                catch { showToast('Nominee saved, but photo upload failed.', 'warning'); }
            }
            resetForm();
            fetchNominees();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmitting(false); }
    };

    const startEdit = (n) => {
        setForm({
            award_id: String(n.award_id || ''), category_id: String(n.category_id || ''),
            name: n.name || '', designation: n.designation || '', company: n.company || '',
            linkedin_url: n.linkedin_url || '', achievements: n.achievements || '',
            description: n.description || '', is_active: n.is_active ?? true, is_winner: n.is_winner ?? false,
        });
        setEditId(n.id); setPhotoFile(null); setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null);
        setDeleting((p) => ({ ...p, [id]: true }));
        try {
            await deleteNominee(id);
            setNominees((prev) => prev.filter((n) => n.id !== id));
            showToast('Nominee deleted.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    const handlePhotoUpload = async (e, nomineeId) => {
        const file = e.target.files?.[0]; if (!file) return;
        setPhotoUploading((p) => ({ ...p, [nomineeId]: true }));
        try {
            const fd = new FormData(); fd.append('photo', file);
            await uploadNomineePhoto(nomineeId, fd);
            showToast('Photo uploaded!', 'success');
            fetchNominees();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setPhotoUploading((p) => ({ ...p, [nomineeId]: false })); e.target.value = ''; }
    };

    const allCatsForFilter = awards.flatMap(a => (a.categories || []).map(c => ({ ...c, awardName: a.name })));
    const filterCatsForAward = filterAward
        ? (awards.find(a => String(a.id) === String(filterAward))?.categories || [])
        : allCatsForFilter;

    // Responsive form grid: 2-col on desktop, 1-col on mobile
    const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: '1rem' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <select value={filterAward} onChange={(e) => { setFilterAward(e.target.value); setFilterCat(''); }}
                        style={{ padding: '7px 12px', border: '1px solid #CBD5E1', borderRadius: '7px', fontSize: '0.82rem', fontFamily: 'inherit', background: 'white', color: '#475569', cursor: 'pointer' }}>
                        <option value="">All Awards</option>
                        {awards.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
                        style={{ padding: '7px 12px', border: '1px solid #CBD5E1', borderRadius: '7px', fontSize: '0.82rem', fontFamily: 'inherit', background: 'white', color: '#475569', cursor: 'pointer' }}>
                        <option value="">All Categories</option>
                        {filterCatsForAward.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <button onClick={() => { resetForm(); setShowForm((p) => !p); }} style={{ ...IBTN('white', '#003366'), padding: '8px 16px', fontSize: '0.82rem' }}>
                    <Plus size={13} /> {showForm && !editId ? 'Cancel' : (editId ? 'Adding New' : 'Add Nominee')}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} noValidate style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: 'clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: '700', color: '#1E293B' }}>{editId ? 'Edit Nominee' : 'Add Nominee'}</h4>
                    <div style={formGrid}>
                        <div>
                            <label style={labelStyle}>Award *</label>
                            <select value={form.award_id} onChange={(e) => setForm((p) => ({ ...p, award_id: e.target.value, category_id: '' }))}
                                style={{ ...inputStyle, borderColor: formErrors.award_id ? '#F87171' : '#CBD5E1' }}>
                                <option value="">Select award…</option>
                                {awards.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            {formErrors.award_id && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: '3px' }}>{formErrors.award_id}</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Category *</label>
                            <select value={form.category_id} onChange={field('category_id')} disabled={!form.award_id}
                                style={{ ...inputStyle, borderColor: formErrors.category_id ? '#F87171' : '#CBD5E1', opacity: !form.award_id ? 0.6 : 1 }}>
                                <option value="">Select category…</option>
                                {availableCats.map(c => <option key={c.id} value={c.id}>{c.name} ({c.timeline})</option>)}
                            </select>
                            {formErrors.category_id && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: '3px' }}>{formErrors.category_id}</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Full Name *</label>
                            <input value={form.name} onChange={field('name')} style={{ ...inputStyle, borderColor: formErrors.name ? '#F87171' : '#CBD5E1' }} placeholder="Dr. Jane Smith" />
                            {formErrors.name && <p style={{ color: '#EF4444', fontSize: '0.72rem', marginTop: '3px' }}>{formErrors.name}</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Designation</label>
                            <input value={form.designation} onChange={field('designation')} style={inputStyle} placeholder="Chief AI Risk Officer" />
                        </div>
                        <div>
                            <label style={labelStyle}>Company / Organization</label>
                            <input value={form.company} onChange={field('company')} style={inputStyle} placeholder="Acme Corp" />
                        </div>
                        <div>
                            <label style={labelStyle}>LinkedIn URL</label>
                            <input type="url" value={form.linkedin_url} onChange={field('linkedin_url')} style={inputStyle} placeholder="https://linkedin.com/in/…" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Key Achievements <span style={{ fontWeight: '400', color: '#94A3B8' }}>(separate with semicolons)</span></label>
                            <textarea value={form.achievements} onChange={field('achievements')} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} placeholder="Led AI governance at Fortune 500 for 5 years; Published 10+ papers; Speaker at Davos" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Bio / Description</label>
                            <textarea value={form.description} onChange={field('description')} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} placeholder="Brief professional overview…" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Profile Photo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#F1F5F9', border: '1px dashed #CBD5E1', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', color: '#475569', transition: 'all 0.15s' }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }}>
                                    <Upload size={13} /> {photoFile ? 'Change photo' : 'Choose photo…'}
                                    <input type="file" accept="image/*" hidden onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                                </label>
                                {photoFile && (
                                    <>
                                        <img src={URL.createObjectURL(photoFile)} alt="preview" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{photoFile.name}</span>
                                        <button type="button" onClick={() => setPhotoFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: '2px' }}><X size={14} /></button>
                                    </>
                                )}
                            </div>
                            <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '4px', marginBottom: 0 }}>JPG, PNG or WebP · max 5 MB. Leave empty to keep existing photo.</p>
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" id="is_active_nom" checked={form.is_active} onChange={field('is_active')} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                <label htmlFor="is_active_nom" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Mark as Active / Visible</label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" id="is_winner_nom" checked={form.is_winner} onChange={field('is_winner')} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#D97706' }} />
                                <label htmlFor="is_winner_nom" style={{ ...labelStyle, margin: 0, cursor: 'pointer', color: '#D97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Trophy size={12} /> Mark as Award Winner
                                </label>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={resetForm} style={{ ...IBTN('#64748B', '#F1F5F9'), padding: '8px 16px' }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ ...IBTN('white', '#003366'), padding: '8px 20px', opacity: submitting ? 0.6 : 1 }}>
                            {submitting ? <Loader2 size={13} style={{ animation: 'an-spin 1s linear infinite' }} /> : <Save size={13} />}
                            {editId ? 'Update Nominee' : 'Add Nominee'}
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            {loading ? (
                <TableWrapper headers={['Nominee', 'Category', 'Company', 'Votes', 'Status', '']}>{[1,2,3,4].map(i => <SkeletonRow key={i} cols={6} />)}</TableWrapper>
            ) : error ? <ErrorState message={error} onRetry={fetchNominees} /> : nominees.length === 0 ? (
                <EmptyState icon={Trophy} message="No nominees yet. Add one above." />
            ) : (
                <TableWrapper headers={['Nominee', 'Category / Timeline', 'Company', 'Votes', 'Status', '']}>
                    {nominees.map((n) => {
                        const tm = TIMELINE_META[n.timeline] || TIMELINE_META.quarterly;
                        return (
                            <tr key={n.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                                onMouseOver={(e) => (e.currentTarget.style.background = '#FAFBFC')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'white')}>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {n.photo_url
                                            ? <img src={n.photo_url} alt={n.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #E2E8F0' }} />
                                            : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #003366, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: '0.85rem', fontWeight: '800' }}>{n.name?.charAt(0)?.toUpperCase()}</div>
                                        }
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.875rem' }}>{n.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{n.designation || '—'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>{n.category_name || '—'}</div>
                                    <span style={PILL(tm.color, tm.bg)}>{tm.label}</span>
                                </td>
                                <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.875rem' }}>{n.company || '—'}</td>
                                <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#0284C7', fontSize: '0.9rem' }}>{n.vote_count ?? 0}</td>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={PILL(n.is_active ? '#15803D' : '#64748B', n.is_active ? '#F0FDF4' : '#F1F5F9')}>{n.is_active ? '● Active' : '○ Hidden'}</span>
                                        {!!n.is_winner && <span style={PILL('#D97706', '#FFFBEB')}>🏆 Winner</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '0.85rem 1rem' }}>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <label style={{ ...IBTN('#7C3AED', '#FAF5FF'), padding: '5px 8px', cursor: 'pointer', flexShrink: 0 }} title="Upload photo">
                                            {photoUploading[n.id] ? <Loader2 size={11} style={{ animation: 'an-spin 1s linear infinite' }} /> : <Upload size={11} />}
                                            <input type="file" accept="image/*" hidden onChange={(e) => handlePhotoUpload(e, n.id)} />
                                        </label>
                                        <button onClick={() => startEdit(n)} style={{ ...IBTN('#D97706', '#FFFBEB'), padding: '5px 8px' }}><Edit2 size={11} /></button>
                                        <button onClick={() => setConfirm({ id: n.id, name: n.name })} disabled={deleting[n.id]}
                                            style={{ ...IBTN('#DC2626', '#FEF2F2'), padding: '5px 8px', opacity: deleting[n.id] ? 0.5 : 1 }}>
                                            {deleting[n.id] ? <Loader2 size={11} style={{ animation: 'an-spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </TableWrapper>
            )}
            <ConfirmDialog isOpen={!!confirm} title="Delete Nominee" message={`Delete "${confirm?.name}"? All votes for this nominee will also be removed.`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── 2. Awards & Categories Tab ───────────────────────────────────────────────
const AwardsTab = ({ showToast, awards, onRefreshAwards }) => {
    const EMPTY_AWARD = { name: '', description: '', is_active: true };
    const EMPTY_CAT   = { award_id: '', name: '', timeline: 'quarterly' };

    const [awardForm, setAwardForm] = useState(EMPTY_AWARD);
    const [awardEditId, setAwardEditId] = useState(null);
    const [awardSubmitting, setAwardSubmitting] = useState(false);
    const [showAwardForm, setShowAwardForm] = useState(false);
    const [awardConfirm, setAwardConfirm] = useState(null);
    const [awardDeleting, setAwardDeleting] = useState({});

    const [catForm, setCatForm] = useState(EMPTY_CAT);
    const [catEditId, setCatEditId] = useState(null);
    const [catSubmitting, setCatSubmitting] = useState(false);
    const [showCatForm, setShowCatForm] = useState(false);
    const [catConfirm, setCatConfirm] = useState(null);
    const [catDeleting, setCatDeleting] = useState({});
    const [expanded, setExpanded] = useState({});

    const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

    const handleAwardSubmit = async (e) => {
        e.preventDefault(); if (!awardForm.name.trim()) return;
        setAwardSubmitting(true);
        try {
            if (awardEditId) { await updateAward(awardEditId, awardForm); showToast('Award updated!', 'success'); }
            else { await createAward(awardForm); showToast('Award created!', 'success'); }
            setAwardForm(EMPTY_AWARD); setAwardEditId(null); setShowAwardForm(false); onRefreshAwards();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setAwardSubmitting(false); }
    };

    const handleAwardDelete = async () => {
        const { id } = awardConfirm; setAwardConfirm(null);
        setAwardDeleting((p) => ({ ...p, [id]: true }));
        try { await deleteAward(id); showToast('Award deleted.', 'success'); onRefreshAwards(); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setAwardDeleting((p) => ({ ...p, [id]: false })); }
    };

    const handleCatSubmit = async (e) => {
        e.preventDefault(); if (!catForm.name.trim() || !catForm.award_id) return;
        setCatSubmitting(true);
        try {
            if (catEditId) { await updateCategory(catEditId, catForm); showToast('Category updated!', 'success'); }
            else { await createCategory(catForm); showToast('Category created!', 'success'); }
            setCatForm(EMPTY_CAT); setCatEditId(null); setShowCatForm(false); onRefreshAwards();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setCatSubmitting(false); }
    };

    const handleCatDelete = async () => {
        const { id } = catConfirm; setCatConfirm(null);
        setCatDeleting((p) => ({ ...p, [id]: true }));
        try { await deleteCategory(id); showToast('Category deleted.', 'success'); onRefreshAwards(); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setCatDeleting((p) => ({ ...p, [id]: false })); }
    };

    const awardFormGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: '0.85rem' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Awards */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1E293B' }}>Awards</h4>
                    <button onClick={() => { setAwardForm(EMPTY_AWARD); setAwardEditId(null); setShowAwardForm((p) => !p); }} style={{ ...IBTN('white', '#003366'), padding: '7px 14px' }}>
                        <Plus size={13} /> {showAwardForm && !awardEditId ? 'Cancel' : 'New Award'}
                    </button>
                </div>

                {showAwardForm && (
                    <form onSubmit={handleAwardSubmit} noValidate style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: 'clamp(1rem,2.5vw,1.25rem)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={awardFormGrid}>
                            <div>
                                <label style={labelStyle}>Award Name *</label>
                                <input required value={awardForm.name} onChange={(e) => setAwardForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Top AI Risk Leader Awards 2026" />
                            </div>
                            <div>
                                <label style={labelStyle}>Description</label>
                                <input value={awardForm.description} onChange={(e) => setAwardForm((p) => ({ ...p, description: e.target.value }))} style={inputStyle} placeholder="Annual awards recognizing…" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" id="aw_active" checked={awardForm.is_active} onChange={(e) => setAwardForm((p) => ({ ...p, is_active: e.target.checked }))} style={{ width: '15px', height: '15px' }} />
                            <label htmlFor="aw_active" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Active</label>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => { setShowAwardForm(false); setAwardEditId(null); setAwardForm(EMPTY_AWARD); }} style={{ ...IBTN('#64748B', '#F1F5F9'), padding: '7px 14px' }}>Cancel</button>
                            <button type="submit" disabled={awardSubmitting} style={{ ...IBTN('white', '#003366'), padding: '7px 16px', opacity: awardSubmitting ? 0.6 : 1 }}>
                                {awardSubmitting ? <Loader2 size={12} style={{ animation: 'an-spin 1s linear infinite' }} /> : <Save size={12} />}
                                {awardEditId ? 'Update Award' : 'Create Award'}
                            </button>
                        </div>
                    </form>
                )}

                {awards.length === 0 ? <EmptyState icon={Award} message="No awards created yet." /> : awards.map((aw) => (
                    <div key={aw.id} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', marginBottom: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer', background: expanded[aw.id] ? '#FAFBFF' : 'white', flexWrap: 'wrap', gap: '0.5rem' }}
                            onClick={() => toggleExpand(aw.id)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {expanded[aw.id] ? <ChevronDown size={16} color="#94A3B8" /> : <ChevronRight size={16} color="#94A3B8" />}
                                <Trophy size={16} color="#D97706" />
                                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1E293B' }}>{aw.name}</span>
                                <span style={PILL(aw.is_active ? '#15803D' : '#64748B', aw.is_active ? '#F0FDF4' : '#F1F5F9')}>{aw.is_active ? 'Active' : 'Inactive'}</span>
                                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{(aw.categories || []).length} categories</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }} onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { setAwardForm({ name: aw.name, description: aw.description || '', is_active: aw.is_active }); setAwardEditId(aw.id); setShowAwardForm(true); }}
                                    style={{ ...IBTN('#D97706', '#FFFBEB'), padding: '4px 8px' }}><Edit2 size={11} /></button>
                                <button onClick={() => setAwardConfirm({ id: aw.id, name: aw.name })} disabled={awardDeleting[aw.id]}
                                    style={{ ...IBTN('#DC2626', '#FEF2F2'), padding: '4px 8px', opacity: awardDeleting[aw.id] ? 0.5 : 1 }}>
                                    {awardDeleting[aw.id] ? <Loader2 size={11} style={{ animation: 'an-spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                                </button>
                            </div>
                        </div>
                        {expanded[aw.id] && (
                            <div style={{ borderTop: '1px solid #F1F5F9', padding: 'clamp(0.75rem,2vw,1rem) clamp(1rem,2.5vw,1.5rem) clamp(1rem,2vw,1.25rem)' }}>
                                {aw.description && <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '1rem' }}>{aw.description}</p>}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                                    {(aw.categories || []).map((cat) => {
                                        const tm = TIMELINE_META[cat.timeline] || TIMELINE_META.quarterly;
                                        return (
                                            <div key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: tm.bg, borderRadius: '8px', border: `1px solid ${tm.color}22` }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: tm.color }}>{cat.name}</span>
                                                <span style={PILL(tm.color, 'transparent')}>{tm.label}</span>
                                                <button onClick={() => { setCatForm({ award_id: String(aw.id), name: cat.name, timeline: cat.timeline }); setCatEditId(cat.id); setShowCatForm(true); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', display: 'flex' }}><Edit2 size={11} color={tm.color} /></button>
                                                <button onClick={() => setCatConfirm({ id: cat.id, name: cat.name })} disabled={catDeleting[cat.id]}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', display: 'flex', opacity: catDeleting[cat.id] ? 0.4 : 1 }}>
                                                    {catDeleting[cat.id] ? <Loader2 size={10} style={{ animation: 'an-spin 1s linear infinite' }} /> : <X size={11} color="#EF4444" />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => { setCatForm({ award_id: String(aw.id), name: '', timeline: 'quarterly' }); setCatEditId(null); setShowCatForm(true); }}
                                        style={{ ...IBTN('#003366', '#EBF0F7'), padding: '5px 10px', fontSize: '0.75rem' }}>
                                        <Plus size={11} /> Add Category
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Category form modal */}
            {showCatForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <form onSubmit={handleCatSubmit} noValidate style={{ background: 'white', borderRadius: '14px', padding: 'clamp(1.25rem,4vw,1.75rem)', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90dvh', overflowY: 'auto' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1E293B' }}>{catEditId ? 'Edit Category' : 'Add Category'}</h4>
                        <div>
                            <label style={labelStyle}>Award *</label>
                            <select value={catForm.award_id} onChange={(e) => setCatForm((p) => ({ ...p, award_id: e.target.value }))} style={inputStyle}>
                                <option value="">Select award…</option>
                                {awards.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Category Name *</label>
                            <input required value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Q1 2026 Quarterly" />
                        </div>
                        <div>
                            <label style={labelStyle}>Timeline</label>
                            <select value={catForm.timeline} onChange={(e) => setCatForm((p) => ({ ...p, timeline: e.target.value }))} style={inputStyle}>
                                <option value="quarterly">Quarterly</option>
                                <option value="half-yearly">Half-Yearly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => { setShowCatForm(false); setCatEditId(null); }} style={{ ...IBTN('#64748B', '#F1F5F9'), padding: '8px 14px' }}>Cancel</button>
                            <button type="submit" disabled={catSubmitting} style={{ ...IBTN('white', '#003366'), padding: '8px 18px', opacity: catSubmitting ? 0.6 : 1 }}>
                                {catSubmitting ? <Loader2 size={12} style={{ animation: 'an-spin 1s linear infinite' }} /> : <Save size={12} />}
                                {catEditId ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ConfirmDialog isOpen={!!awardConfirm} title="Delete Award" message={`Delete "${awardConfirm?.name}"? All categories and nominees under this award will also be removed.`} confirmLabel="Delete" onConfirm={handleAwardDelete} onClose={() => setAwardConfirm(null)} />
            <ConfirmDialog isOpen={!!catConfirm} title="Delete Category" message={`Delete category "${catConfirm?.name}"? All nominees and votes in this category will also be removed.`} confirmLabel="Delete" onConfirm={handleCatDelete} onClose={() => setCatConfirm(null)} />
        </div>
    );
};

// ─── 3. Leaderboard Tab ───────────────────────────────────────────────────────
const LeaderboardTab = ({ showToast }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState({});

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getLeaderboard();
            const payload = res.data?.data;
            setLeaderboard(Array.isArray(payload) ? payload : []);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

    const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));
    const MEDAL = ['🥇', '🥈', '🥉'];

    if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[1,2].map(i => <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', height: '72px', animation: 'an-pulse 1.4s ease-in-out infinite' }} />)}</div>;
    if (error) return <ErrorState message={error} onRetry={fetchLeaderboard} />;
    if (!leaderboard.length) return <EmptyState icon={Star} message="No leaderboard data yet. Votes needed." />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {leaderboard.map((award) => (
                <div key={award.award_id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ background: 'linear-gradient(135deg, #001a3a 0%, #003366 100%)', padding: 'clamp(0.75rem,2vw,1rem) clamp(1rem,2.5vw,1.5rem)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Trophy size={18} color="#F59E0B" />
                        <span style={{ color: 'white', fontWeight: '800', fontSize: '0.95rem', flex: 1 }}>{award.award_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{award.categories?.length} categories</span>
                    </div>
                    {(award.categories || []).map((cat) => {
                        const tm = TIMELINE_META[cat.timeline] || TIMELINE_META.quarterly;
                        const key = `${award.award_id}-${cat.category_id}`;
                        const isOpen = expanded[key] !== false;
                        return (
                            <div key={cat.category_id} style={{ borderTop: '1px solid #F1F5F9' }}>
                                <div onClick={() => toggleExpand(key)} style={{ display: 'flex', alignItems: 'center', padding: 'clamp(0.65rem,1.5vw,0.85rem) clamp(1rem,2.5vw,1.5rem)', cursor: 'pointer', gap: '0.75rem', background: isOpen ? '#FAFBFF' : 'white', flexWrap: 'wrap' }}>
                                    {isOpen ? <ChevronDown size={15} color="#94A3B8" /> : <ChevronRight size={15} color="#94A3B8" />}
                                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1E293B', flex: 1 }}>{cat.category_name}</span>
                                    <span style={PILL(tm.color, tm.bg)}>{tm.label}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{cat.nominees?.length || 0} nominees</span>
                                </div>
                                {isOpen && (
                                    <div style={{ padding: 'clamp(0.4rem,1vw,0.5rem) clamp(1rem,2.5vw,1.5rem) clamp(0.75rem,2vw,1.25rem)' }}>
                                        {(!cat.nominees || cat.nominees.length === 0) ? (
                                            <p style={{ fontSize: '0.82rem', color: '#94A3B8', textAlign: 'center', padding: '1rem 0' }}>No votes yet in this category.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {cat.nominees.map((nm, idx) => (
                                                    <div key={nm.nominee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: 'clamp(0.55rem,1.5vw,0.7rem) clamp(0.75rem,2vw,1rem)', background: idx === 0 ? 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' : '#F8FAFC', borderRadius: '10px', border: idx === 0 ? '1px solid #FCD34D' : '1px solid #F1F5F9', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{MEDAL[idx] || `#${idx + 1}`}</span>
                                                        {nm.photo_url
                                                            ? <img src={nm.photo_url} alt={nm.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid white' }} />
                                                            : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #003366, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: '0.85rem', fontWeight: '800' }}>{nm.name?.charAt(0)?.toUpperCase()}</div>
                                                        }
                                                        <div style={{ flex: 1, minWidth: '80px' }}>
                                                            <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nm.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{nm.designation || nm.company || ''}</div>
                                                        </div>
                                                        {nm.linkedin_url && (
                                                            <a href={nm.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0A66C2', display: 'flex', flexShrink: 0 }}><Linkedin size={15} /></a>
                                                        )}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                            <Star size={14} color={idx === 0 ? '#F59E0B' : '#CBD5E1'} fill={idx === 0 ? '#F59E0B' : 'none'} />
                                                            <span style={{ fontWeight: '800', fontSize: '1rem', color: idx === 0 ? '#D97706' : '#475569' }}>{nm.vote_count ?? 0}</span>
                                                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>votes</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

// ─── AdminNominees ────────────────────────────────────────────────────────────
const INNER_TABS = [
    { key: 'nominees',    label: 'Nominees',             icon: Users },
    { key: 'awards',      label: 'Awards & Categories',  icon: Award },
    { key: 'leaderboard', label: 'Leaderboard',          icon: Trophy },
];

const AdminNominees = ({ embedded = false }) => {
    const { showToast } = useToast();
    const [tab, setTab] = useState('nominees');
    const [awards, setAwards] = useState([]);
    const [awardsLoading, setAwardsLoading] = useState(true);

    const fetchAwards = useCallback(async () => {
        setAwardsLoading(true);
        try {
            const res = await getAwards();
            const payload = res.data?.data;
            setAwards(Array.isArray(payload) ? payload : []);
        } catch { /* ignore */ }
        finally { setAwardsLoading(false); }
    }, []);

    useEffect(() => { fetchAwards(); }, [fetchAwards]);

    const container = embedded
        ? { display: 'flex', flexDirection: 'column', gap: '1.25rem' }
        : { background: '#F1F5F9', minHeight: '100vh' };

    return (
        <div style={container}>
            {!embedded && (
                <div style={{ background: 'linear-gradient(135deg, #001a3a 0%, #003366 100%)', padding: 'clamp(1.5rem,4vw,2.25rem) clamp(1rem,3vw,2rem) clamp(1.25rem,3vw,1.75rem)' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <Trophy size={24} color="#F59E0B" />
                            <h1 style={{ color: 'white', fontSize: 'clamp(1.25rem,3vw,1.6rem)', fontWeight: '900', margin: 0 }}>Nominations Manager</h1>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', margin: 0 }}>Manage awards, categories, nominees and view live leaderboard.</p>
                    </div>
                </div>
            )}

            {/* Inner tab bar — horizontal scroll on mobile */}
            <div style={{ background: embedded ? '#F8FAFC' : 'white', borderBottom: '1px solid #E2E8F0', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', borderRadius: embedded ? '10px 10px 0 0' : 0 }}>
                <div style={{ maxWidth: embedded ? '100%' : '1200px', margin: '0 auto', padding: embedded ? '0' : '0 clamp(0.5rem,2vw,2rem)', display: 'flex', minWidth: 'max-content' }}>
                    {INNER_TABS.map(({ key, label, icon: Icon }) => {
                        const active = tab === key;
                        return (
                            <button key={key} onClick={() => setTab(key)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.85rem 1.1rem', background: 'none', border: 'none', borderBottom: active ? '3px solid #003366' : '3px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: '600', color: active ? '#003366' : '#64748B', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                                <Icon size={13} /> {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: embedded ? '100%' : '1200px', margin: '0 auto', padding: embedded ? 'clamp(1rem,2.5vw,1.25rem) 0 0' : 'clamp(1.25rem,3vw,2rem) clamp(1rem,3vw,2rem) 5rem', width: '100%', boxSizing: 'border-box' }}>
                {awardsLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        <Loader2 size={24} style={{ animation: 'an-spin 1s linear infinite' }} />
                    </div>
                ) : (
                    <>
                        {tab === 'nominees'    && <NomineesTab    showToast={showToast} awards={awards} />}
                        {tab === 'awards'      && <AwardsTab      showToast={showToast} awards={awards} onRefreshAwards={fetchAwards} />}
                        {tab === 'leaderboard' && <LeaderboardTab showToast={showToast} />}
                    </>
                )}
            </div>

            <style>{`
                @keyframes an-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
                @keyframes an-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>
        </div>
    );
};

export default AdminNominees;