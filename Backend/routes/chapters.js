/**
 * routes/chapters.js — mounted at /api/chapters
 *
 * Public list of ACTIVE chapters, used by the sign-up form and the Chapter Lead
 * application. Chapter management (create / edit / deactivate) is admin-only and
 * lives under /api/admin/chapter-leads/chapters.
 */

import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

// GET /api/chapters?country=IN
router.get('/', async (req, res, next) => {
    try {
        const country = typeof req.query.country === 'string' && /^[A-Za-z]{2}$/.test(req.query.country)
            ? req.query.country.toUpperCase()
            : null;
        const [rows] = await pool.query(
            `SELECT id, name, country_code
             FROM chapters
             WHERE status = 'active' ${country ? 'AND country_code = ?' : ''}
             ORDER BY country_code, name`,
            country ? [country] : []
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
});

export default router;
