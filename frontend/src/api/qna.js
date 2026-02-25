import api from './axios.js';

// params: { tags, page, limit }
export const getQnaPosts = (params) => api.get('/qna', { params });
export const getQnaPost = (id) => api.get(`/qna/${id}`);
export const createQnaPost = (data) => api.post('/qna', data);
export const deleteQnaPost = (id) => api.delete(`/qna/${id}`);
export const createAnswer = (id, data) => api.post(`/qna/${id}/answers`, data);
export const deleteAnswer = (id) => api.delete(`/qna/answers/${id}`);
export const votePost = (id) => api.post(`/qna/${id}/vote`);
