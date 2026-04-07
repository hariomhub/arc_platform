import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import * as resourcesController from '../controllers/resourcesController.js';
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

// Multer — memory storage; blob upload happens in the controller
const ALLOWED_MIMETYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, images (JPEG/PNG/GIF/WebP), videos (MP4/WebM/MOV).'), false);
        }
    },
});

const resourceValidation = [
    body('title').trim().notEmpty().withMessage('Resource title is required.').isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer.'),
    body('description').optional().trim(),
    body('abstract').optional().trim(),
    body('demo_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Demo URL must be a valid URL.'),
    body('type')
        .notEmpty().withMessage('Resource type is required.')
        .isIn(['framework', 'whitepaper', 'product', 'video', 'article', 'tool', 'news', 'homepage_video', 'lab_result']).withMessage('Type must be a valid resource type.'),
];

// Public routes (optionalAuth so logged-in users also see their own pending uploads)
router.get('/', optionalAuth, resourcesController.getResources);
router.get('/recent-videos', resourcesController.getRecentVideos);
// GET /api/resources/:id/stream — public; returns a short-lived SAS URL for video playback
// Used by the home-page video carousel so the <video> tag can reach private blobs
router.get('/:id/stream', resourcesController.getStreamUrl);
router.get('/:id', resourcesController.getResourceById);

// GET /api/resources/:id/download — requires login; controller enforces role-based access
// admin, executive, paid_member, product_company → allowed
// free_member, university → 403
router.get('/:id/download', auth, resourcesController.downloadResource);

// POST /api/resources — any logged-in user can submit; controller enforces type rules & sets pending
router.post(
    '/',
    auth,
    upload.single('file'),
    resourceValidation,
    validate,
    resourcesController.createResource
);

// PUT /api/resources/:id — founding_member (admin) ONLY
router.put(
    '/:id',
    auth,
    requireRole('founding_member'),
    upload.single('file'),
    resourceValidation,
    validate,
    resourcesController.updateResource
);

// DELETE /api/resources/:id
router.delete(
    '/:id',
    auth,
    resourcesController.deleteResource
);

// GET /api/resources/admin/pending — founding_member ONLY (council_member no longer has approve/reject access)
router.get('/admin/pending', auth, requireRole('founding_member'), resourcesController.getPendingResources);

// PATCH /api/resources/:id/approve — founding_member ONLY
router.patch('/:id/approve', auth, requireRole('founding_member'), resourcesController.approveResource);

// PATCH /api/resources/:id/reject — founding_member ONLY
router.patch('/:id/reject', auth, requireRole('founding_member'), resourcesController.rejectResource);


export default router;