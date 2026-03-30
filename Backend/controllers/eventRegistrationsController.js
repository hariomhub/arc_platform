/**
 * eventRegistrationsController.js
 * Handles event registration: register, cancel, list my registrations, admin list
 */

import pool from '../db/connection.js';
import { sendEventRegistrationEmail } from '../services/emailService.js';

// ── POST /api/events/:id/register ─────────────────────────────────────────────
export const registerForEvent = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const { name, email, organization, phone, notes, consent_to_share } = req.body;

        if (!name || !email) {
            return res.status(422).json({ success: false, message: 'Name and email are required.' });
        }

        if (!consent_to_share) {
            return res.status(422).json({ success: false, message: 'You must agree to share your personal details to register for this event.' });
        }

        // Check event exists and is upcoming
        const [[event]] = await pool.query(
            'SELECT id, title, is_upcoming FROM events WHERE id = ?',
            [eventId]
        );
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        if (!event.is_upcoming) {
            return res.status(400).json({ success: false, message: 'Registration is only available for upcoming events.' });
        }

        // Check for duplicate registration
        const [[existing]] = await pool.query(
            'SELECT id FROM event_registrations WHERE user_id = ? AND event_id = ?',
            [userId, eventId]
        );
        if (existing) {
            return res.status(409).json({ success: false, message: 'You are already registered for this event.' });
        }

        // Insert registration
        const [result] = await pool.query(
            `INSERT INTO event_registrations (event_id, user_id, name, email, organization, phone, notes, consent_to_share)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [eventId, userId, name, email, organization || null, phone || null, notes || null, consent_to_share]
        );

        // Return the created registration with event info
        const [[registration]] = await pool.query(
            `SELECT r.*, e.title AS event_title, e.date AS event_date, e.location AS event_location,
                    e.event_category
             FROM event_registrations r
             JOIN events e ON e.id = r.event_id
             WHERE r.id = ?`,
            [result.insertId]
        );

        // Fire-and-forget confirmation email — never blocks the API response
        sendEventRegistrationEmail({
            name:           name,
            email:          email,
            organization:   organization || null,
            event:          registration,
            registrationId: registration.id,
        });

        return res.status(201).json({
            success: true,
            message: `Successfully registered for "${event.title}".`,
            data: registration,
        });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/events/my-registrations ─────────────────────────────────────────
export const getMyRegistrations = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT r.id, r.event_id, r.name, r.email, r.organization, r.phone, r.notes,
                    r.registered_at,
                    e.title AS event_title, e.date AS event_date, e.location AS event_location,
                    e.event_category, e.is_upcoming, e.description AS event_description,
                    e.banner_image
             FROM event_registrations r
             JOIN events e ON e.id = r.event_id
             WHERE r.user_id = ?
             ORDER BY e.date ASC`,
            [userId]
        );

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/events/:id/register ──────────────────────────────────────────
export const cancelRegistration = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        const [result] = await pool.query(
            'DELETE FROM event_registrations WHERE user_id = ? AND event_id = ?',
            [userId, eventId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Registration not found.' });
        }

        return res.json({ success: true, message: 'Registration cancelled.' });
    } catch (err) {
        next(err);
    }
};



// ── GET /api/events/:id/registrations (admin) ─────────────────────────────────
export const getEventRegistrations = async (req, res, next) => {
    try {
        const eventId = parseInt(req.params.id, 10);

        const [rows] = await pool.query(
            `SELECT r.*, u.name AS user_name, u.email AS user_email
             FROM event_registrations r
             JOIN users u ON u.id = r.user_id
             WHERE r.event_id = ?
             ORDER BY r.registered_at DESC`,
            [eventId]
        );

        return res.json({ success: true, data: rows, count: rows.length });
    } catch (err) {
        next(err);
    }
};
