/**
 * notificationService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Cloud Messaging service for AI Risk Council.
 *
 * Two delivery tracks:
 *   IMMEDIATE  — urgent personal notifications (account approved, Q&A reply, etc.)
 *                Sent to specific user right away.
 *   BATCHED    — broadcast content notifications (events, resources, nominees, etc.)
 *                Saved to DB, sent as a digest every X days via cron job.
 *
 * Design:
 *   • FCM admin SDK initialized once (lazy singleton)
 *   • All send functions are fire-and-forget — failures logged, never thrown
 *   • interval controlled by app_settings table — no code change needed to adjust
 * ─────────────────────────────────────────────────────────────────────────────
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pool from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Notification type constants ───────────────────────────────────────────────
export const NOTIF_TYPES = {
    // Immediate — personal
    ACCOUNT_APPROVED:       'account_approved',
    ACCOUNT_REJECTED:       'account_rejected',
    MEMBERSHIP_APPROVED:    'membership_approved',
    MEMBERSHIP_REJECTED:    'membership_rejected',
    QNA_ANSWERED:           'qna_answered',
    MEMBERSHIP_EXPIRING_7:  'membership_expiring_7',
    MEMBERSHIP_EXPIRED:     'membership_expired',

    // Batched — broadcast
    EVENT_PUBLISHED:        'event_published',
    WORKSHOP_PUBLISHED:     'workshop_published',
    RESOURCE_APPROVED:      'resource_approved',
    PRODUCT_REVIEW_ADDED:   'product_review_added',
    NOMINEE_ADDED:          'nominee_added',
    WINNER_ANNOUNCED:       'winner_announced',
    MEMBERSHIP_EXPIRING_15: 'membership_expiring_15',
};

// Immediate types — sent right away, not batched
const IMMEDIATE_TYPES = new Set([
    NOTIF_TYPES.ACCOUNT_APPROVED,
    NOTIF_TYPES.ACCOUNT_REJECTED,
    NOTIF_TYPES.MEMBERSHIP_APPROVED,
    NOTIF_TYPES.MEMBERSHIP_REJECTED,
    NOTIF_TYPES.QNA_ANSWERED,
    NOTIF_TYPES.MEMBERSHIP_EXPIRING_7,
    NOTIF_TYPES.MEMBERSHIP_EXPIRED,
]);

// ── Lazy FCM init ─────────────────────────────────────────────────────────────
let _fcmInitialized = false;

const getFCM = () => {
    if (_fcmInitialized) return admin.messaging();

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
        console.warn('⚠️  [Notifications] FIREBASE_SERVICE_ACCOUNT_PATH not set — push disabled');
        return null;
    }

    try {
        const absolutePath = resolve(__dirname, '..', serviceAccountPath.replace('./', ''));
        const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf8'));

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }

        _fcmInitialized = true;
        console.info('🔥 [Notifications] Firebase Admin SDK initialized');
        return admin.messaging();
    } catch (err) {
        console.error('❌ [Notifications] Firebase init failed:', err.message);
        return null;
    }
};

// ── Internal: save notification to DB ────────────────────────────────────────
const saveNotification = async (type, title, body, data, target, targetUserId, isImmediate) => {
    const [result] = await pool.query(
        `INSERT INTO notifications (type, title, body, data, target, target_user_id, is_immediate, push_sent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            type,
            title,
            body,
            data ? JSON.stringify(data) : null,
            target,
            targetUserId || null,
            isImmediate ? 1 : 0,
            0, // push_sent starts as false — set to true after delivery
        ]
    );
    return result.insertId;
};

// ── Internal: send FCM to a list of tokens ────────────────────────────────────
const sendToTokens = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) return;

    const messaging = getFCM();
    if (!messaging) return;

    try {
        const message = {
            tokens,
            notification: { title, body },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            webpush: {
                notification: {
                    title,
                    body,
                    icon: '/ai_logo.png',
                    badge: '/ai_logo.png',
                    requireInteraction: false,
                },
                fcmOptions: {
                    link: data?.url || 'https://www.riskaicouncil.com',
                },
            },
            android: {
                notification: {
                    title,
                    body,
                    icon: 'notification_icon',
                    color: '#003366',
                    clickAction: data?.url || 'https://www.riskaicouncil.com',
                },
                priority: 'high',
            },
            apns: {
                payload: {
                    aps: {
                        alert: { title, body },
                        badge: 1,
                        sound: 'default',
                    },
                },
            },
        };

        const response = await messaging.sendEachForMulticast(message);
        console.info(`📲 [Notifications] Sent to ${response.successCount}/${tokens.length} devices`);

        // Clean up invalid tokens
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const code = resp.error?.code;
                if (
                    code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/registration-token-not-registered'
                ) {
                    invalidTokens.push(tokens[idx]);
                }
            }
        });

        if (invalidTokens.length > 0) {
            console.info(`🧹 [Notifications] Removing ${invalidTokens.length} invalid token(s)`);
            await pool.query(
                `DELETE FROM push_tokens WHERE token IN (${invalidTokens.map(() => '?').join(',')})`,
                invalidTokens
            );
        }
    } catch (err) {
        console.error('❌ [Notifications] FCM send failed:', err.message);
    }
};

// ── Internal: get all tokens for all approved members ─────────────────────────
const getAllMemberTokens = async () => {
    const [rows] = await pool.query(
        `SELECT pt.token FROM push_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE u.status = 'approved'`
    );
    return rows.map(r => r.token);
};

// ── Internal: get all tokens for a specific user ──────────────────────────────
const getUserTokens = async (userId) => {
    const [rows] = await pool.query(
        `SELECT token FROM push_tokens WHERE user_id = ?`,
        [userId]
    );
    return rows.map(r => r.token);
};

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

/**
 * notifyAllMembers
 * For broadcast content notifications (events, resources, etc.)
 * Saves to DB — push delivered on next digest run unless immediate.
 *
 * @param {string} type     - NOTIF_TYPES constant
 * @param {string} title    - Notification title
 * @param {string} body     - Notification body
 * @param {object} data     - Extra data (url, entityId, etc.)
 */
