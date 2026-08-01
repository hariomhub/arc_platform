/**
 * accountDeletionController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles account deletion: a user submits a request and it is executed
 * immediately (soft-delete tombstone — see accountDeletionService.js).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { sendDeletionApprovedEmail } from '../services/emailService.js';
import { softDeleteUser, purgeProfilePhoto } from '../services/accountDeletionService.js';

// ─── POST /api/account-deletion/submit ────────────────────────────────────────
// Authenticated user submits a deletion request.
export const submitDeletionRequest = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const userId = req.user.id;
        const { full_name, email, reason } = req.body;

        if (!full_name || !full_name.trim()) {
            return res.status(400).json({ success: false, message: 'Full name is required.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }

        // Verify user owns this email
        const [userRows] = await conn.query(
            'SELECT id, name, email, status, role, photo_url FROM users WHERE id = ?',
            [userId]
        );
        if (!userRows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const user = userRows[0];

        // Restrict administrators from self-deletion
        if (user.role === 'founding_member' || user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Administrator accounts cannot be deleted from within the application.',
            });
        }

        if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: 'The email address does not match your registered account email.',
            });
        }

        // Block if already deleted
        if (user.status === 'deleted') {
            return res.status(409).json({
                success: false,
                message: 'This account has already been deleted.',
            });
        }

        await conn.beginTransaction();

        // Insert an audit/tracking record before scrubbing the account
        await conn.query(
            `INSERT INTO account_deletion_requests (user_id, full_name, email, reason, status, requested_at, approved_at, completed_at, approved_by, admin_notes)
             VALUES (?, ?, ?, ?, 'Deleted', NOW(), NOW(), NOW(), NULL, 'Immediate account deletion request completed by user.')`,
            [userId, full_name.trim(), email.trim().toLowerCase(), reason?.trim() || null]
        );

        // Scrub identifying data in place and remove purely-private records.
        // Posts, resources, reviews, and votes are left untouched — they keep
        // pointing at this same (now-anonymized) user row.
        await softDeleteUser(conn, user);

        await conn.commit();

        // Purge profile photo from Azure Blob Storage (fire-and-forget)
        await purgeProfilePhoto(user);

        // Send permanent deletion confirmation email
        sendDeletionApprovedEmail({ name: full_name.trim(), email: email.trim() });

        return res.json({
            success: true,
            data: {
                message: 'Your account and all associated personal data have been permanently deleted successfully.',
            },
        });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};

// ─── GET /api/account-deletion/my-request ────────────────────────────────────
// Authenticated user checks status of their own deletion request.
export const getMyDeletionRequest = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, full_name, email, reason, status, requested_at, approved_at,
                    rejected_at, completed_at, admin_notes
             FROM account_deletion_requests
             WHERE user_id = ?
             ORDER BY requested_at DESC
             LIMIT 1`,
            [req.user.id]
        );
        return res.json({ success: true, data: rows[0] || null });
    } catch (err) {
        next(err);
    }
};
