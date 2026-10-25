import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';
import { predatesPasswordChange, fetchSessionUser } from '../utils/sessionAge.js';

/**
 * Optional authentication middleware
 * Sets req.user if valid token exists, but doesn't fail if no token
 * Useful for endpoints that support both authenticated and anonymous access
 *
 * Like the strict `auth` middleware, it re-reads the user's current role from the
 * database so a demoted or deleted account is not treated as its old role.
 * If that lookup fails, the token's own claims are used rather than failing a
 * public request.
 */
const optionalAuth = async (req, res, next) => {
    const token = req.cookies?.arc_token;

    if (!token) {
        // No token present, continue without user
        req.user = null;
        return next();
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        // Invalid token, but don't fail - treat as anonymous
        req.user = null;
        return next();
    }

    try {
        const rows = await fetchSessionUser(pool, decoded.id);
        if (rows.length === 0 || rows[0].status === 'deleted' || predatesPasswordChange(decoded, rows[0].pwd_changed_epoch)) {
            req.user = null;
            return next();
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
    } catch (err) {
        console.error('[OptionalAuth] Role lookup failed, using token claims:', err.message);
        req.user = decoded;
    }
    next();
};

export default optionalAuth;
