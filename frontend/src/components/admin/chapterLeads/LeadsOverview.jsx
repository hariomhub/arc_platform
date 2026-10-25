import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Users, AlertTriangle, Inbox, FileText, CalendarClock, RefreshCw, Loader2, Play, Search, MapPin, ClipboardList, HeartHandshake } from 'lucide-react';
import { getChapterLeads, getChapterLeadSummary, runDailyJob } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, Pill, Empty, Table, Td, Button, Banner, Segmented, StatTile, fmtDate } from '../../chapterLead/ui.jsx';
import { StandingPill, MiniGoals, ErrorNote, Spinner, TierPill, EarningsPill } from './shared.jsx';
import { countryName } from '../../../utils/countries.js';
import { TIER } from '../../../config/roles.js';

const STATUS_FILTERS = [
    { value: 'active', label: 'Active' },
    { value: 'risk', label: 'Needs attention' },
    { value: 'all', label: 'Including ended' },
];
const TIER_FILTERS = [
    { value: 'all', label: 'Everyone' },
    { value: TIER.LEAD, label: 'Chapter Leads' },
    { value: TIER.AMBASSADOR, label: 'Ambassadors' },
];

/** Every chapter-team member with progress, standing and earnings, plus programme-level counts. */
const LeadsOverview = ({ showToast, onOpenLead, onJump, onOpenApprovals, refreshKey }) => {
    const [status, setStatus] = useState('active');
    const [tier, setTier] = useState('all');
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState(null);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const [running, setRunning] = useState(false);

    const load = useCallback(async () => {
        try {
            const [l, s] = await Promise.all([
                getChapterLeads(status === 'all' ? 'all' : 'active', tier === 'all' ? {} : { tier }),
                getChapterLeadSummary(),
            ]);
            setRows(l.data?.data || []);
            setSummary(s.data?.data || null);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [status, tier]);

    useEffect(() => { load(); }, [load, refreshKey]);

    const runJob = async () => {
        setRunning(true);
        try {
            const res = await runDailyJob();
            const d = res.data?.data || {};
            showToast?.(`Done. Quarters closed: ${d.quarters?.closed ?? 0}, terms rolled over: ${d.terms?.rolled ?? 0}.`, 'success');
            await load();
        } catch (err) {
            showToast?.(getErrorMessage(err), 'error');
        } finally {
            setRunning(false);
        }
    };

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (rows || []).filter((m) =>
            (status !== 'risk' || ['at_risk', 'review', 'warning'].includes(m.standing))
            && (!q || [m.name, m.email, m.chapter?.name].some((v) => v && String(v).toLowerCase().includes(q))));
    }, [rows, status, query]);

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {summary?.vacant_chapters > 0 && (
                <Banner
                    tone="warning"
                    icon={MapPin}
                    title={`${summary.vacant_chapters} chapter${summary.vacant_chapters === 1 ? ' has' : 's have'} no Chapter Lead`}
                    action={<Button small tone="ghost" onClick={() => onJump('chapters')}>See chapters</Button>}
                >
                    Chapters without a lead can still take ambassadors, but their applications come to the administrators. Promote an ambassador or approve a lead application to fill them.
                </Banner>
            )}

            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    <StatTile icon={Users} label="Chapter Leads" value={summary.active_leads} tone={colors.blue} />
                    <StatTile icon={HeartHandshake} label="Ambassadors" value={summary.active_ambassadors} tone="#0F766E" />
                    <StatTile icon={ClipboardList} label="Applications waiting" value={summary.pending_applications} tone={colors.amber} onClick={onOpenApprovals} />
                    <StatTile icon={AlertTriangle} label="Needs attention" value={summary.at_risk} tone={colors.red} onClick={() => setStatus('risk')} />
                    <StatTile icon={Inbox} label="Host requests" value={summary.pending_requests} tone={colors.amber} onClick={() => onJump('requests')} />
                    <StatTile icon={FileText} label="Blogs to review" value={summary.pending_blogs} tone={colors.amber} onClick={() => onJump('blogs')} />
                    <StatTile icon={CalendarClock} label="Terms changing in 60 days" value={summary.terms_changing_soon} onClick={() => onJump('terms')} />
                </div>
            )}

            <Card padded={false}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '0.8rem 1rem', borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Segmented ariaLabel="Role" options={TIER_FILTERS} value={tier} onChange={setTier} />
                        <Segmented ariaLabel="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
                        <div style={{ position: 'relative' }}>
                            <Search size={14} color={colors.faint} aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="search"
                                aria-label="Search by name, email or chapter"
                                placeholder="Search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="kit-focus"
                                style={{ padding: '0.45rem 0.7rem 0.45rem 1.9rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.82rem', width: 180, fontFamily: 'var(--font-sans)' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button small tone="ghost" onClick={load}><RefreshCw size={13} /> Refresh</Button>
                        <Button small tone="ghost" onClick={runJob} disabled={running} title="Closes finished quarters, rolls terms over and sends nudges. Safe to run any time.">
                            {running ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} />} Run daily job now
                        </Button>
                    </div>
                </div>

                {error && <div style={{ padding: '1rem' }}><ErrorNote>{error}</ErrorNote></div>}
                {!rows && !error && <Spinner />}
                {rows && shown.length === 0 && <Empty>{status === 'risk' ? 'Nobody needs attention right now.' : 'No one matches.'}</Empty>}
                {rows && shown.length > 0 && (
                    <Table
                        minWidth={1020}
                        columns={[
                            { label: 'Member' }, { label: 'Role' }, { label: 'Chapter' }, { label: 'Term / since' },
                            { label: 'This quarter' }, { label: 'Goals', align: 'center' }, { label: 'Standing' }, { label: 'Earnings' }, { label: 'Code' },
                        ]}
                    >
                        {shown.map((m) => {
                            const active = m.status === 'active';
                            const isLead = m.tier === TIER.LEAD;
                            return (
                                <tr key={m.id} onClick={() => onOpenLead(m.id)} style={{ cursor: 'pointer' }} className="cl-row">
                                    <Td>
                                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: colors.faint }}>{m.email}</div>
                                    </Td>
                                    <Td><TierPill tier={m.tier} /></Td>
                                    <Td muted>
                                        {m.chapter ? `${m.chapter.name} (${countryName(m.chapter.country_code)})` : <Pill tone="amber">No chapter</Pill>}
                                    </Td>
                                    <Td>
                                        {!active && <span style={{ color: colors.faint }}>ended {fmtDate(m.ended_at)}</span>}
                                        {active && isLead && <>Term {m.term.number} · {m.term.rate}%<div style={{ fontSize: '0.7rem', color: colors.faint }}>ends {fmtDate(m.term.ends)}</div></>}
                                        {active && !isLead && <>Since {fmtDate(m.term_started_at || m.approved_at)}</>}
                                    </Td>
                                    <Td>
                                        {active
                                            ? <><MiniGoals goals={m.goals} dim={m.partial_quarter} />{m.partial_quarter && <div style={{ fontSize: '0.68rem', color: colors.faint, marginTop: 3 }}>Not scored (joined mid-quarter)</div>}</>
                                            : '—'}
                                    </Td>
                                    <Td align="center">{active && !m.partial_quarter ? `${m.goals_met}/4` : '—'}</Td>
                                    <Td><StandingPill standing={m.standing} misses={m.consecutive_misses} /></Td>
                                    <Td>{active ? <EarningsPill earnings={m.earnings} tier={m.tier} /> : '—'}</Td>
                                    <Td muted style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.76rem' }}>{m.referral_code}</Td>
                                </tr>
                            );
                        })}
                    </Table>
                )}
            </Card>
            <style>{`.cl-row:hover td { background: #F8FAFC; }`}</style>
        </div>
    );
};

export default LeadsOverview;
