import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { joinWaitlist } from '../controllers/waitlistController.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// POST /api/waitlist  — public, collect membership interest
router.post(
    '/',
    [
        body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
        body('name').optional().trim().isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),
        body('tier')
            .optional()
            .isIn(['basic', 'professional', 'enterprise'])
            .withMessage('Tier must be: basic, professional, or enterprise.'),
    ],
    validate,
    joinWaitlist
);

export default router;
