import React from 'react';

/**
 * Empty state placeholder for lists with no data.
 * @param {{ title: string, description?: string, icon?: React.ReactNode, action?: React.ReactNode }} props
 */
const EmptyState = ({ title, description, icon, action }) => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
        }}
    >
        {icon && (
            <div
                style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                    opacity: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                aria-hidden="true"
            >
                {icon}
            </div>
        )}
        <h3
            style={{
                fontFamily: 'var(--font-serif)',
                color: 'var(--text-main)',
                fontSize: '1.25rem',
                marginBottom: '0.5rem',
            }}
        >
            {title}
        </h3>
        {description && (
            <p style={{ maxWidth: '380px', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: action ? '1.5rem' : 0 }}>
                {description}
            </p>
        )}
        {action && <div>{action}</div>}
    </div>
);

export default React.memo(EmptyState);
