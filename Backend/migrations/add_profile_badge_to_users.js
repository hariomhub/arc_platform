import pool from '../db/connection.js';

async function runMigration() {
    try {
        console.log('Adding profile_badge column to users table...');
        await pool.query("ALTER TABLE users ADD COLUMN profile_badge VARCHAR(100) DEFAULT NULL");
        console.log('Migration successful.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column profile_badge already exists. Skipping.');
            process.exit(0);
        }
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
