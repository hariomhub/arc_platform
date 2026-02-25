import api from './axios.js';

export const getPendingUsers = () => api.get('/admin/pending-users');
export const getAllUsers = () => api.get('/admin/all-users');
export const approveUser = (id) => api.patch(`/admin/users/${id}/approve`);
export const rejectUser = (id) => api.patch(`/admin/users/${id}/reject`);
export const getAdminStats = () => api.get('/admin/stats');
export const createAdminUser = (data) => api.post('/admin/users', data);
export const updateUserStatus = (id, status) => api.patch(`/admin/users/${id}/status`, { status });
export const updateUserRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
