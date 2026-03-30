-- ============================================================
-- ARC Platform — Azure Safe Migration
-- Safe to run on existing racdatabase — NEVER drops data.
-- All changes use IF NOT EXISTS / conditional checks.
-- Run: cmd /c "mysql -h racdatabase.mysql.database.azure.com -u racdbadmin -p --ssl-mode=REQUIRED racdatabase < C:\arc_safe_migrate.sql"
-- ============================================================

-- ─── Helper: add column only if it doesn't exist ─────────────────────────────
DROP PROCEDURE IF EXISTS add_col;
DELIMITER //
CREATE PROCEDURE add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN colDef TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', colDef);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //
DELIMITER ;

-- ─── Helper: create index only if it doesn't exist ───────────────────────────
DROP PROCEDURE IF EXISTS add_idx;
DELIMITER //
CREATE PROCEDURE add_idx(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN col VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @s = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (`', col, '`)');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //
DELIMITER ;

-- ═══════════════════════════════════════════════════════════════
-- 1. USERS TABLE
-- ═══════════════════════════════════════════════════════════════

-- Add membership_expires_at (the column causing the current error)
CALL add_col('users', 'membership_expires_at', 'DATETIME NULL DEFAULT NULL COMMENT ''NULL = lifetime (founding_member)''');

-- Step 1: Expand ENUM to allow both old AND new values simultaneously
ALTER TABLE users MODIFY COLUMN role ENUM(
  'admin','free_member','paid_member','university','product_company',
  'founding_member','executive','professional'
) NOT NULL DEFAULT 'professional';

-- Step 2: Migrate old role values to new ones (safe UPDATE — no data loss)
UPDATE users SET role = 'founding_member', membership_expires_at = NULL WHERE role = 'admin';
UPDATE users SET role = 'professional' WHERE role IN ('free_member','paid_member','university','product_company');

-- Step 3: Now narrow ENUM to only the three new values
ALTER TABLE users MODIFY COLUMN role ENUM('founding_member','executive','professional') NOT NULL DEFAULT 'professional';

-- Update status ENUM
ALTER TABLE users MODIFY COLUMN status ENUM('pending','approved','rejected') DEFAULT 'pending';

-- Add index on membership_expires_at if missing
CALL add_idx('users', 'idx_users_membership_expires', 'membership_expires_at');
CALL add_idx('users', 'idx_users_status', 'status');

-- ═══════════════════════════════════════════════════════════════
-- 2. EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════
CALL add_col('events', 'banner_image', 'VARCHAR(500) DEFAULT NULL');
CALL add_col('events', 'is_published', 'BOOLEAN NOT NULL DEFAULT TRUE');

-- Backfill existing rows
UPDATE events SET is_published = TRUE WHERE is_published IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. NEWS TABLE
-- ═══════════════════════════════════════════════════════════════
CALL add_col('news', 'is_published', 'BOOLEAN NOT NULL DEFAULT TRUE');
CALL add_col('news', 'image_url', 'VARCHAR(500) DEFAULT NULL');
CALL add_col('news', 'is_automated', 'BOOLEAN DEFAULT FALSE');
CALL add_col('news', 'source', 'VARCHAR(255) DEFAULT NULL');
CALL add_col('news', 'article_url', 'VARCHAR(500) DEFAULT NULL');
CALL add_col('news', 'published_at', 'TIMESTAMP DEFAULT NULL');
CALL add_col('news', 'status', 'ENUM(''PENDING'',''APPROVED'',''REJECTED'') DEFAULT ''APPROVED''');
CALL add_col('news', 'fetched_at', 'TIMESTAMP DEFAULT NULL');
CALL add_col('news', 'is_trending', 'BOOLEAN DEFAULT FALSE');

-- Backfill
UPDATE news SET is_published = TRUE WHERE is_published IS NULL;
UPDATE news SET is_automated = FALSE, status = 'APPROVED', is_published = TRUE WHERE is_automated IS NULL;

-- Indexes
CALL add_idx('news', 'idx_news_is_automated', 'is_automated');
CALL add_idx('news', 'idx_news_status', 'status');
CALL add_idx('news', 'idx_news_is_published', 'is_published');

-- ═══════════════════════════════════════════════════════════════
-- 4. RESOURCES TABLE
-- ═══════════════════════════════════════════════════════════════
CALL add_col('resources', 'status', 'ENUM(''pending'',''approved'',''rejected'') NOT NULL DEFAULT ''approved''');
CALL add_col('resources', 'uploader_id', 'INT DEFAULT NULL');
CALL add_col('resources', 'abstract', 'TEXT DEFAULT NULL');
CALL add_col('resources', 'demo_url', 'VARCHAR(500) DEFAULT NULL');

-- ═══════════════════════════════════════════════════════════════
-- 5. EVENT_REGISTRATIONS TABLE (create if missing)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS event_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  organization VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  consent_to_share BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_event (user_id, event_id)
);
CALL add_col('event_registrations', 'consent_to_share', 'BOOLEAN NOT NULL DEFAULT FALSE');

-- ═══════════════════════════════════════════════════════════════
-- 6. MEMBERSHIP_APPLICATIONS TABLE (create if missing)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS membership_applications (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    requested_role      ENUM('executive','founding_member') NOT NULL,
    full_name           VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    organization_name   VARCHAR(255),
    job_title           VARCHAR(255),
    linkedin_url        VARCHAR(500),
    phone               VARCHAR(50),
    payment_reference   VARCHAR(100) DEFAULT 'PROMO-100PCT',
    amount_paid         DECIMAL(10,2) DEFAULT 0.00,
    professional_bio    TEXT,
    areas_of_expertise  VARCHAR(1000),
    why_founding_member TEXT,
    website_url         VARCHAR(500),
    twitter_url         VARCHAR(500),
    status              ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    admin_notes         TEXT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at        DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_requested_role (requested_role),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- Cleanup helper procedures
-- ═══════════════════════════════════════════════════════════════
DROP PROCEDURE IF EXISTS add_col;
DROP PROCEDURE IF EXISTS add_idx;

SELECT 'Azure safe migration completed successfully.' AS result;
