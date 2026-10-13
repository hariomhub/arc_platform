/**
 * adminContact.js — Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Base path: /api/admin/contact-messages   (founding members only)
 *
 *   GET   /               — list (?status=new|handled|undelivered &q= &page= &limit=)
 *   GET   /email-health   — can this server send email? (no email is sent)
 *   POST  /email-test     — send a test email to the logged-in admin
 *   GET   /:id            — one message with its replies
 *   POST  /:id/reply      — reply to the sender (email + their dashboard)
 *   PATCH /:id/status     — mark handled / reopen
 *
 * Mounted before the general /api/admin router (like /api/admin/auto-news) and
 * carries its own auth + role guard so it is safe on its own.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import * as ctrl from '../controllers/adminContactController.js';

const router = Router();

router.use(auth, requireRole('founding_member'));

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid message id.');

// A test email is a real send — stop an accidental button-mash.
const testEmailLimiter = rateLimit({
    windowMs:        60 * 1000,
    max:             3,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Too many test emails. Please wait a minute.' },
});

// Static paths first so they are never captured by /:id.
router.get('/', ctrl.listMessages);
router.get('/email-health', ctrl.emailHealth);
router.post('/email-test', testEmailLimiter, ctrl.emailTest);

router.get('/:id', idParam, validate, ctrl.getMessage);

router.post(
    '/:id/reply',
    idParam,
    body('body')
        .isString().withMessage('Reply is required.').bail()
        .trim()
        .notEmpty().withMessage('Reply is required.')
        .isLength({ max: 5000 }).withMessage('Reply must be under 5000 characters.'),
    validate,
    ctrl.replyToMessage
);

router.patch(
    '/:id/status',
    idParam,
    body('status').isIn(['new', 'handled']).withMessage('Status must be "new" or "handled".'),
    validate,
    ctrl.setStatus
);

export default router;
