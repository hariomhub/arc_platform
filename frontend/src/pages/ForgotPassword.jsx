import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2, KeyRound, MailCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPassword, resetPassword } from '../api/auth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';
import { Field, inputStyle, CodeInput, useCountdown, PasswordRules, passwordProblem, EMAIL_RE } from '../components/auth/authUi.jsx';

const RESEND_SECONDS = 60; // matches the server's cooldown between codes

const primaryButton = (busy) => ({
    width: '100%', padding: '0.88rem', background: busy ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)', color: 'white',
    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.93rem', cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: '0.3rem', boxShadow: busy ? 'none' : '0 4px 14px rgba(0,51,102,0.28)', textDecoration: 'none', boxSizing: 'border-box',
});

const linkButton = (disabled) => ({
    background: 'none', border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
    fontSize: '0.82rem', fontWeight: 600, color: disabled ? '#94A3B8' : '#003366',
});

const PasswordField = ({ id, label, value, onChange, error, disabled, autoComplete }) => {
    const [show, setShow] = useState(false);
    return (
        <Field id={id} label={label} required error={error}>
            <div style={{ position: 'relative', display: 'block' }}>
                <input
                    id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
                    placeholder="••••••••" disabled={disabled} autoComplete={autoComplete}
                    className={`auth-input${error ? ' auth-input-err' : ''}`}
                    style={{ ...inputStyle(error, disabled), paddingRight: '2.75rem' }}
                />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </Field>
    );
};

/**
 * Forgot password, for every account type (members, Chapter Leads, founding members, and accounts made
 * through LinkedIn, which get their first password here).
 *   1. enter the email   2. enter the 6-digit code from the inbox + a new password   3. done
 */
