import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as ctrl from '../controllers/productReviewsController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// ─── Multer: Product Media (images + videos) ──────────────────────────────────
const mediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/products/media');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    },
});
const ALLOWED_MEDIA = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
];
const mediaUpload = multer({
    storage: mediaStorage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MEDIA.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only images (jpg, png, webp, gif) and videos (mp4, webm, mov) are allowed.'));
    },
});

// ─── Multer: Evidence Files ────────────────────────────────────────────────────
const evidenceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/products/evidences');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    },
});
const ALLOWED_EVIDENCE = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
];
const evidenceUpload = multer({
    storage: evidenceStorage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_EVIDENCE.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Unsupported file type. Allowed: PDF, Excel, DOCX, images, videos.'));
    },
});

// ─── Validation Rules ─────────────────────────────────────────────────────────
const productValidation = [
    body('name').trim().notEmpty().withMessage('Product name is required.').isLength({ max: 255 }),
    body('vendor').trim().notEmpty().withMessage('Vendor name is required.').isLength({ max: 255 }),
    body('category').optional().trim().isLength({ max: 255 }),
    body('portal_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Portal URL must be a valid URL.'),
    body('short_description').optional().trim(),
    body('overview').optional().trim(),
    body('version_tested').optional().trim().isLength({ max: 100 }),
];

const featureTestValidation = [
    body('feature_name').trim().notEmpty().withMessage('Feature name is required.').isLength({ max: 255 }),
    body('score').optional({ checkFalsy: true }).isFloat({ min: 0, max: 10 }).withMessage('Score must be between 0 and 10.'),
];

const userReviewValidation = [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
    body('comment').optional().trim(),
];

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.get('/', ctrl.getProducts);
router.get('/:id(\\d+)', ctrl.getProductById);

// ─── Admin Routes ──────────────────────────────────────────────────────────────
router.post('/', auth, requireRole('admin'), productValidation, validate, ctrl.createProduct);
router.put('/:id(\\d+)', auth, requireRole('admin'), productValidation, validate, ctrl.updateProduct);
router.delete('/:id(\\d+)', auth, requireRole('admin'), ctrl.deleteProduct);

// Feature tests
router.post('/:id(\\d+)/feature-tests', auth, requireRole('admin'), featureTestValidation, validate, ctrl.addFeatureTest);
router.put('/:productId(\\d+)/feature-tests/:testId(\\d+)', auth, requireRole('admin'), featureTestValidation, validate, ctrl.updateFeatureTest);
router.delete('/:productId(\\d+)/feature-tests/:testId(\\d+)', auth, requireRole('admin'), ctrl.deleteFeatureTest);

// Media uploads
router.post('/:id(\\d+)/media', auth, requireRole('admin'), mediaUpload.array('files', 20), ctrl.uploadMedia);
router.delete('/:productId(\\d+)/media/:mediaId(\\d+)', auth, requireRole('admin'), ctrl.deleteMedia);

// Evidence uploads
router.post('/:id(\\d+)/evidences', auth, requireRole('admin'), evidenceUpload.array('files', 20), ctrl.uploadEvidence);
router.delete('/:productId(\\d+)/evidences/:evidenceId(\\d+)', auth, requireRole('admin'), ctrl.deleteEvidence);

// ─── Auth Routes (any logged-in user) ─────────────────────────────────────────
router.post('/:id(\\d+)/user-reviews', auth, userReviewValidation, validate, ctrl.submitUserReview);
router.delete('/:id(\\d+)/user-reviews/:reviewId(\\d+)', auth, ctrl.deleteUserReview);

export default router;
