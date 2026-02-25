import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    User, Mail, Building, Lock, Eye, EyeOff, Save,
    FileText, Trash2, AlertCircle, Loader2, RefreshCw, Upload
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getProfile, updateProfile, changePassword, getMyResources, deleteMyResource } from '../api/profile.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate } from '../utils/dateFormatter.js';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

const ROLE_LABELS = {
    admin: 'Admin', executive: 'Executive', paid_member: 'Paid Member',
    product_company: 'Product Company', university: 'University', free_member: 'Free Member'
};
const ROLE_COLORS = {
    admin: '#7C3AED', executive: '#0284C7', paid_member: '#059669',
    product_company: '#D97706', university: '#9333EA', free_member: '#64748B'
};

// ─── Shared UI helpers ─────────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
    <div className="mb-5">
        <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
        {children}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const inputCls = (hasErr) =>
    `w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors font-sans ${hasErr ? 'border-red-400' : 'border-slate-300 focus:border-[#003366]'}`;

// ─── Profile Info section ──────────────────────────────────────────────────────
const ProfileInfoSection = ({ user, showToast }) => {
    const { setUser } = useAuth();
    const [form, setForm] = useState({ name: user?.name || '', organisation: user?.organisation || '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

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
            const res = await updateProfile(form);
            const updated = res.data?.data || res.data;
            if (typeof setUser === 'function') setUser(updated);
            showToast('Profile updated!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-7 mb-5">
            <h2 className="text-lg font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                <User size={18} color="#003366" /> Profile Information
            </h2>
            <form onSubmit={handleSubmit} noValidate>
                <Field label="Full Name" error={errors.name}>
                    <input
                        value={form.name}
                        onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); if (errors.name) setErrors((p) => ({ ...p, name: null })); }}
                        className={inputCls(errors.name)}
                        placeholder="Your full name"
                    />
                </Field>
                <Field label="Email Address">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
                        <Mail size={14} /> {user?.email}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed. Contact admin to update.</p>
                </Field>
                <Field label="Organisation">
                    <input
                        value={form.organisation}
                        onChange={(e) => setForm((p) => ({ ...p, organisation: e.target.value }))}
                        className={inputCls(false)}
                        placeholder="Your organisation or company"
                    />
                </Field>
                <div className="flex justify-end">
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 text-white border-none px-6 py-2.5 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-60 font-sans"
                        style={{ background: loading ? '#94A3B8' : '#003366' }}>
                        {loading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ─── Change Password section ───────────────────────────────────────────────────
const ChangePasswordSection = ({ showToast }) => {
    const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [errors, setErrors] = useState({});
    const [show, setShow] = useState({ current: false, new: false, confirm: false });
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const e = {};
        if (!form.current_password) e.current_password = 'Current password required.';
        if (form.new_password.length < 8) e.new_password = 'Password must be at least 8 characters.';
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
            showToast('Password changed!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setLoading(false); }
    };

    const PasswordInput = ({ field, label, showKey }) => (
        <Field label={label} error={errors[field]}>
            <div className="relative">
                <input type={show[showKey] ? 'text' : 'password'} value={form[field]}
                    onChange={(e) => { setForm((p) => ({ ...p, [field]: e.target.value })); if (errors[field]) setErrors((p) => ({ ...p, [field]: null })); }}
                    className={`${inputCls(errors[field])} pr-10`}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    autoComplete="off" />
                <button type="button" onClick={() => setShow((p) => ({ ...p, [showKey]: !p[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-slate-400 p-0">
                    {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </Field>
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-7 mb-5">
            <h2 className="text-lg font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                <Lock size={18} color="#003366" /> Change Password
            </h2>
            <form onSubmit={handleSubmit} noValidate>
                <PasswordInput field="current_password" label="Current Password" showKey="current" />
                <PasswordInput field="new_password" label="New Password" showKey="new" />
                <PasswordInput field="confirm_password" label="Confirm New Password" showKey="confirm" />
                <div className="flex justify-end">
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 text-white border-none px-6 py-2.5 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-60 font-sans"
                        style={{ background: loading ? '#94A3B8' : '#003366' }}>
                        {loading ? <><Loader2 size={14} className="animate-spin" /> Changing…</> : <><Lock size={14} /> Change Password</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ─── My Uploads section ────────────────────────────────────────────────────────
const MyUploadsSection = ({ showToast }) => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState({});

    const fetchMyResources = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getMyResources();
            const payload = res.data?.data;
            setResources(Array.isArray(payload) ? payload : []);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchMyResources(); }, [fetchMyResources]);

    const confirmDelete = async () => {
        const { resourceId } = confirm; setConfirm(null);
        setDeleting((p) => ({ ...p, [resourceId]: true }));
        try {
            await deleteMyResource(resourceId);
            setResources((prev) => prev.filter((r) => r.id !== resourceId));
            showToast('Resource deleted!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [resourceId]: false })); }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-7 mb-5">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-extrabold text-slate-800 m-0 flex items-center gap-2">
                    <FileText size={18} color="#003366" /> My Uploads
                </h2>
                <Link to="/resources" className="inline-flex items-center gap-1.5 bg-[#003366] text-white px-4 py-2 rounded-lg font-bold text-sm no-underline">
                    <Upload size={13} /> Upload New
                </Link>
            </div>

            {loading && <div className="flex flex-col gap-2.5">{[1, 2].map((i) => <div key={i} className="h-14 bg-slate-200 rounded-lg animate-pulse" />)}</div>}

            {error && (
                <div className="text-center py-8 text-red-500">
                    <AlertCircle size={28} className="mx-auto mb-2 opacity-70" />
                    <p className="mb-3 text-sm">{error}</p>
                    <button onClick={fetchMyResources} className="inline-flex items-center gap-1.5 bg-[#003366] text-white border-none px-4 py-2 rounded-md cursor-pointer font-bold text-xs font-sans">
                        <RefreshCw size={12} /> Retry
                    </button>
                </div>
            )}

            {!loading && !error && resources.length === 0 && (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <FileText size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No uploads yet.</p>
                </div>
            )}

            {!loading && !error && resources.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {resources.map((r) => (
                        <div key={r.id} className="flex justify-between items-center px-4 py-3.5 border border-slate-200 rounded-lg gap-4 flex-wrap">
                            <div>
                                <p className="font-bold text-slate-800 m-0 mb-0.5 text-sm">{r.title}</p>
                                <p className="m-0 text-xs text-slate-400">{formatDate(r.created_at)} · {r.type}</p>
                            </div>
                            <button onClick={() => setConfirm({ resourceId: r.id })} disabled={deleting[r.id]}
                                className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border-none px-3 py-1.5 rounded-md font-bold text-xs cursor-pointer disabled:opacity-60 font-sans">
                                {deleting[r.id] ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog isOpen={!!confirm} title="Delete Resource" message="Permanently delete this resource?"
                confirmLabel="Delete" onConfirm={confirmDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── Profile Page ──────────────────────────────────────────────────────────────
const Profile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState('');

    useEffect(() => { document.title = 'My Profile | ARC'; }, []);
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
    const canUpload = ['university', 'product_company'].includes(user.role);
    const roleColor = ROLE_COLORS[user.role] || '#64748B';

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#002244] to-[#003366] py-12 px-8">
                <div className="max-w-3xl mx-auto flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center shrink-0">
                        <User size={32} color="white" />
                    </div>
                    <div>
                        <h1 className="text-white font-extrabold text-2xl m-0 mb-1">{user.name}</h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: roleColor }}>
                                {ROLE_LABELS[user.role] || user.role}
                            </span>
                            {!loadingProfile && profile && (
                                <span className="text-slate-300 text-xs">Member since {formatDate(profile.created_at || user.created_at)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-8 py-8 pb-20">
                {profileError && (
                    <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-red-600 text-sm items-center">
                        <AlertCircle size={15} /> {profileError}
                        <button onClick={fetchProfile} className="ml-auto flex items-center gap-1 text-red-600 border-none bg-transparent cursor-pointer font-bold text-xs font-sans">
                            <RefreshCw size={11} /> Retry
                        </button>
                    </div>
                )}
                <ProfileInfoSection user={profile || user} showToast={showToast} />
                <ChangePasswordSection showToast={showToast} />
                {canUpload && <MyUploadsSection showToast={showToast} />}
            </div>
        </div>
    );
};

export default Profile;
