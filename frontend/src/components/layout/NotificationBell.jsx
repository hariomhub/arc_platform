import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, ArrowRight } from 'lucide-react';
import { getNotifications, markAsRead, markAllAsRead } from '../../api/notifications.js';

const TYPE_META = {
    event_published:        { color: '#1D4ED8', bg: '#EFF6FF', label: 'Event' },
    workshop_published:     { color: '#D97706', bg: '#FFFBEB', label: 'Work' },
    resource_approved:      { color: '#059669', bg: '#F0FDF4', label: 'Res' },
    product_review_added:   { color: '#7C3AED', bg: '#F5F3FF', label: 'Rev' },
    nominee_added:          { color: '#0284C7', bg: '#EFF6FF', label: 'Nom' },
    winner_announced:       { color: '#D97706', bg: '#FFFBEB', label: 'Win' },
    account_approved:       { color: '#059669', bg: '#F0FDF4', label: 'Acc' },
    account_rejected:       { color: '#DC2626', bg: '#FEF2F2', label: 'Acc' },
    membership_approved:    { color: '#059669', bg: '#F0FDF4', label: 'Mem' },
    membership_rejected:    { color: '#DC2626', bg: '#FEF2F2', label: 'Mem' },
    qna_answered:           { color: '#003366', bg: '#EFF6FF', label: 'Q&A' },
    membership_expiring_7:  { color: '#D97706', bg: '#FFFBEB', label: 'Exp' },
    membership_expiring_15: { color: '#D97706', bg: '#FFFBEB', label: 'Exp' },
    membership_expired:     { color: '#DC2626', bg: '#FEF2F2', label: 'End' },
};

