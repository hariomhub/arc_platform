import pool from '../db/connection.js';

async function migrateTechReels() {
    try {
        console.log('Starting migration: changing resource type "video" to "tech_reels"...');
        
        // 1. Expand the ENUM to include 'tech_reels', 'homepage_video', 'lab_result', and keep 'video' temporarily
        console.log('Expanding ENUM...');
        await pool.query(`
            ALTER TABLE resources 
            MODIFY COLUMN type ENUM('framework','whitepaper','product','video','tech_reels','article','tool','news','homepage_video','lab_result') NOT NULL
        `);

        // 2. Update existing rows
        console.log('Updating rows...');
        const [result] = await pool.query("UPDATE resources SET type = 'tech_reels' WHERE type = 'video'");
        console.log(`Updated ${result.affectedRows} rows.`);

        // 3. Remove 'video' from the ENUM entirely
        console.log('Removing "video" from ENUM...');
        await pool.query(`
            ALTER TABLE resources 
            MODIFY COLUMN type ENUM('framework','whitepaper','product','tech_reels','article','tool','news','homepage_video','lab_result') NOT NULL
        `);

        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateTechReels();
