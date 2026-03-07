import pool from './db/connection.js';

try {
    await pool.query(`ALTER TABLE resources ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER type`);
    console.log('✅ Added status column to resources table');
} catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column already exists, skipping.');
    } else {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

// Non-admin uploads should be pending — update existing rows uploaded by non-admins
await pool.query(`
    UPDATE resources r
    JOIN users u ON r.uploader_id = u.id
    SET r.status = 'pending'
    WHERE u.role != 'admin' AND r.status = 'approved'
`);
console.log('✅ Marked existing non-admin uploads as pending');
await pool.end();
process.exit(0);
