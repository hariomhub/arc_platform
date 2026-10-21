/**
 * routes/blogs.js — mounted at /api/blogs
 *
 * Order matters: the fixed paths (/mine, /edit/:id, /admin/..., /upload-cover) are
 * declared BEFORE /:slug so they are never mistaken for a slug.
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import * as blogs from '../controllers/blogController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed.'), false);
    },
});

const writers = requireRole('council_member', 'founding_member');
const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid ID.')];

const blogRules = [
    body('title').trim().isLength({ min: 5, max: 255 }).withMessage('Title must be 5-255 characters.'),
    body('summary').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Summary must be 500 characters or fewer.'),
    body('body').isString().withMessage('Blog body is required.').isLength({ max: 60000 }).withMessage('Blog body is too long.'),
    body('cover_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Cover image must be a valid URL.'),
    body('submit').optional().isBoolean().withMessage('submit must be true or false.').toBoolean(),
];

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/', blogs.listPublished);

// ── Author ───────────────────────────────────────────────────────────────────
router.get('/mine', auth, writers, blogs.listMine);
router.get('/edit/:id', auth, writers, idParam, validate, blogs.getForEdit);
router.post('/upload-cover', auth, writers, upload.single('cover'), blogs.uploadCover);
router.post('/', auth, writers, blogRules, validate, blogs.createBlog);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/list', auth, requireRole('founding_member'), blogs.adminList);
router.patch(
    '/admin/:id/review',
    auth, requireRole('founding_member'), idParam,
    [
        body('status').isIn(['published', 'rejected']).withMessage('Status must be published or rejected.'),
        body('admin_notes').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    ],
    validate,
    blogs.adminReview
);

router.put('/:id', auth, writers, idParam, blogRules, validate, blogs.updateBlog);
router.delete('/:id', auth, writers, idParam, validate, blogs.deleteBlog);

// Public single post (slug) — keep LAST
router.get('/:slug', optionalAuth, blogs.getBySlug);

export default router;