const ForgotPassword = () => {
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState('email'); // email | reset | done
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [notice, setNotice] = useState('');
    const [wait, restartWait] = useCountdown(0);
    const emailRef = useRef(null);

    useEffect(() => { document.title = 'Reset Password | Risk AI Council'; }, []);
    useEffect(() => { if (step === 'email') emailRef.current?.focus(); }, [step]);

    const clearErrors = () => { setErrors({}); setServerError(''); };

    const sendCode = async (isResend = false) => {
        const clean = email.trim();
        if (!clean) { setErrors({ email: 'Email is required.' }); return; }
        if (!EMAIL_RE.test(clean)) { setErrors({ email: 'Enter a valid email address.' }); return; }
        clearErrors(); setNotice(''); setBusy(true);
        try {
            await forgotPassword({ email: clean.toLowerCase() });
            setStep('reset'); setCode(''); restartWait(RESEND_SECONDS);
            if (isResend) setNotice('A new code is on its way.');
        } catch (err) {
            setServerError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const submitReset = async (e) => {
        e.preventDefault();
        const found = {};
        if (code.length !== 6) found.code = 'Enter the 6-digit code from your email.';
        const problem = passwordProblem(password);
        if (problem) found.password = problem;
        if (!found.password && password !== confirm) found.confirm = 'Passwords do not match.';
        if (Object.keys(found).length) { setErrors(found); return; }

        clearErrors(); setNotice(''); setBusy(true);
        try {
            await resetPassword({ email: email.trim().toLowerCase(), code, newPassword: password });
            setStep('done');
        } catch (err) {
            setServerError(getErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const heading = {
        email: ['Reset your password', "Enter the email address you use for Risk AI Council and we'll send you a 6-digit code."],
        reset: ['Check your email', 'Enter the code we sent, then choose a new password.'],
        done: ['Password updated', 'You can now sign in with your new password.'],
    }[step];

    return (
        <>
            <style>{`
                @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                .auth-input:focus     { border-color:#003366!important; box-shadow:0 0 0 3px rgba(0,51,102,0.1)!important; background:#fff!important; }
                .auth-input-err:focus { border-color:#EF4444!important; box-shadow:0 0 0 3px rgba(239,68,68,0.1)!important; }
                .auth-btn:hover:not(:disabled) { background:linear-gradient(135deg,#00264d,#004080)!important; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,51,102,0.32)!important; }
                .fp-page {
                    min-height: calc(100vh - 66px);
                    background: linear-gradient(135deg,#E8EEF7 0%,#DDE6F2 100%);
                    display: flex; align-items: center; justify-content: center;
                    padding: clamp(1rem,3vw,2rem) clamp(0.75rem,3vw,1.5rem);
                    box-sizing: border-box;
                }
                .fp-card {
                    width: 100%; max-width: 460px; background: #fff; border-radius: 20px;
                    box-shadow: 0 24px 64px rgba(0,30,70,0.16), 0 4px 16px rgba(0,0,0,0.06);
                    padding: clamp(1.5rem,4vw,2.5rem);
                    animation: fadeUp 0.4s ease both;
                }
            `}</style>

            <div className="fp-page">
                <div className="fp-card">
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step === 'done' ? '#DCFCE7' : '#EAF2FF' }}>
                            {step === 'done' ? <CheckCircle2 size={26} color="#15803D" /> : step === 'reset' ? <MailCheck size={26} color="#003366" /> : <KeyRound size={26} color="#003366" />}
                        </div>
                        <h1 style={{ margin: '0 0 0.4rem', fontSize: 'clamp(1.25rem,3vw,1.5rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{heading[0]}</h1>
                        <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B', lineHeight: 1.6 }}>{heading[1]}</p>
                    </div>

                    {serverError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.1rem' }} role="alert">
                            <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#DC2626', lineHeight: 1.5 }}>{serverError}</p>
                        </div>
                    )}

                    {step === 'email' && (
                        <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <Field id="fp-email" label="Email Address" required error={errors.email}>
                                <input
                                    ref={emailRef} id="fp-email" type="email" value={email}
                                    onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                                    placeholder="name@company.com" disabled={busy} autoComplete="email"
                                    className={`auth-input${errors.email ? ' auth-input-err' : ''}`}
                                    style={inputStyle(errors.email, busy)}
                                />
                            </Field>
                            <button type="submit" disabled={busy} className="auth-btn" style={primaryButton(busy)}>
                                {busy ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : 'Send me a code →'}
                            </button>
                        </form>
                    )}

                    {step === 'reset' && (
                        <form onSubmit={submitReset} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F0F6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: '0.85rem 1rem' }} role="status">
                                <MailCheck size={18} color="#1D4ED8" style={{ flexShrink: 0, marginTop: 1 }} />
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#1E3A8A', lineHeight: 1.6 }}>
                                    If an account exists for <strong>{email.trim()}</strong>, we have sent it a 6-digit code. It can take a minute to arrive, so check your spam folder too.
                                </p>
                            </div>

                            <Field id="fp-code" label="6-digit code" required error={errors.code}>
                                <CodeInput id="fp-code" value={code} onChange={(v) => { setCode(v); clearErrors(); }} disabled={busy} error={errors.code} autoFocus />
                            </Field>

                            <div>
                                <PasswordField id="fp-password" label="New password" value={password} onChange={(v) => { setPassword(v); clearErrors(); }} error={errors.password} disabled={busy} autoComplete="new-password" />
                                <PasswordRules value={password} />
                            </div>
                            <PasswordField id="fp-confirm" label="Confirm new password" value={confirm} onChange={(v) => { setConfirm(v); clearErrors(); }} error={errors.confirm} disabled={busy} autoComplete="new-password" />

                            {notice && <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803D', fontWeight: 600 }} role="status">{notice}</p>}

                            <button type="submit" disabled={busy} className="auth-btn" style={primaryButton(busy)}>
                                {busy ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : 'Reset password'}
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <button type="button" disabled={busy || wait > 0} onClick={() => sendCode(true)} style={linkButton(busy || wait > 0)}>
                                    {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
                                </button>
                                <button type="button" disabled={busy} onClick={() => { setStep('email'); clearErrors(); setNotice(''); }} style={linkButton(busy)}>
                                    Use a different email
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'done' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.65, textAlign: 'center' }}>
                                For your security you have been signed out everywhere else, and we have emailed you a confirmation.
                            </p>
                            {/* A full page load on purpose: it also clears any stale signed-in state in this browser. */}
                            <a href="/login" className="auth-btn" style={primaryButton(false)}>Sign in →</a>
                        </div>
                    )}

                    {step !== 'done' && (
                        <p style={{ margin: '1.5rem 0 0', textAlign: 'center' }}>
                            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 600, color: '#003366', textDecoration: 'none' }}>
                                <ArrowLeft size={14} /> Back to sign in
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;
