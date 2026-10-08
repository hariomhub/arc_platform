import api from './axios.js';

/** POST /api/contact  (public — no login required) */
export const submitContactForm = (data) =>
    api.post('/contact', data);
