import React from 'react';
import { Link } from 'react-router-dom';
import { Target, AlertTriangle, ShieldAlert, CheckCircle2, Info, ArrowRight, RefreshCw } from 'lucide-react';
import GoalCard from './GoalCard.jsx';
import EarningsCard from './EarningsCard.jsx';
import PerformancePanel from './PerformancePanel.jsx';
import ReferralPanel from './ReferralPanel.jsx';
import RequestsPanel from './RequestsPanel.jsx';
import QuarterHistory from './QuarterHistory.jsx';
import { colors, Card, SectionTitle, fmtDate } from './ui.jsx';
import { countryName } from '../../utils/countries.js';

/**
 * The Chapter Lead programme, as pieces of the ONE member dashboard (/user/dashboard).
 * A Chapter Lead sees these on top of everything every member sees; nobody else does.
 * All pieces read from the payload of GET /api/chapter-lead/dashboard.
 */

export const LEAD_TABS = [
    { key: 'overview',    label: 'Overview' },
    { key: 'performance', label: 'Content performance' },
    { key: 'referrals',   label: 'Referrals' },
    { key: 'requests',    label: 'Host requests' },
    { key: 'history',     label: 'Quarter history' },
];
export const LEAD_TAB_KEYS = LEAD_TABS.map((t) => t.key);

export const chapterLabel = (profile) =>
    profile?.chapter ? `${profile.chapter.name} · ${countryName(profile.chapter.country_code)}` : null;

/** Extra figures for the hero strip at the top of the page. */
export const leadHeroStats = (data) => {
    if (!data) return [];
    const { profile, term, summary, quarter } = data;
    return [
        { label: 'Chapter', value: profile.chapter ? profile.chapter.name : 'To be assigned' },
        { label: `Term ${term.number} revenue share`, value: `${term.rate}%` },
        { label: `Goals met · ${quarter.label}`, value: quarter.partial ? 'Not scored' : `${summary.goals_met}/4` },
    ];
};

/** Extra rows for the "My Account" card. */
export const leadAccountRows = (data) => {
    if (!data) return [];
    return [
        { label: 'Chapter', value: chapterLabel(data.profile) || 'To be assigned by an admin' },
        { label: 'Term', value: `Term ${data.term.number} · ${data.term.rate}% revenue share` },
        { label: 'Term ends', value: fmtDate(data.term.ends) },
    ];
};

/** The banner shown when a lead has missed quarters. Escalates with the streak. */
export const StandingBanner = ({ standing }) => {
    if (!standing || standing.status === 'ok') return null;
    const n = standing.consecutive_misses;
    const cfg = {
        warning: { Icon: AlertTriangle, bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E', title: 'Your last quarter fell below the minimum' },
        at_risk: { Icon: ShieldAlert, bg: '#FFF1F2', bd: '#FECDD3', fg: '#9F1239', title: 'Final warning: one more missed quarter puts your role under review' },
        review:  { Icon: ShieldAlert, bg: '#FEF2F2', bd: '#FCA5A5', fg: '#991B1B', title: 'Your Chapter Lead role is under review' },
    }[standing.status];
    if (!cfg) return null;
    const { Icon } = cfg;
    return (
        <div role="status" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: cfg.bg, border: `1.5px solid ${cfg.bd}`, borderRadius: 12, padding: '0.9rem 1.1rem' }}>
            <Icon size={20} color={cfg.fg} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ color: cfg.fg }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{cfg.title}</div>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.6, marginTop: 2 }}>
                    You have missed {n} quarter{n === 1 ? '' : 's'} in a row. {standing.limit} consecutive missed quarters may lead to removal from the role.
                    Meeting the minimum in any quarter resets the count.
                </div>
            </div>
        </div>
    );
};

/** Full-width block above the dashboard grid: warning banner, current quarter, the four goals. */
export const LeadProgrammeTop = ({ data }) => {
    const { quarter, goals, summary, standing } = data;
    return (
        <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <StandingBanner standing={standing} />

            <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current quarter</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: colors.text }}>
                        {quarter.label} <span style={{ fontSize: '0.84rem', color: colors.muted, fontWeight: 600 }}>· {quarter.days_left} day{quarter.days_left === 1 ? '' : 's'} left</span>
                    </div>
                </div>
                {quarter.partial ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.blue, fontSize: '0.84rem', fontWeight: 600, maxWidth: 440 }}>
                        <Info size={16} style={{ flexShrink: 0 }} />
                        You joined part-way through this quarter, so it is not scored. Your goals start counting from the next quarter.
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', fontWeight: 700, color: summary.on_course ? colors.green : colors.amber }}>
                        {summary.on_course ? <CheckCircle2 size={18} /> : <Target size={18} />}
                        {summary.goals_met} of 4 goals met so far · {summary.min_goals_met} needed for the quarter to count as met
                    </div>
                )}
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
                {goals.map((g) => <GoalCard key={g.key} goal={g} partialQuarter={quarter.partial} />)}
            </div>
        </div>
    );
};

