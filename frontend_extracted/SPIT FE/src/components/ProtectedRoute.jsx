import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * Protects routes based on authentication and role-based permissions.
 * 
 * Usage:
 * <Route path="/marketing" element={<ProtectedRoute page="marketing"><MarketingDashboard /></ProtectedRoute>} />
 * 
 * @param {string} page - The page identifier (must match backend permissions)
 * @param {ReactNode} children - The component to render if authorized
 * @param {string} redirectTo - Where to redirect if unauthorized (default: "/")
 */
const ProtectedRoute = ({ page, children, redirectTo = "/" }) => {
    const { isAuthenticated, user, isLoading, hasPermission } = useAuth();

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check if user account is active
    if (user && user.is_active === false) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h2 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">
                        Account Disabled
                    </h2>
                    <p className="text-red-700 dark:text-red-400">
                        Your account has been disabled. Please contact your administrator.
                    </p>
                </div>
            </div>
        );
    }

    // Check page-specific permission
    if (page && !hasPermission(page)) {
        console.warn(`User "${user?.email}" (${user?.role}) attempted to access "${page}" without permission`);
        return <Navigate to={redirectTo} replace />;
    }

    // Authorized - render the protected component
    return <>{children}</>;
};

export default ProtectedRoute;

