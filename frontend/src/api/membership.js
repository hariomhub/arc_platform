import api from './axios.js';

// Apply to join a chapter team. data.tier = 'ambassador' (a chapter is required) or 'lead'.
export const applyCouncil  = (data) => api.post('/membership/apply/council', data);

// A Chapter Ambassador asks to become the Chapter Lead (an administrator decides)
export const requestPromotion = (data) => api.post('/membership/apply/promotion', data);

// The caller's latest application, for the status shown on the Join page
export const getMyApplication = () => api.get('/membership/my-application');
export const withdrawApplication = (id) => api.delete(`/membership/applications/${id}`);

// Legacy alias — kept for any existing code that still calls applyExecutive
export const applyExecutive = (data) => api.post('/membership/apply/council', data);

// applyFounding removed — founding members are created manually in DB only
