/**
 * roles.js - the one place that names and colours a person's role.
 *
 * A person is one of four things:
 *   founding_member       admin
 *   council_member + lead         Chapter Lead
 *   council_member + ambassador   Chapter Ambassador
 *   professional
 *
 * `council_member` is the database role for both chapter tiers; the tier says which one.
 * Anything that shows a role name or badge reads it from here, so a new tier is one entry.
 * What a person may DO is not decided here: the server sends a capability list on /auth/me
 * (see AuthContext `can()`).
 */

export const TIER = Object.freeze({ LEAD: 'lead', AMBASSADOR: 'ambassador' });

const META = {
    founding_member: {
        key: 'founding_member', label: 'Founding Member', short: 'Admin',
        color: '#6D28D9', bg: 'rgba(109,40,217,0.10)', border: '#DDD6FE',
    },
    chapter_lead: {
        key: 'chapter_lead', label: 'Chapter Lead', short: 'Lead',
        color: '#0369A1', bg: 'rgba(3,105,161,0.10)', border: '#BAE6FD',
    },
    chapter_ambassador: {
        key: 'chapter_ambassador', label: 'Chapter Ambassador', short: 'Ambassador',
        color: '#0F766E', bg: 'rgba(15,118,110,0.10)', border: '#99F6E4',
    },
    professional: {
        key: 'professional', label: 'Professional', short: 'Member',
        color: '#047857', bg: 'rgba(4,120,87,0.10)', border: '#A7F3D0',
    },
};

/** 'executive' is the old name of the lead role and can still appear in old data. */
export const roleKey = (role, tier) => {
    if (role === 'founding_member') return 'founding_member';
    if (role === 'council_member' || role === 'executive') {
        return tier === TIER.AMBASSADOR ? 'chapter_ambassador' : 'chapter_lead';
    }
    return 'professional';
};

export const roleMeta = (role, tier) => META[roleKey(role, tier)];
export const roleLabel = (role, tier) => roleMeta(role, tier).label;

/** For a user object from /auth/me (or any row with role + tier). */
export const metaOfUser = (user) => roleMeta(user?.role, user?.tier);
export const labelOfUser = (user) => roleLabel(user?.role, user?.tier);

export const tierLabel = (tier) => (tier === TIER.AMBASSADOR ? META.chapter_ambassador.label : META.chapter_lead.label);

/** The choices an admin sees when setting a person's role + tier. */
export const SEAT_OPTIONS = [
    { value: 'professional|', role: 'professional', tier: '', label: 'Professional' },
    { value: 'council_member|ambassador', role: 'council_member', tier: TIER.AMBASSADOR, label: 'Chapter Ambassador' },
    { value: 'council_member|lead', role: 'council_member', tier: TIER.LEAD, label: 'Chapter Lead' },
    { value: 'founding_member|', role: 'founding_member', tier: '', label: 'Founding Member' },
];

export const seatValue = (role, tier) =>
    role === 'council_member' ? `council_member|${tier === TIER.AMBASSADOR ? 'ambassador' : 'lead'}` : `${role || 'professional'}|`;
