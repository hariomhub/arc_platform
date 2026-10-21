-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 0021_auth_otp
-- Description: One-time email codes for "sign in with a code" and "forgot password".
--
--   auth_otps              one live code per (email, purpose). The code itself is NEVER
--                          stored — only an HMAC of it — plus the expiry, the number of
--                          wrong guesses, and resend tracking (cooldown + hourly cap).
--   users.password_changed_at  set whenever a password changes, so sessions that were
--                          signed before the change can be rejected on every device.
--
-- Times are written with UTC_TIMESTAMP() and compared in SQL, so they do not depend on
-- the time zone of the Node server or of the MySQL session.
--
-- Re-run safe: the table uses CREATE TABLE IF NOT EXISTS and the ALTER on users is
-- guarded by an INFORMATION_SCHEMA check (ADD COLUMN IF NOT EXISTS is not supported on
-- Azure MySQL).
--
-- Run order: this file BEFORE deploying the matching backend code.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. AUTH_OTPS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_otps (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL COMMENT 'lower-cased email of the account',
  purpose       ENUM('login','password_reset') NOT NULL,
  code_hash     CHAR(64)     NOT NULL COMMENT 'HMAC-SHA256 of the code; the code is never stored',
  expires_at    DATETIME     NOT NULL COMMENT 'UTC',
  attempts      TINYINT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'wrong guesses against this code',
  sent_count    SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'codes sent in the current hour window',
  window_start  DATETIME     NOT NULL COMMENT 'UTC; start of the current hour window',
  last_sent_at  DATETIME     NOT NULL COMMENT 'UTC; for the resend cooldown',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_auth_otps_email_purpose (email, purpose),
  KEY idx_auth_otps_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. USERS: when the password last changed ────────────────────────────────
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_changed_at');
SET @s = IF(@c = 0,
  "ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL COMMENT 'UTC; sessions signed before this are rejected'",
  'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
