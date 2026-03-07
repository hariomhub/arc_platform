-- ═══════════════════════════════════════════════════════════════════════════
-- AI Risk Framework Content Management Schema
-- ═══════════════════════════════════════════════════════════════════════════
-- This schema supports dynamic admin-managed content for the AI Risk Framework
-- including Core Pillars, Maturity Levels, Implementation Guide, and Audit Templates.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Framework Core Pillars ───────────────────────────────────────────────────

CREATE TABLE framework_pillars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  tags JSON COMMENT 'Array of tag strings: ["NIST AI RMF", "ISO 23894", "Taxonomy"]',
  insight TEXT NOT NULL COMMENT 'Key insight or callout for this pillar',
  display_order INT NOT NULL DEFAULT 0 COMMENT 'Controls display sequence (lower numbers appear first)',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL COMMENT 'User ID of creator',
  updated_by INT COMMENT 'User ID of last updater',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_framework_pillars_status ON framework_pillars(status);
CREATE INDEX idx_framework_pillars_display_order ON framework_pillars(display_order);

-- ─── Framework Maturity Levels ────────────────────────────────────────────────

CREATE TABLE framework_maturity_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level TINYINT NOT NULL COMMENT 'Maturity level number (1-4)',
  name VARCHAR(100) NOT NULL COMMENT 'Level name: Foundational, Defined, Managed, Optimized',
  color VARCHAR(7) NOT NULL DEFAULT '#64748B' COMMENT 'Hex color code for UI display',
  light_bg VARCHAR(7) NOT NULL DEFAULT '#F8FAFC' COMMENT 'Light background color for cards',
  border_color VARCHAR(7) NOT NULL DEFAULT '#E2E8F0' COMMENT 'Border color for cards',
  description TEXT NOT NULL,
  characteristics JSON NOT NULL COMMENT 'Array of characteristic strings',
  actions JSON NOT NULL COMMENT 'Array of recommended action strings',
  percentage INT NOT NULL DEFAULT 25 COMMENT 'Progress percentage for visual indicator',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_level (level),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_framework_maturity_status ON framework_maturity_levels(status);
CREATE INDEX idx_framework_maturity_level ON framework_maturity_levels(level);

-- ─── Framework Implementation Phases ──────────────────────────────────────────

CREATE TABLE framework_implementation_phases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phase_number TINYINT NOT NULL COMMENT 'Phase sequence (1, 2, 3, 4)',
  phase_label VARCHAR(50) NOT NULL COMMENT 'e.g., "Phase 1", "Phase 2"',
  title VARCHAR(255) NOT NULL COMMENT 'Phase title: e.g., "Governance Foundation"',
  duration VARCHAR(50) NOT NULL COMMENT 'Time estimate: e.g., "0–3 months"',
  icon VARCHAR(10) DEFAULT '🏛️' COMMENT 'Emoji icon for visual representation',
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_phase_number (phase_number),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_implementation_phases_status ON framework_implementation_phases(status);
CREATE INDEX idx_implementation_phases_order ON framework_implementation_phases(display_order);

-- ─── Framework Implementation Steps ───────────────────────────────────────────

CREATE TABLE framework_implementation_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phase_id INT NOT NULL COMMENT 'Foreign key to framework_implementation_phases',
  step_number VARCHAR(10) NOT NULL COMMENT 'Step identifier: e.g., "1.1", "2.3"',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (phase_id) REFERENCES framework_implementation_phases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_implementation_steps_phase ON framework_implementation_steps(phase_id);
CREATE INDEX idx_implementation_steps_status ON framework_implementation_steps(status);
CREATE INDEX idx_implementation_steps_order ON framework_implementation_steps(display_order);

-- ─── Framework Audit Templates ────────────────────────────────────────────────

