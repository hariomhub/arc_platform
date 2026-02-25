import React, { createContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 3000;

const ICONS = {
    success: <CheckCircle size={18} className="flex-shrink-0" />,
    error: <AlertCircle size={18} className="flex-shrink-0" />,
    warning: <AlertTriangle size={18} className="flex-shrink-0" />,
    info: <Info size={18} className="flex-shrink-0" />,
};

const COLORS = {
    success: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', icon: '#22C55E' },
    error: { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', icon: '#EF4444' },
    warning: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', icon: '#F59E0B' },
    info: { bg: '#EFF6FF', border: '#93C5FD', text: '#1E40AF', icon: '#3B82F6' },
};

const Toast = ({ toast, onRemove }) => {
    const colors = COLORS[toast.type] || COLORS.info;

    return (
        <div
            role="alert"
            aria-live="polite"
            className="animate-toast-slide-in"
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
                padding: '0.875rem 1rem',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
                color: colors.text,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                minWidth: '280px',
                maxWidth: '380px',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                fontWeight: '500',
            }}
        >
            <span style={{ color: colors.icon, marginTop: '1px' }}>
                {ICONS[toast.type]}
            </span>
            <span style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                aria-label="Dismiss notification"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.text,
                    opacity: 0.6,
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timerRefs = useRef({});

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        if (timerRefs.current[id]) {
            clearTimeout(timerRefs.current[id]);
            delete timerRefs.current[id];
        }
    }, []);

    const showToast = useCallback(
        (message, type = 'info', duration = DEFAULT_DURATION) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

            setToasts((prev) => {
                const next = [...prev, { id, message, type, duration }];
                // Cap at MAX_TOASTS — remove oldest
                return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
            });

            timerRefs.current[id] = setTimeout(() => removeToast(id), duration);
        },
        [removeToast]
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast container — fixed top-right */}
            {toasts.length > 0 && (
                <div
                    aria-label="Notifications"
                    style={{
                        position: 'fixed',
                        top: '1.25rem',
                        right: '1.25rem',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.625rem',
                    }}
                >
                    {toasts.map((toast) => (
                        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
};

export default ToastContext;
