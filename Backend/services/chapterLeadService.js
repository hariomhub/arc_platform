/**
 * chapterLeadService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Database-aware logic for the Chapter Lead programme.
 *
 *   • Promotion / demotion  — the ONE place that makes someone a Chapter Lead
 *     (profile, referral code, term start, expiry) or ends that role.
 *   • Referrals             — attach at signup, qualify on approval, void.
 *   • Progress              — live goal counts for a quarter window.
 *   • Quarter close         — snapshot results, escalate misses, notify.
 *   • Term auto-continue    — rolls a lead into the next 18-month term.
 *   • Admin overview        — leads with progress and standing.
 *
 * Pure maths (terms, quarter windows, goal evaluation) lives in
 * utils/chapterLeadRules.js. All dates are UTC; see dbDate() there.
 *
 * Revenue / earnings are intentionally absent — they arrive with the payment
 * gateway in a later phase.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    DEFAULT_POLICY, COUNTED_POST_TYPES, POLICY_VERSION,
    generateReferralCode, normalizeReferralCode,
    getTermInfo, quarterWindowFor, eligibleClosedQuarters, isPartialQuarter, evalStartFor,
    evaluateGoals, buildGoalCards, countConsecutiveMisses, standingFor,
    daysLeftInWindow, daysSinceWindowStart, toSqlDateTime, toSqlDate, dbDate, GOAL_KEYS, GOAL_LABELS,
} from '../utils/chapterLeadRules.js';
import { notifyUser, NOTIF_TYPES } from './notificationService.js';
import { sendChapterLeadNoticeEmail } from './emailService.js';

// The Chapter Lead programme lives inside the one member dashboard; ?tab= opens a specific tab.
const DASHBOARD_PATH = '/user/dashboard';
const dashboardTab = (tab) => `${DASHBOARD_PATH}?tab=${tab}`;

export const isDuplicate = (err, key) =>
    err?.code === 'ER_DUP_ENTRY' && (!key || String(err.sqlMessage || '').includes(key));

// ════════════════════════════════════════════════════════════════════════════
// POLICY
// ════════════════════════════════════════════════════════════════════════════

/** The policy in force on `at` (latest row with effective_from <= at). */
export const getPolicyAt = async (at = new Date(), conn = pool) => {
    const [rows] = await conn.query(
        'SELECT * FROM chapter_lead_policy WHERE effective_from <= ? ORDER BY effective_from DESC LIMIT 1',
        [toSqlDate(at)],
    );
    return rows[0] || DEFAULT_POLICY;
};

export const getPolicyHistory = async () => {
    const [rows] = await pool.query(
        `SELECT p.*, DATE_FORMAT(p.effective_from, '%Y-%m-%d') AS effective_from_str, u.name AS created_by_name
         FROM chapter_lead_policy p LEFT JOIN users u ON u.id = p.created_by
         ORDER BY p.effective_from DESC`,
    );
    return rows.map((r) => ({ ...r, effective_from: r.effective_from_str }));
};

/** Public-safe summary used by the application form, Terms and the dashboard. */
export const getPublicPolicy = async () => {
    const p = await getPolicyAt(new Date());
    return {
        policy_version: POLICY_VERSION,
        targets: {
            members: Number(p.members_target),
            podcasts: Number(p.podcasts_target),
            posts_min: Number(p.posts_min),
            posts_max: Number(p.posts_max),
            blogs: Number(p.blogs_target),
        },
        min_goals_met: Number(p.min_goals_met),
        consecutive_miss_limit: Number(p.consecutive_miss_limit),
        term_months: Number(p.term_months),
        rates: {
            term1: Number(p.rate_term1),
            term2: Number(p.rate_term2),
            term3: Number(p.rate_term3),
            direct_commission: Number(p.direct_commission_pct),
        },
    };
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILES
// ════════════════════════════════════════════════════════════════════════════

const PROFILE_SELECT = `
    SELECT p.*, c.name AS chapter_name, c.country_code AS chapter_country
    FROM chapter_lead_profiles p
    LEFT JOIN chapters c ON c.id = p.chapter_id`;

const normalizeProfile = (row) => row && ({
    ...row,
    term_started_at: dbDate(row.term_started_at),
    created_at: dbDate(row.created_at),
    ended_at: dbDate(row.ended_at),
});

export const getActiveProfile = async (userId, conn = pool) => {
    const [rows] = await conn.query(`${PROFILE_SELECT} WHERE p.user_id = ? AND p.status = 'active' LIMIT 1`, [userId]);
    return normalizeProfile(rows[0] || null);
};

export const getProfileById = async (profileId, conn = pool) => {
    const [rows] = await conn.query(`${PROFILE_SELECT} WHERE p.id = ? LIMIT 1`, [profileId]);
    return normalizeProfile(rows[0] || null);
};

export const findActiveProfileByCode = async (rawCode, conn = pool) => {
    const code = normalizeReferralCode(rawCode);
    if (!code) return null;
    const [rows] = await conn.query(
        `SELECT p.id, p.user_id, p.referral_code, p.chapter_id, u.name AS lead_name
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.referral_code = ? AND p.status = 'active' AND u.status = 'approved'
         LIMIT 1`,
        [code],
    );
    return rows[0] || null;
};

/**
 * Makes `userId` a Chapter Lead. Idempotent: an existing active profile is kept
 * (and moved to `chapterId` when one is given). Sets role and the membership
 * expiry to the end of the current term.
 *
 * Throws ER_DUP_ENTRY (uq_clp_one_active_per_chapter) if another active lead
 * already holds that chapter — callers should map it to a 409.
 */
export const activateChapterLead = async (conn, userId, { chapterId = null, termStartedAt = null } = {}) => {
    const now = new Date();
    const policy = await getPolicyAt(now, conn);
    let profile = await getActiveProfile(userId, conn);

    if (!profile) {
        const start = termStartedAt ? new Date(termStartedAt) : now;
        let inserted = false;
        for (let attempt = 0; attempt < 8 && !inserted; attempt += 1) {
            try {
                await conn.query(
                    `INSERT INTO chapter_lead_profiles (user_id, chapter_id, referral_code, status, term_started_at)
                     VALUES (?, ?, ?, 'active', ?)`,
                    [userId, chapterId, generateReferralCode(), toSqlDateTime(start)],
                );
                inserted = true;
            } catch (err) {
                if (isDuplicate(err, 'uq_clp_referral_code')) continue; // astronomically rare: regenerate
                throw err;
            }
        }
        if (!inserted) throw new Error('Could not generate a unique referral code.');
        profile = await getActiveProfile(userId, conn);
    } else if (chapterId !== null && Number(chapterId) !== Number(profile.chapter_id)) {
        await conn.query('UPDATE chapter_lead_profiles SET chapter_id = ? WHERE id = ?', [chapterId, profile.id]);
        profile = await getActiveProfile(userId, conn);
    }

    const info = getTermInfo(profile.term_started_at, now, policy);
    await conn.query(
        `UPDATE users SET role = 'council_member', membership_expires_at = ? WHERE id = ?`,
        [toSqlDateTime(info.termEnd), userId],
    );
    return profile;
};

/** Ends the active stint (does NOT change the user's role — callers do that). */
export const endChapterLead = async (conn, userId, { status = 'removed', reason = null, adminId = null } = {}) => {
    const [res] = await conn.query(
        `UPDATE chapter_lead_profiles
         SET status = ?, ended_at = UTC_TIMESTAMP(), end_reason = ?, ended_by = ?
         WHERE user_id = ? AND status = 'active'`,
        [status, reason ? String(reason).slice(0, 500) : null, adminId, userId],
    );
    return res.affectedRows > 0;
};

/** Membership expiry for non-lead roles (unchanged from the previous behaviour). */
export const roleExpiry = (role) => {
    const years = role === 'founding_member' ? 5 : 1;
    return new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000);
};

