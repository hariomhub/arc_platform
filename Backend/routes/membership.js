import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { applyExecutive, applyFounding } from '../controllers/membershipController.js';
import auth from '../middleware/auth.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const executiveValidation = [
    body('organization_name').optional().trim().isLength({ max: 255 }),
    body('job_title').optional().trim().isLength({ max: 255 }),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be valid.'),
    body('phone').optional().trim().isLength({ max: 50 }),
];

const foundingValidation = [
    body('organization_name').optional().trim().isLength({ max: 255 }),
    body('job_title').optional().trim().isLength({ max: 255 }),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be valid.'),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('professional_bio').optional().trim().isLength({ max: 2000 }),
    body('areas_of_expertise').optional().trim().isLength({ max: 1000 }),
    body('why_founding_member').trim().notEmpty().withMessage('Please explain why you want to be a Founding Member.').isLength({ max: 3000 }),
    body('website_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Website URL must be valid.'),
    body('twitter_url').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

// Both require authentication
router.post('/apply/executive', auth, executiveValidation, validate, applyExecutive);
router.post('/apply/founding',  auth, foundingValidation,  validate, applyFounding);

export default router;
