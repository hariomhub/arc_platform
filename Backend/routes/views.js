/**
 * routes/views.js — mounted at /api/views
 *
 * POST /api/views  { type: 'post'|'blog'|'event'|'workshop', id, metric?: 'view'|'recording_click' }
 *
 * Records one de-duplicated view per viewer per item per day, so Chapter Leads can
 * see how their content performs. It is deliberately forgiving: it always answers
 * 200 so tracking can never break a page. Views by the content's own author, of
 * hidden / unpublished content, or of unknown ids are ignored.
 */

import crypto from 'crypto';
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import pool from '../db/connection.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { toSqlDate } from '../utils/chapterLeadRules.js';

const router = Router();

const viewLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: true },
});

// Who owns the content, and whether it is publicly visible.
const LOOKUPS = {
    post:     { sql: 'SELECT author_id AS owner, (is_hidden = 0) AS visible FROM feed_posts WHERE id = ?' },
    blog:     { sql: "SELECT author_id AS owner, (status = 'published') AS visible FROM blog_posts WHERE id = ?" },
    event:    { sql: 'SELECT created_by AS owner, (is_published = 1) AS visible FROM events WHERE id = ?' },
    workshop: { sql: 'SELECT created_by AS owner, (is_published = 1) AS visible FROM executive_workshops WHERE id = ?' },
};

const viewerHash = (req) => {
    const identity = req.user?.id ? `u:${req.user.id}` : `a:${req.ip}|${req.get('user-agent') || ''}`;
    return crypto.createHash('sha256').update(`${process.env.JWT_SECRET || ''}|${identity}`).digest('hex');
};

router.post(
    '/',
    viewLimiter,
    optionalAuth,
    [
        body('type').isIn(Object.keys(LOOKUPS)),
        body('id').isInt({ min: 1 }),
        body('metric').optional().isIn(['view', 'recording_click']),
    ],
    async (req, res) => {
        try {
            if (!validationResult(req).isEmpty()) return res.json({ success: true });

            const { type } = req.body;
            const id = parseInt(req.body.id, 10);
            const metric = req.body.metric === 'recording_click' ? 'recording_click' : 'view';

            const [[row]] = await pool.query(LOOKUPS[type].sql, [id]);
            if (!row || !row.visible) return res.json({ success: true });
            if (req.user?.id && row.owner === req.user.id) return res.json({ success: true }); // own content

            await pool.query(
                `INSERT IGNORE INTO content_views (content_type, content_id, metric, viewer_hash, view_date)
                 VALUES (?, ?, ?, ?, ?)`,
                [type, id, metric, viewerHash(req), toSqlDate(new Date())]
            );
        } catch (err) {
            console.error('[Views] Could not record view:', err.message);
        }
        return res.json({ success: true });
    }
);

export default router;