export const notifyAllMembers = async (type, title, body, data = {}) => {
    try {
        const isImmediate = IMMEDIATE_TYPES.has(type);
        const notifId = await saveNotification(type, title, body, data, 'all', null, isImmediate);

        // Broadcast types are never immediate — batched digest handles them
        console.info(`📝 [Notifications] Queued broadcast: "${title}" (id: ${notifId})`);
    } catch (err) {
        console.error('❌ [Notifications] notifyAllMembers failed:', err.message);
    }
};

/**
 * notifyUser
 * For urgent personal notifications (account approved, Q&A reply, etc.)
 * Saves to DB AND sends push immediately.
 *
 * @param {number} userId   - Target user ID
 * @param {string} type     - NOTIF_TYPES constant
 * @param {string} title    - Notification title
 * @param {string} body     - Notification body
 * @param {object} data     - Extra data (url, entityId, etc.)
 */
export const notifyUser = async (userId, type, title, body, data = {}) => {
    try {
        const isImmediate = IMMEDIATE_TYPES.has(type);
        const notifId = await saveNotification(type, title, body, data, 'user', userId, isImmediate);

        if (isImmediate) {
            const tokens = await getUserTokens(userId);
            if (tokens.length > 0) {
                await sendToTokens(tokens, title, body, { ...data, notificationId: String(notifId) });
                await pool.query(
                    `UPDATE notifications SET push_sent = 1, push_sent_at = NOW() WHERE id = ?`,
                    [notifId]
                );
                console.info(`⚡ [Notifications] Immediate push sent to user ${userId}: "${title}"`);
            } else {
                console.info(`📝 [Notifications] No tokens for user ${userId} — saved to bell only`);
            }
        }
    } catch (err) {
        console.error('❌ [Notifications] notifyUser failed:', err.message);
    }
};

