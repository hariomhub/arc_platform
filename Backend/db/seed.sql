USE arc_platform;

-- =============================================
-- USERS (1 per role, all approved except free_member stays pending to test)
-- Passwords: Admin@123, Exec@123, Paid@123, Uni@123, Prod@123, Free@123
-- =============================================
INSERT INTO users (name, email, password_hash, role, status, bio, linkedin_url, organization_name) VALUES
(
  'ARC Administrator',
  'admin@arc.com',
  '$2b$12$k8yzAUy4sehSiLrME5iVGORaj5mHwH3jdYwryio0i1Pu95XjC3E6S',
  'admin',
  'approved',
  'Platform administrator responsible for governance and oversight of the AI Risk Council portal.',
  'https://www.linkedin.com/in/arc-admin',
  'AI Risk Council'
),
(
  'Dr. Priya Nair',
  'executive@arc.com',
  '$2b$12$AdDFRUY1tzr21EbnkpZUx.XLGVh2Yje.c7vnpAIGAy0NXg4EClu0y',
  'executive',
  'approved',
  'Senior executive with 15+ years leading AI governance initiatives across Fortune 500 companies.',
  'https://www.linkedin.com/in/priya-nair-exec',
  'TechGov Consulting Ltd.'
),
(
  'Rahul Menon',
  'paid@arc.com',
  '$2b$12$lYJN0Q6fcDBVznvYXoAxDODwuOgy.0Q4w9lHp1COaxnF0IpC6.me2',
  'paid_member',
  'approved',
  'AI risk analyst and compliance professional focused on financial sector AI deployments.',
  'https://www.linkedin.com/in/rahul-menon-ai',
  'FinSecure Analytics'
),
(
  'Prof. Ananya Sharma',
  'university@arc.com',
  '$2b$12$CWQhNYYrdDTk6f/vv0HL.OVNZB05oBzxiE2rpROmmdaaU/VMDAfDG',
  'university',
  'approved',
  'Associate Professor of AI Ethics and Policy at IIT Delhi, author of multiple AI governance whitepapers.',
  'https://www.linkedin.com/in/prof-ananya-sharma',
  'IIT Delhi, Department of AI Ethics'
),
(
  'Kiran Desai',
  'product@arc.com',
  '$2b$12$adHEGu/AlE0fXfv5f9VHGOmhfQb3X2K2WQ8VXllxqbiBtSDhHDHaG',
  'product_company',
  'approved',
  'Founder of SafeAI Solutions, building tools for enterprise-grade AI safety and compliance.',
  'https://www.linkedin.com/in/kiran-desai-safeai',
  'SafeAI Solutions Pvt. Ltd.'
),
(
  'Meera Pillai',
  'free@arc.com',
  '$2b$12$kvxjUKPJ3n2ZB5y/F6qTI.AJU0byGtpidDSUvcYnHqDKbxHtsxS.y',
  'free_member',
  'approved',
  'Independent researcher interested in AI policy and global governance frameworks.',
  'https://www.linkedin.com/in/meera-pillai-researcher',
  NULL
);

