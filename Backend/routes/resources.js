import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as resourcesController from '../controllers/resourcesController.js';
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

// Multer setup — PDF only, 10MB, MIME type verified
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed.'), false);
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
        .isIn(['framework', 'whitepaper', 'product']).withMessage('Type must be: framework, whitepaper, or product.'),
];

// Public routes
router.get('/', resourcesController.getResources);
router.get('/:id', resourcesController.getResourceById);

// GET /api/resources/:id/download — requires login; controller enforces role-based access
// admin, executive, paid_member, product_company → allowed
// free_member, university → 403
router.get('/:id/download', auth, resourcesController.downloadResource);

// POST /api/resources — role gated (university: whitepaper, product_company: product, admin: all)
router.post(
    '/',
    auth,
    requireRole('admin', 'university', 'product_company'),
    upload.single('file'),
    resourceValidation,
    validate,
    resourcesController.createResource
);

// PUT /api/resources/:id — admin only
router.put(
    '/:id',
    auth,
    requireRole('admin'),
    upload.single('file'),
    resourceValidation,
    validate,
    resourcesController.updateResource
);

// DELETE /api/resources/:id
// admin: can delete any
// university / product_company: can only delete their own (uploader_id = req.user.id)
// controller performs the ownership check
router.delete(
    '/:id',
    auth,
    requireRole('admin', 'university', 'product_company'),
    resourcesController.deleteResource
);

export default router;