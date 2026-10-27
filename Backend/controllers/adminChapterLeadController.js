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
 *   Tour video   GET|PUT|PATCH|DELETE /tour, POST /tour/upload
 *   Outreach kit GET|PUT|DELETE /outreach-kit
 *   Jobs         POST /run-daily
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    getAdminSummary, listLeadsOverview, getLeadDetail, listTermChanges, listLeadOptions,
    updateTeamProfile, endLeadRole, regenerateReferralCode, waiveQuarter,
    getPolicyAt, getPolicyHistory, listRequests, decideRequest,
    getHosts, setHosts, markConducted, runChapterLeadDaily, isDuplicate, teamError,
} from '../services/chapterLeadService.js';
import { listChapterTeams, getAdminChapterTeam, assignChapterSlug } from '../services/chapterTeamService.js';
import { resetElection } from '../services/earningsElectionService.js';
import { getTeamBoard, getChaptersBoard } from '../services/leaderboardService.js';
import { setHiddenByAdmin } from '../services/publicChapterService.js';
import { getTourForAdmin, saveTourLink, saveTourUpload, updateTourText, removeTour } from '../services/portalService.js';
import { getKitForAdmin, saveKit, resetKit } from '../services/outreachKitService.js';
import { recordAudit } from '../services/auditService.js';
import { dbDate, toSqlDate, TIERS, DEFAULT_TIER_TARGETS } from '../utils/chapterLeadRules.js';

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

// GET /leads?status=active|all&tier=lead|ambassador&chapter_id=
export const getLeads = async (req, res, next) => {
    try {
        const status = req.query.status === 'all' ? 'all' : 'active';
        const tier = [TIERS.LEAD, TIERS.AMBASSADOR].includes(req.query.tier) ? req.query.tier : null;
        const chapterId = parseInt(req.query.chapter_id, 10) || null;
        return res.json({ success: true, data: await listLeadsOverview({ status, tier, chapterId }) });
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

// PATCH /leads/:id   body: { chapter_id?, term_started_at?, tier?, override_cap? }
// Moving someone between lead and ambassador is a tier change: it ends the current stint and opens a new one.
export const patchLead = async (req, res, next) => {
    try {
        const { chapter_id, term_started_at, tier, override_cap } = req.body;
        if (chapter_id !== undefined && chapter_id !== null && chapter_id !== '') {
            const [[chapter]] = await pool.query(`SELECT id FROM chapters WHERE id = ? AND status = 'active'`, [parseInt(chapter_id, 10)]);
            if (!chapter) return res.status(422).json({ success: false, message: 'Chapter not found or inactive.' });
        }
        const out = await updateTeamProfile(parseInt(req.params.id, 10), {
            chapterId: chapter_id === '' ? null : chapter_id,
            termStartedAt: term_started_at || null,
            tier: tier || null,
            overrideCap: override_cap === true,
            actor: req.user,
        });
        if (out.error) return fail(res, out);
        return res.json({ success: true, data: { message: 'Updated.', profile_id: out.profileId } });
    } catch (err) {
        if (isDuplicate(err, 'uq_clp_one_active_per_chapter')) {
            return res.status(409).json({ success: false, message: 'That chapter already has an active Chapter Lead.' });
        }
        next(err);
    }
};

// POST /leads/:id/end   body: { reason, outcome?: 'removed'|'ended' }   (either tier)
export const endLead = async (req, res, next) => {
    try {
        const stepped = req.body.outcome === 'ended';
        const out = await endLeadRole(parseInt(req.params.id, 10), {
            status: stepped ? 'ended' : 'removed',
            reason: req.body.reason || null,
            actorId: req.user.id,
            endCode: stepped ? 'stepped_down' : 'removed_by_admin',
        });
        if (out.error) return fail(res, out);
        await recordAudit(pool, {
            actor: req.user, action: 'team.role_ended', entityType: 'team_profile', entityId: parseInt(req.params.id, 10),
            after: { outcome: stepped ? 'ended' : 'removed', tier: out.tier }, reason: req.body.reason || null, ip: req.ip,
        });
        return res.json({ success: true, data: { message: 'The role has ended. The member is now a Professional.' } });
    } catch (err) {
        next(err);
    }
};

// POST /leads/:id/reset-election   — the person must choose "receive or waive" again (never sets it for them)
export const resetLeadElection = async (req, res, next) => {
    try {
        await resetElection(parseInt(req.params.id, 10), req.user, req.body.reason || null);
        return res.json({ success: true, data: { message: 'They will be asked to choose again the next time they open their dashboard.' } });
    } catch (err) {
        next(err);
    }
};

// GET /chapters/:id/team   — lead, ambassadors, who is waiting, and who could be promoted
export const getChapterTeam = async (req, res, next) => {
    try {
        const data = await getAdminChapterTeam(parseInt(req.params.id, 10));
        if (!data) return res.status(404).json({ success: false, message: 'Chapter not found.' });
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// GET /leaderboard?scope=team|chapters&chapter_id=
export const getBoard = async (req, res, next) => {
    try {
        if (req.query.scope === 'chapters') return res.json({ success: true, data: await getChaptersBoard(req.user) });
        const chapterId = parseInt(req.query.chapter_id, 10);
        if (!chapterId) throw teamError(422, 'chapter_id is required.');
        return res.json({ success: true, data: await getTeamBoard(req.user, chapterId) });
    } catch (err) {
        next(err);
    }
};

// PATCH /members/:userId/visibility   body: { hidden: boolean }  — hide or show someone on the public pages
export const patchMemberVisibility = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const hidden = req.body.hidden === true;
        const out = await setHiddenByAdmin(userId, hidden);
        await recordAudit(pool, {
            actor: req.user, action: hidden ? 'team.hidden_from_public' : 'team.shown_publicly', entityType: 'user',
            entityId: userId, targetUserId: userId, ip: req.ip,
        });
        return res.json({ success: true, data: out });
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

// ── Tour video (what every Chapter Lead and Chapter Ambassador sees on their dashboard) ──────────────────────

// GET /tour
export const getTour = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await getTourForAdmin() });
    } catch (err) {
        next(err);
    }
};

