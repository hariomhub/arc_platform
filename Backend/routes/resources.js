import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import * as resourcesController from '../controllers/resourcesController.js';
import * as reviewController    from '../controllers/resourceReviewController.js';
import auth         from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireRole  from '../middleware/requireRole.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const ALLOWED_MIMETYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Unsupported file type.'), false);
    },
});

const resourceValidation = [
    body('title').trim().notEmpty().withMessage('Resource title is required.').isLength({ max: 255 }),
    body('description').optional().trim(),
    body('abstract').optional().trim(),
    body('demo_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Demo URL must be valid.'),
    body('type').notEmpty().isIn(['framework','whitepaper','product','video','article','tool','news','homepage_video','lab_result']).withMessage('Invalid type.'),
];

const reviewValidation = [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
    body('comment').optional().trim().isLength({ max: 2000 }).withMessage('Review must be 2000 chars or fewer.'),
];

// ── IMPORTANT: static routes before /:id ────────────────────────────────────
router.get('/recent-videos',      resourcesController.getRecentVideos);
router.get('/admin/pending',      auth, requireRole('founding_member'), resourcesController.getPendingResources);
router.get('/my-download-usage',  auth, resourcesController.getMyDownloadUsage);

// ── Public / optionalAuth resource routes ────────────────────────────────────
router.get('/',       optionalAuth, resourcesController.getResources);
router.get('/:id',    optionalAuth, resourcesController.getResourceById);
router.get('/:id/stream', resourcesController.getStreamUrl);

// ── Download — auth required; controller enforces role ──────────────────────
router.get('/:id/download', auth, resourcesController.downloadResource);

// ── Create / Update / Delete resources ──────────────────────────────────────
router.post('/',    auth, upload.single('file'), resourceValidation, validate, resourcesController.createResource);
router.put('/:id',  auth, requireRole('founding_member'), upload.single('file'), resourceValidation, validate, resourcesController.updateResource);
router.delete('/:id', auth, resourcesController.deleteResource);

// ── Admin approval ───────────────────────────────────────────────────────────
router.patch('/:id/approve', auth, requireRole('founding_member'), resourcesController.approveResource);
router.patch('/:id/reject',  auth, requireRole('founding_member'), resourcesController.rejectResource);

// ── Reviews — all logged-in members can read and write ──────────────────────
// GET    /api/resources/:id/reviews?sort=recent|upvoted|highest|lowest
router.get( '/:id/reviews', auth, reviewController.getReviews);

// POST   /api/resources/:id/reviews
router.post('/:id/reviews', auth, reviewValidation, validate, reviewController.createReview);

// PUT    /api/resources/:id/reviews/:reviewId
router.put( '/:id/reviews/:reviewId', auth, reviewValidation, validate, reviewController.updateReview);

// DELETE /api/resources/:id/reviews/:reviewId
router.delete('/:id/reviews/:reviewId', auth, reviewController.deleteReview);

// POST   /api/resources/:id/reviews/:reviewId/upvote  (toggle)
router.post('/:id/reviews/:reviewId/upvote', auth, reviewController.toggleUpvote);

export default router;