const fmtTime = (dateStr) => {
    if (!dateStr) return '';
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationBell = ({ unreadCount, onCountChange }) => {
    const navigate    = useNavigate();
    const [open,       setOpen]       = useState(false);
    const [notifs,     setNotifs]     = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const dropdownRef = useRef(null);

    const hasUnread = (unreadCount || 0) > 0;

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchNotifs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getNotifications({ limit: 5 });
            if (res.data?.success) setNotifs(res.data.data || []);
        } catch { /* silently fail */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (open) fetchNotifs(); }, [open, fetchNotifs]);

    const handleClick = async (notif) => {
        if (!notif.is_read) {
            try {
                await markAsRead(notif.id);
                setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                if (onCountChange) onCountChange(prev => Math.max(0, prev - 1));
            } catch { /* silently fail */ }
        }
        const url = notif.data?.url;
        if (url) {
            setOpen(false);
            if (url.startsWith('http')) window.location.href = url;
            else navigate(url);
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await markAllAsRead();
            setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
            if (onCountChange) onCountChange(0);
        } catch { /* silently fail */ }
        finally { setMarkingAll(false); }
    };

    return (
        <>
            <style>{`
                @keyframes nb-ring {
                    0%,100%{ transform:rotate(0deg); }
                    10%    { transform:rotate(16deg); }
                    20%    { transform:rotate(-13deg); }
                    30%    { transform:rotate(10deg); }
                    40%    { transform:rotate(-8deg); }
                    50%    { transform:rotate(5deg); }
                    60%    { transform:rotate(-3deg); }
                    70%    { transform:rotate(2deg); }
                }
                @keyframes nb-pop {
                    0%  { transform:scale(0); opacity:0; }
                    70% { transform:scale(1.3); }
                    100%{ transform:scale(1); opacity:1; }
                }
                @keyframes nb-pulse-ring {
                    0%   { box-shadow:0 0 0 0 rgba(239,68,68,0.6); }
                    70%  { box-shadow:0 0 0 7px rgba(239,68,68,0); }
                    100% { box-shadow:0 0 0 0 rgba(239,68,68,0); }
                }
                @keyframes nb-glow {
                    0%,100%{ box-shadow:0 2px 14px rgba(245,158,11,0.5), 0 0 0 1px rgba(245,158,11,0.2); }
                    50%    { box-shadow:0 4px 22px rgba(245,158,11,0.75), 0 0 0 2px rgba(245,158,11,0.35); }
                }
                @keyframes nb-sk { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes nb-fadeup {
                    from { opacity:0; transform:translateY(-8px) scale(0.97); }
                    to   { opacity:1; transform:translateY(0)    scale(1); }
                }

                /* ── Bell button — idle (no unread): always amber tinted so it's visible ── */
                .nb-bell-btn {
                    position: relative;
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; flex-shrink: 0;
                    border: none; outline: none;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .nb-bell-btn:hover { transform: scale(1.1); }

                /* Idle — subtle amber tint so bell is always visible on white navbar */
                .nb-bell-btn.idle {
                    background: #fffbeb;
                    border: 1.5px solid #fcd34d;
                    box-shadow: 0 1px 4px rgba(245,158,11,0.15);
                }
                .nb-bell-btn.idle:hover {
                    background: #fef3c7;
                    border-color: #f59e0b;
                    box-shadow: 0 2px 8px rgba(245,158,11,0.25);
                }

                /* Active — full amber gradient with glow */
                .nb-bell-btn.active {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    animation: nb-glow 2.5s ease-in-out infinite;
                    border: none;
                }
                .nb-bell-btn.active .nb-bell-icon { animation: nb-ring 1s ease 0.4s; }

                .nb-badge {
                    position: absolute; top: 1px; right: 1px;
                    min-width: 17px; height: 17px; border-radius: 9px;
                    background: #EF4444; color: white;
                    font-size: 0.58rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                    padding: 0 4px; border: 2px solid white;
                    font-family: var(--font-sans);
                    animation: nb-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both,
                               nb-pulse-ring 2.2s 0.35s ease-in-out infinite;
                }

                /* ── Dropdown ── */
                .nb-dropdown {
                    position: absolute; right: 0; top: calc(100% + 10px);
                    width: 340px; max-width: 92vw;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.06);
                    z-index: 200; overflow: hidden;
                    animation: nb-fadeup 0.2s cubic-bezier(0.25,0.8,0.25,1) both;
                }

                /* ── Notification rows ── */
                .nb-notif-row {
                    display: flex; gap: 11px; align-items: flex-start;
                    padding: 0.8rem 1rem;
                    border-bottom: 1px solid #f8fafc;
                    transition: background 0.1s;
                    cursor: pointer;
                }
                .nb-notif-row.read   { background: white; }
                .nb-notif-row.unread { background: #fafbff; }
                .nb-notif-row:hover  { background: #f0f5ff !important; }

                /* ── Close btn — perfectly centered ── */
                .nb-close-btn {
                    width: 28px; height: 28px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    background: none; border: none; cursor: pointer;
                    color: #94a3b8; flex-shrink: 0; padding: 0;
                    transition: background 0.12s, color 0.12s;
                    line-height: 1;
                }
                .nb-close-btn:hover { background: #f1f5f9; color: #374151; }

                .nb-viewall {
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                    width: 100%; padding: 0.8rem 1rem;
                    background: none; border: none; cursor: pointer;
                    font-size: 0.81rem; font-weight: 700; color: #003366;
                    font-family: var(--font-sans);
                    transition: background 0.12s;
                }
                .nb-viewall:hover { background: #eff6ff; }
            `}</style>

            <div style={{ position: 'relative' }} ref={dropdownRef}>

                {/* ── Bell Button ── */}
                <button
                    onClick={() => setOpen(o => !o)}
                    aria-label={`Notifications${hasUnread ? ` — ${unreadCount} unread` : ''}`}
                    className={`nb-bell-btn ${hasUnread ? 'active' : 'idle'}`}
                >
                    <span className="nb-bell-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bell
                            size={18}
                            color={hasUnread ? 'white' : '#d97706'}
                            strokeWidth={2.2}
                        />
                    </span>
                    {hasUnread && (
                        <span className="nb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>

                {/* ── Dropdown ── */}
                {open && (
                    <div className="nb-dropdown">

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0.875rem 0.75rem 1rem', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #001e4a 0%, #003366 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Bell size={14} color="rgba(255,255,255,0.8)" />
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: 'white' }}>Notifications</p>
                                {hasUnread && (
                                    <span style={{ background: '#f59e0b', color: 'white', fontSize: '0.6rem', fontWeight: '800', padding: '2px 7px', borderRadius: '100px', lineHeight: 1 }}>
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {hasUnread && (
                                    <button onClick={handleMarkAllRead} disabled={markingAll}
                                        style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', fontWeight: '600', padding: '4px 8px', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'background 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                                        <CheckCheck size={11} /> Mark all read
                                    </button>
                                )}
                                <button onClick={() => setOpen(false)} className="nb-close-btn"
                                    style={{ color: 'rgba(255,255,255,0.7)' }}
                                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                    aria-label="Close">
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Notification list — min height so empty state looks good */}
                        <div style={{ minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
                            {loading ? (
                                <div style={{ padding: '1rem', flex: 1 }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                                            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#f1f5f9', flexShrink: 0, animation: 'nb-sk 1.4s ease-in-out infinite' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ height: '12px', width: '65%', background: '#f1f5f9', borderRadius: '4px', marginBottom: '7px', animation: 'nb-sk 1.4s ease-in-out infinite' }} />
                                                <div style={{ height: '10px', width: '45%', background: '#f1f5f9', borderRadius: '4px', animation: 'nb-sk 1.4s ease-in-out infinite' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : notifs.length === 0 ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem' }}>
                                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fffbeb', border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
                                        <Bell size={22} color="#f59e0b" />
                                    </div>
                                    <p style={{ margin: '0 0 4px', fontSize: '0.84rem', fontWeight: '600', color: '#64748b' }}>No notifications yet</p>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>We'll notify you when something happens</p>
                                </div>
                            ) : (
                                <div style={{ flex: 1 }}>
                                    {notifs.map(notif => {
                                        const meta = TYPE_META[notif.type] || { color: '#003366', bg: '#EFF6FF', label: 'Upd' };
                                        return (
                                            <div key={notif.id}
                                                onClick={() => handleClick(notif)}
                                                className={`nb-notif-row ${notif.is_read ? 'read' : 'unread'}`}>
                                                {/* Icon pill */}
                                                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                                                    <span style={{ fontSize: '0.5rem', fontWeight: '800', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1 }}>
                                                        {meta.label}
                                                    </span>
                                                </div>
                                                {/* Text */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: '0 0 2px', fontSize: '0.81rem', fontWeight: notif.is_read ? '500' : '700', color: '#1e293b', lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {notif.title}
                                                    </p>
                                                    <p style={{ margin: '0 0 3px', fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {notif.body}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: '0.67rem', color: '#94a3b8' }}>{fmtTime(notif.created_at)}</p>
                                                </div>
                                                {/* Unread dot */}
                                                {!notif.is_read && (
                                                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: '7px', boxShadow: '0 0 5px rgba(245,158,11,0.6)' }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* View all footer */}
                        <div style={{ borderTop: '1px solid #f1f5f9' }}>
                            <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="nb-viewall">
                                View all notifications <ArrowRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationBell;