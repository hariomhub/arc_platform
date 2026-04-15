/**
 * resourceReviewController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all review and upvote logic for resources.
 *
 * Access:
 *   GET reviews      — all logged-in members (professional, council, founding)
 *   POST review      — all logged-in members (one review per user per resource)
 *   PUT review       — own review only
 *   DELETE review    — own review OR founding_member
 *   POST upvote      — all logged-in members (toggle)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';

// ── Helper: recalculate avg_rating + review_count on resources table ──────────
const syncResourceStats = async (resourceId) => {
    await pool.query(
        `UPDATE resources
         SET review_count = (
                 SELECT COUNT(*) FROM resource_reviews WHERE resource_id = ?
             ),
             avg_rating = (
                 SELECT ROUND(AVG(rating), 2) FROM resource_reviews WHERE resource_id = ?
             )
         WHERE id = ?`,
        [resourceId, resourceId, resourceId]
    );
};

// ── GET /api/resources/:id/reviews ───────────────────────────────────────────
// sort: recent (default) | upvoted | highest | lowest
export const getReviews = async (req, res, next) => {
    try {
        const resourceId    = parseInt(req.params.id, 10);
        const currentUserId = req.user?.id || null;
        const sort          = req.query.sort || 'recent';

        // Verify resource exists
        const [[resource]] = await pool.query(
            "SELECT id FROM resources WHERE id = ? AND status = 'approved'",
            [resourceId]
        );
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        const orderBy = sort === 'upvoted'  ? 'rr.upvote_count DESC, rr.created_at DESC'
                      : sort === 'highest'  ? 'rr.rating DESC, rr.created_at DESC'
                      : sort === 'lowest'   ? 'rr.rating ASC, rr.created_at DESC'
                      : 'rr.created_at DESC'; // recent default

        const [rows] = await pool.query(
            `SELECT rr.*,
                    u.name             AS author_name,
                    u.role             AS author_role,
                    u.photo_url        AS author_photo,
                    u.organization_name AS author_org
             FROM resource_reviews rr
             JOIN users u ON rr.user_id = u.id
             WHERE rr.resource_id = ?
             ORDER BY ${orderBy}`,
            [resourceId]
        );

        // Fetch current user's upvoted review IDs in one query
        let upvotedSet = new Set();
        if (currentUserId && rows.length) {
            const reviewIds      = rows.map(r => r.id);
            const placeholders   = reviewIds.map(() => '?').join(',');
            const [upvoteRows]   = await pool.query(
                `SELECT review_id FROM resource_review_upvotes
                 WHERE user_id = ? AND review_id IN (${placeholders})`,
                [currentUserId, ...reviewIds]
            );
            upvotedSet = new Set(upvoteRows.map(r => r.review_id));
        }

        // Mark user's own review and upvoted status
        const enriched = rows.map(r => ({
            ...r,
            is_own:    currentUserId === r.user_id,
            is_upvoted: upvotedSet.has(r.id),
        }));

        // Summary stats
        const [[stats]] = await pool.query(
            `SELECT
                COUNT(*)                             AS total,
                ROUND(AVG(rating), 2)                AS avg_rating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS r5,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS r4,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS r3,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS r2,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS r1
             FROM resource_reviews
             WHERE resource_id = ?`,
            [resourceId]
        );

        // Has current user already reviewed?
        let userReview = null;
        if (currentUserId) {
            const [ur] = await pool.query(
                'SELECT id, rating, comment FROM resource_reviews WHERE resource_id = ? AND user_id = ?',
                [resourceId, currentUserId]
            );
            if (ur.length) userReview = ur[0];
        }

        return res.json({
            success: true,
            data: enriched,
            stats,
            user_review: userReview,
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/resources/:id/reviews ─────────────────────────────────────────
export const createReview = async (req, res, next) => {
    try {
        const resourceId = parseInt(req.params.id, 10);
        const { rating, comment } = req.body;

        // Validate rating
        const r = parseInt(rating, 10);
        if (!r || r < 1 || r > 5) {
            return res.status(422).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }
        if (comment && comment.trim().length > 2000) {
            return res.status(422).json({ success: false, message: 'Review must be 2000 characters or fewer.' });
        }

        // Verify resource exists and is approved
        const [[resource]] = await pool.query(
            "SELECT id FROM resources WHERE id = ? AND status = 'approved'",
            [resourceId]
        );
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
        }

        // One review per user per resource
        const [existing] = await pool.query(
            'SELECT id FROM resource_reviews WHERE resource_id = ? AND user_id = ?',
            [resourceId, req.user.id]
        );
        if (existing.length) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this resource. Edit your existing review instead.', code: 'ALREADY_REVIEWED' });
        }

        const [result] = await pool.query(
            `INSERT INTO resource_reviews (resource_id, user_id, rating, comment)
             VALUES (?, ?, ?, ?)`,
            [resourceId, req.user.id, r, comment ? comment.trim() : null]
        );

        await syncResourceStats(resourceId);

        const [rows] = await pool.query(
            `SELECT rr.*, u.name AS author_name, u.role AS author_role,
                    u.photo_url AS author_photo, u.organization_name AS author_org
             FROM resource_reviews rr JOIN users u ON rr.user_id = u.id
             WHERE rr.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            data: { ...rows[0], is_own: true, is_upvoted: false },
        });
    } catch (err) {
        next(err);
    }
};

// ── PUT /api/resources/:id/reviews/:reviewId ─────────────────────────────────
export const updateReview = async (req, res, next) => {
    try {
        const resourceId = parseInt(req.params.id, 10);
        const reviewId   = parseInt(req.params.reviewId, 10);
        const { rating, comment } = req.body;

        const [reviews] = await pool.query(
            'SELECT * FROM resource_reviews WHERE id = ? AND resource_id = ?',
            [reviewId, resourceId]
        );
        if (!reviews.length) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        if (reviews[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only edit your own reviews.' });
        }

        const r = parseInt(rating, 10);
        if (!r || r < 1 || r > 5) {
            return res.status(422).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }
        if (comment && comment.trim().length > 2000) {
            return res.status(422).json({ success: false, message: 'Review must be 2000 characters or fewer.' });
        }

        await pool.query(
            'UPDATE resource_reviews SET rating = ?, comment = ?, is_edited = 1 WHERE id = ?',
            [r, comment ? comment.trim() : null, reviewId]
        );

        await syncResourceStats(resourceId);

        const [rows] = await pool.query(
            `SELECT rr.*, u.name AS author_name, u.role AS author_role,
                    u.photo_url AS author_photo, u.organization_name AS author_org
             FROM resource_reviews rr JOIN users u ON rr.user_id = u.id
             WHERE rr.id = ?`,
            [reviewId]
        );

        return res.json({
            success: true,
            data: { ...rows[0], is_own: true, is_upvoted: !!req.body.is_upvoted },
        });
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/resources/:id/reviews/:reviewId ──────────────────────────────
export const deleteReview = async (req, res, next) => {
    try {
        const resourceId = parseInt(req.params.id, 10);
        const reviewId   = parseInt(req.params.reviewId, 10);

        const [reviews] = await pool.query(
            'SELECT user_id FROM resource_reviews WHERE id = ? AND resource_id = ?',
            [reviewId, resourceId]
        );
        if (!reviews.length) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        if (reviews[0].user_id !== req.user.id && req.user.role !== 'founding_member') {
            return res.status(403).json({ success: false, message: 'Not authorised to delete this review.' });
        }

        await pool.query('DELETE FROM resource_reviews WHERE id = ?', [reviewId]);
        await syncResourceStats(resourceId);

        return res.json({ success: true, data: { message: 'Review deleted.' } });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/resources/:id/reviews/:reviewId/upvote — toggle ────────────────
export const toggleUpvote = async (req, res, next) => {
    try {
        const reviewId = parseInt(req.params.reviewId, 10);
        const userId   = req.user.id;

        const [reviews] = await pool.query(
            'SELECT id, user_id FROM resource_reviews WHERE id = ?',
            [reviewId]
        );
        if (!reviews.length) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        const [existing] = await pool.query(
            'SELECT id FROM resource_review_upvotes WHERE review_id = ? AND user_id = ?',
            [reviewId, userId]
        );

        if (existing.length) {
            // Remove upvote
            await pool.query(
                'DELETE FROM resource_review_upvotes WHERE review_id = ? AND user_id = ?',
                [reviewId, userId]
            );
            await pool.query(
                'UPDATE resource_reviews SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = ?',
                [reviewId]
            );
            return res.json({ success: true, data: { upvoted: false } });
        }

        // Add upvote
        await pool.query(
            'INSERT INTO resource_review_upvotes (review_id, user_id) VALUES (?, ?)',
            [reviewId, userId]
        );
        await pool.query(
            'UPDATE resource_reviews SET upvote_count = upvote_count + 1 WHERE id = ?',
            [reviewId]
        );

        return res.json({ success: true, data: { upvoted: true } });
    } catch (err) {
        next(err);
    }
};