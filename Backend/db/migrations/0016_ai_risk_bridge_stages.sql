-- ════════════════════════════════════════════════════════════════════════════
-- Migration: AI Risk Bridge Model (THE BRIDGE™) — replaces the flat six-pillar
-- "Core Pillars of Oversight" list on the public Framework page with a
-- five-stage lifecycle: Exposure → Obligation → Integrity → Defense → Continuity.
--
-- The old `framework_pillars` and `framework_maturity_levels` tables and their
-- admin CRUD are left untouched — they simply stop being fetched by the public
-- Framework page. Nothing is deleted; this is reversible.
--
-- Also corrects a stale citation surfaced during the framework review:
-- SR 11-7 (superseded 17 April 2026 by SR 26-2) in the existing pillar and
-- audit-template seed data.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE framework_bridge_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stage_key VARCHAR(20) NOT NULL COMMENT 'exposure | obligation | integrity | defense | continuity',
  name VARCHAR(50) NOT NULL COMMENT 'Stage name, e.g. "Exposure"',
  tagline VARCHAR(100) NOT NULL COMMENT 'Short tagline, e.g. "Know what exists"',
  description TEXT NOT NULL COMMENT 'Public-facing summary of what this stage translates technical work into',
  adopter_question TEXT NOT NULL COMMENT 'The question this stage answers for the Adopter (board/exec) persona',
  implementer_question TEXT NOT NULL COMMENT 'The question this stage answers for the Implementer (CIO/CTO) persona',
  artifacts JSON NOT NULL COMMENT 'Array of public-safe artifact/deliverable name strings',
  reference_links JSON NOT NULL COMMENT 'Array of reference strings, e.g. ["NIST AI RMF — MAP function"]',
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_stage_key (stage_key),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bridge_stages_status ON framework_bridge_stages(status);
CREATE INDEX idx_bridge_stages_order ON framework_bridge_stages(display_order);

-- ─── Seed: The five Bridge stages ──────────────────────────────────────────────
-- Content sourced from the verified AI Risk Bridge Model master table. Only the
-- public-safe summary depth is seeded here (no scoring/tiering, no internal
-- "Source Lanes Drawn" / "Concerns" columns) per the framework review's
-- publish-WHY-and-WHAT / withhold-the-HOW guidance.

INSERT INTO framework_bridge_stages
  (stage_key, name, tagline, description, adopter_question, implementer_question, artifacts, reference_links, display_order, status, created_by) VALUES
(
  'exposure',
  'Exposure',
  'Know what exists',
  'Shadow AI discovery, vendor and model inventory, and data-flow maps — translated from raw technical scan results into a plain-language exposure summary a non-technical executive can act on.',
  'What AI is actually being used across my organization, and what''s my overall exposure?',
  'Do we have full technical visibility into every AI tool, model, and agent running in our environment, including shadow AI?',
  JSON_ARRAY('AI Tool & Model Inventory', 'Shadow AI Discovery Report', 'Data Flow / Data Movement Map', 'Exposure Summary Briefing (board-ready)'),
  JSON_ARRAY('NIST AI RMF — MAP function', 'ISO/IEC 42001:2023 — Clause 4 (Context of the Organization)'),
  1, 'published', 1
),
(
  'obligation',
  'Obligation',
  'Know the rules',
  'EU AI Act risk-tier classification, NIST AI RMF functions, and ISO 42001 requirements — translated from legal and regulatory text into an actionable compliance checklist and risk-tier map.',
  'What am I legally and contractually required to do about the AI I''m using, and what''s my liability exposure?',
  'Which specific controls, documentation, and technical safeguards does each regulation or standard actually require us to implement?',
  JSON_ARRAY('Regulatory Applicability Matrix', 'EU AI Act Risk-Tier Classification', 'Compliance Obligation Tracker', 'Executive Compliance Briefing'),
  JSON_ARRAY('EU AI Act — Regulation (EU) 2024/1689', 'NIST AI RMF — GOVERN function', 'ISO/IEC 42001:2023 & ISO/IEC 23894:2023'),
  2, 'published', 1
),
(
  'integrity',
  'Integrity',
  'Verify it''s trustworthy',
  'Bias and fairness audits, hallucination and accuracy benchmarks, and human-oversight design — translated into a trust posture the business can act on before shipping or relying on an output.',
  'Can I trust what this AI produces, and is it being used the way it''s supposed to be used?',
  'Have we tested for bias, verified outputs against ground truth, and built in the human-oversight checkpoints that prevent overtrust or misuse?',
  JSON_ARRAY('Bias & Fairness Audit Report', 'Output Accuracy / Hallucination Benchmark', 'Human-Oversight Design Document', 'Trust Posture Summary (decision-ready)'),
  JSON_ARRAY('NIST AI RMF — MEASURE function', 'ISO/IEC TR 24027:2021 — Bias in AI systems', 'EU AI Act — Art. 10 & Art. 15'),
  3, 'published', 1
),
(
  'defense',
  'Defense',
  'Protect it',
  'Red-team findings, runtime guardrail configuration, and access-control architecture — translated from a security-engineering register into risk-exposure and liability terms for the business.',
  'How do I know my AI systems won''t be attacked, misused, or leak data — and what''s my liability if they are?',
  'Do we have the technical controls in place to prevent prompt injection, model theft, insider misuse, and data leakage?',
  JSON_ARRAY('AI Red-Team / Penetration Test Report', 'Runtime Guardrail Configuration Review', 'Incident Response Plan (AI-specific)', 'Security Posture Summary (risk & liability framing)'),
  JSON_ARRAY('OWASP Top 10 for LLM Applications (2026)', 'OWASP Top 10 for Agentic Applications (2026)', 'MITRE ATLAS', 'NIST AI RMF — MANAGE function'),
  4, 'published', 1
),
(
  'continuity',
  'Continuity',
  'Sustain it',
  'Vendor concentration analysis, model deprecation risk, and workforce readiness — translated into board-level continuity language on one side and CIO-level operational-readiness language on the other.',
  'What happens to my business if the vendor, model, or platform I depend on changes, discontinues, or is acquired?',
  'Is my organization actually able to keep running this responsibly — do we have the skills, monitoring, and process in place long-term?',
  JSON_ARRAY('Vendor Concentration & Lock-In Risk Register', 'Board Continuity Risk Briefing', 'Workforce Readiness Assessment', 'Monitoring & Model-Drift Detection Runbook'),
  JSON_ARRAY('EU AI Act — Art. 4 (AI Literacy)', 'ISO 22301 — Business Continuity Management', 'NIST SP 800-161 — Supply Chain Risk Management'),
  5, 'published', 1
);

-- ─── Fix: SR 11-7 superseded by SR 26-2 (17 April 2026) ───────────────────────
-- Corrects the live "Model Risk Management" pillar and "T-02" audit template
-- seeded by 0001/0002, without editing already-applied migration files.

UPDATE framework_pillars
SET
  description = 'Apply systematic validation, testing, and monitoring to all AI models throughout their lifecycle. Implement SR 26-2 aligned model risk practices covering design, validation, deployment, and retirement.',
  tags = JSON_ARRAY('SR 26-2', 'Lifecycle Management', 'Validation')
WHERE title = 'Model Risk Management';

UPDATE framework_audit_templates
SET description = 'A structured 6-section assessment covering model purpose, design, validation, deployment controls, monitoring, and residual risk — aligned to SR 26-2 and NIST AI RMF.'
WHERE template_id = 'T-02';
