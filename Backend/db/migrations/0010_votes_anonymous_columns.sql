-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix anonymous voting schema drift
--   nominationsController.js's castVote() has always read/written
--   votes.is_anonymous / votes.anonymous_email and inserted user_id=NULL for
--   anonymous votes, but the live `votes` table never actually had these
--   columns and user_id was NOT NULL — every anonymous vote attempt has been
--   failing with "Unknown column 'is_anonymous' in 'field list'".
--
--   Also adds a proper unique constraint so duplicate anonymous votes
--   (same email, same category) are rejected at the DB level too, matching
--   the existing uq_vote_per_category behaviour for logged-in members.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE votes
  MODIFY COLUMN user_id INT NULL,
  ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT FALSE AFTER award_id,
  ADD COLUMN anonymous_email VARCHAR(255) NULL AFTER is_anonymous,
  ADD UNIQUE KEY uq_vote_per_category_anon (anonymous_email, category_id);

-- ── Verify ─────────────────────────────────────────────────────────────────
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM   information_schema.COLUMNS
WHERE  TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'votes'
ORDER BY ORDINAL_POSITION;
