import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Calendar, BookOpen, MessageSquare } from 'lucide-react';

const SUGGESTIONS = [
    { label: 'Events', href: '/events', icon: Calendar },
    { label: 'Resources', href: '/resources', icon: BookOpen },
    { label: 'Community Q&A', href: '/community-qna', icon: MessageSquare },
];

const NotFound = () => {
    const navigate = useNavigate();
    useEffect(() => { document.title = '404 Not Found | AI Risk Council'; }, []);

    return (
        <div style={{
            minHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#F8FAFC',
            fontFamily: 'var(--font-sans)',
        }}>
            {/* Large 404 */}
            <div
                style={{
                    fontSize: 'clamp(6rem, 15vw, 9rem)',
                    fontWeight: '900',
                    lineHeight: '1',
                    color: '#E2E8F0',
                    marginBottom: '1rem',
                    userSelect: 'none',
                    letterSpacing: '-0.05em',
                }}
                aria-hidden="true"
            >
                404
            </div>

            <h1 style={{
                color: '#003366',
                fontSize: 'clamp(2rem, 5vw, 2.5rem)',
                fontWeight: '800',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
            }}>
                Page Not Found
            </h1>
            <p style={{
                color: '#64748B',
                maxWidth: '450px',
                marginBottom: '2.5rem',
                fontSize: '1rem',
                lineHeight: '1.6',
            }}>
                The page you're looking for doesn't exist or may have been moved. Let's get you back on track.
            </p>

            {/* Action buttons */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginBottom: '3rem',
            }}>
                <Link
                    to="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#003366',
                        color: 'white',
                        padding: '0.75rem 1.75rem',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        transition: 'opacity 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                    <Home size={16} /> Go Home
                </Link>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'white',
                        color: '#64748B',
                        border: '1.5px solid #CBD5E1',
                        padding: '0.75rem 1.75rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.color = '#475569'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#64748B'; }}
                >
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>

            {/* Suggested links */}
            <div>
                <p style={{
                    fontSize: '0.75rem',
                    color: '#94A3B8',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '1rem',
                }}>
                    Explore
                </p>
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                }}>
                    {SUGGESTIONS.map(({ label, href, icon: Icon }) => (
                        <Link
                            key={href}
                            to={href}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'white',
                                color: '#003366',
                                border: '1px solid #E2E8F0',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
                        >
                            <Icon size={14} /> {label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotFound;
