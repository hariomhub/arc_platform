/**
 * waitlistController.js
 * Handles membership waitlist — payment-gateway-ready structure.
 * Future: swap POST response to redirect to Stripe/Razorpay checkout.
 */

import pool from '../db/connection.js';

// POST /api/waitlist  (public)
export const joinWaitlist = async (req, res, next) => {
    try {
        const { email, name, tier } = req.body;

        const validTiers = ['basic', 'professional', 'enterprise'];
        const assignedTier = validTiers.includes(tier) ? tier : 'basic';

        // Upsert — if already on waitlist, update tier + name
        const [existing] = await pool.query(
            'SELECT id FROM waitlist WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (existing.length > 0) {
            await pool.query(
                'UPDATE waitlist SET name = ?, tier = ? WHERE email = ?',
                [name ? name.trim() : null, assignedTier, email.trim().toLowerCase()]
            );
            return res.json({
                success: true,
                data: { message: "You're already on the waitlist! We've updated your preferences." },
            });
        }

        await pool.query(
            'INSERT INTO waitlist (email, name, tier) VALUES (?, ?, ?)',
            [email.trim().toLowerCase(), name ? name.trim() : null, assignedTier]
        );

        return res.status(201).json({
            success: true,
            data: {
                message: "You've been added to the waitlist! We'll notify you when we launch.",
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/waitlist  (admin only)
export const getWaitlist = async (req, res, next) => {
    try {
        const { tier, status } = req.query;

        let sql = 'SELECT * FROM waitlist WHERE 1=1';
        const params = [];

        if (tier) {
            sql += ' AND tier = ?';
            params.push(tier);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(sql, params);

        const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM waitlist');

        return res.json({ success: true, data: rows, total });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/waitlist/:id/status  (admin only)
export const updateWaitlistStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'contacted', 'converted'];
        if (!validStatuses.includes(status)) {
            return res.status(422).json({ success: false, message: 'Invalid status.' });
        }

        const [check] = await pool.query('SELECT id FROM waitlist WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Waitlist entry not found.' });
        }

        await pool.query('UPDATE waitlist SET status = ? WHERE id = ?', [status, req.params.id]);
        return res.json({ success: true, data: { message: `Status updated to "${status}".` } });
    } catch (err) {
        next(err);
    }
};
