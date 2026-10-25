import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Trash2, Search, Users, Pencil, KeyRound } from 'lucide-react';
import Section from '../components/Section.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { getAllUsers, updateUserStatus, deleteUser, getAdminStats } from '../api/admin.js';
import { getAdminChapters } from '../api/adminChapterLeads.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { metaOfUser } from '../config/roles.js';
import { colors, Avatar, Empty, Segmented, StatTile, Table, Td, fmtDate, fieldStyle } from '../components/ui/kit.jsx';
import UserEditModal from '../components/admin/users/UserEditModal.jsx';
import CreateUserModal from '../components/admin/users/CreateUserModal.jsx';
import ResetPasswordModal from '../components/admin/users/ResetPasswordModal.jsx';

// The role filter is one control; it maps to the role (+ tier) the server filters on.
const ROLE_FILTERS = [
    { value: 'all', label: 'Everyone', query: {} },
    { value: 'founding', label: 'Founding', query: { role: 'founding_member' } },
    { value: 'lead', label: 'Leads', query: { role: 'council_member', tier: 'lead' } },
    { value: 'ambassador', label: 'Ambassadors', query: { role: 'council_member', tier: 'ambassador' } },
    { value: 'professional', label: 'Professionals', query: { role: 'professional' } },
];

const STATUS_TONE = {
    approved: { bg: '#D1FAE5', fg: '#065F46' },
    pending:  { bg: '#FEF3C7', fg: '#92400E' },
    rejected: { bg: '#FEE2E2', fg: '#B91C1C' },
};

const PAGE_SIZE = 20;

const RolePill = ({ user }) => {
    const m = metaOfUser(user);
    return (
        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>
            {m.label}
        </span>
    );
};

