/**
 * contactController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Public Contact form.
 *
 *  POST /api/contact — validated + rate-limited + reCAPTCHA-checked in
 *                      routes/contact.js before it gets here.
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
                    (first_name, last_name, email, organization, inquiry_type, message, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [firstName, lastName || null, email, organization || null, inquiry, message, req.ip || null]
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
