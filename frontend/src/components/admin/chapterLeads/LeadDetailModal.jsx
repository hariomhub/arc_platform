import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, KeyRound, UserMinus, Save, ShieldAlert, Wallet, Eye, EyeOff } from 'lucide-react';
import Modal from '../../common/Modal.jsx';
import ConfirmDialog from '../../common/ConfirmDialog.jsx';
import GoalCard from '../../chapterLead/GoalCard.jsx';
import QuarterHistory from '../../chapterLead/QuarterHistory.jsx';
import {
    getChapterLead, updateChapterLead, endChapterLeadRole, regenerateLeadCode,
    waiveLeadQuarter, correctReferral, getAdminChapters, getLeadOptions, resetLeadElection, setMemberVisibility,
} from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, SectionTitle, Pill, Empty, Table, Td, Button, Segmented, fieldStyle, labelStyle, fmtDate, quarterLabel } from '../../chapterLead/ui.jsx';
import { StandingPill, EarningsPill, TierPill, ErrorNote, Spinner, toDateInput, chapterOption } from './shared.jsx';
import { countryName } from '../../../utils/countries.js';
import { TIER, tierLabel } from '../../../config/roles.js';

const REF_STATUS = {
    qualified: { tone: 'green', label: 'Approved — counts' },
    pending:   { tone: 'amber', label: 'Awaiting approval' },
    void:      { tone: 'gray',  label: 'Voided' },
};

const CHOICE_LABEL = { receive: 'Receive earnings', waive: 'Waive earnings (volunteer)', reset: 'Asked to choose again' };
const SOURCE_LABEL = { member: 'By the member', application: 'On application', admin_reset: 'Reset by an administrator', migration: 'Carried over' };

