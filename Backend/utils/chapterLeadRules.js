/**
 * chapterLeadRules.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure helpers (no database, no I/O) for the Chapter Lead programme: referral
 * codes, term / rate maths, quarter windows and goal evaluation.
 *
 * Everything here is UTC. Quarter windows are calendar quarters
 * (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec); `end` is exclusive.
 *
 * Kept separate from chapterLeadService.js so it can be unit-tested and reused
 * by one-off scripts without opening a database connection.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';

// Effective date of the Privacy Policy + Terms text that Chapter Leads accept.
// Bump this (and the date shown on /privacy and /terms) whenever either document
// changes in a way that needs fresh consent. Every active lead is then asked to
// accept again at their next login.
export const POLICY_VERSION = '2026-10-17';

// Feed post types that count toward the "posts" goal (memes and polls do not).
export const COUNTED_POST_TYPES = ['general', 'ai_product', 'event', 'troubleshooting'];

// Used only if chapter_lead_policy has no row (should not happen after migration 0020).
export const DEFAULT_POLICY = Object.freeze({
    id: null,
    effective_from: '2000-01-01',
    members_target: 20,
    podcasts_target: 3,
    posts_min: 10,
    posts_max: 15,
    blogs_target: 3,
    min_goals_met: 3,
    consecutive_miss_limit: 3,
    term_months: 18,
    rate_term1: 3,
    rate_term2: 5,
    rate_term3: 7,
    direct_commission_pct: 10,
    commission_on_renewals: 0,
});

// ── Referral codes ────────────────────────────────────────────────────────────
export const REFERRAL_PREFIX = 'RAC-';
// No 0/O, 1/I/L so a code read aloud or typed from a screenshot is unambiguous.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const generateReferralCode = () => {
    let suffix = '';
    for (let i = 0; i < 6; i += 1) suffix += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    return `${REFERRAL_PREFIX}${suffix}`;
};

/** Returns the canonical code ("RAC-7K3M9Q") or null when the input is not a plausible code. */
export const normalizeReferralCode = (raw) => {
    if (raw === undefined || raw === null) return null;
    const cleaned = String(raw).trim().toUpperCase().replace(/\s+/g, '');
    const withDash = /^RAC[A-Z0-9]{6}$/.test(cleaned) ? `RAC-${cleaned.slice(3)}` : cleaned;
    return /^RAC-[A-Z0-9]{6}$/.test(withDash) ? withDash : null;
};

// ── Date helpers (UTC) ────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

/** JS Date -> 'YYYY-MM-DD HH:MM:SS' (UTC) for DATETIME / TIMESTAMP comparisons. */
export const toSqlDateTime = (date) => {
    const d = new Date(date);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
           `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

/**
 * Reads a DATETIME / TIMESTAMP value coming back from mysql2 as a UTC-correct Date.
 *
 * Everything in this programme writes DATETIME values as UTC wall-clock strings.
 * mysql2 (timezone: 'local') builds JS Dates from the *local* fields of that
 * string, so on a server whose TZ is not UTC the instant would be shifted. This
 * re-reads the wall-clock fields as UTC, which is correct on any server TZ.
 * The database session time zone is assumed to be UTC (the Azure default).
 */
export const dbDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(Date.UTC(
            value.getFullYear(), value.getMonth(), value.getDate(),
            value.getHours(), value.getMinutes(), value.getSeconds(),
        ));
    }
    const text = String(value).trim();
    const iso = text.length === 10 ? `${text}T00:00:00Z` : `${text.replace(' ', 'T')}Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** JS Date -> 'YYYY-MM-DD' (UTC). */
export const toSqlDate = (date) => toSqlDateTime(date).slice(0, 10);

/** Adds calendar months in UTC, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export const addMonthsUTC = (date, months) => {
    const d = new Date(date);
    const day = d.getUTCDate();
    const result = new Date(Date.UTC(
        d.getUTCFullYear(), d.getUTCMonth() + months, 1,
        d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(),
    ));
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Terms and revenue-share rate ─────────────────────────────────────────────
/**
 * Which term a lead is in on a given date, and that term's revenue-share rate.
 *   Term 1 = first `term_months`, Term 2 = next `term_months`, Term 3+ = everything after.
 */
export const getTermInfo = (termStartedAt, at = new Date(), policy = DEFAULT_POLICY) => {
    const start = new Date(termStartedAt);
    const now = new Date(at);
    const len = Math.max(1, Number(policy.term_months) || 18);

    let termNumber = 1;
    while (termNumber < 400 && addMonthsUTC(start, len * termNumber) <= now) termNumber += 1;

    const rate = termNumber === 1 ? policy.rate_term1
        : termNumber === 2 ? policy.rate_term2
        : policy.rate_term3;

    return {
        termNumber,
        termStart: addMonthsUTC(start, len * (termNumber - 1)),
        termEnd: addMonthsUTC(start, len * termNumber),
        rate: Number(rate),
        termMonths: len,
    };
};

// ── Quarter windows ───────────────────────────────────────────────────────────
/** The calendar quarter containing `date`. */
export const quarterWindowFor = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const quarterIndex = Math.floor(d.getUTCMonth() / 3);
    const start = new Date(Date.UTC(year, quarterIndex * 3, 1));
    const end = new Date(Date.UTC(year, quarterIndex * 3 + 3, 1));
    return {
        start,
        end,
        label: `Q${quarterIndex + 1} ${year}`,
        startStr: toSqlDateTime(start),
        endStr: toSqlDateTime(end),
        startDate: toSqlDate(start),
        endDate: toSqlDate(new Date(end.getTime() - DAY_MS)), // last day, inclusive
    };
};

