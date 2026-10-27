/**
 * outreachKit.js - turns the outreach kit's templates into a message for one person.
 *
 * Used by the invitation panel beside the referral code (what a Chapter Lead or Ambassador copies) and by the admin
 * editor's preview, so both always show the same thing. The kit itself (templates and shared blocks) comes from the
 * server; see Backend/utils/outreachKitDefaults.js for how a message is built.
 *
 *   {{role_intro}}, {{fit}}, {{benefits}} ...  shared blocks, replaced first, by the text for this person's role
 *                                              and the audience chosen
 *   {{first_name}}, {{chapter}}, {{link}} ...  variables, replaced second
 *
 * A variable with no value is shown as [first name] and reported in `missing`, so the screen can ask for it.
 */

const TOKEN = /\{\{\s*([A-Za-z_]+)\s*\}\}/g;

/** What a missing value looks like in the preview. */
const FRIENDLY = {
    first_name: 'first name', company: 'company', topic: 'topic', month: 'month', free_link: 'link',
    your_name: 'your name', role: 'role', chapter: 'chapter', code: 'code', link: 'link',
};

/** The variables the person sending types in, in the order the form asks for them. */
export const TYPED = ['first_name', 'company', 'topic', 'month', 'free_link'];

export const TYPED_LABELS = {
    first_name: 'Their first name', company: 'Their company', topic: 'Topic', month: 'Check back in', free_link: 'Link to a free piece',
};

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** WhatsApp lists use a round bullet; everything else a dash. */
export const bulletFor = (channel) => (channel === 'whatsapp' || channel === 'whatsapp_group' ? '•' : '-');

/** The message for this role and audience: an exact match first, then one that applies to everybody. */
export const pickTemplate = (templates, key, tier, audience) => {
    const score = (t) => {
        if (t.key !== key) return -1;
        if ((t.tier && t.tier !== tier) || (t.audience && t.audience !== audience)) return -1;
        return (t.tier ? 2 : 0) + (t.audience ? 1 : 0);
    };
    return templates.map((t) => [score(t), t]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])[0]?.[1] || null;
};

/** The text of one shared block for this role and audience (a list becomes bullet lines). */
const blockText = (block, { tier, audience, channel }) => {
    const bullets = (list) => list.map((item) => `${bulletFor(channel)} ${item}`).join('\n');
    if (typeof block === 'string') return block;
    if (Array.isArray(block)) return bullets(block);
    if (block && typeof block === 'object') {
        const v = block[tier] ?? block[audience];
        if (Array.isArray(v)) return bullets(v);
        if (typeof v === 'string') return v;
    }
    return '';
};

const expandBlocks = (text, blocks, ctx) => String(text ?? '').replace(TOKEN, (match, raw) => {
    const name = raw.toLowerCase();
    return has(blocks, name) ? blockText(blocks[name], ctx) : match;
});

const opener = (connected) => (connected ? 'thanks for connecting.' : "hope you're doing well.");

const fill = (text, ctx, missing) => text.replace(TOKEN, (match, raw) => {
    const name = raw.toLowerCase();
    const value = name === 'opener' ? opener(ctx.connected) : String(ctx.vars?.[name] ?? '').trim();
    if (value) return value;
    if (!missing.includes(name)) missing.push(name);
    return `[${FRIENDLY[name] || name}]`;
});

/**
 * Builds the message.
 *   template   one entry of kit.templates
 *   blocks     kit.blocks
 *   ctx        { tier, audience, connected, vars: { first_name, company, ..., your_name, role, chapter, code, link } }
 * Returns { subject, body, missing } where `missing` names the variables that had no value.
 */
export const renderMessage = (template, blocks, ctx) => {
    const withChannel = { ...ctx, channel: template.channel };
    const missing = [];
    const body = fill(expandBlocks(template.body, blocks, withChannel), withChannel, missing);
    const subject = template.subject ? fill(expandBlocks(template.subject, blocks, withChannel), withChannel, missing) : '';
    return { subject, body, missing };
};

/** Which typed variables this message uses (after blocks are expanded), and whether it uses the "connected" opener. */
export const needsOf = (template, blocks, ctx) => {
    const withChannel = { ...ctx, channel: template.channel };
    const text = `${expandBlocks(template.body, blocks, withChannel)}\n${template.subject ? expandBlocks(template.subject, blocks, withChannel) : ''}`;
    const names = new Set([...text.matchAll(TOKEN)].map((m) => m[1].toLowerCase()));
    return { typed: TYPED.filter((n) => names.has(n)), opener: names.has('opener') };
};

/** Names used between {{ }} in some text, so the admin editor can flag one that does not exist. */
export const tokenNames = (text) => [...String(text ?? '').matchAll(TOKEN)].map((m) => m[1].toLowerCase());

// ── Where a message can be sent from ─────────────────────────────────────────

export const MAILTO_LIMIT = 2000;      // longer links are cut off by some mail programs, so the screen offers Copy instead

export const whatsappHref = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const mailtoHref = (subject, body) => `mailto:?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body)}`;
export const linkedinPostHref = (text) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
export const LINKEDIN_HOME = 'https://www.linkedin.com/';

/** The groups of the kit, each with its messages listed once (a message that has several variants counts once). */
export const groupsOf = (kit) => (kit?.groups || []).map((g) => {
    const seen = new Set();
    const items = [];
    (kit.templates || []).filter((t) => t.group === g.id).forEach((t) => {
        if (seen.has(t.key)) return;
        seen.add(t.key);
        items.push({ key: t.key, label: t.label });
    });
    return { ...g, items };
}).filter((g) => g.items.length);

/** The sign-up link: the same one the referral card shows, with the code already in it. */
export const signupLink = (code) => `${window.location.origin}/register?ref=${encodeURIComponent(code || '')}`;
