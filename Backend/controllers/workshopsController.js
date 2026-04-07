import pool from '../db/connection.js';
import { uploadToBlob, deleteFromBlob } from '../services/azureBlobService.js';
import { notifyAllMembers, NOTIF_TYPES } from '../services/notificationService.js';

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
        // founding_member sees all; council_member sees published + their own drafts; public sees published only
        const isFoundingMember = req.user?.role === 'founding_member';
        const isCouncilMember  = req.user?.role === 'council_member';
        const showAll = req.query.all === 'true' && isFoundingMember;
        const { upcoming } = req.query;

        let whereClause;
        const params = [];

        if (showAll) {
            whereClause = '1=1';
        } else if (isCouncilMember && req.query.mine === 'true') {
            // council_member viewing their own (published + drafts)
            whereClause = '(is_published = 1 OR created_by = ?)';
            params.push(req.user.id);
        } else {
            whereClause = 'is_published = 1';
        }

        let countSql = `SELECT COUNT(*) AS total FROM executive_workshops WHERE ${whereClause}`;
        let dataSql  = `SELECT * FROM executive_workshops WHERE ${whereClause}`;

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

// POST /api/workshops  (founding_member or council_member)
export const createWorkshop = async (req, res, next) => {
    try {
        const { title, date, location, description, speaker, agenda, recording_url, banner_image, is_published, is_upcoming } = req.body;
        const isCouncilMember = req.user.role === 'council_member';

        // council_member always creates as draft
        const publishedValue = isCouncilMember ? false : (is_published !== undefined ? Boolean(is_published) : true);

        const [result] = await pool.query(
            `INSERT INTO executive_workshops
               (title, date, location, description, speaker, agenda, recording_url, banner_image, is_published, is_upcoming, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                date,
                location ? location.trim() : null,
                description ? description.trim() : null,
                speaker ? speaker.trim() : null,
                agenda ? agenda.trim() : null,
                recording_url ? recording_url.trim() : null,
                banner_image ? banner_image.trim() : null,
                publishedValue,
                is_upcoming !== undefined ? Boolean(is_upcoming) : true,
                req.user.id,
            ]
        );

        const [rows] = await pool.query('SELECT * FROM executive_workshops WHERE id = ?', [result.insertId]);

        // Only notify when published directly
        if (publishedValue) {
            notifyAllMembers(
                NOTIF_TYPES.WORKSHOP_PUBLISHED,
                `New Workshop: ${title.trim()}`,
                `${location ? location.trim() : 'Online'}${speaker ? ` — ${speaker.trim()}` : ''}`,
                { url: '/workshops', workshopId: String(result.insertId) }
            );
        }

        return res.status(201).json({
            success: true,
            data: rows[0],
            message: isCouncilMember ? 'Workshop submitted for admin review. It will appear publicly once published by an admin.' : undefined,
        });
    } catch (err) {
        next(err);
    }
};


// PUT /api/workshops/:id  (founding_member or council_member — council_member owns only)
export const updateWorkshop = async (req, res, next) => {
    try {
        const { title, date, location, description, speaker, agenda, recording_url, banner_image, is_published, is_upcoming } = req.body;

        const [check] = await pool.query('SELECT id, created_by, is_published FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        // Ownership check for council_member
        if (req.user.role === 'council_member' && check[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only edit workshops you created.' });
        }

        // council_member cannot change is_published — keep existing value
        const publishedValue = req.user.role === 'council_member'
            ? check[0].is_published
            : (is_published !== undefined ? Boolean(is_published) : true);

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
                publishedValue,
                is_upcoming !== undefined ? Boolean(is_upcoming) : true,
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

        // Only notify when publishing — not when unpublishing
        if (newState) {
            notifyAllMembers(
                NOTIF_TYPES.WORKSHOP_PUBLISHED,
                `New Workshop: ${updated[0].title}`,
                `${updated[0].location || 'Online'}${updated[0].speaker ? ` — ${updated[0].speaker}` : ''}`,
                { url: '/workshops', workshopId: String(updated[0].id) }
            );
        }

        return res.json({
            success: true,
            data: updated[0],
            message: newState ? 'Workshop published.' : 'Workshop unpublished.',
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/workshops/:id/upload-banner  (founding_member or council_member — council_member owns only)
export const uploadWorkshopBanner = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, banner_image, created_by FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        // Ownership check for council_member
        if (req.user.role === 'council_member' && check[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only upload banners for workshops you created.' });
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


// DELETE /api/workshops/:id  (founding_member or council_member — council_member owns only)
export const deleteWorkshop = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id, banner_image, created_by FROM executive_workshops WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        // Ownership check for council_member
        if (req.user.role === 'council_member' && check[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete workshops you created.' });
        }

        await deleteFromBlob(check[0].banner_image);
        await pool.query('DELETE FROM executive_workshops WHERE id = ?', [req.params.id]);

        return res.json({ success: true, data: { message: 'Workshop deleted successfully.' } });
    } catch (err) {
        next(err);
    }
};