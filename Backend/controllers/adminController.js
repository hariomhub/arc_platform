import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import { sendAccountApprovedEmail, sendMembershipApplicationStatusEmail } from '../services/emailService.js';
import { notifyUser, NOTIF_TYPES } from '../services/notificationService.js';
import { softDeleteUser, purgeProfilePhoto } from '../services/accountDeletionService.js';
import {
    activateChapterLead, qualifyReferral, voidReferral, isDuplicate, roleExpiry,
} from '../services/chapterLeadService.js';
import { decideTeamApplication } from '../services/chapterTeamService.js';
import { updateUserAsAdmin, resetUserPassword as resetPasswordFor } from '../services/adminUserService.js';
import { notifyVacancyIfNeeded } from '../services/chapterNotices.js';
import { recordAudit, getAuditForUser } from '../services/auditService.js';
import { TIERS } from '../utils/chapterLeadRules.js';

const CHAPTER_TAKEN_MESSAGE =
    'That chapter already has an active Chapter Lead. End their role first or choose a different chapter.';

// Looks up an active chapter by id. Returns the id, null (none given) or false (invalid).
const resolveChapterId = async (conn, raw) => {
    if (raw === undefined || raw === null || raw === '') return null;
    const id = parseInt(raw, 10);
    if (!id) return false;
    const [[row]] = await conn.query("SELECT id FROM chapters WHERE id = ? AND status = 'active'", [id]);
    return row ? id : false;
};

const paginate = (query, total) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return { page, limit, offset, totalPages };
};

