/**
 * migrate.js — Production-grade migration runner
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW IT WORKS:
 *   1. Creates a `schema_migrations` table in the database (if not exists) to
 *      track which SQL migration files have been applied.
 *   2. Scans Backend/db/migrations/*.sql in numeric order.
 *   3. Skips files already recorded in `schema_migrations`.
 *   4. Runs each new file inside a transaction — rolls back on failure.
 *   5. Records each successful migration with its checksum.
 *
 * USAGE:
 *   node db/migrate.js           — run all pending migrations
 *   node db/migrate.js --status  — list migrations and their applied status
 *   node db/migrate.js --dry-run — show what would run, without executing
 *
 * ADDING A NEW MIGRATION:
 *   Create a new file in Backend/db/migrations/ with the naming convention:
 *     XXXX_description.sql   (where XXXX is the next number in sequence)
 *   Example: 0003_add_column_to_users.sql
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs        from 'fs';
import path      from 'path';
import crypto    from 'crypto';
import mysql     from 'mysql2/promise';
import dotenv    from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// ── DB connection ─────────────────────────────────────────────────────────────
async function getConnection() {
    return mysql.createConnection({
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port:     parseInt(process.env.DB_PORT || '3306'),
        ssl:      { rejectUnauthorized: false },
        multipleStatements: true,
    });
}

// ── Create tracking table ─────────────────────────────────────────────────────
async function ensureMigrationsTable(conn) {
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            filename    VARCHAR(255) NOT NULL UNIQUE,
            checksum    VARCHAR(64)  NOT NULL,
            applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

// ── Get list of already-applied migrations ────────────────────────────────────
async function getApplied(conn) {
    const [rows] = await conn.execute('SELECT filename, checksum FROM schema_migrations ORDER BY filename');
    return new Map(rows.map(r => [r.filename, r.checksum]));
}

// ── Compute file checksum ─────────────────────────────────────────────────────
function checksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

// ── Get sorted list of migration files ───────────────────────────────────────
function getMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
        process.exit(1);
    }
    return fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
}

// ── Run a single migration ────────────────────────────────────────────────────
async function runMigration(conn, filename, content, isDryRun) {
    const hash = checksum(content);

    if (isDryRun) {
        console.log(`  [DRY-RUN] Would apply: ${filename}`);
        return;
    }

    // Split on semicolons but preserve stored procedures with DELIMITER
    // Use multipleStatements: true — the driver handles it
    await conn.beginTransaction();
    try {
        await conn.query(content);
        await conn.execute(
            'INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)',
            [filename, hash]
        );
        await conn.commit();
        console.log(`  ✅ Applied: ${filename}`);
    } catch (err) {
        await conn.rollback();
        console.error(`  ❌ Failed:  ${filename}`);
        console.error(`     Error:  ${err.message}`);
        throw err;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const args      = process.argv.slice(2);
    const isDryRun  = args.includes('--dry-run');
    const isStatus  = args.includes('--status');

    console.log('\n🗄️  ARC Platform — Migration Runner');
    console.log('────────────────────────────────────');

    const conn = await getConnection();
    console.log(`✔  Connected to: ${process.env.DB_HOST}/${process.env.DB_NAME}\n`);

    await ensureMigrationsTable(conn);

    const applied = await getApplied(conn);
    const files   = getMigrationFiles();

    if (isStatus) {
        console.log('Migration Status:\n');
        console.log(`${'File'.padEnd(50)} ${'Status'.padEnd(10)} Applied At`);
        console.log('─'.repeat(85));

        // Show applied first
        for (const [filename, hash] of applied) {
            const [row] = await conn.execute(
                'SELECT applied_at FROM schema_migrations WHERE filename = ?', [filename]
            );
            const date = row[0]?.applied_at?.toISOString().replace('T', ' ').slice(0, 19) || '';
            console.log(`${filename.padEnd(50)} ${'✅ applied'.padEnd(10)} ${date}`);
        }
        // Show pending
        for (const f of files) {
            if (!applied.has(f)) {
                console.log(`${f.padEnd(50)} ${'⏳ pending'.padEnd(10)}`);
            }
        }
        await conn.end();
        return;
    }

    // ── Run pending migrations ─────────────────────────────────────────────────
    const pending = files.filter(f => !applied.has(f));

    if (pending.length === 0) {
        console.log('✅ All migrations are up to date. Nothing to apply.\n');
        await conn.end();
        return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);

    for (const filename of pending) {
        const filepath = path.join(MIGRATIONS_DIR, filename);
        const content  = fs.readFileSync(filepath, 'utf8');
        await runMigration(conn, filename, content, isDryRun);
    }

    console.log(`\n${isDryRun ? '🔍 Dry run complete.' : '🎉 All migrations applied successfully.'}\n`);
    await conn.end();
}

main().catch(err => {
    console.error('\n💥 Migration runner crashed:', err.message);
    process.exit(1);
});
