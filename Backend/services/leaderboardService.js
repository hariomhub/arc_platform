/**
 * leaderboardService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two boards, one score, no new tracking:
 *
 *   team board      the people on one chapter's team (lead + ambassadors), with each person's share
 *                   of what the chapter produced (members, podcasts, posts, blogs)
 *   chapters board  chapters against each other by their team's average score (it rewards
 *                   working together, not individual rivalry)
 *
 * Score = the average of the four goal percentages, each capped at 100 (see contributionScore in
 * chapterLeadRules.js). Everyone is measured against their OWN tier's targets, so leads and
 * ambassadors compare fairly, and posting beyond the cap cannot inflate it.
 *
 * Who sees what: team members and admins only (never public). A person can opt out in their
 * display settings and then shows as "Hidden member" to others (they still see themselves, and
 * admins see everyone). A member in their first, part-way quarter is shown as "New" and not ranked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    GOAL_KEYS, GOAL_LABELS, contributionScore, assignRanks, quarterWindowFor, dbDate, tierOf, tierLabel,
} from '../utils/chapterLeadRules.js';
import { listLeadsOverview, teamError } from './chapterLeadService.js';
import { getDisplaySettingsFor } from './publicChapterService.js';

const HIDDEN_NAME = 'Hidden member';
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();   // key -> { at, data }

const cached = async (key, build) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
    const data = await build();
    cache.set(key, { at: Date.now(), data });
    return data;
};

/** Drops cached boards (tests, or after an admin changes something that should show at once). */
export const clearLeaderboardCache = () => cache.clear();

const byScore = (a, b) => (b.score - a.score) || (b.goals_met - a.goals_met) || String(a.name).localeCompare(String(b.name));

/** The live board for one chapter's team. `viewer` = req.user. */
export const getTeamBoard = async (viewer, chapterId) => {
    if (!chapterId) throw teamError(404, 'You are not on a chapter team yet.');
    const isAdmin = viewer.role === 'founding_member';
    const rows = await listLeadsOverview({ status: 'active', chapterId });
    const settings = await getDisplaySettingsFor(rows.map((r) => r.user_id));
    const window = quarterWindowFor(new Date());

    const entries = rows.map((r) => {
        const optedOut = !settings.get(r.user_id).show_in_leaderboard;
        const masked = optedOut && r.user_id !== viewer.id && !isAdmin;
        return {
            profile_id: r.id,
            name: masked ? HIDDEN_NAME : r.name,
            photo_url: masked ? null : r.photo_url,
            tier: r.tier,
            tier_label: r.tier_label,
            is_you: r.user_id === viewer.id,
            opted_out: optedOut,
            partial: r.partial_quarter,
            score: r.partial_quarter ? null : contributionScore(r.goals),
            goals_met: r.goals_met ?? 0,
            goals: r.goals,
            members_personal: r.members_personal ?? 0,
        };
    });

    const ranked = entries.filter((e) => e.score !== null).sort(byScore);
    assignRanks(ranked, (e) => `${e.score}:${e.goals_met}`);
    const unranked = entries.filter((e) => e.score === null).map((e) => ({ ...e, rank: null }));

    // Who produced what. A lead's member total already includes the team's, so use the personal figure.
    const breakdown = GOAL_KEYS.map((key) => {
        const parts = entries.map((e) => {
            const goal = e.goals.find((g) => g.key === key);
            const value = key === 'members' ? e.members_personal : (goal ? goal.actual : 0);
            return { profile_id: e.profile_id, name: e.name, tier: e.tier, value };
        });
        const total = parts.reduce((s, p) => s + p.value, 0);
        return {
            key, label: GOAL_LABELS[key], total,
            parts: parts.map((p) => ({ ...p, share: total ? Math.round((p.value / total) * 100) : 0 })).filter((p) => p.value > 0),
        };
    });

    const strip = ({ goals, members_personal, ...rest }) => ({ ...rest, goals: goals.map(({ key, label, actual, target, percent }) => ({ key, label, actual, target, percent })) });
    return {
        quarter: window.label,
        entries: [...ranked, ...unranked].map(strip),
        breakdown,
        team_size: entries.length,
    };
};

