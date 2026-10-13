import api from './axios.js';

/** POST /api/contact  (public — no login required; linked to the account if logged in) */
export const submitContactForm = (data) =>
    api.post('/contact', data);

/** GET /api/contact/mine  — my messages and the replies to them (login required) */
export const getMyContactMessages = () =>
    api.get('/contact/mine');

/** POST /api/contact/mine/:id/read  — mark the replies on one of my messages as read */
export const markContactMessageRead = (id) =>
    api.post(`/contact/mine/${id}/read`);
