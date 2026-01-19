import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthInitializer = ({ children }) => {
    const { isLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect nếu token không hợp lệ (trừ trang login/register)
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const publicRoutes = ['/dang-nhap', '/dang-ky', '/gioi-thieu', '/khoa-hoc', '/thi-sat-hach', '/tra-cuu', '/'];
            
            // Nếu đang ở trang yêu cầu authentication → redirect login
            if (!publicRoutes.includes(location.pathname)) {
                navigate('/dang-nhap', { replace: true });
            }
        }
    }, [isLoading, isAuthenticated, navigate, location.pathname]);

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f5f5f5'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #ccc',
                        borderTop: '3px solid #0050b8',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }} />
                    <p style={{ color: '#666', fontSize: '14px' }}>Đang xác thực...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    return children;

export default AuthInitializer;
