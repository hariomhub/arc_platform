import React from 'react';

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
