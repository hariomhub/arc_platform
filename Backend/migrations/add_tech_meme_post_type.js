import pool from '../db/connection.js';

async function runMigration() {
    try {
        console.log('Adding tech_meme to feed_posts.post_type ENUM...');
        await pool.query(`
            ALTER TABLE feed_posts
            MODIFY COLUMN post_type
            ENUM('ai_product','poll','event','troubleshooting','general','tech_meme')
            NOT NULL DEFAULT 'general'
        `);
        console.log('Migration successful: tech_meme added to post_type ENUM.');
        process.exit(0);
    } catch (error) {
        // If the ENUM already has tech_meme, MySQL throws ER_INVALID_DEFAULT or just silently succeeds
        // Either way, treat it as safe
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
