/**
 * routes/chapterLead.js — mounted at /api/chapter-lead
 *
 *   Public                 : GET /policy
 *   Any logged-in user     : POST /accept-policy
 *   Active team member     : the rest (Chapter Lead or Chapter Ambassador, role council_member)
 *   Chapter Leads only     : /team/*  (approve or reject ambassadors, remove them)
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as ctrl from '../controllers/chapterLeadController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import { requireCapability, CAP } from '../utils/permissions.js';

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

// ── Team members (both tiers) ────────────────────────────────────────────────
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

router.get('/earnings', ctrl.getEarnings);
router.post(
    '/earnings-election',
    [
        body('choice').optional().isIn(['receive', 'waive']).withMessage('Choose whether to receive or waive earnings.'),
        body('employer_confirmed').custom((v) => v === true).withMessage('Please confirm that you have checked your employment terms before continuing.'),
    ],
    validate,
    ctrl.postElection
);

router.get('/display-settings', ctrl.getDisplay);
router.put(
    '/display-settings',
    ['show_photo', 'show_organisation', 'show_linkedin', 'show_bio', 'show_in_leaderboard']
        .map((k) => body(k).optional().isBoolean({ strict: true }).withMessage(`${k} must be true or false.`)),
    validate,
    ctrl.putDisplay
);

router.get('/leaderboard', requireCapability(CAP.LEADERBOARD_VIEW), ctrl.getLeaderboard);

// ── Chapter Leads only ───────────────────────────────────────────────────────
const leadOnly = requireCapability(CAP.TEAM_MANAGE);

router.get('/team', leadOnly, ctrl.getTeam);
router.patch(
    '/team/applications/:id',
    leadOnly,
    [
        param('id').isInt({ min: 1 }),
        body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected.'),
        body('note').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('The note must be 500 characters or fewer.'),
    ],
    validate,
    ctrl.decideApplication
);
router.post(
    '/team/members/:profileId/remove',
    leadOnly,
    [
        param('profileId').isInt({ min: 1 }),
        body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('Please give a reason (3-500 characters).'),
    ],
    validate,
    ctrl.removeMember
);

export default router;
