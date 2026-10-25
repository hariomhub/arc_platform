-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 0024_app_settings
-- Description: Small key/value settings that an administrator manages from the admin panel.
--              First use: the tour video shown on the Chapter Lead / Chapter Ambassador dashboard
--              (key 'team_tour'). Additive only; nothing existing reads or changes.
-- Re-run safe: CREATE TABLE IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key  VARCHAR(64) NOT NULL,
    value_json   JSON        NOT NULL,
    updated_by   INT         NULL,
    updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key),
    CONSTRAINT fk_app_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
