import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, CheckCheck, Filter, RefreshCw,
    Calendar, BookOpen, Award, Users, MessageSquare,
    ShieldCheck, ShieldX, Clock, AlertCircle, Zap,
} from 'lucide-react';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications.js';
import { useAuth } from '../hooks/useAuth.js';

const TYPE_CONFIG = {
    event_published:        { label: 'Event',      color: '#1D4ED8', bg: '#EFF6FF', Icon: Calendar },
    workshop_published:     { label: 'Workshop',   color: '#D97706', bg: '#FFFBEB', Icon: Calendar },
    resource_approved:      { label: 'Resource',   color: '#059669', bg: '#F0FDF4', Icon: BookOpen },
    product_review_added:   { label: 'Review',     color: '#7C3AED', bg: '#F5F3FF', Icon: Zap },
    nominee_added:          { label: 'Nominee',    color: '#0284C7', bg: '#EFF6FF', Icon: Award },
    winner_announced:       { label: 'Winner',     color: '#D97706', bg: '#FFFBEB', Icon: Award },
    account_approved:       { label: 'Account',    color: '#059669', bg: '#F0FDF4', Icon: ShieldCheck },
    account_rejected:       { label: 'Account',    color: '#DC2626', bg: '#FEF2F2', Icon: ShieldX },
    membership_approved:    { label: 'Membership', color: '#059669', bg: '#F0FDF4', Icon: Users },
    membership_rejected:    { label: 'Membership', color: '#DC2626', bg: '#FEF2F2', Icon: Users },
    qna_answered:           { label: 'Q&A',        color: '#003366', bg: '#EFF6FF', Icon: MessageSquare },
    membership_expiring_7:  { label: 'Expiry',     color: '#D97706', bg: '#FFFBEB', Icon: Clock },
    membership_expiring_15: { label: 'Expiry',     color: '#D97706', bg: '#FFFBEB', Icon: Clock },
    membership_expired:     { label: 'Expired',    color: '#DC2626', bg: '#FEF2F2', Icon: AlertCircle },
};

const FILTERS = [
    { key: 'all',        label: 'All' },
    { key: 'unread',     label: 'Unread' },
    { key: 'account',    label: 'Account' },
    { key: 'content',    label: 'Content' },
    { key: 'membership', label: 'Membership' },
    { key: 'qna',        label: 'Q&A' },
];

const CONTENT_TYPES    = new Set(['event_published','workshop_published','resource_approved','product_review_added','nominee_added','winner_announced']);
const ACCOUNT_TYPES    = new Set(['account_approved','account_rejected']);
const MEMBERSHIP_TYPES = new Set(['membership_approved','membership_rejected','membership_expiring_7','membership_expiring_15','membership_expired']);
const QNA_TYPES        = new Set(['qna_answered']);

const passesFilter = (notif, filter) => {
    if (filter === 'all')        return true;
    if (filter === 'unread')     return !notif.is_read;
    if (filter === 'account')    return ACCOUNT_TYPES.has(notif.type);
    if (filter === 'content')    return CONTENT_TYPES.has(notif.type);
    if (filter === 'membership') return MEMBERSHIP_TYPES.has(notif.type);
    if (filter === 'qna')        return QNA_TYPES.has(notif.type);
    return true;
};

const fmtFull = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const fmtRelative = (dateStr) => {
    if (!dateStr) return '';
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const groupByDate = (notifs) => {
    const today = [], thisWeek = [], older = [];
    const now = Date.now();
    notifs.forEach(n => {
        const days = (now - new Date(n.created_at).getTime()) / 86400000;
        if (days < 1)      today.push(n);
        else if (days < 7) thisWeek.push(n);
        else               older.push(n);
    });
    const groups = [];
    if (today.length)    groups.push({ label: 'Today',     items: today });
    if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek });
    if (older.length)    groups.push({ label: 'Older',     items: older });
    return groups;
};

