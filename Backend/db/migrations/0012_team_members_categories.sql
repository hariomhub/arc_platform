-- ════════════════════════════════════════════════════════════════════════════
-- Migration: About Us leadership categorization
--   team_members (admin-curated, no link to real user accounts) now supports
--   grouping into "Founding Members" / "Permanent Members" (the About-Us
--   public label for Chapter Leads), plus a cross-cutting "Governing Body"
--   flag — a person can be both a Founding Member AND on the Governing Body,
--   since real boards are drawn from senior members rather than being a
--   separate pool of people.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE team_members
  ADD COLUMN member_category ENUM('founding','permanent') NOT NULL DEFAULT 'founding' AFTER role,
  ADD COLUMN is_governing_body BOOLEAN NOT NULL DEFAULT FALSE AFTER member_category;
