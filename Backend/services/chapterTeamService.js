/**
 * chapterTeamService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Joining and running a chapter team:
 *
 *   • Applications   — a member applies as Chapter Ambassador (or Chapter Lead); an ambassador can
 *                      ask to be promoted. Ambassador applications are routed to the chapter's lead
 *                      (or to the admins while the chapter has no lead).
 *   • Decisions      — the lead of that chapter OR any founding member decides; whoever acts first
 *                      wins, either takes effect at once, and every decision is written to the audit log.
 *   • Removal        — the lead (with a reason) or an admin removes an ambassador.
 *   • Overviews      — "My team" for a lead, the per-chapter view for admins.
 *
 * Both the lead-facing routes and the admin routes call these same functions, so "lead or admin"
 * is decided in one place (canActOnChapter). Core rules (seats, tiers, terms) are in
 * chapterLeadService.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    TIERS, tierOf, tierLabel, isCountryCode, slugify, dbDate, toSqlDateTime,
} from '../utils/chapterLeadRules.js';
import {
    activateChapterLead, endLeadRole, getActiveProfile, getProfileById, getChapterCapacity, getPolicyAt,
    listLeadsOverview, recordPolicyAcceptance, teamError,
} from './chapterLeadService.js';
import { notifyAdmins, notifyChapterLead, getChapterLead } from './chapterNotices.js';
import { notifyUser, NOTIF_TYPES } from './notificationService.js';
import {
    sendChapterLeadNoticeEmail, sendMembershipApplicationReceivedEmail, sendMembershipApplicationStatusEmail,
    sendCouncilApplicationAdminEmail,
} from './emailService.js';
import { recordAudit } from './auditService.js';
import { recordApplicationClearance } from './earningsElectionService.js';

const TEAM_TAB = '/user/dashboard?tab=team';

/** Admins can act anywhere; a lead only on their own chapter. */
export const canActOnChapter = (actor, chapterId) => {
    if (!actor) return false;
    if (actor.role === 'founding_member') return true;
    return actor.role === 'council_member' && actor.tier === TIERS.LEAD
        && actor.team_chapter_id != null && chapterId != null
        && Number(actor.team_chapter_id) === Number(chapterId);
};

// ── Chapters ─────────────────────────────────────────────────────────────────

const loadActiveChapter = async (db, rawId) => {
    const id = parseInt(rawId, 10);
    if (!id) return null;
    const [[c]] = await db.query(`SELECT id, name, country_code, slug FROM chapters WHERE id = ? AND status = 'active'`, [id]);
    return c || null;
};

/** Gives a chapter a unique URL slug (from its name) if it has none. Returns the slug. */
export const assignChapterSlug = async (chapterId, db = pool) => {
    const [[c]] = await db.query('SELECT id, name, slug FROM chapters WHERE id = ?', [chapterId]);
    if (!c) return null;
    if (c.slug) return c.slug;
    const base = slugify(c.name).slice(0, 70) || 'chapter';
    for (let i = 0; i < 20; i += 1) {
        const candidate = i === 0 ? base : `${base}-${i + 1}`;
        try {
            await db.query('UPDATE chapters SET slug = ? WHERE id = ? AND slug IS NULL', [candidate, chapterId]);
            const [[again]] = await db.query('SELECT slug FROM chapters WHERE id = ?', [chapterId]);
            return again.slug;
        } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY') throw err;
        }
    }
    return null;
};

/**
 * All chapters with their lead, ambassador count and waiting applications (admin screen and
 * the vacancy banner). One query over the chapter_team_summary view.
 */
export const listChapterTeams = async () => {
    const policy = await getPolicyAt(new Date());
    const cap = policy.tiers.ambassador.seat_cap;
    const [rows] = await pool.query(
        `SELECT s.chapter_id AS id, s.name, s.slug, s.country_code, s.status,
                s.lead_profile_id, s.lead_user_id, lu.name AS lead_name,
                s.ambassadors_active, s.pending_ambassador_applications,
                (SELECT COUNT(*) FROM membership_applications a
                   WHERE a.requested_chapter_id = s.chapter_id AND a.status = 'pending') AS pending_applications,
                (SELECT COUNT(*) FROM users m WHERE m.chapter_id = s.chapter_id AND m.status = 'approved') AS member_count,
                c.created_at
         FROM chapter_team_summary s
         JOIN chapters c ON c.id = s.chapter_id
         LEFT JOIN users lu ON lu.id = s.lead_user_id
         ORDER BY s.country_code, s.name`,
    );
    return rows.map((r) => ({
        id: r.id, name: r.name, slug: r.slug, country_code: r.country_code, status: r.status,
        lead_profile_id: r.lead_profile_id, lead_user_id: r.lead_user_id, lead_name: r.lead_name,
        has_lead: Boolean(r.lead_user_id),
        ambassadors_active: Number(r.ambassadors_active),
        seat_cap: cap,
        seats_left: cap === null ? null : Math.max(0, cap - Number(r.ambassadors_active)),
        pending_applications: Number(r.pending_applications),
        member_count: Number(r.member_count),
        created_at: dbDate(r.created_at),
    }));
};

