/**
 * adminUserService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * What a founding member can change about a person, in one place (Manage Users):
 *
 *   updateUserAsAdmin   profile details + country + expiry, and the chapter-team seat
 *                       (role, tier, chapter, term start), all in ONE transaction
 *   resetUserPassword   sets a new password the same way every other password change does
 *
 * Never editable here: the password hash (use the reset), referral history, consent records,
 * and the person's earnings choice (that is theirs; an admin can only reset it, see
 * earningsElectionService.js). Every change is written to the audit log, the person is told
 * WHAT changed, and an email change also signs the account out everywhere.
 *
 * Founding members may edit other founding members (that is intended), but the other
 * founding members are always alerted when it touches a founding member's email, role or password.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import bcrypt from 'bcryptjs';
import pool from '../db/connection.js';
import { isCountryCode, TIERS, tierOf } from '../utils/chapterLeadRules.js';
import {
    applyRole, getActiveProfile, changeTeamProfile, teamError, isDuplicate,
} from './chapterLeadService.js';
import { storePasswordHash } from './sessionService.js';
import { notifyVacancyIfNeeded } from './chapterNotices.js';
import { notifyUser, NOTIF_TYPES } from './notificationService.js';
import {
    sendAccountChangedEmail, sendPasswordChangedEmail, sendSecurityAlertAdminEmail,
} from './emailService.js';
import { recordAudit } from './auditService.js';

const ROLES = ['founding_member', 'council_member', 'professional'];
const SUB_TYPES = ['working_professional', 'final_year_undergrad'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// field -> [label shown to the person, how to clean the value]
const text = (max, { required = false } = {}) => (v) => {
    const s = v === null || v === undefined ? '' : String(v).trim();
    if (!s) {
        if (required) throw teamError(422, 'That field cannot be empty.');
        return null;
    }
    if (s.length > max) throw teamError(422, `That value is too long (maximum ${max} characters).`);
    return s;
};

const PROFILE_FIELDS = {
    name: ['name', text(255, { required: true })],
    email: ['email address', (v) => {
        const s = String(v || '').trim().toLowerCase();
        if (!EMAIL.test(s) || s.length > 255) throw teamError(422, 'A valid email is required.');
        return s;
    }],
    bio: ['bio', text(2000)],
    organization_name: ['organisation', text(255)],
    linkedin_url: ['LinkedIn profile', text(500)],
    profile_badge: ['profile tag', text(100)],
    country_code: ['country', (v) => {
        if (v === null || v === '') return null;
        if (!isCountryCode(v)) throw teamError(422, 'Choose a valid country.');
        return String(v).trim().toUpperCase();
    }],
    professional_sub_type: ['professional type', (v) => {
        if (v === null || v === '') return null;
        if (!SUB_TYPES.includes(v)) throw teamError(422, 'Invalid professional type.');
        return v;
    }],
    membership_expires_at: ['membership expiry', (v) => {
        if (v === null || v === '') return null;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) throw teamError(422, 'Invalid membership expiry date.');
        return d;
    }],
};

const alertOtherFoundingMembers = async (target, event) => {
    if (target.role !== 'founding_member') return;
    try {
        const [admins] = await pool.query(
            `SELECT name, email FROM users WHERE role = 'founding_member' AND status = 'approved' AND id <> ?`,
            [target.id],
        );
        await Promise.all(admins.map((a) => sendSecurityAlertAdminEmail({
            adminEmail: a.email, adminName: a.name, accountName: target.name, accountEmail: target.email, event,
        })));
    } catch (err) {
        console.error('[AdminUser] Could not alert the other founding members:', err.message);
    }
};

const equal = (a, b) => {
    const norm = (x) => (x instanceof Date ? x.getTime() : (x === undefined ? null : x));
    return norm(a) === norm(b);
};

/**
 * @param {object} actor    req.user (a founding member)
 * @param {number} userId   the person being edited
 * @param {object} body     any of: name, email, bio, organization_name, linkedin_url, profile_badge,
 *                          country_code, professional_sub_type, membership_expires_at,
 *                          role, tier, chapter_id, term_started_at, override_cap
 * @returns the updated person (safe fields) and what changed
 */
