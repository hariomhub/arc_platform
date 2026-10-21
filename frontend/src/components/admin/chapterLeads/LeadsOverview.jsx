import React, { useEffect, useState, useCallback } from 'react';
import { Users, AlertTriangle, Inbox, FileText, CalendarClock, RefreshCw, Loader2, Play } from 'lucide-react';
import { getChapterLeads, getChapterLeadSummary, runDailyJob } from '../../../api/adminChapterLeads.js';
import { getErrorMessage } from '../../../utils/apiHelpers.js';
import { colors, Card, Pill, Empty, Table, Td, Button, fmtDate } from '../../chapterLead/ui.jsx';
import { StandingPill, MiniGoals, ErrorNote, Spinner } from './shared.jsx';
import { countryName } from '../../../utils/countries.js';

const FILTERS = [
    { key: 'active', label: 'Active' },
    { key: 'risk', label: 'Needs attention' },
    { key: 'all', label: 'Including ended' },
];

const Tile = ({ icon: Icon, label, value, tone = colors.primary, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        style={{
            textAlign: 'left', background: 'white', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '0.85rem 1rem',
            cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 12,
        }}
    >
        <span style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={17} color={tone} />
        </span>
        <span>
            <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: colors.text, lineHeight: 1.1 }}>{value ?? '—'}</span>
            <span style={{ display: 'block', fontSize: '0.72rem', color: colors.muted, fontWeight: 600 }}>{label}</span>
        </span>
    </button>
);

/** Every lead with progress, standing and term, plus programme-level counts. */
const LeadsOverview = ({ showToast, onOpenLead, onJump, refreshKey }) => {
    const [filter, setFilter] = useState('active');
    const [leads, setLeads] = useState(null);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const [running, setRunning] = useState(false);

    const load = useCallback(async () => {
        try {
            const [l, s] = await Promise.all([
                getChapterLeads(filter === 'all' ? 'all' : 'active'),
                getChapterLeadSummary(),
            ]);
            setLeads(l.data?.data || []);
            setSummary(s.data?.data || null);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [filter]);

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

    const shown = (leads || []).filter((l) => filter !== 'risk' || ['at_risk', 'review', 'warning'].includes(l.standing));

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    <Tile icon={Users} label="Active Chapter Leads" value={summary.active_leads} />
                    <Tile icon={AlertTriangle} label="Needs attention" value={summary.at_risk} tone={colors.red} onClick={() => setFilter('risk')} />
                    <Tile icon={Inbox} label="Pending host requests" value={summary.pending_requests} tone={colors.amber} onClick={() => onJump('requests')} />
                    <Tile icon={FileText} label="Blogs to review" value={summary.pending_blogs} tone={colors.amber} onClick={() => onJump('blogs')} />
                    <Tile icon={CalendarClock} label="Terms changing in 60 days" value={summary.terms_changing_soon} onClick={() => onJump('terms')} />
                </div>
            )}

            <Card padded={false}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '0.8rem 1rem', borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '0.35rem 0.9rem', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                    border: `1.5px solid ${filter === f.key ? colors.primary : colors.border}`,
                                    background: filter === f.key ? '#EEF4FF' : 'white', color: filter === f.key ? colors.primary : colors.muted,
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button small tone="ghost" onClick={load}><RefreshCw size={13} /> Refresh</Button>
                        <Button small tone="ghost" onClick={runJob} disabled={running} title="Closes finished quarters, rolls terms over and sends nudges. Safe to run any time.">
                            {running ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} />} Run daily job now
                        </Button>
                    </div>
                </div>

                {error && <div style={{ padding: '1rem' }}><ErrorNote>{error}</ErrorNote></div>}
                {!leads && !error && <Spinner />}
                {leads && shown.length === 0 && <Empty>{filter === 'risk' ? 'No leads need attention right now.' : 'No Chapter Leads to show.'}</Empty>}
                {leads && shown.length > 0 && (
                    <Table
                        minWidth={900}
                        columns={[
                            { label: 'Lead' }, { label: 'Chapter' }, { label: 'Term' },
                            { label: 'This quarter' }, { label: 'Goals', align: 'center' }, { label: 'Standing' }, { label: 'Code' },
                        ]}
                    >
                        {shown.map((l) => (
                            <tr key={l.id} onClick={() => onOpenLead(l.id)} style={{ cursor: 'pointer' }} className="cl-row">
                                <Td>
                                    <div style={{ fontWeight: 700 }}>{l.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: colors.faint }}>{l.email}</div>
                                </Td>
                                <Td muted>
                                    {l.chapter ? `${l.chapter.name} (${countryName(l.chapter.country_code)})` : <Pill tone="amber">No chapter</Pill>}
                                </Td>
                                <Td>
                                    {l.status === 'active'
                                        ? <>Term {l.term.number} · {l.term.rate}%<div style={{ fontSize: '0.7rem', color: colors.faint }}>ends {fmtDate(l.term.ends)}</div></>
                                        : <span style={{ color: colors.faint }}>ended {fmtDate(l.ended_at)}</span>}
                                </Td>
                                <Td>
                                    {l.status === 'active'
                                        ? <><MiniGoals goals={l.goals} dim={l.partial_quarter} />{l.partial_quarter && <div style={{ fontSize: '0.68rem', color: colors.faint, marginTop: 3 }}>Not scored (joined mid-quarter)</div>}</>
                                        : '—'}
                                </Td>
                                <Td align="center">{l.status === 'active' && !l.partial_quarter ? `${l.goals_met}/4` : '—'}</Td>
                                <Td><StandingPill standing={l.standing} misses={l.consecutive_misses} /></Td>
                                <Td muted style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.76rem' }}>{l.referral_code}</Td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>
            <style>{`.cl-row:hover td { background: #F8FAFC; }`}</style>
        </div>
    );
};

export default LeadsOverview;
