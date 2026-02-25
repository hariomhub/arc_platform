import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Briefcase, ShieldCheck, Users,
    CheckCircle, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useModal } from '../hooks/useModal.js';
import UpgradeModal from '../components/modals/UpgradeModal.jsx';
import { useEffect } from 'react';

// ─── Static service data ──────────────────────────────────────────────────────
const SERVICES = [
    {
        icon: BookOpen,
        accent: '#003366',
        title: 'Governance Playbooks',
        description:
            'Comprehensive, framework-aligned playbooks covering EU AI Act, NIST AI RMF, and ISO/IEC 42001. Each playbook provides step-by-step implementation guidance, assessment templates, and evidence documentation checklists.',
        features: [
            'Clause-by-clause EU AI Act compliance guides',
            'NIST AI RMF Govern/Map/Measure/Manage implementation',
            'ISO 42001 gap assessment templates',
            'Evidence collection and audit-readiness checklists',
        ],
    },
    {
        icon: Briefcase,
        accent: '#0055A4',
        title: 'Consulting Model',
        description:
            'On-demand access to our network of AI governance experts. We embed with your team to rapidly develop your AI governance programme — from initial risk appetite statements through to board-level reporting frameworks.',
        features: [
            'Fractional AI Governance Officer engagements',
            'Board and executive briefings on AI risk',
            'Custom framework design and policy drafting',
            'Regulatory liaison and submission support',
        ],
    },
    {
        icon: ShieldCheck,
        accent: '#D97706',
        title: 'Risk Advisory',
        description:
            'Independent AI product security reviews and control audits. Our assessors evaluate your AI systems for bias, robustness, explainability, and data privacy risks — delivering detailed reports with remediation roadmaps.',
        features: [
            'AI system security and bias assessments',
            'Third-party AI vendor due diligence',
            'Adversarial robustness and red-team testing',
            'Privacy-by-design review for AI pipelines',
        ],
    },
    {
        icon: Users,
        accent: '#7C3AED',
        title: 'Community Frameworks',
        description:
            'Practitioner-developed, community-validated frameworks built by the global ARC membership. Access shared risk taxonomies, benchmarking datasets, and collaborative working groups for sector-specific AI challenges.',
        features: [
            'Sector-specific AI risk taxonomies (finance, healthcare, HR)',
            'Peer benchmarking and maturity scoring',
            'Community working groups and roundtables',
            'Open-source control libraries and reference architectures',
        ],
    },
];

// ─── Services ─────────────────────────────────────────────────────────────────
const Services = () => {
    const navigate = useNavigate();
    const { canDownloadFramework } = useAuth();
    const upgradeModal = useModal();

    useEffect(() => {
        document.title = 'Services | AI Risk Council';
    }, []);

    const handlePlaybookCTA = () => {
        if (canDownloadFramework()) navigate('/resources');
        else upgradeModal.open();
    };

    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #002244 0%, #003366 60%, #005599 100%)',
                    padding: '5rem 2rem',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                <div className="container" style={{ maxWidth: '750px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <h1
                        style={{
                            color: 'white', fontSize: '2.75rem', fontWeight: '800',
                            marginBottom: '1.25rem', lineHeight: '1.15',
                            fontFamily: 'var(--font-serif)',
                        }}
                    >
                        Professional Services
                    </h1>
                    <p style={{ fontSize: '1.15rem', color: '#CBD5E1', lineHeight: '1.7', marginBottom: '2.5rem' }}>
                        Leverage our expertise to accelerate your AI governance maturity. We offer specialised advisory, product reviews, playbooks, and community resources trusted by 500+ organisations globally.
                    </p>
                    <button
                        onClick={handlePlaybookCTA}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: '#f9a825', color: '#002244',
                            border: 'none', padding: '0.9rem 2rem',
                            borderRadius: '6px', fontWeight: '800',
                            fontSize: '0.95rem', cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            transition: 'transform 0.15s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                        Download Playbooks <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* ── Service Cards ─────────────────────────────────────────────── */}
            <div style={{ background: '#F8FAFC', padding: '5rem 2rem' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '2rem' }}>
                        {SERVICES.map(({ icon: Icon, accent, title, description, features }) => (
                            <div
                                key={title}
                                style={{
                                    background: 'white', borderRadius: '16px',
                                    border: '1px solid #E2E8F0',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                    overflow: 'hidden',
                                    transition: 'box-shadow 0.2s, transform 0.2s',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,51,102,0.12)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                {/* Colour top bar */}
                                <div style={{ height: '5px', background: accent }} />
                                <div style={{ padding: '2.25rem' }}>
                                    {/* Icon + title */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                        <div
                                            style={{
                                                width: '52px', height: '52px', borderRadius: '12px',
                                                background: `${accent}14`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon size={26} color={accent} />
                                        </div>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1A202C', margin: 0 }}>{title}</h2>
                                    </div>

                                    <p style={{ color: '#4A5568', lineHeight: '1.8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                                        {description}
                                    </p>

                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {features.map((f) => (
                                            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.875rem', color: '#475569' }}>
                                                <CheckCircle size={15} color={accent} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Executive Workshops section ──────────────────────────────── */}
            <div style={{ background: 'white', padding: '5rem 2rem', borderTop: '1px solid #E2E8F0' }}>
                <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#1A202C', marginBottom: '0.5rem' }}>Executive Workshops</h2>
                        <p style={{ color: '#64748B', fontSize: '1rem', maxWidth: '580px', margin: '0 auto' }}>
                            Half-day and full-day sessions designed for Board Directors and C-Suite leaders to understand their fiduciary duties regarding AI oversight.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {[
                            { title: 'Governance Fundamentals', desc: "Building the board's AI fluency and risk appetite statement." },
                            { title: 'Crisis Simulation', desc: 'Tabletop exercises simulating a major AI failure or bias incident.' },
                            { title: 'RAI Controls & Testing', desc: 'Deep dive into model testing, validation, and control design.' },
                        ].map(({ title, desc }) => (
                            <div
                                key={title}
                                style={{
                                    background: '#F0F4F8', padding: '2rem', borderRadius: '12px',
                                    width: '300px', flex: '1 1 280px', maxWidth: '340px',
                                    borderTop: '4px solid #003366',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'transform 0.15s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#003366', marginBottom: '0.75rem' }}>{title}</h4>
                                <p style={{ fontSize: '0.9rem', color: '#4A5568', lineHeight: '1.7', margin: 0 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <div style={{ background: '#003366', padding: '5rem 2rem', textAlign: 'center' }}>
                <div className="container" style={{ maxWidth: '680px', margin: '0 auto' }}>
                    <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>
                        Ready to Strengthen Your AI Governance?
                    </h2>
                    <p style={{ color: '#CBD5E1', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '2.5rem' }}>
                        Access our full library of governance playbooks, audit templates, and community resources — all built by experts, for practitioners.
                    </p>
                    <button
                        onClick={handlePlaybookCTA}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: 'white', color: '#003366',
                            border: 'none', padding: '0.9rem 2.25rem',
                            borderRadius: '6px', fontWeight: '700',
                            fontSize: '0.95rem', cursor: 'pointer',
                            fontFamily: 'var(--font-sans)', transition: 'opacity 0.15s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                        onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                        Download Playbooks <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* ── Upgrade Modal ─────────────────────────────────────────────── */}
            <UpgradeModal isOpen={upgradeModal.isOpen} onClose={upgradeModal.close} />
        </>
    );
};

export default Services;