/**
 * Single entry point used by every admin path that changes a user's role.
 * `approved` mirrors the previous behaviour: only approved accounts get an expiry.
 */
export const applyRole = async (conn, userId, newRole, { adminId = null, chapterId = null, termStartedAt = null, approved = true } = {}) => {
    const [[current]] = await conn.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!current) return null;

    if (newRole === 'council_member') {
        await conn.query('UPDATE users SET role = ? WHERE id = ?', ['council_member', userId]);
        if (approved) return activateChapterLead(conn, userId, { chapterId, termStartedAt });
        await conn.query('UPDATE users SET membership_expires_at = NULL WHERE id = ?', [userId]);
        return null;
    }

    if (current.role === 'council_member') {
        await endChapterLead(conn, userId, { status: 'removed', reason: 'Role changed by an administrator', adminId });
    }
    const expiry = approved ? roleExpiry(newRole) : null;
    // A demoted lead keeps resource downloads, which professionals only get as "working professionals".
    const subTypeFix = (current.role === 'council_member' && newRole === 'professional')
        ? ", professional_sub_type = COALESCE(professional_sub_type, 'working_professional')"
        : '';
    await conn.query(
        `UPDATE users SET role = ?, membership_expires_at = ?${subTypeFix} WHERE id = ?`,
        [newRole, expiry, userId],
    );
    return null;
};

/**
 * Safety net used at login: if an active lead's expiry has passed (e.g. the
 * daily job was missed), roll them into the next term instead of locking them out.
 * Returns the (possibly new) expiry, or null when the user is not an active lead.
 */
export const extendLeadTermIfDue = async (userId) => {
    const profile = await getActiveProfile(userId);
    if (!profile) return null;
    const [[u]] = await pool.query('SELECT membership_expires_at FROM users WHERE id = ?', [userId]);
    const now = new Date();
    const expiry = dbDate(u?.membership_expires_at);
    if (expiry && expiry > now) return expiry;
    const policy = await getPolicyAt(now);
    const info = getTermInfo(profile.term_started_at, now, policy);
    await pool.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [toSqlDateTime(info.termEnd), userId]);
    return info.termEnd;
};

// ════════════════════════════════════════════════════════════════════════════
// POLICY ACCEPTANCE (Privacy Policy + Terms)
// ════════════════════════════════════════════════════════════════════════════

