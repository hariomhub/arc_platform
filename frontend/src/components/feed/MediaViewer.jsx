/**
 * MediaViewer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal viewer for feed post media.
 * - Images: full-size with pan/zoom feel
 * - PDFs: embedded in iframe
 * - Video links: shouldn't reach here (inline embed in feed) but handled gracefully
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, FileText } from 'lucide-react';

const MediaViewer = ({ item, onClose }) => {
    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    if (!item) return null;

    const modalContent = (
        <>
            <style>{`
                @keyframes mv-fadein {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes mv-scalein {
                    from { opacity: 0; transform: scale(0.94); }
                    to   { opacity: 1; transform: scale(1); }
                }
                .mv-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.88);
                    z-index: 1000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 1rem;
                    animation: mv-fadein 0.18s ease;
                }
                .mv-inner {
                    position: relative;
                    max-width: 90vw; max-height: 90vh;
                    animation: mv-scalein 0.2s ease;
                    display: flex; flex-direction: column;
                }
                .mv-close {
                    position: absolute; top: -44px; right: 0;
                    width: 36px; height: 36px; border-radius: 50%;
                    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: white; transition: background 0.12s;
                }
                .mv-close:hover { background: rgba(255,255,255,0.25); }
                @media (max-width: 500px) {
                    .hide-on-mobile { display: none; }
                }
            `}</style>

            <div className="mv-overlay" onClick={onClose}>
                <div className="mv-inner" onClick={e => e.stopPropagation()}>

                    {/* Close button - Only floating for images */}
                    {item.type === 'image' && (
                        <button className="mv-close" onClick={onClose} aria-label="Close viewer"
                            style={{ position: 'absolute', top: '-44px', right: 0, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <X size={18} />
                        </button>
                    )}

                    {/* Image viewer */}
                    {item.type === 'image' && (
                        <img
                            src={item.url}
                            alt={item.original_name || 'Post image'}
                            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', display: 'block', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
                        />
                    )}

                    {/* PDF viewer */}
                    {item.type === 'pdf' && (
                        <div style={{ width: 'min(900px, 95vw)', height: '88vh', borderRadius: '10px', overflow: 'hidden', background: '#f8fafc', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                            {/* PDF header */}
                            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <FileText size={16} color="#0f172a" />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.original_name || 'Document.pdf'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600', padding: '6px 12px', borderRadius: '6px', flexShrink: 0, transition: 'all 0.15s' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                                    >
                                        <ExternalLink size={14} /> <span className="hide-on-mobile">Open</span>
                                    </a>
                                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                                    <button onClick={onClose} aria-label="Close viewer"
                                        style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', transition: 'all 0.15s' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ flex: 1, background: '#f1f5f9', padding: 0 }}>
                                <iframe
                                    src={`${item.url}#toolbar=1`}
                                    title={item.original_name || 'PDF Document'}
                                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Filename caption for images */}
                    {item.type === 'image' && item.original_name && (
                        <p style={{ textAlign: 'center', margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                            {item.original_name}
                        </p>
                    )}
                </div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
};

export default MediaViewer;