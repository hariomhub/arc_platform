import api from './axios.js';

const base = '/admin/chapter-leads';

// ── Overview ──────────────────────────────────────────────────────────────────
export const getChapterLeadSummary = ()       => api.get(`${base}/summary`);
export const getChapterLeads       = (status) => api.get(`${base}/leads`, { params: { status } });
export const getChapterLead        = (id)     => api.get(`${base}/leads/${id}`);
export const getTermChanges        = (days)   => api.get(`${base}/term-changes`, { params: { days } });
export const getLeadOptions        = ()       => api.get(`${base}/options/leads`);

// ── Lead edits ────────────────────────────────────────────────────────────────
export const updateChapterLead   = (id, data) => api.patch(`${base}/leads/${id}`, data);
export const endChapterLeadRole  = (id, data) => api.post(`${base}/leads/${id}/end`, data);
export const regenerateLeadCode  = (id)       => api.post(`${base}/leads/${id}/regenerate-code`);
export const waiveLeadQuarter    = (id, data) => api.post(`${base}/leads/${id}/waive-quarter`, data);

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
