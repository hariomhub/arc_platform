-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add missing `email` column to team_members
--   teamController.js (createTeamMember/updateTeamMember) and the admin Team
--   form have always sent an `email` field, but the table never had this
--   column — every team member create/update has been failing with
--   "Unknown column 'email' in field list". Adding it here since this
--   migration already touches team_members for the self-nomination feature.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE team_members
  ADD COLUMN email VARCHAR(255) NULL AFTER linkedin_url;
