import api from './axios.js';

// Public list of ACTIVE chapters. params: { country } (ISO alpha-2, optional)
export const getChapters = (country) =>
    api.get('/chapters', { params: country ? { country } : {} });
