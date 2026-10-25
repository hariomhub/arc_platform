/**
 * auditService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The change history (table audit_log): who changed what, from what to what.
 *
 * Append-only. The ONLY thing that ever rewrites a row is redactAuditForUser(), which blanks
 * personal data when an account is deleted (the fact that a change happened is kept).
 *
 * Pass a transaction connection as `db` to make the entry part of the same transaction as the
 * change it describes (it then fails with it). Called with the pool, a logging failure is
 * reported but never breaks the request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';

// Never written to the log, even when a caller passes a whole row by mistake.
const NEVER_LOG = new Set(['password_hash', 'password', 'newPassword', 'token', 'otp', 'code']);

// Blanked by redactAuditForUser() when the person deletes their account.
const PERSONAL_KEYS = new Set(['name', 'email', 'phone', 'bio', 'photo_url', 'linkedin_url', 'organization_name', 'job_title']);

const REDACTED = '[removed]';

const clean = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'object') return value;
    const out = Array.isArray(value) ? [] : {};
    Object.entries(value).forEach(([k, v]) => {
        if (NEVER_LOG.has(k)) return;
        out[k] = v && typeof v === 'object' && !(v instanceof Date) ? clean(v) : v;
    });
    return out;
};

const toJson = (value) => (value === undefined || value === null ? null : JSON.stringify(clean(value)));

/** What the actor was at the time: 'system' | 'founding_member' | 'lead' | 'ambassador' | 'member'. */
export const actorLabel = (actor) => {
    if (!actor) return 'system';
    if (actor.role === 'founding_member') return 'founding_member';
    if (actor.role === 'council_member') return actor.tier === 'ambassador' ? 'ambassador' : 'lead';
    return 'member';
};

/**
 * @param {object} db      pool or a transaction connection
 * @param {object} entry   { actor, action, entityType, entityId?, targetUserId?, chapterId?, before?, after?, reason?, ip? }
 */
export const recordAudit = async (db, entry) => {
    const strict = db !== pool;
    try {
        await db.query(
            `INSERT INTO audit_log
               (actor_user_id, actor_label, action, entity_type, entity_id, target_user_id, chapter_id,
                before_json, after_json, reason, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                entry.actor?.id ?? null,
                actorLabel(entry.actor),
                String(entry.action).slice(0, 60),
                String(entry.entityType).slice(0, 30),
                entry.entityId ?? null,
                entry.targetUserId ?? null,
                entry.chapterId ?? null,
                toJson(entry.before),
                toJson(entry.after),
                entry.reason ? String(entry.reason).slice(0, 500) : null,
                entry.ip ? String(entry.ip).slice(0, 45) : null,
            ],
        );
    } catch (err) {
        if (strict) throw err;
        console.error(`[Audit] Could not record "${entry.action}":`, err.message);
    }
};

/** Change history for one person (newest first), for the admin user screen. */
export const getAuditForUser = async (userId, limit = 100) => {
    const [rows] = await pool.query(
        `SELECT a.id, a.action, a.entity_type, a.entity_id, a.actor_label, a.reason, a.before_json, a.after_json,
                a.created_at, u.name AS actor_name
         FROM audit_log a
         LEFT JOIN users u ON u.id = a.actor_user_id
         WHERE a.target_user_id = ?
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT ?`,
        [userId, limit],
    );
    return rows;
};

const redactObject = (value) => {
    if (!value || typeof value !== 'object') return value;
    const out = Array.isArray(value) ? [] : {};
    Object.entries(value).forEach(([k, v]) => {
        if (PERSONAL_KEYS.has(k) && v !== null && v !== undefined) out[k] = REDACTED;
        else out[k] = typeof v === 'object' ? redactObject(v) : v;
    });
    return out;
};

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

/** Blank personal data in every entry about this person. Called when an account is deleted. */
export const redactAuditForUser = async (db, userId) => {
    // The address they acted from is personal data too; the entry itself (what happened, when) stays.
    await db.query('UPDATE audit_log SET ip_address = NULL WHERE actor_user_id = ? OR target_user_id = ?', [userId, userId]);
    const [rows] = await db.query(
        'SELECT id, before_json, after_json FROM audit_log WHERE target_user_id = ? AND (before_json IS NOT NULL OR after_json IS NOT NULL)',
        [userId],
    );
    for (const r of rows) {
        await db.query(
            'UPDATE audit_log SET before_json = ?, after_json = ? WHERE id = ?',
            [
                r.before_json ? JSON.stringify(redactObject(parse(r.before_json))) : null,
                r.after_json ? JSON.stringify(redactObject(parse(r.after_json))) : null,
                r.id,
            ],
        );
    }
    return rows.length;
};
