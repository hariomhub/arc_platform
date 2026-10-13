import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Mail, Search, Send, Loader2, RefreshCw, CheckCircle, AlertTriangle, ArrowLeft,
    Building, User, Clock, Inbox, ExternalLink, Activity, XCircle, Eye,
} from 'lucide-react';
import {
    getContactMessages, getContactMessage, replyToContactMessage,
    setContactMessageStatus, getEmailHealth, sendTestEmail,
} from '../../api/admin.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { formatDateTime, timeAgo } from '../../utils/dateFormatter.js';
import Pagination from '../common/Pagination.jsx';

const REPLY_MAX = 5000;

const FILTERS = [
    { key: 'all',         label: 'All' },
    { key: 'new',         label: 'New' },
    { key: 'handled',     label: 'Handled' },
    { key: 'undelivered', label: 'Not delivered' },
];

const fullName = (m) => `${m.first_name} ${m.last_name || ''}`.trim();

const Chip = ({ children, color = '#475569', bg = '#F1F5F9', title }) => (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color, borderRadius: 100, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {children}
    </span>
);

/**
 * Admin → "Contact Messages" tab.
 * Lists messages from the public Contact form, lets an admin read the thread and
 * reply (the reply is emailed to the sender and, if they have an account, shown on
 * their own dashboard), and shows whether the server can actually send email.
 */
