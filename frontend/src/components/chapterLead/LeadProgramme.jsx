import React from 'react';
import { Link } from 'react-router-dom';
import { Target, AlertTriangle, ShieldAlert, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import GoalCard from './GoalCard.jsx';
import EarningsCard from './EarningsCard.jsx';
import PerformancePanel from './PerformancePanel.jsx';
import ReferralPanel from './ReferralPanel.jsx';
import RequestsPanel from './RequestsPanel.jsx';
import QuarterHistory from './QuarterHistory.jsx';
import TeamPanel from '../team/TeamPanel.jsx';
import LeaderboardPanel from '../team/LeaderboardPanel.jsx';
import DisplaySettings from '../team/DisplaySettings.jsx';
import PromotionRequest from '../team/PromotionRequest.jsx';
import NextActions from '../team/NextActions.jsx';
import { AccountCard, QuickLinksCard } from '../dashboard/DashboardCards.jsx';
import { colors, Card, SectionTitle, Pill, fmtDate } from '../ui/kit.jsx';
import { countryName } from '../../utils/countries.js';
import { tierLabel, metaOfUser } from '../../config/roles.js';

/**
 * The chapter programme, as pieces of the ONE member dashboard (/user/dashboard).
 * A Chapter Lead or Chapter Ambassador sees these on top of everything every member sees; nobody
 * else does. All pieces read from the payload of GET /api/chapter-lead/dashboard. The tier
 * (data.profile.tier) decides what is shown: leads get "My team"; ambassadors get no earnings and see
 * their lead. TeamDashboard.jsx lays them out.
 */

const ALL_TABS = [
    { key: 'overview',    label: 'Overview' },
    { key: 'team',        label: 'My team', leadOnly: true },
    { key: 'performance', label: 'Content performance' },
    { key: 'referrals',   label: 'Referrals' },
    { key: 'requests',    label: 'Host requests' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'history',     label: 'Quarter history' },
    { key: 'settings',    label: 'Settings' },
];

export const tabsFor = (tier) => ALL_TABS.filter((t) => !t.leadOnly || tier === 'lead');
export const tabKeysFor = (tier) => tabsFor(tier).map((t) => t.key);

export const chapterLabel = (profile) =>
    profile?.chapter ? `${profile.chapter.name} · ${countryName(profile.chapter.country_code)}` : null;

const earningsStat = (data) => {
    if (data.profile.tier !== 'lead') return { label: 'Role', value: 'Volunteer' };
    const choice = data.earnings?.election?.choice;
    if (choice === 'waive') return { label: 'Earnings', value: 'Waived' };
    if (choice === 'receive') return { label: `Term ${data.term.number} revenue share`, value: `${data.term.rate}%` };
    return { label: 'Earnings', value: 'Not chosen yet' };
};

/** Extra figures for the hero strip at the top of the page. */
export const leadHeroStats = (data) => {
    if (!data) return [];
    const { profile, summary, quarter } = data;
    return [
        { label: 'Chapter', value: profile.chapter ? profile.chapter.name : 'To be assigned' },
        earningsStat(data),
        { label: `Goals met · ${quarter.label}`, value: quarter.partial ? 'Not scored' : `${summary.goals_met}/4` },
    ];
};

/** Extra rows for the "My Account" card. */
export const leadAccountRows = (data) => {
    if (!data) return [];
    const rows = [
        { label: 'Chapter', value: chapterLabel(data.profile) || 'To be assigned by an admin' },
        { label: 'Term', value: data.profile.tier === 'lead' && data.term.rate !== null ? `Term ${data.term.number} · ${data.term.rate}% revenue share` : `Term ${data.term.number}` },
        { label: 'Term ends', value: fmtDate(data.term.ends) },
    ];
    if (data.profile.tier === 'ambassador' && data.team?.lead?.name) rows.splice(1, 0, { label: 'Your lead', value: data.team.lead.name });
    return rows;
};

/** The banner shown when a member has missed quarters. Escalates with the streak. */
export const StandingBanner = ({ standing, tier = 'lead' }) => {
    if (!standing || standing.status === 'ok') return null;
    const n = standing.consecutive_misses;
    const role = tierLabel(tier);
    const reviewer = tier === 'ambassador' ? 'your Chapter Lead' : 'the administrators';
    const cfg = {
        warning: { Icon: AlertTriangle, bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E', title: 'Your last quarter fell below the minimum' },
        at_risk: { Icon: ShieldAlert, bg: '#FFF1F2', bd: '#FECDD3', fg: '#9F1239', title: 'Final warning: one more missed quarter puts your role under review' },
        review:  { Icon: ShieldAlert, bg: '#FEF2F2', bd: '#FCA5A5', fg: '#991B1B', title: `Your ${role} role is under review` },
    }[standing.status];
    if (!cfg) return null;
    const { Icon } = cfg;
    return (
        <div role="status" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: cfg.bg, border: `1.5px solid ${cfg.bd}`, borderRadius: 12, padding: '0.9rem 1.1rem' }}>
            <Icon size={20} color={cfg.fg} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <div style={{ color: cfg.fg }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{cfg.title}</div>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.6, marginTop: 2 }}>
                    You have missed {n} quarter{n === 1 ? '' : 's'} in a row. {standing.limit} consecutive missed quarters may lead to removal from the role, decided by {reviewer}.
                    Meeting the minimum in any quarter resets the count.
                </div>
            </div>
        </div>
    );
};

