import api from './axios.js';

// params: { award_id, type } for public; { all: true } for admin management
export const getPanelMembers = (params) => api.get('/panel-members', { params });
export const createPanelMember = (formData) => api.post('/panel-members', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updatePanelMember = (id, formData) => api.put(`/panel-members/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deletePanelMember = (id) => api.delete(`/panel-members/${id}`);
