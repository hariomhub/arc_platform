import api from './axios.js';

const base = '/admin/chapter-leads';

// ── Overview ──────────────────────────────────────────────────────────────────
export const getChapterLeadSummary = ()       => api.get(`${base}/summary`);
// params: status ('active'|'all'), tier ('lead'|'ambassador'), chapter_id
export const getChapterLeads       = (status, extra = {}) => api.get(`${base}/leads`, { params: { status, ...extra } });
export const getChapterLead        = (id)     => api.get(`${base}/leads/${id}`);
export const getTermChanges        = (days)   => api.get(`${base}/term-changes`, { params: { days } });
export const getLeadOptions        = ()       => api.get(`${base}/options/leads`);

// ── Lead edits ────────────────────────────────────────────────────────────────
export const updateChapterLead   = (id, data) => api.patch(`${base}/leads/${id}`, data);
export const endChapterLeadRole  = (id, data) => api.post(`${base}/leads/${id}/end`, data);
export const regenerateLeadCode  = (id)       => api.post(`${base}/leads/${id}/regenerate-code`);
export const waiveLeadQuarter    = (id, data) => api.post(`${base}/leads/${id}/waive-quarter`, data);

// The person must choose "receive or waive" again (an admin can never set the choice for them)
export const resetLeadElection   = (id, reason) => api.post(`${base}/leads/${id}/reset-election`, { reason });

// ── Teams ─────────────────────────────────────────────────────────────────────
export const getChapterTeam   = (chapterId)  => api.get(`${base}/chapters/${chapterId}/team`);
export const getAdminLeaderboard = (params)  => api.get(`${base}/leaderboard`, { params });
export const setMemberVisibility = (userId, hidden) => api.patch(`${base}/members/${userId}/visibility`, { hidden });

// ── Chapters ──────────────────────────────────────────────────────────────────
export const getAdminChapters = ()         => api.get(`${base}/chapters`);
export const createChapter    = (data)     => api.post(`${base}/chapters`, data);
export const updateChapter    = (id, data) => api.put(`${base}/chapters/${id}`, data);

// ── Policy ────────────────────────────────────────────────────────────────────
export const getAdminPolicy = ()     => api.get(`${base}/policy`);
export const createPolicy   = (data) => api.post(`${base}/policy`, data);

// ── Host requests ─────────────────────────────────────────────────────────────
export const getHostRequests    = (status)       => api.get(`${base}/requests`, { params: status ? { status } : {} });
export const decideHostRequest  = (id, data)     => api.patch(`${base}/requests/${id}`, data);

// ── Sessions: hosts + conducted ───────────────────────────────────────────────
export const getSessions       = ()                  => api.get(`${base}/sessions`);
export const setSessionHosts   = (type, id, hosts)   => api.put(`${base}/sessions/${type}/${id}/hosts`, { hosts });
export const markSessionConducted = (type, id, conducted, conducted_on) =>
    api.patch(`${base}/sessions/${type}/${id}/conducted`, { conducted, conducted_on });

// ── Referral corrections + jobs ───────────────────────────────────────────────
export const correctReferral = (id, data) => api.patch(`${base}/referrals/${id}`, data);
export const runDailyJob     = ()         => api.post(`${base}/run-daily`);

// ── Tour video (shown on every Chapter Lead's and Chapter Ambassador's dashboard) ──
export const getTour         = ()     => api.get(`${base}/tour`);
export const saveTourLink    = (data) => api.put(`${base}/tour`, data);     // { url, title?, description? }
export const saveTourText    = (data) => api.patch(`${base}/tour`, data);   // { title?, description? }
export const deleteTour      = ()     => api.delete(`${base}/tour`);
export const uploadTourVideo = (file, { title, description } = {}) => {
    const form = new FormData();
    form.append('video', file);
    if (title) form.append('title', title);
    if (description) form.append('description', description);
    // a video can take a while to upload; the default timeout would cut it short
    return api.post(`${base}/tour/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 10 * 60 * 1000 });
};
