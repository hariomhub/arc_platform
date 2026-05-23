-- Migration: 0002_seed_essential_data
-- Description: Seed admin user, awards, and framework content (requires 0001 run first)
-- Created: 2026-05-23

-- ─── Admin User ───────────────────────────────────────────────────────────────
-- Default password: Admin@123 — CHANGE THIS IMMEDIATELY after first login
-- Hash generated with bcrypt rounds=12
INSERT INTO users (name, email, password_hash, role, status, membership_expires_at, organization_name) VALUES
('Admin', 'admin@riskaicouncil.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGDKe5lRxKjU6JrKoC2zXGz0Bwm',
 'founding_member', 'approved',
 DATE_ADD(NOW(), INTERVAL 10 YEAR),
 'AI Risk Council');

-- ─── Seed Awards ─────────────────────────────────────────────────────────────
INSERT INTO awards (name, description, is_active) VALUES
('Top CISO Awards 2026', 'Recognising outstanding Chief Information Security Officers driving AI governance and risk management globally.', TRUE),
('AI Risk Leadership Awards 2026', 'Honouring leaders who have made significant contributions to AI risk frameworks and responsible AI deployment.', TRUE);

INSERT INTO award_categories (award_id, name, timeline) VALUES
(1, 'Best AI Risk Leader', 'quarterly'),
(1, 'Outstanding Security Innovation', 'half-yearly'),
(1, 'AI Governance Champion', 'yearly'),
(2, 'AI Ethics Excellence', 'quarterly'),
(2, 'Risk Framework Pioneer', 'yearly');

-- ─── Seed Framework Content ───────────────────────────────────────────────────
INSERT INTO framework_pillars (title, description, tags, insight, display_order, status, created_by) VALUES
('Risk Identification & Taxonomy', 'Systematically catalogue all AI risks across technical, ethical, regulatory, and operational domains.', JSON_ARRAY('NIST AI RMF', 'ISO 23894', 'Taxonomy'), 'A shared taxonomy eliminates ambiguity when risks are escalated across business units.', 1, 'published', 1),
('Governance & Accountability', 'Establish clear ownership structures from Board-level oversight to line-of-business accountability.', JSON_ARRAY('RACI Matrix', 'Board Oversight', 'Escalation'), 'Without named accountability, governance frameworks become documentation exercises.', 2, 'published', 1),
('Model Risk Management', 'Apply systematic validation, testing, and monitoring to all AI models throughout their lifecycle.', JSON_ARRAY('SR 11-7', 'Lifecycle Management', 'Validation'), 'Model drift in production is the most common cause of undetected AI failures.', 3, 'published', 1),
('Regulatory Compliance', 'Map your AI systems to applicable regulations — EU AI Act, NIST AI RMF, ISO 42001.', JSON_ARRAY('EU AI Act', 'ISO 42001', 'Controls Mapping'), 'The EU AI Act becomes fully enforceable in August 2026.', 4, 'published', 1),
('Ethical AI & Fairness', 'Embed bias detection, explainability, and fairness controls into the AI development lifecycle.', JSON_ARRAY('Bias Detection', 'Explainability', 'XAI'), 'Fairness is not binary. Define protected attributes before deployment.', 5, 'published', 1),
('Incident Response & Resilience', 'Develop and test AI-specific incident response playbooks.', JSON_ARRAY('Playbooks', 'Adversarial Defence', 'Recovery'), 'Average time-to-detect for AI bias incidents exceeds 80 days without dedicated monitoring.', 6, 'published', 1);

