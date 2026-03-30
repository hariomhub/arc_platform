-- CREATE DATABASE IF NOT EXISTS racdatabase;
-- USE racdatabase;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('founding_member','executive','professional') NOT NULL DEFAULT 'professional',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  membership_expires_at DATETIME NULL DEFAULT NULL COMMENT 'NULL = lifetime. Set on approval: 1yr for professional, 3yr for executive, NULL for founding_member.',
  bio TEXT,
  photo_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  organization_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATETIME NOT NULL,
  location VARCHAR(255),
  description TEXT,
  link VARCHAR(500),
  event_category ENUM('webinar','seminar','workshop','podcast') NOT NULL,
  is_upcoming BOOLEAN DEFAULT TRUE,
  recording_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_category ON events(event_category);
CREATE INDEX idx_events_upcoming ON events(is_upcoming);

CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  abstract TEXT,
  file_url VARCHAR(500),
  demo_url VARCHAR(500),
  type ENUM('framework','whitepaper','product','video','article','tool','news') NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  uploader_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);

CREATE INDEX idx_resources_type ON resources(type);

CREATE TABLE team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  photo_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE qna_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  tags VARCHAR(500),
  author_id INT NOT NULL,
  vote_count INT DEFAULT 0,
  answer_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_qna_author ON qna_posts(author_id);

CREATE TABLE qna_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES qna_posts(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_answers_post ON qna_answers(post_id);

CREATE TABLE qna_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES qna_posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  link VARCHAR(2000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Product Reviews System ──────────────────────────────────────────────────

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  vendor VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  portal_url VARCHAR(500),
  short_description TEXT,
  overview TEXT,
  version_tested VARCHAR(100),
  key_features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_vendor ON products(vendor);
CREATE INDEX idx_products_category ON products(category);

CREATE TABLE product_feature_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  test_method TEXT,
  result TEXT,
  score DECIMAL(4,1),
  comments TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_feature_tests_product ON product_feature_tests(product_id);

CREATE TABLE product_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  type ENUM('image','video') NOT NULL,
  url VARCHAR(500) NOT NULL,
  label VARCHAR(255),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_media_product ON product_media(product_id);

CREATE TABLE product_evidences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  feature_test_id INT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_test_id) REFERENCES product_feature_tests(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_evidences_product ON product_evidences(product_id);

CREATE TABLE product_user_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_review (product_id, user_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_reviews_product ON product_user_reviews(product_id);

-- ─── Awards, Nominations & Voting ─────────────────────────────────────────────

CREATE TABLE awards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE award_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  award_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  timeline ENUM('quarterly','half-yearly','yearly') NOT NULL DEFAULT 'yearly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE
);

CREATE INDEX idx_award_categories_award ON award_categories(award_id);

CREATE TABLE nominees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  award_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(255),
  company VARCHAR(255),
  photo_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  achievements TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES award_categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_nominees_award ON nominees(award_id);
CREATE INDEX idx_nominees_category ON nominees(category_id);

CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nominee_id INT NOT NULL,
  category_id INT NOT NULL,
  award_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vote_per_category (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (nominee_id) REFERENCES nominees(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES award_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE
);

CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_nominee ON votes(nominee_id);

-- ── Seed: Awards ──────────────────────────────────────────────────────────────
INSERT INTO awards (name, description, is_active) VALUES
  ('Top CISO Awards 2026', 'Recognising outstanding Chief Information Security Officers driving AI governance and risk management globally.', TRUE),
  ('AI Risk Leadership Awards 2026', 'Honouring leaders who have made significant contributions to AI risk frameworks and responsible AI deployment.', TRUE);

-- ── Seed: Categories ──────────────────────────────────────────────────────────
INSERT INTO award_categories (award_id, name, timeline) VALUES
  (1, 'Best AI Risk Leader',          'quarterly'),
  (1, 'Outstanding Security Innovation', 'half-yearly'),
  (1, 'AI Governance Champion',       'yearly'),
  (2, 'AI Ethics Excellence',         'quarterly'),
  (2, 'Risk Framework Pioneer',       'yearly');

-- ── Seed: Nominees ────────────────────────────────────────────────────────────
INSERT INTO nominees (award_id, category_id, name, designation, company, photo_url, linkedin_url, achievements, description, is_active) VALUES
  (1, 1, 'Sarah Chen',     'Chief Information Security Officer', 'GlobalTech Corp',
   NULL, 'https://linkedin.com',
   'Led EU AI Act compliance framework; Reduced AI security incidents by 60%; Authored 3 published AI risk frameworks',
   'Sarah Chen has been at the forefront of AI security governance for over a decade. Her pioneering work at GlobalTech Corp established one of the industry''s most comprehensive AI risk management programs, earning recognition from regulatory bodies across 14 countries.',
   TRUE),
  (1, 1, 'Marcus Williams', 'VP of Cybersecurity & AI Risk', 'FinSecure International',
   NULL, 'https://linkedin.com',
   'Developed proprietary AI threat modelling methodology; Secured ISO 42001 certification; Speaker at 12 international conferences',
   'Marcus Williams brings a unique blend of financial-sector expertise and AI security knowledge. His development of the FinSecure AI Threat Model has been adopted by over 200 financial institutions worldwide as a best-practice framework.',
   TRUE),
  (1, 2, 'Dr. Priya Nair', 'Director of AI Governance', 'TechAssure Ltd',
   NULL, 'https://linkedin.com',
   'Published 8 peer-reviewed papers on AI security; Advised EU AI Act committee; Built AI governance team from 0 to 45 members',
   'Dr. Priya Nair''s academic rigour combined with practical industry experience makes her a singular voice in AI governance. Her advisory role in shaping the EU AI Act has had global implications for how high-risk AI systems are regulated.',
   TRUE),
  (1, 3, 'James Okafor',  'CISO & AI Risk Officer', 'DataShield Africa',
   NULL, 'https://linkedin.com',
   'Launched first pan-African AI risk certification program; Protected systems serving 50M+ users; Keynote at Davos AI Forum 2025',
   'James Okafor has transformed AI security across the African continent, building robust governance structures that protect critical digital infrastructure. His certification program has trained over 5,000 security professionals across 32 countries.',
   TRUE),
  (2, 4, 'Dr. Anika Sharma', 'Head of AI Ethics & Compliance', 'EthicsFirst AI',
   NULL, 'https://linkedin.com',
   'Designed ethical AI audit framework adopted by 80+ organisations; Received UN Recognition for AI ethics work; TEDx speaker on responsible AI',
   'Dr. Anika Sharma''s work sits at the intersection of ethics, technology, and policy. Her ethical AI audit framework has become the de facto standard for assessing AI system fairness and accountability in regulated industries.',
   TRUE),
  (2, 5, 'Robert Zhang',  'Chief Risk & Compliance Officer', 'AsiaPac Technologies',
   NULL, 'https://linkedin.com',
   'Pioneered cross-jurisdictional AI risk harmonisation; Led APAC AI regulatory task force; Managed $2B+ AI risk portfolio',
   'Robert Zhang has been instrumental in harmonising divergent AI regulatory requirements across 18 Asia-Pacific jurisdictions. His practical risk frameworks enable organisations to navigate complex multi-regulatory environments while accelerating responsible AI adoption.',
   TRUE);
