import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ChevronDown, ChevronRight, RefreshCw, Send } from 'lucide-react';
import { getMyContactMessages, markContactMessageRead } from '../../api/contact.js';
import { formatDateTime, timeAgo } from '../../utils/dateFormatter.js';

const INITIAL_VISIBLE = 5;

const Pill = ({ children, color, bg }) => (
    <span style={{ background: bg, color, borderRadius: 100, padding: '2px 9px', fontSize: '0.66rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
);

/**
 * "My Messages" card on the member dashboard: the person's own Contact-form
 * messages and the team's replies. Replies are signed by the team, not by an
 * individual admin. Opening a message marks its replies as read.
 *
 * Reuses the .dash-card / .sec-title / .skel styles defined by UserDashboard.
 */
const MyContactMessages = () => {
    const [messages, setMessages] = useState([]);
    const [unread, setUnread]     = useState(0);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [showAll, setShowAll]   = useState(false);
    const rootRef = useRef(null);
    const cameFromLink = useRef(typeof window !== 'undefined' && window.location.hash === '#messages');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getMyContactMessages();
            const data = res.data?.data ?? { messages: [], unread: 0 };
            setMessages(data.messages);
            setUnread(data.unread);
            // Arrived via the "reply" notification/email link → open the message with the new reply.
            if (cameFromLink.current) {
                const target = data.messages.find((m) => m.replies.some((r) => !r.is_read));
                if (target) setExpandedId(target.id);
            }
        } catch {
            setError('Could not load your messages.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!loading && cameFromLink.current) {
            rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            cameFromLink.current = false;
        }
    }, [loading]);

    const toggle = async (m) => {
        const opening = expandedId !== m.id;
        setExpandedId(opening ? m.id : null);
        const unreadHere = m.replies.filter((r) => !r.is_read).length;
        if (!opening || unreadHere === 0) return;

        // Optimistic: clear the "new" markers now; the server call is best-effort.
        setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, replies: x.replies.map((r) => ({ ...r, is_read: true })) } : x)));
        setUnread((u) => Math.max(0, u - unreadHere));
        try { await markContactMessageRead(m.id); } catch { /* shows as unread again on next load */ }
    };

    const visible = showAll ? messages : messages.slice(0, INITIAL_VISIBLE);

    return (
        <div className="dash-card" id="messages" ref={rootRef} style={{ scrollMarginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 8, flexWrap: 'wrap' }}>
                <h3 className="sec-title" style={{ margin: 0 }}>
                    <Mail size={15} color="#003366" /> My Messages
                    {unread > 0 && <span style={{ background: '#2563EB', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 100 }}>{unread} new {unread === 1 ? 'reply' : 'replies'}</span>}
                </h3>
                <Link to="/contact" style={{ fontSize: '0.78rem', color: '#003366', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Send size={12} /> New message
                </Link>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[1, 2].map((i) => <div key={i} className="skel" style={{ height: 58 }} />)}
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#B91C1C', fontSize: '0.85rem' }}>
                    <p style={{ margin: '0 0 0.6rem' }}>{error}</p>
                    <button type="button" onClick={load} style={{ background: 'none', border: '1px solid #CBD5E1', borderRadius: 8, padding: '0.4rem 0.9rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={12} /> Try again
                    </button>
                </div>
            ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#94A3B8' }}>
                    <Mail size={30} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', margin: '0 0 0.25rem' }}>You haven't sent us any messages yet.</p>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>Questions? <Link to="/contact" style={{ color: '#003366', fontWeight: 700 }}>Contact the team</Link> — replies will appear here.</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        {visible.map((m) => {
                            const open = expandedId === m.id;
                            const hasNew = m.replies.some((r) => !r.is_read);
                            const replied = m.replies.length > 0;
                            return (
                                <div key={m.id} style={{ border: `1px solid ${hasNew ? '#93C5FD' : '#E2E8F0'}`, background: hasNew ? '#F8FBFF' : 'white', borderRadius: 12, overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggle(m)} aria-expanded={open}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.8rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                                                <Pill color="#003366" bg="#EFF6FF">{m.inquiry_type}</Pill>
                                                {hasNew
                                                    ? <Pill color="white" bg="#2563EB">New reply</Pill>
                                                    : replied
                                                        ? <Pill color="#047857" bg="#ECFDF5">Replied</Pill>
                                                        : <Pill color="#92400E" bg="#FFFBEB">Awaiting reply</Pill>}
                                                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{timeAgo(m.created_at)}</span>
                                            </div>
                                            {!open && <p style={{ margin: 0, fontSize: '0.83rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</p>}
                                        </div>
                                        {open ? <ChevronDown size={16} color="#64748B" /> : <ChevronRight size={16} color="#64748B" />}
                                    </button>

                                    {open && (
                                        <div style={{ padding: '0 0.9rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div>
                                                <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>You wrote · {formatDateTime(m.created_at)}</p>
                                                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.7rem 0.85rem', fontSize: '0.85rem', color: '#1E293B', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.message}</div>
                                            </div>
                                            {m.replies.length === 0 ? (
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>Our team has your message and will reply within 1–2 business days. You'll get an email and a notification here when they do.</p>
                                            ) : m.replies.map((r) => (
                                                <div key={r.id}>
                                                    <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 800, color: '#003366', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk AI Council Team · {formatDateTime(r.created_at)}</p>
                                                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '0.7rem 0.85rem', fontSize: '0.85rem', color: '#1E293B', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.body}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {messages.length > INITIAL_VISIBLE && (
                        <button type="button" onClick={() => setShowAll((s) => !s)}
                            style={{ marginTop: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#003366', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit', padding: 0 }}>
                            {showAll ? 'Show fewer' : `Show all ${messages.length}`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default MyContactMessages;
