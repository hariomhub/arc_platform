import pool from '../db/connection.js';

// Helper: build pagination meta and LIMIT/OFFSET
const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/events
export const getEvents = async (req, res, next) => {
    try {
        const { category, upcoming } = req.query;

        let countSql = 'SELECT COUNT(*) AS total FROM events WHERE 1=1';
        let dataSql = 'SELECT * FROM events WHERE 1=1';
        const params = [];

        if (category) {
            const clause = ' AND event_category = ?';
            countSql += clause;
            dataSql += clause;
            params.push(category);
        }

        if (upcoming !== undefined) {
            const clause = ' AND is_upcoming = ?';
            countSql += clause;
            dataSql += clause;
            params.push(upcoming === 'true' || upcoming === '1' ? 1 : 0);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        return res.json({
            success: true,
            data: rows,
            total,
            page,
            limit,
            totalPages,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/events/:id
export const getEventById = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/events  (admin only)
export const createEvent = async (req, res, next) => {
    try {
        const { title, date, location, description, link, event_category, is_upcoming, recording_url } = req.body;

        const [result] = await pool.query(
            `INSERT INTO events (title, date, location, description, link, event_category, is_upcoming, recording_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                date,
                location ? location.trim() : null,
                description ? description.trim() : null,
                link ? link.trim() : null,
                event_category,
                is_upcoming !== undefined ? Boolean(is_upcoming) : true,
                recording_url ? recording_url.trim() : null,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
        return res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PUT /api/events/:id  (admin only)
export const updateEvent = async (req, res, next) => {
    try {
        const { title, date, location, description, link, event_category, is_upcoming, recording_url } = req.body;

        const [check] = await pool.query('SELECT id FROM events WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        await pool.query(
            `UPDATE events SET title=?, date=?, location=?, description=?, link=?, event_category=?, is_upcoming=?, recording_url=?
       WHERE id=?`,
            [
                title.trim(),
                date,
                location ? location.trim() : null,
                description ? description.trim() : null,
                link ? link.trim() : null,
                event_category,
                Boolean(is_upcoming),
                recording_url ? recording_url.trim() : null,
                req.params.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/events/:id  (admin only)
export const deleteEvent = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id FROM events WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Event deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};
