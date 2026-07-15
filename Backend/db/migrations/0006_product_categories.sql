-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Normalize product categories into a managed lookup table
-- Run once against your live database (racdbp)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Create the categories table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   VARCHAR(255),
  display_order INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Seed the managed category list ─────────────────────────────────────────
INSERT INTO product_categories (name, description, display_order) VALUES
  ('Endpoint Security',                'Antivirus, EDR/XDR, device control, screen/data-loss protection', 10),
  ('Network Security',                 'Firewalls, IDS/IPS, SASE, zero trust network access', 20),
  ('Cloud Security',                   'CSPM, CWPP, container & Kubernetes security', 30),
  ('Server & Infrastructure Security', 'OS hardening, vulnerability & patch management', 40),
  ('Identity & Access Management',     'SSO, MFA, PAM, identity governance', 50),
  ('Data Security & Privacy',          'DLP, encryption, data classification, privacy management', 60),
  ('Quantum Computing & Encryption',   'Post-quantum cryptography, quantum-safe key management', 70),
  ('AI Governance & Risk',             'AI policy, model risk management, audit, regulatory compliance (EU AI Act, NIST AI RMF)', 80),
  ('AI Security',                      'Model security, prompt-injection defense, LLM firewalls, adversarial robustness', 90),
  ('AI Agents — Productivity',         'Autonomous workflow agents, AI copilots for business tasks', 100),
  ('AI Agents — Security',             'Autonomous SOC/threat-hunting agents, agentic red-teaming', 110),
  ('Security Operations & SOC',        'SIEM, SOAR, MDR, managed detection & response, human SOC services', 120),
  ('Productivity',                     'General productivity & collaboration software', 130),
  ('Human Services',                   'Managed services, staffing augmentation, human-in-the-loop review, consulting', 140),
  ('Others',                           'Anything that doesn''t fit the above categories', 999)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ── 3. Preserve any existing free-text categories not covered by the seed list ─
INSERT INTO product_categories (name, display_order)
SELECT DISTINCT TRIM(p.category), 500
FROM products p
WHERE p.category IS NOT NULL AND TRIM(p.category) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM product_categories pc WHERE LOWER(TRIM(pc.name)) = LOWER(TRIM(p.category))
  );

-- ── 4. Add the FK column and backfill it from the old text column ────────────
ALTER TABLE products ADD COLUMN category_id INT NULL AFTER category;

UPDATE products p
JOIN product_categories pc ON LOWER(TRIM(pc.name)) = LOWER(TRIM(p.category))
SET p.category_id = pc.id
WHERE p.category IS NOT NULL AND TRIM(p.category) <> '';

ALTER TABLE products
  ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  ADD INDEX idx_products_category_id (category_id);

-- ── 5. Drop the old free-text column (also drops its index automatically) ────
ALTER TABLE products DROP COLUMN category;

-- ── 6. Verify ──────────────────────────────────────────────────────────────
SELECT p.id, p.name, pc.name AS category
FROM products p
LEFT JOIN product_categories pc ON pc.id = p.category_id
ORDER BY p.id;
