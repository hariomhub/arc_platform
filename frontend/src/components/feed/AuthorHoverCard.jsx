/**
 * AuthorHoverCard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps any trigger element. On hover shows a card with:
 * author name, role badge, org, bio snippet.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Building2 } from 'lucide-react';

const ROLE_META = {
    founding_member: { label: 'Founding Member', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
    council_member:  { label: 'Council Member',  color: '#003366', bg: 'rgba(0,51,102,0.09)'  },
    professional:    { label: 'Professional',    color: '#0369A1', bg: 'rgba(3,105,161,0.09)'  },
};

const AuthorHoverCard = ({
    authorId,
    authorName,
    authorRole,
    authorPhoto,
    authorOrg,
    authorBio,
    children,
}) => {
    const [visible, setVisible] = useState(false);
    const [pos,     setPos]     = useState({ top: 0, left: 0 });
    const timeoutRef = useRef(null);
    const cardRef    = useRef(null);
    const triggerRef = useRef(null);

    const roleMeta = ROLE_META[authorRole] || ROLE_META.professional;

    const show = useCallback((e) => {
        clearTimeout(timeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // Position card below trigger, aligned left, but don't overflow right edge
        let left = rect.left + scrollX;
        const cardWidth = 240;
        if (left + cardWidth > window.innerWidth - 16) {
            left = window.innerWidth - cardWidth - 16 + scrollX;
        }

        setPos({ top: rect.bottom + scrollY + 8, left });
        timeoutRef.current = setTimeout(() => setVisible(true), 180);
    }, []);

    const toggleImmediate = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (visible) {
            clearTimeout(timeoutRef.current);
            setVisible(false);
            return;
        }
        clearTimeout(timeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        let left = rect.left + scrollX;
        const cardWidth = 240;
        if (left + cardWidth > window.innerWidth - 16) {
            left = window.innerWidth - cardWidth - 16 + scrollX;
        }

        setPos({ top: rect.bottom + scrollY + 8, left });
        setVisible(true);
    }, [visible]);

    const hide = useCallback(() => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setVisible(false), 120);
    }, []);

    const keepOpen = useCallback(() => {
        clearTimeout(timeoutRef.current);
    }, []);

    return (
        <>
            <style>{`
                @keyframes ahc-fadein {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .ahc-card {
                    position: fixed;
                    z-index: 500;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    box-shadow: 0 12px 36px rgba(0,0,0,0.13);
                    width: 240px;
                    padding: 1rem;
                    animation: ahc-fadein 0.18s ease both;
                    pointer-events: auto;
                }
            `}</style>

            {/* Trigger wrapper */}
            <span
                ref={triggerRef}
                onMouseEnter={show}
                onMouseLeave={hide}
                onClick={toggleImmediate}
                style={{ display: 'inline-flex', cursor: 'pointer' }}>
                {children}
            </span>

            {/* Hover card — rendered in body via portal to break out of transforms and hidden overflows */}
            {visible && typeof document !== 'undefined' && createPortal(
                <div
                    ref={cardRef}
                    className="ahc-card"
                    style={{ top: pos.top, left: pos.left }}
                    onMouseEnter={keepOpen}
                    onMouseLeave={hide}>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                            background: authorPhoto ? 'transparent' : `linear-gradient(135deg, ${roleMeta.color}dd, ${roleMeta.color}66)`,
                            border: `2px solid ${roleMeta.color}25`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', fontWeight: '800', color: 'white', overflow: 'hidden',
                        }}>
                            {authorPhoto
                                ? <img src={authorPhoto} alt={authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : (authorName || 'A').charAt(0).toUpperCase()
                            }
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {authorName}
                            </p>
                            <span style={{
                                display: 'inline-block', fontSize: '0.62rem', fontWeight: '700',
                                padding: '2px 8px', borderRadius: '100px',
                                background: roleMeta.bg, color: roleMeta.color,
                                textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px',
                            }}>
                                {roleMeta.label}
                            </span>
                        </div>
                    </div>

                    {/* Org */}
                    {authorOrg && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.5rem' }}>
                            <Building2 size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {authorOrg}
                            </span>
                        </div>
                    )}

                    {/* Bio snippet */}
                    {authorBio && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {authorBio}
                        </p>
                    )}

                    {!authorOrg && !authorBio && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            AI Risk Council member
                        </p>
                    )}
                </div>,
                document.body
            )}
        </>
    );
};

export default AuthorHoverCard;