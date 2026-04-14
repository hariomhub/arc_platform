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

    return (
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
                    width: 36px; height: 36px; border-radius: '50%';
                    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: white; transition: background 0.12s;
                }
                .mv-close:hover { background: rgba(255,255,255,0.25); }
            `}</style>

            <div className="mv-overlay" onClick={onClose}>
                <div className="mv-inner" onClick={e => e.stopPropagation()}>

                    {/* Close button */}
                    <button className="mv-close" onClick={onClose} aria-label="Close viewer"
                        style={{ position: 'absolute', top: '-44px', right: 0, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                        <X size={18} />
                    </button>

                    {/* Image viewer */}
                    {item.type === 'image' && (
                        <img
                            src={item.url}
                            alt={item.original_name || 'Post image'}
                            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', display: 'block' }}
                        />
                    )}

                    {/* PDF viewer */}
                    {item.type === 'pdf' && (
                        <div style={{ width: 'min(820px, 90vw)', height: '85vh', borderRadius: '12px', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column' }}>
                            {/* PDF header */}
                            <div style={{ background: '#1e293b', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <FileText size={16} color="#7C3AED" />
                                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.original_name || 'Document.pdf'}
                                    </span>
                                </div>
                                <a href={item.url} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#7C3AED', color: 'white', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '700', padding: '5px 12px', borderRadius: '6px', flexShrink: 0 }}>
                                    <ExternalLink size={12} /> Open
                                </a>
                            </div>
                            <iframe
                                src={`${item.url}#toolbar=1`}
                                title={item.original_name || 'PDF Document'}
                                style={{ flex: 1, border: 'none', width: '100%' }}
                            />
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
};

export default MediaViewer;