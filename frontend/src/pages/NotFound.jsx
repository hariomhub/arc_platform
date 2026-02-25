import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
    <div
        style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-sans)',
            textAlign: 'center',
            padding: '4rem 2rem',
        }}
    >
        <div style={{ fontSize: '5rem', fontWeight: '800', color: 'var(--border-medium)', marginBottom: '0.5rem' }}>
            404
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary)', marginBottom: '0.75rem' }}>
            Page Not Found
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '2rem' }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
            to="/"
            style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700',
                fontSize: '0.9rem',
                textDecoration: 'none',
            }}
        >
            Back to Home
        </Link>
    </div>
);

export default NotFound;
