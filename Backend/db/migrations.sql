-- ============================================================
-- ARC Platform — Safe Migrations (MySQL 5.7+ compatible)
-- Run: cmd /c "mysql -u root -p arc_platform < db/migrations.sql"
-- ============================================================

USE arc_platform;
SET GLOBAL log_bin_trust_function_creators = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper procedure: add a column only if it doesn't already exist
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER //
CREATE PROCEDURE add_column_if_missing(
  IN tbl   VARCHAR(64),
  IN col   VARCHAR(64),
  IN colDef TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', colDef);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- ─────────────────────────────────────────────────────────────────────────────
-- events table additions
-- ─────────────────────────────────────────────────────────────────────────────
CALL add_column_if_missing('events', 'banner_image', 'VARCHAR(500) DEFAULT NULL');
CALL add_column_if_missing('events', 'is_published',  'BOOLEAN NOT NULL DEFAULT TRUE');

-- ─────────────────────────────────────────────────────────────────────────────
-- news table additions
-- ─────────────────────────────────────────────────────────────────────────────
CALL add_column_if_missing('news', 'is_published', 'BOOLEAN NOT NULL DEFAULT TRUE');
CALL add_column_if_missing('news', 'image_url',    'VARCHAR(500) DEFAULT NULL');

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: ensure existing rows are marked published
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE events SET is_published = TRUE WHERE is_published IS NULL OR is_published = 0;
UPDATE news   SET is_published = TRUE WHERE is_published IS NULL OR is_published = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- waitlist table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  name       VARCHAR(255)        DEFAULT NULL,
  tier       ENUM('basic','professional','enterprise') NOT NULL DEFAULT 'basic',
  status     ENUM('pending','contacted','converted')   NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes (safe — create only if they don't exist)
DROP PROCEDURE IF EXISTS create_index_if_missing;

DELIMITER //
CREATE PROCEDURE create_index_if_missing(
  IN tbl  VARCHAR(64),
  IN idx  VARCHAR(64),
  IN col  VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND INDEX_NAME   = idx
  ) THEN
    SET @sql = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (`', col, '`)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL create_index_if_missing('waitlist', 'idx_waitlist_email',  'email');
CALL create_index_if_missing('waitlist', 'idx_waitlist_tier',   'tier');
CALL create_index_if_missing('waitlist', 'idx_waitlist_status', 'status');

DROP PROCEDURE IF EXISTS create_index_if_missing;

-- ─────────────────────────────────────────────────────────────────────────────
-- event_registrations table — create if missing + add consent column
-- ─────────────────────────────────────────────────────────────────────────────
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

-- Recreate index helper procedure for event_registrations indexes
DROP PROCEDURE IF EXISTS create_index_if_missing;

DELIMITER //
CREATE PROCEDURE create_index_if_missing(
  IN tbl  VARCHAR(64),
  IN idx  VARCHAR(64),
  IN col  VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND INDEX_NAME   = idx
  ) THEN
    SET @sql = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (`', col, '`)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL create_index_if_missing('event_registrations', 'idx_event_registrations_event', 'event_id');
CALL create_index_if_missing('event_registrations', 'idx_event_registrations_user', 'user_id');

DROP PROCEDURE IF EXISTS create_index_if_missing;

-- Add consent_to_share column if event_registrations table already exists
DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER //
CREATE PROCEDURE add_column_if_missing(
  IN tbl   VARCHAR(64),
  IN col   VARCHAR(64),
  IN colDef TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', colDef);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_column_if_missing('event_registrations', 'consent_to_share', 'BOOLEAN NOT NULL DEFAULT FALSE');

-- ─────────────────────────────────────────────────────────────────────────────
-- votes table — add anonymous voting support
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER //
CREATE PROCEDURE add_column_if_missing(
  IN tbl   VARCHAR(64),
  IN col   VARCHAR(64),
  IN colDef TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', colDef);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_column_if_missing('votes', 'is_anonymous', 'BOOLEAN NOT NULL DEFAULT FALSE');
CALL add_column_if_missing('votes', 'anonymous_email', 'VARCHAR(255) DEFAULT NULL');

-- Make user_id nullable to support anonymous votes
-- Note: This will fail if user_id is already nullable, which is fine
SET @sql = 'ALTER TABLE votes MODIFY user_id INT NULL';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop old unique constraint if it exists (user_id, category_id)
-- Add new unique constraint that handles both logged-in and anonymous votes
-- For logged-in: user_id + category_id must be unique
-- For anonymous: anonymous_email + category_id must be unique

-- Note: We'll handle uniqueness in application logic since MySQL doesn't support
-- conditional unique constraints easily. We'll create separate indexes.

DROP PROCEDURE IF EXISTS create_index_if_missing;

DELIMITER //
CREATE PROCEDURE create_index_if_missing(
  IN tbl  VARCHAR(64),
  IN idx  VARCHAR(64),
  IN col  VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND INDEX_NAME   = idx
  ) THEN
    SET @sql = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (`', col, '`)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL create_index_if_missing('votes', 'idx_votes_anonymous_email', 'anonymous_email');
CALL create_index_if_missing('votes', 'idx_votes_is_anonymous', 'is_anonymous');

DROP PROCEDURE IF EXISTS create_index_if_missing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup helper procedure
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_column_if_missing;

SELECT 'Migrations applied successfully.' AS status;
