import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Users, Check, X, Mail, Building,
    CalendarDays, Clock, AlertCircle, RefreshCw,
    Search, Loader2, UserX, UserCheck, ChevronDown,
    Plus, Trash2, FileText, Edit2, Save
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getPendingUsers, getAllUsers, approveUser, rejectUser, getAdminStats, updateUserRole } from '../api/admin.js';
import { getEvents, createEvent, deleteEvent } from '../api/events.js';
import { getTeam, createTeamMember, deleteTeamMember } from '../api/team.js';
import { getResources, deleteResource } from '../api/resources.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate, formatDateTime } from '../utils/dateFormatter.js';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'pending', label: 'Member Approvals', icon: Clock },
    { key: 'events', label: 'Manage Events', icon: CalendarDays },
    { key: 'team', label: 'Manage Team', icon: Users },
    { key: 'resources', label: 'Manage Resources', icon: FileText },
];

const ROLE_OPTIONS = ['admin', 'executive', 'paid_member', 'product_company', 'university', 'free_member'];
const ROLE_LABELS = {
    admin: 'Admin', executive: 'Executive', paid_member: 'Paid Member',
    product_company: 'Product', university: 'University', free_member: 'Free'
};
const ROLE_COLORS = {
    admin: '#7C3AED', executive: '#0284C7', paid_member: '#059669',
    product_company: '#D97706', university: '#9333EA', free_member: '#64748B'
};
const EVENT_CATEGORIES = ['webinar', 'seminar', 'workshop', 'podcast', 'conference'];

// ─── Shared helpers ───────────────────────────────────────────────────────────
const SkeletonRow = ({ cols = 4 }) => (
    <tr>
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <div className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: `${50 + (i * 15) % 40}%` }} />
            </td>
        ))}
    </tr>
);

const EmptyState = ({ icon: Icon, message }) => (
    <div className="text-center py-16 text-slate-400">
        <Icon size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">{message}</p>
    </div>
);

const ErrorState = ({ message, onRetry }) => (
    <div className="text-center py-12 text-red-500">
        <AlertCircle size={32} className="mx-auto mb-3 opacity-70" />
        <p className="mb-4 text-sm">{message}</p>
        {onRetry && (
            <button onClick={onRetry} className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-5 py-2 rounded-md cursor-pointer font-bold text-sm">
                <RefreshCw size={13} /> Retry
            </button>
        )}
    </div>
);

const TableWrapper = ({ children, headers }) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse text-sm">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                    {headers.map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left font-bold text-slate-400 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    </div>
);

