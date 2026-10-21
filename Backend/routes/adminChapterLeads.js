/**
 * routes/adminChapterLeads.js — mounted at /api/admin/chapter-leads
 * Founding members only.
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as ctrl from '../controllers/adminChapterLeadController.js';
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

router.use(auth, requireRole('founding_member'));

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid ID.')];
const typeParam = [param('type').isIn(['event', 'workshop']).withMessage('Type must be event or workshop.')];
const intField = (name, min = 0, max = 1000) =>
    body(name).isInt({ min, max }).withMessage(`${name} must be a whole number between ${min} and ${max}.`).toInt();
const pctField = (name) =>
    body(name).isFloat({ min: 0, max: 100 }).withMessage(`${name} must be between 0 and 100.`).toFloat();

// ── Overview ─────────────────────────────────────────────────────────────────
router.get('/summary', ctrl.getSummary);
router.get('/leads', ctrl.getLeads);
router.get('/term-changes', ctrl.getTermChanges);
router.get('/options/leads', ctrl.getLeadOptions);
router.get('/leads/:id', idParam, validate, ctrl.getLead);

// ── Lead edits ───────────────────────────────────────────────────────────────
router.patch(
    '/leads/:id',
    idParam,
    [
        body('chapter_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('chapter_id must be a positive integer.'),
        body('term_started_at').optional({ checkFalsy: true }).isISO8601().withMessage('term_started_at must be a valid date.'),
    ],
    validate,
    ctrl.patchLead
);
router.post(
    '/leads/:id/end',
    idParam,
    [
        body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
        body('outcome').optional().isIn(['removed', 'ended']),
    ],
    validate,
    ctrl.endLead
);
router.post('/leads/:id/regenerate-code', idParam, validate, ctrl.regenerateCode);
router.post(
    '/leads/:id/waive-quarter',
    idParam,
    [
        body('quarter_start').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('quarter_start must be YYYY-MM-DD.'),
        body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    ],
    validate,
    ctrl.waiveLeadQuarter
);

// ── Chapters ─────────────────────────────────────────────────────────────────
router.get('/chapters', ctrl.getChapters);
router.post(
    '/chapters',
    [
        body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Chapter name must be 2-150 characters.'),
        body('country_code').matches(/^[A-Za-z]{2}$/).withMessage('Select a country.'),
    ],
    validate,
    ctrl.createChapter
);
router.put(
    '/chapters/:id',
    idParam,
    [
        body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Chapter name must be 2-150 characters.'),
        body('country_code').matches(/^[A-Za-z]{2}$/).withMessage('Select a country.'),
        body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive.'),
    ],
    validate,
    ctrl.updateChapter
);

// ── Policy ───────────────────────────────────────────────────────────────────
router.get('/policy', ctrl.getPolicy);
router.post(
    '/policy',
    [
        body('effective_from').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('effective_from must be YYYY-MM-DD.'),
        intField('members_target'), intField('podcasts_target'),
        intField('posts_min'), intField('posts_max'), intField('blogs_target'),
        intField('min_goals_met', 1, 4), intField('consecutive_miss_limit', 1, 12), intField('term_months', 1, 60),
        pctField('rate_term1'), pctField('rate_term2'), pctField('rate_term3'), pctField('direct_commission_pct'),
        body('commission_on_renewals').optional().isBoolean().toBoolean(),
    ],
    validate,
    ctrl.createPolicy
);

// ── Requests ─────────────────────────────────────────────────────────────────
router.get('/requests', ctrl.getRequests);
router.patch(
    '/requests/:id',
    idParam,
    [
        body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected.'),
        body('admin_notes').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    ],
    validate,
    ctrl.decideLeadRequest
);

// ── Sessions: hosts + conducted ──────────────────────────────────────────────
router.get('/sessions', ctrl.getSessions);
router.get('/sessions/:type/:id/hosts', typeParam, idParam, validate, ctrl.getSessionHosts);
router.put(
    '/sessions/:type/:id/hosts',
    typeParam, idParam,
    [
        body('hosts').isArray({ max: 10 }).withMessage('hosts must be a list.'),
        body('hosts.*.user_id').isInt({ min: 1 }).withMessage('Each host needs a valid user.'),
        body('hosts.*.role').optional().isIn(['host', 'co_host', 'speaker']),
    ],
    validate,
    ctrl.putSessionHosts
);
router.patch(
    '/sessions/:type/:id/conducted',
    typeParam, idParam,
    [
        body('conducted').isBoolean().withMessage('conducted must be true or false.').toBoolean(),
        body('conducted_on').optional({ checkFalsy: true }).isISO8601().withMessage('conducted_on must be a valid date.'),
    ],
    validate,
    ctrl.patchConducted
);

// ── Referral corrections ─────────────────────────────────────────────────────
router.patch(
    '/referrals/:id',
    idParam,
    [
        body('action').isIn(['void', 'restore', 'reassign']).withMessage('Action must be void, restore or reassign.'),
        body('lead_user_id').optional({ checkFalsy: true }).isInt({ min: 1 }),
        body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
    ],
    validate,
    ctrl.patchReferral
);

// ── Jobs ─────────────────────────────────────────────────────────────────────
router.post('/run-daily', ctrl.runDaily);

export default router;
