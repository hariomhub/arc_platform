import api from './axios.js';

// params: { tab, category, page, limit, upcoming, all }
export const getEvents         = (params) => api.get('/events', { params });
export const getEventById      = (id)     => api.get(`/events/${id}`);
export const createEvent       = (data)   => api.post('/events', data);
export const updateEvent       = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent       = (id)     => api.delete(`/events/${id}`);
export const togglePublishEvent = (id)    => api.patch(`/events/${id}/publish`);
export const uploadEventBanner = (id, formData) =>
    api.post(`/events/${id}/upload-banner`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// ── Event Registrations ───────────────────────────────────────────────────────
export const registerForEvent      = (id, data) => api.post(`/events/${id}/register`, data);
export const cancelEventRegistration = (id)     => api.delete(`/events/${id}/register`);
export const getMyRegistrations    = ()          => api.get('/events/my-registrations');
export const getEventRegistrations = (id)        => api.get(`/events/${id}/registrations`);
