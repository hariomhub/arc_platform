import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

const SIZE_WIDTHS = {
    sm: '420px',
    md: '560px',
    lg: '720px',
    xl: '900px',
};

/**
 * Accessible modal with focus trap, ESC key, and backdrop click.
 * @param {{ isOpen: boolean, onClose: ()=>void, title?: string, children: React.ReactNode, size?: 'sm'|'md'|'lg'|'xl' }} props
 */
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
    const overlayRef = useRef(null);
    const dialogRef = useRef(null);
    const prevFocusRef = useRef(null);

    // ESC key
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Focus trap + restore
    useEffect(() => {
        if (!isOpen) return;
        prevFocusRef.current = document.activeElement;
        // Focus the dialog on open
        setTimeout(() => dialogRef.current?.focus(), 20);
        return () => prevFocusRef.current?.focus?.();
    }, [isOpen]);

    // Prevent body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleOverlayClick = useCallback((e) => {
        if (e.target === overlayRef.current) onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            role="presentation"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
                animation: 'arc-backdrop 0.2s ease',
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                tabIndex={-1}
                style={{
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    width: '100%',
                    maxWidth: SIZE_WIDTHS[size] || SIZE_WIDTHS.md,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    animation: 'arc-modal-in 0.2s ease',
                    outline: 'none',
                }}
            >
                {/* Header */}
                {(title || true) && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid var(--border-light)',
                        }}
                    >
                        {title && (
                            <h3
                                id="modal-title"
                                style={{
                                    fontFamily: 'var(--font-serif)',
                                    color: 'var(--primary)',
                                    fontSize: '1.2rem',
                                    margin: 0,
                                }}
                            >
                                {title}
                            </h3>
                        )}
                        {!title && <div />}
                        <button
                            onClick={onClose}
                            aria-label="Close modal"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-light)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'color 0.15s',
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>{children}</div>
            </div>

            <style>{`
        @keyframes arc-backdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes arc-modal-in { from { opacity: 0; transform: scale(0.95) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
        </div>
    );
};

export default Modal;