-- =============================================
-- TEAM MEMBERS (7 members)
-- =============================================
INSERT INTO team_members (name, role, bio, linkedin_url) VALUES
(
  'Akarsh Singh',
  'Chief Executive Officer',
  'Akarsh founded the AI Risk Council in 2022 after a decade leading technology policy at the World Economic Forum. He holds an MBA from IIM Ahmedabad and a Master''s in Public Policy from Oxford.',
  'https://www.linkedin.com/in/akarsh-singh-ceo'
),
(
  'Dr. Elena Rodriguez',
  'Chief Research Officer',
  'Dr. Rodriguez leads all research initiatives at ARC. Previously a Principal Researcher at DeepMind, she holds a PhD in Machine Learning from MIT and has published over 40 peer-reviewed papers.',
  'https://www.linkedin.com/in/elena-rodriguez-cro'
),
(
  'Dr. Pawan Chawla',
  'Head of AI Safety & Security',
  'Dr. Chawla is a renowned cybersecurity expert specialising in adversarial AI and red-teaming LLMs. He advises multiple national governments on AI threat modelling and incident response.',
  'https://www.linkedin.com/in/dr-pawan-chawla-aisec'
),
(
  'Sarah Chen',
  'Director of Ethics & Policy',
  'Sarah crafts ARC''s ethical guidelines and policy recommendations. With a background in bioethics and technology law (JD, Harvard Law), she bridges legal compliance with practical AI governance.',
  'https://www.linkedin.com/in/sarah-chen-ethics'
),
(
  'Vikram Bose',
  'VP of Enterprise Partnerships',
  'Vikram builds and manages ARC''s relationships with enterprise members and product companies. He previously led strategic alliances at Microsoft India and has deep expertise in B2B technology markets.',
  'https://www.linkedin.com/in/vikram-bose-partnerships'
),
(
  'Dr. Fatima Al-Rashid',
  'Head of University Relations',
  'Dr. Al-Rashid coordinates ARC''s academic network spanning 30+ universities globally. She earned her PhD in AI Governance from Carnegie Mellon and advocates for research-driven policymaking.',
  'https://www.linkedin.com/in/fatima-alrashid-academia'
),
(
  'James O''Brien',
  'Chief Technology Officer',
  'James architects ARC''s technology infrastructure and the ARC Platform. A full-stack engineer with 18 years of experience, he previously held CTO roles at two successful edtech startups.',
  'https://www.linkedin.com/in/james-obrien-cto'
);

-- =============================================
-- EVENTS (3 upcoming + 3 past)
-- =============================================
INSERT INTO events (title, date, location, description, link, event_category, is_upcoming, recording_url) VALUES
(
  'AI Governance Webinar: EU AI Act Deep Dive',
  '2026-03-15 14:00:00',
  'Virtual (Zoom)',
  'A comprehensive session breaking down the EU AI Act''s key requirements, compliance timelines, and practical checklists for enterprises. Industry experts and legal specialists will present real-world case studies.',
  'https://arc.com/events/register/eu-ai-act-webinar',
  'webinar',
  TRUE,
  NULL
),
(
  'AI Risk Seminar: Operationalising Responsible AI',
  '2026-04-10 10:00:00',
  'T-Hub, Hyderabad',
  'A full-day in-person seminar bringing together AI risk professionals to share frameworks for embedding responsible AI practices into enterprise product lifecycles.',
  'https://arc.com/events/register/responsible-ai-seminar',
  'seminar',
  TRUE,
  NULL
),
(
  'Hands-On Workshop: Red-Teaming LLMs',
  '2026-05-22 09:00:00',
  'IIT Delhi, New Delhi',
  'An intensive two-day technical workshop focused on adversarial testing of large language models. Participants will use industry-standard tools to identify vulnerabilities in LLM deployments.',
  'https://arc.com/events/register/llm-redteam-workshop',
  'workshop',
  TRUE,
  NULL
),
(
  'AI Safety Podcast Live: Navigating AI Regulation',
  '2025-11-20 17:00:00',
  'Virtual (YouTube Live)',
  'A live recorded podcast episode featuring three AI policy leaders discussing the global regulatory landscape for artificial intelligence and what it means for innovators.',
  'https://arc.com/events/past/ai-safety-podcast-nov25',
  'podcast',
  FALSE,
  'https://www.youtube.com/watch?v=arc_podcast_nov25'
),
(
  'Annual AI Governance Summit 2025',
  '2025-12-05 09:00:00',
  'Le Méridien, Bangalore',
  'ARC''s flagship annual gathering of AI governance professionals, policy makers, and technology leaders from across India and Southeast Asia. Full-day sessions, panels, and networking.',
  'https://arc.com/events/past/summit-2025',
  'seminar',
  FALSE,
  'https://www.youtube.com/watch?v=arc_summit_2025_recording'
),
(
  'Introduction to AI Risk Frameworks: Webinar Series Ep. 1',
  '2025-10-08 15:00:00',
  'Virtual (Zoom)',
  'The first episode of ARC''s flagship educational webinar series, introducing key AI risk frameworks including NIST AI RMF, ISO 42001, and the OECD AI Principles.',
  'https://arc.com/events/past/risk-frameworks-ep1',
  'webinar',
  FALSE,
  'https://www.youtube.com/watch?v=arc_frameworks_ep1_recording'
);

