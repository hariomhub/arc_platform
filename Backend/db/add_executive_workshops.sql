-- Executive Workshops Table Migration
-- Run this manually in your database

CREATE TABLE IF NOT EXISTS executive_workshops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATETIME NOT NULL,
  location VARCHAR(255),
  description TEXT,
  speaker VARCHAR(255),
  agenda TEXT,
  recording_url VARCHAR(500),
  banner_image VARCHAR(500),
  is_published BOOLEAN DEFAULT TRUE,
  is_upcoming BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_workshops_upcoming ON executive_workshops(is_upcoming);
CREATE INDEX idx_workshops_published ON executive_workshops(is_published);