export const previousQuarterWindow = (date = new Date()) =>
    quarterWindowFor(new Date(quarterWindowFor(date).start.getTime() - 1));

/**
 * Quarters that have fully ended by `now` and finish after `evalStart`, oldest first.
 * `evalStart` is when the lead became eligible for scoring.
 */
export const eligibleClosedQuarters = (evalStart, now = new Date()) => {
    const out = [];
    let win = quarterWindowFor(evalStart);
    for (let i = 0; i < 80 && win.end <= now; i += 1) {
        if (win.end > evalStart) out.push(win);
        win = quarterWindowFor(win.end);
    }
    return out;
};

/** A lead who became eligible after the quarter began is not scored for that quarter. */
export const isPartialQuarter = (evalStart, window) => new Date(evalStart) > window.start;

/** Scoring starts at the later of the term start and when the profile row was created. */
export const evalStartFor = (profile) => {
    const a = new Date(profile.term_started_at);
    const b = profile.created_at ? new Date(profile.created_at) : a;
    return a > b ? a : b;
};

export const daysLeftInWindow = (window, now = new Date()) =>
    Math.max(0, Math.ceil((window.end.getTime() - new Date(now).getTime()) / DAY_MS));

export const daysSinceWindowStart = (window, now = new Date()) =>
    Math.floor((new Date(now).getTime() - window.start.getTime()) / DAY_MS);

// ── Goals ─────────────────────────────────────────────────────────────────────
export const GOAL_KEYS = ['members', 'podcasts', 'posts', 'blogs'];

export const GOAL_LABELS = {
    members: 'New members',
    podcasts: 'Podcasts',
    posts: 'Posts',
    blogs: 'Blogs',
};

const targetFor = (key, policy) => ({
    members: Number(policy.members_target),
    podcasts: Number(policy.podcasts_target),
    posts: Number(policy.posts_min),
    blogs: Number(policy.blogs_target),
}[key]);

/**
 * Evaluates a set of actuals against a policy.
 * `actuals` = { members, podcasts, posts, blogs } (raw counts).
 */
export const evaluateGoals = (actuals, policy = DEFAULT_POLICY) => {
    const flags = {};
    let goalsMet = 0;
    GOAL_KEYS.forEach((key) => {
        flags[key] = Number(actuals[key] || 0) >= targetFor(key, policy);
        if (flags[key]) goalsMet += 1;
    });
    return { flags, goalsMet, met: goalsMet >= Number(policy.min_goals_met) };
};

/** 'done' | 'on_track' | 'behind' — compares progress with how much of the quarter has elapsed. */
export const paceFor = (actual, target, window, now = new Date()) => {
    if (target <= 0 || actual >= target) return 'done';
    const total = window.end.getTime() - window.start.getTime();
    const elapsed = Math.min(1, Math.max(0, (new Date(now).getTime() - window.start.getTime()) / total));
    // Round the expectation down so a fresh quarter starts "on track" rather than
    // "behind" against a fractional expectation like 0.03 posts.
    return actual >= Math.floor(target * elapsed * 0.8) ? 'on_track' : 'behind';
};

/** Shapes the four goal cards shown on the dashboard. */
export const buildGoalCards = (actuals, policy, window, now = new Date()) =>
    GOAL_KEYS.map((key) => {
        const raw = Number(actuals[key] || 0);
        const target = targetFor(key, policy);
        // Posts above posts_max are not credited any further.
        const counted = key === 'posts' ? Math.min(raw, Number(policy.posts_max)) : raw;
        return {
            key,
            label: GOAL_LABELS[key],
            target,
            max: key === 'posts' ? Number(policy.posts_max) : null,
            actual: raw,
            counted,
            percent: target > 0 ? Math.min(100, Math.round((counted / target) * 100)) : 100,
            met: counted >= target,
            pace: paceFor(counted, target, window, now),
        };
    });

/**
 * Consecutive missed quarters, newest first. Waived quarters are skipped (they
 * neither extend nor break a streak); the first met quarter ends the streak.
 * `rows` must be ordered by quarter_start DESC.
 */
export const countConsecutiveMisses = (rows) => {
    let misses = 0;
    for (const row of rows) {
        if (row.status === 'waived') continue;
        if (row.met) break;
        misses += 1;
    }
    return misses;
};

/** 'ok' | 'warning' | 'at_risk' | 'review' */
export const standingFor = (consecutiveMisses, policy = DEFAULT_POLICY) => {
    const limit = Number(policy.consecutive_miss_limit) || 3;
    if (consecutiveMisses >= limit) return 'review';
    if (consecutiveMisses === limit - 1 && consecutiveMisses > 0) return 'at_risk';
    if (consecutiveMisses > 0) return 'warning';
    return 'ok';
};

// ── Misc ──────────────────────────────────────────────────────────────────────
export const slugify = (text) =>
    String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 150) || 'post';

export const isCountryCode = (value) => typeof value === 'string' && /^[A-Za-z]{2}$/.test(value.trim());
