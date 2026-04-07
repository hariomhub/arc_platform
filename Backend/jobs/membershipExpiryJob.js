/**
 * membershipExpiryJob.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron job that runs daily at 08:00 UTC and:
 *
 *   1. Finds users whose membership expires in exactly 15 days
 *      → sends email warning (daysLeft: 15)
 *
 *   2. Finds users whose membership expires in exactly 7 days
 *      → sends email warning (daysLeft: 7)
 *      → sends immediate push notification
 *
 *   3. Finds users whose membership expired yesterday (within the last 24 h)
 *      → sends expiry email
 *      → sends immediate push notification
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
import { notifyUser, NOTIF_TYPES } from '../services/notificationService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns users whose membership_expires_at falls within the given UTC date range.
 * Bug fix: was using is_approved = 1 (wrong column) — corrected to status = 'approved'
 */
const getUsersExpiringBetween = async (fromDate, toDate) => {
    const [rows] = await pool.query(
        `SELECT id, name, email, role, membership_expires_at
         FROM users
         WHERE membership_expires_at >= ?
           AND membership_expires_at <  ?
           AND role IN ('professional', 'council_member')
           AND status = 'approved'`,
        [fromDate, toDate],
    );
    return rows;
};

// ── Main check ────────────────────────────────────────────────────────────────

export const runMembershipExpiryCheck = async () => {
    console.log('[MembershipExpiry] Running daily membership expiry check...');

    const now = new Date();

    try {
        // ── 1. 15-day reminder — email only, no push ──────────────────────────
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
            // 15-day reminder is batched (non-urgent) — saved to notifications table
            notifyUser(
                user.id,
                NOTIF_TYPES.MEMBERSHIP_EXPIRING_15,
                'Your membership expires in 15 days',
                'Renew soon to keep your full access to AI Risk Council.',
                { url: '/membership' }
            );
        }

        // ── 2. 7-day warning — email + immediate push ─────────────────────────
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
            // 7-day warning is immediate push
            notifyUser(
                user.id,
                NOTIF_TYPES.MEMBERSHIP_EXPIRING_7,
                'Your membership expires in 7 days',
                'Renew now to keep your full access to AI Risk Council.',
                { url: '/membership' }
            );
        }

        // ── 3. Expired — email + immediate push ───────────────────────────────
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
            // Expiry is immediate push
            notifyUser(
                user.id,
                NOTIF_TYPES.MEMBERSHIP_EXPIRED,
                'Your membership has expired',
                'Contact us to renew and restore your full access.',
                { url: '/contact' }
            );
        }

        console.log('[MembershipExpiry] Check complete.');
    } catch (err) {
        console.error('[MembershipExpiry] Error during check:', err.message);
    }
};

// ── Cron initialiser ─────────────────────────────────────────────────────────

export const initMembershipExpiryCron = () => {
    console.log('[MembershipExpiry] Scheduling daily check at 08:00 UTC...');

    cron.schedule('0 8 * * *', () => {
        runMembershipExpiryCheck();
    }, { timezone: 'UTC' });

    console.log('[MembershipExpiry] Cron job registered.');
};