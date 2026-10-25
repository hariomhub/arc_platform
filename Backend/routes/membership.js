import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { applyCouncil, requestPromotion, myApplication, withdraw } from '../controllers/membershipController.js';
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
    body('tier').optional({ checkFalsy: true }).isIn(['lead', 'ambassador']).withMessage('Choose Chapter Lead or Chapter Ambassador.'),
    body('organization_name').optional().trim().isLength({ max: 255 }),
    body('job_title').optional().trim().isLength({ max: 255 }),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be valid.'),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('professional_bio').optional().trim().isLength({ max: 2000 }),
    body('areas_of_expertise').optional().trim().isLength({ max: 1000 }),
    body('why_council_member').optional().trim().isLength({ max: 3000 }),
    body('accept_privacy').custom((value) => value === true).withMessage('You must agree to the Privacy Policy and Terms to apply.'),
    body('employer_confirmed').custom((value) => value === true).withMessage('Please confirm that you have checked your employment terms before applying.'),
    body('country_code').matches(/^[A-Za-z]{2}$/).withMessage('Please select your country.'),
    body('chapter_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid chapter.'),
];

// Apply to join a chapter team: tier 'ambassador' (a chapter is required) or 'lead' (default)
router.post('/apply/council', auth, councilValidation, validate, applyCouncil);

// Keep legacy route as alias so any existing links still work
router.post('/apply/executive', auth, councilValidation, validate, applyCouncil);

// An ambassador asks to become the Chapter Lead (an administrator decides)
router.post(
    '/apply/promotion',
    auth,
    [
        body('why_council_member').trim().isLength({ min: 10, max: 3000 }).withMessage('Please tell us why you would like to lead this chapter (at least 10 characters).'),
        body('chapter_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid chapter.'),
    ],
    validate,
    requestPromotion
);

router.get('/my-application', auth, myApplication);
router.delete('/applications/:id', auth, [param('id').isInt({ min: 1 })], validate, withdraw);

export default router;
