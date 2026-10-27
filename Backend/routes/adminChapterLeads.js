/**
 * routes/adminChapterLeads.js — mounted at /api/admin/chapter-leads
 * Founding members only.
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import * as ctrl from '../controllers/adminChapterLeadController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import { TOUR_UPLOAD_LIMIT_BYTES } from '../services/portalService.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

router.use(auth, requireRole('founding_member'));

// The tour video upload is held in memory, so it is capped; longer videos belong on YouTube or Vimeo.
const tourUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: TOUR_UPLOAD_LIMIT_BYTES } });
const tourFile = (req, res, next) => tourUpload.single('video')(req, res, (err) => {
    if (!err) return next();
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
        success: false,
        message: tooBig ? 'That video is over 100 MB. Paste a YouTube or Vimeo link instead.' : 'The video could not be uploaded.',
    });
});
const tourText = [
    body('title').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('The title must be 120 characters or fewer.'),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('The description must be 500 characters or fewer.'),
];

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
        body('tier').optional({ checkFalsy: true }).isIn(['lead', 'ambassador']).withMessage('Tier must be lead or ambassador.'),
        body('override_cap').optional().isBoolean().withMessage('override_cap must be true or false.'),
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
        // Goals and the seat cap are per tier (body.tiers.lead / body.tiers.ambassador). The flat goal fields
        // are still accepted and mean the lead's, for older callers.
        ...['members_target', 'podcasts_target', 'posts_min', 'posts_max', 'blogs_target'].map((k) =>
            body(k).optional().isInt({ min: 0, max: 1000 }).withMessage(`${k} must be a whole number between 0 and 1000.`).toInt()),
        body('min_goals_met').optional().isInt({ min: 1, max: 4 }).withMessage('min_goals_met must be between 1 and 4.').toInt(),
        ...['lead', 'ambassador'].flatMap((tier) => [
            ...['members_target', 'podcasts_target', 'posts_min', 'posts_max', 'blogs_target'].map((k) =>
                body(`tiers.${tier}.${k}`).optional().isInt({ min: 0, max: 1000 }).withMessage(`${tier} ${k} must be a whole number between 0 and 1000.`).toInt()),
            body(`tiers.${tier}.min_goals_met`).optional().isInt({ min: 1, max: 4 }).withMessage(`${tier} min_goals_met must be between 1 and 4.`).toInt(),
            body(`tiers.${tier}.seat_cap`).optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 1000 }).withMessage(`${tier} seat_cap must be between 1 and 1000.`).toInt(),
        ]),
        intField('consecutive_miss_limit', 1, 12), intField('term_months', 1, 60),
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

// ── Teams: one chapter, the earnings choice, the leaderboard, public visibility ──
router.get('/chapters/:id/team', idParam, validate, ctrl.getChapterTeam);
router.post(
    '/leads/:id/reset-election',
    idParam,
    [body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 500 })],
    validate,
    ctrl.resetLeadElection
);
router.get('/leaderboard', ctrl.getBoard);
router.patch(
    '/members/:userId/visibility',
    [param('userId').isInt({ min: 1 }), body('hidden').isBoolean({ strict: true }).withMessage('hidden must be true or false.')],
    validate,
    ctrl.patchMemberVisibility
);

// ── Tour video ───────────────────────────────────────────────────────────────
router.get('/tour', ctrl.getTour);
router.put('/tour', [body('url').trim().notEmpty().withMessage('Paste the video link.').isLength({ max: 500 }), ...tourText], validate, ctrl.putTour);
router.post('/tour/upload', tourFile, tourText, validate, ctrl.uploadTour);
router.patch('/tour', tourText, validate, ctrl.patchTour);
router.delete('/tour', ctrl.deleteTour);

// ── Outreach kit ─────────────────────────────────────────────────────────────
router.get('/outreach-kit', ctrl.getOutreachKitAdmin);
router.put(
    '/outreach-kit',
    [
        body('blocks').optional().isObject().withMessage('Send the shared blocks as an object.'),
        body('templates').optional().isObject().withMessage('Send the messages as an object.'),
        body('based_on').optional({ nullable: true }).isString().withMessage('based_on must be the time the kit was loaded.'),
    ],
    validate,
    ctrl.putOutreachKit,
);
router.delete('/outreach-kit', ctrl.deleteOutreachKit);

// ── Jobs ─────────────────────────────────────────────────────────────────────
router.post('/run-daily', ctrl.runDaily);

export default router;
