/**
 * membershipController.js
 * Handles membership upgrade applications from logged-in users.
 *
 *  POST /api/membership/apply/executive  — apply for Executive upgrade
 *  POST /api/membership/apply/founding   — request Founding Member invitation
 */

import pool from '../db/connection.js';
import {
    sendExecutiveApplicationAdminEmail,
    sendMembershipApplicationReceivedEmail,
} from '../services/emailService.js';

// ── Helper: notify all founding_member admins ─────────────────────────────────
const notifyAdmins = async (applicationRow) => {
    // Use dedicated ADMIN_EMAIL env var if set, otherwise query all founding members
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
        sendExecutiveApplicationAdminEmail({ adminEmail, application: applicationRow });
    } else {
        const [admins] = await pool.query(
            `SELECT name, email FROM users WHERE role = 'founding_member' AND status != 'rejected'`
        );
        for (const admin of admins) {
            sendExecutiveApplicationAdminEmail({
                adminEmail: admin.email,
                adminName:  admin.name,
                application: applicationRow,
            });
        }
    }
};

// ── POST /api/membership/apply/executive ─────────────────────────────────────
export const applyExecutive = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Block if already executive or founding_member
        const [[user]] = await pool.query(
            `SELECT role, status FROM users WHERE id = ?`, [userId]
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        if (['executive', 'founding_member'].includes(user.role)) {
            return res.status(409).json({
                success: false,
                message: `You already have ${user.role === 'executive' ? 'an Executive' : 'a Founding Member'} membership.`,
            });
        }

        // Block duplicate pending application
        const [existing] = await pool.query(
            `SELECT id FROM membership_applications
             WHERE user_id = ? AND requested_role = 'executive' AND status = 'pending'`,
            [userId]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'You already have a pending Executive membership application.',
            });
        }

        const {
            organization_name, job_title, linkedin_url, phone,
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO membership_applications
             (user_id, requested_role, full_name, email, organization_name, job_title, linkedin_url, phone,
              payment_reference, amount_paid)
             VALUES (?, 'executive', ?, ?, ?, ?, ?, ?, 'PROMO-100PCT', 0.00)`,
            [
                userId,
                req.user.name,
                req.user.email,
                organization_name || null,
                job_title        || null,
                linkedin_url     || null,
                phone            || null,
            ]
        );

        const applicationRow = {
            id:                result.insertId,
            requested_role:    'executive',
            full_name:         req.user.name,
            email:             req.user.email,
            organization_name: organization_name || null,
            job_title:         job_title        || null,
            linkedin_url:      linkedin_url     || null,
            payment_reference: 'PROMO-100PCT',
            amount_paid:       0.00,
            created_at:        new Date(),
        };

        // Email: applicant confirmation + admin notification (executive only)
        sendMembershipApplicationReceivedEmail({
            name:          req.user.name,
            email:         req.user.email,
            requestedRole: 'executive',
        });
        await notifyAdmins(applicationRow);

        return res.status(201).json({
            success: true,
            data: {
                message: 'Your Executive membership application has been submitted. You will be notified once reviewed by our admin team.',
                applicationId: result.insertId,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/membership/apply/founding ──────────────────────────────────────
export const applyFounding = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [[user]] = await pool.query(
            `SELECT role FROM users WHERE id = ?`, [userId]
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        if (user.role === 'founding_member') {
            return res.status(409).json({ success: false, message: 'You are already a Founding Member.' });
        }

        // Block duplicate pending application
        const [existing] = await pool.query(
            `SELECT id FROM membership_applications
             WHERE user_id = ? AND requested_role = 'founding_member' AND status = 'pending'`,
            [userId]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'You already have a pending Founding Member invitation request.',
            });
        }

        const {
            organization_name, job_title, linkedin_url, phone,
            professional_bio, areas_of_expertise, why_founding_member,
            website_url, twitter_url,
        } = req.body;

        if (!why_founding_member || !why_founding_member.trim()) {
            return res.status(422).json({
                success: false,
                message: 'Please explain why you want to become a Founding Member.',
            });
        }

        const [result] = await pool.query(
            `INSERT INTO membership_applications
             (user_id, requested_role, full_name, email, organization_name, job_title, linkedin_url, phone,
              professional_bio, areas_of_expertise, why_founding_member, website_url, twitter_url)
             VALUES (?, 'founding_member', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                req.user.name,
                req.user.email,
                organization_name   || null,
                job_title           || null,
                linkedin_url        || null,
                phone               || null,
                professional_bio    || null,
                areas_of_expertise  || null,
                why_founding_member.trim(),
                website_url         || null,
                twitter_url         || null,
            ]
        );

        // Email: applicant confirmation only (no admin email for founding per requirements)
        sendMembershipApplicationReceivedEmail({
            name:          req.user.name,
            email:         req.user.email,
            requestedRole: 'founding_member',
        });

        return res.status(201).json({
            success: true,
            data: {
                message: 'Your Founding Member invitation request has been submitted. Our council will review and reach out to you directly.',
                applicationId: result.insertId,
            },
        });
    } catch (err) {
        next(err);
    }
};
