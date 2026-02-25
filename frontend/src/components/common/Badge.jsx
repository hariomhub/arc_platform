import React from 'react';

/**
 * Color-coded badge for categories/roles.
 * @param {{ label: string, variant?: string }} props
 */
const VARIANT_STYLES = {
    // Event categories
    webinar: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    seminar: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    workshop: { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
    podcast: { bg: '#FDF4FF', color: '#7E22CE', border: '#E9D5FF' },

    // User roles (matching Header ROLE_STYLES)
    admin: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
    executive: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    paid: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    university: { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
    product: { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
    free: { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },

    // Resource types
    framework: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    whitepaper: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },

    // Status
    pending: { bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
    approved: { bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
    rejected: { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },

    // Default
    default: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E0' },
};

const Badge = ({ label, variant = 'default' }) => {
    const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem 0.6rem',
                borderRadius: '100px',
                border: `1px solid ${style.border}`,
                backgroundColor: style.bg,
                color: style.color,
                fontSize: '0.72rem',
                fontWeight: '700',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-sans)',
            }}
        >
            {label}
        </span>
    );
};

export default React.memo(Badge);
