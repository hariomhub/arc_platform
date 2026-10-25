import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Info } from 'lucide-react';
import { getLeaderboard } from '../../api/chapterLead.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import {
    colors, Card, SectionTitle, Pill, Empty, Avatar, Segmented, quarterLabel, fieldStyle,
} from '../ui/kit.jsx';
import { Meter, useCountUp } from '../ui/motion.jsx';
import { tierLabel } from '../../config/roles.js';

// Restrained series colours for "who produced what": one per person, repeating after eight.
const SERIES = ['#003366', '#0369A1', '#0F766E', '#B45309', '#6D28D9', '#475569', '#9F1239', '#4D7C0F'];

const RankMark = ({ rank }) => {
    const top = rank !== null && rank <= 3;
    return (
        <span
            aria-label={rank === null ? 'Not ranked yet' : `Rank ${rank}`}
            style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800,
                background: top ? colors.primary : '#EEF2F7', color: top ? 'white' : colors.muted,
            }}
        >
            {rank === null ? '–' : rank}
        </span>
    );
};

const ScoreBar = ({ score }) => {
    const shown = useCountUp(score ?? 0);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140, flex: '0 1 220px' }}>
            <div style={{ flex: 1 }}><Meter percent={score ?? 0} height={7} label={`Score ${score ?? 0} out of 100`} /></div>
            <span style={{ width: 28, textAlign: 'right', fontWeight: 800, fontSize: '0.88rem', color: colors.text }}>{shown}</span>
        </div>
    );
};

