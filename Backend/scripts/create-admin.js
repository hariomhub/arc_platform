/**
 * create-admin.js — One-time admin seed script
 * ─────────────────────────────────────────────
 * Run:  node scripts/create-admin.js
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env (falls back to safe defaults).
 * Creates or updates the admin user with a freshly hashed password.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const ADMIN_NAME     = process.env.ADMIN_NAME     || 'ARC Administrator';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@arc.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

async function main() {
    // ── Connect ────────────────────────────────────────────────────────────
    const pool = mysql.createPool({
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port:     parseInt(process.env.DB_PORT, 10) || 3306,
    });

    console.log('🔌 Connecting to database…');

    try {
        const conn = await pool.getConnection();
        console.log(`✅ Connected to "${process.env.DB_NAME}"`);
        conn.release();
    } catch (err) {
        console.error('❌ DB connection failed:', err.message);
        process.exit(1);
    }

    // ── Hash password ──────────────────────────────────────────────────────
    console.log(`🔐 Hashing password with bcrypt (rounds=12)…`);
    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // ── Upsert admin user ──────────────────────────────────────────────────
    const [existing] = await pool.query(
        'SELECT id, email FROM users WHERE email = ?',
        [ADMIN_EMAIL.toLowerCase()]
    );

    if (existing.length > 0) {
        // Update existing account — refresh password + ensure approved admin
        await pool.query(
            `UPDATE users 
             SET password_hash = ?, role = 'admin', status = 'approved', name = ?
             WHERE email = ?`,
            [password_hash, ADMIN_NAME, ADMIN_EMAIL.toLowerCase()]
        );
        console.log(`✅ Admin account updated: ${ADMIN_EMAIL}`);
    } else {
        // Insert brand-new admin
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status, organization_name)
             VALUES (?, ?, ?, 'admin', 'approved', 'AI Risk Council')`,
            [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), password_hash]
        );
        console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
    }

    console.log('\n📋 Login credentials:');
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  Change the password after first login!\n');

    await pool.end();
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});
