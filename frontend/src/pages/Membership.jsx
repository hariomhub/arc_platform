/**
 * Membership.jsx — Tier display + Auth
 * ─────────────────────────────────────
 * Sections:
 *   1. Hero
 *   2. Tier cards (Professional / Executive / Founding Member)
 *   3. Features comparison table
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Check, X, Shield,
    CheckCircle2, XCircle, Star, Zap, Building2,
    ArrowRight, Loader2, AlertCircle, Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { applyExecutive, applyFounding } from '../api/membership.js';
import { getErrorMessage } from '../utils/apiHelpers.js';


// ─── Tier data ───────────────────────────────────────────────────────────────
const TIERS = [
    {
        id: 'professional', name: 'Professional', icon: Shield, iconColor: '#059669',
        price: 'Free', priceDetail: 'Free — 1-year membership',
        description: 'For individuals exploring AI governance fundamentals. Free access with a 1-year membership.',
        features: [
            { label: 'Public news & resources', included: true },
            { label: 'Events calendar', included: true },
            { label: 'Monthly newsletter', included: true },
            { label: 'Community Q&A (read & post)', included: true },
            { label: 'Framework downloads', included: false },
            { label: 'Member-only research', included: false },
            { label: 'Priority event access', included: false },
        ],
        highlighted: false, cta: 'Get Started Free', badge: null,
    },
    {
        id: 'executive', name: 'Executive', icon: Zap, iconColor: '#003366',
        price: '$0.00', priceDetail: '3-year membership · FOUNDING-LAUNCH promo',
        description: 'For senior risk professionals, compliance leads, and AI governance practitioners.',
        features: [
            { label: 'Everything in Professional', included: true },
            { label: 'Framework & resource downloads', included: true },
            { label: 'All audit templates', included: true },
            { label: 'Member-only research', included: true },
            { label: 'Priority event access', included: true },
            { label: 'Peer benchmarking data', included: true },
            { label: 'Certification discounts', included: false },
        ],
        highlighted: true, cta: 'Apply for Executive', badge: 'Most Popular',
    },
    {
        id: 'founding_member', name: 'Founding Member', icon: Building2, iconColor: '#7C3AED',
        price: 'Lifetime', priceDetail: 'Limited founding seats',
        description: 'For founding contributors and organizational leaders shaping the future of AI governance.',
        features: [
            { label: 'Everything in Executive', included: true },
            { label: 'Lifetime membership', included: true },
            { label: 'Full platform administration', included: true },
            { label: 'Co-branded research', included: true },
            { label: 'Private advisory sessions', included: true },
            { label: 'Dedicated account manager', included: true },
            { label: 'Custom integrations', included: true },
        ],
        highlighted: false, cta: 'Invite Me for Founding Member', badge: 'Founding',
    },
];

const COMPARISON_ROWS = [
    { feature: 'Public news & resources',         professional: true,  executive: true,  founding_member: true  },
    { feature: 'Events calendar',                 professional: true,  executive: true,  founding_member: true  },
    { feature: 'Monthly newsletter',              professional: true,  executive: true,  founding_member: true  },
    { feature: 'Community Q&A (read & post)',     professional: true,  executive: true,  founding_member: true  },
    { feature: 'Framework & resource downloads',  professional: false, executive: true,  founding_member: true  },
    { feature: 'Audit templates',                 professional: false, executive: true,  founding_member: true  },
    { feature: 'Member-only research',            professional: false, executive: true,  founding_member: true  },
    { feature: 'Priority event registration',     professional: false, executive: true,  founding_member: true  },
    { feature: 'Peer benchmarking data',          professional: false, executive: true,  founding_member: true  },
    { feature: 'Lifetime membership',             professional: false, executive: false, founding_member: true  },
    { feature: 'Private advisory sessions',       professional: false, executive: false, founding_member: true  },
    { feature: 'Co-branded research',             professional: false, executive: false, founding_member: true  },
];

const ROLE_LABELS = {
    founding_member: 'Founding Member', executive: 'Executive', professional: 'Professional',
};

// ─── Membership Page ──────────────────────────────────────────────────────────
const Membership = () => {
    const navigate = useNavigate();
    const { user, isLoggedIn, isAdmin, logout } = useAuth();

    // Executive modal state
    const [showExecutiveModal, setShowExecutiveModal] = useState(false);
    const [execForm, setExecForm] = useState({
        organization_name: user?.organization_name || '',
        job_title: '', linkedin_url: user?.linkedin_url || '', phone: '',
    });
    const [execLoading, setExecLoading] = useState(false);
    const [execError, setExecError] = useState('');
    const [execSuccess, setExecSuccess] = useState(false);

    const handleExecChange = (e) =>
        setExecForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleExecSubmit = async (e) => {
        e.preventDefault();
        setExecLoading(true); setExecError('');
        try {
            await applyExecutive(execForm);
            setExecSuccess(true);
        } catch (err) {
            setExecError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setExecLoading(false);
        }
    };

    // Founding Member modal state
    const [showFoundingModal, setShowFoundingModal] = useState(false);
    const [foundingForm, setFoundingForm] = useState({
        organization_name: user?.organization_name || '',
        job_title: '', linkedin_url: user?.linkedin_url || '', phone: '',
        professional_bio: '', areas_of_expertise: '', why_founding_member: '',
        website_url: '', twitter_url: '',
    });
    const [foundingLoading, setFoundingLoading] = useState(false);
    const [foundingError, setFoundingError] = useState('');
    const [foundingSuccess, setFoundingSuccess] = useState(false);

    const handleFoundingChange = (e) =>
        setFoundingForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleFoundingSubmit = async (e) => {
        e.preventDefault();
        if (!foundingForm.why_founding_member.trim()) {
            setFoundingError('Please tell us why you want to be a Founding Member.');
            return;
        }
        setFoundingLoading(true); setFoundingError('');
        try {
            await applyFounding(foundingForm);
            setFoundingSuccess(true);
        } catch (err) {
            setFoundingError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setFoundingLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Membership | AI Risk Council';
    }, []);

    // ── Shared modal input styles ─────────────────────────────────────────────
    const modalInput = { width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', background: 'white', color: '#1e293b' };
    const modalLabel = { display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' };

    return (
        <div style={{ fontFamily: 'var(--font-sans)' }}>

            {/* ── 1. Hero ─────────────────────────────────────────────────── */}
            <section style={{ background: 'linear-gradient(135deg, #001a33 0%, #003366 50%, #004d99 100%)', color: 'white', textAlign: 'center', padding: '4rem 2rem 3rem' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: '#93C5FD', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid rgba(147,197,253,0.3)', marginBottom: '1.5rem' }}>
                        Council Membership
                    </span>
                    <h1 style={{ color: 'white', fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: '800', margin: '0 0 1rem', lineHeight: 1.2 }}>
                        Join the AI Risk Council
                    </h1>
                    <p style={{ color: '#CBD5E1', fontSize: '1.15rem', lineHeight: '1.75', margin: '0 auto 2rem', maxWidth: '580px' }}>
                        A global community of AI risk professionals, researchers, and governance leaders building safer AI systems.
                    </p>
                    {!isLoggedIn && (
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => navigate('/register')} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}
                                style={{ background: 'white', color: '#003366', border: 'none', borderRadius: '8px', padding: '0.85rem 2rem', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'transform 0.15s' }}>
                                Create Free Account
                            </button>
                            <button onClick={() => navigate('/login')}
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
                        <p style={{ color: '#64748B', fontSize: '1rem', margin: 0 }}>Professional membership is free to join today. Executive and Founding Member tiers are now open for applications.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
                        {TIERS.map((tier) => {
                            const Icon = tier.icon;
                            const isPaid = tier.id !== 'professional';
                            const isCurrentPlan = isLoggedIn && user?.role === tier.id;
                            const borderColor = isCurrentPlan ? '#059669' : tier.highlighted ? '#003366' : '#E2E8F0';
                            const borderWidth = (isCurrentPlan || tier.highlighted) ? '2px' : '1.5px';
                            return (
                                <div key={tier.id}
                                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = isCurrentPlan ? '0 20px 50px rgba(5,150,105,0.2)' : tier.highlighted ? '0 20px 50px rgba(0,51,102,0.2)' : '0 8px 24px rgba(0,0,0,0.1)'; }}
                                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isCurrentPlan ? '0 12px 40px rgba(5,150,105,0.15)' : tier.highlighted ? '0 12px 40px rgba(0,51,102,0.15)' : '0 2px 8px rgba(0,0,0,0.04)'; }}
                                    style={{ border: `${borderWidth} solid ${borderColor}`, borderRadius: '16px', padding: '2rem', background: isCurrentPlan ? 'linear-gradient(to bottom, #F0FDF4, white)' : tier.highlighted ? 'linear-gradient(to bottom, #F8FAFF, white)' : 'white', position: 'relative', overflow: 'hidden', boxShadow: isCurrentPlan ? '0 12px 40px rgba(5,150,105,0.15)' : tier.highlighted ? '0 12px 40px rgba(0,51,102,0.15)' : '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                                    {isCurrentPlan
                                        ? <span style={{ position: 'absolute', top: 0, right: 0, background: '#059669', color: 'white', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', padding: '0.3rem 1rem', borderBottomLeftRadius: '10px', textTransform: 'uppercase' }}>Your Plan</span>
                                        : tier.badge && <span style={{ position: 'absolute', top: 0, right: 0, background: tier.highlighted ? '#003366' : '#7C3AED', color: 'white', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', padding: '0.3rem 1rem', borderBottomLeftRadius: '10px', textTransform: 'uppercase' }}>{tier.badge}</span>
                                    }
                                    {tier.id === 'executive' && !isCurrentPlan && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}><Zap size={13} color='#003366' /><span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Founding Launch — Now Open</span></div>}
                                    {tier.id === 'founding_member' && !isCurrentPlan && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}><Star size={13} color='#7C3AED' fill='#7C3AED' /><span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Limited Seats</span></div>}
                                    {isCurrentPlan && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}><CheckCircle2 size={13} color='#059669' /><span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Membership</span></div>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${tier.iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={tier.iconColor} /></div>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1E293B', fontWeight: '700' }}>{tier.name}</h3>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: '800', color: isCurrentPlan ? '#059669' : tier.highlighted ? '#003366' : '#1E293B' }}>{tier.price}</span>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>{tier.priceDetail}</p>
                                    </div>
                                    <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{tier.description}</p>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                        {tier.features.map(f => (
                                            <li key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: f.included ? '#374151' : '#CBD5E1' }}>
                                                {f.included ? <Check size={15} color={isCurrentPlan ? '#059669' : tier.highlighted ? '#003366' : '#10B981'} style={{ flexShrink: 0 }} /> : <X size={15} color='#CBD5E1' style={{ flexShrink: 0 }} />}
                                                {f.label}
                                            </li>
                                        ))}
                                    </ul>
                                    {isCurrentPlan ? (
                                        <div style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#F0FDF4', border: '1.5px solid #059669', color: '#059669', fontWeight: '700', fontSize: '0.9rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <CheckCircle2 size={15} />Current Plan
                                        </div>
                                    ) : tier.id === 'professional' ? (
                                        <button onClick={() => navigate('/register')} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'transparent', border: '1.5px solid #059669', color: '#059669', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{tier.cta}</button>
                                    ) : tier.id === 'executive' ? (
                                        <button onClick={() => isLoggedIn ? setShowExecutiveModal(true) : navigate('/register')} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#003366', border: 'none', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Zap size={15} />{tier.cta}</button>
                                    ) : (
                                        <button onClick={() => isLoggedIn ? setShowFoundingModal(true) : navigate('/register')} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#7C3AED', border: 'none', color: 'white', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Star size={15} />{tier.cta}</button>
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
                                        {['professional', 'executive', 'founding_member'].map(tier => (
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

            {/* ─── Executive Membership Modal ──────────────────────────────── */}
            {showExecutiveModal && (
                <div onClick={e => { if (e.target === e.currentTarget) { setShowExecutiveModal(false); setExecSuccess(false); setExecError(''); } }}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '880px', boxShadow: '0 32px 100px rgba(0,0,0,0.35)', position: 'relative', margin: 'auto', overflow: 'hidden' }}>
                        
                        {/* Modal header stripe */}
                        <div style={{ background: 'linear-gradient(135deg, #001a33 0%, #003366 60%, #0055a5 100%)', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={22} color='white' fill='white' />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Upgrade Membership</p>
                                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: 'white' }}>Executive Membership</h2>
                                </div>
                            </div>
                            <button onClick={() => { setShowExecutiveModal(false); setExecSuccess(false); setExecError(''); }}
                                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem', flexShrink: 0 }}>✕</button>
                        </div>

                        {execSuccess ? (
                            <div style={{ padding: '3rem 2.5rem', textAlign: 'center' }}>
                                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
                                    <CheckCircle2 size={40} color='#059669' />
                                </div>
                                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>Application Submitted!</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.75', margin: '0 0 2rem', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                                    Your Executive Membership application is now under review. You'll get an email with the decision — usually within 24–48 hours.
                                </p>
                                <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '1.25rem 1.5rem', textAlign: 'left', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What Happens Next</p>
                                    {["Admin reviews your application (24–48 h)","You'll receive an email with the decision","Once approved, your role upgrades instantly","Your Professional membership stays active now"].map((s, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: i < 3 ? '0.5rem' : 0 }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}><Check size={11} color='#92400e' /></div>
                                            <span style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: '1.5' }}>{s}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setShowExecutiveModal(false); setExecSuccess(false); }}
                                    style={{ background: '#003366', color: 'white', border: 'none', borderRadius: '12px', padding: '0.9rem 2.5rem', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Done</button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0 }}>
                                {/* Left: form */}
                                <div style={{ padding: '2rem 2rem 2rem 2rem', borderRight: '1px solid #f1f5f9' }}>
                                    <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Confirm Your Details</h3>

                                    {/* Read-only info row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        {[{label:'Full Name', val: user?.name},{label:'Email Address', val: user?.email}].map(({label,val}) => (
                                            <div key={label}>
                                                <label style={modalLabel}>{label}</label>
                                                <input value={val || ''} readOnly tabIndex={-1} style={{ ...modalInput, background: '#f8fafc', color: '#64748b', cursor: 'default' }} />
                                            </div>
                                        ))}
                                    </div>

                                    <form onSubmit={handleExecSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <label style={modalLabel} htmlFor='exec-org'>Organisation</label>
                                                <input id='exec-org' name='organization_name' value={execForm.organization_name} onChange={handleExecChange} placeholder='Acme Corp' style={modalInput} />
                                            </div>
                                            <div>
                                                <label style={modalLabel} htmlFor='exec-title'>Job Title</label>
                                                <input id='exec-title' name='job_title' value={execForm.job_title} onChange={handleExecChange} placeholder='Chief AI Officer' style={modalInput} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <label style={modalLabel} htmlFor='exec-li'>LinkedIn URL</label>
                                                <input id='exec-li' name='linkedin_url' type='url' value={execForm.linkedin_url} onChange={handleExecChange} placeholder='https://linkedin.com/in/...' style={modalInput} />
                                            </div>
                                            <div>
                                                <label style={modalLabel} htmlFor='exec-phone'>Phone Number</label>
                                                <input id='exec-phone' name='phone' type='tel' value={execForm.phone} onChange={handleExecChange} placeholder='+1 (555) 000-0000' style={modalInput} />
                                            </div>
                                        </div>

                                        {execError && (
                                            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertCircle size={15} />{execError}
                                            </div>
                                        )}

                                        <button type='submit' disabled={execLoading}
                                            style={{ width: '100%', padding: '0.95rem', background: execLoading ? '#4d7ab5' : 'linear-gradient(135deg, #003366 0%, #0055a5 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.95rem', cursor: execLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0.25rem', boxShadow: execLoading ? 'none' : '0 6px 20px rgba(0,51,102,0.35)', transition: 'all 0.2s' }}>
                                            {execLoading ? <><Loader2 size={18} className='spin' />Submitting…</> : <><Zap size={17} fill='white' />Submit Application — $0.00</>}
                                        </button>
                                        <p style={{ margin: 0, textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                                            <Lock size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />No payment required. Your application goes to admin review.
                                        </p>
                                    </form>
                                </div>

                                {/* Right: order summary */}
                                <div style={{ background: '#f8fafc', padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>Order Summary</h3>

                                    {/* Product */}
                                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem 1.1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.75rem' }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: '#1e293b' }}>Executive Membership</p>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>3-year term · AI Risk Council</p>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: '#94a3b8', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>$299 / qtr</p>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                                            <span style={{ color: '#64748b' }}>Subtotal</span>
                                            <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>$299.00</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '100px' }}>FOUNDING-LAUNCH</span>
                                                <span style={{ color: '#16a34a', fontWeight: '600' }}>100% off</span>
                                            </span>
                                            <span style={{ color: '#16a34a', fontWeight: '700' }}>− $299.00</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>Total Today</span>
                                            <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#16a34a' }}>$0.00</span>
                                        </div>
                                    </div>

                                    {/* Benefits included */}
                                    <div>
                                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What You Unlock</p>
                                        {['Framework & resource downloads','All audit templates','Member-only research','Priority event access','Peer benchmarking data','3-year Executive access'].map(b => (
                                            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Check size={10} color='#1d4ed8' />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: '#374151' }}>{b}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Trust badges */}
                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                        {['No credit card required','Pending admin approval','Professional access stays active'].map(t => (
                                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <CheckCircle2 size={14} color='#10b981' style={{ flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Founding Member Modal ────────────────────────────────── */}
            {showFoundingModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto', backdropFilter: 'blur(4px)' }}
                    onClick={e => { if (e.target === e.currentTarget) { setShowFoundingModal(false); setFoundingSuccess(false); setFoundingError(''); } }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '700px', boxShadow: '0 32px 100px rgba(0,0,0,0.35)', position: 'relative', margin: 'auto', overflow: 'hidden' }}>

                        {/* Header stripe */}
                        <div style={{ background: 'linear-gradient(135deg, #2e1065 0%, #5b21b6 60%, #7C3AED 100%)', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Star size={22} color='white' fill='white' />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Limited Seats · Application</p>
                                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: 'white' }}>Founding Member Invitation</h2>
                                </div>
                            </div>
                            <button onClick={() => { setShowFoundingModal(false); setFoundingSuccess(false); setFoundingError(''); }}
                                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem', flexShrink: 0 }}>✕</button>
                        </div>

                        <div style={{ padding: '2rem' }}>

                        {foundingSuccess ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem 1rem 1rem' }}>
                                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}>
                                    <CheckCircle2 size={40} color='#7C3AED' />
                                </div>
                                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem', fontWeight: '900', color: '#1e293b' }}>Application Submitted!</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.75', margin: '0 0 2rem', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                                    Your Founding Member application has been received. Our team will review it personally and reach out if you are selected.
                                </p>
                                <div style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1.5px solid #e9d5ff', borderRadius: '14px', padding: '1.25rem 1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
                                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', fontWeight: '800', color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What to Expect</p>
                                    {['Your Professional membership stays fully active','Our team reviews applications individually','You will hear from us within 7–14 business days','Founding seats are extremely limited'].map((s, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: i < 3 ? '0.5rem' : 0 }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e9d5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}><Check size={11} color='#7C3AED' /></div>
                                            <span style={{ fontSize: '0.85rem', color: '#4c1d95', lineHeight: '1.5' }}>{s}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setShowFoundingModal(false); setFoundingSuccess(false); }}
                                    style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7C3AED 100%)', color: 'white', border: 'none', borderRadius: '12px', padding: '0.9rem 2.5rem', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 6px 20px rgba(124,58,237,0.35)' }}>Done</button>
                            </div>
                        ) : (
                            <>
                                {/* Intro note */}
                                <div style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <Star size={16} color='#7C3AED' fill='#7C3AED' style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ margin: 0, fontSize: '0.845rem', color: '#4c1d95', lineHeight: '1.65' }}>
                                        Founding seats are <strong>extremely limited</strong> and reviewed individually. Tell us about yourself and your vision for AI governance.
                                    </p>
                                </div>

                                <form onSubmit={handleFoundingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* Read-only account info */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        {[{label:'Full Name', val: user?.name},{label:'Email Address', val: user?.email}].map(({label,val}) => (
                                            <div key={label}>
                                                <label style={modalLabel}>{label}</label>
                                                <input value={val || ''} readOnly tabIndex={-1} style={{ ...modalInput, background: '#f8fafc', color: '#64748b', cursor: 'default' }} />
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={modalLabel}>Organisation</label>
                                            <input name='organization_name' value={foundingForm.organization_name} onChange={handleFoundingChange} placeholder='Acme Corp' style={modalInput} />
                                        </div>
                                        <div>
                                            <label style={modalLabel}>Job Title</label>
                                            <input name='job_title' value={foundingForm.job_title} onChange={handleFoundingChange} placeholder='Chief AI Officer' style={modalInput} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={modalLabel}>LinkedIn URL</label>
                                            <input name='linkedin_url' type='url' value={foundingForm.linkedin_url} onChange={handleFoundingChange} placeholder='https://linkedin.com/in/...' style={modalInput} />
                                        </div>
                                        <div>
                                            <label style={modalLabel}>Phone Number</label>
                                            <input name='phone' type='tel' value={foundingForm.phone} onChange={handleFoundingChange} placeholder='+1 (555) 000-0000' style={modalInput} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={modalLabel}>Website URL</label>
                                            <input name='website_url' type='url' value={foundingForm.website_url} onChange={handleFoundingChange} placeholder='https://yoursite.com' style={modalInput} />
                                        </div>
                                        <div>
                                            <label style={modalLabel}>Twitter / X</label>
                                            <input name='twitter_url' type='url' value={foundingForm.twitter_url} onChange={handleFoundingChange} placeholder='https://twitter.com/...' style={modalInput} />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={modalLabel}>Areas of Expertise</label>
                                        <input name='areas_of_expertise' value={foundingForm.areas_of_expertise} onChange={handleFoundingChange}
                                            placeholder='e.g. AI Safety, ML Governance, EU AI Act, Risk Frameworks' style={modalInput} />
                                    </div>

                                    <div>
                                        <label style={modalLabel}>Professional Bio</label>
                                        <textarea name='professional_bio' value={foundingForm.professional_bio} onChange={handleFoundingChange} rows={3}
                                            placeholder='Brief overview of your background and role in AI governance…'
                                            style={{ ...modalInput, resize: 'vertical', lineHeight: '1.55' }} />
                                    </div>

                                    {/* Key question */}
                                    <div style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1.5px solid #c4b5fd', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                                            Why do you want to be a Founding Member? <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <textarea name='why_founding_member' value={foundingForm.why_founding_member} onChange={handleFoundingChange} rows={4} required
                                            placeholder='Share your vision — why do you want to help shape AI governance, and what unique contributions would you bring to the Council?'
                                            style={{ ...modalInput, border: foundingError && !foundingForm.why_founding_member.trim() ? '1.5px solid #fca5a5' : '1.5px solid #c4b5fd', background: 'white', resize: 'vertical', lineHeight: '1.55' }} />
                                    </div>

                                    {foundingError && (
                                        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertCircle size={15} />{foundingError}
                                        </div>
                                    )}

                                    <button type='submit' disabled={foundingLoading}
                                        style={{ width: '100%', padding: '0.95rem', background: foundingLoading ? '#8b5cf6' : 'linear-gradient(135deg, #5b21b6 0%, #7C3AED 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.95rem', cursor: foundingLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: foundingLoading ? 'none' : '0 6px 20px rgba(124,58,237,0.35)', transition: 'all 0.2s' }}>
                                        {foundingLoading ? <><Loader2 size={18} className='spin' />Submitting…</> : <><Star size={16} fill='white' />Submit Founding Member Application</>}
                                    </button>
                                    <p style={{ margin: 0, textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>Your Professional membership remains active throughout the review process.</p>
                                </form>
                            </>
                        )}
                        </div>
                    </div>
                </div>
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