// GET /api/admin/users
export const getUsers = async (req, res, next) => {
    try {
        const { role, status, search } = req.query;
        const tier = [TIERS.LEAD, TIERS.AMBASSADOR].includes(req.query.tier) ? req.query.tier : null;
        const chapterId = parseInt(req.query.chapter_id, 10) || null;

        let countSql = 'SELECT COUNT(*) AS total FROM users WHERE 1=1';
        // country_code and who referred the member help an admin vet a new sign-up.
        let dataSql  = `SELECT id, name, email, role, status, organization_name, linkedin_url, professional_sub_type, profile_badge, created_at, country_code, membership_expires_at, bio,
                               (SELECT l.name FROM referrals r JOIN users l ON l.id = r.lead_user_id
                                WHERE r.referred_user_id = users.id LIMIT 1) AS referred_by_name,
                               (SELECT p.tier_code FROM chapter_lead_profiles p WHERE p.active_user_id = users.id) AS tier,
                               (SELECT p.chapter_id FROM chapter_lead_profiles p WHERE p.active_user_id = users.id) AS team_chapter_id,
                               (SELECT c.name FROM chapter_lead_profiles p JOIN chapters c ON c.id = p.chapter_id WHERE p.active_user_id = users.id) AS team_chapter_name,
                               (SELECT p.term_started_at FROM chapter_lead_profiles p WHERE p.active_user_id = users.id) AS team_started_at
                        FROM users WHERE 1=1`;
        const params = [];

        if (role) {
            const clause = ' AND role = ?';
            countSql += clause; dataSql += clause;
            params.push(role);
        }
        if (tier || chapterId) {
            // Team seat filters: who holds a lead / ambassador seat, and in which chapter.
            const clause = ` AND EXISTS (SELECT 1 FROM chapter_lead_profiles p WHERE p.active_user_id = users.id${tier ? ' AND p.tier_code = ?' : ''}${chapterId ? ' AND p.chapter_id = ?' : ''})`;
            countSql += clause; dataSql += clause;
            if (tier) params.push(tier);
            if (chapterId) params.push(chapterId);
        }
        if (status) {
            const clause = ' AND status = ?';
            countSql += clause; dataSql += clause;
            params.push(status);
        } else {
            // Deleted accounts are tombstoned, not removed — keep them out of
            // the default view; admins can still look them up via ?status=deleted
            const clause = " AND status != 'deleted'";
            countSql += clause; dataSql += clause;
        }
        if (search) {
            const clause = ' AND (name LIKE ? OR email LIKE ?)';
            countSql += clause; dataSql += clause;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);

        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/pending-users
export const getPendingUsers = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, role, status, organization_name, linkedin_url, professional_sub_type, created_at
             FROM users WHERE status = 'pending' ORDER BY created_at ASC`
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/approve
export const approveUser = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const { role } = rows[0];
        const userId = parseInt(req.params.id, 10);

        const chapterId = await resolveChapterId(conn, req.body.chapter_id);
        if (chapterId === false) {
            return res.status(422).json({ success: false, message: 'Chapter not found or inactive.' });
        }

        await conn.beginTransaction();

        const badgeSql = req.body.profile_badge ? ', profile_badge = ?' : '';
        const badgeParam = req.body.profile_badge ? [req.body.profile_badge] : [];
        if (role === 'council_member') {
            // Chapter Leads: the shared service sets the term-based expiry.
            await conn.query(
                `UPDATE users SET status = 'approved', approved_at = COALESCE(approved_at, UTC_TIMESTAMP())${badgeSql} WHERE id = ?`,
                [...badgeParam, userId]
            );
            await activateChapterLead(conn, userId, {
                chapterId, termStartedAt: req.body.term_started_at || null,
                tier: req.body.tier || TIERS.LEAD, approvedBy: req.user.id, overrideCap: req.body.override_cap === true,
            });
        } else {
            await conn.query(
                `UPDATE users SET status = 'approved', membership_expires_at = ?, approved_at = COALESCE(approved_at, UTC_TIMESTAMP())${badgeSql} WHERE id = ?`,
                [roleExpiry(role), ...badgeParam, userId]
            );
        }
        // A referred member now counts toward their lead's quarterly goal.
        await qualifyReferral(userId, conn);
        await recordAudit(conn, {
            actor: req.user, action: 'user.approved', entityType: 'user', entityId: userId, targetUserId: userId,
            before: { status: 'pending' }, after: { status: 'approved', role }, ip: req.ip,
        });

        await conn.commit();

        // Email notification
        sendAccountApprovedEmail({ name: rows[0].name, email: rows[0].email, role: rows[0].role, profile_badge: req.body.profile_badge });

        // Push notification — immediate
        notifyUser(
            userId,
            NOTIF_TYPES.ACCOUNT_APPROVED,
            'Your account has been approved!',
            'Welcome to AI Risk Council. You now have full access to the platform.',
            { url: '/user/dashboard' }
        );

        return res.json({ success: true, message: 'User approved.' });
    } catch (err) {
        await conn.rollback().catch(() => {});
        if (isDuplicate(err, 'uq_clp_one_active_per_chapter')) {
            return res.status(409).json({ success: false, message: CHAPTER_TAKEN_MESSAGE });
        }
        next(err);
    } finally {
        conn.release();
    }
};

// PATCH /api/admin/users/:id/reject
export const rejectUser = async (req, res, next) => {
    try {
        const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        await pool.query("UPDATE users SET status = 'rejected' WHERE id = ?", [req.params.id]);
        await voidReferral(parseInt(req.params.id, 10), 'Referred account was rejected');

        // Push notification — immediate
        notifyUser(
            parseInt(req.params.id, 10),
            NOTIF_TYPES.ACCOUNT_REJECTED,
            'Application update',
            'Your account application was not approved at this time. Contact us for more information.',
            { url: '/contact' }
        );

        return res.json({ success: true, message: 'User rejected.' });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/status
export const updateUserStatus = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { status } = req.body;
        const userId = parseInt(req.params.id, 10);

        if (userId === req.user.id) {
            return res.status(403).json({ success: false, message: 'You cannot change your own status.' });
        }

        const [rows] = await conn.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const chapterId = await resolveChapterId(conn, req.body.chapter_id);
        if (chapterId === false) {
            return res.status(422).json({ success: false, message: 'Chapter not found or inactive.' });
        }

        await conn.beginTransaction();
        await conn.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

        if (status === 'approved') {
            await conn.query('UPDATE users SET approved_at = COALESCE(approved_at, UTC_TIMESTAMP()) WHERE id = ?', [userId]);
            if (rows[0].role === 'council_member') {
                await activateChapterLead(conn, userId, { chapterId, tier: req.body.tier || TIERS.LEAD, approvedBy: req.user.id });
            } else {
                await conn.query('UPDATE users SET membership_expires_at = ? WHERE id = ?', [roleExpiry(rows[0].role), userId]);
            }
            await qualifyReferral(userId, conn);
        } else if (status === 'rejected') {
            await voidReferral(userId, 'Referred account was rejected', conn);
        }
        await recordAudit(conn, {
            actor: req.user, action: 'user.status_changed', entityType: 'user', entityId: userId, targetUserId: userId,
            after: { status }, ip: req.ip,
        });
        await conn.commit();

        if (status === 'approved') {
            sendAccountApprovedEmail({ name: rows[0].name, email: rows[0].email, role: rows[0].role });

            notifyUser(
                userId,
                NOTIF_TYPES.ACCOUNT_APPROVED,
                'Your account has been approved!',
                'Welcome to AI Risk Council. You now have full access to the platform.',
                { url: '/user/dashboard' }
            );
        } else if (status === 'rejected') {
            notifyUser(
                userId,
                NOTIF_TYPES.ACCOUNT_REJECTED,
                'Application update',
                'Your account application was not approved at this time. Contact us for more information.',
                { url: '/contact' }
            );
        }

        return res.json({ success: true, data: { message: `User status updated to "${status}".` } });
    } catch (err) {
        await conn.rollback().catch(() => {});
        if (isDuplicate(err, 'uq_clp_one_active_per_chapter')) {
            return res.status(409).json({ success: false, message: CHAPTER_TAKEN_MESSAGE });
        }
        next(err);
    } finally {
        conn.release();
    }
};

// PATCH /api/admin/users/:id/role   body: { role, chapter_id?, tier?, term_started_at?, override_cap? }
// A thin wrapper: every Manage Users edit goes through services/adminUserService.js.
export const updateUserRole = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { role, chapter_id, tier, term_started_at, override_cap } = req.body;
        const { user } = await updateUserAsAdmin(req.user, userId, { role, chapter_id, tier, term_started_at, override_cap }, req.ip);
        return res.json({ success: true, data: { message: `User role updated to "${user.role}".` } });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id   body: any of name, email, bio, organization_name, linkedin_url, profile_badge,
//   country_code, professional_sub_type, membership_expires_at, role, tier, chapter_id, term_started_at, override_cap
export const patchUser = async (req, res, next) => {
    try {
        const out = await updateUserAsAdmin(req.user, parseInt(req.params.id, 10), req.body, req.ip);
        return res.json({ success: true, data: out });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/users/:id/audit  — the change history of one person
export const getUserAudit = async (req, res, next) => {
    try {
        const rows = await getAuditForUser(parseInt(req.params.id, 10), 100);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const targetId = parseInt(req.params.id, 10);
        if (targetId === req.user.id) {
            return res.status(403).json({ success: false, message: 'You cannot delete your own account.' });
        }

        const [rows] = await conn.query(
            'SELECT id, name, email, status, role, photo_url FROM users WHERE id = ?',
            [targetId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const user = rows[0];
        if (user.status === 'deleted') {
            return res.status(409).json({ success: false, message: 'This account has already been deleted.' });
        }

        await conn.beginTransaction();

        await conn.query(
            `INSERT INTO account_deletion_requests (user_id, full_name, email, reason, status, requested_at, approved_at, completed_at, approved_by, admin_notes)
             VALUES (?, ?, ?, NULL, 'Deleted', NOW(), NOW(), NOW(), ?, 'Account deleted by admin via User Management panel.')`,
            [user.id, user.name, user.email, req.user.id]
        );

        // Scrub identifying data in place and remove purely-private records.
        // Posts, resources, reviews, and votes are left untouched — they keep
        // pointing at this same (now-anonymized) user row.
        const { vacatedChapterId } = await softDeleteUser(conn, user);
        await recordAudit(conn, {
            actor: req.user, action: 'user.deleted', entityType: 'user', entityId: user.id, targetUserId: user.id,
            before: { role: user.role, status: user.status }, after: { status: 'deleted' }, ip: req.ip,
        });

        await conn.commit();

        // A Chapter Lead removed this way empties their chapter's lead seat: tell the admins.
        if (vacatedChapterId) notifyVacancyIfNeeded(vacatedChapterId, { immediate: true });

        // Purge profile photo from Azure Blob Storage (fire-and-forget)
        await purgeProfilePhoto(user);

        return res.json({ success: true, data: { message: 'User deleted successfully.' } });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};

// PATCH /api/admin/users/:id/badge  — update profile badge only
export const updateUserBadge = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const badgeValue = req.body.profile_badge ? req.body.profile_badge.trim() : null;

        await pool.query(
            'UPDATE users SET profile_badge = ? WHERE id = ?',
            [badgeValue, req.params.id]
        );

        return res.json({
            success: true,
            data: {
                message: badgeValue
                    ? `Badge "${badgeValue}" assigned to ${rows[0].name}.`
                    : `Badge removed from ${rows[0].name}.`,
                profile_badge: badgeValue,
            },
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/admin/users
export const createUser = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { name, email, password, role, status, organization_name, linkedin_url, professional_sub_type } = req.body;

        const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This email is already registered.' });
        }

        const chapterId = await resolveChapterId(conn, req.body.chapter_id);
        if (chapterId === false) {
            return res.status(422).json({ success: false, message: 'Chapter not found or inactive.' });
        }

        const password_hash  = await bcrypt.hash(password, 12);
        const assignedRole   = role   || 'professional';
        const assignedStatus = status || 'approved';
        const subType         = assignedRole === 'professional' ? (professional_sub_type || null) : null;

        // Chapter team members get their term-based expiry from the shared service below.
        const expiresAt = assignedStatus === 'approved' ? roleExpiry(assignedRole) : null;

        await conn.beginTransaction();
        const [result] = await conn.query(
            `INSERT INTO users (name, email, password_hash, role, status, membership_expires_at, approved_at, organization_name, linkedin_url, professional_sub_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), email.trim().toLowerCase(), password_hash, assignedRole, assignedStatus, expiresAt,
             assignedStatus === 'approved' ? new Date() : null,
             organization_name || null, linkedin_url || null, subType]
        );
        if (assignedRole === 'council_member' && assignedStatus === 'approved') {
            await activateChapterLead(conn, result.insertId, {
                chapterId, termStartedAt: req.body.term_started_at || null,
                tier: req.body.tier || TIERS.LEAD, approvedBy: req.user.id, overrideCap: req.body.override_cap === true,
            });
        }
        await recordAudit(conn, {
            actor: req.user, action: 'user.created', entityType: 'user', entityId: result.insertId, targetUserId: result.insertId,
            after: { role: assignedRole, status: assignedStatus, tier: assignedRole === 'council_member' ? (req.body.tier || TIERS.LEAD) : null, chapter_id: chapterId }, ip: req.ip,
        });
        await conn.commit();

        const [rows] = await pool.query(
            'SELECT id, name, email, role, status, organization_name, linkedin_url, professional_sub_type, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        return res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        await conn.rollback().catch(() => {});
        if (isDuplicate(err, 'uq_clp_one_active_per_chapter')) {
            return res.status(409).json({ success: false, message: CHAPTER_TAKEN_MESSAGE });
        }
        next(err);
    } finally {
        conn.release();
    }
};

