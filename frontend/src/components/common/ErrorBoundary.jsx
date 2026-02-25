import React from 'react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // In production, send to error tracking service (e.g., Sentry)
        console.error('[ErrorBoundary] Uncaught error:', error, info);
    }

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-sans)',
                        padding: '2rem',
                        backgroundColor: 'var(--bg-light)',
                    }}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: 'var(--radius-lg)',
                            padding: '3rem 2rem',
                            maxWidth: '480px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                            border: '1px solid var(--border-light)',
                            borderTop: '4px solid #DC2626',
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2
                            style={{
                                color: '#DC2626',
                                fontFamily: 'var(--font-serif)',
                                marginBottom: '0.75rem',
                            }}
                        >
                            Something Went Wrong
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                            An unexpected error occurred. The team has been notified. Please try
                            returning to the home page.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <pre
                                style={{
                                    textAlign: 'left',
                                    background: '#FEF2F2',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '4px',
                                    padding: '1rem',
                                    fontSize: '0.75rem',
                                    color: '#991B1B',
                                    overflowX: 'auto',
                                    marginBottom: '1.5rem',
                                }}
                            >
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <button
                            onClick={this.handleGoHome}
                            style={{
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.75rem 2rem',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                            }}
                        >
                            Go to Home Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
