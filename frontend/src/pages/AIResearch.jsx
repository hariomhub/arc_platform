import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, BookOpen, FileBarChart, Shield,
    Globe, Microscope, ArrowRight
} from 'lucide-react';

// ─── Research focus areas ─────────────────────────────────────────────────────
const FOCUS_AREAS = [
    {
        icon: Search,
        title: 'AI Risk Identification & Taxonomy',
        description: 'We develop, maintain, and publish open-source AI risk taxonomies aligned with NIST AI RMF, ISO/IEC 23894, and the EU AI Act. Our taxonomies are used by regulatory bodies and enterprises across 30+ countries.',
        outputs: ['AI Risk Classification Matrix', 'Sector-specific risk catalogues', 'Annual AI Incident Taxonomy Report'],
    },
    {
        icon: Shield,
        title: 'Regulatory Impact Analysis',
        description: 'Independent research tracking the global AI regulatory landscape. We publish comparative analyses of AI laws, identify compliance gaps, and model the economic impact of proposed regulations on different industry sectors.',
        outputs: ['Global AI Law Tracker', 'Quarterly Regulatory Briefings', 'EU AI Act Implementation Playbook'],
    },
    {
        icon: FileBarChart,
        title: 'AI Governance Maturity Research',
        description: 'Annual benchmarking studies measuring AI governance maturity across organisations of different sizes, sectors, and geographies. Data collected from 500+ organisations to identify trends and best practices.',
        outputs: ['Annual AI Governance Maturity Report', 'Sector Benchmarking Scorecards', 'Board Readiness Assessment Tool'],
    },
    {
        icon: Microscope,
        title: 'Model Risk & Validation Research',
        description: 'Technical research into model validation methodologies, adversarial robustness, and bias detection covering classical ML, LLMs, and multi-modal foundation models. Aligned to SR 11-7 and emerging GPAI requirements.',
        outputs: ['LLM Validation Framework', 'Bias Detection Benchmark Suite', 'Red Team Methodology Guide'],
    },
    {
        icon: BookOpen,
        title: 'AI Ethics & Fairness Studies',
        description: 'Empirical research into algorithmic bias, disparate impacts, and the practical implementation of fairness constraints in production AI systems. Includes case studies from healthcare, finance, and criminal justice domains.',
        outputs: ['Fairness Metrics Compendium', 'Algorithmic Bias Case Study Library', 'AI Ethics Impact Assessment Template'],
    },
    {
        icon: Globe,
        title: 'Emerging Technology Risk Horizons',
        description: 'Horizon-scanning research identifying novel AI risk categories before they become mainstream. Current focus areas include agentic AI autonomy risks, synthetic media governance, and AI-enabled cyber threats.',
        outputs: ['Agentic AI Risk Report 2025', 'Synthetic Media Governance Framework', 'AI Cyber Threat Landscape Report'],
    },
];