export const recordPolicyAcceptance = async (conn, userId, { ip = null, context = 'chapter_lead_application' } = {}) => {
    for (const document of ['privacy', 'terms']) {
        await conn.query(
            `INSERT IGNORE INTO policy_acceptances (user_id, document, version, context, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, document, POLICY_VERSION, context, ip ? String(ip).slice(0, 45) : null],
        );
    }
};

/** Active leads must have accepted the CURRENT policy version (both documents). */
export const needsPolicyAcceptance = async (userId, role) => {
    if (role !== 'council_member') return false;
    const [[row]] = await pool.query(
        'SELECT COUNT(*) AS n FROM policy_acceptances WHERE user_id = ? AND version = ?',
        [userId, POLICY_VERSION],
    );
    return Number(row.n) < 2;
};

// ════════════════════════════════════════════════════════════════════════════
// REFERRALS
// ════════════════════════════════════════════════════════════════════════════

/** Records who referred a new user. Returns the lead's profile row, or null if the code is not usable. */
export const attachReferral = async (conn, { referredUserId, code }) => {
    const lead = await findActiveProfileByCode(code, conn);
    if (!lead || lead.user_id === referredUserId) return null;
    await conn.query(
        `INSERT IGNORE INTO referrals (referred_user_id, lead_user_id, code_used, status)
         VALUES (?, ?, ?, 'pending')`,
        [referredUserId, lead.user_id, lead.referral_code],
    );
    return lead;
};

/** Called when an admin approves a user — the referral now counts toward the goal. */
export const qualifyReferral = async (userId, conn = pool) => {
    await conn.query(
        `UPDATE referrals SET status = 'qualified', qualified_at = UTC_TIMESTAMP()
         WHERE referred_user_id = ? AND status = 'pending'`,
        [userId],
    );
};

export const voidReferral = async (userId, reason, conn = pool) => {
    await conn.query(
        `UPDATE referrals SET status = 'void', void_reason = ?
         WHERE referred_user_id = ? AND status = 'pending'`,
        [String(reason || 'Voided').slice(0, 255), userId],
    );
};

export const getReferralList = async (leadUserId, limit = 300) => {
    const [rows] = await pool.query(
        `SELECT r.id, r.status, r.created_at, r.qualified_at, r.void_reason,
                SUBSTRING_INDEX(u.name, ' ', 1) AS first_name,
                u.organization_name, u.status AS user_status, u.country_code
         FROM referrals r
         JOIN users u ON u.id = r.referred_user_id
         WHERE r.lead_user_id = ?
         ORDER BY r.created_at DESC
         LIMIT ?`,
        [leadUserId, limit],
    );
    return rows.map((r) => ({
        ...r,
        created_at: dbDate(r.created_at),
        qualified_at: dbDate(r.qualified_at),
        // Deleted accounts are tombstoned — never show leftovers of a scrubbed identity.
        first_name: r.user_status === 'deleted' ? 'Former member' : r.first_name,
        organization_name: r.user_status === 'deleted' ? null : r.organization_name,
    }));
};

// ════════════════════════════════════════════════════════════════════════════
// PROGRESS (live goal counts for a quarter window)
// ════════════════════════════════════════════════════════════════════════════

const toCountMap = (rows, key = 'uid') => new Map(rows.map((r) => [r[key], Number(r.n)]));

/**
 * Goal counts for several leads at once. Returns Map<userId, {members, podcasts,
 * posts, blogs, workshops}>. `workshops` is informational (not a goal).
 */
export const computeProgressBatch = async (userIds, window, conn = pool) => {
    const out = new Map(userIds.map((id) => [id, { members: 0, podcasts: 0, posts: 0, blogs: 0, workshops: 0 }]));
    if (!userIds.length) return out;
    const { startStr, endStr } = window;

    const [members] = await conn.query(
        `SELECT r.lead_user_id AS uid, COUNT(*) AS n
         FROM referrals r JOIN users u ON u.id = r.referred_user_id
         WHERE r.lead_user_id IN (?) AND r.status = 'qualified' AND u.status = 'approved'
           AND r.qualified_at >= ? AND r.qualified_at < ?
         GROUP BY r.lead_user_id`,
        [userIds, startStr, endStr],
    );
    const [podcasts] = await conn.query(
        `SELECT h.user_id AS uid, COUNT(DISTINCT e.id) AS n
         FROM event_hosts h JOIN events e ON e.id = h.event_id
         WHERE h.user_id IN (?) AND e.event_category = 'podcast' AND e.is_published = 1
           AND e.conducted_at >= ? AND e.conducted_at < ?
         GROUP BY h.user_id`,
        [userIds, startStr, endStr],
    );
    const [posts] = await conn.query(
        `SELECT author_id AS uid, COUNT(*) AS n
         FROM feed_posts
         WHERE author_id IN (?) AND is_hidden = 0 AND post_type IN (?)
           AND created_at >= ? AND created_at < ?
         GROUP BY author_id`,
        [userIds, COUNTED_POST_TYPES, startStr, endStr],
    );
    const [blogs] = await conn.query(
        `SELECT author_id AS uid, COUNT(*) AS n
         FROM blog_posts
         WHERE author_id IN (?) AND status = 'published'
           AND published_at >= ? AND published_at < ?
         GROUP BY author_id`,
        [userIds, startStr, endStr],
    );
    const [wsEvents] = await conn.query(
        `SELECT h.user_id AS uid, COUNT(DISTINCT e.id) AS n
         FROM event_hosts h JOIN events e ON e.id = h.event_id
         WHERE h.user_id IN (?) AND e.event_category = 'workshop' AND e.is_published = 1
           AND e.conducted_at >= ? AND e.conducted_at < ?
         GROUP BY h.user_id`,
        [userIds, startStr, endStr],
    );
    const [wsExec] = await conn.query(
        `SELECT h.user_id AS uid, COUNT(DISTINCT w.id) AS n
         FROM event_hosts h JOIN executive_workshops w ON w.id = h.workshop_id
         WHERE h.user_id IN (?) AND w.is_published = 1
           AND w.conducted_at >= ? AND w.conducted_at < ?
         GROUP BY h.user_id`,
        [userIds, startStr, endStr],
    );

    const maps = {
        members: toCountMap(members), podcasts: toCountMap(podcasts),
        posts: toCountMap(posts), blogs: toCountMap(blogs),
    };
    const wsA = toCountMap(wsEvents);
    const wsB = toCountMap(wsExec);
    for (const id of userIds) {
        const row = out.get(id);
        GOAL_KEYS.forEach((k) => { row[k] = maps[k].get(id) || 0; });
        row.workshops = (wsA.get(id) || 0) + (wsB.get(id) || 0);
    }
    return out;
};

export const getQuarterHistory = async (profileId, limit = 40, conn = pool) => {
    const [rows] = await conn.query(
        `SELECT id, profile_id, status, met, goals_met, min_goals_met, notes,
                DATE_FORMAT(quarter_start, '%Y-%m-%d') AS quarter_start,
                DATE_FORMAT(quarter_end,   '%Y-%m-%d') AS quarter_end,
                members_actual, podcasts_actual, posts_actual, blogs_actual,
                members_target, podcasts_target, posts_min, posts_max, blogs_target, closed_at
         FROM chapter_lead_quarters
         WHERE profile_id = ?
         ORDER BY quarter_start DESC
         LIMIT ?`,
        [profileId, limit],
    );
    return rows.map((r) => ({ ...r, closed_at: dbDate(r.closed_at), met: r.met === null ? null : Boolean(r.met) }));
};

// ════════════════════════════════════════════════════════════════════════════
// LEAD DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

export const buildDashboard = async (userId) => {
    const profile = await getActiveProfile(userId);
    if (!profile) return null;

    const now = new Date();
    const policy = await getPolicyAt(now);
    const window = quarterWindowFor(now);
    const progress = (await computeProgressBatch([userId], window)).get(userId);
    const term = getTermInfo(profile.term_started_at, now, policy);
    const evalStart = evalStartFor(profile);
    const partial = isPartialQuarter(evalStart, window);

    const history = await getQuarterHistory(profile.id);
    const misses = countConsecutiveMisses(history);
    const evaluation = evaluateGoals(progress, policy);
    const nextTerm = getTermInfo(profile.term_started_at, term.termEnd, policy);

    return {
        profile: {
            id: profile.id,
            referral_code: profile.referral_code,
            chapter: profile.chapter_id ? { id: profile.chapter_id, name: profile.chapter_name, country_code: profile.chapter_country } : null,
            term_started_at: profile.term_started_at,
        },
        term: {
            number: term.termNumber,
            rate: term.rate,
            starts: term.termStart,
            ends: term.termEnd,
            months: term.termMonths,
            next_rate: nextTerm.rate,
        },
        quarter: {
            label: window.label,
            start: window.start,
            end: window.end,
            days_left: daysLeftInWindow(window, now),
            partial, // true => this quarter is not scored (joined part-way through)
        },
        goals: buildGoalCards(progress, policy, window, now),
        summary: {
            goals_met: evaluation.goalsMet,
            min_goals_met: Number(policy.min_goals_met),
            on_course: evaluation.met,
            workshops_conducted: progress.workshops,
        },
        standing: {
            consecutive_misses: misses,
            limit: Number(policy.consecutive_miss_limit),
            status: standingFor(misses, policy),
        },
        quarters: history.slice(0, 8),
        earnings: {
            // Amounts arrive with the payment gateway. For now the dashboard shows the rules.
            current_rate: term.rate,
            direct_commission: Number(policy.direct_commission_pct),
            rates: { term1: Number(policy.rate_term1), term2: Number(policy.rate_term2), term3: Number(policy.rate_term3) },
        },
        policy: await getPublicPolicy(),
    };
};

/** Items behind the goals: posts, podcasts, workshops, blogs — each with performance numbers. */
export const getLeadPerformance = async (userId, limit = 50) => {
    const window = quarterWindowFor(new Date());
    const views = (type, idCol) =>
        `(SELECT COUNT(*) FROM content_views cv WHERE cv.content_type = '${type}' AND cv.content_id = ${idCol} AND cv.metric = 'view')`;
    const clicks = (type, idCol) =>
        `(SELECT COUNT(*) FROM content_views cv WHERE cv.content_type = '${type}' AND cv.content_id = ${idCol} AND cv.metric = 'recording_click')`;

    const [posts] = await pool.query(
        `SELECT fp.id, fp.post_type, LEFT(fp.content, 160) AS snippet, fp.created_at, fp.is_hidden,
                fp.like_count, fp.comment_count, fp.save_count, ${views('post', 'fp.id')} AS views
         FROM feed_posts fp
         WHERE fp.author_id = ?
         ORDER BY fp.created_at DESC
         LIMIT ?`,
        [userId, limit],
    );
    const [podcasts] = await pool.query(
        `SELECT e.id, e.title, e.date, e.is_published, e.conducted_at, e.recording_url, h.role,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) AS registrations,
                ${views('event', 'e.id')} AS views, ${clicks('event', 'e.id')} AS recording_clicks
         FROM event_hosts h JOIN events e ON e.id = h.event_id
         WHERE h.user_id = ? AND e.event_category = 'podcast'
         ORDER BY e.date DESC
         LIMIT ?`,
        [userId, limit],
    );
    const [eventWorkshops] = await pool.query(
        `SELECT e.id, e.title, e.date, e.is_published, e.conducted_at, e.recording_url, h.role,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) AS registrations,
                ${views('event', 'e.id')} AS views, ${clicks('event', 'e.id')} AS recording_clicks,
                'event' AS source
         FROM event_hosts h JOIN events e ON e.id = h.event_id
         WHERE h.user_id = ? AND e.event_category = 'workshop'
         ORDER BY e.date DESC
         LIMIT ?`,
        [userId, limit],
    );
    const [execWorkshops] = await pool.query(
        `SELECT w.id, w.title, w.date, w.is_published, w.conducted_at, w.recording_url, h.role,
                0 AS registrations,
                ${views('workshop', 'w.id')} AS views, ${clicks('workshop', 'w.id')} AS recording_clicks,
                'workshop' AS source
         FROM event_hosts h JOIN executive_workshops w ON w.id = h.workshop_id
         WHERE h.user_id = ?
         ORDER BY w.date DESC
         LIMIT ?`,
        [userId, limit],
    );
    const [blogs] = await pool.query(
        `SELECT b.id, b.title, b.slug, b.status, b.admin_notes, b.published_at, b.created_at,
                ${views('blog', 'b.id')} AS views
         FROM blog_posts b
         WHERE b.author_id = ?
         ORDER BY COALESCE(b.published_at, b.created_at) DESC
         LIMIT ?`,
        [userId, limit],
    );

    const inWindow = (d) => d && d >= window.start && d < window.end;
    const workshops = [...eventWorkshops, ...execWorkshops]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);

    return {
        quarter: window.label,
        posts: posts.map((p) => ({
            ...p,
            created_at: dbDate(p.created_at),
            is_hidden: Boolean(p.is_hidden),
            counted: Boolean(!p.is_hidden && COUNTED_POST_TYPES.includes(p.post_type) && inWindow(dbDate(p.created_at))),
        })),
        podcasts: podcasts.map((e) => ({
            ...e, date: dbDate(e.date), conducted_at: dbDate(e.conducted_at), is_published: Boolean(e.is_published),
            counted: Boolean(e.is_published && inWindow(dbDate(e.conducted_at))),
        })),
        workshops: workshops.map((w) => ({
            ...w, date: dbDate(w.date), conducted_at: dbDate(w.conducted_at), is_published: Boolean(w.is_published),
        })),
        blogs: blogs.map((b) => ({
            ...b, published_at: dbDate(b.published_at), created_at: dbDate(b.created_at),
            counted: Boolean(b.status === 'published' && inWindow(dbDate(b.published_at))),
        })),
    };
};

// ════════════════════════════════════════════════════════════════════════════
// HOST REQUESTS
// ════════════════════════════════════════════════════════════════════════════

export const notifyAdmins = async ({ type, title, body, data = {}, email = null }) => {
    try {
        const [admins] = await pool.query(
            `SELECT id, name, email FROM users WHERE role = 'founding_member' AND status = 'approved'`,
        );
        for (const a of admins) notifyUser(a.id, type, title, body, data);
        if (email) {
            if (process.env.ADMIN_EMAIL) {
                sendChapterLeadNoticeEmail({ email: process.env.ADMIN_EMAIL, ...email });
            } else {
                admins.forEach((a) => sendChapterLeadNoticeEmail({ name: a.name, email: a.email, ...email }));
            }
        }
    } catch (err) {
        console.error('[ChapterLead] notifyAdmins failed:', err.message);
    }
};

export const listRequests = async ({ leadUserId = null, status = null, limit = 200 } = {}) => {
    const where = [];
    const params = [];
    if (leadUserId) { where.push('hr.lead_user_id = ?'); params.push(leadUserId); }
    if (status) { where.push('hr.status = ?'); params.push(status); }
    const [rows] = await pool.query(
        `SELECT hr.*, u.name AS lead_name, p.referral_code, c.name AS chapter_name
         FROM host_requests hr
         JOIN users u ON u.id = hr.lead_user_id
         LEFT JOIN chapter_lead_profiles p ON p.user_id = hr.lead_user_id AND p.status = 'active'
         LEFT JOIN chapters c ON c.id = p.chapter_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY (hr.status = 'pending') DESC, hr.created_at DESC
         LIMIT ?`,
        [...params, limit],
    );
    return rows.map((r) => ({
        ...r, proposed_date: dbDate(r.proposed_date), reviewed_at: dbDate(r.reviewed_at), created_at: dbDate(r.created_at),
    }));
};

export const createRequest = async (userId, { type, title, description = null, proposedDate = null }) => {
    const [res] = await pool.query(
        `INSERT INTO host_requests (lead_user_id, type, title, description, proposed_date)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, type, title, description, proposedDate ? toSqlDateTime(new Date(proposedDate)) : null],
    );
    const [[lead]] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
    notifyAdmins({
        type: NOTIF_TYPES.LEAD_REQUEST_SUBMITTED,
        title: `New ${type} request`,
        body: `${lead?.name || 'A Chapter Lead'} asked to host: ${title}`,
        data: { url: '/admin-dashboard?tab=chapter_leads' },
    });
    return res.insertId;
};

