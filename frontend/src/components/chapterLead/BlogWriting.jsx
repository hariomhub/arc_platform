import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Lightbulb, Check, Feather, Quote, Hash, BookOpenText, PenLine, Sparkles } from 'lucide-react';
import { colors } from './ui.jsx';
import { TIPS, WRITING_PROMPTS } from './blogText.js';

/** Small pieces that make the blog editor feel alive: progress, goal, checklist, journey, tips, header art. */

const reducedMotion = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// Writing symbols that drift behind the header. The editor adds the `writing` class to the header while
// someone is typing, and the CSS then brightens them. Decorative only, so hidden from assistive tech.
const GLYPHS = [
    { Icon: Feather,      size: 46, left: '56%', top: '16%', dur: '8s',  delay: '0s' },
    { Icon: PenLine,      size: 30, left: '41%', top: '20%', dur: '10s', delay: '-3s' },
    { Icon: Quote,        size: 34, left: '66%', top: '58%', dur: '10s', delay: '-2s' },
    { Icon: Hash,         size: 28, left: '47%', top: '62%', dur: '9s',  delay: '-4s' },
    { Icon: Lightbulb,    size: 32, left: '75%', top: '14%', dur: '11s', delay: '-1s' },
    { Icon: BookOpenText, size: 40, left: '90%', top: '22%', dur: '12s', delay: '-5s' },
];
const SHEETS = [
    { left: '60%', top: '8%',  rot: '8deg',  dur: '11s', delay: '0s' },
    { left: '77%', top: '46%', rot: '-9deg', dur: '13s', delay: '-4s' },
];

export const HeroArt = () => (
    <div className="be-art" aria-hidden="true">
        {SHEETS.map((s) => (
            <div key={s.left} className="be-sheet" style={{ left: s.left, top: s.top, '--r': s.rot, animationDuration: s.dur, animationDelay: s.delay }} />
        ))}
        <svg className="be-trail" width="220" height="48" viewBox="0 0 220 48" style={{ position: 'absolute', left: '50%', top: '70%' }}>
            <path d="M0 28 C 30 4, 60 52, 95 26 S 160 4, 220 24" fill="none" strokeWidth="2" strokeLinecap="round" stroke="rgba(255,255,255,0.2)" />
        </svg>
        {GLYPHS.map(({ Icon, size, left, top, dur, delay }) => (
            <Icon key={left + top} className="be-glyph" size={size} strokeWidth={1.6} style={{ left, top, animationDuration: dur, animationDelay: delay }} />
        ))}
    </div>
);

/** A hand-drawn amber underline that draws itself once under the page title. */
export const InkUnderline = () => (
    <svg className="be-underline" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: -9, width: '100%', height: 10 }}>
        <path d="M2 8 C 40 2, 90 11, 150 5 S 215 4, 238 7" fill="none" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" pathLength="1" />
    </svg>
);

/**
 * Types out a rotating question to spark an idea. It owns its own state so the fast typing
 * re-renders only this chip, never the editor (and never the text box).
 */
export const PromptTyper = () => {
    const [text, setText] = useState(() => (reducedMotion() ? WRITING_PROMPTS[0] : ''));

    useEffect(() => {
        if (reducedMotion()) return undefined;
        let i = 0;
        let n = 0;
        let dir = 1;
        let timer;
        const tick = () => {
            const full = WRITING_PROMPTS[i];
            n += dir;
            setText(full.slice(0, n));
            let delay = dir > 0 ? 38 : 16;
            if (dir > 0 && n >= full.length) { dir = -1; delay = 2000; }
            else if (dir < 0 && n <= 0) { dir = 1; i = (i + 1) % WRITING_PROMPTS.length; delay = 450; }
            timer = setTimeout(tick, delay);
        };
        timer = setTimeout(tick, 700);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="be-prompt" aria-hidden="true">
            <Sparkles size={13} color="#FBBF24" style={{ flexShrink: 0 }} />
            <span className="be-prompt-label">Think about</span>
            <strong>{text}</strong>
            <span className="be-caret" />
        </div>
    );
};

const CONFETTI_COLORS = ['#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA'];
const PIECES = 22;

/** A small burst from the centre of its parent. Change `id` to fire it again; 0 shows nothing. */
export const Burst = ({ id }) => {
    if (!id) return null;
    return (
        <div key={id} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {Array.from({ length: PIECES }).map((_, i) => {
                const angle = (i / PIECES) * Math.PI * 2 + (i % 3) * 0.2;
                const dist = 58 + ((i * 37) % 52);
                const size = 6 + (i % 3) * 2;
                return (
                    <span
                        key={i}
                        className="be-burst"
                        style={{
                            '--dx': `${Math.round(Math.cos(angle) * dist)}px`,
                            '--dy': `${Math.round(Math.sin(angle) * dist) - 18}px`,
                            '--rot': `${(i * 67) % 360}deg`,
                            width: size, height: i % 2 ? size : size * 1.6, borderRadius: i % 2 ? '50%' : 2,
                            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], animationDelay: `${(i % 4) * 30}ms`,
                        }}
                    />
                );
            })}
        </div>
    );
};

