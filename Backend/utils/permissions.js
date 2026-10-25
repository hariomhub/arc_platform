/**
 * permissions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Who can do what, in ONE place.
 *
 * A person's identity is (role, tier):
 *   founding_member                      → admin; can do everything below
 *   council_member + tier 'lead'         → Chapter Lead
 *   council_member + tier 'ambassador'   → Chapter Ambassador
 *   professional (+ sub-type)            → regular member
 *
 * The API returns the resulting capability list from GET /api/auth/me, so the frontend
 * never keeps its own copy of these rules. New code should use requireCapability() /
 * hasCapability(); the older requireRole() guards still work and are migrated as they
 * are touched (ambassadors have role 'council_member', so they pass those unchanged).
 *
 * Capabilities are plain strings. Adding a tier or a feature means adding a line here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TIERS, tierOf } from './chapterLeadRules.js';

export const CAP = Object.freeze({
    RESOURCES_DOWNLOAD: 'resources.download',
    RESOURCES_UPLOAD: 'resources.upload',
    RESOURCES_APPROVE: 'resources.approve',   // admins publish everything
    FRAMEWORK_DOWNLOAD: 'framework.download',
    FEED_POST: 'feed.post',
    BLOG_WRITE: 'blog.write',
    CONTENT_DRAFT: 'content.draft',           // events, news, workshops (saved as drafts)
    CONTENT_PUBLISH: 'content.publish',
    AUTONEWS_MANAGE: 'autonews.manage',       // site-wide, so leads and admins only
    TEAM_DASHBOARD: 'team.dashboard',         // lead / ambassador dashboard
    TEAM_MANAGE: 'team.manage',               // approve, reject and remove ambassadors
    TEAM_APPLY: 'team.apply',                 // apply to join a chapter team
    EARNINGS_ELECT: 'earnings.elect',         // choose to receive or waive earnings
    LEADERBOARD_VIEW: 'leaderboard.view',
    ADMIN_PANEL: 'admin.panel',               // limited panel for the chapter team
    ADMIN_FULL: 'admin.full',
});

const ALL = Object.values(CAP);

const TEAM_COMMON = [
    CAP.RESOURCES_DOWNLOAD, CAP.RESOURCES_UPLOAD, CAP.FRAMEWORK_DOWNLOAD,
    CAP.FEED_POST, CAP.BLOG_WRITE, CAP.CONTENT_DRAFT,
    CAP.TEAM_DASHBOARD, CAP.LEADERBOARD_VIEW, CAP.ADMIN_PANEL,
];

const LEAD_ONLY = [CAP.AUTONEWS_MANAGE, CAP.TEAM_MANAGE, CAP.EARNINGS_ELECT];

/** `user` = { role, tier?, professional_sub_type? } (req.user or the /auth/me payload). */
export const capabilitiesFor = (user) => {
    if (!user) return [];

    if (user.role === 'founding_member') {
        // Admins can do everything. The two personal flows below only make sense for members.
        return ALL.filter((c) => c !== CAP.TEAM_APPLY && c !== CAP.EARNINGS_ELECT);
    }

    if (user.role === 'council_member') {
        // A missing tier (migration not applied yet) is treated as lead, as every row was before tiers.
        return tierOf(user.tier) === TIERS.LEAD ? [...TEAM_COMMON, ...LEAD_ONLY] : [...TEAM_COMMON];
    }

    if (user.role === 'professional') {
        const working = user.professional_sub_type === 'working_professional';
        return working
            ? [CAP.RESOURCES_DOWNLOAD, CAP.RESOURCES_UPLOAD, CAP.TEAM_APPLY]
            : [CAP.TEAM_APPLY];
    }

    return [];
};

export const hasCapability = (user, capability) => capabilitiesFor(user).includes(capability);

/** Express guard: allowed when the signed-in user has ANY of the listed capabilities. */
export const requireCapability = (...capabilities) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const have = capabilitiesFor(req.user);
    if (!capabilities.some((c) => have.includes(c))) {
        return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to perform this action.' });
    }
    return next();
};
