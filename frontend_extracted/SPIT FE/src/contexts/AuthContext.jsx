import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await authAPI.getMe();
                    setUser(userData);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    logout();
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = (token, userData) => {
        // Set new user data
        // Note: We don't clear localStorage because each company's data
        // is isolated in the backend by company_id. The backend will
        // automatically return the correct company's data.
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        // Only clear auth data, keep company data for next login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loginTimestamp');
        setUser(null);
        setIsAuthenticated(false);
        // Note: We keep currentFileId, currentFileName, uploadedFileInfo
        // so data persists when the same user logs back in
    };

    // RBAC Helper Functions
    const hasPermission = (page) => {
        if (!user || !user.permissions) return false;
        return user.permissions.includes(page);
    };

    const isSuperAdmin = () => {
        return user?.role === 'super_admin';
    };

    const isAdmin = () => {
        return user?.role === 'admin' || user?.role === 'super_admin';
    };

    const canManageTeam = () => {
        return hasPermission('team_management');
    };

    const canUpload = () => {
        return hasPermission('upload');
    };

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            isLoading, 
            login, 
            logout,
            hasPermission,
            isSuperAdmin,
            isAdmin,
            canManageTeam,
            canUpload
        }}>
            {children}
        </AuthContext.Provider>
    );
};