export const cancelRequest = async (userId, requestId) => {
    const [res] = await pool.query(
        `UPDATE host_requests SET status = 'cancelled'
         WHERE id = ? AND lead_user_id = ? AND status = 'pending'`,
        [requestId, userId],
    );
    return res.affectedRows > 0;
};

/**
 * Admin decision on a request. Approving creates an unpublished draft event or
 * workshop owned by the lead (so the existing "lead edits own drafts, admin
 * publishes" flow applies) and registers the lead as its host.
 */
export const decideRequest = async (requestId, { status, adminNotes = null, adminId }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[req]] = await conn.query('SELECT * FROM host_requests WHERE id = ? FOR UPDATE', [requestId]);
        if (!req) { await conn.rollback(); return { error: 'Request not found.', code: 404 }; }
        if (req.status !== 'pending') { await conn.rollback(); return { error: 'This request has already been decided.', code: 409 }; }

        let eventId = null;
        let workshopId = null;
        if (status === 'approved') {
            const when = req.proposed_date ? dbDate(req.proposed_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            if (req.type === 'podcast') {
                const [r] = await conn.query(
                    `INSERT INTO events (title, date, description, event_category, is_upcoming, is_published, created_by, event_mode, time_zone)
                     VALUES (?, ?, ?, 'podcast', 1, 0, ?, 'online', 'UTC')`,
                    [req.title, toSqlDateTime(when), req.description, req.lead_user_id],
                );
                eventId = r.insertId;
                await conn.query(`INSERT INTO event_hosts (event_id, user_id, role) VALUES (?, ?, 'host')`, [eventId, req.lead_user_id]);
            } else {
                const [r] = await conn.query(
                    `INSERT INTO executive_workshops (title, date, description, is_published, is_upcoming, created_by)
                     VALUES (?, ?, ?, 0, 1, ?)`,
                    [req.title, toSqlDateTime(when), req.description, req.lead_user_id],
                );
                workshopId = r.insertId;
                await conn.query(`INSERT INTO event_hosts (workshop_id, user_id, role) VALUES (?, ?, 'host')`, [workshopId, req.lead_user_id]);
            }
        }

        await conn.query(
            `UPDATE host_requests
             SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(), event_id = ?, workshop_id = ?
             WHERE id = ?`,
            [status, adminNotes, adminId, eventId, workshopId, requestId],
        );
        await conn.commit();

        const approved = status === 'approved';
        notifyUser(
            req.lead_user_id,
            NOTIF_TYPES.LEAD_REQUEST_DECIDED,
            approved ? `Your ${req.type} request was approved` : `Your ${req.type} request was not approved`,
            approved
                ? `"${req.title}" has been created as a draft with you as host. Add the details and an admin will publish it.`
                : `"${req.title}" was not approved${adminNotes ? `: ${adminNotes}` : '.'}`,
            { url: approved ? (req.type === 'podcast' ? '/events' : '/executive-workshops') : dashboardTab('requests') },
        );
        return { ok: true, eventId, workshopId };
    } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
    } finally {
        conn.release();
    }
};

