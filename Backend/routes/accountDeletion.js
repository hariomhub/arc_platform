/**
 * accountDeletion.js — Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Base path: /api/account-deletion
 *
 * User routes (requires authentication):
 *   POST  /submit        — Submit a deletion request
 *   GET   /my-request    — Get own pending request status
 *
 * Admin routes (requires authentication + founding_member role):
 *   GET   /admin/requests           — List all requests (paginated)
 *   GET   /admin/requests/:id       — Single request detail
 *   POST  /admin/requests/:id/approve — Approve (permanently deletes account)
 *   POST  /admin/requests/:id/reject  — Reject (reactivates account)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router }          from 'express';
import { body, validationResult } from 'express-validator';
import auth                from '../middleware/auth.js';
import requireRole         from '../middleware/requireRole.js';
import * as ctrl           from '../controllers/accountDeletionController.js';

const router = Router();

// ─── Validation middleware ────────────────────────────────────────────────────
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// ─── User Routes ─────────────────────────────────────────────────────────────

// POST /api/account-deletion/submit
router.post(
    '/submit',
    auth,
    [
        body('full_name')
            .trim()
            .notEmpty()
            .withMessage('Full name is required.')
            .isLength({ max: 255 }),
        body('email')
            .trim()
            .isEmail()
            .withMessage('A valid email address is required.')
            .normalizeEmail(),
        body('reason')
            .optional({ checkFalsy: true })
            .trim()
            .isLength({ max: 2000 })
            .withMessage('Reason must be under 2000 characters.'),
    ],
    validate,
    ctrl.submitDeletionRequest
);

// GET /api/account-deletion/my-request
router.get('/my-request', auth, ctrl.getMyDeletionRequest);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/account-deletion/admin/requests
router.get(
    '/admin/requests',
    auth,
    requireRole('founding_member'),
    ctrl.getDeletionRequests
);

// GET /api/account-deletion/admin/requests/:id
router.get(
    '/admin/requests/:id',
    auth,
    requireRole('founding_member'),
    ctrl.getDeletionRequestById
);

// POST /api/account-deletion/admin/requests/:id/approve
router.post(
    '/admin/requests/:id/approve',
    auth,
    requireRole('founding_member'),
    [
        body('admin_notes')
            .optional({ checkFalsy: true })
            .trim()
            .isLength({ max: 2000 }),
    ],
    validate,
    ctrl.approveDeletionRequest
);

// POST /api/account-deletion/admin/requests/:id/reject
router.post(
    '/admin/requests/:id/reject',
    auth,
    requireRole('founding_member'),
    [
        body('admin_notes')
            .trim()
            .notEmpty()
            .withMessage('A rejection reason is required.')
            .isLength({ max: 2000 }),
    ],
    validate,
    ctrl.rejectDeletionRequest
);

export default router;