INSERT INTO framework_maturity_levels (level, name, color, light_bg, border_color, description, characteristics, actions, percentage, status, created_by) VALUES
(1, 'Foundational', '#64748B', '#F8FAFC', '#E2E8F0', 'Ad-hoc risk management with no formal AI governance structure.', JSON_ARRAY('No dedicated AI risk policy or owner','Model inventory non-existent or informal'), JSON_ARRAY('Appoint an AI Risk Owner or Committee','Begin inventorying all AI/ML systems in use'), 25, 'published', 1),
(2, 'Defined', '#003366', '#EFF6FF', '#BFDBFE', 'Standardised definitions and baseline controls are documented.', JSON_ARRAY('Formal AI governance policy documented','Basic model register maintained'), JSON_ARRAY('Implement a standardised model risk assessment template','Establish a mandatory AI procurement checklist'), 50, 'published', 1),
(3, 'Managed', '#0369A1', '#EFF6FF', '#BFDBFE', 'Quantitative metrics are tracked and governance controls are continuously monitored.', JSON_ARRAY('KRIs and KPIs tracked for all material AI systems','Continuous model drift and bias monitoring active'), JSON_ARRAY('Integrate AI risk metrics into ERM dashboard','Conduct annual red-team exercise'), 75, 'published', 1),
(4, 'Optimized', '#065F46', '#ECFDF5', '#A7F3D0', 'Adaptive governance with real-time feedback loops.', JSON_ARRAY('Real-time AI risk dashboard available to board','Fully automated model validation pipeline'), JSON_ARRAY('Publish annual AI Transparency Report','Contribute to industry standards and working groups'), 100, 'published', 1);

INSERT INTO framework_implementation_phases (phase_number, phase_label, title, duration, icon, display_order, status, created_by) VALUES
(1, 'Phase 1', 'Governance Foundation', '0–3 months', '🏛️', 1, 'published', 1),
(2, 'Phase 2', 'Risk Assessment', '3–6 months', '🔍', 2, 'published', 1),
(3, 'Phase 3', 'Controls & Monitoring', '6–12 months', '🛡️', 3, 'published', 1),
(4, 'Phase 4', 'Audit & Optimisation', 'Ongoing', '📊', 4, 'published', 1);

INSERT INTO framework_implementation_steps (phase_id, step_number, title, description, display_order, status, created_by) VALUES
(1, '1.1', 'Establish an AI Risk Committee', 'Form a cross-functional committee including Legal, Compliance, IT, and Business unit heads.', 1, 'published', 1),
(1, '1.2', 'Appoint an AI Risk Owner', 'Designate a senior individual as accountable owner for the AI Risk Framework.', 2, 'published', 1),
(1, '1.3', 'Draft the AI Acceptable Use Policy', 'Document approved AI use cases, prohibited applications, data handling requirements.', 3, 'published', 1),
(1, '1.4', 'Build the AI System Inventory', 'Catalogue all AI/ML systems in production, development, and evaluation.', 4, 'published', 1),
(2, '2.1', 'Apply the AI Risk Classification Matrix', 'Classify each system by impact and risk domain. Align to EU AI Act risk tiers.', 1, 'published', 1),
(2, '2.2', 'Conduct Model Risk Assessments', 'Complete a structured MRA covering model purpose, training data quality, and validation.', 2, 'published', 1),
(2, '2.3', 'Perform Vendor AI Due Diligence', 'Assess third-party AI tools against the ARC Vendor Assessment Template.', 3, 'published', 1),
(2, '2.4', 'Map Regulatory Obligations', 'Identify applicable AI regulations and map them to internal controls.', 4, 'published', 1),
(3, '3.1', 'Implement Technical Controls', 'Deploy model explainability tools, drift detection, and adversarial robustness testing.', 1, 'published', 1),
(3, '3.2', 'Establish Continuous Monitoring', 'Define KRIs, KPIs, and alert thresholds for all high-risk AI systems.', 2, 'published', 1),
(3, '3.3', 'Build an AI Incident Response Plan', 'Define roles, escalation paths, and remediation playbooks for AI-specific incidents.', 3, 'published', 1),
(4, '4.1', 'Conduct Annual AI Governance Audit', 'Assess adherence to the framework, control effectiveness, and regulatory changes.', 1, 'published', 1),
(4, '4.2', 'Publish an AI Transparency Report', 'Disclose material AI use cases, governance posture, and risk mitigations to stakeholders.', 2, 'published', 1),
(4, '4.3', 'Iterate the Framework', 'Update the framework annually to reflect new AI capabilities and regulatory developments.', 3, 'published', 1);

SELECT 'Migration 0002: Essential seed data inserted.' AS result;
