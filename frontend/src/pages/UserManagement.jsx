import React, { useState, useEffect } from 'react';
import Section from '../components/Section';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Shield, UserPlus, Trash2, ChevronDown, Ban, CheckCircle,
    AlertCircle, X, Search, Users, Crown, User, Clock
} from 'lucide-react';
import {
    getAllUsers,
    createAdminUser,
    updateUserRole,
    updateUserStatus,
    deleteUser,
} from '../api/admin.js';

const ROLE_STYLES = {
    founding_member: { bg: '#7C3AED', label: 'Founding Member', icon: <Crown size={12} /> },
    executive:       { bg: '#1D4ED8', label: 'Executive',       icon: <Shield size={12} /> },
    professional:    { bg: '#059669', label: 'Professional',    icon: <User size={12} /> },
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

const Modal = ({ title, onClose, children }) => (
    <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, padding: '1rem'
    }} onClick={onClose}>
        <div style={{
            background: 'white', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.2s ease'
        }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{title}</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                </button>
            </div>
            {children}
        </div>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>
);

const inputStyle = {
    width: '100%', padding: '0.7rem 0.9rem',
    border: '1px solid var(--border-medium)', borderRadius: '8px',
    fontSize: '0.9rem', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', outline: 'none'
};

const UserManagement = () => {
    const { user: currentUser, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers]                     = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [search, setSearch]                   = useState('');
    const [toast, setToast]                     = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [confirmDelete, setConfirmDelete]     = useState(null);
    const [createForm, setCreateForm]           = useState({ name: '', email: '', password: '', role: 'professional', status: 'approved' });
    const [createLoading, setCreateLoading]     = useState(false);

    useEffect(() => {
        if (isAdmin && !isAdmin()) { navigate('/'); return; }
        fetchUsers();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getAllUsers();
            setUsers(res.data?.data || res.data || []);
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

    const handleStatusToggle = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'approved' ? 'rejected' : 'approved';
        try {
            await updateUserStatus(userId, newStatus);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            showToast(`User ${newStatus === 'rejected' ? 'suspended' : 'approved'} successfully`);
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
            await createAdminUser(createForm);
            showToast(`Account created for ${createForm.name}`);
            setShowCreateModal(false);
            setCreateForm({ name: '', email: '', password: '', role: 'professional', status: 'approved' });
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to create user', 'error');
        } finally {
            setCreateLoading(false);
        }
    };

    const filtered = users.filter(u =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.role || '').toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total:    users.length,
        approved: users.filter(u => u.status === 'approved').length,
        pending:  users.filter(u => u.status === 'pending').length,
        rejected: users.filter(u => u.status === 'rejected').length,
    };

    return (
        <>
            {/* Header */}
            <Section style={{ background: 'var(--primary)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <Users size={28} color="white" />
                            <h1 style={{ color: 'white', margin: 0 }}>User Management</h1>
                        </div>
                        <p style={{ color: '#CBD5E1', margin: 0 }}>Manage roles, access, and accounts across the council.</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'white', color: 'var(--primary)',
                            border: 'none', borderRadius: '8px',
                            padding: '0.7rem 1.25rem', fontWeight: '700',
                            fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)'
                        }}
                    >
                        <UserPlus size={16} /> Create User
                    </button>
                </div>
            </Section>

            <Section>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {[
                        { label: 'Total Users', value: stats.total,    color: '#003366' },
                        { label: 'Approved',    value: stats.approved, color: '#059669' },
                        { label: 'Pending',     value: stats.pending,  color: '#D97706' },
                        { label: 'Rejected',    value: stats.rejected, color: '#DC2626' },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{
                            background: 'white', border: '1px solid var(--border-light)',
                            borderRadius: '12px', padding: '1.25rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{label}</p>
                            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or role..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                    />
                </div>

                {/* Table */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading users...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)' }}>
                                    {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u, i) => {
                                    const isSelf      = u.id === currentUser?.id;
                                    const roleStyle   = ROLE_STYLES[u.role] || ROLE_STYLES.professional;
                                    const statusStyle = STATUS_STYLES[u.status] || STATUS_STYLES.pending;
                                    return (
                                        <tr key={u.id} style={{
                                            borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                                            background: u.status === 'rejected' ? '#FFF7F7' : 'white',
                                        }}>
                                            {/* User */}
                                            <td style={{ padding: '1rem' }}>
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
                                            <td style={{ padding: '1rem' }}>
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
                                                            <option value="executive">Executive</option>
                                                            <option value="founding_member">Founding Member</option>
                                                        </select>
                                                        <ChevronDown size={10} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: roleStyle.bg }} />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                    padding: '0.2rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '600',
                                                    background: statusStyle.bg, color: statusStyle.color
                                                }}>
                                                    {statusStyle.icon} {statusStyle.label}
                                                </span>
                                            </td>

                                            {/* Joined */}
                                            <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '1rem' }}>
                                                {!isSelf && (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleStatusToggle(u.id, u.status)}
                                                            title={u.status === 'approved' ? 'Suspend user' : 'Approve user'}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                                padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                                                                border: `1px solid ${u.status === 'approved' ? '#F59E0B' : '#059669'}`,
                                                                background: u.status === 'approved' ? '#FFFBEB' : '#ECFDF5',
                                                                color: u.status === 'approved' ? '#B45309' : '#059669',
                                                                fontSize: '0.75rem', fontWeight: '600', fontFamily: 'var(--font-sans)'
                                                            }}
                                                        >
                                                            {u.status === 'approved'
                                                                ? <><Ban size={13} /> Suspend</>
                                                                : <><CheckCircle size={13} /> Approve</>}
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
            </Section>

            {/* Create User Modal */}
            {showCreateModal && (
                <Modal title="Create New User" onClose={() => setShowCreateModal(false)}>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { label: 'Full Name', name: 'name', type: 'text', placeholder: 'Jane Smith' },
                            { label: 'Email Address', name: 'email', type: 'email', placeholder: 'jane@example.com' },
                            { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
                        ].map(({ label, name, type, placeholder }) => (
                            <div key={name}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>{label}</label>
                                <input
                                    type={type} name={name} placeholder={placeholder} required
                                    value={createForm[name]}
                                    onChange={e => setCreateForm(prev => ({ ...prev, [name]: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        ))}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>Role</label>
                            <select value={createForm.role} onChange={e => setCreateForm(prev => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                                <option value="professional">Professional</option>
                                <option value="executive">Executive</option>
                                <option value="founding_member">Founding Member</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>Initial Status</label>
                            <select value={createForm.status} onChange={e => setCreateForm(prev => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                                <option value="approved">Approved (immediate access)</option>
                                <option value="pending">Pending (needs approval)</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button type="button" onClick={() => setShowCreateModal(false)} style={{
                                flex: 1, padding: '0.75rem', background: 'none',
                                border: '1px solid var(--border-medium)', borderRadius: '8px',
                                cursor: 'pointer', fontWeight: '600', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)'
                            }}>Cancel</button>
                            <button type="submit" disabled={createLoading} style={{
                                flex: 1, padding: '0.75rem', background: 'var(--primary)',
                                border: 'none', borderRadius: '8px', color: 'white',
                                cursor: 'pointer', fontWeight: '700', fontFamily: 'var(--font-sans)',
                                opacity: createLoading ? 0.7 : 1
                            }}>
                                {createLoading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <Modal title="Delete User" onClose={() => setConfirmDelete(null)}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        Are you sure you want to permanently delete <strong style={{ color: 'var(--text-main)' }}>{confirmDelete.name}</strong>? This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setConfirmDelete(null)} style={{
                            flex: 1, padding: '0.75rem', background: 'none',
                            border: '1px solid var(--border-medium)', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '600', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)'
                        }}>Cancel</button>
                        <button onClick={() => handleDelete(confirmDelete.id)} style={{
                            flex: 1, padding: '0.75rem', background: '#DC2626',
                            border: 'none', borderRadius: '8px', color: 'white',
                            cursor: 'pointer', fontWeight: '700', fontFamily: 'var(--font-sans)'
                        }}>Delete User</button>
                    </div>
                </Modal>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
};

export default UserManagement;