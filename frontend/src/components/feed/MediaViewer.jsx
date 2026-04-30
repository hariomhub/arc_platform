/**
 * MediaViewer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal viewer for feed post media.
 * - Images : full-size lightbox
 * - PDFs   : attempts inline iframe; if the browser blocks it (Azure Blob
 *            X-Frame-Options / CSP frame-src — common in production), a 4-second
 *            timeout triggers a clean "Open in New Tab" fallback automatically.
 *            No external proxy services (Google Docs etc.) required.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, FileText, AlertCircle } from 'lucide-react';

// ── PdfViewer ─────────────────────────────────────────────────────────────────
// Extracted as its own component so it can safely use useState / useEffect.
const PdfViewer = ({ item, onClose }) => {
    // States: 'loading' → 'loaded' (iframe OK) | 'failed' (blocked / error)
    const [pdfState, setPdfState] = useState('loading');

    useEffect(() => {
        // If onLoad hasn't fired in 4 s, the iframe is almost certainly blocked
        const timer = setTimeout(() => {
            setPdfState(prev => prev === 'loading' ? 'failed' : prev);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    const headerStyle = {
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', flexShrink: 0,
    };

    const openBtnStyle = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#003366', color: 'white',
        textDecoration: 'none', fontSize: '0.79rem', fontWeight: '700',
        padding: '6px 14px', borderRadius: 6, transition: 'background 0.15s',
    };

    return (
        <div style={{
            width: 'min(900px, 95vw)', height: '88vh',
            borderRadius: 10, overflow: 'hidden',
            background: '#f8fafc', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}>
            {/* Header */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={16} color="#0f172a" />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.original_name || 'Document.pdf'}
                    </span>
                    {pdfState === 'loaded' && (
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#057642', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
                            Preview
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={openBtnStyle}
                        onMouseOver={e => e.currentTarget.style.background = '#002244'}
                        onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                        <ExternalLink size={13} /> Open PDF
                    </a>
                    <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
                    <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', borderRadius: 6, transition: 'all 0.15s' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, position: 'relative', background: '#f1f5f9', overflow: 'hidden' }}>

                {/* Loading overlay */}
                {pdfState === 'loading' && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f8fafc' }}>
                        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>Loading document…</p>
                    </div>
                )}

                {/* Fallback overlay — shown when iframe is blocked */}
                {pdfState === 'failed' && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f8fafc', padding: '2rem' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertCircle size={24} color="#d97706" />
                        </div>
                        <div style={{ textAlign: 'center', maxWidth: 340 }}>
                            <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>Inline preview unavailable</p>
                            <p style={{ margin: 0, fontSize: '0.81rem', color: '#64748b', lineHeight: 1.65 }}>
                                Your browser is blocking the embedded preview due to cross-origin security policies. The document is safe — open it directly below.
                            </p>
                        </div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#003366', color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '700', padding: '10px 24px', borderRadius: 8, transition: 'background 0.15s', boxShadow: '0 2px 8px rgba(0,51,102,0.25)' }}
                            onMouseOver={e => e.currentTarget.style.background = '#002244'}
                            onMouseOut={e => e.currentTarget.style.background = '#003366'}>
                            <ExternalLink size={15} /> Open PDF in New Tab
                        </a>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>Or use the "Open PDF" button in the header</p>
                    </div>
                )}

                {/* Iframe — always mounted so onLoad / onError fire.
                    Hidden until confirmed loaded to avoid blank flash.
                    pointerEvents disabled while hidden to prevent ghost clicks. */}
                <iframe
                    src={`${item.url}#toolbar=1`}
                    title={item.original_name || 'PDF Document'}
                    onLoad={() => setPdfState('loaded')}
                    onError={() => setPdfState('failed')}
                    style={{
                        width: '100%', height: '100%',
                        border: 'none', display: 'block',
                        position: 'absolute', inset: 0,
                        opacity: pdfState === 'loaded' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: pdfState === 'loaded' ? 'auto' : 'none',
                    }}
                />
            </div>
        </div>
    );
};

// ── MediaViewer ───────────────────────────────────────────────────────────────
const MediaViewer = ({ item, onClose }) => {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    if (!item) return null;

    const modalContent = (
        <>
            <style>{`
                @keyframes mv-fadein  { from{opacity:0} to{opacity:1} }
                @keyframes mv-scalein { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
                @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                .mv-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.88); z-index: 1000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 1rem; animation: mv-fadein 0.18s ease;
                }
                .mv-inner {
                    position: relative; max-width: 90vw; max-height: 90vh;
                    animation: mv-scalein 0.2s ease; display: flex; flex-direction: column;
                }
                .mv-close {
                    position: absolute; top: -44px; right: 0;
                    width: 36px; height: 36px; border-radius: 50%;
                    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: white; transition: background 0.12s;
                }
                .mv-close:hover { background: rgba(255,255,255,0.25); }
                @media (max-width: 500px) { .hide-on-mobile { display: none; } }
            `}</style>

            <div className="mv-overlay" onClick={onClose}>
                <div className="mv-inner" onClick={e => e.stopPropagation()}>

                    {/* Close button — only for images (PDF has its own header close) */}
                    {item.type === 'image' && (
                        <button className="mv-close" onClick={onClose} aria-label="Close viewer">
                            <X size={18} />
                        </button>
                    )}

                    {/* Image viewer */}
                    {item.type === 'image' && (
                        <img
                            src={item.url}
                            alt={item.original_name || 'Post image'}
                            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, display: 'block', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
                        />
                    )}

                    {/* PDF viewer — smart fallback built-in */}
                    {item.type === 'pdf' && <PdfViewer item={item} onClose={onClose} />}

                    {/* Image caption */}
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