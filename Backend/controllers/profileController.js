import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';

// GET /api/profile
export const getProfile = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, role, status, bio, photo_url, linkedin_url, organization_name, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PUT /api/profile
export const updateProfile = async (req, res, next) => {
    try {
        const { name, bio, linkedin_url, organization_name } = req.body;
        const photo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

        const [current] = await pool.query('SELECT photo_url FROM users WHERE id = ?', [req.user.id]);
        if (current.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const finalPhotoUrl = photo_url !== undefined ? photo_url : current[0].photo_url;

        await pool.query(
            'UPDATE users SET name=?, bio=?, linkedin_url=?, organization_name=?, photo_url=? WHERE id=?',
            [
                name.trim(),
                bio ? bio.trim() : null,
                linkedin_url ? linkedin_url.trim() : null,
                organization_name ? organization_name.trim() : null,
                finalPhotoUrl,
                req.user.id,
            ]
        );

        const [rows] = await pool.query(
            'SELECT id, name, email, role, status, bio, photo_url, linkedin_url, organization_name, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PUT /api/profile/password
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

        return res.json({ success: true, data: { message: 'Password changed successfully.' } });
    } catch (err) {
        next(err);
    }
};

// GET /api/profile/my-resources
export const getMyResources = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.id, r.title, r.description, r.abstract, r.demo_url, r.type, r.created_at
             FROM resources r
             WHERE r.uploader_id = ?
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/profile/resources/:id  — only if uploader_id matches
export const deleteMyResource = async (req, res, next) => {
    try {
        const [check] = await pool.query(
            'SELECT id, uploader_id FROM resources WHERE id = ?',
            [req.params.id]
        );
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }
        if (check[0].uploader_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete your own resources.' });
        }
        await pool.query('DELETE FROM resources WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Resource deleted.' } });
    } catch (err) {
        next(err);
    }
};
