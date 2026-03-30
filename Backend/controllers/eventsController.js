import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob } from '../services/azureBlobService.js';

// Helper: build pagination meta and LIMIT/OFFSET
const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/events  — public: only published; admin passes ?all=true for all
export const getEvents = async (req, res, next) => {
    try {
        const { category, upcoming, tab } = req.query;
        const showAll = req.query.all === 'true';

        let countSql = `SELECT COUNT(*) AS total FROM events WHERE ${showAll ? '1=1' : 'is_published = 1'}`;
        let dataSql = `SELECT * FROM events WHERE ${showAll ? '1=1' : 'is_published = 1'}`;
        const params = [];

        if (category) {
            const clause = ' AND event_category = ?';
            countSql += clause;
            dataSql += clause;
            params.push(category);
        }

        if (tab) {
            const clause = ' AND is_upcoming = ?';
            countSql += clause;
            dataSql += clause;
            params.push(tab === 'upcoming' ? 1 : 0);
        } else if (upcoming !== undefined) {
            const clause = ' AND is_upcoming = ?';
            countSql += clause;
            dataSql += clause;
            params.push(upcoming === 'true' || upcoming === '1' ? 1 : 0);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY date ASC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
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
        const { title, date, location, description, link, event_category, is_upcoming, recording_url, banner_image, is_published } = req.body;

        const [result] = await pool.query(
            `INSERT INTO events
               (title, date, location, description, link, event_category, is_upcoming, recording_url, banner_image, is_published)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                date,
                location ? location.trim() : null,
                description ? description.trim() : null,
                link ? link.trim() : null,
                event_category,
                is_upcoming !== undefined ? Boolean(is_upcoming) : true,
                recording_url ? recording_url.trim() : null,
                banner_image ? banner_image.trim() : null,
                is_published !== undefined ? Boolean(is_published) : true,
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
        const { title, date, location, description, link, event_category, is_upcoming, recording_url, banner_image, is_published } = req.body;

        const [check] = await pool.query('SELECT id FROM events WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        await pool.query(
            `UPDATE events
             SET title=?, date=?, location=?, description=?, link=?, event_category=?,
                 is_upcoming=?, recording_url=?, banner_image=?, is_published=?
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
                banner_image ? banner_image.trim() : null,
                is_published !== undefined ? Boolean(is_published) : true,
                req.params.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/events/:id/publish  (admin only)
export const togglePublishEvent = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, is_published FROM events WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        const newState = !rows[0].is_published;
        await pool.query('UPDATE events SET is_published = ? WHERE id = ?', [newState, req.params.id]);

        const [updated] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        return res.json({
            success: true,
            data: updated[0],
            message: newState ? 'Event published.' : 'Event unpublished.',
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/events/:id/upload-banner  (admin only, multipart/form-data)
export const uploadBanner = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, banner_image FROM events WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        if (!req.file) {
            return res.status(422).json({ success: false, message: 'No image file provided.' });
        }

        // Delete old banner blob if it exists and is a blob URL
        await deleteFromBlob(check[0].banner_image);

        // Upload new banner to Azure Blob Storage
        const banner_image = await uploadToBlob(
            'events/banners',
            req.file.originalname,
            req.file.buffer,
            req.file.mimetype
        );

        await pool.query('UPDATE events SET banner_image = ? WHERE id = ?', [banner_image, req.params.id]);

        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/events/:id  (admin only)
export const deleteEvent = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, banner_image FROM events WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        // Delete banner blob from Azure Storage
        await deleteFromBlob(check[0].banner_image);

        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: { message: 'Event deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};
