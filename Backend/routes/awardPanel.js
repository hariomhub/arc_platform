import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import * as ctrl from '../controllers/awardPanelController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
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

const panelValidation = [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 255 }),
    body('panel_type').isIn(['jury', 'presenter']).withMessage('panel_type must be jury or presenter.'),
    body('role').optional().trim().isLength({ max: 255 }),
    body('bio').optional().trim(),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be a valid URL.'),
];

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/', ctrl.getPanelMembers);

// ── Admin only ──────────────────────────────────────────────────────────────
const admin = [auth, requireRole('founding_member')];
router.post('/', ...admin, upload.single('photo'), panelValidation, validate, ctrl.createPanelMember);
router.put('/:id', ...admin, upload.single('photo'), panelValidation, validate, ctrl.updatePanelMember);
router.delete('/:id', ...admin, ctrl.deletePanelMember);

export default router;