// ─── 1. Member Approvals Tab ──────────────────────────────────────────────────
const PendingTab = ({ showToast, onApproved }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [actioning, setActioning] = useState({});

    const fetch = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getPendingUsers();
            const payload = res.data?.data;
            setUsers(Array.isArray(payload) ? payload : []);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const handleApprove = async (userId) => {
        setActioning((p) => ({ ...p, [userId]: 'approve' }));
        try {
            await approveUser(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            showToast('User approved!', 'success');
            onApproved?.();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setActioning((p) => ({ ...p, [userId]: null })); }
    };

    const confirmReject = async () => {
        const { userId } = confirm; setConfirm(null);
        setActioning((p) => ({ ...p, [userId]: 'reject' }));
        try {
            await rejectUser(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            showToast('User rejected.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setActioning((p) => ({ ...p, [userId]: null })); }
    };

    if (loading) return <div className="flex flex-col gap-3 pt-2">{[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-slate-200 h-20 animate-pulse" />)}</div>;
    if (error) return <ErrorState message={error} onRetry={fetch} />;
    if (users.length === 0) return (
        <div className="text-center py-16 bg-green-50 rounded-xl border border-green-200">
            <UserCheck size={40} color="#16A34A" className="mx-auto mb-3" />
            <p className="text-green-700 font-bold">All caught up! No pending approvals.</p>
        </div>
    );

    return (
        <>
            <div className="flex flex-col gap-3">
                {users.map((u) => (
                    <div key={u.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex justify-between items-center flex-wrap gap-4 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-base text-slate-800">{u.name}</span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={11} />{u.email}</span>
                            {u.organisation && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Building size={11} />{u.organisation}</span>}
                            <div className="flex gap-1.5 flex-wrap mt-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${ROLE_COLORS[u.role] || '#64748B'}20`, color: ROLE_COLORS[u.role] || '#64748B' }}>
                                    {ROLE_LABELS[u.role] || u.role}
                                </span>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{formatDate(u.created_at)}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleApprove(u.id)} disabled={!!actioning[u.id]}
                                className="inline-flex items-center gap-1 bg-emerald-600 text-white border-none px-3 py-2 rounded-md font-bold text-xs cursor-pointer disabled:opacity-60">
                                {actioning[u.id] === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                            </button>
                            <button onClick={() => setConfirm({ userId: u.id })} disabled={!!actioning[u.id]}
                                className="inline-flex items-center gap-1 bg-red-50 text-red-600 border-none px-3 py-2 rounded-md font-bold text-xs cursor-pointer disabled:opacity-60">
                                {actioning[u.id] === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Reject
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmDialog isOpen={!!confirm} title="Reject Application"
                message="Are you sure you want to reject this application?"
                confirmLabel="Reject" onConfirm={confirmReject} onClose={() => setConfirm(null)} />
        </>
    );
};

// ─── 2. Manage Events Tab ─────────────────────────────────────────────────────
const EventsTab = ({ showToast }) => {
    const EMPTY_FORM = { title: '', description: '', date: '', time: '', category: 'webinar', speaker: '', location: '', is_virtual: true, registration_link: '' };
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState({});

    const fetchEvents = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getEvents({ page, limit: 10 });
            const payload = res.data?.data;
            setEvents(Array.isArray(payload) ? payload : (payload?.events || []));
            setTotalPages(payload?.totalPages ?? 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const field = (key) => (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((p) => ({ ...p, [key]: val }));
        if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: null }));
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Title required';
        if (!form.date) e.date = 'Date required';
        if (!form.category) e.category = 'Category required';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setFormErrors(errs); return; }
        setSubmitting(true);
        try {
            const payload = { ...form, date: form.time ? `${form.date}T${form.time}:00` : form.date };
            delete payload.time;
            await createEvent(payload);
            showToast('Event created!', 'success');
            setForm(EMPTY_FORM);
            setShowForm(false);
            setPage(1);
            fetchEvents();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null);
        setDeleting((p) => ({ ...p, [id]: true }));
        try {
            await deleteEvent(id);
            setEvents((prev) => prev.filter((ev) => ev.id !== id));
            showToast('Event deleted.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    const inp = (hasErr) => `w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors font-sans ${hasErr ? 'border-red-400' : 'border-slate-300 focus:border-[#003366]'}`;

    return (
        <div className="flex flex-col gap-5">
            {/* Create form toggle */}
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-sm">{events.length} event{events.length !== 1 ? 's' : ''}</h3>
                <button onClick={() => setShowForm((p) => !p)}
                    className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-4 py-2 rounded-lg font-bold text-sm cursor-pointer">
                    <Plus size={15} /> {showForm ? 'Cancel' : 'Create Event'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} noValidate className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">New Event</h4>
                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Title *</label>
                            <input value={form.title} onChange={field('title')} className={inp(formErrors.title)} placeholder="e.g. AI Governance Webinar" />
                            {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Category *</label>
                            <select value={form.category} onChange={field('category')} className={inp(formErrors.category)}>
                                {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Date *</label>
                            <input type="date" value={form.date} onChange={field('date')} className={inp(formErrors.date)} />
                            {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Time</label>
                            <input type="time" value={form.time} onChange={field('time')} className={inp(false)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Speaker</label>
                            <input value={form.speaker} onChange={field('speaker')} className={inp(false)} placeholder="Speaker name" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Location / Platform</label>
                            <input value={form.location} onChange={field('location')} className={inp(false)} placeholder="Zoom / London / etc." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Registration Link</label>
                            <input type="url" value={form.registration_link} onChange={field('registration_link')} className={inp(false)} placeholder="https://…" />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                            <input type="checkbox" id="is_virtual" checked={form.is_virtual} onChange={field('is_virtual')} className="w-4 h-4" />
                            <label htmlFor="is_virtual" className="text-sm text-slate-700 font-medium cursor-pointer">Virtual event</label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                        <textarea value={form.description} onChange={field('description')} rows={3} className={`${inp(false)} resize-y`} placeholder="Event description…" />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setShowForm(false); setFormErrors({}); setForm(EMPTY_FORM); }}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm font-semibold cursor-pointer bg-white">Cancel</button>
                        <button type="submit" disabled={submitting}
                            className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-5 py-2 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-60">
                            {submitting ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Create Event</>}
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            {loading ? (
                <TableWrapper headers={['Title', 'Category', 'Date', 'Speaker', '']}>
                    {[1, 2, 3].map((i) => <SkeletonRow key={i} cols={5} />)}
                </TableWrapper>
            ) : error ? <ErrorState message={error} onRetry={fetchEvents} /> : events.length === 0 ? (
                <EmptyState icon={CalendarDays} message="No events yet. Create one above." />
            ) : (
                <TableWrapper headers={['Title', 'Category', 'Date', 'Speaker', '']}>
                    {events.map((ev) => (
                        <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-800 max-w-[220px] truncate">{ev.title}</td>
                            <td className="px-4 py-3">
                                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full capitalize">{ev.category}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(ev.date || ev.start_date)}</td>
                            <td className="px-4 py-3 text-slate-500 text-sm">{ev.speaker || '—'}</td>
                            <td className="px-4 py-3">
                                <button onClick={() => setConfirm({ id: ev.id, name: ev.title })} disabled={deleting[ev.id]}
                                    className="inline-flex items-center gap-1 bg-red-50 text-red-600 border-none px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer disabled:opacity-60">
                                    {deleting[ev.id] ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </TableWrapper>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <ConfirmDialog isOpen={!!confirm} title="Delete Event" message={`Delete "${confirm?.name}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── 3. Manage Team Tab ───────────────────────────────────────────────────────
const TeamTab = ({ showToast }) => {
    const EMPTY_FORM = { name: '', role: '', bio: '', image: null };
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState({});
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTeam = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getTeam({ page, limit: 10 });
            const payload = res.data?.data;
            setMembers(Array.isArray(payload) ? payload : (payload?.members || []));
            setTotalPages(payload?.totalPages ?? 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const field = (key) => (e) => {
        setForm((p) => ({ ...p, [key]: e.target.value }));
        if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: null }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Name required';
        if (!form.role.trim()) e.role = 'Role required';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setFormErrors(errs); return; }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('role', form.role);
            fd.append('bio', form.bio);
            if (form.image) fd.append('image', form.image);
            await createTeamMember(fd);
            showToast('Team member added!', 'success');
            setForm(EMPTY_FORM);
            setShowForm(false);
            fetchTeam();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null);
        setDeleting((p) => ({ ...p, [id]: true }));
        try {
            await deleteTeamMember(id);
            setMembers((prev) => prev.filter((m) => m.id !== id));
            showToast('Team member removed.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    const inp = (hasErr) => `w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors font-sans ${hasErr ? 'border-red-400' : 'border-slate-300 focus:border-[#003366]'}`;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-sm">{members.length} team member{members.length !== 1 ? 's' : ''}</h3>
                <button onClick={() => setShowForm((p) => !p)}
                    className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-4 py-2 rounded-lg font-bold text-sm cursor-pointer">
                    <Plus size={15} /> {showForm ? 'Cancel' : 'Add Member'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} noValidate className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">New Team Member</h4>
                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
                            <input value={form.name} onChange={field('name')} className={inp(formErrors.name)} placeholder="Dr. Jane Smith" />
                            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Role / Title *</label>
                            <input value={form.role} onChange={field('role')} className={inp(formErrors.role)} placeholder="Director of Research" />
                            {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Bio</label>
                        <textarea value={form.bio} onChange={field('bio')} rows={3} className={`${inp(false)} resize-y`} placeholder="Short biography…" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Profile Photo</label>
                        <input type="file" accept="image/*"
                            onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                            className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-md file:bg-slate-100 file:text-slate-700 file:font-semibold file:text-xs cursor-pointer" />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormErrors({}); }}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm font-semibold cursor-pointer bg-white">Cancel</button>
                        <button type="submit" disabled={submitting}
                            className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-5 py-2 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-60">
                            {submitting ? <><Loader2 size={13} className="animate-spin" /> Adding…</> : <><Save size={13} /> Add Member</>}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <TableWrapper headers={['Name', 'Role', 'Added', '']}>
                    {[1, 2, 3].map((i) => <SkeletonRow key={i} cols={4} />)}
                </TableWrapper>
            ) : error ? <ErrorState message={error} onRetry={fetchTeam} /> : members.length === 0 ? (
                <EmptyState icon={Users} message="No team members yet." />
            ) : (
                <TableWrapper headers={['Name', 'Role / Title', 'Added', '']}>
                    {members.map((m) => (
                        <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    {m.image_url
                                        ? <img src={m.image_url} alt={m.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                        : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-500 text-xs font-bold">{m.name?.charAt(0)}</div>
                                    }
                                    <span className="font-semibold text-slate-800">{m.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-sm">{m.role || m.title || '—'}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(m.created_at)}</td>
                            <td className="px-4 py-3">
                                <button onClick={() => setConfirm({ id: m.id, name: m.name })} disabled={deleting[m.id]}
                                    className="inline-flex items-center gap-1 bg-red-50 text-red-600 border-none px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer disabled:opacity-60">
                                    {deleting[m.id] ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </TableWrapper>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <ConfirmDialog isOpen={!!confirm} title="Remove Team Member" message={`Remove "${confirm?.name}" from the team?`} confirmLabel="Remove" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── 4. Manage Resources Tab ──────────────────────────────────────────────────
const ResourcesTab = ({ showToast }) => {
    const [resources, setResources] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState({});
    const [typeFilter, setTypeFilter] = useState('all');

    const fetchResources = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page, limit: 15 };
            if (typeFilter !== 'all') params.type = typeFilter;
            const res = await getResources(params);
            const payload = res.data?.data;
            setResources(Array.isArray(payload) ? payload : (payload?.resources || []));
            setTotalPages(payload?.totalPages ?? 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [page, typeFilter]);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null);
        setDeleting((p) => ({ ...p, [id]: true }));
        try {
            await deleteResource(id);
            setResources((prev) => prev.filter((r) => r.id !== id));
            showToast('Resource deleted.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    const TYPE_COLORS = { framework: '#003366', whitepaper: '#7C3AED', product: '#D97706' };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex bg-slate-200 rounded-lg p-0.5 gap-0.5">
                    {['all', 'framework', 'whitepaper', 'product'].map((t) => (
                        <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold border-none cursor-pointer transition-all ${typeFilter === t ? 'bg-white text-[#003366] shadow-sm' : 'bg-transparent text-slate-500'}`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-slate-400 font-medium">{resources.length} result{resources.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
                <TableWrapper headers={['Title', 'Type', 'Uploader', 'Date', '']}>
                    {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} cols={5} />)}
                </TableWrapper>
            ) : error ? <ErrorState message={error} onRetry={fetchResources} /> : resources.length === 0 ? (
                <EmptyState icon={FileText} message="No resources found." />
            ) : (
                <TableWrapper headers={['Title', 'Type', 'Uploader', 'Date', '']}>
                    {resources.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-800 max-w-[240px] truncate">{r.title}</td>
                            <td className="px-4 py-3">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${TYPE_COLORS[r.type] || '#64748B'}18`, color: TYPE_COLORS[r.type] || '#64748B' }}>
                                    {r.type}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-sm">{r.uploader_name || '—'}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(r.created_at)}</td>
                            <td className="px-4 py-3">
                                <button onClick={() => setConfirm({ id: r.id, name: r.title })} disabled={deleting[r.id]}
                                    className="inline-flex items-center gap-1 bg-red-50 text-red-600 border-none px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer disabled:opacity-60">
                                    {deleting[r.id] ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </TableWrapper>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <ConfirmDialog isOpen={!!confirm} title="Delete Resource" message={`Permanently delete "${confirm?.name}"?`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [tab, setTab] = useState('pending');
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => { document.title = 'Admin Dashboard | ARC'; }, []);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (user.role !== 'admin') { navigate('/'); }
    }, [user, navigate]);

    const refreshPending = useCallback(async () => {
        try {
            const res = await getPendingUsers();
            const payload = res.data?.data;
            setPendingCount(Array.isArray(payload) ? payload.length : 0);
        } catch { setPendingCount(0); }
    }, []);

    useEffect(() => { if (user?.role === 'admin') refreshPending(); }, [user, refreshPending]);

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#002244] to-[#003366] px-8 py-10">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <div className="bg-white/15 rounded-xl p-3 inline-flex">
                        <Shield size={28} color="white" />
                    </div>
                    <div>
                        <h1 className="text-white font-extrabold text-3xl leading-tight">Admin Dashboard</h1>
                        <p className="text-blue-200 text-sm mt-0.5">Logged in as {user.name}</p>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-8 flex overflow-x-auto">
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const active = tab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`flex items-center gap-2 px-5 py-4 border-b-[3px] border-none font-sans text-sm font-semibold whitespace-nowrap cursor-pointer transition-all bg-transparent relative ${active ? 'text-[#003366] border-b border-b-[#003366]' : 'text-slate-500 border-b-transparent'}`}
                                style={{ borderBottom: active ? '3px solid #003366' : '3px solid transparent' }}
                            >
                                <Icon size={15} /> {label}
                                {key === 'pending' && pendingCount > 0 && (
                                    <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded-full ml-1 leading-none">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-8 py-8 pb-20">
                {tab === 'pending' && <PendingTab showToast={showToast} onApproved={refreshPending} />}
                {tab === 'events' && <EventsTab showToast={showToast} />}
                {tab === 'team' && <TeamTab showToast={showToast} />}
                {tab === 'resources' && <ResourcesTab showToast={showToast} />}
            </div>
        </div>
    );
};

export default AdminDashboard;
