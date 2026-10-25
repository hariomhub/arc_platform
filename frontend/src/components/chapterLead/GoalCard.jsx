import React from 'react';
import { Users, Mic, MessageSquare, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { colors, Pill } from '../ui/kit.jsx';
import { ProgressRing, useCountUp } from '../ui/motion.jsx';

const META = {
    members:  { icon: Users,         hint: 'Counts when an admin approves a member who signed up with your code.' },
    podcasts: { icon: Mic,           hint: 'Counts once an admin marks the podcast as conducted. Co-hosts count too.' },
    posts:    { icon: MessageSquare, hint: 'Counts your visible posts (memes and polls do not count).' },
    blogs:    { icon: FileText,      hint: 'Counts once an admin has reviewed and published the blog.' },
};

const PACE = {
    done:     { tone: 'green', label: 'Goal met',  bar: colors.green },
    on_track: { tone: 'blue',  label: 'On track',  bar: colors.blue },
    behind:   { tone: 'amber', label: 'Behind pace', bar: colors.amber },
};

/**
 * One of the four quarterly goal cards. `goal` comes from /chapter-lead/dashboard.
 * The ring fills to the current progress; when `onOpen` is given the whole card is a button that
 * opens the items behind the number (the members who joined, the posts counted, and so on).
 */
const GoalCard = ({ goal, partialQuarter = false, onOpen }) => {
    const meta = META[goal.key] || META.members;
    const Icon = meta.icon;
    const pace = PACE[goal.pace] || PACE.on_track;
    const ringColor = partialQuarter ? colors.faint : pace.bar;
    const shown = useCountUp(goal.counted);

    const body = (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={14} color={colors.primary} aria-hidden="true" />
                    </span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: colors.text }}>{goal.label}</span>
                </div>
                {!partialQuarter && <Pill tone={pace.tone}>{pace.label}</Pill>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                <ProgressRing percent={goal.percent} color={ringColor} size={72} stroke={8} label={`${goal.label}: ${goal.counted} of ${goal.target}`}>
                    {goal.met && !partialQuarter
                        ? <CheckCircle2 size={22} color={colors.green} aria-hidden="true" />
                        : <span style={{ fontSize: '0.8rem', fontWeight: 800, color: colors.text }}>{goal.percent}%</span>}
                </ProgressRing>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: '1.9rem', fontWeight: 800, color: colors.text, lineHeight: 1 }}>{shown}</span>
                        <span style={{ fontSize: '0.88rem', color: colors.muted, fontWeight: 600 }}>
                            / {goal.target}
                        </span>
                    </div>
                    {goal.max ? <div style={{ fontSize: '0.7rem', color: colors.faint, marginTop: 2 }}>up to {goal.max} counted</div> : null}
                    {goal.breakdown && (
                        <div style={{ fontSize: '0.74rem', color: colors.muted, marginTop: 4 }}>
                            You {goal.breakdown.you} · Team {goal.breakdown.team}
                        </div>
                    )}
                </div>
            </div>

            {goal.key === 'posts' && goal.actual > goal.counted && (
                <span style={{ fontSize: '0.72rem', color: colors.muted }}>{goal.actual} posted — only the first {goal.max} are credited.</span>
            )}
            <span style={{ fontSize: '0.72rem', color: colors.faint, lineHeight: 1.5 }}>{meta.hint}</span>
            {onOpen && (
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 'auto' }}>
                    See what counts <ChevronRight size={13} aria-hidden="true" />
                </span>
            )}
        </>
    );

    const style = {
        background: 'white', border: `1px solid ${goal.met && !partialQuarter ? '#A7F3D0' : colors.border}`, borderRadius: 16,
        padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.7rem',
        textAlign: 'left', fontFamily: 'var(--font-sans)', alignItems: 'flex-start',
    };

    return onOpen
        ? <button type="button" onClick={onOpen} className="kit-lift kit-focus" style={{ ...style, cursor: 'pointer', width: '100%' }}>{body}</button>
        : <div style={style}>{body}</div>;
};

export default GoalCard;
