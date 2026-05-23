-- ═══════════════════════════════════════════════════════════════════════════
-- ARC Platform — Complete Fresh Schema
-- Generated from actual backend controller code (source of truth)
-- Run this on a completely empty database (racdbp)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. USERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  name                      VARCHAR(255) NOT NULL,
  email                     VARCHAR(255) UNIQUE NOT NULL,
  password_hash             VARCHAR(255),
  role                      ENUM('founding_member','executive','professional','council_member') NOT NULL DEFAULT 'professional',
  status                    ENUM('pending','approved','rejected') DEFAULT 'pending',
  membership_expires_at     DATETIME NULL DEFAULT NULL,
  bio                       TEXT,
  photo_url                 VARCHAR(500),
  linkedin_url              VARCHAR(500),
  linkedin_id               VARCHAR(255),
  auth_provider             VARCHAR(50) DEFAULT 'local',
  organization_name         VARCHAR(255),
  professional_sub_type     ENUM('working_professional','final_year_undergrad') DEFAULT NULL,
  pending_sub_type_upgrade  TINYINT(1) NOT NULL DEFAULT 0,
  sub_type_upgrade_status   ENUM('pending','approved','rejected') DEFAULT NULL,
  profile_badge             VARCHAR(100) DEFAULT NULL,
  monthly_downloads         INT NOT NULL DEFAULT 0,
  monthly_downloads_reset   DATE DEFAULT NULL,
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_membership_expires ON users(membership_expires_at);

-- ─── 2. EMAIL VERIFICATIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  otp        VARCHAR(10) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified   TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. EVENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  date           DATETIME NOT NULL,
  location       VARCHAR(255),
  description    TEXT,
  link           VARCHAR(500),
  event_category ENUM('webinar','seminar','workshop','podcast') NOT NULL,
  is_upcoming    BOOLEAN DEFAULT TRUE,
  is_published   BOOLEAN NOT NULL DEFAULT TRUE,
  recording_url  VARCHAR(500),
  banner_url     VARCHAR(500),
  banner_image   VARCHAR(500),
  created_by     INT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_events_category ON events(event_category);
CREATE INDEX idx_events_upcoming ON events(is_upcoming);

