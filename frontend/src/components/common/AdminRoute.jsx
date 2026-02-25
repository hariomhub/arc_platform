import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * Admin-only route guard.
 * - Auth loading → spinner
 * - Not logged in → /membership
 * - Not admin → / (home)
 * - Admin → children
 */
const AdminRoute = ({ children }) => {
    const { user, isAuthLoading, isAdmin } = useAuth();

    if (isAuthLoading) return <LoadingSpinner fullPage />;
    if (!user) return <Navigate to="/membership" state={{ mode: 'login' }} replace />;
    if (!isAdmin()) return <Navigate to="/" replace />;

    return children;
};

export default AdminRoute;
