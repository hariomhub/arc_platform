import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getMe, logoutUser } from '../api/auth.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // ── Restore session on mount via HttpOnly cookie ──────────────────────────
    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            try {
                const res = await getMe();
                if (!cancelled && res.data?.success) {
                    setUser(res.data.data);
                }
            } catch {
                // 401 = not logged in — that's fine, just silently skip
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setIsAuthLoading(false);
            }
        };

        restoreSession();
        return () => { cancelled = true; };
    }, []);

    // ── login: called after successful POST /auth/login ───────────────────────
    // The server already set the HttpOnly cookie; we just store the user object.
    const login = useCallback((userData) => {
        setUser(userData);
    }, []);

    // ── logout: clear cookie server-side, clear local state ───────────────────
    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } catch {
            // ignore — cookie might already be gone
        } finally {
            setUser(null);
            window.location.href = '/membership';
        }
    }, []);

    // ── Role helpers ──────────────────────────────────────────────────────────
    const isAdmin = () => user?.role === 'admin';
    const isExecutive = () => user?.role === 'executive';
    const isPaidMember = () => user?.role === 'paid_member';
    const isProductCompany = () => user?.role === 'product_company';
    const isUniversity = () => user?.role === 'university';

    const canDownloadFramework = () =>
        ['admin', 'executive', 'paid_member', 'product_company'].includes(user?.role);

    const canUploadWhitepaper = () => user?.role === 'university';
    const canUploadProduct = () => user?.role === 'product_company';

    // Provide a static API base URL for legacy code
    const API = 'http://localhost:5000/api';

    // Provide a dummy token (could be replaced with real JWT if needed)
    const token = null;

    // Provide a fetch wrapper that uses credentials
    const authFetch = (...args) => fetch(...args);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthLoading,
                login,
                logout,
                isAdmin,
                isExecutive,
                isPaidMember,
                isProductCompany,
                isUniversity,
                canDownloadFramework,
                canUploadWhitepaper,
                canUploadProduct,
                isLoggedIn: !!user,
                isMember: !!user,
                API,
                token,
                authFetch,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

import { useContext } from 'react';
export default AuthContext;

// Custom hook for consuming AuthContext
export function useAuth() {
    return useContext(AuthContext);
}