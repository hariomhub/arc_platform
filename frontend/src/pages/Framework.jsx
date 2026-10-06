import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ClipboardList, ChevronRight, ArrowRight, BookOpen, Download, Lock, Shield, Target, ShieldCheck, Search, BarChart, Landmark, Check, RefreshCw, Flag, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as frameworkAPI from '../api/framework';
import BotMascot from '../components/agents/BotMascot';
import { LEARNING_AGENTS, BOT_PALETTE } from '../config/agents';

// ─── Design constants ──────────────────────────────────────────────────────────
// One brand accent (navy) used everywhere; gold is reserved for the single
// "this is active/selected" signal — no per-item rainbow-coding on this page.
const ACCENT = '#003366';
const GOLD = '#f9a825';
const WRAP = '1320px';

// ─── Static Data ──────────────────────────────────────────────────────────────
// The AI Risk Bridge Model — five sequential stages, at full documented depth
// (matches the master table: what each stage translates, both persona
// questions, the shared/board-facing/implementer-facing artifact split, and
// the full reference-link list). Field names mirror the
// /framework/bridge-stages API response shape so this constant doubles as an
// offline fallback with no mapping layer needed.
const BRIDGE_STAGES = [
    {
        stage_key: 'exposure', name: 'Exposure', tagline: 'Know what exists',
        translates: 'Shadow AI discovery findings, vendor and model inventory, and data-flow maps — translated from raw technical scan results into a plain-language exposure summary a non-technical executive can act on.',
        adopter_question: "What AI is actually being used across my organization, and what's my overall exposure?",
        implementer_question: 'Do we have full technical visibility into every AI tool, model, and agent running in our environment, including shadow AI?',
        artifactsShared: ['AI Tool & Model Inventory (register)', 'Shadow AI Discovery Report', 'Data Flow / Data Movement Map', 'Third-Party & Vendor AI Risk Register'],
        artifactsAdopter: ['Exposure Summary Briefing (board-ready)'],
        artifactsImplementer: ['Technical Asset & Agent Inventory (system-level detail)'],
        referenceLinks: ['NIST AI RMF — MAP function', 'ISO/IEC 42001:2023 — Clause 4 (Context of the Organization)', 'Cloud Security Alliance AI Controls Matrix — asset inventory domain'],
        note: "Broader than a standard IT asset inventory — it also captures legitimate business-adopted AI (like marketing using a public GenAI tool with company data) that isn't a security threat per se, but still creates governance exposure. Shadow AI and vendor sprawl are the dominant failure mode: most organizations don't know what they don't know.",
    },
    {
        stage_key: 'obligation', name: 'Obligation', tagline: 'Know the rules',
        translates: "EU AI Act risk-tier classification, NIST AI RMF functions, ISO 42001 requirements, sector regulation, and contractual AI clauses — translated from legal and regulatory text into an actionable compliance checklist and risk-tier map.",
        adopter_question: "What am I legally and contractually required to do about the AI I'm using, and what's my liability exposure?",
        implementer_question: 'Which specific controls, documentation, and technical safeguards does each regulation or standard actually require us to implement?',
        artifactsShared: ['Regulatory Applicability Matrix (which laws apply to which AI use case)', 'EU AI Act Risk-Tier Classification', 'NIST AI RMF Gap Assessment', 'ISO 42001 Readiness Assessment', 'Contractual AI Clause Review', 'Compliance Obligation Tracker'],
        artifactsAdopter: ['Executive Compliance Briefing (liability & obligation summary)'],
        artifactsImplementer: ['Technical Control Implementation Checklist'],
        referenceLinks: ['Regulation (EU) 2024/1689 (EU AI Act) — Art. 6, 9, 16, 26', 'NIST AI RMF — GOVERN function', 'ISO/IEC 42001:2023 & ISO/IEC 23894:2023', 'GDPR (EU) 2016/679 — Art. 22 (automated decision-making)'],
        note: "Deliberately reaches beyond the organization's own walls by design — the rules originate at national or regional level, but discharging them is squarely an organization-level responsibility. Cross-jurisdiction conflict (EU vs. US federal vs. state-level rules) is real and growing, and needs its own reconciliation step, not just a checklist per jurisdiction.",
    },
    {
        stage_key: 'integrity', name: 'Integrity', tagline: "Verify it's trustworthy",
        translates: 'Bias and fairness audit results, hallucination and accuracy benchmarks, human-in-the-loop design, and usage-monitoring data — translated into a trust posture the business can act on: can we ship this, can we rely on this output for a real decision.',
        adopter_question: "Can I trust what this AI produces, and is it being used the way it's supposed to be used?",
        implementer_question: 'Have we tested for bias, verified outputs against ground truth, and built in the human-oversight checkpoints that prevent overtrust or misuse?',
        artifactsShared: ['Bias & Fairness Audit Report', 'Output Accuracy / Hallucination Benchmark', 'Human-Oversight Design Document', 'Usage & Override Monitoring Dashboard'],
        artifactsAdopter: ['Trust Posture Summary (decision-ready)'],
        artifactsImplementer: ['Model Testing & Validation Protocol'],
        referenceLinks: ['NIST AI RMF — MEASURE function', 'ISO/IEC TR 24027:2021 — Bias in AI systems', 'NIST Special Publication 1270 — Identifying and Managing Bias in AI', 'EU AI Act — Art. 10 (Data & Data Governance), Art. 15 (Accuracy, Robustness, Cybersecurity)'],
        note: "A stage with no clean home in a four-stage model — folding it into Defense would blur security work (adversarial attack, misuse) with fairness and quality work, which are different disciplines with different owners. Also kept distinct from Obligation: what the law requires is not the same question as whether the output is actually true, verified, and working as intended.",
    },
    {
        stage_key: 'defense', name: 'Defense', tagline: 'Protect it',
        translates: 'Red-team findings, runtime guardrail configuration, access-control architecture, and incident-response readiness — translated from a security-engineering register into risk-exposure and liability terms for the business.',
        adopter_question: "How do I know my AI systems won't be attacked, misused, or leak data — and what's my liability if they are?",
        implementer_question: 'Do we have the technical controls in place to prevent prompt injection, model theft, insider misuse, and data leakage?',
        artifactsShared: ['AI Red-Team / Penetration Test Report', 'Runtime Guardrail Configuration Review', 'Access Control & Least-Privilege Architecture Review', 'Data Leakage Prevention Assessment', 'Incident Response Plan (AI-specific)'],
        artifactsAdopter: ['Security Posture Summary (risk & liability framing)'],
        artifactsImplementer: ['Technical Control Implementation Report'],
        referenceLinks: ['OWASP Top 10 for LLM Applications (2026)', 'OWASP Top 10 for Agentic Applications (2026)', 'MITRE ATLAS — Adversarial Threat Landscape for AI Systems', 'NIST AI RMF — MANAGE function; NIST AI 600-1 (Generative AI Profile)', 'ISO/IEC 27001 — extended to AI system context'],
        note: "The AI-specific attack surface — prompt injection, model extraction, data poisoning, jailbreaks — often falls outside a traditional security team's existing playbooks and tooling. That's a genuine skills and tooling gap worth flagging, not something to assume is already covered by general cybersecurity practice.",
    },
    {
        stage_key: 'continuity', name: 'Continuity', tagline: 'Sustain it',
        translates: 'Vendor concentration analysis, model deprecation and lock-in risk, and workforce readiness data — translated into two distinct languages: board-level fiduciary/continuity framing on one side, CIO-level operational-readiness framing on the other.',
        adopter_question: 'What happens to my business if the vendor, model, or platform I depend on changes, discontinues, or is acquired?',
        implementer_question: 'Is my organization actually able to keep running this responsibly — do we have the skills, monitoring, and process in place long-term?',
        artifactsShared: [],
        artifactsAdopter: ['Vendor Concentration & Lock-In Risk Register', 'Contract Exit/Renewal Terms Review', 'Multi-Vendor Redundancy Plan', 'AI Cost Predictability Report', 'Board Continuity Risk Briefing'],
        artifactsImplementer: ['Workforce Readiness Assessment', 'Reskilling & Training Roadmap', 'Monitoring & Model-Drift Detection Runbook', 'Operational Incident Response & Escalation Plan'],
        referenceLinks: ['EU AI Act — Art. 4 (AI Literacy), in force since 2 Feb 2025', 'ISO/IEC 42001:2023 — Clause 7 (Resources & Competence)', 'ISO 22301 — Business Continuity Management', 'NIST SP 800-161 — Cybersecurity Supply Chain Risk Management'],
        note: 'Previously this bundled external vendor/market dependency risk together with internal workforce readiness into one blended deliverable. It now splits into two parallel sub-tracks with distinct owners: a board-facing continuity briefing, and a CIO-facing operational-readiness assessment — not one generic output trying to serve both audiences.',
    },
];

const STAGE_ICONS = { exposure: Search, obligation: Landmark, integrity: ShieldCheck, defense: Shield, continuity: RefreshCw };