// ════════════════════════════════════════════════════════════════════════════
// HOSTS + "CONDUCTED"
// ════════════════════════════════════════════════════════════════════════════

export const getHosts = async ({ eventId = null, workshopId = null }) => {
    const [rows] = await pool.query(
        `SELECT h.user_id, h.role, u.name
         FROM event_hosts h JOIN users u ON u.id = h.user_id
         WHERE ${eventId ? 'h.event_id = ?' : 'h.workshop_id = ?'}
         ORDER BY h.id`,
        [eventId || workshopId],
    );
    return rows;
};

/** Replaces the host list of one event OR one workshop. `hosts` = [{ user_id, role }]. */
export const setHosts = async ({ eventId = null, workshopId = null, hosts = [] }) => {
    if ((eventId ? 1 : 0) + (workshopId ? 1 : 0) !== 1) {
        return { error: 'Provide exactly one of event or workshop.', code: 422 };
    }
    const clean = [];
    const seen = new Set();
    for (const h of hosts) {
        const uid = parseInt(h.user_id, 10);
        const role = ['host', 'co_host', 'speaker'].includes(h.role) ? h.role : 'host';
        if (uid && !seen.has(uid)) { seen.add(uid); clean.push({ uid, role }); }
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[target]] = eventId
            ? await conn.query('SELECT id FROM events WHERE id = ?', [eventId])
            : await conn.query('SELECT id FROM executive_workshops WHERE id = ?', [workshopId]);
        if (!target) { await conn.rollback(); return { error: 'Not found.', code: 404 }; }
        if (clean.length) {
            const [users] = await conn.query(`SELECT id FROM users WHERE id IN (?) AND status = 'approved'`, [clean.map((c) => c.uid)]);
            if (users.length !== clean.length) { await conn.rollback(); return { error: 'One or more hosts are not valid approved members.', code: 422 }; }
        }
        await conn.query(`DELETE FROM event_hosts WHERE ${eventId ? 'event_id' : 'workshop_id'} = ?`, [eventId || workshopId]);
        for (const c of clean) {
            await conn.query(
                `INSERT INTO event_hosts (event_id, workshop_id, user_id, role) VALUES (?, ?, ?, ?)`,
                [eventId, workshopId, c.uid, c.role],
            );
        }
        await conn.commit();
        return { ok: true };
    } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
    } finally {
        conn.release();
    }
};

/**
 * Marks a podcast / workshop as conducted (or clears it). The conducted date is
 * the scheduled event date unless the admin supplies the real day, so a recording
 * made on 30 Dec but marked on 2 Jan still lands in the right quarter.
 */
export const markConducted = async ({ type, id, conducted, conductedOn = null, adminId }) => {
    const table = type === 'workshop' ? 'executive_workshops' : 'events';
    const [[row]] = await pool.query(`SELECT id, date FROM ${table} WHERE id = ?`, [id]);
    if (!row) return { error: 'Not found.', code: 404 };

    if (!conducted) {
        await pool.query(`UPDATE ${table} SET conducted_at = NULL, conducted_by = NULL WHERE id = ?`, [id]);
        return { ok: true, conducted_at: null };
    }
    const when = conductedOn ? new Date(conductedOn) : dbDate(row.date);
    if (!when || Number.isNaN(when.getTime())) return { error: 'Invalid conducted date.', code: 422 };
    if (when.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        return { error: 'This session is scheduled in the future, so it cannot be marked as conducted yet.', code: 422 };
    }
    await pool.query(
        `UPDATE ${table} SET conducted_at = ?, conducted_by = ? WHERE id = ?`,
        [toSqlDateTime(when), adminId, id],
    );
    return { ok: true, conducted_at: when };
};

// ════════════════════════════════════════════════════════════════════════════
// QUARTER CLOSE
// ════════════════════════════════════════════════════════════════════════════

const ordinal = (n) => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
};