export const updateUserAsAdmin = async (actor, userId, body = {}, ip = null) => {
    const conn = await pool.getConnection();
    let afterCommit = [];
    let target;
    const changed = [];            // labels, for the person
    let emailChangedFrom = null;
    let roleChanged = false;
    try {
        await conn.beginTransaction();
        [[target]] = await conn.query(
            `SELECT id, name, email, role, status, bio, organization_name, linkedin_url, profile_badge, country_code,
                    professional_sub_type, membership_expires_at
             FROM users WHERE id = ? FOR UPDATE`,
            [userId],
        );
        if (!target) throw teamError(404, 'User not found.');
        if (target.status === 'deleted') throw teamError(409, 'This account has been deleted and cannot be edited.');
        const self = target.id === actor.id;

        // ── Profile fields ───────────────────────────────────────────────────
        const set = {};
        const before = {};
        const after = {};
        for (const [field, [label, clean]] of Object.entries(PROFILE_FIELDS)) {
            if (body[field] === undefined) continue;
            const value = clean(body[field]);
            if (equal(value, target[field] instanceof Date ? target[field] : (target[field] ?? null))) continue;
            set[field] = value;
            before[field] = target[field] ?? null;
            after[field] = value;
            changed.push(label);
        }
        if (set.membership_expires_at !== undefined && target.role === 'council_member') {
            throw teamError(422, "A chapter team member's expiry follows their term; change the term start instead.");
        }
        if (set.professional_sub_type !== undefined && target.role !== 'professional') {
            throw teamError(422, 'The professional type applies to Professional members only.');
        }
        if (set.email) {
            const [dupe] = await conn.query('SELECT id FROM users WHERE email = ? AND id <> ?', [set.email, userId]);
            if (dupe.length) throw teamError(409, 'This email is already registered to another user.');
            emailChangedFrom = target.email;
        }
        if (Object.keys(set).length) {
            await conn.query(`UPDATE users SET ${Object.keys(set).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...Object.values(set), userId]);
            if (emailChangedFrom && !self) {
                // The email is the sign-in identity: end every session, and drop any code sent to the old address.
                try { await conn.query('UPDATE users SET password_changed_at = UTC_TIMESTAMP() WHERE id = ?', [userId]); } catch (e) { if (e.code !== 'ER_BAD_FIELD_ERROR') throw e; }
                try { await conn.query('DELETE FROM auth_otps WHERE email = ?', [emailChangedFrom.toLowerCase()]); } catch (e) { if (e.code !== 'ER_NO_SUCH_TABLE') throw e; }
            }
            await recordAudit(conn, {
                actor, action: 'user.profile_updated', entityType: 'user', entityId: userId, targetUserId: userId,
                before, after, ip,
            });
        }

        // ── Role and chapter-team seat ───────────────────────────────────────
        const newRole = body.role !== undefined && body.role !== target.role ? body.role : null;
        if (newRole !== null && !ROLES.includes(newRole)) throw teamError(422, 'Invalid role.');
        if (newRole !== null && self) throw teamError(403, 'You cannot change your own role.');

        const chapterGiven = body.chapter_id !== undefined;
        const chapterId = body.chapter_id === '' || body.chapter_id === null ? null : (chapterGiven ? parseInt(body.chapter_id, 10) : undefined);
        if (chapterGiven && chapterId !== null) {
            const [[c]] = await conn.query(`SELECT id FROM chapters WHERE id = ? AND status = 'active'`, [chapterId || 0]);
            if (!c) throw teamError(422, 'Chapter not found or inactive.');
        }
        const tierGiven = body.tier !== undefined && body.tier !== null && body.tier !== '';
        if (tierGiven && ![TIERS.LEAD, TIERS.AMBASSADOR].includes(body.tier)) throw teamError(422, 'Invalid tier.');
        const teamGiven = tierGiven || chapterGiven || Boolean(body.term_started_at);
        const overrideCap = body.override_cap === true;

        if (newRole !== null) {
            const { vacatedChapterId } = await applyRole(conn, userId, newRole, {
                adminId: actor.id, chapterId: chapterGiven ? chapterId : null, termStartedAt: body.term_started_at || null,
                approved: target.status === 'approved', tier: tierGiven ? body.tier : TIERS.LEAD, overrideCap,
            });
            roleChanged = true;
            changed.push('role');
            await recordAudit(conn, {
                actor, action: 'user.role_changed', entityType: 'user', entityId: userId, targetUserId: userId,
                before: { role: target.role }, after: { role: newRole, tier: tierGiven ? body.tier : null, chapter_id: chapterId ?? null }, ip,
            });
            afterCommit.push(() => { if (vacatedChapterId) notifyVacancyIfNeeded(vacatedChapterId, { immediate: true }); });
        } else if (teamGiven) {
            if (target.role !== 'council_member') {
                throw teamError(422, 'Only Chapter Leads and Chapter Ambassadors have a chapter team seat.');
            }
            const profile = await getActiveProfile(userId, conn);
            if (!profile) throw teamError(409, 'This person has no active chapter role.');
            const out = await changeTeamProfile(conn, profile.id, {
                chapterId: chapterGiven ? chapterId : undefined, termStartedAt: body.term_started_at || null,
                tier: tierGiven ? tierOf(body.tier) : null, overrideCap, actor,
            });
            changed.push('chapter team details');
            afterCommit.push(out.afterCommit);
        }

        if (!Object.keys(set).length && newRole === null && !teamGiven) throw teamError(422, 'Nothing to update.');
        await conn.commit();
    } catch (err) {
        await conn.rollback().catch(() => {});
        if (isDuplicate(err, 'uq_users_email') || (err.code === 'ER_DUP_ENTRY' && String(err.sqlMessage).includes('email'))) {
            throw teamError(409, 'This email is already registered to another user.');
        }
        throw err;
    } finally {
        conn.release();
    }

    // ── After commit ─────────────────────────────────────────────────────────
    afterCommit.forEach((fn) => { try { fn(); } catch (e) { console.error('[AdminUser] post-commit step failed:', e.message); } });

    if (target.id !== actor.id && changed.length) {
        notifyUser(userId, NOTIF_TYPES.ACCOUNT_CHANGED, 'Your account was updated',
            `An administrator updated your ${changed.join(', ')}.`, { url: '/user/dashboard' });
        // For an email change the warning goes to the OLD address: it is the one the owner still reads.
        sendAccountChangedEmail({ name: target.name, email: emailChangedFrom || target.email, changes: changed.map((c) => `Your ${c}`) });
    }
    if (emailChangedFrom) alertOtherFoundingMembers(target, 'email_changed');
    if (roleChanged) alertOtherFoundingMembers(target, 'role_changed');

    const [[row]] = await pool.query(
        `SELECT id, name, email, role, status, bio, organization_name, linkedin_url, profile_badge, country_code,
                professional_sub_type, membership_expires_at, chapter_id, created_at
         FROM users WHERE id = ?`,
        [userId],
    );
    const profile = await getActiveProfile(userId);
    return { user: row, team: profile && { id: profile.id, tier: profile.tier, chapter_id: profile.chapter_id, chapter_name: profile.chapter_name }, changed };
};

/** Sets a new password the same way a reset does: signs the account out everywhere and tells the owner. */
export const resetUserPassword = async (actor, userId, newPassword, ip = null) => {
    if (userId === actor.id) {
        throw teamError(403, 'Use Change password on your own profile to change your password.');
    }
    const [[target]] = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = ?', [userId]);
    if (!target) throw teamError(404, 'User not found.');
    if (target.status === 'deleted') throw teamError(409, 'This account has been deleted.');

    const hash = await bcrypt.hash(newPassword, 12);
    await storePasswordHash(userId, hash);            // also stamps password_changed_at
    await recordAudit(pool, {
        actor, action: 'user.password_reset', entityType: 'user', entityId: userId, targetUserId: userId, ip,
    });
    sendPasswordChangedEmail({ name: target.name, email: target.email });
    alertOtherFoundingMembers(target, 'password_reset');
    return { name: target.name };
};
