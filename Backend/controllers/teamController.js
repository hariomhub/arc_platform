import pool from '../db/connection.js';

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/team
export const getTeam = async (req, res, next) => {
    try {
        const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM team_members');
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        const [rows] = await pool.query(
            'SELECT * FROM team_members ORDER BY id ASC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/team/:id
export const getTeamMemberById = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM team_members WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Team member not found.' });
        }
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/team  (admin only)
export const createTeamMember = async (req, res, next) => {
    try {
        const { name, role, bio, linkedin_url } = req.body;
        const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

        const [result] = await pool.query(
            'INSERT INTO team_members (name, role, bio, linkedin_url, photo_url) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), role.trim(), bio ? bio.trim() : null, linkedin_url ? linkedin_url.trim() : null, photo_url]
        );

        const [rows] = await pool.query('SELECT * FROM team_members WHERE id = ?', [result.insertId]);
        return res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PUT /api/team/:id  (admin only)
export const updateTeamMember = async (req, res, next) => {
    try {
        const { name, role, bio, linkedin_url } = req.body;

        const [check] = await pool.query('SELECT id, photo_url FROM team_members WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Team member not found.' });
        }

        const photo_url = req.file ? `/uploads/${req.file.filename}` : check[0].photo_url;

        await pool.query(
            'UPDATE team_members SET name=?, role=?, bio=?, linkedin_url=?, photo_url=? WHERE id=?',
            [name.trim(), role.trim(), bio ? bio.trim() : null, linkedin_url ? linkedin_url.trim() : null, photo_url, req.params.id]
        );

        const [rows] = await pool.query('SELECT * FROM team_members WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/team/:id  (admin only)
export const deleteTeamMember = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id FROM team_members WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Team member not found.' });
        }

        await pool.query('DELETE FROM team_members WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Team member deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};