/** Sidebar cards for leads: referral code, revenue share, programme rules. */
export const LeadSidebar = ({ data, onOpenTab }) => (
    <>
        <Card>
            <SectionTitle icon={Target}>Your referral code</SectionTitle>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '1.35rem', fontWeight: 800, color: colors.primary, letterSpacing: '0.08em' }}>
                {data.profile.referral_code}
            </div>
            <button
                type="button"
                onClick={() => onOpenTab('referrals')}
                style={{ marginTop: 8, padding: 0, background: 'none', border: 'none', color: colors.primary, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}
            >
                Copy link and see referrals <ArrowRight size={13} />
            </button>
        </Card>

        <EarningsCard earnings={data.earnings} term={data.term} />

        <Card>
            <SectionTitle>Programme rules</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: colors.muted, lineHeight: 1.75 }}>
                <li>Targets: {data.policy.targets.members} members, {data.policy.targets.podcasts} podcasts, {data.policy.targets.posts_min}-{data.policy.targets.posts_max} posts, {data.policy.targets.blogs} blogs per quarter.</li>
                <li>A quarter is met when you reach at least {data.policy.min_goals_met} of the 4 goals.</li>
                <li>{data.policy.consecutive_miss_limit} missed quarters in a row may lead to removal.</li>
                <li>Terms last {data.policy.term_months} months and continue automatically.</li>
            </ul>
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.74rem' }}>
                <Link to="/terms#chapter-lead" style={{ color: colors.primary, fontWeight: 700 }}>Read the full Chapter Lead terms</Link>
            </p>
        </Card>
    </>
);

/** Tab bar at the top of the right-hand column (leads only). */
export const LeadTabBar = ({ tab, onChange }) => (
    <Card padded={false}>
        <div role="tablist" aria-label="Dashboard sections" style={{ display: 'flex', gap: 4, padding: '0.35rem 0.8rem 0', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'thin' }}>
            {LEAD_TABS.map((t) => (
                <button
                    key={t.key}
                    role="tab"
                    aria-selected={tab === t.key}
                    type="button"
                    onClick={() => onChange(t.key)}
                    style={{
                        padding: '0.55rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                        fontSize: '0.84rem', fontWeight: tab === t.key ? 800 : 600, fontFamily: 'var(--font-sans)',
                        color: tab === t.key ? colors.primary : colors.muted,
                        borderBottom: `3px solid ${tab === t.key ? colors.primary : 'transparent'}`,
                    }}
                >
                    {t.label}
                </button>
            ))}
        </div>
    </Card>
);

/** The programme tabs (everything except "Overview", which is the regular member content). */
export const LeadTabPanel = ({ tab, data, showToast, onChanged }) => {
    if (tab === 'performance') return <PerformancePanel showToast={showToast} onChanged={onChanged} />;
    if (tab === 'referrals') return <ReferralPanel code={data.profile.referral_code} showToast={showToast} />;
    if (tab === 'requests') return <RequestsPanel showToast={showToast} />;
    if (tab === 'history') return <QuarterHistory quarters={data.quarters} />;
    return null;
};

/** Shown instead of the programme block when it could not be loaded. */
export const LeadUnavailable = ({ error, noProfile, onRetry }) => (
    <Card style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.88rem', color: colors.text, lineHeight: 1.6, maxWidth: 640 }}>
            <strong>Your Chapter Lead programme view is not available right now.</strong>{' '}
            {noProfile
                ? 'Your Chapter Lead profile is still being set up. Please contact support@riskaicouncil.org if this does not resolve soon.'
                : (error || 'Something went wrong while loading it.')}
        </div>
        {!noProfile && (
            <button
                type="button"
                onClick={onRetry}
                style={{ padding: '0.55rem 1.2rem', background: colors.primary, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
                <RefreshCw size={13} /> Try again
            </button>
        )}
    </Card>
);
