import { userCan } from '../utils/permissions.js';
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

    // ── login: called after successful POST /auth/login ────────────────────────────────────
    const login = useCallback((userData) => {
        setUser(userData);
        // The login response is minimal. Pull the full profile too, which carries
        // flags such as needs_policy_acceptance for Chapter Leads.
        getMe()
            .then((res) => { if (res.data?.success) setUser(res.data.data); })
            .catch(() => { /* keep the minimal user from the login response */ });
    }, []);

    // ── refreshUser: re-fetches the full user profile from the server ───────────────
    const refreshUser = useCallback(async () => {
        try {
            const res = await getMe();
            if (res.data?.success) setUser(res.data.data);
        } catch {
            // Ignore errors — keep existing user state
        }
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

    // ── What this person may do ──────────────────────────────────────
    // The server decides (utils/permissions.js) and sends the list with /auth/me, so there is one
    // copy of the rules. Prefer can('feed.post') over comparing roles.
    const capabilities = user?.capabilities || [];
    const can = (capability) => userCan(user, capability);

    // ── Role helpers ─────────────────────────────────────────────────
    const isAdmin            = () => user?.role === 'founding_member';
    const isFoundingMember   = () => user?.role === 'founding_member';
    // Anyone on a chapter team: a Chapter Lead OR a Chapter Ambassador (database role council_member).
    const isCouncilMember    = () => user?.role === 'council_member';
    const isTeamMember       = isCouncilMember;
    const isLead             = () => user?.role === 'council_member' && user?.tier !== 'ambassador';
    const isAmbassador       = () => user?.role === 'council_member' && user?.tier === 'ambassador';
    // Legacy alias — kept so any existing component refs still work
    const isExecutive        = () => user?.role === 'council_member';
    const isProfessional     = () => user?.role === 'professional';
    const isMember           = () => !!user;
    // Sub-type helpers (professional members only)
    const isWorkingProfessional = () =>
        user?.role === 'professional' && user?.professional_sub_type === 'working_professional';
    const isFinalYearUndergrad = () =>
        user?.role === 'professional' && user?.professional_sub_type === 'final_year_undergrad';
    // Professionals can view but not download; working professionals can download resources (not the framework).
    const canDownloadFramework = () => can('framework.download');
    const canDownloadResources = () => can('resources.download');


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
                isTeamMember,       // same as isCouncilMember: lead or ambassador
                isLead,
                isAmbassador,
                can,
                capabilities,
                tier: user?.tier || null,
                gates: user?.gates || { policy: false, earnings: false },
                isExecutive,        // legacy alias — same as isCouncilMember
                isProfessional,
                isMember,
                isWorkingProfessional,
                isFinalYearUndergrad,
                canDownloadFramework,
                canDownloadResources,
                isLoggedIn: !!user,
                refreshUser,
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