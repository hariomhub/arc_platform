import pool from '../db/connection.js';

const tables = [
    `CREATE TABLE IF NOT EXISTS products (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor)`,
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
    `CREATE TABLE IF NOT EXISTS product_feature_tests (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_feature_tests_product ON product_feature_tests(product_id)`,
    `CREATE TABLE IF NOT EXISTS product_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        type ENUM('image','video') NOT NULL,
        url VARCHAR(500) NOT NULL,
        label VARCHAR(255),
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media(product_id)`,
    `CREATE TABLE IF NOT EXISTS product_evidences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_product_evidences_product ON product_evidences(product_id)`,
    `CREATE TABLE IF NOT EXISTS product_user_reviews (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_user_reviews_product ON product_user_reviews(product_id)`,
];

(async () => {
    for (const sql of tables) {
        try {
            await pool.query(sql);
            console.log('✅', sql.trim().slice(0, 70).replace(/\s+/g, ' '));
        } catch (err) {
            console.error('❌', err.message);
        }
    }
    console.log('\n✅ Product review migration complete.');
    process.exit(0);
})();