/**
 * sendDigestToAllMembers
 * Called by notificationDigestJob cron.
 * Collects all unsent batched notifications and sends one digest push to all members.
 *
 * @returns {{ usersReached: number, notifsBatched: number }}
 */
export const sendDigestToAllMembers = async () => {
    try {
        // Get all unsent broadcast notifications
        const [pending] = await pool.query(
            `SELECT * FROM notifications
             WHERE push_sent = 0
               AND target = 'all'
               AND is_immediate = 0
             ORDER BY created_at ASC`
        );

        if (pending.length === 0) {
            console.info('📭 [Notifications] No pending notifications for digest');
            return { usersReached: 0, notifsBatched: 0 };
        }

        // Group by type for summary
        const typeCounts = {};
        pending.forEach(n => {
            typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
        });

        // Build digest message
        const summaryParts = [];
        if (typeCounts[NOTIF_TYPES.EVENT_PUBLISHED])      summaryParts.push(`${typeCounts[NOTIF_TYPES.EVENT_PUBLISHED]} new event${typeCounts[NOTIF_TYPES.EVENT_PUBLISHED] > 1 ? 's' : ''}`);
        if (typeCounts[NOTIF_TYPES.WORKSHOP_PUBLISHED])   summaryParts.push(`${typeCounts[NOTIF_TYPES.WORKSHOP_PUBLISHED]} new workshop${typeCounts[NOTIF_TYPES.WORKSHOP_PUBLISHED] > 1 ? 's' : ''}`);
        if (typeCounts[NOTIF_TYPES.RESOURCE_APPROVED])    summaryParts.push(`${typeCounts[NOTIF_TYPES.RESOURCE_APPROVED]} new resource${typeCounts[NOTIF_TYPES.RESOURCE_APPROVED] > 1 ? 's' : ''}`);
        if (typeCounts[NOTIF_TYPES.PRODUCT_REVIEW_ADDED]) summaryParts.push(`${typeCounts[NOTIF_TYPES.PRODUCT_REVIEW_ADDED]} new product review${typeCounts[NOTIF_TYPES.PRODUCT_REVIEW_ADDED] > 1 ? 's' : ''}`);
        if (typeCounts[NOTIF_TYPES.NOMINEE_ADDED])        summaryParts.push(`${typeCounts[NOTIF_TYPES.NOMINEE_ADDED]} new nominee${typeCounts[NOTIF_TYPES.NOMINEE_ADDED] > 1 ? 's' : ''}`);
        if (typeCounts[NOTIF_TYPES.WINNER_ANNOUNCED])     summaryParts.push(`${typeCounts[NOTIF_TYPES.WINNER_ANNOUNCED]} award winner${typeCounts[NOTIF_TYPES.WINNER_ANNOUNCED] > 1 ? 's' : ''} announced`);

        const title = "What's new on AI Risk Council";
        const body  = summaryParts.length > 0
            ? summaryParts.join(' · ')
            : `${pending.length} new update${pending.length > 1 ? 's' : ''} available`;

        const data = {
            type: 'digest',
            url:  'https://www.riskaicouncil.com',
            count: String(pending.length),
        };

        // Send to all approved members
        const tokens = await getAllMemberTokens();
        if (tokens.length > 0) {
            await sendToTokens(tokens, title, body, data);
        }

        // Mark all as sent
        const notifIds = pending.map(n => n.id);
        await pool.query(
            `UPDATE notifications SET push_sent = 1, push_sent_at = NOW()
             WHERE id IN (${notifIds.map(() => '?').join(',')})`,
            notifIds
        );

        // Log digest
        const usersReached = Math.floor(tokens.length);
        await pool.query(
            `INSERT INTO notification_digest_log (users_reached, notifs_batched) VALUES (?, ?)`,
            [usersReached, pending.length]
        );

        console.info(`✅ [Notifications] Digest sent — ${pending.length} notifications → ${usersReached} devices`);
        return { usersReached, notifsBatched: pending.length };
    } catch (err) {
        console.error('❌ [Notifications] sendDigestToAllMembers failed:', err.message);
        return { usersReached: 0, notifsBatched: 0 };
    }
};