import React, { useEffect, useState, useCallback } from 'react';
import { Crown, HeartHandshake, ClipboardList, ArrowUpCircle } from 'lucide-react';
import Modal from '../../common/Modal.jsx';
import ConfirmDialog from '../../common/ConfirmDialog.jsx';
import SeatTiles from '../../team/SeatTiles.jsx';
import { getChapterTeam, updateChapterLead } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { countryName } from '../../../utils/countries.js';
import { colors, Card, SectionTitle, Pill, Empty, Table, Td, Button, Banner, Avatar, fmtDate } from '../../chapterLead/ui.jsx';
import { ErrorNote, Spinner, StandingPill, EarningsPill } from './shared.jsx';
import { TIER } from '../../../config/roles.js';

/**
 * One chapter's whole team for an administrator: the lead (or the empty chair), every ambassador with
 * how they are doing, who is waiting to join, and the way to fill the lead's seat from the ambassadors.
 */
const ChapterTeamModal = ({ chapterId, onClose, onOpenMember, onOpenApprovals, onChanged, showToast }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [promote, setPromote] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await getChapterTeam(chapterId);
            setData(res.data?.data || null);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [chapterId]);

    useEffect(() => { load(); }, [load]);

    const doPromote = async () => {
        setBusy(true);
        try {
            await updateChapterLead(promote.id, { tier: TIER.LEAD });
            showToast?.(`${promote.name} is now the Chapter Lead.`, 'success');
            setPromote(null);
            await load();
            onChanged?.();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setBusy(false);
        }
    };

    const chapter = data?.chapter;
    const lead = data?.lead;

    return (
        <>
            <Modal isOpen onClose={onClose} title={chapter ? `${chapter.name} · ${countryName(chapter.country_code)}` : 'Chapter team'} size="xl">
                {error && <ErrorNote>{error}</ErrorNote>}
                {!data && !error && <Spinner />}
                {data && (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {!lead && (
                            <Banner tone="warning" title="This chapter has no Chapter Lead">
                                {data.ambassadors.length > 0
                                    ? 'Promote one of the ambassadors below, or approve a lead application. Until then, new applications come to the administrators.'
                                    : 'Approve a Chapter Lead application, or assign someone from Manage Users.'}
                            </Banner>
                        )}

                        <Card>
                            <SectionTitle icon={Crown}>Chapter Lead</SectionTitle>
                            {lead ? (
                                <button
                                    type="button"
                                    onClick={() => onOpenMember(lead.id)}
                                    className="kit-lift kit-focus"
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: 'white', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '0.7rem 0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                                >
                                    <Avatar name={lead.name} photo={lead.photo_url} size={42} tone={colors.blue} />
                                    <span style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ display: 'block', fontWeight: 800, color: colors.text }}>{lead.name}</span>
                                        <span style={{ display: 'block', fontSize: '0.76rem', color: colors.muted }}>Term {lead.term.number} · ends {fmtDate(lead.term.ends)}</span>
                                    </span>
                                    <EarningsPill earnings={lead.earnings} tier={lead.tier} />
                                    <StandingPill standing={lead.standing} misses={lead.consecutive_misses} />
                                </button>
                            ) : <Empty>Vacant</Empty>}
                        </Card>

                        <Card>
                            <SectionTitle
                                icon={HeartHandshake}
                                right={<Pill tone={data.capacity.full ? 'amber' : 'gray'}>{data.capacity.ambassadors}{data.capacity.seat_cap === null ? '' : ` of ${data.capacity.seat_cap}`} seats</Pill>}
                            >
                                Chapter Ambassadors
                            </SectionTitle>
                            <div style={{ marginBottom: '0.9rem' }}><SeatTiles people={data.ambassadors} cap={data.capacity.seat_cap} /></div>
                            {data.ambassadors.length === 0 ? <Empty>No ambassadors yet.</Empty> : (
                                <Table
                                    minWidth={720}
                                    columns={[{ label: 'Ambassador' }, { label: 'Tenure' }, { label: 'Quarters met' }, { label: 'This quarter', align: 'center' }, { label: 'Standing' }, { label: '' }]}
                                >
                                    {data.ambassadors.map((a) => (
                                        <tr key={a.id}>
                                            <Td>
                                                <button type="button" onClick={() => onOpenMember(a.id)} className="kit-focus" style={{ all: 'unset', cursor: 'pointer', fontWeight: 700, color: colors.primary }}>{a.name}</button>
                                                <div style={{ fontSize: '0.72rem', color: colors.faint }}>{a.email}</div>
                                            </Td>
                                            <Td muted>{a.tenure_months === null ? '—' : `${a.tenure_months} month${a.tenure_months === 1 ? '' : 's'}`}</Td>
                                            <Td muted>{a.quarters_scored ? `${a.quarters_met} of ${a.quarters_scored}` : '—'}</Td>
                                            <Td align="center">{a.partial_quarter ? '—' : `${a.goals_met ?? 0}/4`}</Td>
                                            <Td><StandingPill standing={a.standing} misses={a.consecutive_misses} /></Td>
                                            <Td align="right">
                                                {!lead && <Button small tone="ghost" onClick={() => setPromote(a)}><ArrowUpCircle size={13} /> Make lead</Button>}
                                            </Td>
                                        </tr>
                                    ))}
                                </Table>
                            )}
                            {lead && data.ambassadors.length > 0 && (
                                <p style={{ margin: '0.7rem 0 0', fontSize: '0.76rem', color: colors.muted }}>
                                    To change the lead, open the current lead and move them to Ambassador or end their role first. A chapter has one Chapter Lead at a time.
                                </p>
                            )}
                        </Card>

                        <Card>
                            <SectionTitle
                                icon={ClipboardList}
                                right={data.applications.length > 0 && onOpenApprovals ? <Button small tone="ghost" onClick={onOpenApprovals}>Review in Member Approvals</Button> : null}
                            >
                                Waiting to join
                            </SectionTitle>
                            {data.applications.length === 0 ? <Empty>Nobody is waiting.</Empty> : (
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {data.applications.map((a) => (
                                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '0.6rem 0.8rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: colors.text }}>{a.applicant.name}</div>
                                                <div style={{ fontSize: '0.74rem', color: colors.muted }}>
                                                    {[a.applicant.job_title, a.applicant.organization_name].filter(Boolean).join(' at ') || 'No role given'} · applied {fmtDate(a.created_at)}
                                                </div>
                                            </div>
                                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                <Pill tone={a.kind === 'promotion_request' ? 'purple' : 'blue'}>{a.kind === 'promotion_request' ? 'Wants to lead' : 'New ambassador'}</Pill>
                                                <Pill tone="gray">{a.routed_to === 'admin' ? 'With administrators' : 'With the lead'}</Pill>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={Boolean(promote)}
                onClose={() => setPromote(null)}
                onConfirm={doPromote}
                loading={busy}
                title={`Make ${promote?.name || 'this ambassador'} the Chapter Lead?`}
                message="Their ambassador role ends and a Chapter Lead role starts today, with a new term. Their history stays on record. They will be asked to choose whether to receive or waive earnings."
                confirmLabel="Make Chapter Lead"
            />
        </>
    );
};

export default ChapterTeamModal;
