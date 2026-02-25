import api from './axios.js';

// params: { page, limit }
export const getNews = (params) => api.get('/news', { params });
export const getNewsById = (id) => api.get(`/news/${id}`);