// Four descriptive maturity stages — vocabulary, not a score. Deliberately has
// no percentage/progress field: a numeric maturity rating is not something
// this page publishes.
const MATURITY_LEVELS = [
    { level: 1, name: 'Foundational', icon: Flag, description: 'Ad-hoc risk management with no formal AI governance structure. Risks are addressed reactively and inconsistently.', characteristics: ['No dedicated AI risk policy or owner', 'Model inventory non-existent or informal', 'Risk assessments performed only after incidents', 'No third-party AI vendor due diligence'], actions: ['Appoint an AI Risk Owner or Committee', 'Begin inventorying all AI/ML systems in use', 'Draft a preliminary AI Acceptable Use Policy'] },
    { level: 2, name: 'Defined', icon: ClipboardList, description: 'Standardised definitions and baseline controls are documented. Governance exists but is not consistently applied.', characteristics: ['Formal AI governance policy documented', 'Basic model register maintained', 'Risk taxonomy defined and communicated', 'Initial bias and fairness checks performed'], actions: ['Implement a standardised model risk assessment template', 'Establish a mandatory AI procurement checklist', 'Train all AI project leads on governance policy'] },
    { level: 3, name: 'Managed', icon: BarChart, description: 'Quantitative metrics are tracked and governance controls are continuously monitored across the AI lifecycle.', characteristics: ['KRIs and KPIs tracked for all material AI systems', 'Continuous model drift and bias monitoring active', 'Third-party AI audit completed annually', 'Incident response playbook tested and operational'], actions: ['Integrate AI risk metrics into ERM dashboard', 'Conduct annual red-team exercise on critical AI systems', 'Deploy automated model monitoring tooling'] },
    { level: 4, name: 'Optimized', icon: TrendingUp, description: 'Adaptive governance with real-time feedback loops. AI risk management is embedded across the entire organisation.', characteristics: ['Real-time AI risk dashboard available to board', 'Fully automated model validation pipeline', 'AI governance integrated with enterprise ESG reporting', 'Continuous regulatory horizon scanning in place'], actions: ['Publish annual AI Transparency Report', 'Contribute to industry standards and working groups', 'Evolve governance to address agentic and generative AI'] },
];

const IMPLEMENTATION_GUIDE = [
    { phase: 'Phase 1', title: 'Governance Foundation', duration: '0–3 months', steps: [{ step: '1.1', title: 'Establish an AI Risk Committee', desc: 'Form a cross-functional committee including Legal, Compliance, IT, and Business unit heads. Define charter, cadence, and escalation paths.' }, { step: '1.2', title: 'Appoint an AI Risk Owner', desc: 'Designate a senior individual (CISO, Chief Risk Officer, or equivalent) as accountable owner for the AI Risk Framework.' }, { step: '1.3', title: 'Draft the AI Acceptable Use Policy', desc: 'Document approved AI use cases, prohibited applications, data handling requirements, and employee obligations.' }, { step: '1.4', title: 'Build the AI System Inventory', desc: 'Catalogue all AI/ML systems in production, development, and evaluation. Include vendor-provided and embedded AI features.' }] },
    { phase: 'Phase 2', title: 'Risk Assessment', duration: '3–6 months', steps: [{ step: '2.1', title: 'Apply the AI Risk Classification Matrix', desc: 'Classify each system by impact (high/medium/low) and risk domain (bias, security, operational, reputational). Align to EU AI Act risk tiers where applicable.' }, { step: '2.2', title: 'Conduct Model Risk Assessments', desc: 'For each material AI system, complete a structured MRA covering model purpose, training data quality, validation approach, and residual risk.' }, { step: '2.3', title: 'Perform Vendor AI Due Diligence', desc: 'Assess third-party AI tools against the ARC Vendor Assessment Template covering transparency, security, bias controls, and contractual safeguards.' }, { step: '2.4', title: 'Map Regulatory Obligations', desc: 'Identify applicable AI regulations (EU AI Act, NIST AI RMF, ISO 42001, sector-specific rules) and map them to internal controls.' }] },
    { phase: 'Phase 3', title: 'Controls & Monitoring', duration: '6–12 months', steps: [{ step: '3.1', title: 'Implement Technical Controls', desc: 'Deploy model explainability tools, drift detection, differential privacy where required, and adversarial robustness testing.' }, { step: '3.2', title: 'Establish Continuous Monitoring', desc: 'Define KRIs, KPIs, and alert thresholds for all high-risk AI systems. Integrate with existing SIEM and risk dashboards.' }, { step: '3.3', title: 'Build an AI Incident Response Plan', desc: 'Define roles, escalation paths, communication protocols, and remediation playbooks for AI-specific incidents including bias events and model failures.' }] },
    { phase: 'Phase 4', title: 'Audit & Optimisation', duration: 'Ongoing', steps: [{ step: '4.1', title: 'Conduct Annual AI Governance Audit', desc: 'Assess adherence to the framework, control effectiveness, and regulatory changes. Produce a formal audit report for the Board.' }, { step: '4.2', title: 'Publish an AI Transparency Report', desc: 'Disclose material AI use cases, governance posture, and risk mitigations to stakeholders. Align to emerging disclosure standards.' }, { step: '4.3', title: 'Iterate the Framework', desc: 'Update the framework annually to reflect new AI capabilities (agents, multimodal models), regulatory developments, and lessons learned.' }] },
];

const PHASE_ICONS = [Landmark, Search, Shield, BarChart];
const getPhaseIcon = (phaseStr, fallbackIdx = 0) => {
    const s = String(phaseStr || '').toLowerCase();
    if (s.includes('1')) return Landmark;
    if (s.includes('2')) return Search;
    if (s.includes('3')) return Shield;
    if (s.includes('4')) return BarChart;
    return PHASE_ICONS[fallbackIdx] || Landmark;
};

const AUDIT_TEMPLATES = [
    { id: 'T-01', title: 'AI System Intake & Classification Form', category: 'Governance', format: 'Excel / PDF', description: 'Used at the point of procuring or deploying any new AI system. Captures system purpose, owner, data inputs, intended user base, and initial risk classification.', fields: ['System Name & Owner', 'Business Use Case', 'Data Sources & Sensitivity', 'Regulatory Applicability', 'Initial Risk Tier (High / Medium / Low)', 'Approval Signatures'] },
    { id: 'T-02', title: 'Model Risk Assessment (MRA) Template', category: 'Risk Assessment', format: 'Word / Notion', description: 'A structured 6-section assessment covering model purpose, design, validation, deployment controls, monitoring, and residual risk — aligned to SR 26-2 and NIST AI RMF.', fields: ['Model Purpose & Scope', 'Training Data Lineage', 'Validation Methodology & Results', 'Known Limitations & Risks', 'Monitoring Controls', 'Residual Risk Rating & Sign-off'] },
    { id: 'T-03', title: 'AI Vendor Due Diligence Questionnaire', category: 'Third-Party Risk', format: 'Excel', description: 'A 40-question structured questionnaire for assessing external AI vendors and SaaS providers embedding AI. Covers transparency, data handling, bias controls, security, and contractual protections.', fields: ['Company & Product Overview', 'Data Privacy & Processing', 'Model Transparency & Explainability', 'Bias & Fairness Controls', 'Security Certifications (SOC 2, ISO 27001)', 'Contractual AI Obligations'] },
    { id: 'T-04', title: 'EU AI Act Compliance Checklist', category: 'Regulatory', format: 'PDF / Excel', description: 'A clause-mapped checklist for organisations subject to the EU AI Act. Covers high-risk system obligations, GPAI model requirements, and transparency rules with compliance status tracking.', fields: ['System Classification', 'Mandatory Documentation Requirements', 'Conformity Assessment Status', 'GPAI Obligations (if applicable)', 'Post-Market Monitoring Plan', 'Regulatory Submission Tracker'] },
    { id: 'T-05', title: 'AI Incident Report Template', category: 'Incident Response', format: 'Word / Jira', description: 'Standardised incident report for logging and investigating AI-related failures including bias events, adversarial attacks, data breaches, and model malfunctions.', fields: ['Incident Summary & Timeline', 'Systems & Data Affected', 'Root Cause Analysis', 'Regulatory Notification Required?', 'Remediation Actions & Owner', 'Lessons Learned & Framework Updates'] },
    { id: 'T-06', title: 'Annual AI Governance Audit Report', category: 'Audit', format: 'Word / PowerPoint', description: 'A board-ready annual audit report template assessing the overall health of the AI governance framework, control effectiveness, and compliance status.', fields: ['Scope & Methodology', 'AI System Portfolio Review', 'Control Effectiveness Ratings', 'Regulatory Compliance Status', 'Key Findings & Risk Ratings', 'Management Action Plan'] },
];

