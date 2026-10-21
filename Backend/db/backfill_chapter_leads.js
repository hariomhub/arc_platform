/**
 * backfill_chapter_leads.js — one-off, run AFTER migrations 0019 + 0020
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a chapter_lead_profiles row (with a referral code) for every existing
 * approved Chapter Lead (role = council_member) who does not have one yet, and
 * moves their membership expiry to the end of their current term.
 *
 * USAGE (from the Backend folder):
 *   node db/backfill_chapter_leads.js            dry run — prints the plan, writes nothing
 *   node db/backfill_chapter_leads.js --apply    performs the backfill
 *
 * Term start date, in order of preference:
 *   1. processed_at of the latest approved Chapter Lead application   (exact)
 *   2. membership_expires_at minus 2 years    (every promotion path used to set
 *      expiry = promotion date + 2 years, so this recovers admin-promoted leads)
 *   3. users.created_at                                               (last resort)
 * Admins can correct any date afterwards in Admin Dashboard → Chapter Leads.
 *
 * Leads whose membership has ALREADY expired are listed but left untouched — they
 * cannot log in today, and whether to reinstate them is a decision for an admin.
 *
 * Chapters are not assigned (no chapter data exists yet): assign them in the
 * admin panel afterwards. Safe to re-run: leads that already have an active
 * profile are skipped.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {
    DEFAULT_POLICY, generateReferralCode, getTermInfo, addMonthsUTC, toSqlDateTime, dbDate,
} from '../utils/chapterLeadRules.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APPLY = process.argv.includes('--apply');

const fmt = (d) => (d ? d.toISOString().slice(0, 10) : '—');

async function main() {
    console.log(`\n🏛️  Chapter Lead backfill — ${APPLY ? 'APPLY MODE (writes data)' : 'DRY RUN (no changes)'}`);
    console.log('──────────────────────────────────────────────────────────');

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        ssl: { rejectUnauthorized: false },
    });
    console.log(`✔  Connected to: ${process.env.DB_HOST}/${process.env.DB_NAME}\n`);

    // The migrations must already be applied.
    const [tables] = await conn.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('chapter_lead_profiles', 'chapter_lead_policy')`
    );
    if (tables.length < 2) {
        console.error('❌ Run migrations 0019 and 0020 first (node db/migrate.js).');
        await conn.end();
        process.exit(1);
    }

    const [policyRows] = await conn.query(
        'SELECT * FROM chapter_lead_policy WHERE effective_from <= CURDATE() ORDER BY effective_from DESC LIMIT 1'
    );
    const policy = policyRows[0] || DEFAULT_POLICY;
    const now = new Date();

    const [leads] = await conn.query(
        `SELECT u.id, u.name, u.email, u.created_at, u.membership_expires_at,
                (SELECT MAX(ma.processed_at) FROM membership_applications ma
                 WHERE ma.user_id = u.id AND ma.requested_role = 'council_member' AND ma.status = 'approved') AS approved_at
         FROM users u
         WHERE u.role = 'council_member' AND u.status = 'approved'
           AND NOT EXISTS (SELECT 1 FROM chapter_lead_profiles p WHERE p.user_id = u.id AND p.status = 'active')
         ORDER BY u.id`
    );

    if (!leads.length) {
        console.log('✅ Nothing to do — every approved Chapter Lead already has a profile.\n');
        await conn.end();
        return;
    }

    const plan = [];
    const skippedExpired = [];
    for (const lead of leads) {
        const expiry = dbDate(lead.membership_expires_at);
        if (expiry && expiry < now) {
            skippedExpired.push({ ...lead, expiry });
            continue;
        }
        let start; let source;
        const approved = dbDate(lead.approved_at);
        if (approved) { start = approved; source = 'application'; }
        else if (expiry) { start = addMonthsUTC(expiry, -24); source = 'expiry − 2y'; }
        else { start = dbDate(lead.created_at); source = 'created_at'; }

        const info = getTermInfo(start, now, policy);
        plan.push({ lead, start, source, info });
    }

    console.log('Leads to backfill:\n');
    console.log('  id    name                          term start   source        term  rate   new expiry');
    console.log('  ' + '─'.repeat(92));
    plan.forEach(({ lead, start, source, info }) => {
        console.log(
            `  ${String(lead.id).padEnd(5)} ${String(lead.name).slice(0, 28).padEnd(29)} ${fmt(start)}   ` +
            `${source.padEnd(13)} ${String(info.termNumber).padEnd(5)} ${String(info.rate + '%').padEnd(6)} ${fmt(info.termEnd)}`
        );
    });

    if (skippedExpired.length) {
        console.log('\n⚠️  Skipped — membership already expired (cannot log in today). Decide per person:\n');
        skippedExpired.forEach((l) => console.log(`  ${String(l.id).padEnd(5)} ${String(l.name).slice(0, 28).padEnd(29)} expired ${fmt(l.expiry)}`));
    }

    console.log(`\n${plan.length} to backfill, ${skippedExpired.length} skipped (expired).`);

    if (!APPLY) {
        console.log('\nDry run only. Re-run with --apply to write these changes.\n');
        await conn.end();
        return;
    }

    let created = 0;
    for (const { lead, start, info } of plan) {
        await conn.beginTransaction();
        try {
            let inserted = false;
            for (let attempt = 0; attempt < 8 && !inserted; attempt += 1) {
                try {
                    await conn.query(
                        `INSERT INTO chapter_lead_profiles (user_id, chapter_id, referral_code, status, term_started_at)
                         VALUES (?, NULL, ?, 'active', ?)`,
                        [lead.id, generateReferralCode(), toSqlDateTime(start)]
                    );
                    inserted = true;
                } catch (err) {
                    if (err.code === 'ER_DUP_ENTRY' && String(err.sqlMessage).includes('uq_clp_referral_code')) continue;
                    throw err;
                }
            }
            if (!inserted) throw new Error('could not generate a unique referral code');
            await conn.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [toSqlDateTime(info.termEnd), lead.id]);
            await conn.commit();
            created += 1;
        } catch (err) {
            await conn.rollback();
            console.error(`❌ Lead ${lead.id} (${lead.name}) failed: ${err.message}`);
        }
    }
    console.log(`\n✅ Backfilled ${created} of ${plan.length} Chapter Lead profile(s).`);
    console.log('   Next: assign each lead a chapter in Admin Dashboard → Chapter Leads.\n');
    await conn.end();
}

main().catch((err) => {
    console.error('\n💥 Backfill crashed:', err.message);
    process.exit(1);
});
