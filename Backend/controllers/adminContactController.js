/**
 * adminContactController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin side of the Contact form (founding members only — enforced in
 * routes/adminContact.js).
 *
 *  GET   /api/admin/contact-messages              list + filter + search + counts
 *  GET   /api/admin/contact-messages/:id          one message with its replies
 *  POST  /api/admin/contact-messages/:id/reply    reply (saved, emailed, shown on
 *                                                 the sender's dashboard)
 *  PATCH /api/admin/contact-messages/:id/status   mark handled / reopen
 *  GET   /api/admin/contact-messages/email-health can the server send email?
 *  POST  /api/admin/contact-messages/email-test   send a test email to myself
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { sendContactReplyEmail, getEmailHealth, sendTestEmail } from '../services/emailService.js';
import { notifyUser, NOTIF_TYPES } from '../services/notificationService.js';

const FILTERS = ['new', 'handled', 'undelivered'];

// Escape LIKE wildcards so a search for "100%" or "a_b" matches literally.
const likeEscape = (s) => s.replace(/[\\%_]/g, '\\$&');

// The platform account a message belongs to, if any: the account it was sent
// from, else the (verified) account that owns the sender's email address.
const findAccountForMessage = async (msg) => {
    if (msg.user_id) {
        const [[u]] = await pool.query('SELECT id, name FROM users WHERE id = ?', [msg.user_id]);
        if (u) return u;
    }
    const [[u]] = await pool.query(
        `SELECT id, name FROM users WHERE email = ? AND status = 'approved' LIMIT 1`,
        [msg.email]
    );
    return u || null;
};

// ─── GET /contact-messages ────────────────────────────────────────────────────
export const listMessages = async (req, res, next) => {
    try {
        const status = FILTERS.includes(req.query.status) ? req.query.status : 'all';
        const q      = String(req.query.q || '').trim().slice(0, 100);
        const limit  = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
        const page   = Math.max(parseInt(req.query.page, 10) || 1, 1);

        const where  = [];
        const params = [];
        if (status === 'new')         where.push(`m.status = 'new'`);
        if (status === 'handled')     where.push(`m.status = 'handled'`);
        if (status === 'undelivered') where.push(`m.admin_notified = 0`);
        if (q) {
            const like = `%${likeEscape(q)}%`;
            where.push(`(m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.organization LIKE ? OR m.message LIKE ?)`);
            params.push(like, like, like, like, like);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM contact_messages m ${whereSql}`, params
        );
        const [rows] = await pool.query(
            `SELECT m.id, m.user_id, m.first_name, m.last_name, m.email, m.organization,
                    m.inquiry_type, LEFT(m.message, 160) AS preview, m.status,
                    m.admin_notified, m.created_at,
                    (SELECT COUNT(*) FROM contact_replies r WHERE r.message_id = m.id) AS reply_count
               FROM contact_messages m
               ${whereSql}
              ORDER BY m.created_at DESC, m.id DESC
              LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        // Tab-level counts ignore the active filter/search so the chips stay stable.
        const [[c]] = await pool.query(
            `SELECT COUNT(*)                          AS total,
                    COALESCE(SUM(status = 'new'), 0)     AS new_count,
                    COALESCE(SUM(status = 'handled'), 0) AS handled_count,
                    COALESCE(SUM(admin_notified = 0), 0) AS undelivered_count
               FROM contact_messages`
        );

        res.json({
            success: true,
            data: rows.map((r) => ({ ...r, admin_notified: !!r.admin_notified, reply_count: Number(r.reply_count) })),
            pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
            counts: {
                all: Number(c.total), new: Number(c.new_count),
                handled: Number(c.handled_count), undelivered: Number(c.undelivered_count),
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /contact-messages/:id ────────────────────────────────────────────────
export const getMessage = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const [[msg]] = await pool.query(
            `SELECT id, user_id, first_name, last_name, email, organization, inquiry_type, message,
                    status, admin_notified, user_confirmed, handled_at, created_at
               FROM contact_messages WHERE id = ?`,
            [id]
        );
        if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });

        const [replies] = await pool.query(
            `SELECT id, admin_name, body, email_sent, read_at, created_at
               FROM contact_replies WHERE message_id = ? ORDER BY created_at ASC, id ASC`,
            [id]
        );
        const account = await findAccountForMessage({ ...msg });

        res.json({
            success: true,
            data: {
                ...msg,
                admin_notified: !!msg.admin_notified,
                user_confirmed: !!msg.user_confirmed,
                replies: replies.map((r) => ({ ...r, email_sent: !!r.email_sent })),
                account: account ? { id: account.id, name: account.name } : null,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── POST /contact-messages/:id/reply ─────────────────────────────────────────
// Order: save the reply → mark handled → email → notify. The reply is saved
// before anything can fail, so an account holder always sees it on their
// dashboard; the admin is told honestly if the email could not be delivered.
export const replyToMessage = async (req, res, next) => {
    try {
        const id        = parseInt(req.params.id, 10);
        const replyBody = req.body.body;

        const [[msg]] = await pool.query(
            `SELECT id, user_id, first_name, email, inquiry_type, message FROM contact_messages WHERE id = ?`,
            [id]
        );
        if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });

        const adminName = req.user.name || 'Admin';
        const [ins] = await pool.query(
            `INSERT INTO contact_replies (message_id, admin_id, admin_name, body) VALUES (?, ?, ?, ?)`,
            [id, req.user.id, adminName, replyBody]
        );
        const replyId = ins.insertId;

        await pool.query(
            `UPDATE contact_messages SET status = 'handled', handled_at = NOW(), handled_by = ? WHERE id = ?`,
            [req.user.id, id]
        );

        const account = await findAccountForMessage(msg);

        const emailed = await sendContactReplyEmail({
            firstName: msg.first_name, email: msg.email, inquiry: msg.inquiry_type,
            originalMessage: msg.message, replyBody, hasAccount: !!account,
        });
        if (emailed) {
            await pool.query('UPDATE contact_replies SET email_sent = 1 WHERE id = ?', [replyId])
                .catch((err) => console.error(`[Contact] Could not set email_sent for reply #${replyId}:`, err.message));
        } else {
            console.error(`[Contact] Reply #${replyId} to message #${id} saved but NOT emailed to ${msg.email}`);
        }

        if (account) {
            // notifyUser handles its own errors; never let it affect the response.
            notifyUser(
                account.id, NOTIF_TYPES.CONTACT_REPLY,
                'Reply to your message',
                `Our team replied to your "${msg.inquiry_type}" message.`,
                { url: '/user/dashboard#messages' }
            );
        }

        let message;
        if (emailed) {
            message = account ? 'Reply sent by email and added to their dashboard.' : 'Reply sent by email.';
        } else if (account) {
            message = 'Reply saved and visible on their dashboard, but the email could not be delivered.';
        } else {
            message = 'Reply saved, but the email could not be delivered and this sender has no account. Please email them directly.';
        }

        res.status(201).json({
            success: true,
            message,
            data: {
                emailed,
                has_account: !!account,
                reply: {
                    id: replyId, admin_name: adminName, body: replyBody,
                    email_sent: emailed, read_at: null, created_at: new Date().toISOString(),
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /contact-messages/:id/status ───────────────────────────────────────
export const setStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const [result] = req.body.status === 'handled'
            ? await pool.query(
                `UPDATE contact_messages SET status = 'handled', handled_at = NOW(), handled_by = ? WHERE id = ?`,
                [req.user.id, id])
            : await pool.query(
                `UPDATE contact_messages SET status = 'new', handled_at = NULL, handled_by = NULL WHERE id = ?`,
                [id]);

        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Message not found.' });
        res.json({ success: true, data: { id, status: req.body.status } });
    } catch (err) {
        next(err);
    }
};

// ─── GET /contact-messages/email-health ───────────────────────────────────────
export const emailHealth = async (req, res, next) => {
    try {
        res.json({ success: true, data: await getEmailHealth() });
    } catch (err) {
        next(err);
    }
};

// ─── POST /contact-messages/email-test ────────────────────────────────────────
// Sends to the logged-in admin's own address only — never to an arbitrary one.
export const emailTest = async (req, res, next) => {
    try {
        const to = req.user.email;
        const result = await sendTestEmail(to);
        if (!result.ok) return res.status(502).json({ success: false, message: result.error });
        res.json({ success: true, message: `Test email sent to ${to}. Check your inbox (and spam folder).`, data: { to } });
    } catch (err) {
        next(err);
    }
};
