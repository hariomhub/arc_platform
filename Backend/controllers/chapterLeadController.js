/**
 * chapterLeadController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoints used by a chapter team member's own dashboard (Chapter Lead or Chapter Ambassador).
 *
 *   GET    /api/chapter-lead/policy            public — targets, rates, term length, per tier
 *   GET    /api/chapter-lead/dashboard         goals, term, standing, history, plus the tour video,
 *                                               referral counts and the "get started" signals
 *   GET    /api/chapter-lead/referrals         members brought in with the member's code
 *   GET    /api/chapter-lead/performance       posts / podcasts / workshops / blogs + metrics
 *   GET    /api/chapter-lead/quarters          past quarter results
 *   GET    /api/chapter-lead/requests          the member's host requests
 *   POST   /api/chapter-lead/requests          ask to host a podcast / workshop
 *   DELETE /api/chapter-lead/requests/:id      withdraw a pending request
 *   POST   /api/chapter-lead/accept-policy     record acceptance of the current Privacy Policy + Terms
 *   GET    /api/chapter-lead/earnings          the member's earnings choice and its history
 *   POST   /api/chapter-lead/earnings-election choose to receive or waive earnings (+ employer confirmation)
 *   GET|PUT /api/chapter-lead/display-settings what the public chapter page may show about them
 *   GET    /api/chapter-lead/leaderboard       team board or chapters board
 *
 *   Leads only (the team they lead):
 *   GET    /api/chapter-lead/team                          ambassadors, seats, waiting applications
 *   PATCH  /api/chapter-lead/team/applications/:id         approve or reject an ambassador application
 *   POST   /api/chapter-lead/team/members/:profileId/remove  remove an ambassador (reason required)
 *
 * Everything except /policy and /accept-policy requires an active chapter team member.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import pool from '../db/connection.js';
import {
    buildDashboard, getLeadPerformance, getReferralList, getQuarterHistory, getActiveProfile,
    listRequests, createRequest, cancelRequest, getPublicPolicy, recordPolicyAcceptance, getEarningsState,
} from '../services/chapterLeadService.js';
import { getTeamOverview, decideTeamApplication, removeAmbassador } from '../services/chapterTeamService.js';
import { recordElection } from '../services/earningsElectionService.js';
import { getDisplaySettings, saveDisplaySettings } from '../services/publicChapterService.js';
import { getTeamBoard, getChaptersBoard, getPastTeamBoard, listBoardQuarters } from '../services/leaderboardService.js';
import { getTourForMember, getReferralCounts, getSetupSignals } from '../services/portalService.js';
import { earningsGateOn } from '../utils/featureFlags.js';
import { dbDate } from '../utils/chapterLeadRules.js';

const MAX_PENDING_REQUESTS = 5;

const noActiveRole = (res) =>
    res.status(404).json({ success: false, message: 'You do not have an active chapter role.' });

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
        // Extras for the welcome area. None of them may take the dashboard down with it.
        const optional = (promise, fallback) => promise.catch((err) => { console.error('[Dashboard] optional part failed:', err.message); return fallback; });
        const [tour, referrals, setup] = await Promise.all([
            optional(getTourForMember(), null),
            optional(getReferralCounts(req.user.id), { total: 0, qualified: 0, pending: 0 }),
            optional(getSetupSignals(req.user.id), { has_posted: false, display_saved: false }),
        ]);
        return res.json({ success: true, data: { ...data, tour, referrals, setup } });
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

// POST /api/chapter-lead/accept-policy  (any logged-in user; only team members are ever prompted)
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

// ── Earnings choice ──────────────────────────────────────────────────────────

// GET /api/chapter-lead/earnings
export const getEarnings = async (req, res, next) => {
    try {
        const profile = await getActiveProfile(req.user.id);
        if (!profile) return noActiveRole(res);
        const state = await getEarningsState(profile.id);
        let history = [];
        try {
            [history] = await pool.query(
                `SELECT choice, employer_confirmed, DATE_FORMAT(effective_from, '%Y-%m-%d') AS effective_from, source, created_at
                 FROM earnings_elections WHERE profile_id = ? ORDER BY id DESC LIMIT 10`,
                [profile.id],
            );
        } catch (err) {
            if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
        }
        return res.json({
            success: true,
            data: {
                tier: profile.tier,
                state,
                gate_on: earningsGateOn(),
                history: history.map((h) => ({ ...h, employer_confirmed: Boolean(h.employer_confirmed), created_at: dbDate(h.created_at) })),
            },
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/chapter-lead/earnings-election   body: { choice: 'receive'|'waive', employer_confirmed: true }
export const postElection = async (req, res, next) => {
    try {
        const out = await recordElection(req.user, {
            choice: req.body.choice, employerConfirmed: req.body.employer_confirmed === true, ip: req.ip,
        });
        return res.json({ success: true, data: out });
    } catch (err) {
        next(err);
    }
};

// ── Public chapter page + leaderboard preferences ────────────────────────────

// GET /api/chapter-lead/display-settings
export const getDisplay = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await getDisplaySettings(req.user.id) });
    } catch (err) {
        next(err);
    }
};

// PUT /api/chapter-lead/display-settings
export const putDisplay = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await saveDisplaySettings(req.user.id, req.body) });
    } catch (err) {
        next(err);
    }
};

// GET /api/chapter-lead/leaderboard?scope=team|chapters&quarter=YYYY-MM-DD
export const getLeaderboard = async (req, res, next) => {
    try {
        if (req.query.scope === 'chapters') {
            return res.json({ success: true, data: await getChaptersBoard(req.user) });
        }
        const chapterId = req.user.team_chapter_id;
        const quarters = chapterId ? await listBoardQuarters(chapterId) : [];
        const board = req.query.quarter
            ? await getPastTeamBoard(req.user, chapterId, req.query.quarter)
            : await getTeamBoard(req.user, chapterId);
        return res.json({ success: true, data: { ...board, quarters } });
    } catch (err) {
        next(err);
    }
};

// ── Leads only: the team ─────────────────────────────────────────────────────

// GET /api/chapter-lead/team
export const getTeam = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await getTeamOverview(req.user) });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/chapter-lead/team/applications/:id   body: { status: 'approved'|'rejected', note? }
export const decideApplication = async (req, res, next) => {
    try {
        const out = await decideTeamApplication(parseInt(req.params.id, 10), req.user, {
            status: req.body.status, note: req.body.note || null,
        });
        return res.json({ success: true, data: out });
    } catch (err) {
        next(err);
    }
};

// POST /api/chapter-lead/team/members/:profileId/remove   body: { reason }
export const removeMember = async (req, res, next) => {
    try {
        await removeAmbassador(parseInt(req.params.profileId, 10), req.user, { reason: req.body.reason });
        return res.json({ success: true, data: { message: 'The ambassador has been removed from your team.' } });
    } catch (err) {
        next(err);
    }
};
