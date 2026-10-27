import api from './axios.js';

// ── Public ────────────────────────────────────────────────────────────────────
export const getChapterLeadPolicy = () => api.get('/chapter-lead/policy');

// ── Any logged-in user (only chapter team members are ever prompted) ──────────
export const acceptPolicy = () => api.post('/chapter-lead/accept-policy', { accept: true });

// ── Active chapter team member (Chapter Lead or Chapter Ambassador) ───────────
export const getLeadDashboard   = () => api.get('/chapter-lead/dashboard');
export const getLeadReferrals   = () => api.get('/chapter-lead/referrals');
export const getLeadPerformance = () => api.get('/chapter-lead/performance');
export const getLeadQuarters    = () => api.get('/chapter-lead/quarters');

export const getLeadRequests   = ()     => api.get('/chapter-lead/requests');
export const createLeadRequest = (data) => api.post('/chapter-lead/requests', data);
export const cancelLeadRequest = (id)   => api.delete(`/chapter-lead/requests/${id}`);

// Earnings choice: receive or waive, with the employer confirmation
export const getEarnings      = ()     => api.get('/chapter-lead/earnings');
export const saveElection     = (data) => api.post('/chapter-lead/earnings-election', data);

// What the public chapter page may show about me, and whether I appear on the leaderboard
export const getDisplaySettings  = ()     => api.get('/chapter-lead/display-settings');
export const saveDisplaySettings = (data) => api.put('/chapter-lead/display-settings', data);

// Leaderboard: scope 'team' (my chapter) or 'chapters'; quarter = 'YYYY-MM-DD' for a past quarter
export const getLeaderboard = (params) => api.get('/chapter-lead/leaderboard', { params });

// ── Chapter Leads only: my team ───────────────────────────────────────────────
export const getTeam               = ()           => api.get('/chapter-lead/team');
export const decideTeamApplication = (id, data)   => api.patch(`/chapter-lead/team/applications/${id}`, data);
export const removeTeamMember      = (profileId, reason) => api.post(`/chapter-lead/team/members/${profileId}/remove`, { reason });

// The invitation messages shown beside the referral code (the words an administrator can edit)
export const getOutreachKit = () => api.get('/chapter-lead/outreach-kit');