const METHODOLOGY_STEPS = [
    { step: '01', title: 'Problem Scoping', description: 'Research questions defined in collaboration with Council members, regulators, and industry practioners to ensure real-world relevance.' },
    { step: '02', title: 'Multi-disciplinary Review', description: 'Literature review spanning computer science, law, ethics, and risk management to ensure research is grounded in established knowledge.' },
    { step: '03', title: 'Primary Data Collection', description: 'Surveys, interviews, and case studies conducted under a rigorous IRB-approved research protocol. Data anonymised where required.' },
    { step: '04', title: 'Peer Review', description: 'All research output reviewed by a panel of independent AI risk experts prior to publication. Critical findings are stress-tested through adversarial review.' },
    { step: '05', title: 'Open Publication', description: 'Research published openly in the ARC Knowledge Library. Executive summaries accessible to all; full research available to Council members.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const AIResearch = () => {
    useEffect(() => {
        document.title = 'AI Risk Research Services | ARC';
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* ── Hero ── */}
            <div className="bg-gradient-to-br from-[#002244] to-[#003366] py-20 px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-block text-[#93C5FD] font-bold text-xs tracking-widest uppercase mb-4">
                        Independent Research
                    </span>
                    <h1 className="text-white text-4xl font-extrabold leading-tight mb-4 font-serif">
                        AI Risk Research Services
                    </h1>
                    <p className="text-[#CBD5E1] text-lg leading-relaxed max-w-2xl mx-auto mb-8">
                        The AI Risk Council publishes independent, peer-reviewed research on AI risk governance,
                        regulatory compliance, and responsible AI deployment — helping organisations stay ahead of
                        emerging threats.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link
                            to="/resources"
                            className="inline-flex items-center gap-2 bg-white text-[#003366] px-6 py-3 rounded-md font-bold text-sm no-underline hover:opacity-90 transition-opacity"
                        >
                            <BookOpen size={15} /> Browse Research Library
                        </Link>
                        <Link
                            to="/membership"
                            className="inline-flex items-center gap-2 bg-transparent text-white border border-white/40 px-6 py-3 rounded-md font-bold text-sm no-underline hover:bg-white/10 transition-colors"
                        >
                            Join the Council <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Focus Areas ── */}
            <div className="max-w-6xl mx-auto py-20 px-8">
                <div className="text-center mb-14">
                    <h2 className="text-3xl font-extrabold text-[#1A202C] mb-3">Research Focus Areas</h2>
                    <p className="text-[#64748B] text-base max-w-xl mx-auto leading-relaxed">
                        Six programme areas covering the full spectrum of AI risk — from technical model risk
                        through to regulatory, ethical, and emerging threat horizons.
                    </p>
                </div>

                <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    {FOCUS_AREAS.map((area, idx) => {
                        const Icon = area.icon;
                        return (
                            <div
                                key={idx}
                                className="bg-white rounded-2xl border border-[#E2E8F0] p-8 flex flex-col shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                            >
                                <div className="bg-[#EFF6FF] rounded-xl p-3 inline-flex mb-5 self-start">
                                    <Icon size={24} className="text-[#003366]" color="#003366" />
                                </div>
                                <h3 className="text-lg font-bold text-[#1A202C] mb-3 leading-snug">
                                    {area.title}
                                </h3>
                                <p className="text-[#4A5568] text-sm leading-relaxed mb-5 flex-grow">
                                    {area.description}
                                </p>
                                <div>
                                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
                                        Key Outputs
                                    </p>
                                    <ul className="space-y-1.5">
                                        {area.outputs.map((output) => (
                                            <li key={output} className="flex items-start gap-2 text-sm text-[#374151]">
                                                <span className="text-[#003366] font-bold mt-0.5 leading-none">→</span>
                                                {output}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Methodology ── */}
            <div className="bg-white border-y border-[#E2E8F0] py-20 px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-extrabold text-[#1A202C] mb-3">Research Methodology</h2>
                        <p className="text-[#64748B] text-base max-w-xl mx-auto leading-relaxed">
                            All ARC research follows a rigorous, multi-stage methodology designed to produce
                            credible, actionable, and policy-relevant outputs.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6">
                        {METHODOLOGY_STEPS.map((ms) => (
                            <div key={ms.step} className="flex gap-5 items-start">
                                <div className="bg-[#003366] text-white text-xs font-black rounded-lg px-3 py-2 shrink-0 mt-0.5 tracking-wide">
                                    {ms.step}
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#1A202C] text-base mb-1">{ms.title}</h4>
                                    <p className="text-[#4A5568] text-sm leading-relaxed">{ms.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── CTA ── */}
            <div className="bg-[#003366] py-16 px-8 text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-white text-3xl font-extrabold mb-4 font-serif">
                        Collaborate With Our Research Team
                    </h2>
                    <p className="text-[#CBD5E1] text-base leading-relaxed mb-8">
                        Council members can commission bespoke research, co-author publications, and gain
                        early access to pre-publication findings. Partner organisations can sponsor research
                        programmes aligned to their strategic priorities.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 bg-white text-[#003366] px-6 py-3 rounded-md font-bold text-sm no-underline hover:opacity-90 transition-opacity"
                        >
                            Contact Research Team
                        </Link>
                        <Link
                            to="/membership"
                            className="inline-flex items-center gap-2 bg-transparent text-white border border-white/40 px-6 py-3 rounded-md font-bold text-sm no-underline hover:bg-white/10 transition-colors"
                        >
                            Become a Member
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIResearch;
