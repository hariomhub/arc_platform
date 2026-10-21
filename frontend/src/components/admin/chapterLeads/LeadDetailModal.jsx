import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, KeyRound, UserMinus, Save, ShieldAlert } from 'lucide-react';
import Modal from '../../common/Modal.jsx';
import ConfirmDialog from '../../common/ConfirmDialog.jsx';
import GoalCard from '../../chapterLead/GoalCard.jsx';
import QuarterHistory from '../../chapterLead/QuarterHistory.jsx';
import {
    getChapterLead, updateChapterLead, endChapterLeadRole, regenerateLeadCode,
    waiveLeadQuarter, correctReferral, getAdminChapters, getLeadOptions,
} from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Empty, Table, Td, Button, fieldStyle, labelStyle, fmtDate, quarterLabel } from '../../chapterLead/ui.jsx';
import { StandingPill, ErrorNote, Spinner, toDateInput } from './shared.jsx';
import { countryName } from '../../../utils/countries.js';

const REF_STATUS = {
    qualified: { tone: 'green', label: 'Approved — counts' },
    pending:   { tone: 'amber', label: 'Awaiting approval' },
    void:      { tone: 'gray',  label: 'Voided' },
};

/** Full record of one lead: edit chapter / term, referrals, quarters, and end the role. */
const LeadDetailModal = ({ leadId, onClose, onChanged, showToast }) => {
    const [data, setData] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [leadOptions, setLeadOptions] = useState([]);
    const [error, setError] = useState('');

    const [chapterId, setChapterId] = useState('');
    const [termStart, setTermStart] = useState('');
    const [saving, setSaving] = useState(false);

    const [confirmCode, setConfirmCode] = useState(false);
    const [endOpen, setEndOpen] = useState(false);
    const [endReason, setEndReason] = useState('');
    const [endOutcome, setEndOutcome] = useState('removed');
    const [ending, setEnding] = useState(false);

    const [waiveStart, setWaiveStart] = useState('');
    const [waiveNote, setWaiveNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const [d, c, o] = await Promise.all([getChapterLead(leadId), getAdminChapters(), getLeadOptions()]);
            const detail = d.data?.data;
            setData(detail);
            setChapters((c.data?.data || []).filter((x) => x.status === 'active' || x.id === detail.profile.chapter_id));
            setLeadOptions(o.data?.data || []);
            setChapterId(detail.profile.chapter_id ? String(detail.profile.chapter_id) : '');
            setTermStart(toDateInput(detail.profile.term_started_at));
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [leadId]);

    useEffect(() => { load(); }, [load]);

    const changed = () => { onChanged?.(); };
    const toastErr = (err) => showToast?.(getErrorMessage(err), 'error');

    const saveProfile = async () => {
        setSaving(true);
        try {
            const body = {};
            if (String(data.profile.chapter_id || '') !== chapterId) body.chapter_id = chapterId || '';
            if (termStart && termStart !== toDateInput(data.profile.term_started_at)) body.term_started_at = new Date(`${termStart}T00:00:00Z`).toISOString();
            if (!Object.keys(body).length) { showToast?.('Nothing to save.', 'info'); return; }
            await updateChapterLead(data.profile.id, body);
            showToast?.('Lead updated.', 'success');
            await load();
            changed();
        } catch (err) { toastErr(err); } finally { setSaving(false); }
    };

    const regenerate = async () => {
        setBusy(true);
        try {
            const res = await regenerateLeadCode(data.profile.id);
            showToast?.(`New code: ${res.data?.data?.referral_code}. The old code no longer works for new sign-ups.`, 'success');
            setConfirmCode(false);
            await load();
            changed();
        } catch (err) { toastErr(err); } finally { setBusy(false); }
    };

    const endRole = async () => {
        setEnding(true);
        try {
            await endChapterLeadRole(data.profile.id, { reason: endReason.trim() || undefined, outcome: endOutcome });
            showToast?.('Chapter Lead role ended.', 'success');
            setEndOpen(false);
            changed();
            await load();
        } catch (err) { toastErr(err); } finally { setEnding(false); }
    };

    const waive = async () => {
        if (!waiveStart) return;
        setBusy(true);
        try {
            await waiveLeadQuarter(data.profile.id, { quarter_start: waiveStart, notes: waiveNote.trim() || undefined });
            showToast?.('Quarter waived.', 'success');
            setWaiveStart(''); setWaiveNote('');
            await load();
            changed();
        } catch (err) { toastErr(err); } finally { setBusy(false); }
    };

    const fixReferral = async (id, payload) => {
        try {
            await correctReferral(id, payload);
            showToast?.('Referral updated.', 'success');
            await load();
            changed();
        } catch (err) { toastErr(err); }
    };

    const p = data?.profile;
    const active = p?.status === 'active';
    const missedQuarters = (data?.quarters || []).filter((q) => q.status === 'closed' && !q.met);

    return (
        <>
        <Modal isOpen onClose={onClose} title={data?.user?.name ? `${data.user.name} — Chapter Lead` : 'Chapter Lead'} size="xl">
            {error && <ErrorNote>{error}</ErrorNote>}
            {!data && !error && <Spinner />}
            {data && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Summary */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Pill tone={active ? 'green' : 'gray'}>{active ? 'Active' : p.status === 'removed' ? 'Removed' : 'Ended'}</Pill>
                        <StandingPill standing={active ? data.standing : 'ended'} misses={data.consecutive_misses} />
                        <span style={{ fontSize: '0.82rem', color: colors.muted }}>
                            {data.user.email}{data.user.organization_name ? ` · ${data.user.organization_name}` : ''}
                            {data.user.country_code ? ` · ${countryName(data.user.country_code)}` : ''}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: colors.muted }}>
                            Term {data.term.number} · {data.term.rate}% · {active ? `ends ${fmtDate(data.term.ends)}` : `ended ${fmtDate(p.ended_at)}`}
                        </span>
                    </div>
                    {!active && p.end_reason && <ErrorNote>Reason recorded: {p.end_reason}</ErrorNote>}

                    {/* Edit */}
                    {active && (
                        <Card>
                            <SectionTitle icon={Save}>Chapter and term</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', alignItems: 'end' }}>
                                <div>
                                    <label htmlFor="ld-chapter" style={labelStyle}>Chapter</label>
                                    <select id="ld-chapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} style={fieldStyle} disabled={saving}>
                                        <option value="">No chapter assigned</option>
                                        {chapters.map((c) => <option key={c.id} value={c.id}>{c.name} ({countryName(c.country_code)}){c.lead_name && c.id !== p.chapter_id ? ' — has a lead' : ''}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="ld-term" style={labelStyle}>Term start date</label>
                                    <input id="ld-term" type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} style={fieldStyle} disabled={saving} />
                                </div>
                                <div>
                                    <Button onClick={saveProfile} disabled={saving}>
                                        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save changes
                                    </Button>
                                </div>
                            </div>
                            <p style={{ margin: '0.7rem 0 0', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                                The term start decides which term (and revenue-share rate) applies. Changing it also moves the membership expiry to the end of the current term. A chapter can have only one active lead.
                            </p>
                        </Card>
                    )}

                    {/* Goals this quarter */}
                    {active && data.goals.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                {data.quarter.label}{data.quarter.partial ? ' — not scored (joined mid-quarter)' : ''}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.8rem' }}>
                                {data.goals.map((g) => <GoalCard key={g.key} goal={g} partialQuarter={data.quarter.partial} />)}
                            </div>
                        </div>
                    )}

                    {/* Referral code */}
                    <Card>
                        <SectionTitle
                            icon={KeyRound}
                            right={active && <Button small tone="ghost" onClick={() => setConfirmCode(true)}>Generate a new code</Button>}
                        >
                            Referral code & members
                        </SectionTitle>
                        <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 800, fontSize: '1.15rem', color: colors.primary, letterSpacing: '0.08em', marginBottom: 10 }}>
                            {p.referral_code} {!active && <span style={{ fontSize: '0.74rem', color: colors.faint, fontFamily: 'var(--font-sans)', letterSpacing: 0 }}>(no longer accepts sign-ups)</span>}
                        </div>
                        {data.referrals.length === 0 ? <Empty>No referrals yet.</Empty> : (
                            <Table minWidth={640} columns={[{ label: 'Member' }, { label: 'Organisation' }, { label: 'Joined' }, { label: 'Status' }, { label: 'Correct' }]}>
                                {data.referrals.map((r) => {
                                    const st = REF_STATUS[r.status] || REF_STATUS.pending;
                                    return (
                                        <tr key={r.id}>
                                            <Td>{r.first_name}</Td>
                                            <Td muted>{r.organization_name || '—'}</Td>
                                            <Td muted>{fmtDate(r.created_at)}</Td>
                                            <Td><Pill tone={st.tone} title={r.void_reason || undefined}>{st.label}</Pill></Td>
                                            <Td>
                                                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {r.status === 'void'
                                                        ? <Button small tone="ghost" onClick={() => fixReferral(r.id, { action: 'restore' })}>Restore</Button>
                                                        : <Button small tone="ghost" onClick={() => fixReferral(r.id, { action: 'void', reason: 'Voided by an administrator' })}>Void</Button>}
                                                    <select
                                                        aria-label="Move this referral to another lead"
                                                        value=""
                                                        onChange={(e) => {
                                                            if (!e.target.value) return;
                                                            if (window.confirm('Move this referral to the selected Chapter Lead?')) fixReferral(r.id, { action: 'reassign', lead_user_id: Number(e.target.value) });
                                                        }}
                                                        style={{ ...fieldStyle, width: 'auto', padding: '0.28rem 0.5rem', fontSize: '0.74rem' }}
                                                    >
                                                        <option value="">Move to…</option>
                                                        {leadOptions.filter((o) => o.user_id !== p.user_id).map((o) => <option key={o.user_id} value={o.user_id}>{o.name}</option>)}
                                                    </select>
                                                </span>
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        )}
                    </Card>

                    {/* Quarter history + waive */}
                    <QuarterHistory quarters={data.quarters} title="Quarter results" />
                    {missedQuarters.length > 0 && (
                        <Card>
                            <SectionTitle icon={ShieldAlert}>Waive a missed quarter</SectionTitle>
                            <p style={{ margin: '0 0 0.7rem', fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>
                                A waived quarter counts as neither met nor missed, so it neither adds to nor breaks a streak. Use it for approved leave or exceptional circumstances.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', alignItems: 'end' }}>
                                <div>
                                    <label htmlFor="ld-waive" style={labelStyle}>Quarter</label>
                                    <select id="ld-waive" value={waiveStart} onChange={(e) => setWaiveStart(e.target.value)} style={fieldStyle}>
                                        <option value="">Select a missed quarter…</option>
                                        {missedQuarters.map((q) => <option key={q.id} value={q.quarter_start}>{quarterLabel(q.quarter_start)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="ld-waive-note" style={labelStyle}>Reason (optional)</label>
                                    <input id="ld-waive-note" value={waiveNote} maxLength={500} onChange={(e) => setWaiveNote(e.target.value)} style={fieldStyle} />
                                </div>
                                <div><Button tone="ghost" disabled={!waiveStart || busy} onClick={waive}>Waive quarter</Button></div>
                            </div>
                        </Card>
                    )}

                    {/* End role */}
                    {active && (
                        <Card style={{ borderColor: '#FECACA', background: '#FFFBFB' }}>
                            <SectionTitle icon={UserMinus}>End this Chapter Lead role</SectionTitle>
                            <p style={{ margin: '0 0 0.8rem', fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>
                                The member becomes a Professional straight away and their referral code stops accepting new sign-ups. Their past posts, referrals and quarter results are kept.
                                {data.standing === 'review' && <strong style={{ color: colors.red }}> This lead has reached the missed-quarter limit and is due for review.</strong>}
                            </p>
                            <Button tone="danger" onClick={() => setEndOpen(true)}><UserMinus size={14} /> End role…</Button>
                        </Card>
                    )}
                </div>
            )}
        </Modal>

            <ConfirmDialog
                isOpen={confirmCode}
                onClose={() => setConfirmCode(false)}
                onConfirm={regenerate}
                loading={busy}
                title="Generate a new referral code?"
                message="The current code will stop working for new sign-ups right away. Members already referred stay linked to this lead. Make sure the lead knows their code has changed."
                confirmLabel="Generate new code"
            />

            <Modal isOpen={endOpen} onClose={() => !ending && setEndOpen(false)} title="End Chapter Lead role" size="sm">
                <div style={{ display: 'grid', gap: '0.8rem' }}>
                    <div>
                        <label htmlFor="end-outcome" style={labelStyle}>Outcome</label>
                        <select id="end-outcome" value={endOutcome} onChange={(e) => setEndOutcome(e.target.value)} style={fieldStyle} disabled={ending}>
                            <option value="removed">Removed (performance or conduct)</option>
                            <option value="ended">Ended (stepped down / term not continued)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="end-reason" style={labelStyle}>Reason (sent to the member)</label>
                        <textarea id="end-reason" rows={3} value={endReason} maxLength={500} onChange={(e) => setEndReason(e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} disabled={ending} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button tone="ghost" onClick={() => setEndOpen(false)} disabled={ending}>Cancel</Button>
                        <Button tone="danger" onClick={endRole} disabled={ending}>
                            {ending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null} End role
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default LeadDetailModal;