// PUT /tour   body: { url, title?, description? }   a YouTube / Vimeo link or a direct video-file link
export const putTour = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await saveTourLink(req.user, req.body, req.ip) });
    } catch (err) {
        next(err);
    }
};

// POST /tour/upload   multipart: video, title?, description?
export const uploadTour = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await saveTourUpload(req.user, req.file, req.body, req.ip) });
    } catch (err) {
        next(err);
    }
};

// PATCH /tour   body: { title?, description? }   edit the words without touching the video
export const patchTour = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await updateTourText(req.user, req.body, req.ip) });
    } catch (err) {
        next(err);
    }
};

// DELETE /tour
export const deleteTour = async (req, res, next) => {
    try {
        await removeTour(req.user, req.ip);
        return res.json({ success: true, data: null });
    } catch (err) {
        next(err);
    }
};

// ── Chapters ─────────────────────────────────────────────────────────────────

// GET /chapters   — every chapter with its lead, ambassador count, free seats and waiting applications
export const getChapters = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await listChapterTeams() });
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
        await assignChapterSlug(result.insertId);
        await recordAudit(pool, {
            actor: req.user, action: 'chapter.created', entityType: 'chapter', entityId: result.insertId, chapterId: result.insertId,
            after: { name: name.trim(), country_code: country_code.trim().toUpperCase() }, ip: req.ip,
        });
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
            const [[member]] = await pool.query(
                `SELECT p.id FROM chapter_lead_profiles p WHERE p.chapter_id = ? AND p.status = 'active' LIMIT 1`, [id]
            );
            if (member) {
                return res.status(409).json({ success: false, message: 'This chapter still has an active Chapter Lead or Chapter Ambassador. Move or end their roles first, then deactivate the chapter.' });
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

// POST /policy  — adds a NEW policy version that takes effect from `effective_from`.
// Goals and the seat cap are per tier: body.tiers = { lead: {...}, ambassador: {...} }. For older callers,
// the flat goal fields (members_target, ...) are taken as the lead's.
export const createPolicy = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const b = req.body;
        // Past quarters have already been scored under an older policy; a new version
        // can only take effect from today onward.
        if (b.effective_from < toSqlDate(new Date())) {
            return res.status(422).json({ success: false, message: 'A new policy version cannot take effect in the past.' });
        }
        const current = await getPolicyAt(new Date());
        const tiers = {};
        for (const tier of [TIERS.LEAD, TIERS.AMBASSADOR]) {
            const sent = (b.tiers && b.tiers[tier]) || (tier === TIERS.LEAD ? b : {});
            const base = current.tiers[tier] || DEFAULT_TIER_TARGETS[tier];
            const pick = (k) => Number(sent[k] ?? base[k]);
            tiers[tier] = {
                members_target: pick('members_target'), podcasts_target: pick('podcasts_target'), posts_min: pick('posts_min'),
                posts_max: pick('posts_max'), blogs_target: pick('blogs_target'), min_goals_met: pick('min_goals_met'),
                seat_cap: sent.seat_cap === '' || sent.seat_cap === null ? null : (sent.seat_cap === undefined ? base.seat_cap : Number(sent.seat_cap)),
            };
            const t = tiers[tier];
            if (Object.values({ ...t, seat_cap: t.seat_cap ?? 0 }).some((v) => !Number.isFinite(v) || v < 0)) {
                return res.status(422).json({ success: false, message: 'Goals and limits must be zero or more.' });
            }
            if (t.posts_max < t.posts_min) {
                return res.status(422).json({ success: false, message: 'Maximum posts cannot be lower than minimum posts.' });
            }
            if (t.min_goals_met < 1 || t.min_goals_met > 4) {
                return res.status(422).json({ success: false, message: 'The number of goals needed must be between 1 and 4.' });
            }
        }
        if (tiers.lead.seat_cap !== 1) {
            return res.status(422).json({ success: false, message: 'A chapter has exactly one Chapter Lead.' });
        }

        await conn.beginTransaction();
        const lead = tiers.lead;
        const [result] = await conn.query(
            `INSERT INTO chapter_lead_policy
               (effective_from, members_target, podcasts_target, posts_min, posts_max, blogs_target,
                min_goals_met, consecutive_miss_limit, term_months,
                rate_term1, rate_term2, rate_term3, direct_commission_pct, commission_on_renewals, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                b.effective_from, lead.members_target, lead.podcasts_target, lead.posts_min, lead.posts_max, lead.blogs_target,
                lead.min_goals_met, b.consecutive_miss_limit, b.term_months,
                b.rate_term1, b.rate_term2, b.rate_term3, b.direct_commission_pct, b.commission_on_renewals ? 1 : 0,
                req.user.id,
            ]
        );
        for (const [tier, t] of Object.entries(tiers)) {
            await conn.query(
                `INSERT INTO chapter_lead_policy_targets
                   (policy_id, tier_code, members_target, podcasts_target, posts_min, posts_max, blogs_target, min_goals_met, seat_cap)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [result.insertId, tier, t.members_target, t.podcasts_target, t.posts_min, t.posts_max, t.blogs_target, t.min_goals_met, t.seat_cap],
            );
        }
        await recordAudit(conn, {
            actor: req.user, action: 'policy.created', entityType: 'policy', entityId: result.insertId,
            after: { effective_from: b.effective_from, tiers }, ip: req.ip,
        });
        await conn.commit();
        return res.status(201).json({ success: true, data: { message: 'New policy version saved.' } });
    } catch (err) {
        await conn.rollback().catch(() => {});
        if (isDuplicate(err, 'uq_clpol_effective')) {
            return res.status(409).json({ success: false, message: 'A policy version already takes effect on that date. Pick a different date.' });
        }
        next(err);
    } finally {
        conn.release();
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
                `SELECT p.id AS profile_id, p.user_id, COALESCE(u.referral_code, p.referral_code) AS referral_code
                 FROM chapter_lead_profiles p JOIN users u ON u.id = p.user_id
                 WHERE p.user_id = ? AND p.status = 'active'`,
                [parseInt(lead_user_id, 10) || 0]
            );
            if (!lead) return res.status(422).json({ success: false, message: 'The new referrer must be an active chapter team member.' });
            if (lead.user_id === ref.referred_user_id) {
                return res.status(422).json({ success: false, message: 'A member cannot be referred by themselves.' });
            }
            await pool.query(
                'UPDATE referrals SET lead_user_id = ?, code_used = ?, referrer_profile_id = ? WHERE id = ?',
                [lead.user_id, lead.referral_code, lead.profile_id, id]
            );
            await recordAudit(pool, {
                actor: req.user, action: 'referral.reassigned', entityType: 'referral', entityId: id,
                targetUserId: ref.referred_user_id, before: { lead_user_id: ref.lead_user_id }, after: { lead_user_id: lead.user_id }, ip: req.ip,
            });
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

// ── Outreach kit (the invitation messages Chapter Leads and Ambassadors copy from their dashboard) ──────────

// GET /outreach-kit
export const getOutreachKitAdmin = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await getKitForAdmin() });
    } catch (err) {
        next(err);
    }
};

// PUT /outreach-kit   body: { blocks?, templates?, based_on? }   what differs from the defaults; replaces earlier changes
export const putOutreachKit = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await saveKit(req.user, req.body, req.ip) });
    } catch (err) {
        next(err);
    }
};

// DELETE /outreach-kit   back to the defaults
export const deleteOutreachKit = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await resetKit(req.user, req.ip) });
    } catch (err) {
        next(err);
    }
};
