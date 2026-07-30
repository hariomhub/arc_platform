-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Account Deletion Requests
-- Description: Adds account_deletion_requests table and extends users.status
--              to support pending_deletion and deleted states.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Extend users.status ENUM to include new deletion states
-- NOTE: MySQL ENUM modification is non-destructive when adding new values.
ALTER TABLE users
  MODIFY COLUMN status ENUM(
    'pending',
    'approved',
    'rejected',
    'pending_deletion',
    'deleted'
  ) NOT NULL DEFAULT 'pending';

-- Step 2: Create the account_deletion_requests table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id            INT             NOT NULL AUTO_INCREMENT,
  user_id       INT             NOT NULL,
  full_name     VARCHAR(255)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  reason        TEXT            NULL,
  status        ENUM(
                  'Pending',
                  'Approved',
                  'Rejected',
                  'Completed'
                )               NOT NULL DEFAULT 'Pending',
  requested_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at   DATETIME        NULL,
  rejected_at   DATETIME        NULL,
  completed_at  DATETIME        NULL,
  approved_by   INT             NULL COMMENT 'Admin user_id who approved/rejected',
  admin_notes   TEXT            NULL,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_user_pending (user_id, status),   -- one active request per user
  KEY     idx_status           (status),
  KEY     idx_requested_at     (requested_at),
  KEY     idx_email            (email),

  CONSTRAINT fk_adr_user
    FOREIGN KEY (user_id)    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_adr_admin
    FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks user-submitted account deletion requests and admin decisions';
