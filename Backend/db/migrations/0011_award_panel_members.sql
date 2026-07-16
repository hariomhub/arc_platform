-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Jury & Presenters as a dedicated, award-scoped concept
--   Reverts the earlier approach of tagging generic team_members with a
--   group_type — that table is solely the About Us / leadership roster for
--   permanent/founding members and should stay that way.
--
--   Jury and presenters now live in their own table, each optionally linked
--   to one or more specific awards via a junction table. A member with NO
--   assignment rows is treated as "applies to all awards" (global) — the
--   simplest default, with per-award scoping available when needed.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE team_members DROP COLUMN group_type;

CREATE TABLE IF NOT EXISTS award_panel_members (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  role         VARCHAR(255) NULL,
  panel_type   ENUM('jury','presenter') NOT NULL,
  photo_url    VARCHAR(500) NULL,
  linkedin_url VARCHAR(500) NULL,
  bio          TEXT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_panel_type (panel_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS award_panel_assignments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  panel_member_id  INT NOT NULL,
  award_id         INT NOT NULL,
  FOREIGN KEY (panel_member_id) REFERENCES award_panel_members(id) ON DELETE CASCADE,
  FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE,
  UNIQUE KEY uq_panel_award (panel_member_id, award_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
