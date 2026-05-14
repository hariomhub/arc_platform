import pool from '../db/connection.js';

async function runMigration() {
    try {
        console.log('Adding access_level column to resources table...');
        await pool.query("ALTER TABLE resources ADD COLUMN access_level VARCHAR(50) DEFAULT 'public'");
        console.log('Migration successful.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column access_level already exists. Skipping.');
            process.exit(0);
        }
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