// PATCH /api/admin/users/:id/details  — edit name/email/bio/org/linkedin/sub-type
// Kept for the existing screen; it is the same service as PATCH /users/:id.
export const updateUserDetails = async (req, res, next) => {
    try {
        const { name, email, bio, organization_name, linkedin_url, professional_sub_type } = req.body;
        const { user } = await updateUserAsAdmin(
            req.user, parseInt(req.params.id, 10),
            { name, email, bio, organization_name, linkedin_url, professional_sub_type },
            req.ip,
        );
        return res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/password  — admin-initiated password reset
export const resetUserPassword = async (req, res, next) => {
    try {
        const out = await resetPasswordFor(req.user, parseInt(req.params.id, 10), req.body.newPassword, req.ip);
        return res.json({ success: true, data: { message: `Password reset for ${out.name}.` } });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/stats
export const getStats = async (req, res, next) => {
    try {
        const [[{ total_users }]]          = await pool.query("SELECT COUNT(*) AS total_users FROM users WHERE status != 'deleted'");
        const [[{ pending_users }]]        = await pool.query('SELECT COUNT(*) AS pending_users FROM users WHERE status = "pending"');
        const [[{ approved_users }]]       = await pool.query('SELECT COUNT(*) AS approved_users FROM users WHERE status = "approved"');
        const [[{ rejected_users }]]       = await pool.query('SELECT COUNT(*) AS rejected_users FROM users WHERE status = "rejected"');
        const [[{ total_resources }]]      = await pool.query('SELECT COUNT(*) AS total_resources FROM resources');
        const [[{ total_events }]]         = await pool.query('SELECT COUNT(*) AS total_events FROM events');
        const [[{ total_qna }]]            = await pool.query('SELECT COUNT(*) AS total_qna FROM feed_posts');
        const [[{ pending_applications }]] = await pool.query(
            'SELECT COUNT(*) AS pending_applications FROM membership_applications WHERE status = "pending"'
        );

        return res.json({
            success: true,
            data: { total_users, pending_users, approved_users, rejected_users, total_resources, total_events, total_qna, pending_applications },
        });
    } catch (err) {
        next(err);
    }
};

// ─── Membership Applications ──────────────────────────────────────────────────

// GET /api/admin/membership-applications
export const getMembershipApplications = async (req, res, next) => {
    try {
        const { status, role, tier } = req.query;
        let countSql = `SELECT COUNT(*) AS total FROM membership_applications ma JOIN users u ON u.id = ma.user_id WHERE 1=1`;
        let dataSql  = `
            SELECT ma.*, u.name AS current_name, u.role AS current_role, u.status AS account_status, u.profile_badge,
                   c.name AS requested_chapter_name,
                   (SELECT COUNT(*) FROM chapter_lead_profiles p WHERE p.active_chapter_id = ma.requested_chapter_id) AS chapter_has_lead,
                   (SELECT COUNT(*) FROM chapter_lead_profiles p
                      WHERE p.chapter_id = ma.requested_chapter_id AND p.status = 'active' AND p.tier_code = 'ambassador') AS chapter_ambassadors,
                   lu.name AS routed_lead_name
            FROM membership_applications ma
            JOIN users u ON u.id = ma.user_id
            LEFT JOIN chapters c ON c.id = ma.requested_chapter_id
            LEFT JOIN users lu ON lu.id = ma.approver_user_id
            WHERE 1=1
        `;
        const params = [];

        if (status) { const clause = ' AND ma.status = ?';       countSql += clause; dataSql += clause; params.push(status); }
        if (role)   { const clause = ' AND ma.requested_role = ?'; countSql += clause; dataSql += clause; params.push(role); }
        if (tier)   { const clause = ' AND ma.requested_tier = ?'; countSql += clause; dataSql += clause; params.push(tier); }

        const [[{ total }]] = await pool.query(countSql, params);
        const { page, limit, offset, totalPages } = paginate(req.query, total);

        dataSql += ' ORDER BY ma.created_at DESC LIMIT ? OFFSET ?';
        const [rows] = await pool.query(dataSql, [...params, limit, offset]);
        return res.json({ success: true, data: rows, total, page, limit, totalPages });
    } catch (err) {
        next(err);
    }
};

// Applications for a team seat (Chapter Lead or Chapter Ambassador) are decided by the shared team service;
// that is the same code path a Chapter Lead uses for their own chapter's ambassadors.
const decideRoleApplication = (status) => async (req, res, next) => {
    try {
        const [[app]] = await pool.query('SELECT id, requested_role FROM membership_applications WHERE id = ?', [req.params.id]);
        if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });

        if (app.requested_role === 'council_member') {
            await decideTeamApplication(app.id, req.user, {
                status,
                note: req.body.admin_notes || null,
                chapterId: req.body.chapter_id,
                termStartedAt: req.body.term_started_at || null,
                profileBadge: req.body.profile_badge || null,
                overrideCap: req.body.override_cap === true,
            });
            return res.json({ success: true, message: status === 'approved' ? 'Application approved. User role updated.' : 'Application rejected.' });
        }
        return decideLegacyApplication(status, req, res, next);
    } catch (err) {
        next(err);
    }
};

// Old Founding Member requests (no longer created, but old rows can still be decided).
const decideLegacyApplication = async (status, req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const [[app]] = await conn.query(
            `SELECT ma.*, u.name, u.email FROM membership_applications ma
             JOIN users u ON u.id = ma.user_id
             WHERE ma.id = ?`,
            [req.params.id]
        );
        if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
        if (app.status !== 'pending') {
            return res.status(409).json({ success: false, message: 'Application has already been processed.' });
        }
        const approved = status === 'approved';

        await conn.beginTransaction();
        if (approved) {
            await conn.query(
                `UPDATE users SET role = ?, membership_expires_at = ? WHERE id = ?`,
                [app.requested_role, roleExpiry(app.requested_role), app.user_id]
            );
            if (req.body.profile_badge) {
                await conn.query(`UPDATE users SET profile_badge = ? WHERE id = ?`, [req.body.profile_badge, app.user_id]);
            }
        }
        await conn.query(
            `UPDATE membership_applications SET status = ?, processed_at = NOW(), admin_notes = ?, decided_by = ? WHERE id = ?`,
            [status, req.body.admin_notes || null, req.user.id, req.params.id]
        );
        await recordAudit(conn, {
            actor: req.user, action: approved ? 'application.approved' : 'application.rejected', entityType: 'application',
            entityId: app.id, targetUserId: app.user_id, after: { status, role: app.requested_role }, ip: req.ip,
        });
        await conn.commit();

        sendMembershipApplicationStatusEmail({
            name: app.name, email: app.email, requestedRole: app.requested_role, status,
            adminNotes: req.body.admin_notes || null, profile_badge: req.body.profile_badge,
        });
        notifyUser(
            app.user_id,
            approved ? NOTIF_TYPES.MEMBERSHIP_APPROVED : NOTIF_TYPES.MEMBERSHIP_REJECTED,
            approved ? 'Founding Member membership approved!' : 'Membership application update',
            approved ? 'Congratulations! Your Founding Member membership is now active.'
                : 'Your Founding Member membership application was not approved at this time.',
            { url: approved ? '/user/dashboard' : '/contact' }
        );
        return res.json({ success: true, message: approved ? 'Application approved. User role updated.' : 'Application rejected.' });
    } catch (err) {
        await conn.rollback().catch(() => {});
        next(err);
    } finally {
        conn.release();
    }
};

// PATCH /api/admin/membership-applications/:id/approve
export const approveMembershipApplication = decideRoleApplication('approved');

// PATCH /api/admin/membership-applications/:id/reject
export const rejectMembershipApplication = decideRoleApplication('rejected');

// ─── Sub-Type Upgrade Requests (final_year_undergrad → working_professional) ──

// GET /api/admin/sub-type-upgrades?status=pending&page=1&limit=20
export const getPendingSubTypeUpgrades = async (req, res, next) => {
    try {
        const status = ['pending','approved','rejected'].includes(req.query.status) ? req.query.status : 'pending';
        const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
        const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;

        // Build WHERE clause based on requested status
        let where;
        if (status === 'pending')  where = `WHERE pending_sub_type_upgrade = 1`;
        else                       where = `WHERE sub_type_upgrade_status = '${status}'`;

        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${where}`);
        const [rows] = await pool.query(
            `SELECT id, name, email, organization_name, linkedin_url, created_at,
                    professional_sub_type, sub_type_upgrade_status, profile_badge
             FROM users ${where}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const totalPages = Math.ceil(total / limit) || 1;
        return res.json({ success: true, data: rows, total, page, totalPages });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/sub-type-upgrades/:id/approve
export const approveSubTypeUpgrade = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, role, professional_sub_type, pending_sub_type_upgrade FROM users WHERE id = ?',
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });

        const u = rows[0];
        if (u.role !== 'professional' || u.professional_sub_type !== 'final_year_undergrad') {
            return res.status(409).json({ success: false, message: 'User is not a final_year_undergrad professional.' });
        }
        if (!u.pending_sub_type_upgrade) {
            return res.status(409).json({ success: false, message: 'No pending upgrade request for this user.' });
        }

        if (req.body.profile_badge) {
            await pool.query(
                `UPDATE users
                 SET professional_sub_type = 'working_professional',
                     pending_sub_type_upgrade = 0,
                     sub_type_upgrade_status = 'approved',
                     profile_badge = ?
                 WHERE id = ?`,
                [req.body.profile_badge, req.params.id]
            );
        } else {
            await pool.query(
                `UPDATE users
                 SET professional_sub_type = 'working_professional',
                     pending_sub_type_upgrade = 0,
                     sub_type_upgrade_status = 'approved'
                 WHERE id = ?`,
                [req.params.id]
            );
        }

        notifyUser(
            parseInt(req.params.id, 10),
            NOTIF_TYPES.ACCOUNT_APPROVED,
            'Upgrade approved!',
            'Your account has been upgraded to Working Professional. You can now download resources.',
            { url: '/resources' }
        );

        return res.json({ success: true, message: 'Sub-type upgrade approved. User is now a Working Professional.' });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/sub-type-upgrades/:id/reject
export const rejectSubTypeUpgrade = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, pending_sub_type_upgrade FROM users WHERE id = ?',
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
        if (!rows[0].pending_sub_type_upgrade) {
            return res.status(409).json({ success: false, message: 'No pending upgrade request for this user.' });
        }

        await pool.query(
            `UPDATE users
             SET pending_sub_type_upgrade = 0,
                 sub_type_upgrade_status = 'rejected'
             WHERE id = ?`,
            [req.params.id]
        );

        notifyUser(
            parseInt(req.params.id, 10),
            NOTIF_TYPES.ACCOUNT_REJECTED,
            'Upgrade request not approved',
            'Your Working Professional upgrade request was not approved at this time. Contact us for more information.',
            { url: '/contact' }
        );

        return res.json({ success: true, message: 'Sub-type upgrade rejected.' });
    } catch (err) {
        next(err);
    }
};