import api from './axios.js';

// params: { type, page, limit }
export const getResources = (params) =>
    api.get('/resources', { params });

export const getRecentVideos = () =>
    api.get('/resources/recent-videos');

export const getResourceById = (id) =>
    api.get(`/resources/${id}`);

// Returns { url: string } — caller should open with window.open(url, '_blank')
export const downloadResource = (id) =>
    api.get(`/resources/${id}/download`);

// Returns { url: string } — short-lived SAS URL for video playback (no auth required)
export const getVideoStreamUrl = (id) =>
    api.get(`/resources/${id}/stream`);

// formData must include file + title + type etc.
export const uploadResource = (formData) =>
    api.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateResource = (id, formData) =>
    api.put(`/resources/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteResource = (id) =>
    api.delete(`/resources/${id}`);

// ─── Admin-only resource approval ─────────────────────────────────────────────
export const getPendingResources = () =>
    api.get('/resources/admin/pending');

export const approveResource = (id) =>
    api.patch(`/resources/${id}/approve`);

export const rejectResource = (id) =>
    api.patch(`/resources/${id}/reject`);
