export const navItems = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about' },
    { label: 'AI Risk Framework', path: '/framework' },
    { label: 'AI Risk Assessment & Council', path: '/assessment' },
    { label: 'Services', path: '/services' },
    { label: 'Research & Resources', path: '/resources' },
    { label: 'Certifications', path: '/certifications' },
    { label: 'Contact Us', path: '/contact' },
];

export const heroContent = {
    title: "Setting the Global Standard for AI Risk Governance",
    subtitle: "The AI Risk Council provides independent oversight, frameworks, and assessment standards to ensure responsible, compliant, and ethical Artificial Intelligence adoption across enterprises.",
    ctaPrimary: "Explore AI Risk Framework",
    ctaSecondary: "Join the Council"
};

export const riskDomains = [
    {
        id: "model-risk",
        title: "Model Risk",
        description: "Addressing model drift, hallucination, and performance degradation over time.",
        fullDescription: "Model risk involves the potential for adverse consequences from decisions based on incorrect or misused model outputs. This includes concept drift, data leakage, and lack of robustness against adversarial attacks.",
        standards: ["SR 11-7 (Federal Reserve)", "NIST AI RMF 1.2"]
    },
    {
        id: "bias-fairness",
        title: "Bias & Fairness",
        description: "Ensuring equitable outcomes and mitigating algorithmic bias in decision systems.",
        fullDescription: "Algorithmic bias can lead to discriminatory outcomes in lending, hiring, and healthcare. Fairness metrics must be rigorously tested across protected classes to ensure compliance with anti-discrimination laws.",
        standards: ["ISO/IEC TR 24027", "NYC Local Law 144"]
    },
    {
        id: "transparency",
        title: "Transparency & Explainability",
        description: "Standards for interpreting model outputs and documenting decision logic.",
        fullDescription: "Black-box models pose significant risks in high-stakes environments. Explainable AI (XAI) techniques and clear documentation are essential for stakeholder trust and regulatory auditing.",
        standards: ["EU AI Act Article 13", "SHAP/LIME Specifications"]
    },
    {
        id: "data-privacy",
        title: "Data & Privacy Risk",
        description: "Safeguarding training data and ensuring GDPR/CCPA compliance within AI pipelines.",
        fullDescription: "AI systems require vast amounts of data, raising risks related to unauthorized access, inference attacks, and data poisoning. Privacy-enhancing technologies (PETs) are critical controls.",
        standards: ["GDPR Article 22", "CCPA/CPRA", "ISO/IEC 27701"]
    },
    {
        id: "operational",
        title: "Operational & Systemic Risk",
        description: "Managing dependencies, infrastructure failures, and cascading AI system effects.",
        fullDescription: "Reliance on third-party foundational models and cloud infrastructure introduces systemic risks. Operational resilience demands robust fallback mechanisms and business continuity planning.",
        standards: ["DORA (EU)", "Basel III Operational Risk"]
    },
    {
        id: "regulatory-ethical",
        title: "Regulatory & Ethical Risk",
        description: "Aligning with EU AI Act, NIST AI RMF, and global ethical guidelines.",
        fullDescription: "The regulatory landscape for AI is rapidly evolving. Non-compliance can result in severe fines and reputational damage. Ethical AI frameworks guide development beyond mere legal minimums.",
        standards: ["EU AI Act", "OECD AI Principles", "UNESCO Ethics of AI"]
    }
];

export const services = [
    { title: "AI Risk Advisory", description: "Strategic guidance for Boards and C-Suite on AI governance structures and policy formulation." },
    { title: "Risk & AI (RAI) Certification", description: "Comprehensive certification program covering AI tools, machine learning risks, and ethical AI principles." },
    { title: "Governance Framework Design", description: "Tailored implementation of the ARC Risk Framework to fit organizational maturity and scale." },
    { title: "Independent AI Risk Reviews", description: "Third-party audit and validation of high-impact AI models against global standards." },
    { title: "AI Control Audits", description: "Assessment of data governance, model testing, and bias mitigation controls." },
    { title: "Executive Workshops", description: "Targeted training for leadership teams on understanding and mitigating AI-specific risks." }
];

export const pillars = [
    { title: "Governance & Culture", description: "Establishing clear accountability, roles, and risk appetite at the board level." },
    { title: "Model Lifecycle Management", description: "Rigorous controls from data ingestion to develop, deploy, and retire phases." },
    { title: "Continuous Monitoring", description: "Real-time surveillance of model performance, data shifts, and adversarial attacks." },
    { title: "Compliance & Reporting", description: "Standardized documentation and reporting for internal audit and external regulators." }
];

export const resources = [
    { type: "White Paper", title: "The State of AI Governance 2026", date: "Jan 2026", access: "Public" },
    { type: "Framework", title: "ARC Core Risk Framework v2.0", date: "Dec 2025", access: "Public" },
    { type: "Guide", title: "Responsible AI: From Principles to Practice", date: "Dec 2025", access: "Public" },
    { type: "Learning", title: "Machine Learning Risk: Tools & Techniques", date: "Nov 2025", access: "Members Only" },
    { type: "Template", title: "Algorithmic Impact Assessment (AIA) Template", date: "Nov 2025", access: "Members Only" },
    { type: "Case Study", title: "Implementing Responsible AI in Fintech", date: "Oct 2025", access: "Public" },
    { type: "Guide", title: "Board Director's Guide to AI Oversight", date: "Sep 2025", access: "Members Only" },
    { type: "Learning", title: "AI Model Governance & Control Frameworks", date: "Aug 2025", access: "Public" },
    { type: "White Paper", title: "Mitigating Bias in Generative Models", date: "Aug 2025", access: "Public" }
];
