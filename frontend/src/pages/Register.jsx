import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { registerUser } from '../api/auth.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Password strength ────────────────────────────────────────────────────────
const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '#E2E8F0' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const map = [
        { label: '', color: '#E2E8F0' },
        { label: 'Weak', color: '#EF4444' },
        { label: 'Fair', color: '#F59E0B' },
        { label: 'Good', color: '#3B82F6' },
        { label: 'Strong', color: '#10B981' },
    ];
    return { score, ...map[score] };
};

const ROLES = [
    { value: 'free_member', label: 'Free Member' },
    { value: 'paid_member', label: 'Paid Member' },
    { value: 'executive', label: 'Executive' },
    { value: 'university', label: 'University' },
    { value: 'product_company', label: 'Product Company' },
];

const ROLES_WITH_ORG = ['university', 'product_company'];

const Register = () => {
    const navigate = useNavigate();
    const { user, isAuthLoading } = useAuth();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'free_member',
        organization_name: '',
    });
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const pwStrength = getPasswordStrength(form.password);
    const showOrgField = ROLES_WITH_ORG.includes(form.role);

    useEffect(() => {
        document.title = 'Register | AI Risk Council';
    }, []);

    useEffect(() => {
        if (!isAuthLoading && user) {
            navigate('/', { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => ({ ...prev, [name]: '' }));
        setServerError('');
    };

    const validate = () => {
        const errors = {};
        if (!form.name.trim() || form.name.trim().length < 2)
            errors.name = 'Full name must be at least 2 characters.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
            errors.email = 'Please enter a valid email address.';
        if (!form.password)
            errors.password = 'Password is required.';
        else if (form.password.length < 8)
            errors.password = 'Password must be at least 8 characters.';
        if (form.password !== form.confirmPassword)
            errors.confirmPassword = 'Passwords do not match.';
        if (showOrgField && !form.organization_name.trim())
            errors.organization_name = 'Organisation name is required for this role.';
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        setSubmitting(true);
        try {
            await registerUser({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
                role: form.role,
                organization_name: showOrgField ? form.organization_name.trim() : undefined,
            });
            setSuccess(true);
        } catch (err) {
            setServerError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    if (isAuthLoading) return null;

    // ── Success State ────────────────────────────────────────────────────────
    if (success) {
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
                        maxWidth: '480px',
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 4px 32px rgba(0,51,102,0.12)',
                        padding: '3rem 2.5rem',
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: '#F0FDF4',
                            border: '2px solid #BBF7D0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                        }}
                    >
                        <CheckCircle size={36} color="#16A34A" />
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.75rem' }}>
                        Registration Submitted!
                    </h2>
                    <p style={{ fontSize: '1rem', color: '#475569', lineHeight: '1.7', marginBottom: '0.5rem' }}>
                        Your account is <strong>pending admin approval</strong>.
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: '1.6', marginBottom: '2rem' }}>
                        You will be notified once your account has been reviewed and approved.
                    </p>
                    <Link
                        to="/login"
                        style={{
                            display: 'inline-block',
                            background: '#003366',
                            color: 'white',
                            padding: '0.8rem 2rem',
                            borderRadius: '8px',
                            fontWeight: '700',
                            textDecoration: 'none',
                            fontSize: '0.92rem',
                        }}
                    >
                        Back to Sign In
                    </Link>
                </div>
            </div>
        );
    }

    // ── Registration Form ────────────────────────────────────────────────────
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
                    maxWidth: '480px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 32px rgba(0,51,102,0.12)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
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
                        Create Your Account
                    </h1>
                    <p style={{ color: '#93C5FD', fontSize: '0.9rem', marginTop: '0.4rem', marginBottom: 0 }}>
                        Join the AI Risk Council community
                    </p>
                </div>

                <div style={{ padding: '2rem 2.5rem' }}>
                    {/* Server error */}
                    {serverError && (
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

                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Full Name */}
                        <FieldWrapper label="Full Name" required error={fieldErrors.name}>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Jane Smith"
                                disabled={submitting}
                                autoComplete="name"
                                style={fieldInputStyles(fieldErrors.name, submitting)}
                                onFocus={(e) => (e.target.style.borderColor = fieldErrors.name ? '#EF4444' : '#003366')}
                                onBlur={(e) => (e.target.style.borderColor = fieldErrors.name ? '#FCA5A5' : '#CBD5E1')}
                            />
                        </FieldWrapper>

                        {/* Email */}
                        <FieldWrapper label="Email Address" required error={fieldErrors.email}>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="name@company.com"
                                disabled={submitting}
                                autoComplete="email"
                                style={fieldInputStyles(fieldErrors.email, submitting)}
                                onFocus={(e) => (e.target.style.borderColor = fieldErrors.email ? '#EF4444' : '#003366')}
                                onBlur={(e) => (e.target.style.borderColor = fieldErrors.email ? '#FCA5A5' : '#CBD5E1')}
                            />
                        </FieldWrapper>

                        {/* Password */}
                        <FieldWrapper label="Password" required hint="Min. 8 chars, uppercase, number & symbol" error={fieldErrors.password}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Min. 8 characters"
                                    disabled={submitting}
                                    autoComplete="new-password"
                                    style={{ ...fieldInputStyles(fieldErrors.password, submitting), paddingRight: '2.75rem' }}
                                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.password ? '#EF4444' : '#003366')}
                                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.password ? '#FCA5A5' : '#CBD5E1')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </FieldWrapper>

                        {/* Strength bar */}
                        {form.password && (
                            <div style={{ marginTop: '-0.5rem' }}>
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            style={{
                                                flex: 1, height: '3px', borderRadius: '2px',
                                                background: i <= pwStrength.score ? pwStrength.color : '#E2E8F0',
                                                transition: 'background 0.2s',
                                            }}
                                        />
                                    ))}
                                </div>
                                {pwStrength.label && (
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: pwStrength.color, fontWeight: '600' }}>
                                        {pwStrength.label} password
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Confirm Password */}
                        <FieldWrapper label="Confirm Password" required error={fieldErrors.confirmPassword}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirmPw ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Re-enter password"
                                    disabled={submitting}
                                    autoComplete="new-password"
                                    style={{ ...fieldInputStyles(fieldErrors.confirmPassword, submitting), paddingRight: '2.75rem' }}
                                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.confirmPassword ? '#EF4444' : '#003366')}
                                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.confirmPassword ? '#FCA5A5' : '#CBD5E1')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPw((v) => !v)}
                                    aria-label={showConfirmPw ? 'Hide confirm password' : 'Show confirm password'}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}
                                >
                                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </FieldWrapper>

                        {/* Role */}
                        <FieldWrapper label="Role" required error={fieldErrors.role}>
                            <select
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                disabled={submitting}
                                style={{ ...fieldInputStyles(fieldErrors.role, submitting), cursor: 'pointer', appearance: 'auto' }}
                            >
                                {ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </FieldWrapper>

                        {/* Organisation (conditional) */}
                        {showOrgField && (
                            <FieldWrapper label="Organisation Name" required error={fieldErrors.organization_name}>
                                <input
                                    type="text"
                                    name="organization_name"
                                    value={form.organization_name}
                                    onChange={handleChange}
                                    placeholder={form.role === 'university' ? 'e.g. MIT' : 'e.g. Acme Corp'}
                                    disabled={submitting}
                                    style={fieldInputStyles(fieldErrors.organization_name, submitting)}
                                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.organization_name ? '#EF4444' : '#003366')}
                                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.organization_name ? '#FCA5A5' : '#CBD5E1')}
                                />
                            </FieldWrapper>
                        )}

                        {/* Terms */}
                        <p style={{ fontSize: '0.775rem', color: '#94A3B8', margin: 0, lineHeight: '1.55' }}>
                            By creating an account you agree to our{' '}
                            <a href="#" style={{ color: '#003366', fontWeight: '600' }}>Terms of Service</a> and{' '}
                            <a href="#" style={{ color: '#003366', fontWeight: '600' }}>Privacy Policy</a>.
                        </p>

                        {/* Submit */}
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
                            {submitting ? 'Creating account…' : 'Create Account'}
                        </button>

                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ color: '#003366', fontWeight: '700', textDecoration: 'none' }}>
                                Sign In
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fieldInputStyles = (hasError, disabled) => ({
    width: '100%',
    padding: '0.75rem',
    border: `1.5px solid ${hasError ? '#FCA5A5' : '#CBD5E1'}`,
    borderRadius: '8px',
    fontSize: '0.92rem',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    background: hasError ? '#FFF5F5' : 'white',
    opacity: disabled ? 0.7 : 1,
    transition: 'border-color 0.15s',
});

const FieldWrapper = ({ label, required, hint, error, children }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
            <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                {label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
            </label>
            {hint && <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{hint}</span>}
        </div>
        {children}
        {error && (
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> {error}
            </p>
        )}
    </div>
);

export default Register;
