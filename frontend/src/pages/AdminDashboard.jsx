import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Shield, Users, Check, X, Mail, Building,
    CalendarDays, Clock, AlertCircle, RefreshCw,
    Search, Loader2, UserX, UserCheck, ChevronDown,
    Plus, Trash2, FileText, Edit2, Save, ShieldCheck,
    Image, Video, Eye, Upload, Star, Trophy, Newspaper,
    BookOpen, Mic2, MapPin, Linkedin,
} from 'lucide-react';
import AdminNominees from './AdminNominees.jsx';
import FrameworkManagement from '../components/admin/FrameworkManagement.jsx';
import AutomatedNewsManagement from '../components/AutomatedNewsManagement.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getPendingUsers, getAllUsers, approveUser, rejectUser, getAdminStats, updateUserRole, getMembershipApplications, approveMembershipApplication, rejectMembershipApplication } from '../api/admin.js';
import { getEvents, createEvent, updateEvent, deleteEvent, togglePublishEvent } from '../api/events.js';
import { getWorkshops, createWorkshop, updateWorkshop, deleteWorkshop, togglePublishWorkshop } from '../api/workshops.js';
import { getNews, createNews, deleteNews, togglePublishNews } from '../api/news.js';
import { getTeam, createTeamMember, updateTeamMember, deleteTeamMember } from '../api/team.js';
import { getResources, deleteResource, getPendingResources, approveResource, rejectResource } from '../api/resources.js';
import { getFetchStats } from '../api/autoNews.js';
import { getProducts, getProductById as getProductByIdAPI, createProduct, updateProduct, deleteProduct, addFeatureTest, updateFeatureTest, deleteFeatureTest, uploadProductMedia, deleteProductMedia, uploadEvidence, deleteEvidence, submitUserReview, deleteUserReview } from '../api/productReviews.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { formatDate, formatDateTime } from '../utils/dateFormatter.js';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'pending',           label: 'Member Approvals',    icon: Clock },
    { key: 'pending_resources', label: 'Pending Resources',   icon: FileText },
    { key: 'news',              label: 'Manage News',         icon: FileText },
    { key: 'auto_news',         label: 'Automated News',      icon: Newspaper },
    { key: 'events',            label: 'Manage Events',       icon: CalendarDays },
    { key: 'workshops',         label: 'Exec Workshops',      icon: BookOpen },
    { key: 'team',              label: 'Manage Team',         icon: Users },
    { key: 'resources',         label: 'Manage Resources',    icon: FileText },
    { key: 'product_reviews',   label: 'Product Reviews',     icon: ShieldCheck },
    { key: 'nominations',       label: 'Nominations',         icon: Trophy },
    { key: 'framework',         label: 'Framework Content',   icon: Shield },
];

const ROLE_OPTIONS = ['founding_member', 'council_member', 'professional'];
const ROLE_LABELS  = { founding_member: 'Founding Member', council_member: 'Council Member', professional: 'Professional' };
const ROLE_COLORS  = { founding_member: '#7C3AED', council_member: '#0284C7', professional: '#059669' };
const EVENT_CATEGORIES = ['webinar', 'seminar', 'workshop', 'podcast', 'conference'];
const CATCOLORS = { webinar: '#0284C7', seminar: '#059669', workshop: '#7C3AED', podcast: '#DC2626', conference: '#D97706' };

// ─── Shared Helpers ───────────────────────────────────────────────────────────
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
                <div style={{ height: '11px', background: '#E2E8F0', borderRadius: '4px', width: `${50 + (i * 15) % 40}%`, animation: 'adm-pulse 1.4s ease-in-out infinite' }} />
            </td>
        ))}
    </tr>
);

const EmptyState = ({ icon: Icon, message }) => (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'white', borderRadius: '14px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', margin: '0 auto 1rem' }}>
            <Icon size={22} style={{ opacity: 0.4, color: '#64748B', display: 'block' }} />
        </div>
        <p style={{ fontSize: '0.875rem', margin: 0, color: '#94A3B8', fontWeight: '500' }}>{message}</p>
    </div>
);

const ErrorState = ({ message, onRetry }) => (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#EF4444' }}>
        <AlertCircle size={32} style={{ opacity: 0.7, display: 'block', margin: '0 auto 0.75rem' }} />
        <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>{message}</p>
        {onRetry && (
            <button onClick={onRetry} style={IBTN('white', '#003366')}>
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

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BTN_PRIMARY = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#001f3f', color: 'white', border: '1px solid #003060', padding: '8px 16px', borderRadius: '7px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' };
const BTN_CANCEL  = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '7px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' };
const BTN_WARN    = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '6px 12px', borderRadius: '7px', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' };
const BTN_DANGER  = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '6px 12px', borderRadius: '7px', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' };
const BTN_SUCCESS = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', padding: '6px 12px', borderRadius: '7px', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' };

// SectionHeader — wraps action button below title on narrow screens
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '2px solid #F1F5F9', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '40px', height: '40px', background: '#001f3f', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,31,63,0.18)' }}>
                <Icon size={18} color="#60A5FA" />
            </div>
            <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.01em' }}>{title}</h2>
                {subtitle && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94A3B8', fontWeight: '500' }}>{subtitle}</p>}
            </div>
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
);

