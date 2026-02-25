import React from 'react';

/**
 * Loading spinner.
 * @param {{ size?: 'sm'|'md'|'lg', fullPage?: boolean }} props
 */
const SIZE_MAP = {
    sm: { w: 20, border: 2 },
    md: { w: 36, border: 3 },
    lg: { w: 56, border: 4 },
};

const LoadingSpinner = ({ size = 'md', fullPage = false }) => {
    const { w, border } = SIZE_MAP[size] || SIZE_MAP.md;

    const spinner = (
        <div
            role="status"
            aria-label="Loading"
            style={{
                width: w,
                height: w,
                borderRadius: '50%',
                border: `${border}px solid var(--border-light)`,
                borderTopColor: 'var(--primary)',
                animation: 'arc-spin 0.75s linear infinite',
                flexShrink: 0,
            }}
        />
    );

    if (fullPage) {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    zIndex: 9000,
                }}
            >
                {spinner}
                <style>{`@keyframes arc-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            {spinner}
            <style>{`@keyframes arc-spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
};

export default React.memo(LoadingSpinner);