const IconButton = ({ label, onClick, tone = colors.primary, children }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="kit-btn kit-focus"
        style={{ display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.55rem', borderRadius: 8, border: `1px solid ${tone}33`, background: `${tone}0F`, color: tone, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
    >
        {children}
    </button>
);

const UserManagement = () => {
    const { user: currentUser, isAdmin } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('');
    const [chapterFilter, setChapterFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState(null);
    const [chapters, setChapters] = useState([]);

    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [resetting, setResetting] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    useEffect(() => {
        if (isAdmin && !isAdmin()) navigate('/');
    }, [isAdmin, navigate]);

    const query = useMemo(() => {
        const q = { page, limit: PAGE_SIZE, ...ROLE_FILTERS.find((f) => f.value === roleFilter)?.query };
        if (debouncedSearch.trim()) q.search = debouncedSearch.trim();
        if (statusFilter) q.status = statusFilter;
        if (chapterFilter) q.chapter_id = chapterFilter;
        return q;
    }, [page, roleFilter, debouncedSearch, statusFilter, chapterFilter]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllUsers(query);
            setUsers(res.data?.data || []);
            setTotalPages(res.data?.totalPages || 1);
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setLoading(false);
        }
    }, [query, showToast]);

    const loadStats = useCallback(() => {
        getAdminStats().then((res) => setStats(res.data?.data || null)).catch(() => { /* the figures are a convenience */ });
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);
    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => {
        getAdminChapters().then((res) => setChapters((res.data?.data || []).filter((c) => c.status === 'active'))).catch(() => setChapters([]));
    }, []);

    // Any filter change starts again from the first page.
    const filter = (setter) => (value) => { setter(value); setPage(1); };

    const changeStatus = async (u, status) => {
        try {
            await updateUserStatus(u.id, status);
            setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status } : x)));
            showToast(`${u.name} is now ${status}.`, 'success');
            loadStats();
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
            loadUsers();
        }
    };

    const confirmDelete = async () => {
        setDeleteBusy(true);
        try {
            await deleteUser(deleting.id);
            setUsers((prev) => prev.filter((u) => u.id !== deleting.id));
            showToast('User deleted.', 'success');
            setDeleting(null);
            loadStats();
        } catch (err) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    const refreshAll = () => { loadUsers(); loadStats(); };

    return (
        <>
            <Section style={{ background: 'var(--primary)', color: 'white', padding: '1.75rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                            <Users size={24} color="white" aria-hidden="true" />
                            <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>User Management</h1>
                        </div>
                        <p style={{ color: '#CBD5E1', margin: 0, fontSize: '0.9rem' }}>Edit anyone's details, role and chapter in one place. Every change is recorded.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="kit-btn kit-focus"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: 'var(--primary)', border: 'none', borderRadius: 8, padding: '0.65rem 1.15rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    >
                        <UserPlus size={16} aria-hidden="true" /> Create user
                    </button>
                </div>
            </Section>

            <Section style={{ padding: '1.5rem 0 3rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    <StatTile label="Total users" value={stats?.total_users ?? '-'} tone={colors.primary} />
                    <StatTile label="Approved" value={stats?.approved_users ?? '-'} tone={colors.green} onClick={() => { filter(setStatusFilter)('approved'); }} />
                    <StatTile label="Pending" value={stats?.pending_users ?? '-'} tone={colors.amber} onClick={() => { filter(setStatusFilter)('pending'); }} />
                    <StatTile label="Rejected" value={stats?.rejected_users ?? '-'} tone={colors.red} onClick={() => { filter(setStatusFilter)('rejected'); }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
                        <Search size={15} color={colors.faint} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="search"
                            aria-label="Search by name or email"
                            placeholder="Search by name or email"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="kit-focus"
                            style={{ ...fieldStyle, paddingLeft: '2.2rem', background: 'white' }}
                        />
                    </div>
                    <Segmented ariaLabel="Role" options={ROLE_FILTERS} value={roleFilter} onChange={filter(setRoleFilter)} />
                    <select aria-label="Status" value={statusFilter} onChange={(e) => filter(setStatusFilter)(e.target.value)} style={{ ...fieldStyle, width: 'auto', background: 'white' }}>
                        <option value="">Any status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select aria-label="Chapter" value={chapterFilter} onChange={(e) => filter(setChapterFilter)(e.target.value)} style={{ ...fieldStyle, width: 'auto', maxWidth: 220, background: 'white' }}>
                        <option value="">Any chapter</option>
                        {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                    {loading && users.length === 0 ? (
                        <Empty>Loading users...</Empty>
                    ) : users.length === 0 ? (
                        <Empty>No users match.</Empty>
                    ) : (
                        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
                            <Table minWidth={860} columns={[{ label: 'User' }, { label: 'Role' }, { label: 'Chapter' }, { label: 'Status' }, { label: 'Joined' }, { label: 'Actions', align: 'right' }]}>
                                {users.map((u) => {
                                    const isSelf = u.id === currentUser?.id;
                                    const meta = metaOfUser(u);
                                    const tone = STATUS_TONE[u.status] || STATUS_TONE.pending;
                                    return (
                                        <tr key={u.id} style={{ background: u.status === 'rejected' ? '#FFF7F7' : 'white' }}>
                                            <Td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar name={u.name} size={36} tone={meta.color} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, color: colors.text }}>{u.name}{isSelf && <span style={{ fontWeight: 400, color: colors.muted, fontSize: '0.74rem' }}> (you)</span>}</div>
                                                        <div style={{ fontSize: '0.78rem', color: colors.muted }}>{u.email}</div>
                                                    </div>
                                                </div>
                                            </Td>
                                            <Td><RolePill user={u} /></Td>
                                            <Td muted>{u.role === 'council_member' ? (u.team_chapter_name || <span style={{ color: colors.amber, fontWeight: 700 }}>No chapter</span>) : '-'}</Td>
                                            <Td>
                                                {isSelf ? (
                                                    <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: '0.74rem', fontWeight: 700, background: tone.bg, color: tone.fg, textTransform: 'capitalize' }}>{u.status}</span>
                                                ) : (
                                                    <select
                                                        aria-label={`Status of ${u.name}`}
                                                        value={u.status}
                                                        onChange={(e) => changeStatus(u, e.target.value)}
                                                        className="kit-focus"
                                                        style={{ padding: '0.25rem 0.6rem', borderRadius: 100, border: `1.5px solid ${tone.fg}`, background: tone.bg, color: tone.fg, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="approved">Approved</option>
                                                        <option value="rejected">Rejected</option>
                                                    </select>
                                                )}
                                            </Td>
                                            <Td muted style={{ whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</Td>
                                            <Td align="right">
                                                <span style={{ display: 'inline-flex', gap: 6 }}>
                                                    <IconButton label={`Manage ${u.name}`} onClick={() => setEditing(u)}><Pencil size={14} /></IconButton>
                                                    {!isSelf && <IconButton label={`Reset password for ${u.name}`} tone="#B45309" onClick={() => setResetting(u)}><KeyRound size={14} /></IconButton>}
                                                    {!isSelf && <IconButton label={`Delete ${u.name}`} tone={colors.red} onClick={() => setDeleting(u)}><Trash2 size={14} /></IconButton>}
                                                </span>
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        </div>
                    )}
                </div>
                {users.length > 0 && <div style={{ marginTop: '1rem' }}><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}
            </Section>

            {creating && <CreateUserModal chapters={chapters} onClose={() => setCreating(false)} onCreated={refreshAll} showToast={showToast} />}
            {editing && (
                <UserEditModal
                    user={editing}
                    isSelf={editing.id === currentUser?.id}
                    chapters={chapters}
                    onClose={() => setEditing(null)}
                    onSaved={refreshAll}
                    showToast={showToast}
                />
            )}
            {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} showToast={showToast} />}

            <ConfirmDialog
                isOpen={Boolean(deleting)}
                onClose={() => !deleteBusy && setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deleteBusy}
                title="Delete user"
                message={deleting
                    ? `Permanently delete ${deleting.name}? This cannot be undone. Their login and personal details are erased; any posts, resources, reviews or votes they left behind stay, shown as "Former Member".${deleting.role === 'council_member' ? ' Their chapter seat is freed and the other administrators are told if the chapter is left without a lead.' : ''}`
                    : ''}
                confirmLabel="Delete user"
            />
        </>
    );
};

export default UserManagement;
