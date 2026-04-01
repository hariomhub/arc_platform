import axios from 'axios';

const API = '/api/workshops';

// Public — no credentials needed
export const getWorkshops = (params = {}) =>
    axios.get(API, { params });

export const getWorkshopById = (id) =>
    axios.get(`${API}/${id}`);

// Admin-only writes — require auth cookie
export const createWorkshop = (data) =>
    axios.post(API, data, { withCredentials: true });

export const updateWorkshop = (id, data) =>
    axios.put(`${API}/${id}`, data, { withCredentials: true });

export const deleteWorkshop = (id) =>
    axios.delete(`${API}/${id}`, { withCredentials: true });

export const togglePublishWorkshop = (id) =>
    axios.patch(`${API}/${id}/publish`, {}, { withCredentials: true });
