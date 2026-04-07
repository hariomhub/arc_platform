/**
 * notificationDigestJob.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron job that runs daily at 09:00 UTC and checks whether it's time
 * to send the notification digest based on app_settings.
 *
 * Interval is controlled by:
 *   app_settings WHERE key_name = 'notification_digest_interval_days'
 *
 * To change interval — just update the DB, no code change needed:
 *   UPDATE app_settings SET value = '7' WHERE key_name = 'notification_digest_interval_days';
 * ─────────────────────────────────────────────────────────────────────────────
 */

import cron from 'node-cron';
import pool from '../db/connection.js';
import { sendDigestToAllMembers } from '../services/notificationService.js';

// ── Helper: get digest interval from app_settings ─────────────────────────────
const getDigestIntervalDays = async () => {
    try {
        const [[row]] = await pool.query(
            `SELECT value FROM app_settings WHERE key_name = 'notification_digest_interval_days'`
        );
        return row ? parseInt(row.value, 10) || 3 : 3;
    } catch {
        return 3; // safe default
    }
};

// ── Helper: get last digest sent time ────────────────────────────────────────
const getLastDigestSentAt = async () => {
    try {
        const [[row]] = await pool.query(
            `SELECT sent_at FROM notification_digest_log ORDER BY sent_at DESC LIMIT 1`
        );
        return row ? new Date(row.sent_at) : null;
    } catch {
        return null;
    }
};

// ── Main check ────────────────────────────────────────────────────────────────
export const runDigestCheck = async () => {
    console.log('[NotificationDigest] Running digest check...');

    try {
        const intervalDays = await getDigestIntervalDays();
        const lastSentAt   = await getLastDigestSentAt();
        const now          = new Date();

        if (lastSentAt) {
            const daysSinceLast = (now - lastSentAt) / (1000 * 60 * 60 * 24);
            if (daysSinceLast < intervalDays) {
                console.log(`[NotificationDigest] Skipping — last digest was ${daysSinceLast.toFixed(1)} days ago (interval: ${intervalDays} days)`);
                return;
            }
        }

        console.log(`[NotificationDigest] Sending digest (interval: every ${intervalDays} days)...`);
        const { usersReached, notifsBatched } = await sendDigestToAllMembers();
        console.log(`[NotificationDigest] Done — ${notifsBatched} notifications sent to ${usersReached} devices`);
    } catch (err) {
        console.error('[NotificationDigest] Error during check:', err.message);
    }
};

// ── Cron initialiser ─────────────────────────────────────────────────────────
export const initNotificationDigestCron = () => {
    console.log('[NotificationDigest] Scheduling daily digest check at 09:00 UTC...');

    // Runs every day at 09:00 UTC — checks internally if interval has passed
    cron.schedule('0 9 * * *', () => {
        runDigestCheck();
    }, { timezone: 'UTC' });

    console.log('[NotificationDigest] Cron job registered.');
};