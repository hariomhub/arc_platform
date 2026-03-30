import api from './axios.js';

export const applyExecutive = (data) => api.post('/membership/apply/executive', data);
export const applyFounding  = (data) => api.post('/membership/apply/founding',  data);