// ── Applications ─────────────────────────────────────────────────────────────

const text = (v, max) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim().slice(0, max));

const APPLICATION_COLUMNS = `
    ma.id, ma.user_id, ma.requested_tier, ma.kind, ma.status, ma.routed_to, ma.requested_chapter_id,
    ma.requested_country_code, ma.full_name, ma.organization_name, ma.job_title, ma.linkedin_url,
    ma.professional_bio, ma.areas_of_expertise, ma.why_founding_member, ma.employer_confirmed_at,
    ma.decision_note, ma.created_at, ma.processed_at, ma.decided_by,
    u.created_at AS member_since, c.name AS chapter_name`;

/**
 * What a lead may see about an applicant. Deliberately NOT included: email, phone, admin notes.
 * (The Privacy Policy tells applicants who sees what.)
 */
const leadViewOfApplication = (a) => ({
    id: a.id,
    tier: tierOf(a.requested_tier),
    kind: a.kind,
    status: a.status,
    chapter_id: a.requested_chapter_id,
    chapter_name: a.chapter_name,
    applicant: {
        name: a.full_name,
        job_title: a.job_title,
        organization_name: a.organization_name,
        linkedin_url: a.linkedin_url,
        country_code: a.requested_country_code,
        member_since: dbDate(a.member_since),
    },
    bio: a.professional_bio,
    expertise: a.areas_of_expertise,
    motivation: a.why_founding_member,
    employer_confirmed: Boolean(a.employer_confirmed_at),
    decision_note: a.decision_note,
    created_at: dbDate(a.created_at),
    decided_at: dbDate(a.processed_at),
});

/**
 * Creates the application row for either a new ambassador/lead application or a promotion request.
 * `body`: tier, organization_name, job_title, linkedin_url, phone, professional_bio, areas_of_expertise,
 *         why_council_member, accept_privacy, employer_confirmed, country_code, chapter_id.
 */