// Where each goal card leads when you click it.
const GOAL_TAB = { members: 'referrals', podcasts: 'performance', posts: 'performance', blogs: 'performance' };

/** The current quarter: what is left to do, then the four goals. */
export const CurrentQuarter = ({ data, onOpenTab }) => {
    const { quarter, goals, summary } = data;
    return (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
            <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current quarter</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: colors.text }}>
                            {quarter.label} <span style={{ fontSize: '0.84rem', color: colors.muted, fontWeight: 600 }}>· {quarter.days_left} day{quarter.days_left === 1 ? '' : 's'} left</span>
                        </div>
                    </div>
                    {quarter.partial ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.blue, fontSize: '0.84rem', fontWeight: 700 }}>
                            <Info size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
                            Not scored this quarter
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', fontWeight: 700, color: summary.on_course ? colors.green : colors.amber }}>
                            {summary.on_course ? <CheckCircle2 size={18} aria-hidden="true" /> : <Target size={18} aria-hidden="true" />}
                            {summary.goals_met} of 4 goals met so far · {summary.min_goals_met} needed for the quarter to count as met
                        </div>
                    )}
                </div>
                <NextActions data={data} onOpenTab={onOpenTab} />
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
                {goals.map((g) => (
                    <GoalCard key={g.key} goal={g} partialQuarter={quarter.partial} onOpen={onOpenTab ? () => onOpenTab(GOAL_TAB[g.key]) : undefined} />
                ))}
            </div>
        </div>
    );
};

const RulesCard = ({ data }) => {
    const tier = data.profile.tier;
    const rules = data.policy.tiers?.[tier];
    const targets = rules?.targets || data.policy.targets;
    return (
        <Card>
            <SectionTitle>Programme rules</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: colors.muted, lineHeight: 1.75 }}>
                <li>Targets: {targets.members} members, {targets.podcasts} podcasts, {targets.posts_min}-{targets.posts_max} posts, {targets.blogs} blogs per quarter.</li>
                <li>A quarter is met when you reach at least {rules?.min_goals_met ?? data.policy.min_goals_met} of the 4 goals.</li>
                <li>{data.policy.consecutive_miss_limit} missed quarters in a row may lead to removal.</li>
                <li>Terms last {data.policy.term_months} months and continue automatically.</li>
            </ul>
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.74rem' }}>
                <Link to="/terms#chapter-lead" style={{ color: colors.primary, fontWeight: 700 }}>Read the full chapter terms</Link>
            </p>
        </Card>
    );
};

