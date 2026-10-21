/**
 * chapterLeadJob.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Daily cron (01:00 UTC) for the Chapter Lead programme:
 *
 *   1. Term roll-over  — a lead whose 18-month term has ended continues into the
 *                        next term (and rate) automatically.
 *   2. Quarter close   — snapshots every finished quarter that has no result yet,
 *                        escalates misses and notifies the lead / admins.
 *   3. Mid-quarter nudge — on day 60 of a quarter, tells leads who are behind pace.
 *
 * Every step is idempotent, so a missed day is healed by the next run (an admin
 * can also trigger it from the Chapter Leads tab).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import cron from 'node-cron';
import { runChapterLeadDaily } from '../services/chapterLeadService.js';

export const initChapterLeadCron = () => {
    console.log('[ChapterLead] Scheduling daily job at 01:00 UTC...');

    cron.schedule('0 1 * * *', async () => {
        console.log('[ChapterLead] Running daily job...');
        const result = await runChapterLeadDaily(new Date());
        console.log('[ChapterLead] Daily job complete:', JSON.stringify(result));
    }, { timezone: 'UTC' });

    console.log('[ChapterLead] Cron job registered.');
};