const insertQuarterRow = async (profile, window, { status, actuals, policy, evaluation, notes, reviewedBy }) => {
    try {
        await pool.query(
            `INSERT INTO chapter_lead_quarters
               (profile_id, quarter_start, quarter_end, status,
                members_actual, podcasts_actual, posts_actual, blogs_actual,
                members_target, podcasts_target, posts_min, posts_max, blogs_target,
                min_goals_met, goals_met, met, notes, reviewed_by, closed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [
                profile.id, window.startDate, window.endDate, status,
                actuals.members, actuals.podcasts, actuals.posts, actuals.blogs,
                policy.members_target, policy.podcasts_target, policy.posts_min, policy.posts_max, policy.blogs_target,
                policy.min_goals_met, evaluation.goalsMet, status === 'waived' ? null : (evaluation.met ? 1 : 0),
                notes, reviewedBy,
            ],
        );
        return true;
    } catch (err) {
        if (isDuplicate(err, 'uq_clq_profile_quarter')) return false; // another instance closed it first
        throw err;
    }
};

const closeQuarter = async (profile, user, window, { notify = true, waive = false, notes = null, reviewedBy = null } = {}) => {
    const policy = await getPolicyAt(window.start);
    const partial = isPartialQuarter(evalStartFor(profile), window);
    const status = (waive || partial) ? 'waived' : 'closed';
    const actuals = (await computeProgressBatch([profile.user_id], window)).get(profile.user_id);
    const evaluation = evaluateGoals(actuals, policy);
    const autoNote = notes || (partial ? 'Partial first quarter — not scored.' : null);

    const inserted = await insertQuarterRow(profile, window, { status, actuals, policy, evaluation, notes: autoNote, reviewedBy });
    if (!inserted || !notify) return { inserted, status, evaluation };

    const label = window.label;
    const link = { url: dashboardTab('history') };
    const total = GOAL_KEYS.length;

    if (status === 'waived') {
        notifyUser(profile.user_id, NOTIF_TYPES.LEAD_QUARTER_RESULT, `${label}: not scored`,
            `${label} was not scored for you${partial ? ' because you joined part-way through the quarter' : ''}. Your goals start counting from the next quarter.`, link);
        return { inserted, status, evaluation };
    }

    if (evaluation.met) {
        notifyUser(profile.user_id, NOTIF_TYPES.LEAD_QUARTER_RESULT, `${label}: goals met`,
            `You met ${evaluation.goalsMet} of ${total} goals (minimum ${policy.min_goals_met}). Well done.`, link);
        return { inserted, status, evaluation };
    }

    const history = await getQuarterHistory(profile.id);
    const misses = countConsecutiveMisses(history);
    const limit = Number(policy.consecutive_miss_limit);
    const detail = GOAL_KEYS.map((k) => `${GOAL_LABELS[k]}: ${actuals[k]}`).join(', ');
    const base = `You met ${evaluation.goalsMet} of ${total} goals; at least ${policy.min_goals_met} are needed. (${detail})`;

    let title; let text; let tone;
    if (misses >= limit) {
        title = `${label}: your Chapter Lead role is under review`;
        text = `${base}\n\nThis is your ${ordinal(misses)} consecutive quarter below the minimum, so your position will now be reviewed by our team. We will be in touch.`;
        tone = 'danger';
    } else if (misses === limit - 1) {
        title = `${label}: final warning`;
        text = `${base}\n\nThis is your ${ordinal(misses)} consecutive quarter below the minimum. Missing the next quarter as well will put your role under review.`;
        tone = 'warning';
    } else {
        title = `${label}: goals not met`;
        text = `${base}\n\nThis is your first quarter below the minimum. Open your dashboard to plan the next quarter.`;
        tone = 'warning';
    }

    notifyUser(profile.user_id, NOTIF_TYPES.LEAD_QUARTER_WARNING, title, text.split('\n')[0], link);
    sendChapterLeadNoticeEmail({
        name: user.name, email: user.email, subject: title, heading: title, tone,
        paragraphs: text.split('\n\n'), ctaLabel: 'Open my dashboard', ctaPath: dashboardTab('history'),
    });

    if (misses >= limit) {
        notifyAdmins({
            type: NOTIF_TYPES.LEAD_AT_RISK_ADMIN,
            title: `Chapter Lead needs review: ${user.name}`,
            body: `${user.name} has missed ${misses} consecutive quarters (latest: ${label}).`,
            data: { url: '/admin-dashboard?tab=chapter_leads' },
            email: {
                subject: `Chapter Lead review needed: ${user.name}`, heading: 'A Chapter Lead needs review', tone: 'danger',
                paragraphs: [`${user.name} has missed ${misses} consecutive quarters (latest: ${label}). Review their position in the Chapter Leads tab.`],
                ctaLabel: 'Open Chapter Leads', ctaPath: '/admin-dashboard?tab=chapter_leads',
            },
        });
    }
    return { inserted, status, evaluation, misses };
};

/**
 * Closes every finished quarter that has no result row yet, for every active lead.
 * Idempotent and self-healing: if the job was missed, the next run catches up
 * (notifying only for the most recent quarter to avoid spamming old news).
 */
export const closeDueQuarters = async (now = new Date()) => {
    const [rows] = await pool.query(
        `SELECT p.*, u.name AS user_name, u.email AS user_email
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.status = 'active' AND u.status = 'approved'`,
    );
    let closed = 0;
    for (const raw of rows) {
        const profile = normalizeProfile(raw);
        const user = { name: raw.user_name, email: raw.user_email };
        const windows = eligibleClosedQuarters(evalStartFor(profile), now);
        if (!windows.length) continue;
        const [existing] = await pool.query(
            `SELECT DATE_FORMAT(quarter_start, '%Y-%m-%d') AS qs FROM chapter_lead_quarters WHERE profile_id = ?`,
            [profile.id],
        );
        const have = new Set(existing.map((r) => r.qs));
        const todo = windows.filter((w) => !have.has(w.startDate));
        for (let i = 0; i < todo.length; i += 1) {
            const res = await closeQuarter(profile, user, todo[i], { notify: i === todo.length - 1 });
            if (res.inserted) closed += 1;
        }
    }
    return { profiles: rows.length, closed };
};

/** Admin: waive a finished quarter for one lead (creates the row, or converts an existing one). */
export const waiveQuarter = async (profileId, quarterStart, { notes = null, adminId = null } = {}) => {
    const profile = await getProfileById(profileId);
    if (!profile) return { error: 'Lead not found.', code: 404 };
    const window = quarterWindowFor(new Date(`${quarterStart}T00:00:00Z`));
    if (window.startDate !== quarterStart) return { error: 'quarter_start must be the first day of a quarter.', code: 422 };
    if (window.end > new Date()) return { error: 'That quarter has not finished yet.', code: 422 };

    const [res] = await pool.query(
        `UPDATE chapter_lead_quarters
         SET status = 'waived', met = NULL, notes = ?, reviewed_by = ?
         WHERE profile_id = ? AND quarter_start = ?`,
        [notes, adminId, profileId, quarterStart],
    );
    if (res.affectedRows > 0) return { ok: true, converted: true };

    const [[user]] = await pool.query('SELECT name, email FROM users WHERE id = ?', [profile.user_id]);
    const out = await closeQuarter(profile, user || {}, window, { notify: false, waive: true, notes: notes || 'Waived by an administrator.', reviewedBy: adminId });
    return { ok: out.inserted, converted: false };
};

// ════════════════════════════════════════════════════════════════════════════
// TERMS: auto-continue + nudges
// ════════════════════════════════════════════════════════════════════════════

/**
 * Rolls active leads into their next term when the current one has ended.
 * Terms continue automatically unless an admin ends the role.
 */
export const autoContinueTerms = async (now = new Date()) => {
    const [rows] = await pool.query(
        `SELECT p.*, u.membership_expires_at AS expires_at
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.status = 'active' AND u.status = 'approved'`,
    );
    const policy = await getPolicyAt(now);
    let rolled = 0;
    for (const raw of rows) {
        const profile = normalizeProfile(raw);
        const expiry = dbDate(raw.expires_at);
        if (expiry && expiry > now) continue;
        const info = getTermInfo(profile.term_started_at, now, policy);
        await pool.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [toSqlDateTime(info.termEnd), profile.user_id]);
        if (expiry && info.termNumber >= 2) {
            rolled += 1;
            notifyUser(
                profile.user_id, NOTIF_TYPES.LEAD_TERM_CHANGE,
                `Term ${info.termNumber} has begun`,
                `Your Chapter Lead term continues. Your revenue-share rate for this term is ${info.rate}%.`,
                { url: DASHBOARD_PATH },
            );
        }
    }
    return { rolled };
};

/** ~Two thirds through the quarter, nudge leads who are behind pace on any goal. */
export const sendMidQuarterNudges = async (now = new Date()) => {
    const window = quarterWindowFor(now);
    if (daysSinceWindowStart(window, now) !== 60) return { nudged: 0 };

    const [rows] = await pool.query(
        `SELECT p.* FROM chapter_lead_profiles p JOIN users u ON u.id = p.user_id
         WHERE p.status = 'active' AND u.status = 'approved'`,
    );
    const profiles = rows.map(normalizeProfile).filter((p) => !isPartialQuarter(evalStartFor(p), window));
    if (!profiles.length) return { nudged: 0 };

    const policy = await getPolicyAt(now);
    const progress = await computeProgressBatch(profiles.map((p) => p.user_id), window);
    let nudged = 0;
    for (const p of profiles) {
        const cards = buildGoalCards(progress.get(p.user_id), policy, window, now);
        const behind = cards.filter((c) => c.pace === 'behind');
        if (!behind.length) continue;
        nudged += 1;
        notifyUser(
            p.user_id, NOTIF_TYPES.LEAD_NUDGE,
            `${window.label}: ${daysLeftInWindow(window, now)} days left`,
            `You're behind pace on: ${behind.map((c) => `${c.label} (${c.counted}/${c.target})`).join(', ')}.`,
            { url: DASHBOARD_PATH },
        );
    }
    return { nudged };
};

