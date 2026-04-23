import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail, sendVerificationEmail } from '../services/emailService.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/register
export const register = async (req, res, next) => {
    try {
        const { name, email, password, role, organization_name, linkedin_url, professional_sub_type } = req.body;

        // Only professional can self-register; council_member and founding_member are assigned by admin
        const allowedSelfRoles = ['professional'];
        const assignedRole = allowedSelfRoles.includes(role) ? role : 'professional';

        // Validate and assign professional sub-type (only for professional role)
        const allowedSubTypes = ['working_professional', 'final_year_undergrad'];
        const subType = assignedRole === 'professional' && allowedSubTypes.includes(professional_sub_type)
            ? professional_sub_type
            : (assignedRole === 'professional' ? 'working_professional' : null);

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email address is already registered.' });
        }

        const [verification] = await pool.query('SELECT verified FROM email_verifications WHERE email = ?', [email.trim().toLowerCase()]);
        if (verification.length === 0 || !verification[0].verified) {
            return res.status(403).json({ success: false, message: 'Email address has not been verified. Please verify your email first.' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, professional_sub_type, status, organization_name, linkedin_url)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [name.trim(), email.trim().toLowerCase(), password_hash, assignedRole, subType, organization_name || null, linkedin_url || null]
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

// POST /api/auth/send-otp
export const sendVerificationOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const cleanEmail = email.trim().toLowerCase();

        // Check if user already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email address is already registered.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Expires in 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Upsert into email_verifications
        await pool.query(
            `INSERT INTO email_verifications (email, otp, expires_at, verified) 
             VALUES (?, ?, ?, FALSE)
             ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?, verified = FALSE`,
            [cleanEmail, otp, expiresAt, otp, expiresAt]
        );

        sendVerificationEmail(cleanEmail, otp);

        return res.json({ success: true, message: 'Verification code sent successfully.' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required.' });

        const cleanEmail = email.trim().toLowerCase();

        const [rows] = await pool.query('SELECT * FROM email_verifications WHERE email = ?', [cleanEmail]);
        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'No verification request found for this email.' });
        }

        const record = rows[0];

        if (record.verified) {
            return res.json({ success: true, message: 'Email is already verified.' });
        }

        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        await pool.query('UPDATE email_verifications SET verified = TRUE WHERE email = ?', [cleanEmail]);

        return res.json({ success: true, message: 'Email verified successfully.' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
            'SELECT id, name, email, password_hash, role, professional_sub_type, status, membership_expires_at FROM users WHERE email = ?',
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
            { id: user.id, name: user.name, email: user.email, role: user.role, professional_sub_type: user.professional_sub_type || null },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('arc_token', token, COOKIE_OPTIONS);

        return res.json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, professional_sub_type: user.professional_sub_type || null },
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
            'SELECT id, name, email, role, professional_sub_type, pending_sub_type_upgrade, status, bio, photo_url, linkedin_url, organization_name, created_at FROM users WHERE id = ?',
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

        const origin = process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : `http://localhost:5173`;

        if (!email) {
            // LinkedIn didn't return an email — redirect to login with error
            return res.redirect(
                `${process.env.FRONTEND_URL}/login?error=no_email`
            );
        }

        // ── Upsert: find by linkedin_id OR email ─────────────────────────────
        let [rows] = await pool.query(
            'SELECT id, name, email, role, professional_sub_type, status, membership_expires_at FROM users WHERE linkedin_id = ? OR email = ?',
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
            // New user — create with pending status, requires admin approval like all registrations
            const [result] = await pool.query(
                `INSERT INTO users (name, email, linkedin_id, auth_provider, role, status, photo_url)
         VALUES (?, ?, ?, 'linkedin', 'professional', 'pending', ?)`,
                [name, email, linkedinId, photo_url]
            );
            const [newRows] = await pool.query(
                'SELECT id, name, email, role, professional_sub_type, status, membership_expires_at FROM users WHERE id = ?',
                [result.insertId]
            );
            user = newRows[0];
            sendWelcomeEmail({ name, email, role: 'professional', organizationName: null });

            // Issue a short-lived temp token so the complete-profile page can call PATCH /auth/complete-profile
            const tempToken = jwt.sign(
                { id: user.id, name: user.name, email: user.email, role: user.role, professional_sub_type: user.professional_sub_type || null },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            res.cookie('arc_token', tempToken, COOKIE_OPTIONS);

            // Redirect to complete-profile page — user must pick sub-category
            return res.redirect(`${origin}/register/complete`);
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
            { id: user.id, name: user.name, email: user.email, role: user.role, professional_sub_type: user.professional_sub_type || null },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.cookie('arc_token', token, COOKIE_OPTIONS);

        return res.redirect(`${origin}/auth/callback`);

    } catch (err) {
        next(err);
    }
};

// PATCH /api/auth/complete-profile
// Used by LinkedIn OAuth new users to set professional_sub_type + linkedin_url
export const completeProfile = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated.' });

        const allowedSubTypes = ['working_professional', 'final_year_undergrad'];
        const { professional_sub_type, linkedin_url } = req.body;

        if (!allowedSubTypes.includes(professional_sub_type)) {
            return res.status(400).json({ success: false, message: 'Invalid sub-category. Choose working_professional or final_year_undergrad.' });
        }

        await pool.query(
            `UPDATE users SET professional_sub_type = ?, linkedin_url = COALESCE(NULLIF(?, ''), linkedin_url) WHERE id = ?`,
            [professional_sub_type, linkedin_url || null, userId]
        );

        return res.json({ success: true, data: { message: 'Profile completed successfully.' } });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/auth/request-upgrade
// Allows a final_year_undergrad professional to request upgrade to working_professional.
// Requires admin approval — sets pending_sub_type_upgrade = 1.
export const requestSubTypeUpgrade = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated.' });

        const [rows] = await pool.query(
            'SELECT role, professional_sub_type, pending_sub_type_upgrade FROM users WHERE id = ?',
            [userId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

        const u = rows[0];

        if (u.role !== 'professional') {
            return res.status(403).json({ success: false, message: 'Only Professional members can request a sub-type upgrade.' });
        }
        if (u.professional_sub_type !== 'final_year_undergrad') {
            return res.status(409).json({ success: false, message: 'You are already a Working Professional.' });
        }
        if (u.pending_sub_type_upgrade) {
            return res.status(409).json({ success: false, message: 'You already have an upgrade request pending admin review.' });
        }

        await pool.query(
            `UPDATE users
             SET pending_sub_type_upgrade = 1,
                 sub_type_upgrade_status  = 'pending'
             WHERE id = ?`,
            [userId]
        );

        return res.json({ success: true, data: { message: 'Upgrade request submitted. An admin will review it within 24–48 hours.' } });
    } catch (err) {
        next(err);
    }
};
