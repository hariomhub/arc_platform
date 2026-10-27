/**
 * outreachKitRules.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The pure half of the outreach kit: checking what an administrator wants to save, and laying the saved
 * changes over the defaults. No database in here, so it can be tested on its own;
 * services/outreachKitService.js does the storing.
 *
 * What is checked, so an edit can never break the kit: every {{name}} must be a real variable (or, in a
 * message, a real shared block); a block may not contain another block; messages that carry the sign-up link
 * must keep it; lengths are capped; stray control characters are removed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
    VARIABLES, BLOCK_META, DEFAULT_BLOCKS, DEFAULT_TEMPLATES, TIERS, AUDIENCES,
} from './outreachKitDefaults.js';

const TEMPLATE_MAX = 3500;
const SUBJECT_MAX = 160;
const HINT_MAX = 300;
const BLOCK_MAX = 1200;
const ITEM_MAX = 320;
const LIST_MAX = 12;

// Blocks that are shown to the person sending, not pasted into a message, so a message cannot use them.
const NOT_IN_MESSAGES = ['etiquette', 'rhythm'];

const VAR_NAMES = new Set(VARIABLES.map((v) => v.name));
const BLOCKS_BY_NAME = Object.fromEntries(BLOCK_META.map((b) => [b.name, b]));
const TEMPLATES_BY_ID = Object.fromEntries(DEFAULT_TEMPLATES.map((t) => [t.id, t]));
const TOKEN = /\{\{\s*([A-Za-z_]+)\s*\}\}/g;

// Same shape as the errors the rest of the programme throws (an Error with an HTTP status).
const unprocessable = (message) => Object.assign(new Error(message), { status: 422 });

// ── Cleaning and checking text ───────────────────────────────────────────────

/** Line endings made plain, control characters dropped, {{ Name }} written as {{name}}, ends trimmed. */
export const clean = (value) => String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(TOKEN, (_, n) => `{{${n.toLowerCase()}}}`)
    .trim();

export const tokensIn = (text) => [...String(text).matchAll(TOKEN)].map((m) => m[1].toLowerCase());

const isBlockName = (name) => Object.prototype.hasOwnProperty.call(BLOCKS_BY_NAME, name);

const knownList = (allowBlocks) => [
    ...VAR_NAMES,
    ...(allowBlocks ? Object.keys(BLOCKS_BY_NAME).filter((n) => !NOT_IN_MESSAGES.includes(n)) : []),
].map((n) => `{{${n}}}`).join(', ');

/** Checks one piece of text and returns it cleaned. `allowBlocks` is true only inside a message, never inside a block. */
const checkText = (value, { label, max, allowBlocks = false, optional = false, allowPlaceholders = true }) => {
    if (typeof value !== 'string') throw unprocessable(`${label} must be text.`);
    const text = clean(value);
    if (!text && !optional) throw unprocessable(`${label} cannot be empty.`);
    if (text.length > max) throw unprocessable(`${label} must be ${max} characters or fewer.`);
    for (const name of tokensIn(text)) {
        if (VAR_NAMES.has(name)) continue;
        if (allowBlocks && isBlockName(name) && !NOT_IN_MESSAGES.includes(name)) continue;
        if (isBlockName(name)) throw unprocessable(`${label} uses {{${name}}}, but a shared block cannot be used here.`);
        throw unprocessable(`${label} uses {{${name}}}, which does not exist. You can use: ${knownList(allowBlocks)}.`);
    }
    if (!allowPlaceholders && tokensIn(text).length) throw unprocessable(`${label} cannot contain {{ }} placeholders.`);
    return text;
};

const checkList = (value, { label, max = LIST_MAX }) => {
    if (!Array.isArray(value)) throw unprocessable(`${label} must be a list.`);
    const items = value.map((v) => clean(v)).filter(Boolean);
    if (!items.length) throw unprocessable(`${label} needs at least one line.`);
    if (items.length > max) throw unprocessable(`${label} can have at most ${max} lines.`);
    return items.map((item, i) => checkText(item, { label: `${label}, line ${i + 1}`, max: ITEM_MAX }));
};

const keyed = (value, keys, label, one) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw unprocessable(`${label} must have an entry for each of: ${keys.join(', ')}.`);
    return Object.fromEntries(keys.map((k) => [k, one(value[k], `${label} (${k === 'enthusiast' ? 'tech enthusiast' : k})`)]));
};

