-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 0022_chapter_team_foundation
-- Description: Chapter Ambassador tier + the structures around it. EXPAND step:
--              additive only, so the code that is already deployed keeps working
--              until the matching backend ships.
--
--   team_tiers                    lookup: lead / ambassador (who earns, who approves)
--   chapter_lead_profiles         + tier_code, approved_by/at, end_code, predecessor;
--                                 one-lead-per-chapter index now counts leads only;
--                                 an ambassador must have a chapter (CHECK)
--   chapter_lead_policy_targets   per policy version AND tier: goals + seat cap
--   earnings_elections            append-only history of "receive / waive" choices
--   audit_log                     append-only change history (admins, leads, system)
--   membership_applications       + tier, kind, routing, decision, employer confirmation
--   referrals                     + referrer_profile_id (tier/chapter at sign-up)
--   users                         + referral_code (the code belongs to the person)
--   member_display_settings       public listing + leaderboard preferences
--   chapters                      + parent_id, slug
--   chapter_team_summary (view)   one definition of lead / ambassadors / pending
--
-- Depends on 0019 and 0020. Re-run safe: tables use CREATE TABLE IF NOT EXISTS and
-- every ALTER is guarded by an INFORMATION_SCHEMA check (ADD COLUMN IF NOT EXISTS
-- is not supported on Azure MySQL). MySQL DDL commits implicitly, so the runner's
-- transaction cannot undo a half-applied file: the guards are what make a re-run safe.
--
-- Data moves (policy targets, referral codes, backfills) are in 0023.
-- Run order: this file BEFORE deploying the matching backend code.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. TEAM TIERS (lookup) ──────────────────────────────────────────────────
-- Tier parameters are data, so a future tier (e.g. a regional head) is an INSERT.
-- Permissions stay in code (Backend/utils/permissions.js) where they are reviewed.
CREATE TABLE IF NOT EXISTS team_tiers (
  code           VARCHAR(20) NOT NULL PRIMARY KEY,
  label          VARCHAR(60) NOT NULL,
  rank_order     TINYINT UNSIGNED NOT NULL COMMENT 'higher = more senior',
  earns_eligible TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'may receive revenue share / commission',
  approver_tier  VARCHAR(20) NULL COMMENT 'tier that approves applications; NULL = admins only',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tiers_approver FOREIGN KEY (approver_tier) REFERENCES team_tiers (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO team_tiers (code, label, rank_order, earns_eligible, approver_tier)
VALUES ('lead', 'Chapter Lead', 20, 1, NULL);
INSERT IGNORE INTO team_tiers (code, label, rank_order, earns_eligible, approver_tier)
VALUES ('ambassador', 'Chapter Ambassador', 10, 0, 'lead');

-- ─── 2. CHAPTER LEAD PROFILES (one row per stint, now for either tier) ──────
-- A tier never changes on a row: promotion / demotion ends the stint and opens a
-- new one (predecessor_profile_id links them), so quarter history and the term
-- clock always belong to exactly one tier.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapter_lead_profiles' AND COLUMN_NAME = 'tier_code');
SET @s = IF(@c = 0,
  "ALTER TABLE chapter_lead_profiles
     ADD COLUMN tier_code VARCHAR(20) NOT NULL DEFAULT 'lead' AFTER user_id,
     ADD COLUMN approved_by INT NULL,
     ADD COLUMN approved_at DATETIME NULL,
     ADD COLUMN end_code VARCHAR(30) NULL COMMENT 'removed_by_lead, removed_by_admin, stepped_down, promoted, demoted, account_deleted, expired',
     ADD COLUMN predecessor_profile_id INT NULL,
     ADD KEY idx_clp_chapter_team (chapter_id, status, tier_code),
     ADD CONSTRAINT fk_clp_tier FOREIGN KEY (tier_code) REFERENCES team_tiers (code),
     ADD CONSTRAINT fk_clp_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
     ADD CONSTRAINT fk_clp_predecessor FOREIGN KEY (predecessor_profile_id) REFERENCES chapter_lead_profiles (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- One ACTIVE LEAD per chapter (ambassadors are many). The index keeps its old name
-- so the existing duplicate-seat error handling keeps working.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapter_lead_profiles'
            AND COLUMN_NAME = 'active_chapter_id' AND GENERATION_EXPRESSION LIKE '%tier_code%');
SET @s = IF(@c = 0,
  "ALTER TABLE chapter_lead_profiles
     MODIFY COLUMN active_chapter_id INT GENERATED ALWAYS AS (IF(status = 'active' AND tier_code = 'lead', chapter_id, NULL)) STORED
     COMMENT 'chapter_id while an ACTIVE LEAD, else NULL: enforces one lead per chapter'",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- An ambassador always belongs to a chapter (a lead may be unassigned for a while).
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapter_lead_profiles'
            AND CONSTRAINT_NAME = 'chk_clp_ambassador_chapter');
SET @s = IF(@c = 0,
  "ALTER TABLE chapter_lead_profiles
     ADD CONSTRAINT chk_clp_ambassador_chapter CHECK (tier_code <> 'ambassador' OR chapter_id IS NOT NULL)",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- The referral code now belongs to the PERSON (users.referral_code), so a link
-- survives an ambassador -> lead promotion. The profile column stays as a record of
-- what each old stint used and may be empty for new stints.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapter_lead_profiles'
            AND COLUMN_NAME = 'referral_code' AND IS_NULLABLE = 'NO');
SET @s = IF(@c = 1, 'ALTER TABLE chapter_lead_profiles MODIFY COLUMN referral_code VARCHAR(16) NULL', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 3. POLICY TARGETS PER TIER ──────────────────────────────────────────────
-- Normalised: a new tier is rows, not columns. seat_cap = max ACTIVE profiles of
-- that tier per chapter (NULL = unlimited). The old target columns on
-- chapter_lead_policy are deprecated (dropped in a later "contract" migration).
CREATE TABLE IF NOT EXISTS chapter_lead_policy_targets (
  policy_id       INT NOT NULL,
  tier_code       VARCHAR(20) NOT NULL,
  members_target  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  podcasts_target SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  posts_min       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  posts_max       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  blogs_target    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  min_goals_met   TINYINT UNSIGNED  NOT NULL DEFAULT 3,
  seat_cap        SMALLINT UNSIGNED NULL,
  PRIMARY KEY (policy_id, tier_code),
  KEY idx_clpt_tier (tier_code),
  CONSTRAINT fk_clpt_policy FOREIGN KEY (policy_id) REFERENCES chapter_lead_policy (id) ON DELETE CASCADE,
  CONSTRAINT fk_clpt_tier   FOREIGN KEY (tier_code) REFERENCES team_tiers (code),
  CONSTRAINT chk_clpt_posts CHECK (posts_max >= posts_min),
  CONSTRAINT chk_clpt_goals CHECK (min_goals_met BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. EARNINGS ELECTIONS (append-only) ─────────────────────────────────────
-- State on a date = the latest row with effective_from <= that date; no row = not
-- chosen = no earnings. 'reset' is what an admin writes to make the person choose
-- again. Everyone records employer clearance here; ambassadors record 'waive'.
-- The CHECK is the rule "earnings stay off until employer clearance is confirmed".
CREATE TABLE IF NOT EXISTS earnings_elections (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  profile_id         INT NOT NULL,
  user_id            INT NOT NULL,
  choice             ENUM('receive','waive','reset') NOT NULL,
  employer_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  effective_from     DATE NOT NULL,
  policy_version     VARCHAR(20) NOT NULL,
  source             ENUM('self','admin_reset','system') NOT NULL DEFAULT 'self',
  actor_user_id      INT NULL,
  ip_address         VARCHAR(45) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ee_profile (profile_id, effective_from, id),
  KEY idx_ee_user (user_id),
  CONSTRAINT fk_ee_profile FOREIGN KEY (profile_id) REFERENCES chapter_lead_profiles (id),
  CONSTRAINT fk_ee_user    FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_ee_actor   FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_ee_receive_confirmed CHECK (choice <> 'receive' OR employer_confirmed = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. AUDIT LOG (append-only) ──────────────────────────────────────────────
-- Who changed what, from what to what. No application code updates or deletes
-- rows here. before_json / after_json may hold personal data: account deletion
-- redacts it (services/auditService.js).
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id  INT NULL,
  actor_label    VARCHAR(30) NOT NULL COMMENT 'founding_member, lead, ambassador, member or system at the time',
  action         VARCHAR(60) NOT NULL,
  entity_type    VARCHAR(30) NOT NULL,
  entity_id      BIGINT NULL,
  target_user_id INT NULL,
  chapter_id     INT NULL,
  before_json    JSON NULL,
  after_json     JSON NULL,
  reason         VARCHAR(500) NULL,
  ip_address     VARCHAR(45) NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_target  (target_user_id, created_at),
  KEY idx_audit_actor   (actor_user_id, created_at),
  KEY idx_audit_entity  (entity_type, entity_id),
  KEY idx_audit_chapter (chapter_id, created_at),
  CONSTRAINT fk_audit_actor   FOREIGN KEY (actor_user_id)  REFERENCES users (id),
  CONSTRAINT fk_audit_target  FOREIGN KEY (target_user_id) REFERENCES users (id),
  CONSTRAINT fk_audit_chapter FOREIGN KEY (chapter_id)     REFERENCES chapters (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. APPLICATIONS: tier, routing, decision ────────────────────────────────
-- requested_role stays 'council_member' for both tiers. requested_tier is NULL for
-- non-team roles. A full chapter needs no extra status: pending rows ARE the queue.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'membership_applications' AND COLUMN_NAME = 'requested_tier');
SET @s = IF(@c = 0,
  "ALTER TABLE membership_applications
     ADD COLUMN requested_tier VARCHAR(20) NULL,
     ADD COLUMN kind ENUM('new','promotion') NOT NULL DEFAULT 'new',
     ADD COLUMN routed_to ENUM('lead','admin') NOT NULL DEFAULT 'admin',
     ADD COLUMN approver_user_id INT NULL COMMENT 'the lead this was routed to at submission',
     ADD COLUMN decided_by INT NULL,
     ADD COLUMN decision_note VARCHAR(500) NULL,
     ADD COLUMN employer_confirmed_at DATETIME NULL,
     ADD KEY idx_ma_approver (approver_user_id, status, created_at),
     ADD KEY idx_ma_chapter_tier (requested_chapter_id, requested_tier, status),
     ADD CONSTRAINT fk_ma_tier FOREIGN KEY (requested_tier) REFERENCES team_tiers (code),
     ADD CONSTRAINT fk_ma_approver FOREIGN KEY (approver_user_id) REFERENCES users (id) ON DELETE SET NULL,
     ADD CONSTRAINT fk_ma_decided_by FOREIGN KEY (decided_by) REFERENCES users (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'membership_applications'
            AND COLUMN_NAME = 'status' AND COLUMN_TYPE LIKE '%withdrawn%');
SET @s = IF(@c = 0,
  "ALTER TABLE membership_applications MODIFY COLUMN status ENUM('pending','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending'",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 7. REFERRALS: who held which seat when the member signed up ────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'referrals' AND COLUMN_NAME = 'referrer_profile_id');
SET @s = IF(@c = 0,
  "ALTER TABLE referrals
     ADD COLUMN referrer_profile_id INT NULL COMMENT 'the referrer stint (tier + chapter) at sign-up; immutable',
     ADD KEY idx_referrals_profile (referrer_profile_id),
     ADD CONSTRAINT fk_ref_profile FOREIGN KEY (referrer_profile_id) REFERENCES chapter_lead_profiles (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 8. USERS: the referral code belongs to the person ──────────────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'referral_code');
SET @s = IF(@c = 0,
  "ALTER TABLE users
     ADD COLUMN referral_code VARCHAR(16) NULL,
     ADD UNIQUE KEY uq_users_referral_code (referral_code)",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 9. DISPLAY SETTINGS (public chapter pages + leaderboard) ───────────────
-- Name, role and chapter are always listed while a role is active (disclosed in the
-- Terms). Everything here is the person's own choice; organisation is off by default
-- because naming an employer can recreate the employer-approval problem.
CREATE TABLE IF NOT EXISTS member_display_settings (
  user_id             INT NOT NULL PRIMARY KEY,
  show_photo          TINYINT(1) NOT NULL DEFAULT 0,
  show_organisation   TINYINT(1) NOT NULL DEFAULT 0,
  show_linkedin       TINYINT(1) NOT NULL DEFAULT 0,
  show_bio            TINYINT(1) NOT NULL DEFAULT 0,
  show_in_leaderboard TINYINT(1) NOT NULL DEFAULT 1,
  hidden_by_admin     TINYINT(1) NOT NULL DEFAULT 0,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mds_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 10. CHAPTERS: hierarchy + URL slug ──────────────────────────────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chapters' AND COLUMN_NAME = 'slug');
SET @s = IF(@c = 0,
  "ALTER TABLE chapters
     ADD COLUMN parent_id INT NULL COMMENT 'room for regions / countries above cities',
     ADD COLUMN slug VARCHAR(80) NULL,
     ADD UNIQUE KEY uq_chapters_slug (slug),
     ADD KEY idx_chapters_parent (parent_id),
     ADD CONSTRAINT fk_chapters_parent FOREIGN KEY (parent_id) REFERENCES chapters (id) ON DELETE SET NULL",
  'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 11. CHAPTER TEAM SUMMARY (view) ─────────────────────────────────────────
-- The single definition behind the public chapters list, the vacancy banner and
-- the admin team view. Seat caps live in the policy and are applied by the API.
CREATE OR REPLACE VIEW chapter_team_summary AS
SELECT
  c.id          AS chapter_id,
  c.name        AS name,
  c.slug        AS slug,
  c.country_code AS country_code,
  c.status      AS status,
  (SELECT p.id      FROM chapter_lead_profiles p WHERE p.active_chapter_id = c.id LIMIT 1) AS lead_profile_id,
  (SELECT p.user_id FROM chapter_lead_profiles p WHERE p.active_chapter_id = c.id LIMIT 1) AS lead_user_id,
  (SELECT COUNT(*) FROM chapter_lead_profiles p
     WHERE p.chapter_id = c.id AND p.status = 'active' AND p.tier_code = 'ambassador')    AS ambassadors_active,
  (SELECT COUNT(*) FROM membership_applications a
     WHERE a.requested_chapter_id = c.id AND a.status = 'pending'
       AND a.requested_tier = 'ambassador')                                               AS pending_ambassador_applications
FROM chapters c;
