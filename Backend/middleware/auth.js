import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { predatesPasswordChange, fetchSessionUser } from '../utils/sessionAge.js';

/**
 * Verifies the arc_token cookie, then re-reads the user's CURRENT role from the
 * database. The JWT is valid for 7 days, but role changes (for example an admin
 * ending someone's Chapter Lead role) must take effect immediately, and a
 * deleted account must stop working at once — not when the token expires.
 *
 * A session signed before the account's last password change is rejected too, so changing or
 * resetting a password signs the account out on every device.
 *
 * Only `deleted` accounts are rejected here. `pending` is allowed on purpose:
 * LinkedIn sign-ups hold a short-lived token while they complete their profile.
 */
const auth = async (req, res, next) => {
    const token = req.cookies?.arc_token;

    // Debug logging
    console.log('[Auth] Request to:', req.method, req.originalUrl);
    console.log('[Auth] Token present:', !!token);
    console.log('[Auth] All cookies:', Object.keys(req.cookies || {}));

    if (!token) {
        console.log('[Auth] ❌ No token found');
        return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        console.log('[Auth] ❌ Token verification failed:', error.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
    }

    try {
        const rows = await fetchSessionUser(pool, decoded.id);
        if (rows.length === 0 || rows[0].status === 'deleted') {
            console.log('[Auth] ❌ Account no longer exists or was deleted');
            return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
        }
        // A password change signs the account out everywhere: reject sessions signed before it.
        if (predatesPasswordChange(decoded, rows[0].pwd_changed_epoch)) {
            console.log('[Auth] ❌ Session predates a password change');
            return res.status(401).json({ success: false, message: 'Your password was changed. Please log in again.' });
        }

        req.user = {
            ...decoded,
            role: rows[0].role,
            professional_sub_type: rows[0].professional_sub_type || null,
            status: rows[0].status,
        };
        console.log('[Auth] ✅ Token valid for user:', decoded.email, 'role:', req.user.role);
        next();
    } catch (err) {
        next(err);
    }
};

export default auth;
