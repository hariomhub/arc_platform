import api from './axios.js';

export const loginUser            = (data) => api.post('/auth/login', data);
export const registerUser         = (data) => api.post('/auth/register', data);
export const logoutUser           = ()     => api.post('/auth/logout');
export const getMe                = ()     => api.get('/auth/me');
export const sendEmailOtp         = (data) => api.post('/auth/send-otp', data);
export const verifyEmailOtp       = (data) => api.post('/auth/verify-otp', data);
/** final_year_undergrad → working_professional upgrade request (admin approval needed) */
export const requestSubTypeUpgrade = ()    => api.patch('/auth/request-upgrade');
