import pool from '../db/connection.js';

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/news  — public: only published items
export const getNews = async (req, res, next) => {
    try {
        // Admin gets all (published + unpublished); public gets only published
        const showAll = req.query.all === 'true';
        
        // Updated filter to include both manual news and approved automated news
        const whereClause = showAll 
            ? '' 
            : 'WHERE (is_published = 1 AND (is_automated = FALSE OR (is_automated = TRUE AND status = \'APPROVED\')))';

        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM news ${whereClause}`);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        const [rows] = await pool.query(
            `SELECT *, 
             COALESCE(published_at, created_at) as sort_date 
             FROM news ${whereClause} 
             ORDER BY sort_date DESC 
             LIMIT ? OFFSET ?`,
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
        const { title, summary, link, image_url, is_published } = req.body;

        const [result] = await pool.query(
            'INSERT INTO news (title, summary, link, image_url, is_published) VALUES (?, ?, ?, ?, ?)',
            [
                title.trim(),
                summary ? summary.trim() : null,
                link ? link.trim() : null,
                image_url ? image_url.trim() : null,
                is_published !== undefined ? Boolean(is_published) : true,
            ]
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
        const { title, summary, link, image_url, is_published } = req.body;

        const [check] = await pool.query('SELECT id FROM news WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'News item not found.' });
        }

        await pool.query(
            'UPDATE news SET title=?, summary=?, link=?, image_url=?, is_published=? WHERE id=?',
            [
                title.trim(),
                summary ? summary.trim() : null,
                link ? link.trim() : null,
                image_url ? image_url.trim() : null,
                is_published !== undefined ? Boolean(is_published) : true,
                req.params.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/news/:id/publish  (admin only) — toggle publish state
export const togglePublishNews = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, is_published FROM news WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'News item not found.' });
        }

        const newState = !rows[0].is_published;
        await pool.query('UPDATE news SET is_published = ? WHERE id = ?', [newState, req.params.id]);

        const [updated] = await pool.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
        return res.json({
            success: true,
            data: updated[0],
            message: newState ? 'News item published.' : 'News item unpublished.',
        });
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
