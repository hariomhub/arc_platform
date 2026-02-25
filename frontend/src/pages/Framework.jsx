import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, FileText, ClipboardList, ChevronRight } from 'lucide-react';

// ─── Static content ────────────────────────────────────────────────────────────

const PILLARS = [
    { title: 'Risk Identification & Taxonomy', description: 'Systematically catalogue all AI risks across technical, ethical, regulatory, and operational domains. Apply a standardised taxonomy aligned to NIST AI RMF and ISO/IEC 23894 to ensure consistent classification across all business units.' },
    { title: 'Governance & Accountability', description: 'Establish clear ownership structures — from Board-level oversight to line-of-business accountability. Define roles, responsibilities, and escalation paths so AI decisions are traceable and auditable.' },
    { title: 'Model Risk Management', description: 'Apply systematic validation, testing, and monitoring to all AI models throughout their lifecycle. Implement SR 11-7 aligned model risk practices covering design, validation, deployment, and retirement.' },
    { title: 'Regulatory Compliance', description: 'Map your AI systems to applicable regulations — EU AI Act, NIST AI RMF, ISO 42001, and sector-specific rules. Maintain living compliance artefacts with automated control mapping and evidence collection.' },
    { title: 'Ethical AI & Fairness', description: 'Embed bias detection, explainability, and fairness controls into the AI development lifecycle. Ensure your systems do not cause disparate harm and are aligned to your organisation\'s responsible AI principles.' },
    { title: 'Incident Response & Resilience', description: 'Develop and test AI-specific incident response playbooks. Establish detection, containment, communication, and learning processes for AI failures, adversarial attacks, and bias events.' },
];

const MATURITY_LEVELS = [
    {
        level: 1, name: 'Foundational', color: '#94A3B8', bg: '#F8FAFC',
        description: 'Ad-hoc risk management with no formal AI governance structure. Risks are addressed reactively and inconsistently.',
        characteristics: ['No dedicated AI risk policy or owner', 'Model inventory non-existent or informal', 'Risk assessments performed only after incidents', 'No third-party AI vendor due diligence'],
        actions: ['Appoint an AI Risk Owner or Committee', 'Begin inventorying all AI/ML systems in use', 'Draft a preliminary AI Acceptable Use Policy'],
    },
    {
        level: 2, name: 'Defined', color: '#3B82F6', bg: '#EFF6FF',
        description: 'Standardised definitions and baseline controls are documented. Governance exists but is not consistently applied.',
        characteristics: ['Formal AI governance policy documented', 'Basic model register maintained', 'Risk taxonomy defined and communicated', 'Initial bias and fairness checks performed'],
        actions: ['Implement a standardised model risk assessment template', 'Establish a mandatory AI procurement checklist', 'Train all AI project leads on governance policy'],
    },
    {
        level: 3, name: 'Managed', color: '#8B5CF6', bg: '#FAF5FF',
        description: 'Quantitative metrics are tracked and governance controls are continuously monitored across the AI lifecycle.',
        characteristics: ['KRIs and KPIs tracked for all material AI systems', 'Continuous model drift and bias monitoring active', 'Third-party AI audit completed annually', 'Incident response playbook tested and operational'],
        actions: ['Integrate AI risk metrics into ERM dashboard', 'Conduct annual red-team exercise on critical AI systems', 'Deploy automated model monitoring tooling'],
    },
    {
        level: 4, name: 'Optimized', color: '#003366', bg: '#EFF6FF',
        description: 'Adaptive governance with real-time feedback loops. AI risk management is embedded across the entire organisation.',
        characteristics: ['Real-time AI risk dashboard available to board', 'Fully automated model validation pipeline', 'AI governance integrated with enterprise ESG reporting', 'Continuous regulatory horizon scanning in place'],
        actions: ['Publish annual AI Transparency Report', 'Contribute to industry standards and working groups', 'Evolve governance to address agentic and generative AI'],
    },
];

