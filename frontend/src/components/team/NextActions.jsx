import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Users, Mic, MessageSquare, FileText, Inbox, Info } from 'lucide-react';
import { colors } from '../ui/kit.jsx';

const GOAL_ACTION = {
    members:  { icon: Users,         cta: 'Share your link',   tab: 'referrals' },
    podcasts: { icon: Mic,           cta: 'Request to host',   tab: 'requests' },
    posts:    { icon: MessageSquare, cta: 'Write a post',      to: '/community-qna' },
    blogs:    { icon: FileText,      cta: 'Write a blog',      to: '/chapter-lead/blog/new' },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The few things worth doing next, worked out from numbers the dashboard already has:
 * people waiting for a decision, and the goals furthest from done. Nothing here is a nag:
 * when everything is on track it says so.
 */
export const buildNextActions = (data) => {
    const items = [];
    const { quarter, goals, team, profile } = data;
    const isLead = profile.tier === 'lead';

    if (isLead && team?.pending_applications > 0) {
        items.push({
            key: 'applications', icon: Inbox, tone: colors.amber,
            title: `${plural(team.pending_applications, 'ambassador application')} waiting for you`,
            detail: 'Applicants hear back sooner when you decide quickly.',
            cta: 'Review', tab: 'team',
        });
    }

    if (isLead && !profile.chapter) {
        items.push({
            key: 'chapter', icon: Info, tone: colors.blue,
            title: 'You are waiting for a chapter',
            detail: 'An administrator assigns each Chapter Lead to a chapter. Your team tools appear once that is done.',
        });
    }

    if (quarter.partial) {
        items.push({
            key: 'partial', icon: Info, tone: colors.blue,
            title: 'This quarter is not scored for you',
            detail: 'You joined part-way through it. Your goals start counting from the next quarter, but anything you do now still shows up.',
        });
        return items;
    }

    const open = goals
        .filter((g) => !g.met)
        .sort((a, b) => (a.pace === 'behind' ? -1 : 0) - (b.pace === 'behind' ? -1 : 0) || a.percent - b.percent)
        .slice(0, 2);

    open.forEach((g) => {
        const remaining = Math.max(0, g.target - g.counted);
        const act = GOAL_ACTION[g.key];
        if (!act || remaining === 0) return;
        items.push({
            key: `goal-${g.key}`, icon: act.icon, tone: g.pace === 'behind' ? colors.amber : colors.blue,
            title: `${remaining} more ${g.label.toLowerCase()}`,
            detail: `${g.counted} of ${g.target} so far · ${plural(quarter.days_left, 'day')} left in ${quarter.label}`,
            cta: act.cta, tab: act.tab, to: act.to,
        });
    });

    if (!open.length) {
        items.push({
            key: 'all-done', icon: CheckCircle2, tone: colors.green,
            title: `All four goals are met for ${quarter.label}`,
            detail: 'Anything you add now carries your team further.',
        });
    }
    return items;
};

const Action = ({ item, onOpenTab }) => {
    const Icon = item.icon;
    const cta = item.cta && (item.to ? (
        <Link to={item.to} className="kit-focus" style={{ color: colors.primary, fontWeight: 800, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            {item.cta} <ArrowRight size={13} aria-hidden="true" />
        </Link>
    ) : (
        <button
            type="button"
            onClick={() => onOpenTab?.(item.tab)}
            className="kit-focus"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: colors.primary, fontWeight: 800, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}
        >
            {item.cta} <ArrowRight size={13} aria-hidden="true" />
        </button>
    ));

    return (
        <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: `${item.tone}14`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={item.tone} aria-hidden="true" />
            </span>
            <span style={{ flex: '1 1 220px', minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: '0.86rem', color: colors.text }}>{item.title}</span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.5 }}>{item.detail}</span>
            </span>
            {cta}
        </li>
    );
};

const NextActions = ({ data, onOpenTab }) => {
    const items = buildNextActions(data);
    if (!items.length) return null;
    return (
        <ul aria-label="What to do next" style={{ listStyle: 'none', margin: '0.8rem 0 0', padding: 0 }}>
            {items.map((item) => <Action key={item.key} item={item} onOpenTab={onOpenTab} />)}
        </ul>
    );
};

export default NextActions;
