import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { predatesPasswordChange, fetchSessionUser } from '../utils/sessionAge.js';
import { debugAuth } from '../utils/debugLog.js';

/**
 * Verifies the arc_token cookie, then re-reads the user's CURRENT role from the
 * database. The JWT is valid for 7 days, but role changes (for example an admin
 * ending someone's Chapter Lead role) must take effect immediately, and a
 * deleted account must stop working at once — not when the token expires.
 *
 * The same lookup returns the person's active chapter-team seat, so `req.user` carries
 * `tier` ('lead' | 'ambassador' | null), `team_chapter_id` and `team_profile_id`.
 *
 * A session signed before the account's last password change is rejected too, so changing or
 * resetting a password signs the account out on every device.
 *
 * Only `deleted` accounts are rejected here. `pending` is allowed on purpose:
 * LinkedIn sign-ups hold a short-lived token while they complete their profile.
 */
const auth = async (req, res, next) => {
    const token = req.cookies?.arc_token;

    debugAuth('[Auth] Request to:', req.method, req.originalUrl, '| token present:', !!token);

    if (!token) {
        debugAuth('[Auth] No token found');
        return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        debugAuth('[Auth] Token verification failed:', error.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
    }

    try {
        const rows = await fetchSessionUser(pool, decoded.id);
        if (rows.length === 0 || rows[0].status === 'deleted') {
            debugAuth('[Auth] Account no longer exists or was deleted');
            return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
        }
        // A password change signs the account out everywhere: reject sessions signed before it.
        if (predatesPasswordChange(decoded, rows[0].pwd_changed_epoch)) {
            debugAuth('[Auth] Session predates a password change');
            return res.status(401).json({ success: false, message: 'Your password was changed. Please log in again.' });
        }

        req.user = {
            ...decoded,
            role: rows[0].role,
            professional_sub_type: rows[0].professional_sub_type || null,
            status: rows[0].status,
            tier: rows[0].team_tier || null,
            team_chapter_id: rows[0].team_chapter_id ?? null,
            team_profile_id: rows[0].team_profile_id ?? null,
        };
        debugAuth('[Auth] Token valid for user:', decoded.email, 'role:', req.user.role, 'tier:', req.user.tier);
        next();
    } catch (err) {
        next(err);
    }
};

export default auth;
