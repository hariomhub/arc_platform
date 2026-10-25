import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Check, X, ExternalLink, ChevronDown, ChevronUp, UserMinus, ShieldCheck, Users, Inbox, Undo2,
} from 'lucide-react';
import { getTeam, decideTeamApplication, removeTeamMember } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { countryName } from '../../utils/countries.js';
import {
    colors, Card, SectionTitle, Pill, Empty, Button, Avatar, Banner, fieldStyle, labelStyle, fmtDate,
} from '../ui/kit.jsx';
import { MiniGoals, StandingPill } from '../admin/chapterLeads/shared.jsx';
import SeatTiles from './SeatTiles.jsx';

const UNDO_MS = 6000;   // after Approve / Decline the person has this long to take it back

/** One waiting application, with the decision buttons. */
const ApplicationCard = ({ app, pending, full, onDecide, onUndo }) => {
    const [open, setOpen] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [note, setNote] = useState('');
    const a = app.applicant;
    const hasMore = app.bio || app.expertise || app.motivation;

    return (
        <div className="kit-enter" style={{ border: `1px solid ${colors.border}`, borderRadius: 14, background: 'white', overflow: 'hidden' }}>
            <div style={{ padding: '0.95rem 1.05rem', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Avatar name={a.name} size={42} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 800, color: colors.text }}>{a.name}</div>
                        <div style={{ fontSize: '0.8rem', color: colors.muted }}>
                            {[a.job_title, a.organization_name].filter(Boolean).join(' · ') || 'No role or organisation given'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: colors.faint, marginTop: 2 }}>
                            {a.country_code ? `${countryName(a.country_code)} · ` : ''}Member since {fmtDate(a.member_since)} · Applied {fmtDate(app.created_at)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {app.employer_confirmed && (
                            <Pill tone="green" title="The applicant confirmed they have checked their employment terms">
                                <ShieldCheck size={11} style={{ verticalAlign: '-1px' }} /> Employer check confirmed
                            </Pill>
                        )}
                        {a.linkedin_url && (
                            <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" className="kit-focus" style={{ fontSize: '0.78rem', fontWeight: 700, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                LinkedIn <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                </div>

                {hasMore && (
                    <div>
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            aria-expanded={open}
                            className="kit-focus"
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: colors.primary, fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}
                        >
                            {open ? <>Hide details <ChevronUp size={14} /></> : <>Read their application <ChevronDown size={14} /></>}
                        </button>
                        {open && (
                            <div className="kit-enter" style={{ marginTop: 8, display: 'grid', gap: 8, fontSize: '0.84rem', color: colors.text, lineHeight: 1.6 }}>
                                {app.motivation && <p style={{ margin: 0 }}><strong>Why they want to join: </strong>{app.motivation}</p>}
                                {app.bio && <p style={{ margin: 0 }}><strong>Background: </strong>{app.bio}</p>}
                                {app.expertise && <p style={{ margin: 0 }}><strong>Areas of expertise: </strong>{app.expertise}</p>}
                            </div>
                        )}
                    </div>
                )}

                {declining && !pending && (
                    <div className="kit-enter">
                        <label htmlFor={`note-${app.id}`} style={labelStyle}>Note to the applicant (optional)</label>
                        <textarea
                            id={`note-${app.id}`}
                            rows={2}
                            maxLength={500}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="For example: we are full this quarter, please apply again next quarter."
                            style={{ ...fieldStyle, resize: 'vertical' }}
                        />
                    </div>
                )}

                {!pending ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!declining ? (
                            <>
                                <Button
                                    tone="success"
                                    onClick={() => onDecide(app, 'approved', null)}
                                    disabled={full}
                                    title={full ? 'Your chapter is full. An administrator can raise the limit or approve this one.' : undefined}
                                >
                                    <Check size={14} /> Approve
                                </Button>
                                <Button tone="ghost" onClick={() => setDeclining(true)}><X size={14} /> Decline</Button>
                            </>
                        ) : (
                            <>
                                <Button tone="danger" onClick={() => { onDecide(app, 'rejected', note.trim() || null); setDeclining(false); }}>
                                    <X size={14} /> Decline application
                                </Button>
                                <Button tone="ghost" onClick={() => { setDeclining(false); setNote(''); }}>Cancel</Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div role="status" style={{ display: 'grid', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: pending.status === 'approved' ? colors.green : colors.red }}>
                                {pending.status === 'approved' ? 'Approving…' : 'Declining…'}
                            </span>
                            <Button small tone="ghost" onClick={() => onUndo(app.id)}><Undo2 size={13} /> Undo</Button>
                        </div>
                        <div style={{ height: 3, background: '#EEF2F7', borderRadius: 100, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: pending.status === 'approved' ? colors.green : colors.red, animation: `kit-countdown ${UNDO_MS}ms linear forwards` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/** One ambassador on the team: how they are doing this quarter, and a way to remove them. */
const AmbassadorRow = ({ member, onRemove }) => {
    const [open, setOpen] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    const confirm = async () => {
        setBusy(true);
        const ok = await onRemove(member, reason.trim());
        if (!ok) setBusy(false);
    };

    return (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 14, background: 'white' }}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="kit-row kit-focus"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '0.8rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', borderRadius: 14 }}
            >
                <Avatar name={member.name} photo={member.photo_url} size={38} />
                <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, color: colors.text }}>{member.name}</span>
                    <span style={{ display: 'block', fontSize: '0.74rem', color: colors.faint }}>
                        Joined {fmtDate(member.joined_at)}
                    </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {member.partial_quarter
                        ? <Pill tone="blue">New this quarter</Pill>
                        : <Pill tone={member.goals_met >= 3 ? 'green' : 'amber'}>{member.goals_met ?? 0} of 4 goals</Pill>}
                    <StandingPill standing={member.standing} misses={member.consecutive_misses} />
                </span>
                {open ? <ChevronUp size={16} color={colors.faint} /> : <ChevronDown size={16} color={colors.faint} />}
            </button>

            {open && (
                <div className="kit-enter" style={{ padding: '0 1rem 1rem', display: 'grid', gap: 12 }}>
                    <MiniGoals goals={member.goals} dim={member.partial_quarter} />
                    {member.partial_quarter && (
                        <span style={{ fontSize: '0.76rem', color: colors.muted }}>Joined part-way through the quarter, so it is not scored.</span>
                    )}
                    {!removing ? (
                        <div>
                            <Button small tone="ghost" onClick={() => setRemoving(true)}><UserMinus size={13} /> Remove from the team</Button>
                        </div>
                    ) : (
                        <div className="kit-enter" style={{ display: 'grid', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '0.8rem' }}>
                            <label htmlFor={`rm-${member.profile_id}`} style={{ ...labelStyle, color: '#991B1B' }}>
                                Why are you removing {member.name.split(' ')[0]}? They will see this reason.
                            </label>
                            <textarea
                                id={`rm-${member.profile_id}`}
                                rows={2}
                                maxLength={500}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                style={{ ...fieldStyle, resize: 'vertical' }}
                            />
                            <span style={{ fontSize: '0.74rem', color: '#7F1D1D', lineHeight: 1.5 }}>
                                They go back to a Professional membership and are told how to contact the council if they think this is a mistake. An administrator is notified.
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button tone="danger" disabled={busy || reason.trim().length < 3} onClick={confirm}>
                                    {busy ? 'Removing…' : 'Remove ambassador'}
                                </Button>
                                <Button tone="ghost" disabled={busy} onClick={() => { setRemoving(false); setReason(''); }}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * "My team" (Chapter Leads only): who is on the team, who is waiting, and the decisions.
 * Approve and Decline take effect after a short undo window, so a mis-click is never final.
 */
const TeamPanel = ({ showToast, onChanged }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [pending, setPending] = useState({});     // application id -> { status, note }
    const timers = useRef({});
    const pendingRef = useRef({});
    pendingRef.current = pending;

    const load = useCallback(async () => {
        try {
            const res = await getTeam();
            setData(res.data?.data || null);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const commit = useCallback(async (id, status, note) => {
        delete timers.current[id];
        try {
            await decideTeamApplication(id, { status, note });
            showToast?.(status === 'approved' ? 'Approved. They are now on your team.' : 'Application declined.', 'success');
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setPending((p) => { const next = { ...p }; delete next[id]; return next; });
            load();
            onChanged?.();
        }
    }, [load, onChanged, showToast]);

    const decide = (app, status, note) => {
        setPending((p) => ({ ...p, [app.id]: { status, note } }));
        timers.current[app.id] = setTimeout(() => commit(app.id, status, note), UNDO_MS);
    };
    const undo = (id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setPending((p) => { const next = { ...p }; delete next[id]; return next; });
    };

    // Leaving the page counts as "go ahead": a decision the person already made is not silently lost.
    useEffect(() => () => {
        Object.entries(timers.current).forEach(([id, t]) => {
            clearTimeout(t);
            const p = pendingRef.current[id];
            if (p) decideTeamApplication(Number(id), { status: p.status, note: p.note }).catch(() => {});
        });
    }, []);

    const remove = async (member, reason) => {
        try {
            await removeTeamMember(member.profile_id, reason);
            showToast?.(`${member.name} has been removed from your team.`, 'success');
            await load();
            onChanged?.();
            return true;
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
            return false;
        }
    };

    if (error) return <Card><Empty>{error}</Empty></Card>;
    if (!data) return <Card><div className="skel" style={{ height: 160 }} /></Card>;
    if (!data.chapter) {
        return (
            <Banner tone="info" icon={Users} title="You are not assigned to a chapter yet">
                An administrator assigns each Chapter Lead to a chapter. Once that is done, your ambassadors and applications will appear here.
            </Banner>
        );
    }

    const { capacity, ambassadors, applications, recent_decisions: recent } = data;
    const waiting = applications;

    return (
        <div style={{ display: 'grid', gap: '1.1rem' }}>
            <Card>
                <SectionTitle icon={Users} right={<Pill tone={capacity.full ? 'amber' : 'blue'}>{capacity.full ? 'Chapter full' : `${capacity.seats_left ?? '—'} seats open`}</Pill>}>
                    {data.chapter.name} team
                </SectionTitle>
                <SeatTiles people={ambassadors} cap={capacity.seat_cap} />
                {capacity.full && (
                    <p style={{ margin: '0.8rem 0 0', fontSize: '0.8rem', color: colors.muted, lineHeight: 1.6 }}>
                        Your chapter has reached its limit. Applications still queue; an administrator can raise the limit.
                    </p>
                )}
            </Card>

            <Card>
                <SectionTitle icon={Inbox} right={waiting.length ? <Pill tone="amber">{waiting.length} waiting</Pill> : null}>
                    Waiting for your decision
                </SectionTitle>
                {waiting.length === 0 ? (
                    <Empty>No one is waiting. New applications for {data.chapter.name} will appear here and in your notifications.</Empty>
                ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                        {waiting.map((app) => (
                            <ApplicationCard key={app.id} app={app} pending={pending[app.id]} full={capacity.full} onDecide={decide} onUndo={undo} />
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <SectionTitle icon={Users}>Your ambassadors</SectionTitle>
                {ambassadors.length === 0 ? (
                    <Empty>You have no ambassadors yet. Share the chapter page so members can apply.</Empty>
                ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                        {ambassadors.map((m) => <AmbassadorRow key={m.profile_id} member={m} onRemove={remove} />)}
                    </div>
                )}
            </Card>

            {recent.length > 0 && (
                <Card>
                    <SectionTitle>Recent decisions</SectionTitle>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {recent.map((r) => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', flexWrap: 'wrap' }}>
                                <Pill tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'gray'}>
                                    {r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Declined' : 'Withdrawn'}
                                </Pill>
                                <span style={{ fontWeight: 700, color: colors.text }}>{r.applicant.name}</span>
                                <span style={{ color: colors.faint }}>{fmtDate(r.decided_at || r.created_at)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default TeamPanel;
