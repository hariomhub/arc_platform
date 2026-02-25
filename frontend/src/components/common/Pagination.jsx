import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination controls.
 * @param {{ page: number, totalPages: number, onPageChange: (p:number)=>void }} props
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
    if (!totalPages || totalPages <= 1) return null;

    const btnBase = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '0.45rem 0.9rem',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-light)',
        background: 'white',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.15s ease',
    };

    const btnDisabled = {
        ...btnBase,
        opacity: 0.4,
        cursor: 'not-allowed',
    };

    return (
        <nav
            aria-label="Pagination"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                marginTop: '2rem',
            }}
        >
            <button
                style={page <= 1 ? btnDisabled : btnBase}
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
            >
                <ChevronLeft size={15} />
                Previous
            </button>

            <span
                style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: '500',
                    minWidth: '90px',
                    textAlign: 'center',
                }}
            >
                Page {page} of {totalPages}
            </span>

            <button
                style={page >= totalPages ? btnDisabled : btnBase}
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
            >
                Next
                <ChevronRight size={15} />
            </button>
        </nav>
    );
};

export default React.memo(Pagination);