-- =============================================
-- RESOURCES
-- 5 Frameworks (uploader = admin, id=1)
-- 4 Whitepapers (uploader = university user, id=4)
-- 4 Products (uploader = product_company user, id=5)
-- =============================================

-- Frameworks (uploader_id = 1 = admin)
INSERT INTO resources (title, description, abstract, file_url, demo_url, type, uploader_id) VALUES
(
  'ARC Comprehensive AI Risk Assessment Framework v2.0',
  'The definitive framework for assessing AI risks across the full model lifecycle — from data sourcing through deployment and monitoring.',
  'This framework provides a structured methodology for organisations to identify, categorise, and mitigate risks associated with AI systems. It encompasses data integrity risks, model bias, security vulnerabilities, regulatory non-compliance, and operational failures, mapped against a five-tier severity scale.',
  '/uploads/arc-framework-v2.pdf',
  NULL,
  'framework',
  1
),
(
  'NIST AI Risk Management Framework: ARC Implementation Guide',
  'A practical guide to implementing the NIST AI RMF within Indian organisational contexts, tailored by ARC experts.',
  'The NIST AI RMF provides a voluntary framework to improve AI trustworthiness. This ARC guide translates the four core functions — GOVERN, MAP, MEASURE, MANAGE — into actionable steps for Indian enterprises, including sector-specific guidance for BFSI, healthcare, and manufacturing.',
  '/uploads/nist-ai-rmf-arc-guide.pdf',
  NULL,
  'framework',
  1
),
(
  'ISO/IEC 42001 Compliance Checklist & Gap Analysis Template',
  'A step-by-step checklist and gap analysis tool aligned with ISO/IEC 42001, the international standard for AI management systems.',
  'ISO/IEC 42001 sets requirements for establishing, implementing, maintaining, and continually improving an AI Management System (AIMS). This ARC-produced checklist provides 120+ control questions across 10 domains, enabling organisations to measure their current compliance posture and prioritise remediation efforts.',
  '/uploads/iso42001-checklist.pdf',
  NULL,
  'framework',
  1
),
(
  'EU AI Act Compliance Roadmap for High-Risk AI Systems',
  'A timeline-based roadmap to help organisations deploying high-risk AI systems achieve full EU AI Act compliance by the 2026 deadline.',
  'The EU AI Act imposes strict requirements on high-risk AI systems across sectors including biometric identification, critical infrastructure, education, employment, and essential services. This ARC framework maps legal obligations to technical and organisational controls, providing a phased 18-month compliance roadmap.',
  '/uploads/eu-ai-act-roadmap.pdf',
  NULL,
  'framework',
  1
),
(
  'Algorithmic Accountability Framework for Financial Services',
  'A specialised AI governance framework designed for banks, NBFCs, insurance companies, and fintech firms operating in India.',
  'As RBI and SEBI increasingly scrutinise algorithmic decision-making in lending, insurance underwriting, and trading systems, financial institutions require a robust accountability framework. This ARC document provides governance policies, model risk management procedures, and audit trail requirements aligned with Indian regulatory expectations.',
  '/uploads/algo-accountability-finserv.pdf',
  NULL,
  'framework',
  1
),

