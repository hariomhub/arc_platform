/**
 * otpService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time email codes for "sign in with a code" and "forgot password".
 *
 * Security rules this module enforces (so callers cannot forget them):
 *   • The code comes from crypto.randomInt, never Math.random.
 *   • Only an HMAC of the code is stored (keyed with a server secret), so a database
 *     leak does not reveal usable codes.
 *   • A code is single-use, expires, and locks after MAX_ATTEMPTS wrong guesses. The
 *     attempt is counted BEFORE the comparison, so parallel guesses cannot beat the cap.
 *   • Sending is throttled per account: a cooldown between codes and a cap per hour.
 *   • Asking for a new code replaces the old one.
 *
 * All times are UTC and computed in SQL (UTC_TIMESTAMP()), independent of the time zone
 * of the Node server or the MySQL session.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import pool from '../db/connection.js';

export const OTP_LENGTH = 6;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_SENDS_PER_HOUR = 5;
export const DEFAULT_TTL_MINUTES = 10;
export const FOUNDING_MEMBER_TTL_MINUTES = 5;
export const PURPOSES = Object.freeze(['login', 'password_reset']);

const HOUR_SECONDS = 3600;

/** A uniformly random zero-padded numeric code, e.g. "042917". */
export const generateCode = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

const secret = () => {
    const key = process.env.OTP_SECRET || process.env.JWT_SECRET;
    if (!key) throw new Error('OTP_SECRET or JWT_SECRET must be set.');
    return key;
};

/** HMAC of the code, bound to the email and purpose so a hash cannot be replayed elsewhere. */
export const hashCode = (email, purpose, code) =>
    crypto.createHmac('sha256', secret()).update(`${purpose}:${email}:${code}`).digest('hex');

const safeEqualHex = (a, b) => {
    const x = Buffer.from(String(a), 'hex');
    const y = Buffer.from(String(b), 'hex');
    return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

/**
 * Create (or replace) the live code for this email and purpose.
 *
 * @returns {Promise<{ ok: true, code: string, ttlMinutes: number }
 *                  | { ok: false, reason: 'cooldown'|'hourly_cap', retryAfterSeconds: number }>}
 */
export const issueOtp = async (email, purpose, { ttlMinutes = DEFAULT_TTL_MINUTES } = {}) => {
    if (!PURPOSES.includes(purpose)) throw new Error(`Unknown OTP purpose: ${purpose}`);
    const key = String(email).trim().toLowerCase();

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[row]] = await conn.query(
            `SELECT id, sent_count,
                    TIMESTAMPDIFF(SECOND, last_sent_at, UTC_TIMESTAMP())  AS since_last,
                    TIMESTAMPDIFF(SECOND, window_start, UTC_TIMESTAMP())  AS window_age
             FROM auth_otps WHERE email = ? AND purpose = ? FOR UPDATE`,
            [key, purpose],
        );

        if (row && row.since_last < RESEND_COOLDOWN_SECONDS) {
            await conn.rollback();
            return { ok: false, reason: 'cooldown', retryAfterSeconds: RESEND_COOLDOWN_SECONDS - row.since_last };
        }
        const windowOpen = row && row.window_age < HOUR_SECONDS;
        if (windowOpen && row.sent_count >= MAX_SENDS_PER_HOUR) {
            await conn.rollback();
            return { ok: false, reason: 'hourly_cap', retryAfterSeconds: HOUR_SECONDS - row.window_age };
        }

        const code = generateCode();
        const hash = hashCode(key, purpose, code);

        if (!row) {
            await conn.query(
                `INSERT INTO auth_otps (email, purpose, code_hash, expires_at, attempts, sent_count, window_start, last_sent_at)
                 VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
                [key, purpose, hash, ttlMinutes],
            );
        } else if (windowOpen) {
            await conn.query(
                `UPDATE auth_otps
                 SET code_hash = ?, expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), attempts = 0,
                     sent_count = sent_count + 1, last_sent_at = UTC_TIMESTAMP()
                 WHERE id = ?`,
                [hash, ttlMinutes, row.id],
            );
        } else {
            await conn.query(
                `UPDATE auth_otps
                 SET code_hash = ?, expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), attempts = 0,
                     sent_count = 1, window_start = UTC_TIMESTAMP(), last_sent_at = UTC_TIMESTAMP()
                 WHERE id = ?`,
                [hash, ttlMinutes, row.id],
            );
        }
        await conn.commit();

        // Housekeeping: drop long-expired rows. Best effort, never blocks the caller.
        pool.query('DELETE FROM auth_otps WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) LIMIT 200').catch(() => {});

        return { ok: true, code, ttlMinutes };
    } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
    } finally {
        conn.release();
    }
};

/**
 * Check a code. On success the code is consumed (single use).
 *
 * @returns {Promise<{ ok: true } | { ok: false, reason: 'none'|'expired'|'locked'|'invalid' }>}
 */
export const verifyOtp = async (email, purpose, code) => {
    if (!PURPOSES.includes(purpose)) throw new Error(`Unknown OTP purpose: ${purpose}`);
    const key = String(email).trim().toLowerCase();
    const given = String(code ?? '').trim();

    const [[row]] = await pool.query(
        `SELECT id, code_hash, attempts, (expires_at > UTC_TIMESTAMP()) AS live
         FROM auth_otps WHERE email = ? AND purpose = ?`,
        [key, purpose],
    );
    if (!row) return { ok: false, reason: 'none' };
    if (!row.live) return { ok: false, reason: 'expired' };

    // Count this guess first, atomically; if the cap is already reached nothing changes.
    const [counted] = await pool.query(
        `UPDATE auth_otps SET attempts = attempts + 1
         WHERE id = ? AND attempts < ? AND expires_at > UTC_TIMESTAMP()`,
        [row.id, MAX_ATTEMPTS],
    );
    if (counted.affectedRows !== 1) return { ok: false, reason: 'locked' };

    if (!/^\d+$/.test(given) || !safeEqualHex(row.code_hash, hashCode(key, purpose, given))) {
        return { ok: false, reason: 'invalid' };
    }

    // Single use, safe under concurrency: only one request can delete the row.
    const [consumed] = await pool.query('DELETE FROM auth_otps WHERE id = ? AND code_hash = ?', [row.id, row.code_hash]);
    return consumed.affectedRows === 1 ? { ok: true } : { ok: false, reason: 'invalid' };
};

/** Remove every live code for an email (used after a password reset). */
export const discardOtps = async (email) => {
    await pool.query('DELETE FROM auth_otps WHERE email = ?', [String(email).trim().toLowerCase()]);
};
