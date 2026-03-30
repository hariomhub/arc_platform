/**
 * membershipExpiryJob.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron job that runs daily at 08:00 UTC and:
 *
 *   1. Finds users whose membership expires in exactly 15 days
 *      → sends sendMembershipExpiryWarningEmail (daysLeft: 15)
 *
 *   2. Finds users whose membership expires in exactly 7 days
 *      → sends sendMembershipExpiryWarningEmail (daysLeft: 7)
 *
 *   3. Finds users whose membership expired yesterday (within the last 24 h)
 *      → sends sendMembershipExpiredEmail
 *
 * Founding members have no expiry date (NULL) — they are skipped.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import cron from 'node-cron';
import pool from '../db/connection.js';
import {
    sendMembershipExpiryWarningEmail,
    sendMembershipExpiredEmail,
} from '../services/emailService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns users whose membership_expires_at falls within the given UTC date range.
 * Only roles that actually expire (professional, executive) are included.
 */
const getUsersExpiringBetween = async (fromDate, toDate) => {
    const [rows] = await pool.query(
        `SELECT id, name, email, role, membership_expires_at
         FROM users
         WHERE membership_expires_at >= ?
           AND membership_expires_at <  ?
           AND role IN ('professional', 'executive')
           AND is_approved = 1`,
        [fromDate, toDate],
    );
    return rows;
};

// ── Main check ────────────────────────────────────────────────────────────────

export const runMembershipExpiryCheck = async () => {
    console.log('[MembershipExpiry] Running daily membership expiry check...');

    const now = new Date();

    try {
        // ── 1. 15-day reminder ────────────────────────────────────────────────
        // Window: users expiring in exactly 15 days (today + 15)
        const reminder15Start = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 15, 0, 0, 0,
        ));
        const reminder15End = new Date(reminder15Start.getTime() + 24 * 60 * 60 * 1000);

        const expiring15 = await getUsersExpiringBetween(reminder15Start, reminder15End);
        console.log(`[MembershipExpiry] ${expiring15.length} user(s) expiring in 15 days`);

        for (const user of expiring15) {
            sendMembershipExpiryWarningEmail({
                name:      user.name,
                email:     user.email,
                role:      user.role,
                expiresAt: user.membership_expires_at,
                daysLeft:  15,
            });
        }

        // ── 2. 7-day warning ──────────────────────────────────────────────────
        // Window: users expiring in exactly 7 days (today + 7)
        const warningStart = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 0, 0, 0,
        ));
        const warningEnd = new Date(warningStart.getTime() + 24 * 60 * 60 * 1000);

        const expiringSoon = await getUsersExpiringBetween(warningStart, warningEnd);
        console.log(`[MembershipExpiry] ${expiringSoon.length} user(s) expiring in 7 days`);

        for (const user of expiringSoon) {
            sendMembershipExpiryWarningEmail({
                name:      user.name,
                email:     user.email,
                role:      user.role,
                expiresAt: user.membership_expires_at,
                daysLeft:  7,
            });
        }

        // ── 2. Expiry notification ────────────────────────────────────────────
        // Window: users whose expiry fell within the last 24 h (yesterday's window)
        const expiredEnd   = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0,
        ));
        const expiredStart = new Date(expiredEnd.getTime() - 24 * 60 * 60 * 1000);

        const justExpired = await getUsersExpiringBetween(expiredStart, expiredEnd);
        console.log(`[MembershipExpiry] ${justExpired.length} user(s) expired yesterday`);

        for (const user of justExpired) {
            sendMembershipExpiredEmail({
                name:      user.name,
                email:     user.email,
                role:      user.role,
                expiredAt: user.membership_expires_at,
            });
        }

        console.log('[MembershipExpiry] Check complete.');
    } catch (err) {
        console.error('[MembershipExpiry] Error during check:', err.message);
    }
};

// ── Cron initialiser ─────────────────────────────────────────────────────────

export const initMembershipExpiryCron = () => {
    console.log('[MembershipExpiry] Scheduling daily check at 08:00 UTC...');

    // Every day at 08:00 UTC
    cron.schedule('0 8 * * *', () => {
        runMembershipExpiryCheck();
    }, { timezone: 'UTC' });

    console.log('[MembershipExpiry] Cron job registered.');
};