const IMPLEMENTATION_GUIDE = [
    {
        phase: 'Phase 1', title: 'Governance Foundation', duration: '0–3 months', icon: '🏛️',
        steps: [
            { step: '1.1', title: 'Establish an AI Risk Committee', desc: 'Form a cross-functional committee including Legal, Compliance, IT, and Business unit heads. Define charter, cadence, and escalation paths.' },
            { step: '1.2', title: 'Appoint an AI Risk Owner', desc: 'Designate a senior individual (CISO, Chief Risk Officer, or equivalent) as accountable owner for the AI Risk Framework.' },
            { step: '1.3', title: 'Draft the AI Acceptable Use Policy', desc: 'Document approved AI use cases, prohibited applications, data handling requirements, and employee obligations.' },
            { step: '1.4', title: 'Build the AI System Inventory', desc: 'Catalogue all AI/ML systems in production, development, and evaluation. Include vendor-provided and embedded AI features.' },
        ],
    },
    {
        phase: 'Phase 2', title: 'Risk Assessment', duration: '3–6 months', icon: '🔍',
        steps: [
            { step: '2.1', title: 'Apply the AI Risk Classification Matrix', desc: 'Classify each system by impact (high/medium/low) and risk domain (bias, security, operational, reputational). Align to EU AI Act risk tiers where applicable.' },
            { step: '2.2', title: 'Conduct Model Risk Assessments', desc: 'For each material AI system, complete a structured MRA covering model purpose, training data quality, validation approach, and residual risk.' },
            { step: '2.3', title: 'Perform Vendor AI Due Diligence', desc: 'Assess third-party AI tools against the ARC Vendor Assessment Template covering transparency, security, bias controls, and contractual safeguards.' },
            { step: '2.4', title: 'Map Regulatory Obligations', desc: 'Identify applicable AI regulations (EU AI Act, NIST AI RMF, ISO 42001, sector-specific rules) and map them to internal controls.' },
        ],
    },
    {
        phase: 'Phase 3', title: 'Controls & Monitoring', duration: '6–12 months', icon: '🛡️',
        steps: [
            { step: '3.1', title: 'Implement Technical Controls', desc: 'Deploy model explainability tools, drift detection, differential privacy where required, and adversarial robustness testing.' },
            { step: '3.2', title: 'Establish Continuous Monitoring', desc: 'Define KRIs, KPIs, and alert thresholds for all high-risk AI systems. Integrate with existing SIEM and risk dashboards.' },
            { step: '3.3', title: 'Build an AI Incident Response Plan', desc: 'Define roles, escalation paths, communication protocols, and remediation playbooks for AI-specific incidents including bias events and model failures.' },
        ],
    },
    {
        phase: 'Phase 4', title: 'Audit & Optimisation', duration: 'Ongoing', icon: '📊',
        steps: [
            { step: '4.1', title: 'Conduct Annual AI Governance Audit', desc: 'Assess adherence to the framework, control effectiveness, and regulatory changes. Produce a formal audit report for the Board.' },
            { step: '4.2', title: 'Publish an AI Transparency Report', desc: 'Disclose material AI use cases, governance posture, and risk mitigations to stakeholders. Align to emerging disclosure standards.' },
            { step: '4.3', title: 'Iterate the Framework', desc: 'Update the framework annually to reflect new AI capabilities (agents, multimodal models), regulatory developments, and lessons learned.' },
        ],
    },
];