const FormField = ({ label, required, error, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
        </label>
        {children}
        {error && <p style={{ color: '#EF4444', fontSize: '0.72rem', margin: 0 }}>{error}</p>}
    </div>
);

// ─── 1. Member Approvals Tab ──────────────────────────────────────────────────
const PendingTab = ({ showToast, onApproved }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [actioning, setActioning] = useState({});
    const [apps, setApps] = useState([]);
    const [appsLoading, setAppsLoading] = useState(true);
    const [appsError, setAppsError] = useState('');
    const [appFilter, setAppFilter] = useState('pending');
    const [appActioning, setAppActioning] = useState({});
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [expanded, setExpanded] = useState(null);

    const [userFilter, setUserFilter] = useState('pending');
    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);

    const [appPage, setAppPage] = useState(1);
    const [appTotalPages, setAppTotalPages] = useState(1);

    const fetch = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getAllUsers({ status: userFilter, limit: 20, page: userPage });
            const payload = res.data?.data;
            setUsers(Array.isArray(payload) ? payload : []);
            setUserTotalPages(res.data?.totalPages || 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [userFilter, userPage]);

    const loadApps = useCallback(async () => {
        setAppsLoading(true); setAppsError('');
        try {
            const res = await getMembershipApplications({ status: appFilter, limit: 20, page: appPage });
            setApps(Array.isArray(res.data?.data) ? res.data.data : []);
            setAppTotalPages(res.data?.totalPages || 1);
        } catch (err) { setAppsError(getErrorMessage(err) || 'Failed to load applications.'); }
        finally { setAppsLoading(false); }
    }, [appFilter, appPage]);

    useEffect(() => { fetch(); }, [fetch]);
    useEffect(() => { loadApps(); }, [loadApps]);

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

    const handleAppApprove = async (id, name) => {
        setAppActioning(prev => ({ ...prev, [id]: 'approving' }));
        try {
            await approveMembershipApplication(id);
            showToast(`${name} approved!`, 'success');
            loadApps();
        } catch (err) { showToast(getErrorMessage(err) || 'Failed to approve.', 'error'); }
        finally { setAppActioning(prev => ({ ...prev, [id]: null })); }
    };

    const handleAppReject = async () => {
        if (!rejectModal) return;
        const { id, name } = rejectModal;
        setAppActioning(prev => ({ ...prev, [id]: 'rejecting' }));
        try {
            await rejectMembershipApplication(id, rejectNotes.trim() || undefined);
            showToast(`${name}'s application rejected.`, 'info');
            setRejectModal(null); setRejectNotes('');
            loadApps();
        } catch (err) { showToast(getErrorMessage(err) || 'Failed to reject.', 'error'); }
        finally { setAppActioning(prev => ({ ...prev, [id]: null })); }
    };

    const ROLE_BADGE   = { council_member: { color: '#0284C7', bg: 'rgba(2,132,199,0.1)' }, executive: { color: '#0284C7', bg: 'rgba(2,132,199,0.1)' }, founding_member: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' } };
    const STATUS_BADGE = { pending: { color: '#92400e', bg: '#fffbeb' }, approved: { color: '#15803d', bg: '#f0fdf4' }, rejected: { color: '#991b1b', bg: '#fef2f2' } };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', background: '#001f3f', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={16} color='#60A5FA' />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1E293B' }}>New Member Registrations</h3>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>{userFilter === 'pending' ? 'Pending account approvals' : `Viewing ${userFilter} accounts`}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {['pending', 'approved', 'rejected'].map(s => (
                        <button key={s} onClick={() => setUserFilter(s)} style={{ padding: '0.4rem 0.85rem', border: `1.5px solid ${userFilter === s ? '#003366' : '#E2E8F0'}`, borderRadius: '7px', background: userFilter === s ? '#003366' : 'white', color: userFilter === s ? 'white' : '#64748B', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{s}</button>
                    ))}
                    <button onClick={fetch} style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #E2E8F0', borderRadius: '7px', background: 'white', cursor: 'pointer', color: '#64748B', fontFamily: 'inherit' }}><RefreshCw size={13} /></button>
                </div>
            </div>

            {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[1,2,3].map(i => <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', height: '88px', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />)}</div>}
            {error && <ErrorState message={error} onRetry={fetch} />}
            {!loading && !error && users.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'white', borderRadius: '14px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', margin: '0 auto 0.75rem' }}>
                        <UserCheck size={20} color="#16A34A" style={{ display: 'block' }} />
                    </div>
                    <p style={{ color: '#15803D', fontWeight: '700', margin: '0 0 3px', fontSize: '0.9rem' }}>All caught up!</p>
                    <p style={{ color: '#86EFAC', margin: 0, fontSize: '0.78rem' }}>No {userFilter} registrations.</p>
                </div>
            )}
            {!loading && users.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {users.map((u) => (
                        <div key={u.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 200px', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: '700', fontSize: '0.975rem', color: '#1E293B' }}>{u.name}</span>
                                    <span style={PILL(ROLE_COLORS[u.role] || '#64748B', `${ROLE_COLORS[u.role] || '#64748B'}18`)}>{ROLE_LABELS[u.role] || u.role}</span>
                                </div>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#64748B' }}><Mail size={12} /> {u.email}</span>
                                {u.organisation && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#64748B' }}><Building size={12} /> {u.organisation}</span>}
                                <span style={{ fontSize: '0.75rem', color: '#94A3B8', background: '#F1F5F9', padding: '2px 10px', borderRadius: '100px', alignSelf: 'flex-start', marginTop: '2px' }}>Registered: {formatDate(u.created_at)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                {u.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleApprove(u.id)} disabled={!!actioning[u.id]} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#16A34A', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '9px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', opacity: actioning[u.id] ? 0.6 : 1 }}>
                                            {actioning[u.id] === 'approve' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Approve
                                        </button>
                                        <button onClick={() => setConfirm({ userId: u.id })} disabled={!!actioning[u.id]} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DC2626', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '9px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', opacity: actioning[u.id] ? 0.6 : 1 }}>
                                            {actioning[u.id] === 'reject' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={14} />} Reject
                                        </button>
                                    </>
                                )}
                                {u.status !== 'pending' && (
                                    <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', background: STATUS_BADGE[u.status]?.bg || '#f1f5f9', color: STATUS_BADGE[u.status]?.color || '#64748b', textTransform: 'uppercase' }}>
                                        {u.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    <Pagination page={userPage} totalPages={userTotalPages} onPageChange={setUserPage} />
                </div>
            )}
            <ConfirmDialog isOpen={!!confirm} title="Reject Application" message="Are you sure you want to reject this application?" confirmLabel="Reject" onConfirm={confirmReject} onClose={() => setConfirm(null)} />

            {/* Membership Upgrade Applications */}
            <div style={{ marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', background: '#001f3f', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Star size={16} color='#60A5FA' />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1E293B' }}>Membership Upgrade Applications</h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>Council Member &amp; Founding Member requests</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {['pending', 'approved', 'rejected'].map(s => (
                            <button key={s} onClick={() => { setAppFilter(s); setAppPage(1); }} style={{ padding: '0.4rem 0.85rem', border: `1.5px solid ${appFilter === s ? '#003366' : '#E2E8F0'}`, borderRadius: '7px', background: appFilter === s ? '#003366' : 'white', color: appFilter === s ? 'white' : '#64748B', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{s}</button>
                        ))}
                        <button onClick={loadApps} style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #E2E8F0', borderRadius: '7px', background: 'white', cursor: 'pointer', color: '#64748B', fontFamily: 'inherit' }}><RefreshCw size={13} /></button>
                    </div>
                </div>

                {appsLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[1,2].map(i => <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', height: '80px', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />)}</div>}
                {appsError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.85rem 1rem', color: '#DC2626', fontSize: '0.875rem' }}>{appsError}</div>}
                {!appsLoading && !appsError && apps.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'white', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                        <Star size={28} style={{ margin: '0 auto 0.6rem', display: 'block', opacity: 0.3, color: '#94A3B8' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', fontWeight: '600' }}>No {appFilter} applications</p>
                    </div>
                )}
                {!appsLoading && apps.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {apps.map(a => {
                            const roleBadge   = ROLE_BADGE[a.requested_role] || {};
                            const statusBadge = STATUS_BADGE[a.status] || {};
                            const isExpanded  = expanded === a.id;
                            const displayName = a.full_name || a.current_name || '—';
                            return (
                                <div key={a.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '180px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1E293B' }}>{displayName}</span>
                                                <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700', background: roleBadge.bg, color: roleBadge.color }}>{a.requested_role === 'founding_member' ? 'Founding Member' : 'Council Member'}</span>
                                                <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700', background: statusBadge.bg, color: statusBadge.color, textTransform: 'capitalize' }}>{a.status}</span>
                                            </div>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                                                <Mail size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{a.email}
                                                {a.organization_name && <>&nbsp;·&nbsp;<Building size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{a.organization_name}</>}
                                                {a.job_title && <>&nbsp;·&nbsp;{a.job_title}</>}
                                            </p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>Applied: {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                                            <button onClick={() => setExpanded(isExpanded ? null : a.id)} style={{ padding: '0.45rem 0.75rem', border: '1.5px solid #E2E8F0', borderRadius: '7px', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#64748B', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Eye size={13} />{isExpanded ? 'Less' : 'Details'}
                                            </button>
                                            {a.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleAppApprove(a.id, displayName)} disabled={!!appActioning[a.id]} style={{ padding: '0.45rem 0.9rem', border: 'none', borderRadius: '7px', background: '#15803d', color: 'white', fontWeight: '700', fontSize: '0.8rem', cursor: appActioning[a.id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: appActioning[a.id] ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {appActioning[a.id] === 'approving' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />} Approve
                                                    </button>
                                                    <button onClick={() => { setRejectModal({ id: a.id, name: displayName }); setRejectNotes(''); }} disabled={!!appActioning[a.id]} style={{ padding: '0.45rem 0.9rem', border: 'none', borderRadius: '7px', background: '#dc2626', color: 'white', fontWeight: '700', fontSize: '0.8rem', cursor: appActioning[a.id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: appActioning[a.id] ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <X size={13} />Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px,100%), 1fr))', gap: '0.75rem 1.5rem' }}>
                                            {[
                                                ['LinkedIn', a.linkedin_url ? <a href={a.linkedin_url} target='_blank' rel='noreferrer' style={{ color: '#0284C7', wordBreak: 'break-all' }}>{a.linkedin_url}</a> : null],
                                                ['Phone', a.phone],
                                                ['Website', a.website_url ? <a href={a.website_url} target='_blank' rel='noreferrer' style={{ color: '#0284C7' }}>{a.website_url}</a> : null],
                                                ['Twitter / X', a.twitter_url ? <a href={a.twitter_url} target='_blank' rel='noreferrer' style={{ color: '#0284C7' }}>{a.twitter_url}</a> : null],
                                                ['Expertise', a.areas_of_expertise],
                                            ].filter(([, v]) => v).map(([label, val]) => (
                                                <div key={label}>
                                                    <p style={{ margin: '0 0 2px', fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                                                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#374151' }}>{val}</p>
                                                </div>
                                            ))}
                                            {a.professional_bio && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Professional Bio</p>
                                                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#374151', lineHeight: '1.6' }}>{a.professional_bio}</p>
                                                </div>
                                            )}
                                            {a.why_founding_member && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: '0.7rem', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why Founding Member</p>
                                                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#374151', lineHeight: '1.6', background: '#faf5ff', borderLeft: '3px solid #7C3AED', padding: '0.5rem 0.75rem', borderRadius: '0 6px 6px 0' }}>{a.why_founding_member}</p>
                                                </div>
                                            )}
                                            {a.admin_notes && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin Notes</p>
                                                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#374151', fontStyle: 'italic' }}>{a.admin_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <Pagination page={appPage} totalPages={appTotalPages} onPageChange={setAppPage} />
                    </div>
                )}
            </div>

            {rejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'white', borderRadius: '14px', padding: 'clamp(1.5rem,4vw,2rem)', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: '800', color: '#1E293B' }}>Reject Application</h3>
                        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#64748B' }}>Reject <strong>{rejectModal.name}</strong>'s membership application? The applicant will receive an email notification.</p>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Reason / Notes (optional)</label>
                        <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} placeholder='Optional reason to include in the notification email…' style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '1.25rem' }} />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '0.75rem', border: '1.5px solid #E2E8F0', borderRadius: '8px', background: 'white', color: '#64748B', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                            <button onClick={handleAppReject} style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Reject Application</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ─── 2. Pending Resources Tab ─────────────────────────────────────────────────
const PendingResourcesTab = ({ showToast, onCountChange }) => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState('');
    const [actioning, setActioning] = useState({});
    const [confirm, setConfirm] = useState(null);

    const fetchPending = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getPendingResources({ page, limit: 20 });
            const payload = res.data?.data;
            const list = Array.isArray(payload) ? payload : [];
            setResources(list);
            setTotalPages(res.data?.totalPages || 1);
            onCountChange?.(res.data?.total || list.length);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchPending(); }, [fetchPending]);

    const handleApprove = async (id) => {
        setActioning((p) => ({ ...p, [id]: 'approve' }));
        try {
            await approveResource(id);
            const next = resources.filter((r) => r.id !== id);
            setResources(next); onCountChange?.(next.length);
            showToast('Resource approved!', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setActioning((p) => ({ ...p, [id]: null })); }
    };

    const confirmReject = async () => {
        const { id } = confirm; setConfirm(null);
        setActioning((p) => ({ ...p, [id]: 'reject' }));
        try {
            await rejectResource(id);
            const next = resources.filter((r) => r.id !== id);
            setResources(next); onCountChange?.(next.length);
            showToast('Resource rejected.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setActioning((p) => ({ ...p, [id]: null })); }
    };

    const TYPE_COLORS = { framework: '#003366', whitepaper: '#7C3AED', product: '#D97706' };

    if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[1,2,3].map((i) => <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', height: '88px', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />)}</div>;
    if (error) return <ErrorState message={error} onRetry={fetchPending} />;
    if (resources.length === 0) return (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'white', borderRadius: '14px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', background: '#F0FDF4', borderRadius: '14px', border: '1px solid #BBF7D0', margin: '0 auto 1rem' }}><Check size={22} color="#16A34A" style={{ display: 'block' }} /></div>
            <p style={{ color: '#15803D', fontWeight: '700', margin: '0 0 4px', fontSize: '0.925rem' }}>All caught up!</p>
            <p style={{ color: '#86EFAC', margin: 0, fontSize: '0.8rem' }}>No pending resource approvals at this time.</p>
        </div>
    );

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {resources.map((r) => (
                    <div key={r.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 200px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.975rem', color: '#1E293B' }}>{r.title}</span>
                                <span style={PILL(TYPE_COLORS[r.type] || '#64748B', `${TYPE_COLORS[r.type] || '#64748B'}18`)}>{r.type}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>{r.uploader_name || 'Unknown'}</span>
                                <span style={PILL(ROLE_COLORS[r.uploader_role] || '#64748B', `${ROLE_COLORS[r.uploader_role] || '#64748B'}18`)}>{ROLE_LABELS[r.uploader_role] || r.uploader_role || 'Member'}</span>
                                <span style={{ fontSize: '0.75rem', color: '#94A3B8', background: '#F1F5F9', padding: '2px 10px', borderRadius: '100px' }}>Submitted: {formatDate(r.created_at)}</span>
                            </div>
                            {r.description && <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, flexWrap: 'wrap' }}>
                            <button onClick={() => handleApprove(r.id)} disabled={!!actioning[r.id]} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#16A34A', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '9px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', opacity: actioning[r.id] ? 0.6 : 1 }}>
                                {actioning[r.id] === 'approve' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Approve
                            </button>
                            <button onClick={() => setConfirm({ id: r.id })} disabled={!!actioning[r.id]} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DC2626', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '9px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', opacity: actioning[r.id] ? 0.6 : 1 }}>
                                {actioning[r.id] === 'reject' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={14} />} Reject
                            </button>
                        </div>
                    </div>
                ))}
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
            <ConfirmDialog isOpen={!!confirm} title="Reject Resource" message="Are you sure you want to reject this resource? It will not be visible to users." confirmLabel="Reject" onConfirm={confirmReject} onClose={() => setConfirm(null)} />
        </>
    );
};

// ─── 3. Manage Events Tab ─────────────────────────────────────────────────────
const EventsTab = ({ showToast }) => {
    const EMPTY_FORM = { title: '', description: '', date: '', time: '', event_category: 'webinar', location: '', link: '', recording_url: '', is_upcoming: true };
    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_FORM);
    const [editFormErrors, setEditFormErrors] = useState({});
    const [updating, setUpdating] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState({});

    const fetchEvents = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getEvents({ page, limit: 10, all: true });
            const payload = res.data?.data;
            setEvents(Array.isArray(payload) ? payload : (payload?.events || []));
            setTotalPages(payload?.totalPages ?? 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const field = (key) => (e) => { const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setForm((p) => ({ ...p, [key]: val })); if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: null })); };
    const editField = (key) => (e) => { const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setEditForm((p) => ({ ...p, [key]: val })); if (editFormErrors[key]) setEditFormErrors((p) => ({ ...p, [key]: null })); };
    const validate = () => { const e = {}; if (!form.title.trim()) e.title = 'Title required'; if (!form.date) e.date = 'Date required'; if (!form.event_category) e.event_category = 'Category required'; return e; };
    const validateEdit = () => { const e = {}; if (!editForm.title.trim()) e.title = 'Title required'; if (!editForm.date) e.date = 'Date required'; if (!editForm.event_category) e.event_category = 'Category required'; return e; };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate(); if (Object.keys(errs).length) { setFormErrors(errs); return; }
        setSubmitting(true);
        try {
            const payload = { title: form.title, description: form.description, date: form.time ? `${form.date}T${form.time}:00` : `${form.date}T00:00:00`, event_category: form.event_category, location: form.location, link: form.link, recording_url: form.recording_url, is_upcoming: form.is_upcoming };
            await createEvent(payload); showToast('Event created!', 'success'); setForm(EMPTY_FORM); setShowForm(false); setPage(1); fetchEvents();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmitting(false); }
    };

    const startEdit = (event) => {
        const eventDate = event.date || event.start_date;
        const dateObj = new Date(eventDate);
        const date = dateObj.toISOString().split('T')[0];
        const time = dateObj.toTimeString().split(':').slice(0, 2).join(':');
        setEditingEvent(event.id);
        setEditForm({ title: event.title || '', description: event.description || '', date, time, event_category: event.event_category || 'webinar', location: event.location || '', link: event.link || '', recording_url: event.recording_url || '', is_upcoming: event.is_upcoming ?? true });
        setEditFormErrors({});
    };

    const cancelEdit = () => { setEditingEvent(null); setEditForm(EMPTY_FORM); setEditFormErrors({}); };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const errs = validateEdit(); if (Object.keys(errs).length) { setEditFormErrors(errs); return; }
        setUpdating(true);
        try {
            const payload = { title: editForm.title, description: editForm.description, date: editForm.time ? `${editForm.date}T${editForm.time}:00` : `${editForm.date}T00:00:00`, event_category: editForm.event_category, location: editForm.location, link: editForm.link, recording_url: editForm.recording_url, is_upcoming: editForm.is_upcoming };
            await updateEvent(editingEvent, payload); showToast('Event updated!', 'success'); cancelEdit(); fetchEvents();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setUpdating(false); }
    };

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null);
        setDeleting((p) => ({ ...p, [id]: true }));
        try { await deleteEvent(id); setEvents((prev) => prev.filter((ev) => ev.id !== id)); showToast('Event deleted.', 'success'); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    // Responsive 2-col grid that collapses on small screens
    const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: '14px' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader icon={CalendarDays} title="Manage Events" subtitle={`${events.length} event${events.length !== 1 ? 's' : ''}`}
                action={<button onClick={() => setShowForm((p) => !p)} style={showForm ? BTN_CANCEL : BTN_PRIMARY}>{showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Create Event</>}</button>} />

            {showForm && (
                <form onSubmit={handleSubmit} className="adm-form-panel">
                    <p style={{ margin: '0 0 1.1rem', fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>New Event</p>
                    <div style={formGrid}>
                        <FormField label="Title" required error={formErrors.title}><input value={form.title} onChange={field('title')} className={`adm-input${formErrors.title ? ' adm-input-err' : ''}`} placeholder="e.g. AI Governance Webinar" /></FormField>
                        <FormField label="Category" required error={formErrors.event_category}><select value={form.event_category} onChange={field('event_category')} className="adm-input">{EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></FormField>
                        <FormField label="Date" required error={formErrors.date}><input type="date" value={form.date} onChange={field('date')} className={`adm-input${formErrors.date ? ' adm-input-err' : ''}`} /></FormField>
                        <FormField label="Time"><input type="time" value={form.time} onChange={field('time')} className="adm-input" /></FormField>
                        <FormField label="Location / Platform"><input value={form.location} onChange={field('location')} className="adm-input" placeholder="Zoom / London / Online" /></FormField>
                        <FormField label="Registration Link"><input type="url" value={form.link} onChange={field('link')} className="adm-input" placeholder="https://..." /></FormField>
                        <FormField label="Recording URL"><input type="url" value={form.recording_url} onChange={field('recording_url')} className="adm-input" placeholder="https://... (post-event)" /></FormField>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                            <input type="checkbox" id="is_upcoming" checked={form.is_upcoming} onChange={field('is_upcoming')} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#003366' }} />
                            <label htmlFor="is_upcoming" style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '500', cursor: 'pointer' }}>Mark as upcoming</label>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormField label="Description"><textarea value={form.description} onChange={field('description')} rows={3} className="adm-input" style={{ resize: 'vertical' }} placeholder="Event description..." /></FormField>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => { setShowForm(false); setFormErrors({}); setForm(EMPTY_FORM); }} style={BTN_CANCEL}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY, opacity: submitting ? 0.6 : 1 }}>
                            {submitting ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Save size={14} /> Create Event</>}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[1,2,3].map((i) => <div key={i} style={{ height: '96px', background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />)}</div>
            ) : error ? <ErrorState message={error} onRetry={fetchEvents} /> : events.length === 0 ? <EmptyState icon={CalendarDays} message="No events yet. Create one above." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {events.map((ev) => (
                        <div key={ev.id}>
                            {editingEvent === ev.id ? (
                                <form onSubmit={handleUpdate} className="adm-form-panel" style={{ border: '2px solid #F59E0B' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.1rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>Editing: {ev.title}</p>
                                    </div>
                                    <div style={formGrid}>
                                        <FormField label="Title" required error={editFormErrors.title}><input value={editForm.title} onChange={editField('title')} className={`adm-input${editFormErrors.title ? ' adm-input-err' : ''}`} /></FormField>
                                        <FormField label="Category" required error={editFormErrors.event_category}><select value={editForm.event_category} onChange={editField('event_category')} className="adm-input">{EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></FormField>
                                        <FormField label="Date" required error={editFormErrors.date}><input type="date" value={editForm.date} onChange={editField('date')} className={`adm-input${editFormErrors.date ? ' adm-input-err' : ''}`} /></FormField>
                                        <FormField label="Time"><input type="time" value={editForm.time} onChange={editField('time')} className="adm-input" /></FormField>
                                        <FormField label="Location / Platform"><input value={editForm.location} onChange={editField('location')} className="adm-input" /></FormField>
                                        <FormField label="Registration Link"><input type="url" value={editForm.link} onChange={editField('link')} className="adm-input" /></FormField>
                                        <FormField label="Recording URL"><input type="url" value={editForm.recording_url} onChange={editField('recording_url')} className="adm-input" /></FormField>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                                            <input type="checkbox" id={`edit_upcoming_${ev.id}`} checked={editForm.is_upcoming} onChange={editField('is_upcoming')} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#003366' }} />
                                            <label htmlFor={`edit_upcoming_${ev.id}`} style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '500', cursor: 'pointer' }}>Mark as upcoming</label>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <FormField label="Description"><textarea value={editForm.description} onChange={editField('description')} rows={3} className="adm-input" style={{ resize: 'vertical' }} /></FormField>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                                        <button type="button" onClick={cancelEdit} style={BTN_CANCEL}>Cancel</button>
                                        <button type="submit" disabled={updating} style={{ ...BTN_WARN, opacity: updating ? 0.6 : 1, padding: '8px 16px', fontSize: '0.8rem' }}>
                                            {updating ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : <><Save size={13} /> Update Event</>}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="adm-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1E293B' }}>{ev.title}</h3>
                                                <span style={PILL(CATCOLORS[ev.event_category] || '#1D4ED8', `${CATCOLORS[ev.event_category] || '#1D4ED8'}18`)}>{ev.event_category}</span>
                                                <span style={PILL(ev.is_published ? '#15803D' : '#64748B', ev.is_published ? '#F0FDF4' : '#F1F5F9')}>{ev.is_published ? '● Published' : '○ Draft'}</span>
                                            </div>
                                            {ev.description && <p style={{ margin: '0 0 10px', color: '#64748B', fontSize: '0.82rem', lineHeight: '1.5' }}>{ev.description}</p>}
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: '#94A3B8', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarDays size={12} />{formatDate(ev.date || ev.start_date)}</span>
                                                {ev.location && <span>📍 {ev.location}</span>}
                                                <span>{ev.is_upcoming ? '🔜 Upcoming' : '✅ Completed'}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                                            <button onClick={() => startEdit(ev)} style={BTN_WARN}><Edit2 size={12} /> Edit</button>
                                            <button onClick={async () => {
                                                try { const r = await togglePublishEvent(ev.id); setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_published: r.data?.data?.is_published ?? !ev.is_published } : e)); showToast(r.data?.data?.is_published ? 'Event published!' : 'Event unpublished.', 'success'); }
                                                catch (err) { showToast(getErrorMessage(err), 'error'); }
                                            }} style={ev.is_published ? BTN_WARN : BTN_SUCCESS}>{ev.is_published ? 'Unpublish' : 'Publish'}</button>
                                            <button onClick={() => setConfirm({ id: ev.id, name: ev.title })} disabled={deleting[ev.id]} style={{ ...BTN_DANGER, opacity: deleting[ev.id] ? 0.5 : 1 }}>
                                                {deleting[ev.id] ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <ConfirmDialog isOpen={!!confirm} title="Delete Event" message={`Delete "${confirm?.name}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── 4. Manage News Tab ───────────────────────────────────────────────────────
const NewsTab = ({ showToast }) => {
    const EMPTY_FORM = { title: '', summary: '', content: '', source_url: '', image_url: '', category: 'industry_news', is_published: true };
    const [articles, setArticles] = useState([]);
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
    const [toggling, setToggling] = useState({});

    const fetchNews = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getNews({ page, limit: 10, all: true });
            const payload = res.data?.data;
            setArticles(Array.isArray(payload) ? payload : (payload?.news || []));
            setTotalPages(payload?.totalPages ?? 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchNews(); }, [fetchNews]);

    const field = (key) => (e) => { const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setForm((p) => ({ ...p, [key]: val })); if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: null })); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { setFormErrors({ title: 'Title required' }); return; }
        setSubmitting(true);
        try { await createNews(form); showToast('Article created!', 'success'); setForm(EMPTY_FORM); setShowForm(false); setPage(1); fetchNews(); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null); setDeleting((p) => ({ ...p, [id]: true }));
        try { await deleteNews(id); setArticles((prev) => prev.filter((a) => a.id !== id)); showToast('Article deleted.', 'success'); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    const handleTogglePublish = async (article) => {
        setToggling((p) => ({ ...p, [article.id]: true }));
        try {
            const res = await togglePublishNews(article.id);
            const newVal = res.data?.data?.is_published ?? !article.is_published;
            setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, is_published: newVal } : a));
            showToast(newVal ? 'Article published!' : 'Article unpublished.', 'success');
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setToggling((p) => ({ ...p, [article.id]: false })); }
    };

    const NEWS_CATS = ['industry_news', 'research', 'regulation', 'event_recap', 'opinion', 'case_study'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader icon={Newspaper} title="Manage News" subtitle={`${articles.length} article${articles.length !== 1 ? 's' : ''}`}
                action={<button onClick={() => setShowForm((p) => !p)} style={showForm ? BTN_CANCEL : BTN_PRIMARY}><Plus size={14} /> {showForm ? 'Cancel' : 'Add Article'}</button>} />

            {showForm && (
                <form onSubmit={handleSubmit} noValidate className="adm-form-panel">
                    <p style={{ margin: '0 0 1rem', fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>New Article</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: '14px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormField label="Title" required error={formErrors.title}><input value={form.title} onChange={field('title')} className={`adm-input${formErrors.title ? ' adm-input-err' : ''}`} placeholder="Article headline" /></FormField>
                        </div>
                        <FormField label="Category"><select value={form.category} onChange={field('category')} className="adm-input">{NEWS_CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}</select></FormField>
                        <FormField label="Image URL"><input value={form.image_url} onChange={field('image_url')} className="adm-input" placeholder="https://…/image.jpg" /></FormField>
                        <div style={{ gridColumn: '1 / -1' }}><FormField label="Source URL"><input type="url" value={form.source_url} onChange={field('source_url')} className="adm-input" placeholder="https://…" /></FormField></div>
                        <div style={{ gridColumn: '1 / -1' }}><FormField label="Summary"><textarea value={form.summary} onChange={field('summary')} rows={2} className="adm-input" style={{ resize: 'vertical' }} placeholder="Brief summary displayed in cards…" /></FormField></div>
                        <div style={{ gridColumn: '1 / -1' }}><FormField label="Full Content"><textarea value={form.content} onChange={field('content')} rows={5} className="adm-input" style={{ resize: 'vertical' }} placeholder="Full article body (markdown supported)…" /></FormField></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" id="is_pub" checked={form.is_published} onChange={field('is_published')} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#003366' }} />
                            <label htmlFor="is_pub" style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '500', cursor: 'pointer' }}>Publish immediately</label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => { setShowForm(false); setFormErrors({}); setForm(EMPTY_FORM); }} style={BTN_CANCEL}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY, opacity: submitting ? 0.6 : 1 }}>
                            {submitting ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> Publish Article</>}
                        </button>
                    </div>
                </form>
            )}

            {loading ? <TableWrapper headers={['Title', 'Category', 'Status', '']}>{[1,2,3].map((i) => <SkeletonRow key={i} cols={4} />)}</TableWrapper>
            : error ? <ErrorState message={error} onRetry={fetchNews} /> : articles.length === 0 ? <EmptyState icon={FileText} message="No articles yet. Add one above." /> : (
                <TableWrapper headers={['Title', 'Category', 'Status', '']}>
                    {articles.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9' }} onMouseOver={(e) => (e.currentTarget.style.background = '#FAFBFC')} onMouseOut={(e) => (e.currentTarget.style.background = 'white')}>
                            <td style={{ padding: '0.9rem 1rem', fontWeight: '600', color: '#1E293B', maxWidth: '260px' }}>
                                <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.875rem' }}>{a.title}</div>
                                {a.image_url && <img src={a.image_url} alt="" style={{ width: '52px', height: '34px', objectFit: 'cover', borderRadius: '5px', marginTop: '5px' }} />}
                            </td>
                            <td style={{ padding: '0.9rem 1rem' }}><span style={PILL('#7C3AED', '#FAF5FF')}>{(a.category || '').replace(/_/g, ' ')}</span></td>
                            <td style={{ padding: '0.9rem 1rem' }}><span style={PILL(a.is_published ? '#15803D' : '#64748B', a.is_published ? '#F0FDF4' : '#F1F5F9')}>{a.is_published ? '● Live' : '○ Draft'}</span></td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => handleTogglePublish(a)} disabled={toggling[a.id]} style={{ ...IBTN(a.is_published ? '#B45309' : '#15803D', a.is_published ? '#FFFBEB' : '#F0FDF4'), opacity: toggling[a.id] ? 0.5 : 1 }}>
                                        {toggling[a.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : null}{a.is_published ? 'Unpublish' : 'Publish'}
                                    </button>
                                    <button onClick={() => setConfirm({ id: a.id, name: a.title })} disabled={deleting[a.id]} style={{ ...IBTN('#DC2626', '#FEF2F2'), opacity: deleting[a.id] ? 0.5 : 1 }}>
                                        {deleting[a.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </TableWrapper>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <ConfirmDialog isOpen={!!confirm} title="Delete Article" message={`Delete "${confirm?.name}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── 5. Manage Team Tab ───────────────────────────────────────────────────────
const TeamTab = ({ showToast }) => {
    const EMPTY_FORM = { name: '', role: '', bio: '', linkedin_url: '', email: '', image: null };
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [viewMemberDetails, setViewMemberDetails] = useState(null);
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

    const field = (key) => (e) => { setForm((p) => ({ ...p, [key]: e.target.value })); if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: null })); };
    const validate = () => { const e = {}; if (!form.name.trim()) e.name = 'Name required'; if (!form.role.trim()) e.role = 'Role required'; return e; };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate(); if (Object.keys(errs).length) { setFormErrors(errs); return; }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name); fd.append('role', form.role); fd.append('bio', form.bio || '');
            if (form.linkedin_url) fd.append('linkedin_url', form.linkedin_url);
            else fd.append('linkedin_url', '');
            if (form.email) fd.append('email', form.email);
            else fd.append('email', '');
            if (form.image) fd.append('photo', form.image);
            if (editingId) {
                await updateTeamMember(editingId, fd);
                showToast('Team member updated!', 'success');
            } else {
                await createTeamMember(fd);
                showToast('Team member added!', 'success');
            }
            setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); fetchTeam();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null); setDeleting((p) => ({ ...p, [id]: true }));
        try { await deleteTeamMember(id); setMembers((prev) => prev.filter((m) => m.id !== id)); showToast('Team member removed.', 'success'); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader icon={Users} title="Manage Team" subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`}
                action={<button onClick={() => { setShowForm((p) => !p); if (!showForm) { setForm(EMPTY_FORM); setEditingId(null); } }} style={showForm ? BTN_CANCEL : BTN_PRIMARY}><Plus size={14} /> {showForm ? 'Cancel' : 'Add Member'}</button>} />

            {showForm && (
                <form onSubmit={handleSubmit} noValidate className="adm-form-panel">
                    <p style={{ margin: '0 0 1rem', fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>{editingId ? 'Edit Team Member' : 'New Team Member'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: '14px' }}>
                        <FormField label="Full Name" required error={formErrors.name}><input value={form.name} onChange={field('name')} className={`adm-input${formErrors.name ? ' adm-input-err' : ''}`} placeholder="Dr. Jane Smith" /></FormField>
                        <FormField label="Role / Title" required error={formErrors.role}><input value={form.role} onChange={field('role')} className={`adm-input${formErrors.role ? ' adm-input-err' : ''}`} placeholder="Director of Research" /></FormField>
                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                            <FormField label="Email ID (Optional)"><input type="email" value={form.email || ''} onChange={field('email')} className="adm-input" placeholder="member@example.com" /></FormField>
                            <FormField label="LinkedIn URL (Optional)"><input type="url" value={form.linkedin_url || ''} onChange={field('linkedin_url')} className="adm-input" placeholder="https://linkedin.com/in/..." /></FormField>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}><FormField label="Bio"><textarea value={form.bio || ''} onChange={field('bio')} rows={3} className="adm-input" style={{ resize: 'vertical' }} placeholder="Short biography…" /></FormField></div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormField label="Profile Photo">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F1F5F9'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}>
                                    <Upload size={18} color="#64748B" />
                                    {form.image ? <span style={{ color: '#0F172A', fontWeight: '600' }}>{form.image.name}</span> : <span>Click to browse or drop an image file</span>}
                                    <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))} style={{ display: 'none' }} />
                                </label>
                            </FormField>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); setFormErrors({}); }} style={BTN_CANCEL}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY, opacity: submitting ? 0.6 : 1 }}>
                            {submitting ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> {editingId ? 'Save Changes' : 'Add Member'}</>}
                        </button>
                    </div>
                </form>
            )}

            {loading ? <TableWrapper headers={['Member', 'Role / Title', 'Details', 'Added', '']}>{[1,2,3].map((i) => <SkeletonRow key={i} cols={5} />)}</TableWrapper>
            : error ? <ErrorState message={error} onRetry={fetchTeam} /> : members.length === 0 ? <EmptyState icon={Users} message="No team members yet." /> : (
                <TableWrapper headers={['Member', 'Role / Title', 'Details', 'Added', '']}>
                    {members.map((m) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }} onMouseOver={(e) => (e.currentTarget.style.background = '#FAFBFC')} onMouseOut={(e) => (e.currentTarget.style.background = 'white')}>
                            <td style={{ padding: '0.85rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {m.photo_url ? <img src={m.photo_url} alt={m.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }} /> : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#001f3f', border: '1px solid #003060', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#60A5FA', fontSize: '0.75rem', fontWeight: '800' }}>{m.name?.charAt(0)?.toUpperCase()}</div>}
                                    <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.875rem' }}>{m.name}</span>
                                </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.875rem' }}>{m.role || m.title || '—'}</td>
                            <td style={{ padding: '0.85rem 1rem', maxWidth: '200px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                    {m.linkedin_url && (
                                        <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#0A66C2', textDecoration: 'none', fontWeight: '600' }} title="View LinkedIn Profile">
                                            <Linkedin size={12} /> LinkedIn Profile
                                        </a>
                                    )}
                                    <button onClick={() => setViewMemberDetails(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }} onMouseOver={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                                        <Eye size={12} /> View Full Details
                                    </button>
                                </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: '#94A3B8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(m.created_at)}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => {
                                        setForm({ name: m.name, role: m.role || m.title || '', bio: m.bio || '', linkedin_url: m.linkedin_url || '', email: m.email || '', image: null });
                                        setEditingId(m.id);
                                        setFormErrors({});
                                        setShowForm(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }} style={IBTN('#0284C7', '#F0F9FF')}>
                                        <Edit2 size={11} /> Edit
                                    </button>
                                    <button onClick={() => setConfirm({ id: m.id, name: m.name })} disabled={deleting[m.id]} style={{ ...IBTN('#DC2626', '#FEF2F2'), opacity: deleting[m.id] ? 0.5 : 1 }}>
                                        {deleting[m.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />} Remove
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </TableWrapper>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <ConfirmDialog isOpen={!!confirm} title="Remove Team Member" message={`Remove "${confirm?.name}" from the team?`} confirmLabel="Remove" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
            
            {viewMemberDetails && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setViewMemberDetails(null)}>
                    <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setViewMemberDetails(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
                        
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
                            {viewMemberDetails.photo_url ? <img src={viewMemberDetails.photo_url} alt={viewMemberDetails.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }} /> : <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#001f3f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', fontSize: '1.5rem', fontWeight: '800' }}>{viewMemberDetails.name?.charAt(0)?.toUpperCase()}</div>}
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#0F172A', fontWeight: '800' }}>{viewMemberDetails.name}</h3>
                                <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', fontWeight: '500' }}>{viewMemberDetails.role}</p>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Biography</h4>
                            {viewMemberDetails.bio ? (
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{viewMemberDetails.bio}</p>
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94A3B8', fontStyle: 'italic' }}>No biography provided.</p>
                            )}
                        </div>

                        {viewMemberDetails.linkedin_url && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <a href={viewMemberDetails.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', background: '#F0F9FF', color: '#0369A1', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem', border: '1px solid #BAE6FD', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#E0F2FE'} onMouseOut={e => e.currentTarget.style.background = '#F0F9FF'}>
                                    <Linkedin size={14} /> Open LinkedIn Profile
                                </a>
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', marginTop: '0.5rem' }}>
                            <button onClick={() => setViewMemberDetails(null)} style={{ padding: '0.5rem 1.25rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── 6. Manage Resources Tab ──────────────────────────────────────────────────
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
        const { id } = confirm; setConfirm(null); setDeleting((p) => ({ ...p, [id]: true }));
        try { await deleteResource(id); setResources((prev) => prev.filter((r) => r.id !== id)); showToast('Resource deleted.', 'success'); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    const TYPE_COLORS = { framework: '#003366', whitepaper: '#7C3AED', product: '#D97706' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionHeader icon={FileText} title="Manage Resources" subtitle={`${resources.length} result${resources.length !== 1 ? 's' : ''}`}
                action={
                    <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', borderRadius: '8px', padding: '3px' }}>
                        {['all', 'framework', 'whitepaper', 'product'].map((t) => (
                            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }} style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: typeFilter === t ? 'white' : 'transparent', color: typeFilter === t ? '#003366' : '#64748B', boxShadow: typeFilter === t ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', whiteSpace: 'nowrap' }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                } />

            {loading ? <TableWrapper headers={['Title', 'Type', 'Uploader', 'Date', '']}>{[1,2,3,4].map((i) => <SkeletonRow key={i} cols={5} />)}</TableWrapper>
            : error ? <ErrorState message={error} onRetry={fetchResources} /> : resources.length === 0 ? <EmptyState icon={FileText} message="No resources found." /> : (
                <TableWrapper headers={['Title', 'Type', 'Uploader', 'Date', '']}>
                    {resources.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }} onMouseOver={(e) => (e.currentTarget.style.background = '#FAFBFC')} onMouseOut={(e) => (e.currentTarget.style.background = 'white')}>
                            <td style={{ padding: '0.9rem 1rem', fontWeight: '600', color: '#1E293B', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                            <td style={{ padding: '0.9rem 1rem' }}><span style={PILL(TYPE_COLORS[r.type] || '#64748B', `${TYPE_COLORS[r.type] || '#64748B'}18`)}>{r.type}</span></td>
                            <td style={{ padding: '0.9rem 1rem', color: '#64748B', fontSize: '0.875rem' }}>{r.uploader_name || '—'}</td>
                            <td style={{ padding: '0.9rem 1rem', color: '#94A3B8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                                <button onClick={() => setConfirm({ id: r.id, name: r.title })} disabled={deleting[r.id]} style={{ ...IBTN('#DC2626', '#FEF2F2'), opacity: deleting[r.id] ? 0.5 : 1 }}>
                                    {deleting[r.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
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

// ─── 7. Product Reviews Tab ───────────────────────────────────────────────────
const ProductReviewsTab = ({ showToast }) => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [managingId, setManagingId] = useState(null);
    const [managingProduct, setManagingProduct] = useState(null);
    const [mpLoading, setMpLoading] = useState(false);

    const EMPTY_FORM = { name: '', vendor: '', category: '', portal_url: '', short_description: '', overview: '', version_tested: '', key_features: [] };
    const [form, setForm] = useState(EMPTY_FORM);
    const [editId, setEditId] = useState(null);
    const [kfDraft, setKfDraft] = useState('');

    const EMPTY_FT = { feature_name: '', test_method: '', result: '', score: '', comments: '', display_order: '0' };
    const [ftForm, setFtForm] = useState(EMPTY_FT);
    const [ftSaving, setFtSaving] = useState(false);
    const [ftEditId, setFtEditId] = useState(null);
    const [showFtForm, setShowFtForm] = useState(false);
    const [evidenceFtId, setEvidenceFtId] = useState('');

    const [adminRating, setAdminRating] = useState(0);
    const [adminHover, setAdminHover] = useState(0);
    const [adminComment, setAdminComment] = useState('');
    const [adminReviewSaving, setAdminReviewSaving] = useState(false);
    const [adminOwnReviewId, setAdminOwnReviewId] = useState(null);
    const [adminReviewEditing, setAdminReviewEditing] = useState(false);

    const fetchProducts = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getProducts({ page, limit: 15 });
            const payload = res.data;
            setProducts(Array.isArray(payload?.data) ? payload.data : []);
            setTotalPages(payload?.totalPages ?? 1);
        } catch (err) { setError(getErrorMessage(err)); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const fetchManaging = useCallback(async (id) => {
        setMpLoading(true);
        try {
            const res = await getProductByIdAPI(id);
            const data = res.data?.data ?? null;
            setManagingProduct(data);
            if (user && data?.userReviews) {
                const own = data.userReviews.find(r => r.user_id === user.id);
                if (own) { setAdminRating(own.rating); setAdminComment(own.comment || ''); setAdminOwnReviewId(own.id); setAdminReviewEditing(false); }
                else { setAdminRating(0); setAdminComment(''); setAdminOwnReviewId(null); setAdminReviewEditing(false); }
            }
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setMpLoading(false); }
    }, [showToast]);

    const openManage = (product) => { setManagingId(product.id); fetchManaging(product.id); setShowForm(false); };
    const closeManage = () => { setManagingId(null); setManagingProduct(null); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const payload = { ...form, key_features: Array.isArray(form.key_features) ? form.key_features : [] };
            if (editId) { await updateProduct(editId, payload); showToast('Product updated.', 'success'); }
            else { await createProduct(payload); showToast('Product created.', 'success'); }
            setForm(EMPTY_FORM); setEditId(null); setShowForm(false); setKfDraft(''); fetchProducts();
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        const { id } = confirm; setConfirm(null); setDeleting((p) => ({ ...p, [id]: true }));
        try { await deleteProduct(id); if (managingId === id) closeManage(); setProducts((prev) => prev.filter((p) => p.id !== id)); showToast('Product deleted.', 'success'); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setDeleting((p) => ({ ...p, [id]: false })); }
    };

    const startEdit = (p) => {
        setForm({ name: p.name || '', vendor: p.vendor || '', category: p.category || '', portal_url: p.portal_url || '', short_description: p.short_description || '', overview: p.overview || '', version_tested: p.version_tested || '', key_features: Array.isArray(p.key_features) ? [...p.key_features] : (p.key_features ? p.key_features.split('\n').map(f => f.trim()).filter(Boolean) : []) });
        setKfDraft(''); setEditId(p.id); setShowForm(true); closeManage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddFT = async (e) => {
        e.preventDefault(); setFtSaving(true);
        try {
            if (ftEditId) { await updateFeatureTest(managingId, ftEditId, ftForm); showToast('Feature test updated.', 'success'); }
            else { await addFeatureTest(managingId, ftForm); showToast('Feature test added.', 'success'); }
            setFtForm(EMPTY_FT); setFtEditId(null); fetchManaging(managingId);
        } catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setFtSaving(false); }
    };

    const handleDeleteFT = async (ftId) => {
        try { await deleteFeatureTest(managingId, ftId); showToast('Feature test deleted.', 'success'); fetchManaging(managingId); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
    };

    const handleAdminReview = async (e) => {
        e.preventDefault();
        if (!adminRating) { showToast('Please select a rating.', 'error'); return; }
        setAdminReviewSaving(true);
        try { await submitUserReview(managingId, { rating: adminRating, comment: adminComment }); showToast('Review submitted!', 'success'); setAdminReviewEditing(false); fetchManaging(managingId); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        finally { setAdminReviewSaving(false); }
    };

    const handleDeleteAdminReview = async () => {
        if (!adminOwnReviewId) return;
        try { await deleteUserReview(managingId, adminOwnReviewId); showToast('Review deleted.', 'success'); setAdminRating(0); setAdminComment(''); setAdminOwnReviewId(null); fetchManaging(managingId); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
    };

    const handleUploadMedia = async (e) => {
        const files = Array.from(e.target.files); if (!files.length) return;
        const fd = new FormData(); files.forEach(f => fd.append('files', f));
        try { await uploadProductMedia(managingId, fd); showToast('Media uploaded.', 'success'); fetchManaging(managingId); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        e.target.value = '';
    };

    const handleDeleteMedia = async (mediaId) => {
        try { await deleteProductMedia(managingId, mediaId); showToast('Media deleted.', 'success'); fetchManaging(managingId); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
    };

    const handleUploadEvidence = async (e) => {
        const files = Array.from(e.target.files); if (!files.length) return;
        const fd = new FormData(); files.forEach(f => fd.append('files', f));
        if (evidenceFtId) fd.append('feature_test_id', evidenceFtId);
        try { await uploadEvidence(managingId, fd); showToast('Evidence uploaded.', 'success'); fetchManaging(managingId); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
        e.target.value = '';
    };

    const handleDeleteEvidence = async (evId) => {
        try { await deleteEvidence(managingId, evId); showToast('Evidence deleted.', 'success'); fetchManaging(managingId); }
        catch (err) { showToast(getErrorMessage(err), 'error'); }
    };

    const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
    const labelStyle = { fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>AI Product Reviews</h3>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); closeManage(); }} style={{ ...IBTN('white', '#003366'), padding: '8px 16px', fontSize: '0.82rem' }}>
                    <Plus size={13} /> {showForm && !editId ? 'Cancel' : 'Add Product'}
                </button>
            </div>

            {/* Create/Edit form */}
            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: 'clamp(1.25rem,3vw,1.75rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: '700', color: '#1E293B' }}>{editId ? 'Edit Product' : 'New Product'}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: '1rem' }}>
                        <div><label style={labelStyle}>Product Name *</label><input required style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. AI Governance Suite" /></div>
                        <div><label style={labelStyle}>Vendor *</label><input required style={inputStyle} value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder="e.g. Acme Corp" /></div>
                        <div><label style={labelStyle}>Category</label><input style={inputStyle} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Risk Management" /></div>
                        <div><label style={labelStyle}>Version Tested</label><input style={inputStyle} value={form.version_tested} onChange={e => setForm(p => ({ ...p, version_tested: e.target.value }))} placeholder="e.g. v2.4.1" /></div>
                        <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Portal URL</label><input type="url" style={inputStyle} value={form.portal_url} onChange={e => setForm(p => ({ ...p, portal_url: e.target.value }))} placeholder="https://vendor.com/product" /></div>
                        <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Short Description</label><input style={inputStyle} value={form.short_description} onChange={e => setForm(p => ({ ...p, short_description: e.target.value }))} placeholder="One-liner shown on cards" /></div>
                        <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Overview</label><textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={form.overview} onChange={e => setForm(p => ({ ...p, overview: e.target.value }))} placeholder="Detailed product overview..." /></div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Key Features</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                <input style={{ ...inputStyle, flex: 1, background: 'white' }} placeholder="Type a feature name and press Enter or click Add…" value={kfDraft} onChange={e => setKfDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = kfDraft.trim(); if (v && !form.key_features.includes(v)) setForm(p => ({ ...p, key_features: [...p.key_features, v] })); setKfDraft(''); } }} />
                                <button type="button" onClick={() => { const v = kfDraft.trim(); if (!v || form.key_features.includes(v)) return; setForm(p => ({ ...p, key_features: [...p.key_features, v] })); setKfDraft(''); }} style={{ ...IBTN('white', '#003366'), padding: '0 14px', height: '38px', flexShrink: 0 }}>
                                    <Plus size={13} /> Add
                                </button>
                            </div>
                            {form.key_features.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {form.key_features.map((f, i) => (
                                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#EBF0F7', color: '#003366', fontSize: '0.78rem', fontWeight: '600', padding: '4px 10px', borderRadius: '6px' }}>
                                            {f}<button type="button" onClick={() => setForm(p => ({ ...p, key_features: p.key_features.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#003366', display: 'flex', padding: 0, lineHeight: 1, opacity: 0.55 }}><X size={11} /></button>
                                        </span>
                                    ))}
                                </div>
                            ) : <p style={{ fontSize: '0.75rem', color: '#CBD5E1', margin: '2px 0 0' }}>No features added yet.</p>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setKfDraft(''); }} style={{ ...IBTN('#64748B', '#F1F5F9'), padding: '8px 16px' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...IBTN('white', '#003366'), padding: '8px 20px', opacity: saving ? 0.7 : 1 }}>
                            {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />} {editId ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            )}

            {/* Products table */}
            {loading ? <TableWrapper headers={['Product','Vendor','Category','Avg Rating','Reviews','Added','']}>{[1,2,3,4].map(i => <SkeletonRow key={i} cols={7} />)}</TableWrapper>
            : error ? <ErrorState message={error} onRetry={fetchProducts} /> : products.length === 0 ? <EmptyState icon={ShieldCheck} message="No products yet. Add one above." /> : (
                <TableWrapper headers={['Product','Vendor','Category','Avg Rating','Reviews','Added','']}>
                    {products.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }} onMouseOver={e => (e.currentTarget.style.background = '#FAFBFC')} onMouseOut={e => (e.currentTarget.style.background = 'white')}>
                            <td style={{ padding: '0.9rem 1rem', fontWeight: '600', color: '#1E293B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                            <td style={{ padding: '0.9rem 1rem', color: '#475569', fontSize: '0.875rem' }}>{p.vendor || '—'}</td>
                            <td style={{ padding: '0.9rem 1rem' }}>{p.category ? <span style={PILL('#003366', '#EBF0F7')}>{p.category}</span> : '—'}</td>
                            <td style={{ padding: '0.9rem 1rem', color: '#D97706', fontSize: '0.875rem', fontWeight: '700' }}>{p.avg_rating ? `★ ${parseFloat(p.avg_rating).toFixed(1)}` : '—'}</td>
                            <td style={{ padding: '0.9rem 1rem', color: '#64748B', fontSize: '0.875rem' }}>{p.review_count ?? 0}</td>
                            <td style={{ padding: '0.9rem 1rem', color: '#94A3B8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(p.created_at)}</td>
                            <td style={{ padding: '0.9rem 1rem' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button onClick={() => openManage(p)} style={{ ...IBTN('#0284C7', '#EFF6FF'), padding: '5px 10px' }}><Eye size={11} /> Manage</button>
                                    <button onClick={() => startEdit(p)} style={{ ...IBTN('#D97706', '#FFFBEB'), padding: '5px 10px' }}><Edit2 size={11} /></button>
                                    <button onClick={() => setConfirm({ id: p.id, name: p.name })} disabled={deleting[p.id]} style={{ ...IBTN('#DC2626', '#FEF2F2'), padding: '5px 10px', opacity: deleting[p.id] ? 0.5 : 1 }}>
                                        {deleting[p.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </TableWrapper>
            )}

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

            {/* Manage panel */}
            {managingId && (
                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: 'clamp(1.25rem,3vw,1.75rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1E293B' }}>Managing: {products.find(p => p.id === managingId)?.name}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={() => { startEdit(managingProduct); }} style={{ ...IBTN('#D97706', '#FFFBEB'), padding: '5px 14px', fontSize: '0.82rem' }}><Edit2 size={12} /> Update Product</button>
                            <button onClick={closeManage} style={{ ...IBTN('#64748B', '#F1F5F9'), padding: '5px 12px' }}><X size={12} /> Close</button>
                        </div>
                    </div>

                    {mpLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
                    ) : managingProduct ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                            {/* About Product */}
                            <section style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: 'clamp(1rem,3vw,1.25rem)' }}>
                                <h5 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>About Product</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {[['Vendor', managingProduct.vendor], ['Category', managingProduct.category], ['Version Tested', managingProduct.version_tested]].map(([label, val]) => val ? (
                                        <div key={label}><span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span><p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: '#1E293B', fontWeight: '600' }}>{val}</p></div>
                                    ) : null)}
                                    {managingProduct.portal_url && <div><span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portal URL</span><p style={{ margin: '2px 0 0' }}><a href={managingProduct.portal_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284C7', fontSize: '0.8rem', wordBreak: 'break-all' }}>{managingProduct.portal_url}</a></p></div>}
                                </div>
                                {managingProduct.short_description && <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.7', marginBottom: '0.75rem' }}>{managingProduct.short_description}</p>}
                                {managingProduct.overview && <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: '1.75', whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>{managingProduct.overview}</p>}
                                {Array.isArray(managingProduct.key_features) && managingProduct.key_features.length > 0 && (
                                    <div><span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Features</span>
                                        <ul style={{ margin: '6px 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {managingProduct.key_features.map((f, i) => <li key={i} style={{ fontSize: '0.875rem', color: '#475569' }}>{f}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </section>

                            {/* Feature Tests */}
                            <section>
                                <h5 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Feature Tests</h5>
                                {managingProduct.featureTests?.length > 0 && (
                                    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '480px' }}>
                                            <thead><tr style={{ background: '#F8FAFC' }}>{['Feature','Method','Result','Score','Comments',''].map(h => <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                                            <tbody>
                                                {managingProduct.featureTests.map(ft => (
                                                    <tr key={ft.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                                                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: '600', color: '#1E293B' }}>{ft.feature_name}</td>
                                                        <td style={{ padding: '0.6rem 0.75rem', color: '#64748B' }}>{ft.test_method || '—'}</td>
                                                        <td style={{ padding: '0.6rem 0.75rem', color: '#475569' }}>{ft.result || '—'}</td>
                                                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: '700', color: '#D97706' }}>{ft.score != null ? ft.score : '—'}</td>
                                                        <td style={{ padding: '0.6rem 0.75rem', color: '#64748B', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ft.comments || '—'}</td>
                                                        <td style={{ padding: '0.6rem 0.75rem' }}>
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                <button onClick={() => { setFtForm({ feature_name: ft.feature_name||'', test_method: ft.test_method||'', result: ft.result||'', score: ft.score??'', comments: ft.comments||'', display_order: ft.display_order??'0' }); setFtEditId(ft.id); setShowFtForm(false); }} style={{ ...IBTN('#D97706','#FFFBEB'), padding: '4px 8px' }}><Edit2 size={10} /></button>
                                                                <button onClick={() => handleDeleteFT(ft.id)} style={{ ...IBTN('#DC2626','#FEF2F2'), padding: '4px 8px' }}><Trash2 size={10} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {!showFtForm && !ftEditId && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                        <button type="button" onClick={() => { setShowFtForm(true); setFtForm(EMPTY_FT); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            <Plus size={14} /> Add Test
                                        </button>
                                    </div>
                                )}

                                {(showFtForm || ftEditId) && (
                                    <form onSubmit={async (e) => { await handleAddFT(e); if (!ftEditId) setShowFtForm(false); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px,100%), 1fr))', gap: '0.75rem', background: '#F8FAFC', padding: 'clamp(0.75rem,2vw,1rem)', borderRadius: '8px', marginTop: '0.75rem' }}>
                                        <div>
                                            <label style={labelStyle}>Feature Name *</label>
                                            <select required style={inputStyle} value={ftForm.feature_name} onChange={e => setFtForm(p => ({ ...p, feature_name: e.target.value }))}>
                                                <option value="">— Select a feature —</option>
                                                {Array.isArray(managingProduct?.key_features) && managingProduct.key_features.map(f => <option key={f} value={f}>{f}</option>)}
                                                {ftForm.feature_name && Array.isArray(managingProduct?.key_features) && !managingProduct.key_features.includes(ftForm.feature_name) && <option value={ftForm.feature_name}>{ftForm.feature_name}</option>}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Test Method</label>
                                            <select style={{ ...inputStyle, marginBottom: '6px' }} value={['Live Demo','Hands-on Evaluation','Prompt Testing','Red Teaming','Adversarial Testing','Bias & Fairness Testing','Explainability Review','API / Integration Testing','Data Privacy Audit','Model Output Review','Documentation Review','Third-Party Audit'].includes(ftForm.test_method) ? ftForm.test_method : (ftForm.test_method ? '__custom__' : '')} onChange={e => { if (e.target.value !== '__custom__') setFtForm(p => ({ ...p, test_method: e.target.value })); }}>
                                                <option value="">— Pick a preset —</option>
                                                {['Live Demo','Hands-on Evaluation','Prompt Testing','Red Teaming','Adversarial Testing','Bias & Fairness Testing','Explainability Review','API / Integration Testing','Data Privacy Audit','Model Output Review','Documentation Review','Third-Party Audit'].map(v => <option key={v} value={v}>{v}</option>)}
                                                {ftForm.test_method && !['Live Demo','Hands-on Evaluation','Prompt Testing','Red Teaming','Adversarial Testing','Bias & Fairness Testing','Explainability Review','API / Integration Testing','Data Privacy Audit','Model Output Review','Documentation Review','Third-Party Audit'].includes(ftForm.test_method) && <option value="__custom__">✎ {ftForm.test_method}</option>}
                                            </select>
                                            <input style={{ ...inputStyle, fontSize: '0.8rem' }} placeholder="Or type a custom method…" value={ftForm.test_method} onChange={e => setFtForm(p => ({ ...p, test_method: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Result</label>
                                            <select style={inputStyle} value={ftForm.result} onChange={e => setFtForm(p => ({ ...p, result: e.target.value }))}>
                                                <option value="">— Select result —</option>
                                                {['Pass','Conditional Pass','Partial Pass','Fail','Needs Improvement','Not Applicable'].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div><label style={labelStyle}>Score (0–10)</label><input type="number" min="0" max="10" step="0.1" style={inputStyle} value={ftForm.score} onChange={e => setFtForm(p => ({ ...p, score: e.target.value }))} placeholder="e.g. 8.5" /></div>
                                        <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Comments</label><input style={inputStyle} value={ftForm.comments} onChange={e => setFtForm(p => ({ ...p, comments: e.target.value }))} placeholder="Optional notes..." /></div>
                                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                            <button type="button" onClick={() => { setShowFtForm(false); setFtEditId(null); setFtForm(EMPTY_FT); }} style={{ ...IBTN('#64748B','#F1F5F9'), padding: '0.55rem 1rem', fontSize: '0.85rem' }}>Cancel</button>
                                            <button type="submit" disabled={ftSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#003366', color: 'white', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: ftSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: ftSaving ? 0.7 : 1 }}>
                                                {ftSaving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}{ftEditId ? 'Update Test Result' : 'Submit Test Result'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </section>

                            {/* Media */}
                            <section>
                                <h5 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Media (Images / Videos)</h5>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {managingProduct.media?.map(m => (
                                        <div key={m.id} style={{ position: 'relative', width: '120px' }}>
                                            {m.type === 'image' ? <img src={m.url} alt={m.label||''} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} /> : <div style={{ width: '120px', height: '80px', background: '#1E293B', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={28} color="white" /></div>}
                                            <button onClick={() => handleDeleteMedia(m.id)} style={{ position: 'absolute', top: '4px', right: '4px', background: '#DC2626', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={10} color="white" /></button>
                                        </div>
                                    ))}
                                    {(!managingProduct.media || managingProduct.media.length === 0) && <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>No media uploaded yet.</p>}
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...IBTN('#003366','#EBF0F7'), padding: '8px 14px', cursor: 'pointer' }}>
                                    <Upload size={12} /> Upload Images/Videos
                                    <input type="file" accept="image/*,video/*" multiple hidden onChange={handleUploadMedia} />
                                </label>
                            </section>

                            {/* Evidence */}
                            <section>
                                <h5 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Evidence Files</h5>
                                {(() => {
                                    const grouped = {}; const unassigned = [];
                                    (managingProduct.evidences || []).forEach(ev => {
                                        if (ev.feature_test_id && ev.feature_test_name) { if (!grouped[ev.feature_test_id]) grouped[ev.feature_test_id] = { name: ev.feature_test_name, items: [] }; grouped[ev.feature_test_id].items.push(ev); }
                                        else { unassigned.push(ev); }
                                    });
                                    const groups = Object.values(grouped);
                                    if (unassigned.length) groups.push({ name: 'Unassigned', items: unassigned });
                                    if (!groups.length) return <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>No evidence files uploaded yet.</p>;
                                    return groups.map(g => (
                                        <div key={g.name} style={{ marginBottom: '0.85rem' }}>
                                            <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{g.name}</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                {g.items.map(ev => (
                                                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', gap: '8px', flexWrap: 'wrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                            <FileText size={14} color="#003366" />
                                                            <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.file_name}</span>
                                                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', flexShrink: 0 }}>{ev.file_type}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteEvidence(ev.id)} style={{ ...IBTN('#DC2626','#FEF2F2'), padding: '4px 8px', flexShrink: 0 }}><Trash2 size={10} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                    <select value={evidenceFtId} onChange={e => setEvidenceFtId(e.target.value)} style={{ flex: '1', minWidth: '180px', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', fontFamily: 'inherit', color: evidenceFtId ? '#1E293B' : '#94A3B8', background: 'white' }}>
                                        <option value="">— Select Feature (optional) —</option>
                                        {(managingProduct.featureTests || []).map(ft => <option key={ft.id} value={ft.id}>{ft.feature_name}</option>)}
                                    </select>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...IBTN('#0284C7','#EFF6FF'), padding: '8px 14px', cursor: 'pointer', flexShrink: 0 }}>
                                        <Upload size={12} /> Upload Evidence
                                        <input type="file" accept=".pdf,.xlsx,.xls,.docx,.doc,image/*,video/*" multiple hidden onChange={handleUploadEvidence} />
                                    </label>
                                </div>
                            </section>

                            {/* Admin Review */}
                            <section style={{ background: '#FFF9F0', border: '2px solid #FCD34D', borderRadius: '10px', padding: 'clamp(1rem,3vw,1.25rem)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <h5 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Your Review</h5>
                                    {adminOwnReviewId && !adminReviewEditing && (
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: '99px' }}>Submitted ✓</span>
                                            <button type="button" onClick={() => setAdminReviewEditing(true)} style={{ ...IBTN('#D97706','#FFFBEB'), padding: '3px 10px', fontSize: '0.75rem' }}><Edit2 size={11} /> Edit</button>
                                            <button type="button" onClick={handleDeleteAdminReview} style={{ ...IBTN('#DC2626','#FEF2F2'), padding: '3px 10px', fontSize: '0.75rem' }}><Trash2 size={11} /> Remove</button>
                                        </div>
                                    )}
                                </div>
                                {adminOwnReviewId && !adminReviewEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                                            {[1,2,3,4,5].map(i => <Star key={i} size={24} fill={adminRating >= i ? '#F59E0B' : 'none'} color={adminRating >= i ? '#F59E0B' : '#D1D5DB'} strokeWidth={1.5} />)}
                                            <span style={{ marginLeft: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#92400E', alignSelf: 'center' }}>{adminRating}/5</span>
                                        </div>
                                        {adminComment && <p style={{ margin: 0, fontSize: '0.9rem', color: '#78350F', lineHeight: '1.65', background: 'white', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.65rem 0.85rem', fontStyle: 'italic' }}>"{adminComment}"</p>}
                                    </div>
                                ) : (
                                    <form onSubmit={handleAdminReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#78350F', display: 'block', marginBottom: '6px' }}>Rating *</label>
                                            <span style={{ display: 'inline-flex', gap: '6px' }}>
                                                {[1,2,3,4,5].map(i => <Star key={i} size={28} fill={(adminHover||adminRating) >= i ? '#F59E0B' : 'none'} color={(adminHover||adminRating) >= i ? '#F59E0B' : '#CBD5E1'} strokeWidth={1.5} style={{ cursor: 'pointer', transition: 'transform 0.1s' }} onMouseEnter={() => setAdminHover(i)} onMouseLeave={() => setAdminHover(0)} onClick={(e) => { e.preventDefault(); setAdminRating(i); }} />)}
                                            </span>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#78350F', display: 'block', marginBottom: '4px' }}>Comment (optional)</label>
                                            <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Share your assessment of this product..." style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #FCD34D', borderRadius: '6px', fontSize: '0.875rem', fontFamily: 'inherit', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', background: 'white' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <button type="submit" disabled={adminReviewSaving || !adminRating} style={{ ...IBTN('white','#D97706'), padding: '8px 20px', opacity: (adminReviewSaving || !adminRating) ? 0.6 : 1, fontWeight: '700' }}>
                                                {adminReviewSaving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />} Save Review
                                            </button>
                                            {adminReviewEditing && <button type="button" onClick={() => { setAdminReviewEditing(false); }} style={{ ...IBTN('#64748B','#F1F5F9'), padding: '8px 14px' }}>Cancel</button>}
                                        </div>
                                    </form>
                                )}
                            </section>

                            {/* Submit footer */}
                            <div style={{ borderTop: '2px dashed #CBD5E1', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: '#1E293B' }}>Done adding test data?</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>All changes are saved automatically. Click to mark this assessment complete.</p>
                                </div>
                                <button onClick={() => { closeManage(); showToast('Assessment submitted successfully!', 'success'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#003366', color: 'white', border: 'none', padding: '0.7rem 1.75rem', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em', boxShadow: '0 2px 8px rgba(0,51,102,0.25)', flexShrink: 0 }}>
                                    <ShieldCheck size={16} /> Submit Assessment
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            <ConfirmDialog isOpen={!!confirm} title="Delete Product" message={`Permanently delete "${confirm?.name}" and all its data?`} confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setConfirm(null)} />
        </div>
    );
};

// ─── WorkshopsTab ────────────────────────────────────────────────────────────
const BLANK_WS = { title: '', date: '', location: '', description: '', speaker: '', agenda: '', recording_url: '', is_upcoming: true, is_published: true };

const WorkshopsTab = ({ showToast }) => {
    const [workshops, setWorkshops]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [page, setPage]               = useState(1);
    const [totalPages, setTotalPages]   = useState(1);
    const [showForm, setShowForm]       = useState(false);
    const [editing, setEditing]         = useState(null); // null = create mode, obj = edit mode
    const [form, setForm]               = useState(BLANK_WS);
    const [saving, setSaving]           = useState(false);
    const [formErrors, setFormErrors]   = useState({});
    const [confirm, setConfirm]         = useState(null);
    const [deleting, setDeleting]       = useState({});
    const [toggling, setToggling]       = useState({});

    const LIMIT = 20;

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await getWorkshops({ all: 'true', page, limit: LIMIT });
            const p = res.data;
            setWorkshops(Array.isArray(p.data) ? p.data : []);
            setTotalPages(p.totalPages || 1);
        } catch (err) { setError(getErrorMessage(err) || 'Failed to load workshops.'); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setEditing(null); setForm(BLANK_WS); setFormErrors({}); setShowForm(true); };
    const openEdit   = (ws) => {
        setEditing(ws);
        setForm({
            title:         ws.title         || '',
            date:          ws.date          ? ws.date.slice(0, 16) : '',
            location:      ws.location      || '',
            description:   ws.description   || '',
            speaker:       ws.speaker       || '',
            agenda:        ws.agenda        || '',
            recording_url: ws.recording_url || '',
            is_upcoming:   !!ws.is_upcoming,
            is_published:  !!ws.is_published,
        });
        setFormErrors({});
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditing(null); };

    const validate = () => {
        const errs = {};
        if (!form.title.trim())  errs.title = 'Title is required.';
        if (!form.date)          errs.date  = 'Date is required.';
        if (form.recording_url && !/^https?:\/\//.test(form.recording_url)) errs.recording_url = 'Must be a valid URL.';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form };
            if (editing) { await updateWorkshop(editing.id, payload); showToast('Workshop updated!', 'success'); }
            else         { await createWorkshop(payload);             showToast('Workshop created!', 'success'); }
            closeForm();
            load();
        } catch (err) { showToast(getErrorMessage(err) || 'Save failed.', 'error'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm) return;
        const id = confirm.id;
        setConfirm(null);
        setDeleting(p => ({ ...p, [id]: true }));
        try {
            await deleteWorkshop(id);
            showToast('Workshop deleted.', 'success');
            load();
        } catch (err) { showToast(getErrorMessage(err) || 'Delete failed.', 'error'); }
        finally { setDeleting(p => ({ ...p, [id]: false })); }
    };

    const handleToggle = async (ws) => {
        setToggling(p => ({ ...p, [ws.id]: true }));
        try {
            await togglePublishWorkshop(ws.id);
            showToast(ws.is_published ? 'Unpublished.' : 'Published!', 'success');
            load();
        } catch (err) { showToast(getErrorMessage(err) || 'Toggle failed.', 'error'); }
        finally { setToggling(p => ({ ...p, [ws.id]: false })); }
    };

    const F = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <SectionHeader
                icon={BookOpen}
                title="Executive Workshops"
                subtitle="Council Members create workshops pending admin review. Founding Member publishes."
                action={
                    <button onClick={openCreate} style={{ ...BTN_PRIMARY, gap: '6px' }}>
                        <Plus size={14} /> Add Workshop
                    </button>
                }
            />

            {/* ── Create / Edit Form ── */}
            {showForm && (
                <div className="adm-form-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                        {editing ? '✏️ Edit Workshop' : '➕ New Executive Workshop'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%),1fr))', gap: '0.9rem' }}>
                        <FormField label="Title" required error={formErrors.title}>
                            <input className={`adm-input${formErrors.title ? ' adm-input-err' : ''}`} placeholder="Workshop title" {...F('title')} />
                        </FormField>
                        <FormField label="Date & Time" required error={formErrors.date}>
                            <input type="datetime-local" className={`adm-input${formErrors.date ? ' adm-input-err' : ''}`} {...F('date')} />
                        </FormField>
                        <FormField label="Location / Platform">
                            <input className="adm-input" placeholder="e.g. Virtual — Zoom, London HQ..." {...F('location')} />
                        </FormField>
                        <FormField label="Speaker">
                            <input className="adm-input" placeholder="Speaker name & title" {...F('speaker')} />
                        </FormField>
                    </div>
                    <FormField label="Description">
                        <textarea className="adm-input" rows={3} placeholder="Brief overview of the workshop..." {...F('description')} style={{ resize: 'vertical' }} />
                    </FormField>
                    <FormField label="Agenda">
                        <textarea className="adm-input" rows={3} placeholder="Workshop agenda or key topics..." {...F('agenda')} style={{ resize: 'vertical' }} />
                    </FormField>
                    <FormField label="Recording URL" error={formErrors.recording_url}>
                        <input className={`adm-input${formErrors.recording_url ? ' adm-input-err' : ''}`} placeholder="https://... (leave blank if not yet recorded)" {...F('recording_url')} />
                    </FormField>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>
                            <input type="checkbox" checked={form.is_upcoming}  onChange={e => setForm(p => ({ ...p, is_upcoming:  e.target.checked }))} style={{ accentColor: '#003366', width: '15px', height: '15px' }} />
                            Mark as Upcoming
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>
                            <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} style={{ accentColor: '#003366', width: '15px', height: '15px' }} />
                            Published (visible to Council Members and above)
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                        <button onClick={handleSave} disabled={saving} style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1 }}>
                            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                            {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Workshop')}
                        </button>
                        <button onClick={closeForm} style={BTN_CANCEL}>Cancel</button>
                    </div>
                </div>
            )}

            {/* ── Error ── */}
            {error && <ErrorState message={error} onRetry={load} />}

            {/* ── List ── */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1,2,3].map(i => <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', height: '88px', animation: 'adm-pulse 1.4s ease-in-out infinite' }} />)}
                </div>
            ) : !error && workshops.length === 0 ? (
                <EmptyState icon={BookOpen} message="No workshops yet. Click 'Add Workshop' to create one." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {workshops.map(ws => (
                        <div key={ws.id} className="adm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0F172A' }}>{ws.title}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', background: ws.is_published ? '#DCFCE7' : '#FEF3C7', color: ws.is_published ? '#15803D' : '#B45309' }}>
                                        {ws.is_published ? 'Published' : 'Draft'}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', background: ws.is_upcoming ? '#EFF6FF' : '#F1F5F9', color: ws.is_upcoming ? '#1D4ED8' : '#64748B' }}>
                                        {ws.is_upcoming ? 'Upcoming' : 'Past'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CalendarDays size={11} color="#0284C7" />
                                        {new Date(ws.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {ws.speaker && <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}><Mic2 size={11} color="#7C3AED" /> {ws.speaker}</span>}
                                    {ws.location && <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} color="#0284C7" /> {ws.location}</span>}
                                </div>
                                {ws.description && <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ws.description}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                                <button onClick={() => handleToggle(ws)} disabled={!!toggling[ws.id]} style={{ ...BTN_WARN, opacity: toggling[ws.id] ? 0.6 : 1 }}>
                                    {toggling[ws.id] ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Eye size={12} />}
                                    {ws.is_published ? 'Unpublish' : 'Publish'}
                                </button>
                                <button onClick={() => openEdit(ws)} style={BTN_SUCCESS}><Edit2 size={12} /> Edit</button>
                                <button onClick={() => setConfirm({ id: ws.id, title: ws.title })} style={BTN_DANGER}><Trash2 size={12} /> Delete</button>
                            </div>
                        </div>
                    ))}
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirm}
                title="Delete Workshop"
                message={`Permanently delete "${confirm?.title}"? This cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDelete}
                onClose={() => setConfirm(null)}
            />
        </div>
    );
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const VALID_TABS = TABS.map(t => t.key);
    const defaultTab = user?.role === 'council_member' ? 'pending_resources' : 'pending';
    const urlTab = searchParams.get('tab');
    const [tab, setTab] = useState(urlTab && VALID_TABS.includes(urlTab) ? urlTab : defaultTab);
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingResourcesCount, setPendingResourcesCount] = useState(0);
    const [pendingNewsCount, setPendingNewsCount] = useState(0);

    useEffect(() => { document.title = 'Admin Dashboard | ARC'; }, []);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (user.role !== 'founding_member' && user.role !== 'council_member') { navigate('/'); }
    }, [user, navigate]);

    const refreshPending = useCallback(async () => {
        try {
            const [usersRes, appsRes] = await Promise.allSettled([getPendingUsers(), getMembershipApplications({ status: 'pending' })]);
            const users = usersRes.status === 'fulfilled' ? (usersRes.value.data?.data ?? []) : [];
            const apps  = appsRes.status  === 'fulfilled' ? (appsRes.value.data?.data  ?? []) : [];
            setPendingCount((Array.isArray(users) ? users.length : 0) + (Array.isArray(apps) ? apps.length : 0));
        } catch { setPendingCount(0); }
    }, []);

    const refreshPendingResources = useCallback(async () => {
        try { const res = await getPendingResources(); const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []); setPendingResourcesCount(list.length); }
        catch { setPendingResourcesCount(0); }
    }, []);

    const refreshPendingNews = useCallback(async () => {
        try { const res = await getFetchStats(); const stats = res?.data ?? res ?? {}; setPendingNewsCount(stats.pending ?? 0); }
        catch { setPendingNewsCount(0); }
    }, []);

    useEffect(() => {
        if (user?.role === 'founding_member') { refreshPending(); refreshPendingResources(); refreshPendingNews(); }
        else if (user?.role === 'council_member') { refreshPendingResources(); refreshPendingNews(); }
    }, [user, refreshPending, refreshPendingResources, refreshPendingNews]);

    if (!user || (user.role !== 'founding_member' && user.role !== 'council_member')) return null;

    const isFoundingMember = user.role === 'founding_member';
    const COUNCIL_TABS = ['pending_resources', 'news', 'auto_news', 'events', 'resources'];
    // workshops tab is founding_member only — not in COUNCIL_TABS
    const visibleTabs = isFoundingMember ? TABS : TABS.filter(t => COUNCIL_TABS.includes(t.key));
    const activeTabInfo = TABS.find(t => t.key === tab);
    const ActiveTabIcon = activeTabInfo?.icon;

    return (
        <div style={{ background: '#F1F5F9', minHeight: '100vh' }}>
            {/* ── Header ── */}
            <div style={{ background: '#001f3f', borderBottom: '1px solid #003060' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(1rem,3vw,2rem)' }}>

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.4rem 0 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{ width: '42px', height: '42px', background: '#003366', border: '1px solid #0a4f99', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Shield size={20} color="#60A5FA" />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, color: '#F8FAFC', fontSize: 'clamp(1rem,2vw,1.25rem)', fontWeight: '700', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Admin Dashboard</h1>
                                <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: '0.78rem', fontWeight: '400' }}>Risk AI Council (RAC) - Control Centre</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Logged in as</span>
                            <span style={{ fontSize: '0.78rem', color: '#F1F5F9', fontWeight: '600' }}>{user.name}</span>
                            <span style={{ marginLeft: '4px', background: '#003366', border: '1px solid #0a4f99', borderRadius: '5px', padding: '2px 8px', fontSize: '0.65rem', fontWeight: '700', color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isFoundingMember ? 'Admin' : 'Council Member'}</span>
                        </div>
                    </div>

                    {/* Stats row — horizontal scroll on mobile */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <div style={{ display: 'flex', gap: '0', padding: '1rem 0', minWidth: 'max-content' }}>

                            {isFoundingMember && (
                                <div className="adm-stat-card" onClick={() => setTab('pending')} style={{ flex: '0 0 auto', paddingRight: '2rem', marginRight: '2rem', borderRight: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pendingCount > 0 ? '#EF4444' : '#334155', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.67rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pending Approvals</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: pendingCount > 0 ? '#F87171' : '#475569', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pendingCount > 0 ? pendingCount : '0'}</span>
                                        {pendingCount > 0 && <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#F87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap' }}>Action needed</span>}
                                    </div>
                                </div>
                            )}

                            <div className="adm-stat-card" onClick={() => setTab('pending_resources')} style={{ flex: '0 0 auto', paddingRight: '2rem', marginRight: '2rem', borderRight: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pendingResourcesCount > 0 ? '#F59E0B' : '#334155', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.67rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pending Resources</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: '800', color: pendingResourcesCount > 0 ? '#FBBF24' : '#475569', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pendingResourcesCount > 0 ? pendingResourcesCount : '0'}</span>
                                    {pendingResourcesCount > 0 && <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#FBBF24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap' }}>Needs review</span>}
                                </div>
                            </div>

                            <div className="adm-stat-card" onClick={() => setTab('auto_news')} style={{ flex: '0 0 auto', paddingRight: '2rem', marginRight: '2rem', borderRight: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pendingNewsCount > 0 ? '#8B5CF6' : '#334155', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.67rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pending News</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: '800', color: pendingNewsCount > 0 ? '#A78BFA' : '#475569', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pendingNewsCount}</span>
                                    {pendingNewsCount > 0 && <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#A78BFA', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap' }}>Needs review</span>}
                                </div>
                            </div>

                            <div style={{ flex: '0 0 auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.67rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Active Section</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {ActiveTabIcon && <ActiveTabIcon size={15} color="#60A5FA" />}
                                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#E2E8F0' }}>{activeTabInfo?.label || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tab Navigation — horizontal scroll on mobile ── */}
            <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 40 }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(0.5rem,2vw,2rem)' }}>
                    <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                            {visibleTabs.map(({ key, label, icon: Icon }) => {
                                const active = tab === key;
                                return (
                                    <button key={key} onClick={() => setTab(key)} className="adm-tab-btn"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.8rem 1.1rem', background: active ? '#F8FAFC' : 'none', border: 'none', borderBottom: active ? '2px solid #003366' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: active ? '700' : '500', color: active ? '#003366' : '#64748B', whiteSpace: 'nowrap', transition: 'all 0.15s', outline: 'none', marginBottom: '-1px' }}>
                                        <Icon size={13} style={{ opacity: active ? 1 : 0.5, flexShrink: 0, transition: 'opacity 0.15s' }} />
                                        {label}
                                        {key === 'pending' && pendingCount > 0 && <span style={{ background: '#EF4444', color: 'white', fontSize: '0.6rem', fontWeight: '800', padding: '1px 5px', borderRadius: '100px', lineHeight: '1.6', marginLeft: '1px' }}>{pendingCount}</span>}
                                        {key === 'pending_resources' && pendingResourcesCount > 0 && <span style={{ background: '#F59E0B', color: 'white', fontSize: '0.6rem', fontWeight: '800', padding: '1px 5px', borderRadius: '100px', lineHeight: '1.6', marginLeft: '1px' }}>{pendingResourcesCount}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(1rem,3vw,1.75rem) clamp(1rem,3vw,1.5rem) 5rem' }}>
                {tab === 'pending'           && <PendingTab showToast={showToast} onApproved={refreshPending} />}
                {tab === 'pending_resources' && <PendingResourcesTab showToast={showToast} onCountChange={setPendingResourcesCount} />}
                {tab === 'news'              && <NewsTab showToast={showToast} />}
                {tab === 'auto_news'         && <AutomatedNewsManagement />}
                {tab === 'events'            && <EventsTab showToast={showToast} />}
                {tab === 'team'              && <TeamTab showToast={showToast} />}
                {tab === 'resources'         && <ResourcesTab showToast={showToast} />}
                {tab === 'product_reviews'   && <ProductReviewsTab showToast={showToast} />}
                {tab === 'workshops'         && <WorkshopsTab showToast={showToast} />}
                {tab === 'nominations'       && <AdminNominees embedded />}
                {tab === 'framework'         && <FrameworkManagement />}
            </div>

            <style>{`
                @keyframes adm-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

                .adm-stat-card { transition: opacity 0.15s; }
                .adm-stat-card:hover { opacity: 0.75; }

                /* Tab nav scrollbar hidden */
                .adm-tab-btn:hover { background: #F8FAFC !important; color: #003366 !important; }
                .adm-tab-btn:focus-visible { outline: 2px solid #003366; outline-offset: -2px; }

                /* Form panel */
                .adm-form-panel {
                    background: white;
                    border: 1px solid #E2E8F0;
                    border-radius: 10px;
                    padding: clamp(1rem,3vw,1.5rem);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                }

                /* Inputs */
                .adm-input {
                    width: 100%;
                    padding: 0.55rem 0.75rem;
                    border: 1px solid #CBD5E1;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-family: inherit;
                    outline: none;
                    box-sizing: border-box;
                    transition: border-color 0.15s, box-shadow 0.15s;
                    background: white;
                    color: #1E293B;
                }
                .adm-input:focus { border-color: #003366; box-shadow: 0 0 0 3px rgba(0,51,102,0.08); }
                .adm-input-err { border-color: #EF4444 !important; }
                .adm-input-err:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important; }

                /* Cards */
                .adm-card {
                    background: white;
                    border: 1px solid #E2E8F0;
                    border-radius: 10px;
                    padding: clamp(0.875rem,2vw,1rem) clamp(1rem,2.5vw,1.25rem);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                    transition: box-shadow 0.15s;
                }
                .adm-card:hover { box-shadow: 0 3px 10px rgba(0,51,102,0.08); border-color: #CBD5E1; }

                /* Hide tab scrollbar on WebKit */
                div[style*="overflow-x: auto"]::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default AdminDashboard;