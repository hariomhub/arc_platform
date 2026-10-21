import React, { useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { requestLoginCode, verifyLoginCode } from '../../api/auth.js';
import { getErrorMessage } from '../../utils/apiHelpers.js';
import { Field, inputStyle, CodeInput, useCountdown, EMAIL_RE } from './authUi.jsx';

const RESEND_SECONDS = 60; // matches the server's cooldown between codes

const primaryButton = (busy) => ({
    width: '100%', padding: '0.88rem', background: busy ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)', color: 'white',
    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.93rem', cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: '0.3rem', boxShadow: busy ? 'none' : '0 4px 14px rgba(0,51,102,0.28)',
});

const linkButton = (disabled) => ({
    background: 'none', border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
    fontSize: '0.82rem', fontWeight: 600, color: disabled ? '#94A3B8' : '#003366',
});

/**
 * "Sign in with a code": email -> 6-digit code from the inbox -> signed in.
 * The parent owns the email text (so it survives switching to the password form) and decides what to do
 * once signed in or when something goes wrong.
 */
const CodeLogin = ({ email, onEmailChange, emailRef, onSuccess, onError, onClear }) => {
    const [step, setStep] = useState('email'); // email | code
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [fieldError, setFieldError] = useState('');
    const [notice, setNotice] = useState('');
    const [wait, restartWait] = useCountdown(0);

    const sendCode = async (isResend = false) => {
        const clean = email.trim();
        if (!clean) { setFieldError('Email is required.'); return; }
        if (!EMAIL_RE.test(clean)) { setFieldError('Enter a valid email address.'); return; }
        setFieldError(''); setNotice(''); onClear(); setBusy(true);
        try {
            await requestLoginCode({ email: clean.toLowerCase() });
            setStep('code'); setCode(''); restartWait(RESEND_SECONDS);
            if (isResend) setNotice('A new code is on its way.');
        } catch (err) {
            onError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const verify = async (e) => {
        e.preventDefault();
        if (code.length !== 6) { setFieldError('Enter the 6-digit code from your email.'); return; }
        setFieldError(''); setNotice(''); onClear(); setBusy(true);
        try {
            const res = await verifyLoginCode({ email: email.trim().toLowerCase(), code });
            if (res.data?.success) onSuccess(res.data.data.user);
        } catch (err) {
            onError(getErrorMessage(err));
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    if (step === 'email') {
        return (
            <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B', lineHeight: 1.6 }}>
                    No password needed. We will email you a 6-digit code that signs you in.
                </p>
                <Field id="code-email" label="Email Address" required error={fieldError}>
                    <input
                        ref={emailRef} id="code-email" type="email" value={email}
                        onChange={(e) => { onEmailChange(e.target.value); setFieldError(''); onClear(); }}
                        placeholder="name@company.com" disabled={busy} autoComplete="email"
                        className={`auth-input${fieldError ? ' auth-input-err' : ''}`}
                        style={inputStyle(fieldError, busy)}
                    />
                </Field>
                <button type="submit" disabled={busy} className="auth-btn" style={primaryButton(busy)}>
                    {busy ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : 'Send code →'}
                </button>
            </form>
        );
    }

    return (
        <form onSubmit={verify} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F0F6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: '0.85rem 1rem' }} role="status">
                <MailCheck size={18} color="#1D4ED8" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#1E3A8A', lineHeight: 1.6 }}>
                    If an account exists for <strong>{email.trim()}</strong>, we have sent it a 6-digit code. It can take a minute to arrive, so check your spam folder too.
                </p>
            </div>

            <Field id="code-input" label="6-digit code" required error={fieldError}>
                <CodeInput id="code-input" value={code} onChange={(v) => { setCode(v); setFieldError(''); onClear(); }} disabled={busy} error={fieldError} autoFocus />
            </Field>

            {notice && <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803D', fontWeight: 600 }} role="status">{notice}</p>}

            <button type="submit" disabled={busy || code.length !== 6} className="auth-btn" style={primaryButton(busy || code.length !== 6)}>
                {busy ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : 'Sign In →'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" disabled={busy || wait > 0} onClick={() => sendCode(true)} style={linkButton(busy || wait > 0)}>
                    {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
                </button>
                <button type="button" disabled={busy} onClick={() => { setStep('email'); setCode(''); setFieldError(''); setNotice(''); onClear(); }} style={linkButton(busy)}>
                    Use a different email
                </button>
            </div>
        </form>
    );
};

export default CodeLogin;
