-- Migration: 0003_fix_news_article_url_length
-- Description: Increase the article_url column length to 2000 in news table
-- Created: 2026-05-23
-- Author: System

ALTER TABLE news MODIFY COLUMN article_url VARCHAR(2000) DEFAULT NULL;

SELECT 'Migration 0003: article_url length increased to 2000.' AS result;
