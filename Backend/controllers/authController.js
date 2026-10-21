import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail, sendVerificationEmail } from '../services/emailService.js';
import {
    attachReferral, findActiveProfileByCode, extendLeadTermIfDue, needsPolicyAcceptance,
} from '../services/chapterLeadService.js';
import { normalizeReferralCode, isCountryCode, POLICY_VERSION } from '../utils/chapterLeadRules.js';
import { COOKIE_OPTIONS, completeLogin } from '../services/sessionService.js';

// Validates an optional chapter against the chosen country. Returns the chapter id,
// null (none chosen) or false (invalid).
const resolveSignupChapter = async (rawChapterId, countryCode) => {
    if (rawChapterId === undefined || rawChapterId === null || rawChapterId === '') return null;
    const [[chapter]] = await pool.query(
        `SELECT id, country_code FROM chapters WHERE id = ? AND status = 'active'`,
        [parseInt(rawChapterId, 10) || 0]
    );
    return chapter && chapter.country_code === countryCode ? chapter.id : false;
};

// POST /api/auth/register
export const register = async (req, res, next) => {
    try {
        const { name, email, password, role, organization_name, linkedin_url, professional_sub_type, ref_code, country_code, chapter_id } = req.body;

        // Only professional can self-register; council_member and founding_member are assigned by admin
        const allowedSelfRoles = ['professional'];
        const assignedRole = allowedSelfRoles.includes(role) ? role : 'professional';

        const allowedSubTypes = ['working_professional', 'final_year_undergrad'];

        if (!organization_name || !organization_name.trim()) {
            return res.status(400).json({ success: false, message: 'Organisation / University name is required.' });
        }

        if (assignedRole === 'professional') {
            if (!professional_sub_type || !allowedSubTypes.includes(professional_sub_type)) {
                return res.status(400).json({ success: false, message: 'Membership sub-type is required (working_professional or final_year_undergrad).' });
            }
            if (!linkedin_url || !linkedin_url.trim()) {
                return res.status(400).json({ success: false, message: 'LinkedIn profile URL is required.' });
            }
        }

        const subType = assignedRole === 'professional' ? professional_sub_type : null;

        // Geography (needed to attribute members to a chapter) and the optional referral code
        if (!isCountryCode(country_code)) {
            return res.status(400).json({ success: false, message: 'Please select your country.' });
        }
        const country = country_code.trim().toUpperCase();
        const chapterId = await resolveSignupChapter(chapter_id, country);
        if (chapterId === false) {
            return res.status(400).json({ success: false, message: 'Please choose a valid chapter for your country.' });
        }
        let referralCode = null;
        if (ref_code && String(ref_code).trim()) {
            const lead = await findActiveProfileByCode(ref_code);
            if (!lead) {
                return res.status(422).json({
                    success: false,
                    message: 'That referral code is not valid or is no longer active. Check it, or clear the field to continue without one.',
                });
            }
            referralCode = lead.referral_code;
        }

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email address is already registered.' });
        }

        const [verification] = await pool.query('SELECT verified FROM email_verifications WHERE email = ?', [email.trim().toLowerCase()]);
        if (verification.length === 0 || !verification[0].verified) {
            return res.status(403).json({ success: false, message: 'Email address has not been verified. Please verify your email first.' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        // User + referral are written together so a referral is never half-recorded.
        const conn = await pool.getConnection();
        let result;
        try {
            await conn.beginTransaction();
            [result] = await conn.query(
                `INSERT INTO users (name, email, password_hash, role, professional_sub_type, status, organization_name, linkedin_url, country_code, chapter_id)
                 VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
                [name.trim(), email.trim().toLowerCase(), password_hash, assignedRole, subType, organization_name || null, linkedin_url || null, country, chapterId]
            );
            if (referralCode) {
                await attachReferral(conn, { referredUserId: result.insertId, code: referralCode });
            }
            await conn.commit();
        } catch (txErr) {
            await conn.rollback().catch(() => {});
            throw txErr;
        } finally {
            conn.release();
        }

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

        // Deleted accounts have their password_hash scrubbed — check status
        // before calling bcrypt so a null hash never reaches it, and so a
        // deleted account resolves to the same generic message as a wrong
        // password (it shouldn't confirm the account ever existed).
        if (user.status === 'deleted' || !user.password_hash) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        return completeLogin(res, user);
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/logout
export const logout = (req, res) => {
    res.clearCookie('arc_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
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
            'SELECT id, name, email, role, professional_sub_type, pending_sub_type_upgrade, status, bio, photo_url, linkedin_url, linkedin_id, organization_name, profile_badge, created_at, (password_hash IS NOT NULL AND CHAR_LENGTH(password_hash) > 0) AS has_password FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Active Chapter Leads must accept the current Privacy Policy + Terms version.
        // A failure here must never break session restore, so it degrades to "no prompt".
        let needsPolicy = false;
        try {
            needsPolicy = await needsPolicyAcceptance(rows[0].id, rows[0].role);
        } catch (err) {
            console.error('[getMe] policy acceptance check failed:', err.message);
        }

        return res.json({
            success: true,
            data: { ...rows[0], has_password: !!rows[0].has_password, needs_policy_acceptance: needsPolicy, policy_version: POLICY_VERSION },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/linkedin/callback  (called by Passport after LinkedIn redirects back)
export const linkedinCallback = async (req, res, next) => {
    try {
        // A referral code stashed by GET /api/auth/linkedin?ref=... (a cookie, because the
        // OAuth round-trip regenerates the session). Read once, then always cleared.
        const referralCookie = normalizeReferralCode(req.cookies?.arc_ref);
        res.clearCookie('arc_ref', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });

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

        // ── Handle "Connect LinkedIn" for already logged-in users ──────────
        const existingToken = req.cookies?.arc_token;
        if (existingToken) {
            try {
                const decoded = jwt.verify(existingToken, process.env.JWT_SECRET);
                // User is already logged in! Just connect their LinkedIn.
                await pool.query(
                    `UPDATE users SET linkedin_id = ?, auth_provider = 'linkedin',
                     photo_url = COALESCE(NULLIF(photo_url,''), ?), linkedin_access_token = ? WHERE id = ?`,
                    [linkedinId, photo_url, req.linkedinProfile.accessToken, decoded.id]
                );
                // Redirect back to profile with a success param
                return res.redirect(`${origin}/profile?linkedin_connected=true`);
            } catch (err) {
                // Ignore token errors and proceed with normal login/registration
                console.log('[LinkedIn Connect] Token verification failed, proceeding to login:', err.message);
            }
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
                 photo_url = COALESCE(NULLIF(photo_url,''), ?), linkedin_access_token = ? WHERE id = ?`,
                [linkedinId, photo_url, req.linkedinProfile.accessToken, user.id]
            );
        } else {
            // New user — create with pending status, requires admin approval like all registrations
            // Auto-construct the linkedin_url from their OAuth profile (stronger than a self-typed URL)
            const linkedinUrl = `https://www.linkedin.com/in/${linkedinId}`;

            const [result] = await pool.query(
                `INSERT INTO users (name, email, linkedin_id, linkedin_access_token, auth_provider, role, status, photo_url, linkedin_url)
         VALUES (?, ?, ?, ?, 'linkedin', 'professional', 'pending', ?, ?)`,
                [name, email, linkedinId, req.linkedinProfile.accessToken, photo_url, linkedinUrl]
            );
            const [newRows] = await pool.query(
                'SELECT id, name, email, role, professional_sub_type, status, membership_expires_at FROM users WHERE id = ?',
                [result.insertId]
            );
            user = newRows[0];

            if (referralCookie) {
                try {
                    await attachReferral(pool, { referredUserId: result.insertId, code: referralCookie });
                } catch (refErr) {
                    // Never block a sign-up over attribution.
                    console.error('[LinkedIn] Could not record referral:', refErr.message);
                }
            }

            // Issue a short-lived temp token ONLY to allow the complete-profile PATCH call.
            // This token expires in 1h and the cookie is cleared after profile completion.
            const tempToken = jwt.sign(
                { id: user.id, name: user.name, email: user.email, role: user.role, professional_sub_type: user.professional_sub_type || null },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            res.cookie('arc_token', tempToken, COOKIE_OPTIONS);

            // Redirect to complete-profile page — user must pick sub-category + org name only
            return res.redirect(`${origin}/register/complete`);
        }

        // ── Status checks ─────────────────────────────────────────────────────
        if (user.status === 'rejected') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=rejected`);
        }
        if (user.status === 'pending') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=pending`);
        }

        let linkedinExpiry = user.membership_expires_at;
        if (user.role === 'council_member' && linkedinExpiry && new Date(linkedinExpiry) < new Date()) {
            try {
                linkedinExpiry = (await extendLeadTermIfDue(user.id)) || linkedinExpiry;
            } catch (err) {
                console.error('[LinkedIn] Chapter Lead term check failed:', err.message);
            }
        }
        if (linkedinExpiry && new Date(linkedinExpiry) < new Date()) {
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
// Used by LinkedIn OAuth new users to set professional_sub_type + organization_name.
// linkedin_url is already saved during OAuth — no need to ask again.
export const completeProfile = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated.' });

        const allowedSubTypes = ['working_professional', 'final_year_undergrad'];
        const { professional_sub_type, organization_name, country_code, chapter_id } = req.body;

        if (!isCountryCode(country_code)) {
            return res.status(400).json({ success: false, message: 'Please select your country.' });
        }
        const country = country_code.trim().toUpperCase();
        const chapterId = await resolveSignupChapter(chapter_id, country);
        if (chapterId === false) {
            return res.status(400).json({ success: false, message: 'Please choose a valid chapter for your country.' });
        }

        if (!allowedSubTypes.includes(professional_sub_type)) {
            return res.status(400).json({ success: false, message: 'Invalid sub-category. Choose working_professional or final_year_undergrad.' });
        }

        if (!organization_name || !organization_name.trim()) {
            return res.status(400).json({ success: false, message: 'Organisation / University name is required.' });
        }

        await pool.query(
            `UPDATE users SET professional_sub_type = ?, organization_name = ?, country_code = ?, chapter_id = ? WHERE id = ?`,
            [professional_sub_type, organization_name.trim(), country, chapterId, userId]
        );

        // Fetch user details to send the welcome email now that profile is complete
        const [rows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [userId]);
        if (rows.length) {
            sendWelcomeEmail({ name: rows[0].name, email: rows[0].email, role: 'professional', organizationName: organization_name.trim() });
        }

        // Clear the temp JWT cookie — user must wait for admin approval before logging in.
        // This enforces the admin approval gate properly.
        res.clearCookie('arc_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return res.json({ success: true, data: { message: 'Profile completed. Pending admin approval.' } });
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

// GET /api/auth/referral/:code
// Lets the sign-up form confirm a referral code before the user submits. Public.
// Returns only the lead's first name — enough to reassure, nothing more.
export const checkReferralCode = async (req, res, next) => {
    try {
        const lead = await findActiveProfileByCode(req.params.code);
        if (!lead) return res.json({ success: true, data: { valid: false } });
        return res.json({
            success: true,
            data: { valid: true, code: lead.referral_code, lead_first_name: String(lead.lead_name || '').split(' ')[0] || null },
        });
    } catch (err) {
        next(err);
    }
};
