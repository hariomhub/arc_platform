import api from './axios.js';

// Active chapters for forms: { id, name, slug, country_code, has_lead, ambassadors, seats_left }.
// params: country (ISO alpha-2, optional)
export const getChapters = (country) =>
    api.get('/chapters', { params: country ? { country } : {} });

// Public Chapters page: every chapter with its lead and free seats
export const getPublicChapters = () => api.get('/chapters/public');

// One chapter's public page (by slug): lead, ambassadors, free seats
export const getPublicChapter = (slug) => api.get(`/chapters/${encodeURIComponent(slug)}`);
