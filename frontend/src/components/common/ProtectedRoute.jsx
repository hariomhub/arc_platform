import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * Protects a route — unauthenticated users are redirected to /membership.
 * Preserves the intended destination in location state.
 */
const ProtectedRoute = ({ children }) => {
    const { user, isAuthLoading } = useAuth();
    const location = useLocation();

    if (isAuthLoading) {
        return <LoadingSpinner fullPage />;
    }

    if (!user) {
        return (
            <Navigate
                to="/membership"
                state={{ from: location, mode: 'login' }}
                replace
            />
        );
    }

    return children;
};

export default ProtectedRoute;