export const runChapterLeadDaily = async (now = new Date()) => {
    const result = {};
    for (const [name, fn] of [['terms', autoContinueTerms], ['quarters', closeDueQuarters], ['nudges', sendMidQuarterNudges]]) {
        try { result[name] = await fn(now); } catch (err) {
            console.error(`[ChapterLead] ${name} step failed:`, err.message);
            result[name] = { error: err.message };
        }
    }
    return result;
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN: overview + detail + role end
// ════════════════════════════════════════════════════════════════════════════

export const listLeadsOverview = async ({ status = 'active' } = {}) => {
    const [rows] = await pool.query(
        `SELECT p.*, c.name AS chapter_name, c.country_code AS chapter_country,
                u.name AS user_name, u.email AS user_email, u.organization_name, u.status AS user_status,
                u.membership_expires_at AS expires_at
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN chapters c ON c.id = p.chapter_id
         ${status === 'all' ? '' : "WHERE p.status = 'active'"}
         ORDER BY (p.status = 'active') DESC, u.name ASC`,
    );
    if (!rows.length) return [];

    const now = new Date();
    const policy = await getPolicyAt(now);
    const window = quarterWindowFor(now);
    const activeIds = rows.filter((r) => r.status === 'active').map((r) => r.user_id);
    const progress = await computeProgressBatch(activeIds, window);

    const [qrows] = await pool.query(
        `SELECT profile_id, status, met FROM chapter_lead_quarters
         WHERE profile_id IN (?) ORDER BY quarter_start DESC`,
        [rows.map((r) => r.id)],
    );
    const byProfile = new Map();
    qrows.forEach((q) => {
        if (!byProfile.has(q.profile_id)) byProfile.set(q.profile_id, []);
        byProfile.get(q.profile_id).push({ status: q.status, met: Boolean(q.met) });
    });

    return rows.map((raw) => {
        const profile = normalizeProfile(raw);
        const active = raw.status === 'active';
        const term = getTermInfo(profile.term_started_at, active ? now : (profile.ended_at || now), policy);
        const misses = countConsecutiveMisses(byProfile.get(raw.id) || []);
        const actuals = progress.get(raw.user_id);
        const evaluation = actuals ? evaluateGoals(actuals, policy) : null;
        return {
            id: raw.id,
            user_id: raw.user_id,
            name: raw.user_name,
            email: raw.user_email,
            organization_name: raw.organization_name,
            status: raw.status,
            referral_code: raw.referral_code,
            chapter: raw.chapter_id ? { id: raw.chapter_id, name: raw.chapter_name, country_code: raw.chapter_country } : null,
            term_started_at: profile.term_started_at,
            ended_at: profile.ended_at,
            end_reason: raw.end_reason,
            term: { number: term.termNumber, rate: term.rate, ends: term.termEnd },
            membership_expires_at: dbDate(raw.expires_at),
            partial_quarter: active ? isPartialQuarter(evalStartFor(profile), window) : false,
            goals: actuals ? buildGoalCards(actuals, policy, window, now).map((g) => ({ key: g.key, label: g.label, actual: g.counted, target: g.target, pace: g.pace })) : [],
            goals_met: evaluation?.goalsMet ?? null,
            consecutive_misses: misses,
            standing: active ? standingFor(misses, policy) : 'ended',
        };
    });
};

export const getLeadDetail = async (profileId) => {
    const raw = await getProfileById(profileId);
    if (!raw) return null;
    const [[user]] = await pool.query(
        `SELECT id, name, email, organization_name, linkedin_url, country_code, status, membership_expires_at, created_at
         FROM users WHERE id = ?`,
        [raw.user_id],
    );
    const now = new Date();
    const policy = await getPolicyAt(now);
    const history = await getQuarterHistory(profileId);
    const referrals = await getReferralList(raw.user_id, 500);
    const requests = await listRequests({ leadUserId: raw.user_id });
    const window = quarterWindowFor(now);
    const active = raw.status === 'active';
    const progress = active ? (await computeProgressBatch([raw.user_id], window)).get(raw.user_id) : null;
    const term = getTermInfo(raw.term_started_at, active ? now : (raw.ended_at || now), policy);

    return {
        profile: {
            id: raw.id, user_id: raw.user_id, status: raw.status, referral_code: raw.referral_code,
            chapter_id: raw.chapter_id, chapter_name: raw.chapter_name, term_started_at: raw.term_started_at,
            ended_at: raw.ended_at, end_reason: raw.end_reason, created_at: raw.created_at,
        },
        user: user && { ...user, created_at: dbDate(user.created_at), membership_expires_at: dbDate(user.membership_expires_at) },
        term: { number: term.termNumber, rate: term.rate, starts: term.termStart, ends: term.termEnd },
        quarter: { label: window.label, partial: active ? isPartialQuarter(evalStartFor(raw), window) : false },
        goals: progress ? buildGoalCards(progress, policy, window, now) : [],
        quarters: history,
        standing: standingFor(countConsecutiveMisses(history), policy),
        consecutive_misses: countConsecutiveMisses(history),
        referrals,
        requests,
    };
};

/**
 * Admin ends a lead's role. The user goes back to Professional immediately
 * (the auth middleware re-reads the role on every request). The referral code
 * stops working for new signups; past referrals stay attributed.
 */
export const endLeadRole = async (profileId, { status = 'removed', reason = null, adminId }) => {
    const profile = await getProfileById(profileId);
    if (!profile) return { error: 'Lead not found.', code: 404 };
    if (profile.status !== 'active') return { error: 'This role has already ended.', code: 409 };

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await endChapterLead(conn, profile.user_id, { status, reason, adminId });
        await conn.query(
            `UPDATE users
             SET role = 'professional', membership_expires_at = ?,
                 professional_sub_type = COALESCE(professional_sub_type, 'working_professional')
             WHERE id = ?`,
            [toSqlDateTime(roleExpiry('professional')), profile.user_id],
        );
        await conn.commit();
    } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
    } finally {
        conn.release();
    }

    const [[user]] = await pool.query('SELECT name, email FROM users WHERE id = ?', [profile.user_id]);
    notifyUser(
        profile.user_id, NOTIF_TYPES.LEAD_ROLE_ENDED,
        'Your Chapter Lead role has ended',
        reason ? `Your Chapter Lead role has ended: ${reason}` : 'Your Chapter Lead role has ended. You remain a Professional member.',
        { url: '/user/dashboard' },
    );
    if (user?.email) {
        sendChapterLeadNoticeEmail({
            name: user.name, email: user.email, subject: 'Your Chapter Lead role has ended',
            heading: 'Your Chapter Lead role has ended', tone: 'warning',
            paragraphs: [
                reason ? `Your Chapter Lead role has ended. Reason: ${reason}` : 'Your Chapter Lead role has ended.',
                'You remain a Professional member and keep access to your account. Your referral code no longer accepts new sign-ups. If you have questions, please contact us.',
            ],
            ctaLabel: 'Contact us', ctaPath: '/contact',
        });
    }
    return { ok: true };
};

