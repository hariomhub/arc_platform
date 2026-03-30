import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail } from '../services/emailService.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/register
export const register = async (req, res, next) => {
    try {
        const { name, email, password, role, organization_name, linkedin_url } = req.body;

        // Only professional can self-register; founding_member and executive are assigned by a founding member
        const allowedSelfRoles = ['professional'];
        const assignedRole = allowedSelfRoles.includes(role) ? role : 'professional';

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email address is already registered.' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status, organization_name, linkedin_url)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
            [name.trim(), email.trim().toLowerCase(), password_hash, assignedRole, organization_name || null, linkedin_url || null]
        );

        // Fire-and-forget welcome email — never blocks the API response
        sendWelcomeEmail({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role: assignedRole,
            organizationName: organization_name || null,
        });

        return res.status(201).json({
            success: true,
            data: {
                message: 'Registration successful. Your account is pending admin approval.',
                userId: result.insertId,
            },
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
            'SELECT id, name, email, password_hash, role, status, membership_expires_at FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ success: false, message: 'Your account application has been rejected.' });
        }

        // Check membership expiry (founding_member has NULL = lifetime)
        if (user.membership_expires_at && new Date(user.membership_expires_at) < new Date()) {
            return res.status(403).json({ success: false, message: 'Your membership has expired. Please renew to continue.' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('arc_token', token, COOKIE_OPTIONS);

        return res.json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
            },
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/logout
export const logout = (req, res) => {
    res.clearCookie('arc_token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    return res.json({ success: true, data: { message: 'Logged out successfully.' } });
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
    try {
        // No session — return 200 with null so guests don't see a 401 in console
        if (!req.user || !req.user.id) {
            return res.json({ success: true, data: null });
        }

        const [rows] = await pool.query(
            'SELECT id, name, email, role, status, bio, photo_url, linkedin_url, organization_name, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/linkedin/callback  (called by Passport after LinkedIn redirects back)
export const linkedinCallback = async (req, res, next) => {
    try {
        const { id: linkedinId, displayName, emails, photos } = req.linkedinProfile;
        const email = emails?.[0]?.value?.trim().toLowerCase() || null;
        const name = displayName?.trim() || 'LinkedIn User';
        const photo_url = photos?.[0]?.value || null;

        if (!email) {
            // LinkedIn didn't return an email — redirect to login with error
            return res.redirect(
                `${process.env.FRONTEND_URL}/login?error=no_email`
            );
        }

        // ── Upsert: find by linkedin_id OR email ─────────────────────────────
        let [rows] = await pool.query(
            'SELECT id, name, email, role, status, membership_expires_at FROM users WHERE linkedin_id = ? OR email = ?',
            [linkedinId, email]
        );

        let user;

        if (rows.length > 0) {
            // Existing user — update linkedin_id + photo if missing
            user = rows[0];
            await pool.query(
                `UPDATE users SET linkedin_id = ?, auth_provider = 'linkedin',
                 photo_url = COALESCE(NULLIF(photo_url,''), ?) WHERE id = ?`,
                [linkedinId, photo_url, user.id]
            );
        } else {
            // New user — auto-approve LinkedIn registrations as 'professional'
            const [result] = await pool.query(
                `INSERT INTO users (name, email, linkedin_id, auth_provider, role, status, photo_url)
                 VALUES (?, ?, ?, 'linkedin', 'professional', 'approved', ?)`,
                [name, email, linkedinId, photo_url]
            );
            const [newRows] = await pool.query(
                'SELECT id, name, email, role, status FROM users WHERE id = ?',
                [result.insertId]
            );
            user = newRows[0];

            // Fire welcome email (non-blocking)
            sendWelcomeEmail({ name, email, role: 'professional', organizationName: null });
        }

        // ── Status checks ─────────────────────────────────────────────────────
        if (user.status === 'rejected') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=rejected`);
        }
        if (user.status === 'pending') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=pending`);
        }
        if (user.membership_expires_at && new Date(user.membership_expires_at) < new Date()) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=expired`);
        }

        // ── Issue JWT cookie (same as regular login) ──────────────────────────
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.cookie('arc_token', token, COOKIE_OPTIONS);

        // Redirect to frontend OAuth landing — works for both local and production
        // Frontend origin is inferred from the request itself, no hardcoded URLs needed
        const origin = process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : `http://localhost:5173`;

        return res.redirect(`${origin}/auth/callback`);

    } catch (err) {
        next(err);
    }
};