/** Chapters ranked by the average score of their scored team members. */
export const getChaptersBoard = async (viewer) => {
    const window = quarterWindowFor(new Date());
    const board = await cached(`chapters:${window.label}`, async () => {
        const rows = await listLeadsOverview({ status: 'active' });
        const byChapter = new Map();
        rows.filter((r) => r.chapter).forEach((r) => {
            if (!byChapter.has(r.chapter.id)) byChapter.set(r.chapter.id, { chapter: r.chapter, people: [] });
            byChapter.get(r.chapter.id).people.push(r);
        });
        const [slugs] = await pool.query('SELECT id, slug FROM chapters WHERE id IN (?)', [[...byChapter.keys(), 0]]);
        const slugOf = new Map(slugs.map((s) => [s.id, s.slug]));

        const entries = [...byChapter.values()].map(({ chapter, people }) => {
            const scored = people.filter((p) => !p.partial_quarter);
            const avg = scored.length ? Math.round(scored.reduce((s, p) => s + contributionScore(p.goals), 0) / scored.length) : null;
            return {
                chapter_id: chapter.id,
                name: chapter.name,
                slug: slugOf.get(chapter.id) || null,
                country_code: chapter.country_code,
                team_size: people.length,
                scored_count: scored.length,
                score: avg,
                goals_met: scored.reduce((s, p) => s + (p.goals_met || 0), 0),
                has_lead: people.some((p) => p.tier === 'lead'),
            };
        });
        const ranked = entries.filter((e) => e.score !== null).sort(byScore);
        assignRanks(ranked, (e) => e.score);
        return {
            quarter: window.label,
            entries: [...ranked, ...entries.filter((e) => e.score === null).map((e) => ({ ...e, rank: null }))],
        };
    });
    return { ...board, entries: board.entries.map((e) => ({ ...e, is_yours: Boolean(viewer.team_chapter_id) && e.chapter_id === viewer.team_chapter_id })) };
};

// ── Past quarters (from the stored results) ──────────────────────────────────

const pct = (actual, target) => (target > 0 ? Math.min(100, Math.round((Math.max(0, actual) / target) * 100)) : 100);

/** Quarters for which this chapter has stored results, newest first. */
export const listBoardQuarters = async (chapterId) => {
    const [rows] = await pool.query(
        `SELECT DISTINCT DATE_FORMAT(q.quarter_start, '%Y-%m-%d') AS quarter_start
         FROM chapter_lead_quarters q JOIN chapter_lead_profiles p ON p.id = q.profile_id
         WHERE p.chapter_id = ? AND q.status = 'closed'
         ORDER BY quarter_start DESC LIMIT 12`,
        [chapterId],
    );
    return rows.map((r) => r.quarter_start);
};

/** A finished quarter's board for a chapter, from the results stored when it closed. */
export const getPastTeamBoard = async (viewer, chapterId, quarterStart) => {
    if (!chapterId) throw teamError(404, 'You are not on a chapter team yet.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(quarterStart || ''))) throw teamError(422, 'quarter must be YYYY-MM-DD.');
    const isAdmin = viewer.role === 'founding_member';
    const [rows] = await pool.query(
        `SELECT q.*, p.id AS pid, p.user_id, p.tier_code, u.name, u.photo_url
         FROM chapter_lead_quarters q
         JOIN chapter_lead_profiles p ON p.id = q.profile_id
         JOIN users u ON u.id = p.user_id
         WHERE p.chapter_id = ? AND q.quarter_start = ? AND q.status = 'closed'`,
        [chapterId, quarterStart],
    );
    const settings = await getDisplaySettingsFor(rows.map((r) => r.user_id));
    const entries = rows.map((r) => {
        const goals = [
            { key: 'members', percent: pct(r.members_actual, r.members_target) },
            { key: 'podcasts', percent: pct(r.podcasts_actual, r.podcasts_target) },
            { key: 'posts', percent: pct(Math.min(r.posts_actual, r.posts_max), r.posts_min) },
            { key: 'blogs', percent: pct(r.blogs_actual, r.blogs_target) },
        ];
        const optedOut = !settings.get(r.user_id).show_in_leaderboard;
        const masked = optedOut && r.user_id !== viewer.id && !isAdmin;
        return {
            profile_id: r.pid, name: masked ? HIDDEN_NAME : r.name, photo_url: masked ? null : r.photo_url,
            tier: tierOf(r.tier_code), tier_label: tierLabel(r.tier_code), is_you: r.user_id === viewer.id,
            score: contributionScore(goals), goals_met: r.goals_met, met: r.met === null ? null : Boolean(r.met),
        };
    }).sort(byScore);
    assignRanks(entries, (e) => `${e.score}:${e.goals_met}`);
    return { quarter_start: quarterStart, entries, closed_at: dbDate(rows[0]?.closed_at) };
};