const ContactMessagesManagement = ({ showToast, onCountChange }) => {
    // ── List state ──
    const [filter, setFilter]       = useState('all');
    const [search, setSearch]       = useState('');
    const [q, setQ]                 = useState('');
    const [page, setPage]           = useState(1);
    const [items, setItems]         = useState([]);
    const [counts, setCounts]       = useState({ all: 0, new: 0, handled: 0, undelivered: 0 });
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });
    const [loadingList, setLoadingList] = useState(true);
    const [listError, setListError] = useState('');

    // ── Detail state ──
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail]         = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError]     = useState('');
    const [reply, setReply]           = useState('');
    const [sending, setSending]       = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    // ── Email health ──
    const [health, setHealth]         = useState(null);
    const [healthLoading, setHealthLoading] = useState(true);
    const [showHealth, setShowHealth] = useState(false);
    const [testing, setTesting]       = useState(false);

    // Ignore responses that arrive after a newer request was made.
    const listReq   = useRef(0);
    const detailReq = useRef(0);

    // ── Debounce search ──
    useEffect(() => {
        const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    // ── Load list ──
    const loadList = useCallback(async () => {
        const req = ++listReq.current;
        setLoadingList(true);
        setListError('');
        try {
            const res = await getContactMessages({ status: filter, q, page, limit: 20 });
            if (req !== listReq.current) return;
            setItems(res.data?.data ?? []);
            setCounts(res.data?.counts ?? { all: 0, new: 0, handled: 0, undelivered: 0 });
            setPagination(res.data?.pagination ?? { page: 1, totalPages: 0 });
            onCountChange?.(res.data?.counts?.new ?? 0);
        } catch (err) {
            if (req === listReq.current) setListError(getErrorMessage(err));
        } finally {
            if (req === listReq.current) setLoadingList(false);
        }
    }, [filter, q, page, onCountChange]);

    useEffect(() => { loadList(); }, [loadList]);

    // ── Load detail ──
    useEffect(() => {
        if (!selectedId) { setDetail(null); return; }
        const req = ++detailReq.current;
        setLoadingDetail(true);
        setDetailError('');
        setReply('');
        getContactMessage(selectedId)
            .then((res) => { if (req === detailReq.current) setDetail(res.data?.data ?? null); })
            .catch((err) => { if (req === detailReq.current) { setDetail(null); setDetailError(getErrorMessage(err)); } })
            .finally(() => { if (req === detailReq.current) setLoadingDetail(false); });
    }, [selectedId]);

    // ── Email health ──
    const checkHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            const res = await getEmailHealth();
            setHealth(res.data?.data ?? null);
        } catch (err) {
            setHealth({ ok: false, configured: true, error: getErrorMessage(err) });
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => { checkHealth(); }, [checkHealth]);

    const handleTestEmail = async () => {
        setTesting(true);
        try {
            const res = await sendTestEmail();
            showToast?.(res.data?.message || 'Test email sent.', 'success');
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setTesting(false);
        }
    };

    // ── Keep list + counts in step with a change made in the detail pane ──
    const markStatusLocally = (id, status) => {
        const prev = items.find((m) => m.id === id)?.status ?? detail?.status;
        setItems((list) => list.map((m) => (m.id === id ? { ...m, status } : m)));
        setDetail((d) => (d && d.id === id ? { ...d, status } : d));
        if (prev && prev !== status) {
            setCounts((c) => {
                const next = { ...c, [prev]: Math.max(0, c[prev] - 1), [status]: c[status] + 1 };
                onCountChange?.(next.new);
                return next;
            });
        }
    };

    const handleToggleStatus = async () => {
        if (!detail || togglingStatus) return;
        const next = detail.status === 'handled' ? 'new' : 'handled';
        setTogglingStatus(true);
        try {
            await setContactMessageStatus(detail.id, next);
            markStatusLocally(detail.id, next);
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setTogglingStatus(false);
        }
    };

    const handleSendReply = async () => {
        const text = reply.trim();
        if (!detail || !text || sending) return;
        setSending(true);
        try {
            const res = await replyToContactMessage(detail.id, text);
            const { reply: saved, emailed, has_account } = res.data?.data ?? {};
            setDetail((d) => d && ({ ...d, replies: [...d.replies, saved] }));
            setItems((list) => list.map((m) => (m.id === detail.id ? { ...m, reply_count: m.reply_count + 1 } : m)));
            markStatusLocally(detail.id, 'handled');
            setReply('');
            showToast?.(res.data?.message || 'Reply sent.', emailed || has_account ? (emailed ? 'success' : 'info') : 'error');
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');   // reply text is kept so nothing is lost
        } finally {
            setSending(false);
        }
    };

    const selectMessage = (id) => setSelectedId(id);

    // ── Render helpers ──
    const healthChip = healthLoading
        ? <Chip>Checking email…</Chip>
        : health?.ok
            ? <Chip color="#047857" bg="#ECFDF5"><CheckCircle size={11} /> Email connected</Chip>
            : <Chip color="#B91C1C" bg="#FEF2F2"><XCircle size={11} /> Email not working</Chip>;

    const mailtoHref = detail
        ? `mailto:${detail.email}?subject=${encodeURIComponent(`Re: ${detail.inquiry_type}`)}`
        : '#';

    return (
        <div>
            <style>{`
                .cm-grid { display: grid; grid-template-columns: minmax(300px, 400px) minmax(0, 1fr); gap: 1rem; align-items: start; }
                .cm-card { background: white; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
                .cm-back { display: none; }
                .cm-row { display: flex; gap: 0.7rem; padding: 0.85rem 1rem; border-bottom: 1px solid #F1F5F9; cursor: pointer; border-left: 3px solid transparent; transition: background 0.12s; }
                .cm-row:hover { background: #F8FAFC; }
                .cm-row.active { background: #EFF6FF; border-left-color: #003366; }
                .cm-filter { border: 1px solid #E2E8F0; background: white; color: #475569; border-radius: 100px; padding: 4px 11px; font-size: 0.74rem; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 5px; }
                .cm-filter.active { background: #003366; border-color: #003366; color: white; }
                .cm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 9px; font-family: inherit; font-weight: 700; font-size: 0.82rem; padding: 0.55rem 1rem; cursor: pointer; border: 1px solid transparent; transition: opacity 0.15s; }
                .cm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
                .cm-btn.primary { background: #003366; color: white; }
                .cm-btn.ghost { background: white; color: #334155; border-color: #CBD5E1; }
                .cm-msg { white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
                @media (max-width: 900px) {
                    .cm-grid { grid-template-columns: 1fr; }
                    .cm-grid.has-selection .cm-list { display: none; }
                    .cm-grid:not(.has-selection) .cm-detail { display: none; }
                    .cm-back { display: inline-flex; }
                }
            `}</style>

            {/* ── Header + email status ── */}
            <div className="cm-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Mail size={18} color="#003366" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E293B' }}>Contact Messages</h2>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>Messages from the website Contact form. Replies go to the sender's email and their dashboard.</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setShowHealth((s) => !s)} aria-expanded={showHealth}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={14} color="#64748B" /> {healthChip}
                    </button>
                </div>

                {showHealth && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
                        {health && !healthLoading && (
                            <>
                                {!health.ok && (
                                    <div style={{ display: 'flex', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.9rem', color: '#991B1B', fontSize: '0.83rem', lineHeight: 1.55 }}>
                                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                        <span>{health.error}</span>
                                    </div>
                                )}
                                <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 1rem', margin: '0 0 0.9rem', fontSize: '0.8rem' }}>
                                    <dt style={{ color: '#94A3B8' }}>Mail server</dt>
                                    <dd style={{ margin: 0, color: '#1E293B' }}>{health.host ? `${health.host}:${health.port}${health.secure ? ' (SSL)' : ''}` : '— not set —'}</dd>
                                    <dt style={{ color: '#94A3B8' }}>Login</dt>
                                    <dd style={{ margin: 0, color: '#1E293B' }}>{health.user || '— not set —'}</dd>
                                    <dt style={{ color: '#94A3B8' }}>Sends from</dt>
                                    <dd style={{ margin: 0, color: '#1E293B' }}>{health.from || '—'}</dd>
                                    <dt style={{ color: '#94A3B8' }}>Messages go to</dt>
                                    <dd style={{ margin: 0, color: '#1E293B' }}>{health.receiver}</dd>
                                </dl>
                            </>
                        )}
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button type="button" className="cm-btn ghost" onClick={checkHealth} disabled={healthLoading}>
                                {healthLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />} Re-check connection
                            </button>
                            <button type="button" className="cm-btn ghost" onClick={handleTestEmail} disabled={testing || healthLoading || !health?.configured}>
                                {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />} Send a test email to me
                            </button>
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                                Settings are read from the server's environment (Azure → App Service → Configuration).
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`cm-grid${selectedId ? ' has-selection' : ''}`}>
                {/* ═══ LIST ═══ */}
                <div className="cm-card cm-list" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ position: 'relative', marginBottom: '0.7rem' }}>
                            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, message…"
                                aria-label="Search messages" maxLength={100}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.8rem 0.55rem 2rem', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {FILTERS.map(({ key, label }) => (
                                <button key={key} type="button" className={`cm-filter${filter === key ? ' active' : ''}`}
                                    onClick={() => { setFilter(key); setPage(1); }}>
                                    {label} <span style={{ opacity: 0.75 }}>{counts[key] ?? 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {listError ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#B91C1C', fontSize: '0.85rem' }}>
                            <AlertTriangle size={22} style={{ marginBottom: 6 }} />
                            <p style={{ margin: '0 0 0.75rem' }}>{listError}</p>
                            <button type="button" className="cm-btn ghost" onClick={loadList}><RefreshCw size={13} /> Try again</button>
                        </div>
                    ) : loadingList && items.length === 0 ? (
                        <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>
                    ) : items.length === 0 ? (
                        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94A3B8' }}>
                            <Inbox size={30} style={{ opacity: 0.4, marginBottom: 6 }} />
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>{q || filter !== 'all' ? 'No messages match.' : 'No messages yet.'}</p>
                        </div>
                    ) : (
                        <div style={{ opacity: loadingList ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                            {items.map((m) => (
                                <div key={m.id} className={`cm-row${selectedId === m.id ? ' active' : ''}`} onClick={() => selectMessage(m.id)}
                                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMessage(m.id); } }}>
                                    <div style={{ width: 8, flexShrink: 0, paddingTop: 7 }}>
                                        {m.status === 'new' && <span title="New" style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />}
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                            <span style={{ fontWeight: m.status === 'new' ? 800 : 600, fontSize: '0.86rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(m)}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8', flexShrink: 0 }}>{timeAgo(m.created_at)}</span>
                                        </div>
                                        <p style={{ margin: '2px 0 5px', fontSize: '0.8rem', color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}>{m.preview}</p>
                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                            <Chip color="#003366" bg="#EFF6FF">{m.inquiry_type}</Chip>
                                            {m.reply_count > 0 && <Chip color="#047857" bg="#ECFDF5">Replied{m.reply_count > 1 ? ` ×${m.reply_count}` : ''}</Chip>}
                                            {!m.admin_notified && <Chip color="#B45309" bg="#FFFBEB" title="The team email for this message was not delivered"><AlertTriangle size={10} /> Not delivered</Chip>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ padding: '0 1rem 1rem' }}>
                        <Pagination page={pagination.page} totalPages={pagination.totalPages > 1 ? pagination.totalPages : 0}
                            onPageChange={(p) => setPage(p)} />
                    </div>
                </div>

                {/* ═══ DETAIL ═══ */}
                <div className="cm-card cm-detail" style={{ padding: 'clamp(1rem,2.5vw,1.5rem)', minHeight: 320 }}>
                    <button type="button" className="cm-btn ghost cm-back" onClick={() => setSelectedId(null)} style={{ marginBottom: '1rem' }}>
                        <ArrowLeft size={14} /> Back to messages
                    </button>

                    {!selectedId ? (
                        <div style={{ textAlign: 'center', color: '#94A3B8', padding: '4rem 1rem' }}>
                            <Mail size={34} style={{ opacity: 0.35, marginBottom: 8 }} />
                            <p style={{ margin: 0, fontSize: '0.88rem' }}>Select a message to read and reply.</p>
                        </div>
                    ) : loadingDetail ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
                    ) : detailError ? (
                        <div style={{ textAlign: 'center', color: '#B91C1C', padding: '3rem 1rem', fontSize: '0.88rem' }}>
                            <AlertTriangle size={24} style={{ marginBottom: 6 }} />
                            <p style={{ margin: 0 }}>{detailError}</p>
                        </div>
                    ) : detail && (
                        <>
                            {/* Sender */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                <div style={{ minWidth: 0 }}>
                                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', overflowWrap: 'anywhere' }}>{fullName(detail)}</h3>
                                    <a href={`mailto:${detail.email}`} style={{ color: '#0066CC', fontSize: '0.86rem', fontWeight: 600, overflowWrap: 'anywhere' }}>{detail.email}</a>
                                    {detail.organization && (
                                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}><Building size={12} /> {detail.organization}</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignContent: 'flex-start' }}>
                                    <Chip color="#003366" bg="#EFF6FF">{detail.inquiry_type}</Chip>
                                    <Chip color={detail.status === 'handled' ? '#047857' : '#1D4ED8'} bg={detail.status === 'handled' ? '#ECFDF5' : '#DBEAFE'}>
                                        {detail.status === 'handled' ? 'Handled' : 'New'}
                                    </Chip>
                                    {detail.account && <Chip color="#6D28D9" bg="#F5F3FF" title="This sender has a platform account — replies also appear on their dashboard"><User size={10} /> Member: {detail.account.name}</Chip>}
                                    {!detail.admin_notified && <Chip color="#B45309" bg="#FFFBEB" title="The team email for this message was not delivered — this is the only place it appears"><AlertTriangle size={10} /> Team email not delivered</Chip>}
                                </div>
                            </div>
                            <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Clock size={12} /> Received {formatDateTime(detail.created_at)}
                            </p>

                            {/* Original message */}
                            <div className="cm-msg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1rem 1.1rem', fontSize: '0.9rem', color: '#1E293B', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                                {detail.message}
                            </div>

                            {/* Thread */}
                            {detail.replies.length > 0 && (
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Replies</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                        {detail.replies.map((r) => (
                                            <div key={r.id} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '0.85rem 1.1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#003366' }}>{r.admin_name}</span>
                                                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{formatDateTime(r.created_at)}</span>
                                                </div>
                                                <div className="cm-msg" style={{ fontSize: '0.88rem', color: '#1E293B', lineHeight: 1.65 }}>{r.body}</div>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                                    {r.email_sent
                                                        ? <Chip color="#047857" bg="#ECFDF5"><CheckCircle size={10} /> Emailed</Chip>
                                                        : <Chip color="#B45309" bg="#FFFBEB"><AlertTriangle size={10} /> Email not delivered</Chip>}
                                                    {detail.account && (r.read_at
                                                        ? <Chip color="#6D28D9" bg="#F5F3FF"><Eye size={10} /> Seen on dashboard</Chip>
                                                        : <Chip>On dashboard · unread</Chip>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Composer */}
                            <label htmlFor="cm-reply" style={{ display: 'block', margin: '0 0 6px', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                                {detail.replies.length ? 'Send another reply' : 'Reply'}
                            </label>
                            <textarea id="cm-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={6} maxLength={REPLY_MAX} disabled={sending}
                                placeholder={`Write your reply to ${detail.first_name}…`}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 0.9rem', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.88rem', fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', outline: 'none' }} />
                            <p style={{ margin: '6px 0 12px', fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.5 }}>
                                {detail.account
                                    ? <>This reply will be emailed to <strong>{detail.email}</strong> and shown on {detail.first_name}'s dashboard.</>
                                    : <>This reply will be emailed to <strong>{detail.email}</strong>. They don't have an account, so it won't appear on a dashboard.</>}
                                <span style={{ float: 'right' }}>{reply.length}/{REPLY_MAX}</span>
                            </p>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <button type="button" className="cm-btn primary" onClick={handleSendReply} disabled={sending || !reply.trim()}>
                                    {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />} {sending ? 'Sending…' : 'Send reply'}
                                </button>
                                <button type="button" className="cm-btn ghost" onClick={handleToggleStatus} disabled={togglingStatus}>
                                    {togglingStatus && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {detail.status === 'handled' ? 'Reopen' : 'Mark as handled'}
                                </button>
                                <a className="cm-btn ghost" href={mailtoHref} style={{ textDecoration: 'none' }}>
                                    <ExternalLink size={13} /> Open in email app
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactMessagesManagement;
