import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,  // Send HttpOnly cookies with every request
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request interceptor: add debug timestamp header ────────────────────────
api.interceptors.request.use(
    (config) => {
        config.headers['X-Request-Time'] = new Date().toISOString();
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor: unified error handling ───────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            // Network error (no internet, server down, CORS)
            return Promise.reject(
                new Error('Network error. Please check your connection.')
            );
        }

        const { status } = error.response;

        if (status === 401) {
            // Not authenticated — redirect to login
            // Only redirect if not already on the membership/login page
            if (!window.location.pathname.includes('/membership')) {
                window.location.href = '/membership';
            }
        }

        // 403: Forbidden — let caller handle it (show upgrade modal, etc.)
        // 422: Validation error — let caller handle it
        // 500+: Server error — let caller handle it

        return Promise.reject(error);
    }
);

export default api;
