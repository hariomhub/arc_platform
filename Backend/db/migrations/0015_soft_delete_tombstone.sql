-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Account deletion moves from hard-delete + cascade-reassign to
-- soft-delete tombstoning.
--
--   Deleting an account no longer removes the `users` row or reassigns their
--   content to a shared dummy account. Instead the row is scrubbed in place
--   (name -> "Former Member" / "Former Chapter Lead", email -> a unique
--   tombstone value, password/photo/social links cleared, status ->
--   'deleted'). Posts, resources, reviews, and votes keep pointing at the
--   same user_id/author_id — no FK reassignment required, and any table
--   added later with a user_id FK continues to work with no extra deletion
--   code.
--
--   This ALTER is a no-op if 0014_account_deletion_requests.sql already ran
--   (MySQL ENUM MODIFY is idempotent/non-destructive when re-adding the same
--   values) — kept here so this migration is self-contained.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE users
  MODIFY COLUMN status ENUM(
    'pending',
    'approved',
    'rejected',
    'pending_deletion',
    'deleted'
  ) NOT NULL DEFAULT 'pending';
