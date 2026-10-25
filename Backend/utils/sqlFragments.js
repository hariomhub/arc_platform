/**
 * sqlFragments.js - small SQL pieces shared by several queries.
 * Each one names the table alias it needs; use it only in a query that has that alias.
 */

/** Needs `u` = users. The author's chapter-team tier ('lead' | 'ambassador'), or NULL if they are not on a team. */
export const AUTHOR_TIER_SQL = '(SELECT p.tier_code FROM chapter_lead_profiles p WHERE p.active_user_id = u.id) AS author_tier';
