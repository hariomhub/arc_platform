import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { applyCouncil } from '../controllers/membershipController.js';
import auth from '../middleware/auth.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const councilValidation = [
    body('organization_name').optional().trim().isLength({ max: 255 }),
    body('job_title').optional().trim().isLength({ max: 255 }),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be valid.'),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('professional_bio').optional().trim().isLength({ max: 2000 }),
    body('areas_of_expertise').optional().trim().isLength({ max: 1000 }),
    body('why_council_member').optional().trim().isLength({ max: 3000 }),
];

// Council Member application (replaces /apply/executive)
router.post('/apply/council', auth, councilValidation, validate, applyCouncil);

// Keep legacy route as alias so any existing links still work
router.post('/apply/executive', auth, councilValidation, validate, applyCouncil);

export default router;
