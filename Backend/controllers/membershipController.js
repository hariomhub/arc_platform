/**
 * membershipController.js
 * Handles applications to join a chapter team, from logged-in members.
 *
 *  POST   /api/membership/apply/council      apply as Chapter Ambassador or Chapter Lead (body.tier)
 *  POST   /api/membership/apply/executive    legacy alias for the above
 *  POST   /api/membership/apply/promotion    a Chapter Ambassador asks to become Chapter Lead
 *  GET    /api/membership/my-application     the caller's latest application (status for the Join page)
 *  DELETE /api/membership/applications/:id  withdraw a pending application
 *
 * The rules (who may apply, routing to the chapter's lead or the admins, notices) live in
 * services/chapterTeamService.js. Applying requires ticking the Privacy Policy + Terms agreement and
 * confirming employer clearance; both are stored (versioned, with time and IP) and enforced there,
 * not only in the form.
 *
 * Founding Member is admin-only: created directly in DB, no public application.
 */

import { submitTeamApplication, submitPromotionRequest, getMyApplication, withdrawApplication } from '../services/chapterTeamService.js';
import { TIERS } from '../utils/chapterLeadRules.js';

const messageFor = (out) => {
    const role = out.tier === TIERS.AMBASSADOR ? 'Chapter Ambassador' : 'Chapter Lead';
    if (out.tier === TIERS.AMBASSADOR && out.routed_to === 'lead') {
        return `Your ${role} application has been submitted. The Chapter Lead of ${out.chapter.name} will review it, and you will be notified.${out.chapter_full ? ' The chapter is full at the moment, so it may take longer.' : ''}`;
    }
    return `Your ${role} application has been submitted. You will be notified once reviewed by our admin team.`;
};

// POST /api/membership/apply/council
export const applyCouncil = async (req, res, next) => {
    try {
        const out = await submitTeamApplication(req.user, req.body, req.ip);
        return res.status(201).json({ success: true, data: { message: messageFor(out), applicationId: out.id, ...out } });
    } catch (err) {
        next(err);
    }
};

// Legacy alias — kept so any old '/apply/executive' calls still work
export const applyExecutive = applyCouncil;

// POST /api/membership/apply/promotion
export const requestPromotion = async (req, res, next) => {
    try {
        const out = await submitPromotionRequest(req.user, req.body, req.ip);
        return res.status(201).json({
            success: true,
            data: { message: 'Your request has been sent to the administrators, who decide who leads each chapter.', applicationId: out.id, ...out },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/membership/my-application
export const myApplication = async (req, res, next) => {
    try {
        return res.json({ success: true, data: await getMyApplication(req.user.id) });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/membership/applications/:id
export const withdraw = async (req, res, next) => {
    try {
        await withdrawApplication(parseInt(req.params.id, 10), req.user);
        return res.json({ success: true, data: { message: 'Your application has been withdrawn.' } });
    } catch (err) {
        next(err);
    }
};

// applyFounding removed — Founding Members are created manually in DB only
