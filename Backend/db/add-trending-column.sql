-- Add is_trending column to news table (will fail silently if exists)
ALTER TABLE news ADD COLUMN is_trending BOOLEAN DEFAULT FALSE AFTER is_published;

-- Add index for faster queries
CREATE INDEX idx_is_trending ON news(is_trending);

-- Update some recent approved articles as trending for testing
UPDATE news 
SET is_trending = TRUE 
WHERE status = 'APPROVED' 
AND is_automated = TRUE 
ORDER BY published_at DESC 
LIMIT 3;
