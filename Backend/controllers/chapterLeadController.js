/**
 * chapterLeadController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoints used by a Chapter Lead's own dashboard.
 *
 *   GET    /api/chapter-lead/policy          public — targets, rates, term length
 *   GET    /api/chapter-lead/dashboard       goals, term, standing, history
 *   GET    /api/chapter-lead/referrals       members brought in with the lead's code
 *   GET    /api/chapter-lead/performance     posts / podcasts / workshops / blogs + metrics
 *   GET    /api/chapter-lead/quarters        past quarter results
 *   GET    /api/chapter-lead/requests        the lead's host requests
 *   POST   /api/chapter-lead/requests        ask to host a podcast / workshop
 *   DELETE /api/chapter-lead/requests/:id    withdraw a pending request
 *   POST   /api/chapter-lead/accept-policy   record acceptance of the current Privacy Policy + Terms
 *
 * Everything except /policy and /accept-policy requires an active Chapter Lead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    buildDashboard, getLeadPerformance, getReferralList, getQuarterHistory, getActiveProfile,
    listRequests, createRequest, cancelRequest, getPublicPolicy, recordPolicyAcceptance,
} from '../services/chapterLeadService.js';

const MAX_PENDING_REQUESTS = 5;

const noActiveRole = (res) =>
    res.status(404).json({ success: false, message: 'You do not have an active Chapter Lead role.' });

// GET /api/chapter-lead/policy  (public)
export const getPolicy = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await getPublicPolicy() });
    } catch (err) {
        next(err);
    }
};

// GET /api/chapter-lead/dashboard
export const getDashboard = async (req, res, next) => {
    try {
        const data = await buildDashboard(req.user.id);
        if (!data) return noActiveRole(res);
        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// GET /api/chapter-lead/referrals
export const getReferrals = async (req, res, next) => {
    try {
        const profile = await getActiveProfile(req.user.id);
        if (!profile) return noActiveRole(res);
        const referrals = await getReferralList(req.user.id);
        const counts = referrals.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});
        return res.json({
            success: true,
            data: { referral_code: profile.referral_code, referrals, counts },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/chapter-lead/performance
export const getPerformance = async (req, res, next) => {
    try {
        const profile = await getActiveProfile(req.user.id);
        if (!profile) return noActiveRole(res);
        return res.json({ success: true, data: await getLeadPerformance(req.user.id) });
    } catch (err) {
        next(err);
    }
};

// GET /api/chapter-lead/quarters
export const getQuarters = async (req, res, next) => {
    try {
        const profile = await getActiveProfile(req.user.id);
        if (!profile) return noActiveRole(res);
        return res.json({ success: true, data: await getQuarterHistory(profile.id) });
    } catch (err) {
        next(err);
    }
};

// GET /api/chapter-lead/requests
export const getRequests = async (req, res, next) => {
    try {
        const profile = await getActiveProfile(req.user.id);
        if (!profile) return noActiveRole(res);
        return res.json({ success: true, data: await listRequests({ leadUserId: req.user.id }) });
    } catch (err) {
        next(err);
    }
};

// POST /api/chapter-lead/requests
export const postRequest = async (req, res, next) => {
    try {
        const profile = await getActiveProfile(req.user.id);
        if (!profile) return noActiveRole(res);

        const [[{ pending }]] = await pool.query(
            `SELECT COUNT(*) AS pending FROM host_requests WHERE lead_user_id = ? AND status = 'pending'`,
            [req.user.id]
        );
        if (Number(pending) >= MAX_PENDING_REQUESTS) {
            return res.status(429).json({
                success: false,
                message: `You already have ${MAX_PENDING_REQUESTS} requests waiting for review. Please wait for a decision before sending more.`,
            });
        }

        const { type, title, description, proposed_date } = req.body;
        const id = await createRequest(req.user.id, {
            type,
            title: title.trim(),
            description: description ? description.trim() : null,
            proposedDate: proposed_date || null,
        });
        return res.status(201).json({ success: true, data: { id } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/chapter-lead/requests/:id
export const deleteRequest = async (req, res, next) => {
    try {
        const ok = await cancelRequest(req.user.id, parseInt(req.params.id, 10));
        if (!ok) {
            return res.status(404).json({ success: false, message: 'No pending request found to withdraw.' });
        }
        return res.json({ success: true, data: { message: 'Request withdrawn.' } });
    } catch (err) {
        next(err);
    }
};

// POST /api/chapter-lead/accept-policy  (any logged-in user; only leads are ever prompted)
export const acceptPolicy = async (req, res, next) => {
    try {
        if (req.body.accept !== true) {
            return res.status(422).json({ success: false, message: 'You must agree to the Privacy Policy and Terms to continue.' });
        }
        await recordPolicyAcceptance(pool, req.user.id, { ip: req.ip, context: 'reaccept_gate' });
        return res.json({ success: true, data: { message: 'Thank you — your agreement has been recorded.' } });
    } catch (err) {
        next(err);
    }
};
