import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ShieldCheck, BookOpen, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { registerUser, sendEmailOtp, verifyEmailOtp } from '../api/auth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

const getPwStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '#E2E8F0' };
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const map = [
        { label: '', color: '#E2E8F0' },
        { label: 'Weak', color: '#EF4444' },
        { label: 'Fair', color: '#F59E0B' },
        { label: 'Good', color: '#3B82F6' },
        { label: 'Strong', color: '#10B981' },
    ];
    return { score: s, ...map[s] };
};

const ROLES = [
    { value: 'professional', label: 'Professional', desc: 'Free 1-year membership — community access, events & resources' },
];
const ORG_ROLES = [];

const PERKS = [
    { icon: ShieldCheck, text: 'AI Governance Framework & risk tools' },
    { icon: BookOpen, text: 'Research papers, whitepapers & resources' },
    { icon: Users, text: 'Expert community & networking' },
    { icon: TrendingUp, text: 'Events, summits & certifications' },
];

const Field = ({ id, label, required, hint, error, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <label htmlFor={id} style={{ fontSize: '0.8rem', fontWeight: '600', color: error ? '#DC2626' : '#374151' }}>
                {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
            </label>
            {hint && <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{hint}</span>}
        </div>
        {children}
        {error && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: '#DC2626' }}><AlertCircle size={11} />{error}</span>}
    </div>
);

