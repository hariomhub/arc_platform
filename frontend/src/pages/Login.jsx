import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { loginUser } from '../api/auth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthLoading, login } = useAuth();
    const { showToast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const emailRef = useRef(null);

    // Update page title
    useEffect(() => {
        document.title = 'Sign In | AI Risk Council';
    }, []);

    // Auto-focus email on mount
    useEffect(() => {
        emailRef.current?.focus();
    }, []);

    // Redirect to home if already logged in
    useEffect(() => {
        if (!isAuthLoading && user) {
            navigate('/', { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    const validate = () => {
        const errors = {};
        if (!email.trim()) {
            errors.email = 'Email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = 'Please enter a valid email address.';
        }
        if (!password) {
            errors.password = 'Password is required.';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters.';
        }
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        setIsPending(false);
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        setSubmitting(true);
        try {
            const res = await loginUser({ email: email.trim().toLowerCase(), password });
            if (res.data?.success) {
                login(res.data.data.user);
                showToast('Welcome back!', 'success');
                const from = location.state?.from?.pathname || '/';
                navigate(from, { replace: true });
            }
        } catch (err) {
            const msg = getErrorMessage(err);
            if (msg?.toLowerCase().includes('pending')) {
                setIsPending(true);
            } else {
                setServerError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (isAuthLoading) return null;

    return (
        <div
            style={{
                minHeight: 'calc(100vh - 70px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #F0F4F8 0%, #E8EEF5 100%)',
                padding: '2rem 1rem',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '460px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 32px rgba(0,51,102,0.12)',
                    overflow: 'hidden',
                }}
            >
                {/* Header bar */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, #002244 0%, #003366 100%)',
                        padding: '2rem 2.5rem',
                        textAlign: 'center',
                    }}
                >
                    <h1
                        style={{
                            color: 'white',
                            fontSize: '1.75rem',
                            fontWeight: '800',
                            margin: 0,
                            fontFamily: 'var(--font-serif)',
                        }}
                    >
                        Welcome Back
                    </h1>
                    <p style={{ color: '#93C5FD', fontSize: '0.9rem', marginTop: '0.4rem', marginBottom: 0 }}>
                        Sign in to access your council resources
                    </p>
                </div>

                {/* Form body */}
                <div style={{ padding: '2rem 2.5rem' }}>
                    {/* Pending warning */}
                    {isPending && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                marginBottom: '1.25rem',
                            }}
                            role="alert"
                        >
                            <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: '#92400E' }}>
                                    Account Pending Approval
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#92400E', lineHeight: '1.5' }}>
                                    Your account is pending admin approval. You will be notified once approved.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Server error */}
                    {serverError && !isPending && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                marginBottom: '1.25rem',
                            }}
                            role="alert"
                        >
                            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#DC2626', lineHeight: '1.5' }}>
                                {serverError}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}
                            >
                                Email Address <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <input
                                ref={emailRef}
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); setServerError(''); setIsPending(false); }}
                                placeholder="name@company.com"
                                disabled={submitting}
                                autoComplete="email"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: `1.5px solid ${fieldErrors.email ? '#FCA5A5' : '#CBD5E1'}`,
                                    borderRadius: '8px',
                                    fontSize: '0.92rem',
                                    boxSizing: 'border-box',
                                    fontFamily: 'var(--font-sans)',
                                    outline: 'none',
                                    background: fieldErrors.email ? '#FFF5F5' : 'white',
                                    opacity: submitting ? 0.7 : 1,
                                    transition: 'border-color 0.15s',
                                }}
                                onFocus={(e) => (e.target.style.borderColor = fieldErrors.email ? '#EF4444' : '#003366')}
                                onBlur={(e) => (e.target.style.borderColor = fieldErrors.email ? '#FCA5A5' : '#CBD5E1')}
                            />
                            {fieldErrors.email && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} /> {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}
                            >
                                Password <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="password"
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); setServerError(''); setIsPending(false); }}
                                    placeholder="••••••••"
                                    disabled={submitting}
                                    autoComplete="current-password"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        paddingRight: '2.75rem',
                                        border: `1.5px solid ${fieldErrors.password ? '#FCA5A5' : '#CBD5E1'}`,
                                        borderRadius: '8px',
                                        fontSize: '0.92rem',
                                        boxSizing: 'border-box',
                                        fontFamily: 'var(--font-sans)',
                                        outline: 'none',
                                        background: fieldErrors.password ? '#FFF5F5' : 'white',
                                        opacity: submitting ? 0.7 : 1,
                                        transition: 'border-color 0.15s',
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.password ? '#EF4444' : '#003366')}
                                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.password ? '#FCA5A5' : '#CBD5E1')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#94A3B8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 0,
                                    }}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} /> {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                width: '100%',
                                padding: '0.9rem',
                                background: submitting ? '#94A3B8' : '#003366',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontFamily: 'var(--font-sans)',
                                transition: 'background 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginTop: '0.25rem',
                            }}
                            onMouseOver={(e) => { if (!submitting) e.currentTarget.style.background = '#00509E'; }}
                            onMouseOut={(e) => { if (!submitting) e.currentTarget.style.background = '#003366'; }}
                        >
                            {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                            {submitting ? 'Signing in…' : 'Sign In'}
                        </button>

                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                            Don&apos;t have an account?{' '}
                            <Link
                                to="/register"
                                style={{ color: '#003366', fontWeight: '700', textDecoration: 'none' }}
                            >
                                Register
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            {/* Spinner keyframe (inline global style) */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default Login;