-- Whitepapers (uploader_id = 4 = university user)
(
  'State of AI Safety in India 2025: Annual Research Report',
  'IIT Delhi''s comprehensive annual survey of AI safety incidents, near-misses, and emerging risk trends across Indian enterprises.',
  'Drawing on surveys of 250+ AI practitioners and analysis of 80 documented AI incidents across Indian industries in 2025, this whitepaper maps the AI safety landscape, identifies systemic gaps in current practices, and proposes a national AI incident reporting mechanism aligned with international best practices.',
  '/uploads/ai-safety-india-2025.pdf',
  NULL,
  'whitepaper',
  4
),
(
  'Bias in Automated Hiring: Evidence from Indian Labour Markets',
  'An empirical study examining demographic bias in AI-powered recruitment tools deployed by major Indian employers.',
  'This peer-reviewed whitepaper presents findings from a 12-month audit of seven AI hiring platforms used by top Indian corporations. Researchers found statistically significant bias against women, lower-caste applicants, and candidates from Tier-2/3 cities, with recommendations for bias mitigation and algorithmic auditing standards.',
  '/uploads/bias-hiring-india.pdf',
  NULL,
  'whitepaper',
  4
),
(
  'Privacy-Preserving Machine Learning: Techniques and Trade-offs',
  'A technical survey of federated learning, differential privacy, and secure multi-party computation for privacy-conscious AI development.',
  'As data protection regulations tighten globally, organisations must balance model accuracy with individual privacy. This whitepaper surveys state-of-the-art privacy-preserving ML techniques, analyses accuracy-privacy trade-offs across real-world scenarios, and provides a decision framework for practitioners selecting appropriate methods for their use cases.',
  '/uploads/ppml-techniques-tradeoffs.pdf',
  NULL,
  'whitepaper',
  4
),
(
  'Generative AI Governance: Legal and Ethical Dimensions',
  'An interdisciplinary analysis of intellectual property, liability, misinformation risks, and ethical issues arising from generative AI deployment.',
  'The rapid proliferation of generative AI — text, image, code, and multimodal models — introduces novel legal uncertainties around copyright, defamation, deepfakes, and autonomous decision-making. This whitepaper analyses existing Indian and international law, identifies regulatory gaps, and proposes a governance framework for responsible generative AI deployment.',
  '/uploads/genai-governance-legal-ethical.pdf',
  NULL,
  'whitepaper',
  4
),

-- Products (uploader_id = 5 = product_company user)
(
  'SafeGuard AI: Enterprise LLM Security Scanner',
  'An automated tool to detect prompt injection, jailbreaks, data exfiltration risks, and policy violations in LLM-powered applications.',
  'SafeGuard AI is a cloud-native security scanner purpose-built for enterprise LLM deployments. It continuously probes your AI applications against a library of 500+ attack patterns, generates detailed vulnerability reports, and integrates into CI/CD pipelines via REST API and GitHub Actions. Supports GPT-4, Claude, Gemini, Llama, and custom model endpoints.',
  NULL,
  'https://safeai.io/demo/safeguard',
  'product',
  5
),
(
  'ComplianceIQ: AI Regulatory Compliance Tracker',
  'A SaaS dashboard that tracks your organisation''s compliance posture across EU AI Act, NIST AI RMF, and ISO 42001 in real time.',
  'ComplianceIQ aggregates data from your model documentation, audit logs, and technical controls to produce live compliance scorecards against multiple regulatory frameworks. It auto-generates evidence packs for audits, sends alerts for upcoming regulatory deadlines, and provides a task management system for remediation workflows.',
  NULL,
  'https://complianceiq.ai/demo',
  'product',
  5
),
(
  'BiasScan Pro: Fairness Auditing Platform',
  'Automated fairness analysis tool that detects, measures, and helps mitigate demographic bias in ML model predictions.',
  'BiasScan Pro connects directly to your model via API or SDK and runs comprehensive fairness audits across 15+ bias metrics including disparate impact, equalised odds, and counterfactual fairness. It generates explainable reports with visualisations, suggests debiasing strategies, and tracks fairness improvements over model versions in a continuous monitoring dashboard.',
  NULL,
  'https://biasscan.pro/demo',
  'product',
  5
),
(
  'DataLineage AI: Model Traceability & Governance Platform',
  'End-to-end data and model lineage tracking for enterprises building and deploying AI at scale.',
  'DataLineage AI provides full visibility into the provenance of training data, feature engineering pipelines, model versions, and deployment configurations. Every prediction can be traced back to its data sources and model states, supporting regulatory obligations under the EU AI Act and enabling rapid incident response when model behaviour degrades or causes harm.',
  NULL,
  'https://datalineage.ai/demo',
  'product',
  5
);

