import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiInterceptor";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("admin_token");
  const navigate = useNavigate();
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Gọi API verify token qua apiClient (có interceptor refresh token)
        const res = await apiClient.get("/auth/verify");

        if (res.data?.success) {
          // Token hợp lệ (hoặc đã được refresh tự động)
          setIsValidated(true);
        } else {
          setIsValidated(false);
        }
      } catch (error) {
        console.error("Lỗi xác thực token:", error);
        
        // Nếu interceptor đã redirect, không cần xử lý thêm
        if (window.location.search.includes('expired=true')) {
          setIsValidated(false);
          setIsLoading(false);
          return;
        }
        
        setIsValidated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

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

  if (!token || !isValidated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
