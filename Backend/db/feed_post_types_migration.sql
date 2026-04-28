-- ─────────────────────────────────────────────────────────────────────────────
-- Feed Post Types Migration
-- Run this script once on your database (Azure MySQL / local MySQL)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add post_type, poll_options, poll_ends_at, event_link, reaction_counts
--    to feed_posts. All use IF NOT EXISTS-safe approach via separate ALTERs.

ALTER TABLE feed_posts
    ADD COLUMN IF NOT EXISTS post_type ENUM('ai_product','poll','event','troubleshooting','general')
        NOT NULL DEFAULT 'general'
        AFTER author_id;

ALTER TABLE feed_posts
    ADD COLUMN IF NOT EXISTS poll_options JSON NULL
        AFTER tags;

ALTER TABLE feed_posts
    ADD COLUMN IF NOT EXISTS poll_ends_at DATETIME NULL
        AFTER poll_options;

ALTER TABLE feed_posts
    ADD COLUMN IF NOT EXISTS event_link VARCHAR(500) NULL
        AFTER poll_ends_at;

ALTER TABLE feed_posts
    ADD COLUMN IF NOT EXISTS reaction_counts JSON NULL
        AFTER event_link;

-- 2. Reactions table — for ai_product, event, troubleshooting post types.
--    One row per (post, user). Reaction type changes in-place (UPDATE).
CREATE TABLE IF NOT EXISTS feed_reactions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    post_id      INT         NOT NULL,
    user_id      INT         NOT NULL,
    reaction_type VARCHAR(30) NOT NULL,
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_reaction (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE
);

-- 3. Poll votes table — one vote per (post, user). Stores chosen option_index.
--    Changing vote = UPDATE. Removing vote = DELETE.
CREATE TABLE IF NOT EXISTS feed_poll_votes (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    post_id      INT      NOT NULL,
    user_id      INT      NOT NULL,
    option_index TINYINT  NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_poll_vote (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE
);