-- =============================================
-- NEWS (5 items)
-- =============================================
INSERT INTO news (title, summary, link) VALUES
(
  'EU AI Act Enters Application Phase: Key Deadlines for 2026',
  'The EU AI Act''s provisions for high-risk AI systems come into full force in August 2026. Organisations have until June 2026 to register systems in the EU database. ARC has released a compliance roadmap to assist members.',
  'https://arc.com/news/eu-ai-act-2026-deadlines'
),
(
  'India''s NITI Aayog Releases Draft AI Governance Framework',
  'NITI Aayog has published a draft national framework for responsible AI development in India, open for public comment until March 31, 2026. The framework references ARC''s published guidelines on bias and accountability.',
  'https://arc.com/news/niti-aayog-ai-framework-2026'
),
(
  'OpenAI GPT-5 Safety Card Published: What It Means for Enterprise Risk',
  'OpenAI released the safety evaluation card for GPT-5, detailing red team results, limitations, and recommended deployment guardrails. ARC''s research team has published an expert analysis of the findings.',
  'https://arc.com/news/openai-gpt5-safety-analysis'
),
(
  'ARC Welcomes 50th University Partner: University of Mumbai Joins',
  'The University of Mumbai''s Centre for AI Policy and Ethics has joined ARC as the 50th university partner, contributing original research on AI in healthcare governance and data localisation policy.',
  'https://arc.com/news/university-mumbai-joins-arc'
),
(
  'New ISO/IEC 42001 Certification Bodies Accredited in India',
  'The Bureau of Indian Standards has accredited four new certification bodies for ISO/IEC 42001 (AI Management Systems) in India, making it easier for Indian organisations to achieve internationally recognised AI governance certification.',
  'https://arc.com/news/iso42001-certification-india'
);

-- =============================================
-- QNA POSTS (6 posts)
-- =============================================
INSERT INTO qna_posts (title, body, tags, author_id, vote_count, answer_count) VALUES
(
  'What is the most practical starting point for EU AI Act compliance for a mid-size startup?',
  'Our startup has about 80 employees and we deploy an AI-powered credit scoring model. We''ve been reading about the EU AI Act and it seems overwhelming. Where should we begin? Do we need to register the model now or wait until the high-risk provisions apply? Any frameworks or checklists would be extremely helpful.',
  'eu-ai-act,compliance,startup,credit-scoring',
  3,
  12,
  3
),
(
  'How do we handle data subject rights (right to explanation) for our ML model decisions?',
  'Under GDPR Article 22 and the upcoming EU AI Act, individuals have the right to an explanation when automated decisions significantly affect them. Our model makes loan approval decisions. What technical approaches exist to provide meaningful explanations? Are SHAP values legally sufficient or do we need something more?',
  'gdpr,explainability,xai,shap,loan-decisions',
  2,
  18,
  2
),
(
  'Best open-source tools for red-teaming LLM-powered applications in 2025?',
  'We are building an LLM-powered HR assistant and our security team needs to red-team it before production launch. Looking for open-source tools that can test for prompt injection, jailbreaks, sensitive data leakage, and harmful content generation. What does the community recommend? Any experience with Garak or PyRIT?',
  'llm-security,red-teaming,prompt-injection,garak,pyrit,open-source',
  6,
  25,
  3
),
(
  'What does ISO 42001 certification actually require operationally?',
  'Our CTO wants us to pursue ISO/IEC 42001 certification. I''ve read the standard but I''m struggling to understand what it means practically — what documents do we need, what processes do we need to establish, and roughly how long does the certification journey take? Is there a gap analysis template available?',
  'iso-42001,certification,audit,ai-management-system',
  3,
  9,
  2
),
(
  'How should we approach bias testing for a hiring algorithm used in India?',
  'We use an AI model to screen job applications at our company. With increasing scrutiny from regulators and press, we want to proactively audit our model for demographic bias. Given India''s specific demographics and protected characteristics under labour law, what testing methodology should we follow? What metrics matter most?',
  'bias,fairness,hiring,india,labour-law,demographic-parity',
  6,
  21,
  3
),
(
  'Is there a difference between AI safety and AI security? How should we frame our governance programme?',
  'I''ve noticed that different organisations use "AI safety" and "AI security" almost interchangeably, while others treat them as distinct disciplines. As we build our AI governance programme from scratch, I want to frame it correctly. Could someone clarify the conceptual distinction and how it should inform our organisational structure and risk taxonomy?',
  'ai-safety,ai-security,governance,risk-taxonomy,definitions',
  2,
  14,
  2
);