const AUDIT_TEMPLATES = [
    { id: 'T-01', title: 'AI System Intake & Classification Form', category: 'Governance', format: 'Excel / PDF', description: 'Used at the point of procuring or deploying any new AI system.', fields: ['System Name & Owner', 'Business Use Case', 'Data Sources & Sensitivity', 'Regulatory Applicability', 'Initial Risk Tier', 'Approval Signatures'] },
    { id: 'T-02', title: 'Model Risk Assessment (MRA) Template', category: 'Risk Assessment', format: 'Word / Notion', description: 'A structured 6-section assessment aligned to SR 11-7 and NIST AI RMF.', fields: ['Model Purpose & Scope', 'Training Data Lineage', 'Validation Methodology & Results', 'Known Limitations & Risks', 'Monitoring Controls', 'Residual Risk Rating & Sign-off'] },
    { id: 'T-03', title: 'AI Vendor Due Diligence Questionnaire', category: 'Third-Party Risk', format: 'Excel', description: 'A 40-question structured questionnaire for assessing external AI vendors.', fields: ['Company & Product Overview', 'Data Privacy & Processing', 'Model Transparency & Explainability', 'Bias & Fairness Controls', 'Security Certifications', 'Contractual AI Obligations'] },
    { id: 'T-04', title: 'EU AI Act Compliance Checklist', category: 'Regulatory', format: 'PDF / Excel', description: 'A clause-mapped checklist for organisations subject to the EU AI Act.', fields: ['System Classification', 'Mandatory Documentation Requirements', 'Conformity Assessment Status', 'GPAI Obligations', 'Post-Market Monitoring Plan', 'Regulatory Submission Tracker'] },
    { id: 'T-05', title: 'AI Incident Report Template', category: 'Incident Response', format: 'Word / Jira', description: 'Standardised incident report for AI-related failures including bias events.', fields: ['Incident Summary & Timeline', 'Systems & Data Affected', 'Root Cause Analysis', 'Regulatory Notification Required?', 'Remediation Actions & Owner', 'Lessons Learned'] },
    { id: 'T-06', title: 'Annual AI Governance Audit Report', category: 'Audit', format: 'Word / PowerPoint', description: 'A board-ready annual audit report template.', fields: ['Scope & Methodology', 'AI System Portfolio Review', 'Control Effectiveness Ratings', 'Regulatory Compliance Status', 'Key Findings & Risk Ratings', 'Management Action Plan'] },
];

const CATEGORY_COLORS = {
    Governance: '#003366', 'Risk Assessment': '#7C3AED',
    'Third-Party Risk': '#D97706', Regulatory: '#059669',
    'Incident Response': '#DC2626', Audit: '#0284C7',
};

// ─── Section renderers ─────────────────────────────────────────────────────────

