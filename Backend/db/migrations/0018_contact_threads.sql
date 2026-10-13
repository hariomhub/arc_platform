-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Contact Message Threads
-- Description: Turns contact_messages into a two-way conversation:
--
--   contact_messages  + user_id      → set when the sender was logged in, so the
--                                      thread shows on their own dashboard
--                     + status       → 'new' | 'handled' (admin triage)
--                     + handled_at / handled_by
--
--   contact_replies   (new)          → replies written by admins from the admin
--                                      dashboard. Each reply is also emailed to
--                                      the sender; email_sent records whether the
--                                      SMTP relay accepted it. read_at records when
--                                      the sender opened it on their dashboard.
--
--   Visibility on a user's dashboard = (user_id = me) OR (email = my account
--   email). Account emails are OTP-verified at registration, so matching on email
--   also covers people who wrote in while logged out.
--
--   Depends on 0017_contact_messages.sql.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE contact_messages
  ADD COLUMN user_id    INT                      NULL COMMENT 'Sender account if logged in at submit time (no FK: tombstoned users keep their row)',
  ADD COLUMN status     ENUM('new','handled')    NOT NULL DEFAULT 'new',
  ADD COLUMN handled_at DATETIME                 NULL,
  ADD COLUMN handled_by INT                      NULL COMMENT 'Admin user_id who last marked this handled',
  ADD KEY idx_cm_user   (user_id),
  ADD KEY idx_cm_status (status, created_at);

CREATE TABLE IF NOT EXISTS contact_replies (
  id          INT           NOT NULL AUTO_INCREMENT,
  message_id  INT           NOT NULL,
  admin_id    INT           NULL,
  admin_name  VARCHAR(255)  NOT NULL COMMENT 'Snapshot of the replying admin''s name (audit only; never shown to the sender)',
  body        TEXT          NOT NULL,
  email_sent  TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = reply email handed to SMTP successfully',
  read_at     DATETIME      NULL COMMENT 'When the sender opened this reply on their dashboard',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_cr_message (message_id, created_at),

  CONSTRAINT fk_cr_message FOREIGN KEY (message_id) REFERENCES contact_messages (id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_admin   FOREIGN KEY (admin_id)   REFERENCES users (id)            ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Admin replies to Contact-form messages';
