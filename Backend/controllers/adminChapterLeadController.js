/**
 * adminChapterLeadController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Founding-member endpoints for managing the Chapter Lead programme.
 * Mounted at /api/admin/chapter-leads (routes/adminChapterLeads.js).
 *
 *   Overview     GET  /summary, /leads, /leads/:id, /term-changes, /options/leads
 *   Lead edits   PATCH /leads/:id, POST /leads/:id/end, POST /leads/:id/regenerate-code,
 *                POST /leads/:id/waive-quarter
 *   Chapters     GET/POST /chapters, PUT /chapters/:id
 *   Policy       GET /policy, POST /policy
 *   Requests     GET /requests, PATCH /requests/:id
 *   Sessions     GET /sessions, GET|PUT /sessions/:type/:id/hosts,
 *                PATCH /sessions/:type/:id/conducted
 *   Referrals    PATCH /referrals/:id
 *   Jobs         POST /run-daily
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    getAdminSummary, listLeadsOverview, getLeadDetail, listTermChanges, listLeadOptions,
    updateLeadProfile, endLeadRole, regenerateReferralCode, waiveQuarter,
    getPolicyAt, getPolicyHistory, listRequests, decideRequest,
    getHosts, setHosts, markConducted, runChapterLeadDaily, isDuplicate,
} from '../services/chapterLeadService.js';
import { dbDate, toSqlDate } from '../utils/chapterLeadRules.js';

const fail = (res, out) => res.status(out.code || 400).json({ success: false, message: out.error });

// ── Overview ─────────────────────────────────────────────────────────────────

// GET /summary
export const getSummary = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await getAdminSummary() });
    } catch (err) {
        next(err);
    }
};

// GET /leads?status=active|all
export const getLeads = async (req, res, next) => {
    try {
        const status = req.query.status === 'all' ? 'all' : 'active';
        return res.json({ success: true, data: await listLeadsOverview({ status }) });
    } catch (err) {
        next(err);
    }
};

// GET /leads/:id
export const getLead = async (req, res, next) => {
    try {
        const detail = await getLeadDetail(parseInt(req.params.id, 10));
        if (!detail) return res.status(404).json({ success: false, message: 'Lead not found.' });
        return res.json({ success: true, data: detail });
    } catch (err) {
        next(err);
    }
};

// GET /term-changes?days=90
export const getTermChanges = async (req, res, next) => {
    try {
        const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 90));
        return res.json({ success: true, data: await listTermChanges(days) });
    } catch (err) {
        next(err);
    }
};

// GET /options/leads  (host picker)
export const getLeadOptions = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await listLeadOptions() });
    } catch (err) {
        next(err);
    }
};

// ── Lead edits ───────────────────────────────────────────────────────────────

// PATCH /leads/:id   body: { chapter_id?, term_started_at? }
export const patchLead = async (req, res, next) => {
    try {
        const { chapter_id, term_started_at } = req.body;
        if (chapter_id !== undefined && chapter_id !== null && chapter_id !== '') {
            const [[chapter]] = await pool.query(`SELECT id FROM chapters WHERE id = ? AND status = 'active'`, [parseInt(chapter_id, 10)]);
            if (!chapter) return res.status(422).json({ success: false, message: 'Chapter not found or inactive.' });
        }
        const out = await updateLeadProfile(parseInt(req.params.id, 10), {
            chapterId: chapter_id === '' ? null : chapter_id,
            termStartedAt: term_started_at || null,
        });
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: { message: 'Lead updated.' } });
    } catch (err) {
        if (isDuplicate(err, 'uq_clp_one_active_per_chapter')) {
            return res.status(409).json({ success: false, message: 'That chapter already has an active Chapter Lead.' });
        }
        next(err);
    }
};

// POST /leads/:id/end   body: { reason, outcome?: 'removed'|'ended' }
export const endLead = async (req, res, next) => {
    try {
        const out = await endLeadRole(parseInt(req.params.id, 10), {
            status: req.body.outcome === 'ended' ? 'ended' : 'removed',
            reason: req.body.reason || null,
            adminId: req.user.id,
        });
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: { message: 'Chapter Lead role ended. The member is now a Professional.' } });
    } catch (err) {
        next(err);
    }
};

// POST /leads/:id/regenerate-code
export const regenerateCode = async (req, res, next) => {
    try {
        const out = await regenerateReferralCode(parseInt(req.params.id, 10));
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: { referral_code: out.referral_code } });
    } catch (err) {
        next(err);
    }
};

// POST /leads/:id/waive-quarter   body: { quarter_start: 'YYYY-MM-DD', notes? }
export const waiveLeadQuarter = async (req, res, next) => {
    try {
        const out = await waiveQuarter(parseInt(req.params.id, 10), req.body.quarter_start, {
            notes: req.body.notes || null,
            adminId: req.user.id,
        });
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: { message: 'Quarter waived.' } });
    } catch (err) {
        next(err);
    }
};

// ── Chapters ─────────────────────────────────────────────────────────────────

// GET /chapters
export const getChapters = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT c.id, c.name, c.country_code, c.status, c.created_at,
                    p.id AS lead_profile_id, u.name AS lead_name,
                    (SELECT COUNT(*) FROM users m WHERE m.chapter_id = c.id AND m.status = 'approved') AS member_count
             FROM chapters c
             LEFT JOIN chapter_lead_profiles p ON p.chapter_id = c.id AND p.status = 'active'
             LEFT JOIN users u ON u.id = p.user_id
             ORDER BY c.country_code, c.name`
        );
        return res.json({ success: true, data: rows.map((r) => ({ ...r, created_at: dbDate(r.created_at) })) });
    } catch (err) {
        next(err);
    }
};

// POST /chapters   body: { name, country_code }
export const createChapter = async (req, res, next) => {
    try {
        const { name, country_code } = req.body;
        const [result] = await pool.query(
            'INSERT INTO chapters (name, country_code) VALUES (?, ?)',
            [name.trim(), country_code.trim().toUpperCase()]
        );
        return res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (err) {
        if (isDuplicate(err, 'uq_chapters_name')) {
            return res.status(409).json({ success: false, message: 'A chapter with that name already exists.' });
        }
        next(err);
    }
};

// PUT /chapters/:id   body: { name, country_code, status }
export const updateChapter = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, country_code, status } = req.body;

        const [[chapter]] = await pool.query('SELECT id FROM chapters WHERE id = ?', [id]);
        if (!chapter) return res.status(404).json({ success: false, message: 'Chapter not found.' });

        if (status === 'inactive') {
            const [[lead]] = await pool.query(
                `SELECT p.id FROM chapter_lead_profiles p WHERE p.chapter_id = ? AND p.status = 'active' LIMIT 1`, [id]
            );
            if (lead) {
                return res.status(409).json({ success: false, message: 'This chapter has an active Chapter Lead. Move or end that lead first, then deactivate the chapter.' });
            }
        }
        await pool.query(
            'UPDATE chapters SET name = ?, country_code = ?, status = ? WHERE id = ?',
            [name.trim(), country_code.trim().toUpperCase(), status === 'inactive' ? 'inactive' : 'active', id]
        );
        return res.json({ success: true, data: { message: 'Chapter updated.' } });
    } catch (err) {
        if (isDuplicate(err, 'uq_chapters_name')) {
            return res.status(409).json({ success: false, message: 'A chapter with that name already exists.' });
        }
        next(err);
    }
};

// ── Policy ───────────────────────────────────────────────────────────────────

// GET /policy
export const getPolicy = async (req, res, next) => {
    try {
        const [current, history] = await Promise.all([getPolicyAt(new Date()), getPolicyHistory()]);
        return res.json({ success: true, data: { current, history } });
    } catch (err) {
        next(err);
    }
};

// POST /policy  — adds a NEW policy version that takes effect from `effective_from`
export const createPolicy = async (req, res, next) => {
    try {
        const b = req.body;
        // Past quarters have already been scored under an older policy; a new version
        // can only take effect from today onward.
        if (b.effective_from < toSqlDate(new Date())) {
            return res.status(422).json({ success: false, message: 'A new policy version cannot take effect in the past.' });
        }
        if (Number(b.posts_max) < Number(b.posts_min)) {
            return res.status(422).json({ success: false, message: 'Maximum posts cannot be lower than minimum posts.' });
        }
        await pool.query(
            `INSERT INTO chapter_lead_policy
               (effective_from, members_target, podcasts_target, posts_min, posts_max, blogs_target,
                min_goals_met, consecutive_miss_limit, term_months,
                rate_term1, rate_term2, rate_term3, direct_commission_pct, commission_on_renewals, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                b.effective_from, b.members_target, b.podcasts_target, b.posts_min, b.posts_max, b.blogs_target,
                b.min_goals_met, b.consecutive_miss_limit, b.term_months,
                b.rate_term1, b.rate_term2, b.rate_term3, b.direct_commission_pct, b.commission_on_renewals ? 1 : 0,
                req.user.id,
            ]
        );
        return res.status(201).json({ success: true, data: { message: 'New policy version saved.' } });
    } catch (err) {
        if (isDuplicate(err, 'uq_clpol_effective')) {
            return res.status(409).json({ success: false, message: 'A policy version already takes effect on that date. Pick a different date.' });
        }
        next(err);
    }
};

// ── Requests ─────────────────────────────────────────────────────────────────

// GET /requests?status=pending
export const getRequests = async (req, res, next) => {
    try {
        const status = ['pending', 'approved', 'rejected', 'cancelled'].includes(req.query.status) ? req.query.status : null;
        return res.json({ success: true, data: await listRequests({ status }) });
    } catch (err) {
        next(err);
    }
};

// PATCH /requests/:id   body: { status: 'approved'|'rejected', admin_notes }
export const decideLeadRequest = async (req, res, next) => {
    try {
        const out = await decideRequest(parseInt(req.params.id, 10), {
            status: req.body.status,
            adminNotes: req.body.admin_notes || null,
            adminId: req.user.id,
        });
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: out });
    } catch (err) {
        next(err);
    }
};

// ── Sessions (podcasts + workshops): hosts and "conducted" ───────────────────

// GET /sessions  — podcasts and workshops with their hosts and conducted state
export const getSessions = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM (
                SELECT 'event' AS type, e.id, e.title, e.event_category AS category, e.date,
                       e.is_published, e.conducted_at
                FROM events e WHERE e.event_category IN ('podcast', 'workshop')
                UNION ALL
                SELECT 'workshop' AS type, w.id, w.title, 'workshop' AS category, w.date,
                       w.is_published, w.conducted_at
                FROM executive_workshops w
             ) s
             ORDER BY s.date DESC
             LIMIT 300`
        );
        const eventIds = rows.filter((r) => r.type === 'event').map((r) => r.id);
        const workshopIds = rows.filter((r) => r.type === 'workshop').map((r) => r.id);
        const hostRows = [];
        if (eventIds.length) {
            const [h] = await pool.query(
                `SELECT 'event' AS type, h.event_id AS id, h.user_id, h.role, u.name
                 FROM event_hosts h JOIN users u ON u.id = h.user_id WHERE h.event_id IN (?)`, [eventIds]
            );
            hostRows.push(...h);
        }
        if (workshopIds.length) {
            const [h] = await pool.query(
                `SELECT 'workshop' AS type, h.workshop_id AS id, h.user_id, h.role, u.name
                 FROM event_hosts h JOIN users u ON u.id = h.user_id WHERE h.workshop_id IN (?)`, [workshopIds]
            );
            hostRows.push(...h);
        }
        const key = (type, id) => `${type}:${id}`;
        const byKey = new Map();
        hostRows.forEach((h) => {
            const k = key(h.type, h.id);
            if (!byKey.has(k)) byKey.set(k, []);
            byKey.get(k).push({ user_id: h.user_id, name: h.name, role: h.role });
        });
        return res.json({
            success: true,
            data: rows.map((r) => ({
                ...r,
                date: dbDate(r.date),
                conducted_at: dbDate(r.conducted_at),
                is_published: Boolean(r.is_published),
                hosts: byKey.get(key(r.type, r.id)) || [],
            })),
        });
    } catch (err) {
        next(err);
    }
};

// GET /sessions/:type/:id/hosts
export const getSessionHosts = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const hosts = await getHosts(req.params.type === 'workshop' ? { workshopId: id } : { eventId: id });
        return res.json({ success: true, data: hosts });
    } catch (err) {
        next(err);
    }
};

// PUT /sessions/:type/:id/hosts   body: { hosts: [{ user_id, role }] }
export const putSessionHosts = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const out = await setHosts({
            ...(req.params.type === 'workshop' ? { workshopId: id } : { eventId: id }),
            hosts: req.body.hosts || [],
        });
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: { message: 'Hosts updated.' } });
    } catch (err) {
        next(err);
    }
};

// PATCH /sessions/:type/:id/conducted   body: { conducted: boolean, conducted_on?: ISO date }
export const patchConducted = async (req, res, next) => {
    try {
        const out = await markConducted({
            type: req.params.type,
            id: parseInt(req.params.id, 10),
            conducted: req.body.conducted === true,
            conductedOn: req.body.conducted_on || null,
            adminId: req.user.id,
        });
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: out });
    } catch (err) {
        next(err);
    }
};

// ── Referral corrections ─────────────────────────────────────────────────────

// PATCH /referrals/:id   body: { action: 'void'|'restore'|'reassign', lead_user_id?, reason? }
export const patchReferral = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { action, lead_user_id, reason } = req.body;
        const [[ref]] = await pool.query(
            `SELECT r.*, u.status AS user_status FROM referrals r JOIN users u ON u.id = r.referred_user_id WHERE r.id = ?`, [id]
        );
        if (!ref) return res.status(404).json({ success: false, message: 'Referral not found.' });

        if (action === 'void') {
            await pool.query(`UPDATE referrals SET status = 'void', void_reason = ? WHERE id = ?`,
                [String(reason || 'Voided by an administrator').slice(0, 255), id]);
        } else if (action === 'restore') {
            const approved = ref.user_status === 'approved';
            await pool.query(
                `UPDATE referrals
                 SET status = ?, void_reason = NULL,
                     qualified_at = ${approved ? 'COALESCE(qualified_at, UTC_TIMESTAMP())' : 'NULL'}
                 WHERE id = ?`,
                [approved ? 'qualified' : 'pending', id]
            );
        } else if (action === 'reassign') {
            const [[lead]] = await pool.query(
                `SELECT user_id, referral_code FROM chapter_lead_profiles WHERE user_id = ? AND status = 'active'`,
                [parseInt(lead_user_id, 10) || 0]
            );
            if (!lead) return res.status(422).json({ success: false, message: 'The new lead must be an active Chapter Lead.' });
            if (lead.user_id === ref.referred_user_id) {
                return res.status(422).json({ success: false, message: 'A member cannot be referred by themselves.' });
            }
            await pool.query('UPDATE referrals SET lead_user_id = ?, code_used = ? WHERE id = ?', [lead.user_id, lead.referral_code, id]);
        }
        return res.json({ success: true, data: { message: 'Referral updated.' } });
    } catch (err) {
        next(err);
    }
};

// ── Jobs ─────────────────────────────────────────────────────────────────────

// POST /run-daily  — runs term roll-over, quarter close and nudges now (idempotent)
export const runDaily = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await runChapterLeadDaily(new Date()) });
    } catch (err) {
        next(err);
    }
};
