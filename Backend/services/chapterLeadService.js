/**
 * chapterLeadService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Database-aware logic for the Chapter programme (Chapter Leads and Chapter Ambassadors).
 *
 *   • Promotion / demotion  — the ONE place that puts someone on a chapter team
 *     (profile, tier, person-level referral code, term, expiry) or ends that role.
 *   • Referrals             — attach at signup, qualify on approval, void.
 *   • Progress              — live goal counts for a quarter window.
 *   • Quarter close         — snapshot results, escalate misses, notify.
 *   • Term auto-continue    — rolls a member into the next 18-month term.
 *   • Admin overview        — team members with progress and standing.
 *
 * Two tiers share one role (`council_member`): a lead (one per chapter, approves
 * ambassadors, may earn) and ambassadors (many, volunteer). The tier lives on the
 * profile row. Applications, approvals and public pages are in chapterTeamService.js;
 * who-gets-told-what is in chapterNotices.js.
 *
 * Pure maths (terms, quarter windows, goal evaluation) lives in
 * utils/chapterLeadRules.js. All dates are UTC; see dbDate() there.
 *
 * Revenue / earnings amounts are intentionally absent — they arrive with the payment
 * gateway in a later phase. The election to receive or waive them is recorded
 * (earnings_elections) so it is already on file when payments start.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    DEFAULT_POLICY, COUNTED_POST_TYPES, POLICY_VERSION, TIERS,
    generateReferralCode, normalizeReferralCode,
    getTermInfo, quarterWindowFor, eligibleClosedQuarters, isPartialQuarter, evalStartFor,
    evaluateGoals, buildGoalCards, countConsecutiveMisses, standingFor,
    daysLeftInWindow, daysSinceWindowStart, toSqlDateTime, toSqlDate, dbDate, GOAL_KEYS, GOAL_LABELS,
    withTiers, policyForTier, tierOf, tierLabel,
} from '../utils/chapterLeadRules.js';
import { earningsGateOn } from '../utils/featureFlags.js';
import { notifyUser, NOTIF_TYPES } from './notificationService.js';
import { sendChapterLeadNoticeEmail } from './emailService.js';
import {
    notifyAdmins, notifyChapterLead, getChapterLead, notifyVacancyIfNeeded, sendVacancyReminders,
} from './chapterNotices.js';
import { recordAudit } from './auditService.js';

export { notifyAdmins };

// The Chapter programme lives inside the one member dashboard; ?tab= opens a specific tab.
const DASHBOARD_PATH = '/user/dashboard';
const dashboardTab = (tab) => `${DASHBOARD_PATH}?tab=${tab}`;

export const isDuplicate = (err, key) =>
    err?.code === 'ER_DUP_ENTRY' && (!key || String(err.sqlMessage || '').includes(key));

/** An expected, user-facing failure. The global error handler turns it into `{ success: false, message }`. */
export const teamError = (status, message, code = null) => Object.assign(new Error(message), { status, code });

// A database that is behind the code (migration not applied yet) answers with these. Reads that have a
// sensible older behaviour use it to degrade instead of failing.
export const isMissingSchema = (err) => err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR';

const LEAD_SEAT_TAKEN = 'That chapter already has an active Chapter Lead.';

// ════════════════════════════════════════════════════════════════════════════
// POLICY
// ════════════════════════════════════════════════════════════════════════════

/** The policy in force on `at` (latest row with effective_from <= at), with per-tier goals and seat caps. */
export const getPolicyAt = async (at = new Date(), conn = pool) => {
    const [rows] = await conn.query(
        'SELECT * FROM chapter_lead_policy WHERE effective_from <= ? ORDER BY effective_from DESC LIMIT 1',
        [toSqlDate(at)],
    );
    const policy = rows[0];
    if (!policy) return DEFAULT_POLICY;
    let targets = [];
    try {
        [targets] = await conn.query('SELECT * FROM chapter_lead_policy_targets WHERE policy_id = ?', [policy.id]);
    } catch (err) {
        if (!isMissingSchema(err)) throw err;   // migration 0022 not applied: use the policy row / defaults
    }
    return withTiers(policy, targets);
};

export const getPolicyHistory = async () => {
    const [rows] = await pool.query(
        `SELECT p.*, DATE_FORMAT(p.effective_from, '%Y-%m-%d') AS effective_from_str, u.name AS created_by_name
         FROM chapter_lead_policy p LEFT JOIN users u ON u.id = p.created_by
         ORDER BY p.effective_from DESC`,
    );
    let targets = [];
    try {
        [targets] = await pool.query('SELECT * FROM chapter_lead_policy_targets');
    } catch (err) {
        if (!isMissingSchema(err)) throw err;
    }
    return rows.map((r) => withTiers(
        { ...r, effective_from: r.effective_from_str },
        targets.filter((t) => t.policy_id === r.id),
    ));
};

const goalTargets = (t) => ({
    members: Number(t.members_target),
    podcasts: Number(t.podcasts_target),
    posts_min: Number(t.posts_min),
    posts_max: Number(t.posts_max),
    blogs: Number(t.blogs_target),
});

/** Public-safe summary used by the application form, Terms and the dashboard. */
export const publicPolicyFrom = (p) => ({
    policy_version: POLICY_VERSION,
    // The lead's goals stay at the top level exactly as before; each tier is also listed in `tiers`.
    targets: goalTargets(p.tiers.lead),
    min_goals_met: Number(p.tiers.lead.min_goals_met),
    consecutive_miss_limit: Number(p.consecutive_miss_limit),
    term_months: Number(p.term_months),
    rates: {
        term1: Number(p.rate_term1),
        term2: Number(p.rate_term2),
        term3: Number(p.rate_term3),
        direct_commission: Number(p.direct_commission_pct),
    },
    tiers: Object.fromEntries(Object.keys(p.tiers).map((tier) => [tier, {
        label: tierLabel(tier),
        targets: goalTargets(p.tiers[tier]),
        min_goals_met: Number(p.tiers[tier].min_goals_met),
        seat_cap: p.tiers[tier].seat_cap,
    }])),
});

export const getPublicPolicy = async () => publicPolicyFrom(await getPolicyAt(new Date()));

