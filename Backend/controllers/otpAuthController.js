/**
 * otpAuthController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * "Sign in with an email code" and "Forgot password".
 *
 *   POST /api/auth/login-code/request   email                       -> emails a 6-digit code
 *   POST /api/auth/login-code/verify    email, code                 -> signs in
 *   POST /api/auth/forgot-password      email                       -> emails a 6-digit code
 *   POST /api/auth/reset-password       email, code, newPassword    -> sets the password
 *
 * Rules:
 *   • The "request" endpoints answer identically whether or not an account exists, so they
 *     cannot be used to find out who is registered.
 *   • A wrong, expired or already-used code always gets the same answer.
 *   • Every account type uses these: members, Chapter Leads, founding members, and accounts
 *     created through LinkedIn (which have no password yet; a reset gives them their first).
 *     Deleted accounts are ignored. Founding members get a shorter code lifetime, and the
 *     other founding members are emailed whenever one of them signs in with a code or has
 *     a password reset.
 *   • Signing in with a code passes exactly the same gates as signing in with a password
 *     (pending / rejected / expired membership), through completeLogin().
 *   • Changing a password signs the account out everywhere (password_changed_at).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import {
    issueOtp, verifyOtp, discardOtps, DEFAULT_TTL_MINUTES, FOUNDING_MEMBER_TTL_MINUTES,
} from '../services/otpService.js';
import { completeLogin, storePasswordHash } from '../services/sessionService.js';
import {
    sendLoginCodeEmail, sendPasswordResetCodeEmail, sendPasswordChangedEmail, sendSecurityAlertAdminEmail,
} from '../services/emailService.js';

const CODE_SENT = {
    success: true,
    data: { message: 'If an account exists for that email address, we have sent a 6-digit code. It expires soon.' },
};
const BAD_CODE = {
    success: false,
    message: 'That code is incorrect or has expired. Check it, or request a new one.',
};

// Registration stores an address normalised (express-validator's normalizeEmail strips the dots from Gmail
// addresses and so on) while LinkedIn sign-ups store it as LinkedIn returned it. So an account is looked up by
// what the person typed AND by the normalised form. The route captures the typed form in req.rawEmail.
const candidatesFrom = (req) => [...new Set(
    [req.rawEmail, req.body.email].filter(Boolean).map((e) => String(e).trim().toLowerCase()),
)];

const findAccount = async (candidates) => {
    if (!candidates.length) return null;
    const [rows] = await pool.query(
        `SELECT id, name, email, password_hash, role, professional_sub_type, status, membership_expires_at
         FROM users WHERE email IN (?)`,
        [candidates],
    );
    const live = rows.filter((r) => r.status !== 'deleted');
    return live.find((r) => r.email.toLowerCase() === candidates[0]) || live[0] || null;
};

const logEvent = (event, account) => console.info(`[Auth] ${event} user=${account.id} role=${account.role}`);

// Emails the OTHER founding members. Never blocks or fails the request.
const alertOtherFoundingMembers = async (account, event) => {
    if (account.role !== 'founding_member') return;
    try {
        const [admins] = await pool.query(
            `SELECT name, email FROM users WHERE role = 'founding_member' AND status = 'approved' AND id <> ?`,
            [account.id],
        );
        await Promise.all(admins.map((admin) => sendSecurityAlertAdminEmail({
            adminEmail: admin.email,
            adminName: admin.name,
            accountName: account.name,
            accountEmail: account.email,
            event,
        })));
    } catch (err) {
        console.error('[Auth] Could not send the founding member alert:', err.message);
    }
};

const requestCode = (purpose) => async (req, res, next) => {
    try {
        const account = await findAccount(candidatesFrom(req));
        if (account) {
            const ttlMinutes = account.role === 'founding_member' ? FOUNDING_MEMBER_TTL_MINUTES : DEFAULT_TTL_MINUTES;
            const issued = await issueOtp(account.email, purpose, { ttlMinutes });
            if (issued.ok) {
                const sendCode = purpose === 'login' ? sendLoginCodeEmail : sendPasswordResetCodeEmail;
                sendCode({ name: account.name, email: account.email, code: issued.code, ttlMinutes }).then((delivered) => {
                    if (!delivered) console.error(`[Auth] The ${purpose} code email could not be delivered (user=${account.id}).`);
                });
            } else {
                console.info(`[Auth] ${purpose} code not sent (${issued.reason}) for user=${account.id}`);
            }
        }
        // Same answer whether or not the account exists, or the code was throttled.
        return res.json(CODE_SENT);
    } catch (err) {
        next(err);
    }
};

export const requestLoginCode = requestCode('login');
export const requestPasswordReset = requestCode('password_reset');

// POST /api/auth/login-code/verify
export const verifyLoginCode = async (req, res, next) => {
    try {
        const account = await findAccount(candidatesFrom(req));
        const result = account ? await verifyOtp(account.email, 'login', req.body.code) : { ok: false };
        if (!result.ok) return res.status(401).json(BAD_CODE);

        logEvent('otp_login', account);
        alertOtherFoundingMembers(account, 'otp_login');
        return completeLogin(res, account);
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
    try {
        const account = await findAccount(candidatesFrom(req));
        const result = account ? await verifyOtp(account.email, 'password_reset', req.body.code) : { ok: false };
        if (!result.ok) return res.status(401).json(BAD_CODE);

        const hash = await bcrypt.hash(req.body.newPassword, 12);
        // Also signs the account out everywhere: any session older than this moment is rejected.
        await storePasswordHash(account.id, hash);
        await discardOtps(account.email);

        logEvent('password_reset', account);
        sendPasswordChangedEmail({ name: account.name, email: account.email });
        alertOtherFoundingMembers(account, 'password_reset');

        return res.json({ success: true, data: { message: 'Your password has been updated. You can now sign in.' } });
    } catch (err) {
        next(err);
    }
};