-- =============================================
-- QNA ANSWERS (2-3 per post)
-- =============================================

-- Answers for post 1 (EU AI Act compliance for startup)
INSERT INTO qna_answers (post_id, author_id, body) VALUES
(1, 1, 'Great question. Since your credit scoring model falls under Annex III of the EU AI Act (high-risk AI in credit assessment), you are subject to the full high-risk obligations — conformity assessment, technical documentation, human oversight measures, and registration in the EU database. I recommend starting with a gap analysis against the ARC ISO 42001 checklist available in our Resources section, then prioritising your data governance documentation as that is typically the largest gap. The EU database registration portal opens for voluntary registration now and becomes mandatory by August 2026.'),
(1, 4, 'I''d add that for credit scoring specifically, you also need to be mindful of GDPR Article 22 requirements running in parallel with the AI Act. Your conformity assessment should integrate both frameworks. Our research group at IIT Delhi has published a whitepaper (available in Resources) that maps both frameworks onto each other specifically for the BFSI sector. Happy to share additional academic references as well.'),
(1, 3, 'From a practical day-one standpoint: first classify your AI system correctly under the EU AI Act annexes, then establish a System Risk Management file (a living document that you will update throughout development). You don''t need to have everything perfect from day one — the Act follows a risk-based approach and regulators will want to see a credible, improving programme rather than perfection initially.');

-- Answers for post 2 (GDPR right to explanation)
INSERT INTO qna_answers (post_id, author_id, body) VALUES
(2, 1, 'SHAP values alone are generally not considered legally sufficient for GDPR Article 22 compliance. The regulation requires a "meaningful explanation" which courts have interpreted as needing to explain not just which features contributed but why — in terms understandable to a layperson. A combination of contrastive explanations ("you were declined because your income was X; if it were Y you would have been approved") and feature importance narratives tends to satisfy both regulatory and user comprehension requirements. We recommend additionally maintaining a full audit trail of each decision.'),
(2, 4, 'From an academic perspective, there is active research on this exact question. The landmark Wachter et al. (2017) paper on counterfactual explanations is worth reading. For production systems, LIME provides model-agnostic local explanations that are often more interpretable to end users than SHAP. That said, no single technical standard has been codified yet — the EU AI Act leaves implementation flexibility, which means the standard will be set by early enforcement cases. I''d strongly recommend involving legal counsel alongside your technical decisions here.');

-- Answers for post 3 (Red-teaming LLMs)
INSERT INTO qna_answers (post_id, author_id, body) VALUES
(3, 1, 'For open-source LLM red-teaming, the two most mature tools right now are Garak (specifically designed for LLM vulnerability scanning with probes for over 20 attack categories) and Microsoft''s PyRIT (Python Risk Identification Toolkit for Generative AI). Both are production-ready. Garak is better for automated scanning across many probes; PyRIT is better for orchestrating iterative, multi-turn adversarial scenarios which more closely match real attacker behaviour. For an HR assistant specifically, I''d prioritise testing for PII leakage, prompt injection via crafted CVs, and biased hiring suggestions.'),
(3, 5, 'We built our own internal red-teaming suite on top of Garak and found it extremely effective for systematic coverage testing. One thing to note: open-source tools are great for known attack patterns but you also need human red-teamers for creative adversarial testing, especially for domain-specific abuse cases in HR (e.g., gamifying the system through keyword stuffing in CVs). We also use our SafeGuard AI product which wraps Garak with a continuous monitoring layer — happy to arrange a demo if useful.'),
(3, 4, 'Academic perspective: Perez et al.''s "Ignore Previous Prompt" paper (2022) is the foundational reference for prompt injection. More recently the MITRE ATLAS framework provides a comprehensive taxonomy of adversarial ML attacks that is very useful for structuring your red-team scope. I would recommend mapping your test cases to ATLAS ATT&CK techniques to ensure systematic coverage.');

