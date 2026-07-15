-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add product logo + company logo columns to products
-- Run once against your live database (racdbp)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE products
  ADD COLUMN product_logo_url VARCHAR(500) NULL AFTER category_id,
  ADD COLUMN company_logo_url VARCHAR(500) NULL AFTER product_logo_url;

-- ── Verify ─────────────────────────────────────────────────────────────────
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM   information_schema.COLUMNS
WHERE  TABLE_SCHEMA = DATABASE()
  AND  TABLE_NAME   = 'products'
ORDER BY ORDINAL_POSITION;
