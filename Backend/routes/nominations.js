import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import * as ctrl from '../controllers/nominationsController.js';
import * as submissionCtrl from '../controllers/nominationSubmissionsController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

const otpLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            10,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { success: false, message: 'Too many attempts. Please wait 15 minutes before trying again.' },
});

// ── Multer: nominee photo — memory storage; blob upload in controller ─────────
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

// ── Self-nomination validation ────────────────────────────────────────────────
const selfNominationValidation = [
    body('award_id').notEmpty().withMessage('Award ID is required.').isInt(),
    body('category_id').notEmpty().withMessage('Category ID is required.').isInt(),
    body('designation').optional().trim().isLength({ max: 255 }),
    body('company').optional().trim().isLength({ max: 255 }),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be a valid URL.'),
    body('achievements').optional().trim(),
    body('description').optional().trim(),
    body('consent_to_terms').custom((v) => String(v) === 'true').withMessage('You must agree to the Terms & Conditions.'),
];

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/awards', ctrl.getAwards);
router.get('/nominees', ctrl.getNominees);
router.get('/nominees/:id', ctrl.getNomineeById);

// ── Auth-required routes ──────────────────────────────────────────────────────
router.post('/nominees/:id/vote', optionalAuth, ctrl.castVote);  // Supports both authenticated and anonymous
router.get('/my-votes', auth, ctrl.getMyVotes);

// ── Self-nomination — supports both logged-in members and anonymous ──────────
router.post('/self-nominate/send-otp', otpLimiter, submissionCtrl.sendNominationOtp);
router.post('/self-nominate/verify-otp', otpLimiter, submissionCtrl.verifyNominationOtp);
router.post('/self-nominate', otpLimiter, optionalAuth, upload.single('photo'), selfNominationValidation, validate, submissionCtrl.submitSelfNomination);

// ── Admin-only routes ─────────────────────────────────────────────────────────
const admin = [auth, requireRole('founding_member')];

router.get('/leaderboard', ...admin, ctrl.getLeaderboard);
router.post('/pending/:id/approve', ...admin, submissionCtrl.approveSelfNomination);
router.post('/pending/:id/reject', ...admin, submissionCtrl.rejectSelfNomination);

// Awards
router.post('/awards', ...admin, awardValidation, validate, ctrl.createAward);
router.put('/awards/:id', ...admin, awardValidation, validate, ctrl.updateAward);
router.delete('/awards/:id', ...admin, ctrl.deleteAward);

// Categories
router.post('/categories', ...admin, categoryValidation, validate, ctrl.createCategory);
router.put('/categories/:id', ...admin, categoryUpdateValidation, validate, ctrl.updateCategory);
router.delete('/categories/:id', ...admin, ctrl.deleteCategory);

// Nominees
router.post('/nominees', ...admin, nomineeValidation, validate, ctrl.createNominee);
router.put('/nominees/:id', ...admin, nomineeValidation, validate, ctrl.updateNominee);
router.delete('/nominees/:id', ...admin, ctrl.deleteNominee);
router.post('/nominees/:id/photo', ...admin, upload.single('photo'), ctrl.uploadNomineePhoto);

export default router;