// ════════════════════════════════════════════════════════════════════════════
// PROFILES
// ════════════════════════════════════════════════════════════════════════════

// The referral code belongs to the PERSON (users.referral_code); the old per-stint column is only a fallback.
const PROFILE_SELECT = `
    SELECT p.id, p.user_id, p.tier_code, p.chapter_id, p.status, p.term_started_at, p.ended_at, p.end_reason,
           p.end_code, p.ended_by, p.approved_by, p.approved_at, p.predecessor_profile_id, p.created_at, p.updated_at,
           COALESCE(u.referral_code, p.referral_code) AS referral_code,
           c.name AS chapter_name, c.country_code AS chapter_country, c.slug AS chapter_slug
    FROM chapter_lead_profiles p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN chapters c ON c.id = p.chapter_id`;

const normalizeProfile = (row) => row && ({
    ...row,
    tier: tierOf(row.tier_code),
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

/**
 * Returns a person's referral code, creating it once if they have none. The code never changes
 * across ambassador -> lead, so links people already shared keep working. An earlier stint's code is
 * reused when there is one.
 */
export const ensureReferralCode = async (conn, userId) => {
    const [[u]] = await conn.query('SELECT referral_code FROM users WHERE id = ?', [userId]);
    if (u?.referral_code) return u.referral_code;

    const [[legacy]] = await conn.query(
        `SELECT referral_code FROM chapter_lead_profiles
         WHERE user_id = ? AND referral_code IS NOT NULL
         ORDER BY (status = 'active') DESC, id DESC LIMIT 1`,
        [userId],
    );
    const candidates = legacy?.referral_code ? [legacy.referral_code] : [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = candidates.shift() || generateReferralCode();
        try {
            await conn.query('UPDATE users SET referral_code = ? WHERE id = ? AND referral_code IS NULL', [code, userId]);
            const [[again]] = await conn.query('SELECT referral_code FROM users WHERE id = ?', [userId]);
            return again.referral_code;
        } catch (err) {
            if (isDuplicate(err, 'uq_users_referral_code')) continue;   // astronomically rare: regenerate
            throw err;
        }
    }
    throw new Error('Could not generate a unique referral code.');
};

/**
 * Copies codes that only exist on a profile (created by the previous version of the app) onto the person.
 * Idempotent; runs at start-up and in the daily job, so a deploy never leaves a working code unusable.
 */
export const healReferralCodes = async () => {
    try {
        const [res] = await pool.query(
            `UPDATE users u
             JOIN (
               SELECT user_id,
                      SUBSTRING_INDEX(GROUP_CONCAT(referral_code ORDER BY (status = 'active') DESC, id DESC SEPARATOR ','), ',', 1) AS code
               FROM chapter_lead_profiles WHERE referral_code IS NOT NULL GROUP BY user_id
             ) x ON x.user_id = u.id
             SET u.referral_code = x.code
             WHERE u.referral_code IS NULL`,
        );
        return res.affectedRows;
    } catch (err) {
        if (!isMissingSchema(err)) console.error('[Chapter] healReferralCodes failed:', err.message);
        return 0;
    }
};

/** The active team member behind a referral code, or null. Only the person's own code is looked up. */
export const findActiveProfileByCode = async (rawCode, conn = pool) => {
    const code = normalizeReferralCode(rawCode);
    if (!code) return null;
    const [rows] = await conn.query(
        `SELECT p.id, p.user_id, p.tier_code, p.chapter_id, u.referral_code AS referral_code, u.name AS lead_name
         FROM users u
         JOIN chapter_lead_profiles p ON p.active_user_id = u.id
         WHERE u.referral_code = ? AND u.status = 'approved'
         LIMIT 1`,
        [code],
    );
    return rows[0] || null;
};

// ── Seats ────────────────────────────────────────────────────────────────────

/** Who is on a chapter's team right now, and how many ambassador seats are left. */
export const getChapterCapacity = async (chapterId, db = pool, policy = null) => {
    const p = policy || await getPolicyAt(new Date(), db);
    const [[row]] = await db.query(
        `SELECT
           (SELECT COUNT(*) FROM chapter_lead_profiles x
              WHERE x.chapter_id = ? AND x.status = 'active' AND x.tier_code = 'ambassador') AS ambassadors,
           (SELECT COUNT(*) FROM chapter_lead_profiles x WHERE x.active_chapter_id = ?) AS leads`,
        [chapterId, chapterId],
    );
    const cap = p.tiers.ambassador.seat_cap;
    const ambassadors = Number(row.ambassadors);
    return {
        ambassadors,
        has_lead: Number(row.leads) > 0,
        seat_cap: cap,
        seats_left: cap === null ? null : Math.max(0, cap - ambassadors),
        full: cap !== null && ambassadors >= cap,
    };
};

/**
 * Throws if the chapter has no free ambassador seat. Locks the chapter row first, so two approvals
 * arriving together cannot both take the last seat. Must run inside the caller's transaction.
 */
export const assertAmbassadorSeat = async (conn, chapterId, { overrideCap = false, excludeUserId = null } = {}) => {
    const [[chapter]] = await conn.query(`SELECT id FROM chapters WHERE id = ? AND status = 'active' FOR UPDATE`, [chapterId]);
    if (!chapter) throw teamError(422, 'Chapter not found or inactive.');
    if (overrideCap) return;

    const cap = (await getPolicyAt(new Date(), conn)).tiers.ambassador.seat_cap;
    if (cap === null) return;
    const [[{ n }]] = await conn.query(
        `SELECT COUNT(*) AS n FROM chapter_lead_profiles
         WHERE chapter_id = ? AND status = 'active' AND tier_code = 'ambassador'${excludeUserId ? ' AND user_id <> ?' : ''}`,
        excludeUserId ? [chapterId, excludeUserId] : [chapterId],
    );
    if (Number(n) >= cap) {
        throw teamError(409, `This chapter already has its maximum of ${cap} ambassadors. An administrator can raise the limit, or approve this one anyway.`, 'CHAPTER_FULL');
    }
};

// Runs a write that can hit the one-lead-per-chapter index and reports it as a plain 409.
const guardLeadSeat = async (run) => {
    try {
        return await run();
    } catch (err) {
        if (isDuplicate(err, 'uq_clp_one_active_per_chapter')) throw teamError(409, LEAD_SEAT_TAKEN, 'LEAD_SEAT_TAKEN');
        throw err;
    }
};

// ── Becoming / ending a team member ──────────────────────────────────────────

/** Ends the active stint (does NOT change the user's role — callers do that). */
export const endActiveProfile = async (conn, userId, { status = 'removed', reason = null, adminId = null, endCode = null } = {}) => {
    const [[active]] = await conn.query(
        `SELECT id, tier_code, chapter_id FROM chapter_lead_profiles WHERE user_id = ? AND status = 'active' LIMIT 1`,
        [userId],
    );
    if (!active) return { ended: false };
    await conn.query(
        `UPDATE chapter_lead_profiles
         SET status = ?, ended_at = UTC_TIMESTAMP(), end_reason = ?, end_code = ?, ended_by = ?
         WHERE id = ?`,
        [status, reason ? String(reason).slice(0, 500) : null, endCode, adminId, active.id],
    );
    return { ended: true, profileId: active.id, tier: tierOf(active.tier_code), chapterId: active.chapter_id };
};

export const endChapterLead = async (conn, userId, opts = {}) => (await endActiveProfile(conn, userId, opts)).ended;

/**
 * Puts `userId` on a chapter team. Idempotent: an existing active profile of the same tier is kept
 * (and moved to `chapterId` when one is given). Sets role and the membership expiry to the end of
 * the current term.
 *
 * Changing tier (promotion or demotion) ends the current stint and opens a new one linked to it, so
 * quarter history and the term clock always belong to exactly one tier. A promotion starts a new
 * term clock; a demotion keeps the member's tenure.
 *
 * Throws a teamError (409) when the chapter's lead seat is taken or its ambassador seats are full
 * (unless `overrideCap`, which only administrators pass). The returned profile carries
 * `vacatedChapterId` when this change emptied a lead seat, so callers can raise the alert.
 */
export const activateChapterLead = async (conn, userId, {
    chapterId = null, termStartedAt = null, tier = TIERS.LEAD, approvedBy = null, overrideCap = false,
} = {}) => {
    const now = new Date();
    const policy = await getPolicyAt(now, conn);
    const wantedTier = tierOf(tier);
    let profile = await getActiveProfile(userId, conn);
    let predecessor = null;
    let vacatedChapterId = null;
    let targetChapterId = chapterId === '' ? null : chapterId;
    let start = termStartedAt ? new Date(termStartedAt) : null;

    if (profile && profile.tier !== wantedTier) {
        const promoting = wantedTier === TIERS.LEAD;
        const ended = await endActiveProfile(conn, userId, {
            status: 'ended',
            reason: promoting ? 'Promoted to Chapter Lead' : 'Moved to Chapter Ambassador',
            adminId: approvedBy,
            endCode: promoting ? 'promoted' : 'demoted',
        });
        if (ended.tier === TIERS.LEAD) vacatedChapterId = ended.chapterId;
        predecessor = profile;
        if (targetChapterId === null || targetChapterId === undefined) targetChapterId = profile.chapter_id;
        if (!start && !promoting) start = profile.term_started_at;
        profile = null;
    }

    if (!profile) {
        if (wantedTier === TIERS.AMBASSADOR) {
            if (!targetChapterId) throw teamError(422, 'An ambassador must belong to a chapter.');
            await assertAmbassadorSeat(conn, targetChapterId, { overrideCap });
        }
        await guardLeadSeat(() => conn.query(
            `INSERT INTO chapter_lead_profiles
               (user_id, tier_code, chapter_id, status, term_started_at, approved_by, approved_at, predecessor_profile_id)
             VALUES (?, ?, ?, 'active', ?, ?, UTC_TIMESTAMP(), ?)`,
            [userId, wantedTier, targetChapterId || null, toSqlDateTime(start || now), approvedBy, predecessor ? predecessor.id : null],
        ));
    } else if (targetChapterId !== null && targetChapterId !== undefined && Number(targetChapterId) !== Number(profile.chapter_id)) {
        if (wantedTier === TIERS.AMBASSADOR) await assertAmbassadorSeat(conn, targetChapterId, { overrideCap, excludeUserId: userId });
        if (profile.tier === TIERS.LEAD && profile.chapter_id) vacatedChapterId = profile.chapter_id;
        await guardLeadSeat(() => conn.query('UPDATE chapter_lead_profiles SET chapter_id = ? WHERE id = ?', [targetChapterId, profile.id]));
    }

    await ensureReferralCode(conn, userId);
    profile = await getActiveProfile(userId, conn);

    const info = getTermInfo(profile.term_started_at, now, policy);
    await conn.query(
        `UPDATE users SET role = 'council_member', membership_expires_at = ? WHERE id = ?`,
        [toSqlDateTime(info.termEnd), userId],
    );
    profile.vacatedChapterId = vacatedChapterId;
    return profile;
};

/** Membership expiry for non-team roles (unchanged from the previous behaviour). */
export const roleExpiry = (role) => {
    const years = role === 'founding_member' ? 5 : 1;
    return new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000);
};

/**
 * Single entry point used by every admin path that changes a user's role.
 * `approved` mirrors the previous behaviour: only approved accounts get an expiry.
 * Returns { profile, vacatedChapterId }: the caller raises the vacancy alert AFTER its commit.
 */
export const applyRole = async (conn, userId, newRole, {
    adminId = null, chapterId = null, termStartedAt = null, approved = true, tier = TIERS.LEAD, overrideCap = false,
} = {}) => {
    const [[current]] = await conn.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!current) return { profile: null, vacatedChapterId: null };

    if (newRole === 'council_member') {
        await conn.query('UPDATE users SET role = ? WHERE id = ?', ['council_member', userId]);
        if (approved) {
            const profile = await activateChapterLead(conn, userId, { chapterId, termStartedAt, tier, approvedBy: adminId, overrideCap });
            return { profile, vacatedChapterId: profile.vacatedChapterId };
        }
        await conn.query('UPDATE users SET membership_expires_at = NULL WHERE id = ?', [userId]);
        return { profile: null, vacatedChapterId: null };
    }

    let vacatedChapterId = null;
    if (current.role === 'council_member') {
        const ended = await endActiveProfile(conn, userId, {
            status: 'removed', reason: 'Role changed by an administrator', adminId, endCode: 'removed_by_admin',
        });
        if (ended.ended && ended.tier === TIERS.LEAD) vacatedChapterId = ended.chapterId;
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
    return { profile: null, vacatedChapterId };
};

/**
 * Safety net used at login: if an active member's expiry has passed (e.g. the
 * daily job was missed), roll them into the next term instead of locking them out.
 * Returns the (possibly new) expiry, or null when the user is not an active team member.
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

/** Active team members must have accepted the CURRENT policy version (both documents). */
export const needsPolicyAcceptance = async (userId, role) => {
    if (role !== 'council_member') return false;
    const [[row]] = await pool.query(
        'SELECT COUNT(*) AS n FROM policy_acceptances WHERE user_id = ? AND version = ?',
        [userId, POLICY_VERSION],
    );
    return Number(row.n) < 2;
};

// ════════════════════════════════════════════════════════════════════════════
// EARNINGS ELECTION (read side; the writer is earningsElectionService.js)
// ════════════════════════════════════════════════════════════════════════════

const NOT_CHOSEN = Object.freeze({ choice: 'not_chosen', employer_confirmed: false, effective_from: null, pending: null });

/**
 * The election in force on `at` for each profile: the latest row with effective_from <= at
 * (a 'reset' counts as not chosen), plus the next change if one is already scheduled.
 * Returns Map<profileId, { choice: 'receive'|'waive'|'not_chosen', employer_confirmed, effective_from, pending }>.
 */
export const getEarningsStates = async (profileIds, at = new Date(), db = pool) => {
    const out = new Map(profileIds.map((id) => [id, { ...NOT_CHOSEN }]));
    if (!profileIds.length) return out;
    const day = toSqlDate(at);
    const latest = (cmp) => `
        SELECT profile_id, choice, employer_confirmed, DATE_FORMAT(effective_from, '%Y-%m-%d') AS effective_from
        FROM (SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.profile_id ORDER BY e.effective_from DESC, e.id DESC) AS rn
              FROM earnings_elections e WHERE e.profile_id IN (?) AND e.effective_from ${cmp} ?) t
        WHERE t.rn = 1`;
    try {
        const [current] = await db.query(latest('<='), [profileIds, day]);
        current.forEach((r) => out.set(r.profile_id, {
            choice: r.choice === 'reset' ? 'not_chosen' : r.choice,
            employer_confirmed: Boolean(r.employer_confirmed),
            effective_from: r.effective_from,
            pending: null,
        }));
        const [future] = await db.query(latest('>'), [profileIds, day]);
        future.forEach((r) => {
            const s = out.get(r.profile_id);
            if (s) s.pending = { choice: r.choice === 'reset' ? 'not_chosen' : r.choice, effective_from: r.effective_from };
        });
    } catch (err) {
        if (!isMissingSchema(err)) throw err;   // migration 0022 not applied: nobody has chosen yet
    }
    return out;
};

export const getEarningsState = async (profileId, at = new Date(), db = pool) =>
    (await getEarningsStates([profileId], at, db)).get(profileId);

/** Only a lead who chose "receive" earns. Ambassadors never do. */
export const earnsFrom = (tier, state) => tierOf(tier) === TIERS.LEAD && state?.choice === 'receive';

// ════════════════════════════════════════════════════════════════════════════
// REFERRALS
// ════════════════════════════════════════════════════════════════════════════

/** Records who referred a new user. Returns the referrer's profile row, or null if the code is not usable. */
export const attachReferral = async (conn, { referredUserId, code }) => {
    const lead = await findActiveProfileByCode(code, conn);
    if (!lead || lead.user_id === referredUserId) return null;
    await conn.query(
        `INSERT IGNORE INTO referrals (referred_user_id, lead_user_id, code_used, status, referrer_profile_id)
         VALUES (?, ?, ?, 'pending', ?)`,
        [referredUserId, lead.user_id, lead.referral_code, lead.id],
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
 * Goal counts for several people at once. Returns Map<userId, {members, podcasts, posts, blogs,
 * workshops, members_personal, members_team}>. `workshops` is informational (not a goal).
 *
 * A LEAD's member goal counts the whole chapter team (their own sign-ups plus every ambassador's,
 * via referrals.referrer_profile_id); `members_personal` / `members_team` give the split.
 * An ambassador's member goal is their own sign-ups.
 */
export const computeProgressBatch = async (userIds, window, conn = pool) => {
    const out = new Map(userIds.map((id) => [id, {
        members: 0, podcasts: 0, posts: 0, blogs: 0, workshops: 0, members_personal: 0, members_team: 0,
    }]));
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
        row.members_personal = row.members;
        row.workshops = (wsA.get(id) || 0) + (wsB.get(id) || 0);
    }

    // Leads: the member goal is the chapter team's total.
    const [leadSeats] = await conn.query(
        `SELECT user_id, chapter_id FROM chapter_lead_profiles
         WHERE status = 'active' AND tier_code = 'lead' AND chapter_id IS NOT NULL AND user_id IN (?)`,
        [userIds],
    );
    if (leadSeats.length) {
        const chapterIds = [...new Set(leadSeats.map((s) => s.chapter_id))];
        const [teamRows] = await conn.query(
            `SELECT p.chapter_id AS cid, COUNT(*) AS n
             FROM referrals r
             JOIN chapter_lead_profiles p ON p.id = r.referrer_profile_id
             JOIN users u ON u.id = r.referred_user_id
             WHERE p.chapter_id IN (?) AND r.status = 'qualified' AND u.status = 'approved'
               AND r.qualified_at >= ? AND r.qualified_at < ?
             GROUP BY p.chapter_id`,
            [chapterIds, startStr, endStr],
        );
        const byChapter = toCountMap(teamRows, 'cid');
        for (const seat of leadSeats) {
            const row = out.get(seat.user_id);
            const total = Math.max(byChapter.get(seat.chapter_id) || 0, row.members_personal);
            row.members = total;
            row.members_team = total - row.members_personal;
        }
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
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

/** Goal cards for one person, with the lead's member-goal split attached. */
const goalCardsFor = (tier, progress, policy, window, now) => {
    const cards = buildGoalCards(progress, policy, window, now);
    if (tier === TIERS.LEAD) {
        const members = cards.find((c) => c.key === 'members');
        if (members) members.breakdown = { you: progress.members_personal, team: progress.members_team };
    }
    return cards;
};

export const buildDashboard = async (userId) => {
    const profile = await getActiveProfile(userId);
    if (!profile) return null;
    if (!profile.referral_code) {
        try { profile.referral_code = await ensureReferralCode(pool, userId); } catch (err) {
            console.error('[Chapter] Could not create a referral code:', err.message);
        }
    }

    const tier = profile.tier;
    const isLead = tier === TIERS.LEAD;
    const now = new Date();
    const fullPolicy = await getPolicyAt(now);
    const policy = policyForTier(fullPolicy, tier);
    const window = quarterWindowFor(now);
    const progress = (await computeProgressBatch([userId], window)).get(userId);
    const term = getTermInfo(profile.term_started_at, now, fullPolicy);
    const evalStart = evalStartFor(profile);
    const partial = isPartialQuarter(evalStart, window);

    const history = await getQuarterHistory(profile.id);
    const misses = countConsecutiveMisses(history);
    const evaluation = evaluateGoals(progress, policy);
    const nextTerm = getTermInfo(profile.term_started_at, term.termEnd, fullPolicy);
    const election = await getEarningsState(profile.id, now);

    let team = null;
    if (profile.chapter_id) {
        if (isLead) {
            const capacity = await getChapterCapacity(profile.chapter_id, pool, fullPolicy);
            const [[pending]] = await pool.query(
                `SELECT COUNT(*) AS n FROM membership_applications
                 WHERE requested_chapter_id = ? AND status = 'pending' AND requested_tier = 'ambassador'`,
                [profile.chapter_id],
            );
            team = {
                ambassadors: capacity.ambassadors,
                seat_cap: capacity.seat_cap,
                seats_left: capacity.seats_left,
                pending_applications: Number(pending.n),
            };
        } else {
            const lead = await getChapterLead(profile.chapter_id);
            team = { lead: lead ? { name: lead.name } : null };
        }
    }

    return {
        profile: {
            id: profile.id,
            tier,
            tier_label: tierLabel(tier),
            referral_code: profile.referral_code,
            chapter: profile.chapter_id
                ? { id: profile.chapter_id, name: profile.chapter_name, country_code: profile.chapter_country, slug: profile.chapter_slug }
                : null,
            term_started_at: profile.term_started_at,
        },
        term: {
            number: term.termNumber,
            // Revenue share is a lead's entitlement; ambassadors have none to show.
            rate: isLead ? term.rate : null,
            starts: term.termStart,
            ends: term.termEnd,
            months: term.termMonths,
            next_rate: isLead ? nextTerm.rate : null,
        },
        quarter: {
            label: window.label,
            start: window.start,
            end: window.end,
            days_left: daysLeftInWindow(window, now),
            partial, // true => this quarter is not scored (joined part-way through)
        },
        goals: goalCardsFor(tier, progress, policy, window, now),
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
        // Leads only. Amounts arrive with the payment gateway; for now the dashboard shows the rules
        // and whether the lead has chosen to receive or waive them.
        earnings: isLead ? {
            election,
            gate_on: earningsGateOn(),
            current_rate: term.rate,
            direct_commission: Number(fullPolicy.direct_commission_pct),
            rates: { term1: Number(fullPolicy.rate_term1), term2: Number(fullPolicy.rate_term2), term3: Number(fullPolicy.rate_term3) },
        } : null,
        team,
        policy: publicPolicyFrom(fullPolicy),
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

export const listRequests = async ({ leadUserId = null, status = null, limit = 200 } = {}) => {
    const where = [];
    const params = [];
    if (leadUserId) { where.push('hr.lead_user_id = ?'); params.push(leadUserId); }
    if (status) { where.push('hr.status = ?'); params.push(status); }
    const [rows] = await pool.query(
        `SELECT hr.*, u.name AS lead_name, COALESCE(u.referral_code, p.referral_code) AS referral_code,
                p.tier_code, c.name AS chapter_name
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
        ...r, tier: tierOf(r.tier_code),
        proposed_date: dbDate(r.proposed_date), reviewed_at: dbDate(r.reviewed_at), created_at: dbDate(r.created_at),
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
        body: `${lead?.name || 'A chapter team member'} asked to host: ${title}`,
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
 * workshop owned by the requester (so the existing "team member edits own drafts, admin
 * publishes" flow applies) and registers them as its host.
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
    const tier = profile.tier || tierOf(profile.tier_code);
    const role = tierLabel(tier);
    const policy = policyForTier(await getPolicyAt(window.start), tier);
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
    const reviewer = tier === TIERS.AMBASSADOR ? 'your Chapter Lead' : 'our team';

    let title; let text; let tone;
    if (misses >= limit) {
        title = `${label}: your ${role} role is under review`;
        text = `${base}\n\nThis is your ${ordinal(misses)} consecutive quarter below the minimum, so your position will now be reviewed by ${reviewer}. We will be in touch.`;
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
        const review = {
            type: NOTIF_TYPES.LEAD_AT_RISK_ADMIN,
            title: `${role} needs review: ${user.name}`,
            body: `${user.name} has missed ${misses} consecutive quarters (latest: ${label}).`,
            data: { url: '/admin-dashboard?tab=chapter_leads' },
            email: {
                subject: `${role} review needed: ${user.name}`, heading: `A ${role} needs review`, tone: 'danger',
                paragraphs: [`${user.name} has missed ${misses} consecutive quarters (latest: ${label}). Review their position in the Chapter Leads tab.`],
                ctaLabel: 'Open Chapter Leads', ctaPath: '/admin-dashboard?tab=chapter_leads',
            },
        };
        if (tier === TIERS.AMBASSADOR) {
            // An ambassador's review goes to their chapter's lead; admins hear about it only if the seat is empty.
            const told = await notifyChapterLead(profile.chapter_id, {
                ...review,
                data: { url: dashboardTab('team') },
                email: { ...review.email, paragraphs: [`${user.name} has missed ${misses} consecutive quarters (latest: ${label}). You can review their position in the My team tab.`], ctaLabel: 'Open My team', ctaPath: dashboardTab('team') },
            });
            if (!told) notifyAdmins(review);
        } else {
            notifyAdmins(review);
        }
    }
    return { inserted, status, evaluation, misses };
};

/**
 * Closes every finished quarter that has no result row yet, for every active team member.
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

/** Admin: waive a finished quarter for one member (creates the row, or converts an existing one). */
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
 * Rolls active team members into their next term when the current one has ended.
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
    const states = await getEarningsStates(rows.map((r) => r.id), now);
    let rolled = 0;
    for (const raw of rows) {
        const profile = normalizeProfile(raw);
        const expiry = dbDate(raw.expires_at);
        if (expiry && expiry > now) continue;
        const info = getTermInfo(profile.term_started_at, now, policy);
        await pool.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [toSqlDateTime(info.termEnd), profile.user_id]);
        if (expiry && info.termNumber >= 2) {
            rolled += 1;
            const earns = earnsFrom(profile.tier, states.get(profile.id));
            notifyUser(
                profile.user_id, NOTIF_TYPES.LEAD_TERM_CHANGE,
                `Term ${info.termNumber} has begun`,
                earns
                    ? `Your ${tierLabel(profile.tier)} term continues. Your revenue-share rate for this term is ${info.rate}%.`
                    : `Your ${tierLabel(profile.tier)} term continues.`,
                { url: DASHBOARD_PATH },
            );
        }
    }
    return { rolled };
};

/** ~Two thirds through the quarter, nudge members who are behind pace on any goal. */
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
        const cards = buildGoalCards(progress.get(p.user_id), policyForTier(policy, p.tier), window, now);
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
    for (const [name, fn] of [
        ['terms', autoContinueTerms],
        ['quarters', closeDueQuarters],
        ['nudges', sendMidQuarterNudges],
        ['vacancies', sendVacancyReminders],
        ['codes', healReferralCodes],
    ]) {
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

export const listLeadsOverview = async ({ status = 'active', tier = null, chapterId = null } = {}) => {
    const filters = [];
    const params = [];
    if (status !== 'all') filters.push("p.status = 'active'");
    if (tier && (tier === TIERS.LEAD || tier === TIERS.AMBASSADOR)) { filters.push('p.tier_code = ?'); params.push(tier); }
    if (chapterId) { filters.push('p.chapter_id = ?'); params.push(chapterId); }
    const [rows] = await pool.query(
        `SELECT p.id, p.user_id, p.tier_code, p.chapter_id, p.status, p.term_started_at, p.ended_at, p.end_reason, p.created_at,
                p.approved_at,
                COALESCE(u.referral_code, p.referral_code) AS referral_code,
                c.name AS chapter_name, c.country_code AS chapter_country,
                u.name AS user_name, u.email AS user_email, u.organization_name, u.status AS user_status,
                u.photo_url, u.membership_expires_at AS expires_at
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN chapters c ON c.id = p.chapter_id
         ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
         ORDER BY (p.status = 'active') DESC, (p.tier_code = 'lead') DESC, u.name ASC`,
        params,
    );
    if (!rows.length) return [];

    const now = new Date();
    const policy = await getPolicyAt(now);
    const window = quarterWindowFor(now);
    const activeIds = rows.filter((r) => r.status === 'active').map((r) => r.user_id);
    const progress = await computeProgressBatch(activeIds, window);
    const states = await getEarningsStates(rows.map((r) => r.id), now);

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
        const tierPolicy = policyForTier(policy, profile.tier);
        const isLead = profile.tier === TIERS.LEAD;
        const term = getTermInfo(profile.term_started_at, active ? now : (profile.ended_at || now), policy);
        const misses = countConsecutiveMisses(byProfile.get(raw.id) || []);
        const actuals = progress.get(raw.user_id);
        const evaluation = actuals ? evaluateGoals(actuals, tierPolicy) : null;
        return {
            id: raw.id,
            user_id: raw.user_id,
            tier: profile.tier,
            tier_label: tierLabel(profile.tier),
            name: raw.user_name,
            email: raw.user_email,
            organization_name: raw.organization_name,
            photo_url: raw.photo_url,
            approved_at: dbDate(raw.approved_at),
            status: raw.status,
            referral_code: raw.referral_code,
            chapter: raw.chapter_id ? { id: raw.chapter_id, name: raw.chapter_name, country_code: raw.chapter_country } : null,
            term_started_at: profile.term_started_at,
            ended_at: profile.ended_at,
            end_reason: raw.end_reason,
            term: { number: term.termNumber, rate: isLead ? term.rate : null, ends: term.termEnd },
            earnings: states.get(raw.id) || { ...NOT_CHOSEN },
            membership_expires_at: dbDate(raw.expires_at),
            partial_quarter: active ? isPartialQuarter(evalStartFor(profile), window) : false,
            goals: actuals ? buildGoalCards(actuals, tierPolicy, window, now).map((g) => ({ key: g.key, label: g.label, actual: g.counted, target: g.target, percent: g.percent, pace: g.pace })) : [],
            members_personal: actuals ? actuals.members_personal : null,
            goals_met: evaluation?.goalsMet ?? null,
            consecutive_misses: misses,
            standing: active ? standingFor(misses, tierPolicy) : 'ended',
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
    const fullPolicy = await getPolicyAt(now);
    const policy = policyForTier(fullPolicy, raw.tier);
    const history = await getQuarterHistory(profileId);
    const referrals = await getReferralList(raw.user_id, 500);
    const requests = await listRequests({ leadUserId: raw.user_id });
    const window = quarterWindowFor(now);
    const active = raw.status === 'active';
    const progress = active ? (await computeProgressBatch([raw.user_id], window)).get(raw.user_id) : null;
    const term = getTermInfo(raw.term_started_at, active ? now : (raw.ended_at || now), fullPolicy);
    const isLead = raw.tier === TIERS.LEAD;
    const election = await getEarningsState(profileId, now);

    let electionHistory = [];
    try {
        [electionHistory] = await pool.query(
            `SELECT id, choice, employer_confirmed, DATE_FORMAT(effective_from, '%Y-%m-%d') AS effective_from,
                    source, policy_version, created_at
             FROM earnings_elections WHERE profile_id = ? ORDER BY id DESC LIMIT 20`,
            [profileId],
        );
    } catch (err) {
        if (!isMissingSchema(err)) throw err;
    }

    let publicHidden = false;
    try {
        const [[display]] = await pool.query('SELECT hidden_by_admin FROM member_display_settings WHERE user_id = ?', [raw.user_id]);
        publicHidden = Boolean(display?.hidden_by_admin);
    } catch (err) {
        if (!isMissingSchema(err)) throw err;
    }

    return {
        public_hidden: publicHidden,
        profile: {
            id: raw.id, user_id: raw.user_id, tier: raw.tier, tier_label: tierLabel(raw.tier),
            status: raw.status, referral_code: raw.referral_code,
            chapter_id: raw.chapter_id, chapter_name: raw.chapter_name, term_started_at: raw.term_started_at,
            ended_at: raw.ended_at, end_reason: raw.end_reason, end_code: raw.end_code, created_at: raw.created_at,
        },
        user: user && { ...user, created_at: dbDate(user.created_at), membership_expires_at: dbDate(user.membership_expires_at) },
        term: { number: term.termNumber, rate: isLead ? term.rate : null, starts: term.termStart, ends: term.termEnd },
        quarter: { label: window.label, partial: active ? isPartialQuarter(evalStartFor(raw), window) : false },
        goals: progress ? goalCardsFor(raw.tier, progress, policy, window, now) : [],
        quarters: history,
        standing: standingFor(countConsecutiveMisses(history), policy),
        consecutive_misses: countConsecutiveMisses(history),
        earnings: { election, history: electionHistory.map((e) => ({ ...e, created_at: dbDate(e.created_at), employer_confirmed: Boolean(e.employer_confirmed) })) },
        referrals,
        requests,
    };
};

/**
 * Ends a team member's role (admin removal, a lead removing an ambassador, stepping down). The user
 * goes back to Professional immediately (the auth middleware re-reads the role on every request).
 * The referral code stops working for new signups; past referrals stay attributed.
 * When the seat was a lead's, the admins are told the chapter has no lead.
 */
export const endLeadRole = async (profileId, { status = 'removed', reason = null, adminId = null, actorId = null, endCode = null } = {}) => {
    const profile = await getProfileById(profileId);
    if (!profile) return { error: 'Lead not found.', code: 404 };
    if (profile.status !== 'active') return { error: 'This role has already ended.', code: 409 };

    const actor = actorId || adminId;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await endActiveProfile(conn, profile.user_id, { status, reason, adminId: actor, endCode: endCode || 'removed_by_admin' });
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

    const role = tierLabel(profile.tier);
    const [[user]] = await pool.query('SELECT name, email FROM users WHERE id = ?', [profile.user_id]);
    notifyUser(
        profile.user_id, NOTIF_TYPES.LEAD_ROLE_ENDED,
        `Your ${role} role has ended`,
        reason ? `Your ${role} role has ended: ${reason}` : `Your ${role} role has ended. You remain a Professional member.`,
        { url: '/user/dashboard' },
    );
    if (user?.email) {
        sendChapterLeadNoticeEmail({
            name: user.name, email: user.email, subject: `Your ${role} role has ended`,
            heading: `Your ${role} role has ended`, tone: 'warning',
            paragraphs: [
                reason ? `Your ${role} role has ended. Reason: ${reason}` : `Your ${role} role has ended.`,
                'You remain a Professional member and keep access to your account. Your referral code no longer accepts new sign-ups. If you think this was a mistake, or have questions, please contact us.',
            ],
            ctaLabel: 'Contact us', ctaPath: '/contact',
        });
    }
    if (profile.tier === TIERS.LEAD && profile.chapter_id) {
        notifyVacancyIfNeeded(profile.chapter_id, { immediate: true });
    }
    return { ok: true, tier: profile.tier, vacatedChapterId: profile.tier === TIERS.LEAD ? profile.chapter_id : null };
};

/**
 * Admin edits: chapter, term start and/or tier. Keeps the membership expiry in step with the term.
 * A tier change ends the current stint and opens a new one (see activateChapterLead).
 *
 * Runs inside the CALLER'S transaction (so Manage Users can combine it with profile edits) and
 * throws teamError for expected failures. Returns { ok, vacatedChapterId, profileId, afterCommit };
 * call afterCommit() once the transaction has committed: it sends the notices.
 */
export const changeTeamProfile = async (conn, profileId, { chapterId, termStartedAt, tier, overrideCap = false, actor = null } = {}) => {
    const before = await getProfileById(profileId, conn);
    if (!before) throw teamError(404, 'Lead not found.');
    const wantsTier = tier ? tierOf(tier) : null;
    const changesTier = Boolean(wantsTier && wantsTier !== before.tier);
    if (changesTier && before.status !== 'active') throw teamError(409, 'Only an active team member can change tier.');
    if (chapterId === undefined && !termStartedAt && !changesTier) throw teamError(422, 'Nothing to update.');

    let vacatedChapterId = null;
    let afterProfileId = profileId;
    if (changesTier) {
        const next = await activateChapterLead(conn, before.user_id, {
            tier: wantsTier,
            chapterId: chapterId === undefined ? null : (chapterId || null),
            termStartedAt: termStartedAt || null,
            approvedBy: actor?.id ?? null,
            overrideCap,
        });
        vacatedChapterId = next.vacatedChapterId;
        afterProfileId = next.id;
    } else {
        if (chapterId !== undefined) {
            const newChapter = chapterId || null;
            if (before.status === 'active' && before.tier === TIERS.AMBASSADOR) {
                if (!newChapter) throw teamError(422, 'An ambassador must belong to a chapter.');
                if (Number(newChapter) !== Number(before.chapter_id)) {
                    await assertAmbassadorSeat(conn, newChapter, { overrideCap, excludeUserId: before.user_id });
                }
            }
            if (before.status === 'active' && before.tier === TIERS.LEAD && before.chapter_id
                && Number(newChapter) !== Number(before.chapter_id)) {
                vacatedChapterId = before.chapter_id;
            }
            await guardLeadSeat(() => conn.query('UPDATE chapter_lead_profiles SET chapter_id = ? WHERE id = ?', [newChapter, profileId]));
        }
        if (termStartedAt) {
            await conn.query('UPDATE chapter_lead_profiles SET term_started_at = ? WHERE id = ?', [toSqlDateTime(new Date(termStartedAt)), profileId]);
            if (before.status === 'active') {
                const now = new Date();
                const info = getTermInfo(new Date(termStartedAt), now, await getPolicyAt(now, conn));
                await conn.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [toSqlDateTime(info.termEnd), before.user_id]);
            }
        }
    }
    const after = await getProfileById(afterProfileId, conn);
    await recordAudit(conn, {
        actor, action: changesTier ? 'team.tier_changed' : 'team.profile_updated', entityType: 'team_profile', entityId: afterProfileId,
        targetUserId: before.user_id, chapterId: after?.chapter_id ?? before.chapter_id,
        before: { tier: before.tier, chapter_id: before.chapter_id, term_started_at: before.term_started_at },
        after: after && { tier: after.tier, chapter_id: after.chapter_id, term_started_at: after.term_started_at },
    });

    const afterCommit = () => {
        if (before.status === 'active' && after && (changesTier || Number(after.chapter_id) !== Number(before.chapter_id))) {
            const name = after.chapter_name ? ` in ${after.chapter_name}` : '';
            notifyUser(
                before.user_id, NOTIF_TYPES.TEAM_TIER_CHANGED,
                changesTier ? `You are now a ${tierLabel(after.tier)}` : 'Your chapter has changed',
                changesTier
                    ? `An administrator has made you a ${tierLabel(after.tier)}${name}. ${after.tier === TIERS.AMBASSADOR ? 'Ambassador is a volunteer role without revenue share or commission.' : 'Open your dashboard to review your goals and your earnings choice.'}`
                    : `An administrator has moved you to ${after.chapter_name || 'a different chapter'}.`,
                { url: DASHBOARD_PATH },
            );
        }
        if (vacatedChapterId) notifyVacancyIfNeeded(vacatedChapterId, { immediate: true });
    };
    return { ok: true, vacatedChapterId, profileId: afterProfileId, afterCommit };
};

/** Same edit as its own transaction (the Chapter Leads tab). */
export const updateTeamProfile = async (profileId, opts = {}) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const out = await changeTeamProfile(conn, profileId, opts);
        await conn.commit();
        out.afterCommit();
        return { ok: true, vacatedChapterId: out.vacatedChapterId, profileId: out.profileId };
    } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
    } finally {
        conn.release();
    }
};

/** Older name, still used by existing callers. */
export const updateLeadProfile = updateTeamProfile;

/** Gives the PERSON a new code (the old one stops working at once). */
export const regenerateReferralCode = async (profileId) => {
    const profile = await getProfileById(profileId);
    if (!profile || profile.status !== 'active') return { error: 'Active lead not found.', code: 404 };
    for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
            const code = generateReferralCode();
            await pool.query('UPDATE users SET referral_code = ? WHERE id = ?', [code, profile.user_id]);
            return { ok: true, referral_code: code };
        } catch (err) {
            if (isDuplicate(err, 'uq_users_referral_code')) continue;
            throw err;
        }
    }
    return { error: 'Could not generate a unique code.', code: 500 };
};

export const listLeadOptions = async () => {
    const [rows] = await pool.query(
        `SELECT p.user_id, p.tier_code, u.name, c.name AS chapter_name
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN chapters c ON c.id = p.chapter_id
         WHERE p.status = 'active' AND u.status = 'approved'
         ORDER BY u.name`,
    );
    return rows.map((r) => ({ ...r, tier: tierOf(r.tier_code) }));
};

export const getAdminSummary = async () => {
    const [[leads]] = await pool.query(`SELECT COUNT(*) AS n FROM chapter_lead_profiles WHERE status = 'active' AND tier_code = 'lead'`);
    const [[ambassadors]] = await pool.query(`SELECT COUNT(*) AS n FROM chapter_lead_profiles WHERE status = 'active' AND tier_code = 'ambassador'`);
    const [[reqs]] = await pool.query(`SELECT COUNT(*) AS n FROM host_requests WHERE status = 'pending'`);
    const [[blogs]] = await pool.query(`SELECT COUNT(*) AS n FROM blog_posts WHERE status = 'pending'`);
    const [[apps]] = await pool.query(`SELECT COUNT(*) AS n FROM membership_applications WHERE status = 'pending' AND requested_role = 'council_member'`);
    const [[vacant]] = await pool.query(
        `SELECT COUNT(*) AS n FROM chapters c
         WHERE c.status = 'active' AND NOT EXISTS (SELECT 1 FROM chapter_lead_profiles p WHERE p.active_chapter_id = c.id)`,
    );
    const overview = await listLeadsOverview({ status: 'active' });
    return {
        active_leads: Number(leads.n),
        active_ambassadors: Number(ambassadors.n),
        pending_requests: Number(reqs.n),
        pending_blogs: Number(blogs.n),
        pending_applications: Number(apps.n),
        vacant_chapters: Number(vacant.n),
        at_risk: overview.filter((l) => l.standing === 'at_risk' || l.standing === 'review').length,
        terms_changing_soon: overview.filter((l) => l.tier === TIERS.LEAD && l.term.ends && (l.term.ends - Date.now()) < 60 * 24 * 60 * 60 * 1000).length,
    };
};

/** Leads whose current term ends within `days` — they roll into the next term (and rate) automatically. */
export const listTermChanges = async (days = 90) => {
    const overview = await listLeadsOverview({ status: 'active', tier: TIERS.LEAD });
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