-- ─── 4. EVENT REGISTRATIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_registrations (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  event_id         INT NOT NULL,
  user_id          INT NOT NULL,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  organization     VARCHAR(255) DEFAULT NULL,
  phone            VARCHAR(50) DEFAULT NULL,
  notes            TEXT DEFAULT NULL,
  consent_to_share BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_event (user_id, event_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. RESOURCES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  abstract       TEXT,
  file_url       VARCHAR(500),
  thumbnail_url  VARCHAR(1024),
  demo_url       VARCHAR(500),
  type           ENUM('framework','whitepaper','product','tech_reels','article','tool','news','homepage_video') NOT NULL,
  status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  access_level   VARCHAR(50) DEFAULT 'public',
  download_count INT NOT NULL DEFAULT 0,
  uploader_id    INT DEFAULT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_resources_type   ON resources(type);
CREATE INDEX idx_resources_status ON resources(status);

-- ─── 6. RESOURCE REVIEWS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resource_reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  user_id     INT NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_resource_review (resource_id, user_id),
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. TEAM MEMBERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  role        VARCHAR(255),
  photo_url   VARCHAR(500),
  linkedin_url VARCHAR(500),
  bio         TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. NEWS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  summary      TEXT,
  content      TEXT NULL,
  link         VARCHAR(2000),
  image_url    VARCHAR(500) DEFAULT NULL,
  source_url   VARCHAR(2000) NULL,
  category     VARCHAR(100) NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_automated BOOLEAN DEFAULT FALSE,
  source       VARCHAR(255) DEFAULT NULL,
  article_url  VARCHAR(2000) DEFAULT NULL,
  published_at TIMESTAMP DEFAULT NULL,
  fetched_at   TIMESTAMP DEFAULT NULL,
  status       ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'APPROVED',
  is_trending  BOOLEAN DEFAULT FALSE,
  created_by   INT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_news_is_automated ON news(is_automated);
CREATE INDEX idx_news_status       ON news(status);
CREATE INDEX idx_news_is_published ON news(is_published);

-- ─── 9. MEMBERSHIP APPLICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS membership_applications (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT NOT NULL,
  requested_role     ENUM('executive','founding_member','council_member') NOT NULL,
  full_name          VARCHAR(255) NOT NULL,
  email              VARCHAR(255) NOT NULL,
  organization_name  VARCHAR(255),
  job_title          VARCHAR(255),
  linkedin_url       VARCHAR(500),
  phone              VARCHAR(50),
  payment_reference  VARCHAR(100) DEFAULT 'PROMO-100PCT',
  amount_paid        DECIMAL(10,2) DEFAULT 0.00,
  professional_bio   TEXT,
  areas_of_expertise VARCHAR(1000),
  why_founding_member TEXT,
  website_url        VARCHAR(500),
  twitter_url        VARCHAR(500),
  status             ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_notes        TEXT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at       DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status        (status),
  INDEX idx_requested_role (requested_role),
  INDEX idx_user_id       (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 10. PRODUCTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  vendor            VARCHAR(255) NOT NULL,
  category          VARCHAR(255),
  portal_url        VARCHAR(500),
  short_description TEXT,
  overview          TEXT,
  version_tested    VARCHAR(100),
  key_features      JSON,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_vendor   ON products(vendor);
CREATE INDEX idx_products_category ON products(category);

-- ─── 11. PRODUCT FEATURE TESTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_feature_tests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,
  feature_name  VARCHAR(255) NOT NULL,
  test_method   TEXT,
  result        TEXT,
  score         DECIMAL(4,1),
  comments      TEXT,
  display_order INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 12. PRODUCT MEDIA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_media (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,
  type          ENUM('image','video') NOT NULL,
  url           VARCHAR(500) NOT NULL,
  label         VARCHAR(255),
  display_order INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 13. PRODUCT EVIDENCES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_evidences (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  product_id      INT NOT NULL,
  feature_test_id INT NULL,
  file_url        VARCHAR(500) NOT NULL,
  file_name       VARCHAR(255),
  file_type       VARCHAR(100),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id)      REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_test_id) REFERENCES product_feature_tests(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 14. PRODUCT USER REVIEWS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_user_reviews (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id    INT NOT NULL,
  rating     TINYINT NOT NULL,
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_review (product_id, user_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 15. AWARDS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS awards (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 16. AWARD CATEGORIES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS award_categories (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  award_id INT NOT NULL,
  name     VARCHAR(255) NOT NULL,
  timeline ENUM('quarterly','half-yearly','yearly') NOT NULL DEFAULT 'yearly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 17. NOMINEES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nominees (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  award_id      INT NOT NULL,
  category_id   INT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  designation   VARCHAR(255),
  company       VARCHAR(255),
  photo_url     VARCHAR(500),
  linkedin_url  VARCHAR(500),
  achievements  TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (award_id)    REFERENCES awards(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES award_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 18. VOTES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  nominee_id  INT NOT NULL,
  category_id INT NOT NULL,
  award_id    INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vote_per_category (user_id, category_id),
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (nominee_id)  REFERENCES nominees(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES award_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (award_id)    REFERENCES awards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 19. FEED POSTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_posts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  author_id       INT NOT NULL,
  post_type       ENUM('ai_product','poll','event','troubleshooting','general','tech_meme') NOT NULL DEFAULT 'general',
  content         TEXT,
  tags            JSON,
  poll_options    JSON,
  poll_ends_at    DATETIME DEFAULT NULL,
  event_link      VARCHAR(500) DEFAULT NULL,
  like_count      INT NOT NULL DEFAULT 0,
  comment_count   INT NOT NULL DEFAULT 0,
  save_count      INT NOT NULL DEFAULT 0,
  reaction_counts JSON,
  score           DECIMAL(10,4) NOT NULL DEFAULT 0,
  score_updated_at DATETIME DEFAULT NULL,
  is_hidden       TINYINT(1) NOT NULL DEFAULT 0,
  is_edited       TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_feed_posts_author    ON feed_posts(author_id);
CREATE INDEX idx_feed_posts_score     ON feed_posts(score DESC);
CREATE INDEX idx_feed_posts_created   ON feed_posts(created_at DESC);
CREATE INDEX idx_feed_posts_post_type ON feed_posts(post_type);

-- ─── 20. FEED POST MEDIA ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_post_media (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  post_id       INT NOT NULL,
  url           VARCHAR(1000) NOT NULL,
  type          ENUM('image','pdf','video_link') NOT NULL,
  original_name VARCHAR(255),
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_feed_media_post ON feed_post_media(post_id);

-- ─── 21. FEED COMMENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  post_id    INT NOT NULL,
  author_id  INT NOT NULL,
  parent_id  INT DEFAULT NULL,
  content    TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  is_edited  TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id)   REFERENCES feed_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES feed_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_feed_comments_post   ON feed_comments(post_id);
CREATE INDEX idx_feed_comments_author ON feed_comments(author_id);
CREATE INDEX idx_feed_comments_parent ON feed_comments(parent_id);

-- ─── 22. FEED LIKES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_likes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  target_type ENUM('post','comment') NOT NULL,
  target_id   INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (user_id, target_type, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_feed_likes_target ON feed_likes(target_type, target_id);

-- ─── 23. FEED SAVES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_saves (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  post_id    INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_save (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 24. FEED REACTIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_reactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  post_id       INT NOT NULL,
  user_id       INT NOT NULL,
  reaction_type VARCHAR(50) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_reaction (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 25. FEED POLL VOTES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_poll_votes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  post_id      INT NOT NULL,
  user_id      INT NOT NULL,
  option_index INT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_poll_vote (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 26. FEED LIKE DIGEST LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_like_digest_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  target_type   ENUM('post','comment') NOT NULL,
  target_id     INT NOT NULL,
  author_id     INT NOT NULL,
  pending_count INT NOT NULL DEFAULT 0,
  last_notified_at DATETIME DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_digest (target_type, target_id),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 27. PUSH TOKENS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(500) NOT NULL,
  platform   VARCHAR(50) DEFAULT 'web',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_token (token),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

-- ─── 28. NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  type           VARCHAR(100) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  body           TEXT NOT NULL,
  data           JSON,
  target         ENUM('all','user') NOT NULL DEFAULT 'all',
  target_user_id INT DEFAULT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_notifications_target      ON notifications(target);
CREATE INDEX idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX idx_notifications_created     ON notifications(created_at DESC);

-- ─── 29. NOTIFICATION READS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_reads (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  notification_id INT NOT NULL,
  read_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_read (user_id, notification_id),
  FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 30. EXECUTIVE WORKSHOPS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executive_workshops (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  date             DATETIME NOT NULL,
  location         VARCHAR(255),
  description      TEXT,
  speaker          VARCHAR(255) DEFAULT NULL,
  agenda           TEXT DEFAULT NULL,
  price            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  capacity         INT DEFAULT NULL,
  registration_url VARCHAR(500),
  recording_url    VARCHAR(500) DEFAULT NULL,
  banner_image     VARCHAR(500) DEFAULT NULL,
  is_published     BOOLEAN NOT NULL DEFAULT TRUE,
  is_upcoming      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       INT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 31. FRAMEWORK TABLES (from framework_schema.sql) ────────────────────────
CREATE TABLE IF NOT EXISTS framework_pillars (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  tags          JSON,
  insight       TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by    INT NOT NULL,
  updated_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS framework_maturity_levels (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  level           TINYINT NOT NULL,
  name            VARCHAR(100) NOT NULL,
  color           VARCHAR(7) NOT NULL DEFAULT '#64748B',
  light_bg        VARCHAR(7) NOT NULL DEFAULT '#F8FAFC',
  border_color    VARCHAR(7) NOT NULL DEFAULT '#E2E8F0',
  description     TEXT NOT NULL,
  characteristics JSON NOT NULL,
  actions         JSON NOT NULL,
  percentage      INT NOT NULL DEFAULT 25,
  status          ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by      INT NOT NULL,
  updated_by      INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_level (level),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS framework_implementation_phases (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  phase_number  TINYINT NOT NULL,
  phase_label   VARCHAR(50) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  duration      VARCHAR(50) NOT NULL,
  icon          VARCHAR(10) DEFAULT '🏛️',
  display_order INT NOT NULL DEFAULT 0,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by    INT NOT NULL,
  updated_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_phase_number (phase_number),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS framework_implementation_steps (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  phase_id      INT NOT NULL,
  step_number   VARCHAR(10) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by    INT NOT NULL,
  updated_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (phase_id)   REFERENCES framework_implementation_phases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS framework_audit_templates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  template_id   VARCHAR(20) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  category      VARCHAR(100) NOT NULL,
  format        VARCHAR(100) NOT NULL,
  description   TEXT NOT NULL,
  fields        JSON NOT NULL,
  file_url      VARCHAR(500),
  file_name     VARCHAR(255),
  file_type     VARCHAR(100),
  file_size     INT,
  display_order INT NOT NULL DEFAULT 0,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by    INT NOT NULL,
  updated_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_template_id (template_id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS framework_security_tools (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  company             VARCHAR(255) NOT NULL,
  category            VARCHAR(255) NOT NULL,
  color               VARCHAR(7) NOT NULL DEFAULT '#003366',
  description         TEXT NOT NULL,
  capabilities        JSON NOT NULL,
  framework_alignment TEXT NOT NULL,
  website_url         VARCHAR(500),
  display_order       INT NOT NULL DEFAULT 0,
  status              ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by          INT NOT NULL,
  updated_by          INT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: The minimum required to make the app functional
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Admin User (Change password after first login!) ─────────────────────────
-- Password: Admin@123 (bcrypt hash)
INSERT INTO users (name, email, password_hash, role, status, membership_expires_at, organization_name) VALUES
('Admin', 'admin@riskaicouncil.com',
 '$2b$12$YLqlc93IBy7fQnTD3tSubOy6qryLJqZP/Iz1URRJo8UV9gWFimsQi',
 'founding_member', 'approved',
 DATE_ADD(NOW(), INTERVAL 10 YEAR),
 'AI Risk Council');

-- ─── Seed Awards ─────────────────────────────────────────────────────────────
INSERT INTO awards (name, description, is_active) VALUES
('Top CISO Awards 2026', 'Recognising outstanding Chief Information Security Officers driving AI governance and risk management globally.', TRUE),
('AI Risk Leadership Awards 2026', 'Honouring leaders who have made significant contributions to AI risk frameworks and responsible AI deployment.', TRUE);

INSERT INTO award_categories (award_id, name, timeline) VALUES
(1, 'Best AI Risk Leader', 'quarterly'),
(1, 'Outstanding Security Innovation', 'half-yearly'),
(1, 'AI Governance Champion', 'yearly'),
(2, 'AI Ethics Excellence', 'quarterly'),
(2, 'Risk Framework Pioneer', 'yearly');

-- ─── Seed Framework Data (requires admin user ID=1) ──────────────────────────
INSERT INTO framework_pillars (title, description, tags, insight, display_order, status, created_by) VALUES
('Risk Identification & Taxonomy', 'Systematically catalogue all AI risks across technical, ethical, regulatory, and operational domains.', JSON_ARRAY('NIST AI RMF', 'ISO 23894', 'Taxonomy'), 'A shared taxonomy eliminates ambiguity when risks are escalated across business units.', 1, 'published', 1),
('Governance & Accountability', 'Establish clear ownership structures from Board-level oversight to line-of-business accountability.', JSON_ARRAY('RACI Matrix', 'Board Oversight', 'Escalation'), 'Without named accountability, governance frameworks become documentation exercises.', 2, 'published', 1),
('Model Risk Management', 'Apply systematic validation, testing, and monitoring to all AI models throughout their lifecycle.', JSON_ARRAY('SR 11-7', 'Lifecycle Management', 'Validation'), 'Model drift in production is the most common cause of undetected AI failures.', 3, 'published', 1),
('Regulatory Compliance', 'Map your AI systems to applicable regulations — EU AI Act, NIST AI RMF, ISO 42001.', JSON_ARRAY('EU AI Act', 'ISO 42001', 'Controls Mapping'), 'The EU AI Act becomes fully enforceable in August 2026.', 4, 'published', 1),
('Ethical AI & Fairness', 'Embed bias detection, explainability, and fairness controls into the AI development lifecycle.', JSON_ARRAY('Bias Detection', 'Explainability', 'XAI'), 'Fairness is not binary. Define protected attributes and acceptable disparity thresholds before deployment.', 5, 'published', 1),
('Incident Response & Resilience', 'Develop and test AI-specific incident response playbooks.', JSON_ARRAY('Playbooks', 'Adversarial Defence', 'Recovery'), 'Average time-to-detect for AI bias incidents exceeds 80 days without dedicated monitoring infrastructure.', 6, 'published', 1);

INSERT INTO framework_maturity_levels (level, name, color, light_bg, border_color, description, characteristics, actions, percentage, status, created_by) VALUES
(1, 'Foundational', '#64748B', '#F8FAFC', '#E2E8F0', 'Ad-hoc risk management with no formal AI governance structure.', JSON_ARRAY('No dedicated AI risk policy or owner','Model inventory non-existent or informal'), JSON_ARRAY('Appoint an AI Risk Owner or Committee','Begin inventorying all AI/ML systems in use'), 25, 'published', 1),
(2, 'Defined', '#003366', '#EFF6FF', '#BFDBFE', 'Standardised definitions and baseline controls are documented.', JSON_ARRAY('Formal AI governance policy documented','Basic model register maintained'), JSON_ARRAY('Implement a standardised model risk assessment template','Establish a mandatory AI procurement checklist'), 50, 'published', 1),
(3, 'Managed', '#0369A1', '#EFF6FF', '#BFDBFE', 'Quantitative metrics are tracked and governance controls are continuously monitored.', JSON_ARRAY('KRIs and KPIs tracked for all material AI systems','Continuous model drift and bias monitoring active'), JSON_ARRAY('Integrate AI risk metrics into ERM dashboard','Conduct annual red-team exercise on critical AI systems'), 75, 'published', 1),
(4, 'Optimized', '#065F46', '#ECFDF5', '#A7F3D0', 'Adaptive governance with real-time feedback loops.', JSON_ARRAY('Real-time AI risk dashboard available to board','Fully automated model validation pipeline'), JSON_ARRAY('Publish annual AI Transparency Report','Contribute to industry standards and working groups'), 100, 'published', 1);

INSERT INTO framework_implementation_phases (phase_number, phase_label, title, duration, icon, display_order, status, created_by) VALUES
(1, 'Phase 1', 'Governance Foundation', '0–3 months', '🏛️', 1, 'published', 1),
(2, 'Phase 2', 'Risk Assessment', '3–6 months', '🔍', 2, 'published', 1),
(3, 'Phase 3', 'Controls & Monitoring', '6–12 months', '🛡️', 3, 'published', 1),
(4, 'Phase 4', 'Audit & Optimisation', 'Ongoing', '📊', 4, 'published', 1);

INSERT INTO framework_implementation_steps (phase_id, step_number, title, description, display_order, status, created_by) VALUES
(1, '1.1', 'Establish an AI Risk Committee', 'Form a cross-functional committee including Legal, Compliance, IT, and Business unit heads.', 1, 'published', 1),
(1, '1.2', 'Appoint an AI Risk Owner', 'Designate a senior individual as accountable owner for the AI Risk Framework.', 2, 'published', 1),
(1, '1.3', 'Draft the AI Acceptable Use Policy', 'Document approved AI use cases, prohibited applications, data handling requirements.', 3, 'published', 1),
(1, '1.4', 'Build the AI System Inventory', 'Catalogue all AI/ML systems in production, development, and evaluation.', 4, 'published', 1),
(2, '2.1', 'Apply the AI Risk Classification Matrix', 'Classify each system by impact and risk domain. Align to EU AI Act risk tiers.', 1, 'published', 1),
(2, '2.2', 'Conduct Model Risk Assessments', 'Complete a structured MRA covering model purpose, training data quality, and validation.', 2, 'published', 1),
(2, '2.3', 'Perform Vendor AI Due Diligence', 'Assess third-party AI tools against the ARC Vendor Assessment Template.', 3, 'published', 1),
(2, '2.4', 'Map Regulatory Obligations', 'Identify applicable AI regulations and map them to internal controls.', 4, 'published', 1),
(3, '3.1', 'Implement Technical Controls', 'Deploy model explainability tools, drift detection, and adversarial robustness testing.', 1, 'published', 1),
(3, '3.2', 'Establish Continuous Monitoring', 'Define KRIs, KPIs, and alert thresholds for all high-risk AI systems.', 2, 'published', 1),
(3, '3.3', 'Build an AI Incident Response Plan', 'Define roles, escalation paths, and remediation playbooks for AI-specific incidents.', 3, 'published', 1),
(4, '4.1', 'Conduct Annual AI Governance Audit', 'Assess adherence to the framework, control effectiveness, and regulatory changes.', 1, 'published', 1),
(4, '4.2', 'Publish an AI Transparency Report', 'Disclose material AI use cases, governance posture, and risk mitigations to stakeholders.', 2, 'published', 1),
(4, '4.3', 'Iterate the Framework', 'Update the framework annually to reflect new AI capabilities and regulatory developments.', 3, 'published', 1);

SELECT 'ARC Platform schema created successfully. Total tables: 31' AS result;