/** The Settings tab: account, earnings choice, what the public chapter page shows, the rules. Two columns that stack on a phone. */
export const LeadSettings = ({ data, user, showToast, onChanged }) => {
    const tier = data.profile.tier;
    const needsLead = tier === 'ambassador' && data.profile.chapter && data.team && data.team.lead === null;
    const role = metaOfUser(user);
    const rows = [
        { label: 'Name', value: user?.name },
        { label: 'Email', value: user?.email },
        { label: 'Role', value: role.label },
        { label: 'Status', value: user?.status ?? 'Active' },
        ...(user?.profile_badge ? [{ label: 'Badge', value: user.profile_badge }] : []),
        ...leadAccountRows(data),
    ];
    const column = { display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 };
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px,100%), 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            <div style={column}>
                <AccountCard rows={rows} />
                <DisplaySettings chapterSlug={data.profile.chapter?.slug} showToast={showToast} />
            </div>
            <div style={column}>
                <EarningsCard earnings={data.earnings} term={data.term} tier={tier} onChanged={onChanged} showToast={showToast} />
                {needsLead && <PromotionRequest chapterName={data.profile.chapter.name} showToast={showToast} />}
                <RulesCard data={data} />
                <QuickLinksCard />
            </div>
        </div>
    );
};

/** Tab bar above the dashboard content. */
export const LeadTabBar = ({ tab, onChange, tier, data }) => {
    const waiting = data?.team?.pending_applications || 0;
    return (
        <Card padded={false}>
            <div role="tablist" aria-label="Dashboard sections" style={{ display: 'flex', gap: 4, padding: '0.35rem 0.8rem 0', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'thin' }}>
                {tabsFor(tier).map((t) => {
                    const on = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={on}
                            type="button"
                            onClick={() => onChange(t.key)}
                            className="kit-focus"
                            style={{
                                padding: '0.55rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                fontSize: '0.84rem', fontWeight: on ? 800 : 600, fontFamily: 'var(--font-sans)',
                                color: on ? colors.primary : colors.muted,
                                borderBottom: `3px solid ${on ? colors.primary : 'transparent'}`,
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            {t.label}
                            {t.key === 'team' && waiting > 0 && <Pill tone="amber">{waiting}</Pill>}
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

/** The programme tabs (everything except "Overview", which is the regular member content). */
export const LeadTabPanel = ({ tab, data, user, showToast, onChanged }) => {
    if (tab === 'team') return <TeamPanel showToast={showToast} onChanged={onChanged} />;
    if (tab === 'performance') return <PerformancePanel showToast={showToast} onChanged={onChanged} />;
    if (tab === 'referrals') return <ReferralPanel code={data.profile.referral_code} showToast={showToast} />;
    if (tab === 'requests') return <RequestsPanel showToast={showToast} />;
    if (tab === 'leaderboard') return <LeaderboardPanel chapterName={data.profile.chapter?.name} />;
    if (tab === 'history') return <QuarterHistory quarters={data.quarters} />;
    if (tab === 'settings') return <LeadSettings data={data} user={user} showToast={showToast} onChanged={onChanged} />;
    return null;
};

/** Shown instead of the programme block when it could not be loaded. */
export const LeadUnavailable = ({ error, noProfile, onRetry }) => (
    <Card style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.88rem', color: colors.text, lineHeight: 1.6, maxWidth: 640 }}>
            <strong>Your chapter programme view is not available right now.</strong>{' '}
            {noProfile
                ? 'Your chapter profile is still being set up. Please contact support@riskaicouncil.org if this does not resolve soon.'
                : (error || 'Something went wrong while loading it.')}
        </div>
        {!noProfile && (
            <button
                type="button"
                onClick={onRetry}
                className="kit-btn kit-focus"
                style={{ padding: '0.55rem 1.2rem', background: colors.primary, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
                <RefreshCw size={13} aria-hidden="true" /> Try again
            </button>
        )}
    </Card>
);
