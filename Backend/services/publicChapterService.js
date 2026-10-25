/**
 * publicChapterService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * What the world sees of a chapter, plus each person's own display choices.
 *
 *   /chapters, /chapters/:slug   public. For every chapter: its lead, its ambassadors, free seats.
 *
 * Disclosed in the Terms: while a role is active the person's NAME, ROLE and CHAPTER are listed.
 * Everything else is the person's own choice and OFF by default (member_display_settings):
 * photo, organisation, LinkedIn, short bio. Organisation is off because naming an employer can
 * recreate the employer-approval problem the volunteer role is meant to avoid.
 * An administrator can hide anyone. A person whose account is not approved, or whose role has
 * ended, disappears at once (the query only reads ACTIVE seats of APPROVED accounts).
 *
 * Never returned here: email, phone, internal ids of users, goals or scores.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { TIERS, tierOf, tierLabel, dbDate } from '../utils/chapterLeadRules.js';
import { getPolicyAt, teamError } from './chapterLeadService.js';
import { assignChapterSlug } from './chapterTeamService.js';

const DEFAULTS = Object.freeze({
    show_photo: false, show_organisation: false, show_linkedin: false, show_bio: false,
    show_in_leaderboard: true, hidden_by_admin: false,
});

const FLAGS = ['show_photo', 'show_organisation', 'show_linkedin', 'show_bio', 'show_in_leaderboard'];

const asFlags = (row) => {
    if (!row) return { ...DEFAULTS };
    return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, Boolean(row[k])]));
};

/** The person's own settings (defaults when they have never saved any). */
export const getDisplaySettings = async (userId) => {
    const [[row]] = await pool.query('SELECT * FROM member_display_settings WHERE user_id = ?', [userId]);
    return asFlags(row);
};

/** Saves the person's choices. Only the flags they are allowed to set; admin hiding is separate. */
export const saveDisplaySettings = async (userId, body = {}) => {
    const current = await getDisplaySettings(userId);
    const next = { ...current };
    FLAGS.forEach((k) => { if (typeof body[k] === 'boolean') next[k] = body[k]; });
    await pool.query(
        `INSERT INTO member_display_settings (user_id, show_photo, show_organisation, show_linkedin, show_bio, show_in_leaderboard)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE show_photo = VALUES(show_photo), show_organisation = VALUES(show_organisation),
           show_linkedin = VALUES(show_linkedin), show_bio = VALUES(show_bio), show_in_leaderboard = VALUES(show_in_leaderboard)`,
        [userId, next.show_photo ? 1 : 0, next.show_organisation ? 1 : 0, next.show_linkedin ? 1 : 0, next.show_bio ? 1 : 0, next.show_in_leaderboard ? 1 : 0],
    );
    return next;
};

/** Admin: hide or show someone on the public pages. */
export const setHiddenByAdmin = async (userId, hidden) => {
    await pool.query(
        `INSERT INTO member_display_settings (user_id, hidden_by_admin) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE hidden_by_admin = VALUES(hidden_by_admin)`,
        [userId, hidden ? 1 : 0],
    );
    return { ok: true, hidden: Boolean(hidden) };
};

/** Settings for several people at once: Map<userId, flags>. Used by the leaderboard. */
export const getDisplaySettingsFor = async (userIds) => {
    const out = new Map(userIds.map((id) => [id, { ...DEFAULTS }]));
    if (!userIds.length) return out;
    const [rows] = await pool.query('SELECT * FROM member_display_settings WHERE user_id IN (?)', [userIds]);
    rows.forEach((r) => out.set(r.user_id, asFlags(r)));
    return out;
};

const yearOf = (d) => {
    const date = d ? new Date(d) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getUTCFullYear() : null;
};

/** One person as the public sees them. */
const publicPerson = (row) => {
    const flags = asFlags({
        show_photo: row.show_photo, show_organisation: row.show_organisation, show_linkedin: row.show_linkedin,
        show_bio: row.show_bio, show_in_leaderboard: 1, hidden_by_admin: row.hidden_by_admin,
    });
    const tier = tierOf(row.tier_code);
    return {
        id: row.profile_id,
        name: row.name,
        tier,
        tier_label: tierLabel(tier),
        since: yearOf(row.term_started_at || row.approved_at),
        photo_url: flags.show_photo ? row.photo_url || null : null,
        organisation: flags.show_organisation ? row.organization_name || null : null,
        linkedin_url: flags.show_linkedin ? row.linkedin_url || null : null,
        bio: flags.show_bio ? (row.bio ? String(row.bio).slice(0, 400) : null) : null,
    };
};

