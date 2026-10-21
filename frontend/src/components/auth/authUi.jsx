import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';

/**
 * Small building blocks shared by the sign-in page, the "sign in with a code" form and the
 * forgot-password page, so all three look and behave the same.
 *
 * The .auth-input / .auth-input-err focus styles live in each page's own <style> block.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Field = ({ id, label, required, error, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label htmlFor={id} style={{ fontSize: '0.82rem', fontWeight: '600', color: error ? '#DC2626' : '#374151' }}>
            {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
        </label>
        {children}
        {error && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#DC2626' }}><AlertCircle size={11} />{error}</span>}
    </div>
);

export const inputStyle = (hasError, disabled) => ({
    width: '100%', padding: '0.72rem 0.9rem',
    border: `1.5px solid ${hasError ? '#FCA5A5' : '#E2E8F0'}`,
    borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box',
    display: 'block',
    fontFamily: 'var(--font-sans)', outline: 'none',
    background: hasError ? '#FFF5F5' : '#FAFBFC',
    color: '#0F172A', opacity: disabled ? 0.65 : 1,
    transition: 'border-color 0.15s, box-shadow 0.15s',
});

/** Counts down once a second from the value passed to restart(). Returns [secondsLeft, restart]. */
export const useCountdown = (initial = 0) => {
    const [left, setLeft] = useState(initial);
    useEffect(() => {
        if (left <= 0) return undefined;
        const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [left]);
    const restart = useCallback((seconds) => setLeft(seconds), []);
    return [left, restart];
};

/**
 * One input for the 6-digit code: numeric keypad on phones, offered by the browser/phone for autofill
 * (one-time-code), and tolerant of pasting "123 456" or "123-456".
 */
export const CodeInput = ({ id = 'otp-code', value, onChange, disabled, error, autoFocus }) => (
    <input
        id={id}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus={autoFocus}
        aria-label="6-digit code"
        placeholder="••••••"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onPaste={(e) => {
            const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
            if (pasted) { e.preventDefault(); onChange(pasted); }
        }}
        className={`auth-input${error ? ' auth-input-err' : ''}`}
        style={{
            ...inputStyle(error, disabled), textAlign: 'center', fontSize: '1.6rem', fontWeight: 800,
            letterSpacing: '0.45em', paddingLeft: '0.45em', fontFamily: "'Courier New', Courier, monospace",
        }}
    />
);

// Same rules the server enforces (routes/auth.js, routes/profile.js).
export const PASSWORD_RULES = [
    { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
];

/** The first rule a password breaks, as a sentence, or '' if it is fine. */
export const passwordProblem = (pw) => {
    if (!pw) return 'Choose a new password.';
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.';
    return '';
};

/** A live checklist under a new-password field. */
export const PasswordRules = ({ value }) => (
    <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1rem' }}>
        {PASSWORD_RULES.map(({ label, test }) => {
            const met = test(value);
            return (
                <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: met ? '#15803D' : '#94A3B8', fontWeight: met ? 600 : 500, transition: 'color 0.15s' }}>
                    {met ? <CheckCircle2 size={13} /> : <Circle size={13} />}{label}
                </li>
            );
        })}
    </ul>
);
