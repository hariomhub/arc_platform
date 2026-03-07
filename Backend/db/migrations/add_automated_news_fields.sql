-- Migration: Add fields for automated news aggregation
-- Date: 2026-03-07
-- Description: Extends the existing news table to support automated RSS news fetching

USE arc_platform;

-- Add new columns to existing news table (all in one ALTER statement)
ALTER TABLE news 
ADD COLUMN is_automated BOOLEAN DEFAULT FALSE COMMENT 'True if news was auto-fetched from RSS',
ADD COLUMN source VARCHAR(255) DEFAULT NULL COMMENT 'News source name (e.g., TechCrunch, Reuters)',
ADD COLUMN image_url VARCHAR(500) DEFAULT NULL COMMENT 'Article thumbnail/featured image URL',
ADD COLUMN article_url VARCHAR(500) DEFAULT NULL COMMENT 'Original article URL (for external links)',
ADD COLUMN published_at TIMESTAMP DEFAULT NULL COMMENT 'Original publication date from source',
ADD COLUMN status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED' COMMENT 'Approval status for automated news',
ADD COLUMN is_published BOOLEAN DEFAULT TRUE COMMENT 'Whether news is visible on platform',
ADD COLUMN fetched_at TIMESTAMP DEFAULT NULL COMMENT 'When the article was fetched by our system';

-- Create indexes for better query performance (after columns are added)
CREATE INDEX idx_news_is_automated ON news(is_automated);
CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_is_published ON news(is_published);
CREATE INDEX idx_news_published_at ON news(published_at);
CREATE INDEX idx_news_article_url ON news(article_url);

-- Update existing manual news records to have proper status
UPDATE news 
SET is_automated = FALSE, 
    status = 'APPROVED', 
    is_published = TRUE,
    article_url = link
WHERE is_automated = FALSE OR is_automated IS NULL;

