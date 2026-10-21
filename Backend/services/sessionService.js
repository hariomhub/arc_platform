/**
 * sessionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything that happens AFTER someone has proved who they are, whichever way they
 * did it (password, emailed code). One implementation, so every sign-in method passes
 * exactly the same gates and gets exactly the same kind of session.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { extendLeadTermIfDue } from './chapterLeadService.js';

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',  // 'lax' required for OAuth redirects — 'strict' blocks cookie on cross-site redirects
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/** The part of a user that goes into the session token and the sign-in response. */
export const sessionUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    professional_sub_type: user.professional_sub_type || null,
});

export const signSessionToken = (user) =>
    jwt.sign(sessionUser(user), process.env.JWT_SECRET, { expiresIn: '7d' });

export const setSessionCookie = (res, user) => {
    res.cookie('arc_token', signSessionToken(user), COOKIE_OPTIONS);
};

/**
 * Apply the account-status and membership gates, then start the session.
 * `user` needs: id, name, email, role, professional_sub_type, status, membership_expires_at.
 * Sends the HTTP response in every case.
 */
export const completeLogin = async (res, user) => {
    if (user.status === 'pending') {
        return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }
    if (user.status === 'rejected') {
        return res.status(403).json({ success: false, message: 'Your account application has been rejected.' });
    }

    // Check membership expiry (founding_member has NULL = lifetime).
    // Active Chapter Leads continue into their next term automatically; this is the
    // safety net in case the daily rollover job did not run.
    let expiresAt = user.membership_expires_at;
    if (user.role === 'council_member' && expiresAt && new Date(expiresAt) < new Date()) {
        try {
            expiresAt = (await extendLeadTermIfDue(user.id)) || expiresAt;
        } catch (err) {
            console.error('[Login] Chapter Lead term check failed:', err.message);
        }
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
        return res.status(403).json({ success: false, message: 'Your membership has expired. Please renew to continue.' });
    }

    setSessionCookie(res, user);
    return res.json({ success: true, data: { user: sessionUser(user) } });
};

/**
 * Store a new password hash and stamp the time, which signs the account out on every device (the auth
 * middleware rejects sessions signed before it). If migration 0021 has not been applied the column does not
 * exist: store the password anyway and log it, rather than fail the change.
 */
export const storePasswordHash = async (userId, hash) => {
    try {
        await pool.query('UPDATE users SET password_hash = ?, password_changed_at = UTC_TIMESTAMP() WHERE id = ?', [hash, userId]);
    } catch (err) {
        if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
        console.error('[Auth] users.password_changed_at is missing: run migration 0021_auth_otp.sql. The password was saved but other sessions stay signed in.');
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    }
};
