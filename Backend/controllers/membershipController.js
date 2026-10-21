/**
 * membershipController.js
 * Handles membership upgrade applications from logged-in users.
 *
 *  POST /api/membership/apply/council   — apply for Council Member upgrade
 *  POST /api/membership/apply/executive — legacy alias for the above
 *
 * Applying requires ticking the Privacy Policy + Terms agreement. The acceptance is
 * stored (versioned) in policy_acceptances, separate from the application row.
 *
 * Founding Member is admin-only — created directly in DB, no public application.
 */

import pool from '../db/connection.js';
import {
    sendCouncilApplicationAdminEmail,
    sendMembershipApplicationReceivedEmail,
} from '../services/emailService.js';
import { recordPolicyAcceptance } from '../services/chapterLeadService.js';
import { isCountryCode } from '../utils/chapterLeadRules.js';

// ── Helper: notify all founding_member admins ─────────────────────────────────
const notifyAdmins = async (applicationRow) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
        sendCouncilApplicationAdminEmail({ adminEmail, application: applicationRow });
    } else {
        const [admins] = await pool.query(
            `SELECT name, email FROM users WHERE role = 'founding_member' AND status != 'rejected'`
        );
        for (const admin of admins) {
            sendCouncilApplicationAdminEmail({
                adminEmail: admin.email,
                adminName:  admin.name,
                application: applicationRow,
            });
        }
    }
};

// ── POST /api/membership/apply/council ───────────────────────────────────────
export const applyCouncil = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Block if already council_member or founding_member
        const [[user]] = await pool.query(
            `SELECT role, status FROM users WHERE id = ?`, [userId]
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        if (['council_member', 'founding_member'].includes(user.role)) {
            return res.status(409).json({
                success: false,
                message: `You already have a ${user.role === 'council_member' ? 'Chapter Lead' : 'Founding Member'} membership.`,
            });
        }

        // Block duplicate pending application
        const [existing] = await pool.query(
            `SELECT id FROM membership_applications
             WHERE user_id = ? AND requested_role = 'council_member' AND status = 'pending'`,
            [userId]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'You already have a pending Chapter Lead application.',
            });
        }

        const {
            organization_name, job_title, linkedin_url, phone,
            professional_bio, areas_of_expertise, why_council_member,
            accept_privacy, country_code, chapter_id,
        } = req.body;

        // The agreement tick is enforced here, not only in the form.
        if (accept_privacy !== true) {
            return res.status(422).json({
                success: false,
                message: 'You must agree to the Privacy Policy and Terms to apply as a Chapter Lead.',
            });
        }
        if (!isCountryCode(country_code)) {
            return res.status(422).json({ success: false, message: 'Please select your country.' });
        }
        const country = country_code.trim().toUpperCase();

        // Optional chapter: must exist, be active and belong to the chosen country.
        let requestedChapterId = null;
        if (chapter_id !== undefined && chapter_id !== null && chapter_id !== '') {
            const [[chapter]] = await pool.query(
                `SELECT id, country_code FROM chapters WHERE id = ? AND status = 'active'`,
                [parseInt(chapter_id, 10) || 0]
            );
            if (!chapter || chapter.country_code !== country) {
                return res.status(422).json({ success: false, message: 'Please choose a valid chapter for your country.' });
            }
            requestedChapterId = chapter.id;
        }

        const conn = await pool.getConnection();
        let result;
        try {
            await conn.beginTransaction();
            [result] = await conn.query(
                `INSERT INTO membership_applications
                 (user_id, requested_role, full_name, email, organization_name, job_title, linkedin_url, phone,
                  professional_bio, areas_of_expertise, why_founding_member, payment_reference, amount_paid,
                  requested_country_code, requested_chapter_id)
                 VALUES (?, 'council_member', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APP-ONLY', 0.00, ?, ?)`,
                [
                    userId,
                    req.user.name,
                    req.user.email,
                    organization_name    || null,
                    job_title            || null,
                    linkedin_url         || null,
                    phone                || null,
                    professional_bio     || null,
                    areas_of_expertise   || null,
                    why_council_member   || null,
                    country,
                    requestedChapterId,
                ]
            );
            await recordPolicyAcceptance(conn, userId, { ip: req.ip, context: 'chapter_lead_application' });
            await conn.query(
                'UPDATE users SET country_code = COALESCE(country_code, ?) WHERE id = ?',
                [country, userId]
            );
            await conn.commit();
        } catch (txErr) {
            await conn.rollback().catch(() => {});
            throw txErr;
        } finally {
            conn.release();
        }

        const applicationRow = {
            id:                result.insertId,
            requested_role:    'council_member',
            full_name:         req.user.name,
            email:             req.user.email,
            organization_name: organization_name || null,
            job_title:         job_title         || null,
            linkedin_url:      linkedin_url      || null,
            payment_reference: 'APP-ONLY',
            amount_paid:       0.00,
            created_at:        new Date(),
        };

        // Email: applicant confirmation + admin notification
        sendMembershipApplicationReceivedEmail({
            name:          req.user.name,
            email:         req.user.email,
            requestedRole: 'council_member',
        });
        await notifyAdmins(applicationRow);

        return res.status(201).json({
            success: true,
            data: {
                message: 'Your Chapter Lead application has been submitted. You will be notified once reviewed by our admin team.',
                applicationId: result.insertId,
            },
        });
    } catch (err) {
        next(err);
    }
};

// Legacy alias — kept so any old '/apply/executive' calls still work
export const applyExecutive = applyCouncil;

// applyFounding removed — Founding Members are created manually in DB only
