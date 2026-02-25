import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';


const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/admin/users
export const getUsers = async (req, res, next) => {
    try {
        const { role, status } = req.query;

        let countSql = 'SELECT COUNT(*) AS total FROM users WHERE 1=1';
        let dataSql = 'SELECT id, name, email, role, status, organization_name, linkedin_url, created_at FROM users WHERE 1=1';
        const params = [];

        if (role) {
            const clause = ' AND role = ?';
            countSql += clause;
            dataSql += clause;
            params.push(role);
        }

        if (status) {
            const clause = ' AND status = ?';
            countSql += clause;
            dataSql += clause;
            params.push(status);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/pending-users
export const getPendingUsers = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, role, status, organization_name, linkedin_url, created_at
       FROM users WHERE status = 'pending' ORDER BY created_at ASC`
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/approve
export const approveUser = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        await pool.query("UPDATE users SET status = 'approved' WHERE id = ?", [req.params.id]);
        return res.json({ success: true, message: 'User approved.' });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/reject
export const rejectUser = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        await pool.query("UPDATE users SET status = 'rejected' WHERE id = ?", [req.params.id]);
        return res.json({ success: true, message: 'User rejected.' });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/status  (approve / reject)
export const updateUserStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (parseInt(req.params.id, 10) === req.user.id) {
            return res.status(403).json({ success: false, message: 'You cannot change your own status.' });
        }

        const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        return res.json({ success: true, data: { message: `User status updated to "${status}".` } });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/role
export const updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (parseInt(req.params.id, 10) === req.user.id) {
            return res.status(403).json({ success: false, message: 'You cannot change your own role.' });
        }

        const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        return res.json({ success: true, data: { message: `User role updated to "${role}".` } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
    try {
        if (parseInt(req.params.id, 10) === req.user.id) {
            return res.status(403).json({ success: false, message: 'You cannot delete your own account.' });
        }

        const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'User deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};

// POST /api/admin/users  (create user directly — admin can set any role + approve immediately)
export const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role, status, organization_name, linkedin_url } = req.body;

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email is already registered.' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status, organization_name, linkedin_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                email.trim().toLowerCase(),
                password_hash,
                role || 'free_member',
                status || 'approved',
                organization_name || null,
                linkedin_url || null,
            ]
        );

        const [rows] = await pool.query(
            'SELECT id, name, email, role, status, organization_name, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        return res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/stats  (dashboard counts)
export const getStats = async (req, res, next) => {
    try {
        const [[{ total_users }]] = await pool.query('SELECT COUNT(*) AS total_users FROM users');
        const [[{ pending_users }]] = await pool.query('SELECT COUNT(*) AS pending_users FROM users WHERE status = "pending"');
        const [[{ total_resources }]] = await pool.query('SELECT COUNT(*) AS total_resources FROM resources');
        const [[{ total_events }]] = await pool.query('SELECT COUNT(*) AS total_events FROM events');
        const [[{ total_qna }]] = await pool.query('SELECT COUNT(*) AS total_qna FROM qna_posts');

        return res.json({
            success: true,
            data: { total_users, pending_users, total_resources, total_events, total_qna },
        });
    } catch (err) {
        next(err);
    }
};
