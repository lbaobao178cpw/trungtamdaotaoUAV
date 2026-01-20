import React, { createContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/apiInterceptor';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState(null);

    // === Kiểm tra token khi app load ===
    useEffect(() => {
        const verifyToken = async () => {
            console.log('[AuthContext] Starting token verification...');
            try {
                const savedToken = localStorage.getItem('user_token');
                const savedUser = localStorage.getItem('user');

                console.log('[AuthContext] savedToken exists:', !!savedToken);
                console.log('[AuthContext] savedUser exists:', !!savedUser);

                if (!savedToken) {
                    console.log('[AuthContext] No token found, setting isLoading=false');
                    setIsLoading(false);
                    return;
                }

                // Gọi API verify token qua apiClient (có interceptor refresh token)
                console.log('[AuthContext] Calling /auth/verify...');
                const res = await apiClient.get('/auth/verify');
                console.log('[AuthContext] Verify response:', res.data);

                if (res.data?.success) {
                    // Lấy token mới nhất từ localStorage (có thể đã được refresh)
                    const currentToken = localStorage.getItem('user_token');
                    setToken(currentToken);
                    setUser(res.data.user || JSON.parse(savedUser));
                    setIsAuthenticated(true);
                    console.log('[AuthContext] User authenticated successfully');
                } else {
                    // Fallback: dùng user từ localStorage
                    if (savedUser) {
                        setToken(savedToken);
                        setUser(JSON.parse(savedUser));
                        setIsAuthenticated(true);
                        console.log('[AuthContext] Using cached user from localStorage');
                    } else {
                        setIsAuthenticated(false);
                        console.log('[AuthContext] No cached user, not authenticated');
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Lỗi xác thực token:', error);

                // Nếu interceptor đã logout (redirect), không cần xử lý thêm
                if (window.location.search.includes('expired=true')) {
                    console.log('[AuthContext] Token expired, session ended');
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                }

                // Fallback: Nếu API không phản hồi, vẫn restore user từ localStorage
                const savedUser = localStorage.getItem('user');
                const savedToken = localStorage.getItem('user_token');
                if (savedUser && savedToken) {
                    setToken(savedToken);
                    setUser(JSON.parse(savedUser));
                    setIsAuthenticated(true);
                    console.log('[AuthContext] API error, using cached user');
                } else {
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    setIsAuthenticated(false);
                    console.log('[AuthContext] No cached data, clearing session');
                }
            } finally {
                console.log('[AuthContext] Setting isLoading=false');
                setIsLoading(false);
            }
        };

        verifyToken();
    }, []);

    const login = (newToken, userData, refreshToken) => {
        localStorage.setItem('user_token', newToken);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('user_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    const value = {
        user,
        isAuthenticated,
        isLoading,
        token,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
