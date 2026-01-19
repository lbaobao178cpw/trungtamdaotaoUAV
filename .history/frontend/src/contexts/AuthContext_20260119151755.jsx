import React, { createContext, useState, useEffect } from 'react';

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

                // Gọi API verify token
                const res = await fetch('http://localhost:5000/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${savedToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });

                if (res.ok) {
                    const data = await res.json();
                    setToken(savedToken);
                    setUser(data.user || JSON.parse(savedUser));
                    setIsAuthenticated(true);
                } else if (res.status === 401) {
                    // Token hết hạn - xóa và yêu cầu đăng nhập lại
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    setIsAuthenticated(false);
                } else {
                    // Lỗi server - fallback lấy user từ localStorage
                    if (savedUser) {
                        setToken(savedToken);
                        setUser(JSON.parse(savedUser));
                        setIsAuthenticated(true);
                    } else {
                        setIsAuthenticated(false);
                    }
                }
            } catch (error) {
                console.error('Lỗi xác thực token:', error);

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
