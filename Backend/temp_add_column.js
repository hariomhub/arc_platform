import pool from './db/connection.js';

const addDownloadCount = async () => {
    try {
        console.log('Adding download_count column to resources table...');
        await pool.query('ALTER TABLE resources ADD COLUMN download_count INT DEFAULT 0');
        console.log('Successfully added download_count column.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column download_count already exists. Skipping.');
        } else {
            console.error('Error:', err);
        }
    } finally {
        process.exit();
    }
};

addDownloadCount();
