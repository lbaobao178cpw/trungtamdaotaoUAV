import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

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

        // Gọi API verify token
        const res = await fetch("http://localhost:5000/api/auth/verify", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (res.ok) {
          const data = await res.json();
          // Token hợp lệ
          setIsValidated(true);
        } else if (res.status === 401) {
          // Token hết hạn hoặc không hợp lệ
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_user");
          setIsValidated(false);
        } else {
          setIsValidated(false);
        }
      } catch (error) {
        console.error("Lỗi xác thực token:", error);
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
