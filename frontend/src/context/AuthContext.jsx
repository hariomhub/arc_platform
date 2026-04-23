import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getMe, logoutUser } from '../api/auth.js';
import useNotifications from '../hooks/useNotifications.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const {
        unreadCount,
        setUnreadCount,
        removeToken,
        fetchUnreadCount,
    } = useNotifications(user, !!user);

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
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setIsAuthLoading(false);
            }
        };

        restoreSession();
        return () => { cancelled = true; };
    }, []);

    // ── login: called after successful POST /auth/login ───────────────────────
    const login = useCallback((userData) => {
        setUser(userData);
    }, []);

    // ── logout: remove FCM token first, then clear cookie + state ────────────
    const logout = useCallback(async () => {
        await removeToken(); // remove FCM token before session ends
        try {
            await logoutUser();
        } catch {
            // ignore — cookie might already be gone
        } finally {
            setUser(null);
            window.location.href = '/';
        }
    }, [removeToken]);

    // ── Role helpers ─────────────────────────────────────────────────
    const isAdmin            = () => user?.role === 'founding_member';
    const isFoundingMember   = () => user?.role === 'founding_member';
    // Council Member (was Executive) — primary helper name
    const isCouncilMember    = () => user?.role === 'council_member';
    // Legacy alias — kept so any existing component refs still work
    const isExecutive        = () => user?.role === 'council_member';
    const isProfessional     = () => user?.role === 'professional';
    const isMember           = () => !!user;
    // Sub-type helpers (professional members only)
    const isWorkingProfessional = () =>
        user?.role === 'professional' && user?.professional_sub_type === 'working_professional';
    const isFinalYearUndergrad = () =>
        user?.role === 'professional' && user?.professional_sub_type === 'final_year_undergrad';
    // Professionals can view but NOT download resources/framework
    const canDownloadFramework = () => ['founding_member', 'council_member'].includes(user?.role);
    const canUploadWhitepaper  = () => ['founding_member', 'council_member'].includes(user?.role);
    const canUploadProduct     = () => ['founding_member', 'council_member'].includes(user?.role);
    // Resources: council_member, founding_member, and working_professional can download
    const canDownloadResources = () =>
        user?.role === 'founding_member' ||
        user?.role === 'council_member'  ||
        (user?.role === 'professional' && user?.professional_sub_type === 'working_professional');


    const API       = 'http://localhost:5000/api';
    const token     = null;
    const authFetch = (...args) => fetch(...args);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthLoading,
                login,
                logout,
                isAdmin,
                isFoundingMember,
                isCouncilMember,
                isExecutive,        // legacy alias — same as isCouncilMember
                isProfessional,
                isMember,
                isWorkingProfessional,
                isFinalYearUndergrad,
                canDownloadFramework,
                canDownloadResources,
                canUploadWhitepaper,
                canUploadProduct,
                isLoggedIn: !!user,
                API,
                token,
                authFetch,
                // ── Notification state exposed to all consumers ──
                unreadCount,
                setUnreadCount,
                fetchUnreadCount,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

import { useContext } from 'react';
export default AuthContext;

export function useAuth() {
    return useContext(AuthContext);
}