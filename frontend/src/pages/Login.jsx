import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, AlertTriangle, Loader2, ShieldCheck, BookOpen, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { loginUser } from '../api/auth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

const FEATURES = [
    { icon: ShieldCheck, title: 'AI Governance Framework', desc: 'Comprehensive risk assessment and governance toolkit.' },
    { icon: BookOpen, title: 'Research & Resources', desc: 'Peer-reviewed whitepapers, case studies, and lab results.' },
    { icon: Users, title: 'Expert Community', desc: 'Connect with AI safety leaders and executives.' },
    { icon: TrendingUp, title: 'Events & Certifications', desc: 'Live summits, workshops, and professional certifications.' },
];

const Field = ({ id, label, required, error, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label htmlFor={id} style={{ fontSize: '0.82rem', fontWeight: '600', color: error ? '#DC2626' : '#374151' }}>
            {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
        </label>
        {children}
        {error && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#DC2626' }}><AlertCircle size={11} />{error}</span>}
    </div>
);

const inputStyle = (hasError, disabled) => ({
    width: '100%', padding: '0.72rem 0.9rem',
    border: `1.5px solid ${hasError ? '#FCA5A5' : '#E2E8F0'}`,
    borderRadius: '10px', fontSize: '0.9rem', boxSizing: 'border-box',
    display: 'block',
    fontFamily: 'var(--font-sans)', outline: 'none',
    background: hasError ? '#FFF5F5' : '#FAFBFC',
    color: '#0F172A', opacity: disabled ? 0.65 : 1,
    transition: 'border-color 0.15s, box-shadow 0.15s',
});

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

    useEffect(() => { document.title = 'Sign In | AI Risk Council'; }, []);
    useEffect(() => { emailRef.current?.focus(); }, []);
    useEffect(() => { if (!isAuthLoading && user) navigate('/', { replace: true }); }, [user, isAuthLoading, navigate]);
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        if (!error) return;
        const messages = {
            pending: 'Your account is pending admin approval.',
            rejected: 'Your account application has been rejected.',
            expired: 'Your membership has expired. Please renew to continue.',
            no_email: 'LinkedIn did not share your email. Please use email/password login.',
            linkedin_failed: 'LinkedIn sign-in failed. Please try again.',
            linkedin_registered: 'Registration successful via LinkedIn. Your account is pending admin approval — you will be notified once approved.',
        };
        setServerError(messages[error] || 'Sign-in failed. Please try again.');
    }, [location.search]);


    const clear = (f) => { setFieldErrors(p => ({ ...p, [f]: '' })); setServerError(''); setIsPending(false); };
    const validate = () => {
        const e = {};
        if (!email.trim()) e.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';
        if (!password) e.password = 'Password is required.';
        else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError(''); setIsPending(false);
        const errors = validate();
        if (Object.keys(errors).length) { setFieldErrors(errors); return; }
        setFieldErrors({}); setSubmitting(true);
        try {
            const res = await loginUser({ email: email.trim().toLowerCase(), password });
            if (res.data?.success) {
                const u = res.data.data.user;
                login(u);
                showToast('Welcome back!', 'success');
                if (u.role === 'founding_member') navigate('/admin-dashboard', { replace: true });
                else navigate(location.state?.from?.pathname || '/', { replace: true });
            }
        } catch (err) {
            const msg = getErrorMessage(err);
            if (msg?.toLowerCase().includes('pending')) setIsPending(true);
            else setServerError(msg);
        } finally { setSubmitting(false); }
    };

    if (isAuthLoading) return null;

    return (
        <>
            <style>{`
                @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

                .auth-input:focus     { border-color:#003366!important; box-shadow:0 0 0 3px rgba(0,51,102,0.1)!important; background:#fff!important; }
                .auth-input-err:focus { border-color:#EF4444!important; box-shadow:0 0 0 3px rgba(239,68,68,0.1)!important; }
                .auth-btn:hover:not(:disabled) { background:linear-gradient(135deg,#00264d,#004080)!important; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,51,102,0.35)!important; }
                .auth-outline:hover { border-color:#003366!important; background:#F0F4F9!important; }

                /* ── Page wrapper ── */
                .lg-page {
                    min-height: calc(100vh - 66px);
                    background: linear-gradient(135deg,#E8EEF7 0%,#DDE6F2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: clamp(1rem,3vw,2rem) clamp(0.75rem,3vw,1.5rem);
                    box-sizing: border-box;
                }

                /* ── Card ── */
                .lg-card {
                    display: flex;
                    width: 100%;
                    max-width: 940px;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 24px 64px rgba(0,30,70,0.16), 0 4px 16px rgba(0,0,0,0.06);
                    animation: fadeUp 0.4s ease both;
                }

                /* ── Left panel — always shown on desktop ── */
                .lg-left {
                    width: 42%;
                    flex-shrink: 0;
                    background: linear-gradient(160deg,#001529 0%,#003366 55%,#004d99 100%);
                    padding: 3rem 2.5rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                    overflow: hidden;
                }

                /* ── Right panel ── */
                .lg-right {
                    flex: 1;
                    background: #fff;
                    padding: clamp(2rem,4vw,3rem) clamp(1.5rem,4vw,2.75rem);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                /* ── Mobile top banner (hidden on desktop) ── */
                .lg-mobile-banner {
                    display: none;
                    background: linear-gradient(135deg,#001529 0%,#003366 60%,#004d99 100%);
                    padding: 1.5rem 1.25rem;
                    position: relative;
                    overflow: hidden;
                }

                /* ── Responsive: stack vertically on mobile ── */
                @media (max-width: 820px) {
                    .lg-card  { flex-direction: column; border-radius: 16px; }
                    .lg-left  { display: none; }
                    .lg-right { border-radius: 0 0 16px 16px; padding: 1.75rem 1.25rem 2rem; }
                    .lg-mobile-banner { display: block; border-radius: 16px 16px 0 0; }
                }

                @media (max-width: 400px) {
                    .lg-page  { padding: 0.75rem; }
                    .lg-card  { border-radius: 14px; }
                }
            `}</style>

            <div className="lg-page">
                <div className="lg-card">

                    {/* ── Mobile top banner (shows on small screens instead of left panel) ── */}
                    <div className="lg-mobile-banner">
                        {/* Decorative blobs */}
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,153,255,0.06)', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            {/* Logo row */}
                            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '1.25rem' }}>
                                <img src="/ai_logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', transform: 'scale(1.4)', filter: 'brightness(0) invert(1)' }} />
                                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em', transform: 'translate(6px, 3px)' }}>Risk AI Council</span>
                            </Link>
                            <h2 style={{ margin: '0 0 0.35rem', fontSize: 'clamp(1.1rem,4vw,1.4rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Welcome back to the Council</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>Sign in to access governance resources and your AI risk community.</p>
                            {/* Feature pills row */}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                                {FEATURES.map(({ icon: Icon, title }) => (
                                    <div key={title} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', padding: '4px 10px' }}>
                                        <Icon size={11} color="rgba(255,255,255,0.8)" />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Desktop left panel ── */}
                    <div className="lg-left">
                        <div style={{ position: 'absolute', top: -90, right: -90, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(0,153,255,0.05)', pointerEvents: 'none' }} />
                        <div>
                            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '1.25rem' }}>
                                <img src="/ai_logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', transform: 'scale(1.4)', filter: 'brightness(0) invert(1)' }} />
                                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em', transform: 'translate(6px, 3px)' }}>Risk AI Council</span>
                            </Link>
                            <h2 style={{ margin: '0 0 0.6rem', fontSize: '1.75rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>Welcome back to the Council</h2>
                            <p style={{ margin: '0 0 2.25rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>Sign in to access governance resources, events, and your AI risk community.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {FEATURES.map(({ icon: Icon, title, desc }) => (
                                    <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', padding: '0.7rem 0.85rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: 'default' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                            <Icon size={15} color="rgba(255,255,255,0.82)" />
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.79rem', fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{title}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.71rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.65 }}>🔒&nbsp; Enterprise-grade security. Your data is never shared with third parties.</p>
                        </div>
                    </div>

                    {/* ── Right / Form panel ── */}
                    <div className="lg-right">
                        <div style={{ marginBottom: '1.75rem' }}>
                            <h1 style={{ margin: '0 0 0.35rem', fontSize: 'clamp(1.2rem,3vw,1.5rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Sign in to your account</h1>
                            <p style={{ margin: 0, fontSize: '0.855rem', color: '#64748B' }}>
                                No account?{' '}<Link to="/register" style={{ color: '#003366', fontWeight: 700, textDecoration: 'none' }}>Create one free →</Link>
                            </p>
                        </div>

                        {isPending && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1.25rem' }} role="alert">
                                <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: '#92400E' }}>Account Pending Approval</p>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.77rem', color: '#92400E', lineHeight: 1.55 }}>Your account is under review. You'll be notified once approved (typically 24–48 hrs).</p>
                                </div>
                            </div>
                        )}

                        {serverError && !isPending && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1.25rem' }} role="alert">
                                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '0.84rem', color: '#DC2626', lineHeight: 1.5 }}>{serverError}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <Field id="login-email" label="Email Address" required error={fieldErrors.email}>
                                <input ref={emailRef} id="login-email" type="email" value={email}
                                    onChange={e => { setEmail(e.target.value); clear('email'); }}
                                    placeholder="name@company.com" disabled={submitting} autoComplete="email"
                                    className={`auth-input${fieldErrors.email ? ' auth-input-err' : ''}`}
                                    style={inputStyle(fieldErrors.email, submitting)} />
                            </Field>

                            <Field id="login-pw" label="Password" required error={fieldErrors.password}>
                                <div style={{ position: 'relative', display: 'block' }}>
                                    <input id="login-pw" type={showPw ? 'text' : 'password'} value={password}
                                        onChange={e => { setPassword(e.target.value); clear('password'); }}
                                        placeholder="••••••••" disabled={submitting} autoComplete="current-password"
                                        className={`auth-input${fieldErrors.password ? ' auth-input-err' : ''}`}
                                        style={{ ...inputStyle(fieldErrors.password, submitting), paddingRight: '2.75rem' }} />
                                    <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}
                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', flexShrink: 0 }}>
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </Field>

                            <button type="submit" disabled={submitting} className="auth-btn"
                                style={{ width: '100%', padding: '0.88rem', background: submitting ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.93rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '0.3rem', boxShadow: submitting ? 'none' : '0 4px 14px rgba(0,51,102,0.28)' }}>
                                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : 'Sign In →'}
                            </button>
                        </form>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
                            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} /><span style={{ fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600, letterSpacing: '0.06em' }}>OR</span><div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
                        </div>

                        {/* ── LinkedIn OAuth button ── */}

                        <a href="/api/auth/linkedin"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                width: '100%', padding: '0.8rem',
                                border: '1.5px solid #0077B5', borderRadius: 10,
                                fontSize: '0.875rem', fontWeight: 600, color: '#0077B5',
                                textDecoration: 'none', background: '#fff',
                                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                                boxSizing: 'border-box',
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = '#0077B5'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#0077B5'; }}
                        >
                            {/* LinkedIn SVG icon */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                            Continue with LinkedIn
                        </a>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
                            <span style={{ fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600, letterSpacing: '0.06em' }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
                        </div>

                        <Link to="/register" className="auth-outline"
                            style={{ display: 'block', textAlign: 'center', padding: '0.8rem', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, color: '#374151', textDecoration: 'none', background: '#FAFBFC', transition: 'border-color 0.15s,background 0.15s' }}>
                            Create a new account
                        </Link>

                        <p style={{ margin: '1.5rem 0 0', fontSize: '0.7rem', color: '#CBD5E1', textAlign: 'center', lineHeight: 1.65 }}>
                            By signing in you agree to our <a href="#" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Terms</a> and <a href="#" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;