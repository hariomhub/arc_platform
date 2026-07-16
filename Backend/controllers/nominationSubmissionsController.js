/**
 * nominationSubmissionsController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-nomination flow — separate from the admin-authored nominee CRUD in
 * nominationsController.js. Handles:
 *   - Email OTP verification for non-member (case 2) submitters
 *   - Submitting a self-nomination (case 1: logged-in member, case 2: anonymous)
 *   - Admin moderation: approve / reject pending self-nominations
 *
 * A self-nomination is inserted into the existing `nominees` table with
 * status='pending' and is_active=false, so it stays invisible to every
 * existing public query (which already filters is_active=1) until an admin
 * approves it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { uploadToBlob } from '../services/azureBlobService.js';
import { verifyRecaptchaToken } from '../middleware/verifyRecaptcha.js';
import {
    sendNominationOtpEmail,
    sendSelfNominationAdminEmail,
    sendSelfNominationReceivedEmail,
    sendSelfNominationDecisionEmail,
} from '../services/emailService.js';

const OTP_PURPOSE = 'self_nomination';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helper: notify founding_member admins that a nomination needs review ──────
const notifyAdmins = async (nomination) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
        sendSelfNominationAdminEmail({ adminEmail, nomination });
        return;
    }
    const [admins] = await pool.query(
        `SELECT name, email FROM users WHERE role = 'founding_member' AND status != 'rejected'`
    );
    for (const admin of admins) {
        sendSelfNominationAdminEmail({ adminEmail: admin.email, adminName: admin.name, nomination });
    }
};

// ── POST /api/nominations/self-nominate/send-otp ──────────────────────────────
export const sendNominationOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({ success: false, message: 'A valid email address is required.' });
        }
        const cleanEmail = email.trim().toLowerCase();

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            `INSERT INTO otp_verifications (email, purpose, otp, expires_at, verified)
             VALUES (?, ?, ?, ?, FALSE)
             ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?, verified = FALSE`,
            [cleanEmail, OTP_PURPOSE, otp, expiresAt, otp, expiresAt]
        );

        sendNominationOtpEmail(cleanEmail, otp);

        return res.json({ success: true, message: 'Verification code sent successfully.' });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/nominations/self-nominate/verify-otp ────────────────────────────
export const verifyNominationOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }
        const cleanEmail = email.trim().toLowerCase();

        const [rows] = await pool.query(
            `SELECT * FROM otp_verifications WHERE email = ? AND purpose = ?`,
            [cleanEmail, OTP_PURPOSE]
        );
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

        await pool.query(
            `UPDATE otp_verifications SET verified = TRUE WHERE email = ? AND purpose = ?`,
            [cleanEmail, OTP_PURPOSE]
        );

        return res.json({ success: true, message: 'Email verified successfully.' });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/nominations/self-nominate ────────────────────────────────────────
// Body (multipart/form-data, optional `photo` file):
//   award_id, category_id, designation, company, linkedin_url, achievements,
//   description, consent_to_terms
//   Case 1 (req.user present): name/phone optional overrides of profile data
//   Case 2 (no req.user): name, submitter_email, submitter_phone, recaptchaToken required
export const submitSelfNomination = async (req, res, next) => {
    try {
        const {
            award_id, category_id, name, designation, company, linkedin_url,
            achievements, description, consent_to_terms, phone,
            submitter_email, submitter_phone, recaptchaToken,
        } = req.body;

        if (String(consent_to_terms) !== 'true') {
            return res.status(422).json({ success: false, message: 'You must agree to the Terms & Conditions to submit a nomination.' });
        }
        if (!award_id || !category_id) {
            return res.status(400).json({ success: false, message: 'Award and category are required.' });
        }

        const [[categoryRow]] = await pool.query(
            `SELECT ac.id, a.is_active FROM award_categories ac
             JOIN awards a ON a.id = ac.award_id
             WHERE ac.id = ? AND ac.award_id = ?`,
            [category_id, award_id]
        );
        if (!categoryRow || !categoryRow.is_active) {
            return res.status(400).json({ success: false, message: 'Selected award or category is not available.' });
        }

        const isMember = Boolean(req.user && req.user.id);
        let finalName, finalEmail, finalPhone;

        if (isMember) {
            const [[user]] = await pool.query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
            if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
            finalName  = (name && name.trim()) || user.name;
            finalEmail = user.email;
            finalPhone = phone?.trim() || null;
        } else {
            if (!name || !name.trim()) {
                return res.status(400).json({ success: false, message: 'Name is required.' });
            }
            if (!submitter_email || !EMAIL_REGEX.test(submitter_email)) {
                return res.status(400).json({ success: false, message: 'A valid email address is required.' });
            }
            if (!recaptchaToken) {
                return res.status(400).json({ success: false, message: 'reCAPTCHA verification is required.' });
            }
            const remoteIp = req.ip || req.connection.remoteAddress;
            const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, remoteIp);
            if (!recaptchaResult.success) {
                return res.status(400).json({ success: false, message: recaptchaResult.error || 'reCAPTCHA verification failed. Please try again.' });
            }

            const cleanEmail = submitter_email.trim().toLowerCase();
            const [[otpRecord]] = await pool.query(
                `SELECT verified FROM otp_verifications WHERE email = ? AND purpose = ?`,
                [cleanEmail, OTP_PURPOSE]
            );
            if (!otpRecord || !otpRecord.verified) {
                return res.status(403).json({ success: false, message: 'Please verify your email with the OTP sent to you before submitting.' });
            }

            finalName  = name.trim();
            finalEmail = cleanEmail;
            finalPhone = submitter_phone?.trim() || null;
        }

        let photo_url = null;
        if (req.file) {
            photo_url = await uploadToBlob('nominees/photos', req.file.originalname, req.file.buffer, req.file.mimetype);
        }

        const [r] = await pool.query(
            `INSERT INTO nominees
                (award_id, category_id, name, designation, company, linkedin_url, achievements, description,
                 photo_url, is_active, is_winner, status, is_self_nominated, submitted_by_user_id,
                 submitter_email, submitter_phone, email_verified_at, consent_to_terms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, 'pending', TRUE, ?, ?, ?, NOW(), TRUE)`,
            [
                award_id, category_id, finalName, designation?.trim() || null, company?.trim() || null,
                linkedin_url?.trim() || null, achievements?.trim() || null, description?.trim() || null,
                photo_url, isMember ? req.user.id : null, finalEmail, finalPhone,
            ]
        );

        const [[row]] = await pool.query(
            `SELECT n.*, ac.name AS category_name, a.name AS award_name
             FROM nominees n
             JOIN award_categories ac ON ac.id = n.category_id
             JOIN awards a ON a.id = n.award_id
             WHERE n.id = ?`,
            [r.insertId]
        );

        sendSelfNominationReceivedEmail({ name: finalName, email: finalEmail, awardName: row.award_name, categoryName: row.category_name });
        notifyAdmins({ ...row, submitter_email: finalEmail });

        return res.status(201).json({ success: true, data: row });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/nominations/pending/:id/approve  (admin) ────────────────────────
export const approveSelfNomination = async (req, res, next) => {
    try {
        const [[nom]] = await pool.query(
            `SELECT n.*, ac.name AS category_name, a.name AS award_name
             FROM nominees n
             JOIN award_categories ac ON ac.id = n.category_id
             JOIN awards a ON a.id = n.award_id
             WHERE n.id = ? AND n.status = 'pending'`,
            [req.params.id]
        );
        if (!nom) return res.status(404).json({ success: false, message: 'Pending self-nomination not found.' });

        await pool.query(`UPDATE nominees SET status = 'approved', is_active = TRUE WHERE id = ?`, [nom.id]);

        if (nom.submitter_email) {
            sendSelfNominationDecisionEmail({
                name: nom.name, email: nom.submitter_email,
                awardName: nom.award_name, categoryName: nom.category_name,
                approved: true,
            });
        }

        const [[updated]] = await pool.query(`SELECT * FROM nominees WHERE id = ?`, [nom.id]);
        return res.json({ success: true, data: updated });
    } catch (err) { next(err); }
};

// ── POST /api/nominations/pending/:id/reject  (admin) ─────────────────────────
export const rejectSelfNomination = async (req, res, next) => {
    try {
        const { admin_notes } = req.body;
        const [[nom]] = await pool.query(
            `SELECT n.*, ac.name AS category_name, a.name AS award_name
             FROM nominees n
             JOIN award_categories ac ON ac.id = n.category_id
             JOIN awards a ON a.id = n.award_id
             WHERE n.id = ? AND n.status = 'pending'`,
            [req.params.id]
        );
        if (!nom) return res.status(404).json({ success: false, message: 'Pending self-nomination not found.' });

        await pool.query(`UPDATE nominees SET status = 'rejected', admin_notes = ? WHERE id = ?`, [admin_notes?.trim() || null, nom.id]);

        if (nom.submitter_email) {
            sendSelfNominationDecisionEmail({
                name: nom.name, email: nom.submitter_email,
                awardName: nom.award_name, categoryName: nom.category_name,
                approved: false, adminNotes: admin_notes,
            });
        }

        const [[updated]] = await pool.query(`SELECT * FROM nominees WHERE id = ?`, [nom.id]);
        return res.json({ success: true, data: updated });
    } catch (err) { next(err); }
};