/** Admin edits: chapter and / or term start. Keeps the membership expiry in step with the term. */
export const updateLeadProfile = async (profileId, { chapterId, termStartedAt }) => {
    const profile = await getProfileById(profileId);
    if (!profile) return { error: 'Lead not found.', code: 404 };

    const sets = [];
    const params = [];
    if (chapterId !== undefined) { sets.push('chapter_id = ?'); params.push(chapterId || null); }
    if (termStartedAt) { sets.push('term_started_at = ?'); params.push(toSqlDateTime(new Date(termStartedAt))); }
    if (!sets.length) return { error: 'Nothing to update.', code: 422 };

    await pool.query(`UPDATE chapter_lead_profiles SET ${sets.join(', ')} WHERE id = ?`, [...params, profileId]);

    if (termStartedAt && profile.status === 'active') {
        const now = new Date();
        const policy = await getPolicyAt(now);
        const info = getTermInfo(new Date(termStartedAt), now, policy);
        await pool.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [toSqlDateTime(info.termEnd), profile.user_id]);
    }
    return { ok: true };
};

export const regenerateReferralCode = async (profileId) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
            const code = generateReferralCode();
            const [res] = await pool.query(
                `UPDATE chapter_lead_profiles SET referral_code = ? WHERE id = ? AND status = 'active'`,
                [code, profileId],
            );
            return res.affectedRows ? { ok: true, referral_code: code } : { error: 'Active lead not found.', code: 404 };
        } catch (err) {
            if (isDuplicate(err, 'uq_clp_referral_code')) continue;
            throw err;
        }
    }
    return { error: 'Could not generate a unique code.', code: 500 };
};

export const listLeadOptions = async () => {
    const [rows] = await pool.query(
        `SELECT p.user_id, u.name, c.name AS chapter_name
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN chapters c ON c.id = p.chapter_id
         WHERE p.status = 'active' AND u.status = 'approved'
         ORDER BY u.name`,
    );
    return rows;
};

export const getAdminSummary = async () => {
    const [[leads]] = await pool.query(`SELECT COUNT(*) AS n FROM chapter_lead_profiles WHERE status = 'active'`);
    const [[reqs]] = await pool.query(`SELECT COUNT(*) AS n FROM host_requests WHERE status = 'pending'`);
    const [[blogs]] = await pool.query(`SELECT COUNT(*) AS n FROM blog_posts WHERE status = 'pending'`);
    const overview = await listLeadsOverview({ status: 'active' });
    return {
        active_leads: Number(leads.n),
        pending_requests: Number(reqs.n),
        pending_blogs: Number(blogs.n),
        at_risk: overview.filter((l) => l.standing === 'at_risk' || l.standing === 'review').length,
        terms_changing_soon: overview.filter((l) => l.term.ends && (l.term.ends - Date.now()) < 60 * 24 * 60 * 60 * 1000).length,
    };
};

/** Leads whose current term ends within `days` — they roll into the next term (and rate) automatically. */
export const listTermChanges = async (days = 90) => {
    const overview = await listLeadsOverview({ status: 'active' });
    const policy = await getPolicyAt(new Date());
    return overview
        .filter((l) => l.term.ends && (l.term.ends - Date.now()) < days * 24 * 60 * 60 * 1000)
        .map((l) => {
            const next = getTermInfo(l.term_started_at, l.term.ends, policy);
            return {
                id: l.id, user_id: l.user_id, name: l.name, chapter: l.chapter,
                current_term: l.term.number, current_rate: l.term.rate,
                term_ends: l.term.ends, next_term: next.termNumber, next_rate: next.rate,
            };
        })
        .sort((a, b) => a.term_ends - b.term_ends);
};

