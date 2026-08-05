import React, { useState, useEffect } from 'react';
import Section from '../components/Section.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';
import {
    Shield, UserPlus, Trash2, ChevronDown, Ban, CheckCircle,
    AlertCircle, X, Search, Users, Crown, User, Clock, Edit2, Key
} from 'lucide-react';
import {
    getAllUsers,
    createAdminUser,
    updateUserRole,
    updateUserStatus,
    updateUserDetails,
    updateUserBadge,
    resetUserPassword,
    deleteUser,
    getAdminStats,
} from '../api/admin.js';

const ROLE_STYLES = {
    founding_member: { bg: '#7C3AED', label: 'Founding Member', icon: <Crown size={12} /> },
    council_member:  { bg: '#0284C7', label: 'Chapter Lead',    icon: <Shield size={12} /> },
    professional:    { bg: '#059669', label: 'Professional',    icon: <User size={12} /> },
};

const SUB_TYPE_LABELS = {
    working_professional:  'Working Professional',
    final_year_undergrad:  'Final-Year Undergrad',
};

const STATUS_STYLES = {
    approved: { bg: '#D1FAE5', color: '#065F46', icon: <CheckCircle size={11} />, label: 'Approved' },
    pending:  { bg: '#FEF3C7', color: '#92400E', icon: <Clock size={11} />,        label: 'Pending'  },
    rejected: { bg: '#FEE2E2', color: '#DC2626', icon: <Ban size={11} />,          label: 'Rejected' },
};

const Toast = ({ message, type, onClose }) => (
    <div style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 999,
        background: type === 'error' ? '#FEF2F2' : '#F0FDF4',
        border: `1px solid ${type === 'error' ? '#FECACA' : '#BBF7D0'}`,
        color: type === 'error' ? '#DC2626' : '#15803D',
        padding: '0.85rem 1.25rem', borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        fontSize: '0.875rem', fontWeight: '500', maxWidth: '360px',
        animation: 'slideUp 0.25s ease'
    }}>
        {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
        {message}
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={14} />
        </button>
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
);

const Modal = ({ title, onClose, children, maxWidth = '440px' }) => (
    <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, padding: '1.25rem'
    }} onClick={onClose}>
        <div style={{
            background: 'white', borderRadius: '14px',
            width: '100%', maxWidth, maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            animation: 'fadeIn 0.2s ease'
        }} onClick={e => e.stopPropagation()}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--border-light)', flexShrink: 0
            }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>{title}</h3>
                <button onClick={onClose} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}>
                    <X size={18} />
                </button>
            </div>
            <div style={{ padding: '1.4rem', overflowY: 'auto' }}>
                {children}
            </div>
        </div>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>
);

const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem',
    border: '1px solid var(--border-medium)', borderRadius: '8px',
    fontSize: '0.85rem', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', outline: 'none'
};

const labelStyle = { display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' };
const hintStyle  = { margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' };

const FormGrid = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>{children}</div>
);

const modalFooterStyle = {
    display: 'flex', gap: '0.65rem', marginTop: '0.35rem',
};

const btnCancel = {
    flex: 1, padding: '0.65rem', background: 'none',
    border: '1px solid var(--border-medium)', borderRadius: '8px',
    cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)'
};

const btnPrimary = (loading) => ({
    flex: 1, padding: '0.65rem', background: 'var(--primary)',
    border: 'none', borderRadius: '8px', color: 'white',
    cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-sans)',
    opacity: loading ? 0.7 : 1
});

