-- ============================================================
-- MIGRATION: executive → council_member
-- AI Risk Council Platform
-- Run this on your Azure MySQL database ONCE.
-- Safe to re-run: column additions check INFORMATION_SCHEMA first
-- (ADD COLUMN IF NOT EXISTS is MariaDB-only and not supported on Azure MySQL).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- STEP 1: Expand ENUMs to accept 'council_member'
--         (must do this BEFORE updating data)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE users MODIFY COLUMN role
  ENUM('founding_member','executive','council_member','professional')
  NOT NULL DEFAULT 'professional';

ALTER TABLE membership_applications MODIFY COLUMN requested_role
  ENUM('executive','founding_member','council_member') NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- STEP 2: Migrate executive → council_member
--         Recalculate expiry to 2 years from original approval date.
--         Falls back to created_at if no application record found.
-- ──────────────────────────────────────────────────────────────

-- Disable safe-update mode for JOIN-based UPDATE (re-enabled immediately after)
SET SQL_SAFE_UPDATES = 0;

UPDATE users u
LEFT JOIN (
  SELECT user_id, MAX(processed_at) AS approved_at
  FROM membership_applications
  WHERE requested_role = 'executive'
    AND status = 'approved'
    AND processed_at IS NOT NULL
  GROUP BY user_id
) ma ON u.id = ma.user_id
SET
  u.role = 'council_member',
  u.membership_expires_at = DATE_ADD(
    COALESCE(ma.approved_at, u.created_at),
    INTERVAL 2 YEAR
  )
WHERE u.role = 'executive'
  AND u.id > 0;          -- satisfies safe-update key requirement

-- Migrate membership_applications table
UPDATE membership_applications
SET requested_role = 'council_member'
WHERE requested_role = 'executive'
  AND id > 0;            -- satisfies safe-update key requirement

SET SQL_SAFE_UPDATES = 1;

-- ──────────────────────────────────────────────────────────────
-- STEP 3: Add professional_sub_type to users
-- ──────────────────────────────────────────────────────────────

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME  = 'users'
    AND COLUMN_NAME = 'professional_sub_type'
);
SET @s = IF(@col_exists = 0,
  "ALTER TABLE users ADD COLUMN professional_sub_type ENUM('working_professional','final_year_undergrad') NULL DEFAULT NULL COMMENT 'Self-declared sub-category' AFTER role",
  'SELECT 1'
);
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- ──────────────────────────────────────────────────────────────
-- STEP 4: Add missing columns to events
--         (is_published and created_by)
-- ──────────────────────────────────────────────────────────────

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME  = 'events'
    AND COLUMN_NAME = 'is_published'
);
SET @s = IF(@col_exists = 0,
  'ALTER TABLE events ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT TRUE COMMENT \'Published events are visible to the public\' AFTER recording_url',
  'SELECT 1'
);
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME  = 'events'
    AND COLUMN_NAME = 'created_by'
);
SET @s = IF(@col_exists = 0,
  'ALTER TABLE events ADD COLUMN created_by INT NULL COMMENT \'User ID who created this event\' AFTER is_published',
  'SELECT 1'
);
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

-- Add FK only if it does not already exist
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'events'
    AND CONSTRAINT_NAME = 'fk_events_created_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE events ADD CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ──────────────────────────────────────────────────────────────
-- STEP 5: Add missing columns to news
--         (is_published, created_by, content, image_url, source_url, category)
-- ──────────────────────────────────────────────────────────────

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='is_published');
SET @s = IF(@col_exists=0, 'ALTER TABLE news ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT TRUE AFTER link', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='created_by');
SET @s = IF(@col_exists=0, 'ALTER TABLE news ADD COLUMN created_by INT NULL AFTER is_published', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='content');
SET @s = IF(@col_exists=0, 'ALTER TABLE news ADD COLUMN content TEXT NULL AFTER created_by', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='image_url');
SET @s = IF(@col_exists=0, 'ALTER TABLE news ADD COLUMN image_url VARCHAR(500) NULL AFTER content', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='source_url');
SET @s = IF(@col_exists=0, 'ALTER TABLE news ADD COLUMN source_url VARCHAR(2000) NULL AFTER image_url', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='category');
SET @s = IF(@col_exists=0, 'ALTER TABLE news ADD COLUMN category VARCHAR(100) NULL AFTER source_url', 'SELECT 1');
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk2_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'news'
    AND CONSTRAINT_NAME = 'fk_news_created_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql2 = IF(@fk2_exists = 0,
  'ALTER TABLE news ADD CONSTRAINT fk_news_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- ──────────────────────────────────────────────────────────────
-- STEP 6: Add created_by to executive_workshops
-- ──────────────────────────────────────────────────────────────

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME  = 'executive_workshops'
    AND COLUMN_NAME = 'created_by'
);
SET @s = IF(@col_exists = 0,
  'ALTER TABLE executive_workshops ADD COLUMN created_by INT NULL COMMENT \'User ID who created this workshop\' AFTER is_published',
  'SELECT 1'
);
PREPARE s FROM @s; EXECUTE s; DEALLOCATE PREPARE s;

SET @fk3_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'executive_workshops'
    AND CONSTRAINT_NAME = 'fk_workshops_created_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql3 = IF(@fk3_exists = 0,
  'ALTER TABLE executive_workshops ADD CONSTRAINT fk_workshops_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- ──────────────────────────────────────────────────────────────
-- STEP 7: Narrow ENUMs (remove 'executive' — run LAST)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE users MODIFY COLUMN role
  ENUM('founding_member','council_member','professional')
  NOT NULL DEFAULT 'professional';

ALTER TABLE membership_applications MODIFY COLUMN requested_role
  ENUM('council_member','founding_member') NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- VERIFY
-- ──────────────────────────────────────────────────────────────

SELECT 'Roles after migration:' AS info;
SELECT role, COUNT(*) AS count FROM users GROUP BY role;

SELECT 'Requested roles in applications:' AS info;
SELECT requested_role, COUNT(*) AS count FROM membership_applications GROUP BY requested_role;

SELECT 'Migration complete.' AS status;
