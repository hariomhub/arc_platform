import pool from '../db/connection.js';

async function moveVideos() {
    try {
        console.log('Starting migration: moving 3 recent tech_reels to homepage_video...');
        
        // Use an IN subquery with LIMIT 3 to update
        const [result] = await pool.query(`
            UPDATE resources 
            SET type = 'homepage_video' 
            WHERE id IN (
                SELECT id FROM (
                    SELECT id FROM resources 
                    WHERE type = 'tech_reels' 
                    ORDER BY created_at DESC 
                    LIMIT 3
                ) as tmp
            )
        `);
        console.log(`Successfully updated ${result.affectedRows} rows.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

moveVideos();
