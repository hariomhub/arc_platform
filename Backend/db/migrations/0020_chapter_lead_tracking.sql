-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 0020_chapter_lead_tracking
-- Description: Tracking tables for the Chapter Lead programme.
--
--   chapter_lead_policy     versioned targets / rates / term length
--   chapter_lead_quarters   per-lead quarterly result snapshots
--   events / executive_workshops  + conducted_at, conducted_by
--   event_hosts             who hosted a podcast / workshop
--   host_requests           a lead's request to host a podcast / workshop
--   blog_posts              authored long-form content (draft -> pending -> published)
--   content_views           de-duplicated view / recording-click tracking
--   feed_posts              + (author_id, created_at) index for quarter counts
--
-- Depends on 0019_chapter_lead_foundation.sql.
-- Re-run safe (see 0019 for the guard pattern).
--
-- NOT included on purpose: revenue / earnings / payout tables. They are added in
-- a later migration together with the payment gateway.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. POLICY (versioned programme config) ─────────────────────────────────
-- The policy in force for a quarter is the latest row with
-- effective_from <= quarter_start. Rates are stored now so the dashboard and
-- Terms can show them, and are used once payments go live.
CREATE TABLE IF NOT EXISTS chapter_lead_policy (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  effective_from         DATE NOT NULL,
  members_target         SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  podcasts_target        SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  posts_min              SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  posts_max              SMALLINT UNSIGNED NOT NULL DEFAULT 15,
  blogs_target           SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  min_goals_met          TINYINT UNSIGNED  NOT NULL DEFAULT 3,
  consecutive_miss_limit TINYINT UNSIGNED  NOT NULL DEFAULT 3,
  term_months            TINYINT UNSIGNED  NOT NULL DEFAULT 18,
  rate_term1             DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  rate_term2             DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  rate_term3             DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  direct_commission_pct  DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  commission_on_renewals TINYINT(1)   NOT NULL DEFAULT 0,
  created_by             INT NULL,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clpol_effective (effective_from),
  CONSTRAINT fk_clpol_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the baseline policy (effective far in the past so it applies to every quarter)
INSERT INTO chapter_lead_policy (effective_from)
SELECT '2000-01-01' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM chapter_lead_policy);

-- ─── 2. QUARTERLY RESULTS ────────────────────────────────────────────────────
-- Written when a quarter closes (or is waived). Targets are copied onto the row
-- so history never changes when the policy is edited later.
-- Consecutive misses are derived from these rows, not stored.
CREATE TABLE IF NOT EXISTS chapter_lead_quarters (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  profile_id      INT NOT NULL,
  quarter_start   DATE NOT NULL,
  quarter_end     DATE NOT NULL,
  status          ENUM('closed','waived') NOT NULL,
  members_actual  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  podcasts_actual SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  posts_actual    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  blogs_actual    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  members_target  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  podcasts_target SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  posts_min       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  posts_max       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  blogs_target    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  min_goals_met   TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  goals_met       TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  met             TINYINT(1) NULL COMMENT 'NULL when waived',
  notes           VARCHAR(500) NULL,
  reviewed_by     INT NULL,
  closed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clq_profile_quarter (profile_id, quarter_start),
  KEY idx_clq_quarter (quarter_start, met),
  CONSTRAINT fk_clq_profile  FOREIGN KEY (profile_id)  REFERENCES chapter_lead_profiles (id),
  CONSTRAINT fk_clq_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. "CONDUCTED" MARKER (set by an admin) ────────────────────────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'conducted_at');