const SECURITY_TOOLS = [
    { name: 'Microsoft Purview', company: 'Microsoft', logoSlug: 'microsoft', category: 'Data Governance & Compliance', description: 'Unified data governance platform for managing and governing on-premises, multi-cloud, and SaaS data. Provides data discovery, classification, lineage tracking, and compliance management.', capabilities: ['Data classification & labeling', 'Information protection policies', 'Data loss prevention (DLP)', 'Compliance Manager with regulatory templates', 'Insider risk management'], frameworkAlignment: 'Essential for EU AI Act Article 10 (Data Governance) and GDPR compliance in AI training data pipelines.' },
    { name: 'Microsoft Defender for Endpoint', company: 'Microsoft', logoSlug: 'microsoft', category: 'Endpoint Detection & Response', description: 'Enterprise endpoint security platform using behavioral sensors, cloud analytics, and threat intelligence for real-time protection of AI/ML workstations and inference endpoints.', capabilities: ['Automated investigation & response', 'Attack surface reduction rules', 'Endpoint detection and response (EDR)', 'Threat & vulnerability management', 'Microsoft Threat Experts integration'], frameworkAlignment: 'Maps to NIST AI RMF GOVERN 1.5 (Infrastructure Security) and ISO 27001 Annex A controls.' },
    { name: 'Microsoft Sentinel', company: 'Microsoft', logoSlug: 'microsoft', category: 'SIEM / SOAR', description: 'Cloud-native SIEM and SOAR solution providing AI-driven threat detection, intelligent security analytics, and automated response playbooks across the enterprise.', capabilities: ['AI-driven anomaly detection', 'Automated incident response playbooks', 'Cross-platform log ingestion', 'UEBA (User & Entity Behavior Analytics)', 'Threat intelligence fusion'], frameworkAlignment: 'Supports NIST AI RMF DETECT function and continuous monitoring requirements in ISO 42001.' },
    { name: 'CrowdStrike Falcon', company: 'CrowdStrike', logoSlug: null, category: 'EDR & Threat Intelligence', description: 'Cloud-native endpoint protection combining next-gen antivirus, EDR, threat intelligence, and managed threat hunting. Uses AI-powered indicators of attack (IOAs) for real-time breach prevention.', capabilities: ['AI-powered threat prevention', 'Managed threat hunting (Falcon OverWatch)', 'Cloud workload protection', 'Identity threat detection', 'Adversary intelligence feeds'], frameworkAlignment: 'Critical for securing AI training infrastructure. Aligns with NIST CSF Detect and Respond functions.' },
    { name: 'Palo Alto Prisma Cloud', company: 'Palo Alto Networks', logoSlug: 'paloaltonetworks', category: 'Cloud Security (CNAPP)', description: 'Comprehensive cloud-native application protection platform securing hosts, containers, serverless functions, and multi-cloud infrastructure where AI workloads are deployed.', capabilities: ['Cloud Security Posture Management (CSPM)', 'Cloud Workload Protection (CWP)', 'Container and Kubernetes security', 'Infrastructure as Code (IaC) scanning', 'API security and web app firewall'], frameworkAlignment: 'Essential for securing cloud-based AI/ML pipelines. Maps to ISO 27017 cloud security controls.' },
    { name: 'Splunk Enterprise Security', company: 'Cisco / Splunk', logoSlug: 'splunk', category: 'SIEM & Security Analytics', description: 'Premium SIEM providing security analytics, threat detection, and incident response. Ingests machine data from virtually any source to surface real-time insights into AI model behavior and infrastructure security.', capabilities: ['Real-time correlation and alerting', 'Risk-based alerting (RBA)', 'MITRE ATT&CK framework mapping', 'Custom dashboards and reporting', 'Machine learning anomaly detection'], frameworkAlignment: 'Supports continuous monitoring per NIST AI RMF and audit trail requirements for EU AI Act compliance.' },
    { name: 'IBM Guardium', company: 'IBM', logoSlug: 'ibm', category: 'Data Security & Privacy', description: 'Comprehensive data security platform providing activity monitoring, automated compliance workflows, vulnerability assessment, and encryption for AI training data across databases and cloud environments.', capabilities: ['Real-time data activity monitoring', 'Automated compliance reporting', 'Data encryption and key management', 'Vulnerability assessment', 'Dynamic data masking'], frameworkAlignment: 'Directly supports GDPR Article 32 (Security of Processing) and NIST AI RMF data protection requirements.' },
    { name: 'Qualys VMDR', company: 'Qualys', logoSlug: 'qualys', category: 'Vulnerability Management', description: 'Cloud-based VMDR providing global visibility into IT assets, automated vulnerability detection, threat prioritization using real-time intelligence, and integrated patch management for secure AI deployment infrastructure.', capabilities: ['Continuous asset discovery', 'Risk-based vulnerability prioritization', 'Integrated patch management', 'CIS benchmark compliance scanning', 'Real-time threat intelligence correlation'], frameworkAlignment: 'Addresses NIST AI RMF infrastructure hardening requirements and ISO 27001 vulnerability management controls.' },
];

// ─── Shared building blocks ─────────────────────────────────────────────────────

// Fades/slides an element in the moment it scrolls into view — the
// "content arrives as you scroll" effect, done with no extra dependency.
const useInView = () => {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
        }, { threshold: 0.12 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return [ref, inView];
};

const Reveal = ({ children, style }) => {
    const [ref, inView] = useInView();
    return <div ref={ref} className={`reveal${inView ? ' reveal-visible' : ''}`} style={style}>{children}</div>;
};

const SectionHeader = ({ title, subtitle, center = false }) => (
    <Reveal>
        <div style={{ marginBottom: '2.25rem', textAlign: center ? 'center' : 'left', maxWidth: center ? '780px' : 'none', marginLeft: center ? 'auto' : 0, marginRight: center ? 'auto' : 0 }}>
            <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: '800', color: '#0F172A', marginBottom: '10px', fontFamily: 'var(--font-serif,Georgia,serif)' }}>{title}</h2>
            <p style={{ color: '#64748B', fontSize: 'clamp(0.92rem,1.4vw,1.05rem)', lineHeight: '1.7' }}>{subtitle}</p>
        </div>
    </Reveal>
);

const IconTile = ({ icon: Icon, size = 44 }) => (
    <div style={{ width: size, height: size, borderRadius: '13px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={Math.round(size * 0.45)} color="white" />
    </div>
);

// Real vendor mark when we have one (via the Simple Icons CDN), falling back
// to an initial badge for brands not in that set (e.g. CrowdStrike) or if the
// image fails to load — so a broken image never shows.
const BrandTile = ({ slug, name, size = 44 }) => {
    const [failed, setFailed] = useState(!slug);
    return (
        <div style={{ width: size, height: size, borderRadius: '13px', background: 'white', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: failed ? 0 : '9px' }}>
            {!failed ? (
                <img src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`} alt={`${name} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setFailed(true)} />
            ) : (
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: ACCENT }}>{name.charAt(0)}</span>
            )}
        </div>
    );
};

