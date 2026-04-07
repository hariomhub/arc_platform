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
        const showAll = req.query.all === 'true';

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

// POST /api/news  (founding_member or council_member)
export const createNews = async (req, res, next) => {
    try {
        const { title, summary, link, image_url, is_published } = req.body;
        const isCouncilMember = req.user.role === 'council_member';

        // council_member always creates as draft
        const publishedValue = isCouncilMember ? false : (is_published !== undefined ? Boolean(is_published) : true);

        const [result] = await pool.query(
            'INSERT INTO news (title, summary, link, image_url, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [
                title.trim(),
                summary ? summary.trim() : null,
                link ? link.trim() : null,
                image_url ? image_url.trim() : null,
                publishedValue,
                req.user.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [result.insertId]);
        return res.status(201).json({
            success: true,
            data: rows[0],
            message: isCouncilMember ? 'News item submitted for admin review. It will appear publicly once published by an admin.' : undefined,
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/news/:id  (founding_member or council_member — council_member owns only)
export const updateNews = async (req, res, next) => {
    try {
        const { title, summary, link, image_url, is_published } = req.body;

        const [check] = await pool.query('SELECT id, created_by, is_published FROM news WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'News item not found.' });
        }

        // council_member may only edit news they created
        if (req.user.role === 'council_member' && check[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only edit news items you created.' });
        }

        // council_member cannot change is_published — keep existing value
        const publishedValue = req.user.role === 'council_member'
            ? check[0].is_published
            : (is_published !== undefined ? Boolean(is_published) : true);

        await pool.query(
            'UPDATE news SET title=?, summary=?, link=?, image_url=?, is_published=? WHERE id=?',
            [
                title.trim(),
                summary ? summary.trim() : null,
                link ? link.trim() : null,
                image_url ? image_url.trim() : null,
                publishedValue,
                req.params.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/news/:id/publish  (founding_member ONLY) — toggle publish state
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

// DELETE /api/news/:id  (founding_member or council_member — council_member owns only)
export const deleteNews = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, created_by FROM news WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'News item not found.' });
        }

        // Ownership check for council_member
        if (req.user.role === 'council_member' && check[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete news items you created.' });
        }

        await pool.query('DELETE FROM news WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'News item deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};
