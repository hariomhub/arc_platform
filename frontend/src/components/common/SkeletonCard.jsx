import React from 'react';

/**
 * Animated skeleton card for loading states.
 * @param {{ variant?: 'card'|'list'|'profile', count?: number }} props
 */
const SkeletonBlock = ({ h = 16, w = '100%', rounded = false, className = '' }) => (
    <div
        aria-hidden="true"
        style={{
            height: h,
            width: w,
            backgroundColor: '#E2E8F0',
            borderRadius: rounded ? '100px' : '4px',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }}
    />
);

const CardVariant = () => (
    <div
        style={{
            background: 'white',
            border: '1px solid var(--border-light)',
            borderBottom: '3px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--spacing-lg)',
        }}
    >
        <SkeletonBlock h={14} w="60%" />
        <div style={{ marginTop: 12 }}>
            <SkeletonBlock h={10} />
            <div style={{ marginTop: 8 }}><SkeletonBlock h={10} w="80%" /></div>
            <div style={{ marginTop: 8 }}><SkeletonBlock h={10} w="50%" /></div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <SkeletonBlock h={10} w="30%" rounded />
            <SkeletonBlock h={10} w="25%" rounded />
        </div>
    </div>
);

const ListVariant = () => (
    <div
        style={{
            background: 'white',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        }}
    >
        <SkeletonBlock h={40} w={40} rounded />
        <div style={{ flex: 1 }}>
            <SkeletonBlock h={12} w="50%" />
            <div style={{ marginTop: 8 }}><SkeletonBlock h={10} w="75%" /></div>
        </div>
        <SkeletonBlock h={28} w={80} rounded />
    </div>
);

const ProfileVariant = () => (
    <div
        style={{
            background: 'white',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            textAlign: 'center',
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <SkeletonBlock h={80} w={80} rounded />
        </div>
        <SkeletonBlock h={16} w="60%" />
        <div style={{ marginTop: 8 }}><SkeletonBlock h={12} w="40%" /></div>
        <div style={{ marginTop: 20 }}>
            <SkeletonBlock h={10} />
            <div style={{ marginTop: 8 }}><SkeletonBlock h={10} /></div>
        </div>
    </div>
);

const VARIANTS = { card: CardVariant, list: ListVariant, profile: ProfileVariant };

const SkeletonCard = ({ variant = 'card', count = 1 }) => {
    const Component = VARIANTS[variant] || CardVariant;

    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div key={i}>
                    <Component />
                </div>
            ))}
            <style>{`@keyframes skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </>
    );
};

export default React.memo(SkeletonCard);
