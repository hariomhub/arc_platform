import React from 'react';
import { Users, Mic, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';
import { colors, Pill } from './ui.jsx';

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

/** One of the four quarterly goal cards. `goal` comes from /chapter-lead/dashboard. */
const GoalCard = ({ goal, partialQuarter = false }) => {
    const meta = META[goal.key] || META.members;
    const Icon = meta.icon;
    const pace = PACE[goal.pace] || PACE.on_track;
    const barColor = partialQuarter ? colors.faint : pace.bar;

    return (
        <div
            style={{
                background: 'white', border: `1px solid ${goal.met && !partialQuarter ? '#A7F3D0' : colors.border}`, borderRadius: 16,
                padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.65rem',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={15} color={colors.primary} />
                    </span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: colors.text }}>{goal.label}</span>
                </div>
                {!partialQuarter && <Pill tone={pace.tone}>{pace.label}</Pill>}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: colors.text, lineHeight: 1 }}>{goal.counted}</span>
                <span style={{ fontSize: '0.9rem', color: colors.muted, fontWeight: 600 }}>
                    / {goal.target}{goal.max ? ` (up to ${goal.max} counted)` : ''}
                </span>
                {goal.met && !partialQuarter && <CheckCircle2 size={17} color={colors.green} style={{ marginLeft: 'auto' }} />}
            </div>

            <div style={{ height: 8, borderRadius: 100, background: '#F1F5F9', overflow: 'hidden' }} aria-hidden="true">
                <div style={{ width: `${goal.percent}%`, height: '100%', background: barColor, borderRadius: 100, transition: 'width 0.4s ease' }} />
            </div>

            {goal.key === 'posts' && goal.actual > goal.counted && (
                <span style={{ fontSize: '0.72rem', color: colors.muted }}>{goal.actual} posted — only the first {goal.max} are credited.</span>
            )}
            <span style={{ fontSize: '0.72rem', color: colors.faint, lineHeight: 1.5 }}>{meta.hint}</span>
        </div>
    );
};

export default GoalCard;
