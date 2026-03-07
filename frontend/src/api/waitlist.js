import api from './axios.js';

// POST /api/waitlist — join membership waitlist (public)
export const joinWaitlist = (data) => api.post('/waitlist', data);
