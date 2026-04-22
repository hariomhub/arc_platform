import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as authController from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import passport from '../middleware/passport.js';

const router = Router();

// Validation middleware runner
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// POST /api/auth/send-otp
router.post(
    '/send-otp',
    [
        body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    ],
    validate,
    authController.sendVerificationOtp
);

// POST /api/auth/verify-otp
router.post(
    '/verify-otp',
    [
        body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
        body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.'),
    ],
    validate,
    authController.verifyOtp
);

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
            .isIn(['professional'])
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

// delete /api/auth/delete
// router.delete('/delete', auth, authController.deleteAccount);

// GET /api/auth/me — uses optionalAuth so guests get 200 {data:null} instead of 401
router.get('/me', optionalAuth, authController.getMe);

// ── LinkedIn OAuth ────────────────────────────────────────────────────────────
// Step 1: redirect user to LinkedIn
router.get(
    '/linkedin',
    passport.authenticate('linkedin', { session: true,
        scope: ['openid', 'profile', 'email'],
     },)
);

// Step 2: LinkedIn redirects back here with ?code=...
router.get(
    '/linkedin/callback',
    passport.authenticate('linkedin', {
        session: true,
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=linkedin_failed`,
    }),
    (req, res, next) => {
        req.linkedinProfile = req.user;
        next();
    },
    authController.linkedinCallback
);
// PATCH /api/auth/complete-profile — for LinkedIn OAuth users to set sub-category
router.patch('/complete-profile', auth, authController.completeProfile);

export default router;