const UserManagement = () => {
    const { user: currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers]                     = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [search, setSearch]                   = useState('');
    const [toast, setToast]                     = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [confirmDelete, setConfirmDelete]     = useState(null);
    const [createForm, setCreateForm]           = useState({
        name: '', email: '', password: '', role: 'professional', status: 'approved',
        organization_name: '', linkedin_url: '', professional_sub_type: 'working_professional',
    });
    const [createLoading, setCreateLoading]     = useState(false);

    const [editUser, setEditUser]               = useState(null);
    const [editForm, setEditForm]                = useState(null);
    const [editLoading, setEditLoading]         = useState(false);

    const [resetPasswordUser, setResetPasswordUser] = useState(null);
    const [newPassword, setNewPassword]         = useState('');
    const [resetLoading, setResetLoading]       = useState(false);

    const [page, setPage]                       = useState(1);
    const [totalPages, setTotalPages]           = useState(1);
    const [stats, setStats]                     = useState({ total_users: 0, approved_users: 0, pending_users: 0, rejected_users: 0 });

    useEffect(() => {
        if (isAdmin && !isAdmin()) { navigate('/'); return; }
        const delayFn = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(delayFn);
    }, [page, search]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getAllUsers({ page, limit: 20, search });
            setUsers(res.data?.data || res.data || []);
            setTotalPages(res.data?.totalPages || 1);

            const statsRes = await getAdminStats();
            setStats(statsRes.data?.data || { total_users: 0, approved_users: 0, pending_users: 0, rejected_users: 0 });
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateUserRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`Role updated to ${ROLE_STYLES[newRole]?.label || newRole}`);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update role', 'error');
        }
    };

    const handleStatusChange = async (userId, newStatus) => {
        try {
            await updateUserStatus(userId, newStatus);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            showToast(`Status updated to ${STATUS_STYLES[newStatus]?.label || newStatus}`);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update status', 'error');
        }
    };

    const handleDelete = async (userId) => {
        try {
            await deleteUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast('User deleted successfully');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete user', 'error');
        } finally {
            setConfirmDelete(null);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const payload = { ...createForm };
            if (payload.role !== 'professional') delete payload.professional_sub_type;
            await createAdminUser(payload);
            showToast(`Account created for ${createForm.name}`);
            setShowCreateModal(false);
            setCreateForm({
                name: '', email: '', password: '', role: 'professional', status: 'approved',
                organization_name: '', linkedin_url: '', professional_sub_type: 'working_professional',
            });
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to create user', 'error');
        } finally {
            setCreateLoading(false);
        }
    };

    const openEdit = (u) => {
        setEditUser(u);
        setEditForm({
            name: u.name || '',
            email: u.email || '',
            bio: u.bio || '',
            organization_name: u.organization_name || '',
            linkedin_url: u.linkedin_url || '',
            professional_sub_type: u.professional_sub_type || 'working_professional',
            profile_badge: u.profile_badge || '',
        });
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        try {
            const { profile_badge, ...details } = editForm;
            if (editUser.role !== 'professional') delete details.professional_sub_type;
            const res = await updateUserDetails(editUser.id, details);
            const updatedFields = res.data?.data || {};
            if ((profile_badge || '') !== (editUser.profile_badge || '')) {
                await updateUserBadge(editUser.id, { profile_badge });
                updatedFields.profile_badge = profile_badge;
            }
            setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...details, ...updatedFields } : u));
            showToast(`${editForm.name}'s details updated`);
            setEditUser(null);
            setEditForm(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update user', 'error');
        } finally {
            setEditLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        try {
            await resetUserPassword(resetPasswordUser.id, newPassword);
            showToast(`Password reset for ${resetPasswordUser.name}`);
            setResetPasswordUser(null);
            setNewPassword('');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reset password', 'error');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <>
            {/* Header */}
            <Section style={{ background: 'var(--primary)', color: 'white', padding: '1.75rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                            <Users size={24} color="white" />
                            <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>User Management</h1>
                        </div>
                        <p style={{ color: '#CBD5E1', margin: 0, fontSize: '0.9rem' }}>Manage roles, access, and accounts across the council.</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'white', color: 'var(--primary)',
                            border: 'none', borderRadius: '8px',
                            padding: '0.65rem 1.15rem', fontWeight: '700',
                            fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--font-sans)'
                        }}
                    >
                        <UserPlus size={16} /> Create User
                    </button>
                </div>
            </Section>

            <Section style={{ padding: '1.5rem 0 3rem' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    {[
                        { label: 'Total Users',    value: stats.total_users,    color: '#003366' },
                        { label: 'Approved',       value: stats.approved_users, color: '#059669' },
                        { label: 'Pending',        value: stats.pending_users,  color: '#D97706' },
                        { label: 'Rejected',       value: stats.rejected_users, color: '#DC2626' },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{
                            background: 'white', border: '1px solid var(--border-light)',
                            borderRadius: '12px', padding: '1.1rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{label}</p>
                            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                    />
                </div>

                {/* Table */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading users...</div>
                    ) : users.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)' }}>
                                    {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => {
                                    const isSelf      = u.id === currentUser?.id;
                                    const roleStyle   = ROLE_STYLES[u.role] || ROLE_STYLES.professional;
                                    const statusStyle = STATUS_STYLES[u.status] || STATUS_STYLES.pending;
                                    return (
                                        <tr key={u.id} style={{
                                            borderBottom: i < users.length - 1 ? '1px solid var(--border-light)' : 'none',
                                            background: u.status === 'rejected' ? '#FFF7F7' : 'white',
                                        }}>
                                            {/* User */}
                                            <td style={{ padding: '0.85rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                                        background: roleStyle.bg,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontSize: '0.85rem', fontWeight: '700'
                                                    }}>
                                                        {(u.name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                            {u.name} {isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '400' }}>(you)</span>}
                                                        </p>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role selector */}
                                            <td style={{ padding: '0.85rem' }}>
                                                {isSelf ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: roleStyle.bg, color: 'white', padding: '0.2rem 0.6rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                                        {roleStyle.icon} {roleStyle.label}
                                                    </span>
                                                ) : (
                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                        <select
                                                            value={u.role}
                                                            onChange={e => handleRoleChange(u.id, e.target.value)}
                                                            style={{
                                                                appearance: 'none', padding: '0.3rem 1.8rem 0.3rem 0.7rem',
                                                                borderRadius: '100px', border: `1.5px solid ${roleStyle.bg}`,
                                                                background: 'white', color: roleStyle.bg,
                                                                fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                                                fontFamily: 'var(--font-sans)'
                                                            }}
                                                        >
                                                            <option value="professional">Professional</option>
                                                            <option value="council_member">Chapter Lead</option>
                                                            <option value="founding_member">Founding Member</option>
                                                        </select>
                                                        <ChevronDown size={10} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: roleStyle.bg }} />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '0.85rem' }}>
                                                {isSelf ? (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                        padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '600',
                                                        background: statusStyle.bg, color: statusStyle.color
                                                    }}>
                                                        {statusStyle.icon} {statusStyle.label}
                                                    </span>
                                                ) : (
                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                        <select
                                                            value={u.status}
                                                            onChange={e => handleStatusChange(u.id, e.target.value)}
                                                            style={{
                                                                appearance: 'none', padding: '0.3rem 1.8rem 0.3rem 0.7rem',
                                                                borderRadius: '100px', border: `1.5px solid ${statusStyle.color}`,
                                                                background: statusStyle.bg, color: statusStyle.color,
                                                                fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                                                                fontFamily: 'var(--font-sans)'
                                                            }}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="approved">Approved</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                        <ChevronDown size={10} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: statusStyle.color }} />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Joined */}
                                            <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '0.85rem' }}>
                                                {!isSelf && (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => openEdit(u)}
                                                            title="Edit user details"
                                                            style={{
                                                                display: 'flex', alignItems: 'center',
                                                                padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                                                                border: '1px solid #BFDBFE', background: '#EFF6FF',
                                                                color: '#1D4ED8', fontFamily: 'var(--font-sans)'
                                                            }}
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setResetPasswordUser(u); setNewPassword(''); }}
                                                            title="Reset password"
                                                            style={{
                                                                display: 'flex', alignItems: 'center',
                                                                padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                                                                border: '1px solid #FDE68A', background: '#FFFBEB',
                                                                color: '#B45309', fontFamily: 'var(--font-sans)'
                                                            }}
                                                        >
                                                            <Key size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(u)}
                                                            title="Delete user"
                                                            style={{
                                                                display: 'flex', alignItems: 'center',
                                                                padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                                                                border: '1px solid #FECACA', background: '#FEF2F2',
                                                                color: '#DC2626', fontFamily: 'var(--font-sans)'
                                                            }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
                {!loading && users.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </Section>

            {/* Create User Modal */}
            {showCreateModal && (
                <Modal title="Create New User" maxWidth="540px" onClose={() => setShowCreateModal(false)}>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <FormGrid>
                            <div>
                                <label style={labelStyle}>Full Name</label>
                                <input type="text" placeholder="Jane Smith" required
                                    value={createForm.name}
                                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input type="email" placeholder="jane@example.com" required
                                    value={createForm.email}
                                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        </FormGrid>
                        <div>
                            <label style={labelStyle}>Password</label>
                            <input
                                type="password" placeholder="••••••••" required
                                value={createForm.password}
                                onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                style={inputStyle}
                            />
                            <p style={hintStyle}>Min 8 characters, 1 uppercase letter, 1 number.</p>
                        </div>
                        <FormGrid>
                            <div>
                                <label style={labelStyle}>Role</label>
                                <select value={createForm.role} onChange={e => setCreateForm(prev => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                                    <option value="professional">Professional</option>
                                    <option value="council_member">Chapter Lead</option>
                                    <option value="founding_member">Founding Member</option>
                                </select>
                            </div>
                            {createForm.role === 'professional' ? (
                                <div>
                                    <label style={labelStyle}>Sub-Type</label>
                                    <select value={createForm.professional_sub_type} onChange={e => setCreateForm(prev => ({ ...prev, professional_sub_type: e.target.value }))} style={inputStyle}>
                                        <option value="working_professional">Working Professional</option>
                                        <option value="final_year_undergrad">Final-Year Undergrad</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label style={labelStyle}>Initial Status</label>
                                    <select value={createForm.status} onChange={e => setCreateForm(prev => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                            )}
                        </FormGrid>
                        <FormGrid>
                            <div>
                                <label style={labelStyle}>Organization</label>
                                <input type="text" placeholder="Acme Corp" required
                                    value={createForm.organization_name}
                                    onChange={e => setCreateForm(prev => ({ ...prev, organization_name: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>LinkedIn URL</label>
                                <input type="text" placeholder="https://linkedin.com/in/jane" required
                                    value={createForm.linkedin_url}
                                    onChange={e => setCreateForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        </FormGrid>
                        {createForm.role === 'professional' && (
                            <div>
                                <label style={labelStyle}>Initial Status</label>
                                <select value={createForm.status} onChange={e => setCreateForm(prev => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                                    <option value="approved">Approved (immediate access)</option>
                                    <option value="pending">Pending (needs approval)</option>
                                </select>
                            </div>
                        )}
                        <div style={modalFooterStyle}>
                            <button type="button" onClick={() => setShowCreateModal(false)} style={btnCancel}>Cancel</button>
                            <button type="submit" disabled={createLoading} style={btnPrimary(createLoading)}>
                                {createLoading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit User Modal */}
            {editUser && editForm && (
                <Modal title={`Edit ${editUser.name}`} maxWidth="540px" onClose={() => { setEditUser(null); setEditForm(null); }}>
                    <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <FormGrid>
                            <div>
                                <label style={labelStyle}>Full Name</label>
                                <input type="text" required
                                    value={editForm.name}
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input type="email" required
                                    value={editForm.email}
                                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        </FormGrid>
                        <div>
                            <label style={labelStyle}>Bio <span style={{ fontWeight: '400', color: 'var(--text-secondary)' }}>(optional)</span></label>
                            <textarea
                                rows={2}
                                value={editForm.bio}
                                onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>
                        <FormGrid>
                            <div>
                                <label style={labelStyle}>Organization</label>
                                <input type="text" required
                                    value={editForm.organization_name}
                                    onChange={e => setEditForm(prev => ({ ...prev, organization_name: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>LinkedIn URL</label>
                                <input type="text" required
                                    value={editForm.linkedin_url}
                                    onChange={e => setEditForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        </FormGrid>
                        <FormGrid>
                            {editUser.role === 'professional' && (
                                <div>
                                    <label style={labelStyle}>Sub-Type</label>
                                    <select value={editForm.professional_sub_type} onChange={e => setEditForm(prev => ({ ...prev, professional_sub_type: e.target.value }))} style={inputStyle}>
                                        <option value="working_professional">{SUB_TYPE_LABELS.working_professional}</option>
                                        <option value="final_year_undergrad">{SUB_TYPE_LABELS.final_year_undergrad}</option>
                                    </select>
                                </div>
                            )}
                            <div style={editUser.role === 'professional' ? undefined : { gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Profile Badge <span style={{ fontWeight: '400', color: 'var(--text-secondary)' }}>(optional)</span></label>
                                <input type="text" placeholder="e.g. Founding Council" maxLength={100}
                                    value={editForm.profile_badge}
                                    onChange={e => setEditForm(prev => ({ ...prev, profile_badge: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        </FormGrid>
                        <div style={modalFooterStyle}>
                            <button type="button" onClick={() => { setEditUser(null); setEditForm(null); }} style={btnCancel}>Cancel</button>
                            <button type="submit" disabled={editLoading} style={btnPrimary(editLoading)}>
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {resetPasswordUser && (
                <Modal title={`Reset Password — ${resetPasswordUser.name}`} maxWidth="420px" onClose={() => { setResetPasswordUser(null); setNewPassword(''); }}>
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                            <label style={labelStyle}>New Password</label>
                            <input
                                type="password" placeholder="••••••••" required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={inputStyle}
                            />
                            <p style={hintStyle}>Min 8 characters, 1 uppercase letter, 1 number. Share this with the user directly — it isn't emailed automatically.</p>
                        </div>
                        <div style={modalFooterStyle}>
                            <button type="button" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} style={btnCancel}>Cancel</button>
                            <button type="submit" disabled={resetLoading} style={btnPrimary(resetLoading)}>
                                {resetLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <Modal title="Delete User" maxWidth="420px" onClose={() => setConfirmDelete(null)}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
                        Are you sure you want to permanently delete <strong style={{ color: 'var(--text-main)' }}>{confirmDelete.name}</strong>? This action cannot be undone. Their login and personal info are erased; any posts, resources, reviews, or votes they left behind remain, anonymized as "Former Member".
                    </p>
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                        <button onClick={() => setConfirmDelete(null)} style={btnCancel}>Cancel</button>
                        <button onClick={() => handleDelete(confirmDelete.id)} style={{ ...btnPrimary(false), background: '#DC2626' }}>Delete User</button>
                    </div>
                </Modal>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
};

export default UserManagement;