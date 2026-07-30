/**
 * accountDeletionController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all account deletion request lifecycle:
 *  - User submits a deletion request → account marked pending_deletion
 *  - Admin views, approves, or rejects requests
 *  - Approval permanently purges all user data
 *  - Rejection reactivates the account
 *
 * No GDPR terminology is used anywhere in this module.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    sendDeletionRequestConfirmationEmail,
    sendDeletionApprovedEmail,
    sendDeletionRejectedEmail,
} from '../services/emailService.js';
import { deleteFromBlob } from '../services/azureBlobService.js';

// ─── Helper: pagination ───────────────────────────────────────────────────────
const paginate = (query, total) => {
    const page  = Math.max(1, parseInt(query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset, totalPages: Math.ceil(total / limit) };
};

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
            'SELECT id, name, email, status FROM users WHERE id = ?',
            [userId]
        );
        if (!userRows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const user = userRows[0];

        if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: 'The email address does not match your registered account email.',
            });
        }

        // Block if already pending or deleted
        if (user.status === 'pending_deletion') {
            return res.status(409).json({
                success: false,
                message: 'You already have a pending account deletion request.',
            });
        }
        if (user.status === 'deleted') {
            return res.status(409).json({
                success: false,
                message: 'This account has already been deleted.',
            });
        }

        // Check for an existing open request
        const [existing] = await conn.query(
            "SELECT id FROM account_deletion_requests WHERE user_id = ? AND status = 'Pending'",
            [userId]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'You already have a pending account deletion request.',
            });
        }

        await conn.beginTransaction();

        // Insert the deletion request
        await conn.query(
            `INSERT INTO account_deletion_requests (user_id, full_name, email, reason, status, requested_at)
             VALUES (?, ?, ?, ?, 'Pending', NOW())`,
            [userId, full_name.trim(), email.trim().toLowerCase(), reason?.trim() || null]
        );

        // Mark user account as pending_deletion
        await conn.query(
            "UPDATE users SET status = 'pending_deletion' WHERE id = ?",
            [userId]
        );

        await conn.commit();

        // Fire-and-forget confirmation email
        sendDeletionRequestConfirmationEmail({ name: full_name.trim(), email: email.trim() });

        return res.json({
            success: true,
            data: {
                message:
                    'Your account deletion request has been submitted successfully. ' +
                    'Your account has been temporarily deactivated and is awaiting administrator approval. ' +
                    'You will receive an email once your request has been approved or rejected.',
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

// ─── GET /api/account-deletion/admin/requests ─────────────────────────────────
// Admin: paginated list of all deletion requests.
export const getDeletionRequests = async (req, res, next) => {
    try {
        const { status, search } = req.query;

        let countSql = `SELECT COUNT(*) AS total
                        FROM account_deletion_requests adr
                        JOIN users u ON u.id = adr.user_id
                        WHERE 1=1`;
        let dataSql = `SELECT adr.id, adr.user_id, adr.full_name, adr.email, adr.reason,
                              adr.status, adr.requested_at, adr.approved_at, adr.rejected_at,
                              adr.completed_at, adr.admin_notes,
                              u.role, u.professional_sub_type, u.organization_name
                       FROM account_deletion_requests adr
                       JOIN users u ON u.id = adr.user_id
                       WHERE 1=1`;
        const params = [];

        if (status) {
            const clause = ' AND adr.status = ?';
            countSql += clause;
            dataSql  += clause;
            params.push(status);
        }
        if (search) {
            const clause = ' AND (adr.full_name LIKE ? OR adr.email LIKE ?)';
            countSql += clause;
            dataSql  += clause;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY adr.requested_at DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/account-deletion/admin/requests/:id ─────────────────────────────
// Admin: single deletion request detail.
export const getDeletionRequestById = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT adr.*, u.role, u.professional_sub_type, u.organization_name,
                    adm.name AS approved_by_name
             FROM account_deletion_requests adr
             JOIN users u ON u.id = adr.user_id
             LEFT JOIN users adm ON adm.id = adr.approved_by
             WHERE adr.id = ?`,
            [req.params.id]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Deletion request not found.' });
        }
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/account-deletion/admin/requests/:id/approve ────────────────────
// Admin: permanently deletes the user's account and all associated data.
export const approveDeletionRequest = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const requestId = parseInt(req.params.id, 10);
        const adminId   = req.user.id;

        // Fetch the request
        const [reqRows] = await conn.query(
            "SELECT * FROM account_deletion_requests WHERE id = ? AND status = 'Pending'",
            [requestId]
        );
        if (!reqRows.length) {
            return res.status(404).json({
                success: false,
                message: 'Deletion request not found or is no longer pending.',
            });
        }
        const deletionReq = reqRows[0];
        const userId = deletionReq.user_id;

        // Fetch user details (needed for emails and role-based logic)
        const [userRows] = await conn.query(
            'SELECT id, name, email, role, photo_url FROM users WHERE id = ?',
            [userId]
        );
        if (!userRows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const user = userRows[0];
        const isLeader = ['council_member', 'founding_member'].includes(user.role);

        await conn.beginTransaction();

        // ── Anonymize or delete community posts ───────────────────────────────
        if (isLeader) {
            // Retrieve or create a dummy user "Former Chapter Lead" to transfer ownership to
            let dummyUserId;
            const [dummyRows] = await conn.query(
                "SELECT id FROM users WHERE email = 'former.lead@riskaicouncil.com'"
            );
            if (dummyRows.length > 0) {
                dummyUserId = dummyRows[0].id;
            } else {
                const [insDummy] = await conn.query(
                    `INSERT INTO users (name, email, password_hash, role, status)
                     VALUES ('Former Chapter Lead', 'former.lead@riskaicouncil.com', 'DUMMY_PASSWORD_HASH', 'council_member', 'approved')`
                );
                dummyUserId = insDummy.insertId;
            }

            // Transfer post authorship to the dummy user
            await conn.query(
                'UPDATE feed_posts SET author_id = ? WHERE author_id = ?',
                [dummyUserId, userId]
            );
            // Transfer comments to the dummy user
            await conn.query(
                'UPDATE feed_comments SET author_id = ? WHERE author_id = ?',
                [dummyUserId, userId]
            );
        } else {
            // Professional member: delete their posts
            await conn.query('DELETE FROM feed_posts WHERE author_id = ?', [userId]);
        }

        // ── Delete all personal data ──────────────────────────────────────────
        // Event registrations
        await conn.query('DELETE FROM event_registrations    WHERE user_id = ?', [userId]);

        // Saves, reactions, likes, poll votes
        await conn.query('DELETE FROM feed_saves       WHERE user_id = ?', [userId]);
        await conn.query('DELETE FROM feed_reactions   WHERE user_id = ?', [userId]);
        await conn.query('DELETE FROM feed_likes       WHERE user_id = ?', [userId]);
        await conn.query('DELETE FROM feed_poll_votes  WHERE user_id = ?', [userId]);

        // Notifications
        await conn.query('DELETE FROM notifications      WHERE target_user_id = ?', [userId]);
        await conn.query('DELETE FROM notification_reads WHERE user_id = ?', [userId]);

        // Membership applications
        await conn.query('DELETE FROM membership_applications WHERE user_id = ?', [userId]);

        // Resource uploads (uploader_id)
        await conn.query('DELETE FROM resources WHERE uploader_id = ?', [userId]);

        // Product review submissions
        await conn.query('DELETE FROM product_user_reviews WHERE user_id = ?', [userId]);

        // Award nomination votes
        await conn.query('DELETE FROM votes WHERE user_id = ?', [userId]);

        // Email verifications
        await conn.query(
            'DELETE FROM email_verifications WHERE email = ?',
            [user.email]
        );

        // ── Mark request as Completed ─────────────────────────────────────────
        await conn.query(
            `UPDATE account_deletion_requests
             SET status       = 'Completed',
                 approved_at  = NOW(),
                 completed_at = NOW(),
                 approved_by  = ?,
                 admin_notes  = ?
             WHERE id = ?`,
            [adminId, req.body.admin_notes?.trim() || null, requestId]
        );

        // ── Delete the user record ────────────────────────────────────────────
        // This cascades via FK to remaining tables with ON DELETE CASCADE.
        await conn.query('DELETE FROM users WHERE id = ?', [userId]);

        await conn.commit();

        // ── Purge profile photo from Azure Blob Storage (fire-and-forget) ─────────────
        if (user.photo_url) {
            try {
                await deleteFromBlob(user.photo_url);
            } catch (blobErr) {
                console.warn('[AccountDeletion] Could not delete profile photo blob:', blobErr.message);
            }
        }

        // ── Send approval email (fire-and-forget) ─────────────────────────────
        sendDeletionApprovedEmail({ name: deletionReq.full_name, email: deletionReq.email });

        return res.json({
            success: true,
            data: { message: 'Account has been permanently deleted and all personal data removed.' },
        });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};

// ─── POST /api/account-deletion/admin/requests/:id/reject ─────────────────────
// Admin: rejects the request and reactivates the user's account.
export const rejectDeletionRequest = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const requestId = parseInt(req.params.id, 10);
        const adminId   = req.user.id;
        const { admin_notes } = req.body;

        if (!admin_notes || !admin_notes.trim()) {
            return res.status(400).json({
                success: false,
                message: 'A rejection reason (admin_notes) is required.',
            });
        }

        const [reqRows] = await conn.query(
            "SELECT * FROM account_deletion_requests WHERE id = ? AND status = 'Pending'",
            [requestId]
        );
        if (!reqRows.length) {
            return res.status(404).json({
                success: false,
                message: 'Deletion request not found or is no longer pending.',
            });
        }
        const deletionReq = reqRows[0];

        await conn.beginTransaction();

        // Reactivate the user account (restore to approved)
        await conn.query(
            "UPDATE users SET status = 'approved' WHERE id = ?",
            [deletionReq.user_id]
        );

        // Update request status to Rejected
        await conn.query(
            `UPDATE account_deletion_requests
             SET status      = 'Rejected',
                 rejected_at = NOW(),
                 approved_by = ?,
                 admin_notes = ?
             WHERE id = ?`,
            [adminId, admin_notes.trim(), requestId]
        );

        await conn.commit();

        // Send rejection email (fire-and-forget)
        sendDeletionRejectedEmail({
            name:   deletionReq.full_name,
            email:  deletionReq.email,
            reason: admin_notes.trim(),
        });

        return res.json({
            success: true,
            data: { message: 'Deletion request rejected. The user account has been reactivated.' },
        });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};