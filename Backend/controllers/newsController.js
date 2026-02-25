import pool from '../db/connection.js';

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/news
export const getNews = async (req, res, next) => {
    try {
        const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM news');
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        const [rows] = await pool.query(
            'SELECT * FROM news ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/news/:id
export const getNewsById = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'News item not found.' });
        }
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/news  (admin only)
export const createNews = async (req, res, next) => {
    try {
        const { title, summary, link } = req.body;

        const [result] = await pool.query(
            'INSERT INTO news (title, summary, link) VALUES (?, ?, ?)',
            [title.trim(), summary ? summary.trim() : null, link ? link.trim() : null]
        );

        const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [result.insertId]);
        return res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PUT /api/news/:id  (admin only)
export const updateNews = async (req, res, next) => {
    try {
        const { title, summary, link } = req.body;

        const [check] = await pool.query('SELECT id FROM news WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'News item not found.' });
        }

        await pool.query(
            'UPDATE news SET title=?, summary=?, link=? WHERE id=?',
            [title.trim(), summary ? summary.trim() : null, link ? link.trim() : null, req.params.id]
        );

        const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/news/:id  (admin only)
export const deleteNews = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id FROM news WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'News item not found.' });
        }

        await pool.query('DELETE FROM news WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'News item deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};