/** Full record of one chapter-team member: role, chapter, term, earnings, referrals, quarters, and ending the role. */
const LeadDetailModal = ({ leadId, onClose, onChanged, showToast }) => {
    const [data, setData] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [leadOptions, setLeadOptions] = useState([]);
    const [error, setError] = useState('');

    const [tier, setTier] = useState(TIER.LEAD);
    const [chapterId, setChapterId] = useState('');
    const [termStart, setTermStart] = useState('');
    const [overrideCap, setOverrideCap] = useState(false);
    const [saving, setSaving] = useState(false);

    const [confirmCode, setConfirmCode] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
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
            setTier(detail.profile.tier);
            setChapterId(detail.profile.chapter_id ? String(detail.profile.chapter_id) : '');
            setTermStart(toDateInput(detail.profile.term_started_at));
            setOverrideCap(false);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [leadId]);

    useEffect(() => { load(); }, [load]);

    const changed = () => { onChanged?.(); };
    const toastErr = (err) => showToast?.(getErrorMessage(err), 'error');
    // Run one action with the busy flag, a success toast, and a reload of this record and the lists behind it.
    const act = async (fn, message) => {
        setBusy(true);
        try {
            const result = await fn();
            if (message) showToast?.(typeof message === 'function' ? message(result) : message, 'success');
            await load();
            changed();
            return true;
        } catch (err) { toastErr(err); return false; } finally { setBusy(false); }
    };

    const p = data?.profile;
    const active = p?.status === 'active';
    const isLead = p?.tier === TIER.LEAD;
    const tierChanging = Boolean(p) && tier !== p.tier;
    const missedQuarters = (data?.quarters || []).filter((q) => q.status === 'closed' && !q.met);
    const election = data?.earnings?.election;

    const saveProfile = async () => {
        const body = {};
        if (String(p.chapter_id || '') !== chapterId) body.chapter_id = chapterId || '';
        if (termStart && termStart !== toDateInput(p.term_started_at)) body.term_started_at = new Date(`${termStart}T00:00:00Z`).toISOString();
        if (tierChanging) { body.tier = tier; if (overrideCap) body.override_cap = true; }
        if (!Object.keys(body).length) { showToast?.('Nothing to save.', 'info'); return; }
        setSaving(true);
        await act(() => updateChapterLead(p.id, body), tierChanging ? `Now a ${tierLabel(tier)}.` : 'Updated.');
        setSaving(false);
    };

    const regenerate = async () => {
        const ok = await act(() => regenerateLeadCode(p.id), (res) => `New code: ${res.data?.data?.referral_code}. The old code no longer works for new sign-ups.`);
        if (ok) setConfirmCode(false);
    };

    const askAgain = async () => {
        const ok = await act(() => resetLeadElection(p.id), 'They will be asked to choose again the next time they open their dashboard.');
        if (ok) setConfirmReset(false);
    };

    const endRole = async () => {
        setEnding(true);
        const ok = await act(() => endChapterLeadRole(p.id, { reason: endReason.trim() || undefined, outcome: endOutcome }), `${p.tier_label} role ended.`);
        setEnding(false);
        if (ok) setEndOpen(false);
    };

    const waive = async () => {
        if (!waiveStart) return;
        const ok = await act(() => waiveLeadQuarter(p.id, { quarter_start: waiveStart, notes: waiveNote.trim() || undefined }), 'Quarter waived.');
        if (ok) { setWaiveStart(''); setWaiveNote(''); }
    };

    const fixReferral = (id, payload) => act(() => correctReferral(id, payload), 'Referral updated.');

    const toggleVisibility = () => act(
        () => setMemberVisibility(p.user_id, !data.public_hidden),
        data?.public_hidden ? 'They are shown on the public chapter pages again.' : 'They are hidden from the public chapter pages.',
    );

    return (
        <>
        <Modal isOpen onClose={onClose} title={data?.user?.name ? `${data.user.name} — ${data.profile.tier_label}` : 'Chapter team member'} size="xl">
            {error && <ErrorNote>{error}</ErrorNote>}
            {!data && !error && <Spinner />}
            {data && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Summary */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TierPill tier={p.tier} />
                        <Pill tone={active ? 'green' : 'gray'}>{active ? 'Active' : p.status === 'removed' ? 'Removed' : 'Ended'}</Pill>
                        <StandingPill standing={active ? data.standing : 'ended'} misses={data.consecutive_misses} />
                        <span style={{ fontSize: '0.82rem', color: colors.muted }}>
                            {data.user.email}{data.user.organization_name ? ` · ${data.user.organization_name}` : ''}
                            {data.user.country_code ? ` · ${countryName(data.user.country_code)}` : ''}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: colors.muted }}>
                            {isLead ? `Term ${data.term.number} · ${data.term.rate}% · ` : ''}{active ? (isLead ? `ends ${fmtDate(data.term.ends)}` : `since ${fmtDate(p.term_started_at)}`) : `ended ${fmtDate(p.ended_at)}`}
                        </span>
                    </div>
                    {!active && p.end_reason && <ErrorNote>Reason recorded: {p.end_reason}</ErrorNote>}

                    {/* Role, chapter and term */}
                    {active && (
                        <Card>
                            <SectionTitle icon={Save}>Role, chapter and term</SectionTitle>
                            <div style={{ display: 'grid', gap: '0.9rem' }}>
                                <div>
                                    <span style={labelStyle}>Role</span>
                                    <Segmented
                                        ariaLabel="Role"
                                        value={tier}
                                        onChange={setTier}
                                        disabled={saving}
                                        options={[{ value: TIER.LEAD, label: 'Chapter Lead' }, { value: TIER.AMBASSADOR, label: 'Chapter Ambassador' }]}
                                    />
                                    {tierChanging && (
                                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                                            {tier === TIER.LEAD
                                                ? 'Promoting ends the ambassador stint and starts a Chapter Lead stint today, with a new term. The chapter must not already have a lead.'
                                                : 'Moving to Ambassador ends the lead stint and starts an ambassador one. Their tenure is kept, and the chapter becomes leaderless unless someone else is promoted.'}
                                            {tier === TIER.AMBASSADOR && (
                                                <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, color: colors.text, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={overrideCap} onChange={(e) => setOverrideCap(e.target.checked)} style={{ accentColor: colors.primary }} />
                                                    Allow this even if the chapter is at its ambassador limit
                                                </label>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', alignItems: 'end' }}>
                                    <div>
                                        <label htmlFor="ld-chapter" style={labelStyle}>Chapter</label>
                                        <select id="ld-chapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} style={fieldStyle} disabled={saving}>
                                            <option value="">No chapter assigned</option>
                                            {chapters.map((c) => <option key={c.id} value={c.id}>{chapterOption(c, tier, p.chapter_id)}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="ld-term" style={labelStyle}>{isLead ? 'Term start date' : 'Start date'}</label>
                                        <input id="ld-term" type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} style={fieldStyle} disabled={saving} />
                                    </div>
                                    <div>
                                        <Button onClick={saveProfile} disabled={saving || busy}>
                                            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Save changes
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <p style={{ margin: '0.7rem 0 0', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.6 }}>
                                {isLead
                                    ? 'The term start decides which term (and revenue-share rate) applies. Changing it also moves the membership expiry to the end of the current term. A chapter can have only one active lead.'
                                    : 'Ambassadors need a chapter. A chapter takes a limited number of ambassadors, set under Programme rules.'}
                            </p>
                        </Card>
                    )}

                    {/* Earnings */}
                    <Card>
                        <SectionTitle icon={Wallet} right={active && <EarningsPill earnings={election} tier={p.tier} />}>Earnings and employer clearance</SectionTitle>
                        {!isLead ? (
                            <p style={{ margin: 0, fontSize: '0.82rem', color: colors.muted, lineHeight: 1.6 }}>
                                Chapter Ambassadors volunteer and do not earn revenue share or commission.
                                {election?.employer_confirmed ? ' They have confirmed they checked their employment terms.' : ' They have not yet confirmed they checked their employment terms.'}
                            </p>
                        ) : (
                            <>
                                <p style={{ margin: '0 0 0.7rem', fontSize: '0.82rem', color: colors.muted, lineHeight: 1.6 }}>
                                    {election?.choice === 'not_chosen'
                                        ? 'They have not chosen yet. Nothing is paid until they choose to receive.'
                                        : `They chose to ${election.choice === 'receive' ? 'receive earnings' : 'waive earnings and lead as a volunteer'}${election.effective_from ? ` from ${election.effective_from}` : ''}. ${election.employer_confirmed ? 'They confirmed they checked their employment terms.' : ''}`}
                                    {' '}Only they can change this choice. You can ask them to choose again.
                                </p>
                                {active && election?.choice !== 'not_chosen' && (
                                    <Button small tone="ghost" onClick={() => setConfirmReset(true)} disabled={busy}>Ask them to choose again</Button>
                                )}
                            </>
                        )}
                        {data.earnings.history.length > 0 && (
                            <div style={{ marginTop: '0.9rem' }}>
                                <Table minWidth={520} columns={[{ label: 'Effective' }, { label: 'Choice' }, { label: 'Employer checked' }, { label: 'How' }]}>
                                    {data.earnings.history.map((h) => (
                                        <tr key={h.id}>
                                            <Td>{h.effective_from}</Td>
                                            <Td>{CHOICE_LABEL[h.choice] || h.choice}</Td>
                                            <Td muted>{h.employer_confirmed ? 'Yes' : 'No'}</Td>
                                            <Td muted>{SOURCE_LABEL[h.source] || h.source}</Td>
                                        </tr>
                                    ))}
                                </Table>
                            </div>
                        )}
                    </Card>

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
                                                        aria-label="Move this referral to another team member"
                                                        value=""
                                                        onChange={(e) => {
                                                            if (!e.target.value) return;
                                                            if (window.confirm('Move this referral to the selected team member?')) fixReferral(r.id, { action: 'reassign', lead_user_id: Number(e.target.value) });
                                                        }}
                                                        style={{ ...fieldStyle, width: 'auto', padding: '0.28rem 0.5rem', fontSize: '0.74rem' }}
                                                    >
                                                        <option value="">Move to…</option>
                                                        {leadOptions.filter((o) => o.user_id !== p.user_id).map((o) => <option key={o.user_id} value={o.user_id}>{o.name} ({tierLabel(o.tier)})</option>)}
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

                    {/* Public page */}
                    <Card>
                        <SectionTitle icon={data.public_hidden ? EyeOff : Eye}>Public chapter page</SectionTitle>
                        <p style={{ margin: '0 0 0.7rem', fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>
                            {data.public_hidden
                                ? 'This person is hidden from the public chapter pages by an administrator, whatever they have chosen to share.'
                                : 'This person appears on the public chapter pages with the details they chose to share. Hiding them is for conduct or safety reasons and does not tell them why.'}
                        </p>
                        <Button small tone="ghost" onClick={toggleVisibility} disabled={busy}>
                            {data.public_hidden ? <><Eye size={13} /> Show again</> : <><EyeOff size={13} /> Hide from public pages</>}
                        </Button>
                    </Card>

                    {/* End role */}
                    {active && (
                        <Card style={{ borderColor: '#FECACA', background: '#FFFBFB' }}>
                            <SectionTitle icon={UserMinus}>End this {p.tier_label} role</SectionTitle>
                            <p style={{ margin: '0 0 0.8rem', fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>
                                The member becomes a Professional straight away and their referral code stops accepting new sign-ups. Their past posts, referrals and quarter results are kept.
                                {isLead && ' The chapter is left without a lead and the other administrators are told.'}
                                {data.standing === 'review' && <strong style={{ color: colors.red }}> This member has reached the missed-quarter limit and is due for review.</strong>}
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
                message="The current code will stop working for new sign-ups right away. Members already referred stay linked to this person. Make sure they know their code has changed."
                confirmLabel="Generate new code"
            />

            <ConfirmDialog
                isOpen={confirmReset}
                onClose={() => setConfirmReset(false)}
                onConfirm={askAgain}
                loading={busy}
                title="Ask them to choose again?"
                message="Their current choice is cleared and they are asked to choose to receive or waive earnings the next time they open their dashboard. You cannot choose for them."
                confirmLabel="Ask them again"
            />

            <Modal isOpen={endOpen} onClose={() => !ending && setEndOpen(false)} title={`End ${p?.tier_label || 'team'} role`} size="sm">
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
