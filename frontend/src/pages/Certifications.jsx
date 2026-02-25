import React, { useState, useEffect } from 'react';
import { Award, Briefcase, Star, CheckCircle, Download, Loader2 } from 'lucide-react';

// ─── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = [
    {
        key: 'associate',
        icon: Award,
        label: 'Associate',
        badge: 'ASSOCIATE',
        // Dynamic accent colours are runtime values — must stay as CSS values, used via style prop
        accent: '#D97706',
        borderTop: '#D97706',
        badgeStyle: { background: '#FEF3C7', color: '#B45309' },
        description: 'The entry-level credential for professionals beginning their AI governance journey. Validates foundational knowledge of AI risk concepts, regulatory frameworks, and governance principles.',
        targetAudience: 'Risk analysts, compliance officers, IT professionals, and AI product managers new to governance.',
        duration: '40 hours of self-paced study',
        modules: [
            'Introduction to AI Risk & Governance',
            'Overview of EU AI Act, NIST AI RMF & ISO 42001',
            'AI Risk Taxonomy & Classification',
            'Ethical AI Principles & Bias Fundamentals',
            'AI System Inventory & Documentation',
            'Associate Assessment (60 MCQs)',
        ],
        syllabusUrl: '#',
    },
    {
        key: 'professional',
        icon: Briefcase,
        label: 'Professional',
        badge: 'PROFESSIONAL',
        accent: '#475569',
        borderTop: '#64748B',
        badgeStyle: { background: '#F3F4F6', color: '#374151' },
        description: 'The practitioner credential for professionals actively designing and managing AI governance programmes. Covers advanced risk assessment, model validation, and regulatory compliance implementation.',
        targetAudience: 'Risk managers, compliance leads, AI programme owners, and legal counsels with 2+ years experience.',
        duration: '80 hours of self-paced study + 1 practical project',
        modules: [
            'Advanced Model Risk Management (SR 11-7 aligned)',
            'EU AI Act High-Risk System Obligations',
            'AI Vendor Due Diligence & Third-Party Risk',
            'Technical Controls: Explainability, Drift & Bias Detection',
            'AI Incident Response Planning & Testing',
            'Regulatory Mapping & Evidence Collection',
            'Professional Assessment (Case study + 80 MCQs)',
        ],
        syllabusUrl: '#',
    },
    {
        key: 'expert',
        icon: Star,
        label: 'Expert',
        badge: 'EXPERT',
        accent: '#B45309',
        borderTop: '#F59E0B',
        badgeStyle: { background: '#FEF9C3', color: '#92400E' },
        description: 'The advanced credential reserved for senior leaders architecting enterprise-wide AI governance frameworks. Includes board reporting, Red Team exercises, and AI transparency reporting.',
        targetAudience: 'Chief Risk Officers, CCOs, AI governance leads, and senior partners at advisory firms.',
        duration: '120 hours + 2 practical projects + oral examination',
        modules: [
            'Enterprise AI Governance Architecture & Design',
            'Board-Level AI Risk Reporting & ESG Alignment',
            'Advanced Regulatory Strategy: Global AI Law Landscape',
            'Red Team & Adversarial AI Risk Exercises',
            'Agentic & Generative AI Governance',
            'AI Transparency Report Design & Publication',
            'Expert Assessment (Portfolio + Oral Examination)',
        ],
        syllabusUrl: '#',
    },
];

// ─── Tier Card ─────────────────────────────────────────────────────────────────
const TierCard = ({ tier }) => {
    const [downloading, setDownloading] = useState(false);
    const { icon: Icon } = tier;

    const handleDownload = async () => {
        setDownloading(true);
        await new Promise((r) => setTimeout(r, 800));
        window.open(tier.syllabusUrl, '_blank', 'noopener,noreferrer');
        setDownloading(false);
    };

    return (
        <div
            className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
            style={{ borderTop: `5px solid ${tier.borderTop}` }}
        >
            <div className="p-8 pb-6">
                {/* Icon + Badge */}
                <div className="flex justify-between items-start mb-5">
                    <div className="rounded-xl p-3 inline-flex" style={{ background: `${tier.accent}18` }}>
                        <Icon size={30} color={tier.accent} />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full tracking-wide" style={tier.badgeStyle}>
                        {tier.badge}
                    </span>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">{tier.label} Certification</h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{tier.description}</p>

                <div className="flex flex-col gap-1.5 mb-6">
                    <p className="text-xs text-slate-500 m-0"><strong className="text-slate-700">Target:</strong> {tier.targetAudience}</p>
                    <p className="text-xs text-slate-500 m-0"><strong className="text-slate-700">Study Load:</strong> {tier.duration}</p>
                </div>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Programme Modules</p>
                <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                    {tier.modules.map((mod) => (
                        <li key={mod} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle size={14} color={tier.accent} className="shrink-0 mt-0.5" />
                            {mod}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 mt-auto">
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-2 text-white border-none py-3 px-4 rounded-lg font-bold text-sm cursor-pointer transition-opacity font-sans disabled:opacity-60"
                    style={{ background: downloading ? '#94A3B8' : tier.accent }}
                >
                    {downloading
                        ? <><Loader2 size={15} className="animate-spin" /> Opening Syllabus…</>
                        : <><Download size={15} /> Download Syllabus</>
                    }
                </button>
            </div>
        </div>
    );
};

// ─── Page ──────────────────────────────────────────────────────────────────────
const Certifications = () => {
    useEffect(() => { document.title = 'Certification | ARC'; }, []);

    return (
        <>
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#002244] to-[#003366] py-20 px-8 text-center">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-white text-4xl font-extrabold mb-4 font-serif">Certifications &amp; Standards</h1>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        Demonstrate your organisation's commitment to responsible AI with globally recognised credentials — from foundational awareness through to expert-level governance architecture.
                    </p>
                </div>
            </div>

            {/* Cards */}
            <div className="bg-slate-50 py-20 px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Three Certification Levels</h2>
                        <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
                            Choose the certification that matches your role, experience, and career goals.
                        </p>
                    </div>
                    <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {TIERS.map((tier) => <TierCard key={tier.key} tier={tier} />)}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="bg-[#003366] py-16 px-8 text-center">
                <div className="max-w-xl mx-auto">
                    <h2 className="text-white text-3xl font-extrabold mb-4 font-serif">Ready to Get Certified?</h2>
                    <p className="text-slate-300 leading-relaxed mb-8">
                        Council members receive discounted certification fees, priority access to exam cohorts, and dedicated study materials.
                    </p>
                    <a href="/membership" className="inline-flex items-center gap-2 bg-white text-[#003366] px-8 py-3 rounded-md font-bold text-sm no-underline hover:opacity-90 transition-opacity">
                        Join the Council →
                    </a>
                </div>
            </div>
        </>
    );
};

export default Certifications;