const CorePillarsSection = () => (
    <div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Core Pillars of Oversight</h2>
        <p className="text-slate-500 mb-8 text-sm">The six foundational pillars that every enterprise AI governance programme must address.</p>
        <div className="flex flex-col gap-7">
            {PILLARS.map((pillar, idx) => (
                <div key={idx} className="flex gap-6 items-start border-b border-slate-100 pb-7 last:border-0">
                    <div className="text-4xl font-black text-slate-200 leading-none min-w-[52px] shrink-0">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1.5">{pillar.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed m-0">{pillar.description}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const MaturityLevelsSection = () => (
    <div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">AI Governance Maturity Model</h2>
        <p className="text-slate-500 mb-8 text-sm">Four progressive maturity levels to assess and improve your organisation's AI risk posture.</p>
        <div className="flex flex-col gap-5">
            {MATURITY_LEVELS.map((ml) => (
                <div key={ml.level} className="rounded-xl overflow-hidden border" style={{ background: ml.bg, borderColor: `${ml.color}25` }}>
                    <div className="px-5 py-4 flex items-center gap-3" style={{ background: ml.color }}>
                        <span className="w-8 h-8 rounded-full bg-white/20 text-white font-black text-sm flex items-center justify-center shrink-0">{ml.level}</span>
                        <h3 className="text-white m-0 text-base font-bold">Level {ml.level}: {ml.name}</h3>
                    </div>
                    <div className="p-5">
                        <p className="text-slate-600 text-sm leading-relaxed mb-4">{ml.description}</p>
                        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: ml.color }}>Characteristics</p>
                                <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                                    {ml.characteristics.map((c, i) => (
                                        <li key={i} className="flex gap-2 items-start text-sm text-slate-500">
                                            <span className="mt-0.5 shrink-0" style={{ color: ml.color }}>•</span> {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Next Actions</p>
                                <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                                    {ml.actions.map((a, i) => (
                                        <li key={i} className="flex gap-2 items-start text-sm text-slate-500">
                                            <CheckCircle size={13} color="#16A34A" className="shrink-0 mt-0.5" /> {a}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ImplementationGuideSection = () => (
    <div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Implementation Guide</h2>
        <p className="text-slate-500 mb-8 text-sm">A phased roadmap for embedding AI risk governance across your organisation.</p>
        <div className="flex flex-col gap-6">
            {IMPLEMENTATION_GUIDE.map((phase) => (
                <div key={phase.phase} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-[#003366] px-5 py-4 flex items-center gap-3">
                        <span className="text-2xl">{phase.icon}</span>
                        <div>
                            <span className="text-blue-200 text-xs font-semibold uppercase tracking-wide">{phase.phase} · {phase.duration}</span>
                            <h3 className="text-white m-0 mt-0.5 text-base font-bold">{phase.title}</h3>
                        </div>
                    </div>
                    <div className="p-5 flex flex-col gap-4">
                        {phase.steps.map((s) => (
                            <div key={s.step} className="flex gap-3 items-start">
                                <span className="bg-blue-50 text-[#003366] text-xs font-black px-2 py-1 rounded shrink-0 mt-0.5">{s.step}</span>
                                <div>
                                    <p className="font-bold text-slate-800 m-0 mb-1 text-sm">{s.title}</p>
                                    <p className="text-slate-500 m-0 text-xs leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const AuditTemplatesSection = () => (
    <div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Audit Templates</h2>
        <p className="text-slate-500 mb-8 text-sm">Production-ready templates for AI governance, risk assessment, regulatory compliance, and audit reporting.</p>
        <div className="flex flex-col gap-4">
            {AUDIT_TEMPLATES.map((t) => {
                const catColor = CATEGORY_COLORS[t.category] || '#003366';
                return (
                    <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 flex items-start gap-3 border-b border-slate-100">
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 shrink-0">
                                <ClipboardList size={18} color={catColor} />
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{t.id}</span>
                                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded" style={{ background: catColor }}>{t.category}</span>
                                    <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                                        <FileText size={11} />{t.format}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-800 m-0">{t.title}</h3>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50">
                            <p className="text-sm text-slate-500 m-0 mb-3 leading-relaxed">{t.description}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Key Fields</p>
                            <div className="flex flex-wrap gap-1.5">
                                {t.fields.map((f) => (
                                    <span key={f} className="bg-white border border-slate-200 text-slate-500 text-xs px-2 py-0.5 rounded">{f}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <AlertTriangle size={20} color="#1D4ED8" className="shrink-0" />
            <div>
                <p className="font-bold text-blue-900 m-0 mb-1 text-sm">Full templates available to Council Members</p>
                <p className="m-0 text-sm text-blue-600">Join the AI Risk Council to download editable versions in Excel, Word, and PDF formats.</p>
            </div>
        </div>
    </div>
);

const NAV_ITEMS = [
    { key: 'pillars', label: 'Core Pillars', component: CorePillarsSection },
    { key: 'maturity', label: 'Maturity Levels', component: MaturityLevelsSection },
    { key: 'implementation', label: 'Implementation Guide', component: ImplementationGuideSection },
    { key: 'audit', label: 'Audit Templates', component: AuditTemplatesSection },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
const Framework = () => {
    const [activeSection, setActiveSection] = useState('pillars');
    const ActiveComponent = NAV_ITEMS.find((n) => n.key === activeSection)?.component || CorePillarsSection;
    useEffect(() => { document.title = 'AI Risk Framework | ARC'; }, []);

    return (
        <>
            {/* Hero */}
            <div className="bg-white border-b border-slate-200 py-16 px-8">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-[#003366] mb-4 text-4xl font-extrabold font-serif">AI Risk Governance Framework</h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        A structured approach to identifying, measuring, and mitigating artificial intelligence risks across the enterprise lifecycle.
                    </p>
                </div>
            </div>

            {/* Body */}
            <div className="bg-slate-50 py-12 px-8 min-h-[60vh]">
                <div className="max-w-5xl mx-auto" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '3rem' }}>
                    {/* Sidebar */}
                    <div className="border-r border-slate-200 pr-8">
                        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Framework Modules</h4>
                        <ul className="list-none p-0 m-0 flex flex-col gap-1">
                            {NAV_ITEMS.map((item) => {
                                const isActive = activeSection === item.key;
                                return (
                                    <li
                                        key={item.key}
                                        onClick={() => setActiveSection(item.key)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && setActiveSection(item.key)}
                                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-all outline-none text-sm font-semibold
                                            ${isActive
                                                ? 'bg-blue-50 text-[#003366] font-bold border-l-[3px] border-[#003366]'
                                                : 'text-slate-500 border-l-[3px] border-transparent hover:bg-slate-100'
                                            }`}
                                    >
                                        {item.label}
                                        {isActive && <ChevronRight size={15} color="#003366" />}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Content */}
                    <div><ActiveComponent /></div>
                </div>
            </div>
        </>
    );
};

export default Framework;
