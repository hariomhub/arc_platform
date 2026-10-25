-- ════════════════════════════════════════════════════════════════════════════
-- Migration: 0023_chapter_team_backfill
-- Description: MIGRATE step for 0022. Copies existing data into the new structures.
--
--   * per-tier policy targets: 'lead' rows copied from the existing policy columns,
--     'ambassador' rows seeded with the agreed starting goals (editable by admins)
--   * users.referral_code from each person's latest (preferably active) profile
--   * referrals.referrer_profile_id (which stint the referrer was in at sign-up)
--   * membership_applications.requested_tier for old Chapter Lead applications
--   * chapters.slug for any chapter that already exists
--   * chapter_lead_profiles.approved_at for existing leads
--
-- Every statement is idempotent (INSERT IGNORE / "WHERE ... IS NULL"), so the file
-- can be re-run, and it can be run again after the new backend is live to pick up
-- anything created by the old code in between.
--
-- NOT done here (a later CONTRACT migration, after the new code is verified):
-- dropping the deprecated target columns on chapter_lead_policy.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. POLICY TARGETS ───────────────────────────────────────────────────────
-- Lead: exactly what the policy row already says; one lead per chapter.
INSERT IGNORE INTO chapter_lead_policy_targets
  (policy_id, tier_code, members_target, podcasts_target, posts_min, posts_max, blogs_target, min_goals_met, seat_cap)
SELECT id, 'lead', members_target, podcasts_target, posts_min, posts_max, blogs_target, min_goals_met, 1
FROM chapter_lead_policy;

-- Ambassador: 5 members, 1 podcast, 5 posts (credit stops at 8), 1 blog; 3 of 4 goals
-- make a quarter "met"; up to 10 active ambassadors per chapter.
INSERT IGNORE INTO chapter_lead_policy_targets
  (policy_id, tier_code, members_target, podcasts_target, posts_min, posts_max, blogs_target, min_goals_met, seat_cap)
SELECT id, 'ambassador', 5, 1, 5, 8, 1, 3, 10
FROM chapter_lead_policy;

-- ─── 2. REFERRAL CODE BELONGS TO THE PERSON ──────────────────────────────────
UPDATE users u
JOIN (
  SELECT user_id,
         SUBSTRING_INDEX(GROUP_CONCAT(referral_code ORDER BY (status = 'active') DESC, id DESC SEPARATOR ','), ',', 1) AS code
  FROM chapter_lead_profiles
  WHERE referral_code IS NOT NULL
  GROUP BY user_id
) x ON x.user_id = u.id
SET u.referral_code = x.code
WHERE u.referral_code IS NULL;

-- ─── 3. REFERRALS: the referrer's stint at sign-up ───────────────────────────
-- First the stint that was running when the referral was made, then (for anything
-- left) the referrer's most recent stint.
UPDATE referrals r
JOIN chapter_lead_profiles p
  ON p.user_id = r.lead_user_id
 AND p.created_at <= r.created_at
 AND (p.ended_at IS NULL OR p.ended_at >= r.created_at)
SET r.referrer_profile_id = p.id
WHERE r.referrer_profile_id IS NULL;

UPDATE referrals r
JOIN (SELECT user_id, MAX(id) AS pid FROM chapter_lead_profiles GROUP BY user_id) x
  ON x.user_id = r.lead_user_id
SET r.referrer_profile_id = x.pid
WHERE r.referrer_profile_id IS NULL;

-- ─── 4. APPLICATIONS ─────────────────────────────────────────────────────────
UPDATE membership_applications
SET requested_tier = 'lead'
WHERE requested_role = 'council_member' AND requested_tier IS NULL;

-- ─── 5. CHAPTER SLUGS ────────────────────────────────────────────────────────
-- IGNORE: a name that would collide (or has no usable characters) stays NULL and the
-- application assigns a slug the first time the chapter is read.
UPDATE IGNORE chapters
SET slug = NULLIF(LEFT(TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(name, '[^A-Za-z0-9]+', '-'))), 80), '')
WHERE slug IS NULL;

-- ─── 6. EXISTING LEADS: when the seat was approved ───────────────────────────
UPDATE chapter_lead_profiles
SET approved_at = term_started_at
WHERE approved_at IS NULL;
