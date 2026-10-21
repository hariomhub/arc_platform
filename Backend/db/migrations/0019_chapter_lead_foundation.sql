-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 0019_chapter_lead_foundation
-- Description: Foundation tables for the Chapter Lead programme.
--
--   chapters               admin-defined geographic areas (one active lead each)
--   users                  + approved_at, country_code, chapter_id
--   membership_applications + requested_country_code, requested_chapter_id
--   chapter_lead_profiles  one row per chapter-lead tenure ("stint") with the
--                          referral code, term start and status
--   policy_acceptances     versioned consent evidence (Privacy Policy + Terms)
--   referrals              which lead brought which member
--
-- Re-run safe: tables use CREATE TABLE IF NOT EXISTS and every ALTER on an
-- existing table is guarded by an INFORMATION_SCHEMA check (ADD COLUMN IF NOT
-- EXISTS is not supported on Azure MySQL).
--
-- Foreign keys to users use the default RESTRICT on purpose: users are
-- soft-deleted (tombstoned) and never hard-deleted, so these rows must keep
-- pointing at a real users row.
--
-- Run order: this file BEFORE deploying the matching backend code.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. CHAPTERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  country_code CHAR(2)      NOT NULL COMMENT 'ISO 3166-1 alpha-2',
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chapters_name (name),
  KEY idx_chapters_country (country_code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. USERS: approval time + geography ─────────────────────────────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'approved_at');
SET @s = IF(@c = 0,
  "ALTER TABLE users
     ADD COLUMN approved_at  DATETIME NULL COMMENT 'When an admin approved the account. NULL for accounts approved before this column existed',
     ADD COLUMN country_code CHAR(2)  NULL COMMENT 'ISO 3166-1 alpha-2, chosen at signup',
     ADD COLUMN chapter_id   INT      NULL,
     ADD KEY idx_users_chapter (chapter_id),
     ADD KEY idx_users_country (country_code),
     ADD CONSTRAINT fk_users_chapter FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 3. MEMBERSHIP APPLICATIONS: what the applicant asked for ───────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'membership_applications' AND COLUMN_NAME = 'requested_country_code');
SET @s = IF(@c = 0,
  "ALTER TABLE membership_applications
     ADD COLUMN requested_country_code CHAR(2) NULL,
     ADD COLUMN requested_chapter_id   INT     NULL,
     ADD KEY idx_ma_req_chapter (requested_chapter_id),
     ADD CONSTRAINT fk_ma_req_chapter FOREIGN KEY (requested_chapter_id) REFERENCES chapters (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 4. CHAPTER LEAD PROFILES ────────────────────────────────────────────────
-- One row per tenure ("stint"). A removed lead who re-applies gets a NEW row and
-- restarts at Term 1.
--
-- The two generated columns let the database itself enforce:
--   * one active stint per user
--   * one active lead per chapter
-- (NULLs are ignored by UNIQUE indexes, so ended/removed stints never collide.)
--
-- fk_clp_chapter deliberately has no ON DELETE SET NULL: MySQL forbids that
-- action on a column used by a stored generated column. Chapters are
-- deactivated, not deleted.
CREATE TABLE IF NOT EXISTS chapter_lead_profiles (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  chapter_id      INT NULL,
  referral_code   VARCHAR(16) NOT NULL,
  status          ENUM('active','ended','removed') NOT NULL DEFAULT 'active',
  term_started_at DATETIME NOT NULL,
  ended_at        DATETIME NULL,
  end_reason      VARCHAR(500) NULL,
  ended_by        INT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  active_user_id    INT GENERATED ALWAYS AS (IF(status = 'active', user_id,    NULL)) STORED,
  active_chapter_id INT GENERATED ALWAYS AS (IF(status = 'active', chapter_id, NULL)) STORED,
  UNIQUE KEY uq_clp_referral_code          (referral_code),
  UNIQUE KEY uq_clp_one_active_per_user    (active_user_id),
  UNIQUE KEY uq_clp_one_active_per_chapter (active_chapter_id),
  KEY idx_clp_user   (user_id),
  KEY idx_clp_status (status),
  CONSTRAINT fk_clp_user     FOREIGN KEY (user_id)    REFERENCES users (id),
  CONSTRAINT fk_clp_chapter  FOREIGN KEY (chapter_id) REFERENCES chapters (id),
  CONSTRAINT fk_clp_ended_by FOREIGN KEY (ended_by)   REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. POLICY ACCEPTANCES ───────────────────────────────────────────────────
-- Consent evidence is kept apart from membership_applications because
-- softDeleteUser deletes those rows when an account is deleted.
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  document    ENUM('privacy','terms') NOT NULL,
  version     VARCHAR(20) NOT NULL COMMENT 'policy effective date, e.g. 2026-10-17',
  context     VARCHAR(50) NOT NULL DEFAULT 'chapter_lead_application',
  ip_address  VARCHAR(45) NULL,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pa_user_doc_version (user_id, document, version),
  KEY idx_pa_user (user_id),
  CONSTRAINT fk_pa_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. REFERRALS ────────────────────────────────────────────────────────────
-- Attribution is written once at signup and never changed by the app
-- (admins can void or reassign through the admin panel).
-- Self-referral (referred_user_id = lead_user_id) is rejected in application code.
CREATE TABLE IF NOT EXISTS referrals (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  referred_user_id INT NOT NULL,
  lead_user_id     INT NOT NULL,
  code_used        VARCHAR(16) NOT NULL,
  status           ENUM('pending','qualified','void') NOT NULL DEFAULT 'pending',
  qualified_at     DATETIME NULL COMMENT 'set when an admin approves the referred user',
  void_reason      VARCHAR(255) NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referrals_referred (referred_user_id),
  KEY idx_referrals_lead (lead_user_id, status, qualified_at),
  CONSTRAINT fk_ref_referred FOREIGN KEY (referred_user_id) REFERENCES users (id),
  CONSTRAINT fk_ref_lead     FOREIGN KEY (lead_user_id)     REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