const PersonRow = ({ entry }) => (
    <div
        className="kit-row"
        style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0.75rem', borderRadius: 12, flexWrap: 'wrap',
            background: entry.is_you ? '#EEF4FF' : 'transparent', border: entry.is_you ? '1px solid #BFDBFE' : '1px solid transparent',
        }}
    >
        <RankMark rank={entry.rank ?? null} />
        <Avatar name={entry.name} photo={entry.photo_url} size={34} />
        <div style={{ flex: '1 1 150px', minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: colors.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {entry.name}
                {entry.is_you && <Pill tone="blue">You</Pill>}
            </div>
            <div style={{ fontSize: '0.72rem', color: colors.faint }}>{tierLabel(entry.tier)}</div>
        </div>
        {entry.partial
            ? <Pill tone="gray" title="Joined part-way through this quarter, so it is not scored">New this quarter</Pill>
            : (
                <>
                    <span style={{ fontSize: '0.78rem', color: colors.muted, fontWeight: 700 }}>{entry.goals_met} of 4 goals</span>
                    <ScoreBar score={entry.score} />
                </>
            )}
    </div>
);

/** Who produced what this quarter, as one stacked bar per goal. Shares, not a ranking. */
const Breakdown = ({ rows }) => (
    <div style={{ display: 'grid', gap: 14 }}>
        {rows.map((row) => (
            <div key={row.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 5 }}>
                    <strong style={{ color: colors.text }}>{row.label}</strong>
                    <span style={{ color: colors.muted }}>{row.total} in total</span>
                </div>
                {row.total === 0 ? (
                    <div style={{ height: 10, borderRadius: 100, background: '#EEF2F7' }} aria-label="Nothing yet" />
                ) : (
                    <>
                        <div style={{ display: 'flex', height: 10, borderRadius: 100, overflow: 'hidden', background: '#EEF2F7' }}>
                            {row.parts.map((p, i) => (
                                <div key={p.profile_id} title={`${p.name}: ${p.value} (${p.share}%)`} style={{ width: `${(p.value / row.total) * 100}%`, background: SERIES[i % SERIES.length] }} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 6 }}>
                            {row.parts.map((p, i) => (
                                <span key={p.profile_id} style={{ fontSize: '0.74rem', color: colors.muted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: SERIES[i % SERIES.length] }} aria-hidden="true" />
                                    {p.name}: {p.value} ({p.share}%)
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </div>
        ))}
    </div>
);

const HowItWorks = () => (
    <details style={{ fontSize: '0.8rem', color: colors.muted, lineHeight: 1.65 }}>
        <summary className="kit-focus" style={{ cursor: 'pointer', fontWeight: 700, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} aria-hidden="true" /> How the score works
        </summary>
        <p style={{ margin: '0.5rem 0 0' }}>
            Each person's score is the average of their four quarterly goals, each measured against their own targets and capped at 100%.
            That keeps it fair between Chapter Leads and Chapter Ambassadors, and extra posting beyond a goal does not raise it.
            Only your team and the administrators see this board, and anyone can hide their name in <strong>On your chapter page</strong>.
        </p>
    </details>
);

/** Leaderboard (team and chapters) and the contribution breakdown, for team members and admins. */
const LeaderboardPanel = ({ chapterName }) => {
    const [scope, setScope] = useState('team');
    const [quarter, setQuarter] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setData(null);
        setError('');
        try {
            const res = await getLeaderboard(scope === 'chapters' ? { scope: 'chapters' } : (quarter ? { quarter } : {}));
            setData(res.data?.data || null);
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [scope, quarter]);
    useEffect(() => { load(); }, [load]);

    const quarters = data?.quarters || [];

    return (
        <div style={{ display: 'grid', gap: '1.1rem' }}>
            <Card>
                <SectionTitle
                    icon={Trophy}
                    right={(
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Segmented
                                ariaLabel="Leaderboard"
                                value={scope}
                                onChange={(v) => { setScope(v); setQuarter(''); }}
                                options={[{ value: 'team', label: chapterName ? `${chapterName} team` : 'My chapter' }, { value: 'chapters', label: 'All chapters' }]}
                            />
                            {scope === 'team' && quarters.length > 0 && (
                                <select
                                    aria-label="Quarter"
                                    value={quarter}
                                    onChange={(e) => setQuarter(e.target.value)}
                                    style={{ ...fieldStyle, width: 'auto', padding: '0.4rem 0.6rem' }}
                                >
                                    <option value="">{data?.quarter || 'This quarter'} (live)</option>
                                    {quarters.map((q) => <option key={q} value={q}>{quarterLabel(q)}</option>)}
                                </select>
                            )}
                        </div>
                    )}
                >
                    Leaderboard
                </SectionTitle>

                {error && <Empty>{error}</Empty>}
                {!data && !error && <div className="skel" style={{ height: 200 }} />}

                {data && scope === 'team' && (
                    data.entries.length === 0
                        ? <Empty>No one on this team has been scored yet.</Empty>
                        : <div style={{ display: 'grid', gap: 4 }}>{data.entries.map((e) => <PersonRow key={e.profile_id} entry={e} />)}</div>
                )}

                {data && scope === 'chapters' && (
                    data.entries.length === 0
                        ? <Empty>No chapter has a scored team yet.</Empty>
                        : (
                            <div style={{ display: 'grid', gap: 4 }}>
                                {data.entries.map((c) => (
                                    <div
                                        key={c.chapter_id}
                                        className="kit-row"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0.75rem', borderRadius: 12, flexWrap: 'wrap',
                                            background: c.is_yours ? '#EEF4FF' : 'transparent', border: c.is_yours ? '1px solid #BFDBFE' : '1px solid transparent',
                                        }}
                                    >
                                        <RankMark rank={c.rank ?? null} />
                                        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, color: colors.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                {c.slug ? <Link to={`/chapters/${c.slug}`} style={{ color: colors.text }}>{c.name}</Link> : c.name}
                                                {c.is_yours && <Pill tone="blue">Your chapter</Pill>}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: colors.faint }}>
                                                {c.team_size} on the team{c.has_lead ? '' : ' · no Chapter Lead yet'}
                                            </div>
                                        </div>
                                        {c.score === null ? <Pill tone="gray">New this quarter</Pill> : <ScoreBar score={c.score} />}
                                    </div>
                                ))}
                            </div>
                        )
                )}

                <div style={{ marginTop: '1rem' }}><HowItWorks /></div>
            </Card>

            {data && scope === 'team' && !quarter && data.breakdown && (
                <Card>
                    <SectionTitle>Who contributed what this quarter</SectionTitle>
                    <Breakdown rows={data.breakdown} />
                </Card>
            )}
        </div>
    );
};

export default LeaderboardPanel;
