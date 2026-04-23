import api from './axios.js';

// ── Resources ─────────────────────────────────────────────────────────────────
export const getResources      = (params) => api.get('/resources', { params });
export const getRecentVideos   = ()       => api.get('/resources/recent-videos');
export const getResourceById   = (id)     => api.get(`/resources/${id}`);
export const downloadResource  = (id)     => api.get(`/resources/${id}/download`);
export const getVideoStreamUrl = (id)     => api.get(`/resources/${id}/stream`);

export const uploadResource = (formData) =>
    api.post('/resources', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updateResource = (id, formData) =>
    api.put(`/resources/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteResource = (id) => api.delete(`/resources/${id}`);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getPendingResources = ()     => api.get('/resources/admin/pending');
export const approveResource     = (id)   => api.patch(`/resources/${id}/approve`);
export const rejectResource      = (id)   => api.patch(`/resources/${id}/reject`);

// ── Reviews ───────────────────────────────────────────────────────────────────
// sort: 'recent' | 'upvoted' | 'highest' | 'lowest'
export const getReviews = (resourceId, sort = 'recent') =>
    api.get(`/resources/${resourceId}/reviews`, { params: { sort } });

export const createReview = (resourceId, data) =>
    api.post(`/resources/${resourceId}/reviews`, data);

export const updateReview = (resourceId, reviewId, data) =>
    api.put(`/resources/${resourceId}/reviews/${reviewId}`, data);

export const deleteReview = (resourceId, reviewId) =>
    api.delete(`/resources/${resourceId}/reviews/${reviewId}`);

export const toggleReviewUpvote = (resourceId, reviewId) =>
    api.post(`/resources/${resourceId}/reviews/${reviewId}/upvote`);

// ── Download usage ────────────────────────────────────────────────────────────
/** Returns { used, limit, unlimited, can_download, resets_on } for the current user */
export const getMyDownloadUsage = () => api.get('/resources/my-download-usage');