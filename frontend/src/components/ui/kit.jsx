import React, { useState } from 'react';

/**
 * Small presentational helpers shared by the Chapter Lead dashboard and the admin
 * Chapter Leads tab, so both read as one system.
 */

export const colors = {
    primary: '#003366',
    text: '#1E293B',
    muted: '#64748B',
    faint: '#94A3B8',
    border: '#E2E8F0',
    surface: '#FFFFFF',
    bg: '#F8FAFC',
    green: '#059669',
    amber: '#D97706',
    red: '#DC2626',
    blue: '#0369A1',
};

export const fmtDate = (d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => {
    if (!d) return '—';
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', opts);
};

export const fmtNumber = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US'));

/** "2026-10-01" -> "Q4 2026" */
export const quarterLabel = (startDate) => {
    if (!startDate) return '—';
    const [y, m] = String(startDate).slice(0, 10).split('-').map(Number);
    return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
};

export const Card = ({ children, style, padded = true }) => (
    <div
        style={{
            background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: padded ? 'clamp(1.1rem,2.5vw,1.5rem)' : 0,
            ...style,
        }}
    >
        {children}
    </div>
);

export const SectionTitle = ({ icon: Icon, children, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: '1.1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 700, color: colors.text }}>
            {Icon && <Icon size={16} color={colors.primary} />}
            {children}
        </h3>
        {right}
    </div>
);

const PILLS = {
    green:  { bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' },
    amber:  { bg: '#FFFBEB', fg: '#B45309', bd: '#FDE68A' },
    red:    { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' },
    blue:   { bg: '#EFF6FF', fg: '#1D4ED8', bd: '#BFDBFE' },
    gray:   { bg: '#F1F5F9', fg: '#475569', bd: '#E2E8F0' },
    purple: { bg: '#FAF5FF', fg: '#7E22CE', bd: '#E9D5FF' },
};

export const Pill = ({ tone = 'gray', children, title }) => {
    const c = PILLS[tone] || PILLS.gray;
    return (
        <span
            title={title}
            style={{
                display: 'inline-block', padding: '2px 9px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700,
                background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, whiteSpace: 'nowrap',
            }}
        >
            {children}
        </span>
    );
};

export const Empty = ({ children }) => (
    <div style={{ padding: '1.6rem 1rem', textAlign: 'center', color: colors.faint, fontSize: '0.86rem' }}>{children}</div>
);

/** Horizontally scrollable table wrapper with consistent header styling. */
export const Table = ({ columns, children, minWidth = 560 }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth, fontSize: '0.82rem' }}>
            <thead>
                <tr>
                    {columns.map((c) => (
                        <th
                            key={c.key || c.label}
                            style={{
                                textAlign: c.align || 'left', padding: '0.55rem 0.7rem', fontSize: '0.68rem', fontWeight: 800,
                                color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em',
                                borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap',
                            }}
                        >
                            {c.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    </div>
);

export const Td = ({ children, align = 'left', muted = false, style }) => (
    <td
        style={{
            padding: '0.6rem 0.7rem', textAlign: align, color: muted ? colors.muted : colors.text,
            borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle', ...style,
        }}
    >
        {children}
    </td>
);

export const Button = ({ children, onClick, disabled, tone = 'primary', type = 'button', small = false, style, ...rest }) => {
    const tones = {
        primary: { bg: colors.primary, fg: 'white', bd: colors.primary },
        ghost:   { bg: 'white', fg: colors.primary, bd: '#CBD5E1' },
        danger:  { bg: '#DC2626', fg: 'white', bd: '#DC2626' },
        success: { bg: '#059669', fg: 'white', bd: '#059669' },
    };
    const t = tones[tone] || tones.primary;
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className="kit-btn"
            style={{
                padding: small ? '0.35rem 0.75rem' : '0.6rem 1.1rem', borderRadius: 8, border: `1px solid ${t.bd}`,
                background: disabled ? '#CBD5E1' : t.bg, color: disabled ? '#64748B' : t.fg, fontWeight: 700,
                fontSize: small ? '0.75rem' : '0.84rem', cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 6, ...style,
            }}
            {...rest}
        >
            {children}
        </button>
    );
};

export const fieldStyle = {
    width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.86rem',
    boxSizing: 'border-box', fontFamily: 'var(--font-sans)', color: colors.text, background: '#FAFAFA', outline: 'none',
};

export const labelStyle = { display: 'block', marginBottom: 4, fontSize: '0.78rem', fontWeight: 700, color: '#374151' };

// ── Behaviour shared by every piece of the kit ──────────────────────────────
// Focus rings, press feedback and a reduced-motion switch, injected once. Interaction feedback is
// short (120-200 ms) and never loops; people who ask their system for less motion get none.
const KIT_CSS = `
.kit-btn { transition: background-color .15s ease, border-color .15s ease, transform .1s ease, box-shadow .15s ease; }
.kit-btn:not(:disabled):hover { box-shadow: 0 2px 8px rgba(0,51,102,.14); }
.kit-btn:not(:disabled):active { transform: translateY(1px); }
.kit-btn:focus-visible, .kit-focus:focus-visible { outline: 2px solid #1D4ED8; outline-offset: 2px; }
.kit-row { transition: background-color .12s ease; }
.kit-row:hover { background: #F8FAFC; }
.kit-lift { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
.kit-lift:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,51,102,.10); border-color: #BFDBFE; }
@keyframes kit-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.kit-enter { animation: kit-fade-up .22s ease both; }
@keyframes kit-countdown { from { width: 100%; } to { width: 0; } }
@keyframes kit-spin { to { transform: rotate(360deg); } }
.kit-spin { animation: kit-spin .9s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .kit-btn, .kit-row, .kit-lift, .kit-enter, .kit-ring, .kit-meter { transition: none !important; animation: none !important; }
  .kit-spin { animation-duration: 2.4s; }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('kit-styles')) {
    const el = document.createElement('style');
    el.id = 'kit-styles';
    el.textContent = KIT_CSS;
    document.head.appendChild(el);
}

/** A round name tag: the photo when there is one, otherwise initials. */
export const Avatar = ({ name = '', photo = null, size = 36, tone = colors.primary }) => {
    const [broken, setBroken] = useState(false);
    const initials = String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
    const base = { width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
    if (photo && !broken) return <img src={photo} alt="" onError={() => setBroken(true)} style={{ ...base, objectFit: 'cover', border: `1px solid ${colors.border}` }} />;
    return (
        <span aria-hidden="true" style={{ ...base, background: `${tone}14`, color: tone, fontWeight: 800, fontSize: size * 0.38, border: `1px solid ${tone}30` }}>
            {initials}
        </span>
    );
};

const BANNER_TONES = {
    info:    { bg: '#EFF6FF', bd: '#BFDBFE', fg: '#1E3A8A' },
    success: { bg: '#F0FDF4', bd: '#BBF7D0', fg: '#166534' },
    warning: { bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E' },
    danger:  { bg: '#FEF2F2', bd: '#FECACA', fg: '#991B1B' },
};

/** A message strip. `action` is any node (usually a Button) shown on the right. */
export const Banner = ({ tone = 'info', icon: Icon, title, children, action, style }) => {
    const t = BANNER_TONES[tone] || BANNER_TONES.info;
    return (
        <div
            role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 12, padding: '0.8rem 1rem', color: t.fg, ...style }}
        >
            {Icon && <Icon size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />}
            <div style={{ flex: 1, minWidth: 0 }}>
                {title && <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{title}</div>}
                {children && <div style={{ fontSize: '0.82rem', lineHeight: 1.6, marginTop: title ? 2 : 0 }}>{children}</div>}
            </div>
            {action}
        </div>
    );
};

/** A row of mutually exclusive choices (a tab-like toggle that changes content in place). */
export const Segmented = ({ options, value, onChange, ariaLabel, disabled = false }) => (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 2, maxWidth: '100%' }}>
        {options.map((o) => {
            const on = o.value === value;
            return (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => onChange(o.value)}
                    className="kit-btn"
                    style={{
                        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: '0.45rem 0.9rem', borderRadius: 8,
                        background: on ? 'white' : 'transparent', color: on ? colors.primary : colors.muted,
                        fontWeight: on ? 800 : 600, fontSize: '0.82rem', fontFamily: 'var(--font-sans)',
                        boxShadow: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none', whiteSpace: 'nowrap',
                    }}
                >
                    {o.label}
                </button>
            );
        })}
    </div>
);

/** An on/off switch with a visible label and description. */
export const Switch = ({ checked, onChange, label, description, disabled = false, id }) => (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
        <span style={{ position: 'relative', width: 38, height: 22, flexShrink: 0, marginTop: 1 }}>
            <input
                id={id}
                type="checkbox"
                role="switch"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="kit-focus"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'inherit' }}
            />
            <span aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 100, background: checked ? colors.primary : '#CBD5E1', transition: 'background-color .15s ease' }} />
            <span aria-hidden="true" style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left .15s ease', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }} />
        </span>
        <span>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: colors.text }}>{label}</span>
            {description && <span style={{ display: 'block', fontSize: '0.76rem', color: colors.muted, lineHeight: 1.5, marginTop: 1 }}>{description}</span>}
        </span>
    </label>
);

/** A single figure with a caption; clickable when `onClick` is given. */
export const StatTile = ({ label, value, hint, tone = colors.primary, onClick, icon: Icon }) => {
    const body = (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 800, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {Icon && <Icon size={13} aria-hidden="true" />}{label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: tone, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
            {hint && <div style={{ fontSize: '0.74rem', color: colors.muted, marginTop: 3 }}>{hint}</div>}
        </>
    );
    const style = { background: 'white', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '0.85rem 1rem', textAlign: 'left', fontFamily: 'var(--font-sans)' };
    return onClick
        ? <button type="button" onClick={onClick} className="kit-lift kit-focus" style={{ ...style, cursor: 'pointer' }}>{body}</button>
        : <div style={style}>{body}</div>;
};

export const Spinner = ({ size = 16, color = colors.faint }) => (
    <span className="kit-spin" aria-hidden="true" style={{ display: 'inline-block', width: size, height: size, border: `2px solid ${color}55`, borderTopColor: color, borderRadius: '50%' }} />
);
