-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Contact Messages
-- Description: Stores every message submitted through the public Contact form
--              (POST /api/contact) so nothing is lost if an email fails.
--
--   • inquiry_type is VARCHAR (not ENUM) so new inquiry types never need a
--     schema change — the allowed list lives in routes/contact.js.
--   • admin_notified / user_confirmed record whether each notification email
--     was actually delivered to the SMTP relay. A row with admin_notified = 0
--     is a message the team has not been told about yet:
--         SELECT * FROM contact_messages WHERE admin_notified = 0;
--   • No FK to users: the form is public, senders are usually not members.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contact_messages (
  id              INT             NOT NULL AUTO_INCREMENT,
  first_name      VARCHAR(100)    NOT NULL,
  last_name       VARCHAR(100)    NULL,
  email           VARCHAR(255)    NOT NULL,
  organization    VARCHAR(255)    NULL,
  inquiry_type    VARCHAR(100)    NOT NULL,
  message         TEXT            NOT NULL,
  ip_address      VARCHAR(45)     NULL COMMENT 'IPv4 / IPv6 of the sender (abuse tracing)',
  admin_notified  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = admin email handed to SMTP successfully',
  user_confirmed  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = confirmation email to sender handed to SMTP successfully',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_cm_created_at    (created_at),
  KEY idx_cm_email         (email),
  KEY idx_cm_unnotified    (admin_notified, created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Messages submitted through the public Contact form';
