import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import * as workshopsController from '../controllers/workshopsController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// ── Multer: banner image upload — memory storage ───────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed.'), false);
    },
});

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const workshopValidation = [
    body('title').trim().notEmpty().withMessage('Workshop title is required.').isLength({ max: 255 }),
    body('date').notEmpty().withMessage('Workshop date is required.').isISO8601().withMessage('Date must be a valid ISO 8601 datetime.'),
    body('location').optional().trim().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('speaker').optional().trim().isLength({ max: 255 }),
    body('agenda').optional().trim(),
    body('recording_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Recording URL must be a valid URL.'),
    body('banner_image').optional({ checkFalsy: true }).trim(),
    body('is_upcoming').optional().isBoolean().withMessage('is_upcoming must be true or false.'),
    body('is_published').optional().isBoolean().withMessage('is_published must be true or false.'),
];

// ── Read routes — PUBLIC (anyone can browse workshops) ───────────────────────
router.get('/', workshopsController.getWorkshops);
router.get('/:id', workshopsController.getWorkshopById);

// ── Write routes — founding_member + council_member (create/edit/delete as drafts) ─
router.post('/', auth, requireRole('founding_member', 'council_member'), workshopValidation, validate, workshopsController.createWorkshop);
router.put('/:id', auth, requireRole('founding_member', 'council_member'), workshopValidation, validate, workshopsController.updateWorkshop);
// Publish toggle: founding_member ONLY
router.patch('/:id/publish', auth, requireRole('founding_member'), workshopsController.togglePublishWorkshop);
router.post('/:id/upload-banner', auth, requireRole('founding_member', 'council_member'), upload.single('banner'), workshopsController.uploadWorkshopBanner);
router.delete('/:id', auth, requireRole('founding_member', 'council_member'), workshopsController.deleteWorkshop);


export default router;
