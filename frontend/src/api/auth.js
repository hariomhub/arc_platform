import api from './axios.js';

export const loginUser            = (data) => api.post('/auth/login', data);
export const registerUser         = (data) => api.post('/auth/register', data);
export const logoutUser           = ()     => api.post('/auth/logout');
export const getMe                = ()     => api.get('/auth/me');
export const sendEmailOtp         = (data) => api.post('/auth/send-otp', data);
export const verifyEmailOtp       = (data) => api.post('/auth/verify-otp', data);
/** Public: confirms a Chapter Lead referral code before sign-up. Resolves { valid, code?, lead_first_name? } */
export const checkReferralCode    = (code) => api.get(`/auth/referral/${encodeURIComponent(code)}`);
/** final_year_undergrad → working_professional upgrade request (admin approval needed) */
export const requestSubTypeUpgrade = ()    => api.patch('/auth/request-upgrade');

// ── One-time email codes ────────────────────────────────────────────────────────
// All four answer generically: they never reveal whether an account exists for the email.
/** Email a 6-digit sign-in code.  data: { email } */
export const requestLoginCode = (data) => api.post('/auth/login-code/request', data);
/** Sign in with the code.  data: { email, code }  ->  { user } and the session cookie */
export const verifyLoginCode  = (data) => api.post('/auth/login-code/verify', data);
/** Forgot password: email a 6-digit code.  data: { email } */
export const forgotPassword   = (data) => api.post('/auth/forgot-password', data);
/** Set a new password with the code.  data: { email, code, newPassword } */
export const resetPassword    = (data) => api.post('/auth/reset-password', data);
