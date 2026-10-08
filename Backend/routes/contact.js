/**
 * contact.js — Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Base path: /api/contact
 *
 *   POST /   — Submit a Contact-form message (public, no login required)
 *
 * Middleware order matters:
 *   1. rate limit        — cheapest check first, caps abuse per IP
 *   2. honeypot          — bots that fill the hidden field are dropped silently
 *   3. validation        — before reCAPTCHA, because a reCAPTCHA token is
 *                          single-use: a typo must not burn the visitor's token
 *   4. reCAPTCHA         — one network call to Google, only for valid input
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import { verifyRecaptchaMiddleware } from '../middleware/verifyRecaptcha.js';
import * as ctrl from '../controllers/contactController.js';

const router = Router();

// Keep in sync with INQUIRY_TYPES in frontend/src/pages/Contact.jsx.
// Stored as plain text in the DB, so adding a type needs no migration.
const INQUIRY_TYPES = ['Membership Inquiry', 'Assessment Request', 'Press / Media', 'Workshop Enquiry', 'Other'];

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

// ─── Rate limit: 5 submissions / 15 min / IP ──────────────────────────────────
const contactLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,
    max:             5,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Too many messages sent. Please wait a few minutes before trying again.' },
});

// ─── Honeypot ─────────────────────────────────────────────────────────────────
// Real visitors never see or fill the hidden `website` field; bots usually do.
// Answer with a normal-looking success so the bot has nothing to adapt to.
const honeypot = (req, res, next) => {
    if (req.body?.website) {
        return res.status(201).json({ success: true, message: 'Thank you! Your message has been sent.' });
    }
    next();
};

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const contactValidation = [
    body('firstName')
        .isString().withMessage('First name is required.').bail()
        .trim()
        .notEmpty().withMessage('First name is required.')
        .isLength({ max: 100 }).withMessage('First name must be under 100 characters.'),
    body('lastName')
        .optional({ checkFalsy: true })
        .isString().withMessage('Last name is invalid.').bail()
        .trim()
        .isLength({ max: 100 }).withMessage('Last name must be under 100 characters.'),
    body('email')
        .isString().withMessage('A valid email address is required.').bail()
        .trim()
        .isEmail().withMessage('A valid email address is required.')
        .isLength({ max: 255 }).withMessage('Email address is too long.')
        .toLowerCase(),
    body('organization')
        .optional({ checkFalsy: true })
        .isString().withMessage('Organisation is invalid.').bail()
        .trim()
        .isLength({ max: 255 }).withMessage('Organisation must be under 255 characters.'),
    body('inquiry')
        .isString().withMessage('Please choose an inquiry type.').bail()
        .isIn(INQUIRY_TYPES).withMessage('Please choose a valid inquiry type.'),
    body('message')
        .isString().withMessage('Message is required.').bail()
        .trim()
        .notEmpty().withMessage('Message is required.')
        .isLength({ min: MESSAGE_MIN }).withMessage(`Please write at least ${MESSAGE_MIN} characters in your message.`)
        .isLength({ max: MESSAGE_MAX }).withMessage(`Message must be under ${MESSAGE_MAX} characters.`),
];

// POST /api/contact
router.post(
    '/',
    contactLimiter,
    honeypot,
    contactValidation,
    validate,
    verifyRecaptchaMiddleware,
    ctrl.submitContactMessage
);

export default router;
