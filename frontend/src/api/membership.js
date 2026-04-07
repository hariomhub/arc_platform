import api from './axios.js';

// Primary: Council Member application
export const applyCouncil  = (data) => api.post('/membership/apply/council', data);

// Legacy alias — kept for any existing code that still calls applyExecutive
export const applyExecutive = (data) => api.post('/membership/apply/council', data);

// applyFounding removed — founding members are created manually in DB only
