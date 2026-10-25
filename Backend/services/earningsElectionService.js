/**
 * earningsElectionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * "Receive or waive": the choice a Chapter Lead makes about revenue share, commission and
 * workshop fees, together with the confirmation that they have checked their employment terms.
 *
 * Rules (agreed):
 *   • The choice is the PERSON'S OWN. Admins can only reset it (the person then chooses again).
 *   • Earnings stay off until employer clearance is confirmed: 'receive' needs it (also enforced
 *     by a CHECK in the database). Everyone, ambassadors included, gives the confirmation.
 *   • Ambassadors never earn, so theirs is always 'waive'.
 *   • The first choice takes effect immediately. A later change takes effect at the next term
 *     boundary, going forward only. Waived amounts stay with RAC: nothing accrues or is deferred.
 *   • Every choice is an append-only row, so "was this person eligible on date D?" can always be answered.
 *
 * Existing leads are only asked once EARNINGS_GATE=on (see utils/featureFlags.js), i.e. after
 * counsel has approved the wording.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { TIERS, POLICY_VERSION, getTermInfo, toSqlDate, toSqlDateTime } from '../utils/chapterLeadRules.js';
import { earningsGateOn } from '../utils/featureFlags.js';
import { notifyUser, NOTIF_TYPES } from './notificationService.js';
import { sendChapterLeadNoticeEmail } from './emailService.js';
import { recordAudit } from './auditService.js';
import {
    getActiveProfile, getProfileById, getPolicyAt, getEarningsState, needsPolicyAcceptance, teamError,
} from './chapterLeadService.js';

const insertElection = (db, row) => db.query(
    `INSERT INTO earnings_elections
       (profile_id, user_id, choice, employer_confirmed, effective_from, policy_version, source, actor_user_id, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        row.profileId, row.userId, row.choice, row.employerConfirmed ? 1 : 0, row.effectiveFrom, POLICY_VERSION,
        row.source || 'self', row.actorId ?? null, row.ip ? String(row.ip).slice(0, 45) : null,
        row.createdAt ? toSqlDateTime(new Date(row.createdAt)) : toSqlDateTime(new Date()),
    ],
);

/** A person's own choice (the lead's "receive / waive", or an ambassador's confirmation). */
export const recordElection = async (user, { choice, employerConfirmed, ip = null }) => {
    const profile = await getActiveProfile(user.id);
    if (!profile) throw teamError(404, 'You do not have an active chapter role.');
    if (employerConfirmed !== true) {
        throw teamError(422, 'Please confirm that you have checked your employment terms, and obtained any approval you need, before continuing.');
    }

    let picked = choice;
    if (profile.tier === TIERS.AMBASSADOR) {
        if (picked === 'receive') throw teamError(422, 'The Chapter Ambassador role is a volunteer role and does not include earnings.');
        picked = 'waive';
    }
    if (!['receive', 'waive'].includes(picked)) throw teamError(422, 'Choose whether to receive or waive earnings.');

    const now = new Date();
    const current = await getEarningsState(profile.id, now);
    const hasChosen = current.choice === 'receive' || current.choice === 'waive';

    if (hasChosen && current.choice === picked && !current.pending) {
        return { state: current, effective_from: current.effective_from, unchanged: true };
    }

    // First choice: now. A change: from the next term onward, so a decision made today cannot reach back.
    let effectiveFrom = toSqlDate(now);
    if (hasChosen) {
        const policy = await getPolicyAt(now);
        effectiveFrom = toSqlDate(getTermInfo(profile.term_started_at, now, policy).termEnd);
    }

    await insertElection(pool, {
        profileId: profile.id, userId: user.id, choice: picked, employerConfirmed: true,
        effectiveFrom, source: 'self', actorId: user.id, ip,
    });
    await recordAudit(pool, {
        actor: user, action: 'earnings.elected', entityType: 'team_profile', entityId: profile.id,
        targetUserId: user.id, chapterId: profile.chapter_id,
        before: { choice: current.choice }, after: { choice: picked, effective_from: effectiveFrom }, ip,
    });

    const state = await getEarningsState(profile.id, now);
    return { state, effective_from: effectiveFrom, takes_effect_later: effectiveFrom > toSqlDate(now) };
};

/**
 * An ambassador's confirmation, recorded when they are approved (the applicant gave it on the
 * application form). Runs inside the approval transaction.
 */
export const recordApplicationClearance = async (conn, { profileId, userId, confirmedAt, ip = null }) => {
    await insertElection(conn, {
        profileId, userId, choice: 'waive', employerConfirmed: true,
        effectiveFrom: toSqlDate(new Date()), source: 'self', actorId: userId, ip, createdAt: confirmedAt || new Date(),
    });
};

/**
 * Admin: make the person choose again. Never sets a choice for them.
 * Returns the profile so the caller can say who was reset.
 */
export const resetElection = async (profileId, actor, reason = null) => {
    const profile = await getProfileById(profileId);
    if (!profile) throw teamError(404, 'Team member not found.');
    if (profile.status !== 'active') throw teamError(409, 'This role has already ended.');

    const now = new Date();
    const before = await getEarningsState(profile.id, now);
    await insertElection(pool, {
        profileId: profile.id, userId: profile.user_id, choice: 'reset', employerConfirmed: false,
        effectiveFrom: toSqlDate(now), source: 'admin_reset', actorId: actor.id,
    });
    await recordAudit(pool, {
        actor, action: 'earnings.reset', entityType: 'team_profile', entityId: profile.id,
        targetUserId: profile.user_id, chapterId: profile.chapter_id,
        before: { choice: before.choice }, after: { choice: 'not_chosen' }, reason,
    });

    const [[u]] = await pool.query('SELECT name, email FROM users WHERE id = ?', [profile.user_id]);
    notifyUser(
        profile.user_id, NOTIF_TYPES.ACCOUNT_CHANGED,
        'Please review your earnings choice',
        'An administrator has asked you to confirm your earnings choice again. You will be prompted the next time you open your dashboard.',
        { url: '/user/dashboard' },
    );
    if (u?.email) {
        sendChapterLeadNoticeEmail({
            name: u.name, email: u.email, subject: 'Please review your earnings choice',
            heading: 'Please review your earnings choice', tone: 'info',
            paragraphs: [
                'An administrator has asked you to confirm whether you want to receive or waive earnings for your chapter role.',
                'Nothing is paid or lost by this. You will be asked to choose again the next time you open your dashboard.',
            ],
            ctaLabel: 'Open my dashboard', ctaPath: '/user/dashboard',
        });
    }
    return profile;
};

/** What the person still has to do before carrying on: used by GET /api/auth/me. */
export const getPendingGates = async (userId, role) => {
    const gates = { policy: false, earnings: false };
    if (role !== 'council_member') return gates;
    try {
        gates.policy = await needsPolicyAcceptance(userId, role);
        if (earningsGateOn()) {
            const profile = await getActiveProfile(userId);
            if (profile) {
                const state = await getEarningsState(profile.id);
                gates.earnings = state.choice === 'not_chosen';
            }
        }
    } catch (err) {
        console.error('[Gates] check failed:', err.message);   // never break session restore
    }
    return gates;
};
