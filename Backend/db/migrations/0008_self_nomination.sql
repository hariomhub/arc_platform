-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Self-nomination feature
--   1. nominees: moderation/self-nomination metadata (existing admin-created
--      rows are unaffected — status defaults to 'approved', is_self_nominated
--      defaults to false)
--   2. otp_verifications: generic purpose-tagged OTP table, decoupled from the
--      existing registration-only email_verifications table
--   3. team_members: group_type so the same admin-managed list can power both
--      the About Us leadership section and the new Jury & Presenters panel
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE nominees
  ADD COLUMN status                ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER is_winner,
  ADD COLUMN is_self_nominated     BOOLEAN NOT NULL DEFAULT FALSE AFTER status,
  ADD COLUMN submitted_by_user_id  INT NULL AFTER is_self_nominated,
  ADD COLUMN submitter_email       VARCHAR(255) NULL AFTER submitted_by_user_id,
  ADD COLUMN submitter_phone       VARCHAR(50) NULL AFTER submitter_email,
  ADD COLUMN email_verified_at     DATETIME NULL AFTER submitter_phone,
  ADD COLUMN consent_to_terms      BOOLEAN NOT NULL DEFAULT FALSE AFTER email_verified_at,
  ADD COLUMN admin_notes           TEXT NULL AFTER consent_to_terms,
  ADD CONSTRAINT fk_nominees_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD INDEX idx_nominees_status (status);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  purpose     VARCHAR(50)  NOT NULL DEFAULT 'self_nomination',
  otp         VARCHAR(10)  NOT NULL,
  expires_at  DATETIME     NOT NULL,
  verified    BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_otp_email_purpose (email, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE team_members
  ADD COLUMN group_type ENUM('leadership','jury','presenter') NOT NULL DEFAULT 'leadership' AFTER role,
  ADD INDEX idx_team_group_type (group_type);

-- ── Verify ─────────────────────────────────────────────────────────────────
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM   information_schema.COLUMNS
WHERE  TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nominees'
ORDER BY ORDINAL_POSITION;
