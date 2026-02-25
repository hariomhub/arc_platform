import React from 'react';
import Modal from './Modal.jsx';

/**
 * Reusable confirm/delete dialog.
 * @param {{ isOpen: boolean, onClose: ()=>void, onConfirm: ()=>void, title: string, message: string, confirmLabel?: string, loading?: boolean }} props
 */
const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmLabel = 'Confirm',
    loading = false,
}) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
                onClick={onClose}
                disabled={loading}
                style={{
                    padding: '0.55rem 1.25rem',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'white',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                    opacity: loading ? 0.5 : 1,
                }}
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                disabled={loading}
                style={{
                    padding: '0.55rem 1.25rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: '#DC2626',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                    opacity: loading ? 0.7 : 1,
                }}
            >
                {loading ? 'Processing…' : confirmLabel}
            </button>
        </div>
    </Modal>
);

export default ConfirmDialog;
