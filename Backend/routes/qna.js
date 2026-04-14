/**
 * routes/qna.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Feed routes — repurposed from Q&A.
 * URL prefix stays /api/qna so no frontend route changes needed.
 *
 * Access rules:
 *   Public (no auth)          : GET feed, GET single post
 *   All logged-in             : like, comment, save, reply
 *   council_member + founding : create post, edit own post, delete own post
 *   founding_member only      : hide/unhide post, hide/unhide comment,
 *                               delete any post/comment
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as feedController from '../controllers/feedController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// ── Validation helper ─────────────────────────────────────────────────────────
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// ── Validation rules ──────────────────────────────────────────────────────────
const postContentRules = [
    body('content')
        .trim().notEmpty().withMessage('Post content is required.')
        .isLength({ max: 5000 }).withMessage('Post content must be 5000 characters or fewer.'),
    body('tags')
        .optional()
        .custom(val => {
            if (!val) return true;
            const arr = Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val) : []);
            if (arr.length > 5) throw new Error('Maximum 5 tags per post.');
            if (arr.some(t => String(t).length > 30)) throw new Error('Each tag must be 30 characters or fewer.');
            return true;
        }),
    body('video_url')
        .optional({ checkFalsy: true })
        .isURL().withMessage('Video URL must be a valid URL.')
        .matches(/youtube\.com|youtu\.be/).withMessage('Only YouTube video links are allowed.'),
];

const commentRules = [
    body('content')
        .trim().notEmpty().withMessage('Comment content is required.')
        .isLength({ max: 2000 }).withMessage('Comment must be 2000 characters or fewer.'),
    body('parent_comment_id')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('parent_comment_id must be a positive integer.'),
];

const idParam = [
    param('id').isInt({ min: 1 }).withMessage('Invalid ID.'),
];

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: /saved and /comments/:id routes must come BEFORE /:id
// to prevent Express matching 'saved' or 'comments' as :id param
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/qna/saved  — current user's saved posts (Profile saved tab) ──────
router.get('/saved', auth, feedController.getSavedPosts);

// ── GET /api/qna  — public feed ───────────────────────────────────────────────
router.get('/', optionalAuth, feedController.getFeed);

// ── POST /api/qna  — create post (council_member + founding_member) ───────────
router.post(
    '/',
    auth,
    requireRole('council_member', 'founding_member'),
    feedController.feedUpload.array('media', 5),
    postContentRules,
    validate,
    feedController.createPost
);

// ── GET /api/qna/:id  — single post (public) ─────────────────────────────────
router.get('/:id', idParam, validate, optionalAuth, feedController.getPostById);

// ── PUT /api/qna/:id  — edit post (own post only) ────────────────────────────
router.put(
    '/:id',
    idParam,
    auth,
    requireRole('council_member', 'founding_member'),
    [
        body('content')
            .trim().notEmpty().withMessage('Post content is required.')
            .isLength({ max: 5000 }).withMessage('Post content must be 5000 characters or fewer.'),
        body('tags').optional(),
    ],
    validate,
    feedController.updatePost
);

// ── DELETE /api/qna/:id  — delete post (own or founding_member any) ──────────
router.delete('/:id', idParam, validate, auth, feedController.deletePost);

// ── PATCH /api/qna/:id/hide  — hide/unhide post (founding_member only) ───────
router.patch(
    '/:id/hide',
    idParam,
    validate,
    auth,
    requireRole('founding_member'),
    feedController.toggleHidePost
);

// ── POST /api/qna/:id/media  — add media to post (own post only) ─────────────
router.post(
    '/:id/media',
    idParam,
    validate,
    auth,
    requireRole('council_member', 'founding_member'),
    feedController.feedUpload.array('media', 5),
    feedController.addMedia
);

// ── DELETE /api/qna/:id/media/:mediaId  — remove media ───────────────────────
router.delete(
    '/:id/media/:mediaId',
    auth,
    feedController.deleteMedia
);

// ── POST /api/qna/:id/like  — toggle like on post ────────────────────────────
router.post('/:id/like', idParam, validate, auth, feedController.togglePostLike);

// ── GET /api/qna/:id/comments  — get threaded comments (public) ──────────────
router.get('/:id/comments', idParam, validate, optionalAuth, feedController.getComments);

// ── POST /api/qna/:id/comments  — add comment (all logged-in) ────────────────
router.post(
    '/:id/comments',
    idParam,
    auth,
    commentRules,
    validate,
    feedController.createComment
);

// ── POST /api/qna/:id/save  — save post ──────────────────────────────────────
router.post('/:id/save', idParam, validate, auth, feedController.savePost);

// ── DELETE /api/qna/:id/save  — unsave post ──────────────────────────────────
router.delete('/:id/save', idParam, validate, auth, feedController.unsavePost);

// ── PUT /api/qna/comments/:id  — edit comment (own only) ─────────────────────
router.put(
    '/comments/:id',
    auth,
    commentRules,
    validate,
    feedController.updateComment
);

// ── DELETE /api/qna/comments/:id  — delete comment (own or founding_member) ──
router.delete('/comments/:id', auth, feedController.deleteComment);

// ── PATCH /api/qna/comments/:id/hide  — hide comment (founding_member only) ──
router.patch(
    '/comments/:id/hide',
    auth,
    requireRole('founding_member'),
    feedController.toggleHideComment
);

// ── POST /api/qna/comments/:id/like  — toggle like on comment ────────────────
router.post('/comments/:id/like', auth, feedController.toggleCommentLike);

export default router;