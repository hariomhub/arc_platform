/**
 * chapterNotices.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Who gets told what in the Chapter programme:
 *   • notifyAdmins        — every founding member (in-app) plus an email
 *   • notifyChapterLead   — the lead of one chapter (in-app + email)
 *   • vacancy alerts      — a chapter with no lead: told immediately when the seat
 *                           empties, then reminded every 30 days while people are waiting
 *
 * Kept apart from chapterLeadService.js (core rules) and chapterTeamService.js
 * (applications, approvals) so neither has to import the other.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { notifyUser, NOTIF_TYPES } from './notificationService.js';
import { sendChapterLeadNoticeEmail } from './emailService.js';
import { recordAudit } from './auditService.js';

export const VACANCY_REMINDER_DAYS = 30;

// ── Admins ──────────────────────────────────────────────────────────────────

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
        console.error('[Chapter] notifyAdmins failed:', err.message);
    }
};

// ── A chapter's lead ────────────────────────────────────────────────────────

/** The active lead of a chapter (or null), with what is needed to notify them. */
export const getChapterLead = async (chapterId, db = pool) => {
    if (!chapterId) return null;
    const [rows] = await db.query(
        `SELECT p.id AS profile_id, u.id AS user_id, u.name, u.email
         FROM chapter_lead_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.active_chapter_id = ? AND u.status = 'approved'
         LIMIT 1`,
        [chapterId],
    );
    return rows[0] || null;
};

/** In-app notice + email to the lead of `chapterId`. Returns false when the chapter has no lead. */
export const notifyChapterLead = async (chapterId, { type, title, body, data = {}, email = null }) => {
    try {
        const lead = await getChapterLead(chapterId);
        if (!lead) return false;
        notifyUser(lead.user_id, type, title, body, data);
        if (email) sendChapterLeadNoticeEmail({ name: lead.name, email: lead.email, ...email });
        return true;
    } catch (err) {
        console.error('[Chapter] notifyChapterLead failed:', err.message);
        return false;
    }
};

// ── Vacancies ───────────────────────────────────────────────────────────────

const CHAPTER_ADMIN_PATH = (chapterId) => `/admin-dashboard?tab=chapter_leads&chapter=${chapterId}`;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Tells the admins that a chapter has no lead. Safe to call from anywhere, any number of times:
 *   immediate = true  right after a lead seat emptied. Sends once per vacancy, even if nobody is waiting.
 *   immediate = false the daily job. Sends only while ambassadors or applicants are waiting, and
 *                     at most once every 30 days (the first notice is also sent here if an
 *                     immediate one was missed).
 * "Last told" is read from the audit log, so no extra state is kept.
 */
export const notifyVacancyIfNeeded = async (chapterId, { immediate = false, now = new Date() } = {}) => {
    if (!chapterId) return { sent: false, reason: 'no chapter' };
    try {
        const [[c]] = await pool.query(
            `SELECT c.id, c.name, c.status,
                    (SELECT COUNT(*) FROM chapter_lead_profiles p WHERE p.active_chapter_id = c.id) AS has_lead,
                    (SELECT COUNT(*) FROM chapter_lead_profiles p
                       WHERE p.chapter_id = c.id AND p.status = 'active' AND p.tier_code = 'ambassador') AS ambassadors,
                    (SELECT COUNT(*) FROM membership_applications a
                       WHERE a.requested_chapter_id = c.id AND a.status = 'pending') AS pending,
                    (SELECT MAX(p.ended_at) FROM chapter_lead_profiles p
                       WHERE p.chapter_id = c.id AND p.tier_code = 'lead') AS lead_ended_at,
                    (SELECT MAX(l.created_at) FROM audit_log l
                       WHERE l.entity_type = 'chapter' AND l.entity_id = c.id
                         AND l.action IN ('chapter.vacant', 'chapter.vacancy_reminder')) AS last_notice
             FROM chapters c WHERE c.id = ?`,
            [chapterId],
        );
        if (!c || c.status !== 'active') return { sent: false, reason: 'inactive' };
        if (Number(c.has_lead) > 0) return { sent: false, reason: 'has lead' };

        const waiting = Number(c.ambassadors) + Number(c.pending);
        const lastNotice = c.last_notice ? new Date(c.last_notice) : null;
        const leadEnded = c.lead_ended_at ? new Date(c.lead_ended_at) : null;
        const toldSinceVacancy = lastNotice && (!leadEnded || lastNotice >= leadEnded);

        let kind;
        if (immediate) {
            if (toldSinceVacancy) return { sent: false, reason: 'already told' };
            kind = 'chapter.vacant';
        } else {
            if (!waiting) return { sent: false, reason: 'nobody waiting' };
            if (!toldSinceVacancy) kind = 'chapter.vacant';
            else if ((now - lastNotice) / 86400000 >= VACANCY_REMINDER_DAYS) kind = 'chapter.vacancy_reminder';
            else return { sent: false, reason: 'told recently' };
        }

        const reminder = kind === 'chapter.vacancy_reminder';
        const title = reminder ? `Still no Chapter Lead: ${c.name}` : `${c.name} has no Chapter Lead`;
        const body = waiting
            ? `${plural(Number(c.ambassadors), 'ambassador')} and ${plural(Number(c.pending), 'pending application')} are waiting. Promote an ambassador to lead, or approve the applications yourself.`
            : 'Promote an ambassador to lead, appoint someone, or leave the seat open.';

        await notifyAdmins({
            type: NOTIF_TYPES.CHAPTER_VACANT,
            title,
            body,
            data: { url: CHAPTER_ADMIN_PATH(c.id) },
            email: {
                subject: title, heading: title, tone: 'warning',
                paragraphs: [body, 'While the seat is empty, ambassador applications for this chapter come to the admins.'],
                ctaLabel: 'Open the chapter', ctaPath: CHAPTER_ADMIN_PATH(c.id),
            },
        });

        // The chapter's ambassadors hear about it once, when it first happens.
        if (!reminder && Number(c.ambassadors) > 0) {
            const [team] = await pool.query(
                `SELECT user_id FROM chapter_lead_profiles WHERE chapter_id = ? AND status = 'active' AND tier_code = 'ambassador'`,
                [c.id],
            );
            team.forEach((m) => notifyUser(
                m.user_id, NOTIF_TYPES.CHAPTER_VACANT,
                `${c.name} has no Chapter Lead right now`,
                'An admin will review new applications for your chapter in the meantime. Nothing changes for you.',
                { url: '/user/dashboard' },
            ));
        }

        await recordAudit(pool, {
            actor: null, action: kind, entityType: 'chapter', entityId: c.id, chapterId: c.id,
            after: { ambassadors: Number(c.ambassadors), pending: Number(c.pending) },
        });
        return { sent: true, kind };
    } catch (err) {
        console.error('[Chapter] Vacancy notice failed:', err.message);
        return { sent: false, reason: err.message };
    }
};

/** Daily job: every active chapter without a lead. */
export const sendVacancyReminders = async (now = new Date()) => {
    const [chapters] = await pool.query(
        `SELECT c.id FROM chapters c
         WHERE c.status = 'active'
           AND NOT EXISTS (SELECT 1 FROM chapter_lead_profiles p WHERE p.active_chapter_id = c.id)`,
    );
    let sent = 0;
    for (const c of chapters) {
        const out = await notifyVacancyIfNeeded(c.id, { immediate: false, now });
        if (out.sent) sent += 1;
    }
    return { vacant: chapters.length, sent };
};