/** Checks a whole block against its shape and returns it cleaned. */
export const cleanBlock = (meta, value) => {
    const label = meta.label;
    switch (meta.shape) {
        case 'tier': return keyed(value, TIERS, label, (v, l) => checkText(v, { label: l, max: BLOCK_MAX }));
        case 'audience': return keyed(value, AUDIENCES, label, (v, l) => checkText(v, { label: l, max: BLOCK_MAX }));
        case 'audienceList': return keyed(value, AUDIENCES, label, (v, l) => checkList(v, { label: l }));
        case 'list': return checkList(value, { label });
        case 'text': {
            const text = checkText(value, { label, max: BLOCK_MAX });
            if (meta.name === 'signup' && !tokensIn(text).includes('link')) throw unprocessable('"How to sign up" must contain {{link}}, so people can join.');
            return text;
        }
        default: throw unprocessable(`${label} cannot be edited.`);
    }
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── What an administrator may send, checked ──────────────────────────────────

/**
 * Turns what the admin screen sends ({ blocks, templates }) into the overrides to store: only what differs
 * from the defaults, every piece checked. Throws an error with status 422 that says what to fix.
 */
export const validateOverrides = (input = {}) => {
    const rawBlocks = input.blocks ?? {};
    const rawTemplates = input.templates ?? {};
    if (typeof rawBlocks !== 'object' || rawBlocks === null || Array.isArray(rawBlocks)
        || typeof rawTemplates !== 'object' || rawTemplates === null || Array.isArray(rawTemplates)) {
        throw unprocessable('Send the changes as { blocks, templates }.');
    }

    const blocks = {};
    for (const [name, value] of Object.entries(rawBlocks)) {
        const meta = BLOCKS_BY_NAME[name];
        if (!meta) throw unprocessable(`There is no shared block called "${name}".`);
        const cleaned = cleanBlock(meta, value);
        if (!same(cleaned, DEFAULT_BLOCKS[name])) blocks[name] = cleaned;
    }

    const templates = {};
    for (const [id, value] of Object.entries(rawTemplates)) {
        const base = TEMPLATES_BY_ID[id];
        if (!base) throw unprocessable(`There is no message with the id "${id}".`);
        if (!value || typeof value !== 'object') throw unprocessable(`The changes to "${base.title}" are not valid.`);
        const out = {};
        if (value.body !== undefined) {
            const body = checkText(value.body, { label: `"${base.title}"`, max: TEMPLATE_MAX, allowBlocks: true });
            if (base.needs_link && !tokensIn(body).some((n) => n === 'link' || n === 'signup')) {
                throw unprocessable(`"${base.title}" must keep {{link}} (or {{signup}}), so people can join.`);
            }
            if (body !== base.body) out.body = body;
        }
        if (value.subject !== undefined && base.subject !== null) {
            const subject = checkText(value.subject, { label: `The subject of "${base.title}"`, max: SUBJECT_MAX });
            if (subject !== base.subject) out.subject = subject;
        }
        if (value.hint !== undefined) {
            const hint = checkText(value.hint ?? '', { label: `The note under "${base.title}"`, max: HINT_MAX, optional: true, allowPlaceholders: false });
            if (hint !== (base.hint ?? '')) out.hint = hint;
        }
        if (Object.keys(out).length) templates[id] = out;
    }
    return { blocks, templates };
};

// ── Merging stored overrides over the defaults ───────────────────────────────

/** A stored block, or the default when what was stored no longer fits (the shape changed in a later version). */
const storedBlock = (meta, value) => {
    if (value === undefined) return DEFAULT_BLOCKS[meta.name];
    try { return cleanBlock(meta, value); } catch { return DEFAULT_BLOCKS[meta.name]; }
};

/** The kit as it should be shown: the defaults with the stored changes laid over them. */
export const effective = (stored) => {
    const blocks = {};
    const customBlocks = [];
    for (const meta of BLOCK_META) {
        const value = storedBlock(meta, stored?.blocks?.[meta.name]);
        blocks[meta.name] = value;
        if (!same(value, DEFAULT_BLOCKS[meta.name])) customBlocks.push(meta.name);
    }
    const templates = DEFAULT_TEMPLATES.map((t) => {
        const o = stored?.templates?.[t.id] || {};
        return {
            ...t,
            body: typeof o.body === 'string' ? o.body : t.body,
            subject: t.subject !== null && typeof o.subject === 'string' ? o.subject : t.subject,
            hint: typeof o.hint === 'string' ? (o.hint || null) : t.hint,
            customised: Boolean(stored?.templates?.[t.id]),
        };
    });
    return { blocks, templates, customBlocks };
};

/** What a member's dashboard needs of one message. */
export const forMember = (t) => ({
    id: t.id, key: t.key, group: t.group, label: t.label, channel: t.channel, tier: t.tier, audience: t.audience,
    subject: t.subject, body: t.body, hint: t.hint, limit: t.limit,
});

export const templateById = (id) => TEMPLATES_BY_ID[id];
