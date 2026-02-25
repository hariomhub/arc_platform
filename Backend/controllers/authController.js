import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/register
export const register = async (req, res, next) => {
    try {
        const { name, email, password, role, organization_name, linkedin_url } = req.body;

        // Only allow self-registration for non-privileged roles
        const allowedSelfRoles = ['free_member', 'paid_member', 'university', 'product_company'];
        const assignedRole = allowedSelfRoles.includes(role) ? role : 'free_member';

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email address is already registered.' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status, organization_name, linkedin_url)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
            [name.trim(), email.trim().toLowerCase(), password_hash, assignedRole, organization_name || null, linkedin_url || null]
        );

        return res.status(201).json({
            success: true,
            data: {
                message: 'Registration successful. Your account is pending admin approval.',
                userId: result.insertId,
            },
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
            'SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ success: false, message: 'Your account application has been rejected.' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('arc_token', token, COOKIE_OPTIONS);

        return res.json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
            },
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/logout
export const logout = (req, res) => {
    res.clearCookie('arc_token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    return res.json({ success: true, data: { message: 'Logged out successfully.' } });
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, role, status, bio, photo_url, linkedin_url, organization_name, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};
