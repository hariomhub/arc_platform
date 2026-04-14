/**
 * feedLikeDigestJob.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron job that runs every hour and sends batched like notifications.
 *
 * For every row in feed_like_digest_log where pending_count > 0:
 *   - Sends one notification to the author: "X people liked your post/comment"
 *   - Resets pending_count to 0 and updates last_notified_at
 *
 * This prevents notification spam when a post gets 50 likes in an hour —
 * the author receives one message instead of 50.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import cron from 'node-cron';
import pool from '../db/connection.js';
import { notifyUser, NOTIF_TYPES } from '../services/notificationService.js';

// ── Main digest function ──────────────────────────────────────────────────────
export const runFeedLikeDigest = async () => {
    console.log('[FeedLikeDigest] Running hourly like digest...');

    try {
        // Fetch all pending like digests
        const [pending] = await pool.query(
            `SELECT * FROM feed_like_digest_log WHERE pending_count > 0`
        );

        if (!pending.length) {
            console.log('[FeedLikeDigest] No pending likes to notify.');
            return;
        }

        let notified = 0;

        for (const row of pending) {
            const { id, target_type, target_id, author_id, pending_count } = row;

            // Build notification based on target type and count
            let title, body, url;

            if (target_type === 'post') {
                title = pending_count === 1
                    ? 'Someone liked your post'
                    : `${pending_count} people liked your post`;
                body = 'Your post is getting attention on AI Risk Council.';
                url  = `/community-qna/${target_id}`;
            } else {
                title = pending_count === 1
                    ? 'Someone liked your comment'
                    : `${pending_count} people liked your comment`;
                body = 'Your comment is getting attention on AI Risk Council.';

                // Fetch the post_id for this comment to build the URL
                const [[comment]] = await pool.query(
                    'SELECT post_id FROM feed_comments WHERE id = ?',
                    [target_id]
                );
                url = comment ? `/community-qna/${comment.post_id}` : '/community-qna';
            }

            const notifType = target_type === 'post'
                ? NOTIF_TYPES.FEED_POST_LIKED_BATCH
                : NOTIF_TYPES.FEED_COMMENT_LIKED_BATCH;

            // Fire-and-forget notification
            notifyUser(author_id, notifType, title, body, { url });

            // Reset pending count
            await pool.query(
                `UPDATE feed_like_digest_log
                 SET pending_count = 0, last_notified_at = NOW()
                 WHERE id = ?`,
                [id]
            );

            notified++;
        }

        console.log(`[FeedLikeDigest] Sent ${notified} batched like notification(s).`);
    } catch (err) {
        console.error('[FeedLikeDigest] Error during digest:', err.message);
    }
};

// ── Cron initialiser ─────────────────────────────────────────────────────────
export const initFeedLikeDigestCron = () => {
    console.log('[FeedLikeDigest] Scheduling hourly like digest at :00 UTC...');

    // Run at the top of every hour
    cron.schedule('0 * * * *', () => {
        runFeedLikeDigest();
    }, { timezone: 'UTC' });

    console.log('[FeedLikeDigest] Cron job registered.');
};