-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add rich fields to events table
-- Run once against your live database (racdbp)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Add new columns to events table ────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN thumbnail_url       VARCHAR(500)                              DEFAULT NULL  AFTER banner_image,
  ADD COLUMN speaker_name        VARCHAR(255)                              DEFAULT NULL,
  ADD COLUMN speaker_title       VARCHAR(255)                              DEFAULT NULL,
  ADD COLUMN speaker_bio         TEXT                                      DEFAULT NULL,
  ADD COLUMN speaker_photo_url   VARCHAR(500)                              DEFAULT NULL,
  ADD COLUMN speaker_linkedin_url VARCHAR(500)                             DEFAULT NULL,
  ADD COLUMN event_mode          ENUM('online','in_person','hybrid')       DEFAULT 'online',
  ADD COLUMN time_zone           VARCHAR(100)                              DEFAULT 'UTC',
  ADD COLUMN agenda              TEXT                                      DEFAULT NULL,
  ADD COLUMN tags                JSON                                      DEFAULT NULL,
  ADD COLUMN max_capacity        INT                                       DEFAULT NULL;

-- ── 2. Add conference category to existing ENUM (if not present) ────────────
-- NOTE: MySQL requires re-specifying all ENUM values when altering.
ALTER TABLE events
  MODIFY COLUMN event_category
    ENUM('webinar','seminar','workshop','podcast','conference') NOT NULL;

-- ── 3. Verify ────────────────────────────────────────────────────────────────
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM   information_schema.COLUMNS
WHERE  TABLE_SCHEMA = DATABASE()
  AND  TABLE_NAME   = 'events'
ORDER BY ORDINAL_POSITION;
