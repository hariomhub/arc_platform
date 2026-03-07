/**
 * Membership.jsx — Tier display + Waitlist + Auth
 * ─────────────────────────────────────────────────
 * Sections:
 *   1. Hero
 *   2. Tier cards (Basic / Professional / Enterprise) — "Coming Soon" payment
 *   3. Features comparison table
 *   4. Waitlist form  → POST /api/waitlist
 *   5. Auth form (Login / Register)
 *
 * Payment integration points are marked with // STRIPE_READY comments.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Check, X, Shield, AlertCircle, Eye, EyeOff,
    CheckCircle2, XCircle, Star, Zap, Building2,
    Clock, Mail, ArrowRight, Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { loginUser, registerUser } from '../api/auth.js';
import { joinWaitlist } from '../api/waitlist.js';
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

// ─── Reusable input ───────────────────────────────────────────────────────────
const InputField = ({ label, type = 'text', name, value, onChange, placeholder, required = true, hint, error, rightElement }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
            <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                {label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
            </label>
            {hint && <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{hint}</span>}
        </div>
        <div style={{ position: 'relative' }}>
            <input
                type={type} name={name} value={value} onChange={onChange}
                required={required} placeholder={placeholder}
                style={{
                    width: '100%', padding: '0.75rem',
                    paddingRight: rightElement ? '2.75rem' : '0.75rem',
                    border: `1.5px solid ${error ? '#FCA5A5' : '#CBD5E1'}`,
                    borderRadius: '8px', fontSize: '0.92rem', boxSizing: 'border-box',
                    fontFamily: 'var(--font-sans)', outline: 'none',
                    background: error ? '#FFF5F5' : 'white',
                }}
                onFocus={e => e.target.style.borderColor = error ? '#EF4444' : '#003366'}
                onBlur={e => e.target.style.borderColor = error ? '#FCA5A5' : '#CBD5E1'}
            />
            {rightElement && (
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94A3B8' }}>
                    {rightElement}
                </span>
            )}
        </div>
        {error && (
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> {error}
            </p>
        )}
    </div>
);

// ─── Tier data (payment-ready — STRIPE_READY: swap CTA to Stripe checkout) ────
const TIERS = [
    {
        id: 'basic', name: 'Basic', icon: Shield, iconColor: '#64748B',
        price: 'Free', priceDetail: 'Forever free',
        description: 'Ideal for individuals exploring AI governance fundamentals.',
        features: [
            { label: 'Public news & resources', included: true },
            { label: 'Events calendar', included: true },
            { label: 'Monthly newsletter', included: true },
            { label: 'Community Q&A (read)', included: true },
            { label: 'Audit templates', included: false },
            { label: 'Member-only research', included: false },
            { label: 'Priority event access', included: false },
        ],
        highlighted: false, cta: 'Get Started Free', badge: null,
    },
    {
        id: 'professional', name: 'Professional', icon: Zap, iconColor: '#003366',
        price: '$49', priceDetail: 'per month, billed annually',
        description: 'For risk professionals, compliance leads, and AI governance practitioners.',
        features: [
            { label: 'Everything in Basic', included: true },
            { label: 'All audit templates (12+)', included: true },
            { label: 'Member-only research', included: true },
            { label: 'Priority event access', included: true },
            { label: 'Community Q&A (post & vote)', included: true },
            { label: 'Peer benchmarking data', included: true },
            { label: 'Certification discounts', included: false },
        ],
        highlighted: true, cta: 'Join Waitlist', badge: 'Most Popular',
    },
    {
        id: 'enterprise', name: 'Enterprise', icon: Building2, iconColor: '#7C3AED',
        price: 'Custom', priceDetail: 'Contact us for pricing',
        description: 'For organizations, universities, and product companies needing team access.',
        features: [
            { label: 'Everything in Professional', included: true },
            { label: 'Team seats (unlimited)', included: true },
            { label: 'Private advisory sessions', included: true },
            { label: 'Co-branded research', included: true },
            { label: 'API access', included: true },
            { label: 'Dedicated account manager', included: true },
            { label: 'Custom integrations', included: true },
        ],
        highlighted: false, cta: 'Contact Us', badge: 'Enterprise',
    },
];

const COMPARISON_ROWS = [
    { feature: 'Public news & resources',       basic: true,  professional: true,  enterprise: true  },
    { feature: 'Events calendar',               basic: true,  professional: true,  enterprise: true  },
    { feature: 'Monthly newsletter',            basic: true,  professional: true,  enterprise: true  },
    { feature: 'Community Q&A (read)',          basic: true,  professional: true,  enterprise: true  },
    { feature: 'Community Q&A (post & vote)',   basic: false, professional: true,  enterprise: true  },
    { feature: 'Audit templates',               basic: false, professional: true,  enterprise: true  },
    { feature: 'Member-only research',          basic: false, professional: true,  enterprise: true  },
    { feature: 'Priority event registration',   basic: false, professional: true,  enterprise: true  },
    { feature: 'Peer benchmarking data',        basic: false, professional: true,  enterprise: true  },
    { feature: 'Team seats',                    basic: false, professional: false, enterprise: true  },
    { feature: 'Advisory sessions',             basic: false, professional: false, enterprise: true  },
    { feature: 'API access',                    basic: false, professional: false, enterprise: true  },
];

const ROLE_LABELS = {
    admin: 'Administrator', executive: 'Executive', paid_member: 'Paid Member',
    product_company: 'Product Company', university: 'University', free_member: 'Member',
};

// ─── Membership Page ──────────────────────────────────────────────────────────
const Membership = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoggedIn, isAdmin, login, logout } = useAuth();

    // Auth
    const [authMode, setAuthMode] = useState(location.state?.mode || 'login');
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', organization_name: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // Waitlist
    const [wlForm, setWlForm] = useState({ email: '', name: '', tier: 'professional' });
    const [wlLoading, setWlLoading] = useState(false);
    const [wlSuccess, setWlSuccess] = useState('');
    const [wlError, setWlError] = useState('');

    const authSectionRef = useRef(null);
    const waitlistRef = useRef(null);
    const pwStrength = getPasswordStrength(form.password);

    useEffect(() => {
        document.title = 'Membership | AI Risk Council';
        if (location.state?.mode) {
            setTimeout(() => authSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        }
    }, []);

    const scrollToAuth = (mode = 'register') => {
        setAuthMode(mode);
        setTimeout(() => authSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    const scrollToWaitlist = (tier = 'professional') => {
        setWlForm(prev => ({ ...prev, tier }));
        setTimeout(() => waitlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    // ── Auth handlers ─────────────────────────────────────────────────────────
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
        setAuthError('');
    };

    const validateAuth = () => {
        const errors = {};
        if (authMode === 'register') {
            if (!form.name.trim() || form.name.trim().length < 2) errors.name = 'Full name must be at least 2 characters.';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address.';
        if (!form.password) errors.password = 'Password is required.';
        else if (authMode === 'register' && form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
        else if (authMode === 'register' && !/[A-Z]/.test(form.password)) errors.password = 'Must contain at least 1 uppercase letter.';
        else if (authMode === 'register' && !/[0-9]/.test(form.password)) errors.password = 'Must contain at least 1 number.';
        if (authMode === 'register' && form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
        return errors;
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthError(''); setAuthSuccess(''); setIsPending(false);
        const errors = validateAuth();
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
        setFieldErrors({});
        setAuthLoading(true);
        try {
            if (authMode === 'login') {
                const res = await loginUser({ email: form.email.trim().toLowerCase(), password: form.password });
                if (res.data?.success) {
                    const userData = res.data.data.user;
                    login(userData);
                    if (userData.role === 'admin') navigate('/admin-dashboard', { replace: true });
                    else navigate('/', { replace: true });
                }
            } else {
                const res = await registerUser({
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    organization_name: form.organization_name.trim() || undefined,
                    role: 'free_member',
                });
                if (res.data?.success) {
                    setAuthSuccess('Registration successful! Your account is pending admin approval. You will be notified by email.');
                    setForm({ name: '', email: '', password: '', confirmPassword: '', organization_name: '' });
                }
            }
        } catch (err) {
            const msg = getErrorMessage(err);
            if (msg?.toLowerCase().includes('pending')) setIsPending(true);
            else setAuthError(msg || 'Something went wrong. Please try again.');
        } finally {
            setAuthLoading(false);
        }
    };

    // ── Waitlist handlers ─────────────────────────────────────────────────────
    const handleWlChange = (e) => { const { name, value } = e.target; setWlForm(prev => ({ ...prev, [name]: value })); setWlError(''); };

    const handleWlSubmit = async (e) => {
        e.preventDefault();
        if (!wlForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wlForm.email)) { setWlError('Please enter a valid email address.'); return; }
        setWlLoading(true); setWlError(''); setWlSuccess('');
        try {
            const res = await joinWaitlist({ email: wlForm.email, name: wlForm.name || undefined, tier: wlForm.tier });
            setWlSuccess(res.data?.data?.message || "You're on the waitlist!");
            setWlForm(prev => ({ ...prev, email: '', name: '' }));
        } catch (err) {
            setWlError(getErrorMessage(err) || 'Failed to join. Please try again.');
        } finally {
            setWlLoading(false);
        }
    };

    return (
        <div style={{ fontFamily: 'var(--font-sans)' }}>

            {/* ── 1. Hero ─────────────────────────────────────────────────── */}
            <section style={{ background: 'linear-gradient(135deg, #001a33 0%, #003366 50%, #004d99 100%)', color: 'white', textAlign: 'center', padding: '4rem 2rem 3rem' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: '#93C5FD', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid rgba(147,197,253,0.3)', marginBottom: '1.5rem' }}>
                        Council Membership
                    </span>
                    <h1 style={{ color: 'white', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: '800', margin: '0 0 1rem', lineHeight: 1.2 }}>
                        Join the AI Risk Council
                    </h1>
                    <p style={{ color: '#CBD5E1', fontSize: '1.15rem', lineHeight: '1.75', margin: '0 auto 2rem', maxWidth: '580px' }}>
                        A global community of AI risk professionals, researchers, and governance leaders building safer AI systems.
                    </p>
                    {!isLoggedIn && (
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => scrollToAuth('register')} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}
                                style={{ background: 'white', color: '#003366', border: 'none', borderRadius: '8px', padding: '0.85rem 2rem', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'transform 0.15s' }}>
                                Create Free Account
                            </button>
                            <button onClick={() => scrollToAuth('login')}
                                style={{ background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: '8px', padding: '0.85rem 2rem', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                Sign In
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* ── 2. Logged-in view ────────────────────────────────────────── */}
            {isLoggedIn && (
                <section style={{ padding: '3rem 2rem', background: '#F8FAFC' }}>
                    <div style={{ maxWidth: '540px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.3rem', fontWeight: '800', flexShrink: 0 }}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1E293B', fontWeight: '700' }}>{user?.name}</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748B' }}>{user?.email}</p>
                            </div>
                            <span style={{ background: '#003366', color: 'white', padding: '0.3rem 0.85rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {ROLE_LABELS[user?.role] || user?.role}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {isAdmin?.() && <button onClick={() => navigate('/admin-dashboard')} style={{ flex: 1, minWidth: '140px', padding: '0.7rem 1rem', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Admin Dashboard</button>}
                            <button onClick={() => navigate('/profile')} style={{ flex: 1, minWidth: '140px', padding: '0.7rem 1rem', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>View Profile</button>
                            <button onClick={logout} style={{ flex: 1, minWidth: '120px', padding: '0.7rem 1rem', background: 'none', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Sign Out</button>
                        </div>
                    </div>
                </section>
            )}

            {/* ── 3. Tier Cards ────────────────────────────────────────────── */}
            <section style={{ padding: '3rem 2rem', background: 'white' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: '#1E293B', margin: '0 0 0.75rem', fontWeight: '800' }}>Choose Your Membership Tier</h2>
                        <p style={{ color: '#64748B', fontSize: '1rem', margin: 0 }}>Paid tiers are coming soon. Join the waitlist to get founding member pricing.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
                        {TIERS.map((tier) => {
                            const Icon = tier.icon;
                            const isPaid = tier.id !== 'basic';
                            return (
                                <div key={tier.id}
                                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = tier.highlighted ? '0 20px 50px rgba(0,51,102,0.2)' : '0 8px 24px rgba(0,0,0,0.1)'; }}
                                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = tier.highlighted ? '0 12px 40px rgba(0,51,102,0.15)' : '0 2px 8px rgba(0,0,0,0.04)'; }}
                                    style={{ border: tier.highlighted ? '2px solid #003366' : '1.5px solid #E2E8F0', borderRadius: '16px', padding: '2rem', background: tier.highlighted ? 'linear-gradient(to bottom, #F8FAFF, white)' : 'white', position: 'relative', overflow: 'hidden', boxShadow: tier.highlighted ? '0 12px 40px rgba(0,51,102,0.15)' : '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                                    {tier.badge && <span style={{ position: 'absolute', top: 0, right: 0, background: tier.highlighted ? '#003366' : '#7C3AED', color: 'white', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', padding: '0.3rem 1rem', borderBottomLeftRadius: '10px', textTransform: 'uppercase' }}>{tier.badge}</span>}
                                    {isPaid && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}><Clock size={13} color='#F59E0B' /><span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coming Soon</span></div>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${tier.iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={tier.iconColor} /></div>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1E293B', fontWeight: '700' }}>{tier.name}</h3>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: '800', color: tier.highlighted ? '#003366' : '#1E293B' }}>{tier.price}</span>
                                        {tier.id === 'professional' && <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: '6px' }}>/mo</span>}
                                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>{tier.priceDetail}</p>
                                    </div>
                                    <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{tier.description}</p>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                        {tier.features.map(f => (
                                            <li key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: f.included ? '#374151' : '#CBD5E1' }}>
                                                {f.included ? <Check size={15} color={tier.highlighted ? '#003366' : '#10B981'} style={{ flexShrink: 0 }} /> : <X size={15} color='#CBD5E1' style={{ flexShrink: 0 }} />}
                                                {f.label}
                                            </li>
                                        ))}
                                    </ul>
                                    {tier.id === 'basic' ? (
                                        <button onClick={() => scrollToAuth('register')} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'transparent', border: '1.5px solid #003366', color: '#003366', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{tier.cta}</button>
                                    ) : tier.id === 'enterprise' ? (
                                        <button onClick={() => navigate('/contact')} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#7C3AED', border: 'none', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{tier.cta}</button>
                                    ) : (
                                        <button onClick={() => scrollToWaitlist(tier.id)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#003366', border: 'none', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Mail size={15} />{tier.cta}</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── 4. Feature Comparison ─────────────────────────────────────── */}
            <section style={{ padding: '2.5rem 2rem', background: '#F8FAFC' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '1.6rem', color: '#1E293B', marginBottom: '2rem', fontWeight: '800' }}>Full Feature Comparison</h2>
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                            <thead>
                                <tr style={{ background: '#003366' }}>
                                    <th style={{ padding: '1rem 1.25rem', textAlign: 'left', color: 'white', fontSize: '0.85rem', fontWeight: '600', width: '40%' }}>Feature</th>
                                    {TIERS.map(t => <th key={t.id} style={{ padding: '1rem', textAlign: 'center', color: 'white', fontSize: '0.85rem', fontWeight: '700' }}>{t.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON_ROWS.map((row, i) => (
                                    <tr key={row.feature} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'white' : '#FAFBFC' }}>
                                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>{row.feature}</td>
                                        {['basic', 'professional', 'enterprise'].map(tier => (
                                            <td key={tier} style={{ padding: '0.85rem', textAlign: 'center' }}>
                                                {row[tier] ? <CheckCircle2 size={18} color='#10B981' style={{ margin: '0 auto' }} /> : <XCircle size={18} color='#E2E8F0' style={{ margin: '0 auto' }} />}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ── 5. Waitlist Form ──────────────────────────────────────────── */}
            <section ref={waitlistRef} style={{ padding: '2.5rem 2rem', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative elements */}
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
                
                <div style={{ maxWidth: '580px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.15) 100%)', padding: '0.45rem 1.1rem', borderRadius: '100px', marginBottom: '1.25rem', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 0 20px rgba(251,191,36,0.2)' }}>
                        <Star size={14} color='#FCD34D' fill='#FCD34D' /><span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#FCD34D', letterSpacing: '0.12em', textTransform: 'uppercase' }}>✨ Early Access</span>
                    </div>
                    <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', color: 'white', fontWeight: '900', margin: '0 0 0.85rem', lineHeight: '1.2' }}>Be First When We Launch</h2>
                    <p style={{ color: '#CBD5E1', fontSize: '1rem', lineHeight: '1.75', marginBottom: '2.25rem', maxWidth: '500px', margin: '0 auto 2.25rem' }}>
                        Join the waitlist for exclusive early access, founding member pricing, and first pick of limited seats.
                    </p>

                    {wlSuccess ? (
                        <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%)', border: '1.5px solid rgba(16,185,129,0.4)', borderRadius: '16px', padding: '2rem', color: 'white', boxShadow: '0 8px 32px rgba(16,185,129,0.2)' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <CheckCircle2 size={32} color='#10B981' />
                            </div>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem', color: '#D1FAE5' }}>{wlSuccess}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleWlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '5px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {TIERS.filter(t => t.id !== 'basic').map(t => (
                                    <button key={t.id} type="button" onClick={() => setWlForm(prev => ({ ...prev, tier: t.id }))}
                                        style={{ flex: 1, padding: '0.7rem', border: 'none', borderRadius: '9px', background: wlForm.tier === t.id ? 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)' : 'transparent', color: wlForm.tier === t.id ? '#1E293B' : 'rgba(255,255,255,0.8)', fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', boxShadow: wlForm.tier === t.id ? '0 4px 12px rgba(251,191,36,0.3)' : 'none' }}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                            <input type="text" name="name" value={wlForm.name} onChange={handleWlChange} placeholder="Your name (optional)"
                                style={{ padding: '1rem 1.25rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', fontFamily: 'var(--font-sans)', outline: 'none', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(251,191,36,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }} />
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <input type="email" name="email" value={wlForm.email} onChange={handleWlChange} placeholder="Enter your email *" required
                                    style={{ flex: 1, minWidth: '200px', padding: '1rem 1.25rem', borderRadius: '10px', border: `1.5px solid ${wlError ? '#FCA5A5' : 'rgba(255,255,255,0.15)'}`, background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', fontFamily: 'var(--font-sans)', outline: 'none', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
                                    onFocus={e => { e.target.style.borderColor = wlError ? '#FCA5A5' : 'rgba(251,191,36,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }} onBlur={e => { e.target.style.borderColor = wlError ? '#FCA5A5' : 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }} />
                                <button type="submit" disabled={wlLoading} 
                                    style={{ padding: '1rem 2rem', background: wlLoading ? '#94A3B8' : 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)', color: '#1E293B', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.95rem', cursor: wlLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, boxShadow: wlLoading ? 'none' : '0 6px 20px rgba(251,191,36,0.4)', transition: 'all 0.2s' }}
                                    onMouseOver={e => { if (!wlLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(251,191,36,0.5)'; } }}
                                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = wlLoading ? 'none' : '0 6px 20px rgba(251,191,36,0.4)'; }}>
                                    {wlLoading ? <><Loader2 size={18} className="spin" />Wait...</> : <><ArrowRight size={18} />Join Waitlist</>}
                                </button>
                            </div>
                            {wlError && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><AlertCircle size={14} />{wlError}</p>}
                            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: '0.5rem 0 0', textAlign: 'center' }}>🔒 No spam. No credit card required. Unsubscribe anytime.</p>
                        </form>
                    )}
                </div>
            </section>

            {/* ── 6. Auth Form (Login / Register) ──────────────────────────── */}
            {!isLoggedIn && (
                <section ref={authSectionRef} style={{ padding: '3rem 2rem', background: '#F8FAFC' }}>
                    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                        <h2 style={{ textAlign: 'center', color: '#1E293B', marginBottom: '0.4rem', fontSize: '1.6rem', fontWeight: '800' }}>
                            {authMode === 'login' ? 'Welcome Back' : 'Create Your Account'}
                        </h2>
                        <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.9rem', marginBottom: '2rem' }}>
                            {authMode === 'login' ? 'Sign in to access your council resources.' : "Join the AI Risk Council — it's free to start."}
                        </p>

                        {/* Tab switcher */}
                        <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '1.75rem' }}>
                            {[{ mode: 'login', label: 'Sign In' }, { mode: 'register', label: 'Register' }].map(({ mode, label }) => (
                                <button key={mode} type="button"
                                    onClick={() => { setAuthMode(mode); setFieldErrors({}); setAuthError(''); setAuthSuccess(''); setIsPending(false); }}
                                    style={{ flex: 1, padding: '0.7rem', border: 'none', borderRadius: '8px', background: authMode === mode ? 'white' : 'transparent', color: authMode === mode ? '#003366' : '#64748B', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: authMode === mode ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {isPending && <div style={{ display: 'flex', gap: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}><AlertCircle size={18} color='#D97706' style={{ flexShrink: 0 }} /><p style={{ margin: 0, fontSize: '0.875rem', color: '#92400E' }}>Your account is pending admin approval. Please check back later.</p></div>}
                        {authSuccess && <div style={{ display: 'flex', gap: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#15803D', fontSize: '0.875rem' }}><CheckCircle2 size={18} style={{ flexShrink: 0 }} />{authSuccess}</div>}
                        {authError && <div style={{ display: 'flex', gap: '10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#DC2626', fontSize: '0.875rem' }}><AlertCircle size={18} style={{ flexShrink: 0 }} />{authError}</div>}

                        <form onSubmit={handleAuthSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            {authMode === 'register' && (
                                <>
                                    <InputField label="Full Name" name="name" value={form.name} onChange={handleFormChange} placeholder="Jane Smith" error={fieldErrors.name} />
                                    <InputField label="Organisation (optional)" name="organization_name" value={form.organization_name} onChange={handleFormChange} placeholder="Company / University / Independent" required={false} error={fieldErrors.organization_name} />
                                </>
                            )}
                            <InputField label="Email Address" type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="name@company.com" error={fieldErrors.email} />
                            <InputField label="Password" type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleFormChange}
                                placeholder={authMode === 'register' ? 'Min. 8 chars, 1 uppercase, 1 number' : '••••••••'}
                                error={fieldErrors.password}
                                rightElement={<span onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</span>}
                            />
                            {authMode === 'register' && form.password && (
                                <div style={{ marginTop: '-0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                                        {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= pwStrength.score ? pwStrength.color : '#E2E8F0', transition: 'background 0.2s' }} />)}
                                    </div>
                                    {pwStrength.label && <p style={{ margin: 0, fontSize: '0.72rem', color: pwStrength.color, fontWeight: '600' }}>{pwStrength.label} password</p>}
                                </div>
                            )}
                            {authMode === 'register' && (
                                <InputField label="Confirm Password" type={showConfirmPw ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleFormChange} placeholder="Re-enter password" error={fieldErrors.confirmPassword}
                                    rightElement={<span onClick={() => setShowConfirmPw(!showConfirmPw)}>{showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}</span>}
                                />
                            )}
                            <button type="submit" disabled={authLoading}
                                style={{ width: '100%', padding: '0.9rem', background: authLoading ? '#94A3B8' : '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.95rem', cursor: authLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {authLoading ? <><Loader2 size={16} />{authMode === 'login' ? 'Signing in…' : 'Creating account…'}</> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                            </button>
                            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                                <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setFieldErrors({}); setAuthError(''); setAuthSuccess(''); setIsPending(false); }}
                                    style={{ background: 'none', border: 'none', color: '#003366', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', padding: 0 }}>
                                    {authMode === 'login' ? 'Register here' : 'Sign In'}
                                </button>
                            </p>
                        </form>
                    </div>
                </section>
            )}
            
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Membership;