-- Answers for post 4 (ISO 42001 certification)
INSERT INTO qna_answers (post_id, author_id, body) VALUES
(4, 1, 'ISO 42001 certification typically takes 9-18 months for a first-time applicant. The core mandatory documents include: AI Policy, Organisational Objectives for AI, Risk Assessment methodology and results, Statement of Applicability, Internal Audit reports, and Management Review minutes. The ARC ISO 42001 Checklist & Gap Analysis Template in our Resources section covers all 120+ control questions and is specifically designed to help you identify your current gaps and prioritise remediation. I also recommend engaging an accredited certification body early — they can conduct a Stage 1 readiness assessment that gives you a clear roadmap.'),
(4, 4, 'One practical tip: ISO 42001 is a management systems standard, meaning it is more about having documented, repeatable processes than specific technical implementations. Organisations that already hold ISO 27001 certification will find significant overlap in governance structures. If you have 27001, you can likely achieve 42001 in 6 months by extending existing controls to cover AI-specific risks. If starting from zero, build your documentation layer by layer: start with the AI Policy and Risk Framework before touching procedural controls.');

-- Answers for post 5 (Bias testing for hiring in India)
INSERT INTO qna_answers (post_id, author_id, body) VALUES
(5, 4, 'For India specifically, the relevant protected characteristics under labour law include gender, caste (Scheduled Castes/Scheduled Tribes), religion, and place of origin. I''d recommend testing for disparate impact across all these dimensions using the 80% (4/5ths) rule as your primary threshold metric. Additionally, test for equalised odds across groups if your model is a binary classifier, and conduct counterfactual fairness testing — holding all other features constant, does changing only the protected attribute change the outcome? Our whitepaper on bias in Indian hiring markets (available in Resources) provides specific methodology guidance.'),
(5, 5, 'BiasScan Pro (our product, full disclosure) supports all the metrics Prof. Sharma mentions and is specifically configured with Indian demographic categories. It can connect to your model API and run an automated audit overnight. That said, automated tools are a starting point — we always recommend pairing with a human review of model documentation and training data provenance, since many biases are introduced long before the model architecture stage.'),
(5, 1, 'One additional consideration: even after finding and mitigating bias statistically, document everything meticulously. Indian labour authorities and courts increasingly expect organisations to demonstrate due diligence through documentation of the bias discovery, the mitigations applied, and ongoing monitoring commitments. ARC''s algorithmic accountability framework for financial services (also applicable to HR) provides the documentation templates for this.');

-- Answers for post 6 (AI safety vs AI security)
INSERT INTO qna_answers (post_id, author_id, body) VALUES
(6, 1, 'The distinction is conceptually meaningful and practically important. AI Safety primarily concerns preventing AI systems from behaving in unintended or harmful ways — including alignment failures, value misspecification, distributional shift, and catastrophic misuse. AI Security focuses on protecting AI systems (and the data they process) from deliberate adversarial attacks — prompt injection, model extraction, data poisoning, and evasion attacks. In your governance programme, Safety maps to your Model Risk Management team and development lifecycle controls; Security maps to your InfoSec/Red Team function. However, the two disciplines increasingly overlap — a prompt injection attack is simultaneously a security incident and a safety failure.'),
(6, 2, 'Practically: structure your governance programme to have both a "Responsible AI" stream (covering safety, ethics, fairness, explainability) and a "AI Security" stream (covering adversarial robustness, data protection, access controls). Both report to the same AI Governance Committee but have distinct technical teams and frameworks. The NIST AI RMF covers both under its MANAGE function, which is why it''s become the dominant framework for integrated AI governance programmes internationally.');
