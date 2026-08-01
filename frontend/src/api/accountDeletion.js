import api from './axios.js';

// ─── User-facing endpoints ────────────────────────────────────────────────────

/** POST /api/account-deletion/submit */
export const submitDeletionRequest = (data) =>
    api.post('/account-deletion/submit', data);

/** GET /api/account-deletion/my-request */
export const getMyDeletionRequest = () =>
    api.get('/account-deletion/my-request');
