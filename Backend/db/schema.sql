CREATE DATABASE IF NOT EXISTS arc_platform;
USE arc_platform;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','free_member','paid_member','executive','university','product_company') DEFAULT 'free_member',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
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
  type ENUM('framework','whitepaper','product') NOT NULL,
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
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
