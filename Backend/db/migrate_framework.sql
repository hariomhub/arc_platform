-- Run this script to add Framework tables to your existing database
-- This assumes you already have the main schema with users, events, resources, etc.

USE ai_risk_council;

SOURCE ./framework_schema.sql;

-- Verify tables were created
SHOW TABLES LIKE 'framework_%';

-- Check if data was seeded successfully
SELECT COUNT(*) as pillar_count FROM framework_pillars WHERE status = 'published';
SELECT COUNT(*) as maturity_count FROM framework_maturity_levels WHERE status = 'published';
SELECT COUNT(*) as phase_count FROM framework_implementation_phases WHERE status = 'published';
SELECT COUNT(*) as step_count FROM framework_implementation_steps WHERE status = 'published';
SELECT COUNT(*) as template_count FROM framework_audit_templates WHERE status = 'published';

-- You should see:
-- 6 pillars
-- 4 maturity levels
-- 4 phases
-- 11 steps
-- 6 templates
