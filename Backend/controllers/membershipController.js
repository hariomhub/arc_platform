/**
 * membershipController.js
 * Handles membership upgrade applications from logged-in users.
 *
 *  POST /api/membership/apply/council   — apply for Council Member upgrade
 *  POST /api/membership/apply/executive — legacy alias for the above
 *
 * Founding Member is admin-only — created directly in DB, no public application.
 */

import pool from '../db/connection.js';
import {
    sendCouncilApplicationAdminEmail,
    sendMembershipApplicationReceivedEmail,
} from '../services/emailService.js';

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
                message: `You already have a ${user.role === 'council_member' ? 'Council Member' : 'Founding Member'} membership.`,
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
                message: 'You already have a pending Council Member application.',
            });
        }

        const {
            organization_name, job_title, linkedin_url, phone,
            professional_bio, areas_of_expertise, why_council_member,
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO membership_applications
             (user_id, requested_role, full_name, email, organization_name, job_title, linkedin_url, phone,
              professional_bio, areas_of_expertise, why_founding_member, payment_reference, amount_paid)
             VALUES (?, 'council_member', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APP-ONLY', 0.00)`,
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
            ]
        );

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
                message: 'Your Council Member application has been submitted. You will be notified once reviewed by our admin team.',
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
