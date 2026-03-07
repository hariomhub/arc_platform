import api from './axios.js';

// params: { page, limit, all } (all=true for admin to see unpublished)
export const getNews       = (params) => api.get('/news', { params });
export const getNewsById   = (id)     => api.get(`/news/${id}`);

// Admin
export const createNews        = (data) => api.post('/news', data);
export const updateNews        = (id, data) => api.put(`/news/${id}`, data);
export const deleteNews        = (id) => api.delete(`/news/${id}`);
export const togglePublishNews = (id) => api.patch(`/news/${id}/publish`);
