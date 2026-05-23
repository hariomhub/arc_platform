# ARC Platform — Database Migration System

## Folder Structure

```
Backend/db/
├── migrate.js                  ← Migration runner (DO NOT EDIT)
├── migrations/                 ← All tracked SQL migration files
│   ├── 0001_complete_fresh_schema.sql
│   ├── 0002_seed_essential_data.sql
│   └── XXXX_description.sql    ← Your future migrations go here
├── complete_fresh_schema.sql   ← Reference copy (not tracked by runner)
└── README.md                   ← This file
```

---

## How the Migration System Works

When you run the migration runner, it:
1. Creates a `schema_migrations` table in the database (if it doesn't exist)
2. Scans all `*.sql` files in `db/migrations/` in numeric order
3. Skips files that are already recorded in `schema_migrations`
4. Runs each new file and records it on success
5. Rolls back on failure — the database stays clean

---

## Commands

Run these from the `Backend/` directory:

| Command | What it does |
|---|---|
| `npm run db:status` | Show which migrations are applied vs pending |
| `npm run db:dry-run` | Preview what would run, without touching the DB |
| `npm run db:migrate` | Apply all pending migrations |

---

## Adding a New Migration

> **Do this every time you change the database schema.**

### Step 1 — Create a new SQL file

Name it with the next number in sequence:

```
db/migrations/0003_add_column_to_users.sql
```

Always add a header comment:

```sql
-- Migration: 0003_add_column_to_users
-- Description: Adds phone_number column to users table
-- Created: 2026-06-01
-- Author: Your Name

ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL;

SELECT 'Migration 0003: phone_number added to users.' AS result;
```

### Step 2 — Test locally

```bash
npm run db:dry-run    # Check it would be picked up
npm run db:migrate    # Apply it
npm run db:status     # Confirm it is marked as applied
```

### Step 3 — Commit the file

```bash
git add db/migrations/0003_add_column_to_users.sql
git commit -m "db: add phone_number column to users"
```

---

## Rules for Writing Migrations

| ✅ DO | ❌ DON'T |
|---|---|
| Use `CREATE TABLE IF NOT EXISTS` | Use `CREATE TABLE` (will error if table exists) |
| Use `ALTER TABLE ... ADD COLUMN IF...` pattern | Drop columns without checking data impact |
| Add a `SELECT '...' AS result;` at the end | Edit an already-applied migration file |
| Keep each migration focused on one change | Combine unrelated schema changes in one file |
| Test with `--dry-run` before applying | Run raw SQL directly without creating a migration |

---

## Current Migration History

| # | File | Description |
|---|---|---|
| 0001 | `0001_complete_fresh_schema.sql` | Baseline: all 31 tables |
| 0002 | `0002_seed_essential_data.sql` | Admin user + framework seed data |

---

## Environment Variables Required

The migration runner reads from `Backend/.env`. Make sure these are set:

```
DB_HOST=your-server.mysql.database.azure.com
DB_USER=racdbp
DB_PASSWORD=your-password
DB_NAME=racdbp
DB_PORT=3306
```