/** Circular readiness meter. Turns green and shows a tick once the blog can be submitted. */
export const ProgressRing = ({ percent, done }) => {
    const size = 68;
    const stroke = 7;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const shown = Math.max(0, Math.min(100, percent));
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} role="img" aria-label={`${shown}% ready to submit`}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                    stroke={done ? colors.green : colors.primary}
                    strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
                    style={{ transition: 'stroke-dashoffset 0.45s ease, stroke 0.3s ease' }}
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', color: done ? colors.green : colors.text }}>
                {done ? <Check size={24} strokeWidth={3} /> : `${shown}%`}
            </div>
        </div>
    );
};

/** The lead's blog goal for the quarter, shown on the dark header. Renders nothing without a goal. */
export const GoalStrip = ({ goal }) => {
    if (!goal || !goal.target) return null;
    const met = goal.counted >= goal.target;
    const bars = Math.min(goal.target, 10);
    const remaining = goal.target - goal.counted;
    return (
        <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '0.6rem 0.85rem', minWidth: 220, maxWidth: 300 }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                Blog goal{goal.quarter ? ` · ${goal.quarter}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 5, margin: '7px 0' }} aria-hidden="true">
                {Array.from({ length: bars }).map((_, i) => (
                    <span key={i} style={{ flex: 1, height: 6, borderRadius: 100, background: i < goal.counted ? '#34D399' : 'rgba(255,255,255,0.22)', transition: 'background 0.3s ease' }} />
                ))}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>
                {met
                    ? 'Goal met. Every extra blog still builds your profile.'
                    : `${goal.counted} of ${goal.target} published. ${remaining} more to reach your goal.`}
            </div>
        </div>
    );
};

/** A tick list. `bonus` items are optional and are labelled as such. */
export const Checklist = ({ items }) => (
    <div style={{ display: 'grid', gap: '0.55rem' }}>
        {items.map((it) => (
            <div key={it.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem' }}>
                {it.done
                    ? <CheckCircle2 size={16} color={colors.green} style={{ flexShrink: 0, marginTop: 1 }} />
                    : <Circle size={16} color="#CBD5E1" style={{ flexShrink: 0, marginTop: 1 }} />}
                <div style={{ minWidth: 0 }}>
                    <span style={{ color: it.done ? colors.text : colors.muted, fontWeight: it.done ? 700 : 600 }}>{it.label}</span>
                    {it.bonus && <span style={{ marginLeft: 6, fontSize: '0.66rem', fontWeight: 700, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>bonus</span>}
                    {it.hint && <div style={{ fontSize: '0.72rem', color: colors.faint, marginTop: 1 }}>{it.hint}</div>}
                </div>
            </div>
        ))}
    </div>
);

const JOURNEY = ['Draft', 'Admin review', 'Published', 'Counts toward your goal'];

/** Where this blog is on its way to counting. `status` is the saved status, or undefined for a new blog. */
export const Journey = ({ status }) => {
    const current = status === 'pending' ? 1 : status === 'published' ? 3 : 0;
    return (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
            {JOURNEY.map((label, i) => {
                const done = i < current || (status === 'published' && i === 3);
                const active = i === current && !done;
                return (
                    <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.8rem' }}>
                        <span
                            style={{
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.68rem', fontWeight: 800,
                                background: done ? colors.green : active ? colors.primary : '#F1F5F9',
                                color: done || active ? 'white' : colors.faint,
                            }}
                        >
                            {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                        </span>
                        <span style={{ color: done || active ? colors.text : colors.faint, fontWeight: active ? 800 : 600 }}>{label}</span>
                        {active && status === 'rejected' && <span style={{ fontSize: '0.7rem', color: colors.red, fontWeight: 700 }}>needs changes</span>}
                    </li>
                );
            })}
        </ol>
    );
};

export const Tips = () => (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
        {TIPS.map((t) => (
            <li key={t} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: colors.muted, lineHeight: 1.5 }}>
                <Lightbulb size={14} color={colors.amber} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{t}</span>
            </li>
        ))}
    </ul>
);

/** A small labelled button for the formatting toolbar. */
export const ToolButton = ({ icon: Icon, label, onClick, disabled, title }) => (
    <button
        type="button"
        className="be-tool"
        onClick={onClick}
        disabled={disabled}
        title={title || label}
        style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.65rem', borderRadius: 8,
            border: `1px solid ${colors.border}`, background: 'white', color: disabled ? colors.faint : colors.primary,
            fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: disabled ? 'not-allowed' : 'pointer',
        }}
    >
        <Icon size={13} /> {label}
    </button>
);
