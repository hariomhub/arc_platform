import api from './axios.js';

// ─── User-facing endpoints ────────────────────────────────────────────────────

/** POST /api/account-deletion/submit */
export const submitDeletionRequest = (data) =>
    api.post('/account-deletion/submit', data);

/** GET /api/account-deletion/my-request */
export const getMyDeletionRequest = () =>
    api.get('/account-deletion/my-request');

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/** GET /api/account-deletion/admin/requests */
export const getAdminDeletionRequests = (params) =>
    api.get('/account-deletion/admin/requests', { params });

/** GET /api/account-deletion/admin/requests/:id */
export const getAdminDeletionRequestById = (id) =>
    api.get(`/account-deletion/admin/requests/${id}`);

/** POST /api/account-deletion/admin/requests/:id/approve */
export const approveAdminDeletionRequest = (id, data = {}) =>
    api.post(`/account-deletion/admin/requests/${id}/approve`, data);

/** POST /api/account-deletion/admin/requests/:id/reject */
export const rejectAdminDeletionRequest = (id, adminNotes) =>
    api.post(`/account-deletion/admin/requests/${id}/reject`, { admin_notes: adminNotes });
