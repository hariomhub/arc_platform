import React, { useEffect, useState, useCallback } from 'react';
import { Send, Loader2, X } from 'lucide-react';
import { getLeadRequests, createLeadRequest, cancelLeadRequest } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Empty, Button, fieldStyle, labelStyle, fmtDate } from './ui.jsx';

const STATUS = {
    pending:   { tone: 'amber', label: 'Waiting for review' },
    approved:  { tone: 'green', label: 'Approved' },
    rejected:  { tone: 'red',   label: 'Not approved' },
    cancelled: { tone: 'gray',  label: 'Withdrawn' },
};

const EMPTY_FORM = { type: 'podcast', title: '', description: '', proposed_date: '' };

/**
 * A Chapter Lead's right to ask to host a podcast or conduct a workshop. An approved
 * request becomes a draft with the lead as host; an admin publishes it and later
 * marks it conducted, which is what counts toward the goal.
 */
const RequestsPanel = ({ showToast }) => {
    const [requests, setRequests] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await getLeadRequests();
            setRequests(res.data?.data || []);
        } catch (err) {
            setError(getErrorMessage(err));
            setRequests([]);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.title.trim().length < 3) { setError('Please give your request a title (at least 3 characters).'); return; }
        setSubmitting(true);
        try {
            await createLeadRequest({
                type: form.type,
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                proposed_date: form.proposed_date ? new Date(form.proposed_date).toISOString() : undefined,
            });
            showToast?.('Request sent. An admin will review it.', 'success');
            setForm(EMPTY_FORM);
            await load();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const withdraw = async (id) => {
        try {
            await cancelLeadRequest(id);
            showToast?.('Request withdrawn.', 'success');
            await load();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        }
    };

    return (
        <Card>
            <SectionTitle icon={Send}>Request to host a podcast or workshop</SectionTitle>

            <form onSubmit={submit} style={{ display: 'grid', gap: '0.8rem', marginBottom: '1.25rem' }}>
                {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 8, padding: '0.55rem 0.8rem', fontSize: '0.82rem' }}>{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.8rem' }}>
                    <div>
                        <label htmlFor="rq-type" style={labelStyle}>What would you like to host?</label>
                        <select id="rq-type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} style={fieldStyle} disabled={submitting}>
                            <option value="podcast">Podcast</option>
                            <option value="workshop">Workshop</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rq-date" style={labelStyle}>Proposed date <span style={{ color: colors.faint, fontWeight: 400 }}>(optional)</span></label>
                        <input id="rq-date" type="datetime-local" value={form.proposed_date} onChange={(e) => setForm((p) => ({ ...p, proposed_date: e.target.value }))} style={fieldStyle} disabled={submitting} />
                    </div>
                </div>
                <div>
                    <label htmlFor="rq-title" style={labelStyle}>Title / topic</label>
                    <input id="rq-title" value={form.title} maxLength={255} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Auditing generative AI under the EU AI Act" style={fieldStyle} disabled={submitting} />
                </div>
                <div>
                    <label htmlFor="rq-desc" style={labelStyle}>Short description <span style={{ color: colors.faint, fontWeight: 400 }}>(optional)</span></label>
                    <textarea id="rq-desc" rows={3} value={form.description} maxLength={3000} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Who is it for, who would you invite, what will attendees learn?" style={{ ...fieldStyle, resize: 'vertical' }} disabled={submitting} />
                </div>
                <div>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : <><Send size={14} /> Send request</>}
                    </Button>
                </div>
            </form>

            <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your requests</h4>
            {!requests ? (
                <div style={{ padding: '1rem', textAlign: 'center' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} color={colors.faint} /></div>
            ) : requests.length === 0 ? (
                <Empty>You have not sent any requests yet.</Empty>
            ) : (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                    {requests.map((r) => {
                        const st = STATUS[r.status] || STATUS.pending;
                        return (
                            <div key={r.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: '0.7rem 0.9rem', background: colors.bg }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <Pill tone="blue">{r.type === 'podcast' ? 'Podcast' : 'Workshop'}</Pill>
                                        <strong style={{ fontSize: '0.88rem', color: colors.text }}>{r.title}</strong>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Pill tone={st.tone}>{st.label}</Pill>
                                        {r.status === 'pending' && (
                                            <Button small tone="ghost" onClick={() => withdraw(r.id)} aria-label="Withdraw request"><X size={12} /> Withdraw</Button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: colors.muted, marginTop: 4 }}>
                                    Sent {fmtDate(r.created_at)}{r.proposed_date ? ` · proposed for ${fmtDate(r.proposed_date)}` : ''}
                                </div>
                                {r.admin_notes && <div style={{ fontSize: '0.78rem', color: colors.text, marginTop: 6 }}>Admin note: {r.admin_notes}</div>}
                                {r.status === 'approved' && (
                                    <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 6 }}>
                                        A draft was created with you as host. Add the details in{' '}
                                        <a href={r.type === 'podcast' ? '/events' : '/executive-workshops'} style={{ color: '#047857', fontWeight: 700 }}>
                                            {r.type === 'podcast' ? 'Events' : 'Workshops'}
                                        </a>; an admin will publish it.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

export default RequestsPanel;
