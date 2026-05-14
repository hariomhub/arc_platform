import pool from '../db/connection.js';

async function runMigration() {
    try {
        console.log('Adding thumbnail_url column to resources table...');
        await pool.query('ALTER TABLE resources ADD COLUMN thumbnail_url VARCHAR(1024) DEFAULT NULL');
        console.log('Migration successful.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column thumbnail_url already exists. Skipping.');
            process.exit(0);
        }
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
