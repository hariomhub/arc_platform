/**
 * routes/chapters.js — mounted at /api/chapters
 *
 *   GET /api/chapters?country=IN   plain list of ACTIVE chapters for the sign-up form and the
 *                                  team application, with whether each has a lead and free seats
 *   GET /api/chapters/public       every chapter with its lead (the public Chapters page)
 *   GET /api/chapters/:slug        one chapter's public page: lead, ambassadors, free seats
 *
 * Chapter management (create / edit / deactivate) is admin-only and lives under
 * /api/admin/chapter-leads/chapters. What a person shows publicly is their own choice
 * (see publicChapterService.js); nothing here exposes an email address or phone number.
 */

import { Router } from 'express';
import pool from '../db/connection.js';
import { listPublicChapters, getPublicChapter } from '../services/publicChapterService.js';
import { getPolicyAt } from '../services/chapterLeadService.js';

const router = Router();

// GET /api/chapters?country=IN
router.get('/', async (req, res, next) => {
    try {
        const country = typeof req.query.country === 'string' && /^[A-Za-z]{2}$/.test(req.query.country)
            ? req.query.country.toUpperCase()
            : null;
        const policy = await getPolicyAt(new Date());
        const cap = policy.tiers.ambassador.seat_cap;
        const [rows] = await pool.query(
            `SELECT s.chapter_id AS id, s.name, s.slug, s.country_code,
                    (s.lead_user_id IS NOT NULL) AS has_lead, s.ambassadors_active
             FROM chapter_team_summary s
             WHERE s.status = 'active' ${country ? 'AND s.country_code = ?' : ''}
             ORDER BY s.country_code, s.name`,
            country ? [country] : []
        );
        return res.json({
            success: true,
            data: rows.map((r) => ({
                id: r.id, name: r.name, slug: r.slug, country_code: r.country_code,
                has_lead: Boolean(r.has_lead),
                ambassadors: Number(r.ambassadors_active),
                seats_left: cap === null ? null : Math.max(0, cap - Number(r.ambassadors_active)),
            })),
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/chapters/public
router.get('/public', async (req, res, next) => {
    try {
        res.set('Cache-Control', 'public, max-age=60');
        return res.json({ success: true, data: await listPublicChapters() });
    } catch (err) {
        next(err);
    }
});

// GET /api/chapters/:slug
router.get('/:slug', async (req, res, next) => {
    try {
        res.set('Cache-Control', 'public, max-age=60');
        return res.json({ success: true, data: await getPublicChapter(req.params.slug) });
    } catch (err) {
        next(err);
    }
});

export default router;
