import api from './axios.js';

// ── Public ────────────────────────────────────────────────────────────────────
export const getAwards   = (params) => api.get('/nominations/awards',   { params });
export const getNominees = (params) => api.get('/nominations/nominees',  { params });
export const getNomineeById = (id)  => api.get(`/nominations/nominees/${id}`);

// ── Auth-required ──────────────────────────────────────────────────────────────
export const castVote = (id, voteData = {}) => {
    // voteData can include: { isAnonymous, anonymousEmail, recaptchaToken }
    return api.post(`/nominations/nominees/${id}/vote`, voteData);
};
export const getMyVotes  = ()       => api.get('/nominations/my-votes');

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getLeaderboard    = ()           => api.get('/nominations/leaderboard');

export const createAward       = (data)       => api.post('/nominations/awards', data);
export const updateAward       = (id, data)   => api.put(`/nominations/awards/${id}`, data);
export const deleteAward       = (id)         => api.delete(`/nominations/awards/${id}`);

export const createCategory    = (data)       => api.post('/nominations/categories', data);
export const updateCategory    = (id, data)   => api.put(`/nominations/categories/${id}`, data);
export const deleteCategory    = (id)         => api.delete(`/nominations/categories/${id}`);

export const createNominee     = (data)       => api.post('/nominations/nominees', data);
export const updateNominee     = (id, data)   => api.put(`/nominations/nominees/${id}`, data);
export const deleteNominee     = (id)         => api.delete(`/nominations/nominees/${id}`);
export const uploadNomineePhoto = (id, form)  =>
    api.post(`/nominations/nominees/${id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
