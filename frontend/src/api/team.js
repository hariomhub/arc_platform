import api from './axios.js';

// params: { page, limit }
export const getTeam = (params) => api.get('/team', { params });
export const getTeamMemberById = (id) => api.get(`/team/${id}`);
export const createTeamMember = (formData) => api.post('/team', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateTeamMember = (id, formData) => api.put(`/team/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteTeamMember = (id) => api.delete(`/team/${id}`);
