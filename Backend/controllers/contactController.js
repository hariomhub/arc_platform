/**
 * contactController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Public Contact form + the sender's own view of their conversations.
 *
 *  POST /api/contact                — validated + rate-limited + reCAPTCHA-checked
 *                                     in routes/contact.js before it gets here.
 *  GET  /api/contact/mine           — (login) my messages and the replies to them
 *  POST /api/contact/mine/:id/read  — (login) mark the replies on one message read
 *
 * Delivery order (designed so a message is never silently lost):
 *   1. Save the message to `contact_messages`.
 *   2. Email the team and AWAIT the result — the visitor is told the truth if
 *      the team could not be notified, instead of a false "Message sent!".
 *   3. After responding, email the visitor a confirmation in the background.
 *      That one is a courtesy, so it never delays or fails the request.
 *
 * If step 1 fails (DB down) but the email still goes out, the visitor is
 * served — the team has the message. Only when the team could not be reached
 * by either route does the visitor get an error.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    sendContactInquiryAdminEmail,
    sendContactConfirmationEmail,
} from '../services/emailService.js';

const DELIVERY_FAILED_MESSAGE =
    "We couldn't send your message right now. Please try again in a few minutes, " +
    'or email us directly at support@riskaicouncil.org.';

const markDelivered = (column, id) =>
    pool.query(`UPDATE contact_messages SET ${column} = 1 WHERE id = ?`, [id])
        .catch((err) => console.error(`[Contact] Could not set ${column} for message #${id}:`, err.message));

// ─── POST /api/contact ────────────────────────────────────────────────────────
export const submitContactMessage = async (req, res, next) => {
    try {
        const { firstName, lastName, email, organization, inquiry, message } = req.body;

        // 1 ─ Persist first.
        let messageId = null;
        try {
            const [result] = await pool.query(
                `INSERT INTO contact_messages
                    (user_id, first_name, last_name, email, organization, inquiry_type, message, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                // req.user is set by optionalAuth: present only if the sender was logged in.
                [req.user?.id || null, firstName, lastName || null, email, organization || null, inquiry, message, req.ip || null]
            );
            messageId = result.insertId;
        } catch (err) {
            // Not fatal on its own — the email below is the primary channel.
            console.error('[Contact] Failed to save message:', err.message);
        }

        // 2 ─ Tell the team, and know whether it worked.
        const teamNotified = await sendContactInquiryAdminEmail({
            id: messageId, firstName, lastName, email, organization, inquiry, message,
        });

        if (!teamNotified) {
            console.error(`[Contact] Team not notified for message ${messageId ? `#${messageId}` : '(unsaved)'} from ${email}`);
            return res.status(503).json({ success: false, message: DELIVERY_FAILED_MESSAGE });
        }
        if (messageId) markDelivered('admin_notified', messageId);

        res.status(201).json({
            success: true,
            message: "Thank you! Your message has been sent. We'll get back to you within 1–2 business days.",
        });

        // 3 ─ Courtesy confirmation to the visitor (after the response is sent).
        sendContactConfirmationEmail({ id: messageId, firstName, email, inquiry, message })
            .then((sent) => { if (sent && messageId) markDelivered('user_confirmed', messageId); })
            .catch((err) => console.error('[Contact] Confirmation email error:', err.message));
    } catch (err) {
        next(err);
    }
};

// ─── Sender's own view ────────────────────────────────────────────────────────
// A logged-in user sees a message if they were logged in when they sent it
// (user_id) OR it was sent from the address on their account (covers messages
// written while logged out). Account emails are OTP-verified at registration.

const getAccountEmail = async (userId) => {
    const [[row]] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
    return row ? String(row.email).toLowerCase() : null;
};

// ─── GET /api/contact/mine ────────────────────────────────────────────────────
export const getMyMessages = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const email  = await getAccountEmail(userId);

        const [messages] = await pool.query(
            `SELECT id, inquiry_type, message, status, created_at
               FROM contact_messages
              WHERE user_id = ? OR email = ?
              ORDER BY created_at DESC, id DESC
              LIMIT 50`,
            [userId, email]
        );

        let replies = [];
        if (messages.length) {
            [replies] = await pool.query(
                `SELECT id, message_id, body, created_at, read_at
                   FROM contact_replies
                  WHERE message_id IN (?)
                  ORDER BY created_at ASC, id ASC`,
                [messages.map((m) => m.id)]
            );
        }

        // Replies are signed by the team, never by an individual admin.
        const byMessage = new Map();
        for (const r of replies) {
            if (!byMessage.has(r.message_id)) byMessage.set(r.message_id, []);
            byMessage.get(r.message_id).push({
                id: r.id, body: r.body, created_at: r.created_at, is_read: !!r.read_at,
            });
        }

        res.json({
            success: true,
            data: {
                unread: replies.filter((r) => !r.read_at).length,
                messages: messages.map((m) => ({ ...m, replies: byMessage.get(m.id) || [] })),
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/contact/mine/:id/read ──────────────────────────────────────────
export const markMyMessageRead = async (req, res, next) => {
    try {
        const email = await getAccountEmail(req.user.id);
        const [result] = await pool.query(
            `UPDATE contact_replies r
               JOIN contact_messages m ON m.id = r.message_id
                SET r.read_at = NOW()
              WHERE r.message_id = ? AND r.read_at IS NULL
                AND (m.user_id = ? OR m.email = ?)`,
            [parseInt(req.params.id, 10), req.user.id, email]
        );
        res.json({ success: true, data: { marked: result.affectedRows } });
    } catch (err) {
        next(err);
    }
};
