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

        // 1. Insert Deleted deletion request for auditing/tracking before user deletion
        await conn.query(
            `INSERT INTO account_deletion_requests (user_id, full_name, email, reason, status, requested_at, approved_at, completed_at, approved_by, admin_notes)
             VALUES (?, ?, ?, ?, 'Deleted', NOW(), NOW(), NOW(), NULL, 'Immediate account deletion request completed by user.')`,
            [userId, full_name.trim(), email.trim().toLowerCase(), reason?.trim() || null]
        );

        // 2. Perform exact deletion and retention/anonymization logic
        const isLeader = ['council_member', 'founding_member'].includes(user.role);

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

        // Push tokens
        await conn.query('DELETE FROM push_tokens WHERE user_id = ?', [userId]);

        // Feed like digest log
        await conn.query('DELETE FROM feed_like_digest_log WHERE author_id = ?', [userId]);

        // Resource reviews
        await conn.query('DELETE FROM resource_reviews WHERE user_id = ?', [userId]);

        // Nominees
        await conn.query('UPDATE nominees SET submitted_by_user_id = NULL WHERE submitted_by_user_id = ?', [userId]);

        // Clean up framework created_by/updated_by references
        await conn.query('UPDATE framework_audit_templates SET created_by = NULL WHERE created_by = ?', [userId]);
        await conn.query('UPDATE framework_audit_templates SET updated_by = NULL WHERE updated_by = ?', [userId]);
        await conn.query('UPDATE framework_implementation_phases SET created_by = NULL WHERE created_by = ?', [userId]);
        await conn.query('UPDATE framework_implementation_phases SET updated_by = NULL WHERE updated_by = ?', [userId]);
        await conn.query('UPDATE framework_implementation_steps SET created_by = NULL WHERE created_by = ?', [userId]);
        await conn.query('UPDATE framework_implementation_steps SET updated_by = NULL WHERE updated_by = ?', [userId]);
        await conn.query('UPDATE framework_maturity_levels SET created_by = NULL WHERE created_by = ?', [userId]);
        await conn.query('UPDATE framework_maturity_levels SET updated_by = NULL WHERE updated_by = ?', [userId]);
        await conn.query('UPDATE framework_pillars SET created_by = NULL WHERE created_by = ?', [userId]);
        await conn.query('UPDATE framework_pillars SET updated_by = NULL WHERE updated_by = ?', [userId]);
        await conn.query('UPDATE framework_security_tools SET created_by = NULL WHERE created_by = ?', [userId]);
        await conn.query('UPDATE framework_security_tools SET updated_by = NULL WHERE updated_by = ?', [userId]);

        // Email verifications
        await conn.query(
            'DELETE FROM email_verifications WHERE email = ?',
            [user.email]
        );

        // ── Delete the user record ────────────────────────────────────────────
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
