import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,  // Send HttpOnly cookies with every request
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

        // 401: Not authenticated — let AuthContext / ProtectedRoute handle it.
        // Do NOT redirect here — it causes spurious redirects on the initial
        // session-restore check when users are simply not logged in.

        // 403: Forbidden — let caller handle it (show upgrade modal, etc.)
        // 422: Validation error — let caller handle it
        // 500+: Server error — let caller handle it

        return Promise.reject(error);
    }
);

export default api;
