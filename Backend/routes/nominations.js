import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as ctrl from '../controllers/nominationsController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// ── Multer: nominee photo ─────────────────────────────────────────────────────
const photoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/nominees';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `nominee-${req.params.id}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage: photoStorage,
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

// ── Validation rules ──────────────────────────────────────────────────────────
const awardValidation = [
    body('name').trim().notEmpty().withMessage('Award name is required.').isLength({ max: 255 }),
    body('description').optional().trim(),
    body('is_active').optional().isBoolean(),
];

const categoryValidation = [
    body('award_id').notEmpty().withMessage('Award ID is required.').isInt(),
    body('name').trim().notEmpty().withMessage('Category name is required.'),
    body('timeline').isIn(['quarterly', 'half-yearly', 'yearly']).withMessage('Invalid timeline.'),
];

const categoryUpdateValidation = [
    body('name').trim().notEmpty().withMessage('Category name is required.'),
    body('timeline').isIn(['quarterly', 'half-yearly', 'yearly']).withMessage('Invalid timeline.'),
];

const nomineeValidation = [
    body('award_id').notEmpty().withMessage('Award ID is required.').isInt(),
    body('category_id').notEmpty().withMessage('Category ID is required.').isInt(),
    body('name').trim().notEmpty().withMessage('Nominee name is required.').isLength({ max: 255 }),
    body('designation').optional().trim().isLength({ max: 255 }),
    body('company').optional().trim().isLength({ max: 255 }),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be a valid URL.'),
    body('achievements').optional().trim(),
    body('description').optional().trim(),
    body('is_active').optional().isBoolean(),
];

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/awards',        ctrl.getAwards);
router.get('/nominees',      ctrl.getNominees);
router.get('/nominees/:id',  ctrl.getNomineeById);

// ── Auth-required routes ──────────────────────────────────────────────────────
router.post('/nominees/:id/vote', optionalAuth, ctrl.castVote);  // Supports both authenticated and anonymous
router.get('/my-votes',           auth, ctrl.getMyVotes);

// ── Admin-only routes ─────────────────────────────────────────────────────────
const admin = [auth, requireRole('admin')];

router.get('/leaderboard',            ...admin, ctrl.getLeaderboard);

// Awards
router.post('/awards',                ...admin, awardValidation, validate, ctrl.createAward);
router.put('/awards/:id',             ...admin, awardValidation, validate, ctrl.updateAward);
router.delete('/awards/:id',          ...admin, ctrl.deleteAward);

// Categories
router.post('/categories',            ...admin, categoryValidation, validate, ctrl.createCategory);
router.put('/categories/:id',         ...admin, categoryUpdateValidation, validate, ctrl.updateCategory);
router.delete('/categories/:id',      ...admin, ctrl.deleteCategory);

// Nominees
router.post('/nominees',              ...admin, nomineeValidation, validate, ctrl.createNominee);
router.put('/nominees/:id',           ...admin, nomineeValidation, validate, ctrl.updateNominee);
router.delete('/nominees/:id',        ...admin, ctrl.deleteNominee);
router.post('/nominees/:id/photo',    ...admin, upload.single('photo'), ctrl.uploadNomineePhoto);

export default router;
