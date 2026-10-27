/**
 * outreachKitService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The outreach kit on the Chapter Lead / Chapter Ambassador dashboard: ready-made messages for inviting
 * people to join, with the person's own name, chapter, code and link filled in by the screen.
 *
 *   Defaults     utils/outreachKitDefaults.js holds every message and shared sentence.
 *   Overrides    what an administrator changed, stored as small JSON in app_settings under 'outreach_kit'
 *                (the same table the tour video uses, so no new table). Only differences from the defaults
 *                are stored, so anything nobody edited follows the latest default.
 *   Members      get the merged result and nothing else.
 *   Admins       get the merged result plus the defaults, to compare and to reset one piece at a time.
 *
 * Checking and merging live in utils/outreachKitRules.js (no database there); this file only reads and writes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import { recordAudit } from './auditService.js';
import { teamError, isMissingSchema } from './chapterLeadService.js';
import { KIT_VERSION, VARIABLES, BLOCK_META, DEFAULT_BLOCKS, GROUPS } from '../utils/outreachKitDefaults.js';
import { validateOverrides, effective, forMember, templateById } from '../utils/outreachKitRules.js';

const KEY = 'outreach_kit';

// ── Storage ──────────────────────────────────────────────────────────────────

const readRow = async () => {
    try {
        const [[row]] = await pool.query(
            `SELECT s.value_json, s.updated_at, u.name AS updated_by_name
             FROM app_settings s LEFT JOIN users u ON u.id = s.updated_by WHERE s.setting_key = ?`,
            [KEY],
        );
        if (!row) return null;
        const value = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
        return { value, updated_at: row.updated_at, updated_by_name: row.updated_by_name };
    } catch (err) {
        if (isMissingSchema(err)) return null;   // app_settings not there yet: the defaults are shown, nothing breaks
        throw err;
    }
};

// ── Reads ────────────────────────────────────────────────────────────────────

/** For the dashboard: the merged kit and nothing else. */
export const getKitForMember = async () => {
    const row = await readRow();
    const { blocks, templates } = effective(row?.value);
    return { version: KIT_VERSION, groups: GROUPS, blocks, templates: templates.map(forMember) };
};

/** For the admin screen: the merged kit, the defaults to compare with, and who changed it last. */
export const getKitForAdmin = async () => {
    const row = await readRow();
    const { blocks, templates, customBlocks } = effective(row?.value);
    return {
        version: KIT_VERSION,
        groups: GROUPS,
        variables: VARIABLES,
        block_meta: BLOCK_META,
        blocks,
        default_blocks: DEFAULT_BLOCKS,
        custom_blocks: customBlocks,
        templates: templates.map((t) => {
            const base = templateById(t.id);
            return {
                ...forMember(t),
                title: t.title, needs_link: t.needs_link, customised: t.customised,
                default_body: base.body, default_subject: base.subject, default_hint: base.hint,
            };
        }),
        updated_at: row?.updated_at ?? null,
        updated_by_name: row?.updated_by_name ?? null,
    };
};

// ── Admin writes ─────────────────────────────────────────────────────────────

const summary = (overrides) => ({ blocks: Object.keys(overrides?.blocks || {}), templates: Object.keys(overrides?.templates || {}) });

/**
 * Replaces the overrides with what the admin screen sent. `based_on` is the `updated_at` the screen last loaded;
 * if someone else saved since, nothing is written and the admin is asked to reload.
 */
export const saveKit = async (actor, input = {}, ip = null) => {
    const overrides = validateOverrides(input);
    const previous = await readRow();

    if (input.based_on && previous?.updated_at) {
        const given = new Date(input.based_on).getTime();
        if (!Number.isNaN(given) && given !== new Date(previous.updated_at).getTime()) {
            throw teamError(409, 'Someone else saved the outreach kit while you were editing. Reload the page to see their changes, then make yours again.', 'KIT_CHANGED');
        }
    }

    if (!Object.keys(overrides.blocks).length && !Object.keys(overrides.templates).length) {
        await pool.query('DELETE FROM app_settings WHERE setting_key = ?', [KEY]);
    } else {
        await pool.query(
            `INSERT INTO app_settings (setting_key, value_json, updated_by) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_by = VALUES(updated_by)`,
            [KEY, JSON.stringify({ version: KIT_VERSION, ...overrides }), actor.id],
        );
    }
    await recordAudit(pool, {
        actor, action: 'portal.outreach_kit_saved', entityType: 'app_setting', entityId: null,
        before: previous ? summary(previous.value) : null, after: summary(overrides), ip,
    });
    return getKitForAdmin();
};

/** Back to the defaults, everywhere. */
export const resetKit = async (actor, ip = null) => {
    const previous = await readRow();
    if (!previous) return getKitForAdmin();
    await pool.query('DELETE FROM app_settings WHERE setting_key = ?', [KEY]);
    await recordAudit(pool, {
        actor, action: 'portal.outreach_kit_reset', entityType: 'app_setting', entityId: null,
        before: summary(previous.value), ip,
    });
    return getKitForAdmin();
};