const Notifications = () => {
    const navigate = useNavigate();
    const { setUnreadCount } = useAuth();

    const [notifs,      setNotifs]      = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState('');
    const [filter,      setFilter]      = useState('all');
    const [markingAll,  setMarkingAll]  = useState(false);
    const [page,        setPage]        = useState(1);
    const [hasMore,     setHasMore]     = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const PER_PAGE = 20;

    const fetchNotifs = useCallback(async (pageNum = 1, append = false) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        setError('');
        try {
            const res = await getNotifications({ limit: PER_PAGE, page: pageNum });
            if (res.data?.success) {
                const incoming = res.data.data || [];
                setNotifs(prev => append ? [...prev, ...incoming] : incoming);
                setHasMore(incoming.length === PER_PAGE);
            }
        } catch {
            setError('Failed to load notifications. Please try again.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        document.title = 'Notifications — Risk AI Council';
        fetchNotifs(1);
    }, [fetchNotifs]);

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await markAllAsRead();
            setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
            if (setUnreadCount) setUnreadCount(0);
        } catch { /* silently fail */ }
        finally { setMarkingAll(false); }
    };

    const handleClick = async (notif) => {
        if (!notif.is_read) {
            try {
                await markAsRead(notif.id);
                setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                if (setUnreadCount) setUnreadCount(prev => Math.max(0, prev - 1));
            } catch { /* silently fail */ }
        }
        const url = notif.data?.url;
        if (url) {
            if (url.startsWith('http')) window.location.href = url;
            else navigate(url);
        }
    };

    const handleLoadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchNotifs(next, true);
    };

    const filtered     = notifs.filter(n => passesFilter(n, filter));
    const groups       = groupByDate(filtered);
    const unreadCount  = notifs.filter(n => !n.is_read).length;

    return (
        <>
            <style>{`
                @keyframes np-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                @keyframes np-sk     { 0%,100%{opacity:1} 50%{opacity:0.45} }
                @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

                .np-filter-btn {
                    padding:0.45rem 1rem;
                    border-radius:100px;
                    font-size:0.8rem; font-weight:600;
                    border:1.5px solid #e2e8f0;
                    background:white; color:#64748b;
                    cursor:pointer; white-space:nowrap;
                    transition:all 0.15s;
                    font-family:var(--font-sans);
                }
                .np-filter-btn:hover  { border-color:#003366; color:#003366; background:#f0f5ff; }
                .np-filter-btn.active { background:#003366; color:white; border-color:#003366; }

                .np-notif-card {
                    display:flex; gap:14px; align-items:flex-start;
                    padding:1.1rem 1.5rem;
                    border-bottom:1px solid #f1f5f9;
                    transition:background 0.12s;
                    animation:np-fadein 0.2s ease both;
                }
                .np-notif-card.unread       { background:#fafbff; }
                .np-notif-card:hover        { background:#f5f7ff; cursor:pointer; }
                .np-notif-card.unread:hover { background:#eff2ff; }
                .np-notif-card:last-child   { border-bottom:none; }

                .np-loadmore-btn {
                    display:inline-flex; align-items:center; gap:6px;
                    padding:0.7rem 2rem;
                    border:1.5px solid #e2e8f0; border-radius:8px;
                    background:white; color:#374151;
                    font-size:0.85rem; font-weight:600;
                    cursor:pointer; font-family:var(--font-sans);
                    transition:all 0.15s;
                }
                .np-loadmore-btn:hover    { border-color:#003366; color:#003366; background:#f0f5ff; }
                .np-loadmore-btn:disabled { opacity:0.5; cursor:not-allowed; }
            `}</style>

            <div style={{ minHeight:'100vh', background:'#f8fafc' }}>
                {/* ── Wide container — matches rest of site ── */}
                <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'clamp(2rem,4vw,3rem) clamp(1rem,4vw,3rem)' }}>

                    {/* ── Page Header ── */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
                        <div>
                            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'6px' }}>
                                <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(245,158,11,0.35)', flexShrink:0 }}>
                                    <Bell size={20} color="white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h1 style={{ margin:0, fontSize:'clamp(1.4rem,3vw,1.75rem)', fontWeight:'800', color:'#1e293b', letterSpacing:'-0.02em', lineHeight:1.2 }}>
                                        Notifications
                                    </h1>
                                    <p style={{ margin:0, fontSize:'0.84rem', color:'#94a3b8', marginTop:'2px' }}>
                                        Your complete notification history
                                    </p>
                                </div>
                                {unreadCount > 0 && (
                                    <span style={{ background:'#EF4444', color:'white', fontSize:'0.68rem', fontWeight:'700', padding:'4px 10px', borderRadius:'100px', alignSelf:'flex-start', marginTop:'2px' }}>
                                        {unreadCount} unread
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} disabled={markingAll}
                                    style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0.6rem 1.1rem', background:'white', border:'1.5px solid #e2e8f0', borderRadius:'8px', color:'#003366', fontSize:'0.83rem', fontWeight:'600', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}
                                    onMouseOver={e => { e.currentTarget.style.background='#f0f5ff'; e.currentTarget.style.borderColor='#003366'; }}
                                    onMouseOut={e => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#e2e8f0'; }}>
                                    <CheckCheck size={14} /> Mark all read
                                </button>
                            )}
                            <button onClick={() => fetchNotifs(1)}
                                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0.6rem 1.1rem', background:'white', border:'1.5px solid #e2e8f0', borderRadius:'8px', color:'#64748b', fontSize:'0.83rem', fontWeight:'600', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}
                                onMouseOver={e => e.currentTarget.style.background='#f8fafc'}
                                onMouseOut={e => e.currentTarget.style.background='white'}>
                                <RefreshCw size={13} /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* ── Filter Pills ── */}
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'1.5rem' }}>
                        <Filter size={14} color="#94a3b8" style={{ flexShrink:0 }} />
                        {FILTERS.map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                                className={`np-filter-btn${filter === f.key ? ' active' : ''}`}>
                                {f.label}
                                {f.key === 'unread' && unreadCount > 0 && (
                                    <span style={{ marginLeft:'5px', background: filter === 'unread' ? 'rgba(255,255,255,0.25)' : '#EF4444', color:'white', fontSize:'0.58rem', fontWeight:'700', padding:'1px 5px', borderRadius:'100px' }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ── Two column layout on wide screens ── */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'1.5rem' }}>

                        {/* Main notifications card */}
                        <div style={{ background:'white', borderRadius:'16px', border:'1px solid #e8edf3', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', overflow:'hidden' }}>

                            {/* Loading skeleton */}
                            {loading && (
                                <div style={{ padding:'1.5rem' }}>
                                    {[1,2,3,4,5].map(i => (
                                        <div key={i} style={{ display:'flex', gap:'14px', marginBottom:'1.5rem', alignItems:'flex-start' }}>
                                            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'#f1f5f9', flexShrink:0, animation:'np-sk 1.4s ease-in-out infinite' }} />
                                            <div style={{ flex:1 }}>
                                                <div style={{ height:'14px', width:'40%', background:'#f1f5f9', borderRadius:'4px', marginBottom:'8px', animation:'np-sk 1.4s ease-in-out infinite' }} />
                                                <div style={{ height:'12px', width:'75%', background:'#f1f5f9', borderRadius:'4px', marginBottom:'6px', animation:'np-sk 1.4s ease-in-out infinite' }} />
                                                <div style={{ height:'10px', width:'25%', background:'#f1f5f9', borderRadius:'4px', animation:'np-sk 1.4s ease-in-out infinite' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Error */}
                            {error && !loading && (
                                <div style={{ padding:'4rem', textAlign:'center' }}>
                                    <AlertCircle size={36} color="#EF4444" style={{ margin:'0 auto 0.875rem', display:'block', opacity:0.6 }} />
                                    <p style={{ margin:'0 0 1.25rem', color:'#64748b', fontSize:'0.9rem' }}>{error}</p>
                                    <button onClick={() => fetchNotifs(1)}
                                        style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'#003366', color:'white', border:'none', padding:'0.65rem 1.5rem', borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem', fontFamily:'var(--font-sans)' }}>
                                        <RefreshCw size={14} /> Try Again
                                    </button>
                                </div>
                            )}

                            {/* Empty state */}
                            {!loading && !error && filtered.length === 0 && (
                                <div style={{ padding:'5rem 1rem', textAlign:'center' }}>
                                    <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'#f8fafc', border:'2px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.1rem' }}>
                                        <Bell size={28} color="#cbd5e1" />
                                    </div>
                                    <p style={{ margin:'0 0 6px', fontSize:'1rem', fontWeight:'600', color:'#94a3b8' }}>
                                        {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                                    </p>
                                    <p style={{ margin:0, fontSize:'0.8rem', color:'#cbd5e1' }}>
                                        {filter === 'all' ? "You're all caught up!" : 'Try a different filter'}
                                    </p>
                                </div>
                            )}

                            {/* Grouped notifications */}
                            {!loading && !error && groups.map((group, gi) => (
                                <div key={group.label}>
                                    {/* Group label */}
                                    <div style={{ padding:'0.65rem 1.5rem 0.5rem', background:'#f8fafc', borderBottom:'1px solid #f1f5f9', borderTop: gi > 0 ? '1px solid #f1f5f9' : 'none' }}>
                                        <p style={{ margin:0, fontSize:'0.7rem', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                                            {group.label} <span style={{ fontWeight:'500', opacity:0.7 }}>· {group.items.length}</span>
                                        </p>
                                    </div>

                                    {group.items.map(notif => {
                                        const cfg = TYPE_CONFIG[notif.type] || { label:'Update', color:'#003366', bg:'#EFF6FF', Icon: Bell };
                                        const { Icon } = cfg;
                                        return (
                                            <div key={notif.id}
                                                onClick={() => handleClick(notif)}
                                                className={`np-notif-card${notif.is_read ? '' : ' unread'}`}>

                                                {/* Icon */}
                                                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                    <Icon size={20} color={cfg.color} strokeWidth={2} />
                                                </div>

                                                {/* Content */}
                                                <div style={{ flex:1, minWidth:0 }}>
                                                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'4px' }}>
                                                        <p style={{ margin:0, fontSize:'0.875rem', fontWeight:notif.is_read?'500':'700', color:'#1e293b', lineHeight:'1.4' }}>
                                                            {notif.title}
                                                        </p>
                                                        <span style={{ fontSize:'0.7rem', color:'#94a3b8', whiteSpace:'nowrap', flexShrink:0, marginTop:'2px' }}>
                                                            {fmtRelative(notif.created_at)}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin:'0 0 6px', fontSize:'0.8rem', color:'#64748b', lineHeight:'1.5' }}>
                                                        {notif.body}
                                                    </p>
                                                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                                                        <span style={{ display:'inline-flex', alignItems:'center', background:cfg.bg, color:cfg.color, fontSize:'0.65rem', fontWeight:'700', padding:'2px 8px', borderRadius:'100px', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                                                            {cfg.label}
                                                        </span>
                                                        <span style={{ fontSize:'0.67rem', color:'#cbd5e1' }}>
                                                            {fmtFull(notif.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Unread amber dot */}
                                                {!notif.is_read && (
                                                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#f59e0b', flexShrink:0, marginTop:'8px', boxShadow:'0 0 6px rgba(245,158,11,0.6)' }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Load more */}
                            {!loading && !error && hasMore && filtered.length > 0 && (
                                <div style={{ padding:'1.5rem', textAlign:'center', borderTop:'1px solid #f1f5f9' }}>
                                    <button onClick={handleLoadMore} disabled={loadingMore} className="np-loadmore-btn">
                                        {loadingMore
                                            ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> Loading...</>
                                            : 'Load more notifications'
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Notifications;