CREATE TABLE framework_audit_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id VARCHAR(20) NOT NULL COMMENT 'Human-readable ID: e.g., "T-01", "T-02"',
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL COMMENT 'Governance, Risk Assessment, Third-Party Risk, Regulatory, etc.',
  format VARCHAR(100) NOT NULL COMMENT 'e.g., "Excel / PDF", "Word / Notion"',
  description TEXT NOT NULL,
  fields JSON NOT NULL COMMENT 'Array of field/section names included in the template',
  file_url VARCHAR(500) COMMENT 'Path to downloadable template file',
  file_name VARCHAR(255) COMMENT 'Original file name',
  file_type VARCHAR(100) COMMENT 'MIME type or extension',
  file_size INT COMMENT 'File size in bytes',
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_template_id (template_id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_templates_category ON framework_audit_templates(category);
CREATE INDEX idx_audit_templates_status ON framework_audit_templates(status);
CREATE INDEX idx_audit_templates_order ON framework_audit_templates(display_order);

-- ─── Security Tools Reference (Optional) ──────────────────────────────────────
-- This table stores security tools referenced in the Framework page
-- Currently hardcoded in Framework.jsx but can be made dynamic if needed

CREATE TABLE framework_security_tools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL COMMENT 'e.g., "SIEM / SOAR", "EDR", "Data Security"',
  color VARCHAR(7) NOT NULL DEFAULT '#003366' COMMENT 'Brand color hex code',
  description TEXT NOT NULL,
  capabilities JSON NOT NULL COMMENT 'Array of key capability strings',
  framework_alignment TEXT NOT NULL COMMENT 'How this tool aligns with NIST, ISO, EU AI Act, etc.',
  website_url VARCHAR(500) COMMENT 'Vendor website',
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_security_tools_category ON framework_security_tools(category);
CREATE INDEX idx_security_tools_status ON framework_security_tools(status);
CREATE INDEX idx_security_tools_order ON framework_security_tools(display_order);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed Data: Migrate existing hardcoded Framework content to database
-- ═══════════════════════════════════════════════════════════════════════════

-- Assuming admin user with ID 1 exists (created via create-admin.js script)
-- Replace with actual admin user ID if different

-- ─── Seed: Framework Pillars ──────────────────────────────────────────────────

INSERT INTO framework_pillars (title, description, tags, insight, display_order, status, created_by) VALUES
(
  'Risk Identification & Taxonomy',
  'Systematically catalogue all AI risks across technical, ethical, regulatory, and operational domains. Apply a standardised taxonomy aligned to NIST AI RMF and ISO/IEC 23894 to ensure consistent classification across all business units.',
  JSON_ARRAY('NIST AI RMF', 'ISO 23894', 'Taxonomy'),
  'A shared taxonomy eliminates ambiguity when risks are escalated across business units — the most common failure point in enterprise AI governance.',
  1,
  'published',
  1
),
(
  'Governance & Accountability',
  'Establish clear ownership structures — from Board-level oversight to line-of-business accountability. Define roles, responsibilities, and escalation paths so AI decisions are traceable and auditable.',
  JSON_ARRAY('RACI Matrix', 'Board Oversight', 'Escalation'),
  'Without named accountability, governance frameworks become documentation exercises. Ownership must be assigned before risk can be managed.',
  2,
  'published',
  1
),
(
  'Model Risk Management',
  'Apply systematic validation, testing, and monitoring to all AI models throughout their lifecycle. Implement SR 11-7 aligned model risk practices covering design, validation, deployment, and retirement.',
  JSON_ARRAY('SR 11-7', 'Lifecycle Management', 'Validation'),
  'Model drift in production is the most common cause of undetected AI failures. Continuous monitoring is non-negotiable for high-risk systems.',
  3,
  'published',
  1
),
(
  'Regulatory Compliance',
  'Map your AI systems to applicable regulations — EU AI Act, NIST AI RMF, ISO 42001, and sector-specific rules. Maintain living compliance artefacts with automated control mapping and evidence collection.',
  JSON_ARRAY('EU AI Act', 'ISO 42001', 'Controls Mapping'),
  'The EU AI Act becomes fully enforceable in August 2026. Organisations with no compliance programme today are already behind the curve.',
  4,
  'published',
  1
),
(
  'Ethical AI & Fairness',
  'Embed bias detection, explainability, and fairness controls into the AI development lifecycle. Ensure your systems do not cause disparate harm and are aligned to your organisation\'s responsible AI principles.',
  JSON_ARRAY('Bias Detection', 'Explainability', 'XAI'),
  'Fairness is not binary. Define protected attributes and acceptable disparity thresholds before deployment — not after an incident.',
  5,
  'published',
  1
),
(
  'Incident Response & Resilience',
  'Develop and test AI-specific incident response playbooks. Establish detection, containment, communication, and learning processes for AI failures, adversarial attacks, and bias events.',
  JSON_ARRAY('Playbooks', 'Adversarial Defence', 'Recovery'),
  'Average time-to-detect for AI bias incidents exceeds 80 days without dedicated monitoring infrastructure. Playbooks must be tested, not just written.',
  6,
  'published',
  1
);

-- ─── Seed: Framework Maturity Levels ──────────────────────────────────────────

INSERT INTO framework_maturity_levels (level, name, color, light_bg, border_color, description, characteristics, actions, percentage, status, created_by) VALUES
(
  1,
  'Foundational',
  '#64748B',
  '#F8FAFC',
  '#E2E8F0',
  'Ad-hoc risk management with no formal AI governance structure. Risks are addressed reactively and inconsistently.',
  JSON_ARRAY(
    'No dedicated AI risk policy or owner',
    'Model inventory non-existent or informal',
    'Risk assessments performed only after incidents',
    'No third-party AI vendor due diligence'
  ),
  JSON_ARRAY(
    'Appoint an AI Risk Owner or Committee',
    'Begin inventorying all AI/ML systems in use',
    'Draft a preliminary AI Acceptable Use Policy'
  ),
  25,
  'published',
  1
),
(
  2,
  'Defined',
  '#003366',
  '#EFF6FF',
  '#BFDBFE',
  'Standardised definitions and baseline controls are documented. Governance exists but is not consistently applied.',
  JSON_ARRAY(
    'Formal AI governance policy documented',
    'Basic model register maintained',
    'Risk taxonomy defined and communicated',
    'Initial bias and fairness checks performed'
  ),
  JSON_ARRAY(
    'Implement a standardised model risk assessment template',
    'Establish a mandatory AI procurement checklist',
    'Train all AI project leads on governance policy'
  ),
  50,
  'published',
  1
),
(
  3,
  'Managed',
  '#0369A1',
  '#EFF6FF',
  '#BFDBFE',
  'Quantitative metrics are tracked and governance controls are continuously monitored across the AI lifecycle.',
  JSON_ARRAY(
    'KRIs and KPIs tracked for all material AI systems',
    'Continuous model drift and bias monitoring active',
    'Third-party AI audit completed annually',
    'Incident response playbook tested and operational'
  ),
  JSON_ARRAY(
    'Integrate AI risk metrics into ERM dashboard',
    'Conduct annual red-team exercise on critical AI systems',
    'Deploy automated model monitoring tooling'
  ),
  75,
  'published',
  1
),
(
  4,
  'Optimized',
  '#065F46',
  '#ECFDF5',
  '#A7F3D0',
  'Adaptive governance with real-time feedback loops. AI risk management is embedded across the entire organisation.',
  JSON_ARRAY(
    'Real-time AI risk dashboard available to board',
    'Fully automated model validation pipeline',
    'AI governance integrated with enterprise ESG reporting',
    'Continuous regulatory horizon scanning in place'
  ),
  JSON_ARRAY(
    'Publish annual AI Transparency Report',
    'Contribute to industry standards and working groups',
    'Evolve governance to address agentic and generative AI'
  ),
  100,
  'published',
  1
);

-- ─── Seed: Framework Implementation Phases ────────────────────────────────────

INSERT INTO framework_implementation_phases (phase_number, phase_label, title, duration, icon, display_order, status, created_by) VALUES
(1, 'Phase 1', 'Governance Foundation', '0–3 months', '🏛️', 1, 'published', 1),
(2, 'Phase 2', 'Risk Assessment', '3–6 months', '🔍', 2, 'published', 1),
(3, 'Phase 3', 'Controls & Monitoring', '6–12 months', '🛡️', 3, 'published', 1),
(4, 'Phase 4', 'Audit & Optimisation', 'Ongoing', '📊', 4, 'published', 1);

-- ─── Seed: Framework Implementation Steps ─────────────────────────────────────

-- Phase 1: Governance Foundation
INSERT INTO framework_implementation_steps (phase_id, step_number, title, description, display_order, status, created_by) VALUES
(1, '1.1', 'Establish an AI Risk Committee', 'Form a cross-functional committee including Legal, Compliance, IT, and Business unit heads. Define charter, cadence, and escalation paths.', 1, 'published', 1),
(1, '1.2', 'Appoint an AI Risk Owner', 'Designate a senior individual (CISO, Chief Risk Officer, or equivalent) as accountable owner for the AI Risk Framework.', 2, 'published', 1),
(1, '1.3', 'Draft the AI Acceptable Use Policy', 'Document approved AI use cases, prohibited applications, data handling requirements, and employee obligations.', 3, 'published', 1),
(1, '1.4', 'Build the AI System Inventory', 'Catalogue all AI/ML systems in production, development, and evaluation. Include vendor-provided and embedded AI features.', 4, 'published', 1);

-- Phase 2: Risk Assessment
INSERT INTO framework_implementation_steps (phase_id, step_number, title, description, display_order, status, created_by) VALUES
(2, '2.1', 'Apply the AI Risk Classification Matrix', 'Classify each system by impact (high/medium/low) and risk domain (bias, security, operational, reputational). Align to EU AI Act risk tiers where applicable.', 1, 'published', 1),
(2, '2.2', 'Conduct Model Risk Assessments', 'For each material AI system, complete a structured MRA covering model purpose, training data quality, validation approach, and residual risk.', 2, 'published', 1),
(2, '2.3', 'Perform Vendor AI Due Diligence', 'Assess third-party AI tools against the ARC Vendor Assessment Template covering transparency, security, bias controls, and contractual safeguards.', 3, 'published', 1),
(2, '2.4', 'Map Regulatory Obligations', 'Identify applicable AI regulations (EU AI Act, NIST AI RMF, ISO 42001, sector-specific rules) and map them to internal controls.', 4, 'published', 1);

-- Phase 3: Controls & Monitoring
INSERT INTO framework_implementation_steps (phase_id, step_number, title, description, display_order, status, created_by) VALUES
(3, '3.1', 'Implement Technical Controls', 'Deploy model explainability tools, drift detection, differential privacy where required, and adversarial robustness testing.', 1, 'published', 1),
(3, '3.2', 'Establish Continuous Monitoring', 'Define KRIs, KPIs, and alert thresholds for all high-risk AI systems. Integrate with existing SIEM and risk dashboards.', 2, 'published', 1),
(3, '3.3', 'Build an AI Incident Response Plan', 'Define roles, escalation paths, communication protocols, and remediation playbooks for AI-specific incidents including bias events and model failures.', 3, 'published', 1);

-- Phase 4: Audit & Optimisation
INSERT INTO framework_implementation_steps (phase_id, step_number, title, description, display_order, status, created_by) VALUES
(4, '4.1', 'Conduct Annual AI Governance Audit', 'Assess adherence to the framework, control effectiveness, and regulatory changes. Produce a formal audit report for the Board.', 1, 'published', 1),
(4, '4.2', 'Publish an AI Transparency Report', 'Disclose material AI use cases, governance posture, and risk mitigations to stakeholders. Align to emerging disclosure standards.', 2, 'published', 1),
(4, '4.3', 'Iterate the Framework', 'Update the framework annually to reflect new AI capabilities (agents, multimodal models), regulatory developments, and lessons learned.', 3, 'published', 1);

-- ─── Seed: Framework Audit Templates ──────────────────────────────────────────

INSERT INTO framework_audit_templates (template_id, title, category, format, description, fields, display_order, status, created_by) VALUES
(
  'T-01',
  'AI System Intake & Classification Form',
  'Governance',
  'Excel / PDF',
  'Used at the point of procuring or deploying any new AI system. Captures system purpose, owner, data inputs, intended user base, and initial risk classification.',
  JSON_ARRAY(
    'System Name & Owner',
    'Business Use Case',
    'Data Sources & Sensitivity',
    'Regulatory Applicability',
    'Initial Risk Tier (High / Medium / Low)',
    'Approval Signatures'
  ),
  1,
  'published',
  1
),
(
  'T-02',
  'Model Risk Assessment (MRA) Template',
  'Risk Assessment',
  'Word / Notion',
  'A structured 6-section assessment covering model purpose, design, validation, deployment controls, monitoring, and residual risk — aligned to SR 11-7 and NIST AI RMF.',
  JSON_ARRAY(
    'Model Purpose & Scope',
    'Training Data Lineage',
    'Validation Methodology & Results',
    'Known Limitations & Risks',
    'Monitoring Controls',
    'Residual Risk Rating & Sign-off'
  ),
  2,
  'published',
  1
),
(
  'T-03',
  'AI Vendor Due Diligence Questionnaire',
  'Third-Party Risk',
  'Excel',
  'A 40-question structured questionnaire for assessing external AI vendors and SaaS providers embedding AI. Covers transparency, data handling, bias controls, security, and contractual protections.',
  JSON_ARRAY(
    'Company & Product Overview',
    'Data Privacy & Processing',
    'Model Transparency & Explainability',
    'Bias & Fairness Controls',
    'Security Certifications (SOC 2, ISO 27001)',
    'Contractual AI Obligations'
  ),
  3,
  'published',
  1
),
(
  'T-04',
  'EU AI Act Compliance Checklist',
  'Regulatory',
  'PDF / Excel',
  'A clause-mapped checklist for organisations subject to the EU AI Act. Covers high-risk system obligations, GPAI model requirements, and transparency rules with compliance status tracking.',
  JSON_ARRAY(
    'System Classification',
    'Mandatory Documentation Requirements',
    'Conformity Assessment Status',
    'GPAI Obligations (if applicable)',
    'Post-Market Monitoring Plan',
    'Regulatory Submission Tracker'
  ),
  4,
  'published',
  1
),
(
  'T-05',
  'AI Incident Report Template',
  'Incident Response',
  'Word / Jira',
  'Standardised incident report for logging and investigating AI-related failures including bias events, adversarial attacks, data breaches, and model malfunctions.',
  JSON_ARRAY(
    'Incident Summary & Timeline',
    'Systems & Data Affected',
    'Root Cause Analysis',
    'Regulatory Notification Required?',
    'Remediation Actions & Owner',
    'Lessons Learned & Framework Updates'
  ),
  5,
  'published',
  1
),
(
  'T-06',
  'Annual AI Governance Audit Report',
  'Audit',
  'Word / PowerPoint',
  'A board-ready annual audit report template assessing the overall health of the AI governance framework, control effectiveness, and compliance status.',
  JSON_ARRAY(
    'Scope & Methodology',
    'AI System Portfolio Review',
    'Control Effectiveness Ratings',
    'Regulatory Compliance Status',
    'Key Findings & Risk Ratings',
    'Management Action Plan'
  ),
  6,
  'published',
  1
);

-- ═══════════════════════════════════════════════════════════════════════════
-- End of Framework Schema
-- ═══════════════════════════════════════════════════════════════════════════
