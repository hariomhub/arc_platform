import api from './axios.js';

// params: { type, page, limit }
export const getResources = (params) =>
    api.get('/resources', { params });

export const getResourceById = (id) =>
    api.get(`/resources/${id}`);

// Returns blob — caller must use downloadBlob() util
export const downloadResource = (id) =>
    api.get(`/resources/${id}/download`, { responseType: 'blob' });

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
