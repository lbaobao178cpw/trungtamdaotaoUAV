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
            
            try {
                const savedToken = localStorage.getItem('user_token');
                const savedUser = localStorage.getItem('user');

                
                

                if (!savedToken) {
                    
                    setIsLoading(false);
                    return;
                }

                // Gọi API verify token qua apiClient (có interceptor refresh token)
                
                const res = await apiClient.get('/auth/verify');
                

                if (res.data?.success) {
                    // Lấy token mới nhất từ localStorage (có thể đã được refresh)
                    const currentToken = localStorage.getItem('user_token');
                    setToken(currentToken);
                    setUser(res.data.user || JSON.parse(savedUser));
                    setIsAuthenticated(true);
                    
                } else {
                    // Fallback: dùng user từ localStorage
                    if (savedUser) {
                        setToken(savedToken);
                        setUser(JSON.parse(savedUser));
                        setIsAuthenticated(true);
                        
                    } else {
                        setIsAuthenticated(false);
                        
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Lỗi xác thực token:', error);

                // Nếu interceptor đã logout (redirect), không cần xử lý thêm
                if (window.location.search.includes('expired=true')) {
                    
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
                    
                } else {
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    setIsAuthenticated(false);
                    
                }
            } finally {
                
                setIsLoading(false);
            }
        };

        verifyToken();
    }, []);

    const login = (newToken, userData) => {
        localStorage.setItem('user_token', newToken);
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