// The Bridge Model's own navigation — a literal milestone track instead of a
// plain tab row, since this is the one section named after a journey. The
// gold fill shows how far along the five stages the reader currently is;
// each node doubles as the click target and previews its tagline, so the
// whole shape of the model is visible before a single stage is opened.
//
// The literal bridge — a single suspension cable arcing between the first
// and last stage (they act as the anchor towers), with a vertical hanger
// dropping from the arc to every stage in between. That's the real
// suspension-bridge silhouette, rendered as low-opacity line-art behind the
// deck, plus a soft glow that continuously traces the arc's own curve (not
// just a straight line) so the motion actually reads as "crossing a bridge."
const BridgeMilestones = ({ stages, activeKey, onSelect }) => {
    const n = stages.length || 1;
    const activeIdx = Math.max(0, stages.findIndex(s => s.stage_key === activeKey));
    const fillPct = n > 1 ? (activeIdx / (n - 1)) * 100 : 0;
    const inset = 100 / (2 * n);
    const nodeX = (idx) => inset * 2 * idx + inset;

    const x0 = nodeX(0), x1 = nodeX(n - 1), xm = (x0 + x1) / 2;
    const yTop = 4, yDeck = 27, ySag = 24;
    const curveY = (x) => {
        const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
        return (1 - t) ** 2 * yTop + 2 * (1 - t) * t * ySag + t ** 2 * yTop;
    };
    const arcD = `M ${x0} ${yTop} Q ${xm} ${ySag} ${x1} ${yTop}`;

    return (
        <div className="bridge-milestones">
            <div className="bridge-visual">
                <svg className="bridge-bg-svg" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
                    <path d={arcD} className="bridge-bg-arc" fill="none" />
                    {stages.slice(1, -1).map((s, i) => {
                        const idx = i + 1;
                        const x = nodeX(idx);
                        return <line key={s.stage_key} x1={x} y1={curveY(x)} x2={x} y2={yDeck} className="bridge-bg-hanger" />;
                    })}
                    <line x1={x0} y1={yTop} x2={x0} y2={yDeck} className="bridge-bg-tower" />
                    <line x1={x1} y1={yTop} x2={x1} y2={yDeck} className="bridge-bg-tower" />
                </svg>
                <div className="bridge-track" style={{ marginLeft: `${inset}%`, marginRight: `${inset}%` }}>
                    <div className="bridge-track-fill" style={{ width: `${fillPct}%` }} />
                    <span className="bridge-flow-glow" />
                </div>
                <div className="bridge-circles">
                    {stages.map((s, idx) => {
                        const Icon = STAGE_ICONS[s.stage_key] || Target;
                        const state = idx < activeIdx ? 'passed' : idx === activeIdx ? 'active' : 'upcoming';
                        return (
                            <button key={s.stage_key} className={`bridge-node bridge-node-${state}`} onClick={() => onSelect(s.stage_key)} aria-label={s.name}>
                                <span className="bridge-node-circle"><Icon size={17} /></span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="bridge-labels">
                {stages.map((s, idx) => {
                    const state = idx < activeIdx ? 'passed' : idx === activeIdx ? 'active' : 'upcoming';
                    return (
                        <button key={s.stage_key} className={`bridge-label bridge-label-${state}`} onClick={() => onSelect(s.stage_key)}>
                            <span className="bridge-label-index">{String(idx + 1).padStart(2, '0')}</span>
                            <span className="bridge-label-name">{s.name}</span>
                            <span className="bridge-label-tagline">{s.tagline}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Maturity Levels' own navigation — one row of self-contained pills, each
// carrying its own icon, level number and name. Deliberately a single flat
// element per level (no separate track+label rows to keep aligned) so there
// is nothing that can drift out of sync with itself; "passed" levels stay
// filled navy, the current level is picked out in gold.
const MaturityStepper = ({ levels, activeLevel, onSelect }) => {
    const activeIdx = Math.max(0, levels.findIndex(m => m.level === activeLevel));
    return (
        <div className="maturity-pills">
            {levels.map((m, idx) => {
                const Icon = getMaturityIcon(m);
                const state = idx < activeIdx ? 'passed' : m.level === activeLevel ? 'active' : 'upcoming';
                return (
                    <button key={m.level} className={`maturity-pill maturity-pill-${state}`} onClick={() => onSelect(m.level)}>
                        <span className="maturity-pill-icon"><Icon size={15} /></span>
                        <span className="maturity-pill-text">
                            <span className="maturity-pill-level">Level {m.level}</span>
                            <span className="maturity-pill-name">{m.name}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

// Implementation Guide's own navigation — a dashed project-roadmap timeline
// with diamond milestones, distinct from the Bridge's solid suspension cable
// and circular stops, since a phased rollout with durations reads more like
// a schedule than a journey.
const ImplementationTimeline = ({ phases, activeKey, onSelect, getKey }) => (
    <div className="impl-timeline">
        <div className="impl-timeline-track" />
        <div className="impl-timeline-row">
            {phases.map((p, idx) => {
                const key = getKey(p, idx);
                const isActive = key === activeKey;
                const Icon = getPhaseIcon(p.phase || p.phase_label, idx);
                return (
                    <button key={key} className={`impl-station${isActive ? ' impl-station-active' : ''}`} onClick={() => onSelect(key)}>
                        <span className="impl-station-duration">{p.duration}</span>
                        <span className="impl-station-marker"><Icon size={15} /></span>
                        <span className="impl-station-title">{p.title}</span>
                    </button>
                );
            })}
        </div>
    </div>
);

const ModuleCard = ({ icon, iconSlot, index, title, subtitle, description, isOpen, onToggle, children }) => (
    <div className={`mod-card${isOpen ? ' mod-card-open' : ''}`} onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}>
        <div className="mod-card-head">
            {iconSlot || <IconTile icon={icon} />}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {index != null && <span className="mod-card-index">{String(index).padStart(2, '0')}</span>}
                    <h3 className="mod-card-title">{title}</h3>
                </div>
                {subtitle && <p className="mod-card-subtitle">{subtitle}</p>}
            </div>
            <ChevronRight size={16} className="mod-card-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }} />
        </div>
        {!isOpen && <p className="mod-card-desc">{description}</p>}
        {!isOpen && <span className="mod-card-link">Learn more <ArrowRight size={13} /></span>}
        {isOpen && <div className="mod-card-detail" onClick={(e) => e.stopPropagation()}>{children}</div>}
    </div>
);

// ─── Section components ───────────────────────────────────────────────────────

const BridgeStagesSection = ({ stages = BRIDGE_STAGES }) => {
    const list = stages && stages.length ? stages : BRIDGE_STAGES;
    const [activeKey, setActiveKey] = useState(list[0]?.stage_key);
    const activeIdx = Math.max(0, list.findIndex(s => s.stage_key === activeKey));
    const stage = list[activeIdx] || list[0];
    const Icon = STAGE_ICONS[stage.stage_key] || Target;
    const adopterArtifacts = stage.artifactsAdopter || [];
    const implementerArtifacts = stage.artifactsImplementer || [];
    const sharedArtifacts = stage.artifactsShared || [];

    return (
        <div>
            <SectionHeader center title="The AI Risk Bridge Model" subtitle="A five-stage lifecycle for identifying, measuring, and governing AI risk. Each stage answers a different question for the board and for the people implementing it — Exposure → Obligation → Integrity → Defense → Continuity." />
            <BridgeMilestones stages={list} activeKey={stage.stage_key} onSelect={setActiveKey} />

            <Reveal key={stage.stage_key}>
                <div className="stage-detail">
                    <div className="stage-detail-head">
                        <IconTile icon={Icon} size={56} />
                        <div>
                            <p className="stage-detail-eyebrow">Stage {activeIdx + 1} of {list.length} · {stage.tagline}</p>
                            <h3 className="stage-detail-title">{stage.name}</h3>
                        </div>
                    </div>
                    <p className="stage-detail-lead">{stage.translates}</p>

                    <div className="persona-split">
                        <div className="persona-side">
                            <div className="persona-byline">
                                <span className="persona-avatar persona-avatar-board"><Landmark size={15} /></span>
                                <p className="persona-role">Board / Adopter</p>
                            </div>
                            <p className="persona-quote">{stage.adopter_question || stage.adopterQuestion}</p>
                            {adopterArtifacts.length > 0 && (
                                <>
                                    <p className="mod-detail-label" style={{ marginTop: '1.1rem' }}>Adopter-Facing Artifact</p>
                                    {adopterArtifacts.map(a => <div key={a} className="mod-detail-row"><CheckCircle size={13} color={ACCENT} style={{ flexShrink: 0, marginTop: '2px' }} /><span>{a}</span></div>)}
                                </>
                            )}
                        </div>
                        <div className="persona-connector" aria-hidden="true">
                            <span className="persona-connector-line" />
                            <span className="persona-connector-dot" />
                            <span className="persona-connector-line" />
                        </div>
                        <div className="persona-side persona-side-implementer">
                            <div className="persona-byline">
                                <span className="persona-avatar persona-avatar-implementer"><Target size={15} /></span>
                                <p className="persona-role">CIO / Implementer</p>
                            </div>
                            <p className="persona-quote">{stage.implementer_question || stage.implementerQuestion}</p>
                            {implementerArtifacts.length > 0 && (
                                <>
                                    <p className="mod-detail-label" style={{ marginTop: '1.1rem' }}>Implementer-Facing Artifact</p>
                                    {implementerArtifacts.map(a => <div key={a} className="mod-detail-row"><CheckCircle size={13} color={ACCENT} style={{ flexShrink: 0, marginTop: '2px' }} /><span>{a}</span></div>)}
                                </>
                            )}
                        </div>
                    </div>

                    {sharedArtifacts.length > 0 && (
                        <div className="shared-block">
                            <p className="mod-detail-label">Shared Artifacts</p>
                            <div className="shared-grid">
                                {sharedArtifacts.map(a => <div key={a} className="mod-detail-row"><CheckCircle size={13} color={ACCENT} style={{ flexShrink: 0, marginTop: '2px' }} /><span>{a}</span></div>)}
                            </div>
                        </div>
                    )}

                    {stage.note && (
                        <div className="note-callout">
                            <p className="note-callout-label">Why this stage is distinct</p>
                            <p className="note-callout-text">{stage.note}</p>
                        </div>
                    )}

                    <div>
                        <p className="mod-detail-label">Grounded In</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(stage.referenceLinks || stage.reference_links || []).map(r => <span key={r} className="mod-chip">{r}</span>)}
                        </div>
                    </div>
                </div>
            </Reveal>
        </div>
    );
};

const getMaturityIcon = (m) => m.icon || [Flag, ClipboardList, BarChart, TrendingUp][(m.level || 1) - 1] || Flag;

const MaturityLevelsSection = ({ maturityLevels = MATURITY_LEVELS }) => {
    const list = maturityLevels && maturityLevels.length ? maturityLevels : MATURITY_LEVELS;
    const [activeLevel, setActiveLevel] = useState(list[0]?.level);
    const active = list.find(m => m.level === activeLevel) || list[0];
    const Icon = getMaturityIcon(active);

    return (
        <div>
            <SectionHeader center title="AI Governance Maturity" subtitle="Four descriptive stages organisations typically move through as AI risk governance matures — a shared vocabulary for where you are today, not a score." />
            <MaturityStepper levels={list} activeLevel={activeLevel} onSelect={setActiveLevel} />

            <Reveal key={active.level}>
                <div className="stage-detail">
                    {/* Header, description and comparison all share one
                        centred column — the whole card reads as a single
                        aligned block instead of a left-hugging header sat
                        above a separately-centred comparison. */}
                    <div className="maturity-detail-inner">
                        <div className="stage-detail-head">
                            <IconTile icon={Icon} size={56} />
                            <div>
                                <p className="stage-detail-eyebrow">Level {active.level} of {list.length}</p>
                                <h3 className="stage-detail-title">{active.name}</h3>
                            </div>
                        </div>
                        <p className="stage-detail-lead" style={{ maxWidth: 'none' }}>{active.description}</p>
                        <div className="maturity-compare">
                            <div>
                                <p className="maturity-compare-label">Characteristics</p>
                                {(active.characteristics || []).map((c, i) => <div key={i} className="mod-detail-row"><span className="mod-dot" />{c}</div>)}
                            </div>
                            <div className="maturity-compare-connector" aria-hidden="true">
                                <span className="maturity-compare-line" />
                                <span className="maturity-compare-arrow"><ArrowRight size={14} /></span>
                                <span className="maturity-compare-line" />
                            </div>
                            <div>
                                <p className="maturity-compare-label" style={{ color: '#16A34A' }}>Next Actions</p>
                                {(active.actions || []).map((a, i) => <div key={i} className="mod-detail-row"><CheckCircle size={13} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />{a}</div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </Reveal>
        </div>
    );
};

const ImplementationGuideSection = ({ implementationGuide = IMPLEMENTATION_GUIDE }) => {
    const guide = implementationGuide && implementationGuide.length ? implementationGuide : IMPLEMENTATION_GUIDE;
    const [activeKey, setActiveKey] = useState(guide[0]?.phase || guide[0]?.phase_label);
    const [checked, setChecked] = useState({});
    const activeIdx = Math.max(0, guide.findIndex(p => (p.phase || p.phase_label) === activeKey));
    const active = guide[activeIdx] || guide[0];
    const toggleStep = (key, e) => { e.stopPropagation(); setChecked(p => ({ ...p, [key]: !p[key] })); };
    const totalDone = Object.values(checked).filter(Boolean).length;
    const totalAll = guide.reduce((a, p) => a + (p.steps?.length || 0), 0);

    return (
        <div>
            <SectionHeader center title="Implementation Guide" subtitle={`A phased roadmap for embedding AI risk governance across your organisation. ${totalDone}/${totalAll} steps checked off.`} />
            <ImplementationTimeline phases={guide} activeKey={activeKey} getKey={(p) => p.phase || p.phase_label} onSelect={setActiveKey} />

            <Reveal key={activeKey}>
                <div className="stage-detail">
                    <div className="stage-detail-head">
                        <IconTile icon={getPhaseIcon(active.phase || active.phase_label, activeIdx)} size={56} />
                        <div>
                            <p className="stage-detail-eyebrow">{active.phase || active.phase_label} · {active.duration}</p>
                            <h3 className="stage-detail-title">{active.title}</h3>
                        </div>
                    </div>
                    <div className="step-grid">
                        {(active.steps || []).map(s => {
                            const done = checked[s.step];
                            return (
                                <div key={s.step} className={`step-card${done ? ' step-card-done' : ''}`} onClick={e => toggleStep(s.step, e)}>
                                    <div className="step-card-head">
                                        <span className="step-num">{s.step}</span>
                                        <div className={`step-check${done ? ' step-check-done' : ''}`}>
                                            {done && <Check size={12} color="white" />}
                                        </div>
                                    </div>
                                    <p className="step-title" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? '#94A3B8' : '#1E293B' }}>{s.title}</p>
                                    <p className="step-desc">{s.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Reveal>
        </div>
    );
};

const AuditTemplatesSection = ({ auditTemplates = AUDIT_TEMPLATES }) => {
    const list = auditTemplates && auditTemplates.length ? auditTemplates : AUDIT_TEMPLATES;
    const [filter, setFilter] = useState('All');
    const [openId, setOpenId] = useState(null);
    const categories = ['All', ...Array.from(new Set(list.map(t => t.category)))];
    const filtered = filter === 'All' ? list : list.filter(t => t.category === filter);

    return (
        <div>
            <SectionHeader center title="Audit Templates" subtitle="Production-ready templates for AI governance, risk assessment, regulatory compliance, and audit reporting." />
            <div className="filter-pills">
                {categories.map(cat => (
                    <button key={cat} className={filter === cat ? 'filter-pill active' : 'filter-pill'} onClick={() => { setFilter(cat); setOpenId(null); }}>{cat}</button>
                ))}
            </div>
            <Reveal>
                <div className="mod-grid">
                    {filtered.map(t => {
                        const isOpen = openId === t.id;
                        return (
                            <ModuleCard key={t.id} icon={ClipboardList} index={null} title={t.title} subtitle={`${t.id} · ${t.format}`} description={t.description} isOpen={isOpen} onToggle={() => setOpenId(isOpen ? null : t.id)}>
                                <p className="mod-detail-label">Key Fields</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {(t.fields || []).map(f => <span key={f} className="mod-chip">{f}</span>)}
                                </div>
                            </ModuleCard>
                        );
                    })}
                </div>
            </Reveal>
            <div className="cta-banner">
                <Lock size={18} color="#93C5FD" />
                <div style={{ flex: 1, minWidth: '160px' }}>
                    <p className="cta-banner-title">Full templates available to Chapter Leads</p>
                    <p className="cta-banner-sub">Join the Risk AI Council to download editable versions in Excel, Word, and PDF formats.</p>
                </div>
                <Link to="/membership" className="cta-banner-btn">Join the Council</Link>
            </div>
        </div>
    );
};

const SecurityToolsSection = () => {
    const [openIdx, setOpenIdx] = useState(null);
    return (
        <div>
            <SectionHeader center title="Security Tools & Solutions" subtitle="Enterprise-grade security tools organisations can leverage alongside our governance playbooks." />
            <Reveal>
                <div className="mod-grid">
                    {SECURITY_TOOLS.map((tool, idx) => {
                        const isOpen = openIdx === idx;
                        return (
                            <ModuleCard key={tool.name} iconSlot={<BrandTile slug={tool.logoSlug} name={tool.company} />} index={null} title={tool.name} subtitle={`${tool.company} · ${tool.category}`} description={tool.description} isOpen={isOpen} onToggle={() => setOpenIdx(isOpen ? null : idx)}>
                                <p className="mod-detail-label">Key Capabilities</p>
                                {tool.capabilities.map((c, i) => <div key={i} className="mod-detail-row"><CheckCircle size={13} color={ACCENT} style={{ flexShrink: 0, marginTop: '2px' }} />{c}</div>)}
                                <p className="mod-detail-label" style={{ color: '#16A34A', marginTop: '14px' }}>Framework Alignment</p>
                                <div className="alignment-box">{tool.frameworkAlignment}</div>
                            </ModuleCard>
                        );
                    })}
                </div>
            </Reveal>
        </div>
    );
};

const PlaybooksSection = () => {
    const { token, isLoggedIn, canDownloadFramework } = useAuth();
    const [playbooks, setPlaybooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/playbooks').then(r => r.json()).then(data => { setPlaybooks(data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleDownload = async (pb) => {
        if (!isLoggedIn) { alert('Please sign in to download playbooks.'); return; }
        if (!canDownloadFramework?.()) { alert('Framework playbook downloads are available for Chapter Lead and Founding Member plans.'); return; }
        try {
            const res = await fetch(`/api/playbooks/${pb.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = pb.file_name || `${pb.title}.${pb.file_type}`; a.click();
            URL.revokeObjectURL(url);
        } catch { alert('Download failed. Please try again.'); }
    };

    const CATEGORY_ICONS = { Guide: '📖', Checklist: '✅', Template: '📋', Policy: '📜' };
    const grouped = playbooks.reduce((acc, pb) => { const fw = pb.framework || 'General'; if (!acc[fw]) acc[fw] = []; acc[fw].push(pb); return acc; }, {});

    return (
        <div>
            <SectionHeader center title="Governance Playbooks" subtitle="Download comprehensive governance playbooks aligned with major AI risk frameworks." />
            {isLoggedIn && !canDownloadFramework?.() && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', padding: '7px 12px' }}><Lock size={12} color="#DC2626" /><span style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: '600' }}>Framework downloads require a Chapter Lead or Founding Member plan. <a href="/membership" style={{ color: '#DC2626', textDecoration: 'underline' }}>Upgrade →</a></span></div>}
            {!isLoggedIn && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '7px', padding: '7px 12px' }}><Lock size={12} color="#D97706" /><span style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: '600' }}>Sign in to download — available for Chapter Lead &amp; Founding Member plans.</span></div>}

            {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}><BookOpen size={32} style={{ marginBottom: '8px', opacity: 0.4 }} /><p style={{ margin: 0, fontSize: '0.875rem' }}>Loading playbooks...</p></div>}
            {!loading && Object.entries(grouped).map(([framework, items]) => (
                <Reveal key={framework} style={{ marginBottom: '1.75rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span className="mod-chip" style={{ fontWeight: '700' }}>{framework}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{items.length} playbook{items.length > 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {items.map(pb => (
                                <div key={pb.id} className="playbook-row">
                                    <div style={{ flex: 1, minWidth: '160px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '1rem' }}>{CATEGORY_ICONS[pb.category] || '📄'}</span>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1E293B' }}>{pb.title}</h4>
                                            <span className="mod-chip">{pb.category}</span>
                                            <span className="mod-chip" style={{ textTransform: 'uppercase' }}>{pb.file_type}</span>
                                        </div>
                                        {pb.brief && <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', lineHeight: '1.55' }}>{pb.brief}</p>}
                                    </div>
                                    <button onClick={() => handleDownload(pb)} className="playbook-download-btn" style={{ background: canDownloadFramework?.() ? ACCENT : '#94A3B8' }}>
                                        {canDownloadFramework?.() ? <><Download size={13} />Download</> : isLoggedIn ? <><Lock size={13} />Council Only</> : <><Lock size={13} />Sign In</>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Reveal>
            ))}
            {!loading && playbooks.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}><BookOpen size={36} color="#CBD5E1" style={{ marginBottom: '10px' }} /><p style={{ color: '#94A3B8', margin: 0, fontSize: '0.875rem' }}>No playbooks available yet. Check back soon!</p></div>}
        </div>
    );
};

// ─── Learning Agents launcher ───────────────────────────────────────────────────
// Agent data and the bot artwork are shared with the "coming soon" page each
// agent link opens — see config/agents.js and components/agents/BotMascot.jsx.

// Shows all five agent bots inline, no shared card/background — each stands
// directly on the hero; the name brightening on hover is the click cue.
const LearningAgentsLauncher = () => (
    <div className="agents-bar">
        <div className="agents-bar-head">
            <div className="agents-bar-title-row">
                <span className="agents-bar-title">AI Learning Agents</span>
                <span className="agents-bar-new">NEW</span>
            </div>
            <span className="agents-bar-sub">{LEARNING_AGENTS.length} frameworks · Quiz-based learning for each</span>
        </div>
        <div className="agents-bar-row">
            {LEARNING_AGENTS.map((a, i) => (
                <Link key={a.key} to={a.path} className="agents-bar-item" style={{ animationDelay: `${i * 90}ms` }}>
                    <BotMascot size={78} accent={BOT_PALETTE[i % BOT_PALETTE.length]} className="agent-card-icon" />
                    <span className="agents-bar-name">{a.name.replace(/ Agent$/, '')}</span>
                </Link>
            ))}
        </div>
    </div>
);

const NAV_ITEMS = [
    { key: 'bridge', label: 'AI Risk Bridge Model', component: BridgeStagesSection },
    { key: 'maturity', label: 'Maturity Levels', component: MaturityLevelsSection },
    { key: 'implementation', label: 'Implementation Guide', component: ImplementationGuideSection },
    { key: 'audit', label: 'Audit Templates', component: AuditTemplatesSection },
    { key: 'tools', label: 'Security Tools', component: SecurityToolsSection },
    { key: 'playbooks', label: 'Governance Playbooks', component: PlaybooksSection },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const Framework = () => {
    const [activeSection, setActiveSection] = useState('bridge');
    const [animKey, setAnimKey] = useState(0);
    const [bridgeStages, setBridgeStages] = useState([]);
    const [maturityLevels, setMaturityLevels] = useState([]);
    const [implementationGuide, setImplementationGuide] = useState([]);
    const [auditTemplates, setAuditTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    const activeIdx = NAV_ITEMS.findIndex(n => n.key === activeSection);
    const ActiveComponent = NAV_ITEMS[activeIdx]?.component || BridgeStagesSection;

    const handleNav = (key) => { setActiveSection(key); setAnimKey(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [stagesRes, maturityRes, guideRes, templatesRes] = await Promise.all([
                    frameworkAPI.getFrameworkBridgeStages(), frameworkAPI.getFrameworkMaturityLevels(),
                    frameworkAPI.getFrameworkImplementationGuide(), frameworkAPI.getFrameworkAuditTemplates()
                ]);
                setBridgeStages(stagesRes.data?.length ? stagesRes.data : BRIDGE_STAGES);
                setMaturityLevels(maturityRes.data?.length ? maturityRes.data : MATURITY_LEVELS);
                setImplementationGuide(guideRes.data || []); setAuditTemplates(templatesRes.data || []);
            } catch {
                setBridgeStages(BRIDGE_STAGES); setMaturityLevels(MATURITY_LEVELS);
                setImplementationGuide(IMPLEMENTATION_GUIDE); setAuditTemplates(AUDIT_TEMPLATES);
            } finally { setLoading(false); }
        };
        load();
    }, []);

    useEffect(() => { document.title = 'AI Risk Framework | Risk AI Council (RAC)'; }, []);

    return (
        <>
            <style>{`
                @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                .arc-content-enter { animation: fadeSlideUp 0.35s cubic-bezier(.4,0,.2,1) both; }

                /* ── Scroll-in reveal ── */
                .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
                .reveal-visible { opacity: 1; transform: none; }

                /* ── Top-level module tabs ── */
                .module-tabs { display: flex; justify-content: center; gap: 4px; flex-wrap: wrap; margin-bottom: 2.5rem; border-bottom: 1px solid #E2E8F0; }
                .module-tab { padding: 0.9rem 1.15rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-family: inherit; font-size: 0.92rem; font-weight: 600; color: #64748B; transition: all 0.15s; margin-bottom: -1px; }
                .module-tab:hover { color: #1E293B; }
                .module-tab-active { color: ${ACCENT}; font-weight: 800; border-bottom-color: ${ACCENT}; }

                /* ── Maturity Levels — one row of self-contained pills. Each
                   pill is a single flat element (icon + text, one border),
                   so there's no separate track/label pairing that can drift
                   out of alignment with itself. ── */
                .maturity-pills { display: flex; flex-wrap: wrap; gap: 10px; max-width: 820px; margin: 0 auto 1.75rem; }
                .maturity-pill { flex: 1; min-width: 160px; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; font-family: inherit; transition: all 0.2s; }
                .maturity-pill:hover { border-color: #CBD5E1; }
                .maturity-pill-icon { width: 30px; height: 30px; border-radius: 50%; background: #F1F5F9; color: #94A3B8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
                .maturity-pill-passed { border-color: rgba(0,51,102,0.25); background: rgba(0,51,102,0.04); }
                .maturity-pill-passed .maturity-pill-icon { background: ${ACCENT}; color: white; }
                .maturity-pill-active { border-color: ${GOLD}; background: rgba(249,168,37,0.08); box-shadow: 0 0 0 3px rgba(249,168,37,0.15); }
                .maturity-pill-active .maturity-pill-icon { background: ${ACCENT}; color: white; box-shadow: 0 0 0 3px rgba(249,168,37,0.32); }
                .maturity-pill-text { display: flex; flex-direction: column; text-align: left; min-width: 0; }
                .maturity-pill-level { font-size: 0.62rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }
                .maturity-pill-active .maturity-pill-level { color: #b3760f; }
                .maturity-pill-name { font-size: 0.85rem; font-weight: 700; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .maturity-pill-active .maturity-pill-name, .maturity-pill-passed .maturity-pill-name { color: #0F172A; }
                @media (max-width: 640px) {
                    .maturity-pills { flex-direction: column; }
                    .maturity-pill { min-width: 0; }
                }

                /* ── Implementation Guide — a dashed project-roadmap timeline
                   with diamond milestones, so a phased rollout with durations
                   reads as a schedule rather than a repeat of the Bridge's
                   suspension-cable journey visual. ── */
                .impl-timeline { position: relative; max-width: 1000px; margin: 0 auto 2.5rem; }
                .impl-timeline-track { position: absolute; left: 5%; right: 5%; top: 44px; border-top: 2px dashed #CBD5E1; }
                .impl-timeline-row { position: relative; display: flex; }
                .impl-station { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; background: none; border: none; cursor: pointer; padding: 0 6px; font-family: inherit; }
                .impl-station-duration { font-size: 0.72rem; font-weight: 700; color: #94A3B8; background: #F1F5F9; padding: 3px 10px; border-radius: 99px; }
                .impl-station-active .impl-station-duration { color: ${ACCENT}; background: #EFF6FF; }
                .impl-station-marker { width: 30px; height: 30px; border-radius: 8px; transform: rotate(45deg); background: white; border: 2.5px solid #CBD5E1; color: #94A3B8; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
                .impl-station-marker svg { transform: rotate(-45deg); }
                .impl-station:hover .impl-station-marker { border-color: ${ACCENT}; color: ${ACCENT}; }
                .impl-station-active .impl-station-marker { background: ${ACCENT}; border-color: ${GOLD}; color: white; box-shadow: 0 0 0 4px rgba(249,168,37,0.22); }
                .impl-station-active:hover .impl-station-marker { color: white; }
                .impl-station-title { font-size: 0.92rem; font-weight: 700; color: #475569; text-align: center; }
                .impl-station-active .impl-station-title { color: #0F172A; }
                @media (max-width: 700px) {
                    .impl-station-title { font-size: 0.78rem; }
                }

                /* ── Bridge Model milestone track — the model's own journey visual.
                   Wide and centred under the heading, with a true suspension-
                   cable arc (not a straight line) tracing the whole shape. ── */
                @keyframes bridgeArcFlow {
                    0%   { left: 0%;   top: -60px; opacity: 0; }
                    6%   { opacity: 1; }
                    25%  { left: 25%;  top: -41px; }
                    50%  { left: 50%;  top: -34px; }
                    75%  { left: 75%;  top: -41px; }
                    94%  { opacity: 1; }
                    100% { left: 100%; top: -60px; opacity: 0; }
                }
                .bridge-milestones { max-width: 1100px; margin: 0 auto 2.5rem; }
                .bridge-visual { position: relative; height: 84px; }
                .bridge-bg-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
                /* non-scaling-stroke keeps these crisp at a fixed pixel width no
                   matter how the viewBox gets stretched by preserveAspectRatio
                   none — without it, the arc and hangers render at uneven
                   apparent thickness depending on their angle. */
                .bridge-bg-tower { stroke: ${ACCENT}; stroke-width: 2; opacity: 0.45; vector-effect: non-scaling-stroke; }
                .bridge-bg-arc { stroke: ${ACCENT}; stroke-width: 2; opacity: 0.5; vector-effect: non-scaling-stroke; }
                .bridge-bg-hanger { stroke: ${ACCENT}; stroke-width: 1.25; opacity: 0.32; vector-effect: non-scaling-stroke; }
                .bridge-track { position: absolute; left: 0; right: 0; top: 69px; height: 4px; background: #E2E8F0; border-radius: 4px; overflow: visible; }
                .bridge-track-fill { position: absolute; top: 0; left: 0; height: 100%; background: linear-gradient(90deg, ${ACCENT}, ${GOLD}); border-radius: 4px; transition: width 0.45s cubic-bezier(0.4,0,0.2,1); }
                /* A soft light continuously tracing the arc's own curve (left
                   AND top both animate) — not just a straight-line dot — so
                   the motion actually reads as travelling the suspension
                   cable rather than sliding along the flat progress bar. */
                .bridge-flow-glow {
                    position: absolute; left: 0; width: 11px; height: 11px; margin-left: -5.5px;
                    border-radius: 50%; background: radial-gradient(circle, #fff 0%, ${GOLD} 45%, transparent 78%);
                    box-shadow: 0 0 16px 5px rgba(249,168,37,0.55), 0 0 4px 1px rgba(255,255,255,0.85);
                    animation: bridgeArcFlow 6.5s ease-in-out infinite;
                    pointer-events: none;
                }
                .bridge-circles { position: absolute; left: 0; right: 0; top: 48px; display: flex; }
                .bridge-node { flex: 1; display: flex; justify-content: center; background: none; border: none; cursor: pointer; padding: 0; }
                .bridge-node-circle { width: 42px; height: 42px; border-radius: 50%; background: white; border: 3px solid #CBD5E1; color: #94A3B8; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .bridge-node-passed .bridge-node-circle { background: ${ACCENT}; border-color: ${ACCENT}; color: white; }
                .bridge-node-active .bridge-node-circle { background: ${ACCENT}; border-color: ${GOLD}; color: white; box-shadow: 0 0 0 5px rgba(249,168,37,0.22); transform: scale(1.1); }
                .bridge-node:hover .bridge-node-circle { border-color: ${ACCENT}; color: ${ACCENT}; }
                .bridge-node-passed:hover .bridge-node-circle, .bridge-node-active:hover .bridge-node-circle { color: white; }
                .bridge-labels { display: flex; margin-top: 10px; }
                .bridge-label { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; padding: 0 4px; font-family: inherit; }
                .bridge-label-index { font-size: 0.7rem; font-weight: 800; color: #7C8CA6; letter-spacing: 0.06em; }
                .bridge-label-active .bridge-label-index { color: ${GOLD}; }
                .bridge-label-name { font-size: 1rem; font-weight: 700; color: #334155; }
                .bridge-label-active .bridge-label-name { color: #0F172A; }
                .bridge-label-tagline { font-size: 0.82rem; color: #64748B; text-align: center; line-height: 1.35; }
                .bridge-label-active .bridge-label-tagline { color: #334155; }
                @media (max-width: 760px) {
                    .bridge-label-tagline { display: none; }
                    .bridge-label-name { font-size: 0.85rem; }
                    .bridge-node-circle { width: 34px; height: 34px; }
                }

                /* ── Stage / phase / level detail panel ── */
                .stage-detail { background: white; border: 1px solid #E2E8F0; border-radius: 18px; padding: clamp(1.5rem,3vw,2.5rem); }
                .stage-detail-head { display: flex; align-items: center; gap: 16px; margin-bottom: 1.5rem; }
                .stage-detail-eyebrow { font-size: 0.74rem; font-weight: 700; color: ${ACCENT}; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px; }
                .stage-detail-title { font-size: clamp(1.25rem,2.4vw,1.65rem); font-weight: 800; color: #0F172A; margin: 0; font-family: var(--font-serif,Georgia,serif); }
                .stage-detail-lead { font-size: clamp(1rem,1.5vw,1.125rem); color: #475569; line-height: 1.75; margin: 0 0 1.75rem; max-width: 740px; }

                /* ── Board / Implementer persona split — an editorial pull-quote
                   pairing instead of two bordered cards, with a thin connector
                   between them standing in for the "bridge" between the two
                   viewpoints this stage has to translate across. ── */
                .persona-split { display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem; margin-bottom: 1.75rem; }
                .persona-side { min-width: 0; }
                .persona-byline { display: flex; align-items: center; gap: 8px; margin-bottom: 0.7rem; }
                .persona-avatar { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .persona-avatar-board { background: ${ACCENT}; color: white; }
                .persona-avatar-implementer { background: rgba(249,168,37,0.15); color: #b3760f; }
                .persona-role { font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }
                .persona-quote { position: relative; font-family: var(--font-serif,Georgia,serif); font-size: clamp(1.02rem,1.6vw,1.2rem); font-weight: 700; color: #0F172A; line-height: 1.5; margin: 0; }
                .persona-quote::before {
                    content: '\\201C'; position: absolute; left: -2px; top: -0.65em; font-size: 2.75rem;
                    font-family: var(--font-serif,Georgia,serif); font-weight: 800; color: ${ACCENT}; opacity: 0.12;
                    line-height: 1; pointer-events: none;
                }
                .persona-side-implementer .persona-quote::before { color: ${GOLD}; opacity: 0.35; }
                .persona-connector { display: flex; flex-direction: column; align-items: center; }
                .persona-connector-line { width: 1px; flex: 1; background: linear-gradient(180deg, transparent, #CBD5E1 25%, #CBD5E1 75%, transparent); }
                .persona-connector-dot { width: 7px; height: 7px; border-radius: 50%; background: ${ACCENT}; margin: 6px 0; flex-shrink: 0; }
                @media (max-width: 640px) {
                    .persona-split { grid-template-columns: 1fr; gap: 1.5rem; }
                    .persona-connector { display: none; }
                }

                /* ── Characteristics → Next Actions (Maturity Levels) — no card
                   chrome at all, since a boxed panel around 2-3 short bullets
                   just frames empty space. The connector reuses the Bridge
                   persona-split's line-and-marker language for consistency,
                   with an arrow instead of a dot: this pairing is a "current
                   state leads to a next step", not two independent quotes. ── */
                .maturity-detail-inner { max-width: 820px; margin: 0 auto; }
                .maturity-compare { display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem; margin-bottom: 0; }
                .maturity-compare-label { font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px; }
                .maturity-compare-connector { display: flex; flex-direction: column; align-items: center; }
                .maturity-compare-line { width: 1px; flex: 1; background: linear-gradient(180deg, transparent, #CBD5E1 25%, #CBD5E1 75%, transparent); }
                .maturity-compare-arrow { color: #CBD5E1; margin: 6px 0; flex-shrink: 0; }
                @media (max-width: 640px) {
                    .maturity-compare { grid-template-columns: 1fr; gap: 1.25rem; }
                    .maturity-compare-connector { display: none; }
                }

                .shared-block { padding-top: 1.5rem; border-top: 1px solid #F1F5F9; margin-bottom: 1.5rem; }
                .shared-grid { display: flex; flex-wrap: wrap; gap: 8px 32px; }
                .shared-grid .mod-detail-row { margin-bottom: 0; width: auto; }

                .note-callout { background: rgba(0,51,102,0.04); border: 1px solid rgba(0,51,102,0.14); border-radius: 12px; padding: 16px 18px; margin-bottom: 1.5rem; }
                .note-callout-label { font-size: 0.72rem; font-weight: 800; color: ${ACCENT}; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px; }
                .note-callout-text { font-size: 0.94rem; color: #334155; line-height: 1.7; margin: 0; }

                /* ── Module card grid — Audit Templates / Security Tools ── */
                .mod-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 1.1rem; }
                .mod-card { background: white; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 1.35rem; cursor: pointer; transition: all 0.18s; display: flex; flex-direction: column; }
                .mod-card:hover { border-color: #CBD5E1; box-shadow: 0 8px 20px rgba(0,0,0,0.08); transform: translateY(-3px); }
                .mod-card-open { border-color: ${ACCENT}; box-shadow: 0 6px 20px rgba(0,51,102,0.14); cursor: default; }
                .mod-card-open:hover { transform: none; }
                .mod-card-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
                .mod-card-index { font-size: 0.68rem; font-weight: 800; color: #94A3B8; letter-spacing: 0.06em; }
                .mod-card-title { font-size: 1.08rem; font-weight: 700; color: #1E293B; margin: 0; }
                .mod-card-subtitle { font-size: 0.82rem; color: #64748B; margin: 2px 0 0; font-weight: 600; }
                .mod-card-desc { font-size: 0.92rem; color: #475569; line-height: 1.6; margin: 0 0 10px; flex: 1; }
                .mod-card-link { font-size: 0.82rem; font-weight: 700; color: ${ACCENT}; display: inline-flex; align-items: center; gap: 5px; margin-top: auto; }
                .mod-card-chevron { flex-shrink: 0; color: #94A3B8; transition: transform 0.18s; margin-top: 4px; }
                .mod-card-detail { margin-top: 8px; padding-top: 16px; border-top: 1px solid #F1F5F9; cursor: default; }
                .mod-detail-label { font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
                .mod-detail-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px; font-size: 0.9rem; color: #475569; line-height: 1.55; }
                .mod-dot { width: 6px; height: 6px; border-radius: 50%; background: ${ACCENT}; margin-top: 6px; flex-shrink: 0; }
                .mod-chip { font-size: 0.8rem; font-weight: 600; color: #475569; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 5px 12px; border-radius: 99px; }
                .alignment-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; color: #166534; line-height: 1.6; }

                /* ── Filter pills (Audit Templates) ── */
                .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 1.25rem; }
                .filter-pill { padding: 7px 14px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; color: #64748B; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
                .filter-pill:hover { border-color: #CBD5E1; }
                .filter-pill.active { background: ${ACCENT}; border-color: ${ACCENT}; color: white; }

                /* ── Step checklist (Implementation Guide) ── */
                .step-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(300px,1fr)); gap: 12px; }
                .step-card { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 1.1rem 1.25rem; cursor: pointer; transition: all 0.18s; }
                .step-card:hover { border-color: #CBD5E1; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .step-card-done { background: rgba(5,150,105,0.04); border-color: rgba(5,150,105,0.25); }
                .step-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
                .step-num { background: #EFF6FF; color: ${ACCENT}; font-size: 0.76rem; font-weight: 700; padding: 4px 9px; border-radius: 5px; }
                .step-title { font-weight: 700; font-size: 0.96rem; margin: 0 0 5px; }
                .step-desc { color: #64748B; font-size: 0.88rem; line-height: 1.6; margin: 0; }
                .step-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #CBD5E1; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
                .step-check-done { background: #059669; border-color: #059669; }

                /* ── CTA banner (Audit Templates footer) ── */
                .cta-banner { margin-top: 1.5rem; background: linear-gradient(135deg,#002855 0%,#003d80 100%); border-radius: 14px; padding: 1.5rem 1.75rem; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
                .cta-banner-title { font-weight: 700; color: white; margin: 0 0 3px; font-size: 0.92rem; }
                .cta-banner-sub { margin: 0; font-size: 0.8rem; color: #93C5FD; }
                .cta-banner-btn { text-decoration: none; background: ${GOLD}; color: ${ACCENT}; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; flex-shrink: 0; white-space: nowrap; display: inline-block; }

                /* ── Playbook rows ── */
                .playbook-row { background: white; border: 1px solid #E2E8F0; border-radius: 10px; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 16px; transition: box-shadow 0.18s, border-color 0.18s; flex-wrap: wrap; }
                .playbook-row:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.07); border-color: #CBD5E1; }
                .playbook-download-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; color: white; border: none; border-radius: 7px; font-weight: 700; font-size: 0.8rem; cursor: pointer; flex-shrink: 0; white-space: nowrap; }

                .hero-stat { transition: transform 0.18s, background 0.18s; }
                .hero-stat:hover { transform: translateY(-3px); background: rgba(255,255,255,0.12); }

                /* ── Learning Agents bar — shows all five bots inline, no shared card ──
                   z-index 1200 keeps it above the sticky navbar's z-index:1000. */
                @keyframes agentItemIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
                @keyframes agentItemFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                /* Deliberately always in normal document flow, never absolutely
                   positioned/floating — that was tried and kept overlapping the
                   title or the stats row at various widths since an absolute box's
                   height (which changes if its row wraps) isn't reserved by the
                   layout around it. It's a real flex child stacked above the stats
                   (see the hero JSX) instead, so the layout always reserves its
                   space and it can't overlap anything at any screen size, while
                   still visually landing top-right like before. */
                .agents-bar { position: relative; }
                .agents-bar-title-row { display: flex; align-items: center; gap: 10px; }
                .agents-bar-new { display: inline-block; background: rgba(249,168,37,0.16); border: 1px solid rgba(249,168,37,0.4); color: ${GOLD}; font-size: 0.62rem; font-weight: 800; padding: 3px 8px; border-radius: 99px; letter-spacing: 0.05em; text-transform: uppercase; }
                .agents-bar-head { display: flex; flex-direction: column; margin-bottom: 14px; }
                .agents-bar-title { font-size: 1.2rem; font-weight: 800; color: white; }
                .agents-bar-sub { font-size: 0.85rem; color: #CBD5E1; margin-top: 4px; }
                /* Fixed per-item width (not content/nowrap-driven) keeps the row's total
                   width predictable regardless of agent-name length — 5 * 108px + 4 *
                   16px gap ≈ 604px, which reliably fits next to the hero title within
                   the hero's 1320px content cap. Bumping these two numbers is safe as
                   long as title + gap + (that sum) still clears 1320px. */
                .agents-bar-row { display: flex; gap: 16px; flex-wrap: wrap; max-width: 640px; }
                .agents-bar-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 108px; text-decoration: none; cursor: pointer; animation: agentItemIn 0.4s ease both; transition: transform 0.18s; }
                .agents-bar-item .agent-card-icon { animation: botBob 2.4s ease-in-out infinite, agentItemFloat 3.2s ease-in-out infinite; }
                .agents-bar-item:hover { transform: translateY(-5px); }
                .agents-bar-item:hover .agent-card-icon { animation-play-state: paused; transform: scale(1.1); }
                .agents-bar-item:hover .agents-bar-name { color: ${GOLD}; }
                /* min-height reserves room for 2 lines even for names that fit on one
                   ("EU AI Act"), so every item is the same height and the stats row
                   below sits flush regardless of which names happen to wrap. */
                .agents-bar-name { font-size: 0.8rem; font-weight: 700; color: #E2E8F0; text-align: center; line-height: 1.3; min-height: 2.6em; transition: color 0.18s; }
                /* BotMascot's size is a JS prop baked into an inline style (span) and
                   plain width/height attributes (svg) — a class alone can't shrink it,
                   so the span needs !important to beat its own inline style. The svg
                   doesn't: CSS width/height on an <svg> already outranks its plain
                   attributes, no !important needed there. */
                @media (max-width: 480px) {
                    .agents-bar-row { gap: 10px; }
                    .agents-bar-item { width: 74px; gap: 5px; }
                    .agents-bar-item .agent-card-icon { width: 52px !important; height: 68px !important; }
                    .agents-bar-item .agent-card-icon .bot-mascot-svg { width: 52px; height: 68px; }
                    .agents-bar-name { font-size: 0.66rem; min-height: 2.2em; }
                }
                .agent-card-icon { transition: transform 0.2s; }

                /* ── Responsive ── */
                @media (max-width: 720px) {
                    .stage-detail { padding: 1.5rem; }
                }
            `}</style>

            {/* ── Hero ── */}
            <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 55%,#005599 100%)', padding: 'clamp(1.1rem,2vw,1.5rem) clamp(1rem,7vw,6rem) clamp(1.5rem,2.5vw,2rem)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                {/* Wider than the body's WRAP (1320px, kept for text readability further
                    down) — the h1 alone runs ~900px, so at 1320 there's rarely enough
                    left over to hold the bots+stats column beside it without wrapping,
                    even on large screens with visibly unused width past that cap. */}
                <div style={{ maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    {/* A true 50/50 grid — each column always gets exactly half the
                        available width regardless of content length, so this replaces
                        the earlier "does the title + bots row both fit" width math
                        entirely. auto-fit + minmax stacks to one column on screens too
                        narrow for two ~380px halves, instead of ever overlapping. */}
                    {/* minmax(min(380px,100%),1fr) — not a bare 380px minimum — so on a
                        phone narrower than 380px the track can still shrink to fit the
                        screen instead of forcing the whole grid wider than the viewport
                        (that's what was cutting off text/bots off the right edge). */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(380px,100%),1fr))', alignItems: 'start', gap: '1.25rem' }}>
                        <div style={{ minWidth: 0 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(249,168,37,0.15)', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: '5px', marginBottom: '16px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f9a825' }} />Risk AI Council (RAC)
                            </span>
                            <h1 style={{ color: 'white', fontSize: 'clamp(1.5rem,4vw,2.6rem)', fontWeight: '800', lineHeight: '1.15', margin: '0 0 12px', maxWidth: '640px', fontFamily: 'var(--font-serif,Georgia,serif)', letterSpacing: '-0.02em' }}>AI Risk Governance Framework</h1>
                            <p style={{ color: '#CBD5E1', fontSize: 'clamp(0.875rem,1.5vw,1rem)', lineHeight: '1.7', margin: '0 0 16px', maxWidth: '560px' }}>A five-stage framework for identifying, measuring, and governing artificial intelligence risk — Exposure → Obligation → Integrity → Defense → Continuity.</p>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px 6px 6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '99px' }}>
                                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f9a825', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', color: '#003366', flexShrink: 0 }}>SN</span>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>Framework designed by Silvana Nani</span>
                            </div>
                        </div>
                        {/* Right column: agents bar stacked above the stats — both stay
                            in normal flow (no absolute/floating), so this column simply
                            takes the vertical space it needs and can't overlap the title
                            or wrap into anything below it, at any screen width. */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '28px' }}>
                            <LearningAgentsLauncher />
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                {[{ n: '5', label: 'Bridge Stages' }, { n: '4', label: 'Maturity Levels' }, { n: '16+', label: 'Implementation Steps' }, { n: '6', label: 'Audit Templates' }].map(s => (
                                    <div key={s.label} className="hero-stat" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px 18px', textAlign: 'center', minWidth: '80px' }}>
                                        <div style={{ fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: '900', color: 'white', lineHeight: 1, fontFamily: 'var(--font-serif,Georgia,serif)' }}>{s.n}</div>
                                        <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '4px', lineHeight: '1.3' }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Body — full width, no sidebar ── */}
            <div style={{ background: '#F8FAFC', minHeight: '60vh' }}>
                <div style={{ maxWidth: WRAP, margin: '0 auto', padding: '2.5rem clamp(1rem,3vw,2rem) 5rem' }}>
                    <div className="module-tabs">
                        {NAV_ITEMS.map(item => (
                            <button key={item.key} className={`module-tab${activeSection === item.key ? ' module-tab-active' : ''}`} onClick={() => handleNav(item.key)}>{item.label}</button>
                        ))}
                    </div>

                    <div key={animKey} className="arc-content-enter" style={{ minHeight: '400px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
                                <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #EFF6FF', borderTop: '4px solid #003366', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <p style={{ marginTop: '16px' }}>Loading framework content...</p>
                            </div>
                        ) : (
                            <ActiveComponent stages={bridgeStages} maturityLevels={maturityLevels} implementationGuide={implementationGuide} auditTemplates={auditTemplates} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Framework;
