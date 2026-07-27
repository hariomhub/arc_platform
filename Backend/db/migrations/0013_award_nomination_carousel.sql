-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Homepage "Nominations Open" carousel
--   Purely a display-control layer on top of the existing awards/self-nomination
--   flow — does NOT gate self-nomination submissions. When nominations_open is
--   true and a banner image is set, the award appears as a slide in the
--   homepage carousel; awards.description (already exists) is reused as the
--   slide's descriptive copy.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE awards
  ADD COLUMN nominations_open     BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active,
  ADD COLUMN nominations_close_at DATETIME NULL AFTER nominations_open,
  ADD COLUMN banner_image_url     VARCHAR(500) NULL AFTER nominations_close_at;
