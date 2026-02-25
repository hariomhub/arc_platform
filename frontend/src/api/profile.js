import api from './axios.js';

export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const changePassword = (data) => api.put('/profile/password', data);
export const getMyResources = () => api.get('/profile/my-resources');
export const deleteMyResource = (id) => api.delete(`/profile/resources/${id}`);
