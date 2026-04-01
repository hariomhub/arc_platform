import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob } from '../services/azureBlobService.js';

// Helper: pagination meta
const paginate = (query, total) => {
    const page  = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/workshops  — public; admin passes ?all=true to see unpublished drafts too
export const getWorkshops = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === 'founding_member';
        const showAll = req.query.all === 'true' && isAdmin;
        const { upcoming } = req.query;

        let countSql = `SELECT COUNT(*) AS total FROM executive_workshops WHERE ${showAll ? '1=1' : 'is_published = 1'}`;
        let dataSql  = `SELECT * FROM executive_workshops WHERE ${showAll ? '1=1' : 'is_published = 1'}`;
        const params = [];

        if (upcoming !== undefined) {
            const clause = ' AND is_upcoming = ?';
            countSql += clause;
            dataSql  += clause;
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

// GET /api/workshops/:id
export const getWorkshopById = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/workshops  (admin only — founding_member)
export const createWorkshop = async (req, res, next) => {
    try {
        const { title, date, location, description, speaker, agenda, recording_url, banner_image, is_published, is_upcoming } = req.body;

        const [result] = await pool.query(
            `INSERT INTO executive_workshops
               (title, date, location, description, speaker, agenda, recording_url, banner_image, is_published, is_upcoming)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                date,
                location ? location.trim() : null,
                description ? description.trim() : null,
                speaker ? speaker.trim() : null,
                agenda ? agenda.trim() : null,
                recording_url ? recording_url.trim() : null,
                banner_image ? banner_image.trim() : null,
                is_published !== undefined ? Boolean(is_published) : true,
                is_upcoming  !== undefined ? Boolean(is_upcoming)  : true,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM executive_workshops WHERE id = ?', [result.insertId]);
        return res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PUT /api/workshops/:id  (admin only)
export const updateWorkshop = async (req, res, next) => {
    try {
        const { title, date, location, description, speaker, agenda, recording_url, banner_image, is_published, is_upcoming } = req.body;

        const [check] = await pool.query('SELECT id FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        await pool.query(
            `UPDATE executive_workshops
             SET title=?, date=?, location=?, description=?, speaker=?, agenda=?,
                 recording_url=?, banner_image=?, is_published=?, is_upcoming=?
             WHERE id=?`,
            [
                title.trim(),
                date,
                location ? location.trim() : null,
                description ? description.trim() : null,
                speaker ? speaker.trim() : null,
                agenda ? agenda.trim() : null,
                recording_url ? recording_url.trim() : null,
                banner_image ? banner_image.trim() : null,
                is_published !== undefined ? Boolean(is_published) : true,
                is_upcoming  !== undefined ? Boolean(is_upcoming)  : true,
                req.params.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM executive_workshops WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/workshops/:id/publish  (admin only)
export const togglePublishWorkshop = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, is_published FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        const newState = !rows[0].is_published;
        await pool.query('UPDATE executive_workshops SET is_published = ? WHERE id = ?', [newState, req.params.id]);

        const [updated] = await pool.query('SELECT * FROM executive_workshops WHERE id = ?', [req.params.id]);
        return res.json({
            success: true,
            data: updated[0],
            message: newState ? 'Workshop published.' : 'Workshop unpublished.',
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/workshops/:id/upload-banner  (admin only, multipart/form-data)
export const uploadWorkshopBanner = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, banner_image FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        if (!req.file) {
            return res.status(422).json({ success: false, message: 'No image file provided.' });
        }

        await deleteFromBlob(check[0].banner_image);

        const banner_image = await uploadToBlob(
            'workshops/banners',
            req.file.originalname,
            req.file.buffer,
            req.file.mimetype
        );

        await pool.query('UPDATE executive_workshops SET banner_image = ? WHERE id = ?', [banner_image, req.params.id]);

        const [rows] = await pool.query('SELECT * FROM executive_workshops WHERE id = ?', [req.params.id]);
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/workshops/:id  (admin only)
export const deleteWorkshop = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, banner_image FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        await deleteFromBlob(check[0].banner_image);
        await pool.query('DELETE FROM executive_workshops WHERE id = ?', [req.params.id]);

        return res.json({ success: true, data: { message: 'Workshop deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};
