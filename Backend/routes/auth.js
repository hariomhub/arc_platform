import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as authController from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = Router();

// Validation middleware runner
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// POST /api/auth/register
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),
        body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
            .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
        body('role')
            .optional()
            .isIn(['free_member', 'paid_member', 'university', 'product_company'])
            .withMessage('Invalid role selected.'),
        body('organization_name').optional().trim().isLength({ max: 255 }).withMessage('Organisation name must be 255 characters or fewer.'),
        body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be a valid URL.'),
    ],
    validate,
    authController.register
);

// POST /api/auth/login
router.post(
    '/login',
    [
        body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required.'),
    ],
    validate,
    authController.login
);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', auth, authController.getMe);

export default router;