const createApplication = async (authUser, body, ip, kind) => {
    const requestedTier = kind === 'promotion' || body.tier !== TIERS.AMBASSADOR ? TIERS.LEAD : TIERS.AMBASSADOR;
    const [[user]] = await pool.query(
        'SELECT id, name, email, role, status, country_code, organization_name, linkedin_url, chapter_id FROM users WHERE id = ?',
        [authUser.id],
    );
    if (!user) throw teamError(404, 'User not found.');
    if (user.status !== 'approved') throw teamError(403, 'Your account must be approved before you can apply.');
    if (user.role === 'founding_member') throw teamError(409, 'You already have a Founding Member membership.');

    let current = null;
    if (user.role === 'council_member') {
        current = await getActiveProfile(user.id);
        if (kind !== 'promotion' || !current || current.tier !== TIERS.AMBASSADOR) {
            throw teamError(409, `You already have a ${tierLabel(current?.tier)} role.`);
        }
    } else if (kind === 'promotion') {
        throw teamError(409, 'Only a Chapter Ambassador can ask to be promoted.');
    }

    const [pending] = await pool.query(
        `SELECT id FROM membership_applications WHERE user_id = ? AND requested_role = 'council_member' AND status = 'pending'`,
        [user.id],
    );
    if (pending.length) throw teamError(409, 'You already have a pending application.');

    const why = text(body.why_council_member, 3000);
    if (!why) throw teamError(422, kind === 'promotion' ? 'Please tell us why you would like to lead this chapter.' : 'Please tell us why you want to join.');

    if (kind === 'new') {
        if (body.accept_privacy !== true) {
            throw teamError(422, 'You must agree to the Privacy Policy and Terms to apply.');
        }
        if (body.employer_confirmed !== true) {
            throw teamError(422, 'Please confirm that you have checked your employment terms, and obtained any approval you need, before applying.');
        }
        if (!isCountryCode(body.country_code)) throw teamError(422, 'Please select your country.');
    }
    const country = kind === 'new' ? body.country_code.trim().toUpperCase() : (user.country_code || null);

    // Chapter: an ambassador must pick one; a lead may leave it for an admin to confirm.
    const rawChapter = body.chapter_id ?? (kind === 'promotion' ? current.chapter_id : null);
    let chapter = null;
    if (rawChapter !== undefined && rawChapter !== null && rawChapter !== '') {
        chapter = await loadActiveChapter(pool, rawChapter);
        if (!chapter || (kind === 'new' && chapter.country_code !== country)) {
            throw teamError(422, 'Please choose a valid chapter for your country.');
        }
    }
    if (requestedTier === TIERS.AMBASSADOR && !chapter) throw teamError(422, 'Choose the chapter you would like to join.');

    let capacity = null;
    if (chapter) {
        capacity = await getChapterCapacity(chapter.id);
        if (requestedTier === TIERS.LEAD && capacity.has_lead) {
            throw teamError(409, kind === 'promotion'
                ? 'That chapter already has a Chapter Lead. Choose a chapter without one, or ask an administrator.'
                : 'That chapter already has a Chapter Lead. You can apply to join it as a Chapter Ambassador instead.');
        }
    }

    // Routing: ambassadors go to their chapter's lead; everything else (and any chapter without a lead) to the admins.
    const lead = requestedTier === TIERS.AMBASSADOR && chapter ? await getChapterLead(chapter.id) : null;
    const routedTo = lead ? 'lead' : 'admin';

    const conn = await pool.getConnection();
    let applicationId;
    try {
        await conn.beginTransaction();
        const [result] = await conn.query(
            `INSERT INTO membership_applications
               (user_id, requested_role, full_name, email, organization_name, job_title, linkedin_url, phone,
                professional_bio, areas_of_expertise, why_founding_member, payment_reference, amount_paid,
                requested_country_code, requested_chapter_id, requested_tier, kind, routed_to, approver_user_id,
                employer_confirmed_at)
             VALUES (?, 'council_member', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APP-ONLY', 0.00, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id, user.name, user.email,
                text(body.organization_name, 255) ?? user.organization_name,
                text(body.job_title, 255),
                text(body.linkedin_url, 500) ?? user.linkedin_url,
                text(body.phone, 50),
                text(body.professional_bio, 2000),
                text(body.areas_of_expertise, 1000),
                why,
                country, chapter ? chapter.id : null, requestedTier, kind, routedTo, lead ? lead.user_id : null,
                kind === 'new' ? toSqlDateTime(new Date()) : null,
            ],
        );
        applicationId = result.insertId;
        if (kind === 'new') {
            await recordPolicyAcceptance(conn, user.id, { ip, context: 'team_application' });
            await conn.query('UPDATE users SET country_code = COALESCE(country_code, ?) WHERE id = ?', [country, user.id]);
        }
        await recordAudit(conn, {
            actor: authUser, action: kind === 'promotion' ? 'application.promotion_requested' : 'application.submitted',
            entityType: 'application', entityId: applicationId, targetUserId: user.id, chapterId: chapter?.id ?? null,
            after: { tier: requestedTier, routed_to: routedTo, chapter_id: chapter?.id ?? null }, ip,
        });
        await conn.commit();
    } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
    } finally {
        conn.release();
    }

    // ── Tell the applicant and whoever has to decide ─────────────────────────
    sendMembershipApplicationReceivedEmail({
        name: user.name, email: user.email, requestedRole: 'council_member', tier: requestedTier, reviewer: routedTo,
    });

    const label = tierLabel(requestedTier);
    const where = chapter ? ` in ${chapter.name}` : '';
    if (routedTo === 'lead') {
        await notifyChapterLead(chapter.id, {
            type: NOTIF_TYPES.TEAM_APPLICATION_SUBMITTED,
            title: 'New ambassador application',
            body: `${user.name} applied to join ${chapter.name} as a Chapter Ambassador.`,
            data: { url: TEAM_TAB },
            email: {
                subject: `New ambassador application: ${user.name}`, heading: 'New ambassador application', tone: 'info',
                paragraphs: [`${user.name} has applied to join ${chapter.name} as a Chapter Ambassador. You can review the application and decide in the My team tab.`],
                details: [['Applicant', user.name], ['Chapter', chapter.name]],
                ctaLabel: 'Review the application', ctaPath: TEAM_TAB,
            },
        });
    } else if (requestedTier === TIERS.LEAD && kind === 'new') {
        // Same email the admins have always received for a Chapter Lead application.
        const [admins] = await pool.query(`SELECT id, name, email FROM users WHERE role = 'founding_member' AND status != 'rejected'`);
        const row = {
            full_name: user.name, email: user.email, organization_name: text(body.organization_name, 255),
            job_title: text(body.job_title, 255), linkedin_url: text(body.linkedin_url, 500), phone: text(body.phone, 50),
            created_at: new Date(),
        };
        for (const a of admins) {
            notifyUser(a.id, NOTIF_TYPES.TEAM_APPLICATION_SUBMITTED, 'New Chapter Lead application', `${user.name} applied to become a Chapter Lead${where}.`, { url: '/admin-dashboard?tab=pending' });
        }
        if (process.env.ADMIN_EMAIL) sendCouncilApplicationAdminEmail({ adminEmail: process.env.ADMIN_EMAIL, application: row });
        else admins.forEach((a) => sendCouncilApplicationAdminEmail({ adminEmail: a.email, adminName: a.name, application: row }));
    } else {
        const vacant = requestedTier === TIERS.AMBASSADOR;
        await notifyAdmins({
            type: NOTIF_TYPES.TEAM_APPLICATION_SUBMITTED,
            title: kind === 'promotion' ? 'Promotion request' : `New ${label} application`,
            body: kind === 'promotion'
                ? `${user.name} asked to become Chapter Lead${where}.`
                : `${user.name} applied to join ${chapter?.name || 'a chapter'} as a ${label}. ${vacant ? 'The chapter has no lead, so the decision is yours.' : ''}`.trim(),
            data: { url: '/admin-dashboard?tab=pending' },
            email: {
                subject: kind === 'promotion' ? `Promotion request: ${user.name}` : `New ${label} application: ${user.name}`,
                heading: kind === 'promotion' ? 'A Chapter Ambassador asked to be promoted' : `New ${label} application`,
                tone: 'info',
                paragraphs: [kind === 'promotion'
                    ? `${user.name} would like to become Chapter Lead${where}. Review it in the Member Approvals tab.`
                    : `${user.name} applied to join ${chapter?.name || 'a chapter'} as a ${label}. ${vacant ? 'That chapter has no Chapter Lead, so the application comes to the admins.' : ''}`.trim()],
                ctaLabel: 'Open Member Approvals', ctaPath: '/admin-dashboard?tab=pending',
            },
        });
    }

    return {
        id: applicationId,
        tier: requestedTier,
        routed_to: routedTo,
        chapter: chapter ? { id: chapter.id, name: chapter.name } : null,
        chapter_full: Boolean(capacity?.full) && requestedTier === TIERS.AMBASSADOR,
    };
};

export const submitTeamApplication = (authUser, body, ip) => createApplication(authUser, body, ip, 'new');
export const submitPromotionRequest = (authUser, body, ip) => createApplication(authUser, body, ip, 'promotion');

/** The caller's most recent application (so the Join page can show "under review" / "not approved"). */
export const getMyApplication = async (userId) => {
    const [rows] = await pool.query(
        `SELECT ${APPLICATION_COLUMNS}
         FROM membership_applications ma
         JOIN users u ON u.id = ma.user_id
         LEFT JOIN chapters c ON c.id = ma.requested_chapter_id
         WHERE ma.user_id = ? AND ma.requested_role = 'council_member'
         ORDER BY ma.id DESC LIMIT 1`,
        [userId],
    );
    return rows[0] ? leadViewOfApplication(rows[0]) : null;
};

export const withdrawApplication = async (applicationId, user) => {
    const [res] = await pool.query(
        `UPDATE membership_applications SET status = 'withdrawn', processed_at = NOW()
         WHERE id = ? AND user_id = ? AND status = 'pending' AND requested_role = 'council_member'`,
        [applicationId, user.id],
    );
    if (!res.affectedRows) throw teamError(404, 'No pending application found to withdraw.');
    await recordAudit(pool, {
        actor: user, action: 'application.withdrawn', entityType: 'application', entityId: applicationId, targetUserId: user.id,
    });
    return { ok: true };
};

/** The applications a LEAD can see and decide: ambassador applications for their own chapter. */
export const listApplicationsForLead = async (actor, { status = 'pending' } = {}) => {
    if (!actor.team_chapter_id) return [];
    const filter = ['pending', 'approved', 'rejected'].includes(status) ? ' AND ma.status = ?' : '';
    const [rows] = await pool.query(
        `SELECT ${APPLICATION_COLUMNS}
         FROM membership_applications ma
         JOIN users u ON u.id = ma.user_id
         LEFT JOIN chapters c ON c.id = ma.requested_chapter_id
         WHERE ma.requested_role = 'council_member' AND ma.requested_tier = 'ambassador' AND ma.kind = 'new'
           AND ma.requested_chapter_id = ?${filter}
         ORDER BY (ma.status = 'pending') DESC, ma.created_at ${status === 'pending' ? 'ASC' : 'DESC'}
         LIMIT 100`,
        filter ? [actor.team_chapter_id, status] : [actor.team_chapter_id],
    );
    return rows.map(leadViewOfApplication);
};

/**
 * Approve or reject an application. Callable by the lead of the application's chapter (ambassador
 * applications only) or by any founding member. The first decision wins; the second gets a 409.
 *
 * opts: { status, note, chapterId?, termStartedAt?, profileBadge?, overrideCap? }
 * chapterId / termStartedAt / overrideCap are honoured for admins only.
 */
export const decideTeamApplication = async (applicationId, actor, opts = {}) => {
    const { status, note = null } = opts;
    if (!['approved', 'rejected'].includes(status)) throw teamError(422, 'Status must be approved or rejected.');
    const isAdmin = actor.role === 'founding_member';

    const conn = await pool.getConnection();
    let app;
    let chapterId = null;
    let profile = null;
    try {
        await conn.beginTransaction();
        [[app]] = await conn.query(
            `SELECT ma.*, u.name AS applicant_name, u.email AS applicant_email, u.role AS applicant_role, u.status AS applicant_status
             FROM membership_applications ma JOIN users u ON u.id = ma.user_id
             WHERE ma.id = ? FOR UPDATE`,
            [applicationId],
        );
        if (!app || app.requested_role !== 'council_member') throw teamError(404, 'Application not found.');
        if (app.status !== 'pending') throw teamError(409, 'This application has already been decided.');

        const tier = tierOf(app.requested_tier);
        if (!isAdmin) {
            const allowed = tier === TIERS.AMBASSADOR && app.kind === 'new' && canActOnChapter(actor, app.requested_chapter_id);
            if (!allowed) throw teamError(403, 'You cannot decide this application.');
        }
        if (note && String(note).length > 500) throw teamError(422, 'The note must be 500 characters or fewer.');

        if (status === 'approved') {
            if (app.applicant_status !== 'approved') throw teamError(409, "The applicant's account is not active.");
            if (app.applicant_role === 'founding_member') throw teamError(409, 'The applicant is a Founding Member.');

            const wanted = isAdmin && opts.chapterId !== undefined && opts.chapterId !== '' ? opts.chapterId : app.requested_chapter_id;
            if (wanted) {
                const chapter = await loadActiveChapter(conn, wanted);
                if (!chapter) throw teamError(422, 'Chapter not found or inactive.');
                chapterId = chapter.id;
            }
            profile = await activateChapterLead(conn, app.user_id, {
                tier, chapterId, termStartedAt: isAdmin ? (opts.termStartedAt || null) : null,
                approvedBy: actor.id, overrideCap: isAdmin && opts.overrideCap === true,
            });
            await conn.query(
                `UPDATE users SET country_code = COALESCE(country_code, ?), chapter_id = COALESCE(chapter_id, ?) WHERE id = ?`,
                [app.requested_country_code || null, chapterId, app.user_id],
            );
            if (isAdmin && opts.profileBadge) {
                await conn.query('UPDATE users SET profile_badge = ? WHERE id = ?', [String(opts.profileBadge).slice(0, 100), app.user_id]);
            }
            // The applicant confirmed employer clearance on the form: keep it on file as their first election.
            if (tier === TIERS.AMBASSADOR && app.employer_confirmed_at) {
                await recordApplicationClearance(conn, {
                    profileId: profile.id, userId: app.user_id, confirmedAt: app.employer_confirmed_at,
                });
            }
        }

        await conn.query(
            `UPDATE membership_applications
             SET status = ?, processed_at = NOW(), admin_notes = ?, decision_note = ?, decided_by = ?
             WHERE id = ?`,
            [status, note || null, note || null, actor.id, applicationId],
        );
        await recordAudit(conn, {
            actor, action: status === 'approved' ? 'application.approved' : 'application.rejected',
            entityType: 'application', entityId: applicationId, targetUserId: app.user_id,
            chapterId: chapterId ?? app.requested_chapter_id,
            before: { status: 'pending' },
            after: { status, tier, kind: app.kind, chapter_id: chapterId ?? app.requested_chapter_id },
            reason: note,
        });
        await conn.commit();
    } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
    } finally {
        conn.release();
    }

    // ── After commit: tell people ────────────────────────────────────────────
    const tier = tierOf(app.requested_tier);
    const approved = status === 'approved';
    sendMembershipApplicationStatusEmail({
        name: app.applicant_name, email: app.applicant_email, requestedRole: 'council_member',
        status, adminNotes: note, profile_badge: isAdmin ? opts.profileBadge : undefined, tier,
    });
    notifyUser(
        app.user_id,
        approved ? NOTIF_TYPES.MEMBERSHIP_APPROVED : NOTIF_TYPES.MEMBERSHIP_REJECTED,
        approved ? `${tierLabel(tier)} application approved!` : `Update on your ${tierLabel(tier)} application`,
        approved
            ? `Congratulations! You are now a ${tierLabel(tier)}. Open your dashboard to see your goals and referral code.`
            : `Your ${tierLabel(tier)} application was not approved${note ? `: ${note}` : '.'} Your Professional membership stays active.`,
        { url: approved ? '/user/dashboard' : '/membership' },
    );

    if (approved && tier === TIERS.AMBASSADOR && chapterId) {
        const [[chapter]] = await pool.query('SELECT name FROM chapters WHERE id = ?', [chapterId]);
        const summary = `${app.applicant_name} is now a Chapter Ambassador in ${chapter?.name || 'the chapter'}.`;
        if (isAdmin) {
            // An admin decided: let the chapter's lead know who joined their team.
            notifyChapterLead(chapterId, {
                type: NOTIF_TYPES.TEAM_MEMBER_JOINED, title: 'New ambassador on your team', body: summary, data: { url: TEAM_TAB },
            });
        } else {
            // A lead decided: the admins get an FYI (in-app only; nothing for them to do).
            notifyAdmins({
                type: NOTIF_TYPES.TEAM_MEMBER_JOINED, title: 'New ambassador approved',
                body: `${summary} Approved by ${actor.name || 'the chapter lead'}.`,
                data: { url: '/admin-dashboard?tab=chapter_leads' },
            });
        }
    }
    return { status, tier, user_id: app.user_id, chapter_id: chapterId ?? app.requested_chapter_id, profile_id: profile?.id ?? null };
};

// ── Removing an ambassador ───────────────────────────────────────────────────

/**
 * The chapter's lead (with a reason) or an admin removes an ambassador. The person goes back to
 * Professional and is told how to contact us if they think it was a mistake (the appeal).
 */
export const removeAmbassador = async (profileId, actor, { reason = null } = {}) => {
    const profile = await getProfileById(profileId);
    if (!profile) throw teamError(404, 'Team member not found.');
    if (profile.status !== 'active') throw teamError(409, 'This role has already ended.');
    if (profile.tier !== TIERS.AMBASSADOR) {
        throw teamError(409, "Only ambassadors can be removed here. A Chapter Lead's role is ended by an administrator.");
    }
    const isAdmin = actor.role === 'founding_member';
    if (!canActOnChapter(actor, profile.chapter_id)) throw teamError(403, 'You can only remove ambassadors from your own chapter.');
    const why = text(reason, 500);
    if (!isAdmin && (!why || why.length < 3)) throw teamError(422, 'Please give a reason for removing this ambassador.');
    if (profile.user_id === actor.id) throw teamError(422, 'You cannot remove yourself here.');

    const out = await endLeadRole(profileId, {
        status: 'removed', reason: why, actorId: actor.id, endCode: isAdmin ? 'removed_by_admin' : 'removed_by_lead',
    });
    if (out.error) throw teamError(out.code || 400, out.error);

    await recordAudit(pool, {
        actor, action: 'team.ambassador_removed', entityType: 'team_profile', entityId: profileId,
        targetUserId: profile.user_id, chapterId: profile.chapter_id, before: { status: 'active', tier: 'ambassador' },
        after: { status: 'removed' }, reason: why,
    });
    if (!isAdmin) {
        notifyAdmins({
            type: NOTIF_TYPES.TEAM_MEMBER_REMOVED, title: 'Ambassador removed',
            body: `${actor.name || 'A Chapter Lead'} removed an ambassador from ${profile.chapter_name || 'their chapter'}${why ? `: ${why}` : '.'}`,
            data: { url: '/admin-dashboard?tab=chapter_leads' },
        });
    }
    return { ok: true };
};

// ── Overviews ────────────────────────────────────────────────────────────────

/** The "My team" tab: seats, ambassadors with how they are doing, and who is waiting. */
export const getTeamOverview = async (actor) => {
    const chapterId = actor.team_chapter_id;
    if (!chapterId) {
        return { chapter: null, capacity: null, ambassadors: [], applications: [], recent_decisions: [] };
    }
    const [[chapter]] = await pool.query('SELECT id, name, country_code, slug FROM chapters WHERE id = ?', [chapterId]);
    const [capacity, members, pendingApps, recentApps] = await Promise.all([
        getChapterCapacity(chapterId),
        listLeadsOverview({ status: 'active', tier: TIERS.AMBASSADOR, chapterId }),
        listApplicationsForLead(actor, { status: 'pending' }),
        listApplicationsForLead(actor, { status: 'all' }),
    ]);
    return {
        chapter,
        capacity,
        ambassadors: members.map((m) => ({
            profile_id: m.id, user_id: m.user_id, name: m.name, photo_url: m.photo_url,
            joined_at: m.term_started_at || m.approved_at,
            goals: m.goals, goals_met: m.goals_met, partial_quarter: m.partial_quarter,
            standing: m.standing, consecutive_misses: m.consecutive_misses,
        })),
        applications: pendingApps,
        recent_decisions: recentApps.filter((a) => a.status !== 'pending').slice(0, 8),
    };
};

/**
 * Admin view of one chapter's team: the lead, the ambassadors, everyone waiting, and for a vacant
 * seat the ambassadors who could be promoted (tenure and how many quarters they met).
 */
export const getAdminChapterTeam = async (chapterId) => {
    const [[chapter]] = await pool.query('SELECT id, name, country_code, slug, status FROM chapters WHERE id = ?', [chapterId]);
    if (!chapter) return null;
    const [capacity, members] = await Promise.all([
        getChapterCapacity(chapterId),
        listLeadsOverview({ status: 'active', chapterId }),
    ]);
    const lead = members.find((m) => m.tier === TIERS.LEAD) || null;
    const ambassadors = members.filter((m) => m.tier === TIERS.AMBASSADOR);

    const ids = ambassadors.map((a) => a.id);
    let quarterStats = new Map();
    if (ids.length) {
        const [rows] = await pool.query(
            `SELECT profile_id, SUM(met = 1) AS met, COUNT(*) AS total
             FROM chapter_lead_quarters WHERE profile_id IN (?) AND status = 'closed' GROUP BY profile_id`,
            [ids],
        );
        quarterStats = new Map(rows.map((r) => [r.profile_id, { met: Number(r.met), total: Number(r.total) }]));
    }
    const [applications] = await pool.query(
        `SELECT ${APPLICATION_COLUMNS}, ma.routed_to, u.email AS applicant_email
         FROM membership_applications ma
         JOIN users u ON u.id = ma.user_id
         LEFT JOIN chapters c ON c.id = ma.requested_chapter_id
         WHERE ma.requested_chapter_id = ? AND ma.requested_role = 'council_member' AND ma.status = 'pending'
         ORDER BY ma.created_at ASC`,
        [chapterId],
    );
    const now = Date.now();
    return {
        chapter,
        capacity,
        lead,
        ambassadors: ambassadors.map((a) => {
            const q = quarterStats.get(a.id) || { met: 0, total: 0 };
            const since = a.term_started_at || a.approved_at;
            return {
                ...a,
                tenure_months: since ? Math.max(0, Math.floor((now - new Date(since).getTime()) / (30.44 * 86400000))) : null,
                quarters_met: q.met,
                quarters_scored: q.total,
            };
        }),
        applications: applications.map((a) => ({ ...leadViewOfApplication(a), applicant_email: a.applicant_email, routed_to: a.routed_to })),
    };
};