const inputStyle = (hasError, disabled) => ({
    width: '100%', padding: '0.7rem 0.9rem',
    border: `1.5px solid ${hasError ? '#FCA5A5' : '#E2E8F0'}`,
    borderRadius: '10px', fontSize: '0.875rem', boxSizing: 'border-box',
    display: 'block',
    fontFamily: 'var(--font-sans)', outline: 'none',
    background: hasError ? '#FFF5F5' : '#FAFBFC',
    color: '#0F172A', opacity: disabled ? 0.65 : 1,
    transition: 'border-color 0.15s, box-shadow 0.15s',
});

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthLoading } = useAuth();

    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'professional', organization_name: '', professional_sub_type: '', linkedin_url: '' });

    const [subCatSelected, setSubCatSelected] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [otp, setOtp] = useState('');
    const [emailVerificationPhase, setEmailVerificationPhase] = useState('idle');

    const pwStrength = getPwStrength(form.password);
    const showOrgField = ORG_ROLES.includes(form.role);

    useEffect(() => { document.title = 'Create Account | AI Risk Council'; }, []);
    useEffect(() => { if (!isAuthLoading && user) navigate('/', { replace: true }); }, [user, isAuthLoading, navigate]);
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('success') === 'linkedin') {
            setSuccess(true);
        }
        // Pre-fill sub-category from Membership page redirect (?sub=...)
        const sub = params.get('sub');
        if (sub === 'working_professional' || sub === 'final_year_undergrad') {
            setForm(p => ({ ...p, professional_sub_type: sub }));
            setSubCatSelected(true); // came pre-selected from Membership page
        }
    }, [location.search]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
        setFieldErrors(p => ({ ...p, [name]: '' }));
        setServerError('');
    };

    const validateEmailOnly = () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
        return null;
    };

    const handleSendOtp = async () => {
        const err = validateEmailOnly();
        if (err) { setFieldErrors(p => ({ ...p, email: err })); return; }

        setSubmitting(true);
        setServerError('');
        try {
            await sendEmailOtp({ email: form.email.trim().toLowerCase() });
            setEmailVerificationPhase('sent');
        } catch (err) {
            setServerError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) { setFieldErrors(p => ({ ...p, otp: 'Enter 6-digit OTP' })); return; }

        setSubmitting(true);
        setServerError('');
        try {
            await verifyEmailOtp({ email: form.email.trim().toLowerCase(), otp });
            setEmailVerificationPhase('verified');
            setFieldErrors(p => ({ ...p, otp: '', email: '' }));
        } catch (err) {
            setServerError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Full name must be at least 2 characters.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
        else if (emailVerificationPhase !== 'verified') e.email = 'Please verify your email address.';
        if (!form.password) e.password = 'Password is required.';
        else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
        if (showOrgField && !form.organization_name.trim()) e.organization_name = 'Organisation name is required.';
        if (form.role === 'professional' && subCatSelected) {
            if (!form.linkedin_url.trim()) e.linkedin_url = 'LinkedIn profile URL is required.';
            else if (!/^https?:\/\/(www\.)?linkedin\.com\//.test(form.linkedin_url.trim())) e.linkedin_url = 'Enter a valid LinkedIn URL (e.g. https://linkedin.com/in/your-name).';
        }
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setServerError('');
        const errors = validate();
        if (Object.keys(errors).length) { setFieldErrors(errors); return; }
        setFieldErrors({}); setSubmitting(true);
        try {
            await registerUser({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
                role: form.role,
                organization_name: showOrgField ? form.organization_name.trim() : undefined,
                professional_sub_type: form.role === 'professional' ? form.professional_sub_type : undefined,
                linkedin_url: form.role === 'professional' && form.linkedin_url.trim() ? form.linkedin_url.trim() : undefined,
            });
            setSuccess(true);
        } catch (err) { setServerError(getErrorMessage(err)); }
        finally { setSubmitting(false); }
    };

    if (isAuthLoading) return null;

    /* ── Success screen ── */
    if (success) return (
        <>
            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes popIn  { from{opacity:0;transform:scale(0.7)}       to{opacity:1;transform:scale(1)} }
            `}</style>
            <div style={{ minHeight: 'calc(100vh - 66px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#E8EEF7 0%,#DDE6F2 100%)', padding: '2rem 1rem', boxSizing: 'border-box' }}>
                <div style={{ width: '100%', maxWidth: '460px', background: 'white', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,30,70,0.14)', padding: 'clamp(2rem,5vw,3.5rem) clamp(1.25rem,4vw,2.75rem)', textAlign: 'center', animation: 'fadeUp 0.4s ease both' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F0FDF4', border: '2.5px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem', animation: 'popIn 0.45s ease both' }}>
                        <CheckCircle size={40} color="#16A34A" strokeWidth={2} />
                    </div>
                    <h2 style={{ margin: '0 0 0.6rem', fontSize: 'clamp(1.3rem,4vw,1.6rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>You're almost in!</h2>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#475569', lineHeight: 1.7 }}>Your account is <strong style={{ color: '#0F172A' }}>pending admin approval</strong>.</p>
                    <p style={{ margin: '0 0 2rem', fontSize: '0.875rem', color: '#64748B', lineHeight: 1.65 }}>Our team reviews every application. You'll receive a confirmation email once approved — typically within 24–48 hours.</p>
                    <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What happens next?</p>
                        {['Our team reviews your application', 'You receive an approval email', 'Log in for full platform access'].map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.35rem 0', fontSize: '0.828rem', color: '#475569' }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#003366', color: 'white', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>{s}
                            </div>
                        ))}
                    </div>
                    <Link to="/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#003366,#005099)', color: 'white', padding: '0.85rem 2.5rem', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.92rem', boxShadow: '0 4px 14px rgba(0,51,102,0.28)' }}>
                        Back to Sign In →
                    </Link>
                </div>
            </div>
        </>
    );

    return (
        <>
            <style>{`
                @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

                .ra-input:focus     { border-color:#003366!important; box-shadow:0 0 0 3px rgba(0,51,102,0.1)!important; background:#fff!important; }
                .ra-input-err:focus { border-color:#EF4444!important; box-shadow:0 0 0 3px rgba(239,68,68,0.1)!important; }
                .ra-btn:hover:not(:disabled) { background:linear-gradient(135deg,#00264d,#004080)!important; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,51,102,0.35)!important; }
                .ra-role:hover   { border-color:#003366!important; background:#F0F5FF!important; }
                .ra-role.selected{ border-color:#003366!important; background:#EEF4FF!important; }

                /* ── Page ── */
                .rg-page {
                    min-height: calc(100vh - 66px);
                    display: flex; align-items: flex-start; justify-content: center;
                    background: linear-gradient(135deg,#E8EEF7 0%,#DDE6F2 100%);
                    padding: clamp(1rem,3vw,1.5rem) clamp(0.75rem,3vw,1.5rem);
                    box-sizing: border-box;
                }

                /* ── Card ── */
                .rg-card {
                    display: flex; width: 100%; max-width: 980px;
                    border-radius: 20px; overflow: hidden;
                    box-shadow: 0 24px 64px rgba(0,30,70,0.16),0 4px 16px rgba(0,0,0,0.06);
                    animation: fadeUp 0.4s ease both;
                }

                /* ── Left panel ── */
                .rg-left {
                    width: 38%; flex-shrink: 0;
                    background: linear-gradient(160deg,#001529 0%,#003366 55%,#004d99 100%);
                    padding: 3rem 2.25rem;
                    display: flex; flex-direction: column; justify-content: space-between;
                    position: relative; overflow: hidden;
                }

                /* ── Right panel ── */
                .rg-right {
                    flex: 1; background: #ffffff;
                    padding: clamp(1.5rem,3vw,2.5rem) clamp(1.25rem,3vw,2.75rem);
                    box-sizing: border-box;
                }

                /* ── Mobile top banner ── */
                .rg-mobile-banner {
                    display: none;
                    background: linear-gradient(135deg,#001529 0%,#003366 60%,#004d99 100%);
                    padding: 1.5rem 1.25rem;
                    position: relative; overflow: hidden;
                }

                /* ── 2-col form grid ── */
                .rg-2col {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.85rem;
                }

                /* ── Mobile ── */
                @media (max-width: 860px) {
                    .rg-card   { flex-direction: column; border-radius: 16px; }
                    .rg-left   { display: none; }
                    .rg-right  { border-radius: 0 0 16px 16px; max-height: none; padding: 1.5rem 1.25rem 2rem; }
                    .rg-mobile-banner { display: block; border-radius: 16px 16px 0 0; }
                }
                @media (max-width: 500px) {
                    .rg-2col { grid-template-columns: 1fr; }
                }
                @media (max-width: 400px) {
                    .rg-page { padding: 0.75rem; }
                    .rg-card { border-radius: 14px; }
                }
            `}</style>

            <div className="rg-page">
                <div className="rg-card">

                    {/* ── Mobile top banner ── */}
                    <div className="rg-mobile-banner">
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,153,255,0.06)', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '1.25rem' }}>
                                <img src="/ai_logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', transform: 'scale(1.4)', filter: 'brightness(0) invert(1)' }} />
                                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em', transform: 'translate(6px, 3px)' }}>Risk AI Council</span>
                            </Link>
                            <h2 style={{ margin: '0 0 0.3rem', fontSize: 'clamp(1.1rem,4vw,1.4rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Join the AI Risk Council</h2>
                            <p style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>Create your account and gain access to a global community advancing responsible AI governance.</p>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {PERKS.map(({ icon: Icon, text }) => (
                                    <div key={text} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', padding: '4px 10px' }}>
                                        <Icon size={11} color="rgba(255,255,255,0.8)" />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Desktop left panel ── */}
                    <div className="rg-left">
                        <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(0,153,255,0.05)', pointerEvents: 'none' }} />
                        <div>
                            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '1.25rem' }}>
                                <img src="/ai_logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', transform: 'scale(1.4)', filter: 'brightness(0) invert(1)' }} />
                                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em', transform: 'translate(6px, 3px)' }}>Risk AI Council</span>
                            </Link>
                            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.65rem', fontWeight: 800, color: '#fff', lineHeight: 1.22, letterSpacing: '-0.01em' }}>Join the AI Risk Council</h2>
                            <p style={{ margin: '0 0 2rem', fontSize: '0.86rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                                Join as a <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Professional</strong> for community access, or apply for{' '}
                                <strong style={{ color: '#93C5FD' }}>Council Member</strong> for premium platform benefits.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {PERKS.map(({ icon: Icon, text }) => (
                                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={14} color="rgba(255,255,255,0.82)" />
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.78)', fontWeight: 500, lineHeight: 1.4 }}>{text}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '1.75rem', padding: '0.9rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>
                                    ✅&nbsp; Free to join as Professional. No credit card required.<br />🏛️&nbsp; Apply for Council Member once registered.<br />🔒&nbsp; Enterprise-grade security & privacy.
                                </p>
                            </div>
                        </div>
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1.65 }}>
                                Already have an account?{' '}
                                <Link to="/login" style={{ color: 'rgba(147,197,253,0.8)', fontWeight: 600, textDecoration: 'none' }}>Sign in here</Link>
                            </p>
                        </div>
                    </div>

                    {/* ── Right / Form panel ── */}
                    <div className="rg-right">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h1 style={{ margin: '0 0 0.3rem', fontSize: 'clamp(1.2rem,3vw,1.45rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Create your account</h1>
                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
                                Already a member?{' '}<Link to="/login" style={{ color: '#003366', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
                            </p>
                        </div>

                        {serverError && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem' }} role="alert">
                                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '0.84rem', color: '#DC2626', lineHeight: 1.5 }}>{serverError}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            <div className="rg-2col">
                                <Field id="ra-name" label="Full Name" required error={fieldErrors.name}>
                                    <input id="ra-name" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" disabled={submitting} autoComplete="name"
                                        className={`ra-input${fieldErrors.name ? ' ra-input-err' : ''}`} style={inputStyle(fieldErrors.name, submitting)} />
                                </Field>
                                <Field id="ra-email" label="Email Address" required error={fieldErrors.email}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <input id="ra-email" type="email" name="email" value={form.email} onChange={(e) => { handleChange(e); if (emailVerificationPhase !== 'idle') setEmailVerificationPhase('idle'); }} placeholder="name@company.com" disabled={submitting || emailVerificationPhase === 'verified'} autoComplete="email"
                                                className={`ra-input${fieldErrors.email ? ' ra-input-err' : ''}`} style={inputStyle(fieldErrors.email, submitting || emailVerificationPhase === 'verified')} />
                                        </div>
                                        {emailVerificationPhase === 'idle' && (
                                            <button type="button" onClick={handleSendOtp} disabled={submitting || !form.email} className="ra-btn"
                                                style={{ padding: '0.7rem 1rem', background: (submitting || !form.email) ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.8rem', cursor: (submitting || !form.email) ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                                                Verify
                                            </button>
                                        )}
                                        {emailVerificationPhase === 'verified' && (
                                            <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.5rem' }}>
                                                <CheckCircle size={24} color="#10B981" />
                                            </div>
                                        )}
                                    </div>
                                    {emailVerificationPhase === 'sent' && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <input type="text" value={otp} onChange={e => { setOtp(e.target.value); setFieldErrors(p => ({ ...p, otp: '' })) }} placeholder="6-digit OTP" maxLength={6} disabled={submitting}
                                                    className={`ra-input${fieldErrors.otp ? ' ra-input-err' : ''}`} style={inputStyle(fieldErrors.otp, submitting)} />
                                                {fieldErrors.otp && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: '#DC2626', marginTop: '0.3rem' }}><AlertCircle size={11} />{fieldErrors.otp}</span>}
                                            </div>
                                            <button type="button" onClick={handleVerifyOtp} disabled={submitting || otp.length !== 6} className="ra-btn"
                                                style={{ padding: '0.7rem 1rem', background: (submitting || otp.length !== 6) ? '#94A3B8' : '#10B981', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.8rem', cursor: (submitting || otp.length !== 6) ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                                                Submit
                                            </button>
                                        </div>
                                    )}
                                </Field>
                            </div>

                            <Field id="ra-pw" label="Password" required hint="min 8 chars, uppercase, number & symbol" error={fieldErrors.password}>
                                <div style={{ position: 'relative', display: 'block' }}>
                                    <input id="ra-pw" type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Min 8 characters" disabled={submitting} autoComplete="new-password"
                                        className={`ra-input${fieldErrors.password ? ' ra-input-err' : ''}`} style={{ ...inputStyle(fieldErrors.password, submitting), paddingRight: '2.75rem' }} />
                                    <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}
                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {form.password && (
                                    <div style={{ marginTop: '0.4rem' }}>
                                        <div style={{ display: 'flex', gap: 3 }}>
                                            {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwStrength.score ? pwStrength.color : '#E2E8F0', transition: 'background 0.2s' }} />)}
                                        </div>
                                        {pwStrength.label && <p style={{ margin: '3px 0 0', fontSize: '0.71rem', color: pwStrength.color, fontWeight: 600 }}>{pwStrength.label} password</p>}
                                    </div>
                                )}
                            </Field>

                            <Field id="ra-cpw" label="Confirm Password" required error={fieldErrors.confirmPassword}>
                                <div style={{ position: 'relative', display: 'block' }}>
                                    <input id="ra-cpw" type={showConfirmPw ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter password" disabled={submitting} autoComplete="new-password"
                                        className={`ra-input${fieldErrors.confirmPassword ? ' ra-input-err' : ''}`} style={{ ...inputStyle(fieldErrors.confirmPassword, submitting), paddingRight: '2.75rem' }} />
                                    <button type="button" onClick={() => setShowConfirmPw(v => !v)} aria-label={showConfirmPw ? 'Hide' : 'Show'}
                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
                                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </Field>

                            <div>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Membership Type <span style={{ color: '#EF4444' }}>*</span></p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                    {ROLES.map(r => (
                                        <button key={r.value} type="button"
                                            onClick={() => { setForm(p => ({ ...p, role: r.value, organization_name: '' })); setFieldErrors(p => ({ ...p, role: '', organization_name: '' })); }}
                                            className={`ra-role${form.role === r.value ? ' selected' : ''}`}
                                            style={{ padding: '0.7rem 0.85rem', border: `1.5px solid ${form.role === r.value ? '#003366' : '#E2E8F0'}`, borderRadius: 10, background: form.role === r.value ? '#EEF4FF' : '#FAFBFC', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s,background 0.15s' }}>
                                            <p style={{ margin: 0, fontSize: '0.79rem', fontWeight: 700, color: form.role === r.value ? '#003366' : '#1E293B' }}>{r.label}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.69rem', color: '#94A3B8', lineHeight: 1.4 }}>{r.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.role === 'professional' && (
                                <div>
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>I am a <span style={{ color: '#EF4444' }}>*</span></p>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {[
                                            { value: 'working_professional', label: '💼 Working Professional' },
                                            { value: 'final_year_undergrad', label: '🎓 Final Year Undergraduate' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setForm(p => ({ ...p, professional_sub_type: opt.value }));
                                                    setSubCatSelected(true);
                                                }}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '100px',
                                                    border: `2px solid ${form.professional_sub_type === opt.value ? '#003366' : '#E2E8F0'}`,
                                                    background: form.professional_sub_type === opt.value ? '#EEF4FF' : '#FAFBFC',
                                                    color: form.professional_sub_type === opt.value ? '#003366' : '#64748B',
                                                    fontWeight: form.professional_sub_type === opt.value ? 700 : 500,
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    fontFamily: 'var(--font-sans)',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── LinkedIn URL — shown only after sub-category is selected ── */}
                            {form.role === 'professional' && subCatSelected && (
                                <Field id="ra-linkedin" label="LinkedIn Profile URL" required hint="Required for admin verification" error={fieldErrors.linkedin_url}>
                                    <input
                                        id="ra-linkedin"
                                        type="url"
                                        name="linkedin_url"
                                        value={form.linkedin_url}
                                        onChange={handleChange}
                                        placeholder="https://linkedin.com/in/your-name"
                                        disabled={submitting}
                                        className={`ra-input${fieldErrors.linkedin_url ? ' ra-input-err' : ''}`}
                                        style={inputStyle(fieldErrors.linkedin_url, submitting)}
                                    />
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#94A3B8', lineHeight: 1.5 }}>
                                        Admin will review your LinkedIn profile to verify your background before approving your account.
                                    </p>
                                </Field>
                            )}

                            {showOrgField && (
                                <Field id="ra-org" label="Organisation Name" required error={fieldErrors.organization_name}>
                                    <input id="ra-org" type="text" name="organization_name" value={form.organization_name} onChange={handleChange} placeholder="e.g. Acme AI Corp" disabled={submitting}
                                        className={`ra-input${fieldErrors.organization_name ? ' ra-input-err' : ''}`} style={inputStyle(fieldErrors.organization_name, submitting)} />
                                </Field>
                            )}

                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.6 }}>
                                By creating an account you agree to our{' '}
                                <a href="#" style={{ color: '#003366', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>{' '}and{' '}
                                <a href="#" style={{ color: '#003366', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
                            </p>

                            <button type="submit" disabled={submitting || emailVerificationPhase !== 'verified'} className="ra-btn"
                                style={{ width: '100%', padding: '0.88rem', background: (submitting || emailVerificationPhase !== 'verified') ? '#94A3B8' : 'linear-gradient(135deg,#003366,#005099)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.92rem', cursor: (submitting || emailVerificationPhase !== 'verified') ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: (submitting || emailVerificationPhase !== 'verified') ? 'none' : '0 4px 14px rgba(0,51,102,0.28)' }}>
                                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</> : 'Create Account →'}
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                            Continue with LinkedIn
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;