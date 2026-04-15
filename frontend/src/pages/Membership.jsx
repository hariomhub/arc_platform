/**
 * Membership.jsx - 2-Tier Membership Page
 * Theme: matches app light theme (#f8fafc bg, white cards, #003366 primary, gradient hero)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Check, X, Shield, Zap, ArrowRight, Loader2,
    AlertCircle, ChevronDown, Award,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { applyCouncil } from '../api/membership.js';
import { getErrorMessage } from '../utils/apiHelpers.js';

// ─── Feature lists ────────────────────────────────────────────────────────────
const PROFESSIONAL_FEATURES = [
    { label: 'Public news & resources',            included: true  },
    { label: 'Events calendar & registration',     included: true  },
    { label: 'Community Q&A (read & post)',         included: true  },
    { label: 'Monthly newsletter',                  included: true  },
    { label: 'Vote in AI Risk Awards / Initiatives',included: true  },
    { label: 'View frameworks & resources online',  included: true  },
    { label: 'Framework & resource downloads',      included: false },
    { label: 'Create events / news / workshops',    included: false },
    { label: 'Submit AI Product Reviews',           included: false },
];

const COUNCIL_FEATURES = [
    { label: 'Everything in Professional',                  included: true },
    { label: 'Framework & resource downloads',              included: true },
    { label: 'Upload resources (pending admin approval)',            included: true },
    { label: 'Create events (pending admin approval)',      included: true },
    { label: 'Create news articles (pending approval)',     included: true },
    { label: 'Create workshops (pending approval)',         included: true },
    { label: 'Submit AI Product Reviews (pending approval)',included: true },
    { label: 'Manage automated news feed',                  included: true },
    { label: '2-year membership term',                      included: true },
];

// ─── Comparison table ─────────────────────────────────────────────────────────
const COMPARISON_ROWS = [
    { feature: 'Public news & resources',             pro: true,  council: true  },
    { feature: 'Events calendar & registration',      pro: true,  council: true  },
    { feature: 'Community Q&A (read & post)',         pro: true,  council: true  },
    { feature: 'Monthly newsletter',                  pro: true,  council: true  },
    { feature: 'Vote in AI Risk Awards / Initiatives', pro: true, council: true },
    { feature: 'View frameworks & resources online',  pro: true,  council: true  },
    { feature: 'Download frameworks & resources',     pro: false, council: true  },
    { feature: 'Upload resources (auto-approved)',    pro: false, council: true  },
    { feature: 'Submit AI Product Reviews (pending approval)', pro: false, council: true  },
    { feature: 'Create events (pending approval)',    pro: false, council: true  },
    { feature: 'Create news (pending approval)',      pro: false, council: true  },
    { feature: 'Create workshops (pending approval)', pro: false, council: true  },
    { feature: 'Manage automated news feed',          pro: false, council: true  },
    { feature: '2-year membership term',              pro: false, council: true  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
    {
        q: 'What is the difference between Professional and Council Member?',
        a: 'Professional gives you community access - news, events, Q&A, and the ability to view frameworks online. Council Member unlocks downloads, content creation (events, news, workshops), resource uploads, and a 2-year term.',
    },
    {
        q: 'Can I upgrade from Professional to Council Member?',
        a: 'Yes. Once approved as a Professional member, you can apply for Council Member from this page. Applications are reviewed by our admin team, usually within 24–48 hours.',
    },
    {
        q: 'What does "pending admin approval" mean for Council Members?',
        a: 'When a Council Member creates an event, news article, or workshop, it is saved as a draft and reviewed by a Founding Member admin before going public. This ensures content quality and governance standards.',
    },
    {
        q: 'Who are Founding Members?',
        a: 'Founding Members are senior administrators who manage the platform. They are appointed directly - there is no public application process for this role.',
    },
];

// ─── Sub-categories ───────────────────────────────────────────────────────────
const SUB_CATEGORIES = [
    {
        value: 'working_professional',
        emoji: '💼',
        label: 'Working Professional',
        tag: 'Industry & Corporate',
        desc: 'Currently employed in any sector - technology, finance, policy, or consulting - where AI governance intersects with your work.',
        traits: ['Full-time employment', 'Industry practitioners', 'Cross-sector roles'],
    },
    {
        value: 'final_year_undergrad',
        emoji: '🎓',
        label: 'Final Year Undergraduate',
        tag: 'Academic & Emerging',
        desc: 'In your final year of undergraduate studies, aspiring to build a career in AI risk, governance, or responsible AI policy.',
        traits: ['Final year students', 'AI & tech programs', 'Future practitioners'],
    },
];

// ─── Membership Page ──────────────────────────────────────────────────────────
const Membership = () => {
    const navigate = useNavigate();
    const { user, isLoggedIn } = useAuth();

    const [showCouncilModal, setShowCouncilModal] = useState(false);
    const [councilForm, setCouncilForm] = useState({
        organization_name: '', job_title: '', linkedin_url: '',
        professional_bio: '', why_council_member: '',
    });
    const [councilSubmitting, setCouncilSubmitting] = useState(false);
    const [councilError,   setCouncilError]   = useState('');
    const [councilSuccess, setCouncilSuccess] = useState(false);

    const [showSubCatModal, setShowSubCatModal] = useState(false);
    const [selectedSubCat,  setSelectedSubCat]  = useState('working_professional');
    const [openFaq, setOpenFaq] = useState(null);

    useEffect(() => { document.title = 'Membership | AI Risk Council'; }, []);

    // ── Access state ──────────────────────────────────────────────────────────
    const currentRole = user?.role;
    const isApproved  = user?.status === 'approved';
    const isCouncil   = ['council_member', 'executive'].includes(currentRole);
    const isFounder   = currentRole === 'founding_member';

    const getProfCta = () => {
        if (!isLoggedIn)                                    return { label: 'Get Started',               action: () => setShowSubCatModal(true) };
        if (isFounder)                                      return { label: '✓ Founding Member',         action: null };
        if (isCouncil && isApproved)                        return { label: '✓ You are a Council Member',action: null };
        if (isCouncil)                                      return { label: 'Council Application Pending',action: null };
        if (currentRole === 'professional' && isApproved)  return { label: '✓ Your current plan',       action: null };
        if (currentRole === 'professional')                 return { label: 'Application Pending',       action: null };
        return { label: 'Get Started', action: () => setShowSubCatModal(true) };
    };

    const getCouncilCta = () => {
        if (!isLoggedIn)        return { label: 'Apply for Council Member',      action: () => navigate('/login?next=/membership') };
        if (isFounder)          return { label: '✓ Founding Member',             action: null };
        if (isCouncil && isApproved) return { label: '✓ Your current plan',     action: null };
        if (isCouncil)          return { label: 'Application Under Review',      action: null };
        return { label: 'Apply for Council Member', action: () => setShowCouncilModal(true) };
    };

    const profCta    = getProfCta();
    const councilCta = getCouncilCta();

    // ── Council form submit ───────────────────────────────────────────────────
    const handleCouncilSubmit = async (e) => {
        e.preventDefault();
        setCouncilError('');
        if (!councilForm.why_council_member?.trim()) {
            setCouncilError('Please tell us why you want to become a Council Member.');
            return;
        }
        setCouncilSubmitting(true);
        try {
            await applyCouncil(councilForm);
            setCouncilSuccess(true);
        } catch (err) {
            setCouncilError(getErrorMessage(err));
        } finally {
            setCouncilSubmitting(false);
        }
    };

    const iStyle = {
        width: '100%', padding: '0.6rem 0.85rem',
        border: '1px solid #CBD5E1', borderRadius: '8px',
        fontSize: '0.875rem', fontFamily: 'var(--font-sans)',
        color: '#1e293b', background: '#fafafa',
        boxSizing: 'border-box', outline: 'none',
        transition: 'border-color 0.15s',
    };
    const lStyle = { display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: '600', color: '#374151' };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-sans)' }}>
            <style>{`
                @keyframes spin   { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }

                .mem-card {
                    background: white; border-radius: 14px;
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
                    transition: transform 0.22s, box-shadow 0.22s;
                    display: flex; flex-direction: column;
                    overflow: hidden;
                }
                .mem-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,51,102,0.11); }
                .mem-card.featured { border: 2px solid #003366; box-shadow: 0 4px 18px rgba(0,51,102,0.13); }

                .mem-btn {
                    width: 100%; padding: 0.78rem 1rem; border-radius: 9px; border: none;
                    font-family: var(--font-sans); font-weight: 700; font-size: 0.9rem;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
                    transition: all 0.18s;
                }
                .mem-btn-primary { background: #003366; color: white; }
                .mem-btn-primary:hover:not(:disabled) { background: #004080; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(0,51,102,0.22); }
                .mem-btn-outline  { background: white; color: #003366; border: 1.5px solid #003366 !important; }
                .mem-btn-outline:hover:not(:disabled) { background: #EEF4FF; }
                .mem-btn:disabled { opacity: 0.55; cursor: default; transform: none !important; box-shadow: none !important; }

                .mem-faq { background: white; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; margin-bottom: 0.5rem; }
                .mem-faq-q {
                    width: 100%; background: transparent; border: none; text-align: left;
                    padding: 0.85rem 1.1rem; cursor: pointer;
                    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
                    font-family: var(--font-sans); font-size: 0.875rem; font-weight: 600; color: #1e293b;
                    transition: background 0.12s;
                }
                .mem-faq-q:hover { background: #F8FAFC; }
                .mem-faq-a { padding: 0 1.1rem 0.85rem; font-size: 0.83rem; color: #64748B; line-height: 1.68; }

                .mem-table { width: 100%; border-collapse: collapse; }
                .mem-table thead th {
                    padding: 0.75rem 1.1rem; font-size: 0.75rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.07em; color: #64748B;
                    border-bottom: 2px solid #E2E8F0; background: #F8FAFC;
                }
                .mem-table thead th.col-pro  { color: #059669; text-align: center; }
                .mem-table thead th.col-coun { color: #003366; text-align: center; }
                .mem-table thead th.col-feat { text-align: left; }
                .mem-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.1s; }
                .mem-table tbody tr:last-child { border-bottom: none; }
                .mem-table tbody tr:hover { background: #F8FAFC; }
                .mem-table tbody td { padding: 0.65rem 1.1rem; font-size: 0.84rem; color: #374151; }
                .mem-table tbody td:not(:first-child) { text-align: center; }

                /* sub-cat columns */
                .subcol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
                @media (max-width: 500px) { .subcol-grid { grid-template-columns: 1fr; } }

                .subcat-pick {
                    border: 2px solid #E2E8F0; border-radius: 12px; padding: 1rem 1.1rem;
                    cursor: pointer; text-align: left; width: 100%;
                    background: white; font-family: var(--font-sans); transition: all 0.18s;
                }
                .subcat-pick:hover { border-color: #003366; background: #F5F9FF; }
                .subcat-pick.sel   { border-color: #003366; background: #EEF4FF; }

                .mem-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: flex; align-items: flex-start; justify-content: center;
                    z-index: 1000; padding: 1rem; overflow-y: auto; backdrop-filter: blur(3px);
                }
                .mem-modal {
                    background: white; border-radius: 18px; width: 100%; max-width: 620px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
                    animation: fadeUp 0.26s ease both; margin: auto;
                }
                .mem-modal-hd {
                    background: linear-gradient(135deg, #001a33, #003366);
                    padding: 1.25rem 1.5rem;
                    display: flex; justify-content: space-between; align-items: flex-start;
                }
                .mem-modal-bd { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.9rem; }
            `}</style>

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #002244 0%, #003366 55%, #005599 100%)',
                padding: 'clamp(2rem,3.5vw,3rem) clamp(1rem,4vw,2rem)',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(255,255,255,0.1)', borderRadius: '100px',
                        padding: '0.28rem 0.85rem', marginBottom: '0.9rem',
                        fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.12em',
                        color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase',
                    }}>
                        <Shield size={12} color="#60A5FA" /> Membership Plans
                    </div>
                    <h1 style={{
                        color: 'white', fontSize: 'clamp(2rem,5vw,3rem)',
                        fontWeight: '800', margin: '0 0 1rem', lineHeight: '1.18',
                        fontFamily: 'var(--font-sans)',
                    }}>
                        Choose Your Membership Path
                    </h1>
                    <p style={{
                        color: '#CBD5E1',
                        fontSize: 'clamp(0.95rem,2vw,1.1rem)',
                        lineHeight: '1.65', margin: 0, maxWidth: '600px', marginInline: 'auto',
                    }}>
                        Join a global community of AI risk and governance professionals. Two tiers, one mission - shaping responsible AI.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {!isLoggedIn ? (
                            <>
                                <button onClick={() => navigate('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'white', color: '#003366', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.95rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Sign In to Apply <ArrowRight size={14} />
                                </button>
                                <button onClick={() => navigate('/register')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Create Account
                                </button>
                            </>
                        ) : isFounder ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '8px', padding: '0.7rem 1.75rem' }}>
                                <Shield size={16} color="#f59e0b" />
                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fbbf24' }}>✓ Founding Member</span>
                            </div>
                        ) : isCouncil && isApproved ? (
                            <>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', padding: '0.7rem 1.75rem' }}>
                                    <Award size={16} color="#93c5fd" />
                                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'white' }}>✓ Council Member</span>
                                </div>
                                <button onClick={() => document.getElementById('membership-cards')?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    View Benefits
                                </button>
                            </>
                        ) : isCouncil ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.7rem 1.75rem' }}>
                                <Loader2 size={15} color="#93c5fd" style={{ animation: 'spin 1.5s linear infinite' }} />
                                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>Council Application Under Review</span>
                            </div>
                        ) : currentRole === 'professional' && isApproved ? (
                            <>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(5,118,66,0.2)', border: '1px solid rgba(5,118,66,0.4)', borderRadius: '8px', padding: '0.7rem 1.75rem' }}>
                                    <Shield size={16} color="#4ade80" />
                                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#4ade80' }}>✓ Professional Member</span>
                                </div>
                                <button onClick={() => setShowCouncilModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Apply for Council <ArrowRight size={14} />
                                </button>
                            </>
                        ) : currentRole === 'professional' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.7rem 1.75rem' }}>
                                <Loader2 size={15} color="#93c5fd" style={{ animation: 'spin 1.5s linear infinite' }} />
                                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>Application Pending Approval</span>
                            </div>
                        ) : (
                            <button onClick={() => document.getElementById('membership-cards')?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'white', color: '#003366', padding: '0.7rem 1.75rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.95rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                View Plans <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
            <div id="membership-cards" style={{ maxWidth: '1060px', margin: '0 auto', padding: 'clamp(1.5rem,3vw,2.5rem) clamp(1rem,4vw,2rem)' }}>

                {/* ── TIER CARDS ──────────────────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(440px, 100%), 1fr))',
                    gap: '1.5rem', alignItems: 'start',
                }}>

                    {/* ─── Professional ──────────────────────────────────── */}
                    <div className="mem-card">
                        <div style={{ padding: '1.4rem 1.5rem 1rem' }}>

                            {/* Title row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Shield size={20} color="#059669" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Professional</h2>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>1-year membership · Renewable</p>
                                </div>
                            </div>

                            <p style={{ margin: '0 0 1rem', fontSize: '0.845rem', color: '#64748B', lineHeight: '1.6' }}>
                                For individuals exploring AI risk and governance. Community access from day one.
                            </p>

                            {/* Pricing */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ textDecoration: 'line-through', color: '#475569', fontSize: '2.2rem', fontWeight: '800' }}>$49</span>
                                <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: '600' }}>/yr</span>
                                <span style={{ fontSize: '1.9rem', fontWeight: '900', color: '#059669', marginLeft: '2px' }}>$0</span>
                            </div>
                        </div>

                        {/* ── Sub-categories: 2-column layout ── */}
                        <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
                            <p style={{ margin: '0 0 0.6rem', fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Prerequisites
                            </p>
                            <div className="subcol-grid">
                                {SUB_CATEGORIES.map(sc => (
                                    <div key={sc.value} style={{
                                        border: '1px solid #E2E8F0', borderRadius: '10px',
                                        padding: '0.85rem 0.9rem', background: '#FAFBFC',
                                    }}>
                                        <div style={{ fontSize: '1.35rem', lineHeight: 1, marginBottom: '0.4rem' }}>{sc.emoji}</div>
                                        <div style={{ fontWeight: '700', fontSize: '0.83rem', color: '#1e293b', marginBottom: '0.2rem' }}>{sc.label}</div>
                                        <span style={{
                                            display: 'inline-block', fontSize: '0.65rem', fontWeight: '700',
                                            background: '#ECFDF5', color: '#059669', padding: '1px 7px',
                                            borderRadius: '100px', marginBottom: '0.45rem',
                                        }}>{sc.tag}</span>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.76rem', color: '#64748B', lineHeight: '1.5' }}>{sc.desc}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            {sc.traits.map(t => (
                                                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Check size={10} color="#059669" strokeWidth={3} />
                                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: '#F1F5F9', margin: '0 1.5rem 0.85rem' }} />

                        {/* Feature list */}
                        <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.1rem' }}>
                            {PROFESSIONAL_FEATURES.map(({ label, included }, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: included ? '#D1FAE5' : '#F1F5F9',
                                    }}>
                                        {included
                                            ? <Check size={10} color="#059669" strokeWidth={3} />
                                            : <X size={10} color="#EF4444" strokeWidth={2.5} />}
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: included ? '#374151' : '#94A3B8' }}>{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div style={{ padding: '0 1.5rem 1.4rem', marginTop: 'auto' }}>
                            <button
                                className={`mem-btn ${profCta.action ? 'mem-btn-outline' : 'mem-btn'}`}
                                style={!profCta.action ? { background: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0' } : {}}
                                onClick={profCta.action ?? undefined}
                                disabled={!profCta.action}
                            >
                                {profCta.label}{profCta.action && <ArrowRight size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* ─── Council Member ─────────────────────────────────── */}
                    <div className="mem-card featured">
                        {/* Featured strip */}
                        <div style={{
                            background: '#003366', padding: '0.5rem 1.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Council Member
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>Application-based</span>
                        </div>

                        <div style={{ padding: '1.4rem 1.5rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Zap size={20} color="#003366" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Council Member</h2>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>2-year membership · Renewable</p>
                                </div>
                            </div>

                            <p style={{ margin: '0 0 1rem', fontSize: '0.845rem', color: '#64748B', lineHeight: '1.6' }}>
                                For senior AI risk and governance practitioners. Unlock content creation, downloads, and platform-wide contribution privileges.
                            </p>

                            {/* Pricing */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ textDecoration: 'line-through', color: '#475569', fontSize: '2.2rem', fontWeight: '800' }}>$99</span>
                                <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: '600' }}>/yr</span>
                                <span style={{ fontSize: '1.9rem', fontWeight: '900', color: '#003366', marginLeft: '2px' }}>$0</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: '#F1F5F9', margin: '0 1.5rem 0.85rem' }} />

                        {/* Feature list */}
                        <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.1rem' }}>
                            {COUNCIL_FEATURES.map(({ label }, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: '#DBEAFE',
                                    }}>
                                        <Check size={10} color="#003366" strokeWidth={3} />
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: '#374151' }}>{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div style={{ padding: '0 1.5rem 1.4rem', marginTop: 'auto' }}>
                            <button
                                className="mem-btn mem-btn-primary"
                                onClick={councilCta.action ?? undefined}
                                disabled={!councilCta.action}
                            >
                                {councilCta.label}{councilCta.action && <ArrowRight size={14} />}
                            </button>
                            {!isLoggedIn && (
                                <p style={{ margin: '0.55rem 0 0', textAlign: 'center', fontSize: '0.73rem', color: '#94A3B8' }}>
                                    Already a Professional?{' '}
                                    <Link to="/login" style={{ color: '#003366', fontWeight: '700', textDecoration: 'none' }}>Sign in</Link>{' '}to apply
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── COMPARISON TABLE ──────────────────────────────────────── */}
                <div style={{ marginTop: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <h2 style={{ margin: '0 0 0.3rem', fontSize: 'clamp(1.15rem,2.5vw,1.55rem)', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
                            Full Feature Comparison
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>See exactly what's included in each membership tier.</p>
                    </div>

                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                        <table className="mem-table">
                            <thead>
                                <tr>
                                    <th className="col-feat">Feature</th>
                                    <th className="col-pro">Professional</th>
                                    <th className="col-coun">Council Member</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON_ROWS.map(({ feature, pro, council }, i) => (
                                    <tr key={i}>
                                        <td>{feature}</td>
                                        <td>{pro ? <Check size={17} color="#059669" strokeWidth={2.5} style={{ display: 'inline' }} /> : <X size={15} color="#EF4444" strokeWidth={2.5} style={{ display: 'inline' }} />}</td>
                                        <td>{council ? <Check size={17} color="#003366" strokeWidth={2.5} style={{ display: 'inline' }} /> : <X size={15} color="#EF4444" strokeWidth={2.5} style={{ display: 'inline' }} />}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── FAQ ───────────────────────────────────────────────────── */}
                <div style={{ marginTop: '2.5rem', maxWidth: '700px', marginInline: 'auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <h2 style={{ margin: '0 0 0.3rem', fontSize: 'clamp(1.15rem,2.5vw,1.55rem)', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
                            Frequently Asked Questions
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Everything you need to know about our membership plans.</p>
                    </div>
                    {FAQ.map((item, i) => (
                        <div key={i} className="mem-faq">
                            <button className="mem-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <span>{item.q}</span>
                                <ChevronDown size={16} color="#94A3B8" style={{ transition: 'transform 0.22s', transform: openFaq === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                            </button>
                            {openFaq === i && <div className="mem-faq-a">{item.a}</div>}
                        </div>
                    ))}
                </div>

                {/* ── CTA FOOTER ────────────────────────────────────────────── */}
                <div style={{
                    marginTop: '2.5rem',
                    background: 'linear-gradient(135deg, #001a33, #003366)',
                    borderRadius: '16px', padding: 'clamp(1.5rem,3vw,2.25rem) clamp(1.25rem,3vw,2rem)',
                    textAlign: 'center',
                }}>
                    {/* Role-aware CTA content */}
                    {isFounder ? (
                        <>
                            <h2 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: '800' }}>You're a Founding Member</h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: '1.65' }}>You have full platform access and administrative privileges.</p>
                        </>
                    ) : isCouncil && isApproved ? (
                        <>
                            <h2 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: '800' }}>You're a Council Member ✓</h2>
                            <p style={{ margin: '0 auto 1.5rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: '1.65', maxWidth: '420px' }}>You have full access to downloads, content creation, and platform-wide privileges.</p>
                            <button onClick={() => navigate('/user/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#003366', padding: '0.72rem 1.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
                                Go to Dashboard <ArrowRight size={13} />
                            </button>
                        </>
                    ) : currentRole === 'professional' && isApproved ? (
                        <>
                            <h2 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: '800' }}>You're a Professional Member ✓</h2>
                            <p style={{ margin: '0 auto 1.5rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: '1.65', maxWidth: '420px' }}>Ready to unlock more? Apply for Council Member to get downloads and content creation privileges.</p>
                            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate('/user/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '0.72rem 1.5rem', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    My Dashboard
                                </button>
                                <button onClick={() => setShowCouncilModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#003366', padding: '0.72rem 1.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
                                    Apply for Council Member <ArrowRight size={13} />
                                </button>
                            </div>
                        </>
                    ) : currentRole === 'professional' ? (
                        <>
                            <h2 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: '800' }}>Application Pending</h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: '1.65' }}>Our team is reviewing your Professional membership application. You'll be notified within 24–48 hours.</p>
                        </>
                    ) : isCouncil ? (
                        <>
                            <h2 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: '800' }}>Council Application Under Review</h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: '1.65' }}>Your Council Member application is being reviewed. You'll hear back within 24–48 hours.</p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: '800' }}>Ready to Join the AI Risk Council?</h2>
                            <p style={{ margin: '0 auto 1.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', lineHeight: '1.65', maxWidth: '420px' }}>Apply today and start building in the AI risk and governance space.</p>
                            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => setShowSubCatModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: '#003366', padding: '0.72rem 1.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Get Professional <ArrowRight size={13} />
                                </button>
                                <button onClick={() => navigate('/login?next=/membership')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.72rem 1.5rem', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    Sign In
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── PROFESSIONAL SUB-CAT MODAL ────────────────────────────────── */}
            {showSubCatModal && (
                <div className="mem-modal-overlay" onClick={() => setShowSubCatModal(false)}>
                    <div className="mem-modal" onClick={e => e.stopPropagation()}>
                        <div className="mem-modal-hd">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <Shield size={16} color="#A78BFA" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '800' }}>Professional Membership</h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Select the sub-category that best describes you - both have identical access.</p>
                            </div>
                            <button onClick={() => setShowSubCatModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '6px', padding: '0.25rem', display: 'flex' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mem-modal-bd">
                            <div className="subcol-grid">
                                {SUB_CATEGORIES.map(sc => (
                                    <button
                                        key={sc.value}
                                        className={`subcat-pick${selectedSubCat === sc.value ? ' sel' : ''}`}
                                        onClick={() => setSelectedSubCat(sc.value)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{sc.emoji}</span>
                                            {selectedSubCat === sc.value && (
                                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check size={10} color="white" strokeWidth={3} />
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.2rem' }}>{sc.label}</div>
                                        <span style={{ display: 'inline-block', fontSize: '0.63rem', fontWeight: '700', background: '#EFF6FF', color: '#003366', padding: '1px 7px', borderRadius: '100px', marginBottom: '0.45rem' }}>{sc.tag}</span>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.76rem', color: '#64748B', lineHeight: '1.5' }}>{sc.desc}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            {sc.traits.map(t => (
                                                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Check size={10} color="#059669" strokeWidth={3} />
                                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{t}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.75rem', color: '#64748B', border: '1px solid #E2E8F0' }}>
                                Both Prerequisites share identical access and pricing. The selection is self-declared and used for community analytics only.
                            </div>

                            <button
                                onClick={() => { setShowSubCatModal(false); navigate(`/register?sub=${selectedSubCat}`); }}
                                className="mem-btn mem-btn-primary"
                            >
                                Continue to Registration <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── COUNCIL APPLICATION MODAL ──────────────────────────────────── */}
            {showCouncilModal && (
                <div className="mem-modal-overlay" onClick={() => !councilSuccess && setShowCouncilModal(false)}>
                    <div className="mem-modal" onClick={e => e.stopPropagation()}>
                        <div className="mem-modal-hd">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <Zap size={16} color="#60A5FA" />
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '800' }}>Apply for Council Member</h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                                    Reviewed by our admin team - typically within 24–48 hours.
                                </p>
                            </div>
                            <button onClick={() => setShowCouncilModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '6px', padding: '0.25rem', display: 'flex' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {councilSuccess ? (
                            <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                                <div style={{ width: 56, height: 56, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <Check size={26} color="#059669" />
                                </div>
                                <h3 style={{ margin: '0 0 0.45rem', fontWeight: '800', fontSize: '1.15rem', color: '#1e293b' }}>Application Submitted!</h3>
                                <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.65 }}>
                                    Our admin team will review your application and get back to you within 24–48 hours. Your Professional membership remains active.
                                </p>
                                <button onClick={() => setShowCouncilModal(false)} style={{ padding: '0.65rem 2rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontFamily: 'var(--font-sans)', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCouncilSubmit}>
                                <div className="mem-modal-bd">
                                    {/* Unlock strip */}
                                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '9px', padding: '0.75rem 0.9rem' }}>
                                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.68rem', fontWeight: '800', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What you unlock</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                            {['2-year term', 'Framework downloads', 'Create events & news', 'Resource uploads', 'Workshop creation'].map(b => (
                                                <span key={b} style={{ background: 'white', border: '1px solid #BFDBFE', borderRadius: '100px', padding: '1px 9px', fontSize: '0.7rem', color: '#1D4ED8', fontWeight: '600' }}>{b}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {councilError && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.65rem 0.9rem' }}>
                                            <AlertCircle size={14} color="#DC2626" />
                                            <span style={{ fontSize: '0.82rem', color: '#DC2626' }}>{councilError}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px,100%), 1fr))', gap: '0.8rem' }}>
                                        {[
                                            { key: 'organization_name', label: 'Organisation', placeholder: 'Acme AI Corp' },
                                            { key: 'job_title',         label: 'Job Title',    placeholder: 'AI Risk Manager' },
                                        ].map(({ key, label, placeholder }) => (
                                            <div key={key}>
                                                <label style={lStyle}>{label}</label>
                                                <input style={iStyle} placeholder={placeholder} value={councilForm[key]}
                                                    onChange={e => setCouncilForm(p => ({ ...p, [key]: e.target.value }))}
                                                    onFocus={e => e.target.style.borderColor = '#003366'}
                                                    onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label style={lStyle}>LinkedIn URL</label>
                                        <input style={iStyle} type="url" placeholder="https://linkedin.com/in/..."
                                            value={councilForm.linkedin_url}
                                            onChange={e => setCouncilForm(p => ({ ...p, linkedin_url: e.target.value }))}
                                            onFocus={e => e.target.style.borderColor = '#003366'}
                                            onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                    </div>

                                    <div>
                                        <label style={lStyle}>Professional Bio <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
                                        <textarea rows={2} style={{ ...iStyle, resize: 'vertical' }}
                                            placeholder="Brief background in AI risk, compliance, or governance..."
                                            value={councilForm.professional_bio}
                                            onChange={e => setCouncilForm(p => ({ ...p, professional_bio: e.target.value }))}
                                            onFocus={e => e.target.style.borderColor = '#003366'}
                                            onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                    </div>

                                    <div>
                                        <label style={lStyle}>Why do you want to be a Council Member? <span style={{ color: '#EF4444' }}>*</span></label>
                                        <textarea rows={3} style={{ ...iStyle, resize: 'vertical' }}
                                            placeholder="Your interest in AI governance and how you plan to contribute..."
                                            value={councilForm.why_council_member}
                                            onChange={e => setCouncilForm(p => ({ ...p, why_council_member: e.target.value }))}
                                            onFocus={e => e.target.style.borderColor = '#003366'}
                                            onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.7rem' }}>
                                        <button type="button" onClick={() => setShowCouncilModal(false)}
                                            style={{ flex: 1, padding: '0.72rem', background: 'white', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}>
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={councilSubmitting}
                                            className="mem-btn mem-btn-primary" style={{ flex: 2 }}>
                                            {councilSubmitting
                                                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                                                : <>Submit Application <ArrowRight size={14} /></>}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Membership;
