import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import { sendAccountApprovedEmail, sendMembershipApplicationStatusEmail } from '../services/emailService.js';


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
        const { role, status, search } = req.query;

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

        if (search) {
            const clause = ' AND (name LIKE ? OR email LIKE ?)';
            countSql += clause;
            dataSql += clause;
            params.push(`%${search}%`, `%${search}%`);
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
        const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const { role } = rows[0];
        // Set membership_expires_at based on role
        const expiresAt = role === 'founding_member' ? new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000) // 5 years
            : role === 'executive' ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000) // 3 years
            : new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000); // 1 year

        await pool.query(
            "UPDATE users SET status = 'approved', membership_expires_at = ? WHERE id = ?",
            [expiresAt, req.params.id]
        );

        // Notify the user their account is now active
        sendAccountApprovedEmail({ name: rows[0].name, email: rows[0].email, role: rows[0].role });

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

        const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);

        // When approving, also set membership_expires_at based on role
        if (status === 'approved') {
            const expiresAt = rows[0].role === 'founding_member' ? new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
                : rows[0].role === 'executive' ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000);
            await pool.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [expiresAt, req.params.id]);
            sendAccountApprovedEmail({ name: rows[0].name, email: rows[0].email, role: rows[0].role });
        }

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

        const [check] = await pool.query('SELECT id, status FROM users WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Recalculate membership_expires_at when role changes (only for approved users)
        const expiresAt = check[0].status === 'approved'
            ? (role === 'founding_member' ? new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
                : role === 'executive' ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000))
            : null;

        await pool.query('UPDATE users SET role = ?, membership_expires_at = ? WHERE id = ?', [role, expiresAt, req.params.id]);
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

        const assignedRole   = role   || 'professional';
        const assignedStatus = status || 'approved';

        // Compute membership expiry for approved users
        const expiresAt = assignedStatus === 'approved'
            ? (assignedRole === 'founding_member' ? new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
                : assignedRole === 'executive' ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000))
            : null;

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, status, membership_expires_at, organization_name, linkedin_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                email.trim().toLowerCase(),
                password_hash,
                assignedRole,
                assignedStatus,
                expiresAt,
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
        const [[{ pending_applications }]] = await pool.query(
            'SELECT COUNT(*) AS pending_applications FROM membership_applications WHERE status = "pending"'
        );

        return res.json({
            success: true,
            data: { total_users, pending_users, total_resources, total_events, total_qna, pending_applications },
        });
    } catch (err) {
        next(err);
    }
};

// ─── Membership Applications ──────────────────────────────────────────────────

// GET /api/admin/membership-applications
export const getMembershipApplications = async (req, res, next) => {
    try {
        const { status, role } = req.query;
        let countSql = `SELECT COUNT(*) AS total FROM membership_applications ma JOIN users u ON u.id = ma.user_id WHERE 1=1`;
        let dataSql = `
            SELECT ma.*, u.name AS current_name, u.role AS current_role, u.status AS account_status
            FROM membership_applications ma
            JOIN users u ON u.id = ma.user_id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) { 
            const clause = ' AND ma.status = ?'; 
            countSql += clause; dataSql += clause; 
            params.push(status); 
        }
        if (role) { 
            const clause = ' AND ma.requested_role = ?'; 
            countSql += clause; dataSql += clause; 
            params.push(role); 
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY ma.created_at DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);
        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/membership-applications/:id/approve
export const approveMembershipApplication = async (req, res, next) => {
    try {
        const [[app]] = await pool.query(
            `SELECT ma.*, u.name, u.email FROM membership_applications ma
             JOIN users u ON u.id = ma.user_id
             WHERE ma.id = ?`,
            [req.params.id]
        );
        if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
        if (app.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'Application has already been processed.' });
        }

        const requestedRole = app.requested_role;
        const expiresAt = requestedRole === 'founding_member' ? new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
            : requestedRole === 'executive' ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000);

        // Upgrade the user's role
        await pool.query(
            `UPDATE users SET role = ?, membership_expires_at = ? WHERE id = ?`,
            [requestedRole, expiresAt, app.user_id]
        );

        // Mark application approved
        await pool.query(
            `UPDATE membership_applications SET status = 'approved', processed_at = NOW(), admin_notes = ?
             WHERE id = ?`,
            [req.body.admin_notes || null, req.params.id]
        );

        // Notify the user
        sendMembershipApplicationStatusEmail({
            name:          app.name,
            email:         app.email,
            requestedRole: requestedRole,
            status:        'approved',
        });

        return res.json({ success: true, message: 'Application approved. User role updated.' });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/membership-applications/:id/reject
export const rejectMembershipApplication = async (req, res, next) => {
    try {
        const [[app]] = await pool.query(
            `SELECT ma.*, u.name, u.email FROM membership_applications ma
             JOIN users u ON u.id = ma.user_id
             WHERE ma.id = ?`,
            [req.params.id]
        );
        if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
        if (app.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'Application has already been processed.' });
        }

        await pool.query(
            `UPDATE membership_applications SET status = 'rejected', processed_at = NOW(), admin_notes = ?
             WHERE id = ?`,
            [req.body.admin_notes || null, req.params.id]
        );

        // Notify the user
        sendMembershipApplicationStatusEmail({
            name:          app.name,
            email:         app.email,
            requestedRole: app.requested_role,
            status:        'rejected',
            adminNotes:    req.body.admin_notes || null,
        });

        return res.json({ success: true, message: 'Application rejected.' });
    } catch (err) {
        next(err);
    }
};