const PERSON_SELECT = `
    p.id AS profile_id, p.tier_code, p.approved_at, p.term_started_at, p.chapter_id,
    u.name, u.photo_url, u.organization_name, u.linkedin_url, u.bio,
    COALESCE(d.show_photo, 0) AS show_photo, COALESCE(d.show_organisation, 0) AS show_organisation,
    COALESCE(d.show_linkedin, 0) AS show_linkedin, COALESCE(d.show_bio, 0) AS show_bio,
    COALESCE(d.hidden_by_admin, 0) AS hidden_by_admin`;

/** Every active chapter with who leads it and how many seats are free. */
export const listPublicChapters = async () => {
    const policy = await getPolicyAt(new Date());
    const cap = policy.tiers.ambassador.seat_cap;
    const [rows] = await pool.query(
        `SELECT s.chapter_id AS id, s.name, s.slug, s.country_code, s.lead_user_id, s.ambassadors_active,
                lp.id AS lead_profile_id, lp.tier_code, lp.approved_at, lp.term_started_at,
                u.name AS lead_name, u.photo_url AS lead_photo, u.organization_name, u.linkedin_url, u.bio,
                COALESCE(d.show_photo, 0) AS show_photo, COALESCE(d.show_organisation, 0) AS show_organisation,
                COALESCE(d.show_linkedin, 0) AS show_linkedin, COALESCE(d.show_bio, 0) AS show_bio,
                COALESCE(d.hidden_by_admin, 0) AS hidden_by_admin
         FROM chapter_team_summary s
         LEFT JOIN chapter_lead_profiles lp ON lp.id = s.lead_profile_id
         LEFT JOIN users u ON u.id = s.lead_user_id AND u.status = 'approved'
         LEFT JOIN member_display_settings d ON d.user_id = u.id
         WHERE s.status = 'active'
         ORDER BY s.country_code, s.name`,
    );
    const out = [];
    for (const r of rows) {
        const slug = r.slug || await assignChapterSlug(r.id);
        const lead = r.lead_name && !r.hidden_by_admin
            ? publicPerson({ ...r, name: r.lead_name, photo_url: r.lead_photo, profile_id: r.lead_profile_id })
            : null;
        out.push({
            id: r.id, slug, name: r.name, country_code: r.country_code,
            has_lead: Boolean(r.lead_user_id),
            lead,
            ambassadors: Number(r.ambassadors_active),
            seats_left: cap === null ? null : Math.max(0, cap - Number(r.ambassadors_active)),
        });
    }
    return out;
};

/** One chapter's public page: its team and whether it can take more ambassadors. */
export const getPublicChapter = async (slug) => {
    const [[chapter]] = await pool.query(
        `SELECT id, name, slug, country_code FROM chapters WHERE status = 'active' AND (slug = ? OR id = ?) LIMIT 1`,
        [String(slug), /^\d+$/.test(String(slug)) ? Number(slug) : 0],
    );
    if (!chapter) throw teamError(404, 'Chapter not found.');
    const policy = await getPolicyAt(new Date());
    const cap = policy.tiers.ambassador.seat_cap;

    const [people] = await pool.query(
        `SELECT ${PERSON_SELECT}
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id AND u.status = 'approved'
         LEFT JOIN member_display_settings d ON d.user_id = u.id
         WHERE p.chapter_id = ? AND p.status = 'active'
         ORDER BY (p.tier_code = 'lead') DESC, p.approved_at ASC, u.name ASC`,
        [chapter.id],
    );
    const visible = people.filter((r) => !r.hidden_by_admin).map(publicPerson);
    const ambassadorCount = people.filter((r) => tierOf(r.tier_code) === TIERS.AMBASSADOR).length;
    return {
        chapter: { id: chapter.id, slug: chapter.slug || await assignChapterSlug(chapter.id), name: chapter.name, country_code: chapter.country_code },
        lead: visible.find((p) => p.tier === TIERS.LEAD) || null,
        has_lead: people.some((r) => tierOf(r.tier_code) === TIERS.LEAD),
        ambassadors: visible.filter((p) => p.tier === TIERS.AMBASSADOR),
        seat_cap: cap,
        seats_left: cap === null ? null : Math.max(0, cap - ambassadorCount),
        updated_at: dbDate(new Date()),
    };
};
