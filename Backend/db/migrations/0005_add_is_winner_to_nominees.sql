-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add is_winner flag to nominees table
-- Run once against your live database (racdbp)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Add is_winner column to nominees table ─────────────────────────────────
ALTER TABLE nominees
  ADD COLUMN is_winner BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active;

-- ── 2. Verify ────────────────────────────────────────────────────────────────
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM   information_schema.COLUMNS
WHERE  TABLE_SCHEMA = DATABASE()
  AND  TABLE_NAME   = 'nominees'
ORDER BY ORDINAL_POSITION;
