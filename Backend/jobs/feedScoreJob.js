/**
 * feedScoreJob.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron job that recalculates feed post scores every N minutes.
 * Interval is controlled by app_settings:
 *   key_name = 'feed_score_interval_minutes'  (default: 30)
 *
 * To change interval without code changes:
 *   UPDATE app_settings SET value = '15'
 *   WHERE key_name = 'feed_score_interval_minutes';
 *
 * Scoring algorithm:
 *   score = ((likes×3) + (comments×2) + (saves×1)) / (hours_since_posted + 2)^1.5
 *   Posts older than 30 days: score × 0.1
 * ─────────────────────────────────────────────────────────────────────────────
 */

import cron from 'node-cron';
import { recalculateFeedScores } from '../controllers/feedController.js';

// ── Helper: get interval from app_settings ────────────────────────────────────
// Returns a safe cron expression based on the interval in minutes.
// Minimum 5 minutes to prevent hammering the DB.
const buildCronExpression = (intervalMinutes) => {
    const mins = Math.max(5, parseInt(intervalMinutes, 10) || 30);

    // For intervals that divide evenly into 60, use */N pattern
    if (60 % mins === 0) return `*/${mins} * * * *`;

    // For irregular intervals, run at top of every hour as safe fallback
    return `0 * * * *`;
};

// ── Cron initialiser ─────────────────────────────────────────────────────────
export const initFeedScoreCron = () => {
    // Default to every 30 minutes — matches app_settings default
    const cronExpression = buildCronExpression(30);

    console.log(`[FeedScoreJob] Scheduling score recalculation: ${cronExpression} (UTC)`);

    cron.schedule(cronExpression, () => {
        recalculateFeedScores();
    }, { timezone: 'UTC' });

    console.log('[FeedScoreJob] Cron job registered.');
};