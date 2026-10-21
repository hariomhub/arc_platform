import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as authController from '../controllers/authController.js';
import * as otpAuth from '../controllers/otpAuthController.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import passport from '../middleware/passport.js';
import { rateLimit } from 'express-rate-limit';
import { verifyRecaptchaMiddleware } from '../middleware/verifyRecaptcha.js';
import { normalizeReferralCode } from '../utils/chapterLeadRules.js';

const authLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            10,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes before trying again.' },
});

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
    authLimiter,
    [
        body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    ],
    validate,
    authController.sendVerificationOtp
);

// POST /api/auth/verify-otp
router.post(
    '/verify-otp',
    authLimiter,
    [
        body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
        body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.'),
    ],
    validate,
    authController.verifyOtp
);

// ── One-time email codes: "Sign in with a code" and "Forgot password" ────────────────────────────────
// Separate limiters from authLimiter: the 6-digit code is protected by a per-code attempt cap and a per-account
// send throttle in the database, and these cap what a single IP can try on top of that.
const codeRequestLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            10,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { success: false, message: 'Too many code requests. Please wait a few minutes before trying again.' },
});
const codeAttemptLimiter = rateLimit({
    windowMs:       15 * 60 * 1000,
    max:            30,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { success: false, message: 'Too many attempts. Please wait a few minutes before trying again.' },
});

// An account can be stored as typed (LinkedIn) or normalised (registration), so keep what was typed too:
// the controller looks an account up by both. The custom step runs before normalizeEmail().
const codeEmailField = () => body('email')
    .trim()
    .isEmail().withMessage('A valid email address is required.')
    .bail()
    .custom((value, { req }) => { req.rawEmail = value; return true; })
    .normalizeEmail();
const codeField = () => body('code').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code from your email.');
const newPasswordField = () => body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.');

// POST /api/auth/login-code/request   { email }
router.post('/login-code/request', codeRequestLimiter, [codeEmailField()], validate, otpAuth.requestLoginCode);

// POST /api/auth/login-code/verify    { email, code }
router.post('/login-code/verify', codeAttemptLimiter, [codeEmailField(), codeField()], validate, otpAuth.verifyLoginCode);

// POST /api/auth/forgot-password      { email }
router.post('/forgot-password', codeRequestLimiter, [codeEmailField()], validate, otpAuth.requestPasswordReset);

// POST /api/auth/reset-password       { email, code, newPassword }
router.post('/reset-password', codeAttemptLimiter, [codeEmailField(), codeField(), newPasswordField()], validate, otpAuth.resetPassword);

// POST /api/auth/register
router.post(
    '/register',
    authLimiter,
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
        body('country_code').matches(/^[A-Za-z]{2}$/).withMessage('Please select your country.'),
        body('chapter_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid chapter.'),
        body('ref_code').optional({ checkFalsy: true }).trim().isLength({ max: 32 }).withMessage('Invalid referral code.'),
        // CAPTCHA disabled for now — will be re-enabled later.
        // body('recaptchaToken').notEmpty().withMessage('Please complete the reCAPTCHA verification.'),
    ],
    validate,
    // verifyRecaptchaMiddleware,
    authController.register
);

// POST /api/auth/login
router.post(
    '/login',
    authLimiter,
    [
        body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required.'),
        // CAPTCHA disabled for now — will be re-enabled later.
        // body('recaptchaToken').notEmpty().withMessage('Please complete the reCAPTCHA verification.'),
    ],
    validate,
    // verifyRecaptchaMiddleware,
    authController.login
);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// delete /api/auth/delete
// router.delete('/delete', auth, authController.deleteAccount);

// GET /api/auth/me — uses optionalAuth so guests get 200 {data:null} instead of 401
router.get('/me', optionalAuth, authController.getMe);

// GET /api/auth/referral/:code — sign-up form checks a referral code (public)
router.get('/referral/:code', authController.checkReferralCode);

// ── LinkedIn OAuth ────────────────────────────────────────────────────────────
// Remembers a referral code across the OAuth round-trip. A short-lived cookie is
// used (not the session) because passport regenerates the session on login.
const stashReferral = (req, res, next) => {
    const code = normalizeReferralCode(req.query.ref);
    if (code) {
        res.cookie('arc_ref', code, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 1000,
        });
    }
    next();
};

// Step 1: redirect user to LinkedIn
router.get(
    '/linkedin',
    authLimiter,
    stashReferral,
    passport.authenticate('linkedin', { session: true,
        scope: ['openid', 'profile', 'email', 'w_member_social'],
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

// PATCH /api/auth/request-upgrade — final_year_undergrad requests upgrade to working_professional (pending admin)
router.patch('/request-upgrade', auth, authController.requestSubTypeUpgrade);

export default router;
