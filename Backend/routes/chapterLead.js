/**
 * routes/chapterLead.js — mounted at /api/chapter-lead
 *
 *   Public                 : GET /policy
 *   Any logged-in user     : POST /accept-policy
 *   Active Chapter Lead    : everything else (council_member role)
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as ctrl from '../controllers/chapterLeadController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

router.get('/policy', ctrl.getPolicy);

router.post(
    '/accept-policy',
    auth,
    [body('accept').custom((v) => v === true).withMessage('You must agree to the Privacy Policy and Terms to continue.')],
    validate,
    ctrl.acceptPolicy
);

// ── Lead-only ────────────────────────────────────────────────────────────────
router.use(auth, requireRole('council_member'));

router.get('/dashboard',   ctrl.getDashboard);
router.get('/referrals',   ctrl.getReferrals);
router.get('/performance', ctrl.getPerformance);
router.get('/quarters',    ctrl.getQuarters);

router.get('/requests', ctrl.getRequests);
router.post(
    '/requests',
    [
        body('type').isIn(['podcast', 'workshop']).withMessage('Type must be podcast or workshop.'),
        body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Please give your request a title (3-255 characters).'),
        body('description').optional({ checkFalsy: true }).trim().isLength({ max: 3000 }).withMessage('Description must be 3000 characters or fewer.'),
        body('proposed_date')
            .optional({ checkFalsy: true })
            .isISO8601().withMessage('Proposed date must be a valid date.')
            .custom((v) => new Date(v).getTime() > Date.now() - 24 * 60 * 60 * 1000)
            .withMessage('Proposed date cannot be in the past.'),
    ],
    validate,
    ctrl.postRequest
);
router.delete('/requests/:id', [param('id').isInt({ min: 1 })], validate, ctrl.deleteRequest);

export default router;
