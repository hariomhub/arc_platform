import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { getHostRequests, decideHostRequest } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, Pill, Empty, Button, fieldStyle, fmtDate } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner } from './shared.jsx';

const FILTERS = [
    { key: 'pending', label: 'Waiting' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Not approved' },
    { key: '', label: 'All' },
];

const STATUS = {
    pending: { tone: 'amber', label: 'Waiting' },
    approved: { tone: 'green', label: 'Approved' },
    rejected: { tone: 'red', label: 'Not approved' },
    cancelled: { tone: 'gray', label: 'Withdrawn' },
};

/**
 * Chapter Leads' requests to host a podcast or workshop. Approving creates an
 * unpublished draft with the lead as host; the lead then fills in the details.
 */
const RequestsQueue = ({ showToast, onChanged }) => {
    const [filter, setFilter] = useState('pending');
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [notes, setNotes] = useState({});
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await getHostRequests(filter || undefined);
            setRows(res.data?.data || []);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [filter]);

    useEffect(() => { setRows(null); load(); }, [load]);

    const decide = async (r, status) => {
        setBusyId(r.id);
        try {
            await decideHostRequest(r.id, { status, admin_notes: (notes[r.id] || '').trim() || undefined });
            showToast?.(status === 'approved' ? 'Approved — a draft was created with the lead as host.' : 'Request declined.', 'success');
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FILTERS.map((f) => (
                    <button key={f.key || 'all'} type="button" onClick={() => setFilter(f.key)}
                        style={{ padding: '0.35rem 0.9rem', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            border: `1.5px solid ${filter === f.key ? colors.primary : colors.border}`, background: filter === f.key ? '#EEF4FF' : 'white', color: filter === f.key ? colors.primary : colors.muted }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}
            {!rows && !error && <Spinner />}
            {rows && rows.length === 0 && <Card><Empty>No requests here.</Empty></Card>}
            {rows && rows.map((r) => {
                const st = STATUS[r.status] || STATUS.pending;
                const pending = r.status === 'pending';
                return (
                    <Card key={r.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                    <Pill tone="blue">{r.type === 'podcast' ? 'Podcast' : 'Workshop'}</Pill>
                                    <Pill tone={st.tone}>{st.label}</Pill>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: colors.text }}>{r.title}</div>
                                <div style={{ fontSize: '0.78rem', color: colors.muted, marginTop: 2 }}>
                                    {r.lead_name}{r.chapter_name ? ` · ${r.chapter_name}` : ''} · sent {fmtDate(r.created_at)}{r.proposed_date ? ` · proposed ${fmtDate(r.proposed_date)}` : ''}
                                </div>
                            </div>
                        </div>
                        {r.description && <p style={{ margin: '0.7rem 0 0', fontSize: '0.86rem', color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{r.description}</p>}
                        {r.admin_notes && !pending && <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: colors.muted }}>Your note: {r.admin_notes}</p>}

                        {pending && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: '0.9rem' }}>
                                <input
                                    value={notes[r.id] || ''}
                                    onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                                    placeholder="Note to the lead (optional)"
                                    maxLength={1000}
                                    style={{ ...fieldStyle, flex: '1 1 240px', width: 'auto' }}
                                    disabled={busyId === r.id}
                                />
                                <Button tone="success" disabled={busyId === r.id} onClick={() => decide(r, 'approved')}>
                                    {busyId === r.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Approve
                                </Button>
                                <Button tone="ghost" disabled={busyId === r.id} onClick={() => decide(r, 'rejected')}><X size={14} /> Decline</Button>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

export default RequestsQueue;