SET @s = IF(@c = 0,
  "ALTER TABLE events
     ADD COLUMN conducted_at DATETIME NULL,
     ADD COLUMN conducted_by INT NULL,
     ADD KEY idx_events_conducted (event_category, conducted_at),
     ADD CONSTRAINT fk_events_conducted_by FOREIGN KEY (conducted_by) REFERENCES users (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'executive_workshops' AND COLUMN_NAME = 'conducted_at');
SET @s = IF(@c = 0,
  "ALTER TABLE executive_workshops
     ADD COLUMN conducted_at DATETIME NULL,
     ADD COLUMN conducted_by INT NULL,
     ADD CONSTRAINT fk_workshops_conducted_by FOREIGN KEY (conducted_by) REFERENCES users (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- The older db/add_executive_workshops.sql created this table WITHOUT these three
-- columns (migration 0001 has them, but its CREATE TABLE IF NOT EXISTS is skipped
-- on a database that already had the table). The workshop save now writes them,
-- so make sure they exist. Each is guarded on its own.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'executive_workshops' AND COLUMN_NAME = 'price');
SET @s = IF(@c = 0, 'ALTER TABLE executive_workshops ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'executive_workshops' AND COLUMN_NAME = 'capacity');
SET @s = IF(@c = 0, 'ALTER TABLE executive_workshops ADD COLUMN capacity INT NULL', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'executive_workshops' AND COLUMN_NAME = 'registration_url');
SET @s = IF(@c = 0, 'ALTER TABLE executive_workshops ADD COLUMN registration_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 4. EVENT HOSTS ──────────────────────────────────────────────────────────
-- Exactly one of event_id / workshop_id is set (validated in application code:
-- MySQL cannot combine a CHECK with the CASCADE foreign keys below).
CREATE TABLE IF NOT EXISTS event_hosts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  event_id    INT NULL,
  workshop_id INT NULL,
  user_id     INT NOT NULL,
  role        ENUM('host','co_host','speaker') NOT NULL DEFAULT 'host',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_eh_event_user    (event_id, user_id),
  UNIQUE KEY uq_eh_workshop_user (workshop_id, user_id),
  KEY idx_eh_user (user_id),
  CONSTRAINT fk_eh_event    FOREIGN KEY (event_id)    REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_eh_workshop FOREIGN KEY (workshop_id) REFERENCES executive_workshops (id) ON DELETE CASCADE,
  CONSTRAINT fk_eh_user     FOREIGN KEY (user_id)     REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. HOST REQUESTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS host_requests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  lead_user_id  INT NOT NULL,
  type          ENUM('podcast','workshop') NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  proposed_date DATETIME NULL,
  status        ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  admin_notes   TEXT NULL,
  reviewed_by   INT NULL,
  reviewed_at   DATETIME NULL,
  event_id      INT NULL COMMENT 'draft event created on approval',
  workshop_id   INT NULL COMMENT 'draft workshop created on approval',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_hr_lead   (lead_user_id, status),
  KEY idx_hr_status (status, created_at),
  CONSTRAINT fk_hr_lead     FOREIGN KEY (lead_user_id) REFERENCES users (id),
  CONSTRAINT fk_hr_reviewer FOREIGN KEY (reviewed_by)  REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_hr_event    FOREIGN KEY (event_id)     REFERENCES events (id) ON DELETE SET NULL,
  CONSTRAINT fk_hr_workshop FOREIGN KEY (workshop_id)  REFERENCES executive_workshops (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. BLOG POSTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  author_id    INT NOT NULL,
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(200) NOT NULL,
  summary      VARCHAR(500) NULL,
  body         MEDIUMTEXT NOT NULL,
  cover_url    VARCHAR(500) NULL,
  status       ENUM('draft','pending','published','rejected') NOT NULL DEFAULT 'draft',
  admin_notes  TEXT NULL,
  reviewed_by  INT NULL,
  published_at DATETIME NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_blog_slug (slug),
  KEY idx_blog_status_pub (status, published_at),
  KEY idx_blog_author     (author_id, status),
  CONSTRAINT fk_blog_author   FOREIGN KEY (author_id)   REFERENCES users (id),
  CONSTRAINT fk_blog_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. CONTENT VIEWS ────────────────────────────────────────────────────────
-- One row per viewer per item per day. viewer_hash = SHA-256 of the user id, or
-- of ip + user-agent + a server secret for anonymous visitors.
CREATE TABLE IF NOT EXISTS content_views (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_type ENUM('post','blog','event','workshop') NOT NULL,
  content_id   INT NOT NULL,
  metric       ENUM('view','recording_click') NOT NULL DEFAULT 'view',
  viewer_hash  CHAR(64) NOT NULL,
  view_date    DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cv_dedupe (content_type, content_id, metric, viewer_hash, view_date),
  KEY idx_cv_content (content_type, content_id, metric)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. FEED POSTS: speeds up the per-quarter post count ────────────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feed_posts' AND INDEX_NAME = 'idx_feed_posts_author_created');
SET @s = IF(@c = 0, 'CREATE INDEX idx_feed_posts_author_created ON feed_posts (author_id, created_at)', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;
