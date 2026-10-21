import api from './axios.js';

// ── Public ────────────────────────────────────────────────────────────────────
export const getChapterLeadPolicy = () => api.get('/chapter-lead/policy');

// ── Any logged-in user (only Chapter Leads are ever prompted) ────────────────
export const acceptPolicy = () => api.post('/chapter-lead/accept-policy', { accept: true });

// ── Active Chapter Lead ───────────────────────────────────────────────────────
export const getLeadDashboard   = () => api.get('/chapter-lead/dashboard');
export const getLeadReferrals   = () => api.get('/chapter-lead/referrals');
export const getLeadPerformance = () => api.get('/chapter-lead/performance');
export const getLeadQuarters    = () => api.get('/chapter-lead/quarters');

export const getLeadRequests   = ()     => api.get('/chapter-lead/requests');
export const createLeadRequest = (data) => api.post('/chapter-lead/requests', data);
export const cancelLeadRequest = (id)   => api.delete(`/chapter-lead/requests/${id}`);
